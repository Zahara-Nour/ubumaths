# Chantier `zip-fiche-langues` — langue d'impression et zip de toutes les formes

## Reprendre ici

_Mis à jour le 2026-11-12, avant la PR._

- **État** : code + tests + doc faits, revue traitée, PR ouverte · **Prochaine action** : CI verte → merge · **En attente de David** : essai à l'écran (aperçu PDF d'une fiche) · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-zip-fiche-langues` / `feat/zip-fiche-langues`

## Décisions de David (2026-11-12)

- La langue **reste sur la fiche** (elle décide de ce que voient les élèves affectés) ; l'aperçu PDF du prof gagne un choix « Langue d'impression » qui part d'elle et ne change que le PDF, non enregistré.
- Bouton « Tout télécharger (.zip) » dans l'aperçu du prof : 4 formes × français et anglais = 8 PDF.
- Exercices non traduits : la version anglaise est faite quand même, avec un avertissement.
- Mêmes valeurs (même graine) dans les 8 PDF.
- Noms : titre français, `_EN` à la fin pour l'anglais (#2581).

## Historique

- 2026-11-12 : phase 0 validée (« go »), implémentation dans `PdfPreview.svelte`, test `PdfPreview-langues-zip.svelte.test.ts` (5 cas), avertissement des non-traduits déplacé dans l'aperçu (suit la langue d'impression).
- 2026-11-12 : revue `code-reviewer` traitée — zip et lot verrouillent les réglages (compilateur et images partagés) et figent niveau, taille, langue au départ ; l'onglet Lot montre la langue d'impression et l'avertissement des non-traduits (test du lot en anglais ajouté).
