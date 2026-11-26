import {
	expect,
	test,
	type Browser,
	type BrowserContext,
	type Page,
	type TestInfo
} from '@playwright/test';
import { assertLocalServerEnv, login, sql } from './helpers/carnet';
import { collectErrors, expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';

/**
 * Base locale remplie (`pnpm db:seed-riche`) — paquet 9 du tri
 * =============================================================
 *
 * Reprend les lignes #3012 (images), #3011 (échanges et famille), #2986 (jeux), #2980 (suivi),
 * #2977 (contenu), #2981 (compteurs de « Mes révisions »), #2989 (Palotins du prof) de
 * `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5176 pnpm test:verifs e2e/verifs/base-locale-paquet9.spec.ts [--project iphone]
 *
 * LECTURE SEULE : aucune écriture en base, aucune partie jouée, aucun échange conclu, aucune
 * déconnexion du prof ni de l'admin (les sessions ne sont jamais révoquées : le contexte est
 * simplement fermé). Compte élève : `eleve02@local.test`, qu'on ne modifie pas → aucun verrou.
 *
 * Chaque page : elle se charge (pas de 4xx/5xx, pas d'erreur de console), les données annoncées
 * par la ligne sont VISIBLES, et rien ne déborde au téléphone.
 *
 * Non jouable : « la sortie du seed affiche … » (le seed est déjà joué, on ne le relance pas).
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

// ============================================================================
// CONSTANTES
// ============================================================================

const ELEVE02 = { email: 'eleve02@local.test', password: 'local-eleve' };
const TEACHER = { email: 'teacher@local.test', password: 'local-teacher' };
const ADMIN = { email: 'admin@local.test', password: 'local-admin' };
const ELEVE02_ID = '5eed0000-0000-4000-8000-000000000002';
/** « 1SPE 2 » : la classe de l'année, six élèves « Élève NN » */
const CLASSE = '25f632f6-99a4-42ff-898a-fdb4d85ac487';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const WAIT = 30_000;
/** Image absente en prod aussi (#3012) et cartes Mathémo (images statiques absentes, § Doutes) */
const IMAGES_ABSENTES = /2048-bomb-3|mathemo-/;
const ADMIN_BUCKETS = [
	'question-images',
	'exercise-images',
	'vip-card-images',
	'parody-evaluations'
];

// ============================================================================
// FONCTIONS
// ============================================================================

interface Session {
	context: BrowserContext;
	page: Page;
	errors: { errors: string[] };
	/** Hôtes non locaux appelés pour une image */
	foreignImages: string[];
}

/** Contexte neuf aux réglages du projet (téléphone compris), connecté (ou anonyme si `compte` est null) */
async function openSession(
	browser: Browser,
	info: TestInfo,
	compte: { email: string; password: string } | null
): Promise<Session> {
	const context = await browser.newContext(info.project.use);
	const page = await context.newPage();
	const errors = collectErrors(page);
	const foreignImages: string[] = [];
	page.on('request', (request) => {
		if (request.resourceType() !== 'image') return;
		const url = new URL(request.url());
		if (url.protocol.startsWith('http') && !LOCAL_HOSTS.has(url.hostname)) {
			foreignImages.push(request.url());
		}
	});
	if (compte) {
		// Le serveur partagé peut être lent : trois essais de connexion
		let last: unknown;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				await login(page, compte.email, compte.password);
				last = undefined;
				break;
			} catch (error) {
				last = error;
				await context.clearCookies();
			}
		}
		if (last) throw last;
	}
	return { context, page, errors, foreignImages };
}

/** Erreurs de la page, sans le bruit des requêtes de fond coupées */
function realErrors(session: Session): string[] {
	// Écartés : le bruit de la journalisation limitée (429), les requêtes de fond coupées par la
	// navigation (WebKit : « Load failed », Chromium : « Failed to fetch »), et les images documentées
	// absentes (#3012 : `2048-bomb-3` absente en prod aussi, 4 cartes Mathémo sans image)
	return session.errors.errors.filter(
		(e) =>
			!e.includes('/api/errors/log') &&
			!e.includes('BugReportsConfigStore') &&
			!/(TypeError: (Load failed|Failed to fetch)|status: 500, error: Load failed)/.test(e) &&
			// WebKit : requête de fond coupée par la navigation, signalée comme « access control checks »
			!/^exception : .*due to access control checks/.test(e) &&
			// Serveur de dev : rechargement d'un module en cours de page
			!/Importing a module script failed|\[vite\]/.test(e) &&
			!(/^HTTP 4\d\d/.test(e) && IMAGES_ABSENTES.test(e))
	);
}

/** Texte de la page (espaces rassemblés) */
async function bodyText(page: Page): Promise<string> {
	return (await page.locator('body').innerText()).replace(/\s+/g, ' ');
}

/** Le texte attendu est visible (espaces rassemblés) ; en cas d'échec, le message montre ce que la page affichait */
async function expectText(page: Page, expected: RegExp | string, label: string): Promise<void> {
	const re =
		typeof expected === 'string'
			? new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
			: expected;
	try {
		await expect.poll(() => bodyText(page), { timeout: WAIT }).toMatch(re);
	} catch (error) {
		const text = (await bodyText(page)).slice(0, 1500);
		throw new Error(
			`${label} : « ${String(expected)} » absent. La page affiche : ${text}\n${error}`
		);
	}
}

/**
 * Charge la page : pas d'erreur HTTP. Le serveur de dev partagé rend parfois la page d'erreur de
 * SvelteKit (« Réessayer ») au premier chargement : on le note, puis on recharge (deux fois au plus)
 */
async function go(page: Page, url: string) {
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			return await gotoSettled(page, url);
		} catch (error) {
			// Le serveur de dev partagé recharge parfois la page en cours (net::ERR_ABORTED) : on le note et on rejoue
			if (!/ERR_ABORTED|sans cesse interrompue/.test(String(error)) || attempt === 3) throw error;
			await page.waitForTimeout(2000);
			test.info().annotations.push({
				type: 'constat',
				description: `${url} : chargement interrompu (ERR_ABORTED / navigation interrompue), essai n°${attempt}`
			});
		}
	}
	throw new Error(`${url} : chargement impossible`);
}

async function visit(session: Session, url: string): Promise<void> {
	let response = await go(session.page, url);
	for (let attempt = 1; attempt <= 2; attempt++) {
		const pageErreur = await session.page
			.getByRole('button', { name: 'Réessayer' })
			.isVisible()
			.catch(() => false);
		if (!pageErreur) break;
		test.info().annotations.push({
			type: 'constat',
			description: `${url} : page d’erreur (« Réessayer ») au chargement n°${attempt}`
		});
		session.errors.errors.length = 0;
		response = await go(session.page, url);
	}
	expect(response?.status(), `${url} : statut`).toBeLessThan(400);
	await session.page.waitForTimeout(800);
}

/** Ouvre un onglet ; le clic est rejoué tant que la page n'est pas hydratée (le texte attendu paraît) */
async function openTab(page: Page, name: RegExp, expected: RegExp | null): Promise<void> {
	await expect(async () => {
		await page
			.getByRole('tab', { name })
			.or(page.getByRole('button', { name }))
			.first()
			.click({ timeout: 5000 });
		if (expected) await expect.poll(() => bodyText(page), { timeout: 4000 }).toMatch(expected);
	}).toPass({ timeout: 40_000 });
}

/** Au téléphone (≤ 500 px), rien ne dépasse de la page */
async function expectFits(page: Page, label: string): Promise<void> {
	const width = page.viewportSize()?.width ?? 1280;
	if (width <= 500) await expectNoHorizontalOverflow(page, label);
}

/** Amène chaque image dans la fenêtre, une à une : les images paresseuses se chargent (défilement interne compris) */
async function scrollThrough(page: Page): Promise<void> {
	const count = await page.evaluate(() => document.images.length);
	for (let i = 0; i < count; i++) {
		const needsLoad = await page.evaluate((index) => {
			const img = document.images[index];
			if (!img || (img.complete && img.naturalWidth > 0)) return false;
			img.scrollIntoView({ block: 'center' });
			return true;
		}, i);
		if (needsLoad) await page.waitForTimeout(250);
	}
}

/** Les images de la page : lesquelles sont chargées (`naturalWidth > 0`), lesquelles cassées (les masquées ne comptent pas) */
async function imageReport(
	page: Page,
	srcFilter: RegExp | null
): Promise<{ loaded: string[]; broken: string[] }> {
	await scrollThrough(page);
	// Les images en cours de chargement finissent (8 s au plus)
	await page
		.waitForFunction(() => Array.from(document.images).every((img) => img.complete), null, {
			timeout: 8000
		})
		.catch(() => undefined);
	const all = await page.evaluate(() =>
		Array.from(document.images)
			.filter((img) => img.getClientRects().length > 0)
			.map((img) => ({
				src: img.currentSrc || img.src,
				ok: img.complete && img.naturalWidth > 0
			}))
	);
	const kept = srcFilter ? all.filter((i) => srcFilter.test(i.src)) : all;
	return {
		loaded: kept.filter((i) => i.ok).map((i) => i.src),
		broken: kept.filter((i) => !i.ok).map((i) => i.src)
	};
}

/** Le chiffre qui suit un libellé dans un texte (« À réviser 24 » → 24) */
function numberAfter(text: string, label: RegExp): number {
	const match = new RegExp(`${label.source}\\s*:?\\s*(\\d+)`, 'i').exec(text);
	if (!match)
		throw new Error(`« ${label.source} » + nombre introuvable dans : ${text.slice(0, 600)}`);
	return Number(match[1]);
}

/** Marque (`data-p9-deck`) chaque carte de paquet visible de « Mes révisions » et rend son titre et ses compteurs */
async function markDeckCards(
	page: Page
): Promise<{ index: number; title: string; text: string }[]> {
	return page.evaluate(() => {
		const wanted = [/Total/, /À réviser/, /Nouvelles/, /En cours/];
		const has = (el: Element) => wanted.every((re) => re.test((el as HTMLElement).innerText));
		const found: { index: number; title: string; text: string }[] = [];
		for (const el of Array.from(document.querySelectorAll('main *'))) {
			if (!has(el) || el.getClientRects().length === 0) continue;
			if (Array.from(el.children).some((child) => has(child))) continue;
			const card = el.closest('[data-slot="card"]') as HTMLElement | null;
			if (!card || card.hasAttribute('data-p9-deck')) continue;
			card.setAttribute('data-p9-deck', String(found.length));
			found.push({
				index: found.length,
				title:
					card.innerText
						.split('\n')
						.find((l) => l.trim().length > 0)
						?.trim() ?? '',
				text: (el as HTMLElement).innerText
			});
		}
		return found;
	});
}

/** Nombre au bout d'un test : fermer le contexte sans déconnexion */
async function closeSession(session: Session | undefined): Promise<void> {
	await session?.context.close().catch(() => undefined);
}

// ============================================================================
// DÉCOR : le seed est-il bien celui qu'annoncent les lignes ?
// ============================================================================

test.describe('Base locale — le décor en base', () => {
	test.beforeAll(() => assertLocalServerEnv());

	test('#3012 : les 394 images du contenu sont dans le stockage local (394 la première fois)', async () => {
		// Lu dans `scripts/db-seed-riche/index.ts` : « Images : N fichier(s) copié(s), M déjà là » ;
		// le nombre 394 se retrouve dans le stockage local (254 + 95 + 44 + 1)
		const rows = await sql<{ bucket_id: string; n: string }>(
			`select bucket_id, count(*) as n from storage.objects
			  where bucket_id = any($1) group by 1`,
			[ADMIN_BUCKETS]
		);
		const total = rows.reduce((sum, r) => sum + Number(r.n), 0);
		expect(total, JSON.stringify(rows)).toBe(394);
	});

	test('#2977 : 675 entrées de dictionnaire, 4 tournois de démineur sans description, 13 styles de fiches', async () => {
		const [dico] = await sql<{ n: string }>('select count(*) as n from dictionary_entries');
		expect(Number(dico.n)).toBe(675);
		const [tournois] = await sql<{ n: string }>(
			`select count(*) as n from minesweeper_tournaments where coalesce(description, '') = ''`
		);
		expect(Number(tournois.n), 'tournois sans description').toBe(4);
		const [styles] = await sql<{ n: string }>(
			'select count(*) as n from worksheet_styles where owner_id is null'
		);
		expect(Number(styles.n)).toBe(13);
	});

	test('#2986 : 8 décorations de Mathoux (4 cœurs, 4 nœuds papillon) chez quelques élèves', async () => {
		const rows = await sql<{ decoration: string; n: string }>(
			`select decoration, count(distinct student_id) as n from student_mathou_decorations group by 1`
		);
		const byKind = Object.fromEntries(rows.map((r) => [r.decoration, Number(r.n)]));
		expect(byKind).toEqual({ heart: 4, bow_tie: 4 });
	});
});

// ============================================================================
// #3012 — IMAGES (anonyme pour la question, élève pour le reste)
// ============================================================================

test.describe('#3012 — images du contenu, sans visiteur connecté', () => {
	let session: Session;
	test.beforeAll(async ({ browser }, info) => {
		info.setTimeout(120_000);
		session = await openSession(browser, info, null);
	});
	test.afterAll(() => closeSession(session));

	test('#3012 : une question à image (« Repérer sur une demi-droite graduée ») affiche son image, tirée du stockage local', async () => {
		const query = encodeURIComponent(
			encodeURIComponent(
				JSON.stringify([
					{ templateId: 'd6268317-c78c-4404-a474-634a0b89553a', quantity: 1, delay: 10 }
				])
			)
		);
		await visit(session, `/automaths/test?modeles=${query}&mode=interactive`);
		// Le bouton répond une fois la page hydratée : on clique jusqu'à voir la question
		await expect(async () => {
			const start = session.page.getByRole('button', { name: /C'est parti/ });
			if (await start.isVisible()) await start.click();
			await expect(session.page.locator('img[src*="question-images"]').first()).toBeVisible({
				timeout: 3000
			});
		}).toPass({ timeout: 40_000 });
		const report = await imageReport(session.page, /question-images/);
		expect(report.broken, 'images cassées').toEqual([]);
		expect(report.loaded.length, 'image de la question').toBeGreaterThan(0);
		expect(report.loaded[0]).toMatch(/\/storage\/v1\/object\/public\/question-images\//);
		expect(session.foreignImages, 'image lue hors du serveur local').toEqual([]);
		await expectFits(session.page, 'question à image');
	});
});

test.describe('#3012 — images du contenu, compte élève', () => {
	let session: Session;
	test.beforeAll(async ({ browser }, info) => {
		info.setTimeout(180_000);
		assertLocalServerEnv();
		session = await openSession(browser, info, ELEVE02);
	});
	test.afterAll(() => closeSession(session));
	test.afterEach(() => {
		expect(session.foreignImages, 'image lue hors du serveur local').toEqual([]);
	});

	test('#3012 : un exercice illustré affiche ses images (« Le stand de la fête foraine », assigné à Élève 02)', async () => {
		const url = '/dashboard/student/exercises/0151950f-3d0b-4d0b-bc0b-30085f27e0f9';
		const response = await go(session.page, url);
		await session.page.waitForTimeout(1500);
		// E78 (corrigé) : la page de l'exercice assigné répondait 404, la règle de lecture
		// d'`exercises` ne regardait que les fiches, jamais `exercise_assignments`
		expect(response?.status()).toBeLessThan(400);
		const report = await imageReport(session.page, /exercise-images/);
		expect(report.loaded.length, 'images de l’exercice').toBeGreaterThan(0);
		expect(report.broken).toEqual([]);
	});

	test('#3012 : le démineur affiche ses images (bannière, trois niveaux) ; les images des pouvoirs existent', async () => {
		await visit(session, '/games/minesweeper');
		await expectText(session.page, /Démineur/, 'page du démineur');
		const report = await imageReport(
			session.page,
			/minesweeper-|banner-minesweeper|vip-card-images/
		);
		expect(report.broken, 'images cassées').toEqual([]);
		expect(report.loaded.length, 'bannière + 3 niveaux').toBeGreaterThanOrEqual(4);
		await expectFits(session.page, 'démineur');
		// Les images des pouvoirs (cartes VIP du démineur) sont servies par le stockage local
		for (const name of ['minesweeper-hint', 'minesweeper-detector', 'minesweeper-freeze']) {
			const res = await session.context.request.get(
				`/__dev/supabase/storage/v1/object/public/vip-card-images/${name}@0.5x.webp`
			);
			expect(res.status(), name).toBe(200);
			expect(res.headers()['content-type'], name).toMatch(/image\//);
		}
	});

	test('#3012 : 2048 se charge sans erreur et ses images de pouvoirs sont servies', async () => {
		await visit(session, '/games/2048').catch(async (error: unknown) => {
			// Constat : le premier chargement peut être interrompu (ERR_ABORTED) ; on le note, puis on recharge
			if (!String(error).includes('ERR_ABORTED')) throw error;
			test.info().annotations.push({
				type: 'constat',
				description: 'premier chargement de /games/2048 interrompu (net::ERR_ABORTED)'
			});
			await visit(session, '/games/2048');
		});
		// Constat des essais : le premier chargement tombe sur la page d'erreur de SvelteKit
		// (« Réessayer », erreur client `appendChild` / HierarchyRequestError) ; `visit` le note et recharge
		const erreurAuPremierChargement = test
			.info()
			.annotations.some(
				(a) => a.type === 'constat' && /games\/2048.*page d’erreur/.test(a.description ?? '')
			);
		if (erreurAuPremierChargement) {
			test.fail(
				true,
				'ÉCART : /games/2048 tombe sur la page d’erreur (« Réessayer ») au premier chargement (erreur client appendChild)'
			);
		}
		expect(erreurAuPremierChargement, 'page d’erreur au premier chargement de /games/2048').toBe(
			false
		);
		await expectText(session.page, /Nouvelle Partie/, 'page 2048');
		await expectText(session.page, /Vision/, 'pouvoirs');
		const report = await imageReport(session.page, /vip-card-images/);
		expect(report.broken, 'images de pouvoirs cassées').toEqual([]);
		for (const name of [
			'2048-undo',
			'2048-merge',
			'2048-joker',
			'2048-vision',
			'2048-freeze-spawn',
			'2048-bomb',
			'2048-bomb-2'
		]) {
			const res = await session.context.request.get(
				`/__dev/supabase/storage/v1/object/public/vip-card-images/${name}@0.5x.webp`
			);
			expect(res.status(), name).toBe(200);
		}
		expect(realErrors(session), 'erreurs de la page 2048').toEqual([]);
		await expectFits(session.page, '2048');
	});

	test('#3012 : les presques-évaluations s’affichent, l’aperçu et le téléchargement sont servis par le stockage local', async () => {
		await visit(session, '/presques-evaluations');
		await expectText(session.page, /equation differentielle - integration/, 'parodie');
		const links = await session.page
			.locator('main a[href*="parody-evaluations"]')
			.evaluateAll((a) => a.map((x) => (x as HTMLAnchorElement).href));
		expect(links.length, 'aperçu + téléchargement').toBeGreaterThanOrEqual(2);
		for (const href of links) {
			expect(LOCAL_HOSTS.has(new URL(href).hostname), href).toBe(true);
			const res = await session.context.request.get(href);
			expect(res.status(), href).toBe(200);
			expect(res.headers()['content-type'], href).toMatch(/pdf|octet-stream/);
		}
		await expectFits(session.page, 'presques-évaluations');
	});

	test('#3012 : l’inventaire affiche les images des cartes VIP', async () => {
		await visit(session, '/dashboard/student/inventory');
		await expectText(session.page, /Mon Inventaire/, 'inventaire');
		const report = await imageReport(session.page, /vip-card-images|images\/vip-cards/);
		expect(report.loaded.length, 'cartes VIP').toBeGreaterThanOrEqual(2);
		expect(report.broken.filter((s) => !IMAGES_ABSENTES.test(s))).toEqual([]);
		await expectFits(session.page, 'inventaire');
	});
});

// ============================================================================
// #3011 · #2986 · #2980 · #2981 — COMPTE ÉLÈVE
// ============================================================================

test.describe('Base locale — compte élève (Élève 02), lecture seule', () => {
	let session: Session;
	test.beforeAll(async ({ browser }, info) => {
		info.setTimeout(180_000);
		assertLocalServerEnv();
		session = await openSession(browser, info, ELEVE02);
	});
	test.afterAll(() => closeSession(session));

	async function check(url: string, texts: (RegExp | string)[], label: string): Promise<void> {
		session.errors.errors.length = 0;
		await visit(session, url);
		for (const text of texts) await expectText(session.page, text, label);
		expect(realErrors(session), `${label} : erreurs de la page`).toEqual([]);
		await expectFits(session.page, label);
	}

	test('#3011 : Marché — annonces, échanges conclus et un en cours', async () => {
		await visit(session, '/dashboard/student/marketplace');
		await expectText(session.page, /Marketplace/, 'marché');
		// Annonces
		await openTab(session.page, /Annonces/, /Prix|Acheter|annonce/i);
		const [listings] = await sql<{ n: string }>(
			`select count(*) as n from marketplace_listings where status = 'active'`
		);
		expect(Number(listings.n), 'annonces actives en base').toBeGreaterThan(0);
		const annonces = await bodyText(session.page);
		expect(annonces).not.toMatch(/Aucune annonce/);
		// Activité : échanges conclus et en cours
		await openTab(session.page, /Activité/, /Votre tour|Complété/);
		const activite = await bodyText(session.page);
		expect(activite, 'échange en cours (« Votre tour »)').toMatch(/Votre tour/);
		expect(activite, 'échange conclu (« Complété »)').toMatch(/Complété/);
		await expectText(session.page, /En attente/, 'annonce en attente (Activité)');
		await expectFits(session.page, 'marché');
	});

	test('#3011 : Cahier de texte — la semaine et le travail à faire', async () => {
		await check(
			'/dashboard/student/cahier-texte',
			['Cahier de Texte', 'Travail a faire', /Fiche de révision à finir/],
			'cahier de texte'
		);
	});

	test('#3011 : Carnet de liaison — régularité et semaines', async () => {
		await check(
			'/dashboard/student/carnet',
			['Mon carnet de liaison', /Régularité/, /semaine du \d+ \w+\./],
			'carnet'
		);
	});

	test('#3011 : Notifications — la notification du prof', async () => {
		await check(
			'/dashboard/notifications',
			['Notifications', 'Nouvelle fiche disponible', /1 \/ 1 affichées/],
			'notifications'
		);
	});

	test('#2986 : Démineur — statistiques et succès remplis', async () => {
		await check(
			'/dashboard/student/minesweeper/stats',
			[
				/Classement général : #1/,
				/Débutant Parties jouées [1-9]\d*/,
				/Victoires [1-9]\d*/,
				/Intermédiaire Parties jouées [1-9]\d*/,
				/Expert Parties jouées [1-9]\d*/
			],
			'statistiques du démineur'
		);
		await check(
			'/dashboard/student/minesweeper/achievements',
			[/Succès \([1-9]\d*\/\d+\)/, /[1-9]\d*% complété/, /Débloqué le \d+ \w+ 2026/],
			'succès du démineur'
		);
	});

	test('#2986 : « Tournoi de démineur de novembre » en cours, avec la position de l’élève', async () => {
		await check(
			'/dashboard/student/minesweeper/tournaments',
			[
				'Tournoi de démineur de novembre',
				/Tournois en cours \(1\)/,
				/Temps restant/,
				/MES STATISTIQUES/i,
				/[1-9]\d*\s*Parties/,
				/[1-9]\d*\s*pts/
			],
			'tournoi'
		);
		await session.page.getByText('Tournoi de démineur de novembre').first().click();
		await session.page.waitForURL(/\/tournaments\/[0-9a-f-]{36}/, { timeout: WAIT });
		await expectText(session.page, /Classement|Rang|Participants/i, 'page du tournoi');
		const text = await bodyText(session.page);
		expect(text, 'position de l’élève dans le classement').toMatch(/Anouk|\bVous\b|#\d+|\b1er\b/);
		await expectFits(session.page, 'page du tournoi');
	});

	test('#2986 : Classements — 2048, Mathémo, Démineur (lignes de classement)', async () => {
		await check(
			'/games/leaderboards',
			['Classements', /Anouk/, /[1-9][\d\s\u00a0\u202f]*/],
			'classements 2048'
		);
		for (const jeu of [/Mathémo/, /Démineur/]) {
			await session.page.getByText(jeu).first().click();
			await session.page.waitForTimeout(1500);
			const text = await bodyText(session.page);
			expect(text, `classement ${jeu.source} : des joueurs`).toMatch(/Élève \d+|Basile|Anouk/);
			expect(text, `classement ${jeu.source}`).not.toMatch(/Aucun (score|joueur|classement)/i);
		}
		await expectFits(session.page, 'classements');
	});

	test('#2986 : La Chatterie — des Mathoux', async () => {
		await check(
			'/dashboard/student/chatterie',
			[/La Chatterie de/, /\d+ Mathoux, \d+ en sieste/, /à découvrir/],
			'chatterie'
		);
	});

	test('#2986 : Inventaire — cartes VIP', async () => {
		await check(
			'/dashboard/student/inventory',
			['Mon Inventaire', /[1-9]\d* \/ \d+ cartes VIP/, 'Coup Double'],
			'inventaire'
		);
	});

	test('#2986 : Énigmes — « Les trois chats de la chatterie »', async () => {
		await check(
			'/dashboard/student/riddles',
			['Énigmes assignées', 'Les trois chats de la chatterie', /[1-9]\d* croquettes/],
			'énigmes'
		);
	});

	test('#2980 : Mes contrôles (une note), Ma progression, Mon travail, progression Python', async () => {
		await check(
			'/dashboard/student/assessments',
			['Mes contrôles', 'Essai évaluation', '20/20'],
			'mes contrôles'
		);
		await check(
			'/dashboard/student/progression',
			['Ma progression', /Programme de 1ère spécialité maths — [1-9]\d* notions/, /Second degré/],
			'ma progression'
		);
		await check(
			'/dashboard/student/work',
			['Mon travail', /[1-9]\d* éléments au total/, /Fait cette semaine \([1-9]\d*\)/],
			'mon travail'
		);
		await check(
			'/python-exercises/my-progress',
			['Ma progression', /Corvées 4/, /100 % maîtrisé/, /Alerte chlore/],
			'progression Python'
		);
	});

	test('#2980 : Mes révisions — 3 paquets', async () => {
		await check(
			'/dashboard/revisions',
			['Mes Révisions', /Total Decks 3/, 'Automatismes de la semaine', 'Formules à connaître'],
			'mes révisions'
		);
	});

	test('#2981 : Mes révisions — « À réviser » du haut = somme des paquets ; chaque paquet d’accord avec le paquet ouvert', async () => {
		await visit(session, '/dashboard/revisions');
		await expectText(session.page, /Total Decks 3/, 'révisions');
		const text = await bodyText(session.page);
		const haut = numberAfter(text, /Total Cartes \d+ Dans tous vos decks À Réviser/);
		expect(haut, '« À Réviser » en haut de page ne doit pas être 0').toBeGreaterThan(0);

		// Les cartes de paquets : le plus petit élément qui porte « Total », « À réviser », « Nouvelles »
		// et « En cours » ; on le marque pour pouvoir l'ouvrir ensuite par un clic
		const cards = await markDeckCards(session.page);
		const byDeck = new Map<string, string>();
		const titles = new Map<string, string>();
		for (const c of cards) {
			byDeck.set(String(c.index), c.text.replace(/\s+/g, ' '));
			titles.set(String(c.index), c.title);
		}
		expect(byDeck.size, `paquets trouvés : ${JSON.stringify(cards)}`).toBe(3);

		let somme = 0;
		const comptes = new Map<
			string,
			{ total: number; aReviser: number; nouvelles: number; enCours: number }
		>();
		for (const [href, cardText] of byDeck) {
			const c = {
				total: numberAfter(cardText, /Total/),
				aReviser: numberAfter(cardText, /À réviser/),
				nouvelles: numberAfter(cardText, /Nouvelles/),
				enCours: numberAfter(cardText, /En cours/)
			};
			comptes.set(href, c);
			somme += c.aReviser;
		}
		expect(
			somme,
			`somme des paquets (${[...comptes.values()].map((c) => c.aReviser)}) = « À Réviser » du haut`
		).toBe(haut);

		for (const [index, c] of comptes) {
			await visit(session, '/dashboard/revisions');
			await expectText(session.page, /Total Decks 3/, 'révisions');
			// On retrouve la carte par son titre (premier mot de sa première ligne)
			const titre = titles.get(index) ?? '';
			expect(titre, 'titre du paquet').not.toBe('');
			// Mêmes cartes, même ordre après le rechargement
			const again = await markDeckCards(session.page);
			expect(
				again.map((c) => c.title),
				'ordre des paquets'
			).toEqual([...titles.values()]);
			// Le texte de la carte (bouton « Réviser maintenant (N) ») avant de l'ouvrir
			const carte = (
				await session.page.locator(`[data-p9-deck="${index}"]`).first().innerText()
			).replace(/\s+/g, ' ');
			await session.page
				.locator(`[data-p9-deck="${index}"]`)
				.getByText(titre, { exact: false })
				.first()
				.click();
			await session.page.waitForURL(/\/dashboard\/revisions\/decks\//, { timeout: WAIT });
			await expectText(session.page, /\d+ cartes/, `paquet ${titre}`);
			const deck = await bodyText(session.page);
			// Le paquet ouvert annonce son nombre de cartes ; la carte du paquet offre « Réviser maintenant (N) »
			expect(
				Number(/(\d+) cartes/.exec(deck)?.[1]),
				`${titre} : cartes du paquet ouvert = Total`
			).toBe(c.total);
			expect(
				Number(/Réviser maintenant \((\d+)\)/.exec(carte)?.[1]),
				`${titre} : « Réviser maintenant » = À réviser`
			).toBe(c.aReviser);
			expect(
				c.nouvelles + c.enCours,
				`${titre} : Nouvelles + En cours <= Total`
			).toBeLessThanOrEqual(c.total);
			await expectFits(session.page, `paquet ${titre}`);
		}
	});

	test('#2989 : l’accueil de l’élève se charge (inchangé : pas de comparaison d’écran possible)', async () => {
		await check('/dashboard', [/Prof Local|Mon Cabinet|Mon cabinet/], 'accueil élève');
	});
});

// ============================================================================
// COMPTE PROF
// ============================================================================

test.describe('Base locale — compte prof, lecture seule', () => {
	let session: Session;
	test.beforeAll(async ({ browser }, info) => {
		info.setTimeout(180_000);
		assertLocalServerEnv();
		session = await openSession(browser, info, TEACHER);
	});
	test.afterAll(() => closeSession(session));

	async function check(url: string, texts: (RegExp | string)[], label: string): Promise<void> {
		session.errors.errors.length = 0;
		await visit(session, url);
		for (const text of texts) await expectText(session.page, text, label);
		expect(realErrors(session), `${label} : erreurs de la page`).toEqual([]);
		await expectFits(session.page, label);
	}

	test('#3011 : Modération › gestion — un signalement en attente, un élève muet', async () => {
		await check(
			'/dashboard/teacher/moderation/gestion',
			[/1 signalement en attente de traitement/, /Inapproprié/, /Anouk Fictivea/],
			'modération'
		);
		await openTab(session.page, /Restrictions actives/, /Liste des restrictions/);
		const [muet] = await sql<{ n: string }>(
			`select count(*) as n from user_restrictions
			  where restriction_type in ('mute', 'timeout') and (expires_at is null or expires_at > now())`
		);
		// Constat : la restriction « mute » du seed dure 24 h après sa pose, puis expire
		const [expirees] = await sql<{ n: string }>(
			`select count(*) as n from user_restrictions where restriction_type = 'mute' and expires_at <= now()`
		);
		if (Number(muet.n) === 0) {
			expect(Number(expirees.n), 'restriction du seed expirée').toBeGreaterThanOrEqual(1);
			await expectText(session.page, 'Aucune restriction active', 'symptôme');
			test.fail(
				true,
				'Le seed pose le mute avec une fin à +24 h : après un jour, plus aucun élève muet'
			);
		}
		expect(Number(muet.n), 'un élève muet (restriction non expirée)').toBeGreaterThanOrEqual(1);
		expect(await bodyText(session.page), 'un élève muet visible').not.toMatch(
			/Aucune restriction/i
		);
	});

	test('#3011 : Statistiques du tuteur', async () => {
		await check(
			'/dashboard/tutor-stats',
			['Statistiques du Tuteur IA', /Conversations 4/, /Galopins actifs 4/, /Score d'effort moyen/],
			'tuteur'
		);
	});

	test('#3011 : Consentements — 13 concernés, 4 accordés, 8 en période de grâce, 1 en attente', async () => {
		await check(
			'/dashboard/teacher/consent',
			[
				/13 Galopins concernés/,
				/4 Consentements accordés/,
				/8 En période de grâce/,
				/1 En attente/
			],
			'consentements'
		);
	});

	test('#3011 : une classe › Carnet — parents confirmé, en attente, refus', async () => {
		await check(
			`/dashboard/teacher/classes/${CLASSE}/carnet`,
			['Carnet de liaison — 1SPE 2', /Quand prévenir les parents/],
			'carnet de la classe'
		);
		const text = await bodyText(session.page);
		expect(text, 'parent confirmé').toMatch(/Confirmée/);
		expect(text, 'parent en attente').toMatch(/En attente de confirmation/);
		expect(text, 'parent refus').toMatch(/Je ne suis pas le parent de cet élève/);
	});

	test('#3011 : Cahier de texte et Avancement de la classe', async () => {
		await check(
			'/dashboard/teacher/cahier-texte',
			['Cahier de Texte', /1SPE 1/, /Lien de consultation/],
			'cahier de texte'
		);
		await check(
			'/dashboard/teacher/avancement',
			['Avancement du programme', /Proportionnalité 0\/2/, /Fonctions 0\/24/],
			'avancement'
		);
	});

	test('#3011 : Organisation › tableau « Organisation de la classe »', async () => {
		await check(
			'/organisation/kanban',
			['Mes tableaux Kanban', 'Organisation de la classe', /3 colonnes · 10 cartes/],
			'organisation'
		);
		await session.page.getByText('Organisation de la classe').first().click();
		await session.page.waitForURL(/\/kanban\/[0-9a-f-]{36}/, { timeout: WAIT });
		await expectText(session.page, /Organisation de la classe/, 'tableau');
		await expectFits(session.page, 'tableau Kanban');
	});

	test('#2986 : Gamification › Mathoux — compteurs par classe', async () => {
		await check(
			'/dashboard/teacher/gamification/mathoux',
			['Mathoux des élèves', /1SPE 2\s*6 élèves · 51 Mathoux/, /2DE 3\s*6 élèves · 71 Mathoux/],
			'Mathoux'
		);
	});

	test('#2986 : Récompenses › Demandes d’activation VIP — 1 demande d’Élève 02', async () => {
		await check(
			'/dashboard/teacher/gamification/rewards',
			['Gestion des Recompenses', /Demandes d'activation VIP\s*1/],
			'récompenses'
		);
		await openTab(session.page, /Demandes d'activation VIP/, /Demandes en attente/);
		// L'élève 02 s'appelle « Anouk Fictivea » à l'écran (comme dans son Journal)
		await expectText(session.page, /Anouk Fictivea\s+Détecteur/, 'demande d’Élève 02');
	});

	test('#2986 : Démineur › tournois — classement du tournoi', async () => {
		await check(
			'/dashboard/teacher/minesweeper/tournaments',
			['Tournoi de démineur de novembre', /En cours 1/, /Termines 4/, /38 participants/],
			'tournois du prof'
		);
		await session.page.getByText('Tournoi de démineur de novembre').first().click();
		await session.page.waitForURL(/\/tournaments\/[0-9a-f-]{36}/, { timeout: WAIT });
		await expectText(session.page, /Classement|Rang|Participants/i, 'page du tournoi');
		const text = await bodyText(session.page);
		expect(text, 'classement : des élèves').toMatch(/Élève \d+|Anouk/);
		await expectFits(session.page, 'tournoi du prof');
	});

	test('#2986 : un élève › Journal — gidouilles, cartes, succès', async () => {
		await check(
			`/dashboard/teacher/students/${ELEVE02_ID}/journal`,
			[
				'Journal de Anouk Fictivea',
				/Chatterie : naissance de/,
				/Gidouilles/,
				/Cartes VIP/,
				/Succès/
			],
			'journal'
		);
	});

	test('#2977 : tournois de démineur (4 terminés, sans description), styles de fiches (13)', async () => {
		await visit(session, '/dashboard/teacher/minesweeper/tournaments');
		await openTab(session.page, /Termines/, null);
		await session.page.waitForTimeout(1500);
		const cartes = await session.page.getByText(/participants/).count();
		expect(cartes, 'tournois terminés affichés').toBeGreaterThanOrEqual(4);
		await expectFits(session.page, 'tournois terminés');
		// 13 styles : les « Templates par defaut » (boîte de dialogue) = les 13 styles de Chiphre en base
		await visit(session, '/dashboard/teacher/contenu/worksheets/templates');
		await session.page.getByRole('button', { name: /Templates par defaut/ }).click();
		const dialog = session.page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		const nomsBase = (
			await sql<{ name: string }>('select name from worksheet_styles where owner_id is null')
		).map((r) => r.name);
		expect(nomsBase.length).toBe(13);
		const cartesStyles = await dialog.locator('[data-slot="card"]').count();
		expect(cartesStyles, 'styles proposés dans la boîte de dialogue').toBe(13);
		await expectFits(session.page, 'styles de fiches');
	});

	test('#2980 : Analytics de la classe — grille des points, remédiation, réussite, régularité, compétences', async () => {
		session.errors.errors.length = 0;
		await visit(session, `/dashboard/teacher/classes/${CLASSE}/analytics`);
		for (const text of [
			'Analytics — 1SPE 2',
			/Grille points × Galopins/,
			/Entiers : addition et soustraction/
		]) {
			await expectText(session.page, text, 'analytics');
		}
		await expectFits(session.page, 'analytics');
		for (const onglet of [/Compétences/, /Surveillance/]) {
			await openTab(session.page, onglet, null);
			await session.page.waitForTimeout(1500);
			const text = await bodyText(session.page);
			// L'onglet Surveillance n'a pas de grille : seule sa liste d'alertes (en panne, voir plus bas) y paraît
			if (onglet.source === 'Compétences') {
				expect(text.length, `onglet ${onglet.source} rempli`).toBeGreaterThan(1200);
			}
			expect(text, `onglet ${onglet.source}`).not.toMatch(/Aucune donnée|Aucun élève/i);
		}
		// E79 (corrigé) : la liste des signalements de l'onglet Surveillance répondait 500
		expect(realErrors(session), 'erreurs de la page analytics').toEqual([]);
	});

	test('#2980 : résultats du contrôle « Essai évaluation » — 12 assignés, bilan par question', async () => {
		await visit(session, '/dashboard/teacher/assessments');
		await expectText(session.page, 'Essai évaluation', 'liste des contrôles');
		// La carte « Essai évaluation » : le plus petit élément qui porte son titre et un bouton « Résultats »
		const marked = await session.page.evaluate(() => {
			const has = (el: Element) =>
				/Essai évaluation/.test((el as HTMLElement).innerText) &&
				Array.from(el.querySelectorAll('button')).some((b) => /Résultats/.test(b.innerText));
			for (const el of Array.from(document.querySelectorAll('main *'))) {
				if (!has(el) || Array.from(el.children).some((child) => has(child))) continue;
				el.setAttribute('data-p9-essai', '1');
				return true;
			}
			return false;
		});
		expect(marked, 'carte « Essai évaluation » avec son bouton Résultats').toBe(true);
		await session.page.locator('[data-p9-essai] button', { hasText: 'Résultats' }).first().click();
		await session.page.waitForURL(/\/assessments\/[0-9a-f-]{36}\/results/, { timeout: WAIT });
		await expectText(session.page, /12/, 'assignés');
		const text = await bodyText(session.page);
		expect(text, '12 assignés').toMatch(
			/12\s*(assigné|élèves|Galopins)|Assignés\s*:?\s*12|\/\s*12\b/i
		);
		expect(text, 'bilan par question').toMatch(/question/i);
		await expectFits(session.page, 'résultats du contrôle');
	});

	test('#2980 : validations de devinettes (2 en attente) et paquets de révision (2)', async () => {
		await check(
			'/dashboard/teacher/contenu/enigmes/stats',
			['Statistiques des Énigmes', /Validations en attente\s*2/],
			'énigmes'
		);
		await check(
			'/dashboard/teacher/srs/decks',
			[
				'Gestion des decks SRS',
				/Total Decks\s*2/,
				'Automatismes de la semaine',
				'Formules à connaître'
			],
			'paquets de révision'
		);
	});

	test('#2989 : Palotins du prof — chaque classe active, ses élèves, Palotin, niveau et Constance ; un élève sans Palotin listé', async () => {
		await check(
			'/dashboard/teacher/gamification/buddies',
			[
				'Palotins des élèves',
				/1SPE 2\s*5\/6 eleves avec un Palotin/,
				/1SPE 1\s*6\/6 eleves avec un Palotin/
			],
			'Palotins'
		);
		expect(await bodyText(session.page), 'plus « Aucun Bataillon actif »').not.toMatch(
			/Aucun .*actif/
		);
		// Ouvre « 1SPE 2 » : 6 élèves, dont un sans Palotin
		await expect(async () => {
			await session.page.getByRole('button', { name: /1SPE 2\s*5\/6/ }).click({ timeout: 5000 });
			await expect(session.page.getByText('Pas de Palotin')).toBeVisible({ timeout: 4000 });
		}).toPass({ timeout: 40_000 });
		const rows = session.page.locator('div.divide-y > div');
		await expect(rows, 'six élèves listés').toHaveCount(6);
		expect(await session.page.getByText('Pas de Palotin').count(), 'un seul sans Palotin').toBe(1);
		const avecPalotin = (await rows.allInnerTexts()).filter((t) => !/Pas de Palotin/.test(t));
		expect(avecPalotin.length).toBe(5);
		for (const row of avecPalotin) {
			expect(row, 'niveau + Constance').toMatch(/\d+\s*\n?\s*\d+ sem\./);
			expect(row, 'nom de Palotin').toMatch(
				/Pile|Giron|Cotice|Bande|Chef|Franc|Bordure|Chevron|Pal|Fasce/i
			);
		}
		await expectFits(session.page, 'Palotins ouverts');
	});
});

// ============================================================================
// COMPTE ADMIN
// ============================================================================

test.describe('Base locale — compte admin, lecture seule', () => {
	let session: Session;
	test.beforeAll(async ({ browser }, info) => {
		info.setTimeout(180_000);
		assertLocalServerEnv();
		session = await openSession(browser, info, ADMIN);
	});
	test.afterAll(() => closeSession(session));

	async function check(url: string, texts: (RegExp | string)[], label: string): Promise<void> {
		session.errors.errors.length = 0;
		await visit(session, url);
		for (const text of texts) await expectText(session.page, text, label);
		expect(realErrors(session), `${label} : erreurs de la page`).toEqual([]);
		await expectFits(session.page, label);
	}

	test('#3011 : Import d’élèves — 3 en attente', async () => {
		await check('/dashboard/admin/import-students', ['Importer des Galopins'], 'import d’élèves');
		const [pending] = await sql<{ n: string }>('select count(*) as n from pending_students');
		expect(Number(pending.n), 'élèves en attente en base').toBe(3);
		const school = session.page.getByRole('combobox').first();
		if (await school.isVisible().catch(() => false)) {
			await school.click();
			await session.page.getByRole('option').first().click();
			await session.page.waitForTimeout(1500);
		}
		expect(await bodyText(session.page), '3 en attente à l’écran').toMatch(
			/3\s*(élèves? |Galopins? )?en attente|en attente\s*\(?3\)?/i
		);
	});

	test('#3011 : Signalements de bug — 10', async () => {
		await check(
			'/dashboard/admin/bug-reports',
			['Rapports de bugs', /Total 10 rapports/, /En attente 3/],
			'signalements de bug'
		);
	});

	test('#3012 : cartes VIP — images présentes (sauf 2048-bomb-3 et 4 cartes Mathémo)', async () => {
		await check(
			'/dashboard/admin/vip-cards',
			[/Gestion des Cartes VIP/, /49 cartes au total/],
			'cartes VIP'
		);
		const report = await imageReport(session.page, null);
		const vip = [...report.loaded, ...report.broken].filter((s) => /vip-card|vip-cards/.test(s));
		expect(vip.length, 'images de cartes').toBeGreaterThanOrEqual(40);
		const cassees = report.broken.filter((s) => /vip-card|vip-cards/.test(s));
		const inattendues = cassees.filter((s) => !IMAGES_ABSENTES.test(s));
		expect(inattendues, 'images de cartes cassées hors exceptions').toEqual([]);
		expect(
			cassees.filter((s) => /mathemo-/.test(s)).length,
			'cartes Mathémo sans image'
		).toBeLessThanOrEqual(4);
		expect(session.foreignImages, 'image lue hors du serveur local').toEqual([]);
	});

	test('#2977 : dictionnaire (675 entrées) et relecture des modèles (verdicts présents)', async () => {
		await check('/dashboard/admin/dictionnaire', [/675 entrées/], 'dictionnaire');
		await check(
			'/dev/modeles',
			['Revue des modèles de questions', /modèles en base/, /\d+ validés/],
			'relecture des modèles'
		);
		const text = await bodyText(session.page);
		expect(
			Number(/✅\s*(\d+) validés/.exec(text)?.[1] ?? 0),
			'verdicts « validés »'
		).toBeGreaterThan(0);
	});
});
