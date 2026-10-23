/**
 * `tidyTerms()` — mettre une dérivée au propre, sans perdre ce qui la rend lisible
 *
 * `differentiate` écrit a·n·xⁿ⁻¹ sans calculer le produit : la carte f′ de
 * `3x^3` montrait `3*3x^2` (retour de David, 2026-10-04). `tidy` le règle,
 * mais il RÉORDONNE une somme : la règle du produit donne `2x·sin x + x²·cos x`
 * (u′v + uv′), et `tidy` en faisait `x²·cos x + …`.
 *
 * La règle (lot 4c du chantier simplify-carte, S2, 2026-10-23) :
 * - `tidy({ order: 'kept' })` : l'ordre écrit des termes reste, dans chaque
 *   somme, les termes semblables regroupés à la place du premier
 *   (`9x² + 6x² + 1` → `15x² + 1`) ;
 * - sauf si l'ordre de la règle met un négatif en tête que l'ordre rangé évite
 *   à nombre de termes égal (`−6x + 2` → `2 − 6x`, décision du 2026-10-06) :
 *   l'ordre rangé l'emporte.
 * Dans un quotient, on descend dans le numérateur (u′v − uv′ reste).
 *
 * Écrit d'abord pour l'atelier (`src/lib/atelier/tidy-terms.ts`, qui le
 * ré-exporte), il vit ici pour servir aussi la commande `.diff` du moteur :
 * `mathAST` n'importe pas l'atelier.
 *
 * @module mathAST/tidy/terms
 */

import type { MathNode } from '../types';
import { parentheses } from '../factory';
import { isOpposite } from '../guards';
import { mapNode } from '../transforms';
import { tidy } from './index';
import type { TidyOptions } from './index';

/** `tidy` peut relancer une exception imprévue : on garde alors la forme brute. */
function tidySafe(node: MathNode, options: TidyOptions | undefined): MathNode {
	try {
		return tidy(node, options);
	} catch {
		return node;
	}
}

/** Les termes de la chaîne de somme au sommet (`a + b − c` : 3 termes). */
function countTerms(node: MathNode): number {
	return node.type === 'addition' || node.type === 'subtraction' ? countTerms(node.left) + 1 : 1;
}

/** Le premier terme de la chaîne de somme est-il écrit avec un signe − ? */
function leadsNegative(node: MathNode): boolean {
	if (node.type === 'addition' || node.type === 'subtraction') return leadsNegative(node.left);
	return isOpposite(node);
}

/**
 * Une dérivée mise au propre, en gardant l'ordre de la règle.
 *
 * @param options - Transmises à `tidy` ; `domain: [f]` pour la dérivée de `f`
 *   (S3 : `x·(1/x)` ne se simplifie que si le domaine de `f` exclut 0)
 */
export function tidyTerms(node: MathNode, options?: TidyOptions): MathNode {
	return tidyGrouped(node, options);
}

/**
 * Les parenthèses que la priorité impose, écrites. Un arbre construit par le
 * moteur (règle du quotient) porte `u′v − (uv′)` sans nœud de parenthèse :
 * `tidy` y distribuait alors le signe (`x(2x+1) − x² − x − 1`), ce que son
 * contrat interdit pour `−(x+2)` écrit.
 */
function withImpliedParentheses(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (n.type === 'subtraction' && isSum(n.right)) return { ...n, right: parentheses(n.right) };
		if (n.type === 'opposite' && isSum(n.operand)) return { ...n, operand: parentheses(n.operand) };
		return n;
	});
}

function isSum(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

/**
 * La somme mise au propre dans l'ordre écrit, ses parenthèses sous-entendues
 * gardées (`u′v − (uv′)`) — sauf si les ouvrir regroupe des termes
 * (`x − 1 − (x + 1)` → `−2`) : regrouper l'emporte.
 */
function keptWithGroups(node: MathNode, options: TidyOptions | undefined): MathNode {
	const grouped = tidySafe(withImpliedParentheses(node), { ...options, order: 'kept' });
	const opened = tidySafe(node, { ...options, order: 'kept' });
	return countTerms(opened) < countTerms(grouped) ? opened : grouped;
}

function tidyGrouped(node: MathNode, options: TidyOptions | undefined): MathNode {
	if (node.type === 'division') {
		// Le numérateur garde son ordre (u′v − uv′) et son signe ; mais si la mise
		// au propre complète est plus COURTE (`{8x^3}/4` → `2x^3`), elle l'emporte
		const ordered: MathNode = {
			...node,
			numerator: tidyGrouped(node.numerator, options),
			denominator: tidySafe(node.denominator, { ...options, order: 'kept' })
		};
		const full = tidySafe(withImpliedParentheses(node), { ...options, order: 'kept' });
		return nodeCount(full) < nodeCount(ordered) ? full : ordered;
	}
	const kept = keptWithGroups(node, options);
	if (!isSum(kept)) return kept;
	if (!leadsNegative(kept)) return kept;
	// Même nombre de termes, mais l'ordre rangé évite un négatif en tête
	// (somme de degré 1 : `−6x + 2` → `2 − 6x`) : il l'emporte.
	const full = tidySafe(node, options);
	return countTerms(full) === countTerms(kept) && !leadsNegative(full) ? full : kept;
}

/** Le nombre de nœuds d'un arbre : « plus simple » veut dire « moins de nœuds ». */
export function nodeCount(node: unknown): number {
	if (node === null || typeof node !== 'object') return 0;
	let count = 'type' in node ? 1 : 0;
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) for (const item of value) count += nodeCount(item);
		else if (value !== null && typeof value === 'object') count += nodeCount(value);
	}
	return count;
}
