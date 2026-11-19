import { mkdir } from 'node:fs/promises';
import { expect, test, type Browser, type Page } from '@playwright/test';
import {
	ADMIN,
	assertLocalServerEnv,
	carnetSkipReason,
	emailLink,
	emailHtml,
	emailsTo,
	emailText,
	login,
	loginStudent,
	PHONE,
	prepareCarnetDecor,
	shootEmail,
	shootPage,
	SHOTS_DIR,
	sql,
	TEACHER,
	waitForEmail,
	type CarnetDecor,
	type CarnetStudent
} from './helpers/carnet';

/**
 * Carnet de liaison — les vérifications manuelles, sur la base locale
 * ===================================================================
 *
 * Reprend les lignes #2731 (professeur et courriels), #2724 (élève et page du
 * parent) et #2736/#2737 (passage quotidien, courriel d'exception) de
 * `docs/wip/verifications-manuelles.md`. Les courriels ne partent pas : le
 * serveur de dev les capture (`.captures/courriels/`), le test suit leurs liens.
 *
 * Les trois tests s'enchaînent (même décor, posé une fois) :
 *
 *   pnpm test:verifs carnet
 *
 * Captures d'écran à largeur téléphone, clair et sombre : `.captures/verifs/carnet/`.
 * Ce qu'elles montrent (lisibilité, barres discrètes) reste à l'œil de David.
 */

test.describe.configure({ mode: 'serial' });

let decor: CarnetDecor;

/** Une page sans compte : celle d'un parent qui suit le lien de son courriel. */
async function parentPage(browser: Browser): Promise<Page> {
	const context = await browser.newContext();
	return context.newPage();
}

function studentRow(page: Page, student: CarnetStudent) {
	return page
		.getByTestId('carnet-eleve')
		.filter({ hasText: `${student.firstname} ${student.lastname}` });
}

function carnetUrl(): string {
	return `/dashboard/teacher/classes/${decor.classId}/carnet`;
}

/**
 * Cases de la régularité de A : une par semaine depuis la plus tardive de la
 * rentrée (année active du décor) et de son arrivée (décor : il y a 30 jours),
 * semaine en cours comprise. Lu dans le décor : en septembre, la rentrée est
 * plus récente que l'arrivée.
 */
async function weeksSinceArrival(): Promise<number> {
	const rows = await sql<{ n: number }>(
		`with jour as (select (now() at time zone 'Europe/Paris')::date as d)
		 select ((date_trunc('week', jour.d)::date
		   - date_trunc('week', greatest(sy.start_date, (cm.joined_at at time zone 'Europe/Paris')::date))::date)
		   / 7 + 1)::int as n
		 from jour, class_members cm
		 join classes c on c.id = cm.class_id
		 join school_years sy on sy.school_id = c.school_id and sy.is_active
		 where cm.class_id = $1 and cm.student_id = $2 and sy.start_date <= jour.d
		 order by sy.start_date desc
		 limit 1`,
		[decor.classId, decor.a.id]
	);
	return rows[0].n;
}

/** Le texte d'un courriel ne porte que le prénom de l'élève, jamais son nom. */
async function expectFirstnameOnly(
	email: Awaited<ReturnType<typeof waitForEmail>>,
	s: CarnetStudent
) {
	const text = await emailText(email);
	const html = await emailHtml(email);
	expect(email.subject).toContain(s.firstname);
	expect(text).toContain(s.firstname);
	expect(html).toContain(s.firstname);
	expect(`${email.subject}\n${text}\n${html}`).not.toContain(s.lastname);
}

test.beforeAll(async () => {
	const skip = carnetSkipReason();
	if (skip) return;
	assertLocalServerEnv();
	await mkdir(SHOTS_DIR, { recursive: true });
	decor = await prepareCarnetDecor();
});

test.beforeEach(() => {
	const skip = carnetSkipReason();
	test.skip(skip !== null, skip ?? '');
});

test('#2731 carnet, côté professeur et courriels', async ({ page, browser }) => {
	test.setTimeout(240_000);
	const { a, b, parents } = decor;
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(carnetUrl());

	// Avant d'activer : le nombre de courriels annoncé (un consentement accordé, celui de A).
	await expect(page.getByTestId('carnet-annonce')).toHaveText('Activer enverra 1 courriel.');
	await page.getByRole('button', { name: 'Activer le carnet de la classe' }).click();
	await expect(page.getByText('Activé', { exact: true })).toBeVisible();
	const linkA = await waitForEmail(parents.a);
	expect(linkA.subject).toBe(`Le carnet de liaison de ${a.firstname}`);

	// Une case décochée et enregistrée reste décochée.
	const evaluationBox = page.getByRole('checkbox', {
		name: "Une évaluation n'est pas faite à son échéance"
	});
	await expect(evaluationBox).toBeChecked();
	await evaluationBox.click();
	await page.getByRole('button', { name: 'Enregistrer les réglages' }).click();
	await expect(page.getByText('Réglages enregistrés.')).toBeVisible();
	await page.reload();
	await expect(evaluationBox).not.toBeChecked();
	// Remise en place pour la suite.
	await evaluationBox.click();
	await page.getByRole('button', { name: 'Enregistrer les réglages' }).click();
	await expect(page.getByText('Réglages enregistrés.').last()).toBeVisible();
	await page.waitForLoadState('networkidle');
	await page.reload();
	await expect(evaluationBox).toBeChecked();

	// Le prof ajoute l'adresse d'un parent de B : courriel de confirmation.
	const rowB = studentRow(page, b);
	await rowB.getByPlaceholder("Adresse d'un parent").fill(parents.b);
	await rowB.getByRole('button', { name: 'Envoyer la confirmation' }).click();
	await expect(rowB.getByText('En attente de confirmation (1/3 envois)')).toBeVisible();
	const confirmB = await waitForEmail(parents.b);
	expect(confirmB.subject).toBe(`Carnet de liaison de ${b.firstname} : confirmez votre adresse`);
	await expectFirstnameOnly(confirmB, b);
	expect(await emailText(confirmB)).toContain('Prof Local');

	// Le parent confirme : page « lien envoyé », puis le courriel du lien.
	const parent = await parentPage(browser);
	await shootEmail(parent, confirmB, '2731-courriel-confirmation');
	await parent.goto(await emailLink(confirmB, 'Confirmer mon adresse'));
	await expect(parent.getByRole('button', { name: 'Confirmer mon adresse' })).toBeVisible();
	await expect(
		parent.getByRole('button', { name: 'Je ne suis pas le parent de cet élève' })
	).toBeVisible();
	await shootPage(parent, '2724-confirmer');
	await parent.getByRole('button', { name: 'Confirmer mon adresse' }).click();
	await expect(
		parent.getByText('Le lien de votre carnet vient de vous être envoyé', { exact: false })
	).toBeVisible();
	const linkB = await waitForEmail(parents.b, 2);
	expect(linkB.subject).toBe(`Le carnet de liaison de ${b.firstname}`);
	await expectFirstnameOnly(linkB, b);
	await shootEmail(parent, linkB, '2731-courriel-lien');
	const carnetB = await emailLink(linkB, 'Ouvrir le carnet');
	await parent.goto(carnetB);
	await expect(parent.getByText(`Le travail de ${b.firstname} sur Chiphre.`)).toBeVisible();

	// Côté prof : « carnet ouvert le … ».
	await page.reload();
	await expect(rowB.getByText(/Confirmée · carnet ouvert le/)).toBeVisible();

	// Retirer l'adresse : l'ancien lien n'est plus valide, « lien perdu » n'envoie rien.
	await rowB.getByRole('button', { name: 'Retirer cette adresse' }).click();
	await expect(rowB.getByText(/Retirée par vous/)).toBeVisible();
	await parent.goto(carnetB);
	await expect(parent.getByText("Ce lien n'est plus valide.", { exact: false })).toBeVisible();
	await parent.goto('/carnet/lien-perdu');
	await parent.getByLabel('Votre adresse').fill(parents.b);
	await parent.getByRole('button', { name: 'Recevoir un nouveau lien' }).click();
	await expect(
		parent.getByText('Si cette adresse reçoit un carnet de liaison', { exact: false })
	).toBeVisible();
	await page.waitForTimeout(3_000);
	expect(await emailsTo(parents.b)).toHaveLength(2);

	// La ressaisir : nouvelle confirmation.
	await rowB.getByPlaceholder("Adresse d'un parent").fill(parents.b);
	await rowB.getByRole('button', { name: 'Envoyer la confirmation' }).click();
	const reconfirmB = await waitForEmail(parents.b, 3);
	expect(reconfirmB.subject).toBe(`Carnet de liaison de ${b.firstname} : confirmez votre adresse`);
	await parent.context().close();
});

test('#2724 carnet, côté élève et page du parent', async ({ page, browser }) => {
	test.setTimeout(180_000);
	const { a, c, parents } = decor;

	// A : un parent confirmé (consentement), le lien est parti à l'activation.
	await loginStudent(page, a);
	await page.goto('/dashboard');
	await page.getByRole('link', { name: 'Carnet de liaison' }).first().click();
	await expect(page).toHaveURL(/\/dashboard\/student\/carnet$/);
	await expect(page.getByTestId('carnet-partage')).toHaveText(
		'Tes parents voient cette page. Ils ne voient ni tes notes, ni tes messages.'
	);
	await expect(page.getByText('Envoi du lien du carnet')).toBeVisible();
	await shootPage(page, '2724-eleve');

	// La page du parent de A : une case par semaine, évaluations sans note, courriels arrêtés puis repris.
	const parent = await parentPage(browser);
	const linkA = (await emailsTo(parents.a))[0];
	await parent.goto(await emailLink(linkA, 'Ouvrir le carnet'));
	await expect(parent.getByText(`Le travail de ${a.firstname} sur Chiphre.`)).toBeVisible();
	await expect(parent.locator('[data-cell]')).toHaveCount(await weeksSinceArrival());
	await expect(parent.getByText(/\d+([,.]\d+)?\s*\/\s*20/)).toHaveCount(0);
	await shootPage(parent, '2724-parent');
	await parent.getByRole('button', { name: 'Ne plus recevoir ces courriels' }).click();
	await expect(parent.getByText('Vous ne recevez plus de courriels.')).toBeVisible();
	await parent.getByRole('button', { name: 'Recevoir à nouveau les courriels' }).click();
	await expect(
		parent.getByRole('button', { name: 'Ne plus recevoir ces courriels' })
	).toBeVisible();
	await parent.context().close();

	// C ajoute l'adresse de son parent : confirmation partie ; la même encore : message neutre.
	await page.context().clearCookies();
	await loginStudent(page, c);
	await page.goto('/dashboard/student/carnet');
	await expect(page.getByTestId('carnet-partage')).toHaveText(
		'Aucun parent ne reçoit encore ton carnet.'
	);
	await page.getByLabel('Adresse de ton parent').fill(parents.c);
	await page.getByRole('button', { name: 'Envoyer la confirmation' }).click();
	await expect(page.locator('p[role="status"]')).toHaveText(
		'Un courriel de confirmation est parti. Le lien du carnet suivra quand ton parent aura confirmé.'
	);
	const confirmC = await waitForEmail(parents.c);
	expect(confirmC.subject).toBe(`Carnet de liaison de ${c.firstname} : confirmez votre adresse`);
	await page.getByLabel('Adresse de ton parent').fill(parents.c);
	await page.getByRole('button', { name: 'Envoyer la confirmation' }).click();
	await expect(page.locator('p[role="alert"]')).toHaveText(
		'Cette adresse ne peut pas être ajoutée. Si ton parent ne reçoit rien, parles-en à ton professeur.'
	);
	await page.waitForTimeout(3_000);
	expect(await emailsTo(parents.c)).toHaveLength(1);

	// Partage coupé par le prof : C le lit sur sa page.
	await page.context().clearCookies();
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(carnetUrl());
	await studentRow(page, c).getByRole('button', { name: 'Couper le partage' }).click();
	await expect(studentRow(page, c).getByText('Partage coupé', { exact: false })).toBeVisible();
	await page.context().clearCookies();
	await loginStudent(page, c);
	await page.goto('/dashboard/student/carnet');
	await expect(page.getByTestId('carnet-partage')).toHaveText(
		'Le partage avec tes parents est arrêté.'
	);
	// Rétabli pour laisser la classe comme avant.
	await page.context().clearCookies();
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(carnetUrl());
	await studentRow(page, c).getByRole('button', { name: 'Rétablir le partage' }).click();
	await expect(
		studentRow(page, c).getByRole('button', { name: 'Couper le partage' })
	).toBeVisible();
});

test('#2736 #2737 passage quotidien, courriel d’exception', async ({ page, browser }) => {
	test.setTimeout(240_000);
	const { a, parents } = decor;
	const trigger = () =>
		page.request.post('/api/admin/cron/trigger', {
			data: { job_path: '/api/cron/carnet-de-liaison', confirm: 'LANCER' }
		});

	// L'admin lance la tâche : A, sans travail depuis 30 jours, déclenche un courriel.
	await login(page, ADMIN.email, ADMIN.password);
	const [{ now: before }] = await sql<{ now: Date }>('select now()');
	const first = await trigger();
	expect(first.status(), await first.text()).toBe(200);
	const alert = await waitForEmail(parents.a, 2);
	expect(alert.subject).toBe(`Carnet de liaison de ${a.firstname} : un point d'attention`);
	await expectFirstnameOnly(alert, a);
	expect(await emailText(alert)).not.toMatch(/\/\s*20\b/);

	const parent = await parentPage(browser);
	await shootEmail(parent, alert, '2736-courriel-exception');
	await parent.goto(await emailLink(alert, 'Ouvrir le carnet'));
	await expect(parent.getByText(`Le travail de ${a.firstname} sur Chiphre.`)).toBeVisible();
	const stop = await emailLink(alert, 'Ne plus recevoir ces courriels');
	expect(stop).toMatch(/#courriels$/);
	await parent.setViewportSize(PHONE);
	await parent.goto(stop);
	await expect(
		parent.getByRole('button', { name: 'Ne plus recevoir ces courriels' })
	).toBeInViewport();
	await parent.context().close();

	// Journal de CE passage : des nombres seulement, aucune adresse.
	const runsSince = (since: Date) =>
		sql<{ id: string; status: string; metadata: unknown }>(
			`select id, status, metadata from background_job_runs
			 where job_name = 'carnet_de_liaison' and started_at >= $1 order by started_at`,
			[since]
		);
	await expect.poll(async () => (await runsSince(before)).length).toBe(1);
	const [run] = await runsSince(before);
	expect(run.status).toBe('success');
	expect(run.metadata).toBeInstanceOf(Object);
	expect(Object.keys(run.metadata as object).length).toBeGreaterThan(0);
	const leaves: unknown[] = [];
	const walk = (v: unknown) =>
		v !== null && typeof v === 'object' ? Object.values(v).forEach(walk) : leaves.push(v);
	walk(run.metadata);
	expect(leaves.every((v) => typeof v === 'number' || typeof v === 'boolean')).toBe(true);
	expect(JSON.stringify(run.metadata)).not.toContain('@');

	// Relancer le même jour (la limite du bouton est d'un lancement par minute) :
	// le passage tourne, et rien de neuf ne part.
	await page.waitForTimeout(61_000);
	const [{ now: beforeSecond }] = await sql<{ now: Date }>('select now()');
	const second = await trigger();
	expect(second.status(), await second.text()).toBe(200);
	await expect
		.poll(async () => (await runsSince(beforeSecond)).map((r) => r.status))
		.toEqual(['success']);
	expect(await emailsTo(parents.a)).toHaveLength(2);

	// Côté élève : le courriel est dans la liste.
	await page.context().clearCookies();
	await loginStudent(page, a);
	await page.goto('/dashboard/student/carnet');
	await expect(page.getByText('Alerte : pas de travail depuis longtemps')).toBeVisible();
});
