/**
 * Nettoyage des coefficients d'un modèle (`shared.cleanCoefficients`)
 * ===================================================================
 *
 * `{{a}}x{{b;+}}y+{{c}}=0` tiré avec a = 1, b = −1, c = 0 s'écrit « 1x-1y+0=0 ».
 * Avec l'option, chaque formule maison résolue passe par les étapes cosmétiques
 * `coefficientCleanupSteps` (sélection de `buildASTPipeline`, source unique) :
 * 0·x → 0, x + 0 → x, signes, 1·x → x. Résultat : « x-y=0 ».
 *
 * Gardes (une formule n'est jamais cassée, au pire laissée telle quelle) :
 * - une fonction (`f(1)`, `P'(-3)` si `P` est déclarée) n'est jamais touchée ;
 * - seul le PREMIER facteur d'un produit est un coefficient : un facteur suivant qui
 *   est un nombre, une parenthèse, une fonction ou un signe est protégé (`C(1)`,
 *   `C(-3)` avec `C` non déclarée, `x×(−7)`, `97,6×1`), le contenu d'une parenthèse
 *   protégée étant nettoyé pour lui-même ;
 * - le signe d'un numérateur ou d'un dénominateur reste dans la fraction
 *   (`\\dfrac{-10}{10}` n'est pas réécrit `-\\dfrac{10}{10}` : ce n'est pas un coefficient) ;
 * - un signe + écrit (`+\infty`, `+1`) reste écrit ;
 * - une chaîne de calcul (`r = -1 - (-4) = 3`, deux relations ou plus) est laissée
 *   telle quelle : chaque terme y est une étape voulue ; de même une relation dont
 *   les deux membres deviendraient identiques (`x - (-3) = x + 3`) ;
 * - la valeur ne change pas (`areEquivalent`) ; pour une relation (égalité ou
 *   inégalité), chaque MEMBRE garde sa valeur et la relation reste la même
 *   (`keepsValue`) ; aucune case `?` ne disparaît ;
 * - formule illisible, exception, ou rien à nettoyer : la formule d'origine.
 *
 * Une parenthèse dont le contenu nettoyé est une lettre ou un nombre disparaît
 * (`(x+0)^2` → `x^2`, `2(x+0)` → `2x`), sauf la notation fonctionnelle `C(x)` et un
 * nombre en facteur non premier (`2(3)`).
 *
 * La syntaxe maison ne lit pas `\\leqslant`, `\\geq`, `\\neq`… : `latexRelationsToCustom`
 * les réécrit (`<=`, `>=`, `!=`) avant lecture, sinon une inégalité écrite en LaTeX
 * n'était jamais nettoyée.
 */

import {
	areEquivalent,
	parseCustomSafe,
	toCustom,
	toLatex,
	type GenericFunctionConfig,
	type MathNode
} from '$lib/mathAST';
import { coefficientCleanupSteps } from '$lib/mathAST/cosmetic-transforms';
import { mapNode, mapNodeTopDown } from '$lib/mathAST/transforms';
import { positive, variable } from '$lib/mathAST/factory';

// Constantes

/** Nom des feuilles qui remplacent un morceau protégé le temps du nettoyage */
const PROTECTED_PREFIX = '__protectedCoefficient';

/** Types d'un facteur NON premier qui ne sont pas des coefficients (protégés) */
const NON_COEFFICIENT_FACTORS: ReadonlySet<MathNode['type']> = new Set([
	'number',
	'delimiter',
	'function',
	'opposite',
	'positive'
]);

/**
 * Relations LaTeX → syntaxe maison. La commande ne doit pas être suivie d'une lettre :
 * `\\left`, `\\neg`, `\\geometry` ne sont pas des relations.
 */
const LATEX_RELATIONS: ReadonlyArray<readonly [RegExp, string]> = [
	[/\\(?:leqslant|leq|le)(?![A-Za-z])/g, '<='],
	[/\\(?:geqslant|geq|ge)(?![A-Za-z])/g, '>='],
	[/\\(?:neq|ne)(?![A-Za-z])/g, '!='],
	[/\\lt(?![A-Za-z])/g, '<'],
	[/\\gt(?![A-Za-z])/g, '>']
];

// Fonctions

/** `x\\leqslant2` → `x<=2` : relations LaTeX réécrites pour la syntaxe maison */
export function latexRelationsToCustom(source: string): string {
	return LATEX_RELATIONS.reduce((text, [pattern, custom]) => text.replace(pattern, custom), source);
}

/**
 * Garde de valeur. Pour une relation, `areEquivalent` sur le tout jugerait
 * `2x²+2x ⩽ 4` égal à `x²+x ⩽ 2` (même ensemble de solutions) : on exige la même
 * relation et chaque membre de même valeur. Sinon, valeur de l'expression.
 */
export function keepsValue(original: MathNode, cleaned: MathNode): boolean {
	if (original.type !== 'relation') return areEquivalent(original, cleaned);
	return (
		cleaned.type === 'relation' &&
		cleaned.relation === original.relation &&
		areEquivalent(original.left, cleaned.left) &&
		areEquivalent(original.right, cleaned.right)
	);
}

/** Nombre de nœuds d'un type dans une formule (`hole` : cases `?`) */
function countNodes(ast: MathNode, type: MathNode['type']): number {
	let count = 0;
	mapNode(ast, (node) => {
		if (node.type === type) count++;
		return node;
	});
	return count;
}

/** Relation dont les deux membres s'écrivent pareil (`x + 3 = x + 3`) */
function isTautology(ast: MathNode): boolean {
	return ast.type === 'relation' && toLatex(ast.left) === toLatex(ast.right);
}

/**
 * Remplace les morceaux protégés par des feuilles opaques (rangées dans `store`) :
 * aucune étape cosmétique ne voit à travers une variable inconnue.
 */
function protect(ast: MathNode, store: MathNode[]): MathNode {
	const hide = (node: MathNode): MathNode => {
		// Parenthèse protégée : son contenu est nettoyé pour lui-même (`2(1x+0)` → `2(x)`)
		const kept =
			node.type === 'delimiter'
				? { ...node, content: cleanCoefficientsAst(node.content) }
				: node.type === 'positive'
					? { ...node, operand: cleanCoefficientsAst(node.operand) }
					: node;
		store.push(kept);
		return variable(`${PROTECTED_PREFIX}${store.length - 1}`);
	};

	// Chaîne de produit : le premier facteur est le coefficient, les suivants sont gardés
	const guardChain = (node: MathNode, first: boolean): MathNode => {
		if (node.type === 'multiplication') {
			return { ...node, left: guardChain(node.left, first), right: guardChain(node.right, false) };
		}
		return !first && NON_COEFFICIENT_FACTORS.has(node.type) ? hide(node) : node;
	};

	// `+1x` est lu (+1)·x : le + porte en fait sur tout le produit, + (1·x)
	const leadingPositive = (node: MathNode): MathNode | null => {
		if (node.type === 'positive') return node.operand;
		if (node.type !== 'multiplication') return null;
		const left = leadingPositive(node.left);
		return left === null ? null : { ...node, left };
	};

	// Numérateur et dénominateur : nettoyés pour eux-mêmes, puis protégés (leur signe,
	// même celui d'un coefficient `-1x`, ne sort pas de la fraction)
	const guardFractionPart = (node: MathNode): MathNode => {
		store.push(cleanCoefficientsAst(node));
		return variable(`${PROTECTED_PREFIX}${store.length - 1}`);
	};

	return mapNodeTopDown(ast, (node) => {
		if (node.type === 'function' || node.type === 'positive') return hide(node);
		if (node.type === 'multiplication') {
			const unsigned = leadingPositive(node);
			return unsigned === null ? guardChain(node, true) : hide(positive(unsigned));
		}
		if (node.type === 'division') {
			return {
				...node,
				numerator: guardFractionPart(node.numerator),
				denominator: guardFractionPart(node.denominator)
			};
		}
		return node;
	});
}

/** Contenu d'une parenthèse qui, nettoyé, n'a plus besoin d'elle : une lettre ou un nombre */
const ATOMIC_TYPES: ReadonlySet<MathNode['type']> = new Set([
	'number',
	'variable',
	'greek',
	'constant'
]);

/** Dernier facteur d'une chaîne de produit (`2·x·C` → `C`) */
function lastFactor(node: MathNode): MathNode {
	return node.type === 'multiplication' ? lastFactor(node.right) : node;
}

/**
 * `(x+0)` devenu `(x)` : la parenthèse ne sert plus, `x`. Restent :
 * - la notation fonctionnelle `C(x)` (facteur précédent : une lettre ou une fonction) ;
 * - un nombre en facteur non premier (`2(3)` ne devient pas `2 3`) ;
 * - toute autre délimitation (valeur absolue, crochets).
 */
function withoutAtomicParentheses(ast: MathNode): MathNode {
	const kept = new WeakSet<MathNode>();
	return mapNodeTopDown(ast, (node) => {
		if (node.type === 'multiplication' && node.right.type === 'delimiter') {
			const previous = lastFactor(node.left).type;
			if (
				previous === 'variable' ||
				previous === 'function' ||
				node.right.content.type === 'number'
			) {
				kept.add(node.right);
			}
		}
		if (
			node.type === 'delimiter' &&
			node.delimiters === 'parentheses' &&
			ATOMIC_TYPES.has(node.content.type) &&
			!kept.has(node)
		) {
			return node.content;
		}
		return node;
	});
}

/** Remet les morceaux protégés à leur place */
function restore(ast: MathNode, store: readonly MathNode[]): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'variable' || !node.name.startsWith(PROTECTED_PREFIX)) return node;
		return store[Number(node.name.slice(PROTECTED_PREFIX.length))] ?? node;
	});
}

/**
 * Nettoie les coefficients d'une formule. Rend le MÊME nœud quand rien ne change ou
 * qu'une garde refuse le résultat : l'appelant garde alors le texte d'origine.
 */
export function cleanCoefficientsAst(ast: MathNode): MathNode {
	try {
		// Chaîne de calcul (`a = b = c`) : chaque terme écrit est une étape voulue
		if (countNodes(ast, 'relation') >= 2) return ast;
		const store: MathNode[] = [];
		let current = protect(ast, store);
		for (const step of coefficientCleanupSteps()) current = step.transform(current);
		const cleaned = withoutAtomicParentheses(restore(current, store));

		// Rien n'a changé à l'écriture : la formule d'origine
		if (toLatex(cleaned) === toLatex(ast)) return ast;
		// Une case perdue (`0×?` → `0`) décalerait la numérotation des cases
		if (countNodes(cleaned, 'hole') !== countNodes(ast, 'hole')) return ast;
		// `x - (-3) = x + 3` → `x + 3 = x + 3` : le calcul montré disparaîtrait
		if (isTautology(cleaned) && !isTautology(ast)) return ast;
		// Garde de valeur : chaque étape est sûre, on le vérifie quand même
		if (!keepsValue(ast, cleaned)) return ast;
		return cleaned;
	} catch {
		return ast;
	}
}

/**
 * Formule nettoyée réécrite en syntaxe maison, lisible aussi par le parseur LaTeX du
 * validateur (qui lit la réponse attendue) ; `toCustom` écrit la constante e `e`, comme
 * l'auteur. Garde : le texte doit se relire en la MÊME formule (`1\\pi x` donnait
 * `\\pix`) ; sinon `null`.
 */
function readableCustom(
	cleaned: MathNode,
	genericFunctions?: GenericFunctionConfig
): string | null {
	const text = toCustom(cleaned);
	const reread = parseCustomSafe(text, { genericFunctions });
	return reread.ast && toLatex(reread.ast) === toLatex(cleaned) ? text : null;
}

/**
 * Réponse attendue en syntaxe maison (`1x-1y+0=0` → `x-y=0`), ou inégalité écrite en
 * LaTeX (`x^2+1x\\leqslant 2` → `x^2 + x \\leqslant 2`, rendue en LaTeX). Formule
 * illisible ou déjà propre : le texte d'origine, à l'octet près.
 */
export function cleanCoefficientsCustom(
	source: string,
	genericFunctions?: GenericFunctionConfig
): string {
	if (source.trim() === '') return source;
	try {
		const parsed = parseCustomSafe(source.trim(), { genericFunctions });
		if (parsed.ast) {
			const cleaned = cleanCoefficientsAst(parsed.ast);
			if (cleaned === parsed.ast) return source;
			return readableCustom(cleaned, genericFunctions) ?? source;
		}
		// Inégalité écrite en LaTeX (`x^2+1x\\leqslant 2`) : relue en syntaxe maison pour être
		// nettoyée, et rendue en LaTeX comme l'auteur l'a écrite (`x^2 + x \\leqslant 2`)
		const custom = latexRelationsToCustom(source.trim());
		if (custom === source.trim()) return source;
		const relation = parseCustomSafe(custom, { genericFunctions });
		if (!relation.ast) return source;
		const cleaned = cleanCoefficientsAst(relation.ast);
		return cleaned === relation.ast ? source : toLatex(cleaned);
	} catch {
		return source;
	}
}
