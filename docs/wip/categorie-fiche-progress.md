# Catégorie et notion d'une fiche d'exercices — journal

## Reprendre ici

_Mis à jour le 2026-11-19, ouverture du chantier (rien de codé)._

- **État** : idée validée dans son principe par David, phase 0 à mener · **Prochaine action** : poser à David les questions de phase 0 ci-dessous, une à la fois, en mots simples · **En attente de David** : réponses de phase 0 · **Pièges en cours** : « thème » est un mot retiré (CONTEXT.md) → la fiche pointe un nœud de l'arbre (ADR 0019) · **Worktree / branche** : aucun (à créer : `feat/categorie-fiche`)

## L'idée (David, 2026-11-19)

Une fiche de type « fiche d'exercices » a **de quoi elle parle** et **quel genre de fiche** elle est.
Son titre se compose des deux (la catégorie en plus petit) ; un titre libre, s'il est saisi,
remplace le titre composé.

Aujourd'hui, les deux sont écrits en dur dans le titre, de façons variées (mesuré en prod le
2026-11-19, 50 fiches) : « Entraînement technique — Suites » (12), « Fonctions affines :
entraînement technique », « Applications des suites » (11), « Automatismes : dérivation » (14),
titres libres (« Préparation Bac Blanc 1 », « Produit scalaire »…).

## Proposition (avis de Claude, accepté dans son principe)

- **De quoi ça parle** → un **nœud de l'arbre** (`classification_nodes` : branche, notion ou
  sous-notion), comme les exercices (ADR 0019 : « un champ par question posée »). Pas de texte
  libre, pas le mot « thème ». Ex. « Applications de la dérivation » → notion Dérivation.
- **Quel genre de fiche** → **catégorie de fiche**, liste fermée, propre aux fiches (≠ catégories
  d'exercice). Premier jet : Entraînement technique · Applications · Automatismes · Révisions ·
  Préparation d'évaluation. Seulement pour le type « fiche d'exercices ».
- **Titre** : composé (catégorie au-dessus en petit, nœud en grand, niveau dessous) ; titre libre →
  il remplace le titre composé.
- **Coût** : ADR, migration additive (deux colonnes sur `worksheets`, aucun nouvel accès), éditeur,
  générateur PDF (en-tête et bas de page), reclassement des 50 fiches (37 déductibles du titre,
  page à cocher ; 13 à la main).

## Questions de phase 0 (aucune tranchée)

1. Liste des catégories : laquelle exactement ? (compléter le premier jet)
2. Une fiche à plusieurs notions (« Préparation Bac Blanc 1 ») : un seul nœud, plusieurs, ou aucun
   - titre libre ?
3. Disposition du titre composé (catégorie au-dessus ou dessous, taille, couleur) ; et au bas de
   page : « Suites · Entraînement technique · 1ère Spé » ?
4. Titre libre : remplace-t-il tout, ou garde-t-on la catégorie en petit au-dessus ?
5. Fiches en anglais : noms anglais des catégories et des nœuds (les nœuds n'en ont pas).
6. Catégorie « Automatismes » : posée d'office pour une fiche tirée de modèles de questions
   (ADR 0011) ?
7. Les autres types (évaluation, devoir maison, examen) : notion seule, sans catégorie ?

## Lié

- Niveau de la fiche imprimé sous le titre et au bas de page : PR #2891 (chantier `pied-gidouille`).
  Le PDF de l'élève et celui d'un lien de partage n'ont pas les niveaux (fonction SQL sans
  `grades`) : migration à décider, question d'accès « l'élève et le visiteur d'un lien de partage
  pourront lire le niveau de la fiche ».
