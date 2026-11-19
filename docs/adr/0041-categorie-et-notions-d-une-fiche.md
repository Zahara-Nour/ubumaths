# 0041 — Catégorie et notions d'une fiche

- **Statut** : acceptée — phase 0 du chantier `categorie-fiche` (journal
  `docs/wip/categorie-fiche-progress.md`)
- **Date** : 2026-11-19 · **Décidée par** : David

## Contexte

Le titre d'une fiche d'exercices dit à la fois de quoi elle parle et quel genre de fiche elle est,
écrit à la main et de façons variées (50 fiches en prod le 2026-11-19 : « Entraînement technique —
Suites », « Applications des suites », « Automatismes : dérivation », titres libres). Rien ne se
filtre, et deux fiches sur le même sujet ne se ressemblent pas.

## Décision

Un champ par question posée, comme pour les exercices ([ADR 0019](0019-classement-branche-notion-sous-notion.md)) :

| Sujet                 | Décision                                                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quel genre de fiche   | **Catégorie de fiche**, liste fermée, **fiche d'exercices seulement** : Entraînement technique · Applications · Automatismes · Révisions                                                              |
| De quoi elle parle    | **Notions** de l'arbre (notion ou sous-notion, jamais une branche), dans un ordre d'impression                                                                                                        |
| Combien de notions    | Fiche d'exercices : **une au plus**, sauf **Révisions** et **Automatismes** (plusieurs) ; évaluation, examen, quiz, devoir maison : plusieurs                                                         |
| Titre imprimé         | Sans titre libre : les notions (« Suites · Dérivation »), la catégorie en petit gris dessous. Titre libre : **lui seul**, et dessous les notions si la fiche en admet plusieurs ; jamais la catégorie |
| Niveau                | Un **badge** (forme courte, plein orange, texte blanc) à gauche de l'en-tête et au début du bas de page                                                                                               |
| Bas de page           | `[1ère Spé] Suites · Entraînement technique   n / N   chiph.re`                                                                                                                                       |
| Anglais               | Catégories traduites ; les notions n'ont pas de nom anglais (**chantier séparé**) : rien d'imprimé d'ici là                                                                                           |
| Fiches d'automatismes | Le script qui les fabrique ([ADR 0011](0011-fiche-d-automatismes-figee-par-graine.md)) pose catégorie et notions                                                                                      |
| Stockage              | `worksheets.category` + table `worksheet_classifications` (calquée sur `exercise_classifications`) ; la règle du nombre est gardée par la base                                                        |
| Accès                 | On lit les notions d'une fiche quand on lit la fiche ; auteur et admin écrivent ; un lien de partage transmet catégorie et notions                                                                    |

## Écarté

- **Texte libre pour le sujet** (« thème ») : mot retiré, doublons assurés.
- **Une case « notion » plus une liste pour les fiches à plusieurs notions** : deux endroits pour
  une même information.
- **« Préparation d'évaluation »** comme catégorie : Révisions joue ce rôle.
- **Catégorie pour les autres types** : le type (évaluation, devoir maison…) dit déjà le genre.
- **Imprimer la catégorie sous un titre libre** : le titre libre remplace tout.
