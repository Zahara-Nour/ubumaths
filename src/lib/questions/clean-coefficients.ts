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
 * - la valeur ne change pas (`areEquivalent`), aucune case `?` ne disparaît ;
 * - formule illisible, exception, ou rien à nettoyer : la formule d'origine.
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
import { variable } from '$lib/mathAST/factory';

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

// Fonctions

/** Nombre de cases `?` d'une formule */
function countHoles(ast: MathNode): number {
	let holes = 0;
	mapNode(ast, (node) => {
		if (node.type === 'hole') holes++;
		return node;
	});
	return holes;
}

/**
 * Remplace les morceaux protégés par des feuilles opaques (rangées dans `store`) :
 * aucune étape cosmétique ne voit à travers une variable inconnue.
 */
function protect(ast: MathNode, store: MathNode[]): MathNode {
	const hide = (node: MathNode): MathNode => {
		// Parenthèse protégée : son contenu est nettoyé pour lui-même (`2(1x+0)` → `2(x)`)
		const kept =
			node.type === 'delimiter' ? { ...node, content: cleanCoefficientsAst(node.content) } : node;
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

	return mapNodeTopDown(ast, (node) => {
		if (node.type === 'function') return hide(node);
		if (node.type === 'multiplication') return guardChain(node, true);
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
		const store: MathNode[] = [];
		let current = protect(ast, store);
		for (const step of coefficientCleanupSteps()) current = step.transform(current);
		const cleaned = restore(current, store);

		// Rien n'a changé à l'écriture : la formule d'origine
		if (toLatex(cleaned) === toLatex(ast)) return ast;
		// Une case perdue (`0×?` → `0`) décalerait la numérotation des cases
		if (countHoles(cleaned) !== countHoles(ast)) return ast;
		// Garde de valeur : chaque étape est sûre, on le vérifie quand même
		if (!areEquivalent(ast, cleaned)) return ast;
		return cleaned;
	} catch {
		return ast;
	}
}

/**
 * Réponse attendue en syntaxe maison (`1x-1y+0=0` → `x-y=0`). Formule illisible ou
 * déjà propre : le texte d'origine, à l'octet près.
 */
export function cleanCoefficientsCustom(
	source: string,
	genericFunctions?: GenericFunctionConfig
): string {
	if (source.trim() === '') return source;
	try {
		const parsed = parseCustomSafe(source.trim(), { genericFunctions });
		if (!parsed.ast) return source;
		const cleaned = cleanCoefficientsAst(parsed.ast);
		return cleaned === parsed.ast ? source : toCustom(cleaned);
	} catch {
		return source;
	}
}
