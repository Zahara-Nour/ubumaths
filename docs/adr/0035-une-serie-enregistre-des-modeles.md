# 0035 — Une série enregistre des modèles, plus des catégories

- **Statut** : acceptée — mise en œuvre par le chantier `automaths-arbre` (journal :
  [`docs/archive/wip/automaths-arbre-progress.md`](../archive/wip/automaths-arbre-progress.md))
- **Date** : 2026-11-04 · **Décidée par** : David (Q1 de la phase 0 du chantier, option B)

## Contexte

Le panier et les séries enregistraient des **catégories** : le quadruplet thème · domaine ·
sous-domaine · niveau (`QuestionCategory`), hérité de TinyMath. À chaque usage, la série tirait un
modèle au hasard parmi ceux de la catégorie. Ce quadruplet vit dans `series.categories`, les liens
`/automaths/panier|test?categories=…` et leurs QR, `test_sessions.categories`,
`evaluation_attempt_questions.category_key` et le panier du navigateur.

Mesuré en prod le 2026-11-04 : 1 921 modèles publiés pour 1 921 catégories — **une catégorie = un
modèle**, le tirage ne choisit jamais. Tous les modèles sont rangés dans l'arbre (ADR 0019). Couples
(nœud, niveau) : 1 426, dont 335 à plusieurs modèles (7 au plus). En circulation : 5 séries,
1 contrôle, 0 lien court.

David : « les anciennes dénominations polluent tout ».

## Décision

1. Une **série** (et le panier) est une liste de **modèles**, chacun avec un nombre de répétitions
   et une durée. Une ligne désigne un modèle, pas une adresse.
2. Branche, notion, sous-notion **rangent le catalogue** ; la série ne les recopie pas, on les lit
   dans l'arbre.
3. Les mots **catégorie** (de questions), **thème**, **domaine**, **sous-domaine** disparaissent du
   code ; les colonnes `question_templates.theme` / `domain` / `subdomain` sont retirées en dernier
   (destructif, après la mise en prod du code qui n'en dépend plus).
4. Les séries et contrôles existants sont convertis ; un ancien lien reste lisible (son quadruplet
   désigne un seul modèle).

## Écarté

- **A — garder le quadruplet, ne changer que le catalogue** : les anciennes dénominations restent
  dans le code et la base.
- **C — enregistrer un endroit de l'arbre (notion ou sous-notion) + niveau** : change le
  comportement — 335 adresses tireraient parmi 2 à 7 modèles ; le prof ne choisirait plus un modèle
  précis.
