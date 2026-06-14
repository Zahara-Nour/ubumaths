/**
 * Unit tests for capacity-badge.ts
 * =================================
 *
 * Tests les 4 fonctions exportées du helper de badge FSRS agrégé.
 *
 * Couverture :
 *   - templateToBadge (pure) : règle de mapping (state, nextReview) → badge
 *     pour 5 sorties possibles + cas spéciaux (state='new', nextReview=null).
 *   - worstBadge (pure) : agrégation par priorité descendante.
 *   - aggregateBadge (pure) : composition templateToBadge + worstBadge.
 *   - computeCapacityBadges (avec mock Supabase) : 2 round-trips DB + agrégation.
 *
 * Source : src/lib/server/srs/capacity-badge.ts (refonte chantier 2026-06-10)
 * Spec    : docs/wip/srs-fsrs-spec-tdd.md §5 + docs/ref/srs/architecture.md §5
 */

import { describe, it, expect, vi } from 'vitest';
import {
	templateToBadge,
	worstBadge,
	aggregateBadge,
	computeCapacityBadges,
	BADGE_LABEL,
	BADGE_VISUAL,
	BADGE_PRIORITY,
	type CapacityBadge
} from '../capacity-badge';

// ============================================================================
// templateToBadge — règle de mapping pour 1 template
// ============================================================================

describe('templateToBadge', () => {
	const now = Date.now();
	const pastDate = (msAgo: number) => new Date(now - msAgo).toISOString();
	const futureDate = (msAhead: number) => new Date(now + msAhead).toISOString();

	describe('state = "new" — cas spécial', () => {
		it('returns en_apprentissage when state=new and nextReview is in the past', () => {
			expect(templateToBadge('new', pastDate(1000), now)).toBe('en_apprentissage');
		});

		it('returns en_apprentissage when state=new and nextReview is in the future', () => {
			expect(templateToBadge('new', futureDate(86_400_000), now)).toBe('en_apprentissage');
		});

		it('returns en_apprentissage when state=new and nextReview is null', () => {
			expect(templateToBadge('new', null, now)).toBe('en_apprentissage');
		});

		it('returns en_apprentissage when state=new and nextReview equals now', () => {
			expect(templateToBadge('new', new Date(now).toISOString(), now)).toBe('en_apprentissage');
		});
	});

	describe('nextReview = null — cas dégradé', () => {
		it('returns en_apprentissage when state=learning and nextReview is null', () => {
			expect(templateToBadge('learning', null, now)).toBe('en_apprentissage');
		});

		it('returns en_apprentissage when state=review and nextReview is null', () => {
			expect(templateToBadge('review', null, now)).toBe('en_apprentissage');
		});

		it('returns en_apprentissage when state=relearning and nextReview is null', () => {
			expect(templateToBadge('relearning', null, now)).toBe('en_apprentissage');
		});
	});

	describe('state = "learning" — apprentissage initial', () => {
		it('returns a_remedier when learning + nextReview in past', () => {
			expect(templateToBadge('learning', pastDate(86_400_000), now)).toBe('a_remedier');
		});

		it('returns en_apprentissage when learning + nextReview in future', () => {
			expect(templateToBadge('learning', futureDate(86_400_000), now)).toBe('en_apprentissage');
		});

		it('treats nextReview exactly equal to nowMs as due (a_remedier)', () => {
			// Convention : nextReviewMs <= nowMs → isDue=true.
			expect(templateToBadge('learning', new Date(now).toISOString(), now)).toBe('a_remedier');
		});
	});

	describe('state = "relearning" — réapprentissage après chute', () => {
		it('returns a_remedier when relearning + nextReview in past', () => {
			expect(templateToBadge('relearning', pastDate(3600_000), now)).toBe('a_remedier');
		});

		it('returns en_apprentissage when relearning + nextReview in future', () => {
			expect(templateToBadge('relearning', futureDate(86_400_000), now)).toBe('en_apprentissage');
		});
	});

	describe('state = "review" — maintenance d une carte stable', () => {
		it('returns a_renforcer when review + nextReview in past', () => {
			expect(templateToBadge('review', pastDate(86_400_000), now)).toBe('a_renforcer');
		});

		it('returns acquise_en_memoire when review + nextReview in future', () => {
			expect(templateToBadge('review', futureDate(86_400_000 * 7), now)).toBe('acquise_en_memoire');
		});

		it('treats nextReview exactly equal to nowMs as due (a_renforcer)', () => {
			expect(templateToBadge('review', new Date(now).toISOString(), now)).toBe('a_renforcer');
		});
	});

	describe('toutes les transitions de l état dérivent isDue cohéremment', () => {
		it('applies the same isDue boundary across all non-new states', () => {
			// nextReview = now → due pour tous les states
			expect(templateToBadge('learning', new Date(now).toISOString(), now)).toBe('a_remedier');
			expect(templateToBadge('relearning', new Date(now).toISOString(), now)).toBe('a_remedier');
			expect(templateToBadge('review', new Date(now).toISOString(), now)).toBe('a_renforcer');
			// state='new' échappe à cette règle (toujours en_apprentissage)
			expect(templateToBadge('new', new Date(now).toISOString(), now)).toBe('en_apprentissage');
		});
	});
});

// ============================================================================
// worstBadge — priorité descendante
// ============================================================================

describe('worstBadge', () => {
	it('returns non_commencee for empty array', () => {
		expect(worstBadge([])).toBe('non_commencee');
	});

	it('returns the only badge for single-element array', () => {
		expect(worstBadge(['acquise_en_memoire'])).toBe('acquise_en_memoire');
		expect(worstBadge(['a_remedier'])).toBe('a_remedier');
	});

	it('returns a_remedier when present alongside any other badge', () => {
		expect(worstBadge(['acquise_en_memoire', 'a_remedier', 'en_apprentissage'])).toBe('a_remedier');
		expect(worstBadge(['a_renforcer', 'a_remedier'])).toBe('a_remedier');
		expect(worstBadge(['non_commencee', 'a_remedier'])).toBe('a_remedier');
	});

	it('returns a_renforcer when no a_remedier but a_renforcer present', () => {
		expect(worstBadge(['acquise_en_memoire', 'a_renforcer'])).toBe('a_renforcer');
		expect(worstBadge(['en_apprentissage', 'a_renforcer'])).toBe('a_renforcer');
	});

	it('returns en_apprentissage when only en_apprentissage and acquise_en_memoire', () => {
		expect(worstBadge(['acquise_en_memoire', 'en_apprentissage'])).toBe('en_apprentissage');
	});

	it('returns acquise_en_memoire when only acquise_en_memoire and non_commencee', () => {
		expect(worstBadge(['acquise_en_memoire', 'non_commencee'])).toBe('acquise_en_memoire');
	});

	it('returns non_commencee when all elements are non_commencee', () => {
		expect(worstBadge(['non_commencee', 'non_commencee'])).toBe('non_commencee');
	});

	it('handles duplicates without altering result', () => {
		expect(worstBadge(['a_remedier', 'a_remedier', 'a_remedier'])).toBe('a_remedier');
		expect(worstBadge(['acquise_en_memoire', 'acquise_en_memoire'])).toBe('acquise_en_memoire');
	});

	it('respects priority order: a_remedier > a_renforcer > en_apprentissage > acquise_en_memoire > non_commencee', () => {
		const all: CapacityBadge[] = [
			'non_commencee',
			'acquise_en_memoire',
			'en_apprentissage',
			'a_renforcer',
			'a_remedier'
		];
		expect(worstBadge(all)).toBe('a_remedier');
		expect(worstBadge(all.slice(0, 4))).toBe('a_renforcer');
		expect(worstBadge(all.slice(0, 3))).toBe('en_apprentissage');
		expect(worstBadge(all.slice(0, 2))).toBe('acquise_en_memoire');
		expect(worstBadge(all.slice(0, 1))).toBe('non_commencee');
	});
});

// ============================================================================
// aggregateBadge — composition templateToBadge + worstBadge
// ============================================================================

describe('aggregateBadge', () => {
	const now = Date.now();
	const past = new Date(now - 86_400_000).toISOString();
	const future = new Date(now + 86_400_000 * 7).toISOString();

	it('returns non_commencee for empty states array', () => {
		expect(aggregateBadge([], now)).toBe('non_commencee');
	});

	it('returns a_remedier if any state is due + learning/relearning', () => {
		const states = [
			{ card_reference_id: 't1', state: 'review' as const, next_review: future },
			{ card_reference_id: 't2', state: 'learning' as const, next_review: past }
		];
		expect(aggregateBadge(states, now)).toBe('a_remedier');
	});

	it('returns a_renforcer if any state is due + review (and none in remedier)', () => {
		const states = [
			{ card_reference_id: 't1', state: 'review' as const, next_review: past },
			{ card_reference_id: 't2', state: 'learning' as const, next_review: future }
		];
		expect(aggregateBadge(states, now)).toBe('a_renforcer');
	});

	it('returns en_apprentissage when mix of acquise and apprentissage', () => {
		const states = [
			{ card_reference_id: 't1', state: 'review' as const, next_review: future },
			{ card_reference_id: 't2', state: 'learning' as const, next_review: future }
		];
		expect(aggregateBadge(states, now)).toBe('en_apprentissage');
	});

	it('returns acquise_en_memoire when all templates are review + not due', () => {
		const states = [
			{ card_reference_id: 't1', state: 'review' as const, next_review: future },
			{ card_reference_id: 't2', state: 'review' as const, next_review: future }
		];
		expect(aggregateBadge(states, now)).toBe('acquise_en_memoire');
	});

	it('respects the templateToBadge state=new convention (en_apprentissage)', () => {
		const states = [
			{ card_reference_id: 't1', state: 'new' as const, next_review: past } // due AND new → en_apprentissage
		];
		expect(aggregateBadge(states, now)).toBe('en_apprentissage');
	});

	it('aggregates priority correctly when 3+ templates with different states', () => {
		const states = [
			{ card_reference_id: 't1', state: 'review' as const, next_review: future }, // acquise_en_memoire
			{ card_reference_id: 't2', state: 'learning' as const, next_review: future }, // en_apprentissage
			{ card_reference_id: 't3', state: 'review' as const, next_review: past } // a_renforcer
		];
		expect(aggregateBadge(states, now)).toBe('a_renforcer'); // priorité la plus haute
	});
});

// ============================================================================
// computeCapacityBadges — query DB + agrégation (mock Supabase)
// ============================================================================

describe('computeCapacityBadges', () => {
	/**
	 * Helper : crée un mock Supabase qui retourne les données fournies.
	 * Le mock chaîne `.from().select().in()` puis renvoie `{ data, error }`.
	 */
	function buildMockSupabase(
		tagMappings: Array<{ skill_id: string; template_id: string }>,
		fsrsRows: Array<{ card_reference_id: string; state: string; next_review: string }>
	): Parameters<typeof computeCapacityBadges>[0] {
		const fromMock = vi.fn().mockImplementation((table: string) => {
			if (table === 'question_template_skills') {
				return {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockResolvedValue({ data: tagMappings, error: null })
				};
			}
			if (table === 'srs_card_stats') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					in: vi.fn().mockResolvedValue({ data: fsrsRows, error: null })
				};
			}
			throw new Error(`Unexpected table in mock: ${table}`);
		});
		return { from: fromMock } as unknown as Parameters<typeof computeCapacityBadges>[0];
	}

	it('returns empty Map when skillIds is empty', async () => {
		const supabase = buildMockSupabase([], []);
		const result = await computeCapacityBadges(supabase, 'student-uuid', []);
		expect(result.size).toBe(0);
	});

	it('returns non_commencee for skills with no template tagged', async () => {
		const supabase = buildMockSupabase([], []); // pas de mappings → pas de templates
		const result = await computeCapacityBadges(supabase, 'student-uuid', ['skill-1', 'skill-2']);
		expect(result.get('skill-1')).toBe('non_commencee');
		expect(result.get('skill-2')).toBe('non_commencee');
	});

	it('returns non_commencee for skills tagged on templates without FSRS state', async () => {
		const supabase = buildMockSupabase(
			[{ skill_id: 'skill-1', template_id: 'tpl-1' }], // skill tagué
			[] // mais aucun FSRS row
		);
		const result = await computeCapacityBadges(supabase, 'student-uuid', ['skill-1']);
		expect(result.get('skill-1')).toBe('non_commencee');
	});

	it('aggregates badges across multiple templates per skill', async () => {
		const now = Date.now();
		const past = new Date(now - 86_400_000).toISOString();
		const future = new Date(now + 86_400_000 * 7).toISOString();
		const supabase = buildMockSupabase(
			[
				{ skill_id: 'skill-A', template_id: 'tpl-1' },
				{ skill_id: 'skill-A', template_id: 'tpl-2' }
			],
			[
				{ card_reference_id: 'tpl-1', state: 'review', next_review: future }, // acquise_en_memoire
				{ card_reference_id: 'tpl-2', state: 'learning', next_review: past } // a_remedier
			]
		);
		const result = await computeCapacityBadges(supabase, 'student-uuid', ['skill-A']);
		// Priorité descendante : a_remedier l emporte
		expect(result.get('skill-A')).toBe('a_remedier');
	});

	it('handles multiple skills independently', async () => {
		const future = new Date(Date.now() + 86_400_000 * 7).toISOString();
		const supabase = buildMockSupabase(
			[
				{ skill_id: 'skill-A', template_id: 'tpl-1' },
				{ skill_id: 'skill-B', template_id: 'tpl-2' }
			],
			[
				{ card_reference_id: 'tpl-1', state: 'review', next_review: future }, // skill-A : acquise
				{ card_reference_id: 'tpl-2', state: 'learning', next_review: future } // skill-B : apprentissage
			]
		);
		const result = await computeCapacityBadges(supabase, 'student-uuid', ['skill-A', 'skill-B']);
		expect(result.get('skill-A')).toBe('acquise_en_memoire');
		expect(result.get('skill-B')).toBe('en_apprentissage');
	});

	it('returns non_commencee for all skillIds when tag lookup fails', async () => {
		const supabase = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB connection lost' } })
			})
		} as unknown as Parameters<typeof computeCapacityBadges>[0];
		const result = await computeCapacityBadges(supabase, 'student-uuid', ['skill-1', 'skill-2']);
		expect(result.get('skill-1')).toBe('non_commencee');
		expect(result.get('skill-2')).toBe('non_commencee');
	});

	it('returns non_commencee for all skillIds when FSRS lookup fails', async () => {
		const fromMock = vi.fn().mockImplementation((table: string) => {
			if (table === 'question_template_skills') {
				return {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockResolvedValue({
						data: [{ skill_id: 'skill-1', template_id: 'tpl-1' }],
						error: null
					})
				};
			}
			if (table === 'srs_card_stats') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					in: vi.fn().mockResolvedValue({ data: null, error: { message: 'timeout' } })
				};
			}
			throw new Error(`Unexpected table: ${table}`);
		});
		const supabase = { from: fromMock } as unknown as Parameters<typeof computeCapacityBadges>[0];
		const result = await computeCapacityBadges(supabase, 'student-uuid', ['skill-1']);
		expect(result.get('skill-1')).toBe('non_commencee');
	});

	it('deduplicates template_ids across skills (1 fsrs lookup per template)', async () => {
		// Si 2 skills partagent le même template, l agrégation doit utiliser 1 SELECT FSRS.
		const past = new Date(Date.now() - 86_400_000).toISOString();
		let fsrsLookupTemplateIds: string[] = [];
		const fromMock = vi.fn().mockImplementation((table: string) => {
			if (table === 'question_template_skills') {
				return {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockResolvedValue({
						data: [
							{ skill_id: 'skill-A', template_id: 'tpl-shared' },
							{ skill_id: 'skill-B', template_id: 'tpl-shared' }
						],
						error: null
					})
				};
			}
			if (table === 'srs_card_stats') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					in: vi.fn().mockImplementation((_col: string, ids: string[]) => {
						fsrsLookupTemplateIds = ids;
						return Promise.resolve({
							data: [{ card_reference_id: 'tpl-shared', state: 'review', next_review: past }],
							error: null
						});
					})
				};
			}
			throw new Error(`Unexpected table: ${table}`);
		});
		const supabase = { from: fromMock } as unknown as Parameters<typeof computeCapacityBadges>[0];
		const result = await computeCapacityBadges(supabase, 'student-uuid', ['skill-A', 'skill-B']);

		// 1 seul template id passé au SELECT FSRS (déduplication)
		expect(fsrsLookupTemplateIds).toHaveLength(1);
		expect(fsrsLookupTemplateIds[0]).toBe('tpl-shared');

		// Les 2 skills reçoivent le badge (review + due) = a_renforcer
		expect(result.get('skill-A')).toBe('a_renforcer');
		expect(result.get('skill-B')).toBe('a_renforcer');
	});
});

// ============================================================================
// Constants exportées — sanity check
// ============================================================================

describe('BADGE_LABEL + BADGE_VISUAL', () => {
	it('BADGE_LABEL has all 5 CapacityBadge keys', () => {
		const keys: CapacityBadge[] = [
			'a_remedier',
			'a_renforcer',
			'acquise_en_memoire',
			'en_apprentissage',
			'non_commencee'
		];
		for (const key of keys) {
			expect(BADGE_LABEL[key]).toBeDefined();
			expect(typeof BADGE_LABEL[key]).toBe('string');
			expect(BADGE_LABEL[key].length).toBeGreaterThan(0);
		}
	});

	it('BADGE_VISUAL has all 5 CapacityBadge keys with emoji', () => {
		const keys: CapacityBadge[] = [
			'a_remedier',
			'a_renforcer',
			'acquise_en_memoire',
			'en_apprentissage',
			'non_commencee'
		];
		for (const key of keys) {
			expect(BADGE_VISUAL[key]).toBeDefined();
			expect(typeof BADGE_VISUAL[key]).toBe('string');
		}
	});

	it('uses distinctive labels for each badge', () => {
		const labels = new Set(Object.values(BADGE_LABEL));
		expect(labels.size).toBe(5);
	});

	it('uses distinctive visuals for each badge', () => {
		const visuals = new Set(Object.values(BADGE_VISUAL));
		expect(visuals.size).toBe(5);
	});
});

// ============================================================================
// BADGE_PRIORITY — exporté (chantier 2026-06-10 minor #3.4)
// ============================================================================

describe('BADGE_PRIORITY (exporté)', () => {
	it('contient les 5 badges avec des valeurs numériques distinctes', () => {
		const keys: CapacityBadge[] = [
			'a_remedier',
			'a_renforcer',
			'acquise_en_memoire',
			'en_apprentissage',
			'non_commencee'
		];
		for (const key of keys) {
			expect(BADGE_PRIORITY[key]).toBeDefined();
			expect(typeof BADGE_PRIORITY[key]).toBe('number');
		}
		const values = new Set(Object.values(BADGE_PRIORITY));
		expect(values.size).toBe(5);
	});

	it('respecte l ordre descendant : a_remedier > a_renforcer > en_apprentissage > acquise_en_memoire > non_commencee', () => {
		expect(BADGE_PRIORITY.a_remedier).toBeGreaterThan(BADGE_PRIORITY.a_renforcer);
		expect(BADGE_PRIORITY.a_renforcer).toBeGreaterThan(BADGE_PRIORITY.en_apprentissage);
		expect(BADGE_PRIORITY.en_apprentissage).toBeGreaterThan(BADGE_PRIORITY.acquise_en_memoire);
		expect(BADGE_PRIORITY.acquise_en_memoire).toBeGreaterThan(BADGE_PRIORITY.non_commencee);
	});

	it('peut servir de comparateur Array.sort()', () => {
		const arr: CapacityBadge[] = [
			'acquise_en_memoire',
			'a_remedier',
			'non_commencee',
			'en_apprentissage',
			'a_renforcer'
		];
		arr.sort((a, b) => BADGE_PRIORITY[b] - BADGE_PRIORITY[a]);
		expect(arr).toEqual([
			'a_remedier',
			'a_renforcer',
			'en_apprentissage',
			'acquise_en_memoire',
			'non_commencee'
		]);
	});
});
