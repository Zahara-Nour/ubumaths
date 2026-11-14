/**
 * Suivi d'un élève, bloc « Points du programme » : fonction pure
 * `buildStudentPointFollowUp` (comptes prouvé / déclaré, badge, filtres).
 */
import { describe, it, expect } from 'vitest';
import { buildStudentPointFollowUp } from '../student-follow-up';

const NOW = Date.parse('2026-11-14T10:00:00Z');
const FUTURE = '2026-12-01T10:00:00Z';
const PAST = '2026-11-01T10:00:00Z';

function point(id: string, over: Record<string, unknown> = {}) {
	return {
		id,
		code: id,
		name: `Point ${id}`,
		display_order: 1,
		rubrique: null,
		archived_at: null,
		node_id: `n-${id}`,
		grade: '6',
		...over
	};
}

function link(template_id: string, p: ReturnType<typeof point> | null) {
	return { template_id, point_id: p?.id ?? 'x', curriculum_points: p };
}

function attempt(template_id: string, source: string, success: boolean | null) {
	return { template_id, source, success };
}

function run(opts: {
	attempts: ReturnType<typeof attempt>[];
	links: ReturnType<typeof link>[];
	fsrs?: {
		card_reference_id: string;
		state: 'new' | 'learning' | 'review' | 'relearning';
		next_review: string;
	}[];
	grade?: string | null;
}) {
	return buildStudentPointFollowUp({
		attempts: opts.attempts,
		links: opts.links,
		fsrs: opts.fsrs ?? [],
		grade: opts.grade === undefined ? '6' : opts.grade,
		now: NOW
	});
}

describe('buildStudentPointFollowUp', () => {
	it('compte prouvé (auto + teacher) et déclaré (student_self + srs), réussies comprises', () => {
		const p = point('p1');
		const [entry] = run({
			links: [link('t1', p)],
			attempts: [
				attempt('t1', 'auto', true),
				attempt('t1', 'auto', false),
				attempt('t1', 'teacher', true),
				attempt('t1', 'student_self', true),
				attempt('t1', 'srs', false)
			]
		});
		expect(entry.point.id).toBe('p1');
		expect(entry.proved).toEqual({ done: 3, succeeded: 2 });
		expect(entry.declared).toEqual({ done: 2, succeeded: 1 });
		expect(entry.onlyDeclared).toBe(false);
	});

	it('seulement déclaré : prouvé à 0 et déclaré > 0', () => {
		const [entry] = run({
			links: [link('t1', point('p1'))],
			attempts: [attempt('t1', 'student_self', true)]
		});
		expect(entry.proved).toEqual({ done: 0, succeeded: 0 });
		expect(entry.declared).toEqual({ done: 1, succeeded: 1 });
		expect(entry.onlyDeclared).toBe(true);
	});

	it('seulement prouvé : pas de marque', () => {
		const [entry] = run({
			links: [link('t1', point('p1'))],
			attempts: [attempt('t1', 'auto', false)]
		});
		expect(entry.onlyDeclared).toBe(false);
	});

	it('success NULL : compté nulle part, le point reste travaillé', () => {
		const [entry] = run({
			links: [link('t1', point('p1'))],
			attempts: [attempt('t1', 'auto', null), attempt('t1', 'student_self', null)]
		});
		expect(entry.proved).toEqual({ done: 0, succeeded: 0 });
		expect(entry.declared).toEqual({ done: 0, succeeded: 0 });
		expect(entry.onlyDeclared).toBe(false);
	});

	it('source inconnue : comptée nulle part', () => {
		const [entry] = run({
			links: [link('t1', point('p1'))],
			attempts: [attempt('t1', 'mystere', true), attempt('t1', 'auto', true)]
		});
		expect(entry.proved).toEqual({ done: 1, succeeded: 1 });
		expect(entry.declared).toEqual({ done: 0, succeeded: 0 });
	});

	it('somme les traces de tous les modèles du point', () => {
		const [entry] = run({
			links: [link('t1', point('p1')), link('t2', point('p1'))],
			attempts: [attempt('t1', 'auto', true), attempt('t2', 'auto', false)]
		});
		expect(entry.proved).toEqual({ done: 2, succeeded: 1 });
	});

	it('trace sans modèle ou modèle sans point : aucun point', () => {
		expect(
			run({ links: [link('t1', point('p1'))], attempts: [attempt('t9', 'auto', true)] })
		).toEqual([]);
	});

	it('point d’un autre niveau écarté quand le modèle a aussi un point du niveau', () => {
		const entries = run({
			links: [link('t1', point('p6', { grade: '6' })), link('t1', point('p5', { grade: '5' }))],
			attempts: [attempt('t1', 'auto', true)]
		});
		expect(entries.map((e) => e.point.id)).toEqual(['p6']);
	});

	it('point archivé écarté', () => {
		const entries = run({
			links: [link('t1', point('p1', { archived_at: '2026-01-01T00:00:00Z' }))],
			attempts: [attempt('t1', 'auto', true)]
		});
		expect(entries).toEqual([]);
	});

	it('point sans niveau (ancien) écarté', () => {
		const entries = run({
			links: [link('t1', point('p1', { grade: null }))],
			attempts: [attempt('t1', 'auto', true)]
		});
		expect(entries).toEqual([]);
	});

	it('badge : le pire des modèles du point (même règle que la grille A)', () => {
		const [entry] = run({
			links: [link('t1', point('p1')), link('t2', point('p1'))],
			attempts: [attempt('t1', 'auto', true), attempt('t2', 'auto', true)],
			fsrs: [
				{ card_reference_id: 't1', state: 'review', next_review: FUTURE },
				{ card_reference_id: 't2', state: 'learning', next_review: PAST }
			]
		});
		expect(entry.badge).toBe('a_remedier');
	});

	it('badge : modèle travaillé sans mémoire FSRS = en apprentissage', () => {
		const [entry] = run({
			links: [link('t1', point('p1'))],
			attempts: [attempt('t1', 'auto', true)]
		});
		expect(entry.badge).toBe('en_apprentissage');
	});

	it('badge : acquis quand la révision n’est pas due', () => {
		const [entry] = run({
			links: [link('t1', point('p1'))],
			attempts: [attempt('t1', 'auto', true)],
			fsrs: [{ card_reference_id: 't1', state: 'review', next_review: FUTURE }]
		});
		expect(entry.badge).toBe('acquise_en_memoire');
	});
});
