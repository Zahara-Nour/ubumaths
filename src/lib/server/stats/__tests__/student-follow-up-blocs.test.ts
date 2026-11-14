/**
 * Suivi d'un élève, PR 2 : blocs « Régularité », « Compétences » et
 * « Contrôles » (chantier `suivi-eleve`, plan validé le 2026-11-14).
 * La base est simulée : on vérifie ce qui est lu et ce qui est rendu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/evaluations', () => ({ getStudentAssignments: vi.fn() }));

import { getStudentAssignments } from '$lib/server/evaluations';
import {
	getStudentCompetences,
	getStudentEvaluations,
	getStudentRegularity
} from '../student-follow-up';

// Constantes

const STUDENT = 's1';
/** Samedi 14 novembre 2026, midi à Paris */
const NOW = new Date('2026-11-14T11:00:00Z');

// Fausse base : chaque table rend ses lignes ; les filtres sont notés.

type Result = { data: unknown; error: { message: string } | null };

let tables: Record<string, Result>;
let calls: { table: string; method: string; args: unknown[] }[];

function fakeSupabase() {
	return {
		from(table: string) {
			const result = () => tables[table] ?? { data: [], error: null };
			const builder: Record<string, unknown> = {};
			for (const method of ['select', 'eq', 'in', 'gte', 'not', 'order', 'range']) {
				builder[method] = (...args: unknown[]) => {
					calls.push({ table, method, args });
					return builder;
				};
			}
			builder.maybeSingle = async () => {
				const r = result();
				return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
			};
			builder.then = (resolve: (r: Result) => unknown) => resolve(result());
			return builder;
		}
	} as never;
}

function trace(at: string, over: Record<string, unknown> = {}) {
	return { student_id: STUDENT, created_at: at, source: 'auto', place: 'typing', ...over };
}

beforeEach(() => {
	tables = {};
	calls = [];
	vi.clearAllMocks();
});

describe('getStudentRegularity', () => {
	it('rentrée de l’école de l’élève, un palier par semaine, ni nombre ni date de jour', async () => {
		tables.profiles = { data: [{ school_id: 'ecole-1' }], error: null };
		tables.school_years = { data: [{ id: 'an-1', start_date: '2026-09-01' }], error: null };
		tables.school_holidays = {
			data: [{ start_date: '2026-10-17', end_date: '2026-11-01' }],
			error: null
		};
		tables.skill_attempts = {
			data: Array.from({ length: 5 }, () => trace('2026-11-10T10:00:00Z')),
			error: null
		};

		const result = await getStudentRegularity(fakeSupabase(), STUDENT, NOW);

		expect(result.weeks[0].start).toBe('2026-08-31');
		expect(result.weeks.at(-1)?.start).toBe('2026-11-09');
		expect(result.tiers).toHaveLength(result.weeks.length);
		expect(result.tiers.at(-1)).toBe(1);
		expect(result.tiers.slice(0, -1).every((t) => t === 0)).toBe(true);
		expect(result.weeks.find((w) => w.start === '2026-10-19')?.holiday).toBe(true);
		expect(Object.keys(result).sort()).toEqual(['tiers', 'weeks']);

		// Traces de l'élève seulement, autonomes, depuis la veille de la rentrée (UTC)
		const traceFilters = calls.filter((c) => c.table === 'skill_attempts');
		expect(traceFilters).toContainEqual({
			table: 'skill_attempts',
			method: 'in',
			args: ['student_id', [STUDENT]]
		});
		expect(traceFilters).toContainEqual({
			table: 'skill_attempts',
			method: 'in',
			args: ['source', ['auto', 'srs', 'student_self']]
		});
		expect(traceFilters).toContainEqual({
			table: 'skill_attempts',
			method: 'gte',
			args: ['created_at', '2026-08-31T00:00:00.000Z']
		});
	});

	it('élève sans école → depuis le 1er septembre, sans vacances ni année lue', async () => {
		tables.profiles = { data: [{ school_id: null }], error: null };
		const result = await getStudentRegularity(fakeSupabase(), STUDENT, NOW);
		expect(result.weeks[0].start).toBe('2026-08-31');
		expect(result.weeks.every((w) => !w.holiday)).toBe(true);
		expect(calls.some((c) => c.table === 'school_years')).toBe(false);
	});

	it('traces illisibles → erreur, jamais une ligne vide', async () => {
		tables.profiles = { data: [{ school_id: null }], error: null };
		tables.skill_attempts = { data: null, error: { message: 'boom' } };
		await expect(getStudentRegularity(fakeSupabase(), STUDENT, NOW)).rejects.toThrow();
	});
});

describe('getStudentCompetences', () => {
	it('toutes les compétences dans l’ordre, niveau de l’élève ou null', async () => {
		tables.math_competences = {
			data: [
				{ id: 'c1', name: 'Chercher', display_order: 1 },
				{ id: 'c2', name: 'Modéliser', display_order: 2 }
			],
			error: null
		};
		tables.student_competence_level = {
			data: [{ math_competence_id: 'c2', niveau: 'fragile' }],
			error: null
		};
		const result = await getStudentCompetences(fakeSupabase(), STUDENT);
		expect(result).toEqual([
			{ id: 'c1', name: 'Chercher', level: null },
			{ id: 'c2', name: 'Modéliser', level: 'fragile' }
		]);
		expect(calls).toContainEqual({
			table: 'student_competence_level',
			method: 'eq',
			args: ['student_id', STUDENT]
		});
	});

	it('niveaux illisibles → erreur', async () => {
		tables.student_competence_level = { data: null, error: { message: 'boom' } };
		await expect(getStudentCompetences(fakeSupabase(), STUDENT)).rejects.toThrow();
	});
});

describe('getStudentEvaluations', () => {
	function assignment(id: string, created_at: string, over: Record<string, unknown> = {}) {
		return {
			evaluation: { id, created_at, series: { title: `Contrôle ${id}`, content: 'secret' } },
			best_grade: null,
			status: 'not_started',
			last_attempt_at: '2026-11-01T10:00:00Z',
			...over
		};
	}

	it('un contrôle par ligne, du plus récent au plus ancien, sans date ni série', async () => {
		vi.mocked(getStudentAssignments).mockResolvedValue([
			assignment('e1', '2026-09-10T10:00:00Z', { best_grade: 12.5, status: 'completed' }),
			assignment('e2', '2026-10-10T10:00:00Z'),
			// Assigné une seconde fois (nommément) : une seule ligne
			assignment('e1', '2026-09-10T10:00:00Z', { best_grade: 12.5, status: 'completed' })
		] as never);

		const supabase = fakeSupabase();
		const result = await getStudentEvaluations(supabase, STUDENT);

		expect(getStudentAssignments).toHaveBeenCalledWith(supabase, STUDENT);
		expect(result).toEqual([
			{ evaluation_id: 'e2', title: 'Contrôle e2', best_grade: null, status: 'not_started' },
			{ evaluation_id: 'e1', title: 'Contrôle e1', best_grade: 12.5, status: 'completed' }
		]);
	});

	it('lecture en échec → erreur propagée', async () => {
		vi.mocked(getStudentAssignments).mockRejectedValue(new Error('boom'));
		await expect(getStudentEvaluations(fakeSupabase(), STUDENT)).rejects.toThrow('boom');
	});
});
