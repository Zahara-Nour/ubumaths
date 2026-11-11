/**
 * Corps de POST /api/skill-attempts — contenu d'une trace (ADR 0038, N10, N11, L3)
 * ==================================================================================
 *
 * Le schéma reprend les CHECK de `skill_attempts` (migration
 * 20261111092522_traces_lieu_durees_reponses.sql) : un corps que la base
 * refuserait est refusé ici (400) plutôt qu'à l'INSERT (500).
 */
import { describe, it, expect } from 'vitest';
import { skillAttemptInputSchema } from '../skill-attempts';

const MODELE = '22222222-2222-4222-8222-222222222222';

function corps(extra: Record<string, unknown>) {
	return { template_id: MODELE, success: true, ...extra };
}

function refuse(extra: Record<string, unknown>) {
	expect(skillAttemptInputSchema.safeParse(corps(extra)).success).toBe(false);
}

describe('skillAttemptInputSchema — lieu', () => {
	it('exige le lieu', () => {
		refuse({});
	});

	it.each(['flash_cards', 'typing', 'mock_test', 'number_race'])('accepte %s', (place) => {
		expect(skillAttemptInputSchema.safeParse(corps({ place })).success).toBe(true);
	});

	it('refuse « evaluation » : seul le serveur écrit les traces d’un contrôle', () => {
		refuse({ place: 'evaluation' });
	});

	it('refuse « review » : la révision écrit par /api/srs/review/submit', () => {
		refuse({ place: 'review' });
	});

	it('refuse un lieu inconnu', () => {
		refuse({ place: 'interactive' });
	});
});

describe('skillAttemptInputSchema — graine', () => {
	it('accepte 0 et 2³¹ − 1', () => {
		for (const seed of [0, 2147483647]) {
			expect(skillAttemptInputSchema.safeParse(corps({ place: 'flash_cards', seed })).success).toBe(
				true
			);
		}
	});

	it.each([-1, 2147483648, 1.5])('refuse %s', (seed) => {
		refuse({ place: 'flash_cards', seed });
	});
});

describe('skillAttemptInputSchema — durées (formes chronométrées seulement)', () => {
	const chrono = { response_ms: 4200, allotted_ms: 10000, end_reason: 'validated' };

	it.each(['mock_test', 'number_race'])('accepte durées et fin en %s', (place) => {
		expect(skillAttemptInputSchema.safeParse(corps({ place, ...chrono })).success).toBe(true);
	});

	it('accepte un temps écoulé', () => {
		const parsed = skillAttemptInputSchema.safeParse(
			corps({ place: 'number_race', response_ms: 10000, allotted_ms: 10000, end_reason: 'timeout' })
		);
		expect(parsed.success).toBe(true);
	});

	it.each(['flash_cards', 'typing'])('refuse une durée en %s (N11)', (place) => {
		refuse({ place, response_ms: 4200 });
	});

	it('refuse une durée allouée sans fin, et l’inverse', () => {
		refuse({ place: 'mock_test', allotted_ms: 10000 });
		refuse({ place: 'mock_test', end_reason: 'validated' });
	});

	it('refuse les durées hors bornes', () => {
		refuse({ place: 'mock_test', response_ms: -1 });
		refuse({ place: 'mock_test', response_ms: 86400001 });
		refuse({ place: 'mock_test', allotted_ms: 0, end_reason: 'validated' });
		refuse({ place: 'mock_test', allotted_ms: 86400001, end_reason: 'validated' });
	});

	it('refuse une fin inconnue', () => {
		refuse({ place: 'mock_test', allotted_ms: 10000, end_reason: 'abandoned' });
	});
});

describe('skillAttemptInputSchema — réponse et verdict par case', () => {
	it.each(['typing', 'mock_test', 'number_race'])('accepte une réponse en %s', (place) => {
		const parsed = skillAttemptInputSchema.safeParse(
			corps({ place, answer_parts: ['3', 'x+1'], part_verdicts: [true, false] })
		);
		expect(parsed.success).toBe(true);
	});

	it.each(['flash_cards'])('refuse une réponse en %s', (place) => {
		refuse({ place, answer_parts: ['3'], part_verdicts: [true] });
	});

	it('refuse une réponse sans verdicts, des verdicts sans réponse, des longueurs différentes', () => {
		refuse({ place: 'typing', answer_parts: ['3'] });
		refuse({ place: 'typing', part_verdicts: [true] });
		refuse({ place: 'typing', answer_parts: ['3', '4'], part_verdicts: [true] });
	});

	it('aucune case : listes vides ou null → null (la base refuse `[]`)', () => {
		for (const vide of [[], null]) {
			const parsed = skillAttemptInputSchema.safeParse(
				corps({ place: 'number_race', answer_parts: vide, part_verdicts: vide })
			);
			expect(parsed.success).toBe(true);
			if (parsed.success) {
				expect(parsed.data.answer_parts).toBeNull();
				expect(parsed.data.part_verdicts).toBeNull();
			}
		}
	});

	it('L3 — refuse plus de 50 cases', () => {
		const n = 51;
		refuse({
			place: 'typing',
			answer_parts: Array.from({ length: n }, () => '1'),
			part_verdicts: Array.from({ length: n }, () => true)
		});
	});

	it('L3 — accepte 2 000 caractères dans une case, refuse 2 001', () => {
		const ok = skillAttemptInputSchema.safeParse(
			corps({ place: 'typing', answer_parts: ['a'.repeat(2000)], part_verdicts: [false] })
		);
		expect(ok.success).toBe(true);
		refuse({ place: 'typing', answer_parts: ['a'.repeat(2001)], part_verdicts: [false] });
	});

	it('L3 — refuse plus de 10 000 caractères en tout', () => {
		refuse({
			place: 'typing',
			answer_parts: Array.from({ length: 6 }, () => 'a'.repeat(2000)),
			part_verdicts: Array.from({ length: 6 }, () => false)
		});
	});

	it('refuse le caractère NUL (Postgres le refuserait : 500)', () => {
		refuse({ place: 'typing', answer_parts: ['a\u0000b'], part_verdicts: [true] });
	});

	it('plafond total en points de code, comme `char_length` : 5 001 émojis passent', () => {
		const parts = Array.from({ length: 3 }, () => '😀'.repeat(1667));
		const parsed = skillAttemptInputSchema.safeParse(
			corps({ place: 'typing', answer_parts: parts, part_verdicts: [true, true, true] })
		);
		expect(parsed.success).toBe(true);
	});

	it('clés absentes : réponse et verdicts NULL', () => {
		const parsed = skillAttemptInputSchema.safeParse(corps({ place: 'typing' }));
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.answer_parts).toBeNull();
			expect(parsed.data.part_verdicts).toBeNull();
		}
	});
});
