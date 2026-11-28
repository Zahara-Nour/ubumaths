/**
 * `pnpm voir <page>` : regarder une page du serveur de dev, sans écran
 * ====================================================================
 *
 * Ouvre la page du serveur de dev de CE worktree dans un navigateur sans écran
 * (Playwright), attend qu'elle soit chargée, et écrit dans `.captures/voir/` :
 * - une image de la page entière (coupée à `MAX_HEIGHT` pixels CSS) ;
 * - un compte rendu JSON : adresse finale, titre, erreurs de console, requêtes
 *   en échec.
 *
 * Par défaut : format iPhone, moteur de Safari (WebKit). `--petit` : iPhone SE
 * (375 px) ; `--ordi` : grand
 * écran ; `--chrome` : Chromium ; `--compte prof|eleve|admin` : arriver
 * connecté avec un compte fictif (base locale seulement) ; `--port <n>`.
 *
 * Ne lance jamais de serveur, n'ouvre jamais un autre site, ne se connecte
 * jamais à une base qui n'est pas locale. Doc : docs/pratiques/voir-une-page.md.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium, devices, webkit, type Page } from 'playwright';
import {
	ACCOUNTS,
	VoirError,
	assertLocalTarget,
	captureHeight,
	captureName,
	formatName,
	isLocalEnv,
	isSameServer,
	isLoginRedirect,
	parseArgs,
	pickPort,
	resolveTarget,
	slices,
	type AccountName,
	type VoirOptions
} from './logique';
import { listDevServers, readEnvFiles, readServerEnv, worktreeRoot } from './serveurs';

// Types

interface Report {
	requested: string;
	final: string;
	title: string;
	format: string;
	engine: 'safari' | 'chrome';
	account: string | null;
	image: string;
	/** Tranches de l'image, de haut en bas, quand elle est trop haute pour être lue d'un coup */
	parts: string[];
	/** Image coupée : la page dépasse la hauteur maximale */
	cut: boolean;
	pageHeight: number;
	loginRedirect: boolean;
	consoleErrors: string[];
	failedRequests: string[];
}

// Constantes

const OUT_DIR = '.captures/voir';
const DESKTOP = { width: 1440, height: 900 };
const NAVIGATION_TIMEOUT = 60_000;
/** Attente du calme réseau : une page qui interroge sans cesse n'est pas en faute. */
const IDLE_TIMEOUT = 10_000;
const LOGIN_TIMEOUT = 15_000;
const MAX_LISTED = 50;

// Functions

/** Connexion par la page de connexion, comme un utilisateur. Rend `false` si elle est refusée. */
async function tryLogin(
	page: Page,
	origin: string,
	email: string,
	password: string
): Promise<boolean> {
	await page.goto(`${origin}/auth/login`);
	// Saisie avant l'hydratation = champs vidés ensuite : attendre la page prête.
	await page.waitForLoadState('networkidle');
	await page.locator('input[name="email"]').fill(email);
	await page.locator('input[type="password"]').fill(password);
	await page.locator('button[type="submit"]').click();
	try {
		await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), {
			timeout: LOGIN_TIMEOUT
		});
		return true;
	} catch {
		return false;
	}
}

/** Connecte le premier compte fictif qui existe dans la base locale ; rend son adresse. */
async function login(page: Page, origin: string, name: AccountName): Promise<string> {
	for (const account of ACCOUNTS[name]) {
		if (await tryLogin(page, origin, account.email, account.password)) return account.email;
	}
	throw new VoirError(
		`Connexion refusée pour le compte ${name} (${ACCOUNTS[name].map((a) => a.email).join(', ')}) : ` +
			'la base locale a-t-elle ses comptes fictifs (pnpm db:neuf) ?'
	);
}

async function waitUntilLoaded(page: Page): Promise<void> {
	try {
		await page.waitForLoadState('networkidle', { timeout: IDLE_TIMEOUT });
	} catch {
		// Page qui interroge en continu : on prend l'image quand même
	}
	await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/**
 * Hauteur encore cachée sous l'écran, en pixels CSS : le plus grand reste à
 * faire défiler, de la fenêtre ou d'un cadre qui défile en hauteur.
 */
async function hiddenHeight(page: Page): Promise<number> {
	return page.evaluate(() => {
		const root = document.documentElement;
		let hidden = root.scrollHeight - root.clientHeight;
		for (const element of document.querySelectorAll('*')) {
			if (element.scrollHeight <= element.clientHeight) continue;
			const overflow = getComputedStyle(element).overflowY;
			if (overflow !== 'auto' && overflow !== 'scroll') continue;
			// Un petit cadre (liste, menu) n'est pas la page : seuls comptent ceux qui
			// occupent au moins la moitié de l'écran
			if (element.clientHeight < root.clientHeight / 2) continue;
			hidden = Math.max(hidden, element.scrollHeight - element.clientHeight);
		}
		return Math.max(0, Math.ceil(hidden));
	});
}

async function look(options: VoirOptions): Promise<Report> {
	assertLocalTarget(options.target);
	const root = worktreeRoot();
	const servers = listDevServers();
	const port = pickPort(servers, root, options.port);
	const requested = resolveTarget(options.target, port);
	const origin = new URL(requested).origin;
	if (options.account) {
		const serverEnv = readServerEnv(servers.find((server) => server.port === port)?.pid);
		if (serverEnv === null || !isLocalEnv(readEnvFiles(root), serverEnv))
			throw new VoirError(
				'--compte refusé : rien ne prouve que le serveur de ce dossier vise la base locale ' +
					'(.env.local absent, ou une adresse de Supabase distante dans ses fichiers .env ou ' +
					'dans la commande qui l’a lancé). Jamais de connexion automatique hors base locale.'
			);
	}

	const engine = options.chromium ? chromium : webkit;
	const { defaultBrowserType: _ignored, ...phone } =
		devices[options.small ? 'iPhone SE (3rd gen)' : 'iPhone 15'];
	const browser = await engine.launch().catch((error: unknown) => {
		// Playwright mis à jour sans son navigateur : dire quoi lancer, pas une pile d'appels
		if (error instanceof Error && error.message.includes("Executable doesn't exist"))
			throw new VoirError(
				`Navigateur absent : pnpm exec playwright install ${options.chromium ? 'chromium' : 'webkit'}`
			);
		throw error;
	});
	try {
		const context = await browser.newContext(options.desktop ? { viewport: DESKTOP } : phone);
		context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
		// La page ne quitte pas le serveur local : une redirection vers un autre site
		// est coupée (les ressources externes d'une page locale, elles, se chargent)
		await context.route('**/*', (route) => {
			const request = route.request();
			if (request.isNavigationRequest() && !isSameServer(request.url(), origin))
				return route.abort('blockedbyclient');
			return route.continue();
		});
		let account: string | null = null;
		if (options.account) {
			const loginPage = await context.newPage();
			account = await login(loginPage, origin, options.account);
			// Fermée avant d'ouvrir la page demandée : les requêtes de la page d'arrivée,
			// interrompues en route, ne sont pas des erreurs de la page regardée
			await loginPage.close();
		}

		const page = await context.newPage();
		const consoleErrors: string[] = [];
		const failedRequests: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') consoleErrors.push(message.text());
		});
		page.on('pageerror', (error) => consoleErrors.push(`Exception : ${error.message}`));
		page.on('requestfailed', (request) => {
			const reason = request.failure()?.errorText ?? 'échec';
			failedRequests.push(`${request.method()} ${request.url()} — ${reason}`);
		});
		page.on('response', (response) => {
			if (response.status() >= 400)
				failedRequests.push(
					`${response.request().method()} ${response.url()} — ${response.status()}`
				);
		});

		await page.goto(requested, { waitUntil: 'load' });
		await waitUntilLoaded(page);

		// L'appli défile dans un cadre intérieur (`h-screen` + `overflow-y-auto`), pas dans
		// la fenêtre : une « page entière » de Playwright s'arrêterait à l'écran. On agrandit
		// donc la fenêtre de ce qui reste à faire défiler, jusqu'à la hauteur maximale.
		const viewport = page.viewportSize() ?? DESKTOP;
		const pageHeight = viewport.height + (await hiddenHeight(page));
		const { height, cut } = captureHeight(pageHeight);
		if (height > viewport.height) {
			await page.setViewportSize({ width: viewport.width, height });
			await waitUntilLoaded(page);
		}
		const name = captureName(new Date(), requested, options);
		mkdirSync(join(root, OUT_DIR), { recursive: true });
		const image = join(root, OUT_DIR, `${name}.png`);
		// `scale: 'css'` : un pixel par pixel CSS, sinon l'image d'un iPhone pèse 9 fois plus
		await page.screenshot({ path: image, scale: 'css' });
		const parts: string[] = [];
		for (const [index, slice] of slices(height).entries()) {
			const part = join(root, OUT_DIR, `${name}-partie-${index + 1}.png`);
			await page.screenshot({
				path: part,
				scale: 'css',
				clip: { x: 0, y: slice.y, width: viewport.width, height: slice.height }
			});
			parts.push(part);
		}

		const report: Report = {
			requested,
			final: page.url(),
			title: await page.title(),
			format: formatName(options),
			engine: options.chromium ? 'chrome' : 'safari',
			account,
			image,
			parts,
			cut,
			pageHeight,
			loginRedirect: isLoginRedirect(requested, page.url()),
			consoleErrors: consoleErrors.slice(0, MAX_LISTED),
			failedRequests: failedRequests.slice(0, MAX_LISTED)
		};
		writeFileSync(join(root, OUT_DIR, `${name}.json`), `${JSON.stringify(report, null, '\t')}\n`);
		return report;
	} finally {
		await browser.close();
	}
}

function print(report: Report): void {
	const lines = [
		`Page    : ${report.final}`,
		`Titre   : ${report.title}`,
		`Vue     : ${report.format}, ${report.engine}${report.account ? `, connecté : ${report.account}` : ''}`,
		`Image   : ${report.image}`
	];
	if (report.parts.length > 0)
		lines.push(
			`Tranches : ${report.parts.length} (…-partie-1.png à …-partie-${report.parts.length}.png), à lire à la place de l'image entière.`
		);
	if (report.final !== report.requested) lines.push(`Demandée : ${report.requested}`);
	if (report.loginRedirect)
		lines.push(
			'⚠️  La page a renvoyé vers la connexion : relancer avec --compte prof|eleve|admin.'
		);
	if (report.cut)
		lines.push(
			`⚠️  Page très longue (${report.pageHeight} px) : image coupée à ${captureHeight(report.pageHeight).height} px.`
		);
	lines.push(`Erreurs de console : ${report.consoleErrors.length}`);
	for (const error of report.consoleErrors) lines.push(`  - ${error}`);
	lines.push(`Requêtes en échec : ${report.failedRequests.length}`);
	for (const request of report.failedRequests) lines.push(`  - ${request}`);
	lines.push(`Compte rendu : ${relative(process.cwd(), report.image.replace(/\.png$/, '.json'))}`);
	console.log(lines.join('\n'));
}

try {
	print(await look(parseArgs(process.argv.slice(2))));
} catch (error) {
	if (error instanceof VoirError) {
		console.error(`⛔ ${error.message}`);
		process.exit(1);
	}
	throw error;
}
