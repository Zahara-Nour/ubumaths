/**
 * Limite cachée dans un tableau de variations (chantier `variation-limite-infinie`)
 * ===============================================================================
 *
 * Outil n° 50 de `docs/wip/outils-manquants.md`. Phase 0 validée par David le
 * 2026-11-23 : une limite infinie se cache aux bords, et toute limite (infinie ou
 * finie) se cache autour d'une double barre ; l'élève répond dans une case de
 * calcul ; ∞ sans signe est faux (Q2) ; une case valeur d'un tableau prend des
 * erreurs prévues, et un tableau à une seule case cachée peut se poser en QCM.
 */
import { describe, it, expect } from 'vitest';
import { buildExpectedResult, type ExpectedLine } from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import { asChoiceInstance, canBeChoice } from '../choice-from-errors';
import { maskGestureAnswers, findUnmaskedAnswers } from '../masked-statement';
import type { QuestionInstance, QuestionTemplate, TemplateBlank } from '../types';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import {
	findVariationsToFill,
	parseVariationTableContent,
	revealVariationBody
} from '#lib/ubumark/parser/variation-table-parser.ts';
import { generateVariationTableTypst } from '#lib/ubumark/generators/variation-table-typst.ts';

// Fixtures

/** f(x) = (2x + 1)/(x − 3) : décroissante de part et d'autre de 3 */
function tableau(variation: string[]): string[] {
	return [
		'```variation',
		'variable: x',
		'domain: -inf, 3, +inf',
		'variation: f(x)',
		...variation,
		'```'
	];
}

const AUTOUR = tableau(['  -inf: 2, top', '  3: ||, ?-inf, ?+inf', '  +inf: 2, bottom']);

function statement(lines: string[]): string {
	return ['Complète le tableau de variations de $f$.', '', ...lines].join('\n');
}

function generate(lines: string[], blanks?: TemplateBlank[]): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-limite-infinie',
			title: 'Limites',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(statement(lines)), ...(blanks && { blanks }) }],
			grades: ['TSPE'],
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function errorsOf(lines: string[], blanks?: TemplateBlank[]): string[] {
	const result = generateInstance(
		{
			id: 'test-limite-infinie',
			title: 'Limites',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(statement(lines)), ...(blanks && { blanks }) }],
			grades: ['TSPE'],
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	return result.success ? [] : result.errors;
}

function parse(variation: string[]) {
	return parseVariationTableContent(tableau(variation).slice(1, -1));
}

type SignTableLine = Extract<ExpectedLine, { kind: 'sign-table' }>;

function cellsOf(instance: QuestionInstance, values: string[]) {
	const { lines } = buildExpectedResult(instance, { values, latex: values });
	const table = lines.find((l): l is SignTableLine => l.kind === 'sign-table');
	if (!table) throw new Error('pas de tableau dans le corrigé');
	return table.cells.map((c) => c.status);
}

const remarks = (instance: QuestionInstance, values: string[]) =>
	buildExpectedResult(instance, { values, latex: values }).lines.flatMap((l) =>
		l.kind === 'remark' ? [l.text] : []
	);

// Tests

describe('limite infinie cachée : lecture du bloc', () => {
	it('nominal (1) : aux bords, `+inf: ?+inf, top` est une case valeur', () => {
		const { node, errors } = parse([
			'  -inf: ?-inf, bottom',
			'  3: ||, +inf, -inf',
			'  +inf: ?+inf, top'
		]);
		expect(errors).toEqual([]);
		expect(node?.cases?.map((c) => [c.key, c.kind])).toEqual([
			['-inf', 'valeur'],
			['+inf', 'valeur']
		]);
	});

	it('nominal (2) : autour de la double barre, une case de chaque côté, gauche puis droite', () => {
		const { node, errors } = parse([
			'  -inf: 2, top',
			'  3: ||, ?-inf, ?+inf',
			'  +inf: 2, bottom'
		]);
		expect(errors).toEqual([]);
		expect(node?.cases?.map((c) => [c.key, c.side, c.kind])).toEqual([
			['3', 'left', 'valeur'],
			['3', 'right', 'valeur']
		]);
		// Le tableau garde ses limites (flèches et hauteurs dessinées comme avant)
		const limits = node?.rows[0].type === 'variation' ? node.rows[0].values.get('3')?.limits : null;
		expect(limits?.map((l) => [l.expression, l.position])).toEqual([
			['-inf', 'bottom'],
			['+inf', 'top']
		]);
	});

	it('nominal (2) : une seule limite cachée, positions écrites', () => {
		const { node, errors } = parse([
			'  -inf: 2, top',
			'  3: ||, -inf, bottom, ?+inf, top',
			'  +inf: 2, bottom'
		]);
		expect(errors).toEqual([]);
		expect(node?.cases?.map((c) => [c.key, c.side])).toEqual([['3', 'right']]);
	});

	it('nominal (3) : une limite finie autour de la double barre', () => {
		const { node, errors } = parse(['  -inf: 2, top', '  3: ||, ?1, +inf', '  +inf: 2, bottom']);
		expect(errors).toEqual([]);
		expect(node?.cases?.map((c) => [c.side, c.answer])).toEqual([['left', '1']]);
	});

	it('nominal (4) : limite d’un seul côté (`||, left, ?-inf, bottom`)', () => {
		const { node, errors } = parse(['  -inf: 2, top', '  3: ||, left, ?-inf, bottom']);
		expect(errors).toEqual([]);
		expect(node?.cases?.map((c) => [c.side, c.kind])).toEqual([['left', 'valeur']]);
	});

	it('erreur (10) : une valeur de x infinie ne se cache toujours pas', () => {
		const { errors } = parseVariationTableContent([
			'variable: x',
			'domain: ?-inf, 3, +inf',
			'variation: f(x)',
			'  -inf: 2, top'
		]);
		expect(errors.map((e) => e.message).join(' ')).toMatch(/infini/);
	});

	it('erreur (revue) : une limite ne se cache qu’autour d’une double barre, ni |h| ni d', () => {
		expect(
			parse(['  -inf: 2, top', '  3: |h|, ?-inf, +inf', '  +inf: 2, bottom']).errors
		).not.toEqual([]);
		expect(parse(['  -inf: 2, top', '  3: d, left, ?-inf, bottom']).errors).not.toEqual([]);
	});

	it('erreur : on ne cache ni une hauteur ni un côté autour de la double barre', () => {
		expect(parse(['  3: ||, -inf, ?bottom, +inf, top']).errors).not.toEqual([]);
		expect(parse(['  3: ||, ?left, -inf, bottom']).errors).not.toEqual([]);
	});

	it('corrigé imprimé : `revealVariationBody` rend les limites en clair', () => {
		expect(revealVariationBody(['  3: ||, ?-inf, ?+inf', '  -inf: ?-inf, bottom'])).toEqual([
			'  3: ||, -inf, +inf',
			'  -inf: -inf, bottom'
		]);
	});
});

describe('limite cachée : impression PDF', () => {
	const BOX = 'box(width: 1.4em';
	const typstOf = (variation: string[], hiddenCells: 'blank' | 'filled' = 'blank') => {
		const { node } = parse(variation);
		if (!node) throw new Error('tableau non lu');
		const sortie = generateVariationTableTypst(node, { hiddenCells });
		// Ligne `variation:` seule : la ligne des x écrit ±∞ en clair
		return sortie.split('contents: (')[1] ?? '';
	};

	it('nominal (2) : les deux limites cachées autour de la double barre sont des cases vides', () => {
		const sortie = typstOf(['  -inf: 2, top', '  3: ||, ?-inf, ?+inf', '  +inf: 2, bottom']);
		expect(sortie).toMatch(/\(bottom, top, "\|\|", box\(width: 1\.4em[^)]*\), box\(width: 1\.4em/);
		expect(sortie).not.toContain('infinity');
	});

	it('nominal (2) : une seule limite cachée, l’autre reste écrite', () => {
		const sortie = typstOf([
			'  -inf: 2, top',
			'  3: ||, -inf, bottom, ?+inf, top',
			'  +inf: 2, bottom'
		]);
		expect(sortie).toMatch(/"\|\|", \$-infinity\$, box\(width: 1\.4em/);
		expect(sortie).not.toContain('+infinity');
	});

	it('nominal (4) : limite d’un seul côté cachée', () => {
		const sortie = typstOf(['  -inf: 2, top', '  3: ||, left, ?-inf, bottom']);
		expect(sortie).toMatch(/\(bottom, "\|\|", box\(width: 1\.4em/);
		expect(sortie).not.toContain('infinity');
	});

	it('nominal (1) : limite cachée au bord, case vide', () => {
		const sortie = typstOf(['  -inf: 2, top', '  3: ||, -inf, +inf', '  +inf: ?2, bottom']);
		expect(sortie).toContain(`(bottom, ${BOX}`);
	});

	it('corrigé imprimé (`filled`) : les limites sortent en clair', () => {
		const sortie = typstOf(
			['  -inf: 2, top', '  3: ||, ?-inf, ?+inf', '  +inf: 2, bottom'],
			'filled'
		);
		expect(sortie).toContain('"||", $-infinity$, $+infinity$');
		expect(sortie).not.toContain(BOX);
	});
});

describe('limite infinie cachée : jugement', () => {
	it('nominal (1) : la bonne limite est juste, l’autre infini et un nombre sont faux', () => {
		const inst = generate(tableau(['  -inf: 2, top', '  3: ||, -inf, +inf', '  +inf: ?2, bottom']));
		expect(cellsOf(inst, ['2'])).toEqual(['correct']);
		const bord = generate(tableau(['  -inf: 2, top', '  3: ||, ?-inf, +inf', '  +inf: 2, bottom']));
		expect(cellsOf(bord, ['-\\infty'])).toEqual(['correct']);
		expect(cellsOf(bord, ['+\\infty'])).toEqual(['incorrect']);
		expect(cellsOf(bord, ['2'])).toEqual(['incorrect']);
	});

	it('nominal (2) : deux cases autour de la double barre, jugées chacune', () => {
		const inst = generate(AUTOUR);
		expect(cellsOf(inst, ['-\\infty', '+\\infty'])).toEqual(['correct', 'correct']);
		expect(cellsOf(inst, ['+\\infty', '+\\infty'])).toEqual(['incorrect', 'correct']);
	});

	it('limite (7) : `−∞` et `-\\infty` sont la même réponse', () => {
		const inst = generate(AUTOUR);
		expect(cellsOf(inst, ['−∞', '+∞'])).toEqual(['correct', 'correct']);
	});

	it('limite (8, Q2) : ∞ sans signe est faux', () => {
		const inst = generate(AUTOUR);
		expect(cellsOf(inst, ['-\\infty', '\\infty'])).toEqual(['correct', 'incorrect']);
	});

	it('erreur (11) : `||, ?, +inf` (rien après le ?) est refusé dans un modèle', () => {
		expect(
			errorsOf(tableau(['  -inf: 2, top', '  3: ||, ?, +inf', '  +inf: 2, bottom']))
		).not.toEqual([]);
	});

	it('nominal (5) : le corrigé affiche la limite en LaTeX', () => {
		const inst = generate(AUTOUR);
		expect(inst.blanks?.map((b) => b.expectedAnswerLatex)).toEqual(['-\\infty', '+\\infty']);
	});
});

describe('limite infinie cachée : évaluation notée', () => {
	it('nominal (6) : la limite cachée ne part pas dans l’énoncé masqué', () => {
		const masked = maskGestureAnswers(statement(AUTOUR));
		expect(masked).not.toMatch(/3: \|\|, \?-inf/);
		expect(masked).not.toMatch(/-inf, \+inf/);
		expect(findUnmaskedAnswers(masked)).toEqual([]);
		// Le parseur lit l'énoncé masqué : deux cases sans réponse, hauteurs gardées
		const [found] = findVariationsToFill(masked);
		expect(found.node?.cases?.map((c) => [c.side, c.answer])).toEqual([
			['left', ''],
			['right', '']
		]);
	});
});

describe('limite cachée : erreurs prévues et QCM', () => {
	const ERREUR = 'Regarde le signe de x − 3 juste à gauche de 3.';

	it('nominal (13) : une case valeur d’un tableau prend une erreur prévue', () => {
		const inst = generate(AUTOUR, [
			{ expectedAnswer: '', expectedErrors: [{ answer: '+\\infty', message: ERREUR }] },
			{ expectedAnswer: '' }
		]);
		expect(remarks(inst, ['+\\infty', '+\\infty'])).toContain(ERREUR);
		expect(remarks(inst, ['2', '+\\infty'])).not.toContain(ERREUR);
		expect(remarks(inst, ['-\\infty', '+\\infty'])).not.toContain(ERREUR);
	});

	it('erreur : une case signe ne prend pas d’erreur prévue', () => {
		const signes = [
			'```variation',
			'variable: x',
			'domain: -inf, 3, +inf',
			'sign: x-3',
			'  -inf,3: ?-',
			'  3: z',
			'  3,+inf: +',
			'```'
		];
		expect(
			errorsOf(signes, [{ expectedAnswer: '', expectedErrors: [{ answer: '+', message: ERREUR }] }])
		).not.toEqual([]);
	});

	it('revue : l’erreur prévue « ∞ sans signe » (`inf`) est reconnue', () => {
		const seule = tableau(['  -inf: 2, top', '  3: ||, ?-inf, +inf', '  +inf: 2, bottom']);
		const inst = generate(seule, [
			{ expectedAnswer: '', expectedErrors: [{ answer: 'inf', message: 'SANS SIGNE' }] }
		]);
		expect(remarks(inst, ['\\infty'])).toContain('SANS SIGNE');
		expect(cellsOf(inst, ['\\infty'])).not.toContain('correct');
		expect(remarks(inst, ['-\\infty'])).not.toContain('SANS SIGNE');
	});

	it('nominal (14) : un tableau à une seule case cachée, avec erreurs prévues, se pose en QCM', () => {
		const seule = tableau(['  -inf: 2, top', '  3: ||, ?-inf, +inf', '  +inf: 2, bottom']);
		const inst = generate(seule, [
			{
				expectedAnswer: '',
				expectedErrors: [
					{ answer: '+\\infty', message: ERREUR },
					{ answer: '2', message: 'Ce n’est pas la limite en $-\\infty$.' }
				]
			}
		]);
		expect(canBeChoice(inst)).toBe(true);
		const choice = asChoiceInstance(inst, 7);
		expect(choice).not.toBeNull();
		const text = String(choice?.statement);
		// La case du tableau affiche « … », les choix suivent sous le tableau
		expect(text).toContain('```choix');
		expect(text.indexOf('```choix')).toBeGreaterThan(text.indexOf('```variation'));
		expect(text).toContain('3: ||, \\ldots, bottom, +inf, top');
		// Le tableau n'est plus à compléter : la seule case est le choix
		expect(findVariationsToFill(text)).toEqual([]);
		expect(choice?.blanks).toHaveLength(1);
		expect(choice?.blanks?.[0].type).toBe('choice');
	});

	it('Q3 (a) : un tableau à deux cases cachées ne se pose pas en QCM', () => {
		const inst = generate(AUTOUR, [
			{ expectedAnswer: '', expectedErrors: [{ answer: '+\\infty', message: ERREUR }] },
			{ expectedAnswer: '' }
		]);
		expect(canBeChoice(inst)).toBe(false);
	});
});
