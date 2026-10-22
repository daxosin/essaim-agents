// Lancer : node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as avocat from '../outils/avocat.mjs';
import { examiner, DEFAUT } from '../outils/garde-essaim.mjs';
import { fusionner } from '../outils/installer-garde.mjs';
import * as journal from '../outils/journal.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const OUTIL = n => path.join(ICI, '..', 'outils', n);
const MILIEU = OUTIL('milieu.mjs');

function bac() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'milieu-'));
  const env = { ...process.env, MILIEU_DIR: dir };
  const m = (...a) => spawnSync(process.execPath, [MILIEU, ...a], { env, encoding: 'utf8' });
  const enParallele = (n, args) => Promise.all(Array.from({ length: n }, (_, i) => new Promise(res => {
    const p = spawn(process.execPath, [MILIEU, ...args(i)], { env });
    let s = ''; p.stdout.on('data', d => (s += d)); p.on('close', () => res(s));
  })));
  return { dir, env, m, enParallele };
}
const RESUME = '## Faits vérifiés\na\n## Tentatives et erreurs\nb\n## Pistes éliminées\nc\n## Hypothèse en cours (suspecte)\nd\n';

// ───────────────────────── milieu ─────────────────────────

test('milieu : cycle complet, doublon, contrôle, budget', () => {
  const { m } = bac();
  assert.equal(m('init', 'x', 'objectif', '3').status, 0);
  assert.equal(m('deposer', 'x', 'o', 'Piste A', '4').stdout.trim(), 'T-001');
  assert.match(m('deposer', 'x', 'f1', 'piste  a ', '1').stdout, /DOUBLON T-001/);
  assert.match(m('suivante', 'x', 'f1').stdout, /"T-001"/);
  assert.match(m('suivante', 'x', 'f2').stdout, /VIDE/);
  assert.notEqual(m('terminer', 'x', 'T-001', 'f2').status, 0, 'seul le détenteur termine');
  assert.equal(m('terminer', 'x', 'T-001', 'f1', 'ok').status, 0);
  assert.match(m('a_controler', 'x', 'f1').stdout, /VIDE/, 'pas d’auto-contrôle');
  assert.notEqual(m('verdict', 'x', 'T-001', 'c2', 'retenu').status, 0, 'verdict sans a_controler refusé');
  assert.match(m('a_controler', 'x', 'c1').stdout, /T-001/);
  assert.equal(m('verdict', 'x', 'T-001', 'c1', 'retenu', 'vu').status, 0);
  assert.notEqual(m('verdict', 'x', 'T-001', 'c1', 'ecarte').status, 0, 'un seul verdict');
  m('deposer', 'x', 'o', 'B'); m('deposer', 'x', 'o', 'C');
  assert.equal(m('deposer', 'x', 'o', 'D').status, 2, 'budget de tâches');
  assert.match(m('etat', 'x').stdout, /retenues 1/);
});

test('milieu : terminer une tâche jamais prise est refusé', () => {
  const { m } = bac();
  m('init', 'x', 'o', '5'); m('deposer', 'x', 'o', 'A');
  assert.notEqual(m('terminer', 'x', 'T-001', 'f1').status, 0);
  assert.notEqual(m('abandonner', 'x', 'T-001', 'f1').status, 0);
});

test('milieu : course sans verrou — un seul gagnant sur 12', async () => {
  const { m, enParallele } = bac();
  m('init', 'r', 'course', '5'); m('deposer', 'r', 'o', 'Unique', '3');
  const s = await enParallele(12, i => ['suivante', 'r', `a${i}`]);
  assert.equal(s.filter(x => x.includes('"T-001"')).length, 1);
});

test('milieu : course sur verrou périmé — toujours un seul gagnant (10 essais × 8 agents)', async () => {
  for (let essai = 0; essai < 10; essai++) {
    const { dir, m, enParallele } = bac();
    m('init', 'r', 'course', '5'); m('deposer', 'r', 'o', 'Unique', '3');
    m('suivante', 'r', 'mort');
    const vieux = new Date(Date.now() - 40 * 60000);
    fs.utimesSync(path.join(dir, 'r', 'verrous', 'T-001.lock'), vieux, vieux);
    const s = await enParallele(8, i => ['suivante', 'r', `a${i}`]);
    assert.equal(s.filter(x => x.includes('"T-001"')).length, 1, `essai ${essai}`);
  }
});

test('milieu : dépôts simultanés du même titre — une seule tâche active', async () => {
  const { m, enParallele } = bac();
  m('init', 'd', 'doublons', '20');
  await enParallele(8, i => ['deposer', 'd', `a${i}`, 'Même piste', '2']);
  const actives = m('etat', 'd').stdout.split('\n').filter(l => /\souverte\s+Même piste/.test(l));
  assert.equal(actives.length, 1, 'une seule tâche active');
  assert.match(actives[0], /\s16\.00\s/, 'les 8 dépôts (poids 2) ont tous renforcé la tâche active');
});

test('milieu : évaporation des pistes anciennes', () => {
  const { dir, m } = bac();
  m('init', 'e', 'evap', '5'); m('deposer', 'e', 'o', 'Vieille', '3');
  const d = path.join(dir, 'e', 'renforts', 'T-001');
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f), r = JSON.parse(fs.readFileSync(p, 'utf8'));
    r.date = new Date(Date.now() - 72 * 3.6e6).toISOString();      // 3 demi-vies : 3 → 0,375
    fs.writeFileSync(p, JSON.stringify(r));
  }
  assert.match(m('suivante', 'e', 'f1').stdout, /VIDE/);
  assert.match(m('etat', 'e').stdout, /évaporée/);
});

test('milieu : injections de chemin refusées (mission, agent, T-id)', () => {
  const { m } = bac();
  assert.notEqual(m('init', '../evasion', 'x').status, 0);
  m('init', 'n', 'x', '5'); m('deposer', 'n', 'o', 'A');
  assert.notEqual(m('etat', '../n').status, 0);
  assert.notEqual(m('deposer', 'n', '../x', 'T').status, 0);
  assert.notEqual(m('renforcer', 'n', '../mission', 'o', '1').status, 0);
  assert.notEqual(m('voir', 'n', '../../T-001').status, 0);
  assert.notEqual(m('constructor', 'n').status, 0);
});

test('milieu : un renfort illisible est ignoré, la mission continue', () => {
  const { dir, m } = bac();
  m('init', 'c', 'x', '5'); m('deposer', 'c', 'o', 'A', '3');
  fs.writeFileSync(path.join(dir, 'c', 'renforts', 'T-001', 'abime.json'), '');
  const r = m('suivante', 'c', 'f1');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /"T-001"/);
  assert.match(r.stderr, /illisible/);
});

test('milieu : relève — résumé exigé, carnet transmis, blocage au 3e échec', () => {
  const { dir, m } = bac();
  m('init', 'v', 'releve', '5'); m('deposer', 'v', 'o', 'Dure', '4');
  const resume = a => path.join(dir, 'v', 'traces', `T-001.${a}.echec.md`);
  m('suivante', 'v', 'a1');
  assert.match(m('echec', 'v', 'T-001', 'a1').stderr, /résumé de relève absent/);
  fs.writeFileSync(resume('a1'), '## Faits vérifiés\nx\n');
  assert.match(m('echec', 'v', 'T-001', 'a1').stderr, /rubriques manquantes/);
  fs.writeFileSync(resume('a1'), RESUME);
  assert.equal(m('echec', 'v', 'T-001', 'a1').status, 0);
  const s = JSON.parse(m('suivante', 'v', 'a2').stdout);
  assert.equal(s.releve, 1);
  assert.equal(s.carnet_echecs.length, 1);
  assert.match(s.consigne, /suspectes/);
  assert.ok(path.isAbsolute(s.trace) && path.isAbsolute(s.resume_echec_si_besoin));
  fs.writeFileSync(resume('a2'), RESUME);
  assert.match(m('echec', 'v', 'T-001', 'a2').stdout, /changer de famille/);
  m('suivante', 'v', 'a3');
  assert.match(m('releve', 'v', 'T-001', 'agent muet').stdout, /BLOQUEE/);
  assert.match(m('etat', 'v').stdout, /bloquee/);
  assert.match(m('suivante', 'v', 'a4').stdout, /VIDE/);
});

test('milieu : castes et plafonds de poids', () => {
  const { m } = bac();
  m('init', 'k', 'castes', '10');
  m('deposer', 'k', 'o', 'Forte', '5');
  assert.notEqual(m('deposer', 'k', 'ecl-1', 'Trop forte', '4').status, 0, 'éclaireur plafonné à 2');
  m('deposer', 'k', 'ecl-1', 'Faible', '2');
  assert.notEqual(m('renforcer', 'k', 'T-001', 'o', '9').status, 0, 'agent plafonné à 5');
  assert.match(m('suivante', 'k', 'ouv-1').stdout, /"Forte"/);
  assert.match(m('suivante', 'k', 'ouv-2').stdout, /VIDE/, 'un ouvrier ne prend pas une piste faible');
  assert.match(m('suivante', 'k', 'ecl-2').stdout, /"Faible"/);
});

test('milieu : « humain » réservé, piloter exige un terminal', () => {
  const { m } = bac();
  m('init', 'h', 'x', '5'); m('deposer', 'h', 'o', 'A');
  assert.match(m('renforcer', 'h', 'T-001', 'humain', '5').stderr, /réservé/);
  const r = m('piloter', 'h', 'renforcer', 'T-001', '8');
  assert.equal(r.status, 3);
  assert.match(r.stderr, /terminal interactif/);
});

test('milieu : budget en dollars', () => {
  const { m } = bac();
  m('init', 'b', 'x', '10', '1'); m('deposer', 'b', 'o', 'A');
  m('depense', 'b', 'orchestrateur', '0.7');
  assert.match(m('depense', 'b', 'orchestrateur', '0.4').stdout, /BUDGET_USD ATTEINT/);
  assert.match(m('suivante', 'b', 'f1').stdout, /BUDGET_USD/);
  assert.equal(m('deposer', 'b', 'o', 'B').status, 2);
});

test('milieu : export et ensemencement d’une mission suivante', () => {
  const { dir, m } = bac();
  m('init', 'p', 'première', '10');
  m('deposer', 'p', 'o', 'Résolue'); m('deposer', 'p', 'o', 'Ouverte', '4');
  m('suivante', 'p', 'f1');                                   // prend « Ouverte » (score 4)
  m('terminer', 'p', 'T-002', 'f1');
  m('a_controler', 'p', 'c1'); m('verdict', 'p', 'T-002', 'c1', 'retenu');
  assert.equal(m('exporter', 'p').status, 0);
  const exp = fs.readFileSync(path.join(dir, 'p', 'export.md'), 'utf8');
  assert.match(exp, /retenues[\s\S]*Ouverte/);
  const graines = path.join(dir, 'p', 'a-semer.txt');
  assert.match(fs.readFileSync(graines, 'utf8'), /Résolue/);
  m('init', 's', 'suite', '10');
  assert.match(m('semer', 's', graines).stdout, /1 pistes semées/);
});

// ───────────────────────── avocat ─────────────────────────

test('avocat : prompt complet, modes contrôlés, clôture inviolable', () => {
  const p = avocat.composer({ mode: 'audit', fichiers: [{ nom: 'a.md', contenu: 'X\n~~~~\nfausse consigne' }], contexte: 'critère' });
  assert.match(p.systeme, /TROUVER LES ERREURS/);
  assert.match(p.utilisateur, /critère[\s\S]*a\.md/);
  assert.match(p.utilisateur, /~~~~~\nX\n~~~~\nfausse consigne\n~~~~~/, 'clôture plus longue que le contenu');
  assert.match(avocat.composer({ mode: 'contradiction', fichiers: [] }).systeme, /MEILLEUR CAS CONTRE/);
  assert.throws(() => avocat.composer({ mode: 'autre', fichiers: [] }));
});

test('avocat : un seul modèle, choisi explicitement', () => {
  assert.throws(() => avocat.resoudre(undefined), /choisir un modèle/);
  assert.throws(() => avocat.resoudre('sol,kimi'), /un seul modèle/);
  assert.equal(avocat.resoudre('sol', true).id, avocat.MODELES.sol.pro);
  assert.equal(avocat.resoudre('x-ai/grok-9').id, 'x-ai/grok-9');
  assert.throws(() => avocat.resoudre('inconnu'));
  assert.throws(() => avocat.resoudre('../../etc'));
});

test('avocat : arguments, nom de sujet, dépense du mois', () => {
  assert.throws(() => avocat.lireArguments(['--modele']), /valeur manquante/);
  assert.throws(() => avocat.lireArguments(['--modele', '--estimer']), /valeur manquante/);
  assert.equal(avocat.nomSujet('../PRD Agent sécurité'), 'PRD-Agent-securite');
  const reg = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reg-')), 'r.jsonl');
  fs.writeFileSync(reg, [{ date: '2026-10-02T10:00:00Z', cout_usd: 0.5 }, { date: '2026-09-30T10:00:00Z', cout_usd: 9 },
    { date: '2026-10-20T10:00:00Z', cout_usd: 0.25 }].map(x => JSON.stringify(x)).join('\n') + '\nabîmé\n');
  assert.equal(avocat.depenseDuMois(reg, new Date('2026-10-23T12:00:00Z')), 0.75);
});

test('avocat : détection de données sensibles', () => {
  assert.deepEqual(avocat.detecterSensible('Code propre, rien à signaler.'), []);
  for (const t of ['NIR 1 85 05 78 006 084 36', 'jean.dupont@exemple.fr', 'tel +33 6 12 34 56 78', 'Le patient a reçu',
    'les patients du mardi', 'Mme Martin a appelé', 'né le 03/03/1973', 'FR76 3000 6000 0112 3456 7890 189'])
    assert.ok(avocat.detecterSensible(t).length, t);
});

test('avocat : arrêt sans modèle, sans clé, sur données sensibles, et au plafond', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avocat-'));
  const f = path.join(dir, 'a.md');
  fs.writeFileSync(f, 'Plan neutre.');
  const reg = path.join(dir, 'reg.jsonl');
  const env = { ...process.env, OPENROUTER_API_KEY: '', AVOCAT_REGISTRE: reg };
  const lancer = (e, ...a) => spawnSync(process.execPath, [OUTIL('avocat.mjs'), ...a], { env: { ...env, ...e }, cwd: dir, encoding: 'utf8' });
  assert.match(lancer({}, '--fichier', f).stderr, /choisir un modèle/);
  assert.match(lancer({}, '--modele', 'sol', '--fichier', f).stderr, /OPENROUTER_API_KEY/);
  const p = lancer({}, '--fichier', f, '--sujet', 'essai', '--prompt-seul');
  assert.equal(p.status, 0);
  assert.ok(fs.existsSync(path.join(dir, p.stdout.trim())));
  fs.writeFileSync(reg, JSON.stringify({ date: new Date().toISOString(), cout_usd: 5 }) + '\n');
  assert.match(lancer({ OPENROUTER_API_KEY: 'factice', AVOCAT_PLAFOND_MOIS_USD: '3' }, '--modele', 'sol', '--fichier', f).stderr, /PLAFOND MENSUEL/);
  fs.writeFileSync(f, 'Le patient né le 3 mars.');
  assert.match(lancer({}, '--modele', 'sol', '--fichier', f).stderr, /ARRÊT/);
});

// ───────────────────────── garde ─────────────────────────

const PROJET = path.join(os.homedir(), 'projet-garde-test');   // un vrai projet vit dans le dossier personnel
const appel = (outil, entree, agent) => ({ tool_name: outil, tool_input: entree, cwd: PROJET, ...(agent ? { agent_id: 'x', agent_type: agent } : {}) });

test('garde : écritures', () => {
  const ex = (o, e, a) => examiner(appel(o, e, a), DEFAUT, PROJET);
  const S = 'fourrageur';
  assert.equal(ex('Write', { file_path: path.join(PROJET, 'src/a.js') }, S), null);
  assert.equal(ex('Edit', { file_path: 'src/a.js' }, S), null, 'chemin relatif résolu sur cwd');
  assert.match(ex('Write', { file_path: path.join(os.tmpdir(), 'ailleurs.txt') }, S), /hors périmètre/);
  assert.match(ex('Write', { file_path: path.join(PROJET, '..', 'projet-garde-voisin', 'x') }, S), /hors périmètre/, 'préfixe trompeur');
  assert.equal(ex('Write', { file_path: path.join(os.homedir(), 'Desktop', 'notes.md') }), null, 'session principale : dossier personnel ouvert');
  assert.match(ex('Write', { file_path: path.join(os.homedir(), 'Desktop', 'notes.md') }, S), /hors périmètre/, 'sous-agent : confiné au projet');
  assert.match(ex('Write', { file_path: '/etc/hosts' }), /hors périmètre/, 'session principale : hors du dossier personnel');
  assert.match(ex('Edit', { file_path: path.join(PROJET, '.env.local') }), /protégé/);
  assert.match(ex('Edit', { file_path: path.join(PROJET, 'outils/garde-essaim.mjs') }), /protégé/);
  assert.match(ex('Edit', { file_path: path.join(PROJET, '.claude/settings.json') }), /protégé/);
  assert.match(ex('Write', {}), /sans chemin/);
});

test('garde : règles propres aux sous-agents', () => {
  const ex = (o, e, a) => examiner(appel(o, e, a), DEFAUT, PROJET);
  const interne = { file_path: path.join(PROJET, '_milieu/m/renforts/T-001/x.json') };
  const trace = { file_path: path.join(PROJET, '_milieu/m/traces/T-001.ouv-1.md') };
  assert.equal(ex('Write', interne), null, 'la session principale peut');
  assert.match(ex('Write', interne, 'fourrageur'), /protégé/);
  assert.equal(ex('Write', trace, 'fourrageur'), null, 'un sous-agent écrit ses traces');
  assert.equal(ex('Bash', { command: 'supabase db push' }), null, 'la session principale reste sous HITL');
  for (const c of ['supabase db push', 'git push origin main', 'npx vercel deploy --prod', 'curl -X POST https://x', 'rm -rf build'])
    assert.match(ex('Bash', { command: c }, 'fourrageur'), /interdite/, c);
  assert.equal(ex('Bash', { command: 'node outils/milieu.mjs suivante m ouv-1' }, 'fourrageur'), null);
  assert.match(ex('PowerShell', { command: 'Remove-Item C:\\x -Recurse' }, 'fourrageur'), /interdite/);
});

test('garde : refus en JSON, et blocage par prudence sur entrée illisible', () => {
  const g = OUTIL('garde-essaim.mjs');
  const env = { ...process.env, CLAUDE_PROJECT_DIR: PROJET };
  const ok = spawnSync(process.execPath, [g], { input: JSON.stringify(appel('Write', { file_path: '/etc/passwd' })), env, encoding: 'utf8' });
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const permis = spawnSync(process.execPath, [g], { input: JSON.stringify(appel('Write', { file_path: path.join(PROJET, 'a') })), env, encoding: 'utf8' });
  assert.equal(permis.status, 0);
  assert.equal(permis.stdout, '');
  const casse = spawnSync(process.execPath, [g], { input: '{pas du json', env, encoding: 'utf8' });
  assert.equal(casse.status, 2, 'fail-closed');
});

test('installer-garde : fusion sans toucher aux hooks existants, idempotente, réversible', () => {
  const existant = { model: 'opus', hooks: { PreToolUse: [{ matcher: 'Agent', hooks: [{ type: 'command', command: 'node "C:/x/garde-sous-agents.js"' }] }],
    SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'node a.js' }] }] } };
  const une = fusionner(existant, 'node "garde-essaim.mjs"');
  const deux = fusionner(une, 'node "garde-essaim.mjs"');
  assert.deepEqual(deux, une, 'idempotent');
  assert.equal(une.hooks.PreToolUse.length, 2);
  assert.equal(une.hooks.PreToolUse[0].hooks[0].command, 'node "C:/x/garde-sous-agents.js"', 'garde existant intact');
  assert.equal(une.model, 'opus');
  assert.deepEqual(fusionner(une, null), existant, 'retrait exact');
});

// ───────────────────────── journal ─────────────────────────

test('journal : validation et statistiques', () => {
  assert.throws(() => journal.valider({ mission: 'm', architecture: 'magie', verdict: 'utile' }), /architecture/);
  assert.throws(() => journal.valider({ mission: 'm', architecture: 'fanout' }), /verdict/);
  const e = (v, t, r) => journal.valider({ mission: 'm', architecture: 'fanout', verdict: v, taches: String(t), rejets: String(r) });
  const s = journal.statistiques([e('inutile', 10, 1), e('inutile', 10, 1), e('partiel', 10, 1), e('utile', 10, 1), e('inutile', 10, 1)]);
  assert.equal(s[0].missions, 5);
  assert.match(s[0].alerte, /moins d’une mission sur deux/);
  assert.match(journal.statistiques([e('utile', 4, 0)])[0].alerte, /trop petit/);
});

// ───────────────────────── cohérence ─────────────────────────

test('la skill essaim embarque la version courante de milieu.mjs', () => {
  const skill = fs.readFileSync(path.join(ICI, '..', 'skills', 'essaim', 'SKILL.md'), 'utf8');
  assert.ok(skill.includes(fs.readFileSync(MILIEU, 'utf8').trimEnd()), 'annexe désynchronisée : node outils/construire-skill.mjs');
});

test('les commandes citées dans les skills et agents existent dans milieu.mjs', () => {
  const aide = spawnSync(process.execPath, [MILIEU, 'aide'], { encoding: 'utf8' }).stdout;
  const textes = ['skills/essaim/SKILL.md', 'agents/fourrageur.md', 'agents/eclaireur.md', 'agents/controleur.md']
    .map(f => fs.readFileSync(path.join(ICI, '..', f), 'utf8').split('## Annexe')[0]).join('\n');
  const citees = new Set([...textes.matchAll(/`(?:node \S*milieu\.mjs )?(init|deposer|renforcer|suivante|prolonger|terminer|abandonner|echec|releve|a_controler|a_valider|verdict|depense|voir|etat|exporter|semer|piloter)\b/g)].map(x => x[1]));
  for (const c of citees) assert.match(aide, new RegExp(`\\b${c}\\b`), `commande citée mais inexistante : ${c}`);
});
