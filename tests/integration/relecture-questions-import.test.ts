/**
 * Relecture des questions TinyMath : report des verdicts et import (base locale)
 * ============================================================================
 *
 * Écritures de CONTENU dans `migration_tracking`, `migration_edits` et
 * `question_templates`. Ce que ces tests prouvent :
 * - la simulation n'écrit rien ;
 * - un verdict est reporté avec relecture de chaque ligne écrite ;
 * - un template qui ne passe pas `checkTemplate` n'est ni enregistré ni importé ;
 * - une correction existante (celles de David) n'est pas écrasée sans le demander ;
 * - l'import crée un BROUILLON (même si la version corrigée se dit publiée),
 *   écrit `test_specs`, relie le suivi, et se rejoue sans doublon.
 *
 * Client service_role : c'est celui des scripts (pas de RLS en jeu ici).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import {
	importReviewedQuestion,
	listImportCandidates,
	recordReview,
	type ReviewDbContext
} from '$lib/server/migration/review-db';
import { parseReviewFile, type ReviewFile } from '$lib/migration/review/review-file';
import { generateStableQuestionHash } from '$lib/server/migration/hash-utils';
import type { QuestionBase } from '$lib/migration/old-question-types';
import type { QuestionTemplate, TestSpec } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// FIXTURES
// ============================================================================

const supabase = createServiceRoleClient();
const RUN = `relecture-${Date.now()}`;
const NOW = '2026-09-26T12:00:00.000Z';
let reviewerId = '';

/** Ancienne question factice, unique par test (hash distinct) */
function oldQuestion(globalIndex: number, label: string): QuestionBase {
	return {
		description: `${RUN} ${label}`,
		enounces: ['Calcule le double de $$&1$$.'],
		variabless: [{ '&1': '$e[1;9]' }],
		solutionss: [['[_2*&1_]']],
		defaultDelay: 20,
		grade: '6',
		_migration: {
			theme: 'Entiers',
			domain: 'Multiplier',
			subdomain: 'Double',
			level: 1,
			globalIndex
		}
	} as unknown as QuestionBase;
}

const SPECS: TestSpec[] = [
	{ description: 'juste', variables: { a: '3' }, answers: ['6'], expected: { status: 'correct' } },
	{ description: 'faux', variables: { a: '3' }, answers: ['5'], expected: { status: 'incorrect' } }
];

function template(label: string, overrides: Partial<QuestionTemplate> = {}): QuestionTemplate {
	return {
		id: 'tmp',
		title: `${RUN} ${label}`,
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
		subdomain: 'Double',
		level: 1,
		testSpecs: SPECS,
		...overrides
	};
}

function approved(globalIndex: number, label: string, overrides: Partial<QuestionTemplate> = {}) {
	return parseReviewFile({
		globalIndex,
		verdict: 'approved',
		reviewer: 'claude',
		template: template(label, overrides)
	});
}

function ctx(overrides: Partial<ReviewDbContext> = {}): ReviewDbContext {
	return { supabase, reviewerId, now: NOW, dryRun: false, instances: 5, ...overrides };
}

const createdHashes: string[] = [];
function track(q: QuestionBase): QuestionBase {
	createdHashes.push(generateStableQuestionHash(q as unknown as Record<string, unknown>));
	return q;
}

async function trackingRow(q: QuestionBase) {
	const hash = generateStableQuestionHash(q as unknown as Record<string, unknown>);
	const { data, error } = await supabase
		.from('migration_tracking')
		.select('*')
		.eq('old_question_hash', hash);
	if (error) throw error;
	return data;
}

async function editRow(q: QuestionBase) {
	const hash = generateStableQuestionHash(q as unknown as Record<string, unknown>);
	const { data, error } = await supabase
		.from('migration_edits')
		.select('*')
		.eq('old_question_hash', hash);
	if (error) throw error;
	return data;
}

async function templatesTitled(title: string) {
	const { data, error } = await supabase.from('question_templates').select('*').eq('title', title);
	if (error) throw error;
	return data;
}

// ============================================================================
// SETUP
// ============================================================================

beforeAll(async () => {
	reviewerId = (await TestData.profile().withRole('admin').create()).id;
});

afterEach(async () => {
	// Nettoyage de ce que chaque test a pu créer (lignes de CE run uniquement)
	const { data: rows } = await supabase
		.from('migration_tracking')
		.select('new_template_id')
		.in('old_question_hash', createdHashes);
	const templateIds = (rows ?? []).map((r) => r.new_template_id).filter((id) => id !== null);
	await supabase.from('migration_edits').delete().in('old_question_hash', createdHashes);
	await supabase.from('migration_tracking').delete().in('old_question_hash', createdHashes);
	if (templateIds.length > 0) {
		await supabase
			.from('question_templates')
			.delete()
			.in('id', templateIds as string[]);
	}
	await supabase.from('question_templates').delete().like('title', `${RUN}%`);
});

afterAll(async () => {
	await supabase.from('profiles').delete().eq('id', reviewerId);
});

// ============================================================================
// REPORT DES VERDICTS
// ============================================================================

describe('recordReview', () => {
	it('simulation : planifie sans rien écrire', async () => {
		const q = track(oldQuestion(601, 'simulation'));
		const outcome = await recordReview(ctx({ dryRun: true }), q, approved(601, 'simulation'));
		expect(outcome.status).toBe('planned');
		expect(await trackingRow(q)).toHaveLength(0);
		expect(await editRow(q)).toHaveLength(0);
	});

	it('approuvée : suivi créé avec verdict et marqueur, version corrigée en brouillon', async () => {
		const q = track(oldQuestion(602, 'approuvee'));
		const outcome = await recordReview(
			ctx(),
			q,
			approved(602, 'approuvee', { status: 'published' })
		);
		expect(outcome).toMatchObject({ status: 'written', reasons: [] });

		const [row] = await trackingRow(q);
		expect(row).toMatchObject({
			old_question_index: 602,
			review_status: 'approved',
			reviewed_by: reviewerId,
			conversion_notes: 'Relu par Claude le 2026-09-26 — approuvée telle que transformée.',
			theme: 'Entiers',
			new_template_id: null
		});
		const [edit] = await editRow(q);
		const edited = edit.edited_json as unknown as QuestionTemplate;
		expect(edited.status).toBe('draft');
		expect(edited.testSpecs).toHaveLength(2);
		expect(edit.editor_id).toBe(reviewerId);
	});

	it('template qui échoue (aucune spec) : refusé, rien écrit', async () => {
		const q = track(oldQuestion(603, 'sans-specs'));
		const outcome = await recordReview(ctx(), q, approved(603, 'sans-specs', { testSpecs: [] }));
		expect(outcome.status).toBe('refused');
		expect(outcome.reasons.join()).toMatch(/aucune spec/);
		expect(await trackingRow(q)).toHaveLength(0);
	});

	it('rejetée : verdict et raison, aucune version corrigée', async () => {
		const q = track(oldQuestion(604, 'rejetee'));
		const review: ReviewFile = parseReviewFile({
			globalIndex: 604,
			verdict: 'rejected',
			reviewer: 'claude',
			reason: 'doublon de #12'
		});
		expect((await recordReview(ctx(), q, review)).status).toBe('written');
		const [row] = await trackingRow(q);
		expect(row.review_status).toBe('rejected');
		expect(row.conversion_notes).toContain('rejetée : doublon de #12');
		expect(await editRow(q)).toHaveLength(0);
	});

	it('correction existante différente : refus sans --remplacer, remplacée avec', async () => {
		const q = track(oldQuestion(605, 'existante'));
		await recordReview(ctx(), q, approved(605, 'existante'));

		const other = approved(605, 'existante', { title: `${RUN} existante bis` });
		const refused = await recordReview(ctx(), q, other);
		expect(refused.status).toBe('refused');
		expect(refused.reasons.join()).toMatch(/correction existante/);
		expect(((await editRow(q))[0].edited_json as { title: string }).title).toBe(`${RUN} existante`);

		const replaced = await recordReview(ctx({ allowReplaceEdit: true }), q, other);
		expect(replaced.status).toBe('written');
		expect(((await editRow(q))[0].edited_json as { title: string }).title).toBe(
			`${RUN} existante bis`
		);
	});

	it('suivi existant : mis à jour, pas dupliqué ; `validated` ramené à `pending`', async () => {
		const q = track(oldQuestion(606, 'suivi-existant'));
		const hash = generateStableQuestionHash(q as unknown as Record<string, unknown>);
		const { error } = await supabase.from('migration_tracking').insert({
			old_question_hash: hash,
			old_question_index: 606,
			old_description: 'ancienne',
			migration_status: 'validated',
			validated_at: '2026-03-02T10:00:00+00:00'
		});
		expect(error).toBeNull();

		const review = parseReviewFile({
			globalIndex: 606,
			verdict: 'approved',
			reviewer: 'david',
			reviewedAt: '2026-03-02T10:00:00+00:00',
			template: template('suivi-existant')
		});
		expect((await recordReview(ctx(), q, review)).status).toBe('written');
		const rows = await trackingRow(q);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			review_status: 'approved',
			migration_status: 'pending',
			conversion_notes: null
		});
		expect(new Date(rows[0].reviewed_at!).toISOString()).toBe('2026-03-02T10:00:00.000Z');
	});
});

// ============================================================================
// IMPORT
// ============================================================================

describe('importReviewedQuestion', () => {
	it('importe un brouillon avec ses specs et relie le suivi', async () => {
		const q = track(oldQuestion(611, 'import'));
		await recordReview(ctx(), q, approved(611, 'import', { status: 'published' }));

		const outcome = await importReviewedQuestion(ctx(), q);
		expect(outcome.status).toBe('imported');

		const [created] = await templatesTitled(`${RUN} import`);
		expect(created).toMatchObject({
			id: outcome.templateId,
			status: 'draft',
			created_by: reviewerId,
			test_specs: SPECS
		});
		const [row] = await trackingRow(q);
		expect(row).toMatchObject({ new_template_id: created.id, migration_status: 'imported' });
		expect(row.imported_at).not.toBeNull();
	});

	it('rejouer : ignorée, aucun doublon', async () => {
		const q = track(oldQuestion(612, 'rejeu'));
		await recordReview(ctx(), q, approved(612, 'rejeu'));
		expect((await importReviewedQuestion(ctx(), q)).status).toBe('imported');
		expect((await importReviewedQuestion(ctx(), q)).status).toBe('skipped');
		expect(await templatesTitled(`${RUN} rejeu`)).toHaveLength(1);
	});

	it('simulation : rien n’est inséré', async () => {
		const q = track(oldQuestion(613, 'import-simulation'));
		await recordReview(ctx(), q, approved(613, 'import-simulation'));
		expect((await importReviewedQuestion(ctx({ dryRun: true }), q)).status).toBe('planned');
		expect(await templatesTitled(`${RUN} import-simulation`)).toHaveLength(0);
		expect((await trackingRow(q))[0].new_template_id).toBeNull();
	});

	it('non approuvée (à arbitrer) : ignorée', async () => {
		const q = track(oldQuestion(614, 'arbitrer'));
		const review = parseReviewFile({
			globalIndex: 614,
			verdict: 'arbitrate',
			reviewer: 'claude',
			question: 'Vocabulaire vu en 6e ?'
		});
		await recordReview(ctx(), q, review);
		expect((await importReviewedQuestion(ctx(), q)).status).toBe('skipped');
	});

	it('version corrigée devenue rouge : refusée, rien inséré', async () => {
		const q = track(oldQuestion(615, 'rouge'));
		await recordReview(ctx(), q, approved(615, 'rouge'));
		// Quelqu'un modifie la version corrigée après coup : une spec devient fausse
		const hash = generateStableQuestionHash(q as unknown as Record<string, unknown>);
		const broken = template('rouge', {
			testSpecs: [{ ...SPECS[0], expected: { status: 'incorrect' } }]
		});
		const { error } = await supabase
			.from('migration_edits')
			.update({ edited_json: JSON.parse(JSON.stringify(broken)) })
			.eq('old_question_hash', hash)
			.select();
		expect(error).toBeNull();

		const outcome = await importReviewedQuestion(ctx(), q);
		expect(outcome.status).toBe('refused');
		expect(await templatesTitled(`${RUN} rouge`)).toHaveLength(0);
	});

	it('listImportCandidates : seulement approuvées et non importées, filtrables par index', async () => {
		const a = track(oldQuestion(616, 'candidat-a'));
		const b = track(oldQuestion(617, 'candidat-b'));
		await recordReview(ctx(), a, approved(616, 'candidat-a'));
		await recordReview(ctx(), b, approved(617, 'candidat-b'));
		await importReviewedQuestion(ctx(), b);

		const all = await listImportCandidates(supabase, [616, 617]);
		expect(all.map((c) => c.globalIndex)).toEqual([616]);
	});
});
