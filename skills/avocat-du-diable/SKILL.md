---
name: avocat-du-diable
description: Fait auditer un livrable ou contredire une décision par UN modèle qu'Emmanuel choisit à chaque appel (Fable, Opus, GPT-6.1 Sol, DeepSeek, Kimi). Active avec « avocat du diable », « audit Sol », « audit Kimi », « audit DeepSeek », « audit Fable », « audit Opus », « contredis avec … », « fais relire par … ».
---

# Avocat du diable — un modèle, choisi par Emmanuel

Chaque appel soumet **un seul objet à un seul modèle**, celui qu'Emmanuel nomme. Jamais de lancement groupé, jamais de modèle choisi à sa place. Pour un second avis, il relance la skill avec un autre modèle.

| Alias | Modèle | Voie |
|---|---|---|
| `fable` | Claude Fable 5.1 | sous-agent si disponible, sinon OpenRouter |
| `opus` | Claude Opus 5.5 | sous-agent si disponible, sinon OpenRouter |
| `sol` | GPT-6.1 Sol (`--pro` : Sol Pro) | OpenRouter |
| `deepseek` | DeepSeek V4 Pro | OpenRouter |
| `kimi` | Kimi K3 | OpenRouter |

L'outil est `avocat.mjs` : le chercher dans `outils/` du projet, puis dans `~/.claude/outils/`. Les identifiants OpenRouter sont dans sa table `MODELES`. Un modèle plus récent sort → mettre à jour cette table, pas la skill. Tout autre modèle OpenRouter s'appelle par son identifiant complet (`--modele x-ai/grok-9`).

## Deux modes

- **audit** — un livrable existe (document, code, SOP, PRD) : trouver ses erreurs. Rend un tableau de défauts classés bloquant / majeur / mineur, un angle mort, un verdict.
- **contradiction** — une décision, une thèse, un plan : construire le meilleur cas contre. Rend l'objection principale, les hypothèses fragiles, un pré-mortem, l'alternative écartée à tort, ce qui ferait changer d'avis.

## Étape 1 — Cadrer

Déduire de la demande :
- **Modèle** : celui qu'Emmanuel a nommé. **S'il n'en a nommé aucun, le lui demander** — une seule question, sans recommandation par défaut.
- **Objet** : quels fichiers, ou quelle décision en quelques lignes.
- **Mode** : audit si un livrable existe, contradiction si c'est un choix. En cas de doute, demander.
- **Critères** : ce que l'objet doit satisfaire. Sans critères, le modèle juge au goût ; les demander si absents.
- **Sujet** : un nom court (`prd-agent-securite`). Les revues d'un même sujet s'accumulent dans `_avocat/<sujet>/`.

## Étape 2 — Confidentialité (bloquant, sauf Fable et Opus en sous-agents)

Par OpenRouter, l'objet part chez un fournisseur tiers ; DeepSeek et Moonshot (Kimi) peuvent être hébergés hors de l'UE.
- **Interdit** : donnée de santé, donnée nominative (patient, salarié), extrait de PRAQ, Supabase ou LQO.
- **À signaler avant envoi** : document interne non public (conditions commerciales, organisation, sécurité du parc d'outils).
- `avocat.mjs` bloque de lui-même les motifs évidents (numéro de sécurité sociale, e-mail, téléphone, mention de patient). Ce filtre est grossier : il ne remplace pas la relecture, et produit des faux positifs. `--confirme-anonymise` ne se passe qu'après relecture humaine.
- Les requêtes demandent `data_collection: deny` à OpenRouter, ce qui écarte les fournisseurs conservant ou entraînant sur les données. Cela réduit le risque sans l'annuler.

## Étape 3 — Estimer, puis « go »

Pour un modèle passant par OpenRouter :
```
node outils/avocat.mjs --modele <alias> --mode <mode> --fichier <f> --contexte "<critères>" --estimer
```
Présenter en une ligne : modèle, mode, objet, coût estimé, dépense du mois. Lancer seulement après le « go » d'Emmanuel.

Plafond mensuel, tous projets confondus : variable `AVOCAT_PLAFOND_MOIS_USD`. Au plafond, `avocat.mjs` refuse l'appel ; ne jamais relever la variable sans qu'Emmanuel le demande. Registre des dépenses : `~/.claude/avocat-depenses.jsonl`.

## Étape 4 — Lancer

**Fable ou Opus, avec un outil de sous-agents disponible** (gratuit au-delà de l'abonnement, rien ne sort de Claude) :
1. `node outils/avocat.mjs --mode <mode> --fichier <f> --contexte "<critères>" --sujet <sujet> --prompt-seul` écrit le prompt exact.
2. Lancer **un** sous-agent (paramètre `model` : `fable` ou `opus`) avec le contenu intégral de ce prompt, et la consigne d'écrire sa réponse dans `_avocat/<sujet>/<horodatage>-<alias>-<mode>.md` sans rien modifier d'autre.

**Tous les autres cas** :
```
node outils/avocat.mjs --modele <alias> --mode <mode> --fichier <f> --contexte "<critères>" --sujet <sujet>
```
La clé est lue dans `OPENROUTER_API_KEY`. Ne jamais la demander dans la conversation, ne jamais l'écrire dans un fichier. En cas d'échec (clé, quota, modèle indisponible), rapporter l'erreur telle quelle et s'arrêter : ne pas basculer sur un autre modèle sans l'accord d'Emmanuel.

## Étape 5 — Remise

1. Livrer la réponse du modèle **intégralement**, sans la reformuler ni la filtrer, en indiquant le modèle.
2. Ajouter au plus trois lignes de lecture, séparées et signées comme lecture de Claude : les points à vérifier avant d'y croire (référence citée, chiffre, comportement de code), et tout désaccord net de Claude avec un point du modèle, argumenté.
3. **Ne rien corriger automatiquement.** Emmanuel décide de ce qui est retenu.

Si `_avocat/<sujet>/` contient déjà des revues d'autres modèles, le signaler en une ligne. Comparer les revues **seulement si Emmanuel le demande** : tableau des défauts communs et propres à chaque modèle, en rappelant que Fable et Opus partagent des biais d'entraînement.

## Articulation avec les autres skills

- **essaim** : c'est la surcouche « Boucle » (mode audit) ou « Débat » (mode contradiction) avec un modèle d'une autre famille.
- **cadrage-socratique-avant-build** : permet de faire relire une décision validée par un autre modèle que Fable.
