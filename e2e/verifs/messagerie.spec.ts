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
const DRAFT_SUBJECT = `${SUBJECT_PREFIX} brouillon ${Date.now()}`;
const DRAFT_TEXT = 'Je termine ce message plus tard.';
const QUESTION = 'Bonjour, je n’ai pas compris l’exercice 3.';
const ANSWER = 'On le reprend ensemble lundi.';
const FOLLOW_UP = 'Merci, à lundi.';
const CLASS_SUBJECT = `${SUBJECT_PREFIX} classe ${Date.now()}`;
const CLASS_TEXT = 'Contrôle lundi, révisez le chapitre 3.';
const THREAD_SUBJECT = `${SUBJECT_PREFIX} fil ${Date.now()}`;

// ============================================================================
// FUNCTIONS
// ============================================================================

test.describe.configure({ mode: 'serial' });

// Base locale seulement : contre la prod (`VERIFS_URL`), les comptes `local-*` n'existent pas
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

async function eraseTestMessages(): Promise<void> {
	await sql(`delete from private_messages where subject like $1`, [`%${SUBJECT_PREFIX}%`]);
	await sql(`delete from message_drafts where subject like $1`, [`%${SUBJECT_PREFIX}%`]);
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

/** Écrit dans l'éditeur riche de la page d'écriture */
async function write(page: Page, text: string): Promise<void> {
	const editor = page.locator('.ProseMirror').first();
	await editor.click();
	await page.keyboard.type(text);
	await expect(editor).toContainText(text);
}

/** Écrit dans l'éditeur riche de la page d'écriture, puis envoie */
async function writeAndSend(page: Page, text: string): Promise<void> {
	await write(page, text);
	await send(page);
}

/** Envoie le message de la page d'écriture : le serveur l'accepte, la page passe aux envoyés */
async function send(page: Page): Promise<void> {
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

test('V130 : un brouillon repris part sans y toucher, et le prof le lit sans balises', async ({
	browser
}) => {
	// 1. L'élève enregistre un brouillon
	const student = await pageFor(browser, STUDENT);
	await student.goto('/messages/compose');
	await student.getByRole('checkbox').first().check();
	await student.locator('#subject').fill(DRAFT_SUBJECT);
	await write(student, DRAFT_TEXT);
	const saved = student.waitForResponse(
		(r) => r.url().includes('/api/messages/drafts') && r.request().method() === 'POST'
	);
	await student.getByRole('button', { name: 'Enregistrer brouillon' }).click();
	const { draft } = (await (await saved).json()) as { draft: { id: string } };

	// 2. Il le reprend et l'envoie sans toucher à l'éditeur
	await student.goto(`/messages/compose?draftId=${draft.id}`);
	await expect(student.locator('.ProseMirror').first()).toContainText(DRAFT_TEXT);
	await expect(student.getByRole('checkbox').first()).toBeChecked();
	await send(student);

	// 3. Le prof lit le texte, pas le HTML du brouillon
	const teacher = await pageFor(browser, TEACHER);
	await openFromInbox(teacher, DRAFT_SUBJECT);
	await expect(teacher.getByText(DRAFT_TEXT)).toBeVisible();
	await expect(teacher.getByText('<p>')).toHaveCount(0);

	await student.context().close();
	await teacher.context().close();
});

/**
 * Écarts V132, V133 et V134 : comptes comme en prod, prénom et nom remplis,
 * nom complet vide (les comptes de la base locale en ont tous un).
 */
test.describe('comptes sans nom complet', () => {
	interface Names {
		id: string;
		email: string;
		full_name: string | null;
		firstname: string | null;
		lastname: string | null;
	}
	let before: Names[] = [];
	let className = '';

	test.beforeAll(async () => {
		before = await sql<Names>(
			`select id, email, full_name, firstname, lastname from profiles where email = any($1)`,
			[[STUDENT.email, TEACHER.email]]
		);
		expect(before).toHaveLength(2);
		await sql(
			`update profiles set full_name = null,
				firstname = case when email = $1 then 'Camille' else 'Dominique' end,
				lastname = case when email = $1 then 'Fictif' else 'Prof' end
			where email = any($2)`,
			[STUDENT.email, [STUDENT.email, TEACHER.email]]
		);
		// Une classe active de l'élève, pour le message de classe
		const classes = await sql<{ name: string }>(
			`select c.name from classes c
				join class_members cm on cm.class_id = c.id and cm.status = 'active'
				join profiles p on p.id = cm.student_id
			where p.email = $1 and c.is_active order by c.name limit 1`,
			[STUDENT.email]
		);
		expect(classes, 'eleve01 est dans une classe active (pnpm db:neuf)').toHaveLength(1);
		className = classes[0].name;
	});

	test.afterAll(async () => {
		for (const row of before) {
			await sql(`update profiles set full_name = $2, firstname = $3, lastname = $4 where id = $1`, [
				row.id,
				row.full_name,
				row.firstname,
				row.lastname
			]);
		}
	});

	test('V134 : la page « Écrire » nomme chacun, sans « Inconnu » ni rôle en anglais', async ({
		browser
	}) => {
		const teacher = await pageFor(browser, TEACHER);
		await teacher.goto('/messages/compose');
		await expect(teacher.getByText('Camille Fictif')).toBeVisible();
		await expect(teacher.getByText('(student)')).toHaveCount(0);

		const student = await pageFor(browser, STUDENT);
		await student.goto('/messages/compose');
		await expect(student.getByText('Dominique Prof')).toBeVisible();
		await expect(student.getByText('Inconnu')).toHaveCount(0);
		await expect(student.getByText('(teacher)')).toHaveCount(0);

		await student.context().close();
		await teacher.context().close();
	});

	test('V133 : l’élève répond depuis le fil qu’il a ouvert, sa réponse part au prof', async ({
		browser
	}) => {
		// 1. L'élève écrit au prof
		const student = await pageFor(browser, STUDENT);
		await student.goto('/messages/compose');
		await student.getByRole('checkbox').first().check();
		await student.locator('#subject').fill(THREAD_SUBJECT);
		const sent = student.waitForResponse((r) => r.url().includes('/api/messages/send'));
		await write(student, QUESTION);
		await student.getByRole('button', { name: 'Envoyer' }).click();
		const { messageId } = (await (await sent).json()) as { messageId: string };
		await expect(student).toHaveURL(/\/messages\/sent/);

		// 2. Depuis son fil, sans réponse du prof : « Répondre » vise le prof, par son nom
		await student.goto(`/messages/thread/${messageId}`);
		await expect(student.getByText('Camille Fictif')).toBeVisible();
		await student.getByRole('button', { name: 'Répondre' }).click();
		await expect(student).toHaveURL(/\/messages\/compose/);
		await expect(student.getByText('Dominique Prof')).toBeVisible();
		await expect(student.getByRole('checkbox')).toHaveCount(0);
		await writeAndSend(student, FOLLOW_UP);

		// 3. Le prof lit les deux messages de l'élève, nommé, et lui répond
		const teacher = await pageFor(browser, TEACHER);
		await teacher.goto(`/messages/thread/${messageId}`);
		await expect(teacher.getByText(FOLLOW_UP)).toBeVisible();
		await expect(teacher.getByText('Camille Fictif').first()).toBeVisible();
		await expect(teacher.getByText('Expéditeur inconnu')).toHaveCount(0);
		await teacher.getByRole('button', { name: 'Répondre' }).click();
		await expect(teacher).toHaveURL(/\/messages\/compose/);
		await expect(teacher.getByText('Camille Fictif')).toBeVisible();
		await writeAndSend(teacher, ANSWER);

		// 4. L'élève ouvre la réponse : le prof est nommé, et il peut répondre
		await openFromInbox(student, THREAD_SUBJECT);
		await expect(student.getByText(ANSWER)).toBeVisible();
		await expect(student.getByText('Dominique Prof').first()).toBeVisible();
		await student.getByRole('button', { name: 'Répondre' }).first().click();
		await expect(student).toHaveURL(/\/messages\/compose/);
		await expect(student.getByText('Dominique Prof')).toBeVisible();

		await student.context().close();
		await teacher.context().close();
	});

	test('V132 : le prof écrit à une classe, l’élève le reçoit sans les noms des autres', async ({
		browser
	}) => {
		const teacher = await pageFor(browser, TEACHER);
		await teacher.goto('/messages/compose');
		await teacher.getByRole('radio', { name: /Groupe/ }).check();
		await teacher.locator('#class-select, [role="combobox"]').first().click();
		await teacher.getByRole('option', { name: new RegExp(className) }).click();
		await teacher.locator('#subject').fill(CLASS_SUBJECT);
		await writeAndSend(teacher, CLASS_TEXT);

		const student = await pageFor(browser, STUDENT);
		const details = student.waitForResponse(
			(r) => /\/api\/messages\/[0-9a-f-]{36}$/.test(new URL(r.url()).pathname) && r.ok()
		);
		await openFromInbox(student, CLASS_SUBJECT);
		await expect(student.getByText(CLASS_TEXT)).toBeVisible();
		await expect(student.getByText(/Message de groupe/)).toBeVisible();
		// La réponse du serveur ne porte que la ligne de l'élève lui-même
		const { message } = (await (await details).json()) as {
			message: { recipient_count: number; recipients: Array<{ name: string }> };
		};
		expect(message.recipients.map((r) => r.name)).toEqual(['Camille Fictif']);
		expect(message.recipient_count).toBeGreaterThanOrEqual(1);

		await student.context().close();
		await teacher.context().close();
	});
});
