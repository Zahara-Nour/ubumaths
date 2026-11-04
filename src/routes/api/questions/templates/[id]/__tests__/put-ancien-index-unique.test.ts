/**
 * PUT /api/questions/templates/[id] — ancien index unique des publiés (ADR 0035)
 * ==============================================================================
 *
 * `idx_question_templates_unique_category` (thème, domaine, sous-domaine, niveau) reste en base
 * jusqu'au lot 4. Publier un ancien modèle dont l'ancien quadruplet est déjà pris renvoie 23505 :
 * faute de saisie (400, en français), pas panne (500).
 */
import { describe, it, expect } from 'vitest';
import { callPut, fakeDb } from './fake-templates-db';

describe('PUT : 23505 de l’ancien index unique', () => {
	it('→ 400 avec un message français, rien de modifié côté fake', async () => {
		const db = fakeDb();
		db.uniqueError = {
			code: '23505',
			message: 'duplicate key idx_question_templates_unique_category'
		};
		const response = await callPut(db, { title: 'Nouveau titre' });

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.errors.join(' ')).toMatch(/même ancienne catégorie/);
	});

	it('une autre erreur de base reste une panne (500)', async () => {
		const db = fakeDb();
		db.uniqueError = { code: 'XX000', message: 'boom' };
		await expect(callPut(db, { title: 'Nouveau titre' })).rejects.toMatchObject({ status: 500 });
	});
});
