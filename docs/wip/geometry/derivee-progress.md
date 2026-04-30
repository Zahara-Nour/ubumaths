# derivee(f) — Progress

**Date** : 2026-05-01
**Statut** : Implémenté, testé, prêt à commiter

## Fonctionnalité

Builtin DSL `derivee(f)` qui crée une nouvelle `GeoFunction` représentant f'(x) à
partir d'une `GeoFunction` existante (courbe y = f(x) créée par `courbe()`).

```
f = courbe("y = x^3")
g = derivee(f)        # g(x) = 3*x^2
h = derivee(g)        # h(x) = 6*x
```

## Décisions d'architecture

- **Q1 (équation stockée)** : Option A — chaîne calculée. `g.equation` =
  `"y = " + toCustom(f.derivative)`. Cohérent avec le contrat `dependsOn: []` de
  `GeoFunction` (autonomie).
- **Q2 (couleur par défaut)** : palette auto (comportement par défaut de tous
  les builtins). Pas d'héritage depuis `f`.
- **Q3 (sérialisation littérale)** : différée. Le round-trip réécrit
  `derivee(f)` → `courbe("y = f'(x)")`. Sémantiquement équivalent, code
  régénéré différent. Un système générique de provenance DSL serait à étudier
  séparément si le besoin se confirme pour d'autres builtins.

## Points clés de l'implémentation

- **Réutilisation** : `g.compiledFn` réutilise directement `f.compiledDerivative`
  (qui est déjà `compile(f.derivative)` par invariant de `GeoFunction`). Évite
  une compilation redondante. Commenté dans le code.
- **Calcul f''** : `differentiate(f.derivative, { variable: 'x', simplify: true })`,
  puis compilé pour le champ `g.derivative` / `g.compiledDerivative`.
- **Récurrence** : `derivee(derivee(f))` fonctionne nativement (le résultat est
  une `GeoFunction` standard, donc à nouveau dérivable).
- **Limitations** : `courbe("y = 5")` et `courbe("y = 2*x + 3")` sont détectées
  comme **droites** (pas `GeoFunction`) par le pipeline existant de `courbe()`.
  `derivee()` les rejette donc avec un `DslRuntimeError`. Cette limitation est
  pré-existante et hors scope.

## Fichiers modifiés

- `src/lib/geometry-core/dsl/builtins.ts` :
  - Ajout de `toCustom` à l'import depuis `$lib/mathAST`
  - Ajout de `'derivee'` dans `BUILTIN_NAMES`
  - Ajout de `case 'derivee':` dans le switch (~50 lignes)

## Fichiers créés

- `src/lib/geometry-core/dsl/__tests__/interpreter-derivee.test.ts` : 20 tests

## Tests

- 20/20 verts pour `interpreter-derivee.test.ts`
- 1016/1016 verts pour l'ensemble `dsl/__tests__/` (aucune régression)

Couverture :

- Cas nominaux : polynôme, sin, exp, ln, chain rule
- Récurrence : `derivee(derivee(f))` (f''), champ `g.derivative` (f'')
- Cas additionnels : quadratique
- Autonomie : `dependsOn === []`, équation stockée commence par `y = `
- Erreurs : point, conique, courbe implicite, droite, tangente, arité (0/2)
- Round-trip : sérialisation → reparse, valeurs préservées

## Quality checks

- `pnpm test:server src/lib/geometry-core/dsl/__tests__/interpreter-derivee.test.ts` : ✓
- `pnpm check:incremental` : ✓ (exit 0, 9 erreurs résiduelles dans slides/demo, pré-existantes)
- `npx eslint src/lib/geometry-core/dsl/builtins.ts src/lib/geometry-core/dsl/__tests__/interpreter-derivee.test.ts` : ✓
