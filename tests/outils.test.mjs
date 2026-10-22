// Lancer : node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composer, resoudre, detecterSensible, lireArguments, nomSujet, MODELES } from '../outils/avocat.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const MILIEU = path.join(ICI, '..', 'outils', 'milieu.mjs');
const AVOCAT = path.join(ICI, '..', 'outils', 'avocat.mjs');

function bac() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'milieu-'));
  const env = { ...process.env, MILIEU_DIR: dir };
  const m = (...a) => spawnSync(process.execPath, [MILIEU, ...a], { env, encoding: 'utf8' });
  return { dir, env, m };
}

test('cycle complet : dépôt, doublon, prise, verdict, budget', () => {
  const { m } = bac();
  assert.equal(m('init', 'x', 'objectif', '3').status, 0);
  assert.equal(m('deposer', 'x', 'o', 'Piste A', '4').stdout.trim(), 'T-001');
  assert.match(m('deposer', 'x', 'f1', 'piste a ', '1').stdout, /DOUBLON T-001/);
  assert.match(m('suivante', 'x', 'f1').stdout, /"T-001"/);
  assert.match(m('suivante', 'x', 'f2').stdout, /VIDE/);
  assert.notEqual(m('terminer', 'x', 'T-001', 'f2').status, 0, 'seul le détenteur termine');
  assert.equal(m('terminer', 'x', 'T-001', 'f1', 'ok').status, 0);
  assert.match(m('a_valider', 'x', 'f1').stdout, /VIDE/, 'pas d’auto-validation');
  assert.notEqual(m('verdict', 'x', 'T-001', 'f1', 'valide').status, 0);
  assert.match(m('a_valider', 'x', 'v1').stdout, /T-001/);
  assert.equal(m('verdict', 'x', 'T-001', 'v1', 'valide', 'vu').status, 0);
  assert.notEqual(m('verdict', 'x', 'T-001', 'v2', 'rejete').status, 0, 'un seul verdict');
  m('deposer', 'x', 'o', 'B'); m('deposer', 'x', 'o', 'C');
  assert.equal(m('deposer', 'x', 'o', 'D').status, 2, 'budget');
  assert.match(m('etat', 'x').stdout, /validées 1/);
});

test('évaporation : une piste ancienne passe sous le seuil', () => {
  const { dir, m } = bac();
  m('init', 'e', 'evap', '5');
  m('deposer', 'e', 'o', 'Vieille', '3');
  const d = path.join(dir, 'e', 'renforts', 'T-001');
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const r = JSON.parse(fs.readFileSync(p, 'utf8'));
    r.date = new Date(Date.now() - 72 * 3.6e6).toISOString();      // 3 demi-vies : 3 → 0,375
    fs.writeFileSync(p, JSON.stringify(r));
  }
  assert.match(m('suivante', 'e', 'f1').stdout, /VIDE/);
  assert.match(m('etat', 'e').stdout, /évaporée/);
});

test('course : 12 agents simultanés, un seul gagnant', async () => {
  const { env, m } = bac();
  m('init', 'r', 'course', '5');
  m('deposer', 'r', 'o', 'Unique', '3');
  const sorties = await Promise.all(Array.from({ length: 12 }, (_, i) => new Promise(res => {
    const p = spawn(process.execPath, [MILIEU, 'suivante', 'r', `a${i}`], { env });
    let s = ''; p.stdout.on('data', d => (s += d)); p.on('close', () => res(s));
  })));
  assert.equal(sorties.filter(s => s.includes('"T-001"')).length, 1);
});

test('noms d’agent et de mission validés', () => {
  const { m } = bac();
  assert.notEqual(m('init', '../evasion', 'x').status, 0);
  m('init', 'n', 'x', '5');
  assert.notEqual(m('deposer', 'n', '../x', 'T').status, 0);
});

test('avocat : prompt complet, modes contrôlés', () => {
  const p = composer({ mode: 'audit', fichiers: [{ nom: 'a.md', contenu: 'X' }], contexte: 'critère' });
  assert.match(p.systeme, /TROUVER LES ERREURS/);
  assert.match(p.utilisateur, /critère[\s\S]*a\.md[\s\S]*X/);
  assert.match(composer({ mode: 'contradiction', fichiers: [] }).systeme, /MEILLEUR CAS CONTRE/);
  assert.throws(() => composer({ mode: 'autre', fichiers: [] }));
});

test('avocat : un seul modèle, choisi explicitement', () => {
  assert.throws(() => resoudre(undefined), /choisir un modèle/);
  assert.throws(() => resoudre('sol,kimi'), /un seul modèle/);
  assert.equal(resoudre('sol', true).id, MODELES.sol.pro);
  assert.equal(resoudre('kimi', true).id, MODELES.kimi.id);
  assert.equal(resoudre('x-ai/grok-9').id, 'x-ai/grok-9');
  assert.throws(() => resoudre('inconnu'));
  assert.throws(() => resoudre('../../etc'));
});

test('avocat : arguments et nom de sujet', () => {
  assert.throws(() => lireArguments(['--modele']), /valeur manquante/);
  assert.throws(() => lireArguments(['--modele', '--estimer']), /valeur manquante/);
  assert.equal(nomSujet('../PRD Agent sécurité'), 'PRD-Agent-securite');
  assert.equal(nomSujet(''), 'sans-sujet');
});

test('avocat : détection de données sensibles', () => {
  assert.deepEqual(detecterSensible('Code propre, rien à signaler.'), []);
  assert.ok(detecterSensible('NIR 1 85 05 78 006 084 36').length);
  assert.ok(detecterSensible('contact : jean.dupont@exemple.fr').length);
  assert.ok(detecterSensible('tel +33 6 12 34 56 78').length);
  assert.ok(detecterSensible('Le patient a reçu').length);
});

test('avocat : arrêt sans modèle, sans clé, ou sur données sensibles', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avocat-'));
  const f = path.join(dir, 'a.md');
  fs.writeFileSync(f, 'Plan neutre.');
  const env = { ...process.env, OPENROUTER_API_KEY: '' };
  const lancer = (...a) => spawnSync(process.execPath, [AVOCAT, ...a], { env, cwd: dir, encoding: 'utf8' });
  assert.match(lancer('--fichier', f).stderr, /choisir un modèle/);
  assert.match(lancer('--modele', 'sol', '--fichier', f).stderr, /OPENROUTER_API_KEY/);
  const p = lancer('--fichier', f, '--sujet', 'essai', '--prompt-seul');
  assert.equal(p.status, 0);
  assert.ok(fs.existsSync(path.join(dir, p.stdout.trim())));
  fs.writeFileSync(f, 'Le patient né le 3 mars.');
  assert.match(lancer('--modele', 'sol', '--fichier', f).stderr, /ARRÊT/);
});

test('la skill essaim embarque la version courante de milieu.mjs', () => {
  const skill = fs.readFileSync(path.join(ICI, '..', 'skills', 'essaim', 'SKILL.md'), 'utf8');
  assert.ok(skill.includes(fs.readFileSync(MILIEU, 'utf8').trimEnd()), 'annexe désynchronisée : relancer outils/construire-skill.mjs');
});
