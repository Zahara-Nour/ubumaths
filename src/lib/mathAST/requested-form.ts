/**
 * La forme de la réponse finale demandée par l'énoncé, pour une dérivée ou une
 * primitive (D4, lot 5e du chantier simplify-carte, § 20 et § 67-68 du journal)
 *
 * On part de la forme par défaut (D1 pour f′, § 7 pour F) :
 *
 * - **Factorisée** : la règle du tableau de variations (D2, `factoredForm`),
 *   numérateur seul d'un quotient ; un nombre devant une somme est accepté
 *   (`8x − 8 → 8(x − 1)`, Q39). Primitive : un facteur qui porte une fraction
 *   est refusé, la forme développée reste (`x³/3 + x`, Q34).
 * - **Développée** : chaque terme développé à part, une somme n'est donc pas mise
 *   au même dénominateur (`2x − 4 + 1/x` reste) ; d'un quotient, le numérateur
 *   seul (`(1 − x²)/(x² + 1)²`, signe devant la barre compris : `−7/(x − 3)²`),
 *   sauf dénominateur numérique, distribué (`(x + 1)³/3 → x³/3 + x² + x + 1/3`).
 *   Un décimal tapé reste décimal (S1).
 *
 * Ne lève jamais : sur un imprévu, ou budget dépassé, la forme par défaut reste.
 *
 * @module mathAST/requested-form
 */

import type { MathNode } from './types';
import { divide, opposite, parentheses } from './factory';
import { flattenSumShallow, unflattenSum } from './flatten';
import type { SignedTerm } from './flatten';
import { isDelimiter, isDivision, isNumber, isOpposite } from './guards';
import { hashMathNode } from './normal/hash';
import { generatePedagogicalSimplifySteps } from './pedagogical-simplify/pipeline';
import { tidy } from './tidy';
import { factoredForm, withTypedDecimals } from './variations/display';

/** La forme demandée (`FinalForm` des modèles de question). */
export type RequestedForm = 'developpee' | 'factorisee';

/** Le budget de la politique `developper`, comme celui d'`auto` dans final-form. */
const DEVELOP_TIMEOUT_MS = 1000;

/**
 * `node` sous la forme demandée.
 *
 * @param node - La forme par défaut de la dérivée ou de la primitive
 * @param form - La forme demandée par l'énoncé
 * @param context.f - La fonction de départ : son domaine est acquis (S3)
 * @param context.kind - Dérivée ou primitive (Q34 ne vise que la primitive)
 */
export function requestedForm(
	node: MathNode,
	form: RequestedForm,
	context: { readonly f: MathNode; readonly kind: 'derivative' | 'antiderivative' }
): MathNode {
	try {
		if (form === 'factorisee') {
			return factoredForm(node, {
				numberBeforeSum: true,
				fractionInFactor: context.kind === 'derivative'
			});
		}
		return developed(node, context.f);
	} catch {
		return node;
	}
}

/** Le titre de l'étape qui passe à la forme demandée. */
export function requestedFormTitle(form: RequestedForm): string {
	return form === 'factorisee' ? 'On factorise' : 'On développe';
}

function developed(node: MathNode, f: MathNode): MathNode {
	const terms: SignedTerm[] = flattenSumShallow(node).map(({ sign, term }) => {
		const result = developedTerm(term);
		return { sign, term: isSum(result) ? parentheses(result) : result };
	});
	const sum = unflattenSum(terms);
	if (sum === null) return node;
	const options = { domain: [f] };
	const result = withTypedDecimals(tidy(sum, options), node);
	// Un simple réordonnement n'est pas un développement : l'écriture reste
	// (`2x − 4 + 1/x`, pas `2x + 1/x − 4`)
	return hashMathNode(result) === hashMathNode(tidy(node, options)) ? node : result;
}

/** Un terme développé ; d'un quotient, le numérateur seul. */
function developedTerm(term: MathNode): MathNode {
	const negative = isOpposite(term);
	const inner = unwrap(negative ? term.operand : term);
	if (isDivision(inner) && !isNumber(unwrap(inner.denominator))) {
		const quotient = divide(develop(inner.numerator), inner.denominator, inner.displayStyle);
		return negative ? opposite(quotient) : quotient;
	}
	return develop(term);
}

/** La politique `developper` (lycée) ; lève si le budget est dépassé. */
function develop(node: MathNode): MathNode {
	const result = generatePedagogicalSimplifySteps(node, {
		intent: 'developper',
		schoolLevel: 'lycee',
		timeoutMs: DEVELOP_TIMEOUT_MS
	});
	if (result.aborted === true) throw new Error('developper : budget dépassé');
	return result.result;
}

function isSum(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

function unwrap(node: MathNode): MathNode {
	let current = node;
	while (isDelimiter(current)) current = current.content;
	return current;
}
