# Chantier « rectangle-sans-equerre » — construire un rectangle sans équerre (4-038)

> Outil manquant n° 37 de [`outils-manquants.md`](outils-manquants.md). Point servi : 4-038 « Construire des
> rectangles sans équerre » (`cycle4.json`, aucune borne écrite). Né du chantier
> [`questions-4`](questions-4-progress.md) § 54.

## Reprendre ici

_Mis à jour le 2026-11-17, décisions de cadrage prises, phase 0 à écrire._

- **État** : cadrage décidé par David le 2026-11-17 (§ 2) ; aucun code, aucun worktree.
- **Prochaine action** : écrire la phase 0 (§ 3) : syntaxe de `verifier:` en exemples, messages d'erreur du juge,
  page de démo ; la soumettre à David **avant de coder**.
- **En attente de David** : rien (la validation de la phase 0, une fois écrite).
- **Pièges en cours** : ne pas toucher au juge du rectangle à l'équerre (`ruled-polygon.ts`, chantier
  `regle-graduee`) : une forme à côté, pas un changement de l'existante.
- **Worktree / branche** : aucun (à créer : `../ubumaths-wt-rectangle-sans-equerre`, `feat/rectangle-sans-equerre`).

## 1. Ce qui existe (lecture du code, 2026-11-17)

- Aimantation d'un toucher : point nommé, sinon intersection de deux traits (droite-droite, droite-cercle,
  cercle-cercle), sinon sur un trait (`src/lib/questions/construction/instruments.ts`, `snapInstrument`,
  `intersectTraits`).
- Point « construit » : départ ou intersection de traits construits, de proche en proche (`constructionOf`,
  `isBuilt`, même fichier).
- Rectangle coté sur papier uni : `verifier: rectangle A ; B ; C ; D : BC = 3 cm`, juge `ruled-polygon.ts`, lié à
  la méthode à l'équerre ; le parseur impose la palette Segment · Équerre · Règle graduée (`ruledPolygonError`,
  `construction-parser.ts`) et refuse toute autre.
- Manque : une forme de vérification sans équerre (parseur) et son juge. L'affichage ne devrait pas changer (à
  confirmer en phase 0).

## 2. Décisions de David (2026-11-17, « je te suis » sur mes recos)

1. **Données** : un côté et une diagonale (« ABCD rectangle, AB = 4 cm, AC = 6 cm ») — la propriété des
   diagonales (même milieu, même longueur). Variations : AB de 3 à 6 cm, AC de AB + 1 à 9 cm, au mm ; noms des
   sommets variés.
2. **Palette** : Segment · Compas · Règle graduée, sans report.
3. **Juge** : le résultat, pas la méthode ; seule exigence de méthode : B, C, D **construits** (intersection de
   traits ou graduation), jamais posés à l'œil. Toute méthode juste passe.
4. **Découpage** : PR 1 = l'outil (parseur, juge, messages, doc `ubumark.md`, page de démo) ; PR 2 = le modèle
   4-038, lot d'un modèle dans `questions-4`. Puis clôture de `questions-4`.
5. **Quand** : phase 0 dans une session neuve, validée par David avant tout code.

## 3. Phase 0

_À écrire._
