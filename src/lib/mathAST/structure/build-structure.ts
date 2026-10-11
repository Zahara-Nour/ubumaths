/**
 * Structure d'une expression — construction
 * =========================================
 *
 * Construit, depuis un AST, l'arbre de structure vu par l'élève et le LaTeX
 * marqué qui permet d'encadrer une sous-expression au survol.
 *
 * ⚠️ **Le rendu ne doit pas bouger** : une fois les marqueurs retirés, le LaTeX
 * marqué est celui de `toLatex` (à `x^{2}` ≡ `x^2` près). Les parenthèses que
 * `toLatex` ajoute de lui-même (deux signes qui se suivraient, somme sous un
 * signe…) sont décidées par SES règles (`binaryOperandWraps`,
 * `needsParenthesesUnderOpposite`, `needsParenthesesAsPowerBase`) et posées
 * hors du marqueur de la sous-expression, comme une parenthèse écrite.
 *
 * C'est pourquoi les sommes et les produits sont aplatis ici plutôt que par
 * `flattenSumShallow` / `flattenProductShallow` : ceux-ci traversent un opposé
 * ou un produit là où `toLatex` pose des parenthèses (`a + (−b)` deviendrait
 * `a − b` à l'écran). Les signes restent ceux de `flatten.ts` (`Sign`, `flipSign`).
 *
 * Règles d'écriture mesurées (démo du 2026-10-11) : `\class`, jamais
 * `\htmlData` ; jamais `{base}^{…}` (accolades autour de la base) mais
 * `base^{…}`.
 */
import { func } from '../factory';
import { flattenRelationChain, flipSign, type Sign } from '../flatten';
import { isHole } from '../guards';
import {
	binaryOperandWraps,
	juxtaposesDigits,
	juxtaposesQuantities,
	RELATION_MAP,
	toLatex,
	withoutScientificNumbers
} from '../latex-generator';
import { parseLatexSafe } from '../parser';
import { findFirst } from '../transforms';
import type {
	DelimiterNode,
	DivisionNode,
	FunctionNode,
	MathNode,
	MultiplicationNode,
	RelationNode,
	RelationType
} from '../types';
import {
	needsParenthesesAsPowerBase,
	needsParenthesesUnderOpposite
} from '../common/sign-parentheses';
import { markLatex } from './markers';
import type {
	ExpressionStructure,
	StructureKind,
	StructureNode,
	StructureResult,
	StructureRole
} from './types';

// Types
/** Ce qui distingue les genres : signes d'une somme, symboles d'une relation */
type KindInfo =
	| { readonly kind: 'sum' | 'difference'; readonly signs: readonly Sign[] }
	| { readonly kind: 'relation'; readonly relations: readonly RelationType[] }
	| { readonly kind: Exclude<StructureKind, 'sum' | 'difference' | 'relation'> };

interface Draft {
	readonly info: KindInfo;
	readonly id: number;
	readonly parent: number | null;
	readonly role: StructureRole | null;
	readonly ast: MathNode;
	readonly children: number[];
	latex: string;
}

/** Terme d'une somme aplatie ; `wrapped` : `toLatex` l'écrit entre parenthèses */
interface CollectedTerm {
	readonly sign: Sign;
	readonly term: MathNode;
	readonly wrapped: boolean;
}

/** Facteur d'un produit aplati, avec le signe d'opération écrit avant lui */
interface CollectedFactor {
	readonly factor: MathNode;
	readonly wrapped: boolean;
	readonly separator: string;
}

// Constantes
const EMPTY: StructureResult = { status: 'empty' };
const UNRECOGNIZED: StructureResult = { status: 'unrecognized' };
/** Valeur absolue, parties entières : l'argument entre ses barres ou crochets */
const ENCLOSING_FUNCTIONS: Partial<Record<string, readonly [string, string]>> = {
	abs: ['\\left|', '\\right|'],
	floor: ['\\lfloor', '\\rfloor'],
	ceil: ['\\lceil', '\\rceil']
};

// Fonctions
/**
 * Structure d'une expression saisie en LaTeX (MathLive). Ne lève pas : une
 * saisie vide rend `empty`, une saisie non reconnue ou incomplète (erreur de
 * lecture, case vide `\placeholder{}`) rend `unrecognized`.
 */
export function structureFromLatex(input: string): StructureResult {
	if (input.trim() === '') return EMPTY;
	try {
		const parsed = parseLatexSafe(input);
		if (parsed.errors.length > 0) return UNRECOGNIZED;
		if (!parsed.ast) return EMPTY;
		if (findFirst(parsed.ast, isHole)) return UNRECOGNIZED;
		return { status: 'ok', structure: buildStructure(parsed.ast) };
	} catch {
		// Plafonds de sécurité du parseur, nœud inattendu : rien à montrer
		return UNRECOGNIZED;
	}
}

/** Arbre de structure et LaTeX marqué d'un AST */
export function buildStructure(input: MathNode): ExpressionStructure {
	// Même forme écrite que toLatex (notation scientifique développée)
	const expression = withoutScientificNumbers(input);
	const drafts: Draft[] = [];

	function register(
		parent: number | null,
		role: StructureRole | null,
		ast: MathNode,
		info: KindInfo
	): number {
		const id = drafts.length;
		drafts.push({ info, id, parent, role, ast, children: [], latex: '' });
		if (parent !== null) drafts[parent].children.push(id);
		return id;
	}

	function mark(id: number, latex: string): string {
		drafts[id].latex = latex;
		return markLatex(id, latex);
	}

	function leaf(
		n: MathNode,
		parent: number | null,
		role: StructureRole | null,
		kind: Exclude<StructureKind, 'sum' | 'difference' | 'relation'>
	): string {
		return mark(register(parent, role, n, { kind }), toLatex(n));
	}

	function build(n: MathNode, parent: number | null, role: StructureRole | null): string {
		switch (n.type) {
			case 'number':
				return leaf(n, parent, role, 'number');
			case 'variable':
			case 'greek':
				return leaf(n, parent, role, 'letter');
			case 'constant':
				return leaf(n, parent, role, 'constant');
			case 'addition':
			case 'subtraction':
			case 'opposite':
				return buildSum(n, parent, role);
			case 'multiplication':
				return buildProduct(n, parent, role);
			case 'division':
				return buildQuotient(n, parent, role);
			case 'delimiter':
				return buildParentheses(n, parent, role);
			case 'superscript': {
				const id = register(parent, role, n, { kind: 'power' });
				const base = wrapIf(build(n.base, id, 'base'), needsParenthesesAsPowerBase(n.base));
				// Pas d'accolades autour de la base : `{x}^{2}` est un atome ordinaire, qui
				// supprime l'espace autour d'un `+` voisin (mesuré : −0,46 em pour `x^2 + 1`)
				return mark(id, `${base}^{${build(n.superscript, id, 'exponent')}}`);
			}
			case 'function':
				return buildFunction(n, parent, role);
			case 'relation':
				return buildRelation(n, parent, role);
			default:
				// `+x`, grandeur, indice, limite, matrice… : un bloc sans sous-structure
				return leaf(n, parent, role, 'other');
		}
	}

	function buildSum(n: MathNode, parent: number | null, role: StructureRole | null): string {
		const terms: CollectedTerm[] = [];
		collectTerms(n, '+', true, terms);

		if (terms.length === 1) {
			const [{ sign, term, wrapped }] = terms;
			if (sign === '+') return build(term, parent, role);
			const id = register(parent, role, n, { kind: 'opposite' });
			return mark(id, `-${wrapIf(build(term, id, 'operand'), wrapped)}`);
		}

		const isDifference = terms.length === 2 && terms[0].sign === '+' && terms[1].sign === '-';
		const id = register(parent, role, n, {
			kind: isDifference ? 'difference' : 'sum',
			signs: terms.map((t) => t.sign)
		});
		// Le signe est écrit hors du marqueur du terme : il appartient à la somme
		const parts = terms.map(({ sign, term, wrapped }, i) => {
			const operator = i === 0 ? (sign === '-' ? '-' : '') : sign === '-' ? ' - ' : ' + ';
			return `${operator}${wrapIf(build(term, id, 'term'), wrapped)}`;
		});
		return mark(id, parts.join(''));
	}

	function buildProduct(
		n: MultiplicationNode,
		parent: number | null,
		role: StructureRole | null
	): string {
		const factors: CollectedFactor[] = [];
		collectFactors(n, '', factors);
		const id = register(parent, role, n, { kind: 'product' });
		const parts = factors.map(
			({ factor, wrapped, separator }) =>
				`${separator}${wrapIf(build(factor, id, 'factor'), wrapped)}`
		);
		return mark(id, parts.join(''));
	}

	function buildQuotient(n: DivisionNode, parent: number | null, role: StructureRole | null) {
		const id = register(parent, role, n, { kind: 'quotient' });
		if (n.displayStyle === 'fraction') {
			const numerator = build(n.numerator, id, 'numerator');
			const denominator = build(n.denominator, id, 'denominator');
			return mark(id, `\\dfrac{${numerator}}{${denominator}}`);
		}
		const wraps = binaryOperandWraps(n);
		const dividend = wrapIf(build(n.numerator, id, 'dividend'), wraps?.left ?? false);
		const divisor = wrapIf(build(n.denominator, id, 'divisor'), wraps?.right ?? false);
		return mark(id, `${dividend} ${n.displayStyle === 'ratio' ? ':' : '/'} ${divisor}`);
	}

	function buildParentheses(n: DelimiterNode, parent: number | null, role: StructureRole | null) {
		// Intervalle, ensemble, vecteur… : un bloc
		if (n.semantic && n.semantic !== 'grouping') return leaf(n, parent, role, 'other');
		const id = register(parent, role, n, { kind: 'parentheses' });
		const [open, close] = n.shape === 'square' ? ['\\left[', '\\right]'] : ['\\left(', '\\right)'];
		return mark(id, `${open} ${build(n.content, id, 'content')} ${close}`);
	}

	function buildFunction(n: FunctionNode, parent: number | null, role: StructureRole | null) {
		const single = n.args.length === 1 && !n.power && !n.base;

		// Valeur absolue, partie entière : l'argument entre ses barres ou crochets
		const enclosing = single ? ENCLOSING_FUNCTIONS[n.name] : undefined;
		if (enclosing) {
			const id = register(parent, role, n, { kind: 'function' });
			return mark(id, `${enclosing[0]} ${build(n.args[0], id, 'argument')} ${enclosing[1]}`);
		}

		// Racines : mêmes conditions que toLatex
		if (n.name === 'sqrt' && n.args.length === 1 && !n.power) {
			const id = register(parent, role, n, { kind: 'root' });
			const radicand = build(n.args[0], id, 'radicand');
			const index = n.base ? `[${build(n.base, id, 'index')}]` : '';
			return mark(id, `\\sqrt${index}{${radicand}}`);
		}
		if (n.name === 'cbrt' && single) {
			const id = register(parent, role, n, { kind: 'root' });
			return mark(id, `\\sqrt[3]{${build(n.args[0], id, 'radicand')}}`);
		}
		if (n.name === 'root' && n.args.length === 2 && !n.power && !n.base) {
			const id = register(parent, role, n, { kind: 'root' });
			const radicand = build(n.args[0], id, 'radicand');
			return mark(id, `\\sqrt[${build(n.args[1], id, 'index')}]{${radicand}}`);
		}

		// Factorielle `n!`, coefficient binomial : un bloc
		if (isPlainFactorialOrBinom(n)) return leaf(n, parent, role, 'other');

		// Fonction sans argument (`f'`, `f^{-1}`) : un bloc
		if (n.args.length === 0) return leaf(n, parent, role, 'function');

		// Fonction appliquée : le nom (avec puissance, base, dérivée) est écrit par
		// toLatex, les arguments sont explorables (A8)
		const id = register(parent, role, n, { kind: 'function' });
		const head = toLatex(
			func(n.name, [], {
				power: n.power,
				base: n.base,
				derivativeOrder: n.derivativeOrder,
				isInverse: n.isInverse
			})
		);
		const args = n.args.map((arg) => build(arg, id, 'argument')).join(', ');
		return mark(id, `${head}\\left( ${args} \\right)`);
	}

	function buildRelation(n: RelationNode, parent: number | null, role: StructureRole | null) {
		const chain = flattenRelationChain(n);
		const id = register(parent, role, n, { kind: 'relation', relations: chain.relations });
		const twoSides = chain.operands.length === 2;
		const parts = chain.operands.map((operand, i) =>
			build(operand, id, twoSides ? (i === 0 ? 'left-side' : 'right-side') : 'side')
		);
		const latex = parts.reduce(
			(acc, part, i) => `${acc} ${RELATION_MAP[chain.relations[i - 1]]} ${part}`
		);
		return mark(id, latex);
	}

	const latex = build(expression, null, null);
	const nodes: StructureNode[] = drafts.map(({ info, id, parent, role, ast, children, latex }) => ({
		...info,
		id,
		parent,
		role,
		ast,
		children,
		latex
	}));
	return { latex, nodes, root: 0 };
}

/**
 * Aplatit une somme. Un opposé n'est absorbé (signe « − » à la somme) qu'en tête
 * de la somme : ailleurs, `toLatex` l'écrit entre parenthèses (`a + (−b)`) ou
 * tel quel, et il reste un terme.
 */
function collectTerms(node: MathNode, sign: Sign, leading: boolean, out: CollectedTerm[]) {
	if (node.type === 'addition' || node.type === 'subtraction') {
		const wraps = binaryOperandWraps(node);
		if (wraps?.left) out.push({ sign, term: node.left, wrapped: true });
		else collectTerms(node.left, sign, leading, out);
		const rightSign = node.type === 'subtraction' ? flipSign(sign) : sign;
		if (wraps?.right) out.push({ sign: rightSign, term: node.right, wrapped: true });
		else collectTerms(node.right, rightSign, false, out);
		return;
	}
	if (node.type === 'opposite' && leading) {
		out.push({
			sign: flipSign(sign),
			term: node.operand,
			wrapped: needsParenthesesUnderOpposite(node.operand)
		});
		return;
	}
	out.push({ sign, term: node, wrapped: false });
}

/** Aplatit un produit, avec le signe d'opération que `toLatex` écrit entre deux facteurs */
function collectFactors(node: MultiplicationNode, separator: string, out: CollectedFactor[]) {
	const wraps = binaryOperandWraps(node);
	pushFactor(node.left, wraps?.left ?? false, separator, out);
	pushFactor(node.right, wraps?.right ?? false, multiplicationSeparator(node), out);
}

function pushFactor(factor: MathNode, wrapped: boolean, separator: string, out: CollectedFactor[]) {
	if (!wrapped && factor.type === 'multiplication') collectFactors(factor, separator, out);
	else out.push({ factor, wrapped, separator });
}

/** Même choix que `LatexGenerator.generateMultiplication` */
function multiplicationSeparator(node: MultiplicationNode): string {
	switch (node.displayStyle) {
		case 'implicit':
			if (juxtaposesDigits(node)) return ' \\times ';
			return juxtaposesQuantities(node) ? '~' : ' ';
		case 'dot':
			return ' \\cdot ';
		case 'cross':
			return ' \\times ';
		case 'star':
			return ' * ';
	}
}

function isPlainFactorialOrBinom(node: FunctionNode): boolean {
	const plain = !node.power && !node.base && !node.derivativeOrder && !node.isInverse;
	return (
		plain &&
		((node.name === 'factorial' && node.args.length === 1) ||
			(node.name === 'binom' && node.args.length === 2))
	);
}

function wrapIf(latex: string, wrapped: boolean): string {
	return wrapped ? `\\left( ${latex} \\right)` : latex;
}
