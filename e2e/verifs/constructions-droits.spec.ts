import { expect, test } from '@playwright/test';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';

/**
 * Constructions : qui crée, qui lit — la vérification manuelle de #1615, sur la base locale
 * =========================================================================================
 *
 * Élève : plus de boutons « Nouvelle construction », « Importer XML » ni « Modifier » ;
 * les constructions publiées se lisent et se jouent ; `/constructions/new` → 403.
 * Prof : créer, modifier, publier, supprimer.
 *
 *   VERIFS_PORT=5179 pnpm test:verifs constructions-droits --project ordi-chrome --workers 1
 *
 * Données créées : « Verifs construction … », supprimées en fin de passage.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

const STUDENT = { email: 'eleve22@local.test', password: 'local-eleve' };
const RUN = Date.now().toString(36);
const TITLE = `Verifs construction ${RUN}`;
const RENAMED = `Verifs construction renommée ${RUN}`;

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
	assertLocalServerEnv();
});

test.afterAll(async () => {
	await sql(`delete from constructions where title like 'Verifs construction %'`);
});

async function constructionByTitle(title: string) {
	return sql<{ id: string; title: string; is_public: boolean }>(
		'select id, title, is_public from constructions where title = $1',
		[title]
	);
}

let constructionId = '';

test('#1615 prof : créer une construction (brouillon), elle s’ouvre', async ({ page }) => {
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto('/constructions');
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('link', { name: 'Nouvelle construction' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Importer XML' })).toBeVisible();

	await page.getByRole('link', { name: 'Nouvelle construction' }).click();
	await expect(page).toHaveURL(/\/constructions\/new/);
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Titre').fill(TITLE);
	await page.getByRole('button', { name: 'Enregistrer' }).last().click();
	await expect(page).toHaveURL(/\/constructions\/[0-9a-f-]{36}$/);

	const rows = await constructionByTitle(TITLE);
	expect(rows).toHaveLength(1);
	expect(rows[0].is_public).toBe(false);
	constructionId = rows[0].id;
});

test('#1615 élève : un brouillon du prof ne se voit pas, et pas de bouton de création ni « Modifier »', async ({
	page
}) => {
	await login(page, STUDENT.email, STUDENT.password);
	await page.goto('/constructions');
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: /Constructions/ }).first()).toBeVisible();
	await expect(page.getByRole('link', { name: 'Nouvelle construction' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Importer XML' })).toHaveCount(0);
	await expect(page.getByText('Modifier')).toHaveCount(0);
	await expect(page.getByText(TITLE)).toHaveCount(0);
});

test('#1615 prof : modifier (nouveau titre) et publier', async ({ page }) => {
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(`/constructions/${constructionId}/edit`);
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Titre').fill(RENAMED);
	await page.getByLabel('Rendre publique').check();
	await page
		.getByRole('button', { name: /Enregistrer/ })
		.last()
		.click();
	await expect(page).toHaveURL(new RegExp(`/constructions/${constructionId}$`));

	const rows = await constructionByTitle(RENAMED);
	expect(rows).toHaveLength(1);
	expect(rows[0].is_public).toBe(true);
	expect(await constructionByTitle(TITLE)).toHaveLength(0);
});

test('#1615 élève : la construction publiée se lit et se joue, sans bouton de création ni « Modifier »', async ({
	page
}) => {
	await login(page, STUDENT.email, STUDENT.password);
	await page.goto('/constructions');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText(RENAMED)).toBeVisible();
	await expect(page.getByRole('link', { name: 'Nouvelle construction' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Importer XML' })).toHaveCount(0);
	await expect(page.getByText('Modifier')).toHaveCount(0);

	const card = page.locator('[data-slot="card"]').filter({ hasText: RENAMED });
	await card.getByRole('link').first().click();
	await expect(page).toHaveURL(new RegExp(`/constructions/${constructionId}$`));
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: RENAMED })).toBeVisible();
	// Elle se joue : le lecteur dessine sa grille (un grand tracé, pas une icône)
	await expect
		.poll(async () =>
			page
				.locator('canvas, svg')
				.evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().width)))
		)
		.toBeGreaterThan(400);
	// Pas de « Modifier » ni de « Supprimer » sur la page de l'élève
	await expect(page.getByRole('link', { name: 'Modifier' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
});

test('#1615 élève : /constructions/new et /edit tapés à la main → 403, et l’API refuse de créer', async ({
	page
}) => {
	await login(page, STUDENT.email, STUDENT.password);
	const direct = await page.goto('/constructions/new');
	expect(direct?.status()).toBe(403);
	const edit = await page.goto(`/constructions/${constructionId}/edit`);
	expect(edit?.status()).toBe(403);

	const response = await page.request.post('/api/constructions', {
		data: {
			title: `Verifs construction élève ${RUN}`,
			format: 'dsl',
			dsl_script: 'A = point(0, 0)'
		}
	});
	expect(response.ok()).toBe(false);
	expect(await constructionByTitle(`Verifs construction élève ${RUN}`)).toHaveLength(0);
});

test('#1615 prof : supprimer la construction', async ({ page }) => {
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto('/constructions');
	await page.waitForLoadState('networkidle');
	const card = page.locator('[data-slot="card"]').filter({ hasText: RENAMED });
	await expect(card).toBeVisible();
	page.once('dialog', (dialog) => void dialog.accept());
	await card.getByRole('button').first().click();
	await page.getByRole('menuitem', { name: 'Supprimer' }).click();
	await expect(page.getByText(RENAMED)).toHaveCount(0);
	expect(await constructionByTitle(RENAMED)).toHaveLength(0);
});
