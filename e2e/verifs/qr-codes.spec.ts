import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import type { Locator } from '@playwright/test';
import { expect, test, type Page } from '@playwright/test';
import {
	assertLocalServerEnv,
	login,
	sql,
	TEACHER,
	withFirstVersion,
	LATEST_VERSION_OF
} from './helpers/carnet';
import { allowClipboard, readClipboard } from './helpers/atelier';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock } from './helpers/verrou';
import { encodeQr, QR_BORDER, QR_COLORS } from '../../src/lib/qr/qr-code';
import {
	decodeQrFromDataUrl,
	countAmberPixels,
	decodeQrsInPage,
	QR_SHOTS_DIR,
	decodeQrOnScreen,
	pathOf,
	pngDataUrl,
	svgDataUrl
} from './helpers/qr';

/**
 * QR codes — les vérifications manuelles, sur la base locale
 * ==========================================================
 *
 * Reprend #1539 (liens courts), « QR codes (lot 1) », « QR codes (lot 2, bloc qr) »
 * et #1534 (QR stylés) de `docs/wip/verifications-manuelles.md`. « Scanner au
 * téléphone » = décoder l'image du QR avec jsqr (`helpers/qr.ts`), puis visiter
 * le chemin décodé sur le serveur local.
 *
 *   VERIFS_PORT=5179 pnpm test:verifs qr-codes --project ordi-chrome --workers 1
 *
 * Images : `.captures/verifs/qr/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

const STUDENT = { email: 'eleve21@local.test', password: 'local-eleve' };
const CANON = 'https://www.chiph.re';
const SHORT = /^https:\/\/www\.chiph\.re\/l\/[a-km-np-zA-HJ-NP-Z2-9]{8}$/;

/** Codes de liens courts créés par ces tests : retirés en fin de passage */
const createdCodes = new Set<string>();

let lockHeld = false;

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	await acquireLock('eleves-21-25');
	lockHeld = true;
});

test.afterAll(async () => {
	try {
		for (const code of createdCodes) await sql('delete from short_links where code = $1', [code]);
	} finally {
		if (lockHeld) releaseLock('eleves-21-25');
	}
});

async function seriesLink(): Promise<string> {
	const rows = await sql<{ id: string }>(
		`select id from question_templates where status = 'published' order by id limit 1`
	);
	const items = [{ templateId: rows[0].id, quantity: 3, delay: 0 }];
	return `/automaths/panier?modeles=${encodeURIComponent(encodeURIComponent(JSON.stringify(items)))}`;
}

async function openCart(page: Page): Promise<void> {
	await page.goto(await seriesLink());
	await page.waitForLoadState('networkidle');
	// Le panier est vide au départ : la série du lien y est mise (le toast passe vite)
	await expect(page.getByRole('button', { name: /^QR code de/ })).toBeVisible();
}

async function openQr(page: Page) {
	await page.getByRole('button', { name: /^QR code de/ }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.locator('img.qr')).toBeVisible();
	return dialog;
}

test.describe('#1539 liens courts des QR de série', () => {
	test('#1539 prof : le QR du panier porte /l/<8 caractères> et mène à la série', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await openCart(page);
		const dialog = await openQr(page);
		const shown = await dialog.getByLabel('Adresse du QR code').inputValue();
		expect(shown).toMatch(SHORT);
		createdCodes.add(shown.split('/l/')[1]);

		const decoded = await decodeQrOnScreen(page, dialog.locator('img.qr'), '1539-panier');
		expect(decoded).toBe(shown);

		// Scanner : on visite le chemin décodé sur le serveur local
		await page.keyboard.press('Escape');
		await page.goto(pathOf(decoded as string));
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Ma série' })).toBeVisible();
		await expect(page.getByRole('button', { name: /^QR code de/ })).toBeVisible();

		// Rouvrir le QR de la même série (elle est déjà dans le panier) : même code
		await page.goto('/automaths/panier');
		await page.waitForLoadState('networkidle');
		const again = await openQr(page);
		expect(await again.getByLabel('Adresse du QR code').inputValue()).toBe(shown);
	});
});

/** Le QR de la fenêtre ouverte : adresse affichée, image décodée, les deux d'accord */
async function scan(page: Page, dialog: Locator, shot: string) {
	const shown = await dialog.getByLabel('Adresse du QR code').inputValue();
	expect(shown.startsWith(`${CANON}/`)).toBe(true);
	const decoded = await decodeQrOnScreen(page, dialog.locator('img.qr'), shot);
	expect(decoded).toBe(shown);
	return shown;
}

async function openQrButton(page: Page, name: string | RegExp) {
	await page.getByRole('button', { name }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.locator('img.qr')).toBeVisible();
	return dialog;
}

/** « Scanner » : visiter, sur le serveur local, le chemin que le QR porte */
async function visitScanned(page: Page, address: string) {
	await page.keyboard.press('Escape');
	const response = await page.goto(pathOf(address));
	await page.waitForLoadState('networkidle');
	return response;
}

test.describe('#1539 liens courts : forme, élève, déconnecté, code inconnu', () => {
	test('#1539 prof : le QR d\u2019une Course aux nombres de 7 minutes lance le test avec sa forme et son temps', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await openCart(page);
		await page.getByRole('combobox', { name: 'Forme du lien' }).click();
		await page.getByRole('option', { name: 'Course aux nombres' }).click();
		await page.getByLabel('Temps limite (minutes)').fill('7');
		const dialog = await openQr(page);
		const shown = await scan(page, dialog, '1539-course');
		expect(shown).toMatch(SHORT);
		createdCodes.add(shown.split('/l/')[1]);

		// La cible enregistrée est bien le lien de la forme, avec son temps (7 min = 420 s)
		const rows = await sql<{ target: string }>('select target from short_links where code = $1', [
			shown.split('/l/')[1]
		]);
		expect(rows[0].target).toMatch(/^\/automaths\/test\?/);
		expect(rows[0].target).toContain('mode=course');
		expect(rows[0].target).toContain('time=420');

		await visitScanned(page, shown);
		await expect(page).toHaveURL(/\/automaths\/test\?.*mode=course/);
		await expect(page).toHaveURL(/time=420/);
		await expect(page.getByText(/Ce lien n’existe pas|Page introuvable/)).toHaveCount(0);
	});

	for (const who of ['élève', 'déconnecté'] as const) {
		test(`#1539 ${who} : au panier, le bouton QR est grisé « réservé aux profs », Copier le lien marche`, async ({
			page
		}) => {
			await allowClipboard(page);
			if (who === 'élève') await login(page, STUDENT.email, STUDENT.password);
			await openCart(page);
			const qrButton = page.getByRole('button', { name: /^QR code de/ });
			await expect(qrButton).toHaveAttribute('aria-disabled', 'true');
			await expect(qrButton).toHaveAttribute('title', /réservé aux profs/);
			await qrButton.click({ force: true });
			await expect(page.getByRole('dialog')).toHaveCount(0);

			await page.getByRole('button', { name: 'Copier le lien' }).click();
			await expect(page.getByText('Lien copié')).toBeVisible();
			const copied = await readClipboard(page);
			expect(copied).toMatch(/^http:\/\/localhost:\d+\/automaths\/panier\?modeles=/);
		});
	}

	test('#1539 prof : une série longue (50 modèles) a quand même son QR, par un lien court', async ({
		page
	}) => {
		const rows = await sql<{ id: string }>(
			`select id from question_templates where status = 'published' order by id limit 50`
		);
		expect(rows).toHaveLength(50);
		const items = rows.map((row) => ({ templateId: row.id, quantity: 10, delay: 0 }));
		const long = `/automaths/panier?modeles=${encodeURIComponent(encodeURIComponent(JSON.stringify(items)))}`;
		expect(long.length).toBeGreaterThan(3000);
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto(long);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('button', { name: /^QR code de/ })).toBeVisible();
		const dialog = await openQr(page);
		await expect(dialog.getByText('Ce lien est trop long')).toHaveCount(0);
		const shown = await scan(page, dialog, '1539-serie-longue');
		expect(shown).toMatch(SHORT);
		createdCodes.add(shown.split('/l/')[1]);
	});

	test('#1539 un lien court inconnu mène à « Ce lien n’existe pas »', async ({ page }) => {
		const response = await page.goto('/l/AAAAAAAA');
		expect(response?.status()).toBe(404);
		await expect(page.getByText('Ce lien n’existe pas').first()).toBeVisible();
	});

	test('#1539 un lien court mal formé donne la même page « Ce lien n’existe pas »', async ({
		page
	}) => {
		const response = await page.goto('/l/abc');
		expect(response?.status()).toBe(404);
		await expect(page.getByText('Ce lien n’existe pas').first()).toBeVisible();
	});
});

test.describe('QR codes (lot 1) : chaque QR se scanne et mène à sa page', () => {
	test.describe.configure({ mode: 'serial' });

	test('QR codes (lot 1) glossaire : l\u2019adresse commence par chiph.re même en local, le QR mène au glossaire', async ({
		page
	}) => {
		await page.goto('/glossaire');
		await page.waitForLoadState('networkidle');
		expect(new URL(page.url()).hostname).toBe('localhost');
		const dialog = await openQrButton(page, 'QR code de Glossaire');
		const shown = await scan(page, dialog, 'lot1-glossaire');
		expect(shown).toBe(`${CANON}/glossaire`);
		await visitScanned(page, shown);
		await expect(page).toHaveURL(/\/glossaire$/);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('QR codes (lot 1) article du Shtam : le QR mène à l\u2019article', async ({ page }) => {
		const slug = 'bedonstan-camp-de-bordure';
		await page.goto(`/shtam/${slug}`);
		await page.waitForLoadState('networkidle');
		const dialog = await openQrButton(page, /^QR code de /);
		const shown = await scan(page, dialog, 'lot1-shtam');
		expect(shown).toBe(`${CANON}/shtam/${slug}`);
		await visitScanned(page, shown);
		await expect(page).toHaveURL(new RegExp(`/shtam/${slug}$`));
		await expect(page.getByText('Le Capitaine Bordure découvre').first()).toBeVisible();
	});

	test('QR codes (lot 1) PNG et SVG téléchargés : les fichiers se scannent, noir sur blanc en thème sombre', async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/glossaire');
		await page.waitForLoadState('networkidle');
		const dialog = await openQrButton(page, 'QR code de Glossaire');
		// Le thème sombre est bien en place (sinon le test ne prouverait rien)
		const dialogBackground = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
		const [red] = dialogBackground.match(/\d+/g) ?? ['255'];
		expect(Number(red)).toBeLessThan(100);
		const shown = await scan(page, dialog, 'lot1-glossaire-sombre');

		const pngDownload = page.waitForEvent('download');
		await dialog.getByRole('button', { name: 'Télécharger (PNG)' }).click();
		const png = await pngDownload;
		expect(png.suggestedFilename()).toMatch(/\.png$/);
		const pngBytes = await readFile(await png.path());
		expect(pngBytes.subarray(1, 4).toString()).toBe('PNG');
		await png.saveAs(`${process.cwd()}/.captures/verifs/qr/lot1-glossaire.png`);
		expect(await decodeQrFromDataUrl(page, pngDataUrl(pngBytes))).toBe(shown);

		const svgDownload = page.waitForEvent('download');
		await dialog.getByRole('button', { name: 'Télécharger (SVG)' }).click();
		const svgFile = await svgDownload;
		expect(svgFile.suggestedFilename()).toMatch(/\.svg$/);
		const svg = await readFile(await svgFile.path(), 'utf8');
		expect(svg).toContain('<svg');
		await svgFile.saveAs(`${process.cwd()}/.captures/verifs/qr/lot1-glossaire.svg`);
		expect(await decodeQrFromDataUrl(page, svgDataUrl(svg))).toBe(shown);
	});
});

test.describe('QR codes (lot 1) : ressources du prof', () => {
	test.describe.configure({ mode: 'serial' });

	// Données de la base locale (seed riche) : exercice public, exercices à lien de partage
	const PUBLIC_EXERCISE = {
		id: '36339309-7225-4be7-9be1-d18a6fbab57f',
		slug: 'equations-2ebx2uxp'
	};
	const TOKEN_EXERCISE = {
		id: '00502bc5-772a-49eb-b4d6-eae95f433d7d',
		title: 'Comparer exp(x) et x'
	};
	const EXPIRED_EXERCISE = { id: '010bb9d7-5e2d-483b-8738-a1f7029d2b98' };

	test.beforeEach(async ({ page }) => {
		await login(page, TEACHER.email, TEACHER.password);
	});

	test('QR codes (lot 1) exercice public : le QR mène à l\u2019exercice', async ({ page }) => {
		await page.goto(`/dashboard/teacher/contenu/exercices/${PUBLIC_EXERCISE.id}`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Partager' }).click();
		const dialog = await openQrButton(page, /^QR code de /);
		const shown = await scan(page, dialog, 'lot1-exercice-public');
		expect(shown).toBe(`${CANON}/exercice/${PUBLIC_EXERCISE.slug}`);
		expect(shown).not.toContain('token=');
		await visitScanned(page, shown);
		await expect(page).toHaveURL(new RegExp(`/exercice/${PUBLIC_EXERCISE.slug}(\\?.*)?$`));
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('QR codes (lot 1) exercice à lien de partage : avertissement « jeton », la page s\u2019ouvre', async ({
		page
	}) => {
		const token = (
			await sql<{ token: string }>(
				'select token from exercise_share_tokens where exercise_id = $1 and is_active and (expires_at is null or expires_at > now()) limit 1',
				[TOKEN_EXERCISE.id]
			)
		)[0].token;
		await page.goto(`/dashboard/teacher/contenu/exercices/${TOKEN_EXERCISE.id}`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Partager' }).click();
		const dialog = await openQrButton(page, `QR code de ${TOKEN_EXERCISE.title}`);
		await expect(dialog.getByText('Ce QR contient le jeton de partage')).toBeVisible();
		const shown = await scan(page, dialog, 'lot1-exercice-jeton');
		expect(shown).toContain(`?token=${token}`);
		await visitScanned(page, shown);
		await expect(page).toHaveURL(new RegExp(`token=${token}`));
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('QR codes (lot 1) lien expiré : le bouton QR est grisé et ne s\u2019ouvre pas', async ({
		page
	}) => {
		const expired = await sql(
			'select 1 from exercise_share_tokens where exercise_id = $1 and expires_at < now()',
			[EXPIRED_EXERCISE.id]
		);
		expect(expired.length).toBeGreaterThan(0);
		await page.goto(`/dashboard/teacher/contenu/exercices/${EXPIRED_EXERCISE.id}`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Partager' }).click();
		const qrButton = page.getByRole('dialog').getByRole('button', { name: /^QR code de/ });
		await expect(qrButton.first()).toHaveAttribute('aria-disabled', 'true');
		await expect(qrButton.first()).toHaveAttribute('title', /lien expiré/);
		await qrButton.first().click({ force: true });
		await expect(page.locator('img.qr')).toHaveCount(0);
	});

	test('QR codes (lot 1) cours : le QR mène au cours partagé, avertissement « jeton »', async ({
		page
	}) => {
		const classId = '25f632f6-99a4-42ff-898a-fdb4d85ac487';
		const token = (
			await sql<{ token: string }>(
				'select token from class_course_share_tokens where class_id = $1 and is_active limit 1',
				[classId]
			)
		)[0].token;
		await page.goto(`/dashboard/teacher/cours/${classId}`);
		await page.waitForLoadState('networkidle');
		const dialog = await openQrButton(page, 'QR code de le cours');
		await expect(dialog.getByText('Ce QR contient le jeton de partage')).toBeVisible();
		const shown = await scan(page, dialog, 'lot1-cours');
		expect(shown).toContain(token);
		const response = await visitScanned(page, shown);
		expect(response?.status()).toBe(200);
		expect(page.url()).toContain(token);
		await expect(page.getByRole('heading').first()).toBeVisible();
	});

	test('QR codes (lot 1) cahier de texte : le QR mène au cahier partagé', async ({ page }) => {
		const classId = '25f632f6-99a4-42ff-898a-fdb4d85ac487';
		const token = (
			await sql<{ token: string }>(
				'select token from class_journal_share_tokens where class_id = $1 and is_active limit 1',
				[classId]
			)
		)[0].token;
		await page.goto(`/dashboard/teacher/cahier-texte?class=${classId}`);
		await page.waitForLoadState('networkidle');
		const dialog = await openQrButton(page, 'QR code de le cahier de texte');
		await expect(dialog.getByText('Ce QR contient le jeton de partage')).toBeVisible();
		const shown = await scan(page, dialog, 'lot1-cahier');
		expect(shown).toBe(`${CANON}/cahier/${token}`);
		const response = await visitScanned(page, shown);
		expect(response?.status()).toBe(200);
		await expect(page).toHaveURL(new RegExp(`/cahier/${token}$`));
	});
});

test.describe('#1534 QR stylés : gidouille, cases et yeux arrondis, yeux ambre', () => {
	test('#1534 prof : le QR d\u2019une série, son PNG et son SVG téléchargés se scannent et portent le style', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await openCart(page);
		const dialog = await openQr(page);
		const shown = await scan(page, dialog, '1534-serie');
		createdCodes.add(shown.split('/l/')[1]);

		// À l'écran : les yeux ont la couleur ambre du style, la gidouille est tracée
		const src = (await dialog.locator('img.qr').getAttribute('src')) ?? '';
		const onScreenSvg = decodeURIComponent(src.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
		expect(onScreenSvg).toContain(QR_COLORS.eyes);
		expect(onScreenSvg).toMatch(/stroke="[^"]+"/);

		const svgDownload = page.waitForEvent('download');
		await dialog.getByRole('button', { name: 'Télécharger (SVG)' }).click();
		const svg = await readFile(await (await svgDownload).path(), 'utf8');
		expect(svg).toContain(QR_COLORS.eyes);
		expect(await decodeQrFromDataUrl(page, svgDataUrl(svg))).toBe(shown);

		const pngDownload = page.waitForEvent('download');
		await dialog.getByRole('button', { name: 'Télécharger (PNG)' }).click();
		const pngFile = await pngDownload;
		const png = await readFile(await pngFile.path());
		await pngFile.saveAs(`${QR_SHOTS_DIR}/1534-serie.png`);
		expect(await decodeQrFromDataUrl(page, pngDataUrl(png))).toBe(shown);
		// Le PNG porte bien les yeux ambre (un QR noir pur n'en aurait aucun pixel)
		expect(await countAmberPixels(page, pngDataUrl(png))).toBeGreaterThan(500);
	});

	test('#1534 un exercice public : son QR à l\u2019écran se scanne et mène à l\u2019exercice', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto('/dashboard/teacher/contenu/exercices/36339309-7225-4be7-9be1-d18a6fbab57f');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Partager' }).click();
		const dialog = await openQrButton(page, /^QR code de /);
		const shown = await scan(page, dialog, '1534-exercice');
		expect(shown).toBe(`${CANON}/exercice/equations-2ebx2uxp`);
	});
});

const FICHE_STATEMENT = [
	'Énoncé de la fiche Verifs QR.',
	'',
	'```qr',
	'/glossaire',
	'légende: Le glossaire en ligne',
	'taille: 3cm',
	'```',
	'',
	'```qr',
	'https://fr.wikipedia.org/wiki/Gidouille',
	'légende: Une page extérieure',
	'taille: 2,5cm',
	'```',
	'',
	'```qr',
	'javascript:alert(1)',
	'```'
].join('\n');

interface FicheDecor {
	exerciseId: string;
	slug: string;
	worksheetId: string;
	assignmentId: string;
}

/** Une fiche « Verifs QR » : un exercice public, une feuille, une attribution (retirées en fin de passage) */
async function createFicheDecor(): Promise<FicheDecor> {
	const run = Date.now().toString(36);
	const exercise = await sql<{ id: string }>(
		withFirstVersion(
			`insert into exercises (title, created_by, is_public, slug, category, variations)
			 values ('Verifs QR', $1, true, $2, 'automatisme', $3::jsonb) returning id`
		),
		[
			'11111111-1111-4111-8111-111111111111',
			`verifs-qr-${run}`,
			JSON.stringify([
				{
					label: 'guided',
					hints: [],
					solution_md: 'Verifs corrigé.',
					statement_md: FICHE_STATEMENT
				}
			])
		]
	);
	const worksheet = await sql<{ id: string }>(
		`insert into worksheets (title, created_by, status) values ('Verifs QR', $1, 'published') returning id`,
		['11111111-1111-4111-8111-111111111111']
	);
	await sql(
		`insert into worksheet_exercises (worksheet_id, exercise_id, exercise_version_id, position)
		 values ($1, $2, ${LATEST_VERSION_OF('$2')}, 1)`,
		[worksheet[0].id, exercise[0].id]
	);
	const assignment = await sql<{ id: string }>(
		`insert into worksheet_assignments (worksheet_id, title, created_by, status)
		 values ($1, 'Verifs QR', $2, 'active') returning id`,
		[worksheet[0].id, '11111111-1111-4111-8111-111111111111']
	);
	return {
		exerciseId: exercise[0].id,
		slug: `verifs-qr-${run}`,
		worksheetId: worksheet[0].id,
		assignmentId: assignment[0].id
	};
}

async function dropFicheDecor(decor: FicheDecor): Promise<void> {
	await sql('delete from worksheet_assignments where id = $1', [decor.assignmentId]);
	await sql('delete from worksheet_exercises where worksheet_id = $1', [decor.worksheetId]);
	await sql('delete from worksheets where id = $1', [decor.worksheetId]);
	await sql('delete from exercises where id = $1', [decor.exerciseId]);
}

test.describe('QR codes (lot 2, bloc qr) : à l\u2019écran, dans le PDF, côté prof', () => {
	// 3 pixels par case : ce qu'une photo de téléphone donne à peine plus (cf. decode-qr.ts)
	test.use({ deviceScaleFactor: 3 });
	test.describe.configure({ mode: 'serial' });

	let decor: FicheDecor;
	test.beforeAll(async () => {
		decor = await createFicheDecor();
	});
	test.afterAll(async () => {
		await dropFicheDecor(decor);
	});

	test('QR codes (lot 2) élève : le QR 3 cm, sa légende et son lien ; scanné → le glossaire', async ({
		page
	}) => {
		await login(page, STUDENT.email, STUDENT.password);
		await page.goto(`/exercice/${decor.slug}`);
		await page.waitForLoadState('networkidle');
		const figures = page.locator('figure.qr-bloc:visible');
		await expect(figures).toHaveCount(2);

		const glossary = figures.nth(0);
		await expect(glossary.getByText('Le glossaire en ligne')).toBeVisible();
		await expect(glossary.getByRole('link', { name: 'www.chiph.re/glossaire' })).toBeVisible();
		// 3 cm = 113 px CSS (96 dpi)
		const box = await glossary.locator('svg').boundingBox();
		expect(Math.abs((box?.width ?? 0) - (3 / 2.54) * 96)).toBeLessThan(2);

		const decoded = await decodeQrOnScreen(page, glossary.locator('svg'), 'lot2-bloc-glossaire');
		expect(decoded).toBe('https://www.chiph.re/glossaire');
		const response = await page.goto(pathOf(decoded as string));
		expect(response?.status()).toBe(200);
		await expect(page).toHaveURL(/\/glossaire$/);
	});

	test('QR codes (lot 2) un QR vers un site extérieur : le lien s\u2019ouvre dans un nouvel onglet', async ({
		page
	}) => {
		await login(page, STUDENT.email, STUDENT.password);
		await page.goto(`/exercice/${decor.slug}`);
		await page.waitForLoadState('networkidle');
		const wiki = page.locator('figure.qr-bloc:visible').nth(1);
		const link = wiki.getByRole('link', { name: 'fr.wikipedia.org/wiki/Gidouille' });
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', /noopener/);
		await expect(link).toHaveAttribute('href', 'https://fr.wikipedia.org/wiki/Gidouille');
		const decoded = await decodeQrOnScreen(page, wiki.locator('svg'), 'lot2-bloc-wikipedia');
		expect(decoded).toBe('https://fr.wikipedia.org/wiki/Gidouille');
	});

	test('QR codes (lot 2) bloc javascript: : « QR code indisponible » à l\u2019élève, sans message d\u2019auteur', async ({
		page
	}) => {
		await login(page, STUDENT.email, STUDENT.password);
		await page.goto(`/exercice/${decor.slug}`);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('.qr-indisponible:visible')).toHaveCount(1);
		await expect(page.locator('.qr-indisponible:visible')).toHaveText('QR code indisponible');
		await expect(page.getByText('QR code non dessiné')).toHaveCount(0);
		await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
	});

	test('QR codes (lot 2) prof : un bloc javascript: reçoit un message d\u2019auteur dans l\u2019aide à l\u2019écriture', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto('/aide-ecriture/blocs/qr-code');
		await page.waitForLoadState('networkidle');
		const box = page.getByLabel('Texte du bloc');
		// La zone « Essayer » seule (la page montre aussi d'autres exemples)
		const tryIt = box.locator('xpath=ancestor::div[contains(@class,"grid-cols-1")][1]');
		await expect(tryIt.locator('figure.qr-bloc')).toHaveCount(1);
		await box.fill('```qr\njavascript:alert(1)\n```');
		await expect(tryIt.getByText('Bloc qr : QR code non dessiné')).toBeVisible();
		await expect(tryIt.locator('figure.qr-bloc')).toHaveCount(0);
		await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
	});

	test('QR codes (lot 2) PDF de la fiche : QR nets, 3 cm, légende dessous, scannés', async ({
		page
	}) => {
		test.setTimeout(180_000);
		await login(page, STUDENT.email, STUDENT.password);
		await page.goto(`/exercice/${decor.slug}`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'PDF' }).first().click();
		const download = page.waitForEvent('download', { timeout: 150_000 });
		await page.getByRole('button', { name: 'Sans correction' }).click();
		const file = await download;
		const pdfPath = `${QR_SHOTS_DIR}/lot2-fiche.pdf`;
		await file.saveAs(pdfPath);

		const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8' });
		expect(text).toContain('Le glossaire en ligne');
		expect(text).toContain('Une page extérieure');
		expect(text).toContain('QR code indisponible');
		// La légende est DESSOUS le QR : le QR n'a pas de texte, la légende suit dans l'ordre de lecture
		expect(text.indexOf('Énoncé de la fiche')).toBeLessThan(text.indexOf('Le glossaire en ligne'));

		const prefix = `${QR_SHOTS_DIR}/lot2-fiche`;
		execFileSync('pdftoppm', ['-png', '-r', '300', '-f', '1', '-l', '1', pdfPath, prefix]);
		const pagePng = (await readdir(QR_SHOTS_DIR)).find((f) => /^lot2-fiche-\d+\.png$/.test(f));
		expect(pagePng).toBeDefined();
		const png = await readFile(`${QR_SHOTS_DIR}/${pagePng}`);
		const found = await decodeQrsInPage(page, pngDataUrl(png));
		const byText = new Map(found.map((f) => [f.data, f.widthPx]));
		expect([...byText.keys()].sort()).toEqual([
			'https://fr.wikipedia.org/wiki/Gidouille',
			'https://www.chiph.re/glossaire'
		]);

		// Taille mesurée sur l'image (300 dpi) : le dessin (marge de 4 cases comprise) fait la taille demandée
		for (const [address, sizeCm] of [
			['https://www.chiph.re/glossaire', 3],
			['https://fr.wikipedia.org/wiki/Gidouille', 2.5]
		] as const) {
			const matrix = encodeQr(address);
			expect(matrix).not.toBeNull();
			const modules = (matrix as { size: number }).size;
			const expectedCm = (sizeCm * (modules - 2 * QR_BORDER)) / modules;
			const measuredCm = ((byText.get(address) ?? 0) / 300) * 2.54;
			expect(Math.abs(measuredCm - expectedCm) / expectedCm).toBeLessThan(0.05);
		}
	});

	test('QR codes (lot 2) « Insérer un QR code » de l\u2019éditeur riche : bloc prérempli', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto('/demo/editeur');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Insertion' }).click();
		await page.getByRole('button', { name: 'Insérer un QR code' }).click();
		const editor = page.locator('.ProseMirror').first();
		await expect(editor).toContainText('/glossaire');
		await expect(editor).toContainText('légende: Le glossaire en ligne');
		await expect(editor).toContainText('taille: 3cm');
	});
});
