# Chantier `canonical-form` — plus de `denormalize(normalize(…))` en ligne

## Reprendre ici

_Mis à jour le 2026-10-27, PR #1871 ouverte._

- **État** : 75 appels remplacés, garde ESLint en place ; `check:incremental` 0 erreur ; suites `mathAST` / `questions` / `geometry-core` vertes (33 749 tests, aucun modifié) ; revue `code-reviewer` sans finding.
- **Prochaine action** : CI verte → merge #1871 → archiver le journal (fin de chantier = versement, déjà fait dans le README mathAST).
- **En attente de David** : rien.
- **Pièges** : le compte juste est **77**, pas 78 (le 78ᵉ était un commentaire de `rational.ts`) ; le grep rate les 3 appels sur plusieurs lignes, la règle AST les voit.
- **Worktree / branche** : `../ubumaths-wt-canonical-form`, `refactor/canonical-form`.

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
