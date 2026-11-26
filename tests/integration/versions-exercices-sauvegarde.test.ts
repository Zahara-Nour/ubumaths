/**
 * Versions d'un exercice : sauvegarde et restauration — (Supabase local requis)
 * =============================================================================
 *
 * ADR 0044, chantier versions-exercices, PR 2 (points reportés de la revue de la PR 1).
 *
 * Ce que le test prouve :
 * 1. Un exercice sans version (incohérence de la base) n'interrompt plus la sauvegarde : il y est,
 *    sans contenu.
 * 2. Restaurer une sauvegarde ANTÉRIEURE aux versions sur un exercice qui en a déjà ne touche pas
 *    sa v1 (qu'une fiche pointe) : son contenu devient une NOUVELLE version ; restaurer deux fois
 *    le même fichier n'en crée pas une deuxième.
 * 3. Sur un exercice absent, la même sauvegarde crée la version 1 ; un exercice exporté sans
 *    version (`versions: []`) ne reçoit pas de version vide.
 * 4. Une sauvegarde dont deux versions ont le même numéro est refusée à la lecture.
 * 5. Le fichier SQL de la sauvegarde se rejoue sur la base (PR 4 : `exercises` n'a plus de colonnes
 *    de contenu) : l'exercice et ses versions reviennent, dans une transaction annulée.
 *
 * La sauvegarde est une action d'admin : client service (hors RLS), comme la route.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
	exportBackupJSON,
	exportBackupSQL,
	restoreFromBackup
} from '../../src/lib/server/admin/exercise-backup';
import type { ExerciseBackup } from '../../src/lib/server/validation/backup';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';

// ============================================================================
// TYPES
// ============================================================================

type BackupRecord = ExerciseBackup['data']['exercises'][number];

// ============================================================================
// CONSTANTES
// ============================================================================

const service = createServiceRoleClient();
const ADMIN_EMAIL = 'admin-sauvegarde@example.test';
const OLD_CONTENT = [{ label: 'guidé', statement_md: 'Énoncé d’avant', solution_md: 'Corrigé' }];

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
let backup: ExerciseBackup;

// ============================================================================
// FONCTIONS
// ============================================================================

async function versionsOf(id: string) {
	const { data, error } = await service
		.from('exercise_versions')
		.select('id, number, note, variations')
		.eq('exercise_id', id)
		.order('number');
	if (error) throw new Error(error.message);
	return data ?? [];
}

/** Une sauvegarde ne portant que `records`, au format antérieur aux versions (sans `versions`) */
function legacyBackupOf(records: BackupRecord[]): ExerciseBackup {
	return {
		...backup,
		data: {
			exercises: records.map(({ versions: _versions, ...record }) => record),
			exercise_templates: [],
			exercise_favorites: [],
			exercise_share_tokens: []
		}
	};
}

function recordOf(id: string): BackupRecord {
	const record = backup.data.exercises.find((e) => e.id === id);
	if (!record) throw new Error(`exercice ${id} absent de la sauvegarde`);
	return record;
}

// ============================================================================
// DÉCOR
// ============================================================================

let pointedId: string;
let pointedV1: string;
let orphanId: string;

beforeAll(async () => {
	await cleanupAllTestData();
	teacherId = (await TestData.profile().withRole('teacher').create()).id;

	// Exercice dont la v1 est pointée par une fiche
	pointedId = (await TestData.exercise(teacherId).create()).id;
	pointedV1 = (await versionsOf(pointedId))[0].id;
	const { data: ws } = await service
		.from('worksheets')
		.insert({ title: 'Fiche en v1', type: 'worksheet', status: 'draft', created_by: teacherId })
		.select('id')
		.single();
	await service.from('worksheet_exercises').insert({
		worksheet_id: (ws as { id: string }).id,
		exercise_id: pointedId,
		exercise_version_id: pointedV1,
		position: 1
	});

	// Exercice sans aucune version (incohérence)
	orphanId = (await TestData.exercise(teacherId).create()).id;
	await service.from('exercise_versions').delete().eq('exercise_id', orphanId);

	backup = await exportBackupJSON(service, ADMIN_EMAIL);
});

afterAll(async () => {
	await service.from('worksheets').delete().eq('created_by', teacherId);
	await cleanupAllTestData();
});

// ============================================================================
// TESTS
// ============================================================================

describe('sauvegarde', () => {
	it('un exercice sans version y est, sans contenu, et ne l’interrompt pas', () => {
		const record = recordOf(orphanId);
		expect(record.versions).toEqual([]);
		expect(record.variations).toBeNull();
	});
});

describe('restauration d’une sauvegarde antérieure aux versions', () => {
	it('exercice déjà versionné : la v1 pointée reste, le contenu devient une nouvelle version', async () => {
		const before = await versionsOf(pointedId);
		const legacy = legacyBackupOf([{ ...recordOf(pointedId), variations: OLD_CONTENT }]);

		const result = await restoreFromBackup(service, legacy, { conflict_strategy: 'replace' });
		expect(result.errors).toEqual([]);

		const after = await versionsOf(pointedId);
		expect(after.map((v) => v.number)).toEqual([1, 2]);
		expect(after[0]).toEqual(before[0]);
		expect(after[1].variations).toEqual(OLD_CONTENT);
		expect(after[1].note).toContain('sauvegarde');

		// Le même fichier une deuxième fois : contenu déjà celui de la dernière, rien de neuf
		const again = await restoreFromBackup(service, legacy, { conflict_strategy: 'replace' });
		expect(again.errors).toEqual([]);
		expect((await versionsOf(pointedId)).map((v) => v.number)).toEqual([1, 2]);
	});

	it('exercice exporté SANS version (`versions: []`) : aucune version vide ajoutée', async () => {
		const before = await versionsOf(pointedId);
		const empty: ExerciseBackup = {
			...backup,
			data: {
				exercises: [{ ...recordOf(pointedId), variations: null, versions: [] }],
				exercise_templates: [],
				exercise_favorites: [],
				exercise_share_tokens: []
			}
		};
		const result = await restoreFromBackup(service, empty, { conflict_strategy: 'replace' });
		expect(result.errors).toEqual([]);
		expect(await versionsOf(pointedId)).toEqual(before);
	});

	it('exercice absent : la sauvegarde crée sa version 1', async () => {
		const record = { ...recordOf(pointedId), variations: OLD_CONTENT };
		const id = crypto.randomUUID();
		const result = await restoreFromBackup(
			service,
			legacyBackupOf([{ ...record, id, slug: null }]),
			{ conflict_strategy: 'skip' }
		);
		expect(result.errors).toEqual([]);
		const versions = await versionsOf(id);
		expect(versions.map((v) => v.number)).toEqual([1]);
		expect(versions[0].variations).toEqual(OLD_CONTENT);
		await service.from('exercises').delete().eq('id', id);
	});
});

describe('lecture du fichier', () => {
	it('deux versions au même numéro : sauvegarde refusée, rien n’est écrit', async () => {
		const record = recordOf(pointedId);
		const [v1] = record.versions ?? [];
		const broken: ExerciseBackup = {
			...backup,
			data: {
				exercises: [{ ...record, versions: [v1, { ...v1 }] }],
				exercise_templates: [],
				exercise_favorites: [],
				exercise_share_tokens: []
			}
		};
		const before = await versionsOf(pointedId);
		const result = await restoreFromBackup(service, broken, { conflict_strategy: 'replace' });
		expect(result.success).toBe(false);
		expect(await versionsOf(pointedId)).toEqual(before);
	});
});

describe('fichier SQL de la sauvegarde', () => {
	it('se rejoue : l’exercice revient, son contenu dans ses versions', async () => {
		const before = await versionsOf(pointedId);
		const sqlDump = await exportBackupSQL(service, ADMIN_EMAIL);
		// Les instructions de CET exercice : sa ligne et ses versions (les étiquettes, à part, ne
		// sont pas en cause ici).
		const statements = sqlDump
			.split('\n\n')
			.map((block) => block.trim())
			.filter(
				(block) =>
					(block.startsWith('INSERT INTO exercises (') ||
						block.startsWith('INSERT INTO exercise_versions (')) &&
					block.includes(`'${pointedId}'`)
			);
		expect(statements.map((s) => s.slice(0, 30))).toEqual([
			'INSERT INTO exercises (\n  id, ',
			...before.map(() => 'INSERT INTO exercise_versions ')
		]);

		const pg = await getPostgresClient();
		await pg.query('begin');
		try {
			await pg.query('delete from public.worksheet_exercises where exercise_id = $1', [pointedId]);
			await pg.query('delete from public.exercises where id = $1', [pointedId]);
			for (const statement of statements) await pg.query(statement);
			const { rows } = await pg.query(
				`select v.number, v.variations from public.exercise_versions v
				  where v.exercise_id = $1 order by v.number`,
				[pointedId]
			);
			expect(rows).toEqual(before.map(({ number, variations }) => ({ number, variations })));
		} finally {
			await pg.query('rollback');
		}
	});
});
