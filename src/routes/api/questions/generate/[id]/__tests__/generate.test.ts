/**
 * POST /api/questions/generate/[id] — aperçu d'un modèle
 * ========================================================
 *
 * La page d'aperçu admin (`/dashboard/admin/questions/[id]/preview`) passe par
 * cette route. Deux défauts la rendaient inutilisable :
 * - la garde n'acceptait que le rôle `teacher` : un vrai compte admin recevait 403 ;
 * - la conversion de la ligne oubliait `shared` : un modèle dont les variables
 *   sont déclarées dans le tronc commun (297 des 642 modèles en base) ne
 *   générait plus.
 *
 * La ligne ci-dessous a la forme réelle d'un modèle importé (question
 * TinyMath #139, « Trouver le double ») : ses variables vivent dans `shared`.
 */
import { describe, it, expect } from 'vitest';
import { POST } from '../+server';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '22222222-2222-4222-8222-222222222222';

const TEMPLATE_ROW = {
	id: TEMPLATE_ID,
	title: 'Trouver le double',
	description: null,
	theme: 'Entiers',
	domain: 'Multiplier',
	subdomain: 'Double et moitié',
	level: 4,
	status: 'draft',
	grades: ['CE1'],
	delay: 15,
	type: 'fill_in_blanks',
	precision: null,
	shared: { variables: [{ name: 'a', expression: '1..9|11..15|25|30|40|50|100' }] },
	variations: [
		{
			statement: 'Quel est le double de ${{a}}$ ?\n\nLe double de ${{a}}$ est $?$.',
			blanks: [{ expectedAnswer: '{{eval:2*a}}' }]
		}
	],
	options: null,
	default_display_options: null,
	test_specs: null,
	multiple_answers: null,
	exercise_instruction: null,
	created_at: null,
	updated_at: null,
	created_by: null
};

function fakeLocals(role: string) {
	return {
		safeGetSession: async () => ({ user: { id: USER_ID } }),
		supabase: {
			from(table: string) {
				const data = table === 'profiles' ? { id: USER_ID, role } : TEMPLATE_ROW;
				return {
					select: () => ({ eq: () => ({ single: async () => ({ data, error: null }) }) })
				};
			}
		}
	};
}

async function generate(role: string) {
	const request = new Request(`http://localhost/api/questions/generate/${TEMPLATE_ID}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ seed: 42 })
	});
	return POST({ request, params: { id: TEMPLATE_ID }, locals: fakeLocals(role) } as never);
}

describe('POST /api/questions/generate/[id]', () => {
	it("génère pour un compte admin (la page d'aperçu est une page admin)", async () => {
		const response = await generate('admin');
		expect(response.status).toBe(200);
	});

	it('génère pour un compte professeur', async () => {
		const response = await generate('teacher');
		expect(response.status).toBe(200);
	});

	it('refuse un élève', async () => {
		await expect(generate('student')).rejects.toMatchObject({ status: 403 });
	});

	it('résout les variables déclarées dans `shared`', async () => {
		const response = await generate('teacher');
		const body = await response.json();

		expect(body.success).toBe(true);
		const variableA = body.instance.resolvedVariables.find((v: { name: string }) => v.name === 'a');
		const a = Number(variableA.value);
		expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 25, 30, 40, 50, 100]).toContain(a);
		expect(body.instance.blanks[0].expectedAnswer).toBe(String(2 * a));
	});
});
