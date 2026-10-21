/**
 * Onglet Mathoux du prof : élèves rangés par classe avec les compteurs de la
 * mémoire, et une panne qui se dit (`unavailable`) au lieu de zéros.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/mathoux/teacher', () => ({ loadMathouxCountsByStudent: vi.fn() }));

import { requireRole } from '$lib/server/middleware/auth';
import { loadMathouxCountsByStudent } from '$lib/server/mathoux/teacher';
import { load } from '../+page.server';

type Result = { data: unknown; error: unknown };

let classesResult: Result;
let membersResult: Result;

/** Chaîne PostgREST minimale : chaque méthode rend la chaîne, `await` rend le résultat. */
function chain(result: () => Result) {
	const builder = Object.assign(Promise.resolve().then(result), {
		select: () => builder,
		eq: () => builder,
		in: () => builder,
		order: () => builder
	});
	return builder;
}

const SUPABASE = {
	from: vi.fn((table: string) =>
		table === 'classes' ? chain(() => classesResult) : chain(() => membersResult)
	)
};
const locals = { supabase: SUPABASE } as unknown as App.Locals;

function run() {
	return load({ locals } as unknown as Parameters<typeof load>[0]);
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(requireRole).mockResolvedValue({ user: { id: 'prof' }, profile: {} } as never);
	classesResult = {
		data: [
			{ id: 'c1', name: '1re A' },
			{ id: 'c2', name: '1re B' }
		],
		error: null
	};
	membersResult = {
		data: [
			{
				class_id: 'c1',
				student_id: 's2',
				profiles: { full_name: 'Zoé', firstname: null, lastname: null }
			},
			{
				class_id: 'c1',
				student_id: 's1',
				profiles: { full_name: null, firstname: 'Alix', lastname: 'M.' }
			},
			{
				class_id: 'c2',
				student_id: 's1',
				profiles: { full_name: null, firstname: 'Alix', lastname: 'M.' }
			}
		],
		error: null
	};
	vi.mocked(loadMathouxCountsByStudent).mockResolvedValue(
		new Map([
			['s1', { born: 3, grandMatous: 1 }],
			['s2', { born: 0, grandMatous: 0 }]
		])
	);
});

describe('teacher/gamification/mathoux load', () => {
	it('réservé aux profs', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(run()).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(locals, 'teacher');
	});

	it('range les élèves par classe, triés par nom, avec les compteurs de la mémoire', async () => {
		await expect(run()).resolves.toEqual({
			unavailable: false,
			classesData: [
				{
					classId: 'c1',
					className: '1re A',
					students: [
						{ studentId: 's1', fullName: 'Alix M.', born: 3, grandMatous: 1 },
						{ studentId: 's2', fullName: 'Zoé', born: 0, grandMatous: 0 }
					]
				},
				{
					classId: 'c2',
					className: '1re B',
					students: [{ studentId: 's1', fullName: 'Alix M.', born: 3, grandMatous: 1 }]
				}
			]
		});
		// Un élève de deux classes n'est compté qu'une fois
		expect(loadMathouxCountsByStudent).toHaveBeenCalledWith(SUPABASE, ['s2', 's1']);
	});

	it('aucune classe active : liste vide, sans lire la mémoire', async () => {
		classesResult = { data: [], error: null };
		await expect(run()).resolves.toEqual({ classesData: [], unavailable: false });
		expect(loadMathouxCountsByStudent).not.toHaveBeenCalled();
	});

	it('mémoire illisible → unavailable, jamais des zéros', async () => {
		vi.mocked(loadMathouxCountsByStudent).mockRejectedValue(new Error('boom'));
		await expect(run()).resolves.toEqual({ classesData: [], unavailable: true });
	});

	it('élèves illisibles → unavailable', async () => {
		membersResult = { data: null, error: { message: 'boom' } };
		await expect(run()).resolves.toEqual({ classesData: [], unavailable: true });
	});
});
