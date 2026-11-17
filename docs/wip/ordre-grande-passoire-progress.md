# Chantier `ordre-grande-passoire` : le grade de l'Ordre fondé sur le travail réel

## Reprendre ici

_Mis à jour le 2026-11-09, ouvert depuis le chantier `navadra`, rien n'est commencé._

- **État** : décision de principe seulement. Le grade de l'Ordre de la Grande Passoire se fondera sur le **travail réel** de l'élève, **pas sur les gidouilles**.
- **Prochaine action** : phase 0. Choisir ce qui mesure le travail réel, par exemple les points du programme acquis sur tout le parcours, comme pour les Mathoux. Fixer ensuite les seuils des 7 grades, puis réécrire la ligne du Compendium.
- **En attente de David** : le lancement du chantier.
- **Pièges** :
  - Le Compendium dit encore « par seuil de gidouilles cumulées » (`lore-pataphysique.md:1100`). C'est à réécrire ; David a tranché.
  - L'Ordre n'existe pas dans le code. Seuls des noms de décorations de Mathoux y font allusion (`src/lib/mathoux/decorations.ts:90,104`).
- **Worktree / branche** : aucun.

## Décision (2026-11-09, David)

Le problème : avec des gidouilles cumulées, un élève qui travaille sans jouer monte lentement. Le travail ne rapporte que les étapes de la Chatterie (20 au plus sur 24 h) et la révision du jour (+2) ; voir `docs/systeme/jeux-et-economie.md:211`. Les mini-jeux et les gestes du prof, eux, en rapportent bien plus. Le grade mesurerait donc l'activité ludique, pas l'apprentissage.

**Choix b** (sur ma recommandation) :

- le grade se fonde sur le travail réel ;
- il ne s'achète pas, ne se distribue pas à la main et ne s'obtient pas en jouant ;
- les gidouilles restent une **monnaie** qu'on dépense en boutique.

La voie a a été écartée : garder les gidouilles et faire payer chaque travail.

## Historique

- **2026-11-09** : ouvert pendant la question 5 du chantier `navadra` (la progression).
