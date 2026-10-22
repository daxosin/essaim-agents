#!/usr/bin/env node
// milieu.mjs — milieu stigmergique partagé entre sous-agents.
// Principe : tout est en ajout seul. Aucun fichier n'est réécrit par deux agents,
// les verrous sont des créations exclusives (flag 'wx'), l'évaporation est calculée à la lecture.
// Usage : node milieu.mjs <commande> <mission> [args...]   (node milieu.mjs aide)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.MILIEU_DIR || '_milieu';
const DEMI_VIE_H = Number(process.env.MILIEU_DEMI_VIE_H || 24);   // demi-vie des phéromones
const VERROU_MIN = Number(process.env.MILIEU_VERROU_MIN || 30);   // verrou périmé au-delà
const SEUIL = Number(process.env.MILIEU_SEUIL || 0.5);            // score sous lequel une piste est évaporée

const [, , cmd, mission, ...a] = process.argv;
const dir = (...p) => path.join(ROOT, mission ?? '', ...p);
const now = () => new Date().toISOString();
const die = (m, code = 1) => { console.error(m); process.exit(code); };
const lire = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const ls = d => (fs.existsSync(d) ? fs.readdirSync(d) : []);
const suffixe = () => now().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 6);
const nomValide = s => /^[A-Za-z0-9_-]+$/.test(s || '');

function creerExclusif(f, contenu) {
  try { fs.writeFileSync(f, contenu, { flag: 'wx' }); return true; }
  catch (e) { if (e.code === 'EEXIST') return false; throw e; }
}

function verrouActif(f) {
  if (!fs.existsSync(f)) return false;
  const ageMin = (Date.now() - fs.statSync(f).mtimeMs) / 60000;
  if (ageMin > VERROU_MIN) { fs.rmSync(f, { force: true }); return false; }
  return true;
}

function score(id) {
  const d = dir('renforts', id);
  return ls(d).reduce((s, f) => {
    const r = lire(path.join(d, f));
    const ageH = (Date.now() - Date.parse(r.date)) / 3.6e6;
    return s + r.poids * Math.pow(0.5, ageH / DEMI_VIE_H);
  }, 0);
}

function statut(id) {
  const v = dir('verdicts', id + '.json');
  if (fs.existsSync(v)) return lire(v).verdict === 'valide' ? 'validee' : 'rejetee';
  if (fs.existsSync(dir('faites', id + '.json'))) return 'faite';
  if (fs.existsSync(dir('abandons', id + '.json'))) return 'abandonnee';
  if (verrouActif(dir('verrous', id + '.lock'))) return 'prise';
  return 'ouverte';
}

const taches = () => ls(dir('taches')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();

function exiger(id) {
  if (!id || !fs.existsSync(dir('taches', id + '.json'))) die(`tâche inconnue : ${id}`);
  return lire(dir('taches', id + '.json'));
}

function poser(id, agent, poids, raison = '') {
  if (!Number.isFinite(poids)) die('poids non numérique');
  const d = dir('renforts', id);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, `${suffixe()}-${agent}.json`),
    JSON.stringify({ agent, poids, raison, date: now() }));
}

function detenteurVerrou(f) {
  try { return lire(f).agent; } catch { return null; }
}

const cmds = {
  aide() {
    console.log(`Commandes (node milieu.mjs <cmd> <mission> ...):
  init       <mission> "<objectif>" [budget_taches=40]
  deposer    <mission> <agent> "<titre>" [poids=3] ["description"]
  renforcer  <mission> <T-id> <agent> [poids=1] ["raison"]   (poids négatif = contestation)
  suivante   <mission> <agent>        prend la tâche ouverte la plus forte (ou VIDE)
  terminer   <mission> <T-id> <agent> ["résumé"]
  abandonner <mission> <T-id> <agent> ["raison"]
  a_valider  <mission> <agent>        prend une tâche faite à valider (ou VIDE)
  verdict    <mission> <T-id> <agent> valide|rejete ["raison"]
  voir       <mission> <T-id>
  etat       <mission>
Env : MILIEU_DIR, MILIEU_DEMI_VIE_H (24), MILIEU_VERROU_MIN (30), MILIEU_SEUIL (0.5)`);
  },

  init() {
    const [objectif, budget = '40'] = a;
    if (!nomValide(mission) || !objectif) die('usage : init <mission> "<objectif>" [budget_taches]');
    for (const s of ['taches', 'renforts', 'verrous', 'faites', 'abandons', 'verdicts', 'traces'])
      fs.mkdirSync(dir(s), { recursive: true });
    if (!creerExclusif(dir('mission.json'),
      JSON.stringify({ objectif, budget_taches: Number(budget), cree: now() }, null, 2)))
      die(`mission ${mission} existe déjà`);
    console.log(`mission ${mission} initialisée (budget ${budget} tâches)`);
  },

  deposer() {
    const [agent, titre, poids = '3', ...desc] = a;
    if (!nomValide(agent) || !titre) die('usage : deposer <mission> <agent> "<titre>" [poids] ["description"]');
    const m = lire(dir('mission.json'));
    const cle = titre.trim().toLowerCase();
    for (const id of taches()) {
      if (lire(dir('taches', id + '.json')).titre.trim().toLowerCase() === cle) {
        poser(id, agent, Number(poids), 'redépôt');
        return console.log(`DOUBLON ${id} renforcée`);
      }
    }
    for (let n = taches().length + 1; ; n++) {
      if (n > m.budget_taches) die(`BUDGET atteint (${m.budget_taches} tâches) — pas de dépôt`, 2);
      const id = 'T-' + String(n).padStart(3, '0');
      const t = { id, titre: titre.trim(), description: desc.join(' '), par: agent, date: now() };
      if (creerExclusif(dir('taches', id + '.json'), JSON.stringify(t, null, 2))) {
        poser(id, agent, Number(poids), 'dépôt');
        return console.log(id);
      }
    }
  },

  renforcer() {
    const [id, agent, poids = '1', ...r] = a;
    exiger(id);
    if (!nomValide(agent)) die('agent invalide');
    poser(id, agent, Number(poids), r.join(' '));
    console.log(`${id} ${Number(poids) >= 0 ? '+' : ''}${poids} → score ${score(id).toFixed(2)}`);
  },

  suivante() {
    const [agent] = a;
    if (!nomValide(agent)) die('usage : suivante <mission> <agent>');
    const candidates = taches()
      .filter(id => statut(id) === 'ouverte')
      .map(id => [id, score(id)])
      .filter(([, s]) => s >= SEUIL)
      .sort((x, y) => y[1] - x[1]);
    for (const [id, s] of candidates) {
      if (creerExclusif(dir('verrous', id + '.lock'), JSON.stringify({ agent, date: now() }))) {
        return console.log(JSON.stringify({ ...lire(dir('taches', id + '.json')), score: +s.toFixed(2),
          trace: path.join(ROOT, mission, 'traces', `${id}.${agent}.md`) }, null, 2));
      }
    }
    console.log('VIDE');
  },

  terminer() {
    const [id, agent, ...resume] = a;
    exiger(id);
    const lock = dir('verrous', id + '.lock');
    const det = detenteurVerrou(lock);
    if (det && det !== agent) die(`${id} est tenue par ${det}`);
    if (!creerExclusif(dir('faites', id + '.json'), JSON.stringify({ agent, resume: resume.join(' '),
      trace: `traces/${id}.${agent}.md`, date: now() }, null, 2))) die(`${id} déjà terminée`);
    fs.rmSync(lock, { force: true });
    console.log(`${id} faite`);
  },

  abandonner() {
    const [id, agent, ...raison] = a;
    exiger(id);
    const lock = dir('verrous', id + '.lock');
    const det = detenteurVerrou(lock);
    if (det && det !== agent) die(`${id} est tenue par ${det}`);
    creerExclusif(dir('abandons', id + '.json'), JSON.stringify({ agent, raison: raison.join(' '), date: now() }));
    fs.rmSync(lock, { force: true });
    console.log(`${id} abandonnée`);
  },

  a_valider() {
    const [agent] = a;
    if (!nomValide(agent)) die('usage : a_valider <mission> <agent>');
    for (const id of taches().filter(id => statut(id) === 'faite')) {
      const f = lire(dir('faites', id + '.json'));
      if (f.agent === agent) continue;                       // jamais son propre travail
      const lock = dir('verdicts', id + '.lock');
      if (!verrouActif(lock) && creerExclusif(lock, JSON.stringify({ agent, date: now() }))) {
        return console.log(JSON.stringify({ tache: lire(dir('taches', id + '.json')), faite: f,
          trace: path.join(ROOT, mission, f.trace) }, null, 2));
      }
    }
    console.log('VIDE');
  },

  verdict() {
    const [id, agent, v, ...r] = a;
    exiger(id);
    if (!['valide', 'rejete'].includes(v)) die('verdict : valide | rejete');
    const fp = dir('faites', id + '.json');
    if (!fs.existsSync(fp)) die(`${id} n'est pas terminée`);
    if (lire(fp).agent === agent) die('un agent ne valide pas son propre travail');
    if (!creerExclusif(dir('verdicts', id + '.json'),
      JSON.stringify({ agent, verdict: v, raison: r.join(' '), date: now() }, null, 2)))
      die(`${id} a déjà un verdict`);
    poser(id, agent, v === 'valide' ? 2 : -5, `verdict ${v}`);
    fs.rmSync(dir('verdicts', id + '.lock'), { force: true });
    console.log(`${id} ${v}`);
  },

  voir() {
    const [id] = a;
    const t = exiger(id);
    const opt = f => (fs.existsSync(f) ? lire(f) : null);
    console.log(JSON.stringify({ ...t, statut: statut(id), score: +score(id).toFixed(2),
      faite: opt(dir('faites', id + '.json')), verdict: opt(dir('verdicts', id + '.json')) }, null, 2));
  },

  etat() {
    const m = lire(dir('mission.json'));
    const ids = taches();
    console.log(`${mission} — ${m.objectif}  [${ids.length}/${m.budget_taches} tâches]`);
    const lignes = ids.map(id => [id, score(id), statut(id), lire(dir('taches', id + '.json')).titre])
      .sort((x, y) => y[1] - x[1]);
    for (const [id, s, st, t] of lignes)
      console.log(`${id}  ${s.toFixed(2).padStart(6)}  ${st.padEnd(10)}  ${t}${s < SEUIL && st === 'ouverte' ? '  (évaporée)' : ''}`);
    const n = st => lignes.filter(l => l[2] === st).length;
    console.log(`ouvertes ${n('ouverte')} · prises ${n('prise')} · faites ${n('faite')} · validées ${n('validee')} · rejetées ${n('rejetee')}`);
  },
};

if (!cmd || !cmds[cmd]) { cmds.aide(); process.exit(cmd ? 1 : 0); }
if (cmd !== 'aide' && cmd !== 'init' && !fs.existsSync(dir('mission.json'))) die(`mission inconnue : ${mission}`);
cmds[cmd]();
