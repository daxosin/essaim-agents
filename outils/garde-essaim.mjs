#!/usr/bin/env node
// garde-essaim.mjs — hook PreToolUse de Claude Code : bloque mécaniquement ce qu'une consigne ne suffit pas à empêcher.
// Fail-closed : toute erreur interne bloque l'appel (code 2).
// Configuration : $CLAUDE_PROJECT_DIR/.claude/essaim-garde.json, sinon ~/.claude/essaim-garde.json, sinon valeurs par défaut.
//
// Deux niveaux de règles :
//   toujours     — s'applique à la session principale ET aux sous-agents
//   sous_agents  — s'applique seulement quand l'appel vient d'un sous-agent (champ agent_id ou agent_type présent)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAUT = {
  toujours: {
    // écritures (Write, Edit, NotebookEdit) autorisées seulement sous ces racines ; « . » = racine du projet, « ~ » = dossier personnel.
    // La session principale travaille sous le contrôle direct de l'humain : tout le dossier personnel lui est ouvert.
    racines_ecriture: ['~'],
    // chemins jamais modifiables, même sous une racine autorisée (expressions régulières, chemins en « / »)
    chemins_interdits: ['(^|/)\\.env($|\\.)', '(^|/)\\.git/', '(^|/)\\.claude/settings[^/]*\\.json$', '(^|/)\\.claude/essaim-garde\\.json$',
      '(^|/)garde[^/]*\\.(m?js|cjs)$'],         // aucun garde (le mien ou ceux de l'utilisateur) ne se modifie
    // commandes Bash / PowerShell interdites (expressions régulières, insensibles à la casse)
    commandes_interdites: ['rm\\s+-[a-z]*r[a-z]*f?\\s+(/|~|\\$HOME|[A-Za-z]:\\\\)\\s*$', 'git\\s+push\\s+.*--force'],
  },
  sous_agents: {
    // un sous-agent reste confiné au projet
    racines_ecriture: ['.'],
    // dans le milieu, un sous-agent n'écrit que ses traces : tout le reste passe par milieu.mjs
    chemins_interdits: ['(^|/)_milieu/[^/]+/(mission\\.json|(taches|renforts|verrous|faites|abandons|verdicts|echecs|depenses)/)',
      '(^|/)\\.claude/(agents|skills)/'],
    // un sous-agent propose, l'humain exécute : rien vers la production ni les données de santé
    commandes_interdites: [
      '\\bsupabase\\b', '\\bpsql\\b', 'supabase\\.co', '\\bpg_dump\\b',
      '\\bvercel\\b.*\\b(deploy|--prod|env\\s+(add|rm))\\b', '\\bgit\\s+push\\b', '\\bgh\\s+(pr\\s+merge|release|repo\\s+delete)\\b',
      '\\bnpm\\s+publish\\b', 'Remove-Item\\b.*-Recurse', '\\brm\\s+-[a-z]*r',
      '\\bcurl\\b.*-X\\s*(POST|PUT|PATCH|DELETE)', 'Invoke-(RestMethod|WebRequest)\\b.*-Method\\s+(Post|Put|Patch|Delete)',
    ],
  },
};

const OUTILS_ECRITURE = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const OUTILS_COMMANDE = new Set(['Bash', 'PowerShell']);
const norme = p => path.resolve(p).replace(/\\/g, '/').replace(/\/+$/, '');
const sous = (p, racine) => {
  const a = process.platform === 'win32' ? p.toLowerCase() : p;
  const b = process.platform === 'win32' ? racine.toLowerCase() : racine;
  return a === b || a.startsWith(b + '/');
};

export function chargerConfig(projet) {
  for (const f of [path.join(projet, '.claude', 'essaim-garde.json'), path.join(os.homedir(), '.claude', 'essaim-garde.json')]) {
    if (fs.existsSync(f)) {
      const c = JSON.parse(fs.readFileSync(f, 'utf8'));
      return { toujours: { ...DEFAUT.toujours, ...(c.toujours || {}) }, sous_agents: { ...DEFAUT.sous_agents, ...(c.sous_agents || {}) } };
    }
  }
  return DEFAUT;
}

// Rend null si l'appel est autorisé, sinon le motif du refus.
export function examiner(entree, config, projet) {
  const outil = entree.tool_name;
  const ti = entree.tool_input || {};
  const estSousAgent = Boolean(entree.agent_id || entree.agent_type);
  const niveaux = estSousAgent ? [['toujours', config.toujours], ['sous-agent', config.sous_agents]] : [['toujours', config.toujours]];
  const base = entree.cwd || projet;

  if (OUTILS_ECRITURE.has(outil)) {
    const brut = ti.file_path ?? ti.notebook_path ?? ti.path;
    if (!brut) return `${outil} sans chemin de fichier : refus par prudence`;
    const cible = norme(path.isAbsolute(brut) ? brut : path.join(base, brut));
    const racine = x => {
      const y = x.replace(/^~(?=$|[\\/])/, os.homedir());
      return norme(path.isAbsolute(y) || /^[A-Za-z]:[\\/]/.test(y) ? y : path.join(projet, y));
    };
    for (const [nom, r] of niveaux) {
      const racines = r.racines_ecriture.map(racine);
      if (!racines.some(x => sous(cible, x))) return `écriture hors périmètre (${nom}) : ${cible} — racines autorisées : ${racines.join(', ')}`;
      const interdit = r.chemins_interdits.find(re => new RegExp(re, 'i').test(cible));
      if (interdit) return `chemin protégé (${nom}) : ${cible} — règle ${interdit}`;
    }
  }

  if (OUTILS_COMMANDE.has(outil)) {
    const commande = String(ti.command ?? '');
    for (const [nom, r] of niveaux) {
      const interdit = r.commandes_interdites.find(re => new RegExp(re, 'i').test(commande));
      if (interdit) return `commande interdite (${nom}) : règle ${interdit}${nom === 'sous-agent' ? ' — un sous-agent propose, l’humain exécute' : ''}`;
    }
  }
  return null;
}

async function principal() {
  let brut = '';
  for await (const morceau of process.stdin) brut += morceau;
  const entree = JSON.parse(brut);
  const projet = process.env.CLAUDE_PROJECT_DIR || entree.cwd || process.cwd();
  const motif = examiner(entree, chargerConfig(projet), projet);
  if (process.env.GARDE_JOURNAL)
    fs.appendFileSync(process.env.GARDE_JOURNAL, JSON.stringify({ date: new Date().toISOString(), outil: entree.tool_name,
      agent: entree.agent_type || entree.agent_id || null, decision: motif ? 'refus' : 'accord', motif }) + '\n');
  if (motif) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse',
      permissionDecision: 'deny', permissionDecisionReason: `[garde-essaim] ${motif}` } }));
  }
  process.exit(0);
}

const estPrincipal = () => {
  try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url)); } catch { return false; }
};
if (process.argv[1] && estPrincipal()) principal().catch(e => { process.stderr.write(`[garde-essaim] erreur interne, appel bloqué par prudence : ${e.message}\n`); process.exit(2); });
