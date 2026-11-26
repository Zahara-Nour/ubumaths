import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { createWorksheet, FICHES_TMP, STYLE_IDS, TEACHER_ID } from './helpers/fiches';
import { collectErrors, gotoSettled } from './helpers/pages';
import { pdfBoxes, rasterPage, type PdfBox } from './helpers/pdf-mesures';
import { setTheme } from './helpers/themes-lisibles';
import { acquireLock, LOCK_WAIT_MAX_MS, refreshLock, releaseLock } from './helpers/verrou';
import { buildSeriesLink } from '../../src/lib/validation/series';

/**
 * Paquet 9, lecture facilitée à l'écran et texte coloré des corrections — base LOCALE
 * ===================================================================================
 *
 * Lignes #2898 et #2900 (réglage « Lecture facilitée » : police CALCULÉE, formules, interligne,
 * premier rendu) et #2937 (texte coloré des deux modèles retouchés, à l'écran puis dans le corrigé
 * PDF d'une fiche). Le réglage vit dans le navigateur (`localStorage.easyReading`) : aucune ligne
 * de profil n'est écrite ; le verrou des élèves 21 à 25 ne protège que leurs connexions.
 *
 * Les deux modèles du #2937 sont lus dans la base locale : ils portent déjà la retouche
 * `texte-colore` (`[…]{.bleu}`, `[…]{.orange}`, aucun `\textcolor`). Aucune fiche locale ne les
 * contient : le corrigé PDF est joué sur une fiche « Verifs9 couleurs » qui porte la même écriture.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
// Tests indépendants, rejoués l'un après l'autre : un rouge n'en saute pas d'autres
test.describe.configure({ mode: 'default' });

// Constantes

const LOCK = 'eleves-21-25';
const STUDENT = 'eleve21@local.test';
const STUDENT_PASSWORD = 'local-eleve';
const TRADUIRE = '78feafed-650f-44e0-a2c3-1e677809722b';
const PYTHON = 'e4784c78-13d5-49ac-b50b-b07efca03d19';
const PREFIX = 'Verifs9 couleurs';
let lockHeld = false;

// Functions

function seriesLink(templateId: string, seed: number, variation?: number): string {
	return buildSeriesLink(
		'',
		[
			{
				templateId,
				quantity: 1,
				delay: 0,
				...(variation === undefined ? {} : { variations: [variation] })
			}
		],
		{ mode: 'typing', seed }
	);
}

/** Règle le navigateur avant le premier chargement : lecture facilitée allumée ou non, échelle du texte */
async function presetSettings(page: Page, easy: boolean, scale?: number): Promise<void> {
	await page.addInitScript(
		({ easyOn, fontScale }) => {
			try {
				// Une fois par onglet : un rechargement garde ce que le test a posé ensuite
				if (sessionStorage.getItem('verifs9-reglages')) return;
				sessionStorage.setItem('verifs9-reglages', '1');
				if (easyOn) localStorage.setItem('easyReading', 'true');
				else localStorage.removeItem('easyReading');
				if (fontScale) localStorage.setItem('fontScale', String(fontScale));
			} catch {
				// stockage bloqué : rien
			}
		},
		{ easyOn: easy, fontScale: scale }
	);
}

async function openCard(
	page: Page,
	templateId: string,
	seed = 5,
	variation?: number
): Promise<Locator> {
	await gotoSettled(page, seriesLink(templateId, seed, variation));
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor({ timeout: 60_000 });
	await expect(card.getByRole('button', { name: 'Valider' })).toBeVisible();
	return card;
}

interface Measure {
	easyClass: boolean;
	main: string;
	statement: string;
	field: string;
	header: string;
	nav: string;
	letterSpacing: string;
	lineHeightPx: number;
	overrideHref: string | null;
}

/** Les polices et espacements CALCULÉS par le navigateur, sur la page de la série */
async function measure(page: Page): Promise<Measure> {
	return page.evaluate(() => {
		const style = (selector: string) => {
			const el = document.querySelector(selector);
			return el ? getComputedStyle(el) : null;
		};
		const statement = style('[data-testid="typing-card"] p');
		return {
			easyClass: document.documentElement.classList.contains('lecture-facilitee'),
			main: style('main')?.fontFamily ?? 'absent',
			statement: statement?.fontFamily ?? 'absent',
			field: style('math-field')?.fontFamily ?? 'absent',
			header: style('header')?.fontFamily ?? 'absent',
			nav: style('nav')?.fontFamily ?? 'absent',
			letterSpacing: statement?.letterSpacing ?? 'absent',
			lineHeightPx: parseFloat(statement?.lineHeight ?? 'NaN'),
			overrideHref: document.getElementById('mathlive-fonts-css')?.getAttribute('href') ?? null
		};
	});
}

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 120_000);
	assertLocalServerEnv();
	await acquireLock(LOCK);
	lockHeld = true;
	await sql(`delete from worksheets where created_by = $1 and description like $2`, [
		TEACHER_ID,
		`${PREFIX}%`
	]);
	await sql(`delete from exercises where created_by = $1 and source = 'verifs9c'`, [TEACHER_ID]);
});

test.beforeEach(() => {
	if (lockHeld) refreshLock(LOCK);
});

test.afterAll(async () => {
	try {
		await sql(`delete from worksheets where created_by = $1 and description like $2`, [
			TEACHER_ID,
			`${PREFIX}%`
		]);
		await sql(`delete from exercises where created_by = $1 and source = 'verifs9c'`, [TEACHER_ID]);
	} finally {
		if (lockHeld) releaseLock(LOCK);
	}
});

// ============================================================================
// #2898 — le bouton, le réglage mémorisé
// ============================================================================

/** Téléphone : l'en-tête n'a pas le bouton, il est dans le menu qui s'ouvre par le hamburger */
function isNarrow(page: Page): boolean {
	return (page.viewportSize()?.width ?? 1280) < 768;
}

/** Le bouton « Lecture facilitée » : dans l'en-tête (ordinateur) ou dans le menu ouvert (téléphone) */
async function easyControl(page: Page): Promise<Locator> {
	if (isNarrow(page)) {
		await page.keyboard.press('Escape');
		await page.getByRole('button', { name: 'Ouvrir le menu' }).locator('visible=true').click();
		const inMenu = page.getByRole('dialog').getByRole('button', { name: 'Lecture facilitée' });
		await expect(inMenu).toBeVisible();
		return inMenu;
	}
	const control = page
		.getByRole('button', { name: 'Lecture facilitée' })
		.locator('visible=true')
		.first();
	await expect(control).toBeVisible();
	return control;
}

/**
 * Clic sur le bouton. Au téléphone le bouton du menu est sous le bas de l'écran, hors d'atteinte du
 * doigt (écart, voir le test « menu mobile ») : on le clique par le DOM pour jouer le reste de la ligne.
 */
async function pressControl(page: Page, control: Locator): Promise<void> {
	if (isNarrow(page)) {
		await control.evaluate((el) => (el as HTMLElement).click());
		await page.keyboard.press('Escape');
	} else {
		await control.click();
	}
}

async function toggleEasy(page: Page): Promise<void> {
	await pressControl(page, await easyControl(page));
}

async function storedEasy(page: Page): Promise<string | null> {
	return page.evaluate(() => localStorage.getItem('easyReading'));
}

for (const who of ['élève', 'prof'] as const) {
	test(`#2898 — ${who} : au téléphone, le bouton « Lecture facilitée » du menu s’atteint au doigt`, async ({
		page
	}) => {
		test.setTimeout(240_000);
		test.skip(!isNarrow(page), 'menu mobile : téléphone seulement');
		if (who === 'élève') await login(page, STUDENT, STUDENT_PASSWORD);
		else await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/dashboard');
		const control = await easyControl(page);
		const box = await control.boundingBox();
		const height = page.viewportSize()?.height ?? 0;
		// E81 (corrigé) : la liste du menu défile, « Préférences » reste en bas de l'écran
		expect(box, 'bouton absent du menu').toBeTruthy();
		const hidden = (box?.y ?? 0) + (box?.height ?? 0) > height;
		expect(hidden, `bouton à y=${box?.y}, écran de ${height} px`).toBe(false);
		await control.click({ timeout: 5000 });
	});

	test(`#2898 — ${who} : bouton « Lecture facilitée » (en-tête ou menu), allumé il pose la classe et se souvient au rechargement, la page du profil a son bouton`, async ({
		page
	}) => {
		test.setTimeout(240_000);
		if (who === 'élève') await login(page, STUDENT, STUDENT_PASSWORD);
		else await login(page, TEACHER.email, TEACHER.password);
		await page.evaluate(() => localStorage.removeItem('easyReading'));
		await gotoSettled(page, '/dashboard');

		let control = await easyControl(page);
		await expect(control).toHaveAttribute('aria-pressed', 'false');
		expect(await storedEasy(page)).toBeNull();
		await pressControl(page, control);
		await expect(page.locator('html')).toHaveClass(/lecture-facilitee/);
		expect(await storedEasy(page)).toBe('true');
		// L'état du bouton suit
		control = await easyControl(page);
		await expect(control).toHaveAttribute('aria-pressed', 'true');

		// Recharger : toujours allumée, classe posée
		await gotoSettled(page, '/dashboard');
		await expect(page.locator('html')).toHaveClass(/lecture-facilitee/);
		control = await easyControl(page);
		await expect(control).toHaveAttribute('aria-pressed', 'true');

		// Le profil : un bouton « Lecture facilitée » à libellé, qui éteint
		await gotoSettled(page, '/dashboard/profile');
		const labelled = page.locator('main button', { hasText: 'Lecture facilitée' });
		await expect(labelled).toBeVisible();
		await expect(labelled).toHaveAttribute('aria-pressed', 'true');
		await expect(labelled).toHaveText(/Lecture facilitée/);
		await labelled.click();
		await expect(labelled).toHaveAttribute('aria-pressed', 'false');
		await expect(page.locator('html')).not.toHaveClass(/lecture-facilitee/);
		expect(await storedEasy(page)).toBe('false');
		await page.evaluate(() => localStorage.removeItem('easyReading'));
	});
}

// ============================================================================
// #2898 #2900 — la police calculée
// ============================================================================

test('#2898 #2900 — allumée : consignes et champ en Luciole, plus espacés, formules (champ et formule affichée) en Luciole Math, en-tête et menus inchangés ; éteinte : tout revient', async ({
	page
}) => {
	test.setTimeout(300_000);
	const errors = collectErrors(page);
	// Les fichiers de police de formules demandés au serveur : seuls ceux dont un glyphe sert sont téléchargés
	const mathFontFiles: string[] = [];
	page.on('request', (request) => {
		if (/\/fonts\/(luciole-math|katex-original)\//.test(request.url())) {
			mathFontFiles.push(request.url());
		}
	});
	await presetSettings(page, false);
	await openCard(page, TRADUIRE);
	const off = await measure(page);
	expect(off.easyClass).toBe(false);
	expect(off.main).toMatch(/^"?Inter/);
	expect(off.statement).not.toMatch(/Luciole/);
	expect(off.letterSpacing).toBe('normal');
	expect(off.overrideHref).toBeNull();

	// Allumer par le bouton, sans recharger
	await page.evaluate(() => {
		(window as unknown as { __sansRechargement?: boolean }).__sansRechargement = true;
	});
	await toggleEasy(page);
	await expect(page.locator('html')).toHaveClass(/lecture-facilitee/);
	await expect.poll(async () => (await measure(page)).overrideHref).toContain('luciole');
	const on = await measure(page);
	expect(on.main).toMatch(/^"?Luciole/);
	expect(on.statement).toMatch(/^"?Luciole/);
	expect(on.field).toMatch(/^"?Luciole/);
	// Lettres et lignes plus espacées (0,02 em de lettres ; interligne 1,75 au lieu de 1,5)
	expect(parseFloat(on.letterSpacing)).toBeGreaterThan(0);
	expect(on.lineHeightPx).toBeGreaterThan(off.lineHeightPx * 1.1);
	// En-tête et menus : mêmes polices qu'avant
	expect(on.header).toBe(off.header);
	expect(on.nav).toBe(off.nav);
	expect(on.header).not.toMatch(/Luciole/);

	// Formules affichées : ce sont des <math-span> à ombre fermée, que ni le navigateur ni CDP ne
	// détaillent ; la preuve est le téléchargement de la police Luciole Math (un fichier n'est
	// demandé que si un glyphe en sert), absente tant que le réglage était éteint.
	await expect(page.getByTestId('typing-card').locator('math-span').first()).toBeVisible();
	await expect
		.poll(() => mathFontFiles.filter((url) => url.includes('/fonts/luciole-math/')).length, {
			timeout: 20_000
		})
		.toBeGreaterThan(0);
	expect(
		await page.evaluate(
			() => (window as unknown as { __sansRechargement?: boolean }).__sansRechargement
		)
	).toBe(true);

	// Éteindre : tout revient en Inter / KaTeX
	await toggleEasy(page);
	await expect(page.locator('html')).not.toHaveClass(/lecture-facilitee/);
	await expect.poll(async () => (await measure(page)).overrideHref).toBeNull();
	const back = await measure(page);
	expect(back.main).toBe(off.main);
	expect(back.statement).toBe(off.statement);
	expect(back.letterSpacing).toBe('normal');
	expect(errors.errors, errors.errors.join('\n')).toEqual([]);
});

test('#2898 — taille du texte à 150 % : Luciole gardée, interligne agrandi d’autant ; recharger : toujours allumée', async ({
	page
}) => {
	test.setTimeout(240_000);
	await presetSettings(page, false, 1.5);
	await openCard(page, TRADUIRE);
	const off = await measure(page);
	await page.evaluate(() => localStorage.setItem('easyReading', 'true'));
	await gotoSettled(page, seriesLink(TRADUIRE, 5));
	await page.getByTestId('typing-card').locator('.flip-card-front').waitFor();
	const on = await measure(page);
	expect(on.easyClass).toBe(true);
	expect(on.statement).toMatch(/^"?Luciole/);
	// 1,75 rem × 1,5 (échelle) = 42 px, contre 1,5 rem × 1,5 = 36 px éteinte
	expect(on.lineHeightPx).toBeGreaterThan(off.lineHeightPx * 1.1);
	expect(on.lineHeightPx).toBeGreaterThan(38);
	await page.evaluate(() => {
		localStorage.removeItem('easyReading');
		localStorage.removeItem('fontScale');
	});
});

test('#2900 — recharger avec le réglage allumé : le texte est en Luciole dès le premier rendu (la police se lit sur chaque nouvelle <main>, jamais Inter d’abord)', async ({
	page
}) => {
	test.setTimeout(240_000);
	await presetSettings(page, true);
	// Observateur posé avant le chargement : famille calculée de chaque <main> à son apparition, puis
	// à chaque image ; classe de <html> à chaque étape
	await page.addInitScript(() => {
		const seen: { at: string; easyClass: boolean; family: string }[] = [];
		(window as unknown as { __premiersRendus: typeof seen }).__premiersRendus = seen;
		const record = (at: string) => {
			const main = document.querySelector('main');
			if (!main) return;
			seen.push({
				at,
				easyClass: document.documentElement.classList.contains('lecture-facilitee'),
				family: getComputedStyle(main).fontFamily
			});
		};
		new MutationObserver(() => record('mutation')).observe(document, {
			childList: true,
			subtree: true
		});
		let frames = 0;
		const tick = () => {
			record('image');
			if (++frames < 30) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
	await gotoSettled(page, '/a-propos');
	await page.waitForTimeout(1000);
	const seen = await page.evaluate(
		() =>
			(
				window as unknown as {
					__premiersRendus: { at: string; easyClass: boolean; family: string }[];
				}
			).__premiersRendus
	);
	expect(seen.length, 'aucun rendu observé').toBeGreaterThan(0);
	// Dès la première <main> vue : classe posée et pile de polices commençant par Luciole
	expect(seen[0].easyClass).toBe(true);
	expect(seen[0].family).toMatch(/^"?Luciole/);
	for (const step of seen) {
		expect(step.family, `${step.at} : ${step.family}`).not.toMatch(/^"?Inter/);
	}
	// La police est bien chargée ensuite (la pile CSS seule ne le prouve pas)
	await expect.poll(() => page.evaluate(() => document.fonts.check('16px Luciole'))).toBe(true);
	await page.evaluate(() => localStorage.removeItem('easyReading'));
});

// ============================================================================
// #2900 — petites lignes de texte du tableau de bord
// ============================================================================

for (const who of ['élève', 'prof'] as const) {
	test(`#2900 — tableau de bord ${who} : les petites lignes (text-xs, text-sm) s’espacent comme le reste du contenu (× 7/6)`, async ({
		page
	}) => {
		test.setTimeout(240_000);
		if (who === 'élève') await login(page, STUDENT, STUDENT_PASSWORD);
		else await login(page, TEACHER.email, TEACHER.password);
		await page.evaluate(() => localStorage.removeItem('easyReading'));
		await gotoSettled(page, '/dashboard');
		const lines = () =>
			page.evaluate(() => {
				const pick = (selector: string) =>
					[...document.querySelectorAll(`.dashboard-content ${selector}`)]
						.filter((el) => (el as HTMLElement).offsetParent !== null && el.textContent?.trim())
						.slice(0, 8)
						.map((el) => parseFloat(getComputedStyle(el).lineHeight));
				return {
					xs: pick('p.text-xs, li.text-xs'),
					sm: pick('p.text-sm, li.text-sm'),
					base: pick('p.text-base, li.text-base')
				};
			});
		const before = await lines();
		// Allume par le localStorage + la classe, comme le script de démarrage (le bouton est testé plus haut)
		await page.evaluate(() => {
			document.documentElement.classList.add('lecture-facilitee');
		});
		const after = await lines();
		const groups = ['xs', 'sm', 'base'] as const;
		const checked: string[] = [];
		for (const group of groups) {
			if (before[group].length === 0) continue;
			checked.push(group);
			expect(after[group].length).toBe(before[group].length);
			before[group].forEach((height, i) => {
				expect(
					after[group][i] / height,
					`${group} #${i} : ${height} → ${after[group][i]}`
				).toBeGreaterThan(1.12);
				expect(after[group][i] / height).toBeLessThan(1.22);
			});
		}
		// Il faut avoir mesuré de petites lignes, sinon la ligne n'est pas vérifiée
		expect(
			checked.some((group) => group === 'xs' || group === 'sm'),
			`aucune petite ligne mesurée sur le tableau de bord ${who}`
		).toBe(true);
	});
}

// ============================================================================
// #2898 — /a-propos
// ============================================================================

test('#2898 — /a-propos : section « Polices » (Luciole, Luciole Math, licences) ; titres de la page en Luciole quand le réglage est allumé, en-tête inchangé', async ({
	page
}) => {
	test.setTimeout(180_000);
	await presetSettings(page, true);
	await gotoSettled(page, '/a-propos');
	const polices = page.getByRole('heading', { name: 'Polices' });
	await expect(polices).toBeVisible();
	const section = page.locator('section[aria-labelledby="polices"]');
	await expect(section.getByRole('link', { name: 'Luciole', exact: true })).toBeVisible();
	await expect(section).toContainText('Luciole Math');
	await expect(section).toContainText('CC BY 4.0');
	const families = await page.evaluate(() => {
		const family = (selector: string) => {
			const el = document.querySelector(selector);
			return el ? getComputedStyle(el).fontFamily : 'absent';
		};
		return { title: family('main h1, main h2'), header: family('header') };
	});
	expect(families.title).toMatch(/^"?Luciole/);
	expect(families.header).not.toMatch(/Luciole/);
	await page.evaluate(() => localStorage.removeItem('easyReading'));
});

// ============================================================================
// #2937 — texte coloré des corrections
// ============================================================================

/**
 * Couleurs calculées des segments colorés d'une carte retournée : le texte coloré est écrit en
 * `style="color: var(--color-fig-bleu|orange)"` ; `math` = le segment contient une formule
 */
async function coloredSpans(
	card: Locator
): Promise<{ cls: string; color: string; text: string; math: boolean }[]> {
	return card.evaluate((root) =>
		[...root.querySelectorAll('span[style*="--color-fig-"]')].map((el) => {
			const style = el.getAttribute('style') ?? '';
			return {
				cls: style.includes('fig-bleu')
					? 'bleu'
					: style.includes('fig-orange')
						? 'orange'
						: 'autre',
				color: getComputedStyle(el).color,
				text: (el.textContent ?? '').trim().slice(0, 40),
				math: el.querySelector('math-span') !== null
			};
		})
	);
}

async function answerWrongly(page: Page, card: Locator): Promise<void> {
	await card.getByRole('button', { name: 'Valider' }).click();
	await expect(card.getByText('Correction', { exact: true }).first()).toBeVisible();
	await page.waitForTimeout(500);
}

for (const [label, templateId] of [
	['« Traduire une phrase en expression mathématique » (78feafed)', TRADUIRE],
	['« Lire une fonction Python plus complexe » (e4784c78)', PYTHON]
] as const) {
	test(`#2937 — ${label} : la retouche est en base, aucun \\textcolor lisible, couleurs calculées en clair et en sombre, un seul orange`, async ({
		page
	}) => {
		test.setTimeout(240_000);
		// La retouche `texte-colore` est dans la base locale : plus de \textcolor, des segments {.bleu} / {.orange}
		const stored = await sql<{ variations: unknown[] }>(
			`select variations from question_templates where id = $1`,
			[templateId]
		);
		const all = JSON.stringify(stored[0].variations);
		expect(all).not.toContain('textcolor');
		// Les variations qui portent du texte coloré : on joue la première (les autres n'en ont pas)
		const colored = stored[0].variations
			.map((v, index) => ({ index, hasOrange: /\]\{\.orange\}/.test(JSON.stringify(v)) }))
			.filter((v) => v.hasOrange);
		expect(colored.length, 'aucune variation avec du texte orange').toBeGreaterThan(0);

		await login(page, TEACHER.email, TEACHER.password);
		const card = await openCard(page, templateId, 3, colored[0].index);
		await answerWrongly(page, card);
		// Aucun code brut dans ce que le prof lit
		const text = await card.innerText();
		expect(text).not.toMatch(/textcolor|\{\{color|\{\.(bleu|orange)\}|\\color/);
		// Le texte coloré est bien rendu : segments bleus et oranges présents dans la correction

		const colors: Record<string, { cls: string; color: string; text: string; math: boolean }[]> =
			{};
		for (const theme of ['light', 'dark'] as const) {
			await setTheme(page, theme);
			colors[theme] = await coloredSpans(card);
			expect(colors[theme].length, `segments colorés en thème ${theme}`).toBeGreaterThan(0);
			// Un seul orange (texte et formules), jamais confondu avec la couleur du texte courant
			const oranges = new Set(colors[theme].filter((s) => s.cls === 'orange').map((s) => s.color));
			expect(oranges.size, `oranges en ${theme} : ${[...oranges]}`).toBe(1);
			const body = await card.evaluate((root) => getComputedStyle(root).color);
			expect([...oranges][0]).not.toBe(body);
		}
		// L'orange suit le thème (il existe une teinte claire et une sombre) ou reste lisible : il est calculé, pas écrit en dur
		const orangeLight = colors.light.find((s) => s.cls === 'orange')?.color;
		const orangeDark = colors.dark.find((s) => s.cls === 'orange')?.color;
		expect(orangeLight).toBeTruthy();
		expect(orangeDark).toBeTruthy();
		if (templateId === TRADUIRE) {
			const blue = (theme: 'light' | 'dark') => colors[theme].find((s) => s.cls === 'bleu');
			expect(blue('light')?.text).toMatch(/la somme|le produit|la différence|le quotient/);
			expect(blue('light')?.color).not.toBe(orangeLight);
			// Une formule entièrement colorée : même orange que le texte coloré voisin
			const formula = colors.light.find((s) => s.cls === 'orange' && s.math);
			expect(formula, 'formule orange absente').toBeTruthy();
		}
		await setTheme(page, 'light');
	});
}

test('#2937 — corrigé PDF d’une fiche : texte coloré sans code brut, « la somme » en bleu, le terme (texte et formule) d’un seul orange', async ({
	page
}, testInfo) => {
	test.setTimeout(300_000);
	// Aucune fiche locale ne contient ces modèles : une fiche « Verifs9 couleurs » porte la même écriture
	const solution =
		'Verifs9 : la phrase commence par [« la somme »]{.bleu} : son premier terme est [« le produit de 3 par 5 »]{.orange}, soit [$3 \\times 5$]{.orange}.';
	const created = await sql<{ id: string }>(
		`insert into exercises (title, source, grades, topic, created_by, category, variations)
		 values ('Verifs9 couleurs', 'verifs9c', '{}', 'Verifs9', $1, 'automatisme', $2::jsonb) returning id`,
		[
			TEACHER_ID,
			JSON.stringify([
				{ label: 'guided', hints: [], statement_md: 'Verifs9 énoncé.', solution_md: solution }
			])
		]
	);
	const worksheet = await createWorksheet({
		title: `Verifs9 couleurs ${testInfo.project.name}`,
		styleId: STYLE_IDS.standard,
		exercises: [{ exercise: { id: created[0].id, title: 'Verifs9 couleurs' } }]
	});
	await sql(`update worksheets set description = $2 where id = $1`, [worksheet, `${PREFIX} pdf`]);

	await login(page, TEACHER.email, TEACHER.password);
	await gotoSettled(page, `/dashboard/teacher/contenu/worksheets/${worksheet}`);
	await expect(async () => {
		await page.getByRole('tab', { name: 'PDF' }).click();
		await expect(page.getByRole('combobox', { name: /^PDF à générer/ })).toBeVisible({
			timeout: 8000
		});
	}).toPass({ timeout: 90_000 });
	await page.getByRole('combobox', { name: /^PDF à générer/ }).click();
	await page
		.getByRole('option', { name: /^Corrigé/ })
		.first()
		.click();
	const button = page.getByRole('button', { name: 'Telecharger' });
	await expect(button).toBeEnabled({ timeout: 90_000 });
	const download = page.waitForEvent('download', { timeout: 120_000 });
	await button.click();
	const target = resolve(FICHES_TMP, `p9-couleurs-${testInfo.project.name}.pdf`);
	mkdirSync(dirname(target), { recursive: true });
	await (await download).saveAs(target);

	const { boxes } = pdfBoxes(target);
	const joined = boxes.map((b) => b.text).join(' ');
	expect(joined).not.toMatch(/textcolor|\{\.bleu\}|\{\.orange\}|\[«/);
	const find = (needle: string): PdfBox => {
		const box = boxes.find((b) => b.text.includes(needle));
		expect(box, `« ${needle} » absent du PDF : ${joined.slice(0, 400)}`).toBeTruthy();
		return box as PdfBox;
	};
	/** Teinte dominante des pixels colorés (non gris) d'une boîte de texte */
	const tint = (box: PdfBox): { r: number; g: number; b: number } | null => {
		const dpi = 100;
		const raster = rasterPage(target, box.page, dpi);
		const scale = dpi / 72;
		let n = 0;
		const sum = { r: 0, g: 0, b: 0 };
		for (let y = Math.floor(box.top * scale); y < (box.top + box.height) * scale; y++) {
			for (let x = Math.floor(box.left * scale); x < (box.left + box.width) * scale; x++) {
				const i = (y * raster.width + x) * 3;
				const [r, g, b] = [raster.data[i], raster.data[i + 1], raster.data[i + 2]];
				if (Math.max(r, g, b) - Math.min(r, g, b) > 60) {
					n++;
					sum.r += r;
					sum.g += g;
					sum.b += b;
				}
			}
		}
		return n === 0 ? null : { r: sum.r / n, g: sum.g / n, b: sum.b / n };
	};
	const blue = tint(find('la somme'));
	const orangeText = tint(find('le produit de 3 par 5'));
	expect(blue, '« la somme » sans couleur').toBeTruthy();
	expect(orangeText, 'le terme sans couleur').toBeTruthy();
	expect((blue as { b: number; r: number }).b).toBeGreaterThan(
		(blue as { b: number; r: number }).r
	);
	expect((orangeText as { r: number; b: number }).r).toBeGreaterThan(
		(orangeText as { r: number; b: number }).b
	);
	// La formule orange : même teinte que le texte orange voisin (un seul orange)
	const formulaBox = boxes.find(
		(b) =>
			b.page === find('le produit de 3 par 5').page &&
			/×|3$/.test(b.text) &&
			b.left > find('soit').left
	);
	expect(formulaBox, 'formule orange absente du PDF').toBeTruthy();
	const orangeFormula = tint(formulaBox as PdfBox);
	expect(orangeFormula).toBeTruthy();
	const [t, f] = [
		orangeText as { r: number; g: number; b: number },
		orangeFormula as { r: number; g: number; b: number }
	];
	expect(Math.abs(t.r - f.r)).toBeLessThan(40);
	expect(Math.abs(t.g - f.g)).toBeLessThan(40);
	expect(Math.abs(t.b - f.b)).toBeLessThan(40);
});
