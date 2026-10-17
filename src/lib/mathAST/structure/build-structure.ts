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
import { decimalPointToComma } from '../decimal-comma';
import { divide, func, multiply } from '../factory';
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
import { figureNameRefusal } from '../common/segment-names';
import { parseLatexSafe } from '../parser';
import type { CapitalPairs, ParseResult } from '../parser/types';
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
import { MARKER_PREFIX, markLatex } from './markers';
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

/** Options de `structureFromLatex` */
export interface StructureOptions {
	/**
	 * Sens de deux majuscules collées (`AB`) : longueur ou produit. Absent : le
	 * défaut du parseur (produit, décision Q-M).
	 */
	readonly capitalPairs?: CapitalPairs;
}

// Constantes
const EMPTY: StructureResult = { status: 'empty' };
const UNRECOGNIZED: StructureResult = { status: 'unrecognized' };
/** Un seul marqueur qui enveloppe tout : `\class{ubs-n<id>}{<contenu>}` */
/** Délimiteur fermant extensible ou de partie entière, à la fin d'une écriture */
const CLOSING_DELIMITER_AT_END = /\\(?:right(?:[)\]|]|\\\|)|rfloor|rceil)$/;
const MARKED_BLOCK = new RegExp(`^\\\\class\\{${MARKER_PREFIX}(\\d+)\\}\\{([\\s\\S]*)\\}$`);
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
 * lecture, case vide `\placeholder{}`) rend `unrecognized`. Une exception de
 * `buildStructure` (défaut du module) est signalée par `console.error`.
 * En mode longueur, un nom de figure (`ABC`) rend `figureName` et son message.
 */
export function structureFromLatex(input: string, options?: StructureOptions): StructureResult {
	if (input.trim() === '') return EMPTY;
	let parsed: ParseResult;
	try {
		// Sans option, l'appel d'avant (parseur dans son mode par défaut)
		parsed = options?.capitalPairs
			? parseLatexSafe(input, { capitalPairs: options.capitalPairs })
			: parseLatexSafe(input);
	} catch {
		// Plafonds de sécurité du parseur : une saisie, pas un défaut
		return UNRECOGNIZED;
	}
	if (parsed.errors.length > 0) return UNRECOGNIZED;
	if (!parsed.ast) return EMPTY;
	if (findFirst(parsed.ast, isHole)) return UNRECOGNIZED;
	const refusal = figureNameRefusal(parsed.ast);
	if (refusal) return { status: 'figureName', message: refusal };
	try {
		return { status: 'ok', structure: buildStructure(parsed.ast) };
	} catch (error) {
		// Un défaut du module, pas de la saisie : signalé, mais la page (publique,
		// élèves) reste en vie au lieu de casser sur une expression lue
		console.error('[structure] buildStructure a échoué sur', input, error);
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

	/**
	 * `(…)²`, `|…|²`, `⌊…⌋²` : l'exposant s'écrit dans le marqueur de la base,
	 * accroché au délimiteur fermant comme dans l'écriture usuelle. Hors du
	 * marqueur, la base est un groupe et MathLive place l'exposant d'après le
	 * dernier caractère avant le délimiteur : `(−½ + x)²` avait son exposant trop
	 * bas (66 px de haut au lieu de 73). Le LaTeX de la base (`drafts`) n'en
	 * change pas ; son cadre ne compte que ses descendants (`StructureFormula`).
	 * `null` : la base ne finit pas par un délimiteur fermant.
	 */
	function superscriptInsideParentheses(base: string, exponent: string): string | null {
		const match = MARKED_BLOCK.exec(base);
		if (!match || !CLOSING_DELIMITER_AT_END.test(match[2])) return null;
		return markLatex(Number(match[1]), `${match[2]}^{${exponent}}`);
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
			case 'segmentLength':
				// Un bloc, comme une lettre : `AB` ne se découpe pas en A et B
				return leaf(n, parent, role, 'length');
			case 'addition':
			case 'subtraction':
			case 'opposite':
				return buildSum(n, parent, role);
			case 'multiplication':
			case 'division': {
				// « − » en tête sans parenthèses : il porte sur tout le produit ou le
				// quotient (décision de David, 2026-10-11 : `−3x` = `−(3x)`)
				const unsigned = withoutLeadingOpposite(n);
				if (unsigned) {
					const id = register(parent, role, n, { kind: 'opposite' });
					return mark(id, `-${build(unsigned, id, 'operand')}`);
				}
				return n.type === 'multiplication'
					? buildProduct(n, parent, role)
					: buildQuotient(n, parent, role);
			}
			case 'delimiter':
				return buildParentheses(n, parent, role);
			case 'superscript': {
				// Angle en degrés (`90^\circ`) : un bloc, pas une puissance
				if (n.superscript.type === 'symbol' && n.superscript.symbol === 'circ') {
					return leaf(n, parent, role, 'other');
				}
				const id = register(parent, role, n, { kind: 'power' });
				const base = wrapIf(build(n.base, id, 'base'), needsParenthesesAsPowerBase(n.base));
				const exponent = build(n.superscript, id, 'exponent');
				// Pas d'accolades autour de la base : `{x}^{2}` est un atome ordinaire, qui
				// supprime l'espace autour d'un `+` voisin (mesuré : −0,46 em pour `x^2 + 1`)
				return mark(id, superscriptInsideParentheses(base, exponent) ?? `${base}^{${exponent}}`);
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

	function buildQuotient(
		n: DivisionNode,
		parent: number | null,
		role: StructureRole | null
	): string {
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

	function buildParentheses(
		n: DelimiterNode,
		parent: number | null,
		role: StructureRole | null
	): string {
		// Intervalle, ensemble, vecteur… : un bloc
		if (n.semantic && n.semantic !== 'grouping') return leaf(n, parent, role, 'other');
		const id = register(parent, role, n, { kind: 'parentheses' });
		const [open, close] = n.shape === 'square' ? ['\\left[', '\\right]'] : ['\\left(', '\\right)'];
		return mark(id, `${open} ${build(n.content, id, 'content')} ${close}`);
	}

	function buildFunction(
		n: FunctionNode,
		parent: number | null,
		role: StructureRole | null
	): string {
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

	function buildRelation(
		n: RelationNode,
		parent: number | null,
		role: StructureRole | null
	): string {
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

	// Décimaux à la française à l'affichage (`2{,}5`) ; l'AST garde le point. Les
	// marqueurs (`\class{ubs-n12}{…}`) n'ont jamais `chiffre.chiffre`.
	const latex = decimalPointToComma(build(expression, null, null));
	const nodes: StructureNode[] = drafts.map(({ info, id, parent, role, ast, children, latex }) => ({
		...info,
		id,
		parent,
		role,
		ast,
		children,
		latex: decimalPointToComma(latex)
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
	// Coefficient négatif en tête (`−3x² + 2`, `−6 ÷ 3 + 1`) : le « − » va à la
	// somme (Q2), le terme est `3x²`. Ailleurs, toLatex parenthèse le facteur : `2 + (−3)x` reste.
	const unsigned = leading ? withoutLeadingOpposite(node) : null;
	if (unsigned) {
		out.push({ sign: flipSign(sign), term: unsigned, wrapped: false });
		return;
	}
	out.push({ sign, term: node, wrapped: false });
}

/**
 * Produit ou quotient en ligne qui commence par un opposé sans parenthèses
 * (`(−3)·x²`, forme du parseur pour `-3x^2` ; `(−6) ÷ 3`) : le même sans ce
 * signe, ou `null`. Le « − » porte alors sur le tout (décision de David,
 * 2026-10-11). Seulement si l'écriture est inchangée (`-` + toLatex du nouveau
 * nœud = toLatex du nœud) : le séparateur d'un produit implicite dépend de son
 * facteur de gauche.
 */
function withoutLeadingOpposite(node: MathNode): MathNode | null {
	if (node.type !== 'multiplication' && !isInlineDivision(node)) return null;
	const stripped = stripLeftmostOpposite(node);
	if (!stripped || `-${toLatex(stripped)}` !== toLatex(node)) return null;
	return stripped;
}

function stripLeftmostOpposite(node: MathNode): MathNode | null {
	if (node.type === 'opposite') {
		return needsParenthesesUnderOpposite(node.operand) ? null : node.operand;
	}
	if (node.type === 'division' && isInlineDivision(node) && !binaryOperandWraps(node)?.left) {
		const numerator = stripLeftmostOpposite(node.numerator);
		return numerator ? divide(numerator, node.denominator, node.displayStyle) : null;
	}
	if (node.type !== 'multiplication' || binaryOperandWraps(node)?.left) return null;
	const left = stripLeftmostOpposite(node.left);
	return left ? multiply(left, node.right, node.displayStyle) : null;
}

/** `6 ÷ 3`, `6 / 3` : le quotient s'écrit en ligne (une fraction ne commence pas par un signe) */
function isInlineDivision(node: MathNode): boolean {
	return node.type === 'division' && node.displayStyle !== 'fraction';
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
