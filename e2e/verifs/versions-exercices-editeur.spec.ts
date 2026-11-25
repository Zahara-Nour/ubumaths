import { expect, test } from '@playwright/test';
import { login, sql, TEACHER } from './helpers/carnet';
import { gotoSettled } from './helpers/pages';

/**
 * Versions d'un exercice : l'éditeur (ADR 0044, chantier versions-exercices, PR 2)
 * ================================================================================
 *
 * À l'écran, avec le prof fictif de la base locale :
 * 1. la page ouvre la version la plus récente ;
 * 2. « Nouvelle version » avec une note → la version 2 s'ouvre, avec sa note ;
 * 3. la note se modifie ;
 * 4. la version 2 (inutilisée) se supprime → la page revient à la version 1 ;
 * 5. ouverte depuis la fiche, la page ouvre la version de la fiche, dit qu'une fiche l'utilise,
 *    et ne propose pas de la supprimer.
 *
 * Décor posé et retiré en SQL : un exercice et une fiche à soi, rien d'autre n'est touché.
 */

// Constantes
const LOCAL = process.env.VERIFS_URL === undefined;
const RUN = `verifs-versions-${Date.now().toString(36)}`;

// Variables
let exerciseId: string;
let worksheetId: string;

test.describe('éditeur de versions (base locale)', () => {
	test.skip(!LOCAL, 'base locale');

	test.beforeAll(async () => {
		const [teacher] = await sql<{ id: string }>('select id from public.profiles where email = $1', [
			TEACHER.email
		]);
		[{ id: exerciseId }] = await sql<{ id: string }>(
			`insert into public.exercises (title, category, created_by, is_public)
			 values ($1, 'automatisme', $2, false) returning id`,
			[RUN, teacher.id]
		);
		const [v1] = await sql<{ id: string }>(
			`insert into public.exercise_versions (exercise_id, number, variations, created_by)
			 values ($1, 1, $2, $3) returning id`,
			[
				exerciseId,
				JSON.stringify([{ label: 'guided', statement_md: 'Énoncé v1', solution_md: 'Corrigé v1' }]),
				teacher.id
			]
		);
		[{ id: worksheetId }] = await sql<{ id: string }>(
			`insert into public.worksheets (title, type, status, created_by)
			 values ($1, 'worksheet', 'draft', $2) returning id`,
			[RUN, teacher.id]
		);
		await sql(
			`insert into public.worksheet_exercises (worksheet_id, exercise_id, exercise_version_id, position)
			 values ($1, $2, $3, 1)`,
			[worksheetId, exerciseId, v1.id]
		);
	});

	test.afterAll(async () => {
		await sql('delete from public.worksheets where id = $1', [worksheetId]);
		await sql('delete from public.exercises where id = $1', [exerciseId]);
	});

	test('nouvelle version, note, suppression, ouverture depuis la fiche', async ({ page }) => {
		await login(page, TEACHER.email, TEACHER.password);
		const editor = `/dashboard/teacher/contenu/exercices/${exerciseId}`;
		const bar = page.getByRole('region', { name: /Versions de la/ });

		// 1. La plus récente (la seule)
		await gotoSettled(page, editor);
		await expect(bar).toContainText('Version 1, créée le');
		await expect(bar.getByRole('button', { name: 'Supprimer' })).toBeDisabled();

		// 2. Nouvelle version avec une note
		await bar.getByRole('button', { name: 'Nouvelle version' }).click();
		const newDialog = page.getByRole('dialog');
		await newDialog.getByRole('textbox').fill('Question b) reformulée');
		await newDialog.getByRole('button', { name: 'Créer la version' }).click();
		await page.waitForURL(/version=2/);
		await expect(bar).toContainText('Version 2, créée le');
		await expect(bar).toContainText('Question b) reformulée');

		// 3. La note change
		await bar.getByRole('button', { name: 'Note' }).click();
		const noteDialog = page.getByRole('dialog');
		await noteDialog.getByRole('textbox').fill('Après le test en classe');
		await noteDialog.getByRole('button', { name: 'Enregistrer' }).click();
		await expect(bar).toContainText('Après le test en classe');

		// 4. La version 2, inutilisée, se supprime
		await bar.getByRole('button', { name: 'Supprimer' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
		await page.waitForURL((url) => !url.searchParams.has('version'));
		await expect(bar).toContainText('Version 1, créée le');
		const versions = await sql<{ number: number }>(
			'select number from public.exercise_versions where exercise_id = $1',
			[exerciseId]
		);
		expect(versions.map((v) => v.number)).toEqual([1]);

		// 5. Depuis la fiche, après une nouvelle v2 : la v1 de la fiche, marquée utilisée
		await bar.getByRole('button', { name: 'Nouvelle version' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Créer la version' }).click();
		await page.waitForURL(/version=/);
		await gotoSettled(page, `${editor}?fiche=${worksheetId}`);
		await expect(bar).toContainText('Version 1, créée le');
		await expect(bar).toContainText(`Utilisée par : ${RUN}`);
		await expect(bar).toContainText('Ce n’est pas la version la plus récente');
		await expect(bar.getByRole('button', { name: 'Supprimer' })).toBeDisabled();

		// 6. « Mettre à jour » écrit dans la v1 affichée, la v2 ne bouge pas
		const before = await sql<{ number: number; updated_at: Date }>(
			'select number, updated_at from public.exercise_versions where exercise_id = $1 order by number',
			[exerciseId]
		);
		await page.getByRole('button', { name: 'Mettre à jour' }).first().click();
		await expect(page.getByText(/mise à jour avec succès/)).toBeVisible();
		const after = await sql<{ number: number; updated_at: Date }>(
			'select number, updated_at from public.exercise_versions where exercise_id = $1 order by number',
			[exerciseId]
		);
		expect(after[0].updated_at.getTime()).toBeGreaterThan(before[0].updated_at.getTime());
		expect(after[1].updated_at.getTime()).toBe(before[1].updated_at.getTime());
	});
});
