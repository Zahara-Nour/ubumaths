# Chantier fiche-modele — « Fiche du modèle » en tête de l'aperçu d'un modèle de question

## Reprendre ici

_Mis à jour le 2026-10-23, après #1650 — chantier CLOS, journal archivé._

- **État** : livré par #1650 (mergée, pas encore en prod). Le durable est dans `docs/systeme/questions.md` (« Fiche du modèle »).
- **Prochaine action** : aucune ; vérification manuelle notée dans `docs/wip/verifications-manuelles.md`.
- **En attente de David** : question du référentiel, hors chantier — l'éditeur ne propose que les points de la classe du modèle et des suivantes (`getGradesAtOrAbove`) ; « Trouver le complément » (CM1) ne peut donc pas valider CP-023 « Trouver le complément d'un nombre à la dizaine supérieure », posé sur son nœud. Règle voulue, ou modèle à reclasser en CP ?
- **Pièges** : le séparateur `›` perdait ses espaces au rendu Svelte → entités `&nbsp;›&#32;`.
- **Worktree / branche** : supprimés.

## Phase 0 (2026-10-23)

Mesures en prod (lecture) : 0 modèle sur un nœud archivé (ni ancêtre archivé), 0 modèle tagué sur
un point archivé, 359 modèles avec `options.constraints`, 79 modèles sur plusieurs classes.
Valeurs posées en prod : surtout `off` et `strict`, `form=warn`, `spacesFromFourDigits=true`,
`allowBracketsInFirstNegativeTerm=true`.

Exemple `17a3c039…` « Trouver le complément » : publié, CM1, `fill_in_blanks`,
Nombres et calculs › Entiers : addition et soustraction › complément, aucun point,
seul réglage « Espaces dès 4 chiffres ».
