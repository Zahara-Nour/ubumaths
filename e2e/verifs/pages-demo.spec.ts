import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEMO_PAGES } from '../../src/lib/seo/demo-pages';
import {
	collectErrors,
	expectNoHorizontalOverflow,
	expectReadableFont,
	shoot,
	shootThemes
} from './helpers/pages';

/**
 * Les vitrines publiques `/demo/*`, sans compte (tri des vérifications manuelles)
 * ================================================================================
 *
 * Reprend les lignes #1742 (accueil `/demo`), #1737 (diaporama), #1693 (structure),
 * #1695 (cercle trigo), #1698 (cartes VIP), #1700 (lexique), #1723 (éditeur),
 * #1701 (corrigés) de `docs/wip/verifications-manuelles.md`, et la part « vitrine » de
 * #1764 / #1767 (`/demo/blocs`).
 *
 * Aucune connexion, aucune écriture : ces tests tournent aussi contre la prod
 * (`VERIFS_URL=https://chiph.re`). Gestes au doigt : `tap()` sur iPhone et Android ;
 * survol et souris : étiquette `@bureau`. Captures à l'œil : `.captures/verifs/pages/`.
 */

// Constantes

const PAGE_TITLES: Record<string, string> = {
	'/demo/questions': 'Les questions',
	'/demo/corriges': 'Les corrigés des fiches',
	'/demo/diaporama': 'Le diaporama',
	'/demo/geometrie': 'Figures de géométrie',
	'/demo/constructions': 'Constructions à la règle et au compas',
	'/demo/cercle-trigo': 'Le cercle trigonométrique',
	'/demo/blocs': 'Les blocs du prof',
	'/demo/editeur': 'L’éditeur de texte',
	'/demo/lexique': 'Le lexique',
	'/demo/cartes': 'Les cartes VIP',
	'/demo/structure': "La structure d'une expression"
};
/** Les 9 cartes de la ligne #1742 ; blocs (#1767) et constructions sont venus après */
const NINE_CARDS = [
	'/demo/questions',
	'/demo/corriges',
	'/demo/diaporama',
	'/demo/geometrie',
	'/demo/cercle-trigo',
	'/demo/editeur',
	'/demo/lexique',
	'/demo/cartes',
	'/demo/structure'
];

// Fonctions

/** Le retour « Retour aux démonstrations » mène à /demo */
async function expectBackToDemo(page: Page): Promise<void> {
	const back = page.getByRole('link', { name: /Retour aux démonstrations/ });
	await expect(back).toBeVisible();
	await expect(back).toHaveAttribute('href', '/demo');
}

async function openVitrine(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

// ============================================================================
// #1742 — accueil /demo
// ============================================================================

test('#1742 — /demo : les 9 cartes menant chacune à sa vitrine, plus de Mathémo ni Trio', async ({
	page
}) => {
	await openVitrine(page, '/demo');
	await expect(page.getByRole('heading', { level: 1, name: 'Démonstrations' })).toBeVisible();
	const cards = page.locator('main ul > li > a');
	// La ligne annonçait 9 cartes ; il y en a 11 depuis (constructions, blocs) : la liste de référence
	expect(await cards.count()).toBe(DEMO_PAGES.length);
	for (const path of NINE_CARDS) {
		expect(DEMO_PAGES.map((demo) => demo.path)).toContain(path);
	}
	await expect(page.getByText(/Math[ée]mo/)).toHaveCount(0);
	await expect(page.getByRole('heading', { name: /\bTrio\b/ })).toHaveCount(0);
	for (const demo of DEMO_PAGES) {
		await page.goto('/demo');
		await page.waitForLoadState('networkidle');
		const card = page.locator(`main ul > li > a[href="${demo.path}"]`);
		await expect(card, `carte ${demo.path}`).toContainText(demo.title);
		await card.click();
		await page.waitForURL(`**${demo.path}`);
		await expect(
			page.getByRole('heading', { level: 1 }).first(),
			`vitrine ${demo.path}`
		).toBeVisible();
	}
});

test('#1742 — /demo au téléphone : une colonne, rien ne déborde, texte lisible', async ({
	page,
	isMobile
}, testInfo) => {
	test.skip(!isMobile, 'téléphone seulement');
	await openVitrine(page, '/demo');
	const xs = await page
		.locator('main ul > li > a')
		.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
	expect(new Set(xs).size, 'toutes les cartes alignées à gauche (une colonne)').toBe(1);
	await expectNoHorizontalOverflow(page, '/demo');
	await expectReadableFont(page.locator('main ul > li > a p').first(), 'description d’une carte');
	await shootThemes(page, '1742-demo', testInfo.project.name);
});

test('#1742 — liens d’entrée vers /demo : /professeurs, /parents, /eleves, panneau de l’accueil', async ({
	page
}) => {
	await page.goto('/professeurs');
	const prof = page.getByRole('link', { name: 'Voir les démonstrations' });
	await expect(prof).toHaveAttribute('href', '/demo');
	for (const path of ['/parents', '/eleves']) {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await expect(
			page.getByRole('link', { name: 'Voir Chiphre en action' }).first(),
			path
		).toHaveAttribute('href', '/demo');
	}
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: /Infos et confidentialité/ }).click();
	await expect(page.getByRole('link', { name: 'Démonstrations' }).first()).toHaveAttribute(
		'href',
		'/demo'
	);
});

test('#1742 — robots.txt n’interdit pas /demo, sitemap.xml liste /demo et ses vitrines', async ({
	request
}) => {
	const robotsRes = await request.get('/robots.txt');
	expect(robotsRes.ok()).toBe(true);
	const robots = await robotsRes.text();
	expect(robots).not.toMatch(/Disallow:\s*\/demo/);
	const sitemap = await (await request.get('/sitemap.xml')).text();
	// La ligne annonçait 10 adresses ; l'accueil + les vitrines de DEMO_PAGES en font 12 aujourd'hui
	for (const path of ['/demo', ...DEMO_PAGES.map((demo) => demo.path)]) {
		expect(sitemap, path).toMatch(new RegExp(`<loc>[^<]*${path}</loc>`));
	}
});

// ============================================================================
// #1698 — cartes VIP
// ============================================================================

test('#1698 — /demo/cartes : titre, retour, 4 cartes avec image et cadre, un clic agrandit', async ({
	page,
	isMobile
}, testInfo) => {
	await openVitrine(page, '/demo/cartes');
	await expect(
		page.getByRole('heading', { level: 1, name: PAGE_TITLES['/demo/cartes'] })
	).toBeVisible();
	await expectBackToDemo(page);
	for (const name of ['Coup Double', 'Super Bonus', 'Game of throne', 'Batman and Robin']) {
		await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
	}
	const cards = page.locator('.holo-card');
	await expect(cards).toHaveCount(4);
	// Image réellement chargée (pas une image cassée)
	const images = page.locator('.holo-card__front img');
	expect(await images.count()).toBeGreaterThanOrEqual(4);
	// Images chargées au défilement (`loading="lazy"`) : on les amène à l'écran une à une
	for (let index = 0; index < (await images.count()); index++) {
		const image = images.nth(index);
		await image.scrollIntoViewIfNeeded();
		await expect
			.poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth), {
				message: `image de carte ${index + 1} chargée`
			})
			.toBeGreaterThan(0);
	}
	// Un clic (un toucher) agrandit la carte
	const rotator = page.locator('.holo-card__rotator').nth(1);
	await rotator.scrollIntoViewIfNeeded();
	const before = (await rotator.boundingBox())?.width ?? 0;
	await (isMobile ? rotator.tap() : rotator.click());
	await expect(page.locator('.holo-card.active')).toHaveCount(1);
	await expect
		.poll(async () => (await rotator.boundingBox())?.width ?? 0, {
			message: 'carte agrandie'
		})
		.toBeGreaterThan(before);
	await shootThemes(page, '1698-cartes', testInfo.project.name);
});

test(
	'#1698 — /demo/cartes : la légendaire tourne seule, le reflet suit le survol',
	{ tag: '@bureau' },
	async ({ page, isMobile }) => {
		test.skip(isMobile, 'survol : ordinateur seulement');
		await openVitrine(page, '/demo/cartes');
		const first = page.locator('.holo-card').first();
		const style = () => first.evaluate((el) => el.getAttribute('style') ?? '');
		const before = await style();
		// Auto-rotation : le style (angle de rotation) change sans aucun geste
		await expect.poll(style, { message: 'la légendaire tourne seule' }).not.toBe(before);
		const second = page.locator('.holo-card').nth(2);
		await second.scrollIntoViewIfNeeded();
		const still = await second.evaluate((el) => el.getAttribute('style') ?? '');
		const box = await second.locator('.holo-card__rotator').boundingBox();
		if (!box) throw new Error('carte 3 invisible');
		await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
		await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 6 });
		await expect
			.poll(() => second.evaluate((el) => el.getAttribute('style') ?? ''), {
				message: 'le reflet suit le survol'
			})
			.not.toBe(still);
	}
);

// ============================================================================
// #1695 — cercle trigonométrique
// ============================================================================

/** Un point de l'écran sur le cercle unité du premier dessin, pour l'angle donné (radians) */
async function pointOnCircle(page: Page, index: number, angle: number) {
	const svg = page.locator('svg.trig-circle-svg').nth(index);
	const box = await svg.boundingBox();
	if (!box) throw new Error('cercle invisible');
	const radius = Number(await svg.locator('circle.trig-unit-circle').getAttribute('r'));
	const size = Number((await svg.getAttribute('width')) ?? 320);
	const scale = box.width / size;
	return {
		x: box.x + (size / 2 + radius * Math.cos(angle)) * scale,
		y: box.y + (size / 2 - radius * Math.sin(angle)) * scale
	};
}

/** Le texte du tableau du premier cercle (angle, cosinus, sinus) */
function firstTable(page: Page) {
	return page.locator('main .grid > div').first();
}

test('#1695 — /demo/cercle-trigo : titre, retour, 4 cercles dessinés sans texte de bloc', async ({
	page
}, testInfo) => {
	await openVitrine(page, '/demo/cercle-trigo');
	await expect(
		page.getByRole('heading', { level: 1, name: PAGE_TITLES['/demo/cercle-trigo'] })
	).toBeVisible();
	await expectBackToDemo(page);
	await expect(page.locator('svg.trig-circle-svg')).toHaveCount(4);
	// Aucune ligne de configuration du bloc ne s'affiche
	for (const raw of ['preset:', 'display:', 'projections:', 'equation:', '```']) {
		await expect(page.locator('main').getByText(raw, { exact: false }), raw).toHaveCount(0);
	}
	await expectNoHorizontalOverflow(page, '/demo/cercle-trigo');
	await shootThemes(page, '1695-cercle-trigo', testInfo.project.name);
});

test('#1695 — /demo/cercle-trigo : le point du 1er cercle se glisse à la souris, le tableau suit', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'souris : ordinateur seulement (au doigt : test suivant)');
	await openVitrine(page, '/demo/cercle-trigo');
	const before = await firstTable(page).textContent();
	const start = await pointOnCircle(page, 0, Math.PI / 4);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	const top = await pointOnCircle(page, 0, Math.PI / 2);
	await page.mouse.move(top.x, top.y, { steps: 8 });
	await expect.poll(() => firstTable(page).textContent()).not.toBe(before);
	const atTop = await firstTable(page).textContent();
	const left = await pointOnCircle(page, 0, Math.PI);
	await page.mouse.move(left.x, left.y, { steps: 8 });
	await expect.poll(() => firstTable(page).textContent()).not.toBe(atTop);
	await page.mouse.up();
});

test('#1695 — /demo/cercle-trigo : au doigt, un toucher sur le cercle déplace le point et le tableau suit', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'au doigt : téléphones seulement');
	await openVitrine(page, '/demo/cercle-trigo');
	const before = await firstTable(page).textContent();
	const top = await pointOnCircle(page, 0, Math.PI / 2);
	await page.touchscreen.tap(top.x, top.y);
	await expect.poll(() => firstTable(page).textContent()).not.toBe(before);
});

test('#1695 — /demo/cercle-trigo : π/6 avec projections, cos x = 1/2 (π/3, 5π/3), arc de cos x > 1/2', async ({
	page
}) => {
	await openVitrine(page, '/demo/cercle-trigo');
	const cards = page.locator('main .grid > div');
	// π/6 : projections et une ligne de tableau (√3/2 et 1/2)
	const pi6 = cards.nth(1);
	expect(await pi6.locator('.trig-projection, [class*="projection"]').count()).toBeGreaterThan(0);
	await expect(pi6.locator('tr, [role="row"]').filter({ hasText: 'pi' })).toHaveCount(1);
	const pi6Text = (await pi6.textContent()) ?? '';
	expect(pi6Text).toContain('\\frac{\\sqrt{3}}{2}');
	expect(pi6Text).toContain('\\frac{\\pi}{6}');
	// cos x = 1/2 : les deux solutions écrites
	const eq = (await cards.nth(2).textContent()) ?? '';
	expect(eq).toContain('\\frac{\\pi}{3}');
	expect(eq).toContain('\\frac{5\\pi}{3}');
	// cos x > 1/2 : un arc dessiné sur le cercle
	expect(
		await cards.nth(3).locator('svg path[class*="arc"], svg path[class*="solution"]').count(),
		'arc de cos x > 1/2'
	).toBeGreaterThan(0);
});

// ============================================================================
// #1701 — corrigés
// ============================================================================

test('#1701 — /demo/corriges : titre, retour, image nette de la page de corrigé, feuille blanche en sombre', async ({
	page,
	isMobile
}, testInfo) => {
	await openVitrine(page, '/demo/corriges');
	await expect(
		page.getByRole('heading', { level: 1, name: PAGE_TITLES['/demo/corriges'] })
	).toBeVisible();
	await expectBackToDemo(page);
	const image = page.getByRole('img', { name: /Page de corrigé/ });
	await expect(image).toBeVisible();
	await expect(image).toHaveAttribute('alt', /Second degré et trigonométrie/);
	// Nette : l'image décodée est au moins aussi large que son affichage (écran à 1 ou 2 px/px)
	const sizes = await image.evaluate((el) => {
		const img = el as HTMLImageElement;
		return { natural: img.naturalWidth, shown: img.getBoundingClientRect().width };
	});
	expect(sizes.natural, 'image chargée').toBeGreaterThan(0);
	expect(sizes.natural, 'image assez définie pour son affichage').toBeGreaterThanOrEqual(
		sizes.shown
	);
	if (isMobile) {
		await expectNoHorizontalOverflow(page, '/demo/corriges');
		expect(sizes.shown, 'l’image tient dans la largeur').toBeLessThanOrEqual(
			page.viewportSize()?.width ?? 0
		);
	}
	// En sombre, la feuille reste blanche
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
	const background = await image.evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(background).toBe('rgb(255, 255, 255)');
	await shootThemes(page, '1701-corriges', testInfo.project.name);
});

// ============================================================================
// #1700 — lexique
// ============================================================================

/** Choisit le niveau de l'élève dans le sélecteur de la page */
async function chooseLevel(page: Page, label: string): Promise<void> {
	await page.getByRole('combobox', { name: 'Niveau de l’élève' }).click();
	await page.getByRole('option', { name: label, exact: true }).click();
	await expect(page.getByRole('combobox', { name: 'Niveau de l’élève' })).toContainText(label);
}

test('#1700 — /demo/lexique : titre, retour, sélecteur à 6ème', async ({ page }, testInfo) => {
	await openVitrine(page, '/demo/lexique');
	await expect(page.getByRole('heading', { level: 1, name: 'Le lexique' })).toBeVisible();
	await expectBackToDemo(page);
	await expect(page.getByRole('combobox', { name: 'Niveau de l’élève' })).toContainText('6ème');
	await shootThemes(page, '1700-lexique', testInfo.project.name);
});

test.describe('#1700 — /demo/lexique : la fiche d’un mot et la case de réponse', () => {
	// Au doigt « sur une tablette » : fenêtre de tablette tactile (sur un téléphone, la fiche
	// recouvre la case, qui n'est plus touchable), souris sur ordinateur
	test.use({ viewport: { width: 820, height: 1180 } });

	test('toucher « carré » dans la question ouvre sa fiche, toucher la case la ferme et ouvre le clavier', async ({
		page,
		hasTouch
	}) => {
		// Écart E38 (corrigé) : au doigt, le premier toucher sur la case fermait la fiche sans
		// ouvrir le clavier (le piège à focus de la fiche, encore en place, reprenait le focus)
		await openVitrine(page, '/demo/lexique');
		const question = page
			.locator('[data-slot="card"]')
			.filter({ has: page.getByText('Dans une question', { exact: true }) })
			.first();
		const tap = (loc: Locator) => (hasTouch ? loc.tap() : loc.click());
		// Périmée en partie (R1 « mots récents » et R6 « bouton Mots du dictionnaire », 2026-11-17,
		// bb5e8691a5) : en 6ème, ni « aire » ni « carré » ne sont soulignés dans la question ; ils le
		// sont en 5ème (« carré », sens puissance), une fois le bouton « Mots du dictionnaire » enfoncé.
		await expect(question.locator('button.lexicon-term')).toHaveCount(0);
		await chooseLevel(page, '5ème');
		await tap(question.getByRole('button', { name: 'Mots du dictionnaire' }));
		await tap(question.locator('button.lexicon-term', { hasText: 'carré' }));
		const fiche = page.locator('[data-slot="popover-content"]');
		await expect(fiche).toBeVisible();
		// La case à remplir (le « blanc » de la réponse), pas la boîte entière du champ
		const blank = question.locator('math-field').first().locator('.ML__prompt-atom').first();
		await expect(blank).toBeVisible();
		// Un autre <span> de MathLive recouvre l'atome : le toucher tombe là où tomberait le doigt
		await (hasTouch ? blank.tap({ force: true }) : blank.click({ force: true }));
		await expect(fiche).toBeHidden();
		// Le clavier virtuel ne s'ouvre de lui-même qu'au doigt (sur ordinateur, le clavier physique suffit)
		if (hasTouch) {
			await expect
				.poll(
					() =>
						page.evaluate(
							() =>
								(window as unknown as { mathVirtualKeyboard?: { visible: boolean } })
									.mathVirtualKeyboard?.visible ?? false
						),
					{
						message: 'le clavier virtuel s’ouvre sur la case'
					}
				)
				.toBe(true);
		}
	});
});

test('#1700 — /demo/lexique : « fonction » non soulignée en 6e ; « carré » a le sens « puissance » en 5e ; exponentielle selon la filière', async ({
	page,
	isMobile
}) => {
	await openVitrine(page, '/demo/lexique');
	const sentences = page.locator('main ul li');
	const tap = (loc: Locator) => (isMobile ? loc.tap() : loc.click());
	// 6e : « fonction » n'est pas soulignée dans la phrase 4
	await expect(
		sentences.nth(3).locator('button.lexicon-term', { hasText: /^fonction$/ })
	).toHaveCount(0);
	// 5e : « carré » montre aussi le sens « puissance »
	await chooseLevel(page, '5ème');
	await tap(sentences.nth(0).locator('button.lexicon-term', { hasText: 'carré' }));
	await expect(page.locator('[data-slot="popover-content"]')).toContainText(/puissance/i);
	await page.keyboard.press('Escape');
	// 1re spé : fonction exponentielle = exp ; 1re générale : de base a
	const expo = () => sentences.nth(4).locator('button.lexicon-term', { hasText: /exponentielle/ });
	await chooseLevel(page, '1ère spécialité maths');
	await tap(expo());
	const spe = (await page.locator('[data-slot="popover-content"]').textContent()) ?? '';
	await page.keyboard.press('Escape');
	await chooseLevel(page, '1ère générale (maths spécifiques)');
	await tap(expo());
	const gen = (await page.locator('[data-slot="popover-content"]').textContent()) ?? '';
	expect(spe, 'fiche de 1re spé').toMatch(/exp/);
	expect(gen, 'fiche de 1re générale').toMatch(/base\s+a|a\^x|a\s*\^\s*x/);
	expect(spe, 'les deux fiches diffèrent').not.toBe(gen);
});

// ============================================================================
// #1723 — éditeur
// ============================================================================

test('#1723 — /demo/editeur : phrase de départ dans les 3 cartes, Ctrl+A puis Retour arrière → 3 cartes vides, sans erreur', async ({
	page
}, testInfo) => {
	const bag = collectErrors(page);
	await openVitrine(page, '/demo/editeur');
	await expect(page.getByRole('heading', { level: 1, name: 'L’éditeur de texte' })).toBeVisible();
	await expectBackToDemo(page);
	const usages = ['usage-message', 'usage-cahier', 'usage-enonce'];
	for (const id of usages) {
		await expect(page.getByTestId(id), id).toContainText('La solution de');
		await expect(page.getByTestId(id), id).toContainText('est');
	}
	await shootThemes(page, '1723-editeur', testInfo.project.name);
	// Ctrl+A puis Retour arrière dans l'éditeur
	const editor = page.locator('.tiptap, [contenteditable="true"]').first();
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('Backspace');
	for (const id of usages) {
		await expect(page.getByTestId(id), id).toHaveText('Écrivez une phrase ci-dessus.');
	}
	expect(bag.errors, 'erreurs de console ou de page').toEqual([]);
});

test('#1723 — /demo/editeur : une formule ajoutée par Σ paraît dans « message », « énoncé » et « cahier de texte »', async ({
	page
}) => {
	await openVitrine(page, '/demo/editeur');
	const editor = page.locator('.tiptap, [contenteditable="true"]').first();
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('Backspace');
	await page.keyboard.type('Pour ');
	// Σ (bouton « Formule »), puis « $$ » : une formule dans le texte
	await page.getByRole('button', { name: 'Formule', exact: true }).click();
	await page.getByRole('button', { name: '$$', exact: true }).click();
	// La formule vide est insérée, le clavier reste dans le texte : on la focalise
	await editor.locator('math-field').last().focus();
	await page.keyboard.type('x^2');
	for (const id of ['usage-message', 'usage-cahier', 'usage-enonce']) {
		const zone = page.getByTestId(id);
		await expect(zone, id).toContainText('Pour');
		// La formule est rendue par MathLive (une boîte qui a une taille), pas laissée en texte `x^2`
		await zone.scrollIntoViewIfNeeded();
		await expect
			.poll(
				() =>
					zone
						.locator('math-span')
						.first()
						.evaluate((el) => el.getBoundingClientRect().width),
				{ message: `${id} : formule rendue` }
			)
			.toBeGreaterThan(0);
	}
});

// ============================================================================
// #1693 — structure d'une expression
// ============================================================================

test('#1693 — /demo/structure : titre, retour, lecture française de l’expression de l’article Sésamath, 6 exemples', async ({
	page
}, testInfo) => {
	await openVitrine(page, '/demo/structure');
	await expect(
		page.getByRole('heading', { level: 1, name: PAGE_TITLES['/demo/structure'] })
	).toBeVisible();
	await expectBackToDemo(page);
	const whole = page.locator('[data-reading="whole"]');
	await expect(whole).toContainText('produit');
	await expect(whole).toContainText('somme');
	await expect(whole).toContainText('quotient');
	// Les 6 exemples se chargent : la lecture change à chacun
	const examples = [
		'Priorités',
		'Somme algébrique',
		'Différence',
		'Puissance',
		'Fractions',
		'Équation'
	];
	let previous = (await whole.textContent()) ?? '';
	for (const label of examples) {
		await page.getByRole('button', { name: label, exact: true }).click();
		await expect
			.poll(async () => (await whole.textContent()) ?? '', { message: label })
			.not.toBe(previous);
		previous = (await whole.textContent()) ?? '';
	}
	await shootThemes(page, '1693-structure', testInfo.project.name);
});

test(
	'#1693 — /demo/structure : survol (encadré + lecture), glisser un terme, « Annuler », mot de la lecture → fiche 5e',
	{ tag: '@bureau' },
	async ({ page, isMobile }) => {
		test.skip(isMobile, 'souris : ordinateur seulement (au doigt : test suivant)');
		await openVitrine(page, '/demo/structure');
		await page.getByRole('button', { name: 'Priorités', exact: true }).click();
		const stage = page.locator('[data-field-stage]');
		// 2+3×4 : survol de 3×4 = le produit s'encadre et se lit
		const hovered = page.locator('[data-reading="hovered"]');
		await expect(hovered).toHaveCount(0);
		const times = stage.locator('.ML__cmr', { hasText: '×' }).first();
		const box = await times.boundingBox();
		if (!box) throw new Error('signe × invisible');
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
		await expect(page.locator('.structure-frame:not([hidden])')).toBeVisible();
		await expect(hovered).toContainText('produit');
		// Appui sur « 2 » puis mouvement vers la droite : le terme se déplace (3×4+2)
		const two = stage.locator('.ML__cmr', { hasText: /^2$/ }).first();
		const twoBox = await two.boundingBox();
		const stageBox = await stage.boundingBox();
		if (!twoBox || !stageBox) throw new Error('terme invisible');
		const before = (await stage.textContent()) ?? '';
		await page.mouse.move(twoBox.x + twoBox.width / 2, twoBox.y + twoBox.height / 2);
		await page.mouse.down();
		await page.mouse.move(stageBox.x + stageBox.width - 10, twoBox.y + twoBox.height / 2, {
			steps: 12
		});
		await page.mouse.up();
		const undo = page.locator('[data-undo]');
		await expect(undo, 'le déplacement a eu lieu : Annuler s’active').toBeEnabled();
		expect(await stage.textContent()).not.toBe(before);
		await undo.click();
		await expect(undo).toBeDisabled();
		// Un mot de la lecture ouvre sa fiche
		await page.locator('[data-reading="whole"] button.lexicon-term').first().click();
		await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();
	}
);

test('#1693 — /demo/structure : au doigt, un mot de la lecture ouvre sa fiche ; un toucher court sur la formule laisse écrire', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'au doigt : téléphones seulement');
	await openVitrine(page, '/demo/structure');
	await page.locator('[data-reading="whole"] button.lexicon-term').first().tap();
	await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();
	await page.keyboard.press('Escape');
	await page.locator('[data-field]').tap();
	await expect(page.locator('.field-editor')).toBeVisible();
	await expectNoHorizontalOverflow(page, '/demo/structure');
});

// ============================================================================
// #1764 / #1767 — vitrine /demo/blocs (sans compte)
// ============================================================================

test('#1764/#1767 — /demo/blocs : 3 niveaux, 10 blocs dessinés, aucune erreur, « Voir ce qu’écrit le prof » replié', async ({
	page,
	isMobile
}, testInfo) => {
	const bag = collectErrors(page);
	await openVitrine(page, '/demo/blocs');
	await expectBackToDemo(page);
	// La ligne annonçait 9 blocs ; le schéma en barres (#2000+, chantier schema-barres) fait 10
	await expect(page.getByRole('heading', { level: 2 })).toHaveCount(3);
	const renders = page.locator('[data-block-render]');
	await expect(renders).toHaveCount(10);
	for (let index = 0; index < 10; index++) {
		const render = renders.nth(index);
		// Dessiné : des éléments rendus (figure, tableau, spans de la division posée), pas du texte brut
		await expect(render, `bloc ${index + 1} dessiné`).toBeVisible();
		expect(
			await render.evaluate((el) => el.querySelectorAll('svg, table, span, math-field').length),
			`bloc ${index + 1} : éléments rendus`
		).toBeGreaterThan(0);
		await expect(render, `bloc ${index + 1} : pas de bloc de code brut`).not.toContainText('```');
		await expect(render, `bloc ${index + 1}`).not.toContainText(/erreur|invalide|non reconnu/i);
	}
	const details = page.locator('details');
	await expect(details).toHaveCount(10);
	expect(
		await details.evaluateAll((els) => els.filter((el) => (el as HTMLDetailsElement).open).length)
	).toBe(0);
	if (isMobile) {
		const xs = await page
			.locator('main section .grid > div')
			.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
		expect(new Set(xs).size, 'une colonne').toBe(1);
		await expectNoHorizontalOverflow(page, '/demo/blocs');
	}
	expect(bag.errors, 'erreurs de console ou de page').toEqual([]);
	await shootThemes(page, '1764-blocs', testInfo.project.name);
});

test('#1764/#1767 — /demo : carte « Les blocs du prof » juste après le cercle trigo ; « Voir ce qu’écrit le prof » déplie le texte', async ({
	page
}) => {
	await openVitrine(page, '/demo');
	const titles = await page.locator('main ul > li > a h2').allTextContents();
	const trig = titles.indexOf('Le cercle trigonométrique');
	expect(trig).toBeGreaterThanOrEqual(0);
	expect(titles[trig + 1]).toBe('Les blocs du prof');
	await openVitrine(page, '/demo/blocs');
	const first = page.locator('details').first();
	await first.locator('summary').click();
	await expect(first.locator('pre code')).toBeVisible();
	await expect(first.locator('pre code')).toContainText('```');
});

// ============================================================================
// #1737 — diaporama
// ============================================================================

/** Numéro de la diapositive horizontale courante (« 5 / 13 » ou « 2.1 / 13 ») */
async function currentSlide(page: Page): Promise<number> {
	const text = (await page.locator('.slide-number').textContent()) ?? '';
	return Number.parseInt(text.trim(), 10);
}

/** Une image d'écran : laisse la page traiter l'événement avant de relire son état */
async function nextFrame(page: Page): Promise<void> {
	await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
}

async function openDiaporama(page: Page): Promise<void> {
	await openVitrine(page, '/demo/diaporama');
	await expect(page.locator('.slide-number')).toContainText('/ 13');
}

/** Avance au clavier jusqu'à la diapositive `target` (les fragments comptent pour des appuis) */
async function gotoSlide(page: Page, target: number): Promise<void> {
	await page.locator('.deck-wrapper').focus();
	for (let press = 0; press < 40; press++) {
		if ((await currentSlide(page)) === target) return;
		await page.keyboard.press('ArrowRight');
		await nextFrame(page);
	}
	throw new Error(`diapositive ${target} introuvable`);
}

test('#1737 — /demo/diaporama : 13 diapositives, chacune lisible (texte assez grand, rien de coupé)', async ({
	page,
	isMobile
}, testInfo) => {
	await openDiaporama(page);
	await expectNoHorizontalOverflow(page, '/demo/diaporama');
	await expect(page.locator('.slide-number')).toContainText('1 / 13');
	await page.locator('.deck-wrapper').focus();
	const seen: number[] = [];
	for (let press = 0; press < 40 && seen.length < 13; press++) {
		const n = await currentSlide(page);
		if (!seen.includes(n)) {
			seen.push(n);
			const measure = await page.evaluate(() => {
				const active = document.querySelector('.slide.active');
				const content = active?.querySelector<HTMLElement>('.slide-content');
				const title = active?.querySelector<HTMLElement>('h2');
				return {
					clippedY: content ? content.scrollHeight - content.clientHeight : 0,
					clippedX: content ? content.scrollWidth - content.clientWidth : 0,
					font: title ? parseFloat(getComputedStyle(title).fontSize) : null
				};
			});
			expect(measure.clippedY, `diapositive ${n} : coupée en hauteur`).toBeLessThanOrEqual(1);
			expect(measure.clippedX, `diapositive ${n} : coupée en largeur`).toBeLessThanOrEqual(1);
			if (isMobile && measure.font !== null) {
				expect(measure.font, `diapositive ${n} : titre trop petit`).toBeGreaterThanOrEqual(16);
			}
			if (n === 1 || n === 7 || n === 9) {
				await shootThemes(page, `1737-diapo-${n}`, testInfo.project.name);
				await page.locator('.deck-wrapper').focus();
			}
		}
		await page.keyboard.press('ArrowRight');
		await nextFrame(page);
	}
	expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
});

test('#1737 — /demo/diaporama : le bouton « Plein écran » (et F sur ordinateur) passe en plein écran, puis revient', async ({
	page,
	isMobile
}, testInfo) => {
	// iPhone : Safari n'offre pas l'API plein écran pour un élément de page (limite du navigateur,
	// constatée ici : `document.fullscreenElement` reste vide) ; le test a son sens ailleurs
	test.skip(
		testInfo.project.name === 'iphone',
		'Safari iPhone : pas d’API plein écran pour un élément'
	);
	await openDiaporama(page);
	const isFull = () => page.evaluate(() => document.fullscreenElement !== null);
	const toggle = page.getByRole('button', { name: 'Plein écran', exact: true });
	await (isMobile ? toggle.tap() : toggle.click());
	await expect.poll(isFull, { message: 'plein écran activé par le bouton' }).toBe(true);
	await expect(page.getByRole('button', { name: 'Quitter le plein écran' })).toBeVisible();
	await page
		.getByRole('button', { name: 'Quitter le plein écran' })
		.evaluate((el) => (el as HTMLElement).click());
	await expect.poll(isFull, { message: 'retour de plein écran' }).toBe(false);
	if (!isMobile) {
		await page.locator('.deck-wrapper').focus();
		await page.keyboard.press('f');
		await expect.poll(isFull, { message: 'plein écran activé par F' }).toBe(true);
	}
});

test('#1737 — /demo/diaporama : diapositive 5, (x+1)² se développe seul, une ligne toutes les 2 s', async ({
	page
}) => {
	await openDiaporama(page);
	await gotoSlide(page, 5);
	const visible = () => page.locator('.slide.active .fragment.visible').count();
	const start = Date.now();
	const at: number[] = [];
	for (const count of [1, 2, 3]) {
		await expect
			.poll(visible, { message: `ligne ${count} visible`, timeout: 10_000 })
			.toBeGreaterThanOrEqual(count);
		at.push(Date.now() - start);
	}
	// Une ligne toutes les ~2 s (marge pour le chargement de la page et la gigue du poll)
	for (let index = 1; index < at.length; index++) {
		const gap = at[index] - at[index - 1];
		expect(gap, `intervalle ${index}`).toBeGreaterThan(1000);
		expect(gap, `intervalle ${index}`).toBeLessThan(3500);
	}
});

test('#1737 — /demo/diaporama : diapositive 3, chaque appui sur → montre la ligne suivante', async ({
	page
}) => {
	// Écart E36 corrigé : → montrait la diapositive 4 sans aucune ligne (il sautait les fragments)
	await openDiaporama(page);
	await gotoSlide(page, 3);
	await page.keyboard.press('ArrowRight');
	await nextFrame(page);
	expect(await currentSlide(page), 'toujours sur la diapositive 3').toBe(3);
	await expect(page.locator('.slide.active .fragment.visible')).toHaveCount(1);
});

test('#1737 — /demo/diaporama : Python coloré, « Ouvrir dans Python » ouvre /python avec le code', async ({
	page,
	context
}, testInfo) => {
	await openDiaporama(page);
	await gotoSlide(page, 7);
	const code = page.locator('.slide.active pre code');
	for (const token of ['hljs-keyword', 'hljs-number', 'hljs-comment', 'hljs-built_in']) {
		expect(await code.locator(`.${token}`).count(), token).toBeGreaterThan(0);
	}
	const open = page.getByRole('link', { name: 'Ouvrir dans Python' });
	await expect(open).toHaveAttribute('href', /^\/python/);
	const [popup] = await Promise.all([context.waitForEvent('page'), open.click()]);
	await popup.waitForLoadState('domcontentloaded');
	expect(new URL(popup.url()).pathname).toBe('/python');
	await expect(popup.locator('body')).toContainText('def f(x)', { timeout: 30_000 });
	await shoot(popup, '1737-ouvrir-dans-python', testInfo.project.name);
	await popup.close();
});

test(
	'#1737 — /demo/diaporama : la droite d’Euler se manipule (déplacer A fait bouger la figure)',
	{ tag: '@bureau' },
	async ({ page, isMobile }) => {
		test.skip(isMobile, 'glisser à la souris : ordinateur seulement');
		await openDiaporama(page);
		await gotoSlide(page, 9);
		const svg = page.locator('.slide.active svg.geometry-canvas');
		await expect(svg).toBeVisible();
		const snapshot = () => svg.evaluate((el) => el.innerHTML);
		const before = await snapshot();
		const point = svg.locator('.point.draggable').first();
		const box = await point.boundingBox();
		if (!box) throw new Error('point A invisible');
		const x = box.x + box.width / 2;
		const y = box.y + box.height / 2;
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 40, y - 30, { steps: 8 });
		await page.mouse.up();
		await expect.poll(snapshot, { message: 'la figure a bougé' }).not.toBe(before);
	}
);

test('#1737 — /demo/diaporama : minuteur, 10 s par question, la barre se vide, puis la correction', async ({
	page
}) => {
	test.slow();
	await openDiaporama(page);
	await gotoSlide(page, 10);
	await page.keyboard.press('ArrowDown');
	const fill = page.locator('.slide.active [data-testid="chrono-fill"]');
	await expect(fill).toBeVisible();
	const width = () => fill.evaluate((el) => parseFloat((el as HTMLElement).style.width));
	const first = await width();
	await expect.poll(width, { message: 'la barre se vide' }).toBeLessThan(first - 10);
	await expect(page.locator('.slide.active h2')).toContainText('Question 2 / 2', {
		timeout: 20_000
	});
	await expect(page.locator('.slide.active h2')).toContainText('Correction', { timeout: 20_000 });
});

test('#1737 — /demo/diaporama : annoter au crayon sur la diapositive 11', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'tracé à la souris : ordinateur seulement');
	await openDiaporama(page);
	await gotoSlide(page, 11);
	await page.locator('button[title="Activer annotations"]').click();
	await page.locator('button[title="Stylo"]').click();
	const layer = page.locator('.slide.active svg.slide-annotation-layer');
	const box = await layer.boundingBox();
	if (!box) throw new Error('calque d’annotation invisible');
	const before = await layer.locator('.layer-annotations path').count();
	await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55, { steps: 10 });
	await page.mouse.up();
	await expect
		.poll(() => layer.locator('.layer-annotations path').count(), { message: 'trait tracé' })
		.toBeGreaterThan(before);
});

test('#1737 — /demo/diaporama : fin, liens vers /demo et /atelier', async ({ page }) => {
	await openDiaporama(page);
	await gotoSlide(page, 13);
	await expect(page.getByRole('link', { name: 'Les autres démonstrations' })).toHaveAttribute(
		'href',
		'/demo'
	);
	await expect(page.getByRole('link', { name: "Ouvrir l'Atelier" })).toHaveAttribute(
		'href',
		'/atelier'
	);
});
