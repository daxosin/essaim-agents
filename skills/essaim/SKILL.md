---
name: essaim
description: Qualifie la nature d'un travail multi-étapes, choisit parmi 7 architectures d'essaim de sous-agents (chaîne, routeur, fan-out, orchestrateur, stigmergique, boucle, débat) ou décide de ne pas en lancer, fait valider le plan, puis le pilote avec relève des agents en échec, budget et journal. Active avec « essaim », « sous-agents », « stigmergie », « paralléliser », « déployer des agents », « fourrageurs », « quelle architecture d'agents ».
---

# Essaim — 7 architectures de sous-agents

Skill primaire : avant de lancer le moindre sous-agent, elle qualifie le travail, choisit l'architecture, fait valider le plan par Emmanuel, puis pilote.

Lancer des agents n'est pas gratuit : chacun repart d'un contexte vide, et tout ce qui circule entre eux est compressé. **Une mauvaise architecture coûte plus cher que pas d'essaim du tout** ; « Solo » est donc une réponse légitime de la qualification.

## Le catalogue

Deux familles. Une architecture de **répartition** dit qui décide de qui fait quoi. Une architecture de **confrontation** dit comment on attrape les erreurs. Une mission utilise une architecture de répartition, et éventuellement une de confrontation par-dessus.

| # | Architecture | Famille | Qui décide | En une phrase |
|---|---|---|---|---|
| 1 | **Chaîne** | répartition | le plan | Chaque agent transforme le livrable du précédent. |
| 2 | **Routeur** | répartition | un classifieur | Un agent trie les entrées et les aiguille vers des spécialistes. |
| 3 | **Fan-out** | répartition | le plan | N agents identiques sur des lots indépendants, puis agrégation. |
| 4 | **Orchestrateur** | répartition | un chef | Le chef découpe au fil des découvertes et relance par vagues. |
| 5 | **Stigmergique** | répartition | le milieu | Pas de chef : les agents se coordonnent par des traces dans un milieu partagé. |
| 6 | **Boucle** | confrontation | le critique | Un producteur, un critique aveugle, jusqu'à acceptation. |
| 7 | **Débat** | confrontation | l'humain | Un pour, un contre, un juge qui ne tranche pas. Variante : le vote. |

## Étape 0 — Livrable cible (Output First)

Écrire en 5 à 10 lignes le livrable final idéal (fictif) : forme, sections, niveau de preuve, destinataire. Tout se dimensionne sur lui.

Si une mission antérieure a porté sur le même domaine, chercher son export (`_milieu/*/export.md`) et les notes du coffre sur ce domaine : on ne repart pas de zéro (voir « Mémoire entre missions »).

## Étape 1 — Qualifier (6 axes)

Répondre depuis la demande ; ne poser à Emmanuel que les axes impossibles à déduire, 3 questions au plus.

| Axe | Question | Valeurs |
|---|---|---|
| **A — Carte** | Connaît-on la liste des sous-tâches avant de commencer ? | connue / émergente |
| **B — Couplage** | Une unité a-t-elle besoin du résultat d'une autre ? | indépendantes / séquentielles / couplées |
| **C — Volume** | Combien d'unités de travail ? | 1–3 / 4–15 / > 15 |
| **H — Hétérogénéité** | Les entrées relèvent-elles de spécialités différentes ? | homogènes / hétérogènes |
| **P — Persistance** | Le travail s'étale-t-il sur plusieurs sessions ? | une session / plusieurs |
| **D — Criticité** | Que coûte une erreur ? | réversible / santé, réglementaire, production, décision |

## Étape 2 — Choisir

**Répartition** — la première règle qui s'applique l'emporte :

| Condition | Choix |
|---|---|
| C = 1–3, ou B = couplées | **Solo** — pas d'essaim |
| H = hétérogènes | **Routeur** (chaque branche est ensuite requalifiée) |
| A = connue, B = séquentielles | **Chaîne** |
| A = connue, B = indépendantes | **Fan-out** |
| A = émergente, C ≤ 15, P = une session | **Orchestrateur** |
| A = émergente, et C > 15 ou P = plusieurs | **Stigmergique** |

Bascule Orchestrateur → Stigmergique : tant que tous les retours tiennent dans le contexte du chef sans qu'il s'y noie, le chef suffit. Au-delà d'une quinzaine de pistes, ou si le travail doit survivre à la session, le milieu prend le relais : il persiste sur disque et n'a besoin de personne pour se souvenir.

**Confrontation** — seulement si D = santé, réglementaire, production ou décision :

| Erreur redoutée | Choix |
|---|---|
| Livrable perfectible contre des critères (document, code, procédure) | **Boucle** |
| Choix entre options, décision, biais possible | **Débat** |
| Jugement fermé répété (classer, coter, oui/non) | **Débat, variante vote** |

Ces seuils sont des hypothèses de départ. Le journal des missions (étape 6) sert à les corriger sur des faits.

Repères :

| Travail | Répartition | Confrontation |
|---|---|---|
| Rédiger ou réécrire une SOP | Chaîne | Boucle |
| Contrôler 30 SOP contre un référentiel | Fan-out | Boucle (1 tour) |
| Coter la criticité de dysfonctionnements | Fan-out | Débat, variante vote |
| Trier une boîte de demandes mixtes | Routeur | selon la branche |
| Audit sécurité du parc d'outils | Stigmergique | Boucle (contrôleur) |
| Revue de littérature ouverte | Orchestrateur, ou Stigmergique si > 15 pistes | — |
| Choisir un hébergement, une migration, un achat | Solo | Débat |
| Déclaration fiscale, écriture dans PRAQ / Supabase / LQO | **Solo, jamais d'essaim** | HITL à chaque pas |

## Étape 3 — Fiche de déploiement (validation HITL)

Présenter avant tout lancement, en une quinzaine de lignes :
- livrable cible ;
- qualification A-B-C-H-P-D en une ligne ;
- architecture(s) choisie(s), pourquoi en une phrase, l'alternative écartée et pourquoi ;
- agents : nombre par vague, vagues max, modèles (castes pour la stigmergie) ;
- budget : tâches, dollars, et critère d'arrêt ;
- périmètre interdit, et état du garde mécanique (installé ou non).

**Ne lancer qu'après le « go » d'Emmanuel.** Il peut changer l'architecture : sa lecture du métier prime sur la matrice.

## Étape 4 — Exécuter : les 7 fiches

### Règles communes

- **Seule la session principale orchestre.** Un sous-agent ne lance pas de sous-agent (un garde de l'utilisateur le bloque d'ailleurs).
- Si la skill `sous-agents-cadre` est disponible, ses règles s'appliquent aussi : statuts de retour `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`, plafond de parallélisme. En cas de conflit, la règle la plus restrictive gagne.
- Chaque prompt d'agent est **autonome** : objectif, entrées (chemins de fichiers, pas contenus recopiés), format de retour (≤ 15 lignes, avec un statut), interdits. L'agent ne voit rien de la conversation.
- Agent `general-purpose` lancé pour de la recherche : ajouter la ligne « Type justifié : … » dans son prompt.
- Agent qui **modifie du code** : l'isoler dans un worktree (`isolation: worktree`), pour que deux agents ne s'écrasent jamais.
- Agents indépendants : lancés **dans le même message**, en arrière-plan.
- 5 agents par vague au plus.
- Après chaque agent, noter son coût s'il est connu (jetons × tarif) : `milieu.mjs depense` en stigmergie, total tenu par l'orchestrateur sinon. Arrêt dur au budget.
- L'orchestrateur ne relit que les retours, jamais les fichiers de travail en entier.
- Pas d'outil de sous-agents disponible : le dire en une ligne et dérouler en Solo.

### 1. Chaîne

```
[entrée] → agent A → fichier A → agent B → fichier B → agent C → [livrable]
```
- **Quand** : étapes connues d'avance, chacune dépend de la précédente.
- **Agents** : un spécialiste par étape, lancés l'un après l'autre.
- **Gabarit** (étape n) :
  ```
  Étape <n>/<N> de <mission> : <ce que fait cette étape>.
  Entrée : <chemin du livrable de l'étape n-1>. Critères de sortie : <critères>.
  Écris ton livrable dans <chemin>. N'altère pas l'entrée.
  Retour : statut (DONE / DONE_WITH_CONCERNS / BLOCKED), 5 lignes, points d'attention pour l'étape suivante.
  ```
- **Coût** : N agents en série ; c'est la plus lente.
- **Piège** : l'erreur de l'étape 1 se propage jusqu'au bout. Faire contrôler par l'orchestrateur le livrable de l'étape la plus risquée avant de passer à la suivante.

### 2. Routeur

```
              ┌→ spécialiste X → …
[entrées] → classifieur ─→ spécialiste Y → …
              └→ escalade humaine (confiance basse)
```
- **Quand** : entrées hétérogènes qui relèvent de traitements différents.
- **Agents** : un classifieur, puis un essaim par branche (souvent un fan-out).
- **Gabarit** (classifieur) :
  ```
  Classe chaque entrée de <chemin> dans exactement une catégorie : <liste, avec définition d'une ligne chacune>.
  Rends un tableau : entrée | catégorie | confiance 1-5 | indice décisif.
  Confiance ≤ 2 : catégorie « à arbitrer ». N'invente pas de catégorie.
  ```
- **Coût** : un agent de tri, peu cher ; le reste dépend des branches.
- **Piège** : l'aiguillage au hasard. Les entrées « à arbitrer » vont à Emmanuel, jamais dans la branche la plus probable.

### 3. Fan-out

```
          ┌→ agent 1 (lot 1) ┐
[unités] ─┼→ agent 2 (lot 2) ┼→ agrégation
          └→ agent N (lot N) ┘
```
- **Quand** : unités connues et indépendantes, en nombre (≥ 4).
- **Agents** : identiques, mêmes consignes, lots de 3 à 8 unités.
- **Gabarit** :
  ```
  Lot <k>/<N> de <mission>. Unités : <chemins>.
  Pour chacune : <traitement>, critères <critères>.
  Rends exactement ce tableau : unité | résultat | preuve | confiance 1-5. Statut final.
  ```
- **Coût** : N agents en parallèle ; rapide.
- **Piège** : les formats de retour divergents rendent l'agrégation impossible. Imposer le tableau mot pour mot ; signaler à l'agrégation tout retour incomplet ou contradictoire.

### 4. Orchestrateur

```
chef → vague 1 (3-5 agents) → relecture → vague 2 (ce qui a émergé) → … (3 vagues max)
```
- **Quand** : on ne connaît pas la carte, mais elle reste de taille raisonnable (≤ 15 pistes, une session).
- **Agents** : vague 1 sur les axes évidents, vagues suivantes sur ce que les retours ont révélé.
- **Gabarit** :
  ```
  Mission <mission>, vague <v>, axe : <axe>. Contexte : <ce que les vagues précédentes ont établi, 5 lignes>.
  Cherche : <question précise>. Ne refais pas : <ce qui est déjà couvert>.
  Retour : constats avec preuves, pistes nouvelles (3 max), statut.
  ```
- **Coût** : modéré ; dépend du nombre de vagues.
- **Piège** : le chef qui se noie. Dès que les retours dépassent ce qu'il peut garder en tête, ou que le travail doit survivre à la session, passer en stigmergique.

### 5. Stigmergique

```
            ┌──────── milieu partagé (_milieu/<mission>/) ────────┐
éclaireurs ─┤ tâches · scores · traces · verrous · échecs · coûts ├─ ouvriers
            └─────────────────────────┬───────────────────────────┘
                                 contrôleurs ── humain (piloter)
```
- **Quand** : carte émergente, et plus de 15 pistes ou plusieurs sessions.
- **Outil** : `milieu.mjs` (Node 18+), cherché dans `outils/` du projet, puis `~/.claude/outils/`, sinon écrit depuis l'annexe. Ajout seul, créations atomiques et exclusives, évaporation calculée à la lecture (demi-vie 24 h). `node milieu.mjs aide` liste les commandes.
- **Castes** (par préfixe du nom d'agent) :
  - `ecl-*` **éclaireurs** (sous-agent `eclaireur`, modèle rapide) : prennent les pistes faibles ou neuves, évaluent vite, déposent beaucoup avec un poids plafonné à 2.
  - `ouv-*` **ouvriers** (sous-agent `fourrageur`) : ne prennent que les pistes de score ≥ 4, donc confirmées, et les creusent.
  - `ctl-*` **contrôleurs** (sous-agent `controleur`) : trient les tâches faites, `retenu` ou `ecarte`. Ils trient, ils ne valident pas : la validation reste humaine.
- **Déroulé** :
  1. `init <mission> "<objectif>" <budget_taches> <budget_usd>`
  2. Semer 3 à 6 tâches (`deposer <mission> orchestrateur "<titre>" <poids> "<description>"`), ou `semer` depuis une mission antérieure.
  3. Vague : 2-3 éclaireurs, puis 2-3 ouvriers, en parallèle.
  4. Entre deux vagues : `etat <mission>` présenté à Emmanuel, qui peut piloter (voir plus bas). Arrêt quand `etat` affiche `ouvertes 0`, au budget, au critère d'arrêt, ou après une vague sans nouvelle tâche.
  5. Contrôle : 1 à 2 contrôleurs jusqu'à ce que `a_controler` rende `VIDE`.
  6. Synthèse : `exporter <mission>`, puis l'orchestrateur ne lit que `export.md`.
  7. Mission sur plusieurs sessions : reprendre à l'étape 3 ; le milieu a tout gardé, et les pistes délaissées se sont évaporées d'elles-mêmes.
- **Gabarits** (hors Claude Code, ou sans les agents installés) :
  ```
  Tu es <ouvrier|éclaireur> dans la mission <mission>. Outil : node <chemin absolu>/milieu.mjs. Ton nom : <ouv-1|ecl-1>.
  Objectif : <objectif>. Périmètre interdit : <périmètre>.
  Boucle, <4|6> tâches max : `suivante <mission> <nom>` → VIDE ou BUDGET_USD : arrête-toi.
  Si `releve` > 0 : lis le carnet d'échecs d'abord ; les hypothèses de tes prédécesseurs sont suspectes.
  Écris ta trace au chemin `trace` (constat, preuves vérifiables, confiance 1-5).
  Pistes nouvelles : `deposer`. Confirmées : `renforcer … 1` ; infirmées : `renforcer … -2`.
  Fin : `terminer`, ou `abandonner` (hors périmètre), ou en cas d'échec : résumé au chemin `resume_echec_si_besoin`
  (rubriques : ## Faits vérifiés / ## Tentatives et erreurs / ## Pistes éliminées / ## Hypothèse en cours (suspecte)) puis `echec`.
  Retour : 5 lignes.
  ```
  ```
  Tu es contrôleur aveugle de la mission <mission>. Outil : node <chemin absolu>/milieu.mjs. Ton nom : ctl-1.
  Tu cherches les erreurs, tu ne cherches pas à confirmer. Boucle : `a_controler <mission> ctl-1` → VIDE : arrête-toi.
  Revérifie toi-même chaque preuve de la trace, puis `verdict <mission> <T-id> ctl-1 retenu|ecarte "<raison>"`.
  Preuve non reproductible = ecarte. Retour : 5 lignes.
  ```
- **Coût** : le plus élevé en nombre d'agents, mais modulable par les castes et le budget en dollars.
- **Piège** : la piste fausse qui s'auto-renforce, chacun confirmant ce que l'autre a déposé. Les contrôleurs aveugles et le pilotage humain sont là pour ça.

### 6. Boucle

```
producteur → livrable → critique aveugle → défauts → producteur → … (3 tours max)
```
- **Quand** : un livrable doit satisfaire des critères, et l'erreur coûte.
- **Agents** : le producteur (souvent la session principale) et un critique (sous-agent `critique`) qui n'a vu ni l'historique ni le raisonnement de production.
- **Gabarit** (critique) :
  ```
  Livrable : <chemin>. Critères d'acceptation : <critères>.
  Trouve les erreurs. Rends : gravité (bloquant/majeur/mineur) | localisation | défaut | correction attendue.
  Dernière ligne : VERDICT : accepte | a reprendre. Ne réécris pas le livrable.
  ```
- **Coût** : 2 à 6 appels.
- **Piège** : le critique qui partage les biais du producteur. Pour casser ce biais, faire critiquer par un modèle d'une autre famille : skill `avocat-du-diable`, mode audit, avec le modèle qu'Emmanuel choisit. Au 3e tour encore bloqué : escalade, pas de 4e tour.

### 7. Débat

```
agent POUR ─┐
            ├→ juge (synthèse, ne tranche pas) → Emmanuel tranche
agent CONTRE┘
```
- **Quand** : un choix entre options, une décision qui engage.
- **Agents** : deux plaideurs aux consignes opposées, mêmes faits, et un juge.
- **Gabarits** :
  ```
  Plaideur : Défends <POUR|CONTRE> <décision>. Faits communs : <chemin>. Ton meilleur argument d'abord ;
  distingue ce que tu sais de ce que tu supposes. 15 lignes max.
  Juge : Voici deux plaidoiries. Rends : arguments décisifs de chaque côté, faits contestés,
  ce qui ferait basculer. Ne tranche pas.
  ```
- **Variante vote** (jugement fermé répété : classer, coter) : 3 agents, même consigne, sans se voir. Unanimité → accepté ; désaccord → les 3 avis vont à Emmanuel, sans arbitrage.
- **Coût** : 3 appels.
- **Piège** : deux plaideurs du même modèle ont les mêmes angles morts. Pour l'attaque, un modèle d'une autre famille via `avocat-du-diable`, mode contradiction.

## Relève des agents en échec (toutes architectures)

Un agent qui échoue en boucle a un contexte pollué : il traîne ses fausses pistes. On le remplace par un agent neuf qui hérite d'un **résumé structuré** de ses essais. C'est un héritage lamarckien contrôlé : les faits et le savoir négatif se transmettent, l'hypothèse en cours est mise en quarantaine.

- **Déclencheurs** : même tâche ratée 2 fois ; même commande relancée sans changement ; l'agent se contredit ; retour `BLOCKED` ; agent mort sans retour.
- **Résumé** : quatre rubriques imposées — `## Faits vérifiés`, `## Tentatives et erreurs`, `## Pistes éliminées`, `## Hypothèse en cours (suspecte)`. Mêmes exigences que les marqueurs `[vérifié]` / `[hypothèse]` de la skill handoff.
- **Successeur** : reçoit le résumé avec la consigne explicite que l'hypothèse est suspecte.
- **Escalade** :
  - 1re relève : même modèle, contexte neuf ;
  - 2e relève : **changer de famille de modèle** ;
  - 3e échec : tâche **bloquée**, Emmanuel décide (débloquer, reformuler, abandonner).
- **Stigmergie** : `milieu.mjs echec` le fait mécaniquement (refus d'un résumé incomplet, carnet transmis par `suivante`, blocage au 3e échec). `releve` : l'orchestrateur constate un agent mort sans résumé.
- **Autres architectures** : l'orchestrateur applique la même règle à la main. Il demande le résumé à l'agent, ou l'écrit lui-même à partir du retour, puis relance un agent neuf avec ce résumé.

## Pilotage humain (stigmergie)

Entre deux vagues, Emmanuel peut orienter l'essaim sans le piloter tâche par tâche. Les commandes exigent un vrai terminal et une confirmation tapée : un agent ne peut pas se faire passer pour lui.

```
node outils/milieu.mjs piloter <mission> renforcer T-007 8 "intuition métier"     # ou -8 pour tuer une piste
node outils/milieu.mjs piloter <mission> deposer "Vérifier les clés de service" 6
node outils/milieu.mjs piloter <mission> debloquer T-012
node outils/milieu.mjs piloter <mission> budget 5
```
Poids humains : ±10 ; agents : de -3 à +5. L'intuition métier d'Emmanuel pèse donc plus que n'importe quel agent.

## Garde mécanique

Les interdits ne restent pas des consignes : `garde-essaim.mjs`, hook PreToolUse installé par `install.ps1`, bloque :
- toute écriture hors des racines autorisées : dossier personnel pour la session principale, qui reste sous le contrôle direct d'Emmanuel ; projet seul pour les sous-agents ;
- toute modification d'un garde, des réglages ou d'un `.env` ;
- pour les sous-agents : les écritures directes dans les fichiers internes du milieu, et les commandes vers la production (Supabase, psql, `git push`, déploiement Vercel, requêtes POST…).

Il s'ajoute aux gardes existants d'Emmanuel sans les remplacer, et bloque par prudence en cas d'erreur interne. Configuration : `.claude/essaim-garde.json`. Si le garde n'est pas installé, le dire dans la fiche de déploiement.

## Étape 5 — Clôture

1. Livrer le livrable conforme à l'étape 0.
2. Bilan en 3 lignes : architecture(s), volume (agents, tâches, relèves, coût), ce qui aurait dû être fait autrement.
3. **Demander à Emmanuel son jugement** : utile, partiel ou inutile.
4. Consigner (étape 6).
5. Mémoire : voir ci-dessous.

## Étape 6 — Journal des missions

```
node outils/journal.mjs ajouter --mission <nom> --architecture <solo|routeur|chaine|fanout|orchestrateur|stigmergique> \
  --surcouche <aucune|boucle|debat|vote> --qualif "A=… B=… C=… H=… P=… D=…" --agents N --vagues N --cout USD \
  --duree-min N --taches N --rejets N --releves N --verdict <utile|partiel|inutile> --note "…"
node outils/journal.mjs stats
```
Le verdict est celui d'Emmanuel, jamais celui de Claude. `stats` agrège par combinaison et signale, à partir de 5 missions, celles qui déçoivent (moins d'une sur deux utile, plus de 30 % de tâches écartées). C'est sur ces faits que les seuils de l'étape 2 se corrigent.

## Mémoire entre missions

- **En fin de mission stigmergique** : `exporter <mission>` produit `export.md` (découvertes retenues, écartées, bloquées, non traitées) et `a-semer.txt` (pistes non résolues).
- **Capitalisation** : si la mission a produit un piège, un chiffre ou une décision non évidente, proposer une note pour le coffre (skill `depot-coffre-notes`), sans aucune donnée nominative.
- **Mission suivante sur le même domaine** : `semer <nouvelle-mission> <ancienne>/a-semer.txt` repart des pistes non résolues, et les notes du coffre servent à l'étape 0.

## Préparé, non activé : tâches pièges

Mesurer si les contrôleurs revérifient vraiment, en glissant des tâches « faites » à preuve fausse. Spécification : `docs/taches-pieges.md`. À activer après quelques vraies missions.

## Garde-fous

- Aucune donnée nominative (patient, salarié) dans le milieu, les traces ou les prompts d'agents.
- Aucun agent n'écrit dans PRAQ, Supabase, LQO ou en production : il propose, Emmanuel exécute.
- Un agent ne contrôle jamais son propre travail ; un contrôleur trie, il ne valide pas.
- Les budgets sont fixés avant le lancement, et ne sont relevés que par Emmanuel (`piloter … budget`).

## Annexe — milieu.mjs

À écrire tel quel si l'outil est introuvable.

```js
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
```
