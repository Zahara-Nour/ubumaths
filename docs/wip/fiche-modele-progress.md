# Chantier fiche-modele — « Fiche du modèle » en tête de l'aperçu d'un modèle de question

## Reprendre ici

_Mis à jour le 2026-10-23, avant toute PR._

- **État** : phase 0 proposée à David, rien de codé.
- **Prochaine action** : selon ses réponses, tests de rendu (rouges) puis composant + `load` serveur de `[id]/preview`.
- **En attente de David** : validation des comportements et de la liste ; sens de « niveau » ; bloc dans l'éditeur ou non ; lecture en échec : bloc seul ou page en 500.
- **Pièges en cours** : `loadTemplateProgrammeTags` ne propose que les programmes de la classe du modèle et des suivantes — le modèle exemple (CM1) a des points CP/CE2 sur sa notion, invisibles pour lui.
- **Worktree / branche** : `../ubumaths-wt-fiche-modele` · `feat/fiche-modele`.

## Phase 0 (2026-10-23)

Mesures en prod (lecture) : 0 modèle sur un nœud archivé (ni ancêtre archivé), 0 modèle tagué sur
un point archivé, 359 modèles avec `options.constraints`, 79 modèles sur plusieurs classes.
Valeurs posées en prod : surtout `off` et `strict`, `form=warn`, `spacesFromFourDigits=true`,
`allowBracketsInFirstNegativeTerm=true`.

Exemple `17a3c039…` « Trouver le complément » : publié, CM1, `fill_in_blanks`,
Nombres et calculs › Entiers : addition et soustraction › complément, aucun point,
seul réglage « Espaces dès 4 chiffres ».
