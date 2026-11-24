import { expect, test, type Locator, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { TEACHER_ID } from './helpers/fiches';
import { gotoSettled } from './helpers/pages';
import { acquireLock, LOCK_WAIT_MAX_MS, refreshLock, releaseLock } from './helpers/verrou';

/**
 * SvelteKit 3 (#2825) — connexion, déconnexion, menus, 404, onglets, notification, formulaire
 * ===========================================================================================
 *
 * Reprend la ligne #2825 de `docs/wip/verifications-manuelles.md`. Base LOCALE, serveur de dev
 * seulement : les comptes `local-*` n'existent pas en prod.
 *
 * Non testé ici (à David) : la connexion par Google (écran Google réel) ; le combat Navadra (en
 * local, la page du combat rend une erreur 500 pour l'élève de test) ; le « créneau du cahier de
 * texte » de la ligne : le formulaire joué ici est celui du lien de consultation du cahier de texte
 * (le prof local n'a pas de période d'emploi du temps) ; la DÉCONNEXION DU PROF : la route
 * `/auth/logout` révoque toutes les sessions du compte, et le prof local sert à tous les autres
 * fichiers de vérifs et aux autres sessions — seule la déconnexion de l'élève (compte sous verrou)
 * est jouée, par le même bouton et la même route.
 *
 * Comptes : l'élève `eleve10` (verrou `eleves-10-15` : connexion et déconnexion) et le prof local.
 * Ce que les tests écrivent : une notification (préfixe « Verifs8 notif <projet> ») et un lien de
 * consultation du cahier de texte ; les deux sont retirés en fin de test, et au passage suivant
 * après un arrêt brutal (`sweepLeftovers`).
 *
 * Le décor (largeur) se fixe par `test.use` : le même test vaut sur tous les projets.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

// Constantes

const LOCK = 'eleves-10-15';
const STUDENT = { email: 'eleve10@local.test', password: 'local-eleve' };
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1100, height: 900 };
/** Haut d'écran bas : la page défile à coup sûr (on mesure qu'elle ne remonte pas) */
const SHORT_PHONE = { width: 390, height: 420 };
const LOGOUT_LABEL = /Quitter le Royaume|Déconnexion/;

let lockHeld = false;

/** Classe et liens d'avant, écrits AVANT de créer un lien : relus après un arrêt brutal */
const reprisePath = (project: string): string =>
	`.captures/verifs/pages-paquet8-reprise-${project}.json`;

interface Reprise {
	classId: string;
	tokensBefore: string[];
}

/** Retire les liens du cahier de texte créés sur `classId` depuis la photographie */
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

/** Restes d'un passage interrompu de CE projet : notifications et liens du cahier de texte */
async function sweepLeftovers(project: string): Promise<void> {
	await sql(`delete from notifications where title like $1`, [`Verifs8 notif ${project} %`]);
	const path = reprisePath(project);
	if (existsSync(path)) {
		await removeCreatedTokens(JSON.parse(readFileSync(path, 'utf8')) as Reprise);
		rmSync(path, { force: true });
	}
}

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	await acquireLock(LOCK);
	lockHeld = true;
	await sweepLeftovers(test.info().project.name);
});

test.afterAll(() => {
	if (lockHeld) releaseLock(LOCK);
});

test.beforeEach(() => {
	test.setTimeout(240_000);
	refreshLock(LOCK);
});

// Fonctions

const projectName = (): string => test.info().project.name;

/** Se connecte par le formulaire d'e-mail (le même chemin que les élèves et le prof) */
async function signIn(page: Page, account: { email: string; password: string }): Promise<void> {
	await login(page, account.email, account.password);
	await page.waitForLoadState('networkidle');
}

/** Vrai quand la session est coupée : une page protégée renvoie vers la connexion */
async function expectLoggedOut(page: Page): Promise<void> {
	await gotoSettled(page, '/dashboard');
	await expect(page).toHaveURL(/\/auth\/login/);
}

/** Les adresses des liens visibles d'une liste de navigation */
async function visibleHrefs(nav: Locator): Promise<string[]> {
	return nav
		.locator('a[href]')
		.locator('visible=true')
		.evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
}

// ============================================================================
// Connexion par e-mail, déconnexion
// ============================================================================

test.describe('#2825 — connexion par e-mail et déconnexion, ordinateur', () => {
	test.use({ viewport: DESKTOP });

	for (const [role, account] of [
		['élève', STUDENT],
		['prof', TEACHER]
	] as const) {
		test(`#2825 — ${role} : connexion par e-mail → tableau de bord${role === 'élève' ? ' ; déconnexion (barre latérale) → la session est coupée' : ' (déconnexion non jouée : compte partagé)'}`, async ({
			page
		}) => {
			await signIn(page, account);
			await expect(page).toHaveURL(/\/dashboard/);
			// La session tient : un rechargement reste connecté
			await page.reload();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/dashboard/);

			// La déconnexion révoque toutes les sessions du compte : jamais celle du prof local (partagé)
			if (role === 'prof') return;
			await page.getByRole('button', { name: LOGOUT_LABEL }).locator('visible=true').click();
			await page.waitForURL((url) => !url.pathname.startsWith('/dashboard'));
			await expectLoggedOut(page);
		});
	}
});

test.describe('#2825 — connexion par e-mail et déconnexion, téléphone', () => {
	test.use({ viewport: PHONE });

	for (const [role, account] of [
		['élève', STUDENT],
		['prof', TEACHER]
	] as const) {
		test(`#2825 — ${role} : connexion par e-mail${role === 'élève' ? ' ; déconnexion par le tiroir du menu → la session est coupée' : ' ; le tiroir propose la déconnexion (non jouée : compte partagé)'}`, async ({
			page
		}) => {
			await signIn(page, account);
			await expect(page).toHaveURL(/\/dashboard/);
			await page.getByRole('button', { name: 'Ouvrir le menu' }).locator('visible=true').click();
			const drawer = page.getByRole('dialog');
			await expect(drawer).toBeVisible();
			await expect(drawer.getByRole('button', { name: LOGOUT_LABEL })).toBeAttached();
			// La déconnexion révoque toutes les sessions du compte : jamais celle du prof local (partagé)
			if (role === 'prof') return;
			// Le bouton est au bas d'une longue liste : on le clique dans la page (le tiroir défile)
			await drawer
				.getByRole('button', { name: LOGOUT_LABEL })
				.evaluate((button) => (button as HTMLElement).click());
			await expect(drawer).toBeHidden();
			await page.waitForURL((url) => !url.pathname.startsWith('/dashboard'));
			await expectLoggedOut(page);
		});
	}

	test('#2825 — un mauvais mot de passe : le message d’erreur s’affiche et on reste sur la connexion', async ({
		page
	}) => {
		await page.goto('/auth/login');
		await page.waitForLoadState('networkidle');
		await page.locator('input[name="email"]').fill(STUDENT.email);
		await page.locator('input[type="password"]').fill('mauvais-mot-de-passe-verifs8');
		await page.locator('button[type="submit"]').click();
		await expect(page.getByText('Identifiants invalides.')).toBeVisible();
		await expect(page).toHaveURL(/\/auth\/login/);
	});
});

// ============================================================================
// Menu et tiroir mobile
// ============================================================================

test.describe('#2825 — navigation par le menu', () => {
	test.describe('ordinateur', () => {
		test.use({ viewport: DESKTOP });

		test('#2825 — élève : un lien de la barre latérale ouvre sa page', async ({ page }) => {
			await signIn(page, STUDENT);
			const nav = page.getByRole('navigation', { name: 'Navigation principale' });
			const hrefs = (await visibleHrefs(nav)).filter(
				(href) => href.startsWith('/dashboard/') && href !== '/dashboard'
			);
			expect(hrefs.length, 'liens de la barre latérale').toBeGreaterThan(2);
			const target = hrefs[0];
			await nav.locator(`a[href="${target}"]`).locator('visible=true').click();
			await expect(page).toHaveURL(new RegExp(`${target}$`));
			await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
		});
	});

	test.describe('téléphone', () => {
		test.use({ viewport: PHONE });

		for (const [role, account] of [
			['élève', STUDENT],
			['prof', TEACHER]
		] as const) {
			test(`#2825 — ${role} : le tiroir s’ouvre, un lien ouvre sa page et referme le tiroir`, async ({
				page
			}) => {
				await signIn(page, account);
				await page.getByRole('button', { name: 'Ouvrir le menu' }).locator('visible=true').click();
				const drawer = page.getByRole('dialog');
				await expect(drawer).toBeVisible();
				const nav = drawer.getByRole('navigation', { name: 'Navigation principale' });
				const hrefs = (await visibleHrefs(nav)).filter(
					(href) => href.startsWith('/dashboard/') && href !== '/dashboard'
				);
				expect(hrefs.length, 'liens du tiroir').toBeGreaterThan(2);
				const target = hrefs[0];
				await nav.locator(`a[href="${target}"]`).click();
				await expect(page).toHaveURL(new RegExp(`${target}$`));
				await expect(drawer).toBeHidden();
				await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
			});
		}
	});
});

// ============================================================================
// 404
// ============================================================================

test.describe('#2825 — page inexistante', () => {
	test('#2825 — visiteur : une adresse inconnue → 404 « Page introuvable »', async ({ page }) => {
		const response = await page.goto('/page-qui-n-existe-pas-verifs8');
		expect(response?.status()).toBe(404);
		await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
	});

	test('#2825 — élève connecté : une adresse inconnue dans le tableau de bord → 404 « Page introuvable »', async ({
		page
	}) => {
		await signIn(page, STUDENT);
		const response = await page.goto('/dashboard/page-qui-n-existe-pas-verifs8');
		expect(response?.status()).toBe(404);
		await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
	});
});

// ============================================================================
// Onglets sans retour en haut (prof)
// ============================================================================

/**
 * Descend un peu dans la page (celle qui défile : `<main>` ou la fenêtre), clique un lien-onglet SANS
 * le remonter ni le déplacer, et rend la position de défilement avant et après.
 */
async function clickTabKeepingScroll(
	page: Page,
	tab: Locator
): Promise<{ before: number; after: number; urlBefore: string; urlAfter: string }> {
	const urlBefore = page.url();
	// Page hydratée avant le clic : sinon le lien se suit par un chargement complet, qui remonte la page
	await page.waitForLoadState('networkidle', { timeout: 30_000 });
	await page.evaluate(() => {
		(window as unknown as { __sansRechargement: boolean }).__sansRechargement = true;
	});
	// Le défilement se mesure sur l'élément qui défile vraiment (aucun : échec, pas de mesure à vide)
	const before = await tab.evaluate((link) => {
		let element: HTMLElement | null = link.parentElement;
		while (element) {
			const overflow = getComputedStyle(element).overflowY;
			if (
				['auto', 'scroll'].includes(overflow) &&
				element.scrollHeight > element.clientHeight + 40
			) {
				element.scrollTo(0, 120);
				(window as unknown as { __scroller: HTMLElement | null }).__scroller = element;
				return element.scrollTop;
			}
			element = element.parentElement;
		}
		window.scrollTo(0, 120);
		(window as unknown as { __scroller: HTMLElement | null }).__scroller = null;
		return window.scrollY;
	});
	expect(before, 'la page défile avant le clic').toBeGreaterThan(50);
	await tab.evaluate((link) => (link as HTMLElement).click());
	await expect.poll(() => page.url(), { timeout: 15_000 }).not.toBe(urlBefore);
	await page.waitForLoadState('networkidle');
	const sameDocument = await page.evaluate(
		() => (window as unknown as { __sansRechargement?: boolean }).__sansRechargement === true
	);
	expect(sameDocument, 'navigation dans la page (pas un chargement complet)').toBe(true);
	// Un instant de plus : la remise en haut, si elle a lieu, vient après le chargement des données
	await page.waitForTimeout(800);
	const after = await page.evaluate(() => {
		const scroller = (window as unknown as { __scroller: HTMLElement | null }).__scroller;
		return scroller?.isConnected ? scroller.scrollTop : window.scrollY;
	});
	return { before, after, urlBefore, urlAfter: page.url() };
}

test.describe('#2825 — onglets du prof sans retour en haut de page', () => {
	test.use({ viewport: SHORT_PHONE });

	test('#2825 — programme : changer d’onglet (vue) garde la position dans la page', async ({
		page
	}) => {
		await signIn(page, TEACHER);
		await gotoSettled(page, '/dashboard/teacher/programme');
		const tabs = page.locator('a[data-sveltekit-reset="false"]');
		expect(await tabs.count(), 'onglets du programme').toBeGreaterThan(1);
		const other = page.locator('a[data-sveltekit-reset="false"]:not([aria-current])').first();
		const result = await clickTabKeepingScroll(page, other);
		expect(result.urlAfter).not.toBe(result.urlBefore);
		expect(result.after, 'position après le clic').toBeGreaterThan(50);
	});

	test('#2825 — /games/leaderboards : changer de jeu ou de portée garde la position dans la page', async ({
		page
	}) => {
		await signIn(page, TEACHER);
		await gotoSettled(page, '/games/leaderboards');
		const tabs = page.locator('a[data-sveltekit-reset="false"]');
		expect(await tabs.count(), 'onglets des classements').toBeGreaterThan(2);
		const other = page.locator('a[data-sveltekit-reset="false"]:not([aria-current])').first();
		const result = await clickTabKeepingScroll(page, other);
		expect(result.urlAfter).not.toBe(result.urlBefore);
		expect(result.after, 'position après le clic').toBeGreaterThan(50);
	});
});

// ============================================================================
// Notification
// ============================================================================

test.describe('#2825 — clic sur une notification', () => {
	let title = '';

	test.afterEach(async () => {
		if (title) await sql(`delete from notifications where title = $1`, [title]);
	});

	/** Une notification pour le prof local, avec son lien ; rend son titre */
	async function seedNotification(actionUrl: string, kind: string): Promise<string> {
		title = `Verifs8 notif ${projectName()} ${kind}`;
		await sql(`delete from notifications where title = $1`, [title]);
		await sql(
			`insert into notifications
			   (title, message, type, priority, target_type, target_user_ids, action_url, action_label)
			 values ($1, 'Notification de vérification', 'info', 'normal', 'users', $2::uuid[], $3, 'Ouvrir')`,
			[title, [TEACHER_ID], actionUrl]
		);
		return title;
	}

	for (const [label, viewport] of [
		['ordinateur', DESKTOP],
		['téléphone', PHONE]
	] as const) {
		test.describe(label, () => {
			test.use({ viewport });

			test('#2825 — le clic ouvre la page du lien', async ({ page }) => {
				const notifTitle = await seedNotification('/dashboard/teacher/programme', 'lien');
				await signIn(page, TEACHER);
				await gotoSettled(page, '/dashboard/notifications');
				await page.getByRole('heading', { name: notifTitle, level: 3 }).click();
				await expect(page).toHaveURL(/\/dashboard\/teacher\/programme/);
				await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
			});

			test('#2825 — un lien périmé (route disparue) ne reste pas sans effet : la page inexistante s’affiche', async ({
				page
			}) => {
				const notifTitle = await seedNotification(
					'/dashboard/route-disparue-verifs8',
					'lien-perime'
				);
				await signIn(page, TEACHER);
				await gotoSettled(page, '/dashboard/notifications');
				await page.getByRole('heading', { name: notifTitle, level: 3 }).click();
				await expect(page).toHaveURL(/route-disparue-verifs8/);
				await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
			});
		});
	}
});

// ============================================================================
// Formulaire du cahier de texte : lien de consultation
// ============================================================================

test.describe('#2825 — formulaire du cahier de texte', () => {
	test.use({ viewport: DESKTOP });

	let classId: string | null = null;
	let tokensBefore = new Set<string>();

	test.afterEach(async () => {
		// Les liens créés par le test sont retirés : la classe retrouve son état d'avant (aucun lien)
		if (classId) {
			await removeCreatedTokens({ classId, tokensBefore: [...tokensBefore] });
			rmSync(reprisePath(projectName()), { force: true });
		}
	});

	test('#2825 — « Créer le lien » enregistre le lien et affiche son message, sans quitter la page de la classe', async ({
		page
	}) => {
		// Une classe du prof sans lien actif : l'état d'origine se rend en retirant le lien créé
		const rows = await sql<{ id: string }>(
			`select c.id from classes c
			 where c.is_active
			   and not exists (
			     select 1 from class_journal_share_tokens t
			     where t.class_id = c.id and t.is_active and (t.expires_at is null or t.expires_at > now()))
			 order by c.name limit 1`
		);
		expect(rows, 'une classe du prof sans lien actif').toHaveLength(1);
		classId = rows[0].id;
		tokensBefore = new Set(
			(
				await sql<{ id: string }>(`select id from class_journal_share_tokens where class_id = $1`, [
					classId
				])
			).map((row) => row.id)
		);
		// Sur disque avant toute création (écrit à côté puis renommé)
		const path = reprisePath(projectName());
		mkdirSync('.captures/verifs', { recursive: true });
		writeFileSync(
			`${path}.tmp`,
			JSON.stringify({ classId, tokensBefore: [...tokensBefore] } satisfies Reprise)
		);
		renameSync(`${path}.tmp`, path);
		await signIn(page, TEACHER);
		await gotoSettled(page, `/dashboard/teacher/cahier-texte?class=${classId}`);
		await expect(page.getByText(/Aucun lien actif/)).toBeVisible();
		await page.getByRole('button', { name: 'Créer le lien' }).click();
		// Le message : le lien actif et sa date d'expiration
		await expect(page.getByText(/Il permet de/)).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(/Expire le/)).toBeVisible();
		await expect(page.getByText(/Aucun lien actif/)).toHaveCount(0);
		// La page de la classe reste affichée (SvelteKit 3 : l'adresse de l'action ne remplace pas la page)
		expect(new URL(page.url()).searchParams.get('class')).toBe(classId);
		expect(new URL(page.url()).pathname).toBe('/dashboard/teacher/cahier-texte');
		// Enregistré en base : un lien actif, un seul de plus
		const after = await sql<{ id: string }>(
			`select id from class_journal_share_tokens where class_id = $1 and is_active`,
			[classId]
		);
		expect(after.filter((row) => !tokensBefore.has(row.id))).toHaveLength(1);
		// « Révoquer » : le message d'absence de lien revient, toujours sur la même page
		await page.getByRole('button', { name: 'Révoquer' }).click();
		await expect(page.getByText(/Aucun lien actif/)).toBeVisible({ timeout: 15_000 });
		expect(new URL(page.url()).searchParams.get('class')).toBe(classId);
	});
});
