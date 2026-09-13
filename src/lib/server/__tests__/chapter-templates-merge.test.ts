/**
 * Mettre à jour un chapitre depuis son modèle AJOUTE, et n'écrase plus.
 * ====================================================================
 *
 * L'ancienne mise à jour supprimait les quatre contenus du chapitre puis
 * réappliquait le modèle. Trois dégâts, et le troisième est né de la
 * publication au fur et à mesure :
 *
 * 1. ce que le professeur avait ajouté À LA MAIN dans CETTE classe
 *    disparaissait ;
 * 2. les quatre suppressions ne lisaient pas leur erreur — l'une d'elles
 *    pouvait échouer sans que rien ne le dise, et la reconstruction se faisait
 *    par-dessus ;
 * 3. supprimer puis recréer les lignes EFFAÇAIT `published_at` : les élèves
 *    voyaient le chapitre se vider d'un coup, en plein cours.
 *
 * La fusion ne supprime rien. Elle n'ajoute que ce qui manque — d'où des clés
 * de reconnaissance par type de contenu, et l'idempotence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase, mockSuccess, mockError } from 'tests/helpers';
import type { TemplateContentSnapshot } from '$lib/types/chapter-templates';

const CHAPITRE = '99999999-9999-4999-8999-999999999999';
const EXERCICE_A = '11111111-1111-4111-8111-111111111111';
const EXERCICE_B = '22222222-2222-4222-8222-222222222222';
const FICHE_A = '33333333-3333-4333-8333-333333333333';
const MODELE_Q = '44444444-4444-4444-8444-444444444444';

function snapshot(partiel: Partial<TemplateContentSnapshot> = {}): TemplateContentSnapshot {
	return {
		documents: [],
		quizQuestions: [],
		checklistItems: [],
		exercises: [],
		worksheets: [],
		...partiel
	};
}

/** Ce que le chapitre contient déjà, dans l'ordre où la fusion le lit. */
function chapitreContient(
	supabase: ReturnType<typeof createMockSupabase>,
	contenus: {
		documents?: unknown[];
		quiz?: unknown[];
		checklist?: unknown[];
		exercises?: unknown[];
		worksheets?: unknown[];
	}
) {
	mockSuccess(supabase, contenus.documents ?? [], 'then');
	mockSuccess(supabase, contenus.quiz ?? [], 'then');
	mockSuccess(supabase, contenus.checklist ?? [], 'then');
	mockSuccess(supabase, contenus.exercises ?? [], 'then');
	mockSuccess(supabase, contenus.worksheets ?? [], 'then');
}

/** Les lignes réellement insérées, tous types confondus. */
function insertions(supabase: ReturnType<typeof createMockSupabase>): Record<string, unknown>[] {
	return supabase._mockChain.insert.mock.calls.flatMap((c) => {
		const arg = c[0];
		return Array.isArray(arg) ? arg : [arg];
	}) as Record<string, unknown>[];
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('mergeContentSnapshotIntoChapter — n’écrase rien', () => {
	it('ne supprime jamais', async () => {
		const { mergeContentSnapshotIntoChapter } = await import('../chapter-templates');
		const supabase = createMockSupabase();
		chapitreContient(supabase, {});
		mockSuccess(supabase, null, 'then'); // insertion des exercices

		await mergeContentSnapshotIntoChapter(
			CHAPITRE,
			snapshot({ exercises: [{ exerciseId: EXERCICE_A, displayOrder: 0 }] }),
			supabase as never
		);

		// LE point de la phase 5 : ce que le professeur a ajouté à la main
		// survit, et la publication avec.
		expect(supabase._mockChain.delete).not.toHaveBeenCalled();
	});

	it('ajoute ce qui manque, et seulement lui', async () => {
		const { mergeContentSnapshotIntoChapter } = await import('../chapter-templates');
		const supabase = createMockSupabase();
		chapitreContient(supabase, { exercises: [{ exercise_id: EXERCICE_A }] });
		mockSuccess(supabase, null, 'then');

		const { error } = await mergeContentSnapshotIntoChapter(
			CHAPITRE,
			snapshot({
				exercises: [
					{ exerciseId: EXERCICE_A, displayOrder: 0 },
					{ exerciseId: EXERCICE_B, displayOrder: 1 }
				]
			}),
			supabase as never
		);

		expect(error).toBeNull();
		const ajoutes = insertions(supabase);
		expect(ajoutes).toHaveLength(1);
		expect(ajoutes[0].exercise_id).toBe(EXERCICE_B);
	});

	it('est idempotent : rejouer la même version n’ajoute rien', async () => {
		const { mergeContentSnapshotIntoChapter } = await import('../chapter-templates');
		const supabase = createMockSupabase();
		chapitreContient(supabase, {
			exercises: [{ exercise_id: EXERCICE_A }],
			worksheets: [{ worksheet_id: FICHE_A }],
			quiz: [{ question_template_id: MODELE_Q }],
			checklist: [{ content: 'Savoir dériver' }]
		});

		const { error } = await mergeContentSnapshotIntoChapter(
			CHAPITRE,
			snapshot({
				exercises: [{ exerciseId: EXERCICE_A, displayOrder: 0 }],
				worksheets: [{ worksheetId: FICHE_A, displayOrder: 0 }],
				quizQuestions: [{ questionTemplateId: MODELE_Q, pointsOverride: null, displayOrder: 0 }],
				checklistItems: [{ content: 'Savoir dériver', description: null, displayOrder: 0 }]
			}),
			supabase as never
		);

		expect(error).toBeNull();
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});

	it('reconnaît un document déjà présent par son URL', async () => {
		const { mergeContentSnapshotIntoChapter } = await import('../chapter-templates');
		const supabase = createMockSupabase();
		chapitreContient(supabase, {
			documents: [{ google_drive_url: 'https://drive.example/doc1' }]
		});

		const { error } = await mergeContentSnapshotIntoChapter(
			CHAPITRE,
			snapshot({
				documents: [
					{
						title: 'Cours partie 1',
						description: null,
						documentUrl: 'https://drive.example/doc1',
						sourceType: 'google_drive',
						mimeType: null,
						displayOrder: 0
					}
				]
			}),
			supabase as never
		);

		expect(error).toBeNull();
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});

	it('remonte une lecture impossible au lieu d’ajouter en double', async () => {
		const { mergeContentSnapshotIntoChapter } = await import('../chapter-templates');
		const supabase = createMockSupabase();
		mockError(supabase, 'connexion perdue', 'then', '08006');

		const { error } = await mergeContentSnapshotIntoChapter(
			CHAPITRE,
			snapshot({ exercises: [{ exerciseId: EXERCICE_A, displayOrder: 0 }] }),
			supabase as never
		);

		// Sans ce garde, un chapitre illisible passerait pour vide et la fusion
		// réinsérerait tout : doublons garantis.
		expect(error).not.toBeNull();
		expect(supabase._mockChain.insert).not.toHaveBeenCalled();
	});
});

describe('le modèle emporte les fiches', () => {
	it('ajoute une fiche rattachée absente du chapitre', async () => {
		const { mergeContentSnapshotIntoChapter } = await import('../chapter-templates');
		const supabase = createMockSupabase();
		chapitreContient(supabase, {});
		mockSuccess(supabase, null, 'then');

		const { error } = await mergeContentSnapshotIntoChapter(
			CHAPITRE,
			snapshot({ worksheets: [{ worksheetId: FICHE_A, displayOrder: 0 }] }),
			supabase as never
		);

		expect(error).toBeNull();
		const ajoutee = insertions(supabase)[0];
		expect(ajoutee.worksheet_id).toBe(FICHE_A);
		// Rattacher n'est pas distribuer : la fiche arrive NON publiée, et la
		// policy exige en plus qu'elle ait été distribuée à l'élève.
		expect(ajoutee.published_at ?? null).toBeNull();
	});
});
