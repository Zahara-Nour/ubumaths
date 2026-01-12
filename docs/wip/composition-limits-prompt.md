# Prompt : Implémentation des limites de fonctions composées

## Contexte

Le module `src/lib/mathAST/limits/` gère l'évaluation symbolique des limites. Il supporte déjà :

- Limites connues (sin(x)/x, etc.)
- Substitution directe
- Règle de L'Hôpital (0/0, ∞/∞)
- Simplifications algébriques (factorisation, rationalisation)
- Théorème des gendarmes
- Analyse unilatérale avec validation de domaine

## Problème

Les **limites de fonctions composées vers l'infini** ne sont pas implémentées. Le type `LimitRule = 'composition'` existe mais la logique de propagation des limites infinies à travers les compositions est manquante.

## Cas non supportés (documentés dans les tests)

```typescript
// Fichier : src/lib/mathAST/limits/__tests__/edge-cases.test.ts

// 1. Composition vers -∞
it.skip('ln(x) at x=0 right-sided is -∞'); // ln(0⁺) → -∞
it.skip('ln(x-3) at x=3 right-sided is -∞'); // ln((3-3)⁺) → -∞
it.skip('ln(sqrt(x)) at x=0 right-sided is -∞'); // ln(sqrt(0⁺)) = ln(0⁺) → -∞

// 2. Division par f(x)→0 donnant ±∞
it.skip('1/sqrt(x) at x=0 right-sided is +∞'); // 1/0⁺ → +∞
it.skip('1/ln(x) at x=1 right-sided is +∞'); // ln(1⁺)→0⁺, donc 1/0⁺ → +∞
it.skip('1/ln(x) at x=1 left-sided is -∞'); // ln(1⁻)→0⁻, donc 1/0⁻ → -∞

// 3. Puissances paires (même signe des deux côtés)
it.skip('1/x² at x=0 both-sided is +∞'); // 1/(0±)² = 1/0⁺ → +∞
it.skip('-1/x² at x=0 both-sided is -∞');

// 4. Limites simples à l'infini
it.skip('x at x→+∞ is +∞');
it.skip('e^x at x→+∞ is +∞');
it.skip('ln(x) at x→+∞ is +∞');

// 5. Négation de limites infinies
it.skip('-1/x at x=0 right-sided is -∞'); // -(+∞) = -∞
it.skip('-1/x at x=0 left-sided is +∞'); // -(-∞) = +∞
```

## Fichiers pertinents à lire

1. **Types** : `src/lib/mathAST/limits/types.ts`

   - `LimitRule` inclut `'composition'`
   - `LimitResult` structure de retour

2. **Évaluation principale** : `src/lib/mathAST/limits/evaluate.ts`

   - `evaluateLimit()` - point d'entrée
   - `evaluateLimitInternal()` - logique interne
   - Ordre des stratégies (ligne ~170-180)

3. **Limites connues** : `src/lib/mathAST/limits/known-limits.ts`

   - `KNOWN_LIMITS` - table des limites fondamentales
   - Peut être étendu avec des patterns de composition

4. **Formes indéterminées** : `src/lib/mathAST/limits/indeterminate.ts`

   - `detectIndeterminateForm()` - détecte 0/0, ∞/∞, etc.
   - `classifyLimitValue()` - classifie une valeur (zero, finite, infinite)

5. **Tests edge cases** : `src/lib/mathAST/limits/__tests__/edge-cases.test.ts`
   - 39 tests skipped documentant le comportement attendu

## Approche suggérée

### Phase 1 : Limites de fonctions élémentaires à l'infini

Ajouter dans `known-limits.ts` ou créer un nouveau module `infinity-limits.ts` :

```typescript
// Comportement des fonctions élémentaires
const ELEMENTARY_LIMITS_AT_INFINITY = {
	// f(x) quand x → +∞
	exp: { atPosInf: '+∞', atNegInf: '0' },
	ln: { atPosInf: '+∞', at0Plus: '-∞' },
	sqrt: { atPosInf: '+∞', at0Plus: '0' }
	// polynômes : signe du terme dominant
	// ...
};
```

### Phase 2 : Propagation des limites dans les compositions

Créer `composition.ts` avec :

```typescript
/**
 * Évalue la limite d'une composition f(g(x)) quand x → a
 *
 * Stratégie :
 * 1. Calculer lim(g(x)) quand x → a = L
 * 2. Si L est fini : retourner lim(f(y)) quand y → L
 * 3. Si L est ±∞ : retourner lim(f(y)) quand y → ±∞
 * 4. Gérer les cas où g(x) → 0± (signe important pour ln, 1/x, etc.)
 */
function evaluateCompositionLimit(
	f: MathNode, // fonction externe
	g: MathNode, // fonction interne
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): LimitResult | null;
```

### Phase 3 : Division par fonction tendant vers 0

```typescript
/**
 * Cas : 1/f(x) quand f(x) → 0
 *
 * Besoin de :
 * 1. Détecter que f(x) → 0
 * 2. Déterminer le signe de f(x) près du point (via analyzeSign)
 * 3. Retourner +∞ ou -∞ selon le signe
 */
function evaluateDivisionByZero(
	numerator: MathNode,
	denominator: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): LimitResult | null;
```

## Workflow TDD

1. **Dé-skipper les tests un par un** en commençant par les plus simples
2. **Implémenter** la fonctionnalité minimale pour faire passer le test
3. **Refactorer** si nécessaire
4. **Code review** après chaque groupe de tests

### Ordre suggéré

1. `x at x→+∞ is +∞` (polynôme simple)
2. `ln(x) at x=0⁺ is -∞` (fonction élémentaire)
3. `1/sqrt(x) at x=0⁺ is +∞` (division par 0⁺)
4. `1/x² at x=0 both-sided is +∞` (puissance paire)
5. `-1/x at x=0⁺ is -∞` (négation)
6. `1/ln(x) at x=1± is ±∞` (composition complète)

## Commandes utiles

```bash
# Lancer les tests du module limits
pnpm test:server src/lib/mathAST/limits/

# Lancer uniquement edge-cases
pnpm test:server src/lib/mathAST/limits/__tests__/edge-cases.test.ts

# Vérifier un test spécifique (retirer .skip d'abord)
pnpm test:server src/lib/mathAST/limits/__tests__/edge-cases.test.ts -t "ln(x) at x=0"
```

## Critères de succès

- [ ] Tests `it.skip` convertis en `it` et passants
- [ ] Pas de régression sur les 195 tests existants
- [ ] Code review positif
- [ ] Documentation mise à jour dans `docs/ref/mathAST/limits.md`
