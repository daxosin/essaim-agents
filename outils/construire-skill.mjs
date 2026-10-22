#!/usr/bin/env node
// Resynchronise l'annexe de skills/essaim/SKILL.md avec outils/milieu.mjs.
// À lancer après toute modification de milieu.mjs : node outils/construire-skill.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = path.join(RACINE, 'skills', 'essaim', 'SKILL.md');
const code = fs.readFileSync(path.join(RACINE, 'outils', 'milieu.mjs'), 'utf8').trimEnd();
const texte = fs.readFileSync(skill, 'utf8');
const marque = '## Annexe — milieu.mjs';
const i = texte.indexOf(marque);
if (i < 0) throw new Error(`section « ${marque} » introuvable`);
const debut = texte.indexOf('```js\n', i);
const fin = texte.lastIndexOf('\n```');
if (debut < 0 || fin < debut) throw new Error('bloc ```js de l’annexe introuvable');
fs.writeFileSync(skill, texte.slice(0, debut + 6) + code + texte.slice(fin));
console.log('annexe resynchronisée');
