import { expect, test, type Browser, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';

/**
 * Messagerie privée : un aller-retour élève ↔ prof — base LOCALE
 * ==============================================================
 *
 * Écart V130 du registre (`docs/ecarts/registre.md`) : personne ne pouvait envoyer
 * de message, la validation refusait le document de l'éditeur riche. Le parcours
 * entier, par les pages : l'élève écrit, le prof lit et répond, l'élève lit la
 * réponse.
 *
 * Comptes fictifs de la base locale (`eleve01@local.test`, `teacher@local.test`).
 * Les messages du test portent un sujet à part et sont effacés avant et après.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const STUDENT = { email: 'eleve01@local.test', password: 'local-eleve' };
const SUBJECT_PREFIX = 'Vérif messagerie';
const SUBJECT = `${SUBJECT_PREFIX} ${Date.now()}`;
const QUESTION = 'Bonjour, je n’ai pas compris l’exercice 3.';
const ANSWER = 'On le reprend ensemble lundi.';

// ============================================================================
// FUNCTIONS
// ============================================================================

test.describe.configure({ mode: 'serial' });

// Base locale seulement : contre la prod (`VERIFS_URL`), les comptes `local-*` n'existent pas
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

async function eraseTestMessages(): Promise<void> {
	await sql(`delete from private_messages where subject like $1`, [`%${SUBJECT_PREFIX}%`]);
}

test.beforeAll(async () => {
	assertLocalServerEnv();
	await eraseTestMessages();
});

test.afterAll(async () => {
	await eraseTestMessages();
});

/** Une page connectée à ce compte, dans son propre contexte de navigateur */
async function pageFor(
	browser: Browser,
	account: { email: string; password: string }
): Promise<Page> {
	const page = await (await browser.newContext()).newPage();
	await login(page, account.email, account.password);
	return page;
}

/** Écrit dans l'éditeur riche de la page d'écriture, puis envoie */
async function writeAndSend(page: Page, text: string): Promise<void> {
	const editor = page.locator('.ProseMirror').first();
	await editor.click();
	await page.keyboard.type(text);
	await expect(editor).toContainText(text);

	const sent = page.waitForResponse((r) => r.url().includes('/api/messages/send'));
	await page.getByRole('button', { name: 'Envoyer' }).click();
	expect((await sent).status(), 'réponse de /api/messages/send').toBe(200);
	await expect(page).toHaveURL(/\/messages\/sent/);
}

/** Ouvre, dans la boîte de réception, le message dont le sujet contient `subject` */
async function openFromInbox(page: Page, subject: string): Promise<void> {
	await page.goto('/messages/inbox');
	await page.getByText(subject).first().click();
	await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}/);
}

// ============================================================================
// TESTS
// ============================================================================

test('V130 : l’élève écrit au prof, le prof répond, l’élève lit la réponse', async ({
	browser
}) => {
	// 1. L'élève écrit au prof
	const student = await pageFor(browser, STUDENT);
	await student.goto('/messages/compose');
	await student.getByRole('checkbox').first().check();
	await student.locator('#subject').fill(SUBJECT);
	await writeAndSend(student, QUESTION);
	await expect(student.getByText(SUBJECT).first()).toBeVisible();

	// 2. Le prof le lit dans sa boîte de réception
	const teacher = await pageFor(browser, TEACHER);
	await openFromInbox(teacher, SUBJECT);
	await expect(teacher.getByText(QUESTION)).toBeVisible();

	// 3. Le prof répond
	await teacher.getByRole('button', { name: 'Répondre' }).first().click();
	await expect(teacher).toHaveURL(/\/messages\/compose/);
	await writeAndSend(teacher, ANSWER);

	// 4. L'élève lit la réponse
	await openFromInbox(student, SUBJECT);
	await expect(student.getByText(ANSWER)).toBeVisible();

	await student.context().close();
	await teacher.context().close();
});
