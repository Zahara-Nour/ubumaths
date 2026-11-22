# 0041 — Catégorie et notions d'une fiche

- **Statut** : acceptée — phase 0 du chantier `categorie-fiche` (journal
  `docs/archive/wip/categorie-fiche-progress.md`, clos le 2026-11-22)
- **Date** : 2026-11-19 · **Décidée par** : David
- **Amendée** le 2026-11-19 (reprise des 50 fiches, David) : **plusieurs notions pour toute
  fiche**, la règle « une au plus, sauf Révisions et Automatismes » est retirée avec sa garde en
  base (migration `20261119222741_plusieurs_notions_fiche.sql`) ; chaque notion s'imprime avec
  une majuscule en tête (les sous-notions de l'arbre s'écrivent en minuscule).
- **Amendée** le 2026-11-20 (David) : **deux notions ou plus d'une même branche → la branche en
  titre**. Titre en base « Suites · Entraînement technique » ; au PDF, la branche en grand, les
  notions dessous, la catégorie en petit. On classe toujours sous des notions : la branche se lit
  dans l'arbre à l'affichage, sans migration. Une seule notion garde son nom ; des notions de
  branches différentes restent comme avant. Écarté : classer directement sous une branche
  (« une branche seule, ou des notions ») — migration, et une fiche qui ne dit plus quelles
  notions elle traite.

## Contexte

Le titre d'une fiche d'exercices dit à la fois de quoi elle parle et quel genre de fiche elle est,
écrit à la main et de façons variées (50 fiches en prod le 2026-11-19 : « Entraînement technique —
Suites », « Applications des suites », « Automatismes : dérivation », titres libres). Rien ne se
filtre, et deux fiches sur le même sujet ne se ressemblent pas.

## Décision

Un champ par question posée, comme pour les exercices ([ADR 0019](0019-classement-branche-notion-sous-notion.md)) :

| Sujet                 | Décision                                                                                                                                                                                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quel genre de fiche   | **Catégorie de fiche**, liste fermée, **fiche d'exercices seulement** : Entraînement technique · Applications · Automatismes · Révisions                                                                                                                                                                               |
| De quoi elle parle    | **Notions** de l'arbre (notion ou sous-notion, jamais une branche), dans un ordre d'impression                                                                                                                                                                                                                         |
| Combien de notions    | **Autant qu'on veut**, pour tout type de fiche (amendement du 2026-11-19 ; avant : une au plus en fiche d'exercices, sauf Révisions et Automatismes)                                                                                                                                                                   |
| Titre imprimé         | Sans titre libre : les notions (« Suites · Dérivation »), la catégorie en petit gris dessous ; notions d'une même branche (deux ou plus) : la branche en grand, les notions dessous, la catégorie en petit (amendement du 2026-11-20). Titre libre : **lui seul**, ni notions ni catégorie dessous (David, 2026-11-20) |
| Niveau                | Un **badge** (forme courte, plein orange, texte blanc) à gauche de l'en-tête et au début du bas de page                                                                                                                                                                                                                |
| Bas de page           | `[1ère Spé] Suites · Entraînement technique   n / N   chiph.re`                                                                                                                                                                                                                                                        |
| Anglais               | Catégories traduites ; les notions n'ont pas de nom anglais (**chantier séparé**) : rien d'imprimé d'ici là                                                                                                                                                                                                            |
| Fiches d'automatismes | Le script qui les fabrique ([ADR 0011](0011-fiche-d-automatismes-figee-par-graine.md)) pose catégorie et notions                                                                                                                                                                                                       |
| Stockage              | `worksheets.category` + table `worksheet_classifications` (calquée sur `exercise_classifications`) ; plus de garde du nombre (retirée par l'amendement)                                                                                                                                                                |
| Titre en base         | `title` **toujours rempli** (l'appli l'affiche partout) : sans titre libre, l'éditeur y écrit le titre composé (« Suites · Entraînement technique ») ; `worksheets.custom_title` dit si c'est un titre libre                                                                                                           |
| Accès                 | On lit les notions d'une fiche quand on lit la fiche ; auteur et admin écrivent ; un lien de partage transmet catégorie, notions et `custom_title`                                                                                                                                                                     |

## Écarté

- **Texte libre pour le sujet** (« thème ») : mot retiré, doublons assurés.
- **Une case « notion » plus une liste pour les fiches à plusieurs notions** : deux endroits pour
  une même information.
- **« Préparation d'évaluation »** comme catégorie : Révisions joue ce rôle.
- **Catégorie pour les autres types** : le type (évaluation, devoir maison…) dit déjà le genre.
- **Imprimer la catégorie sous un titre libre** : le titre libre remplace tout.
- **Titre vide en base, recomposé à chaque affichage** : une trentaine d'endroits à modifier, une
  fiche sans nom au premier oubli. **Deviner le titre libre** (titre ≠ texte composé) : renommer
  une notion changerait la fiche en titre libre.
- **Une seule notion en Entraînement technique et en Applications** (décision d'origine, retirée
  le 2026-11-19) : « Entraînement technique — Suites » couvre suites arithmétiques, géométriques
  et généralités, et « Suites » est une branche, pas une notion.
