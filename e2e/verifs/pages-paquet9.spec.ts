import { expect, test, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { GRADES } from '../../src/lib/types/grades';
import { buildSeriesLink } from '../../src/lib/validation/series';
import { ADMIN, assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { TEACHER_ID } from './helpers/fiches';
import { collectErrors, expectNoHorizontalOverflow, gotoSettled, shoot } from './helpers/pages';
import { acquireLock, LOCK_WAIT_MAX_MS, refreshLock, releaseLock } from './helpers/verrou';

/**
 * Pages diverses — paquet 9 du tri (#2949, #2948, #2971, #2978, #2976, #2914)
 * ===========================================================================
 *
 * Reprend ces lignes de `docs/wip/verifications-manuelles.md`. Les pages publiques (#2971,
 * #2978) se jouent aussi contre la prod en lecture (`VERIFS_URL=https://chiph.re`) ; le reste
 * (comptes, base) se saute alors.
 *
 * Ce que les tests écrivent en base LOCALE, et remettent en fin de test :
 * - liens de consultation du cahier de texte (photographie des liens d'avant, reprise sur disque) ;
 * - 22 modèles de mise en page « Verifs9 <projet> … » du prof (et leurs styles) ;
 * - le verdict de relecture d'un modèle de série (photographie de la ligne d'avant, remise telle quelle) ;
 * - le mot de passe d'`eleve10` n'est jamais changé (mot de passe actuel FAUX seulement).
 *
 * ⚠️ Ne se lance PAS sur deux projets à la fois : les tests de verdict (#2948) visent tous la même
 * série et la même ligne de relecture (un seul fichier de reprise, `pages-paquet9-verdict.json`).
 * Un lancement à la fois, un projet après l'autre.
 *
 * Non joué : voir le test #2976 (en local, rien n'est envoyé ni écrit, par décision écrite).
 */

// Constantes

const LOCAL = process.env.VERIFS_URL === undefined;
const STUDENT_LOCK = 'eleves-10-15';
const CAHIER_LOCK = 'verifs9-cahier-liens';
const STUDENT = { email: 'eleve10@local.test', password: 'local-eleve' };
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1100, height: 900 };
const SHOTS = 'pages9';
const WEEK = '2026-10-12';

// Fonctions

const projectName = (): string => test.info().project.name;
const parallelIndex = (): number => test.info().parallelIndex;
const tag = (): string => `Verifs9 ${projectName()}`;

/** Se connecte par le formulaire d'e-mail */
async function signIn(page: Page, account: { email: string; password: string }): Promise<void> {
	await login(page, account.email, account.password);
	await page.waitForLoadState('networkidle');
}

// ============================================================================
// #2949 — formulaires qui gardent l'adresse
// ============================================================================

interface Reprise {
	classId: string;
	tokensBefore: string[];
}
const reprisePath = (project: string): string =>
	`.captures/verifs/pages-paquet9-reprise-${project}.json`;

async function removeCreatedTokens(reprise: Reprise): Promise<void> {
	const rows = await sql<{ id: string }>(
		`select id from class_journal_share_tokens where class_id = $1`,
		[reprise.classId]
	);
	const created = rows.map((row) => row.id).filter((id) => !reprise.tokensBefore.includes(id));
	if (created.length > 0) {
		await sql(`delete from class_journal_share_tokens where id = any($1::uuid[])`, [created]);
	}
}

/** Restes d'un passage interrompu : liens du cahier de texte */
async function sweepTokens(project: string): Promise<void> {
	const path = reprisePath(project);
	if (existsSync(path)) {
		await removeCreatedTokens(JSON.parse(readFileSync(path, 'utf8')) as Reprise);
		rmSync(path, { force: true });
	}
}

/** Restes d'un passage interrompu : modèles de mise en page « Verifs9 <projet> » du prof */
async function sweepTemplates(project: string): Promise<void> {
	await sql(`delete from worksheet_templates where created_by = $1 and name like $2`, [
		TEACHER_ID,
		`Verifs9 ${project} %`
	]);
	await sql(`delete from worksheet_styles where owner_id = $1 and name like $2`, [
		TEACHER_ID,
		`Verifs9 ${project} %`
	]);
}

test.describe('#2949 — le lien du cahier de texte garde la classe et la semaine', () => {
	test.skip(!LOCAL, 'serveur de dev et base locale seulement');
	test.use({ viewport: DESKTOP });
	let classId: string | null = null;
	let tokensBefore: string[] = [];

	test.beforeAll(async () => {
		test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
		assertLocalServerEnv();
		await acquireLock(CAHIER_LOCK);
		await sweepTokens(projectName());
	});
	test.afterAll(() => releaseLock(CAHIER_LOCK));
	test.beforeEach(() => {
		test.setTimeout(240_000);
		refreshLock(CAHIER_LOCK);
	});
	test.afterEach(async () => {
		if (classId) {
			await removeCreatedTokens({ classId, tokensBefore });
			rmSync(reprisePath(projectName()), { force: true });
		}
	});

	test('#2949 — classe et semaine choisies : « Créer le lien », « Renouveler », « Révoquer » restent sur la même classe et la même semaine', async ({
		page
	}) => {
		const rows = await sql<{ id: string; name: string }>(
			`select c.id, c.name from classes c
			 where c.is_active
			   and not exists (select 1 from class_journal_share_tokens t
			     where t.class_id = c.id and t.is_active and (t.expires_at is null or t.expires_at > now()))
			 order by c.name limit 1`
		);
		expect(rows, 'une classe du prof sans lien actif').toHaveLength(1);
		classId = rows[0].id;
		tokensBefore = (
			await sql<{ id: string }>(`select id from class_journal_share_tokens where class_id = $1`, [
				classId
			])
		).map((row) => row.id);
		const path = reprisePath(projectName());
		mkdirSync('.captures/verifs', { recursive: true });
		writeFileSync(`${path}.tmp`, JSON.stringify({ classId, tokensBefore } satisfies Reprise));
		renameSync(`${path}.tmp`, path);

		await signIn(page, TEACHER);
		const address = `/dashboard/teacher/cahier-texte?class=${classId}&week=${WEEK}`;
		const expectSame = async (step: string) => {
			const url = new URL(page.url());
			expect(url.pathname, `${step} : page`).toBe('/dashboard/teacher/cahier-texte');
			expect(url.searchParams.get('class'), `${step} : classe (adresse ${page.url()})`).toBe(
				classId
			);
			expect(url.searchParams.get('week'), `${step} : semaine`).toBe(WEEK);
			// Le rendu : la semaine affichée est celle du 12 au 18 octobre, de la même classe
			await expect(
				page.getByRole('heading', { level: 2, name: /^12 - 18 oct/ }),
				step
			).toBeVisible();
			await expect(page.getByText(rows[0].name).first(), `${step} : classe affichée`).toBeVisible();
			// Aucun rechargement complet : la page n'a pas été remplacée par la réponse de l'action
			expect(
				await page.evaluate(
					() => (window as unknown as { __memeDocument?: boolean }).__memeDocument
				),
				`${step} : même document`
			).toBe(true);
		};
		// Un clic avant l'hydratation de la page est un envoi natif du formulaire (adresse `?/shareLink`),
		// pas le geste de l'élève : on le détecte à la perte du marqueur et on recommence
		let created = false;
		for (let attempt = 1; attempt <= 3 && !created; attempt++) {
			await gotoSettled(page, address);
			await page.waitForTimeout(2000 * attempt);
			await page.evaluate(() => {
				(window as unknown as { __memeDocument: boolean }).__memeDocument = true;
			});
			await expect(page.getByText(/Aucun lien actif/)).toBeVisible();
			await page.getByRole('button', { name: 'Créer le lien' }).click();
			await expect(page.getByText(/Expire le/)).toBeVisible({ timeout: 15_000 });
			const marker = await page.evaluate(
				() => (window as unknown as { __memeDocument?: boolean }).__memeDocument === true
			);
			if (marker) {
				created = true;
			} else {
				await removeCreatedTokens({ classId, tokensBefore });
			}
		}
		expect(created, 'le formulaire s’est envoyé après hydratation').toBe(true);
		await expectSame('après « Créer le lien »');

		await page.getByRole('button', { name: 'Renouveler' }).click();
		await expect
			.poll(
				async () =>
					(
						await sql<{ id: string }>(
							`select id from class_journal_share_tokens where class_id = $1 and is_active`,
							[classId]
						)
					).filter((row) => !tokensBefore.includes(row.id)).length,
				{ timeout: 15_000 }
			)
			.toBeGreaterThan(0);
		await expect(page.getByText(/Expire le/)).toBeVisible();
		await expectSame('après « Renouveler »');
		await shoot(page, `${SHOTS}-2949-cahier`, projectName());

		await page.getByRole('button', { name: 'Révoquer' }).click();
		await expect(page.getByText(/Aucun lien actif/)).toBeVisible({ timeout: 15_000 });
		await expectSame('après « Révoquer »');
	});
});

test.describe('#2949 — modèles de mise en page : recherche et page gardées', () => {
	test.skip(!LOCAL, 'serveur de dev et base locale seulement');
	test.use({ viewport: DESKTOP });
	const COUNT = 22;

	test.beforeAll(async () => {
		assertLocalServerEnv();
		await sweepTemplates(projectName());
	});
	test.afterEach(async () => {
		await sweepTemplates(projectName());
	});

	test('#2949 — recherche + page 2 : « Dupliquer » puis « Supprimer » gardent la même recherche et la même page', async ({
		page
	}) => {
		test.setTimeout(240_000);
		const prefix = `${tag()} #${parallelIndex()}`;
		for (let n = 0; n < COUNT; n++) {
			const name = `${prefix} gabarit ${String(n).padStart(2, '0')}`;
			const [style] = await sql<{ id: string }>(
				`insert into worksheet_styles (owner_id, name) values ($1, $2) returning id`,
				[TEACHER_ID, name]
			);
			await sql(
				`insert into worksheet_templates (id, style_id, name, template_content, created_by, created_at)
				 values ($1, $1, $2, '#set page(width: 10cm)', $3, now() - ($4 || ' minutes')::interval)`,
				[style.id, name, TEACHER_ID, String(n)]
			);
		}
		await signIn(page, TEACHER);
		const address = `/dashboard/teacher/contenu/worksheets/templates?search=${encodeURIComponent(prefix)}&page=2`;
		await gotoSettled(page, address);
		const here = async (step: string) => {
			const url = new URL(page.url());
			expect(url.searchParams.get('search'), `${step} : recherche`).toBe(prefix);
			expect(url.searchParams.get('page'), `${step} : page`).toBe('2');
			await expect(page.getByText('Page 2 sur 2'), `${step} : « Page 2 sur 2 »`).toBeVisible();
			await expect(page.locator('#search'), `${step} : champ de recherche`).toHaveValue(prefix);
		};
		await here('au départ');
		// Page 2 de 22 modèles à 20 par page : les deux derniers (n° 20 et 21)
		await expect(page.getByRole('row').filter({ hasText: 'gabarit 20' })).toBeVisible();
		await expect(page.getByRole('row').filter({ hasText: 'gabarit 21' })).toBeVisible();

		// Dupliquer le n° 20 : la copie existe, l'adresse et la page ne bougent pas
		await page
			.getByRole('row')
			.filter({ hasText: 'gabarit 20' })
			.getByRole('button', { name: 'Dupliquer' })
			.click();
		await expect(page.getByText('Modèle dupliqué')).toBeVisible({ timeout: 15_000 });
		await here('après « Dupliquer »');
		const copies = await sql<{ name: string }>(
			`select name from worksheet_templates where created_by = $1 and name = $2`,
			[TEACHER_ID, `${prefix} gabarit 20 (copie)`]
		);
		expect(copies, 'la copie est enregistrée').toHaveLength(1);
		// 23 modèles : la page 2 en montre maintenant 3
		await expect(page.getByRole('row').filter({ hasText: prefix })).toHaveCount(3);

		// Supprimer le n° 21 : retiré, même recherche, même page
		await page
			.getByRole('row')
			.filter({ hasText: 'gabarit 21' })
			.getByRole('button', { name: 'Supprimer' })
			.click();
		await expect(page.getByText('Modèle supprimé')).toBeVisible({ timeout: 15_000 });
		await here('après « Supprimer »');
		const left = await sql<{ name: string }>(
			`select name from worksheet_templates where created_by = $1 and name like $2`,
			[TEACHER_ID, `${prefix} %`]
		);
		expect(left, '22 modèles (23 − 1)').toHaveLength(COUNT);
		expect(left.map((row) => row.name)).not.toContain(`${prefix} gabarit 21`);
		await shoot(page, `${SHOTS}-2949-gabarits`, projectName());
	});
});

test.describe('#2949 — profil : mot de passe actuel faux', () => {
	test.skip(!LOCAL, 'serveur de dev et base locale seulement');
	test.use({ viewport: DESKTOP });

	test.beforeAll(async () => {
		test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
		assertLocalServerEnv();
		await acquireLock(STUDENT_LOCK);
		// Restes d'un passage interrompu (verrou tenu) : messages du test, participation d'eleve10
		// (absent du seed), résumé de la conversation vide
		await sweepChat();
	});
	test.afterAll(() => releaseLock(STUDENT_LOCK));
	test.beforeEach(() => {
		test.setTimeout(240_000);
		refreshLock(STUDENT_LOCK);
	});

	test('#2949 — élève : « Changer mon mot de passe » avec un mot de passe actuel FAUX → erreur affichée, retour au profil, mot de passe inchangé', async ({
		page,
		browser
	}) => {
		await signIn(page, STUDENT);
		await gotoSettled(page, '/dashboard/profile');
		await page.getByRole('link', { name: 'Changer mon mot de passe' }).click();
		await expect(page).toHaveURL(/\/auth\/update-password\?depuis=profil/);
		// Un envoi avant l'hydratation est un envoi natif (adresse `?/updatePassword`, `depuis` perdu) :
		// détecté à la perte du marqueur, on recommence sur la page rechargée
		let sent = false;
		for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
			if (attempt > 1) await gotoSettled(page, '/auth/update-password?depuis=profil');
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(2000 * attempt);
			await page.evaluate(() => {
				(window as unknown as { __memeDocument: boolean }).__memeDocument = true;
			});
			await page.locator('#currentPassword').fill('Mauvais-Actuel-Verifs9!');
			await page.locator('#password').fill('Nouveau-Verifs9-2026!');
			await page.locator('#confirmPassword').fill('Nouveau-Verifs9-2026!');
			await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
			await expect(page.getByText('Mot de passe actuel incorrect.')).toBeVisible({
				timeout: 15_000
			});
			sent = await page.evaluate(
				() => (window as unknown as { __memeDocument?: boolean }).__memeDocument === true
			);
		}
		expect(sent, 'le formulaire s’est envoyé après hydratation').toBe(true);
		// L'erreur ne fait pas perdre l'origine : le lien de retour mène au profil
		await expect(page).toHaveURL(/depuis=profil/);
		const back = page.getByRole('link', { name: /Retour à mon profil/ });
		await expect(back).toHaveAttribute('href', /\/dashboard\/profile$/);
		await back.click();
		await expect(page).toHaveURL(/\/dashboard\/profile$/);

		// Le mot de passe n'a pas changé : une connexion neuve avec l'ancien passe
		const context = await browser.newContext(test.info().project.use);
		const other = await context.newPage();
		try {
			await login(other, STUDENT.email, STUDENT.password);
			await expect(other).not.toHaveURL(/\/auth\/login/);
		} finally {
			await context.close();
		}
	});
});

test.describe('#2949 — connexion : « ?error= » de l’adresse et mauvais identifiants', () => {
	test('#2949 — `/auth/login?error=essai` puis mauvais identifiants → « Identifiants invalides » (pas « essai »)', async ({
		page
	}) => {
		test.skip(!LOCAL, 'mauvais identifiants : jamais joué contre la prod');
		await page.goto('/auth/login?error=essai');
		await page.waitForLoadState('networkidle');
		// Avant l'envoi : le message de l'adresse est ce qu'on voit
		await expect(page.getByText('essai', { exact: true })).toBeVisible();
		await page.locator('input[name="email"]').fill(STUDENT.email);
		await page.locator('input[type="password"]').fill('mauvais-mot-de-passe-verifs9');
		await page.locator('button[type="submit"]').click();
		await expect(page.getByText('Identifiants invalides.')).toBeVisible();
		await expect(page.getByText('essai', { exact: true })).toHaveCount(0);
	});
});

// ============================================================================
// #2948 — verdict dans /dev/modeles
// ============================================================================

interface ReviewRow {
	template_id: string;
	verdict: string;
	comment: string | null;
	reviewed_at: string;
	reviewed_by: string | null;
}

interface ReviewPhoto {
	templateId: string;
	row: ReviewRow | null;
}
const REVIEW_PATH = '.captures/verifs/pages-paquet9-verdict.json';

/** Remet la ligne de relecture d'avant (ou la retire si elle n'existait pas) */
async function restoreReview(saved: ReviewPhoto): Promise<void> {
	await sql(`delete from question_template_reviews where template_id = $1`, [saved.templateId]);
	if (saved.row) {
		await sql(
			`insert into question_template_reviews (template_id, verdict, comment, reviewed_at, reviewed_by)
			 values ($1, $2, $3, $4, $5)`,
			[
				saved.row.template_id,
				saved.row.verdict,
				saved.row.comment,
				saved.row.reviewed_at,
				saved.row.reviewed_by
			]
		);
	}
}

test.describe('#2948 — verdict dans /dev/modeles', () => {
	test.skip(!LOCAL, 'admin local seulement');
	// Deux tests sur la même ligne de relecture : l'un après l'autre ; connexion admin lente sous charge
	test.describe.configure({ mode: 'serial' });
	test.use({ viewport: DESKTOP, actionTimeout: 60_000 });
	let photo: ReviewPhoto | null = null;

	// Restes d'un passage interrompu : la ligne de relecture photographiée sur disque est remise
	test.beforeAll(async () => {
		assertLocalServerEnv();
		if (existsSync(REVIEW_PATH)) {
			await restoreReview(JSON.parse(readFileSync(REVIEW_PATH, 'utf8')) as ReviewPhoto);
			rmSync(REVIEW_PATH, { force: true });
		}
	});

	test.afterEach(async () => {
		// La ligne de relecture de David est remise telle quelle (ou retirée si elle n'existait pas)
		if (!photo) return;
		await restoreReview(photo);
		rmSync(REVIEW_PATH, { force: true });
		photo = null;
	});

	for (const [verdictLabel, verdict] of [
		['✅ Validé', 'valide'],
		['🔶 À revoir', 'a_revoir']
	] as const) {
		test(`#2948 — série ouverte : « ${verdictLabel} » puis « Enregistrer le verdict » → toast, même adresse, verdict et date affichés`, async ({
			page
		}) => {
			test.setTimeout(240_000);
			// Une petite série dont le premier modèle existe
			const [serie] = await sql<{ id: string; templateId: string }>(
				`select s.id, s.items->0->>'templateId' as "templateId" from series s
				 join question_templates q on q.id = (s.items->0->>'templateId')::uuid
				 where jsonb_typeof(s.items) = 'array' and jsonb_array_length(s.items) between 1 and 4
				 order by s.id limit 1`
			);
			expect(serie, 'une série lisible').toBeTruthy();
			const [before] = await sql<ReviewRow>(
				`select template_id::text, verdict, comment, reviewed_at::text, reviewed_by::text
				 from question_template_reviews where template_id = $1`,
				[serie.templateId]
			);
			photo = { templateId: serie.templateId, row: before ?? null };
			// Écrit sur disque AVANT le clic : un arrêt brutal laisse de quoi remettre la ligne
			mkdirSync('.captures/verifs', { recursive: true });
			writeFileSync(REVIEW_PATH, JSON.stringify(photo));

			await signIn(page, ADMIN);
			const address = `/dev/modeles?serie=${serie.id}`;
			await gotoSettled(page, address);
			const form = page
				.locator(`form:has(input[name="templateId"][value="${serie.templateId}"])`)
				.locator('visible=true')
				.first();
			await expect(form).toBeVisible({ timeout: 60_000 });
			const urlBefore = page.url();
			// Un clic avant l'hydratation de la page est perdu : on le rejoue jusqu'à ce qu'il prenne
			await expect(async () => {
				await form.getByRole('button', { name: verdictLabel }).click();
				await expect(form.getByRole('button', { name: verdictLabel })).toHaveAttribute(
					'aria-pressed',
					'true',
					{ timeout: 2000 }
				);
			}).toPass({ timeout: 30_000 });
			await form.getByLabel('Commentaire du verdict').fill(`${tag()} commentaire`);
			await form.getByRole('button', { name: 'Enregistrer le verdict' }).click();
			await expect(page.getByText('Verdict enregistré')).toBeVisible({ timeout: 15_000 });
			// La page reste sur la série : même adresse
			expect(page.url(), 'adresse inchangée').toBe(urlBefore);
			expect(new URL(page.url()).searchParams.get('serie')).toBe(serie.id);
			// Le verdict s'affiche avec sa date (jour d'aujourd'hui, format court français)
			const today = new Date().toLocaleDateString('fr-FR');
			await expect(
				form.getByText(new RegExp(`verdict du ${today.replace(/\//g, '\\/')}`))
			).toBeVisible();
			const [saved] = await sql<ReviewRow>(
				`select template_id::text, verdict, comment, reviewed_at::text, reviewed_by::text
				 from question_template_reviews where template_id = $1`,
				[serie.templateId]
			);
			expect(saved.verdict).toBe(verdict);
			await shoot(page, `${SHOTS}-2948-${verdict}`, projectName());
			// Un rechargement relit la base : même verdict
			await page.reload();
			await page.waitForLoadState('networkidle');
			const again = page
				.locator(`form:has(input[name="templateId"][value="${serie.templateId}"])`)
				.locator('visible=true')
				.first();
			await expect(again.getByRole('button', { name: verdictLabel })).toHaveAttribute(
				'aria-pressed',
				'true',
				{ timeout: 60_000 }
			);
		});
	}
});

// ============================================================================
// #2971 — titres pour Google (pages publiques, aussi en prod)
// ============================================================================

for (const [label, viewport] of [
	['téléphone', PHONE],
	['ordinateur', { width: 1280, height: 800 }]
] as const) {
	test.describe(`#2971 — titres pour Google, ${label}`, () => {
		test.use({ viewport });

		test('#2971 — accueil : « Chiphre, les maths de la chandelle verte », deux lignes au plus, Père Ubu intact', async ({
			page
		}) => {
			await gotoSettled(page, '/');
			const h1 = page.getByRole('heading', { level: 1 });
			await expect(h1).toHaveText('Chiphre, les maths de la chandelle verte');
			const lines = await h1.evaluate((el) => {
				const range = document.createRange();
				range.selectNodeContents(el);
				const tops = new Set<number>();
				for (const rect of range.getClientRects()) {
					if (rect.width > 0) tops.add(Math.round(rect.top / 4));
				}
				return tops.size;
			});
			expect(lines, 'lignes du grand titre').toBeLessThanOrEqual(2);
			await expect(page).toHaveTitle(/Chiphre/);
			// Père Ubu : toujours là, visible, et le titre ne le recouvre pas
			const ubu = page.getByRole('link', { name: /Père Ubu : visiter le Royaume/ });
			await expect(ubu).toBeVisible();
			const [titleBox, ubuBox] = [await h1.boundingBox(), await ubu.boundingBox()];
			expect(titleBox && ubuBox).toBeTruthy();
			expect(
				titleBox!.y + titleBox!.height,
				'le bas du titre est au-dessus du haut de Père Ubu'
			).toBeLessThanOrEqual(ubuBox!.y + 1);
			await expectNoHorizontalOverflow(page, 'accueil');
			await shoot(page, `${SHOTS}-2971-accueil-${label}`, projectName());
		});

		test('#2971 — /glossaire/mediatrice : onglet « médiatrice : définition (maths) | Chiphre », titre de la page « médiatrice »', async ({
			page
		}) => {
			await gotoSettled(page, '/glossaire/mediatrice');
			await expect(page).toHaveTitle('médiatrice : définition (maths) | Chiphre');
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('médiatrice');
		});
	});
}

// ============================================================================
// #2978 — exemples du glossaire (pages publiques, aussi en prod)
// ============================================================================

for (const [label, viewport] of [
	['téléphone', PHONE],
	['ordinateur', DESKTOP]
] as const) {
	test.describe(`#2978 — exemples du glossaire, ${label}`, () => {
		test.use({ viewport });

		for (const slug of [
			'disjoints',
			'partage-proportionnel',
			'representant-vecteur',
			'angle-nul'
		]) {
			test(`#2978 — /glossaire/${slug} : rubrique « Exemple » avec son niveau, formules dessinées, rien ne déborde`, async ({
				page
			}) => {
				test.setTimeout(180_000);
				const errors = collectErrors(page);
				await gotoSettled(page, `/glossaire/${slug}`);
				const heading = page.getByRole('heading', { level: 2, name: /^Exemples?$/ });
				await expect(heading).toBeVisible();
				const section = page.locator('section').filter({ has: heading });
				// Le niveau est écrit sous le titre de la rubrique, avant le contenu : chaque entrée porte le
				// nom d'un niveau connu (liste fermée) ; en local, la suite exacte est celle de la base
				const levels = (await section.locator('dt').allInnerTexts()).map((text) => text.trim());
				expect(levels.length, 'au moins un niveau sous « Exemple »').toBeGreaterThan(0);
				const known = Object.values(GRADES).map((grade) => grade.displayName);
				for (const level of levels) expect(known, `niveau « ${level} »`).toContain(level);
				if (LOCAL) {
					const [entry] = await sql<{
						exemples: { items: { grade: keyof typeof GRADES }[] } | null;
					}>(`select exemples from dictionary_entries where slug = $1`, [slug]);
					expect(entry, `entrée « ${slug} » en base`).toBeTruthy();
					const expected = (entry.exemples?.items ?? []).map(
						(item) => GRADES[item.grade].displayName
					);
					expect(levels, `niveaux de « ${slug} » : ceux de la base, dans l'ordre`).toEqual(
						expected
					);
				}
				await expect(section.locator('dt').first()).toBeVisible();
				// Les formules sont dessinées : des `math-span`, et aucun reste de code
				const formulas = section.locator('math-span');
				expect(await formulas.count(), 'formules de la rubrique').toBeGreaterThan(0);
				await expect(formulas.first()).toBeVisible();
				// MathLive se charge après la page : on attend que toutes les formules soient dessinées
				await expect
					.poll(
						() =>
							formulas.evaluateAll((els) =>
								els.every((el) => (el as HTMLElement).shadowRoot?.childElementCount)
							),
						{ timeout: 60_000, message: 'formules dessinées (MathLive chargé)' }
					)
					.toBe(true);
				const text = await section.innerText();
				expect(text, 'aucun dollar visible').not.toContain('$');
				expect(text, 'aucun \\frac visible').not.toMatch(/\\(frac|vec|overrightarrow|left|right)/);
				expect(text, 'aucune accolade de code').not.toMatch(/\{\{|\\\{/);
				// Une formule dessinée a une boîte (hauteur et largeur non nulles)
				const boxes = await formulas.evaluateAll((els) =>
					els.map((el) => {
						const rect = el.getBoundingClientRect();
						return { w: rect.width, h: rect.height, right: rect.right };
					})
				);
				for (const box of boxes) {
					expect(box.w).toBeGreaterThan(0);
					expect(box.h).toBeGreaterThan(0);
					expect(box.right, 'formule dans la largeur de la fenêtre').toBeLessThanOrEqual(
						viewport.width + 1
					);
				}
				await expectNoHorizontalOverflow(page, slug);
				await shoot(page, `${SHOTS}-2978-${slug}-${label}`, projectName());
				// Le journal d'erreurs du site refuse parfois (429) quand plusieurs pages signalent d'un coup
				expect(
					errors.errors.filter((error) => !error.includes('/api/errors/log')),
					'erreurs de console'
				).toEqual([]);
			});
		}
	});
}

// ============================================================================
// #2976 — mesures de performance
// ============================================================================

test.describe('#2976 — mesures de performance « web-vitals »', () => {
	test.skip(!LOCAL, 'jamais d’écriture en prod : le seul envoi possible y écrit une ligne');
	test.use({ viewport: DESKTOP });

	test('#2976 — en local : le passage en arrière-plan n’envoie rien, l’adresse répond 204 sans rien écrire (« N’écrit qu’en prod »)', async ({
		page
	}) => {
		const [before] = await sql<{ n: number }>(`select count(*)::int as n from web_vital_samples`);
		const sent: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/api/web-vitals'))
				sent.push(`${request.method()} ${request.url()}`);
		});
		await gotoSettled(page, '/');
		await gotoSettled(page, '/automaths');
		// Changement d'onglet simulé : la page passe en arrière-plan
		await page.evaluate(() => {
			Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
			Object.defineProperty(document, 'hidden', { value: true, configurable: true });
			document.dispatchEvent(new Event('visibilitychange'));
		});
		await page.waitForTimeout(1500);
		expect(
			sent,
			'en développement, `initWebVitals` envoie dans le vide (`dev ? () => {}`)'
		).toEqual([]);
		// L'adresse elle-même : 204, et aucune ligne (hors prod, rien n'est gardé)
		const response = await page.request.post('/api/web-vitals', {
			data: {
				device_type: 'desktop',
				samples: [{ route: '/(public)', metric: 'LCP', value: 1234 }]
			}
		});
		expect(response.status()).toBe(204);
		const [after] = await sql<{ n: number }>(`select count(*)::int as n from web_vital_samples`);
		expect(after.n, 'aucune ligne écrite en local').toBe(before.n);
	});
});

// ============================================================================
// #2914 — gras dans une cellule de tableau
// ============================================================================

const GRAS_MODELE = 'dd7065d9-700a-4df4-af1c-ef0a2deab347';
const GRAS_VARIATION = 1;
const TABLEAU_VILLES = 'f5742b78-a6c3-45b6-a341-81e4b67fb9de';

async function openCard(page: Page, templateId: string, variation: number, seed: number) {
	const link = buildSeriesLink(
		'',
		[{ templateId, quantity: 1, delay: 0, variations: [variation] }],
		{ mode: 'typing', seed }
	);
	await gotoSettled(page, link);
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor({ timeout: 60_000 });
	await expect(card.getByRole('button', { name: 'Valider' })).toBeVisible();
	return card;
}

test.describe('#2914 — gras dans une cellule de tableau', () => {
	test.skip(!LOCAL, 'modèles de la base locale');
	test.use({ viewport: DESKTOP });

	test('#2914 — CM2 « Résous un problème avec un tableau ou un diagramme en barres » (variation des distances) : « Brumeval » en gras, sans astérisques', async ({
		page
	}) => {
		const card = await openCard(page, GRAS_MODELE, GRAS_VARIATION, 9914);
		const table = card.locator('table').first();
		await expect(table).toBeVisible();
		const cell = table
			.locator('tbody th, tbody td')
			.filter({ hasText: /^\s*Brumeval\s*$/ })
			.first();
		await expect(cell).toBeVisible();
		const bold = await cell.evaluate((el) => {
			const strong = el.querySelector('strong, b');
			const target = strong ?? el;
			return {
				hasStrong: strong !== null,
				weight: Number(getComputedStyle(target).fontWeight),
				text: el.textContent?.trim()
			};
		});
		expect(bold.text).toBe('Brumeval');
		expect(bold.hasStrong, 'élément gras').toBe(true);
		expect(bold.weight, 'graisse calculée').toBeGreaterThanOrEqual(600);
		expect(await table.innerText(), 'aucun astérisque dans le tableau').not.toContain('*');
		// Les nombres et les formules du même tableau : dessinés, sans reste de code
		const formulas = table.locator('math-span');
		expect(await formulas.count(), 'formules du tableau').toBeGreaterThan(0);
		expect(await table.innerText()).not.toMatch(/\$|\{\{/);
		await shoot(page, `${SHOTS}-2914-gras`, projectName());
	});

	test('#2914 — tableau avec des nombres et des formules `$…$` : rendu inchangé (formules dessinées, aucun astérisque ni dollar)', async ({
		page
	}) => {
		const card = await openCard(page, TABLEAU_VILLES, 0, 9915);
		const table = card.locator('table').first();
		await expect(table).toBeVisible();
		expect(
			await table.locator('math-span').count(),
			'une formule par ville'
		).toBeGreaterThanOrEqual(5);
		const text = await table.innerText();
		expect(text).not.toMatch(/[$*]|\{\{/);
		for (const ville of ['Brumeval', 'Castelroc', 'Pontaval', 'Mirelande', 'Sablonnière']) {
			expect(text).toContain(ville);
		}
		// Rien n'est en gras par erreur dans les cellules de nombres
		const strongs = await table.locator('td strong, td b').count();
		expect(strongs, 'aucun gras dans ce tableau').toBe(0);
	});
});

// Chat d'élève : un message d'un tableau avec `**mot**` (rendu restreint). Le message est posé dans une
// conversation de classe VIDE du seed, avec `eleve10` ajouté comme participant ; message et participation
// sont retirés en fin de test, et la conversation retrouve sa ligne d'avant.
const CHAT_CONVERSATION = '0d5a9f41-a55c-44d2-9000-56c1a65d55fe';
const ELEVE10_ID = '5eed0000-0000-4000-8000-000000000010';

const cell = (text: string, bold = false) => ({
	type: 'tableCell',
	content: [
		{
			type: 'paragraph',
			content: [{ type: 'text', text, ...(bold ? { marks: [{ type: 'bold' }] } : {}) }]
		}
	]
});
const head = (text: string) => ({
	type: 'tableHeader',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});

/** Retire ce qu'un passage interrompu a laissé dans la conversation de classe du seed */
async function sweepChat(): Promise<void> {
	await sql(`delete from messages where conversation_id = $1 and content::text like '%Verifs9%'`, [
		CHAT_CONVERSATION
	]);
	await sql(`delete from conversation_participants where conversation_id = $1 and user_id = $2`, [
		CHAT_CONVERSATION,
		ELEVE10_ID
	]);
	await sql(
		`update conversations set last_message_id = null, last_message_preview = null, last_message_at = null
		 where id = $1 and not exists (select 1 from messages where conversation_id = $1)`,
		[CHAT_CONVERSATION]
	);
}

test.describe('#2914 — chat élève : tableau avec du gras et un lien tapé', () => {
	test.skip(!LOCAL, 'base locale seulement');
	test.use({ viewport: DESKTOP });
	let messageId: string | null = null;
	let addedParticipant = false;
	let conversationBefore: Record<string, unknown> | null = null;

	test.beforeAll(async () => {
		test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
		assertLocalServerEnv();
		await acquireLock(STUDENT_LOCK);
	});
	test.afterAll(() => releaseLock(STUDENT_LOCK));
	test.beforeEach(() => {
		test.setTimeout(240_000);
		refreshLock(STUDENT_LOCK);
	});
	test.afterEach(async () => {
		if (messageId) await sql(`delete from messages where id = $1`, [messageId]);
		if (addedParticipant) {
			await sql(
				`delete from conversation_participants where conversation_id = $1 and user_id = $2`,
				[CHAT_CONVERSATION, ELEVE10_ID]
			);
		}
		if (conversationBefore) {
			await sql(
				`update conversations set last_message_id = $2, last_message_preview = $3, last_message_at = $4
				 where id = $1`,
				[
					CHAT_CONVERSATION,
					conversationBefore.last_message_id,
					conversationBefore.last_message_preview,
					conversationBefore.last_message_at
				]
			);
		}
		messageId = null;
		addedParticipant = false;
		conversationBefore = null;
	});

	test('#2914 — chat élève : une cellule `**mot**` est en gras, sans astérisques ; un lien tapé dans une cellule reste du texte', async ({
		page
	}) => {
		const [before] = await sql<Record<string, unknown>>(
			`select last_message_id, last_message_preview, last_message_at from conversations where id = $1`,
			[CHAT_CONVERSATION]
		);
		const [existing] = await sql<{ n: number }>(
			`select count(*)::int n from messages where conversation_id = $1`,
			[CHAT_CONVERSATION]
		);
		expect(existing.n, 'conversation vide : aucun vrai message d’élève touché').toBe(0);
		conversationBefore = before;
		await sql(`insert into conversation_participants (conversation_id, user_id) values ($1, $2)`, [
			CHAT_CONVERSATION,
			ELEVE10_ID
		]);
		addedParticipant = true;
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'table',
					content: [
						{ type: 'tableRow', content: [head('Verifs9 Ville'), head('Habitants')] },
						{ type: 'tableRow', content: [cell('Brumeval', true), cell('12')] },
						{
							type: 'tableRow',
							content: [cell('Castelroc'), cell('https://exemple.invalid/essai')]
						}
					]
				}
			]
		};
		const [message] = await sql<{ id: string }>(
			`insert into messages (conversation_id, sender_id, content) values ($1, $2, $3::jsonb) returning id`,
			[CHAT_CONVERSATION, TEACHER_ID, JSON.stringify(doc)]
		);
		messageId = message.id;

		await signIn(page, STUDENT);
		await gotoSettled(page, '/dashboard/chat');
		await page.getByRole('button', { name: /1SPE ZZ - Chat de classe/ }).click();
		const table = page.locator('table').filter({ hasText: 'Brumeval' }).first();
		await expect(table).toBeVisible({ timeout: 30_000 });
		const strong = table.locator('td strong, td b').filter({ hasText: 'Brumeval' });
		await expect(strong).toHaveCount(1);
		expect(
			Number(await strong.evaluate((el) => getComputedStyle(el).fontWeight)),
			'graisse calculée'
		).toBeGreaterThanOrEqual(600);
		const text = await table.innerText();
		expect(text, 'aucun astérisque').not.toContain('*');
		// Le lien tapé reste du texte : visible tel quel, jamais un lien cliquable
		expect(text).toContain('https://exemple.invalid/essai');
		expect(await table.locator('a').count(), 'aucun lien dans le tableau').toBe(0);
		await shoot(page, `${SHOTS}-2914-chat`, projectName());
	});
});
