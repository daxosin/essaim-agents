---
name: avocat-du-diable
description: Panel multi-modèles en aveugle (Fable, Opus, GPT-6.1 Sol, DeepSeek, Kimi) pour auditer un livrable ou contredire une décision, avec matrice de convergence. Active avec « avocat du diable », « audit multi-modèles », « panel », « fais auditer », « contredis cette décision », « revue Sol », « revue croisée ».
---

# Avocat du diable — panel multi-modèles

Un même objet est soumis **en aveugle et en parallèle** à cinq modèles de trois familles d'entraînement différentes. Un défaut relevé par plusieurs familles est un signal fort ; un défaut relevé par un seul modèle est une piste à examiner, pas une conclusion.

Panel par défaut :

| Alias | Modèle | Voie |
|---|---|---|
| `fable` | Claude Fable 5.1 | sous-agent si disponible, sinon OpenRouter |
| `opus` | Claude Opus 5.5 | sous-agent si disponible, sinon OpenRouter |
| `sol` | GPT-6.1 Sol (`--pro` : Sol Pro) | OpenRouter |
| `deepseek` | DeepSeek V4 Pro | OpenRouter |
| `kimi` | Kimi K3 | OpenRouter |

L'outil est `panel.mjs` : le chercher dans `outils/` du projet, puis dans `~/.claude/outils/`. Les identifiants OpenRouter sont dans sa table `MODELES`. Un modèle plus récent sort → mettre à jour cette table, pas la skill.

## Deux modes

- **audit** — un livrable existe (document, code, SOP, PRD) : trouver ses erreurs. Rend un tableau de défauts classés bloquant / majeur / mineur, un angle mort et un verdict.
- **contradiction** — une décision, une thèse ou un plan : construire le meilleur cas contre. Rend l'objection principale, les hypothèses fragiles, un pré-mortem, l'alternative écartée à tort et ce qui ferait changer d'avis.

## Étape 1 — Cadrer (3 questions maximum)

- **Objet** : quels fichiers, ou quelle décision en quelques lignes ?
- **Mode** : audit ou contradiction ?
- **Critères** : ce que l'objet doit satisfaire (référentiel, exigences, contraintes). Sans critères, les auditeurs jugent au goût.

Panel : cinq modèles par défaut ; « panel léger » = `sol,deepseek,kimi` (le moins cher, trois familles hors Claude).

## Étape 2 — Contrôle de confidentialité (bloquant)

L'objet part chez des fournisseurs tiers, dont DeepSeek et Moonshot (Kimi), hébergés hors de l'UE selon le routage OpenRouter.
- **Interdit** : toute donnée de santé, donnée nominative (patient, salarié), extrait de PRAQ, Supabase ou LQO. Aucune exception, même anonymisée à la main sans relecture.
- **À signaler à Emmanuel avant envoi** : document interne non public (conditions commerciales, organisation, sécurité du parc d'outils).
- `panel.mjs` bloque de lui-même sur les motifs évidents (numéro de sécurité sociale, e-mail, téléphone, mention de patient). Ce filtre est grossier : il ne remplace pas la relecture, et il produit des faux positifs (un texte qui parle de patients sans en nommer). `--confirme-anonymise` ne se passe qu'après relecture humaine.
- Les requêtes demandent `data_collection: deny` à OpenRouter, qui écarte les fournisseurs conservant ou entraînant sur les données. Cela réduit le risque sans l'annuler.

## Étape 3 — Estimer et obtenir le « go »

```
node outils/panel.mjs --mode <mode> --fichier <f> [--contexte "<critères>"] --estimer
```
Présenter : objet, mode, panel, coût estimé. Lancer seulement après le « go » d'Emmanuel.

## Étape 4 — Lancer

**Prompt identique pour tous** — sinon la comparaison ne vaut rien :
```
node outils/panel.mjs --mode <mode> --fichier <f> --contexte "<critères>" --sortie _panel/<sujet> --prompt-seul
```
écrit `_panel/<sujet>/prompt.md`.

- **Outil de sous-agents disponible** : lancer Fable et Opus en sous-agents (paramètre `model` : `fable`, `opus`), dans le même message, chacun avec le contenu intégral de `prompt.md` et la consigne d'écrire sa réponse dans `_panel/<sujet>/fable.md` ou `opus.md`. En parallèle :
  ```
  node outils/panel.mjs ... --sortie _panel/<sujet> --modeles sol,deepseek,kimi
  ```
- **Sinon** : tout passe par OpenRouter (`--modeles sol,deepseek,kimi,fable,opus`).

La clé est lue dans `OPENROUTER_API_KEY`. Ne jamais la demander dans la conversation, ne jamais l'écrire dans un fichier.

Un modèle en échec n'arrête pas le panel : `bilan.json` le signale, la synthèse le mentionne.

## Étape 5 — Synthèse : matrice de convergence

Lire toutes les réponses de `_panel/<sujet>/`, puis regrouper les défauts ou objections **identiques sur le fond**, même formulés différemment.

| # | Défaut / objection | Fable | Opus | Sol | DeepSeek | Kimi | Familles | Gravité max |
|---|---|---|---|---|---|---|---|---|

- **Familles** : Anthropic (Fable, Opus), OpenAI (Sol), DeepSeek, Moonshot (Kimi). Fable et Opus d'accord ne comptent que pour une famille : ils partagent des biais d'entraînement.
- **Tri** : familles décroissantes, puis gravité.
- **≥ 3 familles** → quasi certain, à traiter.
- **1 seule famille** → à vérifier soi-même avant de le présenter comme un défaut. Vérifier ne veut pas dire écarter : l'objection isolée est souvent la plus utile.
- **Contradictions entre modèles** (l'un juge correct ce qu'un autre juge faux) : les lister à part, avec les deux arguments, sans trancher.
- Ligne finale : les verdicts des cinq modèles.

Le synthétiseur est un Claude : il doit se méfier de sa propre tendance à surpondérer Fable et Opus. Chaque ligne de la matrice cite le modèle source.

## Étape 6 — Remise

Livrer la matrice, puis en trois lignes au plus : ce qui fait consensus, l'objection isolée la plus sérieuse, la question qu'Emmanuel doit trancher. **Ne rien corriger automatiquement** : Emmanuel décide de ce qui est retenu. Les réponses brutes restent dans `_panel/<sujet>/` pour traçabilité.

## Articulation avec les autres skills

- **essaim** : c'est la surcouche « Débat » (mode contradiction) ou la « Boucle » à diversité maximale (mode audit) d'un essaim.
- **cadrage-socratique-avant-build** : remplace ou complète la relecture par le seul avocat du diable Fable quand la décision engage de l'argent, des données ou plusieurs mois de travail.
