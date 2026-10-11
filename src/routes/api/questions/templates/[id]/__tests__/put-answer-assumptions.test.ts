/**
 * PUT /api/questions/templates/[id] — hypothèses de l'énoncé (ADR 0012)
 * =====================================================================
 *
 * Une mise à jour PARTIELLE peut envoyer `options.answerAssumptions` sans
 * `variations` ni `shared` : le schéma ne voit alors aucune variable tirée.
 * La route fusionne avec la ligne en base et refuse (400,
 * français) une hypothèse posée sur une variable tirée.
 *
 * Base simulée en mémoire, ligne de la forme réelle : question TinyMath #139
 * relue (`data/relecture/entiers/139.json`), variable tirée `a` dans `shared`.
 */
import { describe, it, expect } from 'vitest';
import { callPut, fakeDb } from './fake-templates-db';

describe('PUT partiel : collision relue en base', () => {
	it('hypothèse sur `a` (tirée, dans shared en base) sans shared ni variations → 400, rien écrit', async () => {
		const db = fakeDb();
		const response = await callPut(db, {
			status: 'draft',
			options: { answerAssumptions: { a: 'positive' } }
		});

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors.join(' ')).toMatch(/« a » est une variable tirée/);
		expect(db.updates).toEqual([]);
	});

	it('hypothèse sur `x` (libre) → pas de refus pour collision', async () => {
		const db = fakeDb();
		const response = await callPut(db, {
			status: 'draft',
			options: { answerAssumptions: { x: 'positive' } }
		});
		expect(response.status).not.toBe(400);
		expect(db.updates).toHaveLength(1);
	});

	it('modèle absent → 404, pas de 500', async () => {
		const db = fakeDb();
		db.question_templates = [];
		const response = await callPut(db, {
			status: 'draft',
			options: { answerAssumptions: { x: 'positive' } }
		}).catch((err: { status?: number }) => ({ status: err.status }));
		expect(response.status).toBe(404);
	});
});
