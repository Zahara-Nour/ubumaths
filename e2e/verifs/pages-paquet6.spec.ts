import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { lore } from '../../src/lib/config/lore';
import { ADMIN, assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { gotoSettled, shoot } from './helpers/pages';

/**
 * Pages réservées du prof et de l'admin, vitrine publique, base LOCALE (tri des vérifications manuelles, paquet 6)
 * ================================================================================================================
 *
 * Reprend les lignes #2568 (lien vers les consentements), #2560 / #2562 (années et classes
 * côté admin), #2488 (sorties HTML du carnet Python), #2505 (images externes au cahier),
 * #2481 (carte « Le cahier de texte » de la vitrine) et #2564 (INP dans `error_logs`) de
 * `docs/wip/verifications-manuelles.md`. La ligne #2482 (accolades des modèles de message) est
 * sortie avec la page du prof, retirée (écarts E58 à E60).
 *
 * Vocabulaire : l'interface dit « Bataillon » (`lore.entities.class`), pas « classe » ; les
 * textes attendus viennent de `lore`, comme la page.
 *
 * Données : tout ce que ces tests créent (écoles, années, classes, élèves, carnet, séance)
 * porte le préfixe « Verifs6 pages <projet> <parallelIndex> » (ou, pour les
 * adresses, son équivalent sans espaces) et est effacé en `afterAll` par CE préfixe seulement.
 * Aucun élève existant n'est touché : les élèves sont créés ici, avec une adresse `@local.test`
 * ou `@eleves.chiph.re` inventée.
 *
 * Serveur de dev et base locale seulement : jamais contre la prod (`VERIFS_URL`), sauf la
 * vitrine publique (#2481), qui n'écrit rien.
 */

test.beforeAll(() => {
	if (process.env.VERIFS_URL === undefined) assertLocalServerEnv();
});

// Constantes

const PREFIX = 'Verifs6 pages';
const STUDENT_PASSWORD = 'local-eleve';
const TEACHER_ID = '11111111-1111-4111-8111-111111111111';
const LOCAL_ONLY = 'serveur de dev et base locale seulement';
/** Fournisseur d'images qui n'existe pas : si une requête partait, elle échouerait visiblement */
const EXTERNAL_IMAGE = 'https://images.exemple-verifs6.invalid/figure.png';

// Types

interface Tag {
	/** Préfixe des noms : « Verifs6 pages <projet> <parallelIndex> <clé> » */
	name: string;
	/** Le même, sans espaces ni majuscules, pour les adresses et identifiants */
	slug: string;
	/** Préfixe commun à toutes les clés du même processus (nettoyage) */
	prefix: string;
	prefixSlug: string;
}

interface Decor {
	tag: Tag;
	classId: string;
	className: string;
	child: { id: string; email: string; loginId: string; firstname: string };
	real: { id: string; email: string; firstname: string };
}

// Fonctions

function tagOf(testInfo: TestInfo, key: string): Tag {
	const project = testInfo.project.name;
	const index = testInfo.parallelIndex;
	const prefix = `${PREFIX} ${project} ${index} `;
	const prefixSlug = `verifs6${project.replace(/[^a-z0-9]/gi, '').toLowerCase()}${index}`;
	return {
		name: `${prefix}${key}`,
		slug: `${prefixSlug}${key}`,
		prefix,
		prefixSlug
	};
}

/** Un compte élève : `auth.users` (le trigger crée le profil) puis profil approuvé et nommé */
async function createStudent(options: {
	email: string;
	firstname: string;
	lastname: string;
	child: boolean;
}): Promise<string> {
	const appMetadata = options.child
		? { provider: 'email', providers: ['email'], child_account: true }
		: { provider: 'email', providers: ['email'] };
	const rows = await sql<{ id: string }>(
		`insert into auth.users (
			instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
			raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
			confirmation_token, recovery_token, email_change, email_change_token_new,
			email_change_token_current, reauthentication_token, is_sso_user, is_anonymous
		) values (
			'00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
			$1, crypt($2, gen_salt('bf')), now(), $3::jsonb, '{}'::jsonb, now(), now(),
			'', '', '', '', '', '', false, false
		) returning id`,
		[options.email, STUDENT_PASSWORD, JSON.stringify(appMetadata)]
	);
	const id = rows[0].id;
	await sql(
		`insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
		 values ($1, $2::uuid, $3::jsonb, 'email', now(), now(), now())`,
		[id, id, JSON.stringify({ sub: id, email: options.email, email_verified: true })]
	);
	await sql(
		`update public.profiles set status = 'approved', firstname = $2, lastname = $3 where id = $1`,
		[id, options.firstname, options.lastname]
	);
	return id;
}

/** Efface tout ce que ce processus a créé : par préfixe de nom et d'adresse seulement */
async function cleanup(tag: Tag): Promise<void> {
	await sql(`delete from public.python_notebooks where title like $1`, [`${tag.prefix}%`]);
	await sql(
		`delete from public.error_logs where user_id in (
			select id from public.profiles where email like $1 or email like $2)`,
		[`${tag.prefixSlug}%@local.test`, `${tag.prefixSlug}%@eleves.chiph.re`]
	);
	await sql(`delete from public.classes where name like $1`, [`${tag.prefix}%`]);
	await sql(`delete from public.schools where name like $1`, [`${tag.prefix}%`]);
	await sql(`delete from auth.users where email like $1 or email like $2`, [
		`${tag.prefixSlug}%@local.test`,
		`${tag.prefixSlug}%@eleves.chiph.re`
	]);
}

/** Une classe sans école, un enfant inscrit par son parent et un élève à adresse réelle */
async function createDecor(testInfo: TestInfo, key: string): Promise<Decor> {
	const tag = tagOf(testInfo, key);
	await cleanup(tag);
	const className = `${tag.name} classe`;
	const joinCode = `V6${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
	const classRows = await sql<{ id: string }>(
		`insert into public.classes (name, join_code, is_active) values ($1, $2, true) returning id`,
		[className, joinCode]
	);
	const classId = classRows[0].id;
	const loginId = `${tag.slug}enfant`;
	const childEmail = `${loginId}@eleves.chiph.re`;
	const realEmail = `${tag.slug}reel@local.test`;
	const childId = await createStudent({
		email: childEmail,
		firstname: `Verifsenfant${key}`,
		lastname: 'Paquetsix',
		child: true
	});
	const realId = await createStudent({
		email: realEmail,
		firstname: `Verifsreel${key}`,
		lastname: 'Paquetsix',
		child: false
	});
	await sql(
		`insert into public.class_members (class_id, student_id, status) values ($1, $2, 'active'), ($1, $3, 'active')`,
		[classId, childId, realId]
	);
	return {
		tag,
		classId,
		className,
		child: { id: childId, email: childEmail, loginId, firstname: `Verifsenfant${key}` },
		real: { id: realId, email: realEmail, firstname: `Verifsreel${key}` }
	};
}

/** Connexion, puis la redirection de l'appli finit avant la navigation suivante (sinon `ERR_ABORTED`) */
async function loginAs(page: Page, email: string, password: string): Promise<void> {
	await login(page, email, password);
	await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

/** Les annonces affichées à l'écran (svelte-sonner) */
function toasts(page: Page) {
	return page.locator('[data-sonner-toast]');
}

// ============================================================================
// #2568 — lien vers les consentements
// ============================================================================

test.describe(
	'#2568 — « Mes Bataillons » : lien vers les consentements parentaux',
	{ tag: '@bureau' },
	() => {
		test.skip(process.env.VERIFS_URL !== undefined, LOCAL_ONLY);
		test.describe.configure({ mode: 'serial' });
		let decor: Decor;

		test.beforeAll(async () => {
			const testInfo = test.info();
			decor = await createDecor(testInfo, 'consent');
		});
		test.afterAll(async () => {
			const testInfo = test.info();
			await cleanup(tagOf(testInfo, 'consent'));
		});

		/** La liste d'élèves du bataillon de test, ouverte par son onglet */
		async function openClassTab(page: Page): Promise<void> {
			await loginAs(page, TEACHER.email, TEACHER.password);
			await gotoSettled(page, '/dashboard/teacher/classes');
			await page.waitForLoadState('networkidle');
			await expect(
				page.getByRole('heading', { level: 1, name: `Mes ${lore.entities.class}s` })
			).toBeVisible();
			await page.getByRole('tab', { name: decor.className }).click();
		}

		test('#2568 — bouton « Consentements parentaux » en haut de « Mes Bataillons », qui ouvre la page des consentements', async ({
			page
		}, testInfo) => {
			await openClassTab(page);
			const button = page.getByRole('link', { name: 'Consentements parentaux' });
			await expect(button).toBeVisible();
			await expect(button).toHaveAttribute('href', '/dashboard/teacher/consent');
			// « en haut » : au niveau du titre, au-dessus des onglets de bataillons
			const buttonBox = await button.boundingBox();
			const tabBox = await page.getByRole('tab', { name: decor.className }).boundingBox();
			expect(buttonBox, 'bouton mesurable').not.toBeNull();
			expect(tabBox, 'onglet mesurable').not.toBeNull();
			expect(buttonBox!.y).toBeLessThan(tabBox!.y);
			await shoot(page, '2568-mes-bataillons', testInfo.project.name);
			await button.click();
			await page.waitForURL(/\/dashboard\/teacher\/consent$/);
			await expect(
				page.getByRole('heading', { level: 1, name: 'Consentement parental' })
			).toBeVisible();
		});

		test('#2568 — enfant inscrit par son parent : identifiant (pas l’adresse @eleves.chiph.re) et « Lien au parent » vers la même page ; élève à adresse réelle : « Envoyer email »', async ({
			page
		}) => {
			await openClassTab(page);
			const childRow = page
				.locator('div.divide-y > div')
				.filter({ hasText: decor.child.firstname });
			await expect(childRow).toHaveCount(1);
			await expect(childRow).toContainText(`Identifiant : ${decor.child.loginId}`);
			await expect(childRow).not.toContainText('@eleves.chiph.re');
			await expect(childRow.getByRole('link', { name: 'Envoyer email' })).toHaveCount(0);
			const parentLink = childRow.getByRole('link', { name: 'Lien au parent' });
			await expect(parentLink).toHaveAttribute('href', '/dashboard/teacher/consent');

			// L'élève à adresse réelle : son adresse et « Envoyer email » comme avant
			const realRow = page.locator('div.divide-y > div').filter({ hasText: decor.real.firstname });
			await expect(realRow).toHaveCount(1);
			await expect(realRow).toContainText(decor.real.email);
			await expect(realRow.getByRole('link', { name: 'Lien au parent' })).toHaveCount(0);
			await expect(realRow.getByRole('link', { name: 'Envoyer email' })).toHaveAttribute(
				'href',
				`/dashboard/teacher/welcome-email?student_id=${decor.real.id}`
			);

			await parentLink.click();
			await page.waitForURL(/\/dashboard\/teacher\/consent$/);
			await expect(
				page.getByRole('heading', { level: 1, name: 'Consentement parental' })
			).toBeVisible();
		});

		test('#2568 — dashboard/teacher/welcome-email?student_id=<enfant> renvoie vers les consentements ; pour un élève à adresse réelle, la page reste', async ({
			page
		}) => {
			await loginAs(page, TEACHER.email, TEACHER.password);
			await gotoSettled(page, `/dashboard/teacher/welcome-email?student_id=${decor.child.id}`);
			await page.waitForURL(/\/dashboard\/teacher\/consent$/);
			await expect(
				page.getByRole('heading', { level: 1, name: 'Consentement parental' })
			).toBeVisible();

			// Contre-épreuve : l'élève à adresse réelle garde la page de l'email de bienvenue
			await page.waitForLoadState('networkidle');
			await gotoSettled(page, `/dashboard/teacher/welcome-email?student_id=${decor.real.id}`);
			expect(new URL(page.url()).pathname).toBe('/dashboard/teacher/welcome-email');
		});
	}
);

// ============================================================================
// #2560 / #2562 — années et classes côté admin
// ============================================================================

test.describe('#2560 / #2562 — années et bataillons côté admin', { tag: '@bureau' }, () => {
	test.skip(process.env.VERIFS_URL !== undefined, LOCAL_ONLY);
	test.describe.configure({ mode: 'serial' });
	let tag: Tag;
	let schoolWithYear = '';
	let schoolWithoutYear = '';
	const YEAR_NAME = '2031-2032';

	test.beforeAll(async () => {
		const testInfo = test.info();
		tag = tagOf(testInfo, 'admin');
		await cleanup(tag);
		// École A : une année ACTIVE qui couvre aujourd'hui et se termine dans l'avenir
		const a = await sql<{ id: string }>(
			`insert into public.schools (name, city, country) values ($1, 'Villefictive', 'France') returning id`,
			[`${tag.name} école avec année`]
		);
		schoolWithYear = a[0].id;
		await sql(
			`insert into public.school_years (school_id, name, start_date, end_date, is_active)
			 values ($1, $2, current_date - interval '60 days', current_date + interval '300 days', true)`,
			[schoolWithYear, YEAR_NAME]
		);
		// École B : une année qui existe mais n'est pas active
		const b = await sql<{ id: string }>(
			`insert into public.schools (name, city, country) values ($1, 'Villefictive', 'France') returning id`,
			[`${tag.name} école sans année active`]
		);
		schoolWithoutYear = b[0].id;
		await sql(
			`insert into public.school_years (school_id, name, start_date, end_date, is_active)
			 values ($1, '2030-2031', current_date + interval '400 days', current_date + interval '700 days', false)`,
			[schoolWithoutYear]
		);
	});
	test.afterAll(async () => {
		const testInfo = test.info();
		await cleanup(tagOf(testInfo, 'admin'));
	});

	/** Crée un bataillon par le formulaire admin, dans l'école dont le nom est donné */
	async function createClassIn(page: Page, schoolName: string, className: string): Promise<void> {
		await gotoSettled(page, '/dashboard/admin/classes');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: `+ Ajouter une ${lore.entities.class}` }).click();
		await page.locator('#name').fill(className);
		// « École » : le premier sélecteur du formulaire (le niveau vient ensuite)
		const form = page.locator('form[action="?/create"]');
		await form.getByRole('combobox').first().click();
		await page.getByRole('option', { name: schoolName }).click();
		await form.getByRole('button', { name: 'Créer' }).click();
	}

	test('#2560 — année dont le nom existe déjà : « Une année « … » existe déjà pour cette école… », plus le message générique', async ({
		page
	}, testInfo) => {
		await loginAs(page, ADMIN.email, ADMIN.password);
		await gotoSettled(page, `/dashboard/admin/schools/${schoolWithYear}/organisation`);
		await page.waitForLoadState('networkidle');
		await expect(
			page.getByRole('heading', { level: 1, name: "Organisation de l'École" })
		).toBeVisible();
		const periodsTab = page.getByRole('tab', { name: /Périodes|Années/ });
		if (await periodsTab.count()) await periodsTab.first().click();
		await page.getByRole('button', { name: 'Créer', exact: true }).first().click();
		const dialog = page.locator('dialog[open]');
		await dialog.locator('#year-name').fill(YEAR_NAME);
		await dialog.locator('#year-start').fill('2031-09-01');
		await dialog.locator('#year-end').fill('2032-06-30');
		await dialog.getByRole('button', { name: lore.actions.save }).click();
		const expected = `Une année « ${YEAR_NAME} » existe déjà pour cette école. Modifiez-la ou activez-la plutôt que d'en créer une autre.`;
		await expect(toasts(page).filter({ hasText: expected })).toBeVisible();
		await expect(dialog.getByText(expected)).toBeVisible();
		await expect(page.getByText("Erreur lors de la création de l'année scolaire")).toHaveCount(0);
		await shoot(page, '2560-annee-existante', testInfo.project.name);
	});

	test('#2562 — bataillon créé dans une école à année active : un toast de succès seul, et il apparaît dans « Composer une classe »', async ({
		page
	}, testInfo) => {
		const className = `${tag.name} classe avec année`;
		await loginAs(page, ADMIN.email, ADMIN.password);
		await createClassIn(page, `${tag.name} école avec année`, className);
		await expect(
			toasts(page).filter({ hasText: `${lore.entities.class} créé avec succès` })
		).toBeVisible();
		// « seul » : aucun avertissement, même après un instant
		await page.waitForTimeout(1500);
		await expect(toasts(page)).toHaveCount(1);
		await expect(page.getByText('Aucune année active')).toHaveCount(0);
		await shoot(page, '2562-classe-avec-annee', testInfo.project.name);

		// Composer une classe : le bataillon est proposé comme destination, avec son année
		await gotoSettled(page, '/dashboard/admin/classes/composer');
		await page.waitForLoadState('networkidle');
		await expect(
			page.getByRole('heading', { level: 1, name: 'Composer une classe' })
		).toBeVisible();
		await page.getByRole('combobox').first().click();
		await expect(
			page.getByRole('option', {
				name: `${className} — ${tag.name} école avec année (${YEAR_NAME})`
			})
		).toBeVisible();
	});

	test('#2562 — bataillon créé dans une école sans année active : succès + « Aucune année active… », et il n’est pas proposé dans « Composer une classe »', async ({
		page
	}, testInfo) => {
		const className = `${tag.name} classe sans année`;
		await loginAs(page, ADMIN.email, ADMIN.password);
		await createClassIn(page, `${tag.name} école sans année active`, className);
		await expect(
			toasts(page).filter({ hasText: `${lore.entities.class} créé avec succès` })
		).toBeVisible();
		await expect(
			toasts(page).filter({
				hasText:
					"Aucune année active pour cette école : la classe n'est rattachée à aucune année. Activez l'année dans l'organisation de l'école."
			})
		).toBeVisible();
		await shoot(page, '2562-classe-sans-annee', testInfo.project.name);

		await gotoSettled(page, '/dashboard/admin/classes/composer');
		await page.waitForLoadState('networkidle');
		await page.getByRole('combobox').first().click();
		await expect(
			page.getByRole('option', { name: new RegExp(`^${tag.name} classe`) })
		).not.toHaveCount(0);
		await expect(page.getByRole('option', { name: new RegExp(className) })).toHaveCount(0);
	});
});

// ============================================================================
// #2488 — sorties HTML du carnet Python
// ============================================================================

test.describe('#2488 — carnet Python : sorties HTML', { tag: '@bureau' }, () => {
	test.skip(process.env.VERIFS_URL !== undefined, LOCAL_ONLY);
	test.describe.configure({ mode: 'serial' });
	let notebookId = '';

	test.beforeAll(async () => {
		const testInfo = test.info();
		const tag = tagOf(testInfo, 'carnet');
		await cleanup(tag);
		const display = (html: string) => ({
			output_type: 'display_data',
			data: { 'text/html': html }
		});
		const cells = [
			{
				id: 'cell-v6-html',
				type: 'code',
				state: 'idle',
				source: 'from IPython.display import HTML\nHTML("<p id=\'v6-riche\'>Du <b>gras</b></p>")',
				outputs: [
					display(
						'<div id="v6-riche"><p>Résultat avec <b>gras</b> et <i>italique</i>.</p><table><tr><td>cellule A</td><td>cellule B</td></tr></table></div>'
					)
				],
				execution_count: 1
			},
			{
				id: 'cell-v6-math',
				type: 'code',
				state: 'idle',
				source: 'HTML("<math-field>…</math-field>")',
				outputs: [
					display('<div id="v6-math"><p>avant <math-field>x^2+1</math-field> après</p></div>')
				],
				execution_count: 2
			}
		];
		const content = {
			cells,
			version: '1.0',
			metadata: {
				title: tag.name,
				created_at: '2026-11-24T00:00:00.000Z',
				updated_at: '2026-11-24T00:00:00.000Z',
				kernel_info: { name: 'python3', version: '3.x', language: 'python' }
			}
		};
		const rows = await sql<{ id: string }>(
			`insert into public.python_notebooks (title, content, author_id) values ($1, $2::jsonb, $3) returning id`,
			[`${tag.name} carnet`, JSON.stringify(content), TEACHER_ID]
		);
		notebookId = rows[0].id;
	});
	test.afterAll(async () => {
		const testInfo = test.info();
		await cleanup(tagOf(testInfo, 'carnet'));
	});

	test('#2488 — une sortie HTML s’affiche comme avant ; un <math-field> du HTML n’est plus rendu en formule, son texte reste', async ({
		page
	}, testInfo) => {
		await loginAs(page, TEACHER.email, TEACHER.password);
		await page.goto(`/python-notebook/${notebookId}`);
		await page.waitForLoadState('networkidle');

		// Le HTML ordinaire : gras, italique et tableau rendus (comme avant)
		// L'assainisseur retire les `id` : on repère les sorties par leur texte
		const rich = page.locator('div.bg-muted').filter({ hasText: 'Résultat avec' });
		await expect(rich).toBeVisible();
		await expect(rich.locator('b')).toHaveText('gras');
		await expect(rich.locator('i')).toHaveText('italique');
		await expect(rich.locator('table td')).toHaveText(['cellule A', 'cellule B']);

		// La balise MathLive : plus aucun élément <math-field> dans la sortie, le texte reste
		const math = page.locator('div.bg-muted').filter({ hasText: 'avant x^2+1' });
		await expect(math).toBeVisible();
		await expect(math.locator('math-field')).toHaveCount(0);
		await expect(math.locator('math-span, math-inline, math-display')).toHaveCount(0);
		await expect(math).toContainText('avant x^2+1 après');
		await shoot(page, '2488-sorties-html', testInfo.project.name);
	});
});

// ============================================================================
// #2505 — images externes au cahier de texte
// ============================================================================

test.describe('#2505 — cahier de texte : images externes', { tag: '@bureau' }, () => {
	test.skip(process.env.VERIFS_URL !== undefined, LOCAL_ONLY);
	test.describe.configure({ mode: 'serial' });
	let decor: Decor;
	let entryId = '';
	let token = '';

	/** L'adresse de la base locale, lue dans `.env.local` comme `assertLocalServerEnv` */
	function supabaseUrl(): string {
		const raw = readFileSync(resolve('.env.local'), 'utf8');
		const url = /^PUBLIC_SUPABASE_URL=(.*)$/m
			.exec(raw)?.[1]
			?.trim()
			.replace(/^["']|["']$/g, '');
		if (!url) throw new Error('PUBLIC_SUPABASE_URL absent de .env.local');
		return url;
	}

	test.beforeAll(async () => {
		const testInfo = test.info();
		decor = await createDecor(testInfo, 'cahier');
		const lesson = [
			'Séance avec deux figures.',
			`![Figure](${EXTERNAL_IMAGE})`,
			`![Schéma](${supabaseUrl()}/storage/v1/object/public/question-images/verifs6-schema.png)`
		].join('\n\n');
		const rows = await sql<{ id: string }>(
			`insert into public.class_journal_entries (class_id, entry_date, lesson_content, is_published)
			 values ($1, current_date - 1, $2, true) returning id`,
			[decor.classId, lesson]
		);
		entryId = rows[0].id;
		token = `V6${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
		await sql(
			`insert into public.class_journal_share_tokens (class_id, token, is_active, created_by)
			 values ($1, $2, true, $3)`,
			[decor.classId, token, TEACHER_ID]
		);
	});
	test.afterAll(async () => {
		const testInfo = test.info();
		await cleanup(tagOf(testInfo, 'cahier'));
	});

	/** Ce que dit la ligne, sur la page ouverte : lien « Image : Figure », image du projet affichée */
	async function expectExternalImageAsLink(page: Page, requested: string[]): Promise<void> {
		const link = page.getByRole('link', { name: 'Image : Figure' });
		await expect(link).toHaveCount(1);
		await expect(link).toHaveAttribute('href', EXTERNAL_IMAGE);
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', /noopener/);
		// Aucune balise <img> pour l'image externe, et aucune requête vers son hébergeur
		await expect(page.locator('img[alt="Figure"]')).toHaveCount(0);
		expect(requested, 'requêtes vers l’hébergeur externe').toEqual([]);
		// L'image déposée dans Chiphre reste une vraie image
		await expect(page.locator('img[alt="Schéma"]')).toHaveCount(1);
		await expect(page.getByRole('link', { name: 'Image : Schéma' })).toHaveCount(0);
	}

	function watchExternal(page: Page): string[] {
		const requested: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('exemple-verifs6.invalid')) requested.push(request.url());
		});
		return requested;
	}

	test('#2505 — page élève : image externe en lien « Image : Figure », image déposée dans Chiphre affichée', async ({
		page
	}, testInfo) => {
		const requested = watchExternal(page);
		await loginAs(page, decor.real.email, STUDENT_PASSWORD);
		await page.goto(`/dashboard/student/cahier-texte/${entryId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Séance avec deux figures.')).toBeVisible();
		await expectExternalImageAsLink(page, requested);
		await shoot(page, '2505-page-eleve', testInfo.project.name);
	});

	test('#2505 — lien public /cahier/<jeton> (sans compte) : même rendu', async ({
		page
	}, testInfo) => {
		const requested = watchExternal(page);
		await page.goto(`/cahier/${token}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Séance avec deux figures.')).toBeVisible();
		await expectExternalImageAsLink(page, requested);
		await shoot(page, '2505-lien-public', testInfo.project.name);
	});
});

// ============================================================================
// #2481 — carte « Le cahier de texte » de la vitrine /demo/editeur
// ============================================================================

test.describe('#2481 — vitrine /demo/editeur : carte « Le cahier de texte »', () => {
	test('#2481 — une formule \\sqrt{\\frac{1}{2}} écrite par Σ s’affiche entière dans les trois cartes, et le texte qui la suit aussi', async ({
		page
	}, testInfo) => {
		await page.goto('/demo/editeur');
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Le cahier de texte', { exact: true })).toBeVisible();
		const editor = page.locator('.tiptap, [contenteditable="true"]').first();
		await editor.click();
		await page.keyboard.press('ControlOrMeta+a');
		await page.keyboard.press('Backspace');
		// La phrase de départ (avec sa formule « x=4 ») est bien effacée avant d'écrire la nôtre
		await expect(editor.locator('math-field')).toHaveCount(0);
		await page.keyboard.type('Pour ');
		// Σ (bouton « Formule »), puis « $$ » : une formule dans le texte
		await page.getByRole('button', { name: 'Formule', exact: true }).click();
		await page.getByRole('button', { name: '$$', exact: true }).click();
		await expect(editor.locator('math-field')).toHaveCount(1);
		const field = editor.locator('math-field');
		// √ puis la fraction 1/2 : MathLive écrit \sqrt{\frac12}, la même formule que \sqrt{\frac{1}{2}}.
		// Touche par touche : le champ doit avoir le clavier avant chacune, sinon elle se perd dans le texte
		for (const key of ['s', 'q', 'r', 't', '1', '/', '2']) {
			await expect
				.poll(
					async () => {
						if ((await page.evaluate(() => document.activeElement?.tagName)) !== 'MATH-FIELD') {
							await field.focus();
						}
						return page.evaluate(() => document.activeElement?.tagName);
					},
					{ message: `clavier dans la formule avant « ${key} »` }
				)
				.toBe('MATH-FIELD');
			await page.keyboard.press(key);
			await page.waitForTimeout(120);
		}
		await expect
			.poll(() => field.evaluate((el) => (el as unknown as { value: string }).value))
			.toBe('\\sqrt{\\frac12}');
		// Sortie de la formule par les flèches, puis le texte qui la suit
		for (let i = 0; i < 6; i++) {
			if ((await page.evaluate(() => document.activeElement?.tagName)) !== 'MATH-FIELD') break;
			await page.keyboard.press('ArrowRight');
		}
		await page.keyboard.type(' et la suite', { delay: 40 });

		for (const id of ['usage-message', 'usage-cahier', 'usage-enonce']) {
			const card = page.getByTestId(id);
			await card.scrollIntoViewIfNeeded();
			await expect(card, id).toContainText('Pour');
			await expect(card, `${id} : le texte qui suit la formule`).toContainText('et la suite');
			const formula = card.locator('math-span').first();
			// Formule rendue (boîte non vide) et entière : une racine qui contient une fraction
			await expect
				.poll(() => formula.evaluate((el) => el.getBoundingClientRect().width), {
					message: `${id} : formule rendue`
				})
				.toBeGreaterThan(0);
			expect(
				await formula.evaluate((el) => el.shadowRoot?.querySelector('math msqrt mfrac') !== null),
				`${id} : racine contenant une fraction`
			).toBe(true);
		}
		// Le cahier de texte est rendu par le vrai composant `JournalContent` (paragraphes de la carte)
		await expect(page.getByTestId('usage-cahier').locator('.markdown-content')).toHaveCount(1);
		await page.getByTestId('usage-cahier').scrollIntoViewIfNeeded();
		await shoot(page, '2481-carte-cahier', testInfo.project.name);
	});
});

// ============================================================================
// #2564 — INP dans error_logs
// ============================================================================

test.describe('#2564 — INP : interaction lente relevée dans error_logs', { tag: '@bureau' }, () => {
	test.skip(process.env.VERIFS_URL !== undefined, LOCAL_ONLY);
	test.describe.configure({ mode: 'serial' });
	let decor: Decor;

	test.beforeAll(async () => {
		const testInfo = test.info();
		decor = await createDecor(testInfo, 'inp');
	});
	test.afterAll(async () => {
		const testInfo = test.info();
		await cleanup(tagOf(testInfo, 'inp'));
	});

	test('#2564 — un clic de 400 ms : « Web Vital INP » porte l’adresse de la page du clic (même après un changement de page), event_name et target, jamais de nom d’élève', async ({
		page,
		browserName
	}) => {
		test.skip(browserName !== 'chromium', "l'API Event Timing de l'INP est celle de Chromium");
		test.setTimeout(90_000);
		await loginAs(page, decor.real.email, STUDENT_PASSWORD);
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');
		const clickPage = page.url();
		const studentLabel = `Sélectionner l’élève ${decor.real.firstname} Paquetsix`;

		// Un bouton lent, dont le texte et le libellé portent le nom de l'élève de test
		await page.evaluate((label) => {
			const button = document.createElement('button');
			button.id = 'verifs6-lent';
			button.type = 'button';
			button.textContent = label;
			button.setAttribute('aria-label', label);
			button.style.cssText = 'position:fixed;top:90px;left:20px;z-index:99999;padding:8px';
			button.addEventListener('click', () => {
				const start = performance.now();
				while (performance.now() - start < 400) {
					// Attente active : l'interaction dure plus de 200 ms
				}
			});
			document.body.append(button);
		}, studentLabel);
		await page.locator('#verifs6-lent').click();

		// Changement de page DANS l'appli : un vrai lien interne (SvelteKit le prend en charge sans
		// rechargement), cliqué à la souris ; puis passage en arrière-plan
		await page.evaluate(() => {
			const link = document.createElement('a');
			link.id = 'verifs6-lien';
			link.href = '/automaths';
			link.textContent = 'Aller aux automaths';
			link.style.cssText = 'position:fixed;top:140px;left:20px;z-index:99999;padding:8px';
			document.body.append(link);
		});
		await page.locator('#verifs6-lien').click();
		await page.waitForURL((url) => url.pathname === '/automaths');
		expect(page.url()).not.toBe(clickPage);
		await page.evaluate(() => {
			Object.defineProperty(document, 'visibilityState', {
				configurable: true,
				get: () => 'hidden'
			});
			document.dispatchEvent(new Event('visibilitychange'));
		});

		// L'envoi par lot part après 10 s au plus
		await expect
			.poll(
				async () =>
					(
						await sql(
							`select 1 from public.error_logs where user_id = $1 and message like 'Web Vital INP%'`,
							[decor.real.id]
						)
					).length,
				{ timeout: 30_000, message: 'ligne « Web Vital INP » dans error_logs' }
			)
			.toBeGreaterThan(0);
		const rows = await sql<{
			message: string;
			url: string;
			context: { metric: string; value: number; event_name?: string; target?: string };
		}>(
			`select message, url, context from public.error_logs where user_id = $1 and message like 'Web Vital INP%'`,
			[decor.real.id]
		);
		expect(rows).toHaveLength(1);
		const row = rows[0];
		expect(row.context.metric).toBe('INP');
		expect(row.context.value).toBeGreaterThan(200);
		// L'adresse est celle de la page du clic, pas celle où l'on était à l'envoi
		expect(row.url).toBe(clickPage);
		expect(row.url).not.toBe(page.url());
		expect(row.context.event_name).toMatch(/^(click|pointerdown|pointerup|mousedown|mouseup)$/);
		expect(row.context.target).toBe('button#verifs6-lent');
		// Jamais de nom d'élève ni de texte saisi, nulle part dans la ligne
		const everything = JSON.stringify(row);
		expect(everything).not.toContain(decor.real.firstname);
		expect(everything).not.toContain('Paquetsix');
		expect(everything).not.toContain('Sélectionner');
	});
});
