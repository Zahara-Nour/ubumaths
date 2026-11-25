# Badge du niveau dans une fiche anglaise — journal

## Reprendre ici

_Mis à jour le 2026-11-25, avant la PR._

- **État** : correctif sur la branche · **Prochaine action** : PR, CI, merge, archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `ubumaths-wt-badge-niveau-anglais` · `fix/badge-niveau-anglais`

## Le constat (David, 2026-11-25)

Le PDF anglais d'une fiche n'imprimait pas le badge du niveau (« 1ère Spé »). Voulu dans le code
(`levels()` de `worksheet-generator.ts`) : « faute de noms anglais des niveaux ».

## Décision (David, 2026-11-25 : « 1 »)

Entre le nom français tel quel, « Year 12 » (britannique) et « Grade 11 » (américain) : **le nom
français**, celui que connaissent les élèves. Aucun nom à inventer.

## Fait

- `levels()` ne filtre plus la langue : badges, `{{level}}` et `{{level_short}}` en anglais aussi.
- Test `titre-pied-de-page.test.ts` : PDF anglais compilé, « 1ère Spé » devant le titre sur chaque
  page ; rouge avant, vert après. Tests `src/lib/typst/` et `src/lib/worksheets/` verts (1 131).
- Rendu vu (PDF compilé puis image) : badge en tête et en bas de page de la fiche anglaise.
- Doc : `docs/systeme/fiches-et-pdf.md`.
