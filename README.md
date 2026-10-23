# essaim-agents

Deux skills et leurs outils pour faire travailler des sous-agents Claude **à bon escient** :

- **`essaim`** — skill primaire : qualifie la nature d'un travail, choisit parmi **7 architectures** de sous-agents (ou décide de ne pas en lancer), fait valider le plan, puis pilote : relève des agents en échec, budget, journal, mémoire entre missions.
- **`avocat-du-diable`** — fait auditer un livrable ou contredire une décision par **un** modèle que tu choisis à chaque appel : Claude Fable 5.1, Claude Opus 5.5, GPT-6.1 Sol, DeepSeek V4 Pro ou Kimi K3.

## Les 7 architectures

| # | Architecture | Famille | Qui décide | Quand |
|---|---|---|---|---|
| 1 | Chaîne | répartition | le plan | étapes connues, chacune dépend de la précédente |
| 2 | Routeur | répartition | un classifieur | entrées hétérogènes, spécialistes différents |
| 3 | Fan-out | répartition | le plan | unités connues, indépendantes, nombreuses |
| 4 | Orchestrateur | répartition | un chef | carte émergente, ≤ 15 pistes, une session |
| 5 | Stigmergique | répartition | le milieu | carte émergente, > 15 pistes ou plusieurs sessions |
| 6 | Boucle | confrontation | le critique | livrable perfectible, erreur coûteuse |
| 7 | Débat (variante vote) | confrontation | l'humain | décision, choix entre options |

Une mission combine une répartition et, si l'erreur coûte, une confrontation. « Solo » (pas d'essaim) est une réponse légitime : une mauvaise architecture coûte plus cher que pas d'essaim du tout. Chaque architecture a sa fiche dans la skill : schéma, quand, gabarit de prompt prêt à coller, coût, piège.

## Ce qui rend l'essaim robuste

- **Relève lamarckienne contrôlée.** Un agent qui échoue en boucle est remplacé par un agent neuf qui hérite d'un résumé imposé : faits vérifiés, tentatives et erreurs, pistes éliminées, hypothèse en cours *marquée suspecte*. Deuxième relève : on change de famille de modèle. Troisième échec : la tâche est bloquée et tu décides.
- **Ton intuition comme phéromone.** Entre deux vagues, `piloter` te laisse renforcer ou tuer une piste avec un poids de ±10, quand celui d'un agent est plafonné entre -3 et +5. La commande exige un vrai terminal et une confirmation tapée : un agent ne peut pas se faire passer pour toi.
- **Castes.** Les éclaireurs (modèle rapide) repèrent beaucoup de pistes à faible poids. Les ouvriers ne creusent que les pistes confirmées. Les contrôleurs **trient** (`retenu` / `ecarte`) : ils ne valident pas, la validation reste humaine.
- **Garde mécanique.** Le hook PreToolUse `garde-essaim.mjs` bloque, au lieu de seulement l'interdire par consigne :
  - les écritures hors périmètre ;
  - la modification des gardes, des réglages et des `.env` ;
  - pour les sous-agents, les commandes vers la production (Supabase, psql, `git push`, déploiement, POST) et les écritures directes dans le milieu.

  En cas d'erreur interne, il bloque par prudence. Il s'ajoute à tes gardes existants sans les toucher.
- **Budget** en tâches et en dollars par mission, avec arrêt dur ; plafond mensuel pour les appels OpenRouter.
- **Journal des missions** pour recalibrer la matrice de choix sur des faits (`journal.mjs stats`).
- **Mémoire entre missions** : `exporter` puis `semer` pour repartir des pistes non résolues.

## Stigmergie : le milieu partagé

Les agents ne se parlent pas. Ils lisent et modifient un milieu sur disque (`_milieu/<mission>/`) via `outils/milieu.mjs` :
- **ajout seul** : aucun fichier n'est réécrit par deux agents ;
- **créations atomiques et exclusives** (fichier temporaire + lien dur) ;
- **évaporation calculée à la lecture**, avec une demi-vie de 24 h ;
- **un seul gagnant** quand plusieurs agents visent la même tâche, y compris sur verrou périmé (testé : 10 essais × 8 agents simultanés) ;
- **doublons concurrents fusionnés** ;
- **un fichier abîmé est ignoré** sans bloquer la mission.

```
node outils/milieu.mjs aide
```

## Installation (Windows)

```powershell
git clone https://github.com/daxosin/essaim-agents.git
cd essaim-agents
.\install.ps1 -Projet "C:\chemin\vers\mon-projet"   # recommandé : dans un projet d'abord
.\install.ps1 -Global                                # pour tous les projets (~\.claude)
.\install.ps1 -Projet "..." -SansGarde               # sans le hook PreToolUse
```

Le script :
- vérifie Node 18+ ;
- copie skills, agents et outils, avec une sauvegarde `.bak-` de toute version locale différente ;
- fusionne le hook dans `settings.json`, sauvegardé avant, sans toucher aux autres hooks, et refuse de modifier un fichier invalide ;
- dépose `essaim-garde.json` à adapter ;
- ajoute `_milieu/` et `_avocat/` au `.gitignore` ;
- lance les tests ;
- signale si la clé OpenRouter manque.

Redémarrer Claude Code ensuite.

Clé OpenRouter et plafond mensuel, à régler une seule fois :
```powershell
[Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "sk-or-...", "User")
[Environment]::SetEnvironmentVariable("AVOCAT_PLAFOND_MOIS_USD", "10", "User")
```

## Utilisation

Dans Claude Code :
- « essaim : auditer la sécurité de mes outils » → qualification, fiche de déploiement à valider, lancement, pilotage, clôture avec ton jugement consigné au journal.
- « audit Sol sur ce PRD », « contredis cette décision avec Kimi » → cadrage, contrôle de confidentialité, estimation du coût, appel du modèle nommé, réponse intégrale. Un second avis se demande par un second appel, avec un autre modèle.

En ligne de commande :
```
node outils/avocat.mjs --modele sol --mode audit --fichier prd.md --contexte "critères..." --estimer
node outils/milieu.mjs piloter audit-secu renforcer T-007 8 "intuition métier"
node outils/journal.mjs stats
```

Ordre de grandeur pour ~5 000 jetons en entrée : DeepSeek ≈ 0,01 $, Kimi et Sol ≈ 0,04 $, Opus ≈ 0,08 $, Fable ≈ 0,20 $. Fable et Opus appelés en sous-agents dans Claude Code ne passent pas par OpenRouter.

## Revue d'une PR par un modèle

Pose l'étiquette `revue:sol`, `revue:kimi`, `revue:deepseek`, `revue:fable` ou `revue:opus` sur une PR. Le workflow `.github/workflows/revue-avocat.yml` lance alors les tests, puis l'audit des fichiers modifiés par ce modèle, et le poste en commentaire. Rien ne part sans ton geste : poser l'étiquette vaut confirmation que la PR ne contient aucune donnée personnelle. Le secret de dépôt `OPENROUTER_API_KEY` est requis.

## Garde-fous

- Aucune donnée de santé ni nominative vers les modèles externes : `avocat.mjs` bloque les motifs évidents (NIR, e-mail, téléphone, civilité + nom, date complète, IBAN, mention de patient), et la skill impose une relecture humaine.
- Aucun agent d'essaim n'écrit en production : il propose, l'humain exécute.
- Chaque déploiement d'essaim et chaque appel externe est validé par l'humain avant lancement.

## Préparé, non activé

Tâches pièges pour mesurer si les contrôleurs revérifient vraiment : voir `docs/taches-pieges.md`.

## Structure

```
skills/essaim/SKILL.md            7 architectures, relève, pilotage, journal (annexe : milieu.mjs embarqué)
skills/avocat-du-diable/SKILL.md  audit / contradiction par un modèle choisi
agents/                           fourrageur (ouvrier), eclaireur, controleur, critique
outils/milieu.mjs                 milieu stigmergique
outils/avocat.mjs                 appel OpenRouter d'un modèle
outils/garde-essaim.mjs           hook PreToolUse
outils/installer-garde.mjs        fusion du hook dans settings.json
outils/journal.mjs                journal des missions et statistiques
outils/construire-skill.mjs       resynchronise l'annexe de la skill après modification de milieu.mjs
essaim-garde.exemple.json         configuration du garde à adapter
docs/taches-pieges.md             spécification préparée
tests/                            node --test tests/*.test.mjs
install.ps1                       bootstrap Windows
```
