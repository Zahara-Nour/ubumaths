# Prompt : ajout d'unités impériales et de conversions affines (Celsius/Fahrenheit) au module `mathAST/units`

## Contexte

Le module `src/lib/mathAST/units/` gère un catalogue d'unités physiques (longueur, masse, temps, etc.) plus une analyse dimensionnelle séparée dans `src/lib/mathAST/dimensional/`. L'évaluation avec unités passe par `src/lib/mathAST/eval/evaluate-with-units.ts` (pipeline découplé du `normalize`/`simplify` algébrique — `normalize.ts:1758-1761` strippe les unités).

Une analyse comparative avec le moteur Poincaré (NumWorks/Upsilon, `extern/Upsilon/poincare/`) a identifié deux trous fonctionnels dans le catalogue mathAST :

1. **Aucune unité impériale** (`foot`, `pound`, `inch`, `mile`, `gallon`, ...) — vérifié par grep `foot|pound|inch|mile|fahrenheit` dans `units/definitions.ts` qui retourne vide
2. **Aucune conversion affine** — la structure `Unit` (`units/types.ts:199-252`) n'a qu'un champ `coefficient: number` (multiplicatif) ; impossible de représenter Celsius (offset +273.15 K vers Kelvin) ou Fahrenheit. Seul le Kelvin existe vraiment

Bénéfice pédagogique direct : exercices sur la conversion Celsius/Fahrenheit, exercices contextualisés sur des unités anglo-saxonnes (cours de physique américain, contextes maritimes/aéronautiques).

## Inspiration Poincaré (référence)

Poincaré gère les unités impériales via la préférence `UnitFormat::Imperial` (`extern/Upsilon/poincare/include/poincare/expression_node.h`, `ReductionContext`). Catalogue impérial :

- Distance : `in` (0.0254 m), `ft` (0.3048 m), `yd`, `mi` (`unit.h:161-175, unit.cpp:558-567`)
- Masse : `oz` (≈28.35 g), `lb` (≈453.59 g), `shtn` (short ton), `lgtn` (long ton) (`unit.h:177-192`)
- Volume : `tsp`, `tbsp`, `floz`, `cup`, `pt`, `qt`, `gal` (`unit.h:436-449`)
- Surface : `acre` (`unit.h:421-434`)

Conversion affine pour la température (`unit.cpp:493-506`) :

```cpp
double TemperatureRepresentative::ConvertTemperatures(value, source, target) {
  constexpr double origin[] = {0, k_celsiusOrigin, k_fahrenheitOrigin};
  // k_celsiusOrigin = 273.15, k_fahrenheitOrigin = 459.67
  double sourceOrigin = origin[source_index];
  double targetOrigin = origin[target_index];
  return (value + sourceOrigin) * source->ratio() / target->ratio() - targetOrigin;
}
```

Poincaré a fait le choix d'une **fonction dédiée** dans `TemperatureRepresentative` plutôt qu'un champ `offset` générique sur toutes les unités. Défendable : seules les températures ont besoin d'offsets dans la pratique. À discuter en Phase 0.

## Architecture mathAST existante (à respecter)

### Structure `Unit` actuelle

`src/lib/mathAST/units/types.ts:199-252` :

```typescript
interface Unit {
	readonly components: ReadonlyMap<string, number>; // baseSymbol → exposant
	readonly coefficient: number; // facteur d'échelle
	readonly original?: string; // input utilisateur préservé
}
```

### Pipeline conversion

`src/lib/mathAST/units/conversion.ts:74-88` `getConversionFactor(from, to)` :

```typescript
factor = from.coefficient / to.coefficient
newValue = originalValue × factor
```

**Purement multiplicatif aujourd'hui — c'est le point qui doit évoluer pour le support affine.**

### Catalogue actuel

`src/lib/mathAST/units/definitions.ts` :

- 12 préfixes SI (lignes 40-53)
- 10 unités de base (lignes 77-88)
- 18 unités spéciales (lignes 131-269)
- 19 alias (lignes 295-333)
- 7 familles pour "best unit" (lignes 463-513)

### Point d'entrée d'évaluation

`src/lib/mathAST/eval/evaluate-with-units.ts:385-528` orchestre l'évaluation avec unités. Le mode `'first'/'si'/'best'` choisit l'unité finale.

### Tests existants

`src/lib/mathAST/units/__tests__/` : tests pour parser, conversion, operations, etc.

## Phase 0 — Spécification TDD (à valider avec l'utilisateur AVANT toute écriture de code)

### Comportements à proposer

#### A. Catalogue impérial

**Distance** :

- `in` (inch) : 0.0254 m exact
- `ft` (foot) : 0.3048 m exact
- `yd` (yard) : 0.9144 m exact
- `mi` (mile) : 1609.344 m exact

**Masse** :

- `oz` (ounce avoirdupois) : 28.349523125 g exact
- `lb` (pound avoirdupois) : 453.59237 g exact

**Volume** : à confirmer — version US ou UK ? Les deux ?

- US gallon (`gal`) : 3.785411784 L exact
- UK gallon (`gal_uk` ?) : 4.54609 L exact
- US fl oz, cup, pt, qt
- **Question** : prendre US par défaut (convention scientifique américaine) ou ajouter les deux variantes ?

**Surface** :

- `acre` : 4046.8564224 m² exact

**Aliases** :

- `pouce` → `in`, `pied` → `ft`, `mile` → `mi` (français → anglais)

#### B. Conversions affines (températures)

**Décision majeure** : champ `offset` générique sur `Unit`, ou cas particulier hardcodé pour la température ?

- **Option 1** (générique) : ajouter `readonly offset?: number` à `Unit`. Conversion devient `(value × from.coefficient + from.offset - to.offset) / to.coefficient`. Plus extensible mais ouvre la porte à des combinaisons absurdes (`5°C × 3` ne fait aucun sens physique).
- **Option 2** (Poincaré) : seules les températures ont des offsets. On crée une famille `'temperature'` spéciale avec une fonction `convertTemperature(value, from, to)`. Plus restrictif mais plus sûr.

**Recommandation initiale** : Option 2 avec sémantique stricte — `°C` et `°F` peuvent UNIQUEMENT être convertis vers/depuis K, jamais composés (`°C × m` → erreur `INVALID_AFFINE_COMPOSITION`).

#### C. Cas limites à clarifier

- `0°C → K` : doit donner `273.15 K` (et non `0 K`)
- `100°C - 50°C` : différence de 50, mais l'unité de la différence est-elle `°C` ou `K` ? (En Poincaré, `5°C - 3°C` est `Undefined` car vérification stricte d'identité ; mais on pourrait être plus permissif). **À trancher**.
- `5°C × 2` : doit-il être valide (= 10°C ? ou = 546.3 K ?) ou refusé ?
- Conversion impérial→métrique implicite : refusée (comme aujourd'hui) ou autorisée selon le mode ?
- Préfixes SI sur unités impériales : `kft` (kilo-foot) ? **À refuser** (cohérent avec Poincaré).

#### D. Mode locale `metric`/`imperial`

Faut-il ajouter un `unitFormat: 'metric' | 'imperial'` dans `EvalWithUnitsOptions` (`eval/types.ts:304`) qui pilote le mode `'best'` ?

- En mode `metric` : `5 ft × 12 ft` → `1.67 m²` (best unit en m²)
- En mode `imperial` : `5 ft × 12 ft` → `60 ft²` (garde impérial)

**Recommandation** : oui, par cohérence avec Poincaré (`UnitFormat::Metric` vs `Imperial`).

### Format à présenter à l'utilisateur

```markdown
## Fonctionnalité : ajout d'unités impériales et conversions affines

### Comportements proposés

#### A. Catalogue impérial (10 unités à ajouter)

1. [Liste comme ci-dessus]
   ...

#### B. Conversions affines

Option recommandée : Option 2 (cas particulier température).

- 0°C → 273.15 K ✓
- Composition refusée : 5°C × 2 → ERREUR

#### C. Cas limites

- 100°C - 50°C → ? [à trancher]
- 5°C × 2 → ? [à trancher]
- kft (kilo-foot) → refusé

#### D. Mode locale

Ajouter `unitFormat?: 'metric' | 'imperial'` à EvalWithUnitsOptions.

### Questions ouvertes

- US gallon vs UK gallon : choisir un défaut ou les deux ?
- Différence de températures : °C ou K ?
- Préfixes SI sur impérial : confirmé refusés ?
```

**Attendre validation utilisateur avant de passer à la phase 1.**

## Phases d'implémentation

### Phase 1 — Tests d'abord

**Fichiers à créer** :

- `src/lib/mathAST/units/__tests__/imperial.test.ts`
- `src/lib/mathAST/units/__tests__/affine.test.ts`

**Cas de test minimaux** :

```typescript
describe('imperial units', () => {
  it('parses ft as length unit', () => {
    const u = parseUnit('ft')!;
    expect(u.components.get('m')).toBe(1);
    expect(u.coefficient).toBeCloseTo(0.3048);
  });

  it('converts ft to m exactly', () => {
    const factor = getConversionFactor(parseUnit('ft')!, parseUnit('m')!)!;
    expect(factor).toBeCloseTo(0.3048);
  });

  it('converts mi to km', () => { ... });

  it('rejects kft (no SI prefixes on imperial)', () => {
    expect(parseUnit('kft')).toBeNull();
  });

  it('5 lb + 3 oz → 5.1875 lb (or 2353.825 g)', () => {
    const result = evaluateWithUnits(parseLatex('5 lb + 3 oz'), { conversionMode: 'first' });
    expect(result.value).toBeCloseTo(5.1875);
    expect(formatUnit(result.unit)).toBe('lb');
  });
});

describe('affine temperature conversions', () => {
  it('converts 0°C to 273.15 K', () => { ... });
  it('converts 100°C to 212°F', () => { ... });
  it('converts -40°C to -40°F (sanity)', () => { ... });
  it('rejects °C composition: 5°C × 2', () => {
    expect(() => evaluateWithUnits(parseLatex('5°C × 2'), {})).toThrow(/AFFINE/);
  });
  it('handles 100°C - 50°C correctly', () => { ... }); // selon décision phase 0
});
```

### Phase 2 — Implémentation catalogue impérial

**Agent** : `Explore` puis travail direct (modification simple de `definitions.ts`).
**Modèle** : `claude-sonnet-4-6` suffit (édition ciblée).

**Fichiers à modifier** :

1. `src/lib/mathAST/units/definitions.ts` — ajouter dans `SPECIAL_UNITS` :

   ```typescript
   in: { baseSymbol: 'm', coefficient: 0.0254, dimension: 'length', name: 'inch' },
   ft: { baseSymbol: 'm', coefficient: 0.3048, dimension: 'length', name: 'foot' },
   yd: { baseSymbol: 'm', coefficient: 0.9144, dimension: 'length', name: 'yard' },
   mi: { baseSymbol: 'm', coefficient: 1609.344, dimension: 'length', name: 'mile' },
   oz: { baseSymbol: 'g', coefficient: 28.349523125, dimension: 'mass', name: 'ounce' },
   lb: { baseSymbol: 'g', coefficient: 453.59237, dimension: 'mass', name: 'pound' },
   gal: { baseSymbol: 'L', coefficient: 3.785411784, dimension: 'volume', name: 'gallon' },
   acre: { baseSymbol: 'm', coefficient: 4046.8564224, dimension: 'area', name: 'acre' }, // → m^2
   ```

2. Ajouter aliases français :

   ```typescript
   pouce: 'in', pied: 'ft', livre: 'lb', mile: 'mi'
   ```

3. Étendre les familles `UNIT_FAMILIES` (lignes 463-513) pour inclure les variantes impériales si mode `imperial` est actif.

4. Bloquer les préfixes SI sur unités impériales — modifier `resolveUnit()` (`definitions.ts:376-440`) pour refuser `kft`, `Mlb`, etc.

### Phase 3 — Implémentation conversions affines (température)

**Agent** : `supabase-expert` non, plutôt travail direct ou `typescript-expert` si types complexes.
**Modèle** : `claude-opus-4-7` recommandé pour les choix de design subtils.

**Fichiers à modifier** :

1. `src/lib/mathAST/units/types.ts` — soit ajouter `readonly offset?: number` à `Unit` (Option 1), soit créer un type séparé `AffineUnit` (Option 2). Décision phase 0.

2. `src/lib/mathAST/units/definitions.ts` — ajouter :

   ```typescript
   '°C': { baseSymbol: 'K', coefficient: 1, offset: 273.15, dimension: 'temperature', name: 'celsius' },
   '°F': { baseSymbol: 'K', coefficient: 5/9, offset: 459.67, dimension: 'temperature', name: 'fahrenheit' },
   ```

   (formulation à adapter selon Option 1/2)

3. `src/lib/mathAST/units/conversion.ts` — étendre `getConversionFactor` (lignes 74-88) ou créer `convertWithAffine(value, from, to)` :

   ```typescript
   export function convertAffine(value: number, from: Unit, to: Unit): number {
   	// (value + from.offset) * from.coefficient / to.coefficient - to.offset
   }
   ```

4. `src/lib/mathAST/units/operations.ts` — bloquer la composition sur les unités affines :

   ```typescript
   function isAffine(u: Unit): boolean {
   	return u.offset !== undefined && u.offset !== 0;
   }

   export function multiply(a: Unit, b: Unit): Unit {
   	if (isAffine(a) || isAffine(b)) {
   		throw new Error('AFFINE_COMPOSITION_FORBIDDEN');
   	}
   	// ... existing logic
   }
   ```

5. `src/lib/mathAST/eval/evaluate-with-units.ts:385-528` — gérer le cas affine dans le pipeline (probablement dans `transformToTargetUnit`).

6. `src/lib/mathAST/dimensional/analyzer.ts` — vérifier que les unités affines sont gérées correctement dans l'analyse dimensionnelle.

### Phase 4 — Mode locale (optionnel, post-validation)

**Fichiers à modifier** :

1. `src/lib/mathAST/eval/types.ts` — ajouter à `EvalWithUnitsOptions` :

   ```typescript
   readonly unitFormat?: 'metric' | 'imperial';
   ```

2. `src/lib/mathAST/eval/evaluate-with-units.ts` — propager dans `selectBestUnit()` pour qu'en mode `imperial` la sélection préfère les unités impériales.

### Phase 5 — Code review + quality checks

**Agent** : `code-reviewer` proactif après chaque phase.
**Modèle** : `claude-opus-4-7`.

À la FIN du plan uniquement (pas pendant les phases) :

- `npx eslint <fichiers modifiés>`
- `pnpm check:incremental` (TypeScript + Svelte, ~30s)

**Pas de fichier .svelte modifié → pas d'autofixer nécessaire.**

## Checklist de validation (par phase)

- [ ] Phase 0 validée par l'utilisateur (comportements + design Option 1/2)
- [ ] Tests écrits et échouent avant implémentation
- [ ] Phase 2 : tous les tests impériaux passent
- [ ] Phase 3 : tous les tests affines passent
- [ ] Aucune régression sur les ~12000 tests existants `mathAST + math + geometry-core/compute`
- [ ] Code review effectué
- [ ] Documentation de progression écrite (`docs/wip/units-imperial-affine-progress.md`)
- [ ] Commit créé via `commit-manager` agent (multi-fichiers complexes)
- [ ] **NE PAS ajouter `Co-Authored-By: Claude`** dans le message de commit

## Documents à produire

- `docs/wip/units-imperial-affine-progress.md` — état d'avancement, décisions prises (notamment Option 1 vs 2), prochaines étapes, fichiers modifiés. À mettre à jour après chaque phase.

## Critères d'acceptation

1. **Catalogue impérial** : `parseUnit('ft')`, `parseUnit('mi')`, `parseUnit('lb')`, etc. retournent des unités valides
2. **Conversion impérial↔métrique** : `1 mi = 1.609344 km`, `1 lb = 453.59237 g`, `1 gal = 3.785411784 L` (à 1e-9 près)
3. **Conversions affines** : `0°C = 273.15 K`, `100°C = 212°F`, `-40°C = -40°F`
4. **Composition affine refusée** : `5°C × 2`, `°C + °F`, `°C × m` → erreurs explicites typées
5. **Cohérence dimensionnelle préservée** : `5 lb + 3 m` → `INCOMPATIBLE_UNITS`
6. **Aucune régression** : tous les tests existants passent
7. **Préfixes SI refusés sur impérial** : `parseUnit('kft')` retourne `null`
8. **Tests** : >30 nouveaux tests dont au moins 5 pour les cas limites affines

## Hors scope (à NE PAS faire dans ce prompt)

- Reconnaissance d'unités dérivées (`kg·m·s⁻² → N`) — c'est le point #2 de l'analyse comparative, mérite son propre prompt
- Intégration dans `simplify()` algébrique — point #4, refactor important
- Variables typées dimensionnellement (déjà supporté via `DimensionalContext.variables`)
- Précision exacte (BigInt rationnel) sur les coefficients — `number` reste suffisant ici (cohérent avec Poincaré qui est en `double`)

## Pré-requis pour démarrer

Lire dans l'ordre :

1. `CLAUDE.md` (racine du projet) — règles essentielles, TDD obligatoire, planning policy
2. `docs/ref/tests/tdd.md` — workflow TDD collaboratif
3. `src/lib/mathAST/units/types.ts` — comprendre le type `Unit`
4. `src/lib/mathAST/units/definitions.ts` — comprendre comment les unités sont déclarées
5. `src/lib/mathAST/units/conversion.ts` — comprendre la conversion actuelle
6. `extern/Upsilon/poincare/include/poincare/unit.h:34-260` — voir comment Poincaré modélise (référence d'inspiration)
7. `extern/Upsilon/poincare/src/unit.cpp:493-506` — fonction `ConvertTemperatures` (modèle pour Option 2)

## Estimation

- Phase 0 (spec) : 30 min de discussion utilisateur
- Phase 1 (tests) : 1h
- Phase 2 (impérial) : 1-2h
- Phase 3 (affine) : 2-3h (selon Option 1/2)
- Phase 4 (mode locale) : 1h
- Phase 5 (review + checks + commit) : 1h

**Total : ~6-8h** sur une session dédiée.
