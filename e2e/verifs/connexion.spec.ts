import { expect, test, type Page } from '@playwright/test';
import {
	assertLocalServerEnv,
	emailHtml,
	emailLink,
	emailsTo,
	sql,
	waitForEmail
} from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock } from './helpers/verrou';

/**
 * Connexion et inscription par le parent — les vérifications manuelles, sur la base locale
 * ========================================================================================
 *
 * Reprend #1585 (champ « Adresse email ou identifiant ») et #1592 (inscription
 * par le parent) de `docs/wip/verifications-manuelles.md`. Les courriels ne
 * partent pas : le serveur de dev les capture (`.captures/courriels/`).
 * RESTE à la main : le Dashboard Supabase de prod (« Secure email change », audit
 * F1) et les enregistrements OVH (`eleves.chiph.re`).
 *
 *   VERIFS_PORT=5179 pnpm test:verifs connexion --project ordi-chrome --workers 1
 *
 * Écrit dans la base locale : la classe « Seconde Locale » est ouverte aux
 * inscriptions le temps du test (réglage d'origine rétabli), le compte de
 * l'enfant créé est supprimé en fin de passage.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

const PARENT_EMAIL = 'parent-verifs@local.test';
const CLASS_CODE = 'DEVLOCAL';
const CHILD_FIRSTNAME = 'Verifsenfant';
const CHILD_PASSWORD = 'Verifs-Parent-2468-xq';

let lockHeld = false;

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	await acquireLock('eleves-21-25');
	lockHeld = true;
});

test.afterAll(() => {
	if (lockHeld) releaseLock('eleves-21-25');
});

async function fillLogin(page: Page, identifier: string, password: string): Promise<void> {
	await page.goto('/auth/login');
	await page.waitForLoadState('networkidle');
	await page.locator('input[name="email"]').fill(identifier);
	await page.locator('input[type="password"]').fill(password);
	await expect(page.locator('input[name="email"]')).toHaveValue(identifier);
	await page.locator('button[type="submit"]').click();
}

test.describe('#1585 connexion : adresse ou identifiant', () => {
	test('#1585 le champ s’appelle « Adresse email ou identifiant »', async ({ page }) => {
		await page.goto('/auth/login');
		await page.waitForLoadState('networkidle');
		await expect(page.getByLabel('Adresse email ou identifiant')).toBeVisible();
		await expect(page.getByLabel('Adresse email ou identifiant')).toHaveAttribute('name', 'email');
	});

	test('#1585 un compte existant se connecte avec son adresse tapée en majuscules', async ({
		page
	}) => {
		await fillLogin(page, 'ELEVE21@LOCAL.TEST', 'local-eleve');
		await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'));
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('#1585 un faux identifiant : « Identifiants invalides. » et le champ réaffiche toto12', async ({
		page
	}) => {
		await fillLogin(page, 'toto12', 'nimporte-quoi-123');
		await expect(page.getByText('Identifiants invalides.')).toBeVisible();
		await expect(page).toHaveURL(/\/auth\/login/);
		await expect(page.locator('input[name="email"]')).toHaveValue('toto12');
	});
});

test.describe('#1592 inscription par le parent', () => {
	test.describe.configure({ mode: 'serial' });

	/** Réglage d'origine de la classe, lu avant d'y toucher (null : rien changé, rien à rendre) */
	let saved: { open: boolean; grade: string | null } | null = null;
	/** Courriels déjà capturés pour cette adresse (restes d'un passage précédent) */
	let mailsBefore = 0;
	let childId: string | null = null;

	test.beforeAll(async () => {
		// Plafond d'inscriptions par adresse (par jour) : remis à zéro pour cette adresse fictive
		await resetSignupLimits();
		mailsBefore = (await emailsTo(PARENT_EMAIL)).length;
		const rows = await sql<{ registration_open: boolean; grade: string | null }>(
			'select registration_open, grade from classes where join_code = $1',
			[CLASS_CODE]
		);
		expect(rows).toHaveLength(1);
		saved = { open: rows[0].registration_open, grade: rows[0].grade };
		// Niveau 6e (comme la classe de la ligne) : le consentement parental est exigé d'emblée,
		// alors qu'en 2nde il dépend de l'âge (question posée à l'élève)
		await sql("update classes set registration_open = true, grade = '6' where join_code = $1", [
			CLASS_CODE
		]);
		await removeChild();
	});

	test.afterAll(async () => {
		await removeChild();
		await resetSignupLimits();
		if (saved !== null) {
			await sql('update classes set registration_open = $2, grade = $3 where join_code = $1', [
				CLASS_CODE,
				saved.open,
				saved.grade
			]);
		}
	});

	/** Plafonds d'inscription (adresse du parent, classe, poste local) : repartir de zéro avant et après */
	async function resetSignupLimits(): Promise<void> {
		await sql(
			`delete from rate_limits where key = $1 or key = 'ratelimit:signup:::1'
			 or key = 'ratelimit:signup:class:' || (select id::text from classes where join_code = $2)`,
			[`ratelimit:signup:parent:${PARENT_EMAIL}`, CLASS_CODE]
		);
	}

	/** Retire le compte de test et ses traces (courriel du parent fictif) */
	async function removeChild(): Promise<void> {
		const ids = await sql<{ id: string }>(
			`select distinct student_id as id from parental_consents where parent_email = $1
			 union select distinct student_id from parent_contacts where email = $1`,
			[PARENT_EMAIL]
		).catch(() => [] as { id: string }[]);
		for (const { id } of ids) {
			await sql('delete from auth.users where id = $1', [id]);
		}
		if (childId) await sql('delete from auth.users where id = $1', [childId]);
	}

	let loginId = '';

	test('#1592 /auth/register → « J’inscris mon enfant » → l’écran affiche l’identifiant, le courriel arrive', async ({
		page
	}) => {
		await page.goto('/auth/register');
		await page.waitForLoadState('networkidle');
		await page.getByRole('link', { name: "J'inscris mon enfant" }).click();
		await expect(page).toHaveURL(/\/auth\/register\/parent/);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: "J'inscris mon enfant" })).toBeVisible();

		await page.locator('#classCode').fill(CLASS_CODE);
		await page.locator('#childFirstname').fill(CHILD_FIRSTNAME);
		await page.locator('input[name="password"]').fill(CHILD_PASSWORD);
		await page.locator('input[name="confirmPassword"]').fill(CHILD_PASSWORD);
		await page.locator('#parentEmail').fill(PARENT_EMAIL);
		await page.getByRole('checkbox').check();
		await page.getByRole('button', { name: 'Inscrire mon enfant' }).click();

		await expect(page.getByRole('heading', { name: 'Inscription réussie' })).toBeVisible();
		const shown = (await page.locator('p.font-mono').textContent())?.trim() ?? '';
		expect(shown).toMatch(/^verifsenfant\d+$/);
		loginId = shown;

		// Le courriel : identifiant + bouton « Donner mon consentement »
		const mail = await waitForEmail(PARENT_EMAIL, mailsBefore + 1);
		const html = await emailHtml(mail);
		expect(html).toContain(loginId);
		expect(await emailLink(mail, 'Donner mon consentement')).toMatch(/^\/consent\//);
		expect(await emailsTo(PARENT_EMAIL)).toHaveLength(mailsBefore + 1);

		const ids = await sql<{ student_id: string }>(
			'select student_id from parental_consents where parent_email = $1',
			[PARENT_EMAIL]
		);
		expect(ids).toHaveLength(1);
		childId = ids[0].student_id;
	});

	test('#1592 l’enfant se connecte avec l’identifiant (en MAJUSCULES) : tableau de bord en accès limité', async ({
		page
	}) => {
		expect(loginId).not.toBe('');
		await fillLogin(page, loginId.toUpperCase(), CHILD_PASSWORD);
		await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'));
		await expect(page).toHaveURL(/\/dashboard/);
		await page.waitForLoadState('networkidle');
		await page.screenshot({ path: '.captures/verifs/qr/connexion-enfant-avant-accord.png' });
		await page.goto('/dashboard/student/cours');
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Accès limité')).toBeVisible();
	});

	test('#1592 le lien du courriel : case « Je suis le parent… », bouton grisé tant qu’elle n’est pas cochée, puis l’enfant a l’accès complet', async ({
		page,
		browser
	}) => {
		const mail = await waitForEmail(PARENT_EMAIL, mailsBefore + 1);
		await page.goto(await emailLink(mail, 'Donner mon consentement'));
		await page.waitForLoadState('networkidle');
		const grant = page.getByRole('button', { name: "J'autorise l'accès" });
		await expect(grant).toBeDisabled();
		await page.getByRole('checkbox', { name: /Je suis le parent/ }).check();
		await expect(grant).toBeEnabled();
		await grant.click();
		await page.waitForURL(/\/consent\/success/);
		await expect(page.getByText('Consentement accordé avec succès')).toBeVisible();

		// Base : le consentement est accordé et le profil de l'enfant le porte
		const granted = await sql<{ status: string; consent_granted_at: string | null }>(
			`select pc.status, p.consent_granted_at from parental_consents pc
			 join profiles p on p.id = pc.student_id where pc.parent_email = $1`,
			[PARENT_EMAIL]
		);
		expect(granted.some((row) => row.status === 'granted')).toBe(true);
		expect(granted.every((row) => row.consent_granted_at !== null)).toBe(true);

		// L'enfant se reconnecte : plus de bandeau « Accès limité »
		const context = await browser.newContext();
		const childPage = await context.newPage();
		await fillLogin(childPage, loginId, CHILD_PASSWORD);
		await childPage.waitForURL((url) => !url.pathname.startsWith('/auth/login'));
		// Le bandeau vit sous /dashboard/student (ici /cours) : s'y rendre, sinon l'absence ne prouverait rien
		await childPage.goto('/dashboard/student/cours');
		await childPage.waitForLoadState('networkidle');
		await expect(childPage.getByRole('heading', { name: 'Mes cours' })).toBeVisible();
		await expect(childPage.getByText('Accès limité')).toHaveCount(0);
		await context.close();
	});
});
