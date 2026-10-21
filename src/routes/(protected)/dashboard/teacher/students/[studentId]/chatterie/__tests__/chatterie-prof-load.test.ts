/**
 * Chatterie d'un élève vue par le prof : la garde AVANT toute lecture, la
 * lecture seule (jamais `loadMathouCollection`, qui écrit la mémoire), et une
 * panne qui se dit (`unavailable`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/middleware/student-access', () => ({
	verifyTeacherStudentWithRole: vi.fn()
}));
vi.mock('$lib/server/mathoux/collection', () => ({
	readMathouCollection: vi.fn(),
	loadMathouCollection: vi.fn(),
	loadMathouCollectionWithNews: vi.fn()
}));

import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import {
	loadMathouCollection,
	loadMathouCollectionWithNews,
	readMathouCollection
} from '$lib/server/mathoux/collection';
import { load } from '../+page.server';

const STUDENT_ID = '7d3f6c2e-1b4a-4c8d-9e0f-123456789abc';
const EMPTY = { races: [], counts: { born: 0, napping: 0, toDiscover: 0 } };

let studentRow: Record<string, unknown> | null;

const SUPABASE = {
	from: vi.fn(() => ({
		select: () => ({
			eq: () => ({ maybeSingle: async () => ({ data: studentRow, error: null }) })
		})
	}))
};
const locals = { supabase: SUPABASE } as unknown as App.Locals;

function run(studentId = STUDENT_ID) {
	return load({ locals, params: { studentId } } as unknown as Parameters<typeof load>[0]);
}

beforeEach(() => {
	vi.clearAllMocks();
	studentRow = {
		id: STUDENT_ID,
		full_name: 'Alix Martin',
		firstname: null,
		lastname: null,
		grade: '1_SPE'
	};
	vi.mocked(requireRole).mockResolvedValue({
		user: { id: 'prof-1' },
		profile: { id: 'prof-1', role: 'teacher' }
	} as never);
	vi.mocked(verifyTeacherStudentWithRole).mockResolvedValue(true);
});

describe('teacher/students/[studentId]/chatterie load', () => {
	it('réservée au prof', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(run()).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(locals, 'teacher');
	});

	it('identifiant invalide → 400, sans aucune lecture', async () => {
		await expect(run('pas-un-uuid')).rejects.toMatchObject({ status: 400 });
		expect(verifyTeacherStudentWithRole).not.toHaveBeenCalled();
		expect(readMathouCollection).not.toHaveBeenCalled();
	});

	it('élève hors de ses classes → 403, sans aucune lecture', async () => {
		vi.mocked(verifyTeacherStudentWithRole).mockResolvedValue(false);
		await expect(run()).rejects.toMatchObject({ status: 403 });
		expect(SUPABASE.from).not.toHaveBeenCalled();
		expect(readMathouCollection).not.toHaveBeenCalled();
	});

	it('lit la Chatterie de l’élève à son niveau, en lecture seule', async () => {
		const collection = { races: [], counts: { born: 2, napping: 1, toDiscover: 3 } };
		vi.mocked(readMathouCollection).mockResolvedValue(collection);
		await expect(run()).resolves.toEqual({
			student: { id: STUDENT_ID, fullName: 'Alix Martin' },
			hasGrade: true,
			collection,
			unavailable: false
		});
		expect(readMathouCollection).toHaveBeenCalledWith(SUPABASE, STUDENT_ID, '1_SPE');
		// Jamais le calcul qui écrit la mémoire (il brûlerait les nouveautés de l'élève)
		expect(loadMathouCollection).not.toHaveBeenCalled();
		expect(loadMathouCollectionWithNews).not.toHaveBeenCalled();
	});

	it('élève sans niveau → hasGrade false', async () => {
		studentRow = { ...studentRow, grade: null };
		vi.mocked(readMathouCollection).mockResolvedValue(EMPTY);
		await expect(run()).resolves.toMatchObject({ hasGrade: false, unavailable: false });
	});

	it('élève introuvable → 404', async () => {
		studentRow = null;
		await expect(run()).rejects.toMatchObject({ status: 404 });
	});

	it('une lecture en échec → unavailable, collection vide', async () => {
		vi.mocked(readMathouCollection).mockRejectedValue(new Error('boom'));
		await expect(run()).resolves.toMatchObject({ collection: EMPTY, unavailable: true });
	});
});
