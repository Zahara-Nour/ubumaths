# `reduceFractionsAST` — précision exacte (proposition #3)

> **Objet** : remplacer `parseFloat + Math.round + BigInt` par `Rational` exact dans `reduceFractionsAST` (et son cas monôme `extractCoefficient`). Bug confirmé empiriquement : `1.7/2.3` → `1` (réduction silencieusement fausse), `1.2/0.6` → `1` (idem), `1.5/2.5` → non réduit, `123456789012345678/2` → entier différent (perte précision parseFloat sur > MAX_SAFE_INTEGER).

**Démarrage** : 2026-05-02
**Branche** : `main`

## Spec

| Comportement                        | Avant                  | Après                        |
| ----------------------------------- | ---------------------- | ---------------------------- |
| `\frac{1.7}{2.3}`                   | réduit à `1` (faux)    | réduit à `\frac{17}{23}`     |
| `\frac{1.2}{0.6}`                   | réduit à `1` (faux)    | réduit à `2`                 |
| `\frac{1.5}{2.5}`                   | non réduit             | réduit à `\frac{3}{5}`       |
| `\frac{0.3}{0.1}`                   | non réduit             | réduit à `3`                 |
| `\frac{123456789012345678}{2}`      | imprécis (parseFloat)  | exact `61728394506172839`    |
| `\frac{4}{6}`                       | réduit à `\frac{2}{3}` | inchangé (déjà OK)           |
| `\frac{-4}{6}`                      | `-\frac{2}{3}`         | inchangé                     |
| Fractions monomiales `\frac{2x}{4}` | `\frac{x}{2}`          | inchangé (mais via Rational) |

## Plan

1. **Phase 1 — Tests rouges** : ajouter les cas (1.7/2.3, 1.2/0.6, 1.5/2.5, 0.3/0.1, big int) dans `cosmetic-transforms.test.ts`. Confirmer qu'ils sont rouges.
2. **Phase 2 — Helper `extractRational`** : créer `extractRational(node: MathNode): Rational | null` dans `common/numeric.ts` (à côté de `getNumericValue` et `numericNode`). Utilise la logique de parsing décimal exact de `eval/evaluate.ts:217-223`.
3. **Phase 3 — Refacto `reduceFractionsAST`** : utiliser `extractRational + divRational + isInteger` au lieu de `extractNumericValue + Math.round + BigInt + gcd`.
4. **Phase 4 — Refacto `extractCoefficient`** : adapter le cas monôme.
5. **Phase 5 — Vérif** : tests rouges → verts. Suite globale `mathAST + intervals + geometry-core` à 14901+ verts.
6. **Phase 6 — Code review + commit**.

## Fichiers modifiés

- `src/lib/mathAST/common/numeric.ts` — ajout de `parseDecimalToRational` (privé) et `extractRational` (exporté). Imports `Rational`, `rational`, `fromInteger`, `negRational`, `floatToRational` depuis `normal/rational`.
- `src/lib/mathAST/common/index.ts` — barrel export de `extractRational`.
- `src/lib/mathAST/cosmetic-transforms.ts` :
  - `reduceFractionsAST` réécrit avec `extractRational + divRational + rationalToNode`. La branche numérique passe systématiquement par `divRational` (rationnel exact, gcd-réduit).
  - Helper privé `rationalToNode(r: Rational): MathNode` ajouté.
  - `extractCoefficient` retourne désormais `Rational | null`.
  - `extractVariablePart` adapté (utilise `extractRational(...) !== null` au lieu de `extractNumericValue(...) !== null`).
  - Ancien helper `extractNumericValue` **supprimé** (n'était plus utilisé).
  - Imports `gcd` et `numericNode` retirés (plus utilisés). Ajout de `divRational, isInteger, isZero, isNegative, absRational, negRational`.
- `src/lib/mathAST/__tests__/cosmetic-transforms.test.ts` — 7 nouveaux tests dans `describe('reduceFractionsAST')` couvrant les bugs corrigés (1.7/2.3, 1.2/0.6, 1.5/2.5, 0.3/0.1, fraction négative décimale, big int, décimal-vers-entier).

## Tests

- 91/91 `cosmetic-transforms.test.ts` verts (avant : 84 + 7 nouveaux rouges → 91 verts après fix).
- 14908/14908 suite globale `mathAST + math/intervals + geometry-core` (gain de +7).
- 0 régression. `pnpm check:incremental` ✓.

## Code review (Opus)

Verdict : **prêt à commit avec une correction préventive**. Bug trouvé : `parseDecimalToRational("1.2.3")` produisait `12/10` au lieu de `null` (le destructuring `const [intPart, decPart] = s.split('.')` ne voyait que les 2 premières parties). **Corrigé** : check explicite `parts.length !== 2`. Vérifié empiriquement : `extractRational(number('1.2.3'))` retourne maintenant `null` (défense en profondeur, même si la factory accepte ce string aujourd'hui).

Mineurs adressés :

- `extractRational` ajouté au barrel `common/index.ts`.
- Remplacement de la négation manuelle `{ n: -coef.n, d: coef.d }` par `negRational(coef)` (cohérence stylistique).

Mineur **non adressé** (dette documentée) : `parseDecimalToRational` duplique partiellement la logique de `eval/evaluate.ts:217-223` (`parseNumberToRational`). Une dédup serait propre mais hors scope de cette migration. À traiter dans un commit séparé si besoin.

## Statut

- [x] Spec
- [x] Phase 1 — tests rouges (7)
- [x] Phase 2 — `extractRational` helper
- [x] Phase 3 — refacto `reduceFractionsAST`
- [x] Phase 4 — refacto `extractCoefficient`
- [x] Phase 5 — vérification globale (14908 verts)
- [x] Phase 6 — review + commit
