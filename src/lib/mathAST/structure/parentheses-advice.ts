/**
 * Structure d'une expression — règle « 6e ou avant »
 * ==================================================
 *
 * L'enchaînement d'additions et de soustractions et les nombres relatifs
 * arrivent en 5e. Avant, l'élève écrit les parenthèses : une suite comme
 * `5 − 3 + x` ou un « − » en tête (`−3 + x`) demande un message, et la page
 * masque la structure et la lecture tant qu'il est là.
 * Spécification : `docs/wip/structure-expression-progress.md`, section C.
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
 *   écritures parenthésées proposées ;
 * - `leading-minus` : « − » sans parenthèses devant un nombre ou une lettre (C2,
 *   Q21) ; un exemple quand il commence une somme, `null` ailleurs (Q22).
 * `node` : la sous-expression visée.
 */
export type ParenthesesAdvice =
	| {
			readonly reason: 'chain';
			readonly node: number;
			readonly proposals: readonly [string, string];
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
const MINUS_SIGN_TEXT = "Le signe − devant un nombre ou une lettre s'apprend en 5e";

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
			if (node.signs[0] === '-') return leadingMinusInSum(structure, node);
			if (isChain(node)) return chainAdvice(structure, node);
		} else if (node.kind === 'opposite' && !isParenthesized(structure, node)) {
			return leadingMinusAdvice(node.id, null);
		}
	}
	return null;
}

/** 3 termes ou plus, dont un soustrait (`10 − 2 − 3` compte : C1) */
function isChain(sum: SumStructureNode): boolean {
	return sum.signs.length >= 3 && sum.signs.slice(1).includes('-');
}

/** (5 − 3) + x ou 5 − (3 + x) ; au-delà de 3 termes, tout à gauche ou tout à droite */
function chainAdvice(structure: ExpressionStructure, sum: SumStructureNode): ParenthesesAdvice {
	const terms = writtenTerms(structure, sum);
	const operator = (i: number) => (sum.signs[i] === '-' ? ' - ' : ' + ');

	let leftFirst = terms[0];
	for (let i = 1; i < terms.length; i++) {
		const grouped = `${leftFirst}${operator(i)}${terms[i]}`;
		leftFirst = i === terms.length - 1 ? grouped : `\\left( ${grouped} \\right)`;
	}

	let rightFirst = terms[terms.length - 1];
	for (let i = terms.length - 2; i >= 0; i--) {
		const grouped = `${terms[i]}${operator(i + 1)}${rightFirst}`;
		rightFirst = i === 0 ? grouped : `\\left( ${grouped} \\right)`;
	}

	return {
		reason: 'chain',
		node: sum.id,
		proposals: [leftFirst, rightFirst],
		segments: [
			{
				kind: 'text',
				text: `Ajoute des parenthèses pour montrer ce que tu calcules d'abord${NBSP}: `
			},
			{ kind: 'formula', latex: leftFirst },
			{ kind: 'text', text: ' ou ' },
			{ kind: 'formula', latex: rightFirst },
			{ kind: 'text', text: `${NBSP}?` }
		]
	};
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
