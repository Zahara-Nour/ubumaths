/**
 * Déplacer une partie dans son groupe (glisser-déposer)
 * =====================================================
 *
 * Spécification E de `docs/systeme/mathast/structure-expression.md` : où une
 * sous-expression peut se déplacer (E1, E3.7, E5), comment l'expression est
 * réécrite après un déplacement (E3, décisions G4 et G11), et la ligne écrite
 * pendant le glisser (espaces qui s'ouvrent, carte de la partie saisie).
 */
import { describe, expect, it } from 'vitest';
import {
	cardLatex,
	expressionLatex,
	groupLatex,
	movableGroupOf,
	movedLatex,
	stripMarkers,
	structureFromLatex,
	withoutPart,
	type ExpressionStructure,
	type MovableGroup,
	type RearrangeOptions
} from '..';

// Constantes
const PART_ROLES = new Set(['term', 'factor', 'left-side', 'right-side', 'side']);
const SIXTH_GRADE: RearrangeOptions = { beforeFifthGrade: true };

// Fonctions
function structureOf(latex: string): ExpressionStructure {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') throw new Error(`non reconnue : ${latex}`);
	return result.structure;
}

/** La sous-expression qui s'écrit `text` et joue un rôle de partie (terme, facteur, membre) */
function partId(structure: ExpressionStructure, text: string): number {
	const node = structure.nodes.find(
		(n) => n.role !== null && PART_ROLES.has(n.role) && stripMarkers(n.latex) === text
	);
	if (!node) throw new Error(`pas de partie « ${text} » dans ${stripMarkers(structure.latex)}`);
	return node.id;
}

/** La sous-expression qui s'écrit `text`, quel que soit son rôle */
function nodeId(structure: ExpressionStructure, text: string): number {
	const node = structure.nodes.find((n) => stripMarkers(n.latex) === text);
	if (!node) throw new Error(`pas de « ${text} » dans ${stripMarkers(structure.latex)}`);
	return node.id;
}

function groupOf(
	structure: ExpressionStructure,
	text: string,
	options?: RearrangeOptions
): MovableGroup {
	const group = movableGroupOf(structure, partId(structure, text), options);
	if (!group) throw new Error(`« ${text} » ne se déplace pas`);
	return group;
}

/** Pose la partie `text` en position `to` (0 : en tête) et rend l'expression sans marqueurs */
function move(latex: string, text: string, to: number, options?: RearrangeOptions): string {
	const structure = structureOf(latex);
	const group = groupOf(structure, text, options);
	const from = group.parts.findIndex((p) => stripMarkers(p.marked) === text);
	return stripMarkers(movedLatex(structure, group, from, to));
}

describe('movableGroupOf : où une sous-expression peut se déplacer (E1)', () => {
	it('un terme se déplace dans sa somme, signes compris', () => {
		const structure = structureOf('5-3+x');
		const group = groupOf(structure, '3');
		expect(group.kind).toBe('sum');
		expect(group.id).toBe(structure.root);
		expect(group.parts.map((p) => [p.sign, stripMarkers(p.marked)])).toEqual([
			['+', '5'],
			['-', '3'],
			['+', 'x']
		]);
	});

	it('un facteur se déplace dans son produit', () => {
		const group = groupOf(structureOf('2x+1'), 'x');
		expect(group.kind).toBe('product');
		expect(group.parts.map((p) => stripMarkers(p.marked))).toEqual(['2', 'x']);
	});

	it('un membre d’une égalité se déplace de l’autre côté du « = » (G2)', () => {
		const group = groupOf(structureOf('2x+3=7'), '7');
		expect(group.kind).toBe('equality');
		expect(group.parts.map((p) => stripMarkers(p.marked))).toEqual(['2 x + 3', '7']);
	});

	it('E1.2 : ni terme, ni facteur, ni membre → ne se déplace pas', () => {
		const structure = structureOf(String.raw`\frac{x+1}{3}+x^2`);
		for (const text of [String.raw`\dfrac{x + 1}{3} + x^{2}`, 'x + 1', '3', '2']) {
			expect(movableGroupOf(structure, nodeId(structure, text)), text).toBeNull();
		}
	});

	it('E3.7 : les membres d’une inégalité ou d’un encadrement ne se déplacent pas', () => {
		const inequality = structureOf('2x<7');
		expect(movableGroupOf(inequality, partId(inequality, '7'))).toBeNull();
		const chain = structureOf('1<x<3');
		expect(movableGroupOf(chain, partId(chain, 'x'))).toBeNull();
	});

	it('une sous-expression inconnue → rien', () => {
		expect(movableGroupOf(structureOf('5-3+x'), 99)).toBeNull();
	});
});

describe('movableGroupOf : élève de 6e ou avant (E5, décision G6)', () => {
	it('E5.1 : une somme qui contient une soustraction ne se déplace pas', () => {
		const structure = structureOf('12-4');
		expect(movableGroupOf(structure, partId(structure, '4'), SIXTH_GRADE)).toBeNull();
		expect(movableGroupOf(structure, partId(structure, '12'), SIXTH_GRADE)).toBeNull();
	});

	it('E5.2 : une somme d’additions seules se déplace', () => {
		const structure = structureOf('2+3+4');
		expect(movableGroupOf(structure, partId(structure, '3'), SIXTH_GRADE)?.kind).toBe('sum');
	});

	it('E5.3 : un produit se déplace', () => {
		const structure = structureOf('2\\times3\\times5');
		expect(movableGroupOf(structure, partId(structure, '5'), SIXTH_GRADE)?.kind).toBe('product');
	});

	it('la règle vaut somme par somme : additions dehors, soustraction dedans', () => {
		const structure = structureOf('(5-3)+2');
		const outer = movableGroupOf(
			structure,
			partId(structure, String.raw`\left( 5 - 3 \right)`),
			SIXTH_GRADE
		);
		expect(outer?.kind).toBe('sum');
		expect(movableGroupOf(structure, partId(structure, '3'), SIXTH_GRADE)).toBeNull();
	});

	it('à partir de la 5e (ou visiteur), une somme avec soustraction se déplace', () => {
		const structure = structureOf('12-4');
		// Une différence (`12 − 4`) est une somme : le signe suit le terme
		expect(movableGroupOf(structure, partId(structure, '4'))?.kind).toBe('sum');
	});
});

describe('movedLatex : l’expression après un déplacement (E3)', () => {
	it('E3.2 (G4) : le signe suit le terme ; un « + » en tête disparaît', () => {
		expect(move('5-3+x', 'x', 0)).toBe('x + 5 - 3');
		expect(move('5-3+x', '3', 0)).toBe('-3 + 5 + x');
		expect(move('5-3+x', '5', 2)).toBe('-3 + x + 5');
	});

	it('E3.3 (G11) : la croix devant un nombre ; un aller-retour rend l’écriture de départ', () => {
		const there = move('3xy', '3', 2);
		expect(there).toBe('x y \\times 3');
		expect(move(there, '3', 0)).toBe('3 x y');
	});

	it('E3.4 (G11) : la croix seulement où elle est obligatoire, même écrite par l’élève', () => {
		expect(move('a\\times b\\times c', 'c', 0)).toBe('c a b');
		expect(move('2\\times3\\times5', '5', 0)).toBe('5 \\times 2 \\times 3');
		expect(move(String.raw`4\times a\times\frac{1}{2}`, 'a', 0)).toBe(
			String.raw`a \times 4 \times \dfrac{1}{2}`
		);
	});

	it('E3.5 : une parenthèse se juxtapose, un nombre après elle prend la croix', () => {
		const there = move('2(x+1)(x-3)', '2', 2);
		expect(there).toBe(String.raw`\left( x + 1 \right) \left( x - 3 \right) \times 2`);
		expect(move(there, '2', 0)).toBe(String.raw`2 \left( x + 1 \right) \left( x - 3 \right)`);
	});

	it('un produit écrit avec « · » garde ce signe là où il en faut un', () => {
		expect(move('a\\cdot 2', '2', 0)).toBe('2 a');
		expect(move('2\\cdot a', 'a', 0)).toBe('a \\cdot 2');
	});

	it('E3.6 : les deux membres d’une égalité s’échangent', () => {
		expect(move('2x+3=7', '7', 0)).toBe('7 = 2 x + 3');
		expect(move('2x+3=7', '2 x + 3', 1)).toBe('7 = 2 x + 3');
	});

	it('E3.8 : une partie lâchée à sa place ne change rien, pas même une croix superflue', () => {
		for (const latex of ['5-3+x', 'a\\times b\\times c', '2x+3=7']) {
			const structure = structureOf(latex);
			const group = movableGroupOf(structure, structure.nodes[structure.root].children[0]);
			if (!group) throw new Error(latex);
			expect(movedLatex(structure, group, 0, 0)).toBe(structure.latex);
		}
	});

	it('E3.9 : une parenthèse reste avec son terme', () => {
		expect(move('a+(-b)', String.raw`\left( -b \right)`, 0)).toBe(
			String.raw`\left( -b \right) + a`
		);
	});

	it('une somme dans un numérateur ou entre parenthèses', () => {
		expect(move(String.raw`\frac{2x+1}{3}`, '1', 0)).toBe(String.raw`\dfrac{1 + 2 x}{3}`);
		expect(move('(a+b-c)\\times(x+y)', 'c', 0)).toBe(
			String.raw`\left( -c + a + b \right) \times \left( x + y \right)`
		);
	});

	it('un quotient en ligne posé après un autre facteur prend des parenthèses (sinon (2 × 12) : 3)', () => {
		expect(move('12:3\\times2', '2', 0)).toBe(String.raw`2 \left( 12 : 3 \right)`);
		expect(move('12:3\\times2', '2', 0, SIXTH_GRADE)).toBe(
			String.raw`2 \times \left( 12 : 3 \right)`
		);
		// Resté en tête, pas de parenthèses : `12 : 3 × 5 × 2` se lit de gauche à droite
		expect(move('12:3\\times2\\times5', '5', 1)).toBe('12 : 3 \\times 5 \\times 2');
	});

	it('une parenthèse de l’écriture usuelle (non tapée) suit sa partie', () => {
		expect(move('2\\times-3', '-3', 0)).toBe(String.raw`\left( -3 \right) \times 2`);
		expect(move('--3+x', 'x', 0)).toBe(String.raw`x - \left( -3 \right)`);
	});

	it('un décimal écrit sans zéro prend la croix comme un nombre', () => {
		expect(move('.5x', 'x', 0)).toMatch(/^x \\times /);
	});

	it('un facteur d’un produit précédé d’un « − »', () => {
		expect(move('-3x', 'x', 0)).toBe('-x \\times 3');
	});

	it('le reste de l’expression ne bouge pas', () => {
		expect(move(String.raw`2+\frac{a+b}{3}-x^2`, 'b', 0)).toBe(
			String.raw`2 + \dfrac{b + a}{3} - x^{2}`
		);
	});
});

describe('movedLatex : élève de 6e ou avant (E5.4)', () => {
	it('la croix est toujours écrite : pas de calcul littéral avant la 5e', () => {
		const there = move('2\\times(3+4)', '2', 1, SIXTH_GRADE);
		expect(there).toBe(String.raw`\left( 3 + 4 \right) \times 2`);
		expect(move(there, '2', 0, SIXTH_GRADE)).toBe(String.raw`2 \times \left( 3 + 4 \right)`);
		expect(move('2\\times\\pi\\times r', 'r', 0, SIXTH_GRADE)).toBe('r \\times 2 \\times \\pi');
	});

	it('à partir de la 5e, la croix disparaît devant une parenthèse ou une lettre', () => {
		const there = move('2\\times(3+4)', '2', 1);
		expect(move(there, '2', 0)).toBe(String.raw`2 \left( 3 + 4 \right)`);
		expect(move('2\\times\\pi\\times r', 'r', 0)).toBe('r \\times 2 \\pi');
	});
});

describe('groupLatex : la ligne pendant le glisser', () => {
	it('un espace repéré par sa place, à la hauteur de la partie saisie', () => {
		const group = groupOf(structureOf('5-3+x'), '3');
		expect(
			stripMarkers(groupLatex(group, group.parts, { gaps: [0, 0, 0.25], phantom: '\\frac{1}{2}' }))
		).toBe('5 - 3\\mathord{\\class{ubs-gap2}{\\hspace{0.250em}\\vphantom{\\frac{1}{2}}}} + x');
	});

	it('un « − » en tête précédé d’un espace reste collé à son terme', () => {
		const group = groupOf(structureOf('-3+x'), 'x');
		expect(stripMarkers(groupLatex(group, group.parts, { gaps: [0.5] }))).toBe(
			'\\mathord{\\class{ubs-gap0}{\\hspace{0.500em}}}{-3} + x'
		);
		expect(stripMarkers(groupLatex(group, group.parts, { gaps: [0] }))).toBe('-3 + x');
	});

	it('dans un produit, l’espace s’ouvre avant le signe de multiplication', () => {
		const group = groupOf(structureOf('2\\times3\\times5'), '3');
		expect(stripMarkers(groupLatex(group, group.parts, { gaps: [0, 0.25] }))).toBe(
			'2\\mathord{\\class{ubs-gap1}{\\hspace{0.250em}}} \\times 3 \\times 5'
		);
	});

	it('dans une égalité, l’espace s’ouvre avant le « = »', () => {
		const group = groupOf(structureOf('2x+3=7'), '7');
		expect(stripMarkers(groupLatex(group, group.parts, { gaps: [0, 0.5] }))).toBe(
			'2 x + 3\\mathord{\\class{ubs-gap1}{\\hspace{0.500em}}} = 7'
		);
	});

	it('le fantôme est écrit sans marqueurs (un marqueur en double tromperait le repérage)', () => {
		const group = groupOf(structureOf('2xy'), 'x');
		const latex = groupLatex(group, group.parts, {
			gaps: [0, 0.25],
			phantom: group.parts[1].marked
		});
		expect(latex.match(/ubs-n/g)?.length).toBe(
			group.parts
				.map((p) => p.marked)
				.join('')
				.match(/ubs-n/g)?.length
		);
	});

	it('sans la partie saisie, le groupe s’écrit avec les parties qui restent', () => {
		const group = groupOf(structureOf('2x+3=7'), '7');
		expect(stripMarkers(groupLatex(group, withoutPart(group.parts, 1), { gaps: [0.5] }))).toBe(
			'\\mathord{\\class{ubs-gap0}{\\hspace{0.500em}}}2 x + 3'
		);
	});
});

describe('expressionLatex : l’expression entière, le groupe réécrit', () => {
	it('le reste de l’expression ne change pas, les espaces du glisser y entrent', () => {
		const structure = structureOf(String.raw`\frac{2x+1}{3}`);
		const group = groupOf(structure, '1');
		const latex = expressionLatex(structure, group, withoutPart(group.parts, 1), { gaps: [0.5] });
		expect(stripMarkers(latex)).toBe(
			String.raw`\dfrac{\mathord{\class{ubs-gap0}{\hspace{0.500em}}}2 x}{3}`
		);
	});
});

describe('cardLatex : ce que porte la carte de la partie saisie', () => {
	it('un terme avec son signe, un facteur ou un membre seul', () => {
		const sum = groupOf(structureOf('5-3+x'), '3');
		expect(stripMarkers(cardLatex(sum, sum.parts[1]))).toBe('-3');
		expect(stripMarkers(cardLatex(sum, sum.parts[2]))).toBe('x');
		const product = groupOf(structureOf('2(x+1)'), '2');
		expect(stripMarkers(cardLatex(product, product.parts[1]))).toBe(
			String.raw`\left( x + 1 \right)`
		);
	});
});
