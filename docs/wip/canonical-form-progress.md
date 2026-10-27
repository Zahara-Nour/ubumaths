# Chantier `canonical-form` — plus de `denormalize(normalize(…))` en ligne

## Reprendre ici

_Mis à jour le 2026-10-27, ouverture du chantier (rien codé)._

- **État** : worktree et journal créés ; phase 0 à faire.
- **Prochaine action** : phase 0 — relever les 78 `denormalize(normalize(…))` hors tests (par famille, par fichier) ; dire lesquels ne peuvent pas passer par `canonicalForm` et pourquoi (`try/catch`, options de `normalize`, appel dans `normalize` lui-même) ; proposer la forme de la garde (script, règle de lint ou test) ; **attendre la validation de David avant de coder**.
- **En attente de David** : la phase 0.
- **Pièges** : preuve comme au lot b de normalize-usages — suites `mathAST` et `questions` inchangées, AUCUN test mis à jour ; ne pas compter les appels dans `src/lib/mathAST/normal/` sans les lire (le lambda `canonicalExponent` de `normalize.ts` est voulu).
- **Worktree / branche** : `../ubumaths-wt-canonical-form`, `refactor/canonical-form`.

## Contexte

Décision de David du 2026-10-27 (session valeurs-remarquables) : remplacer les appels `denormalize(normalize(…))` écrits en ligne par `canonicalForm` (`src/lib/mathAST/normal/canonical-form.ts`), sans rien changer à l'écran, puis une garde qui refuse tout nouvel appel en ligne.

- Point ouvert : `docs/systeme/mathast/README.md`, Points ouverts, « Fusion des deux moteurs » — 75 appels laissés « internes, voulus » à la fin de normalize-usages (Q5), **78 le 2026-10-27** (3 nouveaux, rien ne l'empêche).
- Ce qui existe : `docs/archive/wip/normalize-usages-progress.md` § 6-10 (lot b, #1790) — `canonicalForm`, `exactRational`, `polynomialCoefficients`, `coefficientsByDegree` ; copies locales déjà remplacées (`simplified`, `canon`, `normalForm`…).
- **Hors chantier** : la fin de la fusion `simplify` / `pedagogical-simplify` (repli de l'atelier sur `simplify()`), qui a sa propre question à trancher (même point ouvert).

## Historique

- 2026-10-27 : chantier ouvert, worktree créé depuis `origin/main` (`449666bd9`).
