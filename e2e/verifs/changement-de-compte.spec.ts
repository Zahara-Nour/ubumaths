import { expect, test, type Page } from '@playwright/test';
import { assertLocalServerEnv, login } from './helpers/carnet';

/**
 * Changer de compte sur un appareil partagé — base LOCALE
 * =======================================================
 *
 * Reprend les lignes #1303 (données de travail effacées au changement de compte),
 * #1295 (Père Ubu : la conversation d'un autre ne revient pas) et #1308 (adresses
 * des rapports de bug) de `docs/wip/verifications-manuelles.md`.
 *
 * Comptes élèves fictifs de `pnpm db:seed-riche` (`eleveNN@local.test`). Les données
 * des modules qu'on ne pilote pas ici (démineur, calculatrice, conversation) sont
 * posées comme le module les écrit : c'est leur effacement qu'on vérifie.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const PASSWORD = 'local-eleve';
const STUDENT_A = 'eleve01@local.test';
const STUDENT_B = 'eleve02@local.test';
const STUDENT_C = 'eleve03@local.test';

/** Données de travail posées comme les modules les écrivent (`work-data.ts`) */
const OTHER_WORK = {
	minesweeper_game: '{"verifs":"partie de A"}',
	'chiphre-calc-history': '["1+1"]',
	'chatHistory:compte-a': '[{"role":"user","content":"message de A"}]'
};

// ============================================================================
// FUNCTIONS
// ============================================================================

test.describe.configure({ mode: 'serial' });

// Base locale seulement : contre la prod (`VERIFS_URL`), les comptes `local-*` n'existent pas
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

test.beforeAll(() => {
	assertLocalServerEnv();
});

/**
 * Ouvre une page et attend qu'elle soit calme : au changement de propriétaire, la
 * page se recharge d'elle-même (`work-data.ts`), et WebKit couperait la suivante
 */
async function open(page: Page, address: string): Promise<void> {
	await page.goto(address);
	await page.waitForLoadState('networkidle');
}

/** L'éditeur du bac à sable Python */
function editor(page: Page) {
	return page
		.getByRole('textbox', { name: 'Éditeur de code Python' })
		.locator('visible=true')
		.first();
}

/** Remplace le code du bac à sable, puis laisse l'enregistrement (différé) se faire */
async function writePython(page: Page, code: string): Promise<void> {
	await open(page, '/python');
	await editor(page).click();
	await page.keyboard.press('ControlOrMeta+A');
	await page.keyboard.type(code);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const saved = localStorage.getItem('chiphre-python-playground');
				return saved ? String((JSON.parse(saved) as { code?: unknown }).code) : '';
			})
		)
		.toContain(code);
}

async function logout(page: Page): Promise<void> {
	await open(page, '/dashboard/profile');
	// Avant l'hydratation, le bouton ne fait rien
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Se déconnecter' }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/dashboard'));
}

async function workKeys(page: Page): Promise<string[]> {
	return page.evaluate(
		(keys) => keys.filter((key) => localStorage.getItem(key) !== null),
		[...Object.keys(OTHER_WORK), 'chiphre-python-playground']
	);
}

// ============================================================================
// TESTS
// ============================================================================

test('#1303 — visiteur qui se connecte : son code Python le suit', async ({ page }) => {
	await writePython(page, 'print("code du visiteur")');
	await login(page, STUDENT_A, PASSWORD);
	await open(page, '/python');
	await expect(editor(page)).toContainText('code du visiteur');
	await logout(page);
});

test('#1303, #1295 — compte A puis compte B : rien de A', async ({ page }) => {
	await login(page, STUDENT_A, PASSWORD);
	// #1295 : le chat du Père Ubu s'ouvre (il plantait au montage)
	const errors: string[] = [];
	page.on('pageerror', (error) => {
		// WebKit signale ainsi les requêtes de la page précédente coupées par la
		// navigation (« … due to access control checks ») : pas une erreur du chat
		if (!error.message.includes('due to access control checks')) errors.push(error.message);
	});
	await open(page, '/pere-ubu');
	await expect(page.getByRole('textbox').first()).toBeVisible();
	expect(errors).toEqual([]);

	await writePython(page, 'print("code de A")');
	await page.evaluate((entries) => {
		for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
	}, OTHER_WORK);

	await logout(page);
	expect(await workKeys(page)).toEqual([]);

	await login(page, STUDENT_B, PASSWORD);
	await open(page, '/python');
	await expect(editor(page)).not.toContainText('code de A');
	expect(await workKeys(page)).not.toContain('minesweeper_game');
	expect(await workKeys(page)).not.toContain('chatHistory:compte-a');
	await open(page, '/pere-ubu');
	await expect(page.getByText('message de A')).toHaveCount(0);
	await logout(page);
});

test('#1303 — deux onglets : un autre compte dans l’un recharge l’autre', async ({ page }) => {
	await login(page, STUDENT_B, PASSWORD);
	await writePython(page, 'print("code de B")');
	const other = await page.context().newPage();
	await logout(other);
	const reloaded = page.waitForEvent('load', { timeout: 30_000 });
	await login(other, STUDENT_C, PASSWORD);
	await reloaded;
	// Rechargé : le code de B n'est plus affiché dans le premier onglet
	await expect(editor(page)).not.toContainText('code de B');
	await other.close();
	await logout(page);
});

test('#1308 — rapport de bug : aucune page de A, aucune adresse avec ? ou #', async ({ page }) => {
	await login(page, STUDENT_A, PASSWORD);
	for (const address of ['/python?verifs=a', '/pere-ubu#verifs-a', '/automaths']) {
		await open(page, address);
		await page.locator('body').click({ position: { x: 5, y: 5 } });
	}
	// Dans le même onglet : déconnexion, puis B
	await logout(page);
	await login(page, STUDENT_B, PASSWORD);
	await open(page, '/grapheur?verifs=b#fragment');
	await page.locator('body').click({ position: { x: 5, y: 5 } });

	// Les adresses retenues existent (sinon les « not » ci-dessous passeraient à vide)
	await expect
		.poll(() => page.evaluate(() => sessionStorage.getItem('chiphre_freeze_data') ?? ''))
		.toContain('/grapheur');
	const stored = await page.evaluate(() => sessionStorage.getItem('chiphre_freeze_data') ?? '');
	expect(stored).not.toContain('verifs=a');
	expect(stored).not.toContain('verifs-a');
	expect(stored).not.toContain('/python');
	expect(stored).not.toMatch(/\?|#fragment/);
	await logout(page);
});
