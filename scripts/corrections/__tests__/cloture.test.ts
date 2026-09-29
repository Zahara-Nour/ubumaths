/**
 * Contrôles du vérificateur ajoutés pour la clôture (2026-09-30) : unités, trous
 * multiples, contrôles structurels déclarés par le lot. Chaque cas vert a son
 * jumeau rouge : un contrôle neutralisé doit faire échouer ce fichier.
 */

import { describe, expect, it } from 'vitest';
import type { QuestionTemplate } from '../../../src/lib/questions/types';
import { templateMarkdown } from '../../../src/lib/ubumark';
import type { Proposal } from '../lib/proposal';
import {
	holeEquationHolds,
	relationHolds,
	topLevelFactors,
	unitHoleForm,
	verifyProposal,
	type EntryChecks
} from '../lib/verify';

// ============================================================================
// FIXTURES
// ============================================================================

const ID = '11111111-1111-4111-8111-111111111111';

function template(
	statement: string,
	variables: { name: string; expression: string }[],
	expectedAnswers: string[]
): QuestionTemplate {
	return {
		id: ID,
		title: 'Clôture',
		theme: 'Test',
		domain: 'Test',
		level: 1,
		status: 'draft',
		grades: ['6'],
		variations: [
			{
				statement: templateMarkdown(statement),
				variables,
				blanks: expectedAnswers.map((expectedAnswer) => ({ expectedAnswer }))
			}
		]
	};
}

function reasons(t: QuestionTemplate, steps: string[], checks?: EntryChecks): string[] {
	const proposal: Proposal = {
		templateId: ID,
		title: 'Clôture',
		classe: 'N',
		code: 'N-TEST',
		source: 'written',
		steps: { shared: steps },
		notes: []
	};
	const report = verifyProposal(t, proposal, { seeds: 12, checks });
	return [...report.templateErrors, ...report.failures.flatMap((f) => f.reasons)];
}

const align = (...lines: string[]) => `$$\\begin{align} ${lines.join(' \\\\ ')} \\end{align}$$`;

// ============================================================================
// UNITÉS
// ============================================================================

describe('clôture : égalité posée avec unités', () => {
	const conversion = template(
		'Convertis.\n\n$${{expression1}}$$',
		[
			{ name: 'a', expression: '1..9' },
			{ name: 'expression1', expression: 'a[km] = ?[m]' }
		],
		['{{eval:a*1000;d}}']
	);

	it('lit l’égalité avec le convertisseur d’unités', () => {
		expect(holeEquationHolds('2[km] = ?[m]', 2000)).toBe(true);
		expect(holeEquationHolds('2[km] = ?[m]', 200)).toBe(false);
		expect(holeEquationHolds('2[dm] + 1[m] = ?[m]', 1.2)).toBe(true);
	});

	it('accepte « ? = a × 1000 = réponse », refuse une réponse qui ne vérifie pas l’égalité', () => {
		expect(reasons(conversion, [align('? &= {{a}} \\times 1000', '&= {{solution}}')])).toEqual([]);
		const wrong = template(
			'Convertis.\n\n$${{expression1}}$$',
			[
				{ name: 'a', expression: '1..9' },
				{ name: 'expression1', expression: 'a[km] = ?[m]' }
			],
			['{{eval:a*100;d}}']
		);
		expect(
			reasons(wrong, [align('? &= {{a}} \\times 100', '&= {{solution}}')]).some((r) =>
				r.includes("ne vérifie pas l'égalité posée")
			)
		).toBe(true);
	});

	it('grandeur posée sans trou : départ invérifiable (`\\unit` refusé par MathLive)', () => {
		const sum = template(
			'Calcule.\n\n$${{expression1}}=?$$',
			[
				{ name: 'a', expression: '1..9' },
				{ name: 'expression1', expression: 'a[dm] + 1[m]' }
			],
			['{{eval:a[dm]+1[m]}}']
		);
		expect(
			reasons(sum, [align('{{a}} + 10 &= {{eval:a+10}}')]).some((r) =>
				r.includes('départ invérifiable')
			)
		).toBe(true);
	});

	it('lit une égalité à trou écrite en LaTeX dans l’énoncé (sans variable d’expression)', () => {
		expect(unitHoleForm('2~\\unit{m^3} = \\placeholder[0]{}~\\unit{L}')).toBe('2[m^3] = ?[L]');
		expect(unitHoleForm('2 + \\placeholder[0]{} = 5')).toBe(null);
		const litre = template(
			'Convertis.\n\n${{a}}~\\unit{m^3} = ?~\\unit{L}$',
			[{ name: 'a', expression: '1..9' }],
			['{{eval:a*1000;d}}']
		);
		expect(reasons(litre, [align('? &= {{a}} \\times 1000', '&= {{solution}}')])).toEqual([]);
		expect(reasons(litre, [align('? &= {{a}} \\times 1000 \\times 1', '&= {{solution}}')])).toEqual(
			[]
		);
		// Sans la lecture de l'énoncé, le départ serait invérifiable ; avec, un calcul faux rougit
		expect(
			reasons(litre, [align('? &= {{a}} \\times 100', '&= {{eval:a*100}}')]).length
		).toBeGreaterThan(0);
	});
});

// ============================================================================
// PLUSIEURS TROUS
// ============================================================================

describe('clôture : plusieurs trous dans une relation posée', () => {
	const encadrement = (lower: string, upper: string) =>
		template(
			'Encadre.\n\n$${{expression1}}$$',
			[
				{ name: 'a', expression: '0..9' },
				{ name: 'b', expression: '1..9' },
				{ name: 'c', expression: 'eval:a+b*0.1;d' },
				{ name: 'expression1', expression: '?<c<?' }
			],
			[lower, upper]
		);
	const steps = [align('{{c}} - {{eval:b*0.1;d}} &= {{a}}'), align('{{a}} + 1 &= {{eval:a+1}}')];

	it('relation remplie dans l’ordre des cases', () => {
		expect(relationHolds('?<2.055<?', [2.05, 2.06])).toBe(true);
		expect(relationHolds('?<2.055<?', [2.06, 2.05])).toBe(false);
		expect(relationHolds('8=(3*?)+?', [2, 2])).toBe(true);
		expect(relationHolds('8=(3*?)+?', [2, 3])).toBe(false);
	});

	it('accepte l’encadrement, refuse des cases inversées', () => {
		expect(reasons(encadrement('{{a}}', '{{eval:a+1}}'), steps)).toEqual([]);
		expect(
			reasons(encadrement('{{eval:a+1}}', '{{a}}'), steps).some((r) =>
				r.startsWith('relation posée')
			)
		).toBe(true);
	});

	it('refuse un calcul qui ne commence pas par un nombre de la relation', () => {
		const bad = [align('{{a}} + 0.5 - 0.5 &= {{a}}'), align('{{a}} + 1 &= {{eval:a+1}}')];
		expect(
			reasons(encadrement('{{a}}', '{{eval:a+1}}'), bad).some((r) =>
				r.includes("ne part pas d'un nombre de la relation posée")
			)
		).toBe(true);
	});
});

// ============================================================================
// CONTRÔLES DÉCLARÉS
// ============================================================================

describe('clôture : contrôles structurels déclarés', () => {
	it('posed : opération de la phrase, nombres de l’énoncé ou constantes déclarées', () => {
		const quad = template(
			'Quel est le quadruple de ${{a}}$ ?\n\nC’est $?$.',
			[{ name: 'a', expression: '11..19' }],
			['{{eval:4*a}}']
		);
		const steps = [align('4 \\times {{a}} &= 2 \\times {{eval:2*a}}', '&= {{solution}}')];
		expect(reasons(quad, steps, { posed: { expression: '4*{{a}}', constants: ['4'] } })).toEqual(
			[]
		);
		// Sans constante déclarée, le 4 n'est pas dans l'énoncé
		expect(
			reasons(quad, steps, { posed: { expression: '4*{{a}}' } }).some((r) =>
				r.includes("absent(s) de l'énoncé")
			)
		).toBe(true);
		// Sans déclaration : départ invérifiable
		expect(reasons(quad, steps).some((r) => r.startsWith('point de départ invérifiable'))).toBe(
			true
		);
	});

	it('transform opposite : le calcul part de −(A)', () => {
		const opp = template(
			'Opposé de :\n\n$${{a}}x$$\n\nC’est $?$.',
			[{ name: 'a', expression: '2..9' }],
			['-{{a}}x']
		);
		const steps = [align('-\\left( {{a}}x \\right) &= -{{a}}x')];
		expect(reasons(opp, steps, { transform: 'opposite' })).toEqual([]);
		expect(reasons(opp, steps).some((r) => r.startsWith('le calcul ne part pas'))).toBe(true);
	});

	it('end factor : la réponse est un facteur du produit final', () => {
		expect(topLevelFactors('3 \\times \\left( 2 + 9 \\right)')).toEqual([
			'3',
			'\\left( 2 + 9 \\right)'
		]);
		expect(topLevelFactors('2\\left( y - x \\right)')).toEqual(['2', '\\left( y - x \\right)']);
		expect(topLevelFactors('3 \\times 2 + 9')).toEqual(['3 \\times 2 + 9']);
		const fact = template(
			'Facteur commun.\n\n$${{a}}*{{b}}+{{a}}*{{c}}$$\n\nC’est $?$.',
			[
				{ name: 'a', expression: '2..9' },
				{ name: 'b', expression: '2..9' },
				{ name: 'c', expression: '2..9' }
			],
			['{{a}}']
		);
		const good = [
			align(
				'{{a}} \\times {{b}} + {{a}} \\times {{c}} &= {{a}} \\times \\left( {{b}} + {{c}} \\right)'
			)
		];
		expect(reasons(fact, good, { end: 'factor' })).toEqual([]);
		const bad = [align('{{a}} \\times {{b}} + {{a}} \\times {{c}} &= {{eval:a*(b+c)}} \\times 1')];
		expect(reasons(fact, bad, { end: 'factor' }).some((r) => r.startsWith('facteur :'))).toBe(true);
	});

	it('equations affine-root : lignes affines toutes vérifiées par la racine', () => {
		const root = template(
			'Racine ?\n\n$$f(x)={{a}}x+{{b}}$$\n\n$f(?)=0$',
			[
				{ name: 'a', expression: '2..9' },
				{ name: 'b', expression: '1..9' }
			],
			['{{eval:-(b)/(a)}}']
		);
		const good = [align('{{a}}x+{{b}} &= 0', '{{a}}x &= -{{b}}', 'x &= {{solution}}')];
		expect(reasons(root, good, { equations: 'affine-root' })).toEqual([]);
		const bad = [align('{{a}}x+{{b}} &= 0', '{{a}}x &= {{b}}', 'x &= {{solution}}')];
		expect(
			reasons(root, bad, { equations: 'affine-root' }).some((r) => r.includes('ne vérifie pas'))
		).toBe(true);
	});

	it('hole denominator : « ? = réponse » admis seulement si les autres dénominateurs la donnent', () => {
		const den = template(
			'Complète.\n\n$${{expression1}}$$',
			[
				{ name: 'a', expression: '2..9' },
				{ name: 'b', expression: '2..9' },
				{ name: 'c', expression: '11' },
				{ name: 'expression1', expression: '{{a}}/?+{{b}}/{{c}}={{eval:a+b}}/{{c}}' }
			],
			['{{c}}']
		);
		expect(reasons(den, [align('? &= {{solution}}')], { hole: 'denominator' })).toEqual([]);
		expect(
			reasons(den, [align('? &= {{solution}}')]).some((r) => r.includes("suivi d'un calcul"))
		).toBe(true);
		// Déclaré sur un trou au NUMÉRATEUR : refusé (les dénominateurs ne donnent rien)
		const num = template(
			'Complète.\n\n$${{expression1}}$$',
			[
				{ name: 'a', expression: '2..9' },
				{ name: 'b', expression: '2..9' },
				{ name: 'expression1', expression: '?/11+{{b}}/11={{eval:a+b}}/11' }
			],
			['{{a}}']
		);
		expect(
			reasons(num, [align('? &= {{solution}}')], { hole: 'denominator' }).some((r) =>
				r.includes("suivi d'un calcul")
			)
		).toBe(true);
	});

	it('digit : le tableau relit le nombre, la colonne du rang porte la réponse', () => {
		const digit = template(
			'Chiffre des dizaines de ${{n}}$ ?\n\nC’est $?$.',
			[
				{ name: 'a', expression: '1..9' },
				{ name: 'b', expression: '0..9' },
				{ name: 'n', expression: 'eval:a*10+b' }
			],
			['{{a}}']
		);
		const table = (x: string, y: string) =>
			`$$\\begin{array}{|c|c|} \\text{dizaines} & \\text{unités} \\\\ ${x} & ${y} \\end{array}$$`;
		const checks = { digit: { number: '{{n}}', rank: 10 } };
		expect(reasons(digit, [table('{{a}}', '{{b}}'), 'C’est ${{solution}}$.'], checks)).toEqual([]);
		expect(
			reasons(digit, [table('{{b}}', '{{a}}'), 'C’est ${{solution}}$.'], checks).some((r) =>
				r.startsWith('chiffre :')
			)
		).toBe(true);
	});

	it('written : la conclusion écrit la réponse telle quelle', () => {
		const vocab = template(
			'La somme de ${{a}}$ et de ${{b}}$.\n\nC’est $?$.',
			[
				{ name: 'a', expression: '2..9' },
				{ name: 'b', expression: '2..9' }
			],
			['{{a}}+{{b}}']
		);
		expect(reasons(vocab, ['Une somme.', 'C’est ${{solution}}$.'], { written: true })).toEqual([]);
		expect(
			reasons(vocab, ['Une somme.', 'C’est ${{b}} + {{a}}$.'], { written: true }).some((r) =>
				r.startsWith('écriture :')
			)
		).toBe(true);
	});
});
