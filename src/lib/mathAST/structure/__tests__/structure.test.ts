/**
 * Structure d'une expression — arbre et LaTeX marqué (lot 1)
 * =========================================================
 *
 * Spécification : `docs/systeme/mathast/structure-expression.md` (cas A2-A9, A12-A13).
 * Deux familles de tests :
 * - l'ARBRE : genres, enfants, rôles, signes des termes ;
 * - le LaTeX MARQUÉ : une fois les `\class{ubs-n<id>}{…}` retirés, il redonne
 *   `toLatex` de l'expression (le rendu ne doit pas bouger), et les marqueurs
 *   sont imbriqués comme l'arbre.
 *
 * Entrées PARSÉES (invariant 4 du module), coefficients ≠ 1.
 */
import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { add, multiply, number, opposite, subtract, variable } from '../../factory';
import type { MathNode } from '../../types';
import {
	ancestors,
	buildStructure,
	markerIdFromClasses,
	MARKER_PREFIX,
	stripMarkers,
	structureFromLatex,
	type ExpressionStructure,
	type StructureNode
} from '..';

// Fonctions
function structureOf(latex: string): ExpressionStructure {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') throw new Error(`${latex} : ${result.status}`);
	return result.structure;
}

function root(structure: ExpressionStructure): StructureNode {
	return structure.nodes[structure.root];
}

function childrenOf(structure: ExpressionStructure, node: StructureNode): StructureNode[] {
	return node.children.map((id) => structure.nodes[id]);
}

/** Écriture lisible des enfants : `number:5`, `letter:x`, `product`… */
function describeChildren(structure: ExpressionStructure, node: StructureNode): string[] {
	return childrenOf(structure, node).map((child) =>
		child.children.length === 0 ? `${child.kind}:${stripMarkers(child.latex)}` : child.kind
	);
}

/**
 * `x^{2}` et `x^2` se rendent à l'identique ; le marqueur d'un exposant exige
 * les accolades. On les retire là où `toLatex` ne les met pas (un caractère,
 * une commande seule).
 */
function unbrace(latex: string): string {
	return latex.replace(/([\^_])\{([^{}\\]|\\[a-zA-Z]+)\}/g, '$1$2');
}

/** Parents lus dans l'imbrication des marqueurs : id → id du marqueur englobant */
/**
 * Le marqueur qui enveloppe celui de `node` : son parent, sauf l'exposant d'une
 * base qui finit par un délimiteur (`(x + 1)²`, `|x|²`), logé dans le marqueur de
 * sa base pour que MathLive le place comme dans l'écriture usuelle.
 */
function markerParentOf(structure: ExpressionStructure, node: StructureNode): number | null {
	if (node.role !== 'exponent' || node.parent === null) return node.parent;
	const base = structure.nodes[structure.nodes[node.parent].children[0]];
	return /\\(?:right(?:[)\]|]|\\\|)|rfloor|rceil)$/.test(stripMarkers(base.latex))
		? base.id
		: node.parent;
}

function markerParents(latex: string): Map<number, number | null> {
	const parents = new Map<number, number | null>();
	const stack: (number | null)[] = [];
	const open = new RegExp(`^\\\\class\\{${MARKER_PREFIX}(\\d+)\\}\\{`);
	let i = 0;
	while (i < latex.length) {
		const match = open.exec(latex.slice(i));
		if (match) {
			const id = Number(match[1]);
			const enclosing = [...stack].reverse().find((s) => s !== null) ?? null;
			parents.set(id, enclosing);
			stack.push(id);
			i += match[0].length;
		} else if (latex[i] === '\\') {
			// Commande ou caractère échappé (`\{`) : ne compte pas comme accolade
			i += 2;
		} else if (latex[i] === '{') {
			stack.push(null);
			i++;
		} else if (latex[i] === '}') {
			stack.pop();
			i++;
		} else {
			i++;
		}
	}
	return parents;
}

function expectFaithful(ast: MathNode) {
	const structure = buildStructure(ast);
	// Le rendu de l'expression entière ne bouge pas
	expect(unbrace(stripMarkers(structure.latex))).toBe(unbrace(toLatex(ast)));
	// Un marqueur par sous-expression, imbriqués comme l'arbre
	const parents = markerParents(structure.latex);
	expect(parents.size).toBe(structure.nodes.length);
	for (const node of structure.nodes) {
		expect(parents.get(node.id)).toBe(markerParentOf(structure, node));
		// Chaque sous-expression s'écrit comme `toLatex` l'écrirait seule
		expect(unbrace(stripMarkers(node.latex))).toBe(unbrace(toLatex(node.ast)));
		for (const child of node.children) expect(structure.nodes[child].parent).toBe(node.id);
	}
}

// Constantes
/** Les 9 exemples de la démo validée par David */
const DEMO_EXAMPLES = [
	String.raw`\left(\sqrt{3}+6a\right)\times\frac{2}{7}`,
	String.raw`2+3\times4`,
	'5-3+x',
	'2x-(3-x)',
	'3(x+2)^2',
	String.raw`\frac{2x+1}{3}-\frac{x}{2}`,
	'2x+3=7',
	String.raw`-4\times(5-x)^2+1`,
	String.raw`\sqrt{x^2+1}`
];

/** Cas de la spécification et voisins */
const SPEC_EXAMPLES = [
	'5-3+x',
	'2+3+4',
	'6a',
	String.raw`\sin(2x+1)`,
	String.raw`2\sin x`,
	'f(x)',
	String.raw`\ln x`,
	'2x+3=7',
	'1<x<3',
	String.raw`x\leq 3`,
	'7-3',
	'-3+x',
	'-3y+2x',
	String.raw`5\times 4\times 3`,
	String.raw`5\cdot 2a`,
	String.raw`6\div 3`,
	String.raw`5\div(2+x)`,
	'5/(2+x)',
	'x^{-1}',
	'2x^3',
	'(2+x)^2',
	'-2a',
	'-(2+x)',
	'5-(3+x)',
	'10-2-3',
	String.raw`\sqrt[3]{8}`,
	'|x-3|',
	"f'(x)",
	String.raw`\sin^2(x)`,
	'e^{2x}',
	String.raw`\pi r^2`,
	String.raw`x^2\times3`,
	String.raw`\left[x-1\right]^2`,
	'-3x^2+2',
	String.raw`y=-\frac{1}{2}x+3`,
	'2+(-3)x',
	'-3x',
	String.raw`-6\div3+1`,
	String.raw`-6\div3`,
	String.raw`-\frac{1}{2}x`,
	'-4(5-x)^2',
	'(-3)x',
	String.raw`90^\circ`,
	String.raw`x+30^\circ`
];

describe('LaTeX marqué : le rendu ne bouge pas', () => {
	it.each([...DEMO_EXAMPLES, ...SPEC_EXAMPLES])('%s', (latex) => {
		expectFaithful(parseLatex(latex));
	});

	// Arbres construits en interne (sans délimiteurs) : toLatex ajoute des
	// parenthèses, la structure doit les écrire au même endroit
	it.each<[string, MathNode]>([
		['a − (−3)', subtract(variable('a'), opposite(number('3')))],
		['a + (−3)', add(variable('a'), opposite(number('3')))],
		['−(x + 2)', opposite(add(variable('x'), number('2')))],
		['−(−5)', opposite(opposite(number('5')))],
		['2 × (−3)', multiply(number('2'), opposite(number('3')), 'cross')],
		['(x + 1) y', multiply(add(variable('x'), number('1')), variable('y'), 'implicit')],
		['3 · 4 implicite', multiply(number('3'), number('4'), 'implicit')],
		['a + (b + c)', add(variable('a'), add(variable('b'), variable('c')))],
		['a + (−b + c)', add(variable('a'), add(opposite(variable('b')), variable('c')))]
	])('%s', (_label, ast) => {
		expectFaithful(ast);
	});

	it("l'exposant s'écrit `base^{…}`, jamais avec des accolades autour de la base", () => {
		const { latex } = structureOf('3x^2+1');
		expect(latex).not.toMatch(/\}\}\^/);
		expect(latex).toMatch(/\\class\{ubs-n\d+\}\{x\}\^\{\\class\{ubs-n\d+\}\{2\}\}/);
	});

	it('marque avec `\\class`, jamais `\\htmlData`', () => {
		const { latex } = structureOf('2x+3=7');
		expect(latex).toContain(String.raw`\class{${MARKER_PREFIX}`);
		expect(latex).not.toContain('htmlData');
	});
});

describe('somme (A2-A4) : aplatie, le signe appartient à la somme', () => {
	it('A2/A3 — 5 − 3 + x : trois termes, le « − » est dans le marqueur de la somme', () => {
		const structure = structureOf('5-3+x');
		const sum = root(structure);
		expect(sum.kind).toBe('sum');
		expect(describeChildren(structure, sum)).toEqual(['number:5', 'number:3', 'letter:x']);
		expect(sum.kind === 'sum' && sum.signs).toEqual(['+', '-', '+']);
		expect(childrenOf(structure, sum).map((c) => c.role)).toEqual(['term', 'term', 'term']);
		// Le terme est `3`, pas `−3` : le signe reste hors des marqueurs des termes
		expect(sum.latex).toBe(String.raw`\class{ubs-n1}{5} - \class{ubs-n2}{3} + \class{ubs-n3}{x}`);
	});

	it('A4 — 2 + 3 + 4 : une seule somme de trois termes (pas 2 + 3)', () => {
		const structure = structureOf('2+3+4');
		const sum = root(structure);
		expect(sum.kind).toBe('sum');
		expect(describeChildren(structure, sum)).toEqual(['number:2', 'number:3', 'number:4']);
		expect(structure.nodes).toHaveLength(4);
	});

	it('7 − 3 : une différence (deux termes, le second soustrait)', () => {
		const structure = structureOf('7-3');
		const node = root(structure);
		expect(node.kind).toBe('difference');
		expect(node.kind === 'difference' && node.signs).toEqual(['+', '-']);
		expect(describeChildren(structure, node)).toEqual(['number:7', 'number:3']);
	});

	it('−3 + x : une somme dont le premier terme est soustrait (B5 : « la somme de −3 et x »)', () => {
		const structure = structureOf('-3+x');
		const sum = root(structure);
		expect(sum.kind).toBe('sum');
		expect(sum.kind === 'sum' && sum.signs).toEqual(['-', '+']);
		expect(describeChildren(structure, sum)).toEqual(['number:3', 'letter:x']);
	});

	it('10 − 2 − 3 : une somme de trois termes, deux soustraits', () => {
		const structure = structureOf('10-2-3');
		const sum = root(structure);
		expect(sum.kind).toBe('sum');
		expect(sum.kind === 'sum' && sum.signs).toEqual(['+', '-', '-']);
	});

	it('5 − (3 + x) : le second terme est la sous-expression parenthésée', () => {
		const structure = structureOf('5-(3+x)');
		const node = root(structure);
		expect(node.kind).toBe('difference');
		expect(describeChildren(structure, node)).toEqual(['number:5', 'parentheses']);
	});

	it('−4 × (5 − x)² + 1 : le « − » du coefficient va à la somme, le terme est 4 × (5 − x)²', () => {
		const structure = structureOf(String.raw`-4\times(5-x)^2+1`);
		const sum = root(structure);
		expect(sum.kind).toBe('sum');
		expect(sum.kind === 'sum' && sum.signs).toEqual(['-', '+']);
		expect(describeChildren(structure, sum)).toEqual(['product', 'number:1']);
		const product = childrenOf(structure, sum)[0];
		expect(describeChildren(structure, product)).toEqual(['number:4', 'power']);
		const power = childrenOf(structure, product)[1];
		expect(describeChildren(structure, power)).toEqual(['parentheses', 'number:2']);
		expect(childrenOf(structure, power).map((c) => c.role)).toEqual(['base', 'exponent']);
	});

	it('−3x² + 2 : signes −, + ; termes 3x² et 2 ; le « − » est hors du marqueur du terme', () => {
		const structure = structureOf('-3x^2+2');
		const sum = root(structure);
		expect(sum.kind).toBe('sum');
		expect(sum.kind === 'sum' && sum.signs).toEqual(['-', '+']);
		expect(describeChildren(structure, sum)).toEqual(['product', 'number:2']);
		const product = childrenOf(structure, sum)[0];
		expect(describeChildren(structure, product)).toEqual(['number:3', 'power']);
		expect(sum.latex.startsWith(String.raw`-\class{`)).toBe(true);
	});

	it('−x² + 2 : signes −, + ; termes x² et 2', () => {
		const structure = structureOf('-x^2+2');
		const sum = root(structure);
		expect(sum.kind === 'sum' && sum.signs).toEqual(['-', '+']);
		expect(describeChildren(structure, sum)).toEqual(['power', 'number:2']);
	});

	it('y = −½x + 3 : le membre de droite est une somme de signes −, +', () => {
		const structure = structureOf(String.raw`y=-\frac{1}{2}x+3`);
		const right = childrenOf(structure, root(structure))[1];
		expect(right.kind).toBe('sum');
		expect(right.kind === 'sum' && right.signs).toEqual(['-', '+']);
		const product = childrenOf(structure, right)[0];
		expect(describeChildren(structure, product)).toEqual(['quotient', 'letter:x']);
	});

	it('2 + (−3)x : parenthèses visibles, le facteur reste (−3)', () => {
		const structure = structureOf('2+(-3)x');
		const sum = root(structure);
		expect(sum.kind === 'sum' && sum.signs).toEqual(['+', '+']);
		const product = childrenOf(structure, sum)[1];
		expect(describeChildren(structure, product)).toEqual(['parentheses', 'letter:x']);
	});

	// Décision de David (2026-10-11) : `−3x` équivaut à `−(3x)`, `−6 ÷ 3` à `−(6 ÷ 3)`
	it.each<[string, (s: ExpressionStructure) => StructureNode, string[]]>([
		['-3x', (s) => root(s), ['number:3', 'letter:x']],
		['-3x=6', (s) => childrenOf(s, root(s))[0], ['number:3', 'letter:x']],
		[String.raw`-\frac{1}{2}x`, (s) => root(s), ['quotient', 'letter:x']],
		[String.raw`-2\times5`, (s) => root(s), ['number:2', 'number:5']],
		['-4(5-x)^2', (s) => root(s), ['number:4', 'power']]
	])('hors somme, %s : opposé du produit entier', (latex, pick, factors) => {
		const structure = structureOf(latex);
		const node = pick(structure);
		expect(node.kind).toBe('opposite');
		expect(describeChildren(structure, node)).toEqual(['product']);
		const product = childrenOf(structure, node)[0];
		expect(product.role).toBe('operand');
		expect(describeChildren(structure, product)).toEqual(factors);
		// Le « − » est dans le marqueur de l'opposé, hors de celui du produit
		expect(node.latex.startsWith(String.raw`-\class{`)).toBe(true);
	});

	it('hors somme, −6 ÷ 3 : opposé du quotient', () => {
		const structure = structureOf(String.raw`-6\div3`);
		const node = root(structure);
		expect(node.kind).toBe('opposite');
		expect(describeChildren(structure, node)).toEqual(['quotient']);
		const quotient = childrenOf(structure, node)[0];
		expect(describeChildren(structure, quotient)).toEqual(['number:6', 'number:3']);
	});

	it('−6 ÷ 3 + 1 : signes −, + ; termes 6 ÷ 3 et 1', () => {
		const structure = structureOf(String.raw`-6\div3+1`);
		const sum = root(structure);
		expect(sum.kind === 'sum' && sum.signs).toEqual(['-', '+']);
		expect(describeChildren(structure, sum)).toEqual(['quotient', 'number:1']);
	});

	it.each<[string, string[]]>([
		['(-3)x', ['parentheses', 'letter:x']],
		[String.raw`2\times(-3)`, ['number:2', 'parentheses']]
	])('parenthèses visibles, %s : le facteur reste (−3)', (latex, factors) => {
		const structure = structureOf(latex);
		expect(root(structure).kind).toBe('product');
		expect(describeChildren(structure, root(structure))).toEqual(factors);
	});

	it('−3 seul : opposé de 3 ; −3² : opposé de 3²', () => {
		const alone = structureOf('-3');
		expect(root(alone).kind).toBe('opposite');
		expect(describeChildren(alone, root(alone))).toEqual(['number:3']);
		const square = structureOf('-3^2');
		expect(root(square).kind).toBe('opposite');
		expect(describeChildren(square, root(square))).toEqual(['power']);
	});
});

describe('opposé', () => {
	it('−(2 + x) : l’opposé de la sous-expression parenthésée', () => {
		const structure = structureOf('-(2+x)');
		const node = root(structure);
		expect(node.kind).toBe('opposite');
		expect(describeChildren(structure, node)).toEqual(['parentheses']);
		expect(childrenOf(structure, node)[0].role).toBe('operand');
	});
});

describe('produit (A5)', () => {
	it('A5 — 6a : un produit de deux facteurs, l’espace entre eux est au produit', () => {
		const structure = structureOf('6a');
		const product = root(structure);
		expect(product.kind).toBe('product');
		expect(describeChildren(structure, product)).toEqual(['number:6', 'letter:a']);
		expect(childrenOf(structure, product).map((c) => c.role)).toEqual(['factor', 'factor']);
		expect(product.latex).toBe(String.raw`\class{ubs-n1}{6} \class{ubs-n2}{a}`);
	});

	it('5 × 4 × 3 : un seul produit de trois facteurs', () => {
		const structure = structureOf(String.raw`5\times 4\times 3`);
		expect(describeChildren(structure, root(structure))).toEqual([
			'number:5',
			'number:4',
			'number:3'
		]);
	});

	it('2 + 3 × 4 : la somme de 2 et du produit', () => {
		const structure = structureOf(String.raw`2+3\times4`);
		expect(describeChildren(structure, root(structure))).toEqual(['number:2', 'product']);
	});
});

describe('parenthèses et quotients (A6-A7)', () => {
	it('A6 — (√3 + 6a) × 2/7 : la sous-expression parenthésée inclut ses parenthèses', () => {
		const structure = structureOf(String.raw`\left(\sqrt{3}+6a\right)\times\frac{2}{7}`);
		const product = root(structure);
		expect(describeChildren(structure, product)).toEqual(['parentheses', 'quotient']);
		const group = childrenOf(structure, product)[0];
		expect(group.latex.startsWith(String.raw`\left(`)).toBe(true);
		expect(group.latex.endsWith(String.raw`\right)`)).toBe(true);
		expect(describeChildren(structure, group)).toEqual(['sum']);
		expect(childrenOf(structure, group)[0].role).toBe('content');
		const sum = childrenOf(structure, group)[0];
		expect(describeChildren(structure, sum)).toEqual(['root', 'product']);
	});

	it('A7 — (2x + 1)/3 : numérateur et dénominateur sont des sous-expressions', () => {
		const structure = structureOf(String.raw`\frac{2x+1}{3}`);
		const quotient = root(structure);
		expect(quotient.kind).toBe('quotient');
		expect(describeChildren(structure, quotient)).toEqual(['sum', 'number:3']);
		expect(childrenOf(structure, quotient).map((c) => c.role)).toEqual([
			'numerator',
			'denominator'
		]);
	});

	it('6 ÷ 3 : quotient en ligne, dividende et diviseur', () => {
		const structure = structureOf(String.raw`6\div 3`);
		const quotient = root(structure);
		expect(quotient.kind).toBe('quotient');
		expect(childrenOf(structure, quotient).map((c) => c.role)).toEqual(['dividend', 'divisor']);
	});
});

describe('puissances et racines', () => {
	it('x⁻¹ : puissance dont l’exposant est l’opposé de 1', () => {
		const structure = structureOf('x^{-1}');
		const power = root(structure);
		expect(power.kind).toBe('power');
		expect(describeChildren(structure, power)).toEqual(['letter:x', 'opposite']);
	});

	it('2x³ : produit de 2 et de la puissance', () => {
		const structure = structureOf('2x^3');
		expect(describeChildren(structure, root(structure))).toEqual(['number:2', 'power']);
	});

	it('√(x² + 1) : racine carrée, radicande = la somme', () => {
		const structure = structureOf(String.raw`\sqrt{x^2+1}`);
		const node = root(structure);
		expect(node.kind).toBe('root');
		expect(describeChildren(structure, node)).toEqual(['sum']);
		expect(childrenOf(structure, node)[0].role).toBe('radicand');
	});

	it('∛8 : racine d’indice 3, l’indice est une sous-expression', () => {
		const structure = structureOf(String.raw`\sqrt[3]{8}`);
		const node = root(structure);
		expect(node.kind).toBe('root');
		expect(childrenOf(structure, node).map((c) => c.role)).toEqual(['radicand', 'index']);
	});
});

describe('angles en degrés', () => {
	it('90° : un bloc, pas une puissance', () => {
		const structure = structureOf(String.raw`90^\circ`);
		expect(root(structure).kind).toBe('other');
		expect(root(structure).children).toEqual([]);
	});

	it('x + 30° : le terme 30° est un bloc', () => {
		const structure = structureOf(String.raw`x+30^\circ`);
		expect(describeChildren(structure, root(structure))).toEqual([
			'letter:x',
			String.raw`other:30^\circ`
		]);
	});
});

describe('fonctions (A8)', () => {
	it('A8 — sin(2x + 1) : la fonction appliquée, son argument est explorable', () => {
		const structure = structureOf(String.raw`\sin(2x+1)`);
		const fn = root(structure);
		expect(fn.kind).toBe('function');
		expect(describeChildren(structure, fn)).toEqual(['sum']);
		const argument = childrenOf(structure, fn)[0];
		expect(argument.role).toBe('argument');
		expect(describeChildren(structure, argument)).toEqual(['product', 'number:1']);
		const product = childrenOf(structure, argument)[0];
		expect(describeChildren(structure, product)).toEqual(['number:2', 'letter:x']);
		// Le nom « sin » n'a pas de marqueur à lui : son survol encadre la fonction appliquée
		expect(fn.latex.startsWith(String.raw`\sin\left( \class{`)).toBe(true);
	});

	it('f(x) et ln x : fonctions appliquées à x', () => {
		for (const latex of ['f(x)', String.raw`\ln x`]) {
			const structure = structureOf(latex);
			const fn = root(structure);
			expect(fn.kind).toBe('function');
			expect(describeChildren(structure, fn)).toEqual(['letter:x']);
		}
	});

	it('2 sin x : produit de 2 et de la fonction appliquée', () => {
		const structure = structureOf(String.raw`2\sin x`);
		expect(describeChildren(structure, root(structure))).toEqual(['number:2', 'function']);
	});

	it('|x − 3| : la valeur absolue, son argument est explorable', () => {
		const structure = structureOf('|x-3|');
		const fn = root(structure);
		expect(fn.kind).toBe('function');
		expect(describeChildren(structure, fn)).toEqual(['difference']);
	});
});

describe('relations (A9)', () => {
	it('A9 — 2x + 3 = 7 : égalité, membres de gauche et de droite', () => {
		const structure = structureOf('2x+3=7');
		const relation = root(structure);
		expect(relation.kind).toBe('relation');
		expect(relation.kind === 'relation' && relation.relations).toEqual(['=']);
		expect(describeChildren(structure, relation)).toEqual(['sum', 'number:7']);
		expect(childrenOf(structure, relation).map((c) => c.role)).toEqual(['left-side', 'right-side']);
	});

	it('1 < x < 3 : un encadrement à trois membres', () => {
		const structure = structureOf('1<x<3');
		const relation = root(structure);
		expect(relation.kind === 'relation' && relation.relations).toEqual(['<', '<']);
		expect(childrenOf(structure, relation).map((c) => c.role)).toEqual(['side', 'side', 'side']);
	});
});

describe('expression vide ou non reconnue (A12-A13)', () => {
	it.each(['', '   '])('A12 — « %s » : rien', (latex) => {
		expect(structureFromLatex(latex)).toEqual({ status: 'empty' });
	});

	it.each(['2+', '(2+3', '2+3=', String.raw`\frac{\placeholder{}}{2}`])(
		'A13 — « %s » : non reconnue ou incomplète',
		(latex) => {
			expect(structureFromLatex(latex)).toEqual({ status: 'unrecognized' });
		}
	);
});

describe('outils', () => {
	it('ancestors : de la sous-expression à l’expression entière', () => {
		const structure = structureOf(String.raw`\sin(2x+1)`);
		const two = structure.nodes.find((n) => n.kind === 'number' && stripMarkers(n.latex) === '2');
		expect(two).toBeDefined();
		expect(ancestors(structure, two!.id).map((n) => n.kind)).toEqual([
			'number',
			'product',
			'sum',
			'function'
		]);
	});

	it('markerIdFromClasses : lit l’identifiant du marqueur parmi les classes', () => {
		expect(markerIdFromClasses(['ML__mathit', 'ubs-n12'])).toBe(12);
		expect(markerIdFromClasses(['ML__mathit'])).toBeNull();
	});

	it('la racine n’a ni parent ni rôle', () => {
		const structure = structureOf('6a');
		expect(root(structure).parent).toBeNull();
		expect(root(structure).role).toBeNull();
	});
});
