---
name: essaim
description: Qualifie la nature d'un travail multi-étapes, choisit l'architecture d'essaim de sous-agents adaptée (solo, chaîne, routeur, fan-out, orchestrateur, stigmergique) et sa surcouche qualité (vote, boucle, débat), puis la pilote. Active avec « essaim », « sous-agents », « stigmergie », « paralléliser », « déployer des agents », « fourrageurs », « quelle architecture d'agents ».
---

# Essaim — qualifier le travail, choisir l'architecture, la piloter

Skill primaire : avant de lancer le moindre sous-agent, elle détermine la nature du travail et en déduit **deux choix indépendants** :
1. l'**architecture de répartition** — qui décide de qui fait quoi (6 options, dont « pas d'essaim ») ;
2. la **surcouche qualité** — comment on attrape les erreurs (aucune, vote, boucle, débat).

Une mauvaise architecture coûte plus cher que pas d'essaim du tout : chaque agent repart d'un contexte vide, et tout ce qui transite entre agents est compressé.

## Étape 0 — Livrable cible (Output First)

Écrire en 5 à 10 lignes le livrable final idéal (fictif) : forme, sections, niveau de preuve attendu, destinataire. Tout le reste se dimensionne sur lui.

## Étape 1 — Qualifier (6 axes)

Répondre depuis la demande. Ne poser à Emmanuel que les axes impossibles à déduire — 3 questions maximum.

| Axe | Question | Valeurs |
|---|---|---|
| **A — Carte** | Connaît-on la liste des sous-tâches avant de commencer ? | connue / émergente |
| **B — Couplage** | Une unité a-t-elle besoin du résultat d'une autre ? | indépendantes / séquentielles / couplées |
| **C — Volume** | Combien d'unités de travail ? | 1–3 / 4–15 / > 15 |
| **H — Hétérogénéité** | Les entrées relèvent-elles de spécialités différentes ? | homogènes / hétérogènes |
| **P — Persistance** | Le travail s'étale-t-il sur plusieurs sessions ? | une session / plusieurs |
| **D — Criticité** | Que coûte une erreur ? | réversible / santé, réglementaire, production, décision |

## Étape 2 — Choisir l'architecture de répartition

Appliquer dans l'ordre ; la **première règle qui s'applique** l'emporte.

| # | Condition | Architecture | Qui répartit |
|---|---|---|---|
| 1 | C = 1–3, ou B = couplées | **Solo** — pas d'essaim | personne |
| 2 | H = hétérogènes | **Routeur** — un agent classe chaque entrée et l'aiguille vers un spécialiste ; chaque branche est ensuite requalifiée | le classifieur |
| 3 | A = connue, B = séquentielles | **Chaîne** — chaque agent reçoit le livrable du précédent | le plan |
| 4 | A = connue, B = indépendantes | **Fan-out** — lots de 3 à 8 unités par agent, 5 agents max par vague, agrégation finale | le plan |
| 5 | A = émergente, C ≤ 15, P = une session | **Orchestrateur** — le chef découpe, lance, relit les retours, relance | le chef |
| 6 | A = émergente, et C > 15 ou P = plusieurs | **Stigmergique** — milieu partagé, scores, évaporation, sans chef | le milieu |

Critère de bascule 5 → 6 : l'orchestrateur tient tant que tous les retours des agents tiennent dans son contexte sans s'y noyer. Au-delà d'une quinzaine de pistes, ou si le travail doit survivre à la session, le milieu prend le relais : il persiste sur disque et n'a pas besoin d'un chef qui se souvienne de tout.

## Étape 3 — Choisir la surcouche qualité

Seulement si D = santé, réglementaire, production ou décision. Une seule surcouche, sauf raison explicite.

| Erreur redoutée | Surcouche | Mise en œuvre |
|---|---|---|
| Erreur de **jugement** sur une réponse fermée (classer, coter, oui/non) | **Vote** | 3 agents indépendants, même consigne, sans se voir. Unanimité → accepté. Désaccord → escalade à Emmanuel avec les 3 avis. |
| Livrable **perfectible** contre des critères (document, code, procédure) | **Boucle** producteur → critique | Critique aveugle (n'a vu ni l'historique ni le raisonnement), consigne : trouver les erreurs, pas confirmer. 3 tours max ; si le critique bloque encore, escalade. Un seul tour = « critique aveugle ». |
| **Choix** entre options, décision stratégique, biais possible | **Débat** | Un agent défend, un agent attaque, un juge synthétise les arguments sans trancher. Emmanuel tranche. Version multi-modèles : skill `avocat-du-diable`, mode contradiction. |

Repères (domaine d'Emmanuel) :

| Travail | Architecture | Surcouche |
|---|---|---|
| Rédiger ou réécrire une SOP | Chaîne | Boucle |
| Contrôler 30 SOP contre un référentiel | Fan-out | Boucle (1 tour) |
| Coter la criticité de dysfonctionnements | Fan-out | Vote |
| Trier une boîte de demandes mixtes (qualité, vigilance, réclamation) | Routeur | selon la branche |
| Audit sécurité du parc d'outils (Supabase, Vercel, scripts, skills) | Stigmergique | Boucle (validateur) |
| Revue de littérature PubMed ouverte | Orchestrateur, ou Stigmergique si > 15 pistes | aucune ou Boucle |
| Choisir un hébergement, une migration, un achat | Solo | Débat |
| PRD d'un outil | Solo (cadrage socratique d'abord) | Boucle (1 tour) |
| Déclaration fiscale, écriture dans PRAQ / Supabase / LQO | **Solo, jamais d'essaim** | HITL à chaque pas |

## Étape 4 — Fiche de déploiement (validation HITL)

Présenter avant tout lancement, en une quinzaine de lignes :
- livrable cible (étape 0) ;
- qualification A-B-C-H-P-D en une ligne ;
- architecture choisie, pourquoi en une phrase, l'alternative écartée et pourquoi ;
- surcouche qualité, ou « aucune » ;
- nombre d'agents par vague, nombre de vagues max, modèle ;
- budget de tâches (stigmergique) et critère d'arrêt ;
- périmètre interdit (ce qu'aucun agent ne touche).

**Ne lancer qu'après le « go » d'Emmanuel.** Il peut changer l'architecture ; sa lecture du métier prime sur la matrice.

## Étape 5 — Exécuter

Règles communes à toutes les architectures :
- Chaque prompt d'agent est **autonome** : objectif, entrées, format de retour (≤ 15 lignes, structuré), ce qu'il ne doit pas faire, périmètre interdit. L'agent ne voit rien de la conversation.
- Agents indépendants lancés **dans le même message** pour qu'ils tournent en parallèle, en arrière-plan.
- L'orchestrateur ne relit que les retours, jamais les fichiers de travail en entier.
- Pas d'outil de sous-agents disponible → le dire en une ligne et dérouler en Solo.

### Chaîne
Un agent par étape, lancés l'un après l'autre. Le livrable de l'étape n est écrit dans un fichier ; l'agent n+1 reçoit le chemin, pas le contenu recopié.

### Routeur
1. Un agent classifieur reçoit les entrées et rend un tableau `entrée → catégorie → confiance`.
2. Confiance basse → escalade à Emmanuel, pas d'aiguillage au hasard.
3. Chaque catégorie est requalifiée (étape 1) : elle devient souvent un Fan-out.

### Fan-out
Découper en lots, un agent par lot, mêmes consignes et même format de retour pour tous. Agréger en signalant les retours incomplets ou contradictoires.

### Orchestrateur
Vague 1 de 3 à 5 agents sur les axes évidents ; lire les retours ; vague 2 sur ce qu'ils ont révélé. 3 vagues maximum. Arrêter quand une vague n'apporte plus rien de neuf.

### Stigmergique — protocole du milieu

Outil : `milieu.mjs` (Node 18+). Le chercher dans `outils/milieu.mjs` du projet, puis `~/.claude/outils/milieu.mjs` ; sinon l'écrire depuis l'annexe. Le milieu vit dans `_milieu/<mission>/`, **en ajout seul** : aucun fichier n'est réécrit par deux agents, les verrous sont des créations exclusives (un seul gagnant même à 12 agents simultanés), l'évaporation est calculée à la lecture (demi-vie 24 h, seuil 0,5).

1. `node milieu.mjs init <mission> "<objectif>" <budget>`
2. Semer 3 à 6 tâches : `node milieu.mjs deposer <mission> orchestrateur "<titre>" <poids 1-5> "<description>"`
3. Vague : lancer 3 à 5 fourrageurs en parallèle (Claude Code : sous-agent `fourrageur` ; ailleurs : agent généraliste avec le gabarit ci-dessous).
4. Entre deux vagues : `node milieu.mjs etat <mission>`. Arrêter si `VIDE`, budget atteint, critère d'arrêt atteint, ou vague sans nouvelle tâche.
5. Validation : 1 à 2 validateurs (sous-agent `validateur` ou gabarit) jusqu'à ce que `a_valider` renvoie `VIDE`.
6. Synthèse : l'orchestrateur ne lit que `etat` et les traces des tâches **validées**, par score décroissant.
7. Mission sur plusieurs sessions : relancer à l'étape 3 ; le milieu a tout gardé, les pistes délaissées se sont évaporées d'elles-mêmes.

Gabarit fourrageur :
```
Tu es fourrageur dans la mission <mission>. Outil : node <chemin>/milieu.mjs. Ton nom d'agent : <f1>.
Objectif de la mission : <objectif>. Périmètre interdit : <périmètre>.
Boucle, 4 tâches maximum :
1. `suivante <mission> <f1>` → si VIDE, arrête-toi.
2. Traite la tâche. Écris ta trace au chemin indiqué par le champ `trace` : constat, preuves vérifiables (fichier:ligne, URL, sortie de commande), confiance 1-5.
3. Piste nouvelle → `deposer <mission> <f1> "<titre>" <poids 1-5> "<description>"`.
   Tâche existante que tu confirmes → `renforcer <mission> <T-id> <f1> 1 "<raison>"` ; que tu infirmes → poids -2.
4. `terminer <mission> <T-id> <f1> "<résumé en une ligne>"`, ou `abandonner` si hors périmètre.
N'écris dans le milieu que ta trace ; tout le reste passe par milieu.mjs.
Retour final : 5 lignes maximum (tâches traitées, déposées, renforcées).
```

Gabarit validateur :
```
Tu es validateur aveugle de la mission <mission>. Outil : node <chemin>/milieu.mjs. Ton nom d'agent : <v1>.
Tu cherches les erreurs ; tu ne cherches pas à confirmer.
Boucle : `a_valider <mission> <v1>` → si VIDE, arrête-toi. Lis la tâche et sa trace, revérifie toi-même chaque preuve.
Puis `verdict <mission> <T-id> <v1> valide|rejete "<raison>"`. Une preuve non reproductible = rejet.
Retour final : 5 lignes maximum.
```

### Vote
Lancer 3 agents avec la même consigne, sans qu'ils se voient. Comparer les réponses fermées ; présenter les désaccords à Emmanuel sans les arbitrer.

### Boucle (critique aveugle)
Le critique reçoit le livrable et les critères, jamais l'historique ni le raisonnement de production (sous-agent `critique` en Claude Code). Il rend une liste d'erreurs classées bloquant / majeur / mineur, avec localisation. Le producteur corrige les bloquants et majeurs, puis nouveau tour. Une revue par un modèle d'un autre fournisseur (skill `avocat-du-diable`, mode audit : Sol, DeepSeek, Kimi, Fable, Opus) est une critique aveugle de plus grande diversité.

### Débat
Deux agents, deux consignes opposées (« défends X », « attaque X »), mêmes faits. Un juge reçoit les deux plaidoiries et rend : arguments décisifs de chaque côté, faits contestés, ce qui ferait basculer. Il ne tranche pas.

## Étape 6 — Clôture

Livrer le livrable conforme à l'étape 0, puis 3 lignes de bilan : architecture et surcouche utilisées, volume (agents lancés, tâches déposées, validées, rejetées), ce qui aurait dû être fait autrement. Si un piège ou un chiffre utile est apparu, il mérite une note de capitalisation.

## Garde-fous

- Aucune donnée nominative (patient, salarié) dans le milieu, les traces ou les prompts d'agents.
- Aucun agent d'un essaim n'écrit dans PRAQ, Supabase, LQO ou en production : il propose, Emmanuel exécute.
- Un agent ne valide jamais son propre travail (milieu.mjs le bloque).
- Budget fixé avant le lancement ; il n'est jamais relevé sans l'accord d'Emmanuel.

## Annexe — milieu.mjs

À écrire tel quel si l'outil est introuvable.

```js
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
```
