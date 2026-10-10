/**
 * Type de question « carte de cours » (nécessite une base locale)
 * ================================================================
 *
 * Migration : 20260928120000_question_templates_type_carte_de_cours.sql
 * Spécification : docs/archive/wip/cartes-de-cours-progress.md
 *
 * La contrainte `question_templates_type_check` doit admettre `course_card` et
 * continuer de refuser un type inconnu. Chaque assertion vérifie une valeur relue.
 *
 * @vitest-environment node
 */
import { describe, it, expect, afterAll } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const CARD_ID = '0a11f0e0-0000-4000-8000-0000000cc001';
const UNKNOWN_ID = '0a11f0e0-0000-4000-8000-0000000cc002';

function template(id: string, type: string) {
	return {
		id,
		type,
		title: `Carte de cours — ${type}`,
		theme: 'Test',
		domain: 'Cartes',
		level: 1,
		grades: ['6'],
		status: 'draft',
		variations: [
			{
				statement: 'Que permet de trouver la dérivée ?',
				correction: { steps: ['Ses variations et ses extremums.'] }
			}
		]
	};
}

describe('question_templates.type — carte de cours', () => {
	const service = createServiceRoleClient();

	afterAll(async () => {
		await service.from('question_templates').delete().in('id', [CARD_ID, UNKNOWN_ID]);
	});

	it('une carte de cours s’enregistre avec le type course_card', async () => {
		await service.from('question_templates').delete().eq('id', CARD_ID);
		const { error } = await service
			.from('question_templates')
			.insert(template(CARD_ID, 'course_card'));
		expect(error).toBeNull();

		const { data } = await service
			.from('question_templates')
			.select('id, type')
			.eq('id', CARD_ID)
			.single();
		expect(data?.type).toBe('course_card');
	});

	it('un type inconnu reste refusé par la contrainte', async () => {
		const { error } = await service
			.from('question_templates')
			// type volontairement invalide (`type` est un simple `string` dans les types générés)
			.insert(template(UNKNOWN_ID, 'flash'));
		expect(error?.message ?? '').toMatch(/question_templates_type_check/);
	});
});
