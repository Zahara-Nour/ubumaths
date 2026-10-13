/**
 * Structure d'une expression — règle « 6e ou avant »
 * ==================================================
 *
 * L'enchaînement d'additions et de soustractions et les nombres relatifs
 * arrivent en 5e. Avant, l'élève écrit les parenthèses : une suite comme
 * `5 − 3 + x` ou un « − » en tête (`−3 + x`) demande un message, et la page
 * masque la structure et la lecture tant qu'il est là.
 * Spécification : `docs/systeme/mathast/structure-expression.md`, section C.
 *
 * `parenthesesAdvice` ne connaît pas le niveau : la page l'appelle seulement si
 * `needsParenthesesAdvice` (`$lib/lexicon/parentheses-advice-grade`) le dit.
 */
import { markLatex, stripMarkers } from './markers';
import type { ExpressionStructure, StructureNode, SumStructureNode } from './types';

// Types
/** Morceau de message : du texte, ou une formule à rendre */
export type AdviceSegment =
	| { readonly kind: 'text'; readonly text: string }
	| { readonly kind: 'formula'; readonly latex: string };

/**
 * - `chain` : suite de 3 termes ou plus avec une soustraction (C1) ; deux
 *   écritures parenthésées proposées pour 3 termes, `null` au-delà (Q24) ;
 * - `leading-minus` : « − » sans parenthèses devant un nombre, une lettre ou une longueur (C2,
 *   Q21) ; un exemple quand il commence une somme, `null` ailleurs (Q22) ;
 *   devant une parenthèse écrite : texte à part, jamais d'exemple (Q23).
 * `node` : la sous-expression visée.
 */
export type ParenthesesAdvice =
	| {
			readonly reason: 'chain';
			readonly node: number;
			readonly proposals: readonly [string, string] | null;
			readonly segments: readonly AdviceSegment[];
	  }
	| {
			readonly reason: 'leading-minus';
			readonly node: number;
			readonly example: string | null;
			readonly segments: readonly AdviceSegment[];
	  };

// Constantes
const NBSP = ' ';
const MINUS_SIGN_TEXT = "Le signe − devant un nombre, une lettre ou une longueur s'apprend en 5e";
const MINUS_PARENTHESES_TEXT = "Le signe − devant une parenthèse s'apprend en 5e.";
const CHAIN_TEXT = "Ajoute des parenthèses pour montrer ce que tu calcules d'abord";

// Fonctions
/**
 * Message pour un élève de 6e ou avant, ou `null`. Toute sous-expression est
 * examinée, de l'extérieur vers l'intérieur puis de gauche à droite ; la
 * première qui pose problème donne le message (un seul à la fois : l'élève
 * corrige, le suivant apparaît).
 */
export function parenthesesAdvice(structure: ExpressionStructure): ParenthesesAdvice | null {
	for (const node of structure.nodes) {
		if (node.kind === 'sum' || node.kind === 'difference') {
			if (node.signs[0] === '-') {
				return startsWithParentheses(structure, structure.nodes[node.children[0]])
					? minusBeforeParenthesesAdvice(node.id)
					: leadingMinusInSum(structure, node);
			}
			if (isChain(node)) return chainAdvice(structure, node);
		} else if (node.kind === 'opposite' && !isParenthesized(structure, node)) {
			return startsWithParentheses(structure, structure.nodes[node.children[0]])
				? minusBeforeParenthesesAdvice(node.id)
				: leadingMinusAdvice(node.id, null);
		}
	}
	return null;
}

/** 3 termes ou plus, dont un soustrait (`10 − 2 − 3` compte : C1) */
function isChain(sum: SumStructureNode): boolean {
	return sum.signs.length >= 3 && sum.signs.slice(1).includes('-');
}

/** 3 termes : (5 − 3) + x ou 5 − (3 + x) ; au-delà, le message seul (Q24) */
function chainAdvice(structure: ExpressionStructure, sum: SumStructureNode): ParenthesesAdvice {
	if (sum.signs.length > 3) {
		return {
			reason: 'chain',
			node: sum.id,
			proposals: null,
			segments: [{ kind: 'text', text: `${CHAIN_TEXT}.` }]
		};
	}
	const [first, second, third] = writtenTerms(structure, sum);
	const operator = (i: number) => (sum.signs[i] === '-' ? ' - ' : ' + ');
	const leftFirst = `\\left( ${first}${operator(1)}${second} \\right)${operator(2)}${third}`;
	const rightFirst = `${first}${operator(1)}\\left( ${second}${operator(2)}${third} \\right)`;
	return {
		reason: 'chain',
		node: sum.id,
		proposals: [leftFirst, rightFirst],
		segments: [
			{ kind: 'text', text: `${CHAIN_TEXT}${NBSP}: ` },
			{ kind: 'formula', latex: leftFirst },
			{ kind: 'text', text: ' ou ' },
			{ kind: 'formula', latex: rightFirst },
			{ kind: 'text', text: `${NBSP}?` }
		]
	};
}

/** « − » juste devant une parenthèse écrite : `−(3 + 2)`, `−(2 + x) × 3`, `−(x + 1)²` (Q23) */
function minusBeforeParenthesesAdvice(node: number): ParenthesesAdvice {
	return {
		reason: 'leading-minus',
		node,
		example: null,
		segments: [{ kind: 'text', text: MINUS_PARENTHESES_TEXT }]
	};
}

/**
 * La sous-expression s'écrit-elle en commençant par une parenthèse écrite ?
 * On descend par la gauche : premier facteur, dividende, base d'une puissance.
 * Une fraction commence par sa barre, pas par son numérateur.
 */
function startsWithParentheses(structure: ExpressionStructure, node: StructureNode): boolean {
	if (node.kind === 'parentheses') return true;
	if (node.kind !== 'product' && node.kind !== 'quotient' && node.kind !== 'power') return false;
	const first = structure.nodes[node.children[0]];
	return first.role !== 'numerator' && startsWithParentheses(structure, first);
}

/** `−3 + x` → exemple `(−3) + x` : le premier terme et son signe entre parenthèses */
function leadingMinusInSum(
	structure: ExpressionStructure,
	sum: SumStructureNode
): ParenthesesAdvice {
	const terms = writtenTerms(structure, sum);
	const example = terms
		.map((term, i) =>
			i === 0 ? `\\left( -${term} \\right)` : `${sum.signs[i] === '-' ? ' - ' : ' + '}${term}`
		)
		.join('');
	return leadingMinusAdvice(sum.id, example);
}

/** Avec un exemple si le « − » commence une somme, sans exemple ailleurs (Q22) */
function leadingMinusAdvice(node: number, example: string | null): ParenthesesAdvice {
	const segments: AdviceSegment[] =
		example === null
			? [{ kind: 'text', text: `${MINUS_SIGN_TEXT}.` }]
			: [
					{
						kind: 'text',
						text: `${MINUS_SIGN_TEXT}${NBSP}: écris-le entre parenthèses, par exemple `
					},
					{ kind: 'formula', latex: example },
					{ kind: 'text', text: '.' }
				];
	return { reason: 'leading-minus', node, example, segments };
}

/**
 * Termes d'une somme tels qu'écrits, sans leur signe et sans marqueurs : avec
 * les parenthèses que `toLatex` pose hors du marqueur : ce sont celles que
 * l'élève voit dans la formule, même s'il ne les a pas écrites.
 */
function writtenTerms(structure: ExpressionStructure, sum: SumStructureNode): string[] {
	return sum.children.map((id) => {
		const term = structure.nodes[id];
		const latex = stripMarkers(term.latex);
		return isWrappedBy(sum, term) ? `\\left( ${latex} \\right)` : latex;
	});
}

/**
 * Parenthèses ÉCRITES par l'élève. Celles que `toLatex` pose à l'affichage
 * (`3\times-2` montré `3 × (−2)`) ne comptent pas : le « − » a été tapé sans
 * elles (Q21).
 */
function isParenthesized(structure: ExpressionStructure, node: StructureNode): boolean {
	return node.parent !== null && structure.nodes[node.parent].kind === 'parentheses';
}

/** Le LaTeX du parent écrit l'enfant entre des parenthèses hors de son marqueur */
function isWrappedBy(parent: StructureNode, child: StructureNode): boolean {
	return parent.latex.includes(`\\left( ${markLatex(child.id, child.latex)} \\right)`);
}
