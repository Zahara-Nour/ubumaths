# Chantier `canonical-form` — plus de `denormalize(normalize(…))` en ligne

## Reprendre ici

_Mis à jour le 2026-10-27, après #1871 — chantier CLOS, journal archivé._

- **État** : #1871 mergée ; les 77 appels en ligne passent par `canonicalForm`, garde ESLint `no-restricted-syntax` en place ; délai du job Lint de la CI porté à 30 min (relecture ESLint à froid quand `eslint.config.*` change). Pas encore en prod.
- **Versé** : `docs/systeme/mathast/README.md`, Points ouverts, « Fusion des deux moteurs ».
- **Hors chantier** : la fin de la fusion `simplify` / `pedagogical-simplify` (même point ouvert).

## Contexte

Décision de David du 2026-10-27 (session valeurs-remarquables) : remplacer les appels `denormalize(normalize(…))` écrits en ligne par `canonicalForm` (`src/lib/mathAST/normal/canonical-form.ts`), sans rien changer à l'écran, puis une garde qui refuse tout nouvel appel en ligne.

- Point ouvert : `docs/systeme/mathast/README.md`, Points ouverts, « Fusion des deux moteurs » — 75 appels laissés « internes, voulus » à la fin de normalize-usages (Q5), **78 le 2026-10-27** (3 nouveaux, rien ne l'empêche).
- Ce qui existe : `docs/archive/wip/normalize-usages-progress.md` § 6-10 (lot b, #1790) — `canonicalForm`, `exactRational`, `polynomialCoefficients`, `coefficientsByDegree` ; copies locales déjà remplacées (`simplified`, `canon`, `normalForm`…).
- **Hors chantier** : la fin de la fusion `simplify` / `pedagogical-simplify` (repli de l'atelier sur `simplify()`), qui a sa propre question à trancher (même point ouvert).

## Phase 0 (validée par David le 2026-10-27)

77 appels hors tests (75 sur une ligne, 3 sur plusieurs ; le 78ᵉ du grep était un commentaire). Solveurs 59, pipelines pédagogiques 8, intégration 5, limites 2, `periodic-member` 1, `curve-nature` 1, `normal/` 2.

- Q1 : l'appel avec option (`pedagogical-simplify:391`, `{ assumptions }`) → `canonicalForm(node, ctx?)`, `ctx` passé tel quel à `normalize`.
- Q2 : le commentaire de `canonicalForm` aligné sur l'ADR 0032 § 3 — une valeur sans variable réduite peut être montrée (`exactValueAt`, `exactQuotient` des limites, racines des solveurs), une expression avec variable jamais.
- Q3 : garde = règle ESLint `no-restricted-syntax` (sélecteur AST, voit les appels sur plusieurs lignes), en `pre-push` (`lint:fast`) et en CI. Exceptions par `eslint-disable-next-line` motivé : la définition de `canonicalForm`, le lambda `canonicalExponent` de `normalize.ts` (import circulaire).
- Les `try/catch` (20 appels) restent : `canonicalForm` lève quand `normalize` lève.
- Preuve : garde rouge avant (77 signalements), verte après ; suites inchangées, aucun test modifié.

## Historique

- 2026-10-27 : chantier ouvert, worktree créé depuis `origin/main` (`449666bd9`).
- 2026-10-27 : phase 0 validée ; remplacement par script (parenthèses équilibrées), imports rangés, garde rouge vérifiée (77) puis verte.
- 2026-10-27 : #1871 mergée (job Lint coupé à 20 min par la relecture à froid, délai porté à 30 min, validé par David) ; chantier clos, journal archivé.
