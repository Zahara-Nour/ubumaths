import { expect, test } from '@playwright/test';
import { login, sql, TEACHER } from './helpers/carnet';
import { gotoSettled } from './helpers/pages';

/**
 * Versions d'un exercice : la fiche choisit la sienne (ADR 0044, chantier versions-exercices, PR 3)
 * =================================================================================================
 *
 * À l'écran, avec le prof fictif de la base locale :
 * 1. brouillon sans affectation : la ligne en v1 dit qu'une version plus récente existe (v2),
 *    « Passer à la v2 » change la version tout de suite ; un exercice à une seule version n'affiche
 *    rien ; le menu ramène à la v1 ;
 * 2. fiche publiée avec une affectation en cours : « Passer à la v2 » demande confirmation ;
 *    « Renoncer » ou Échap ne changent rien, la confirmation change la version.
 *
 * Décor posé et retiré en SQL : deux exercices et deux fiches à soi, rien d'autre n'est touché.
 */

// Constantes
const LOCAL = process.env.VERIFS_URL === undefined;
const RUN = `verifs-versions-fiche-${Date.now().toString(36)}`;
const VARIATION = (text: string) =>
	JSON.stringify([{ label: 'guided', statement_md: `Énoncé ${text}`, solution_md: 'Corrigé' }]);

// Variables
let teacherId: string;
let exerciseId: string;
let singleId: string;
let v1Id: string;
let draftId: string;
let publishedId: string;

async function lineVersionNumber(worksheetId: string, exId: string): Promise<number> {
	const [row] = await sql<{ number: number }>(
		`select v.number from public.worksheet_exercises we
		 join public.exercise_versions v on v.id = we.exercise_version_id
		 where we.worksheet_id = $1 and we.exercise_id = $2`,
		[worksheetId, exId]
	);
	return row.number;
}

async function newWorksheet(status: 'draft' | 'published'): Promise<string> {
	const [{ id }] = await sql<{ id: string }>(
		`insert into public.worksheets (title, type, status, created_by)
		 values ($1, 'worksheet', $2, $3) returning id`,
		[`${RUN}-${status}`, status, teacherId]
	);
	return id;
}

test.describe('version d’un exercice dans la fiche (base locale)', () => {
	test.skip(!LOCAL, 'base locale');

	test.beforeAll(async () => {
		[{ id: teacherId }] = await sql<{ id: string }>(
			'select id from public.profiles where email = $1',
			[TEACHER.email]
		);
		[{ id: exerciseId }, { id: singleId }] = await sql<{ id: string }>(
			`insert into public.exercises (title, category, created_by, is_public)
			 values ($1, 'automatisme', $3, false), ($2, 'automatisme', $3, false) returning id`,
			[`${RUN}-deux-versions`, `${RUN}-une-version`, teacherId]
		);
		[{ id: v1Id }] = await sql<{ id: string }>(
			`insert into public.exercise_versions (exercise_id, number, variations, created_by)
			 values ($1, 1, $2, $3) returning id`,
			[exerciseId, VARIATION('v1'), teacherId]
		);
		await sql(
			`insert into public.exercise_versions (exercise_id, number, note, variations, created_by)
			 values ($1, 2, 'question b) reformulée', $2, $3)`,
			[exerciseId, VARIATION('v2'), teacherId]
		);
		const [single] = await sql<{ id: string }>(
			`insert into public.exercise_versions (exercise_id, number, variations, created_by)
			 values ($1, 1, $2, $3) returning id`,
			[singleId, VARIATION('unique'), teacherId]
		);

		draftId = await newWorksheet('draft');
		publishedId = await newWorksheet('published');
		await sql(
			`insert into public.worksheet_exercises (worksheet_id, exercise_id, exercise_version_id, position)
			 values ($1, $3, $4, 1), ($1, $5, $6, 2), ($2, $3, $4, 1)`,
			[draftId, publishedId, exerciseId, v1Id, singleId, single.id]
		);
		await sql(
			`insert into public.worksheet_assignments (worksheet_id, status, created_by)
			 values ($1, 'active', $2)`,
			[publishedId, teacherId]
		);
	});

	test.afterAll(async () => {
		await sql('delete from public.worksheets where id = any($1)', [[draftId, publishedId]]);
		await sql('delete from public.exercises where id = any($1)', [[exerciseId, singleId]]);
	});

	test('brouillon : changement direct, puis retour à la v1 par le menu', async ({ page }) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, `/dashboard/teacher/contenu/worksheets/${draftId}`);

		const controls = page.locator('[data-line-version]');
		// Seul l'exercice à deux versions a le menu
		await expect(controls).toHaveCount(1);
		await expect(controls).toContainText('une version plus récente existe (v2)');

		await controls.getByRole('button', { name: 'Passer à la v2' }).click();
		await expect(page.getByText(/1 : version 2/)).toBeVisible();
		await expect(controls).not.toContainText('une version plus récente existe');
		expect(await lineVersionNumber(draftId, exerciseId)).toBe(2);

		// Le menu : retour à la v1
		await controls.getByRole('combobox').click();
		await page.getByRole('option', { name: /^v1 · / }).click();
		await expect(controls).toContainText('une version plus récente existe (v2)');
		expect(await lineVersionNumber(draftId, exerciseId)).toBe(1);
	});

	test('fiche distribuée : confirmation, renoncer ne change rien', async ({ page }) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, `/dashboard/teacher/contenu/worksheets/${publishedId}`);

		const controls = page.locator('[data-line-version]');
		await controls.getByRole('button', { name: 'Passer à la v2' }).click();
		const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
		await expect(dialog).toContainText('1 affectation en cours');
		await dialog.getByRole('button', { name: 'Renoncer' }).click();
		expect(await lineVersionNumber(publishedId, exerciseId)).toBe(1);

		// Le menu, puis Échap : rien n'est changé, le menu revient à la v1
		await controls.getByRole('combobox').click();
		await page.getByRole('option', { name: /^v2 / }).click();
		await expect(dialog).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(controls.getByRole('combobox')).toContainText('v1');
		expect(await lineVersionNumber(publishedId, exerciseId)).toBe(1);

		await controls.getByRole('button', { name: 'Passer à la v2' }).click();
		await dialog.getByRole('button', { name: 'Passer à la v2' }).click();
		await expect(controls).not.toContainText('une version plus récente existe');
		expect(await lineVersionNumber(publishedId, exerciseId)).toBe(2);
	});
});
