# Reconnaissance d'unités SI dérivées (Newton, Joule, Watt, ...)

> **Module** : `src/lib/mathAST/units/` > **Statut** : Phase 4 livrée — prêt pour commit
> **Date** : 2026-05-04
> **Lien Poincaré** : `extern/Upsilon/poincare/include/poincare/unit.h` (Representatives par dimension)

## Objectif

Quand le résultat d'un calcul a la signature dimensionnelle d'une unité SI nommée (Newton, Joule, Watt, Pascal, etc.), le système :

1. **Reconnaît** automatiquement et **affiche** avec le symbole canonique plutôt que sous forme composée `kg·m·s⁻²` (en mode `'best'` ou via flag explicite).
2. **Parse** correctement les symboles dérivés en entrée (`parseUnit('N')` → composante SI appropriée).

Bénéfice pédagogique : `5 kg × 3 m / (1 s)²` doit afficher `15 N` au lieu de `15 kg·m·s⁻²`. Cohérent avec Poincaré et l'usage scolaire/scientifique courant.

## Décisions Phase 0 (validées 2026-05-04)

### A. Catalogue — 9 unités SI dérivées

Toutes ajoutées à `SPECIAL_UNITS` avec un champ supplémentaire `components` (signature SI complète) :

| Symbole | Nom     | Composante (signature SI base) | Dimension         |
| ------- | ------- | ------------------------------ | ----------------- |
| `Hz`    | Hertz   | `s⁻¹`                          | fréquence         |
| `N`     | Newton  | `kg·m·s⁻²`                     | force             |
| `Pa`    | Pascal  | `kg·m⁻¹·s⁻²`                   | pression          |
| `J`     | Joule   | `kg·m²·s⁻²`                    | énergie           |
| `W`     | Watt    | `kg·m²·s⁻³`                    | puissance         |
| `C`     | Coulomb | `A·s`                          | charge électrique |
| `V`     | Volt    | `kg·m²·s⁻³·A⁻¹`                | tension           |
| `Ω`     | Ohm     | `kg·m²·s⁻³·A⁻²`                | résistance        |
| `F`     | Farad   | `kg⁻¹·m⁻²·s⁴·A²`               | capacité          |

**Hors scope cette phase** : T (Tesla), H (Henry), S (Siemens), Wb (Weber), lm (lumen), lx (lux), Bq (Becquerel), Gy (Gray), Sv (Sievert) — extensible plus tard si besoin.

**Note importante** : ces unités utilisent le `kg` comme base de masse, mais notre architecture utilise `g` comme baseSymbol. Les coefficients devront être normalisés en conséquence (`1 N = 1 kg·m·s⁻² = 1000 g·m·s⁻²`).

### B. Comportement de reconnaissance

**Intégration au mode `'best'`** : le mode `'best'` actuel choisit l'unité la plus lisible dans une `UNIT_FAMILIES`. Étendu pour : si la signature dimensionnelle du résultat correspond à une entrée du catalogue dérivé, préférer l'unité dérivée nommée.

**Flag explicite** : nouvelle option `recognizeDerived?: boolean` dans `EvalWithUnitsOptions` :

- `'best'` mode : `recognizeDerived` par défaut à `true` (cohérent avec l'esprit du mode)
- `'first'` / `'si'` mode : par défaut `false`. Utilisateur peut forcer à `true` pour reconnaître la dérivée du résultat.

### C. Direction

- **V1** : reconnaissance (composé → nommé) + parsing (`parseUnit('N')` valide).
- **Hors scope V1** : expansion (`N → kg·m·s⁻²`).

### D. Préfixes SI sur dérivées

Tous autorisés : `kN`, `mN`, `μN`, `mJ`, `μF`, `MΩ`, `kHz`, `kPa`, `kW`, etc. Implémentation : ajouter les unités dérivées à `BASE_UNITS` (qui acceptent les préfixes via `resolveUnit`) plutôt qu'à `SPECIAL_UNITS`.

**Attention** : `BASE_UNITS` actuel contient les unités de référence par dimension. Une dérivée n'est pas une "base" au sens strict. Solution proposée : nouveau registre `DERIVED_UNITS` traité comme `BASE_UNITS` par `resolveUnit` (accepte préfixes), mais sémantiquement distinct.

### E. Algorithme de reconnaissance

```typescript
// Étape 1 : normaliser le résultat en SI base (déjà fait par normalizeToBase)
const normalized = normalizeToBase(unit);

// Étape 2 : pour chaque dérivée du catalogue, comparer signatures
for (const derived of DERIVED_CATALOG) {
	if (signaturesMatch(normalized.components, derived.components)) {
		// Vérifier le coefficient : si normalized.coefficient ≈ derived.coefficient,
		// c'est une match exacte. Sinon on garde le facteur résiduel.
		return {
			components: new Map([[derived.symbol, 1]]),
			coefficient: normalized.coefficient / derived.coefficient
		};
	}
}
return null;
```

`signaturesMatch` compare les Map<string, number> — taille égale, mêmes clés, mêmes valeurs.

### F. Cas limites tranchés

| Cas                           | Décision                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `s⁻¹` (Hz vs Bq)              | **Hz** (Bq pas dans le catalogue V1)                                              |
| `kg·m²·s⁻²` (J vs N·m couple) | **J** (énergie plus fréquente ; couple reste explicite via `N·m`)                 |
| `W·h`                         | **Pas reconnu** comme dérivée (composé, non nommé en SI strict)                   |
| Préfixes SI                   | Autorisés sur dérivées (`kN`, `μF`, etc.)                                         |
| Coefficient résiduel          | Conservé : `5000 N` reconnu en `kN` reste `5 kN` (préfixe absorbe le coefficient) |

## Architecture (résumé)

### Modifications de `definitions.ts`

```typescript
// Nouveau registre, traité comme BASE_UNITS par resolveUnit (accepte préfixes SI)
export const DERIVED_UNITS: ReadonlyMap<string, DerivedUnitDef> = new Map([
	[
		'Hz',
		{
			symbol: 'Hz',
			components: new Map([['s', -1]]),
			coefficient: 1,
			dimension: 'frequency',
			name: 'hertz'
		}
	],
	[
		'N',
		{
			symbol: 'N',
			components: new Map([
				['g', 1],
				['m', 1],
				['s', -2]
			]),
			coefficient: 1000,
			dimension: 'force',
			name: 'newton'
		}
	]
	// ... 7 autres
]);
```

`coefficient: 1000` pour `N` parce que `1 N = 1 kg·m·s⁻² = 1000 g·m·s⁻²` (notre baseSymbol pour la masse est `g`).

### Modifications de `types.ts`

```typescript
interface DerivedUnitDef {
	readonly symbol: string;
	readonly components: ReadonlyMap<string, number>; // signature SI base
	readonly coefficient: number;
	readonly dimension: Dimension | DerivedDimension; // peut nécessiter extension
	readonly name?: string;
}

// Étendre Dimension pour inclure les dimensions dérivées :
type DerivedDimension =
	| 'frequency'
	| 'force'
	| 'pressure'
	| 'energy'
	| 'power'
	| 'electric_charge'
	| 'electric_potential'
	| 'electric_resistance'
	| 'electric_capacitance';
```

### Modifications de `resolveUnit` (`definitions.ts`)

Étape supplémentaire au début : essayer `DERIVED_UNITS` (avec préfixes SI) avant `SPECIAL_UNITS`. Le longest-prefix-match doit être maintenu pour éviter les ambiguïtés.

### Nouveau module ou ajout à `conversion.ts`

```typescript
// Reconnaît une signature SI base comme une dérivée nommée (ou null si pas de match)
export function recognizeDerivedUnit(u: Unit): Unit | null;
```

### Modifications de `evaluate-with-units.ts`

- Ajout du flag `recognizeDerived?: boolean` à `EvalWithUnitsOptions`.
- En mode `'best'` (et si `recognizeDerived !== false`) : appeler `recognizeDerivedUnit` après la conversion en SI base, avant la sélection de l'unité finale.
- En mode `'first'`/`'si'` : si `recognizeDerived === true`, idem.

## Plan d'exécution

| Phase | Description                                                            | Agent         | Modèle | Statut                                                                       |
| ----- | ---------------------------------------------------------------------- | ------------- | ------ | ---------------------------------------------------------------------------- |
| 0     | Spec TDD                                                               | —             | —      | ✅ Validée                                                                   |
| 1     | Tests d'abord                                                          | direct        | opus   | ✅ 42 tests, 40 RED                                                          |
| 2     | Implémentation complète (catalogue, parsing, recognize, eval pipeline) | direct        | opus   | ✅ 42/42 GREEN, 0 régression sur 11844 tests                                 |
| 3     | Code review                                                            | code-reviewer | opus   | ✅ 7 findings traitées (2 majors, 4 minors, 1 nit, +4 tests)                 |
| 4     | Quality checks finaux                                                  | direct        | sonnet | ✅ ESLint clean, check:incremental clean (9 erreurs pré-existantes filtrées) |

## Critères d'acceptation

1. `parseUnit('N')`, `parseUnit('J')`, `parseUnit('Hz')`, `parseUnit('Pa')`, `parseUnit('W')`, `parseUnit('C')`, `parseUnit('V')`, `parseUnit('Ω')`, `parseUnit('F')` retournent des Unit valides avec leur signature SI complète.
2. Préfixes SI fonctionnent : `parseUnit('kN').coefficient === 1e6` (1000 × 1000 pour N), `parseUnit('mJ').coefficient === 1`, `parseUnit('μF').coefficient === 1e-9`, etc. (à vérifier précisément avec la convention g vs kg).
3. `recognizeDerivedUnit` :
   - `Map([['s',-1]])` → `Unit('Hz')`
   - `Map([['g',1],['m',1],['s',-2]])` avec coefficient 1000 → `Unit('N')`
   - `Map([['g',1],['m',2],['s',-2]])` avec coefficient 1000 → `Unit('J')`
   - `Map([['m',1]])` → `null` (pas dérivée nommée, c'est m)
   - `Map([['kg',1],['m',3]])` → `null` (pas de match)
4. `evaluateWithUnits` mode `'best'` :
   - `5 kg × 3 m / (1 s)² = 15 N` (résultat unit.components.has('N'))
   - `2 N × 3 m = 6 J`
   - `100 W × 1 h` reste en `W·h` (pas de dérivée nommée)
5. Aucune régression sur les ~12000 tests existants
6. > 25 nouveaux tests dont au moins 5 cas limites (préfixes, conflits, pas-de-match)

## Hors scope V1 (futurs prompts)

- Expansion `N → kg·m·s⁻²`
- Catalogue étendu (T, H, S, Wb, lm, lx, Bq, Gy, Sv)
- Reconnaissance contextuelle pour distinguer `J` vs `N·m` (couple) — sémantique pas dans la signature
- Conversion entre unités composées et dérivées dans le pipeline `'first'` mode

## Documents produits

- `docs/wip/units-derived-progress.md` (ce document)

## Journal

- **2026-05-04** : Phase 0 validée. Décisions verrouillées sur 7 questions ouvertes.
- **2026-05-04** : Phase 1 livrée. Fichier `derived.test.ts` créé (42 tests : catalogue, parseUnit, préfixes SI, recognizeDerivedUnit, intégration `'best'` mode, flag `recognizeDerived`). 40 tests échouent (RED), 2 passent (cas null naturels comme `recognizeDerivedUnit(unit('m'))` qui appelle une fonction inexistante mais `unit('m')` retourne quelque chose).
- **2026-05-04** : Phase 2 livrée. Implémentation complète :
  - `types.ts` : `Dimension` étendu (frequency, force, pressure, energy, power, electric_charge, electric_potential, electric_resistance, electric_capacitance) + champ `components?: ReadonlyMap<string, number>` sur `BaseUnitDef`.
  - `definitions.ts` : nouveau registre `DERIVED_UNITS` avec 9 unités SI dérivées (Hz, N, Pa, J, W, C, V, Ω, F). Modification de `resolveUnit` pour gérer le cas dérivé direct + préfixes (`kN`, `mJ`, `μF`, `MΩ`, `kHz`, `kPa`, `mW`, etc.).
  - `factory.ts` : `unit()` utilise `resolved.components` si présent, sinon fallback single-component.
  - `parser.ts` : `parse()` étend les composants par `term.exponent` quand un terme dérivé a un exposant.
  - `conversion.ts` : nouvelle fonction `recognizeDerivedUnit(u): Unit | null` qui retourne le Unit canonique de la dérivée (avec coefficient catalogue) si la signature SI matche.
  - `eval/types.ts` : option `recognizeDerived?: boolean` ajoutée à `EvalWithUnitsOptions`.
  - `evaluate-with-units.ts` :
    - `normalizeAllUnitsToBase(node)` : transforme chaque UnitNode à sa base SI individuelle (coefficient 1) — nécessaire pour cible composite en mode `'best'`.
    - `maybeRecognizeDerived(value, unit, enabled)` : applique la reconnaissance et rescale la valeur (newValue = oldValue × oldCoef / canonicalCoef).
    - Mode `'best'` : recognizeDerived par défaut `true`, utilise `normalizeAllUnitsToBase` puis `maybeRecognizeDerived` avant `selectBestUnit`.
    - Modes `'first'`/`'si'` : opt-in via `recognizeDerived: true`, post-passe optionnelle.
  - 2 tests pré-existants (`MHz`) corrigés : assertaient `null` parce que Hz n'existait pas, maintenant assertent `mega-Hertz`.
  - 42/42 tests dérivés passent. 11844/11844 tests mathAST passent (0 régression).
- **2026-05-04** : Phase 3 livrée. Code review par `code-reviewer` agent → 7 findings :
  - **Major #1** : `DEFAULT_EVAL_WITH_UNITS_OPTIONS` ne contenait pas `recognizeDerived` alors que le type `Required<Omit<...>>` l'exigeait. Erreur TypeScript réelle. Fixé en ajoutant `recognizeDerived` à la liste `Omit`.
  - **Major #2** : `unitWithPower('N', 2)` retournait `Map([['g', 2]])` au lieu de `Map([['g',2],['m',2],['s',-4]])` — la fonction n'utilisait pas `resolved.components`. Fixé pour utiliser le même pattern que `unit()` factory et le parser.
  - **Minor #4** : JSDoc de `recognizeDerivedUnit` clarifié (matching sur components only, pas sur coefficient ; exemple corrigé pour utiliser g-base au lieu de kg).
  - **Minor #5** : commentaire « Precondition: no affine units » ajouté à `normalizeAllUnitsToBase`.
  - **Minor #6** : commentaire `TODO(V2)` pour la prefix-reselection à l'intérieur de la famille dérivée (5e6 N → 5 MN).
  - **Minor #7** : note de duplication ajoutée sur `componentsMatch` (équivalent de `unitsEquivalent` dans operations.ts, contrainte d'import circulaire).
  - **Nit #3** : 9 casts `as Dimension` redondants supprimés (les littéraux sont déjà dans le union après extension).
  - **Tests ajoutés** : `unitWithPower('N', 2)` (couvre fix #2), `parseUnit('dC')` (deci-Coulomb), idempotence de `recognizeDerivedUnit`, mode `'first'` + `recognizeDerived: true` avec value 5 et unit s⁻¹ → 5 Hz.
  - 46/46 tests dérivés. 11848/11848 tests mathAST (0 régression).
- **2026-05-04** : Phase 4 livrée. Quality checks :
  - ESLint sur les 10 fichiers modifiés : 0 erreur, 0 warning.
  - `pnpm check:incremental` : 9 erreurs pré-existantes (slides/demo + extern/), 0 erreur dans les fichiers modifiés. Le script filtre correctement et exit 0.
  - Pas de fichier `.svelte` modifié → autofixer non requis.
