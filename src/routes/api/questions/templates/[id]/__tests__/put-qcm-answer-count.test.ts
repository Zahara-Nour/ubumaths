/**
 * PUT /api/questions/templates/[id] — nombre de bonnes réponses d'un QCM (V1)
 * ==========================================================================
 *
 * Sans « plusieurs réponses », exactement une bonne réponse ; avec, au moins
 * une. Contrôlé sur le modèle FUSIONNÉ, brouillon compris pour l'excès (un
 * brouillon peut encore n'avoir aucune bonne réponse). Refus 400, en français.
 */
import { describe, it, expect } from 'vitest';
import { callPut, fakeDb } from './fake-templates-db';

const CHOICES = [
	{ content: 'Paris', isCorrect: true },
	{ content: 'Lyon', isCorrect: true },
	{ content: 'Nice', isCorrect: false }
];

function qcmBody(correctChoiceIndex: string | string[], multipleAnswers?: boolean) {
	return {
		status: 'draft',
		shared: null,
		variations: [{ statement: 'Quelles villes ?', choices: CHOICES, correctChoiceIndex }],
		...(multipleAnswers !== undefined && { multipleAnswers })
	};
}

describe('PUT : QCM, nombre de bonnes réponses', () => {
	it('brouillon, deux bonnes réponses sans « plusieurs réponses » → 400 en français, rien écrit', async () => {
		const db = fakeDb();
		const response = await callPut(db, qcmBody(['0', '1']));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors.join(' ')).toMatch(/plusieurs réponses/);
		expect(db.updates).toEqual([]);
	});

	it('deux bonnes réponses AVEC « plusieurs réponses » → enregistré', async () => {
		const db = fakeDb();
		const response = await callPut(db, qcmBody(['0', '1'], true));
		expect(response.status).not.toBe(400);
		expect(db.updates).toHaveLength(1);
	});

	it('« plusieurs réponses » déjà en base, corps sans la clé → fusionné, enregistré', async () => {
		const db = fakeDb();
		db.question_templates[0].multiple_answers = true;
		const response = await callPut(db, qcmBody(['0', '1']));
		expect(response.status).not.toBe(400);
	});

	it('une seule bonne réponse → enregistré', async () => {
		const db = fakeDb();
		const response = await callPut(db, qcmBody('0'));
		expect(response.status).not.toBe(400);
		expect(db.updates).toHaveLength(1);
	});
});
