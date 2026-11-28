/**
 * Coup de pouce d'une question (chantier `idees-format`, idée 5, PR moteur)
 * =========================================================================
 *
 * Phase 0 validée par David le 2026-11-22 (Q1 → C) : l'auteur écrit l'indice
 * d'une variation (`hint`), ou coche « la première étape de la correction sert
 * d'indice » (`hintFromFirstStep`). Un indice qui donne la réponse est refusé à
 * l'écriture. Le tirage résout l'indice avec les valeurs de la question, sans
 * décaler aucun autre tirage ; l'évaluation ne le reçoit jamais.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { toPublicQuestion } from '../public-question';
import { questionTemplateSchema } from '../template-schema';
import { createQuestionTemplateSchema } from '#lib/server/validation/questions.ts';
import type { QuestionInstance, QuestionTemplate } from '../types';

// Fixtures

const VARIABLES = [
	{ name: 'a', expression: '$e[2;9]' },
	{ name: 'b', expression: '$e[2;9]' }
];

/** Modèle « a × b » ; `extra` complète l'unique variation */
function template(extra: Record<string, unknown> = {}, shared?: Record<string, unknown>) {
	return {
		title: 'Produit',
		level: 1,
		grades: ['6'],
		status: 'draft',
		...(shared && { shared }),
		variations: [
			{
				statement: '${{a}} \\times {{b}} = ?$',
				variables: VARIABLES,
				blanks: [{ expectedAnswer: '{{a}}*{{b}}' }],
				...extra
			}
		]
	};
}

const asTemplate = (t: object): QuestionTemplate =>
	({ id: 't', type: 'fill_in_blanks', ...t }) as unknown as QuestionTemplate;

function generate(t: object, seed = 7): QuestionInstance {
	const r = generateInstance(asTemplate(t), seed);
	if (!r.success) throw new Error(JSON.stringify(r.errors));
	return r.instance;
}

const TWO_STEPS = {
	steps: ['On décompose ${{b}}$ en dizaines et unités.', '${{a}} \\times {{b}} = {{solution}}$']
};

/** Messages d'erreur des deux schémas (éditeur JSON strict, route d'écriture) */
function issues(t: object): string[] {
	const strict = questionTemplateSchema.safeParse(t);
	const server = createQuestionTemplateSchema.safeParse(t);
	return [
		...(strict.success ? [] : strict.error.issues.map((i) => `strict: ${i.message}`)),
		...(server.success ? [] : server.error.issues.map((i) => `route: ${i.message}`))
	];
}

describe('coup de pouce : écriture du modèle', () => {
	it('nominal : un indice écrit est accepté et gardé par la route', () => {
		const t = template({ hint: 'Pense à la table de ${{a}}$.' });
		expect(issues(t)).toEqual([]);
		const parsed = createQuestionTemplateSchema.parse(t);
		expect(parsed.variations?.[0]).toHaveProperty('hint', 'Pense à la table de ${{a}}$.');
	});

	it('nominal : la case « première étape » est acceptée et gardée par la route', () => {
		const t = template({ hintFromFirstStep: true, correction: TWO_STEPS });
		expect(issues(t)).toEqual([]);
		const parsed = createQuestionTemplateSchema.parse(t);
		expect(parsed.variations?.[0]).toHaveProperty('hintFromFirstStep', true);
	});

	it('la première étape peut venir de la correction partagée', () => {
		const t = template({ hintFromFirstStep: true }, { correction: TWO_STEPS });
		expect(issues(t)).toEqual([]);
	});

	it.each([
		['{{solution}}', 'La réponse est ${{solution}}$.'],
		['{{solution:1}}', 'Réponse : {{solution:1}}'],
		['{{ solution }}', 'Réponse : {{ solution }}'],
		['{{answer}}', 'Tu as écrit {{answer}}'],
		['{{solution_0}}', 'Regarde : {{solution_0}}'],
		['{{ solution_1 }}', 'Regarde : {{ solution_1 }}'],
		['{{answer_1}}', 'Tu as écrit {{answer_1}}']
	])('refusé : un indice écrit qui contient %s', (_label, hint) => {
		const all = issues(template({ hint }));
		expect(all.some((m) => m.startsWith('strict:') && /coup de pouce/i.test(m))).toBe(true);
		expect(all.some((m) => m.startsWith('route:') && /coup de pouce/i.test(m))).toBe(true);
	});

	it('refusé : indice écrit ET case « première étape »', () => {
		const t = template({
			hint: 'Pense aux tables.',
			hintFromFirstStep: true,
			correction: TWO_STEPS
		});
		expect(issues(t).filter((m) => /coup de pouce/i.test(m))).toHaveLength(2);
	});

	it('refusé : case « première étape » sans correction', () => {
		expect(issues(template({ hintFromFirstStep: true })).length).toBe(2);
	});

	it('refusé : case « première étape » sur une correction d’une seule étape', () => {
		const t = template({ hintFromFirstStep: true, correction: { steps: ['C’est {{solution}}.'] } });
		expect(issues(t).filter((m) => /coup de pouce/i.test(m))).toHaveLength(2);
	});

	it('refusé : case « première étape » dont l’étape affiche la réponse', () => {
		const t = template({
			hintFromFirstStep: true,
			correction: { steps: ['On trouve ${{solution}}$.', 'Donc c’est juste.'] }
		});
		expect(issues(t).filter((m) => /coup de pouce/i.test(m))).toHaveLength(2);
	});

	it('refusé : case « première étape » dont l’étape affiche une solution indexée', () => {
		const t = template({
			hintFromFirstStep: true,
			correction: { steps: ['On trouve {{solution_0}}.', 'Donc c’est juste.'] }
		});
		expect(issues(t).filter((m) => /coup de pouce/i.test(m))).toHaveLength(2);
	});

	it('accepté : une variable dont le nom commence par « solutions »', () => {
		expect(issues(template({ hint: 'Compte les {{solutions}} possibles.' }))).toEqual([]);
	});

	it('refusé : indice vide ou trop long', () => {
		expect(issues(template({ hint: '   ' })).length).toBeGreaterThanOrEqual(2);
		expect(issues(template({ hint: 'x'.repeat(1001) })).length).toBeGreaterThanOrEqual(2);
	});
});

describe('coup de pouce : tirage', () => {
	it('nominal : l’indice écrit prend les valeurs de la question', () => {
		const instance = generate(template({ hint: 'Pense à la table de ${{a}}$.' }));
		const a = instance.resolvedVariables?.find((v) => v.name === 'a')?.value;
		expect(instance.hint).toBe(`Pense à la table de $${a}$.`);
	});

	it('nominal : la case « première étape » donne la première étape résolue', () => {
		const instance = generate(template({ hintFromFirstStep: true, correction: TWO_STEPS }));
		expect(instance.hint).toBeDefined();
		expect(instance.hint).toBe(instance.correction?.steps?.[0]);
	});

	it('une première étape qui se résout en vide ne donne pas d’indice', () => {
		const t = template({
			hintFromFirstStep: true,
			correction: { steps: ['   ', 'Donc {{solution}}.'] }
		});
		expect(generate(t).hint).toBeUndefined();
	});

	it('sans indice : rien', () => {
		expect(generate(template()).hint).toBeUndefined();
	});

	it('un indice ne décale aucun tirage (même graine, même question)', () => {
		const withHint = template({ hint: 'Un nombre au hasard : {{random:1..100}}' });
		for (const seed of [1, 2, 3, 42, 1234]) {
			const a = generate(template(), seed);
			const b = generate(withHint, seed);
			expect(b.statement).toBe(a.statement);
			expect(b.blanks).toEqual(a.blanks);
			expect(b.resolvedVariables).toEqual(a.resolvedVariables);
		}
	});

	it('l’évaluation ne reçoit jamais l’indice', () => {
		const instance = generate(template({ hint: 'Pense à la table de ${{a}}$.' }));
		const pub = toPublicQuestion(instance, { position: 0, delaySeconds: 30 }) as unknown as Record<
			string,
			unknown
		>;
		expect(JSON.stringify(pub)).not.toContain('table de');
		expect(pub).not.toHaveProperty('hint');
	});
});
