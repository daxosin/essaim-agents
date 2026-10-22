# essaim-agents

Deux skills et leurs outils pour faire travailler des sous-agents Claude **à bon escient** :

- **`essaim`** — skill primaire : qualifie la nature d'un travail, choisit l'architecture de répartition et la surcouche qualité, fait valider le plan, puis pilote les agents.
- **`avocat-du-diable`** — fait auditer un livrable ou contredire une décision par **un** modèle que tu choisis à chaque appel : Claude Fable 5.1, Claude Opus 5.5, GPT-6.1 Sol, DeepSeek V4 Pro ou Kimi K3.

## Pourquoi

Lancer des sous-agents n'est pas gratuit : chacun repart d'un contexte vide, et tout ce qui circule entre eux est compressé. Une mauvaise architecture coûte plus cher que pas d'essaim du tout. La skill `essaim` commence donc par répondre à une question : **qui doit décider de qui fait quoi ?**

| Architecture | Quand | Qui répartit |
|---|---|---|
| Solo | 1 à 3 unités, ou unités fortement couplées | personne |
| Routeur | entrées hétérogènes, spécialistes différents | un classifieur |
| Chaîne | sous-tâches connues et séquentielles | le plan |
| Fan-out | sous-tâches connues et indépendantes | le plan |
| Orchestrateur | carte émergente, ≤ 15 pistes, une session | un chef |
| Stigmergique | carte émergente, > 15 pistes ou plusieurs sessions | le milieu partagé |

Surcouches qualité, si l'erreur coûte cher : **vote** (jugement fermé), **boucle** producteur → critique aveugle (livrable perfectible), **débat** (décision).

## Stigmergie : le milieu partagé

Les fourrageurs ne se parlent pas : ils lisent et modifient un milieu sur disque (`_milieu/<mission>/`) via `outils/milieu.mjs`.

- **Ajout seul** : aucun fichier n'est réécrit par deux agents.
- **Verrous** par création exclusive : un seul gagnant, même avec 12 agents simultanés (testé).
- **Phéromones** : chaque dépôt ou renfort est un fichier daté ; le score d'une tâche est leur somme pondérée.
- **Évaporation** calculée à la lecture (demi-vie 24 h) : une piste que personne ne renforce disparaît d'elle-même, sans balayeur.
- **Budget** de tâches par mission, et blocage de l'auto-validation.

```
node outils/milieu.mjs aide
```

## Installation (Windows)

```powershell
git clone https://github.com/daxosin/essaim-agents.git
cd essaim-agents
.\install.ps1 -Projet "C:\chemin\vers\mon-projet"   # dans un projet
.\install.ps1 -Global                                # pour tous les projets (~\.claude)
```

Le script vérifie Node 18+, copie skills, agents et outils (avec sauvegarde `.bak-` de toute version locale différente), ajoute `_milieu/` et `_avocat/` au `.gitignore` du projet, lance les tests et signale si la clé OpenRouter manque.

Clé OpenRouter (pour `avocat-du-diable`), une seule fois :
```powershell
[Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "sk-or-...", "User")
```

## Utilisation

Dans Claude Code :
- « essaim : auditer la sécurité de mes outils » → qualification, fiche de déploiement à valider, puis lancement.
- « audit Sol sur ce PRD », « contredis cette décision avec Kimi » → cadrage, contrôle de confidentialité, estimation du coût, appel du modèle nommé, réponse intégrale. Un second avis = un second appel, avec un autre modèle.

En ligne de commande :
```
node outils/avocat.mjs --modele sol --mode audit --fichier prd.md --contexte "critères..." --estimer
node outils/avocat.mjs --modele kimi --mode contradiction --fichier decision.md --sujet choix-hebergement
```
Ordre de grandeur pour ~5 000 jetons en entrée : DeepSeek ≈ 0,01 $, Kimi et Sol ≈ 0,04 $, Opus ≈ 0,08 $, Fable ≈ 0,20 $. Fable et Opus appelés en sous-agents dans Claude Code ne passent pas par OpenRouter. Les revues s'accumulent dans `_avocat/<sujet>/`.

## Revue automatique des PR

`.github/workflows/revue-sol.yml` lance les tests puis un audit des fichiers modifiés par GPT-6.1 Sol, et le poste en commentaire de la PR.
- Secret de dépôt requis : `OPENROUTER_API_KEY`.
- Autre modèle : variable de dépôt `AVOCAT_MODELE`, par exemple `kimi`.

## Garde-fous

- Aucune donnée de santé ni nominative n'est envoyée aux modèles externes : `avocat.mjs` bloque les motifs évidents, et la skill impose une relecture humaine. DeepSeek et Kimi sont des fournisseurs tiers ; les requêtes demandent `data_collection: deny` à OpenRouter.
- Aucun agent d'essaim n'écrit dans un système de production : il propose, l'humain exécute.
- Chaque déploiement d'essaim et chaque appel externe est validé par l'humain avant lancement.

## Structure

```
skills/essaim/SKILL.md            skill primaire (annexe : milieu.mjs embarqué)
skills/avocat-du-diable/SKILL.md  audit / contradiction par un modèle choisi
agents/                           fourrageur, validateur, critique (sous-agents Claude Code)
outils/milieu.mjs                 milieu stigmergique
outils/avocat.mjs                 appel OpenRouter d'un modèle
outils/construire-skill.mjs       resynchronise l'annexe de la skill après modification de milieu.mjs
tests/                            node --test "tests/*.test.mjs"
install.ps1                       bootstrap Windows
```
