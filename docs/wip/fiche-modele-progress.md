# Chantier fiche-modele — « Fiche du modèle » en tête de l'aperçu d'un modèle de question

## Reprendre ici

_Mis à jour le 2026-10-23, PR ouverte (avant merge)._

- **État** : phase 0 validée par David (classe seule, échec dans le bloc, version courte dans l'éditeur, phrase de l'éditeur corrigée) ; code + tests + doc `docs/systeme/questions.md` faits, revue `code-reviewer` sans bloquant.
- **Prochaine action** : CI verte → merge ; nettoyer le worktree.
- **En attente de David** : test manuel sur http://localhost:5176/dashboard/admin/questions/17a3c039-744d-4108-9b47-49f0183990b7/preview ; règle du référentiel ouverte : un modèle de CM1 peut-il être relié à un point de CE2 (programmes inférieurs) ?
- **Pièges en cours** : le séparateur `›` perdait ses espaces au rendu (Svelte) → entités `&nbsp;›&#32;`.
- **Worktree / branche** : `../ubumaths-wt-fiche-modele` · `feat/fiche-modele`.

## Phase 0 (2026-10-23)

Mesures en prod (lecture) : 0 modèle sur un nœud archivé (ni ancêtre archivé), 0 modèle tagué sur
un point archivé, 359 modèles avec `options.constraints`, 79 modèles sur plusieurs classes.
Valeurs posées en prod : surtout `off` et `strict`, `form=warn`, `spacesFromFourDigits=true`,
`allowBracketsInFirstNegativeTerm=true`.

Exemple `17a3c039…` « Trouver le complément » : publié, CM1, `fill_in_blanks`,
Nombres et calculs › Entiers : addition et soustraction › complément, aucun point,
seul réglage « Espaces dès 4 chiffres ».
