/**
 * Outillage de relecture TinyMath — modules purs
 * (vérification d'un template, ligne d'import, fichier de verdict)
 */

import { describe, it, expect } from 'vitest';
import { checkTemplate, formatCheckReport } from '../check-template';
import { toTemplateInsertRow } from '../template-insert-row';
import {
	buildEditNotes,
	buildTrackingReviewUpdate,
	draftTemplate,
	parseReviewFile
} from '../review-file';
import type { QuestionTemplate, TestSpec } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// FIXTURES
// ============================================================================

const SPECS: TestSpec[] = [
	{
		description: 'bonne réponse',
		variables: { a: '3' },
		answers: ['6'],
		expected: { status: 'correct' }
	},
	{
		description: 'erreur',
		variables: { a: '3' },
		answers: ['5'],
		expected: { status: 'incorrect' }
	}
];

function doubleTemplate(overrides: Partial<QuestionTemplate> = {}): QuestionTemplate {
	return {
		id: 'tmp',
		title: 'Double',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Le double de $${{a}}$$ est $?$'),
				variables: [{ name: 'a', expression: '1..9' }],
				blanks: [{ expectedAnswer: '{{eval:2*a}}' }]
			}
		],
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Multiplier',
		level: 1,
		testSpecs: SPECS,
		...overrides
	};
}

const NOW = '2026-09-26T12:00:00.000Z';
const DAVID = '6e1dbd63-dc7f-4aa4-abe1-771a7556b78e';

// ============================================================================
// checkTemplate
// ============================================================================

describe('checkTemplate', () => {
	it('importable : specs vertes, 50 tirages réussis par variation, comptés', () => {
		const report = checkTemplate(doubleTemplate());
		expect(report.reasons).toEqual([]);
		expect(report.passed).toBe(true);
		expect(report.specs).toHaveLength(2);
		expect(report.generation.attempts).toBe(50);
		expect(formatCheckReport(report)).toContain('Specs : 2/2 vertes');
		expect(formatCheckReport(report)).toContain('Tirages : 50/50 réussis');
	});

	it('aucune spec → non importable (zéro spec n’est pas un succès)', () => {
		const report = checkTemplate(doubleTemplate({ testSpecs: [] }));
		expect(report.passed).toBe(false);
		expect(report.reasons).toContain('aucune spec de test');
	});

	it('une spec rouge → non importable', () => {
		const wrong: TestSpec = { ...SPECS[0], expected: { status: 'incorrect' } };
		const report = checkTemplate(doubleTemplate({ testSpecs: [wrong, SPECS[1]] }));
		expect(report.passed).toBe(false);
		expect(report.reasons.join()).toMatch(/1 spec\(s\) rouge\(s\) sur 2/);
	});

	it('un tirage qui échoue → non importable, avec la variation en cause', () => {
		const template = doubleTemplate();
		template.variations.push({
			statement: templateMarkdown('Le double de $${{b}}$$ est $?$'),
			variables: [{ name: 'b', expression: '{{2..9!a,m2}}' }],
			blanks: [{ expectedAnswer: '{{eval:2*b}}' }]
		});
		const report = checkTemplate(template, { instances: 5 });
		expect(report.passed).toBe(false);
		expect(report.generation.attempts).toBe(10);
		expect(report.generation.failures).toHaveLength(5);
		expect(report.generation.failures.every((f) => f.variationIndex === 1)).toBe(true);
		expect(report.reasons.join()).toMatch(/5 tirage\(s\) en échec sur 10/);
	});

	it('niveau 0 (TinyMath) → non importable, la base exige ≥ 1', () => {
		const report = checkTemplate(doubleTemplate({ level: 0 }), { instances: 1 });
		expect(report.passed).toBe(false);
		expect(report.reasons).toContain('niveau 0 : la base exige un niveau ≥ 1');
	});

	it('clé inconnue → erreur de schéma', () => {
		const template = { ...doubleTemplate(), titre: 'faute' } as QuestionTemplate;
		const report = checkTemplate(template);
		expect(report.passed).toBe(false);
		expect(report.schemaErrors.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// toTemplateInsertRow
// ============================================================================

describe('toTemplateInsertRow', () => {
	it('toujours en brouillon, même si le template se dit publié', () => {
		const row = toTemplateInsertRow(doubleTemplate({ status: 'published' }), DAVID);
		expect(row.status).toBe('draft');
	});

	it('écrit les specs et les colonnes de la route API', () => {
		const row = toTemplateInsertRow(doubleTemplate(), DAVID);
		expect(row.test_specs).toEqual(SPECS);
		expect(row.created_by).toBe(DAVID);
		expect(row.type).toBe('fill_in_blanks');
		expect(Object.keys(row).sort()).toEqual(
			[
				'type',
				'title',
				'description',
				'shared',
				'default_display_options',
				'variations',
				'exercise_instruction',
				'options',
				'grades',
				'theme',
				'domain',
				'subdomain',
				'level',
				'status',
				'delay',
				'multiple_answers',
				'test_specs',
				'created_by'
			].sort()
		);
	});
});

// ============================================================================
// Fichier de verdict
// ============================================================================

describe('parseReviewFile', () => {
	const base = { globalIndex: 300, reviewer: 'claude' };

	it('accepte un verdict approuvé avec template', () => {
		const file = parseReviewFile({ ...base, verdict: 'approved', template: doubleTemplate() });
		expect(file.verdict).toBe('approved');
	});

	it.each([
		[{ verdict: 'approved' }, /template obligatoire/],
		[{ verdict: 'corrected', template: {} }, /quoi et pourquoi/],
		[{ verdict: 'rejected' }, /raison du rejet/],
		[{ verdict: 'arbitrate' }, /question précise/],
		[{ verdict: 'rejected', reason: 'x', globalIndex: 633 }, /globalIndex/],
		[{ verdict: 'rejected', reason: 'x', inconnu: 1 }, /inconnu|unrecognized/i]
	])('refuse %j', (overrides, message) => {
		expect(() => parseReviewFile({ ...base, ...overrides })).toThrow(message);
	});
});

describe('buildTrackingReviewUpdate', () => {
	it('approuvée par Claude : verdict, David comme relecteur, marqueur daté', () => {
		const review = parseReviewFile({
			globalIndex: 1,
			verdict: 'approved',
			reviewer: 'claude',
			template: doubleTemplate()
		});
		expect(buildTrackingReviewUpdate(review, DAVID, NOW)).toEqual({
			review_status: 'approved',
			reviewed_by: DAVID,
			reviewed_at: NOW,
			conversion_notes: 'Relu par Claude le 2026-09-26 — approuvée telle que transformée.'
		});
	});

	it('à arbitrer : reste pending, sans relecteur, la question est notée', () => {
		const review = parseReviewFile({
			globalIndex: 1,
			verdict: 'arbitrate',
			reviewer: 'claude',
			question: 'Le mot « opposé » est-il vu en 5e ?'
		});
		const update = buildTrackingReviewUpdate(review, DAVID, NOW);
		expect(update.review_status).toBe('pending');
		expect(update.reviewed_by).toBeNull();
		expect(update.conversion_notes).toContain('À ARBITRER : Le mot « opposé »');
	});

	it('rejetée : la raison est notée', () => {
		const review = parseReviewFile({
			globalIndex: 1,
			verdict: 'rejected',
			reviewer: 'claude',
			reason: 'doublon de #12'
		});
		const update = buildTrackingReviewUpdate(review, DAVID, NOW);
		expect(update.review_status).toBe('rejected');
		expect(update.conversion_notes).toContain('rejetée : doublon de #12');
	});

	it('verdict de David : sans marqueur Claude, date d’origine conservée', () => {
		const review = parseReviewFile({
			globalIndex: 1,
			verdict: 'approved',
			reviewer: 'david',
			reviewedAt: '2026-03-02T10:00:00+00:00',
			template: doubleTemplate()
		});
		const update = buildTrackingReviewUpdate(review, DAVID, NOW);
		expect(update.reviewed_at).toBe('2026-03-02T10:00:00+00:00');
		expect(update).not.toHaveProperty('conversion_notes');
		expect(buildEditNotes(review)).toBeUndefined();
	});
});

describe('draftTemplate', () => {
	it('force le brouillon', () => {
		const review = parseReviewFile({
			globalIndex: 28,
			verdict: 'approved',
			reviewer: 'david',
			template: doubleTemplate({ status: 'published' })
		});
		expect(draftTemplate(review)?.status).toBe('draft');
	});
});
