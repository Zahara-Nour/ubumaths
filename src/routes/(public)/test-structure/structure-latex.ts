/**
 * LaTeX structuré d'une expression — page de démonstration `/test-structure`
 * ==========================================================================
 *
 * Écrit une expression `mathAST` en LaTeX en enveloppant chaque nœud de sa
 * structure dans `\class{ubs-n<id>}{…}`. MathLive rend un `<span>` par marqueur,
 * imbriqués comme l'arbre, sans changer la mise en page (mesuré le 2026-10-11 ;
 * `\htmlData` décalait `2\sin x`). Au survol, l'élément le plus proche portant
 * un marqueur est le plus petit nœud sous le pointeur.
 *
 * La structure montrée est celle de l'élève, pas l'arbre binaire du parseur :
 * une somme est une somme de n termes, un produit un produit de n facteurs
 * (`flatten.ts`), les parenthèses appartiennent au facteur qu'elles entourent.
 */
import {
	flattenProductShallow,
	flattenRelationChain,
	flattenSumShallow
} from '$lib/mathAST/flatten';
import { toLatex } from '$lib/mathAST/latex-generator';
import type { MathNode, RelationType } from '$lib/mathAST/types';
import { needsParenthesesAsPowerBase } from '$lib/mathAST/common/sign-parentheses';

// Types
export interface StructureInfo {
	readonly id: number;
	readonly parent: number | null;
	/** Nom du nœud : « Somme de 3 termes », « Nombre »… */
	readonly label: string;
	/** Rôle dans le parent : « terme », « facteur », « numérateur »… */
	readonly role: string | null;
	/** Nombre, lettre : sans sous-structure */
	readonly isLeaf: boolean;
	/** LaTeX du nœud (avec les marqueurs de ses descendants, sans effet sur le rendu) */
	readonly latex: string;
}

export interface StructuredLatex {
	readonly latex: string;
	readonly nodes: readonly StructureInfo[];
}

export interface StructureOptions {
	/**
	 * Somme algébrique : le signe appartient au terme (`5 − 3 + x` a pour termes
	 * `5`, `−3`, `x`). Sinon le signe appartient à la somme, le terme est `3`.
	 */
	readonly signInTerm: boolean;
}

// Constantes
export const MARKER_PREFIX = 'ubs-n';

const RELATIONS: Partial<Record<RelationType, { latex: string; label: string }>> = {
	'=': { latex: '=', label: 'Égalité' },
	'<': { latex: '<', label: 'Inégalité' },
	'>': { latex: '>', label: 'Inégalité' },
	'<=': { latex: '\\leqslant', label: 'Inégalité' },
	'>=': { latex: '\\geqslant', label: 'Inégalité' },
	'!=': { latex: '\\neq', label: 'Différence (≠)' },
	'≈': { latex: '\\approx', label: 'Valeur approchée' }
};

// Fonctions
/** Écrit `node` en LaTeX structuré, avec la table de ses nœuds. */
export function structuredLatex(node: MathNode, options: StructureOptions): StructuredLatex {
	const nodes: { -readonly [K in keyof StructureInfo]: StructureInfo[K] }[] = [];

	function register(
		parent: number | null,
		role: string | null,
		label: string,
		isLeaf: boolean
	): number {
		const id = nodes.length;
		nodes.push({ id, parent, role, label, isLeaf, latex: '' });
		return id;
	}

	function mark(id: number, latex: string): string {
		nodes[id].latex = latex;
		return `\\class{${MARKER_PREFIX}${id}}{${latex}}`;
	}

	function leaf(n: MathNode, parent: number | null, role: string | null, label: string): string {
		return mark(register(parent, role, label, true), toLatex(n));
	}

	function build(n: MathNode, parent: number | null, role: string | null): string {
		switch (n.type) {
			case 'number':
				return leaf(n, parent, role, 'Nombre');
			case 'variable':
				return leaf(n, parent, role, 'Lettre');
			case 'greek':
				return leaf(n, parent, role, 'Lettre grecque');
			case 'constant':
				return leaf(n, parent, role, 'Constante');

			case 'addition':
			case 'subtraction':
			case 'opposite':
			case 'positive':
				return buildSum(n, parent, role);

			case 'multiplication':
				return buildProduct(n, parent, role);

			case 'division': {
				const isFraction = n.displayStyle === 'fraction';
				const id = register(parent, role, isFraction ? 'Quotient (fraction)' : 'Quotient', false);
				const num = build(n.numerator, id, isFraction ? 'numérateur' : 'dividende');
				const den = build(n.denominator, id, isFraction ? 'dénominateur' : 'diviseur');
				if (isFraction) return mark(id, `\\dfrac{${num}}{${den}}`);
				return mark(id, `${num} ${n.displayStyle === 'ratio' ? ':' : '/'} ${den}`);
			}

			case 'delimiter': {
				if (n.semantic && n.semantic !== 'grouping') return leaf(n, parent, role, 'Expression');
				const id = register(parent, role, 'Expression entre parenthèses', false);
				const [open, close] =
					n.shape === 'square' ? ['\\left[', '\\right]'] : ['\\left(', '\\right)'];
				return mark(id, `${open} ${build(n.content, id, 'contenu des parenthèses')} ${close}`);
			}

			case 'superscript': {
				const id = register(parent, role, 'Puissance', false);
				let base = build(n.base, id, 'base');
				if (needsParenthesesAsPowerBase(n.base)) base = `\\left( ${base} \\right)`;
				// Pas d'accolades autour de la base : `{x}^{2}` est un atome ordinaire, qui
				// supprime l'espace autour d'un `+` voisin (mesuré : −0,46 em pour `x^2 + 1`)
				return mark(id, `${base}^{${build(n.superscript, id, 'exposant')}}`);
			}

			case 'function': {
				if (n.name === 'sqrt' && n.args.length === 1 && !n.power && !n.derivativeOrder) {
					const id = register(parent, role, n.base ? 'Racine' : 'Racine carrée', false);
					const radicand = build(n.args[0], id, 'radicande');
					const index = n.base ? `[${build(n.base, id, 'indice')}]` : '';
					return mark(id, `\\sqrt${index}{${radicand}}`);
				}
				return leaf(n, parent, role, `Fonction ${n.name}`);
			}

			case 'relation': {
				const chain = flattenRelationChain(n);
				const symbols = chain.relations.map((r) => RELATIONS[r]);
				if (symbols.some((s) => !s)) return leaf(n, parent, role, 'Relation');
				const label = chain.operands.length === 2 ? symbols[0]!.label : 'Encadrement';
				const id = register(parent, role, label, false);
				const sides = chain.operands.length === 2 ? ['membre de gauche', 'membre de droite'] : null;
				const parts = chain.operands.map((operand, i) =>
					build(operand, id, sides ? sides[i] : 'membre')
				);
				const latex = parts.reduce((acc, part, i) => `${acc} ${symbols[i - 1]!.latex} ${part}`);
				return mark(id, latex);
			}

			default:
				// Le reste (fonctions, unités, limites…) : un bloc, sans sous-structure
				return leaf(n, parent, role, 'Expression');
		}
	}

	function buildSum(n: MathNode, parent: number | null, role: string | null): string {
		const terms = flattenSumShallow(n);

		// Un seul terme : opposé (`−x`) ou `+x`
		if (terms.length === 1) {
			const [{ sign, term }] = terms;
			if (sign === '+') return build(term, parent, role);
			const id = register(parent, role, 'Opposé', false);
			return mark(id, `-${build(term, id, 'opposé de')}`);
		}

		const allPlus = terms.every((t) => t.sign === '+');
		const label = allPlus
			? `Somme de ${terms.length} termes`
			: terms.length === 2 && terms[0].sign === '+'
				? 'Différence de deux termes'
				: `Somme algébrique de ${terms.length} termes`;
		const id = register(parent, role, label, false);

		const parts = terms.map(({ sign, term }, i) => {
			if (options.signInTerm) {
				// Le signe « − » est dans le marqueur du terme ; le « + » reste à la somme
				if (sign === '-') {
					const termId = register(id, 'terme', 'Opposé', false);
					return `${i === 0 ? '' : ' '}${mark(termId, `-${build(term, termId, 'opposé de')}`)}`;
				}
				return `${i === 0 ? '' : ' + '}${build(term, id, 'terme')}`;
			}
			const operator = i === 0 ? (sign === '-' ? '-' : '') : sign === '-' ? ' - ' : ' + ';
			return `${operator}${build(term, id, 'terme')}`;
		});
		return mark(id, parts.join(''));
	}

	function buildProduct(n: MathNode, parent: number | null, role: string | null): string {
		const factors = flattenProductShallow(n);
		const id = register(parent, role, `Produit de ${factors.length} facteurs`, false);
		const parts = factors.map(({ style, factor }, i) => {
			const latex = build(factor, id, 'facteur');
			if (i === 0) return latex;
			switch (style) {
				case 'dot':
					return ` \\cdot ${latex}`;
				case 'cross':
					return ` \\times ${latex}`;
				case 'star':
					return ` * ${latex}`;
				case 'implicit':
					// Deux nombres juxtaposés s'écrivent avec « × » (comme toLatex)
					return factor.type === 'number' ? ` \\times ${latex}` : ` ${latex}`;
			}
		});
		return mark(id, parts.join(''));
	}

	const latex = build(node, null, null);
	return { latex, nodes };
}

/** Identifiant du nœud porté par un élément rendu, ou `null`. */
export function markerId(element: Element): number | null {
	for (const c of element.classList) {
		if (c.startsWith(MARKER_PREFIX)) {
			const id = Number(c.slice(MARKER_PREFIX.length));
			if (Number.isInteger(id)) return id;
		}
	}
	return null;
}
