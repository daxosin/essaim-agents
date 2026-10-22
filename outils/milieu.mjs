#!/usr/bin/env node
// milieu.mjs — milieu stigmergique partagé entre sous-agents.
// Principes : ajout seul (aucun fichier réécrit par deux agents) ; créations atomiques et exclusives
// (fichier temporaire + lien dur) ; évaporation calculée à la lecture ; aucun processus résident.
// Usage : node milieu.mjs <commande> <mission> [args...]   (node milieu.mjs aide)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';

const ROOT = process.env.MILIEU_DIR || '_milieu';
const DEMI_VIE_H = Number(process.env.MILIEU_DEMI_VIE_H || 24);       // demi-vie des phéromones
const VERROU_MIN = Number(process.env.MILIEU_VERROU_MIN || 30);       // verrou périmé au-delà
const SEUIL = Number(process.env.MILIEU_SEUIL || 0.5);                // piste évaporée en dessous
const SEUIL_OUVRIER = Number(process.env.MILIEU_SEUIL_OUVRIER || 4);  // frontière éclaireurs / ouvriers
const MAX_ECHECS = 3;                                                 // au 3e échec : tâche bloquée
const POIDS_AGENT = [-3, 5];                                          // plafonds des agents
const POIDS_ECLAIREUR = 2;                                            // dépôt maximal d'un éclaireur
const POIDS_HUMAIN = [-10, 10];
const HUMAIN = 'humain';                                              // nom réservé, jamais utilisable par un agent
export const RUBRIQUES_ECHEC = ['## Faits vérifiés', '## Tentatives et erreurs', '## Pistes éliminées', '## Hypothèse en cours (suspecte)'];

const [, , cmd, mission, ...a] = process.argv;
const dir = (...p) => path.join(ROOT, mission ?? '', ...p);
const now = () => new Date().toISOString();
const die = (m, code = 1) => { console.error(m); process.exit(code); };
const ls = d => (fs.existsSync(d) ? fs.readdirSync(d).filter(f => !f.startsWith('.tmp-')) : []);
const unique = () => `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const nomValide = s => /^[A-Za-z0-9_-]{1,64}$/.test(s || '');
const idValide = s => /^T-\d{3,}$/.test(s || '');
const caste = agent => (agent.startsWith('ecl-') ? 'eclaireur' : agent.startsWith('ouv-') ? 'ouvrier' : 'libre');

function lire(f, essais = 5) {
  for (let i = 0; ; i++) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) {
      if (e.code === 'ENOENT' || i >= essais) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);   // fichier en cours d'écriture : on réessaie
    }
  }
}
const lireSiExiste = f => (fs.existsSync(f) ? lire(f) : null);
// Lecture d'un élément de liste : un fichier abîmé est ignoré avec un avertissement, il ne bloque pas la mission.
function lireOuIgnorer(f) {
  try { return lire(f, 2); }
  catch (e) { if (e.code !== 'ENOENT') console.error(`avertissement : fichier illisible ignoré : ${f}`); return null; }
}

// Création exclusive ET atomique : le contenu est complet dès que le fichier est visible.
function creerExclusif(f, contenu) {
  const tmp = path.join(path.dirname(f), `.tmp-${unique()}`);
  fs.writeFileSync(tmp, contenu);
  try { fs.linkSync(tmp, f); return true; }
  catch (e) { if (e.code === 'EEXIST') return false; throw e; }
  finally { fs.rmSync(tmp, { force: true }); }
}
// Ajout d'un fichier à nom unique (renfort, dépense, échec).
function ajouter(d, nom, objet) {
  fs.mkdirSync(d, { recursive: true });
  const tmp = path.join(d, `.tmp-${unique()}`);
  fs.writeFileSync(tmp, JSON.stringify(objet));
  fs.renameSync(tmp, path.join(d, `${nom}-${unique()}.json`));
}

// Verrou périmé : on le casse sous un mutex de cassage, pour qu'un casseur lent
// ne supprime jamais le verrou neuf d'un autre agent.
function verrouActif(f) {
  if (!fs.existsSync(f)) return false;
  const age = f2 => (Date.now() - fs.statSync(f2).mtimeMs) / 60000;
  try { if (age(f) <= VERROU_MIN) return true; } catch { return false; }
  const casse = f + '.casse';
  try { if (fs.existsSync(casse) && age(casse) > 1) fs.rmSync(casse, { force: true }); } catch {}
  if (!creerExclusif(casse, String(process.pid))) return true;          // un autre casse déjà : prudence
  try {
    if (fs.existsSync(f) && age(f) > VERROU_MIN) { fs.rmSync(f, { force: true }); return false; }
    return fs.existsSync(f);
  } finally { fs.rmSync(casse, { force: true }); }
}
const detenteur = f => { try { return lire(f).agent; } catch { return null; } };

function mesurer(id) {
  const d = dir('renforts', id);
  let score = 0, n = 0;
  for (const f of ls(d)) {
    const r = lireOuIgnorer(path.join(d, f));
    const ageH = r && (Date.now() - Date.parse(r.date)) / 3.6e6;
    if (!r || !Number.isFinite(r.poids) || !Number.isFinite(ageH)) continue;
    score += r.poids * Math.pow(0.5, Math.max(0, ageH) / DEMI_VIE_H);
    n++;
  }
  return { score, renforts: n };
}
const score = id => mesurer(id).score;

function echecs(id) {
  const tous = ls(dir('echecs', id)).map(f => lireOuIgnorer(dir('echecs', id, f))).filter(Boolean).sort((x, y) => x.date.localeCompare(y.date));
  const deblocage = tous.filter(e => e.type === 'deblocage').pop();
  return tous.filter(e => e.type === 'echec' && (!deblocage || e.date > deblocage.date));
}

function statut(id) {
  const v = lireSiExiste(dir('verdicts', id + '.json'));
  if (v) return v.verdict === 'retenu' ? 'retenue' : 'ecartee';
  if (fs.existsSync(dir('faites', id + '.json'))) return 'faite';
  if (fs.existsSync(dir('abandons', id + '.json'))) return 'abandonnee';
  if (verrouActif(dir('verrous', id + '.lock'))) return 'prise';
  if (echecs(id).length >= MAX_ECHECS) return 'bloquee';
  return 'ouverte';
}

const taches = () => ls(dir('taches')).filter(f => /^T-\d+\.json$/.test(f)).map(f => f.slice(0, -5))
  .filter(id => lireOuIgnorer(dir('taches', id + '.json'))).sort();
const mission_ = () => lire(dir('mission.json'));
const depenses = () => ls(dir('depenses')).reduce((s, f) => s + (lireOuIgnorer(dir('depenses', f))?.usd || 0), 0);

function exigerTache(id) {
  if (!idValide(id) || !fs.existsSync(dir('taches', id + '.json'))) die(`tâche inconnue : ${id}`);
  return lire(dir('taches', id + '.json'));
}
function exigerAgent(agent) {
  if (!nomValide(agent)) die(`nom d'agent invalide : ${agent}`);
  if (agent === HUMAIN) die(`« ${HUMAIN} » est réservé : utiliser la commande piloter depuis un terminal`);
  return agent;
}
function exigerPoids(p, [min, max]) {
  const n = Number(p);
  if (!Number.isFinite(n)) die(`poids non numérique : ${p}`);
  if (n < min || n > max) die(`poids hors limites [${min}, ${max}] : ${n}`);
  return n;
}
function budgetDepasse() {
  const m = mission_();
  return m.budget_usd != null && depenses() >= m.budget_usd;
}

function poser(id, agent, poids, raison = '') {
  ajouter(dir('renforts', id), agent, { agent, poids, raison, date: now() });
}

// Index des titres : un fichier par titre normalisé, créé de façon exclusive.
// Deux dépôts simultanés du même titre : un seul gagne, l'autre devient un renfort.
const empreinte = titre => crypto.createHash('sha1').update(titre.trim().toLowerCase().replace(/\s+/g, ' ')).digest('hex').slice(0, 16);

function deposerTache(agent, titre, poids, description) {
  const m = mission_();
  if (budgetDepasse()) die(`BUDGET_USD atteint (${m.budget_usd} $) — pas de dépôt`, 2);
  if (!titre.trim()) die('titre vide');
  fs.mkdirSync(dir('titres'), { recursive: true });
  const index = dir('titres', empreinte(titre) + '.json');
  const existant = lireSiExiste(index);
  if (existant) { poser(existant.id, agent, poids, 'redépôt'); return `DOUBLON ${existant.id} renforcée`; }
  for (let n = ls(dir('taches')).filter(f => /^T-\d+\.json$/.test(f)).length + 1; ; n++) {
    if (n > m.budget_taches) die(`BUDGET atteint (${m.budget_taches} tâches) — pas de dépôt`, 2);
    const id = 'T-' + String(n).padStart(3, '0');
    const t = { id, titre: titre.trim(), description, par: agent, date: now() };
    if (!creerExclusif(dir('taches', id + '.json'), JSON.stringify(t, null, 2))) continue;
    if (creerExclusif(index, JSON.stringify({ id }))) { poser(id, agent, poids, 'dépôt'); return id; }
    // course perdue sur le titre : la tâche créée est classée doublon, le dépôt devient un renfort du gagnant
    creerExclusif(dir('abandons', id + '.json'), JSON.stringify({ agent, raison: 'doublon concurrent', date: now() }));
    const gagnant = lire(index).id;
    poser(gagnant, agent, poids, 'redépôt');
    return `DOUBLON ${gagnant} renforcée`;
  }
}

async function confirmerHumain(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    die('piloter exige un terminal interactif : cette commande est réservée à l’humain', 3);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const r = await new Promise(res => rl.question(`${question} — taper « oui » pour confirmer : `, res));
  rl.close();
  if (r.trim().toLowerCase() !== 'oui') die('annulé', 3);
}

const cmds = {
  aide() {
    console.log(`Commandes : node milieu.mjs <cmd> <mission> ...
  init       <mission> "<objectif>" [budget_taches=40] [budget_usd]
  deposer    <mission> <agent> "<titre>" [poids=3] ["description"]
  renforcer  <mission> <T-id> <agent> [poids=1] ["raison"]      poids agents : [-3, 5]
  suivante   <mission> <agent>        prend la tâche adaptée à la caste (ou VIDE / BUDGET_USD)
  prolonger  <mission> <T-id> <agent> rafraîchit son verrou (tâche longue)
  terminer   <mission> <T-id> <agent> ["résumé"]
  abandonner <mission> <T-id> <agent> ["raison"]                hors périmètre
  echec      <mission> <T-id> <agent>                           résumé requis : traces/<T-id>.<agent>.echec.md
  releve     <mission> <T-id> "<raison>"                        l'orchestrateur constate un agent mort sans résumé
  a_controler  <mission> <agent>        prend une tâche faite à contrôler (ou VIDE)
  verdict    <mission> <T-id> <agent> retenu|ecarte ["raison"]
  depense    <mission> <agent> <usd> ["source"]
  voir       <mission> <T-id>
  etat       <mission>
  exporter   <mission>                export.md + a-semer.txt (pistes non résolues)
  semer      <mission> <fichier>      lignes « poids | titre | description »
  piloter    <mission> renforcer <T-id> <poids> ["raison"] | deposer "<titre>" <poids> ["desc"]
             | debloquer <T-id> | budget <usd>                   humain seulement (terminal interactif)
Castes : agents « ecl-* » (éclaireurs : pistes faibles, dépôts ≤ ${POIDS_ECLAIREUR}), « ouv-* » (ouvriers : score ≥ ${SEUIL_OUVRIER}).
Env : MILIEU_DIR, MILIEU_DEMI_VIE_H (24), MILIEU_VERROU_MIN (30), MILIEU_SEUIL (0.5), MILIEU_SEUIL_OUVRIER (4)`);
  },

  init() {
    const [objectif, budget = '40', usd] = a;
    if (!objectif) die('usage : init <mission> "<objectif>" [budget_taches] [budget_usd]');
    const bt = Number(budget), bu = usd === undefined ? null : Number(usd);
    if (!Number.isInteger(bt) || bt < 1) die('budget_taches : entier ≥ 1');
    if (bu !== null && !(bu > 0)) die('budget_usd : nombre > 0');
    for (const s of ['taches', 'titres', 'renforts', 'verrous', 'faites', 'abandons', 'verdicts', 'traces', 'echecs', 'depenses'])
      fs.mkdirSync(dir(s), { recursive: true });
    if (!creerExclusif(dir('mission.json'), JSON.stringify({ objectif, budget_taches: bt, budget_usd: bu, cree: now() }, null, 2)))
      die(`mission ${mission} existe déjà`);
    console.log(`mission ${mission} initialisée (budget ${bt} tâches${bu ? `, ${bu} $` : ''})`);
  },

  deposer() {
    const [agent, titre, poids = '3', ...desc] = a;
    exigerAgent(agent);
    if (!titre) die('usage : deposer <mission> <agent> "<titre>" [poids] ["description"]');
    const max = caste(agent) === 'eclaireur' ? POIDS_ECLAIREUR : POIDS_AGENT[1];
    console.log(deposerTache(agent, titre, exigerPoids(poids, [POIDS_AGENT[0], max]), desc.join(' ')));
  },

  renforcer() {
    const [id, agent, poids = '1', ...r] = a;
    exigerTache(id); exigerAgent(agent);
    poser(id, agent, exigerPoids(poids, POIDS_AGENT), r.join(' '));
    console.log(`${id} ${Number(poids) >= 0 ? '+' : ''}${poids} → score ${score(id).toFixed(2)}`);
  },

  suivante() {
    const [agent] = a;
    exigerAgent(agent);
    if (budgetDepasse()) return console.log('BUDGET_USD');
    const c = caste(agent);
    let candidates = taches().filter(id => statut(id) === 'ouverte')
      .map(id => ({ id, ...mesurer(id) })).filter(t => t.score >= SEUIL);
    if (c === 'ouvrier') candidates = candidates.filter(t => t.score >= SEUIL_OUVRIER).sort((x, y) => y.score - x.score);
    else if (c === 'eclaireur') candidates = candidates.filter(t => t.score < SEUIL_OUVRIER)
      .sort((x, y) => x.renforts - y.renforts || y.id.localeCompare(x.id));      // pistes les moins explorées, les plus récentes
    else candidates.sort((x, y) => y.score - x.score);
    for (const t of candidates) {
      if (creerExclusif(dir('verrous', t.id + '.lock'), JSON.stringify({ agent, date: now() }))) {
        const prec = echecs(t.id);
        return console.log(JSON.stringify({
          ...lire(dir('taches', t.id + '.json')), score: +t.score.toFixed(2),
          trace: path.resolve(ROOT, mission, 'traces', `${t.id}.${agent}.md`),
          resume_echec_si_besoin: path.resolve(ROOT, mission, 'traces', `${t.id}.${agent}.echec.md`),
          releve: prec.length,
          carnet_echecs: prec.map(e => ({ agent: e.agent, resume: e.resume, raison: e.raison })),
          consigne: prec.length === 0 ? null
            : `Relève n°${prec.length}. Lis le carnet d'échecs AVANT de commencer. Les « hypothèses en cours » de tes prédécesseurs sont suspectes : ne les reprends pas sans les avoir vérifiées.`,
        }, null, 2));
      }
    }
    console.log('VIDE');
  },

  prolonger() {
    const [id, agent] = a;
    exigerTache(id); exigerAgent(agent);
    const lock = dir('verrous', id + '.lock');
    if (detenteur(lock) !== agent) die(`${id} n'est pas tenue par ${agent}`);
    const t = new Date(); fs.utimesSync(lock, t, t);
    console.log(`${id} verrou prolongé`);
  },

  terminer() {
    const [id, agent, ...resume] = a;
    exigerTache(id); exigerAgent(agent);
    const lock = dir('verrous', id + '.lock');
    const det = detenteur(lock);
    if (det !== agent) die(det ? `${id} est tenue par ${det}` : `${id} n'est tenue par personne (verrou expiré ?) : la reprendre avec suivante`);
    if (!creerExclusif(dir('faites', id + '.json'), JSON.stringify({ agent, resume: resume.join(' '),
      trace: `traces/${id}.${agent}.md`, date: now() }, null, 2))) die(`${id} déjà terminée`);
    fs.rmSync(lock, { force: true });
    console.log(`${id} faite`);
  },

  abandonner() {
    const [id, agent, ...raison] = a;
    exigerTache(id); exigerAgent(agent);
    const lock = dir('verrous', id + '.lock');
    if (detenteur(lock) !== agent) die(`${id} n'est pas tenue par ${agent}`);
    if (!creerExclusif(dir('abandons', id + '.json'), JSON.stringify({ agent, raison: raison.join(' '), date: now() })))
      die(`${id} déjà abandonnée`);
    fs.rmSync(lock, { force: true });
    console.log(`${id} abandonnée`);
  },

  echec() {
    const [id, agent] = a;
    exigerTache(id); exigerAgent(agent);
    const lock = dir('verrous', id + '.lock');
    if (detenteur(lock) !== agent) die(`${id} n'est pas tenue par ${agent}`);
    const resume = path.resolve(ROOT, mission, 'traces', `${id}.${agent}.echec.md`);
    if (!fs.existsSync(resume)) die(`résumé de relève absent : écrire d'abord ${resume}`);
    const texte = fs.readFileSync(resume, 'utf8');
    const manquantes = RUBRIQUES_ECHEC.filter(r => !texte.includes(r));
    if (manquantes.length) die(`résumé incomplet, rubriques manquantes : ${manquantes.join(' ; ')}`);
    ajouter(dir('echecs', id), agent, { type: 'echec', agent, resume, date: now() });
    fs.rmSync(lock, { force: true });
    const n = echecs(id).length;
    console.log(n >= MAX_ECHECS ? `${id} BLOQUEE après ${n} échecs — escalade humaine`
      : `${id} relâchée (échec ${n}/${MAX_ECHECS - 1} avant blocage)${n >= 2 ? ' — prochaine relève : changer de famille de modèle' : ''}`);
  },

  releve() {
    const [id, ...raison] = a;
    exigerTache(id);
    if (statut(id) !== 'prise' && !fs.existsSync(dir('verrous', id + '.lock'))) die(`${id} n'est pas prise`);
    const det = detenteur(dir('verrous', id + '.lock'));
    ajouter(dir('echecs', id), 'orchestrateur', { type: 'echec', agent: det || '?', resume: null,
      raison: `constaté par l'orchestrateur : ${raison.join(' ') || 'agent sans retour'}`, date: now() });
    fs.rmSync(dir('verrous', id + '.lock'), { force: true });
    const n = echecs(id).length;
    console.log(n >= MAX_ECHECS ? `${id} BLOQUEE après ${n} échecs — escalade humaine` : `${id} relâchée (${n} échec(s))`);
  },

  a_controler() {
    const [agent] = a;
    exigerAgent(agent);
    for (const id of taches().filter(id => statut(id) === 'faite')) {
      const f = lire(dir('faites', id + '.json'));
      if (f.agent === agent) continue;                       // jamais son propre travail
      const lock = dir('verdicts', id + '.lock');
      if (!verrouActif(lock) && creerExclusif(lock, JSON.stringify({ agent, date: now() }))) {
        return console.log(JSON.stringify({ tache: lire(dir('taches', id + '.json')), faite: f,
          trace: path.resolve(ROOT, mission, f.trace) }, null, 2));
      }
    }
    console.log('VIDE');
  },

  verdict() {
    const [id, agent, v, ...r] = a;
    exigerTache(id); exigerAgent(agent);
    if (!['retenu', 'ecarte'].includes(v)) die('verdict : retenu | ecarte');
    const fp = dir('faites', id + '.json');
    if (!fs.existsSync(fp)) die(`${id} n'est pas terminée`);
    if (lire(fp).agent === agent) die('un agent ne contrôle pas son propre travail');
    const lock = dir('verdicts', id + '.lock');
    const det = detenteur(lock);
    if (det !== agent) die(det ? `${id} est en cours de contrôle par ${det}` : `${id} : prendre d'abord la tâche avec a_controler`);
    if (!creerExclusif(dir('verdicts', id + '.json'),
      JSON.stringify({ agent, verdict: v, raison: r.join(' '), date: now() }, null, 2)))
      die(`${id} a déjà un verdict`);
    poser(id, agent, v === 'retenu' ? 2 : -5, `verdict ${v}`);
    fs.rmSync(lock, { force: true });
    console.log(`${id} ${v}`);
  },

  depense() {
    const [agent, usd, ...source] = a;
    if (agent !== 'orchestrateur') exigerAgent(agent);
    const n = Number(usd);
    if (!(n >= 0)) die('montant invalide');
    ajouter(dir('depenses'), agent, { agent, usd: n, source: source.join(' '), date: now() });
    const m = mission_(), total = depenses();
    console.log(`dépensé ${total.toFixed(3)} $${m.budget_usd != null ? ` / ${m.budget_usd} $${total >= m.budget_usd ? ' — BUDGET_USD ATTEINT' : ''}` : ''}`);
  },

  voir() {
    const [id] = a;
    const t = exigerTache(id);
    console.log(JSON.stringify({ ...t, statut: statut(id), ...mesurer(id),
      faite: lireSiExiste(dir('faites', id + '.json')), verdict: lireSiExiste(dir('verdicts', id + '.json')),
      echecs: echecs(id) }, null, 2));
  },

  etat() {
    const m = mission_();
    const ids = taches();
    const total = depenses();
    console.log(`${mission} — ${m.objectif}  [${ids.length}/${m.budget_taches} tâches · ${total.toFixed(3)} $${m.budget_usd != null ? ` / ${m.budget_usd} $` : ''}]`);
    const lignes = ids.map(id => {
      const { score: s } = mesurer(id);
      return { id, s, st: statut(id), t: lire(dir('taches', id + '.json')).titre, e: echecs(id).length };
    }).sort((x, y) => y.s - x.s);
    for (const l of lignes)
      console.log(`${l.id}  ${l.s.toFixed(2).padStart(6)}  ${l.st.padEnd(10)}  ${l.t}${l.e ? `  [${l.e} échec(s)]` : ''}${l.s < SEUIL && l.st === 'ouverte' ? '  (évaporée)' : ''}`);
    const n = st => lignes.filter(l => l.st === st).length;
    console.log(`ouvertes ${n('ouverte')} · prises ${n('prise')} · faites ${n('faite')} · retenues ${n('retenue')} · écartées ${n('ecartee')} · bloquées ${n('bloquee')}`);
    if (n('bloquee')) console.log('⚠ tâches bloquées : décision humaine requise (piloter debloquer, ou abandon)');
  },

  exporter() {
    const m = mission_();
    const ids = taches();
    const par = st => ids.filter(id => statut(id) === st);
    const tache = id => lire(dir('taches', id + '.json'));
    const traceDe = id => {
      const f = lireSiExiste(dir('faites', id + '.json'));
      const p = f && path.join(ROOT, mission, f.trace);
      return p && fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : '(trace absente)';
    };
    const L = [`# Export de mission — ${mission}`, '', `Objectif : ${m.objectif}`, `Créée : ${m.cree} · exportée : ${now()}`,
      `Tâches : ${ids.length} · dépensé : ${depenses().toFixed(3)} $`, ''];
    L.push('## Découvertes retenues par le contrôle (à valider par l’humain)', '');
    for (const id of par('retenue').sort((x, y) => score(y) - score(x)))
      L.push(`### ${id} — ${tache(id).titre} (score ${score(id).toFixed(2)})`, '', traceDe(id), '');
    L.push('## Écartées par le contrôle', '');
    for (const id of par('ecartee')) L.push(`- ${id} — ${tache(id).titre} : ${lire(dir('verdicts', id + '.json')).raison}`);
    L.push('', '## Bloquées (à reprendre autrement)', '');
    for (const id of par('bloquee')) {
      const dernier = echecs(id).pop();
      L.push(`- ${id} — ${tache(id).titre}${dernier?.resume ? ` — dernier résumé : ${dernier.resume}` : ''}`);
    }
    L.push('', '## Non traitées', '');
    for (const id of [...par('ouverte'), ...par('faite')]) L.push(`- ${id} — ${tache(id).titre} [${statut(id)}]`);
    fs.writeFileSync(dir('export.md'), L.join('\n') + '\n');
    const aSemer = [...par('bloquee'), ...par('ouverte')].map(id => `2 | ${tache(id).titre} | ${tache(id).description || ''}`);
    fs.writeFileSync(dir('a-semer.txt'), aSemer.join('\n') + (aSemer.length ? '\n' : ''));
    console.log(`${dir('export.md')}\n${dir('a-semer.txt')} (${aSemer.length} pistes)`);
  },

  semer() {
    const [fichier] = a;
    if (!fichier || !fs.existsSync(fichier)) die('usage : semer <mission> <fichier> (lignes « poids | titre | description »)');
    let n = 0;
    for (const ligne of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
      if (!ligne.trim() || ligne.trim().startsWith('#')) continue;
      const [p, titre, ...desc] = ligne.split('|').map(s => s.trim());
      if (!titre) { console.error(`ligne ignorée : ${ligne}`); continue; }
      console.log(deposerTache('semeur', titre, exigerPoids(p || '2', POIDS_AGENT), desc.join(' | ')));
      n++;
    }
    console.log(`${n} pistes semées`);
  },

  async piloter() {
    const [action, ...r] = a;
    if (action === 'renforcer') {
      const [id, poids, ...raison] = r;
      exigerTache(id);
      const p = exigerPoids(poids, POIDS_HUMAIN);
      await confirmerHumain(`Renforcer ${id} « ${lire(dir('taches', id + '.json')).titre} » de ${p}`);
      poser(id, HUMAIN, p, raison.join(' '));
      console.log(`${id} → score ${score(id).toFixed(2)}`);
    } else if (action === 'deposer') {
      const [titre, poids = '5', ...desc] = r;
      if (!titre) die('usage : piloter <mission> deposer "<titre>" [poids] ["description"]');
      const p = exigerPoids(poids, POIDS_HUMAIN);
      await confirmerHumain(`Déposer « ${titre} » avec un poids de ${p}`);
      console.log(deposerTache(HUMAIN, titre, p, desc.join(' ')));
    } else if (action === 'debloquer') {
      const [id] = r;
      exigerTache(id);
      if (statut(id) !== 'bloquee') die(`${id} n'est pas bloquée`);
      await confirmerHumain(`Débloquer ${id} (3 nouvelles tentatives possibles)`);
      ajouter(dir('echecs', id), HUMAIN, { type: 'deblocage', agent: HUMAIN, date: now() });
      console.log(`${id} débloquée`);
    } else if (action === 'budget') {
      const [usd] = r;
      const n = Number(usd);
      if (!(n > 0)) die('usage : piloter <mission> budget <usd>');
      await confirmerHumain(`Porter le budget de la mission à ${n} $`);
      ajouter(dir('depenses'), HUMAIN, { agent: HUMAIN, usd: 0, source: `budget porté à ${n} $`, date: now() });
      const m = mission_();
      // mission.json n'est modifié que par l'humain : écriture atomique par renommage
      const tmp = dir(`.tmp-${unique()}`);
      fs.writeFileSync(tmp, JSON.stringify({ ...m, budget_usd: n }, null, 2));
      fs.renameSync(tmp, dir('mission.json'));
      console.log(`budget : ${n} $`);
    } else die('piloter : renforcer | deposer | debloquer | budget');
  },
};

export { cmds };

async function principal() {
  if (!cmd || !Object.hasOwn(cmds, cmd)) { cmds.aide(); process.exit(cmd ? 1 : 0); }
  if (cmd !== 'aide') {
    if (!nomValide(mission)) die(`nom de mission invalide : ${mission}`);
    if (cmd !== 'init' && !fs.existsSync(dir('mission.json'))) die(`mission inconnue : ${mission}`);
  }
  await cmds[cmd]();
}

const estPrincipal = () => {
  try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url)); } catch { return false; }
};
if (process.argv[1] && estPrincipal()) principal().catch(e => die(e.message));
