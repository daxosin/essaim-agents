#!/usr/bin/env node
// Resynchronise les annexes des skills avec leurs outils :
//   skills/essaim/SKILL.md           ← outils/milieu.mjs
//   skills/avocat-du-diable/SKILL.md ← outils/avocat.mjs
// À lancer après toute modification d'un de ces outils : node outils/construire-skill.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAIRES = [['essaim', 'milieu.mjs'], ['avocat-du-diable', 'avocat.mjs']];

for (const [skillNom, outil] of PAIRES) {
  const skill = path.join(RACINE, 'skills', skillNom, 'SKILL.md');
  const code = fs.readFileSync(path.join(RACINE, 'outils', outil), 'utf8').trimEnd();
  const texte = fs.readFileSync(skill, 'utf8');
  const marque = `## Annexe — ${outil}`;
  const i = texte.indexOf(marque);
  if (i < 0) throw new Error(`${skillNom} : section « ${marque} » introuvable`);
  const debut = texte.indexOf('```js\n', i);
  const fin = texte.lastIndexOf('\n```');
  if (debut < 0 || fin < debut) throw new Error(`${skillNom} : bloc \`\`\`js de l’annexe introuvable`);
  const corps = texte.slice(debut + 6, fin);
  const nouveau = texte.slice(0, debut + 6) + code + texte.slice(fin);
  fs.writeFileSync(skill, nouveau);
  console.log(`${skillNom} : annexe ${corps === code ? 'déjà à jour' : 'resynchronisée'}`);
}
