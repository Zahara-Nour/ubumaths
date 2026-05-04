# Unités d'aire : are, hectare, acre

> **Module** : `src/lib/mathAST/units/` > **Statut** : Phase 4 livrée — prêt pour commit
> **Date** : 2026-05-04
> **Contexte** : suite directe du commit `c366c5f7d` (unités SI dérivées). Le champ `components: ReadonlyMap<string, number>` sur `BaseUnitDef` débloque ces unités, qui étaient hors-scope du prompt impérial+affine.

## Objectif

Ajouter trois unités d'aire au catalogue :

| Symbole | Nom     | Définition exacte     | Contexte                                                                           |
| ------- | ------- | --------------------- | ---------------------------------------------------------------------------------- |
| `a`     | are     | 100 m²                | France, agriculture                                                                |
| `ha`    | hectare | 10 000 m² (= 100 are) | **Très important pédagogiquement** (immobilier, géographie, agriculture en France) |
| `acre`  | acre    | 4046,8564224 m²       | Anglo-saxon, complète l'impérial                                                   |

## Décisions Phase 0 (validées 2026-05-04)

### A. Architecture : `SPECIAL_UNITS` avec champ `components`

Toutes ajoutées à `SPECIAL_UNITS` (pas de préfixes SI). Le champ `components: Map([['m', 2]])` (introduit pour les dérivées SI) suffit pour exprimer la dimension m².

```typescript
['a', { symbol: 'a', baseSymbol: 'm', components: new Map([['m', 2]]), coefficient: 100, dimension: 'area', name: 'are' }],
['ha', { symbol: 'ha', baseSymbol: 'm', components: new Map([['m', 2]]), coefficient: 10000, dimension: 'area', name: 'hectare' }],
['acre', { symbol: 'acre', baseSymbol: 'm', components: new Map([['m', 2]]), coefficient: 4046.8564224, dimension: 'area', name: 'acre' }],
```

### B. Pas de préfixes SI

Cohérent avec Poincaré et la convention SPECIAL_UNITS. `kha`, `mha`, `kacre`, `da` (deca-are), `ca` (centiare), `kacre` → tous `null`. Les hectares sont déjà préfixés (hecto-are), donc combiner serait redondant et déroutant.

### C. Aliases français + pluriels

```typescript
['are', 'a'], ['ares', 'a'],
['hectare', 'ha'], ['hectares', 'ha'],
['acres', 'acre'],
```

### D. Dimension `'area'` ajoutée à l'union

Cohérent avec la présence de `'volume'` (et avec les nouvelles dimensions dérivées `'frequency'`, `'force'`, etc.). Cosmétique — `getDimensionalSignature` calcule `{length: 2}` à partir des composantes — mais utile pour la lisibilité du catalogue et pour de futurs filtres par dimension.

### E. Pas d'ambiguïté symbole `a` ↔ variable `a`

Le custom parser (`src/lib/mathAST/parser/custom/parser-pratt.ts:1640`, fonction `parseUnitPostfix`) utilise la syntaxe `expr[unit]`. Donc `5[a]` = 5 ares, `5a` = 5 × a (variable). Même règle que `m` (mètre) qui n'entre pas en collision avec une variable `m`. Le LaTeX parser utilise `\unit{a}` qui est aussi sans ambiguïté.

### F. Cas limites

| Cas                                    | Décision                                             |
| -------------------------------------- | ---------------------------------------------------- |
| `5 a + 3 ha`                           | OK : 5 + 30000 = 30005 a (mode 'first')              |
| `1 acre → ha`                          | OK : 1 × 4046,8564224 / 10 000 = 0,40468... ha       |
| `parse('a^2')`                         | OK : composantes m⁴, coefficient 10000               |
| `parse('ha/a')`                        | OK : sans dimension, coefficient 100 (m² s'annulent) |
| `parse('kha')`, `parse('mha')`         | `null` (préfixes refusés)                            |
| `parse('a × m')` (composé area·length) | OK : composantes {m: 3}, coefficient 100             |

## Plan d'exécution

| Phase | Description           | Agent         | Modèle | Statut                                                 |
| ----- | --------------------- | ------------- | ------ | ------------------------------------------------------ |
| 0     | Spec TDD              | —             | —      | ✅ Validée                                             |
| 1     | Tests d'abord         | direct        | opus   | ✅ 28 tests, 23 RED                                    |
| 2     | Implémentation        | direct        | opus   | ✅ 28/28 GREEN, 0 régression sur 11876 tests           |
| 3     | Code review           | code-reviewer | opus   | ✅ 5 findings, tous documentaires (ajouts de comments) |
| 4     | Quality checks finaux | direct        | sonnet | ✅ ESLint clean, check:incremental clean               |

## Critères d'acceptation

1. `parseUnit('a')`, `parseUnit('ha')`, `parseUnit('acre')` retournent des Unit avec composantes `Map([['m', 2]])` et coefficients corrects.
2. Conversions :
   - `1 ha = 10 000 m²` (coefficient ratio)
   - `1 acre = 4 046,8564224 m²`
   - `1 ha = 100 a`
   - `1 acre ≈ 0,40468 ha`
3. Aliases : `pouce` n'a pas de collision avec `pied`, donc `are → a`, `hectare → ha` doivent fonctionner via la chaîne d'aliases.
4. Préfixes refusés : `parseUnit('kha')`, `parseUnit('mha')`, `parseUnit('kacre')` → `null`.
5. Compatibilité dimensionnelle : `unitsAreCompatible(parse('a'), parse('m^2')) === true`.
6. Aucune régression sur les ~12000 tests existants.
7. ≥10 nouveaux tests dont au moins 3 cas limites.

## Hors scope

- Préfixes SI sur les unités d'aire (jamais demandé pédagogiquement).
- Reconnaissance automatique « best mode » (m² → ha) — pas pertinent pour V1, peut être ajouté plus tard via `recognizeArea` ou extension de `'best'`.
- Aliases anglais (`hectacre`, etc.) — simple à ajouter si demandé.

## Documents produits

- `docs/wip/units-area-progress.md` (ce document)

## Journal

- **2026-05-04** : Phase 0 validée. Architecture entièrement décidée (SPECIAL_UNITS + components, pas de préfixes, dimension 'area' ajoutée). Pas d'ambiguïté symbole `a` car le custom parser utilise `expr[unit]`.
- **2026-05-04** : Phase 1 livrée. Fichier `area.test.ts` créé (28 tests : catalogue, parseUnit, conversions, aliases, rejet préfixes, compatibilité dimensionnelle). 23 RED, 5 PASS naturels (rejets de préfixes inexistants, conversions via `parse('m^2')`).
- **2026-05-04** : Phase 2 livrée. Implémentation triviale grâce à l'architecture déjà en place :
  - `types.ts` : `'area'` ajouté à l'union `Dimension`.
  - `definitions.ts` : 3 entrées dans SPECIAL_UNITS (a, ha, acre) avec champ `components: Map([['m', 2]])` et 5 aliases (are, ares, hectare, hectares, acres).
  - 28/28 tests area passent. 11876/11876 tests mathAST passent (0 régression).
- **2026-05-04** : Phase 3 livrée. Code review → 5 findings, tous documentaires :
  - **#1** : note ajoutée expliquant que `getDimensionalSignature(unit('ha'))` retourne `{length: 2}` (cohérent avec components), pas `{area: 1}` — divergence avec `'volume'` qui est une vraie BASE_UNIT. `'area'` est de la metadata catalogue.
  - **#4** : TODO ajouté dans `UNIT_FAMILIES` pour la future famille area.
  - **#5** : commentaire ajouté dans le test `da` expliquant la dépendance subtile à `a` étant dans SPECIAL_UNITS.
  - Findings #2 et #3 ne nécessitaient aucune action (test précision OK, coefficient acre exact).
- **2026-05-04** : Phase 4 livrée. Quality checks : ESLint 0 erreur 0 warning. `pnpm check:incremental` : 9 erreurs pré-existantes hors fichiers modifiés.
