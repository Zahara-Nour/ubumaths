/**
 * Import d'élèves : chaque élève est-il validé ?
 * ==============================================
 *
 * Seule la chaîne JSON était validée : un courriel invalide, un niveau inconnu
 * (« septième ») ou 100 000 lignes partaient vers `pending_students`. Chaque
 * élève est désormais validé (champs, nombre), et le niveau est ramené à son
 * code (« 6ème » → « 6 »), la forme que portent les profils.
 *
 * @module routes/admin/import-students/validation-entrees.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440030';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440020';

interface ImportedStudent {
	email: string;
	firstname: string;
	lastname: string;
	grade: string | null;
	class_codes: string[];
}

const ALICE: ImportedStudent = {
	email: 'alice@ecole.fr',
	firstname: 'Alice',
	lastname: 'Dupont',
	grade: '6',
	class_codes: ['MATH6A']
};

function importRequest(students: unknown): Request {
	const body = new FormData();
	body.append('students', JSON.stringify(students));
	body.append('school_id', SCHOOL_ID);
	return new Request('http://localhost', { method: 'POST', body });
}

function createClient() {
	return createWriteVerdictSupabase({
		classes: { awaited: { data: [{ id: CLASS_ID, join_code: 'MATH6A' }], error: null } },
		pending_students: { awaited: { data: [{}], error: null } }
	});
}

async function runImport(students: unknown) {
	const fake = createClient();
	const { actions } = await import('../+page.server');
	const result = await actions.import({
		request: importRequest(students),
		locals: {
			supabase: fake.client,
			user: { id: ADMIN_ID },
			profile: { id: ADMIN_ID, role: 'admin' }
		}
	} as never);
	return { result, ...fake };
}

describe('admin/import-students : élève invalide → 400, rien d’écrit', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it.each([
		['courriel invalide', [{ ...ALICE, email: 'alice-sans-arobase' }]],
		['prénom vide', [{ ...ALICE, firstname: '  ' }]],
		['nom absent', [{ email: ALICE.email, firstname: 'Alice', grade: null, class_codes: [] }]],
		['niveau inconnu', [{ ...ALICE, grade: 'septième' }]],
		['code de classe qui n’est pas une chaîne', [{ ...ALICE, class_codes: [42] }]],
		['liste vide', []],
		[
			'plus de 1 000 élèves',
			Array.from({ length: 1001 }, (_, i) => ({ ...ALICE, email: `e${i}@ecole.fr` }))
		],
		['pas une liste', { ...ALICE }]
	])('%s', async (_label, students) => {
		const { result, client } = await runImport(students);
		expect(result).toMatchObject({ status: 400 });
		expect(client.from).not.toHaveBeenCalledWith('pending_students');
	});
});

describe('admin/import-students : élève valide → écrit normalisé', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('niveau « 6ème » ramené à « 6 », courriel en minuscules, code de classe résolu', async () => {
		const { result, chains } = await runImport([
			{ ...ALICE, email: '  Alice@Ecole.FR ', grade: '6ème', class_codes: ['math6a'] }
		]);
		expect(result).toMatchObject({ success: true });
		expect(chains.pending_students.insert).toHaveBeenCalledWith([
			{
				email: 'alice@ecole.fr',
				firstname: 'Alice',
				lastname: 'Dupont',
				grade: '6',
				school_id: SCHOOL_ID,
				class_ids: [CLASS_ID]
			}
		]);
	});

	it('sans niveau → null', async () => {
		const { chains } = await runImport([{ ...ALICE, grade: null }]);
		expect(chains.pending_students.insert).toHaveBeenCalledWith([
			expect.objectContaining({ grade: null })
		]);
	});
});
