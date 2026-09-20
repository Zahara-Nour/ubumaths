/**
 * MathAST Forme normale — arcs commensurables (étape 2 du décideur)
 *
 * L'étape 1 rend équivalentes les expressions d'un **même** argument :
 * `tan(u)` s'écrit `sin(u)/cos(u)`, puis Pythagore donne à tout polynôme
 * trigonométrique l'écriture unique `A(cos u) + sin(u)·B(cos u)`. Mais les
 * arguments restaient des atomes indépendants : `sin(2x)` et `2 sin(x) cos(x)`
 * n'avaient aucune raison de se rencontrer.
 *
 * Ce module ramène tous les arcs **commensurables** au même générateur. Le
 * générateur est **absolu**, pas relatif à l'expression : c'est l'atome de
 * coefficient 1. Chercher le plus petit angle commun à chaque expression prise
 * séparément laisserait `sin(2x)` sur `2x` et `2 sin(x) cos(x)` sur `x`, et les
 * deux resteraient étrangers — exactement ce qu'on veut corriger.
 *
 * Trois gestes, sur l'argument de chaque `sin`, `cos`, `sinh`, `cosh` (les
 * autres fonctions ont déjà été éliminées par `expandTrigDefinitions`) :
 *
 * 1. **décomposer** l'argument en `Σ kᵢ·mᵢ + c`. La forme normale d'un argument
 *    EST un polynôme : ses termes donnent la décomposition gratuitement, `kᵢ`
 *    étant le coefficient et `mᵢ` le monôme. Un monôme composé (`x·y`) est un
 *    atome d'angle comme un autre ;
 * 2. **développer les sommes** par les formules d'addition ;
 * 3. **développer les multiples** par Tchebychev : `cos(ku) = T_k(cos u)` et
 *    `sin(ku) = sin(u)·U_{k−1}(cos u)`.
 *
 * Les récurrences hyperboliques sont **les mêmes**, sur la variable `cosh u` :
 * `cosh(x) = cos(ix)` et `sin(ix) = i·sinh(x)` donnent `cosh(ku) = T_k(cosh u)`
 * et `sinh(ku) = sinh(u)·U_{k−1}(cosh u)` — vérifié numériquement sur k ≤ 20.
 * Le signe qui change est celui de la formule d'addition du cosinus :
 * `cos(a+b) = cos a cos b − sin a sin b` contre
 * `cosh(a+b) = cosh a cosh b + sinh a sinh b`.
 *
 * Quatre limites **assumées**, toutes des faux négatifs — jamais un faux
 * positif :
 * - un coefficient **non entier** (`sin(x/2)`) laisse le nœud tel quel : le
 *   traiter demanderait de prendre `x/2` pour générateur, donc un générateur
 *   qui dépend de l'expression ;
 * - un **atome non monomial** : `sin(2x/y)` reste opaque bien que son
 *   coefficient soit entier, parce que `x/y` ne se dénormalise pas en monôme.
 *   Mesuré : `sin(2x/y) ≢ 2 sin(x/y) cos(x/y)`, là où `sin(2x)` marche ;
 * - au-delà du **plafond**, l'arc reste opaque plutôt que de produire un
 *   polynôme de degré arbitraire ;
 * - la réduction ne traverse pas l'**argument d'une autre fonction** :
 *   `ln(sin²x) ≢ ln(1−cos²x)`.
 *
 * Comme à l'étape 1 : **réduire pour comparer, pas pour écrire**. Ce module
 * vit sur le chemin de `equivalenceForm` seul, jamais dans `preprocess` ni
 * dans `normalize` — la forme affichée ne bouge pas d'un caractère.
 */

import type { AbortChecker } from '../../common/abort';
import { checkAbort } from '../../common/abort';
import { add, func, multiply, number, opposite, power, subtract, superscript } from '../../factory';
import {
	isAddition,
	isDelimiter,
	isDivision,
	isFunction,
	isMultiplication,
	isNumber,
	isOpposite,
	isPositive,
	isSubtraction,
	isSuperscript
} from '../../guards';
import { findFirst, mapNode } from '../../transforms';
import type { MathNode } from '../../types';
import { denormalizeMonomial, denormalizeTerm } from '../denormalize';
import type { AlgebraicCoefficient, NormalForm, NormalTerm } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Ce dont le module a besoin de l'extérieur.
 *
 * `normalizeArgument` est injectée plutôt qu'importée : `normalize.ts` importe
 * déjà `rules/index.ts`, et l'importer en retour ferait un cycle de modules.
 */
export interface ArcExpansionContext {
	/** Met un argument sous forme normale — c'est elle qui donne la décomposition. */
	readonly normalizeArgument: (node: MathNode) => NormalForm;
	/** Interruption coopérative, appelée dans chaque boucle de développement. */
	readonly abortChecker?: AbortChecker;
}

/** Un terme `k·m` de l'argument : `k` entier, `m` atome d'angle. */
interface AngleComponent {
	readonly multiple: bigint;
	readonly atom: MathNode;
}

/** `Σ kᵢ·mᵢ + c`, la partie constante mise à part. */
interface AngleDecomposition {
	readonly components: readonly AngleComponent[];
	/** `null` quand l'argument n'a pas de partie constante. */
	readonly constantPart: MathNode | null;
}

/** Le couple `(sin A, cos A)` — ou `(sinh A, cosh A)` — d'un angle `A`. */
interface TrigPair {
	readonly sine: MathNode;
	readonly cosine: MathNode;
}

/** La famille à laquelle appartient la fonction développée. */
interface TrigFamily {
	readonly sineName: string;
	readonly cosineName: string;
	/**
	 * Vrai pour `sinh`/`cosh`. Ne change QUE la formule d'addition du cosinus
	 * (`+ sinh·sinh` au lieu de `− sin·sin`) ; les récurrences de Tchebychev
	 * sont identiques.
	 */
	readonly hyperbolic: boolean;
}

// =============================================================================
// Constantes
// =============================================================================

const TRIGONOMETRIC_FAMILY: TrigFamily = { sineName: 'sin', cosineName: 'cos', hyperbolic: false };
const HYPERBOLIC_FAMILY: TrigFamily = { sineName: 'sinh', cosineName: 'cosh', hyperbolic: true };

/** Les quatre fonctions développables, et la famille de chacune. */
const ARC_FAMILIES: Readonly<Record<string, TrigFamily>> = {
	sin: TRIGONOMETRIC_FAMILY,
	cos: TRIGONOMETRIC_FAMILY,
	sinh: HYPERBOLIC_FAMILY,
	cosh: HYPERBOLIC_FAMILY
};

/**
 * Plafond sur le multiple d'UN atome. `sin(k·u)` produit un polynôme de degré
 * k en `cos u` : le coût croît avec k, et le contrat exige que `sin(40x)` reste
 * opaque.
 *
 * 12 est mesuré (tsx, node 22, M1 8 Go, un seul appel après chauffe) :
 * - décider `sin(kx) ≡ 2 sin(k/2·x) cos(k/2·x)` : 0,5 ms à k=2, 0,7 ms à k=8,
 *   1,6 ms à k=12 ; 2,2 ms à k=24 plafond levé — la croissance est douce ;
 * - `sin(kx)² + cos(kx)² ≡ 1`, qui passe par Pythagore sur un polynôme de
 *   degré k : 1,3 ms à k=4, 4,2 ms à k=12, 10,9 ms à k=32 ;
 * - le cas lourd du contrat (`sin(12x)cos(12y)sin(12z)+cos(11x)sin(11y)`) :
 *   7 ms, avec ou sans budget d'interruption.
 *
 * Douze couvre donc le double du plus grand multiple du contrat (`sin(6x)`) en
 * gardant toute forme scolaire sous les 10 ms.
 *
 * ⚠️ Ce qui coûte vraiment n'est PAS k, c'est la puissance d'une somme large :
 * `(sin(kx)+cos(ky))^6` passe de 81 ms (k=4) à 3,0 s (k=12), et `^8` meurt en
 * dépassement mémoire dès k=8 (tas 900 Mo).
 *
 * Il existe bien un mur ANTÉRIEUR, indépendant de ce module :
 * `(a+b+…+m)^8`, sans la moindre trigonométrie, meurt pareillement, parce que
 * `polynomial.ts` ne consulte aucun signal d'interruption. Mais il serait faux
 * d'en conclure que ce module n'y ajoute rien : mesuré tas à 700 Mo,
 * `(\sin(7x+5y)+\cos(6z))^4` rend `false` en 9,2 ms sans ce module et TUE le
 * processus avec, parce que développer porte la base de 2 termes à 55. Ce
 * plafond-ci ne borne donc pas assez — voir `MAX_ARC_TOTAL_TERMS`.
 */
const MAX_ARC_MULTIPLE = 12n;

/**
 * Plafond sur le nombre de termes que le développement d'UN nœud peut produire.
 *
 * Le coût est le **produit** des `|kᵢ|+1` sur les atomes, pas leur maximum :
 * `sin(12x + 12y + 12z)` fait 13³ = 2197 termes avant même Pythagore. Le
 * plafond par atome ne borne donc rien à lui seul ; c'est le produit qu'il faut
 * compter, avant de développer.
 *
 * Mesuré : `sin(12x+12y)` (169 termes, sous le plafond) coûte 6,8 ms ;
 * `sin(12x+12y+12z)` (2197 termes) coûtait 47 ms plafond levé, et tombe à
 * 0,2 ms une fois refusé. 256 laisse passer tout ce que le contrat exige
 * (`sin(2x+y)` en produit 6, `sin(x+y)sin(x−y)` 4).
 */
const MAX_ARC_EXPANSION_TERMS = 256n;

/**
 * Plafond sur le nombre de termes que le développement produit **sur tout
 * l'arbre**, une fois composé.
 *
 * Le plafond par nœud ne borne rien dès que le nœud développé se retrouve sous
 * un produit ou une puissance, parce que la loi de composition est
 * multiplicative : `sin(7x+5y)` ne fait que 48 termes, mais `(…)^4` porte une
 * base de 2 termes à 55, et l'arithmétique polynomiale en aval meurt en
 * dépassement mémoire là où elle rendait `false` en 9 ms sans ce module.
 *
 * L'estimation se fait donc en une passe descendante, AVANT de développer quoi
 * que ce soit : somme sur les additions, produit sur les produits et les
 * quotients, puissance sur les exposants entiers. Au-dessus du plafond, le
 * module rend l'arbre intact — refuser ne produit que des faux négatifs.
 *
 * Calibré par la mesure : le contrat le plus lourd (`sin(12x+12y)`, 169 termes)
 * passe, le premier cas mortel mesuré (`(cosh(9z+7y)−tanh(4x−12y))^2`, estimé
 * 4 225) est refusé.
 */
const MAX_ARC_TOTAL_TERMS = 2048n;

/**
 * Borne haute du nombre de termes de `estimateExpansionTerms`, au-delà de
 * laquelle on cesse de multiplier : sans elle, `(…)^12` sur un arbre profond
 * fabrique des `bigint` de plusieurs milliers de chiffres pour rien.
 */
const ESTIMATE_SATURATION = MAX_ARC_TOTAL_TERMS + 1n;

// =============================================================================
// Fonctions — fabrique de nœuds
// =============================================================================

/**
 * Le nœud d'un entier signé. La fabrique refuse les littéraux négatifs :
 * `-3` s'écrit `opposite(number('3'))`.
 */
function integerNode(value: bigint): MathNode {
	return value < 0n ? opposite(number((-value).toString())) : number(value.toString());
}

/**
 * `coefficient · variable^degree`, écrit au plus court.
 */
function monomialNode(coefficient: bigint, variable: MathNode, degree: number): MathNode {
	const powerPart =
		degree === 0 ? null : degree === 1 ? variable : power(variable, number(degree.toString()));

	if (powerPart === null) {
		return integerNode(coefficient);
	}
	if (coefficient === 1n) {
		return powerPart;
	}
	if (coefficient === -1n) {
		return opposite(powerPart);
	}
	const magnitude = multiply(number(absBigInt(coefficient).toString()), powerPart, 'implicit');
	return coefficient < 0n ? opposite(magnitude) : magnitude;
}

/** Valeur absolue d'un bigint — `Math.abs` ne les accepte pas. */
function absBigInt(value: bigint): bigint {
	return value < 0n ? -value : value;
}

/**
 * Assemble `Σ coefficients[i]·variable^i`, les coefficients nuls omis.
 * Les coefficients négatifs deviennent des soustractions : l'arbre reste lisible
 * et `normalize` n'a pas d'opposés imbriqués à défaire.
 */
function polynomialNode(coefficients: readonly bigint[], variable: MathNode): MathNode {
	let result: MathNode | null = null;

	for (let degree = coefficients.length - 1; degree >= 0; degree--) {
		const coefficient = coefficients[degree];
		if (coefficient === 0n) continue;

		if (result === null) {
			result = monomialNode(coefficient, variable, degree);
		} else if (coefficient < 0n) {
			result = subtract(result, monomialNode(-coefficient, variable, degree));
		} else {
			result = add(result, monomialNode(coefficient, variable, degree));
		}
	}

	// Un polynôme de Tchebychev n'est jamais nul, mais la fonction doit rester totale.
	return result ?? number('0');
}

// =============================================================================
// Fonctions — polynômes de Tchebychev
// =============================================================================

/**
 * Applique une fois la récurrence commune : `P_{n+1} = 2c·P_n − P_{n−1}`.
 * Les coefficients sont indexés par le degré.
 */
function chebyshevStep(current: readonly bigint[], previous: readonly bigint[]): bigint[] {
	const next = new Array<bigint>(current.length + 1).fill(0n);
	for (let i = 0; i < current.length; i++) {
		next[i + 1] += 2n * current[i];
	}
	for (let i = 0; i < previous.length; i++) {
		next[i] -= previous[i];
	}
	return next;
}

/**
 * `T_k`, première espèce : `T_0 = 1`, `T_1 = c`, `T_{n+1} = 2c·T_n − T_{n−1}`.
 * `cos(ku) = T_k(cos u)` et `cosh(ku) = T_k(cosh u)`.
 */
function chebyshevFirstKind(degree: number, abortChecker?: AbortChecker): bigint[] {
	if (degree === 0) return [1n];
	let previous: bigint[] = [1n];
	let current: bigint[] = [0n, 1n];
	for (let step = 1; step < degree; step++) {
		checkAbort(abortChecker);
		const next = chebyshevStep(current, previous);
		previous = current;
		current = next;
	}
	return current;
}

/**
 * `U_k`, seconde espèce : `U_0 = 1`, `U_1 = 2c`, `U_{n+1} = 2c·U_n − U_{n−1}`.
 * `sin(ku) = sin(u)·U_{k−1}(cos u)` et `sinh(ku) = sinh(u)·U_{k−1}(cosh u)`.
 */
function chebyshevSecondKind(degree: number, abortChecker?: AbortChecker): bigint[] {
	// `U₋₁ = 0` : la boucle ci-dessous partirait de `U₁ = 2c` pour tout degré
	// négatif, soit `sin(0·u) = 2 sin(u) cos(u)` — un faux positif. Le multiple
	// nul est écarté en amont par `expandArcAt`, mais la fonction ne doit pas
	// dépendre de son appelant pour rester juste.
	if (degree <= 0) return degree === 0 ? [1n] : [0n];
	let previous: bigint[] = [1n];
	let current: bigint[] = [0n, 2n];
	for (let step = 1; step < degree; step++) {
		checkAbort(abortChecker);
		const next = chebyshevStep(current, previous);
		previous = current;
		current = next;
	}
	return current;
}

// =============================================================================
// Fonctions — décomposition de l'argument
// =============================================================================

/**
 * Le coefficient d'un terme, quand c'est un entier relatif tout simple.
 * Un coefficient fractionnaire, irrationnel ou imaginaire rend `null` : c'est
 * la limite assumée du générateur canonique.
 */
function integerCoefficient(coefficient: AlgebraicCoefficient): bigint | null {
	if (coefficient.terms.length !== 1) return null;
	const term = coefficient.terms[0];
	if (term.radicals.length > 0 || term.hasImaginaryUnit === true) return null;
	if (term.rational.d !== 1n) return null;
	return term.rational.n;
}

/**
 * Un terme dont le monôme n'est fait que de constantes mathématiques (`π`, `e`)
 * — ou vide. Il ne porte pas d'angle : il ira dans la partie constante, dont
 * `normalize` sait déjà tirer `cos(π/3) = 1/2` ou `sin(x+2π) = sin(x)`.
 */
function isConstantTerm(term: NormalTerm): boolean {
	return term.monomial.every((factor) => factor.base.type === 'constant');
}

/**
 * Le polynôme constant `1`, seul dénominateur qu'on accepte : au-delà,
 * l'argument est une vraie fraction rationnelle et n'est pas décomposable en
 * combinaison linéaire d'atomes.
 */
function isUnitPolynomial(terms: readonly NormalTerm[]): boolean {
	if (terms.length !== 1) return false;
	const term = terms[0];
	if (term.monomial.length !== 0) return false;
	const coefficient = integerCoefficient(term.coefficient);
	return coefficient === 1n;
}

/**
 * Décompose la forme normale d'un argument en `Σ kᵢ·mᵢ + c`.
 * Rend `null` dès qu'un coefficient d'angle n'est pas entier : le nœud sera
 * laissé tel quel.
 */
function decomposeAngle(form: NormalForm): AngleDecomposition | null {
	if (!isUnitPolynomial(form.denominator)) return null;

	const components: AngleComponent[] = [];
	const constantTerms: NormalTerm[] = [];

	for (const term of form.numerator) {
		if (isConstantTerm(term)) {
			constantTerms.push(term);
			continue;
		}

		const multiple = integerCoefficient(term.coefficient);
		if (multiple === null) return null;

		const atom = denormalizeMonomial(term.monomial);
		if (atom === null) return null;

		components.push({ multiple, atom });
	}

	let constantPart: MathNode | null = null;
	for (const term of constantTerms) {
		const node = denormalizeTerm(term);
		constantPart = constantPart === null ? node : add(constantPart, node);
	}

	return { components, constantPart };
}

/**
 * Combien de termes le développement produirait : le **produit** des `|kᵢ|+1`,
 * la partie constante comptant pour un facteur 2 (son couple `(sin c, cos c)`).
 * `null` quand un multiple dépasse le plafond par atome.
 */
function expansionSize(decomposition: AngleDecomposition): bigint | null {
	let size = decomposition.constantPart === null ? 1n : 2n;
	for (const component of decomposition.components) {
		const magnitude = absBigInt(component.multiple);
		if (magnitude > MAX_ARC_MULTIPLE) return null;
		size *= magnitude + 1n;
		if (size > MAX_ARC_EXPANSION_TERMS) return size;
	}
	return size;
}

// =============================================================================
// Fonctions — développement
// =============================================================================

/**
 * Le couple `(sin(k·u), cos(k·u))` par Tchebychev.
 * `k` négatif passe par la parité : le cosinus est pair, le sinus impair — et
 * c'est vrai aussi de `cosh` et `sinh`.
 */
function multipleArcPair(
	multiple: bigint,
	atom: MathNode,
	family: TrigFamily,
	abortChecker?: AbortChecker
): TrigPair {
	const magnitude = Number(absBigInt(multiple));
	const cosineAtom = func(family.cosineName, [atom]);
	const sineAtom = func(family.sineName, [atom]);

	const cosine = polynomialNode(chebyshevFirstKind(magnitude, abortChecker), cosineAtom);
	const sineMagnitude = multiply(
		sineAtom,
		polynomialNode(chebyshevSecondKind(magnitude - 1, abortChecker), cosineAtom),
		'implicit'
	);

	return { sine: multiple < 0n ? opposite(sineMagnitude) : sineMagnitude, cosine };
}

/**
 * Combine deux angles par les formules d'addition.
 *
 *   sin(a+b)  = sin a cos b + cos a sin b      sinh(a+b) = sinh a cosh b + cosh a sinh b
 *   cos(a+b)  = cos a cos b − sin a sin b      cosh(a+b) = cosh a cosh b + sinh a sinh b
 */
function combineAngles(first: TrigPair, second: TrigPair, family: TrigFamily): TrigPair {
	const sine = add(
		multiply(first.sine, second.cosine, 'implicit'),
		multiply(first.cosine, second.sine, 'implicit')
	);

	const cosineProducts = multiply(first.cosine, second.cosine, 'implicit');
	const sineProducts = multiply(first.sine, second.sine, 'implicit');
	const cosine = family.hyperbolic
		? add(cosineProducts, sineProducts)
		: subtract(cosineProducts, sineProducts);

	return { sine, cosine };
}

/**
 * Développe UN nœud `sin`/`cos`/`sinh`/`cosh`, ou rend `null` quand il doit
 * rester tel quel — argument non décomposable, multiple non entier, plafond
 * dépassé, ou rien à gagner (un seul atome de multiple ±1 sans constante, que
 * `normalize` traite déjà par la parité).
 */
function expandArcAt(node: MathNode, ctx: ArcExpansionContext): MathNode | null {
	if (!isFunction(node) || node.args.length !== 1) return null;

	const family = ARC_FAMILIES[node.name];
	if (family === undefined) return null;

	// Réciproque (`\sin^{-1}` = arcsin), dérivée, indice : ce ne sont pas les
	// fonctions qu'on développe.
	if (node.isInverse === true || node.derivativeOrder !== undefined || node.base !== undefined) {
		return null;
	}
	if (node.power !== undefined && isInverseNotation(node.power)) {
		return null;
	}

	const decomposition = decomposeAngle(ctx.normalizeArgument(node.args[0]));
	if (decomposition === null) return null;

	const { components, constantPart } = decomposition;
	if (components.length === 0) return null;
	if (
		components.length === 1 &&
		constantPart === null &&
		absBigInt(components[0].multiple) === 1n
	) {
		return null;
	}

	const size = expansionSize(decomposition);
	if (size === null || size > MAX_ARC_EXPANSION_TERMS) return null;

	let pair: TrigPair | null = null;
	for (const component of components) {
		checkAbort(ctx.abortChecker);
		const componentPair = multipleArcPair(
			component.multiple,
			component.atom,
			family,
			ctx.abortChecker
		);
		pair = pair === null ? componentPair : combineAngles(pair, componentPair, family);
	}

	if (constantPart !== null && pair !== null) {
		checkAbort(ctx.abortChecker);
		pair = combineAngles(
			pair,
			{
				sine: func(family.sineName, [constantPart]),
				cosine: func(family.cosineName, [constantPart])
			},
			family
		);
	}

	if (pair === null) return null;

	const expanded = node.name === family.sineName ? pair.sine : pair.cosine;

	// `\sin^2(2x)` porte sa puissance sur le nœud fonction : elle se reporte sur
	// le développement, comme `expandTrigDefinitions` le fait pour `\tan^2`.
	return node.power === undefined ? expanded : superscript(expanded, node.power);
}

/**
 * `-1` en exposant d'une fonction nommée : la réciproque, pas l'inverse.
 * La fabrique refuse les littéraux signés, donc `-1` se lit `opposite(1)`.
 */
function isInverseNotation(power: MathNode): boolean {
	if (power.type === 'opposite') {
		return power.operand.type === 'number' && power.operand.value === '1';
	}
	return power.type === 'number' && power.value === '-1';
}

/**
 * Y a-t-il seulement un arc à développer ? Garde bon marché : une expression
 * sans trigonométrie ne doit rien payer — ni parcours de réécriture, ni appel
 * à `normalize` sur des arguments qui n'existent pas.
 */
function containsExpandableArc(node: MathNode): boolean {
	return (
		findFirst(
			node,
			(current) => isFunction(current) && ARC_FAMILIES[current.name] !== undefined
		) !== undefined
	);
}

/**
 * L'exposant entier d'un `^`, quand il en a un et qu'il est petit. Un exposant
 * symbolique, négatif ou démesuré ne se développe pas ici : il vaut `null`, et
 * l'estimation sature.
 */
function integerExponent(node: MathNode): number | null {
	if (!isNumber(node)) return null;
	if (!/^\d+$/.test(node.value)) return null;
	const exponent = Number(node.value);
	return Number.isSafeInteger(exponent) && exponent <= 64 ? exponent : null;
}

/**
 * Majorant du nombre de termes que le développement produirait pour `node`,
 * composé selon la structure : somme sur `+` et `−`, produit sur `×`, `/` et
 * sur l'imbrication d'un arc dans un arc, puissance sur un exposant entier.
 *
 * C'est une borne haute, pas un compte : `(a+b)^4` vaut 5 monômes réels et
 * l'estimation en annonce 16. La sous-estimation serait dangereuse, la
 * surestimation ne coûte qu'un refus — donc on majore, et on sature dès qu'on
 * dépasse le plafond pour ne pas fabriquer de grands `bigint` inutiles.
 */
function estimateExpansionTerms(node: MathNode, ctx: ArcExpansionContext): bigint {
	checkAbort(ctx.abortChecker);

	if (isAddition(node) || isSubtraction(node)) {
		const total = estimateExpansionTerms(node.left, ctx) + estimateExpansionTerms(node.right, ctx);
		return total > ESTIMATE_SATURATION ? ESTIMATE_SATURATION : total;
	}

	if (isMultiplication(node)) {
		const total = estimateExpansionTerms(node.left, ctx) * estimateExpansionTerms(node.right, ctx);
		return total > ESTIMATE_SATURATION ? ESTIMATE_SATURATION : total;
	}

	if (isDivision(node)) {
		const total =
			estimateExpansionTerms(node.numerator, ctx) * estimateExpansionTerms(node.denominator, ctx);
		return total > ESTIMATE_SATURATION ? ESTIMATE_SATURATION : total;
	}

	if (isOpposite(node) || isPositive(node)) return estimateExpansionTerms(node.operand, ctx);
	if (isDelimiter(node)) return estimateExpansionTerms(node.content, ctx);

	if (isSuperscript(node)) {
		const base = estimateExpansionTerms(node.base, ctx);
		if (base <= 1n) return 1n;
		const exponent = integerExponent(node.superscript);
		if (exponent === null) return ESTIMATE_SATURATION;
		let total = 1n;
		for (let i = 0; i < exponent; i++) {
			total *= base;
			if (total > ESTIMATE_SATURATION) return ESTIMATE_SATURATION;
		}
		return total;
	}

	if (isFunction(node)) {
		// L'arc porté par le nœud et ce que ses arguments développent déjà se
		// COMPOSENT : `sin(2·sin(3x))` décompose l'arc extérieur sur un atome qui
		// est lui-même un polynôme. Prendre le maximum sous-estimerait — et c'est
		// la sous-estimation qui coûte cher.
		let inner = 1n;
		for (const arg of node.args) {
			inner *= estimateExpansionTerms(arg, ctx);
			if (inner > ESTIMATE_SATURATION) return ESTIMATE_SATURATION;
		}

		const decomposition =
			node.args.length === 1 && ARC_FAMILIES[node.name] !== undefined
				? decomposeAngle(ctx.normalizeArgument(node.args[0]))
				: null;
		const own = decomposition === null ? 1n : (expansionSize(decomposition) ?? ESTIMATE_SATURATION);

		let total = own * inner;
		if (total > ESTIMATE_SATURATION) return ESTIMATE_SATURATION;
		if (node.power !== undefined && !isInverseNotation(node.power)) {
			const exponent = integerExponent(node.power);
			if (exponent === null) return ESTIMATE_SATURATION;
			let powered = 1n;
			for (let i = 0; i < exponent; i++) {
				powered *= total;
				if (powered > ESTIMATE_SATURATION) return ESTIMATE_SATURATION;
			}
			total = powered;
		}
		return total > ESTIMATE_SATURATION ? ESTIMATE_SATURATION : total;
	}

	return 1n;
}

/**
 * Ramène tous les arcs commensurables d'un arbre au générateur de coefficient 1.
 *
 * De bas en haut : l'argument d'un arc est déjà développé quand on l'atteint,
 * si bien que `sin(2·sin(3x))` se décompose sur l'atome `sin(x)` et ses
 * puissances. Les nœuds produits ne sont pas revisités — le développement fait
 * une passe, il n'y a pas de point fixe à chercher.
 */
export function expandCommensurableArcs(node: MathNode, ctx: ArcExpansionContext): MathNode {
	if (!containsExpandableArc(node)) return node;
	if (estimateExpansionTerms(node, ctx) > MAX_ARC_TOTAL_TERMS) return node;
	return mapNode(node, (current) => expandArcAt(current, ctx) ?? current);
}
