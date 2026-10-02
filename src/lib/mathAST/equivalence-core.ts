/**
 * MathAST Expression Equivalence — le moteur, sans `numtype`.
 *
 * Les hypothèses de l'énoncé y arrivent déjà traduites en prédicats
 * (`AssumptionOracle`). La traduction, qui importe `numtype`, vit dans
 * `equivalence.ts` : `eval/evaluate.ts` importe ce moteur, et un import
 * statique de `numtype` d'ici fermait un cycle (`UNIVERSAL_SET` lu avant
 * initialisation, 17 fichiers de test cassés).
 */

import type { MathNode, RelationNode, RelationType } from './types';
import { isRelation } from './guards';
import { equivalenceForms, type NormalizeAbortOptions } from './normal/normalize';
import { normalFormsEquivalent } from './normal/hash';
import { evaluate, evaluateNodeToApproximatedNumber } from './eval/evaluate';
import { numbersAreClose } from './common/constants';
import { AbortError, makeAbortChecker } from './common/abort';
import type { AssumptionOracle } from './assumptions';

/** Options du moteur : interruption et hypothèses déjà traduites. */
export interface EquivalenceCoreOptions extends NormalizeAbortOptions {
	readonly assumptions?: AssumptionOracle;
}

/**
 * Checks if two MathNodes are mathematically equivalent.
 *
 * Uses normalization for structural equivalence (handles polynomials,
 * fractions, trig special values, etc.). Falls back to numeric comparison
 * if normalization fails.
 *
 * @param a - First MathNode
 * @param b - Second MathNode
 * @returns true if expressions are mathematically equivalent
 *
 * @example
 * areEquivalent(parse('x^2 - 1'), parse('(x-1)(x+1)'))  // true
 * areEquivalent(parse('2x + 3'), parse('3 + 2x'))        // true
 * areEquivalent(parse('sqrt(2)'), parse('sqrt(2)'))       // true
 */
export function areEquivalentCore(
	a: MathNode,
	b: MathNode,
	options?: EquivalenceCoreOptions
): boolean {
	if (isRelation(a) && isRelation(b)) return relationsEquivalent(a, b, options);

	const abortChecker = makeAbortChecker(options?.signal, options?.timeoutMs);
	const assumptions = options?.assumptions;
	const ctx =
		abortChecker || assumptions
			? { ...(abortChecker && { abortChecker }), ...(assumptions && { assumptions }) }
			: undefined;

	// Try structural equivalence via normalization
	try {
		const [formA, formB] = equivalenceForms(a, b, ctx);
		return normalFormsEquivalent(formA, formB);
	} catch (e) {
		// On abort, return false (conservative — we couldn't prove equivalence).
		// Any other normalization failure falls through to the numeric fallback.
		if (e instanceof AbortError) return false;
	}

	try {
		const evalA = evaluate(a, { mode: 'decimal' });
		const evalB = evaluate(b, { mode: 'decimal' });

		if (evalA.status === 'value' && evalB.status === 'value') {
			const numA =
				typeof evalA.value === 'number'
					? evalA.value
					: typeof evalA.value === 'object' && 'type' in evalA.value
						? evaluateNodeToApproximatedNumber(evalA.value)
						: NaN;
			const numB =
				typeof evalB.value === 'number'
					? evalB.value
					: typeof evalB.value === 'object' && 'type' in evalB.value
						? evaluateNodeToApproximatedNumber(evalB.value)
						: NaN;

			if (!isNaN(numA) && !isNaN(numB)) {
				// Tolérance relative : une absolue (1e-10) jugeait 10⁻¹² égal à 0
				return numbersAreClose(numA, numB);
			}
		}
	} catch {
		// Numeric comparison also failed
	}

	return false;
}

/**
 * La relation qui dit la même chose quand on échange ses membres :
 * `a<b ⟺ b>a`, `a=b ⟺ b=a`. `null` quand l'échange n'a pas de sens connu ici
 * (`≺`, `∼`…) : seule la lecture membre à membre est alors tentée.
 */
const MIRRORED_RELATION: Partial<Record<RelationType, RelationType>> = {
	'=': '=',
	'!=': '!=',
	'≡': '≡',
	'≢': '≢',
	'≈': '≈',
	'≃': '≃',
	'<': '>',
	'>': '<',
	'<=': '>=',
	'>=': '<='
};

/**
 * Deux relations sont équivalentes quand elles portent la même relation entre
 * des membres équivalents un à un — éventuellement ÉCHANGÉS, la relation étant
 * alors retournée (`y=x+1 ≡ x+1=y`, `x<2 ≡ 2>x`).
 *
 * Avant, la relation était un nœud opaque pour la normalisation : `y=1+x`
 * était compté faux pour l'attendu `y=x+1`.
 *
 * Décision du 2026-10-02 : rien de plus. `2y=2x+2` ou `y-x=1` ont les mêmes
 * solutions que `y=x+1`, mais ce n'est pas la même écriture ; accepter une
 * équation transformée est un choix de correction, pas une équivalence
 * d'expressions.
 *
 * Le budget (`timeoutMs`) vaut pour la comparaison ENTIÈRE : chaque appel aux
 * membres reçoit ce qui reste, pas un budget neuf.
 */
function relationsEquivalent(
	a: RelationNode,
	b: RelationNode,
	options: EquivalenceCoreOptions | undefined
): boolean {
	const start = performance.now();
	const memberOptions = (): EquivalenceCoreOptions | undefined => {
		if (options?.timeoutMs === undefined) return options;
		const remaining = Math.max(0, options.timeoutMs - (performance.now() - start));
		return { ...options, timeoutMs: remaining };
	};
	const sameMembers = (left: MathNode, right: MathNode): boolean =>
		areEquivalentCore(a.left, left, memberOptions()) &&
		areEquivalentCore(a.right, right, memberOptions());

	if (a.relation === b.relation && sameMembers(b.left, b.right)) return true;
	return MIRRORED_RELATION[a.relation] === b.relation && sameMembers(b.right, b.left);
}
