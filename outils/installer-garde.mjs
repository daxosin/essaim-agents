#!/usr/bin/env node
// installer-garde.mjs — ajoute (ou retire) le hook PreToolUse « garde-essaim » dans un settings.json de Claude Code,
// sans toucher aux autres réglages ni aux autres hooks. Sauvegarde le fichier avant toute modification.
// Usage : node installer-garde.mjs <chemin settings.json> <commande du hook>
//         node installer-garde.mjs <chemin settings.json> --retirer
import fs from 'node:fs';
import path from 'node:path';

export const MATCHER = 'Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell';
const estGarde = h => typeof h?.command === 'string' && /garde-essaim\.mjs/.test(h.command);

export function fusionner(reglages, commande) {
  const r = structuredClone(reglages || {});
  r.hooks ||= {};
  r.hooks.PreToolUse ||= [];
  // retire toute ancienne entrée du garde, où qu'elle soit, puis l'ajoute une seule fois
  r.hooks.PreToolUse = r.hooks.PreToolUse
    .map(g => ({ ...g, hooks: (g.hooks || []).filter(h => !estGarde(h)) }))
    .filter(g => g.hooks.length);
  if (commande) r.hooks.PreToolUse.push({ matcher: MATCHER, hooks: [{ type: 'command', command: commande, timeout: 30 }] });
  if (!r.hooks.PreToolUse.length) delete r.hooks.PreToolUse;
  if (!Object.keys(r.hooks).length) delete r.hooks;
  return r;
}

function principal() {
  const [fichier, arg] = process.argv.slice(2);
  // --depuis-env : la commande est lue dans GARDE_COMMANDE (évite le passage d'arguments à guillemets sous PowerShell 5.1)
  const commande = arg === '--depuis-env' ? process.env.GARDE_COMMANDE : arg;
  if (!fichier || !commande) throw new Error('usage : installer-garde.mjs <settings.json> <commande> | --depuis-env | --retirer');
  let reglages = {};
  if (fs.existsSync(fichier)) {
    const brut = fs.readFileSync(fichier, 'utf8').replace(/^﻿/, '');
    try { reglages = brut.trim() ? JSON.parse(brut) : {}; }
    catch (e) { throw new Error(`${fichier} n'est pas un JSON valide : rien n'a été modifié (${e.message})`); }
    fs.copyFileSync(fichier, `${fichier}.bak-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  }
  const resultat = fusionner(reglages, commande === '--retirer' ? null : commande);
  fs.mkdirSync(path.dirname(path.resolve(fichier)), { recursive: true });
  fs.writeFileSync(fichier, JSON.stringify(resultat, null, 2) + '\n');
  console.log(commande === '--retirer' ? `garde retiré de ${fichier}` : `garde installé dans ${fichier}`);
}

const estPrincipal = () => {
  try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url)); } catch { return false; }
};
if (process.argv[1] && estPrincipal()) {
  try { principal(); } catch (e) { console.error(e.message); process.exit(1); }
}
