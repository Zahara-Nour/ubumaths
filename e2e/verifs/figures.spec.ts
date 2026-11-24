import { expect, test, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql } from './helpers/carnet';

/**
 * Figures géométriques du prof — base LOCALE
 * ==========================================
 *
 * Reprend la ligne #1341 de `docs/wip/verifications-manuelles.md` : « Nouvelle figure »,
 * script avec erreur (« Ligne n : … », Enregistrer grisé), aperçu avec curseur,
 * enregistrement avec niveau et tag, filtre, « publique » lisible sans compte (sans
 * les tags), suppression avec confirmation.
 *
 * Les données portent le préfixe « Verifs » et sont retirées avant et après.
 */

const TITLE = 'Verifs figure 1341';
const TAG = 'verifs-tag-1341';
const SCRIPT_OK =
	'A = point(0, 0)\nB = point(4, 0)\nC = point(1, 3)\np = polygone(A, B, C)\nt = slider(min=0, max=10, valeur=5)\n';
// Fonction inconnue en ligne 2 : le DSL doit citer « Ligne 2 »
const SCRIPT_BAD = 'A = point(0, 0)\nB = fonction_qui_nexiste_pas(1, 2)\n';

async function cleanup(): Promise<void> {
	await sql(`delete from geometry_figures where title like 'Verifs figure%'`);
	await sql(`delete from tags where name = $1`, [TAG]);
}

/** Remplace le texte de la figure (le champ attend l'hydratation de la page) */
async function setScript(page: Page, text: string): Promise<void> {
	await page.locator('#figure-script').fill(text);
}

test.describe.configure({ mode: 'serial' });

// Base locale seulement : contre la prod (`VERIFS_URL`), les comptes `local-*` n'existent pas
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

test.beforeAll(async () => {
	assertLocalServerEnv();
	await cleanup();
});

test.afterAll(async () => {
	await cleanup();
});

test('#1341 figures : erreur de script, aperçu, enregistrement, filtre, page publique, suppression', async ({
	page,
	browser
}) => {
	await login(page, 'teacher@local.test', 'local-teacher');

	// Le menu « Figures » mène à la liste
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle');
	await page.getByRole('link', { name: 'Figures', exact: true }).first().click();
	await expect(page).toHaveURL(/\/dashboard\/teacher\/figures$/);
	await page.getByRole('link', { name: 'Nouvelle figure' }).click();
	await expect(page).toHaveURL(/\/figures\/new$/);
	await page.waitForLoadState('networkidle');

	await page.locator('#figure-title').fill(TITLE);

	// Script avec erreur : message avec numéro de ligne, Enregistrer grisé
	await setScript(page, SCRIPT_BAD);
	const alert = page.getByRole('alert');
	await expect(alert).toContainText(/Ligne 2/, { timeout: 5000 });
	const save = page.getByRole('button', { name: 'Enregistrer', exact: true });
	await expect(save).toBeDisabled();

	// Corrigé : l'aperçu se dessine, avec son curseur
	await setScript(page, SCRIPT_OK);
	await expect(alert).toHaveCount(0, { timeout: 5000 });
	await expect(page.locator('input[type="range"]').first()).toBeVisible();
	await expect(page.locator('svg[role="application"], svg[role="img"]').first()).toBeVisible();
	await expect(save).toBeEnabled();
	await page.screenshot({
		path: '.captures/verifs/chapitres/figure-apercu.png',
		fullPage: true
	});

	// Niveau et tag
	await page.getByRole('combobox', { name: 'Aucun niveau' }).click();
	await page.getByRole('option', { name: '6ème' }).click();
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Ajouter des tags' }).click();
	await page.getByPlaceholder(/tag/i).first().fill(TAG);
	await expect(page.getByRole('button', { name: 'Creer le tag' })).toBeEnabled();
	await page.getByRole('button', { name: 'Creer le tag' }).click();
	await expect(page.getByText(`Tag "${TAG}" cree`)).toBeVisible();
	await page.getByRole('button', { name: 'Sceller' }).click();
	await expect(page.locator('#contenu-principal').getByText(TAG, { exact: true })).toBeVisible();

	await save.click();
	await expect(page).toHaveURL(/\/dashboard\/teacher\/figures$/, { timeout: 10_000 });
	const row = page.locator('li', { hasText: TITLE });
	await expect(row).toBeVisible();
	await expect(row.getByText('Privée')).toBeVisible();
	await expect(row.getByText(`#${TAG}`)).toBeVisible();
	await expect(row.getByText('6ème')).toBeVisible();

	// Filtre par niveau et par tag (adresse : ?grade=…&tag=…)
	await page.goto(`/dashboard/teacher/figures?tag=${TAG}`);
	await expect(page.locator('li', { hasText: TITLE })).toBeVisible();
	await page.goto('/dashboard/teacher/figures?tag=verifs-tag-absent');
	await expect(page.getByText('Aucune figure ne correspond à ces filtres.')).toBeVisible();
	await page.goto('/dashboard/teacher/figures');
	await page.waitForLoadState('networkidle');
	// Le filtre par l'interface : niveau puis tag
	await page.getByRole('combobox', { name: /^Niveau/ }).click();
	await page.getByRole('option', { name: '6ème' }).click();
	await page.getByRole('combobox', { name: /^Tags/ }).click();
	await page.getByRole('option', { name: TAG }).click();
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Filtrer' }).click();
	await expect(page).toHaveURL(/grade=/);
	await expect(page.locator('li', { hasText: TITLE })).toBeVisible();

	// Rendre la figure publique
	await row.getByRole('link', { name: 'Modifier' }).click();
	await page.waitForLoadState('networkidle');
	await page.getByRole('checkbox', { name: /Figure publique/ }).click();
	await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard\/teacher\/figures$/, { timeout: 10_000 });
	const publicRow = page.locator('li', { hasText: TITLE });
	await expect(publicRow.getByText('Publique')).toBeVisible();
	const href = await publicRow.getByRole('link', { name: 'Voir' }).getAttribute('href');
	expect(href).toMatch(/^\/figures\/[0-9a-f-]{36}$/);

	// Sans compte (contexte neuf) : la page s'ouvre, sans les tags
	const baseURL = new URL(page.url()).origin;
	const anonymous = await browser.newContext({ baseURL });
	const anon = await anonymous.newPage();
	await anon.goto(href as string);
	await expect(anon.getByRole('heading', { name: TITLE })).toBeVisible();
	await expect(anon.locator('input[type="range"]').first()).toBeVisible({ timeout: 10_000 });
	await expect(anon.getByText(TAG)).toHaveCount(0);
	await anon.screenshot({ path: '.captures/verifs/chapitres/figure-publique.png' });
	await anonymous.close();

	// Suppression avec confirmation
	await publicRow.getByRole('link', { name: 'Modifier' }).click();
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Supprimer la figure' }).click();
	const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
	await expect(dialog.getByText('Supprimer cette figure ?')).toBeVisible();
	await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard\/teacher\/figures$/, { timeout: 10_000 });
	await expect(page.locator('li', { hasText: TITLE })).toHaveCount(0);
	expect(await sql(`select 1 from geometry_figures where title = $1`, [TITLE])).toHaveLength(0);
});
