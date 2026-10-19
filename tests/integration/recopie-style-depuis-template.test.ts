/**
 * Recopie `worksheets.style_id ← template_id` (issue #1529, ADR 0028)
 * ===================================================================
 *
 * Avant le retrait de la colonne `worksheets.template_id`, chaque fiche qui
 * ne désigne son style que par `template_id` reçoit le même identifiant dans
 * `style_id`. Le style lu (`styleIdOf` : `style_id ?? template_id`) ne change
 * pour aucune fiche : le PDF reste identique.
 *
 * La migration est rejouée depuis son fichier, telle qu'elle sera jouée en
 * production, sur une fiche de chaque état.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { DEFAULT_TEMPLATE_IDS } from '../../src/lib/typst/templates/default-templates';

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261017090300_recopie_style_id_depuis_template_id.sql';

/** Préfixe unique à ce run : fiches et gabarits créés le portent. */
const RUN = `itest-recopie-style-${Date.now().toString(36)}`;
const STANDARD = DEFAULT_TEMPLATE_IDS.standard;
const CONTROLE = DEFAULT_TEMPLATE_IDS.assessment;
/** Une date passée : la recopie ne doit pas la remplacer par `now()`. */
const UPDATED_AT = '2026-09-01T08:00:00.000Z';

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
/** Ne désigne son style que par `template_id` (style de Chiphre). */
let ancienne: string;
/** `template_id` désigne un gabarit libre, qui n'est pas un style. */
let gabaritLibre: string;
/** `template_id` désigne le style d'un autre compte (l'admin). */
let styleDAutrui: string;
/** `template_id` désigne un style du prof lui-même. */
let styleDuProf: string;
/** A déjà un `style_id`, différent de son `template_id`. */
let dejaStylee: string;
/** Ni style ni gabarit : style par défaut. */
let sansStyle: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function seedWorksheet(
	suffix: string,
	styleId: string | null,
	templateId: string | null
): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`insert into public.worksheets (title, type, status, created_by, style_id, template_id)
		 values ($1, 'worksheet', 'draft', $2, $3, $4) returning id`,
		[`${RUN} ${suffix}`, teacherId, styleId, templateId]
	);
	return rows[0].id;
}

/**
 * Un style et son gabarit, de même identifiant (lot 3b), en superutilisateur
 * (hors RLS et hors gardes).
 */
async function seedStyleWithTemplate(ownerId: string, suffix: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`insert into public.worksheet_styles (owner_id, name) values ($1, $2) returning id`,
		[ownerId, `${RUN} ${suffix}`]
	);
	const id: string = rows[0].id;
	await pg.query(
		`insert into public.worksheet_templates (id, name, template_content, created_by)
		 values ($1, $2, '#set page(paper: "a4")', $3)`,
		[id, `${RUN} ${suffix}`, ownerId]
	);
	return id;
}

async function worksheetInDb(
	id: string
): Promise<{ style_id: string | null; template_id: string | null; updated_at: Date }> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select style_id, template_id, updated_at from public.worksheets where id = $1',
		[id]
	);
	return rows[0];
}

async function playMigration(): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(await readFile(MIGRATION, 'utf8'));
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const teacher = await TestData.profile().withRole('teacher').create();
	const admin = await TestData.profile().withRole('admin').create();
	teacherId = teacher.id;
	const styleAutrui = await seedStyleWithTemplate(admin.id, 'style de l’admin');
	const styleProf = await seedStyleWithTemplate(teacherId, 'style du prof');

	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`insert into public.worksheet_templates (name, template_content, created_by)
		 values ($1, '#set page(paper: "a4")', $2) returning id`,
		[`${RUN} gabarit libre`, teacherId]
	);
	const gabaritId: string = rows[0].id;

	ancienne = await seedWorksheet('ancienne', null, STANDARD);
	gabaritLibre = await seedWorksheet('gabarit libre', null, gabaritId);
	styleDAutrui = await seedWorksheet('style d’un autre', null, styleAutrui);
	styleDuProf = await seedWorksheet('style du prof', null, styleProf);
	dejaStylee = await seedWorksheet('déjà stylée', CONTROLE, STANDARD);
	sansStyle = await seedWorksheet('sans style', null, null);

	// L'insertion vient de poser `updated_at = now()` : on le recule, sans le
	// trigger qui réécrirait la valeur.
	await pg.query('alter table public.worksheets disable trigger update_worksheets_updated_at');
	await pg.query(`update public.worksheets set updated_at = $1 where title like $2`, [
		UPDATED_AT,
		`${RUN}%`
	]);
	await pg.query('alter table public.worksheets enable trigger update_worksheets_updated_at');

	await playMigration();
}, 120_000);

afterAll(async () => {
	const pg = await getPostgresClient();
	await pg
		.query('delete from public.worksheets where title like $1', [`${RUN}%`])
		.catch(() => undefined);
	await pg
		.query('delete from public.worksheet_templates where name like $1', [`${RUN}%`])
		.catch(() => undefined);
	await pg
		.query('delete from public.worksheet_styles where name like $1', [`${RUN}%`])
		.catch(() => undefined);
	await cleanupAllTestData();
});

describe('recopie de style_id depuis template_id', () => {
	it('une fiche qui n’a que template_id reçoit le même identifiant dans style_id', async () => {
		const fiche = await worksheetInDb(ancienne);
		expect(fiche.style_id).toBe(STANDARD);
		expect(fiche.template_id).toBe(STANDARD);
	});

	it('ne change pas la date de modification de la fiche', async () => {
		const fiche = await worksheetInDb(ancienne);
		expect(fiche.updated_at.toISOString()).toBe(UPDATED_AT);
	});

	it('laisse sans style une fiche dont le gabarit n’est pas un style', async () => {
		expect((await worksheetInDb(gabaritLibre)).style_id).toBeNull();
	});

	it('recopie un style du prof auteur de la fiche', async () => {
		const fiche = await worksheetInDb(styleDuProf);
		expect(fiche.style_id).toBe(fiche.template_id);
	});

	it('ne rattache jamais une fiche au style d’un autre compte', async () => {
		expect((await worksheetInDb(styleDAutrui)).style_id).toBeNull();
	});

	it('ne touche pas une fiche qui a déjà un style', async () => {
		expect((await worksheetInDb(dejaStylee)).style_id).toBe(CONTROLE);
	});

	it('laisse sans style une fiche qui n’en avait aucun', async () => {
		expect((await worksheetInDb(sansStyle)).style_id).toBeNull();
	});

	it('remet en marche le trigger updated_at', async () => {
		const pg = await getPostgresClient();
		await pg.query('update public.worksheets set title = title where id = $1', [sansStyle]);
		const fiche = await worksheetInDb(sansStyle);
		expect(fiche.updated_at.toISOString()).not.toBe(UPDATED_AT);
	});

	it('est idempotente — la rejouer ne change rien', async () => {
		await playMigration();
		expect((await worksheetInDb(ancienne)).style_id).toBe(STANDARD);
		expect((await worksheetInDb(dejaStylee)).style_id).toBe(CONTROLE);
		expect((await worksheetInDb(gabaritLibre)).style_id).toBeNull();
	});
});
