# Unités impériales et conversions affines (Celsius/Fahrenheit)

> **Module** : `src/lib/mathAST/units/` > **Prompt source** : `docs/wip/units-imperial-affine-prompt.md` > **Statut** : Phase 5 livrée — prêt pour commit
> **Date** : 2026-05-03

## Objectif

Combler deux trous fonctionnels du catalogue d'unités identifiés par comparaison avec Poincaré (NumWorks/Upsilon) :

1. Aucune unité impériale (`ft`, `lb`, `mi`, `gal`, ...)
2. Aucune conversion affine (Celsius/Fahrenheit ↔ Kelvin)

Bénéfice pédagogique : exercices Celsius/Fahrenheit, contextes anglo-saxons (physique américaine, aéronautique).

## Décisions Phase 0 (validées 2026-05-03)

### A. Catalogue impérial — 10 unités via `SPECIAL_UNITS`

**Distance** (baseSymbol `'m'`) :
| Symbole | Coefficient (m) | Nom |
|---|---|---|
| `in` | 0.0254 | inch |
| `ft` | 0.3048 | foot |
| `yd` | 0.9144 | yard |
| `mi` | 1609.344 | mile |

**Masse** (baseSymbol `'g'`) :
| Symbole | Coefficient (g) | Nom |
|---|---|---|
| `oz` | 28.349523125 | ounce (avoirdupois) |
| `lb` | 453.59237 | pound (avoirdupois) |

**Volume US uniquement** (baseSymbol `'L'`) :
| Symbole | Coefficient (L) | Nom |
|---|---|---|
| `gal` | 3.785411784 | US gallon |
| `qt` | 0.946352946 | US quart |
| `pt` | 0.473176473 | US pint |
| `floz` | 0.0295735295625 | US fluid ounce |

**Aliases français** : `pouce → in`, `pied → ft`, `livre → lb`.

**Hors scope** :

- `acre` (dimension `m²` complexe — nécessite `components: Map([['m', 2]])` directement, à traiter séparément)
- UK gallon et autres unités UK
- Préfixes SI sur impérial (`kft`, `Mlb`, etc.) : refusés automatiquement par l'architecture (les `SPECIAL_UNITS` n'acceptent pas de préfixes par construction de `resolveUnit`).

### B. Conversions affines — Option 2 (Poincaré-style)

Ajout de `readonly offset?: number` à **`BaseUnitDef`** ET **`Unit`** (pour détection runtime).

Nouvelles unités dans `SPECIAL_UNITS` :

```typescript
'°C': { baseSymbol: 'K', coefficient: 1, offset: 273.15, dimension: 'temperature', name: 'celsius' }
'°F': { baseSymbol: 'K', coefficient: 5/9, offset: 459.67, dimension: 'temperature', name: 'fahrenheit' }
```

Helper `isAffine(u: Unit): boolean = u.offset !== undefined && u.offset !== 0 && u.components.size === 1`

Nouvelle fonction `convertAffine(value, from, to)` séparée de `getConversionFactor` :

```typescript
// (value + from.offset) * from.coefficient / to.coefficient - to.offset
```

### C. Composition affine — strictement refusée

Toute opération qui mélange une unité affine avec une autre unité jette une erreur typée `AFFINE_COMPOSITION_FORBIDDEN` :

- `5°C × 2` → erreur
- `5°C × m` → erreur
- `°C / s` → erreur

### D. Sémantique des opérations sur températures

| Expression     | Résultat                                  | Justification                                                                                                                                                             |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0°C → K`      | `273.15 K`                                | Conversion absolue standard                                                                                                                                               |
| `100°C → °F`   | `212°F`                                   | Conversion absolue standard                                                                                                                                               |
| `-40°C → °F`   | `-40°F`                                   | Sanity check                                                                                                                                                              |
| `100°C - 50°C` | **`50 K`** (strict)                       | Différence de températures absolues = différence en K (l'offset s'annule). Préserve la cohérence physique : `(100°C - 50°C) + 20°C = 50 K + 293.15 K = 343.15 K = 70°C` ✓ |
| `5°C + 3°C`    | **erreur**                                | Somme de températures absolues n'a pas de sens physique                                                                                                                   |
| `5°C + 3 K`    | **`8°C`**                                 | `K` interprété comme différence (delta), résultat absolu en `°C`                                                                                                          |
| `5°C × 2`      | **erreur** `AFFINE_COMPOSITION_FORBIDDEN` | Multiplication d'une température absolue ambiguë                                                                                                                          |

**Note** : la distinction « température absolue » vs « différence de température » est implicite. Pour le module mathAST, la règle simple :

- Soustraction `°C - °C` ou `°F - °F` → résultat en `K` (différence)
- Addition `°C + K` ou `°F + K` → `K` traité comme différence, résultat en l'unité de gauche (absolue)
- Toute autre composition → refus

### E. Mode locale `unitFormat`

Reporté à phase ultérieure. Le mode `'best'` actuel restera en métrique par défaut.

## Architecture (résumé)

### Modifications de types

```typescript
// src/lib/mathAST/units/types.ts
interface BaseUnitDef {
	// ... existing fields
	readonly offset?: number; // NEW: for affine conversions
}

interface Unit {
	// ... existing fields
	readonly offset?: number; // NEW: propagated from BaseUnitDef when single-component
}
```

### Modifications de conversion.ts

```typescript
// Existing: multiplicatif uniquement
getConversionFactor(from, to): number | null

// NEW: gère les offsets
convertAffine(value: number, from: Unit, to: Unit): number | null

// Helper
isAffine(u: Unit): boolean
```

### Modifications de operations.ts

`multiply`, `divide`, `power` doivent rejeter toute opération impliquant une unité affine.

### Modifications de evaluate-with-units.ts

Pipeline d'évaluation : détecter le cas affine **avant** d'appliquer le facteur multiplicatif. Si affine, utiliser `convertAffine` à la place.

## Plan d'exécution

| Phase | Description           | Agent         | Modèle | Statut                                                                       |
| ----- | --------------------- | ------------- | ------ | ---------------------------------------------------------------------------- |
| 0     | Spec TDD              | —             | —      | ✅ Validée                                                                   |
| 1     | Tests d'abord         | direct        | opus   | ✅ 65 tests RED                                                              |
| 2     | Catalogue impérial    | direct        | opus   | ✅ 35/35 GREEN, 0 régression                                                 |
| 3     | Conversions affines   | direct        | opus   | ✅ 35/35 GREEN, 0 régression sur 11796 tests mathAST                         |
| 4     | Code review           | code-reviewer | opus   | ✅ 7 findings traitées (2 majors, 3 minors, 1 nit, +6 tests)                 |
| 5     | Quality checks finaux | direct        | sonnet | ✅ ESLint clean, check:incremental clean (9 erreurs pré-existantes filtrées) |

## Critères d'acceptation

1. `parseUnit('ft')`, `parseUnit('mi')`, `parseUnit('lb')`, `parseUnit('gal')`, `parseUnit('°C')`, `parseUnit('°F')` retournent des unités valides
2. Conversions impérial↔métrique exactes :
   - `1 mi = 1.609344 km`
   - `1 lb = 453.59237 g`
   - `1 gal = 3.785411784 L`
3. Conversions affines :
   - `0°C = 273.15 K`
   - `100°C = 212°F`
   - `-40°C = -40°F`
4. Compositions refusées avec erreur typée :
   - `5°C × 2` → `AFFINE_COMPOSITION_FORBIDDEN`
   - `°C + °F` → `AFFINE_COMPOSITION_FORBIDDEN`
5. `5°C + 3 K → 8°C` autorisé (somme °abs + delta)
6. `100°C - 50°C → 50 K` (différence d'absolus en delta)
7. Cohérence dimensionnelle : `5 lb + 3 m → INCOMPATIBLE_UNITS`
8. Aucune régression sur les tests existants
9. Préfixes SI sur impérial refusés : `parseUnit('kft') === null`

## Fichiers modifiés (à compléter au fur et à mesure)

- [x] `src/lib/mathAST/units/types.ts` — ajout `offset?: number` sur `BaseUnitDef` et `Unit` (Phase 3a)
- [x] `src/lib/mathAST/units/definitions.ts` — SPECIAL_UNITS impériales (Phase 2) + °C/°F (Phase 3b) + aliases français
- [x] `src/lib/mathAST/units/factory.ts` — propagation offset dans `unit()` (Phase 3c)
- [x] `src/lib/mathAST/units/parser.ts` — propagation offset + rejet composition (Phase 3c)
- [x] `src/lib/mathAST/units/conversion.ts` — `isAffine`, `convertAffine`, et `getConversionFactor` retourne null pour affine (Phase 3d)
- [x] `src/lib/mathAST/units/operations.ts` — `AffineCompositionError` dans `multiply`/`power` (Phase 3e)
- [x] `src/lib/mathAST/eval/evaluate-with-units.ts` — `detectAffineComposition` + `tryEvaluateAffineBinary` (Phase 3f)
- [x] `src/lib/mathAST/units/__tests__/imperial.test.ts` — 35 tests (Phase 1, GREEN Phase 2)
- [x] `src/lib/mathAST/units/__tests__/affine.test.ts` — 35 tests (Phase 1, GREEN Phase 3)

## Documents produits

- `docs/wip/units-imperial-affine-progress.md` (ce document)

## Journal

- **2026-05-03** : Phase 0 validée. Décisions verrouillées sur les 7 questions ouvertes.
- **2026-05-03** : Phase 1 livrée. 2 fichiers de tests créés (imperial.test.ts 35 tests, affine.test.ts 35 tests). 65 tests échouent comme attendu (RED), 5 passent (rejets de préfixes SI sur unités encore inexistantes).
- **2026-05-03** : Phase 2 livrée. 10 unités impériales + 3 aliases français ajoutés à `SPECIAL_UNITS`/`UNIT_ALIASES`. 35/35 tests impériaux passent. 0 régression (371 autres tests units passent).
- **2026-05-03** : Phase 3 livrée. Implémentation complète des conversions affines :
  - `offset?: number` ajouté à `BaseUnitDef` et `Unit`
  - °C (offset 273.15) et °F (offset 459.67, coefficient 5/9) dans SPECIAL_UNITS
  - `unit()` factory et `parse()` propagent l'offset, rejettent la composition au niveau parsing
  - `isAffine(u)` et `convertAffine(value, from, to)` exportés depuis `conversion.ts`
  - `getConversionFactor` retourne null pour les paires affines (force l'usage de `convertAffine`)
  - `multiply` et `power` (donc `divide` et `invert`) jettent `AffineCompositionError`
  - Pipeline `evaluateWithUnits` : `detectAffineComposition` rejette ×/÷/^/`f(°C)` à toute profondeur ; `tryEvaluateAffineBinary` gère les semantics top-level :
    - sub(°C, °C) → K (delta)
    - sub(°C, K) → °C (absolu - delta)
    - sub(K, °C) → throw (delta − absolu)
    - add(°C, °C) → throw (somme d'absolus)
    - add(°C, K) ou add(K, °C) → absolu (delta + absolu)
  - 35/35 tests affine passent. 11796 tests mathAST passent (0 régression).
- **2026-05-03** : Phase 4 livrée. Code review par `code-reviewer` agent → 7 findings :
  - **Major #1 + #2** : `detectAffineComposition` ne couvrait que ~9 types AST sur ~24, ratait `relation`, `composition`, `subscript`, `piecewise`, `matrix`, `limit`, `logical`, `logical-not`. Refactorisé pour couvrir tous les types avec children, distinguant pass-through (addition, subtraction, opposite, positive, delimiter, relation, subscript, piecewise, matrix) vs composition (multiplication, division, superscript, function, composition, logical, logical-not, limit).
  - **Minor #4** : `tryEvaluateAffineBinary` ne strippait pas les `delimiter` wrappers — ajouté `stripDelim()`.
  - **Minor #5** : ajouté commentaire « Keep in sync with `isAffine()` » sur `hasAffineOffset` dans operations.ts.
  - **Nit #7** : amélioré JSDoc `convertAffine` pour expliciter le cas multiplicatif pur (offset undefined === 0).
  - **Tests ajoutés** : delimiter wrap (100°C) - (50°C), °F + 9 K mixed delta, °F − °F → K, K − °C rejet, round-trip °F→K→°C, identity °C → °C.
  - 41/41 affine tests, 35/35 imperial tests, 11802/11802 mathAST tests (0 régression).
  - Findings non bloquants laissés ouverts : #3 (test `opposite(5°C)`), #6 (typage strict du code AFFINE_COMPOSITION_FORBIDDEN). À traiter ultérieurement si besoin.
- **2026-05-03** : Phase 5 livrée. Quality checks :
  - ESLint sur les 9 fichiers modifiés : 0 erreur, 0 warning.
  - `pnpm check:incremental` : 9 erreurs au total, toutes pré-existantes (`slides/demo`, `extern/`), aucune dans les fichiers modifiés. Le script filtre correctement et exit 0.
  - Pas de fichier `.svelte` modifié → autofixer non requis.

---

## Suite des travaux unités (livraisons ultérieures)

Cette livraison a ouvert la voie à deux extensions livrées les jours suivants :

- **2026-05-04** : reconnaissance d'unités SI dérivées (Hz, N, J, W, Pa, C, V, Ω, F) — voir `units-derived-progress.md`. Apporte le champ `components: ReadonlyMap<string, number>` sur `BaseUnitDef`, qui débloque les unités composées en dimension comme l'aire.
- **2026-05-04** : unités d'aire (a, ha, acre) — voir `units-area-progress.md`. Hors scope de ce prompt mais débloqué par les dérivées.

### TODOs restants identifiés

- Mode locale `unitFormat: 'metric' | 'imperial'` (reporté Phase 5 du prompt initial)
- Catalogue dérivées étendu : T, H, S, Wb, lm, lx, Bq, Gy, Sv (hors scope V1, à demander selon besoin)
- Expansion `N → kg·m·s⁻²` (hors scope V1 dérivées, conversion inverse)
- Distinction sémantique `J` vs `N·m` (couple) — non couvert par la signature dimensionnelle
