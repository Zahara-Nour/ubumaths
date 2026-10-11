/**
 * Structure d'une expression — adaptateur de la page `/test-structure`
 * =====================================================================
 *
 * La structure (arbre des sous-expressions, LaTeX marqué `\class{ubs-n<id>}{…}`)
 * vient de `$lib/mathAST/structure`. Ce fichier n'ajoute que les intitulés
 * provisoires du panneau, en attendant la lecture en français (lot 2).
 */
import {
	markerIdFromClasses,
	structureFromLatex,
	type ExpressionStructure,
	type StructureNode,
	type StructureRole
} from '$lib/mathAST/structure';
import type { RelationType } from '$lib/mathAST/types';

export { MARKER_PREFIX } from '$lib/mathAST/structure';

// Types
export interface StructureInfo {
	readonly id: number;
	readonly parent: number | null;
	/** Nom de la sous-expression : « Somme de 3 termes », « Nombre »… */
	readonly label: string;
	/** Rôle dans la sous-expression qui la contient : « terme », « facteur »… */
	readonly role: string | null;
	/** Nombre, lettre : sans sous-structure */
	readonly isLeaf: boolean;
	/** LaTeX de la sous-expression (avec les marqueurs de ses descendants) */
	readonly latex: string;
}

export interface StructuredLatex {
	readonly latex: string;
	readonly nodes: readonly StructureInfo[];
}

export type DemoStructure =
	| { readonly status: 'empty' }
	| { readonly status: 'unrecognized' }
	| { readonly status: 'ok'; readonly structure: StructuredLatex };

// Constantes
const ROLE_LABELS: Record<StructureRole, string> = {
	term: 'terme',
	factor: 'facteur',
	numerator: 'numérateur',
	denominator: 'dénominateur',
	dividend: 'dividende',
	divisor: 'diviseur',
	operand: 'opposé de',
	base: 'base',
	exponent: 'exposant',
	radicand: 'radicande',
	index: 'indice',
	argument: 'argument',
	content: 'contenu des parenthèses',
	'left-side': 'membre de gauche',
	'right-side': 'membre de droite',
	side: 'membre'
};

const RELATION_LABELS: Partial<Record<RelationType, string>> = {
	'=': 'Égalité',
	'<': 'Inégalité',
	'>': 'Inégalité',
	'<=': 'Inégalité',
	'>=': 'Inégalité',
	'!=': 'Différence (≠)',
	'≈': 'Valeur approchée'
};

// Fonctions
/** Structure de la saisie, avec les intitulés du panneau */
export function demoStructure(latex: string): DemoStructure {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') return result;
	const { structure } = result;
	return {
		status: 'ok',
		structure: {
			latex: structure.latex,
			nodes: structure.nodes.map((node) => ({
				id: node.id,
				parent: node.parent,
				label: labelOf(node, structure),
				role: node.role === null ? null : ROLE_LABELS[node.role],
				isLeaf: node.children.length === 0,
				latex: node.latex
			}))
		}
	};
}

/** Identifiant de la sous-expression portée par un élément rendu, ou `null` */
export function markerId(element: Element): number | null {
	return markerIdFromClasses(element.classList);
}

function labelOf(node: StructureNode, structure: ExpressionStructure): string {
	const count = node.children.length;
	switch (node.kind) {
		case 'sum':
			return node.signs.every((s) => s === '+')
				? `Somme de ${count} termes`
				: `Somme algébrique de ${count} termes`;
		case 'difference':
			return 'Différence de deux termes';
		case 'product':
			return `Produit de ${count} facteurs`;
		case 'quotient':
			return node.ast.type === 'division' && node.ast.displayStyle === 'fraction'
				? 'Quotient (fraction)'
				: 'Quotient';
		case 'opposite':
			return 'Opposé';
		case 'power':
			return 'Puissance';
		case 'root':
			return node.children.some((id) => structure.nodes[id].role === 'index')
				? 'Racine'
				: 'Racine carrée';
		case 'function':
			return node.ast.type === 'function' ? `Fonction ${node.ast.name}` : 'Fonction';
		case 'parentheses':
			return 'Expression entre parenthèses';
		case 'relation':
			return node.relations.length > 1
				? 'Encadrement'
				: (RELATION_LABELS[node.relations[0]] ?? 'Relation');
		case 'number':
			return 'Nombre';
		case 'letter':
			return node.ast.type === 'greek' ? 'Lettre grecque' : 'Lettre';
		case 'constant':
			return 'Constante';
		case 'other':
			return 'Expression';
	}
}
