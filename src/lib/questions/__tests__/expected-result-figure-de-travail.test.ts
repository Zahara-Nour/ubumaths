/**
 * Résultat attendu d'une figure de travail (bloc ```figure-de-travail, lot 2)
 * ===========================================================================
 *
 * Décision de David (2026-10-26, `docs/archive/wip/figure-et-choix-progress.md` § 2.9, Q2) :
 * une ligne à part, APRÈS les réponses notées, sur la carte de correction commune
 * (entraînement, Course, copie) : la figure de départ et les traits de l'élève en
 * gris, sans verdict ; vide → « aucun tracé ». Jamais parmi les réponses attendues.
 */
import { describe, it, expect } from 'vitest';
import '$lib/questions/construction/positions-setup';
import { buildExpectedResult, withoutFigureCases } from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

// Constantes
const WORK = [
	'```figure-de-travail',
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'---',
	'A = point(2, 3)',
	'B = point(8, 5)',
	'C = point(5, 4.25)',
	'```'
].join('\n');
const STATEMENT = `Les points A, B et C sont-ils alignés ?\n\n${WORK}\n\n\`\`\`choix\nmelanger: non\n- Oui\n- Non\n\`\`\``;
const TRACE = 'droite(2;3;8;5)';

// Functions
function instance(
	statement = STATEMENT,
	blanks = [{ expectedAnswer: '' }, { expectedAnswer: '1' }]
): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-cp058',
			title: 'Points alignés',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [
				{
					statement: templateMarkdown(statement),
					blanks
				}
			],
			grades: ['CP'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

// Tests
describe('résultat attendu : figure de travail', () => {
	it('tracée : la ligne de la figure de travail, en dernier, avec le tracé', () => {
		const { status, lines } = buildExpectedResult(instance(), { values: [TRACE, '1'] });
		expect(status).toBe('correct');
		expect(lines.at(-1)).toMatchObject({ kind: 'work-figure', index: 0, answer: TRACE });
		const last = lines.at(-1);
		if (last?.kind !== 'work-figure') return;
		expect(last.source).toContain('A = point(2, 3)');
	});

	it('jamais parmi les réponses : aucune autre ligne ne parle de la case 0', () => {
		const { lines } = buildExpectedResult(instance(), { values: [TRACE, '0'] });
		const others = lines.slice(0, -1);
		expect(others.some((l) => l.kind === 'figure' || l.kind === 'expected-only')).toBe(false);
		expect(others.some((l) => 'index' in l && l.index === 0)).toBe(false);
		// La case choix, elle, est jugée à sa place dans l'énoncé rempli
		expect(lines[0]).toMatchObject({ kind: 'filled-statement' });
	});

	it('vide : la ligne est là, sans tracé (« aucun tracé »)', () => {
		const { status, lines } = buildExpectedResult(instance(), { values: ['', '1'] });
		expect(status).toBe('correct');
		expect(lines.at(-1)).toMatchObject({ kind: 'work-figure', answer: '' });
	});

	it('sans réponse (R9) : la figure de départ seule', () => {
		const { lines } = buildExpectedResult(instance());
		expect(lines.at(-1)).toMatchObject({ kind: 'work-figure', answer: null });
	});

	it('le bloc sort de l’énoncé rempli (sa ligne le montre)', () => {
		expect(withoutFigureCases(`Avant\n\n${WORK}\n\nAprès`)).toBe('Avant\n\n\n\nAprès');
		const { lines } = buildExpectedResult(instance(), { values: [TRACE, '1'] });
		const filled = lines.find((l) => l.kind === 'filled-statement');
		if (filled?.kind !== 'filled-statement') throw new Error('énoncé rempli attendu');
		expect(filled.markdown).not.toContain('figure-de-travail');
	});

	it('calcul R1 avec une figure de travail : toujours la comparaison « 3 + 5 = 8 »', () => {
		const calc = instance(`Calcule.\n\n${WORK}\n\n$3+5 = ?$`, [
			{ expectedAnswer: '' },
			{ expectedAnswer: '8' }
		]);
		const { lines } = buildExpectedResult(calc, { values: ['', '9'] });
		expect(lines.map((l) => l.kind)).toEqual(['comparison', 'solution', 'work-figure']);
	});
});
