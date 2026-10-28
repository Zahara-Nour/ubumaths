/**
 * PUT / POST des modèles — le QCM est une case (ADR 0033, lot 5)
 * =============================================================
 *
 * Le type `multiple_choice` et les champs du QCM de modèle (`choices`,
 * `correctChoiceIndex`, `multipleAnswers`, `options.shuffleChoices`) n'existent
 * plus : une question à choix s'écrit avec un bloc ```choix. Reçus, ils sont
 * refusés (400, message en français qui renvoie à la case choix), jamais
 * retirés en silence.
 */
import { describe, it, expect } from 'vitest';
import { callPost, callPut, fakeDb, FIXTURE } from './fake-templates-db';

const CHOICES = [
	{ content: 'Paris', isCorrect: true },
	{ content: 'Lyon', isCorrect: false }
];

/** Corps refusé → 400, message « case choix », rien écrit */
async function expectRefusedPut(body: Record<string, unknown>) {
	const db = fakeDb();
	const response = await callPut(db, { status: 'draft', ...body });
	expect(response.status).toBe(400);
	const json = await response.json();
	expect(json.errors.join(' ')).toMatch(/case choix/);
	expect(db.updates).toEqual([]);
}

describe('PUT : champs du QCM refusés', () => {
	it('type « multiple_choice » → 400', async () => {
		await expectRefusedPut({ type: 'multiple_choice' });
	});

	it('choix d’une variation → 400', async () => {
		await expectRefusedPut({
			variations: [{ statement: 'Capitale ?', choices: CHOICES, correctChoiceIndex: '0' }]
		});
	});

	it('bonne réponse de QCM d’une variation, seule → 400', async () => {
		await expectRefusedPut({ variations: [{ statement: 'Capitale ?', correctChoiceIndex: '0' }] });
	});

	it('choix partagés → 400', async () => {
		await expectRefusedPut({ shared: { statement: 'Capitale ?', choices: CHOICES } });
	});

	it('bonne réponse partagée → 400', async () => {
		await expectRefusedPut({ shared: { correctChoiceIndex: '0' } });
	});

	it('« plusieurs réponses » du modèle → 400', async () => {
		await expectRefusedPut({ multipleAnswers: true });
	});

	it('« mélanger les choix » des options → 400', async () => {
		await expectRefusedPut({ options: { shuffleChoices: false } });
	});

	it('modèle à cases sans champ de QCM → enregistré', async () => {
		const db = fakeDb();
		const response = await callPut(db, { status: 'draft', title: 'Nouveau titre' });
		expect(response.status).not.toBe(400);
		expect(db.updates).toHaveLength(1);
	});
});

describe('POST : champs du QCM refusés', () => {
	it('type « multiple_choice » → 400, rien inséré', async () => {
		const db = fakeDb();
		db.question_templates = [];
		const { status: _status, ...template } = structuredClone(FIXTURE);
		const response = await callPost(db, { ...template, status: 'draft', type: 'multiple_choice' });
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.errors.join(' ')).toMatch(/case choix/);
		expect(db.inserts).toEqual([]);
	});
});
