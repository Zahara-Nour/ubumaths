import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildSeriesLink } from '../../src/lib/validation/series';
import { assertLocalServerEnv, sql } from './helpers/carnet';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';

/**
 * Modèles de questions, paquet 8 (tri des vérifications manuelles) — base LOCALE
 * ==============================================================================
 *
 * Reprend les lignes #2137 (deux cases d'un même modèle), #2726 / #2729 (numération au CM1),
 * #2706 (problèmes au CM1), #2698 (périmètres au CM1), #2764 (corrigé de « Maximum local »,
 * variation 3) et #2801 / #2805 (décimaux à virgule en dérivation de 1re techno) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Les modèles de la base locale portent les identifiants de la prod : on joue le VRAI modèle
 * publié par le lien de série public (`/automaths/test?…&mode=typing&graine=…`), variation et
 * graine fixées, jamais une copie. Le catalogue se lit par `/automaths?niveau=CM1&vue=notions&…`.
 * Rien n'est écrit en base (une seule lecture SQL : le dénombrement de modèles de #2698).
 *
 * Captures à l'œil : `.captures/verifs/modeles-paquet8/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(150_000));

// Constantes

const SHOTS = '.captures/verifs/modeles-paquet8';
/** « Utiliser un pourcentage : réduction » (5e) : deux cases dans l'énoncé */
const REDUCTION = 'ef08a256-64ee-49d4-aad7-d87a8a9d7d02';
const DENOMBRER_COLLECTION = 'd00b1f79-7982-43d5-858b-0255689079e1';
const COMPARER_COLLECTIONS = 'a047650a-0f85-4bc8-b0e0-51b51b18aeb4';
const LIRE_DEMI_DROITE = '4241d466-9668-49b2-8f36-015be0af4ae9';
const PLACER_DEMI_DROITE = 'a62b2ce5-d4d0-4c02-9850-e70b6f2f5546';
const ESTIMER = 'c08f689b-0039-4388-8671-5bcd8a220246';
const PARTIES_TOUT = '8a1d9a4a-cc92-4559-9a57-d1a746b5382d';
const MAXIMUM_LOCAL = '83b1f614-95db-4d74-9fbf-d4d502ee8c01';
const TAUX_DE_VARIATION = '06bee149-e006-4b9f-8f0b-1e21ace0a1cf';
const TANGENTE_SECANTES = '5643abd0-1454-4b03-b612-3fd3b1a1ca33';
const DERIVEE_POLYNOME = '77a599ef-2cee-4ac2-b1cc-f0036d56b9d7';

/** Notions du catalogue (nœuds de classification) */
const NOTION_ENTIERS = '8bd9867e-2828-4155-9027-31de2bedffe8';
const NOTION_DECIMAUX = 'c1718129-d89c-4291-8015-905e41307b0d';
const NOTION_PROBLEMES = '915e7000-caf2-465e-b6f5-eaa803f4b691';
const NOTION_PERIMETRES = '390f3077-a13b-4556-9e85-e304a77c71c5';

/** Plus petite taille de texte lisible d'une étiquette de figure au téléphone, en px rendus */
const MIN_LABEL_PX = 11;
/** Plus petit écart entre deux graduations pour le doigt, en px */
const MIN_TICK_GAP_PX = 20;

// Fonctions

const isTouch = (): boolean => test.info().project.use.hasTouch === true;
const projectName = (): string => test.info().project.name;

async function press(locator: Locator): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (isTouch()) await locator.tap();
	else await locator.click();
}

async function shot(page: Page, name: string): Promise<void> {
	await mkdir(SHOTS, { recursive: true });
	await page
		.waitForFunction(
			() => document.getAnimations().every((a) => a.playState !== 'running'),
			undefined,
			{
				timeout: 5000
			}
		)
		.catch(() => undefined);
	await page.screenshot({ path: `${SHOTS}/${name}-${projectName()}.png` });
}

/** Joue une question par le lien de série public ; rend la carte une fois prête. */
async function openSeries(
	page: Page,
	templateId: string,
	seed: number,
	variation: number
): Promise<Locator> {
	const link = buildSeriesLink(
		'',
		[{ templateId, quantity: 1, delay: 0, variations: [variation] }],
		{ mode: 'typing', seed }
	);
	await gotoSettled(page, link);
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor({ timeout: 45_000 });
	await expect(card.getByRole('button', { name: 'Valider' })).toBeVisible();
	await page.waitForFunction(() => document.getAnimations().length === 0, undefined, {
		timeout: 5000
	});
	return card;
}

/** Ferme le clavier virtuel s'il est ouvert (il couvre « Valider » sur téléphone) */
async function closeKeyboard(page: Page): Promise<void> {
	const close = page.locator('.math-keyboard-close');
	if ((await close.count()) > 0) {
		await close.click();
		await page.waitForFunction(
			() =>
				!(window as Window & { mathVirtualKeyboard?: { visible: boolean } }).mathVirtualKeyboard
					?.visible
		);
	}
}

/**
 * Ce qui est tapé dans UNE case MathLive : le contenu de ses gabarits (`\placeholder[0]{6,1}`),
 * sinon sa valeur entière ; ce qui entoure le gabarit (`\text{taux}=`, `~\text{\euro}`) n'en fait pas partie
 */
async function typedIn(field: Locator): Promise<string> {
	const value = await field.evaluate((el) => (el as HTMLElement & { value: string }).value);
	const holes = [...value.matchAll(/\\placeholder\[\d+\]\{([^}]*)\}/g)].map((m) => m[1]);
	return (holes.length > 0 ? holes.join('') : value).trim();
}

/**
 * Met le focus dans la case MathLive voulue (geste réel : toucher ou clic), puis tape. MathLive
 * perd parfois les premières frappes qui suivent le focus : on recommence tant que la case reste vide.
 */
async function typeInto(page: Page, field: Locator, text: string): Promise<void> {
	for (let attempt = 1; attempt <= 3; attempt++) {
		// Le clavier virtuel de la case précédente peut couvrir celle-ci
		await closeKeyboard(page);
		// Une case à gabarit (« ? ») se touche sur son carré, pas à côté : c'est lui qui prend la frappe
		const prompt = field.locator('.ML__prompt');
		if ((await prompt.count()) > 0) {
			// Au doigt, par les coordonnées du carré (un autre élément de la case reçoit le toucher)
			await prompt.first().scrollIntoViewIfNeeded();
			const box = await prompt.first().boundingBox();
			if (!box) throw new Error('carré de la case sans boîte');
			if (isTouch()) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
			else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		} else {
			await press(field);
		}
		await expect.poll(() => field.evaluate((el) => el === document.activeElement)).toBe(true);
		await page.waitForTimeout(500);
		await page.keyboard.type(text, { delay: 80 });
		await page.waitForTimeout(200);
		if ((await typedIn(field)) !== '') return;
	}
	throw new Error(`« ${text} » ne s'écrit dans aucune case après trois essais`);
}

/** Ce qui est tapé dans chaque case MathLive de la face avant (une valeur par case) */
async function fieldValues(card: Locator): Promise<string[]> {
	const fields = card.locator('.flip-card-front math-field');
	const count = await fields.count();
	const values: string[] = [];
	for (let i = 0; i < count; i++) values.push(await typedIn(fields.nth(i)));
	return values;
}

/** Les formules (LaTeX source) d'une zone */
function formulas(zone: Locator): Promise<string[]> {
	return zone.locator('math-span, math-div').allTextContents();
}

/** Valide et rend le verdict lu sur la carte (« Juste », « Faux », « ½ point ») */
async function validate(page: Page, card: Locator): Promise<string> {
	await closeKeyboard(page);
	await card.getByRole('button', { name: 'Valider' }).click();
	const verdict = card.getByText(/^(Juste|Faux|½ point)$/).first();
	await expect(verdict).toBeVisible();
	const text = ((await verdict.textContent()) ?? '').trim();
	return text;
}

/** Chaque titre de carte du catalogue, par section (`rubrique-<id>`), après avoir fait défiler la page */
async function catalogueTitles(page: Page, url: string): Promise<Map<string, string[]>> {
	await page.goto(url);
	await page.waitForLoadState('networkidle');
	await page.locator('#catalogue-titre').waitFor();
	const sections = page.locator('main section[id^="rubrique-"]');
	await expect.poll(() => sections.count(), { timeout: 30_000 }).toBeGreaterThan(0);
	const result = new Map<string, string[]>();
	const count = await sections.count();
	for (let i = 0; i < count; i++) {
		const section = sections.nth(i);
		await section.evaluate((el) => el.scrollIntoView({ block: 'start' }));
		// Les cartes d'une section ne se montent qu'à son approche
		await expect
			.poll(async () => section.locator('.tile-title').count(), { timeout: 30_000 })
			.toBeGreaterThan(0);
		const id = (await section.getAttribute('id')) ?? '';
		const titles = (await section.locator('.tile-title').allTextContents()).map((t) =>
			t.replace(/\s+/g, ' ').replace(/’/g, "'").trim()
		);
		result.set(id.replace('rubrique-', ''), titles);
	}
	return result;
}

// ============================================================================
// #2137 — deux cases d'un même modèle
// ============================================================================

test('#2137 — « Utiliser un pourcentage : réduction » (5e, ef08a256, proportionnalité) : taper dans la 2e case n’écrit que dans la 2e, jamais aussi dans la 1re ; et inversement', async ({
	page
}) => {
	const card = await openSeries(page, REDUCTION, 1, 0);
	const fields = card.locator('.flip-card-front math-field');
	await expect(fields).toHaveCount(2);
	expect(await fieldValues(card), 'au départ, les deux cases sont vides').toEqual(['', '']);

	await typeInto(page, fields.nth(1), '7');
	await expect.poll(() => fieldValues(card)).toEqual(['', '7']);
	await shot(page, '2137-deuxieme-case');

	// Puis dans la 1re : la 2e garde son « 7 »
	await typeInto(page, fields.nth(0), '4');
	await expect.poll(() => fieldValues(card)).toEqual(['4', '7']);
	await shot(page, '2137-les-deux-cases');
});

// ============================================================================
// #2726 / #2729 — numération au CM1
// ============================================================================

test.describe('#2726 #2729 — numération au CM1', () => {
	test('#2726 #2729 — Entiers : numération : dénombrement, ordre et droite graduée rangent leurs modèles, au niveau CM1', async ({
		page
	}) => {
		const sections = await catalogueTitles(
			page,
			`/automaths?niveau=CM1&vue=notions&notion=${NOTION_ENTIERS}`
		);
		const expected: Record<string, string[]> = {
			// dénombrement
			'04f3bf0d-71d1-4c76-b01d-174867712ff5': [
				'Dénombrer une collection organisée en groupements',
				'Construire une quantité avec des paquets'
			],
			// ordre
			'a95bae6c-0be9-4cde-b5db-74a1035dbef1': ['Comparer deux collections organisées'],
			// droite graduée
			'bcd6323e-77da-4716-9dfc-62f7e98817d8': [
				'Lire un nombre sur une demi-droite graduée',
				'Placer un nombre sur une demi-droite graduée'
			]
		};
		for (const [section, titles] of Object.entries(expected)) {
			expect([...sections.keys()], `section ${section} au catalogue`).toContain(section);
			for (const title of titles) {
				expect(sections.get(section), `« ${title} » sous sa sous-notion`).toContain(title);
			}
		}
		await shot(page, '2726-entiers-numeration');
	});

	test('#2726 #2729 — Décimaux : numération : « Unités, dixièmes, centièmes » (décomposition) et « Estimer le résultat d’une opération » (arrondis et ordres de grandeur), au niveau CM1', async ({
		page
	}) => {
		const sections = await catalogueTitles(
			page,
			`/automaths?niveau=CM1&vue=notions&notion=${NOTION_DECIMAUX}`
		);
		// décomposition
		expect(sections.get('717c9f23-fbde-4444-804c-6fb51394ae9a')).toContain(
			'Unités, dixièmes, centièmes'
		);
		// arrondis et ordres de grandeur
		expect(sections.get('883b5c2e-93c3-42f8-9f07-78b89d4798fe')).toContain(
			"Estimer le résultat d'une opération"
		);
		await shot(page, '2726-decimaux-numeration');
	});

	test('#2726 #2729 — collection de plus de dix plaques lisible : « Dénombrer une collection organisée » (11 à 19 plaques) tient dans l’écran, chaque objet a une taille de doigt à l’œil', async ({
		page
	}) => {
		const card = await openSeries(page, DENOMBRER_COLLECTION, 3, 0);
		await checkCollection(page, card, 'dénombrement');
		await shot(page, '2726-collection-denombrement');
	});

	test('#2726 #2729 — « Comparer deux collections organisées » (plus de dix plaques par collection) : les deux collections A et B tiennent dans l’écran, lisibles', async ({
		page
	}) => {
		const card = await openSeries(page, COMPARER_COLLECTIONS, 3, 0);
		await checkCollection(page, card, 'comparaison', 2);
		await shot(page, '2726-collection-comparaison');
	});

	test('#2726 #2729 — demi-droite graduée à pas de 10 000 : « Lire un nombre » a ses graduations lisibles, sans chevauchement', async ({
		page
	}) => {
		const card = await openSeries(page, LIRE_DEMI_DROITE, 1, 1);
		const line = card.locator('.flip-card-front .number-line-container').first();
		await expect(line).toBeVisible();
		const reading = await readLine(line);
		expect(reading.ticks, 'dix ou onze graduations').toBeGreaterThanOrEqual(10);
		expect(reading.step, 'pas de 10 000').toBe(10_000);
		expectReadableLine(reading, 'pas de 10 000');
		await expectNoHorizontalOverflow(page, 'lire un nombre, pas de 10 000');
		await shot(page, '2726-lire-pas-10000');
	});

	test('#2726 #2729 — demi-droite graduée à pas de 100 000 : « Lire un nombre » a ses graduations lisibles, sans chevauchement', async ({
		page
	}) => {
		const card = await openSeries(page, LIRE_DEMI_DROITE, 3, 2);
		const line = card.locator('.flip-card-front .number-line-container').first();
		await expect(line).toBeVisible();
		const reading = await readLine(line);
		expect(reading.ticks, 'dix ou onze graduations').toBeGreaterThanOrEqual(10);
		expect(reading.step, 'pas de 100 000').toBe(100_000);
		expectReadableLine(reading, 'pas de 100 000');
		await expectNoHorizontalOverflow(page, 'lire un nombre, pas de 100 000');
		await shot(page, '2726-lire-pas-100000');
	});

	for (const [label, seed, variation] of [
		['10 000', 1, 1],
		['100 000', 3, 2]
	] as const) {
		test(`#2726 #2729 — « Placer un nombre » à pas de ${label} : le point se place au doigt sur sa graduation, Valider → Juste`, async ({
			page
		}) => {
			const card = await openSeries(page, PLACER_DEMI_DROITE, seed, variation);
			const zone = card.getByRole('slider', { name: 'Droite graduée : ton point' });
			await expect(zone).toBeVisible();
			const target = Number(
				(await formulas(card.locator('.flip-card-front')))[0].replace(/\\,|\s/g, '')
			);
			expect(Number.isInteger(target) && target > 0, 'le nombre à placer est lu').toBe(true);
			const ticks = zone.locator('.nl-tick');
			const tickCount = await ticks.count();
			expect(tickCount, 'dix ou onze graduations dans la zone').toBeGreaterThanOrEqual(10);
			// Un toucher par graduation : le point s'arrête là où on touche
			let placed = false;
			for (let k = 0; k < tickCount && !placed; k++) {
				const box = await ticks.nth(k).boundingBox();
				if (!box) throw new Error(`graduation ${k} sans boîte`);
				const x = box.x + box.width / 2;
				const y = box.y + box.height / 2;
				if (isTouch()) await page.touchscreen.tap(x, y);
				else await page.mouse.click(x, y);
				const text = (await zone.getAttribute('aria-valuetext')) ?? '';
				expect(text, `graduation ${k} : le point s'est posé`).toMatch(/^point sur \d+$/);
				placed = Number(text.replace('point sur ', '')) === target;
			}
			expect(placed, `le point se pose sur ${target}`).toBe(true);
			await shot(page, `2726-placer-${label.replace(' ', '')}`);
			expect(await validate(page, card)).toBe('Juste');
		});
	}

	test('#2726 #2729 — « Estimer le résultat d’une opération » : le corrigé écrit les arrondis avec ≈', async ({
		page
	}) => {
		const card = await openSeries(page, ESTIMER, 1, 0);
		const radios = card.locator('.flip-card-front').getByRole('radio');
		await expect(radios).toHaveCount(4);
		// L'estimation juste est la 1re des quatre choix de la fiche ; l'ordre est mélangé : on lit
		// la bonne valeur à l'énoncé (x + y + z arrondis à la centaine) pour choisir une AUTRE réponse
		const statement = await formulas(card.locator('.flip-card-front'));
		const numbers = (statement.find((f) => f.includes('\\approx')) ?? '').match(/\d+/g) ?? [];
		expect(numbers.length, 'trois nombres à additionner').toBe(3);
		const juste = numbers.reduce((s, n) => s + Math.round(Number(n) / 100) * 100, 0);
		const choices = await radios.allTextContents();
		const wrong = choices.findIndex((c) => !c.replace(/\s/g, '').includes(String(juste)));
		expect(wrong, 'un choix faux existe').toBeGreaterThanOrEqual(0);
		await press(radios.nth(wrong));
		expect(await validate(page, card)).toBe('Faux');
		const back = card.locator('.flip-card-back, [data-testid="correction-view"]').first();
		const text = (await formulas(card)).join(' | ');
		expect(text, 'corrigé : arrondis écrits avec ≈').toContain('\\approx');
		await expect(back).toBeAttached();
		await shot(page, '2726-estimer-corrige');
	});
});

/** Une collection (dessin SVG) lisible : dans l'écran, plus de dix plaques, objets d'une taille suffisante */
async function checkCollection(
	page: Page,
	card: Locator,
	label: string,
	figures = 1
): Promise<void> {
	const drawings = card.locator('.flip-card-front svg.collection-dessin');
	await expect(drawings).toHaveCount(figures);
	const viewport = page.viewportSize();
	if (!viewport) throw new Error('fenêtre sans taille');
	const readings = await drawings.evaluateAll((svgs) =>
		svgs.map((svg) => {
			const box = svg.getBoundingClientRect();
			const plaques = [...svg.querySelectorAll('.collection-objet')].filter((o) =>
				[...o.classList].some((c) => c.startsWith('collection-plaque'))
			);
			const widths = plaques.map((p) => p.getBoundingClientRect().width);
			const all = [...svg.querySelectorAll('.collection-objet')].map(
				(o) => o.getBoundingClientRect().width
			);
			return { left: box.left, right: box.right, plaques: plaques.length, widths, all };
		})
	);
	for (const [index, reading] of readings.entries()) {
		const where = `${label}, dessin ${index + 1}`;
		expect(reading.left, `${where} : bord gauche dans l'écran`).toBeGreaterThanOrEqual(0);
		expect(reading.right, `${where} : bord droit dans l'écran`).toBeLessThanOrEqual(viewport.width);
		expect(Math.min(...reading.all), `${where} : plus petit objet (px)`).toBeGreaterThanOrEqual(6);
	}
	// Au moins un dessin a plus de dix plaques (l'autre collection de la comparaison peut en avoir moins)
	expect(
		Math.max(...readings.map((r) => r.plaques)),
		`${label} : une collection de plus de dix plaques`
	).toBeGreaterThan(10);
	await expectNoHorizontalOverflow(page, label);
}

interface LineReading {
	ticks: number;
	step: number;
	/** Étiquettes de graduation : texte, taille rendue, boîte */
	labels: { text: string; px: number; left: number; right: number }[];
	/** Écart le plus petit entre deux graduations voisines, en px écran */
	minGap: number;
	left: number;
	right: number;
}

/** Lit une droite graduée rendue : graduations, étiquettes et leur taille réellement affichée */
async function readLine(line: Locator): Promise<LineReading> {
	return line.evaluate((container) => {
		const svg = container.querySelector('svg')!;
		const svgBox = svg.getBoundingClientRect();
		const scale = svgBox.width / svg.viewBox.baseVal.width;
		const xs = [...container.querySelectorAll('.nl-tick')].map(
			(t) => t.getBoundingClientRect().left
		);
		const labels = [...container.querySelectorAll('.number-line-label')].map((label) => {
			const formula = label.querySelector('math-span, math-div') ?? label;
			const box = formula.getBoundingClientRect();
			return {
				text: (label.textContent ?? '').replace(/\s+/g, ''),
				px: parseFloat(getComputedStyle(formula).fontSize) * scale,
				left: box.left,
				right: box.right
			};
		});
		const gaps = xs.slice(1).map((x, i) => x - xs[i]);
		// Les étiquettes en nombres : « 100000 » → pas = (étiquette 2 − étiquette 1) / 5
		const values = labels.map((l) => Number(l.text.replace(/\\,/g, '').replace(/[^\d]/g, '')));
		return {
			ticks: xs.length,
			step: (values[1] - values[0]) / 5,
			labels,
			minGap: Math.min(...gaps),
			left: svgBox.left,
			right: svgBox.right
		};
	});
}

function expectReadableLine(reading: LineReading, label: string): void {
	expect(reading.labels.length, `${label} : étiquettes mesurées`).toBeGreaterThanOrEqual(2);
	for (const l of reading.labels) {
		expect(l.px, `${label} : taille de « ${l.text} »`).toBeGreaterThanOrEqual(MIN_LABEL_PX);
		expect(l.left, `${label} : « ${l.text} » dans l'écran (gauche)`).toBeGreaterThanOrEqual(0);
	}
	const sorted = [...reading.labels].sort((a, b) => a.left - b.left);
	for (let i = 1; i < sorted.length; i++) {
		expect(
			sorted[i - 1].right,
			`${label} : « ${sorted[i - 1].text} » ne touche pas « ${sorted[i].text} »`
		).toBeLessThanOrEqual(sorted[i].left);
	}
	expect(reading.minGap, `${label} : écart entre graduations`).toBeGreaterThanOrEqual(
		MIN_TICK_GAP_PX
	);
}

// ============================================================================
// #2706 — problèmes arithmétiques au CM1
// ============================================================================

test.describe('#2706 — problèmes au CM1', () => {
	test('#2706 — Problèmes arithmétiques : les 10 modèles du lot 6 sont rangés sous leur sous-notion, au niveau CM1', async ({
		page
	}) => {
		const sections = await catalogueTitles(
			page,
			`/automaths?niveau=CM1&vue=notions&notion=${NOTION_PROBLEMES}`
		);
		const expected: Record<string, string[]> = {
			// parties-tout ×2
			'f1e92f10-d38a-4380-8931-9999da4b9dad': [
				"Problèmes parties-tout (jusqu'à 999 999)",
				'Problèmes parties-tout : décimaux, fractions'
			],
			// comparaison + comparaison multiplicative
			'ed8918f5-1ba7-4958-873e-8a2a80505cf7': [
				'Problèmes de comparaison',
				'Comparaison multiplicative'
			],
			// en deux étapes ×2
			'46725fad-119b-4aab-ab22-b9024bd502ee': [
				'Problèmes additifs en deux ou trois étapes',
				'Problèmes mixtes : les quatre opérations'
			],
			// multiplicatifs ×2
			'4efb9dac-32f5-4af2-be68-e3a06d67dcb1': [
				'Problèmes multiplicatifs : partage exact',
				'Problèmes de partage avec un reste'
			],
			// dénombrement (produits cartésiens)
			'b0787a89-0c90-4d8f-8a44-dcb71727abc5': ['Problèmes de dénombrement'],
			// optimisation
			'e516a19a-dea9-48f8-9894-a307f1acd801': ["Problèmes d'optimisation"]
		};
		let total = 0;
		for (const [section, titles] of Object.entries(expected)) {
			expect([...sections.keys()], `section ${section} au catalogue`).toContain(section);
			for (const title of titles) {
				expect(sections.get(section), `« ${title} » sous sa sous-notion`).toContain(title);
				total++;
			}
		}
		expect(total, 'dix modèles vérifiés').toBe(10);
		await shot(page, '2706-problemes-cm1');
	});

	test('#2706 — « Problèmes parties-tout (jusqu’à 999 999) » : répondre faux montre le schéma en barres du corrigé, lisible, avec « ? » sur la partie cherchée', async ({
		page
	}) => {
		const card = await openSeries(page, PARTIES_TOUT, 1, 0);
		await typeInto(page, card.locator('.flip-card-front math-field').first(), '7');
		expect(await validate(page, card)).toBe('Faux');
		const figure = card.locator('svg.schema-barres-figure').first();
		await figure.scrollIntoViewIfNeeded();
		await expect(figure).toBeVisible();
		// Les formules du schéma se composent une fois à l'écran
		await page.waitForTimeout(400);
		const viewport = page.viewportSize();
		if (!viewport) throw new Error('fenêtre sans taille');
		const reading = await figure.evaluate((svg) => {
			const box = svg.getBoundingClientRect();
			const viewBox = (svg as SVGSVGElement).viewBox.baseVal;
			const scale = viewBox.width > 0 ? box.width / viewBox.width : 1;
			const texts = [...svg.querySelectorAll('text')].map((t) => ({
				text: (t.textContent ?? '').trim(),
				px: parseFloat(getComputedStyle(t).fontSize) * scale,
				left: t.getBoundingClientRect().left,
				right: t.getBoundingClientRect().right
			}));
			return { left: box.left, right: box.right, texts };
		});
		expect(reading.texts.length, 'étiquettes du schéma mesurées').toBeGreaterThanOrEqual(3);
		expect(
			reading.texts.some((t) => t.text.includes('?')),
			'« ? » sur la partie cherchée'
		).toBe(true);
		expect(reading.left, 'schéma : bord gauche dans l’écran').toBeGreaterThanOrEqual(0);
		expect(reading.right, 'schéma : bord droit dans l’écran').toBeLessThanOrEqual(viewport.width);
		for (const t of reading.texts) {
			expect(t.px, `taille de « ${t.text} »`).toBeGreaterThanOrEqual(MIN_LABEL_PX);
			expect(t.left, `« ${t.text} » dans l’écran`).toBeGreaterThanOrEqual(0);
			expect(t.right, `« ${t.text} » dans l’écran`).toBeLessThanOrEqual(viewport.width);
		}
		await expectNoHorizontalOverflow(page, 'corrigé du schéma en barres');
		await shot(page, '2706-schema-barres');
	});
});

// ============================================================================
// #2698 — périmètres au CM1
// ============================================================================

test.describe('#2698 — périmètres au CM1', () => {
	test('#2698 — « Qu’est-ce que le périmètre ? » (modèle du CE2) est parmi les modèles du CM1, sous Grandeurs et mesures › Périmètres, à côté des 3 nouveaux', async ({
		page
	}) => {
		const sections = await catalogueTitles(
			page,
			`/automaths?niveau=CM1&vue=notions&notion=${NOTION_PERIMETRES}`
		);
		const all = [...sections.values()].flat();
		for (const title of [
			"Qu'est-ce que le périmètre ?",
			"Calculer le périmètre d'un polygone",
			'Problèmes : calculer un périmètre',
			'Problèmes : retrouver un côté connaissant le périmètre'
		]) {
			expect(all, `« ${title} » au CM1`).toContain(title);
		}
		await shot(page, '2698-perimetres-cm1');
	});

	test('#2698 — « Qu’est-ce que le périmètre ? » reste visible au CE2', async ({ page }) => {
		const sections = await catalogueTitles(
			page,
			`/automaths?niveau=CE2&vue=notions&notion=${NOTION_PERIMETRES}`
		);
		expect([...sections.values()].flat()).toContain("Qu'est-ce que le périmètre ?");
		await shot(page, '2698-perimetres-ce2');
	});

	test('#2698 — les 10 modèles masses et contenances (lot 5b) du CM1 sont publiés', async () => {
		const rows = await sql<{ title: string }>(
			`select title from question_templates
			 where status = 'published' and 'CM1' = any(grades) and title ~* '(masse|contenance)'
			 order by title`
		);
		expect(rows.map((r) => r.title)).toHaveLength(10);
	});
});

// ============================================================================
// #2764 — corrigé de « Maximum local », variation 3
// ============================================================================

test('#2764 — « Maximum local d’une fonction polynôme de degré 3 », variation 3 : corrigé en 5 étapes ; la 2e « racines évidentes… f′(p) = … = 0 et f′(q) = … = 0 » sans « + − », la 3e « Donc f′(x) = 6(x − p)(x − q) » ; tableau et maximum présents', async ({
	page
}) => {
	const card = await openSeries(page, MAXIMUM_LOCAL, 1, 2);
	const fields = card.locator('.flip-card-front math-field');
	await expect(fields).toHaveCount(2);
	await typeInto(page, fields.nth(0), '9');
	await typeInto(page, fields.nth(1), '9');
	expect(await validate(page, card)).toBe('Faux');
	const correction = card
		.locator('[data-testid="correction-view"]:visible, .flip-card-back')
		.first();
	await correction.locator('.markdown-content > *').last().scrollIntoViewIfNeeded();
	await page.waitForTimeout(500);
	const blocks = await correction.evaluate((root) =>
		[...root.querySelectorAll('.markdown-content > *')].map((el) =>
			(el.textContent ?? '').replace(/\s+/g, ' ').trim()
		)
	);
	// Les étapes du corrigé commencent à « f'(x) = … » (avant : l'énoncé et la comparaison des réponses)
	const first = blocks.findIndex((b) => b.startsWith("f'\\left( x \\right) = "));
	expect(first, 'le corrigé commence par la dérivée').toBeGreaterThanOrEqual(0);
	const steps = blocks.slice(first);
	expect(steps, '5 étapes').toHaveLength(5);
	const [derivee, racines, factorisation, tableau, maximum] = steps;

	// 2e étape : f′(p) = … = 0 et f′(q) = … = 0, signes bien rendus
	const roots = racines.match(
		/^On cherche des racines évidentes parmi les petits entiers : f'\((-?\d+)\)=(.*)=0 et f'\((-?\d+)\)=(.*)=0\.$/
	);
	expect(roots, `2e étape : « ${racines} »`).not.toBeNull();
	const p = Number(roots![1]);
	const q = Number(roots![3]);
	expect(p, 'p < q').toBeLessThan(q);
	expect(racines, '2e étape : jamais « + − »').not.toMatch(/\+\s*[-−]/);
	expect(derivee).toMatch(/^f'\\left\( x \\right\) = 6 x\^2/);

	// 3e étape : f′(x) = 6(x − p)(x − q), avec le bon signe de chaque facteur
	const factor = (root: number): string => (root > 0 ? `x - ${root}` : `x + ${-root}`);
	expect(
		factorisation.startsWith(
			`Donc f'\\left( x \\right) = 6 \\left( ${factor(p)} \\right) \\left( ${factor(q)} \\right)`
		),
		`3e étape : « ${factorisation} »`
	).toBe(true);

	// Tableau et maximum inchangés : le tableau de variations, puis x₀ = p et f(p) en couleur
	expect(tableau).toContain('Tableau de variations de f');
	const max = maximum.match(
		/x_0=\\textcolor\{#FF5722\}\{ (-?\d+) \}.*f\(\1\)=.*\\textcolor\{#FF5722\}\{ (-?\d+) \}\.$/
	);
	expect(max, `5e étape : « ${maximum} »`).not.toBeNull();
	expect(Number(max![1]), 'maximum atteint en p').toBe(p);
	expect(tableau, 'le maximum figure au tableau').toContain(` ${max![2]} `);
	await shot(page, '2764-corrige');
});

// ============================================================================
// #2801 / #2805 — dérivation de 1re techno : décimaux à virgule
// ============================================================================

test.describe('#2801 #2805 — décimaux à virgule en 1re techno', () => {
	test('#2801 #2805 — « Taux de variation en un point », « Calcule-le pour h = … » : h écrit 0,1 ou 0,01 (virgule), réponse 6,1 acceptée', async ({
		page
	}) => {
		// Graine 12 : a = 3, h = 0,1 → 2a + h = 6,1 ; graine 1 : a = 1, h = 0,01 → 2,01
		for (const [seed, h, answer] of [
			[12, '0{,}1', '6,1'],
			[1, '0{,}01', '2,01']
		] as const) {
			const card = await openSeries(page, TAUX_DE_VARIATION, seed, 2);
			const statement = await formulas(card.locator('.flip-card-front'));
			expect(statement, `graine ${seed} : h écrit avec la virgule`).toContain(`h = ${h}`);
			expect(statement.join(' '), `graine ${seed} : jamais de point décimal`).not.toMatch(/\d\.\d/);
			await typeInto(page, card.locator('.flip-card-front math-field').first(), answer);
			expect(await validate(page, card), `graine ${seed} : ${answer} accepté`).toBe('Juste');
			if (seed === 12) await shot(page, '2801-taux-h');
		}
	});

	test('#2801 #2805 — « Tangente : position limite des sécantes », tableau des pentes : 6,1 · 6,01 · 6,001 (virgules)', async ({
		page
	}) => {
		const card = await openSeries(page, TANGENTE_SECANTES, 5, 1);
		const cells = (await formulas(card.locator('.flip-card-front table'))).map((c) => c.trim());
		for (const pente of ['6{,}1', '6{,}01', '6{,}001']) {
			expect(cells, `pente ${pente} dans le tableau`).toContain(pente);
		}
		expect(cells.join(' '), 'jamais de point décimal').not.toMatch(/\d\.\d/);
		await card.locator('.flip-card-front table').scrollIntoViewIfNeeded();
		await shot(page, '2801-tangente-pentes');
	});

	test('#2801 #2805 — « Dérivée d’un polynôme », variation du coût : C(q) = 0,5q² + … (virgule), réponse q + 3 acceptée', async ({
		page
	}) => {
		const card = await openSeries(page, DERIVEE_POLYNOME, 12, 3);
		const statement = await formulas(card.locator('.flip-card-front'));
		expect(statement.join(' ')).toContain('0{,}5 q^2');
		expect(statement.join(' '), 'jamais de point décimal').not.toMatch(/\d\.\d/);
		await typeInto(page, card.locator('.flip-card-front math-field').first(), 'q+3');
		expect(await validate(page, card)).toBe('Juste');
		await shot(page, '2805-derivee-cout');
	});
});
