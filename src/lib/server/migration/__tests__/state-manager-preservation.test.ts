import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MigrationStateManager } from '../state-manager';

// Le gestionnaire écrit un journal d'état sur le disque. Sans redirection, les
// tests réécrivaient le VRAI `.claude/migration-state.json` du projet.
const dossierTemporaire = mkdtempSync(join(tmpdir(), 'migration-state-'));
afterAll(() => rmSync(dossierTemporaire, { recursive: true, force: true }));

function gestionnaireIsole() {
	return new MigrationStateManager({
		stateFilePath: join(dossierTemporaire, 'state.json'),
		progressFilePath: join(dossierTemporaire, 'progress.md')
	});
}

/**
 * `recordQuestionProcessed` fait un UPSERT : il réécrit la ligne entière.
 * Il écrivait `null` dans tous les champs qui n'appartenaient pas au nouvel
 * état, ce qui effaçait l'histoire de la question à chaque transition —
 * importer une question relue remettait son verdict et son horodatage à zéro,
 * et perdait le lien vers le template créé.
 */
function clientSimule(ligneExistante: Record<string, unknown> | null) {
	const upserts: Record<string, unknown>[] = [];
	const client = {
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => ({ data: ligneExistante, error: null })
				})
			}),
			upsert: async (donnees: Record<string, unknown>) => {
				upserts.push(donnees);
				return { error: null };
			}
		})
	};
	return { client, upserts };
}

const QUESTION = { description: 'Calculer 2 + 3', enounceds: ['2 + 3'], answers: ['5'] };

describe('recordQuestionProcessed — préservation des champs', () => {
	it('conserve le verdict de relecture quand la question est importée', async () => {
		const { client, upserts } = clientSimule({
			old_question_index: 7,
			migration_status: 'pending',
			phase: 4,
			new_template_id: null,
			converted_at: null,
			imported_at: null,
			validated_at: null,
			review_status: 'approved',
			reviewed_at: '2026-04-18T09:00:00.000Z',
			reviewed_by: '11111111-1111-4111-8111-111111111111'
		});

		const gestionnaire = gestionnaireIsole();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await gestionnaire.init(client as any);
		await gestionnaire.recordQuestionProcessed(7, 'imported', 1, QUESTION, {
			newTemplateId: '22222222-2222-4222-8222-222222222222'
		});

		const ecrit = upserts.at(-1)!;
		// L'import ne doit rien dire du verdict humain : il le reconduit.
		expect(ecrit.review_status).toBe('approved');
		expect(ecrit.reviewed_at).toBe('2026-04-18T09:00:00.000Z');
		expect(ecrit.reviewed_by).toBe('11111111-1111-4111-8111-111111111111');
		expect(ecrit.new_template_id).toBe('22222222-2222-4222-8222-222222222222');
		expect(ecrit.imported_at).not.toBeNull();
	});

	it('conserve le lien vers le template quand un état ultérieur est écrit', async () => {
		const { client, upserts } = clientSimule({
			old_question_index: 7,
			migration_status: 'imported',
			phase: 1,
			new_template_id: '22222222-2222-4222-8222-222222222222',
			converted_at: '2026-01-02T00:00:00.000Z',
			imported_at: '2026-01-03T00:00:00.000Z',
			validated_at: null,
			review_status: 'approved',
			reviewed_at: '2026-04-18T09:00:00.000Z',
			reviewed_by: null
		});

		const gestionnaire = gestionnaireIsole();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await gestionnaire.init(client as any);
		await gestionnaire.recordQuestionProcessed(7, 'validated', 1, QUESTION);

		const ecrit = upserts.at(-1)!;
		// Sans préservation, la validation technique perdait le template qu'elle
		// venait pourtant de valider, ainsi que les deux horodatages antérieurs.
		expect(ecrit.new_template_id).toBe('22222222-2222-4222-8222-222222222222');
		expect(ecrit.converted_at).toBe('2026-01-02T00:00:00.000Z');
		expect(ecrit.imported_at).toBe('2026-01-03T00:00:00.000Z');
		expect(ecrit.validated_at).not.toBeNull();
	});

	it('écrit le verdict et son auteur quand la relecture le fournit', async () => {
		const { client, upserts } = clientSimule(null);

		const gestionnaire = gestionnaireIsole();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await gestionnaire.init(client as any);
		await gestionnaire.recordQuestionProcessed(7, 'pending', 4, QUESTION, {
			reviewStatus: 'rejected',
			reviewedBy: '33333333-3333-4333-8333-333333333333'
		});

		const ecrit = upserts.at(-1)!;
		expect(ecrit.review_status).toBe('rejected');
		expect(ecrit.reviewed_by).toBe('33333333-3333-4333-8333-333333333333');
		expect(ecrit.reviewed_at).not.toBeNull();
		// Un rejet de relecture n'est pas un échec technique.
		expect(ecrit.migration_status).toBe('pending');
	});
});
