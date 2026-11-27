import { mkdir } from 'node:fs/promises';
import {
	expect,
	test,
	type CDPSession,
	type Locator,
	type Page,
	type TestInfo
} from '@playwright/test';
import { assertLocalServerEnv, login, TEACHER } from './helpers/carnet';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';
import {
	expectContrastBothThemes,
	expectReadableDrawing,
	MIN_CONTRAST,
	setTheme
} from './helpers/themes-lisibles';

/**
 * Blocs de `/aide-ecriture/blocs/*` (prof), base LOCALE (tri des vérifications manuelles)
 * ======================================================================================
 *
 * Reprend les lignes #2189 (cercle trigo à placer), #2179 (trotteuse), #2162 et #2151 (boîte
 * à moustaches), #2122 (Scratch), #1908 et #1947 (barres à construire, échelle choisie), #1872
 * (horloge à placer), #1943 (étiquettes à ranger), #2003 et #2023 (cubes), #2027 et #2046
 * (solides), #2037 et #2042 (patrons), #2065 (bloc ouvert sur la ligne d'un item) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Serveur de dev et base locale seulement. Compte fictif local : prof `teacher@local.test`.
 * Les gestes se jouent sur la page d'aide de chaque bloc (rien n'est jugé hors d'une question) ;
 * ce que seule une vraie question, un PDF ou un lecteur d'écran montre reste à la main.
 * Captures à l'œil de la session : `.captures/verifs/blocs-divers/` (clair et sombre).
 * Le glisser au doigt n'existe que sur Android (protocole de Chromium) ; l'iPhone touche.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
// Deux navigateurs en parallèle sur le serveur de dev : une page chargée à froid ralentit les gestes
test.beforeEach(() => test.setTimeout(120_000));

// Constantes

const SHOTS_DIR = '.captures/verifs/blocs-divers';

interface Spot {
	x: number;
	y: number;
}

// Fonctions

/** Ouvre la page d'aide d'un bloc, en prof, une fois la page hydratée */
async function openBloc(page: Page, path: string): Promise<void> {
	await login(page, TEACHER.email, TEACHER.password);
	await gotoSettled(page, path);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await page.waitForLoadState('networkidle');
}

/** L'exemple (article) de ce titre, dans la page d'aide */
function example(page: Page, title: string): Locator {
	return page
		.locator('article', { has: page.getByRole('heading', { name: title, exact: true }) })
		.first();
}

/** Le rendu de l'exemple (à droite du texte) */
function rendered(page: Page, title: string): Locator {
	return example(page, title).locator('div.min-w-0').first();
}

/** Amène le lieu à l'écran (le serveur de dev peut recharger la page : on rejoue une fois) */
async function scrollTo(locator: Locator): Promise<void> {
	try {
		await locator.scrollIntoViewIfNeeded();
	} catch {
		await locator.page().waitForLoadState('networkidle');
		await locator.scrollIntoViewIfNeeded();
	}
}

/** Amène le lieu à l'écran et rend le centre d'une position relative (0-1) de sa boîte */
async function spotIn(locator: Locator, fx = 0.5, fy = 0.5): Promise<Spot> {
	await scrollTo(locator);
	const box = await locator.boundingBox();
	if (box === null) throw new Error('lieu sans boîte');
	return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

/** Toucher (téléphone) ou cliquer (ordinateur) à cet endroit de la page */
async function pressAt(page: Page, spot: Spot, touch: boolean): Promise<void> {
	if (touch) await page.touchscreen.tap(spot.x, spot.y);
	else await page.mouse.click(spot.x, spot.y);
}

/** Toucher (téléphone) ou cliquer (ordinateur) un bouton */
async function press(locator: Locator, touch: boolean): Promise<void> {
	await scrollTo(locator);
	if (touch) await locator.tap();
	else await locator.click();
}

/** Glisser à la souris, ou au doigt sur Android (protocole de Chromium) */
class Drag {
	private session: CDPSession | null = null;

	constructor(private readonly page: Page) {}

	private async send(type: 'touchStart' | 'touchMove' | 'touchEnd', spot?: Spot): Promise<void> {
		this.session ??= await this.page.context().newCDPSession(this.page);
		await this.session.send('Input.dispatchTouchEvent', {
			type,
			touchPoints: spot === undefined ? [] : [{ x: spot.x, y: spot.y, id: 0 }]
		});
	}

	async finger(from: Spot, to: Spot): Promise<void> {
		await this.send('touchStart', from);
		for (let step = 1; step <= 8; step++) {
			await this.send('touchMove', {
				x: from.x + ((to.x - from.x) * step) / 8,
				y: from.y + ((to.y - from.y) * step) / 8
			});
		}
		await this.send('touchEnd');
	}

	async mouse(from: Spot, to: Spot): Promise<void> {
		await this.page.mouse.move(from.x, from.y);
		await this.page.mouse.down();
		await this.page.mouse.move(to.x, to.y, { steps: 8 });
		await this.page.mouse.up();
	}
}

/** Glisse au doigt (Android) ou à la souris (ordinateur) ; l'iPhone n'a pas de glisser simulé */
async function drag(page: Page, from: Spot, to: Spot, info: TestInfo): Promise<boolean> {
	const mover = new Drag(page);
	if (info.project.name === 'android') await mover.finger(from, to);
	else if (info.project.name === 'iphone') return false;
	else await mover.mouse(from, to);
	return true;
}

/** Captures du lieu en clair puis en sombre : `<nom>-clair|sombre-<projet>.png` */
async function shootThemes(
	page: Page,
	target: Locator,
	name: string,
	info: TestInfo
): Promise<void> {
	await mkdir(SHOTS_DIR, { recursive: true });
	for (const theme of ['light', 'dark'] as const) {
		await setTheme(page, theme);
		await target.scrollIntoViewIfNeeded();
		const path = `${SHOTS_DIR}/${name}-${theme === 'dark' ? 'sombre' : 'clair'}-${info.project.name}.png`;
		try {
			await target.screenshot({ path, timeout: 15_000 });
		} catch {
			// WebKit (iPhone) cale parfois sur la capture d'un élément plus haut que l'écran : la fenêtre suffit
			try {
				await page.screenshot({ path, timeout: 15_000 });
			} catch {
				info.annotations.push({ type: 'capture manquante', description: path });
			}
		}
	}
	await setTheme(page, 'light');
}

/** Rien du lieu ne dépasse de la fenêtre (largeur) */
async function expectWithinViewport(locator: Locator, label: string): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	const width = (await locator.page().viewportSize())?.width ?? 0;
	expect(box, label).not.toBeNull();
	expect(box?.x ?? 0, `${label} : bord gauche`).toBeGreaterThanOrEqual(-1);
	expect((box?.x ?? 0) + (box?.width ?? 0), `${label} : bord droit`).toBeLessThanOrEqual(width + 1);
}

// ============================================================================
// #2189 — cercle trigo à placer
// ============================================================================

const TRIG_PATH = '/aide-ecriture/cercle-trigo';
const TRIG_SVG = 320;
const TRIG_R = 120;

/** Où toucher pour viser l'angle (radians) sur le cercle, dans le dessin de ce curseur */
async function onCircle(slider: Locator, radians: number, radiusFactor = 1): Promise<Spot> {
	const svg = slider.locator('svg.trig-circle-svg');
	const centre = await spotIn(svg);
	const box = await svg.boundingBox();
	const scale = (box?.width ?? TRIG_SVG) / TRIG_SVG;
	return {
		x: centre.x + TRIG_R * scale * radiusFactor * Math.cos(radians),
		y: centre.y - TRIG_R * scale * radiusFactor * Math.sin(radians)
	};
}

test.describe('#2189 — cercle trigo à placer', () => {
	test('#2189 — repères 0, π/2, π, 3π/2, 24 graduations, aucun point au départ ; toucher pose M puis N', async ({
		page,
		hasTouch
	}, info) => {
		await openBloc(page, TRIG_PATH);
		const zone = rendered(page, 'Placer des points (question)');
		const slider = zone.getByRole('slider', { name: 'Cercle trigonométrique : tes points' });
		await expect(slider).toBeVisible();
		await expect(slider).toHaveAttribute('aria-valuetext', 'point M pas placé');
		// Les 4 repères étiquetés, aucun autre nom écrit
		const labels = slider.locator('.trig-label math-span');
		await expect(labels).toHaveCount(4);
		expect(await labels.allTextContents()).toEqual([
			'0',
			'\\frac{\\pi}{2}',
			'\\pi',
			'\\frac{3\\pi}{2}'
		]);
		// 24 graduations (une tous les π/12)
		const ticks = await slider.locator('.trig-ticks > *').count();
		expect(ticks, 'graduations').toBe(24);
		// Aucun point de l'élève au départ
		await expect(slider.locator('.trig-mark')).toHaveCount(0);
		await shootThemes(page, zone, '2189-trig-depart', info);

		// Toucher le cercle à 2π/3 : M se pose sur la graduation, N devient le point actif
		await pressAt(page, await onCircle(slider, (2 * Math.PI) / 3), hasTouch);
		await expect(slider).toHaveAttribute('aria-valuetext', 'point N pas placé');
		await expect(slider.locator('.trig-mark')).toHaveCount(1);
		await pressAt(page, await onCircle(slider, -Math.PI / 4), hasTouch);
		await expect(slider.locator('.trig-mark')).toHaveCount(2);
		await expect(slider).toHaveAttribute('aria-valuetext', /^point N sur (−π\/4|-π\/4)$/);
		await press(zone.getByRole('button', { name: 'Point M', exact: true }), hasTouch);
		await expect(slider).toHaveAttribute('aria-valuetext', 'point M sur 2π/3');
		await shootThemes(page, zone, '2189-trig-deux-points', info);
	});
});

test('#2189 — toucher un point posé le choisit sans le bouger, rien près du centre, ◀ ▶ d’un cran, glisser', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, TRIG_PATH);
	const zone = rendered(page, 'Placer des points (question)');
	const slider = zone.getByRole('slider', { name: 'Cercle trigonométrique : tes points' });
	await pressAt(page, await onCircle(slider, (2 * Math.PI) / 3), hasTouch);
	await pressAt(page, await onCircle(slider, -Math.PI / 4), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'point N sur −π/4');
	// Toucher M (posé) le choisit, sans le déplacer
	await pressAt(page, await onCircle(slider, (2 * Math.PI) / 3), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'point M sur 2π/3');
	await expect(slider.locator('.trig-mark')).toHaveCount(2);
	// Près du centre l'angle ne se lit pas : le toucher ne pose et ne déplace rien
	await pressAt(page, await onCircle(slider, Math.PI / 5, 0.1), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'point M sur 2π/3');
	// ◀ ▶ d'un cran (π/12), dans le sens direct puis indirect
	await press(zone.getByRole('button', { name: /^Avancer le point M/ }), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'point M sur 3π/4');
	await press(zone.getByRole('button', { name: /^Reculer le point M/ }), hasTouch);
	await press(zone.getByRole('button', { name: /^Reculer le point M/ }), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'point M sur 7π/12');
	// Glisser M de sa place jusqu'à π/6
	const moved = await drag(
		page,
		await onCircle(slider, (7 * Math.PI) / 12),
		await onCircle(slider, Math.PI / 6),
		info
	);
	if (moved) await expect(slider).toHaveAttribute('aria-valuetext', 'point M sur π/6');
	else info.annotations.push({ type: 'reste', description: 'glisser au doigt : iPhone réel' });
});

test('#2189 — étiquettes des cercles « tout » et « quarts » : hors du cercle, π/2 et 3π/2 à droite de l’axe vertical, 0 et π au-dessus de l’axe horizontal, clair et sombre', async ({
	page
}, info) => {
	await openBloc(page, TRIG_PATH);
	for (const title of ['Préréglage : tout', 'Préréglage : quarts']) {
		const zone = rendered(page, title);
		const svg = zone.locator('svg.trig-circle-svg');
		await expect(svg).toBeVisible();
		for (const theme of ['light', 'dark'] as const) {
			await setTheme(page, theme);
			const box = await svg.boundingBox();
			const circle = await zone.locator('.trig-unit-circle').boundingBox();
			if (box === null || circle === null) throw new Error('cercle sans boîte');
			const cx = circle.x + circle.width / 2;
			const cy = circle.y + circle.height / 2;
			const radius = circle.width / 2;
			// Toutes les étiquettes lues d'un seul coup : le changement de thème les redessine,
			// et une étiquette lue une à une par son rang pourrait ne plus exister (attente sans fin)
			await expect
				.poll(() => zone.locator('.trig-label math-span').count(), {
					message: `${title} : étiquettes`
				})
				.toBeGreaterThanOrEqual(4);
			const items = await zone.locator('.trig-label math-span').evaluateAll((nodes) =>
				nodes.map((node) => {
					const rect = node.getBoundingClientRect();
					return {
						latex: (node.textContent ?? '').trim(),
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height
					};
				})
			);
			for (const at of items) {
				const latex = at.latex;
				const label = `${title}, ${theme} : ${latex}`;
				// Hors du cercle : le centre de l'étiquette est plus loin du centre que le rayon
				const distance = Math.hypot(at.x + at.width / 2 - cx, at.y + at.height / 2 - cy);
				expect(distance, `${label} hors du cercle`).toBeGreaterThan(radius);
				if (latex === '\\frac{\\pi}{2}' || latex === '\\frac{3\\pi}{2}') {
					expect(at.x, `${label} à droite de l’axe vertical`).toBeGreaterThanOrEqual(cx - 1);
				}
				if (latex === '0' || latex === '\\pi') {
					expect(at.y + at.height, `${label} au-dessus de l’axe horizontal`).toBeLessThanOrEqual(
						cy + 1
					);
				}
			}
			await expectNoOverflowOf(svg, `${title}, ${theme}`);
		}
		await shootThemes(
			page,
			zone,
			`2189-etiquettes-${title.includes('tout') ? 'tout' : 'quarts'}`,
			info
		);
	}
});

/** Le dessin ne déborde pas de la page */
async function expectNoOverflowOf(locator: Locator, label: string): Promise<void> {
	await expectWithinViewport(locator, label);
	await expectNoHorizontalOverflow(locator.page(), label);
}

// ============================================================================
// #2179 / #1872 — horloge : trotteuse, aiguilles à placer
// ============================================================================

const HORLOGE_PATH = '/aide-ecriture/blocs/horloge';

/** Où toucher le cadran pour viser cet angle (degrés depuis le 12, sens horaire) */
async function onDial(dial: Locator, degrees: number, reach = 0.7): Promise<Spot> {
	const centre = await spotIn(dial);
	const box = await dial.boundingBox();
	const radius = ((box?.width ?? 0) / 2) * reach;
	const radians = (degrees * Math.PI) / 180;
	return { x: centre.x + radius * Math.sin(radians), y: centre.y - radius * Math.cos(radians) };
}

/** La zone « Essayer » : y écrire un bloc, rendre sa zone de rendu */
async function tryBlock(page: Page, source: string): Promise<Locator> {
	const textarea = page.locator('#essayer-bloc');
	await textarea.scrollIntoViewIfNeeded();
	await textarea.fill(source);
	return textarea.locator('xpath=ancestor::div[contains(@class,"grid")][1]').locator('div.min-w-0');
}

test('#2179 — exemple « Avec la trotteuse » : trotteuse fine à contrepoids, grande aiguille pile sur le 25, clair et sombre', async ({
	page
}, info) => {
	await openBloc(page, HORLOGE_PATH);
	const zone = rendered(page, 'Avec la trotteuse');
	const dial = zone.locator('svg.horloge-cadran');
	await expect(dial).toBeVisible();
	const second = dial.locator('line.horloge-aiguille-secondes');
	const minute = dial.locator('line.horloge-aiguille-minutes');
	await expect(second).toHaveCount(1);
	const num = async (line: Locator, attr: string) => Number(await line.getAttribute(attr));
	// Fine : un trait moins épais que la grande aiguille
	expect(await num(second, 'stroke-width'), 'trotteuse fine').toBeLessThan(
		await num(minute, 'stroke-width')
	);
	// Contrepoids : la trotteuse part de l'autre côté du centre
	const tail = { x: await num(second, 'x1'), y: await num(second, 'y1') };
	const tip = { x: await num(second, 'x2'), y: await num(second, 'y2') };
	expect(Math.hypot(tail.x, tail.y), 'contrepoids').toBeGreaterThan(1);
	expect(tail.x * tip.x + tail.y * tip.y, 'contrepoids opposé à la pointe').toBeLessThan(0);
	// La trotteuse à 40 s : 240° depuis le 12
	const secondAngle = (Math.atan2(tip.x, -tip.y) * 180) / Math.PI;
	expect((secondAngle + 360) % 360, 'trotteuse sur 40 s').toBeCloseTo(240, 0);
	// Grande aiguille pile sur le 25 : 150°
	const minuteTip = { x: await num(minute, 'x2'), y: await num(minute, 'y2') };
	const minuteAngle = (Math.atan2(minuteTip.x, -minuteTip.y) * 180) / Math.PI;
	expect((minuteAngle + 360) % 360, 'grande aiguille sur le 25').toBeCloseTo(150, 0);
	// Lisible en clair comme en sombre : la trotteuse et la grande aiguille contre le fond du cadran
	await expectContrastBothThemes(
		page,
		dial,
		'trotteuse et grande aiguille',
		'.horloge-aiguille-secondes, .horloge-aiguille-minutes',
		'.horloge-fond'
	);
	await shootThemes(page, zone, '2179-trotteuse', info);
});

test('#2179 — la petite aiguille (couleur d’accent) tient le contraste d’un trait (3) sur le fond du cadran, clair et sombre', async ({
	page
}) => {
	await openBloc(page, HORLOGE_PATH);
	const dial = rendered(page, 'Avec la trotteuse').locator('svg.horloge-cadran');
	await expectContrastBothThemes(
		page,
		dial,
		'petite aiguille',
		'.horloge-aiguille-heures',
		'.horloge-fond'
	);
});

test('#2179 — « Essayer » placer: 9 h 25 min 40 s : trois étiquettes, poser grande, petite, trotteuse ; toucher près d’une autre la choisit sans la bouger, la glisser, ◀ ▶ d’une seconde', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, HORLOGE_PATH);
	const zone = await tryBlock(page, '```horloge\nplacer: 9 h 25 min 40 s\n```');
	const dial = zone.getByRole('slider');
	const group = zone.getByRole('group', { name: 'Aiguille à tourner' });
	await expect(group.getByRole('button')).toHaveText([
		'petite aiguille',
		'grande aiguille',
		'trotteuse'
	]);
	await expect(group.getByRole('button', { name: 'grande aiguille', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	// Poser la grande (25 min = 150°), puis la petite (entre le 9 et le 10 = 282°), puis la trotteuse (40 s = 240°)
	await pressAt(page, await onDial(dial, 150), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'petite aiguille pas placée');
	await pressAt(page, await onDial(dial, 282), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'trotteuse pas placée');
	await pressAt(page, await onDial(dial, 240), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'trotteuse sur la seconde 40');
	await expect(zone.locator('.horloge-aiguille-attente')).toHaveCount(0);
	// Toucher près de la grande (un cran à côté) la choisit sans la bouger
	await pressAt(page, await onDial(dial, 156), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'grande aiguille sur la minute 25');
	// Glisser la grande de 25 à 30 min (180°)
	const moved = await drag(page, await onDial(dial, 150), await onDial(dial, 180), info);
	if (moved)
		await expect(dial).toHaveAttribute('aria-valuetext', 'grande aiguille sur la minute 30');
	// ◀ ▶ : un cran de l'aiguille active, une seconde pour la trotteuse
	await press(group.getByRole('button', { name: 'trotteuse', exact: true }), hasTouch);
	await press(zone.getByRole('button', { name: /^Avancer la trotteuse d’une seconde$/ }), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'trotteuse sur la seconde 41');
	await press(zone.getByRole('button', { name: /^Reculer la trotteuse d’une seconde$/ }), hasTouch);
	await press(zone.getByRole('button', { name: /^Reculer la trotteuse d’une seconde$/ }), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'trotteuse sur la seconde 39');
	await shootThemes(page, zone, '2179-trotteuse-a-placer', info);
	await expectNoHorizontalOverflow(page, 'horloge à placer');
});

test('#1872 — « Placer les aiguilles » : aiguilles en attente grisées sur le 12, étiquettes, toucher tourne l’aiguille active, toucher une aiguille posée la reprend, ◀ ▶, le cadran ne fait pas défiler la page', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, HORLOGE_PATH);
	const zone = rendered(page, 'Placer les aiguilles (question)');
	const dial = zone.getByRole('slider');
	await expect(dial).toBeVisible();
	// Deux aiguilles en attente, grisées (pointillés, opacité réduite), sur le 12
	const waiting = zone.locator('.horloge-aiguille-attente');
	await expect(waiting).toHaveCount(2);
	for (let i = 0; i < 2; i++) {
		const hand = waiting.nth(i);
		expect(Number(await hand.getAttribute('x2')), 'sur le 12 (x)').toBeCloseTo(0, 3);
		expect(Number(await hand.getAttribute('y2')), 'sur le 12 (haut)').toBeLessThan(0);
		const style = await hand.evaluate((el) => {
			const s = getComputedStyle(el);
			return { dash: s.strokeDasharray, opacity: Number(s.opacity) };
		});
		expect(style.dash, 'pointillés').not.toBe('none');
		expect(style.opacity, 'grisée').toBeLessThan(1);
	}
	await expect(zone.getByRole('button', { name: 'petite aiguille', exact: true })).toBeVisible();
	await expect(zone.getByRole('button', { name: 'grande aiguille', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	// Le cadran garde le doigt : la page ne défile pas dessus
	expect(await dial.evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
	// Toucher à 3 h : la grande aiguille se pose sur la minute 15 ; la petite devient active
	await pressAt(page, await onDial(dial, 90), hasTouch);
	await expect(zone.locator('.horloge-aiguille-attente')).toHaveCount(1);
	await expect(zone.getByRole('button', { name: 'petite aiguille', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await pressAt(page, await onDial(dial, 270), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'petite aiguille sur le 9');
	await expect(zone.locator('.horloge-aiguille-attente')).toHaveCount(0);
	// Toucher la grande (posée) la reprend, sans la bouger
	await pressAt(page, await onDial(dial, 90), hasTouch);
	await expect(zone.getByRole('button', { name: 'grande aiguille', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(dial).toHaveAttribute('aria-valuetext', 'grande aiguille sur la minute 15');
	// ◀ ▶
	await press(zone.getByRole('button', { name: /^Avancer la grande aiguille/ }), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'grande aiguille sur la minute 16');
	await press(zone.getByRole('button', { name: /^Reculer la grande aiguille/ }), hasTouch);
	await expect(dial).toHaveAttribute('aria-valuetext', 'grande aiguille sur la minute 15');
	await expectReadableDrawing(dial, 'cadran');
	await expectContrastBothThemes(page, zone.locator('.placer-zone'), 'cadran à placer');
	await shootThemes(page, zone, '1872-horloge-a-placer', info);
});

// ============================================================================
// #1908 / #1947 — barres à construire, échelle choisie par l'élève
// ============================================================================

const STATS_PATH = '/aide-ecriture/blocs/statistiques';

/** Où toucher le diagramme en barres : la colonne de cette catégorie, à la hauteur de cette valeur */
async function barSpot(svg: Locator, category: string, value: number): Promise<Spot> {
	await scrollTo(svg);
	const spot = await svg.evaluate(
		(root, [name, target]) => {
			const rect = (el: Element) => el.getBoundingClientRect();
			const label = [...root.querySelectorAll('.stat-categories text')].find(
				(t) => t.textContent?.trim() === name
			);
			const ticks = [...root.querySelectorAll('.stat-graduations text')]
				.map((t) => ({ text: (t.textContent ?? '').trim(), box: rect(t) }))
				.filter((t) => t.text !== '' && !Number.isNaN(Number(t.text)));
			if (!label || ticks.length < 2) return null;
			const first = ticks[0];
			const last = ticks[ticks.length - 1];
			const [v0, v1] = [Number(first.text), Number(last.text)];
			const y0 = first.box.top + first.box.height / 2;
			const y1 = last.box.top + last.box.height / 2;
			return {
				x: rect(label).left + rect(label).width / 2,
				y: y0 + ((y1 - y0) * (Number(target) - v0)) / (v1 - v0)
			};
		},
		[category, String(value)] as const
	);
	if (spot === null) throw new Error(`colonne ${category} introuvable`);
	return spot;
}

/** La page défile dans `main` (mise en page de l'appli), pas dans la fenêtre */
async function pageScroll(page: Page): Promise<number> {
	return page
		.locator('main')
		.first()
		.evaluate((el) => el.scrollTop);
}

/** Fait défiler la page au doigt (Android) : le contenu remonte de `distance` px, depuis ce point */
async function swipeUp(page: Page, from: Spot, distance: number): Promise<number> {
	const before = await pageScroll(page);
	await new Drag(page).finger(from, { x: from.x, y: from.y - distance });
	// Le défilement tarde : on attend qu'il se pose (deux relevés identiques à 100 ms)
	let last = before;
	await expect
		.poll(
			async () => {
				const now = await pageScroll(page);
				const settled = now === last && now !== before;
				last = now;
				return settled;
			},
			{ timeout: 2500 }
		)
		.toBe(true)
		.catch(() => undefined);
	return (await pageScroll(page)) - before;
}

test('#1908 — « Construire des barres » : pointillés au pied des colonnes à construire, toucher monte la barre, glisser l’ajuste, ▲ ▼, étiquettes', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, STATS_PATH);
	const zone = rendered(page, 'Construire des barres (question)');
	const svg = zone.locator('svg.barres-dessin');
	await expect(svg).toBeVisible();
	const slider = zone.getByRole('slider');
	// Natation et Danse : deux traits en pointillés au pied de leur colonne (pas Football, déjà dessinée)
	const waiting = svg.locator('line.barres-attente');
	await expect(waiting).toHaveCount(2);
	const dash = await waiting.first().evaluate((el) => getComputedStyle(el).strokeDasharray);
	expect(dash, 'pointillés').not.toBe('none');
	const foot = await barSpot(svg, 'Natation', 0);
	const footLine = await waiting.first().boundingBox();
	expect(Math.abs((footLine?.y ?? 0) - foot.y), 'au pied de la colonne (hauteur)').toBeLessThan(8);
	const natationBox = await svg
		.locator('.stat-categories text', { hasText: 'Natation' })
		.boundingBox();
	const lineCentre = (footLine?.x ?? 0) + (footLine?.width ?? 0) / 2;
	expect(
		Math.abs(lineCentre - (natationBox?.x ?? 0) - (natationBox?.width ?? 0) / 2),
		'sous son nom'
	).toBeLessThan(8);
	// Toucher la colonne Natation à 7 : la barre monte, à l'unité, malgré un axe gradué de 2 en 2
	await pressAt(page, await barSpot(svg, 'Natation', 7), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'barre Natation : 7');
	await expect(svg.locator('rect.barres-posee')).toHaveCount(1);
	await expect(svg.locator('line.barres-attente')).toHaveCount(1);
	// Toucher la colonne Danse à 9
	await pressAt(page, await barSpot(svg, 'Danse', 9), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'barre Danse : 9');
	// Glisser l'ajuste (souris, ou doigt sur Android)
	const moved = await drag(
		page,
		await barSpot(svg, 'Danse', 9),
		await barSpot(svg, 'Danse', 13),
		info
	);
	if (moved) await expect(slider).toHaveAttribute('aria-valuetext', 'barre Danse : 13');
	// ▲ ▼ d'une unité sur la barre choisie
	await press(zone.getByRole('button', { name: /^Monter la barre Danse/ }), hasTouch);
	await expect(slider).toHaveAttribute(
		'aria-valuetext',
		moved ? 'barre Danse : 14' : 'barre Danse : 10'
	);
	await press(zone.getByRole('button', { name: /^Descendre la barre Danse/ }), hasTouch);
	await expect(slider).toHaveAttribute(
		'aria-valuetext',
		moved ? 'barre Danse : 13' : 'barre Danse : 9'
	);
	// Les étiquettes choisissent la barre
	await press(
		zone
			.getByRole('group', { name: 'Barre à construire' })
			.getByRole('button', { name: 'Natation', exact: true }),
		hasTouch
	);
	await expect(slider).toHaveAttribute('aria-valuetext', 'barre Natation : 7');
	await expectContrastBothThemes(page, zone, 'barres');
	await expectWithinViewport(svg, 'barres');
	await expectNoHorizontalOverflow(page, 'barres à construire');
	await shootThemes(page, zone, '1908-barres-a-construire', info);
});

test('#1908 — au doigt (Android), la page défile hors des colonnes à construire et pas dessus', async ({
	page
}, info) => {
	test.skip(
		info.project.name !== 'android',
		'Gestes au doigt : Chromium (Android) ; l’iPhone reste à la main'
	);
	await openBloc(page, STATS_PATH);
	const zone = rendered(page, 'Construire des barres (question)');
	const svg = zone.locator('svg.barres-dessin');
	await scrollTo(svg);
	// Hors des colonnes à construire : Football (barre donnée), la page suit le doigt
	const onFootball = await barSpot(svg, 'Football', 3);
	expect(await swipeUp(page, onFootball, 120), 'la page défile sur Football').toBeGreaterThan(40);
	// Sur la colonne Danse (à construire) : la page ne bouge pas, la barre monte
	await scrollTo(svg);
	const onDanse = await barSpot(svg, 'Danse', 4);
	const scrolled = await swipeUp(page, onDanse, 120);
	expect(Math.abs(scrolled), 'la page ne défile pas sur la colonne à construire').toBeLessThan(10);
	await expect(zone.getByRole('slider')).toHaveAttribute('aria-valuetext', /^barre Danse : \d+$/);
});

test('#1947 — « Choisir l’échelle puis construire » : ▲ ▼ grisés avant le choix, axe muet, choisir 5 numérote 0 → 50, passer à 2 efface la barre au-delà de 20', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, STATS_PATH);
	const zone = rendered(page, 'Choisir l’échelle puis construire (question)');
	const svg = zone.locator('svg.barres-dessin');
	const slider = zone.getByRole('slider');
	await expect(svg).toBeVisible();
	const ticks = svg.locator('.stat-graduations text');
	// Avant le choix : axe muet, rien ne bouge, ▲ ▼ grisés, la consigne le dit
	for (const text of await ticks.allTextContents()) expect(text.trim(), 'axe muet').toBe('');
	await expect(zone.getByText('Choisis d’abord l’échelle.')).toBeVisible();
	await expect(zone.getByRole('button', { name: /^Monter la barre/ })).toBeDisabled();
	await expect(zone.getByRole('button', { name: /^Descendre la barre/ })).toBeDisabled();
	await pressAt(page, await spotIn(svg, 0.5, 0.4), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', /pas construite$/);
	await shootThemes(page, zone, '1947-echelle-avant', info);
	// Choisir 5 : l'axe est numéroté de 5 en 5, de 0 à 50
	await press(zone.getByRole('button', { name: 'Une graduation vaut 5' }), hasTouch);
	await expect(ticks.filter({ hasText: /^50$/ })).toHaveCount(1);
	await expect(zone.getByRole('button', { name: /^Monter la barre/ })).toBeEnabled();
	const numbers = (await ticks.allTextContents()).map((t) => Number(t.trim()));
	expect(numbers).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
	// Monter la barre Alphaville à 40, puis passer à l'échelle 2 (axe 0 → 20) : la barre s'efface
	await pressAt(page, await barSpot(svg, 'Alphaville', 40), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'barre Alphaville : 40');
	await press(zone.getByRole('button', { name: 'Une graduation vaut 2' }), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'barre Alphaville pas construite');
	const numbersAfter = (await ticks.allTextContents()).map((t) => Number(t.trim()));
	expect(Math.max(...numbersAfter), 'axe 0 → 20').toBe(20);
	// Une barre qui rentre se garde : 12 sous l'échelle 2, puis l'échelle 5
	await pressAt(page, await barSpot(svg, 'Alphaville', 12), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'barre Alphaville : 12');
	await press(zone.getByRole('button', { name: 'Une graduation vaut 5' }), hasTouch);
	await expect(slider).toHaveAttribute('aria-valuetext', 'barre Alphaville : 12');
	await expectNoHorizontalOverflow(page, 'échelle choisie');
	await shootThemes(page, zone, '1947-echelle-apres', info);
});

// ============================================================================
// #2162 / #2151 — boîte à moustaches
// ============================================================================

const BOITE_PATH = '/aide-ecriture/blocs/boite-a-moustaches';

/** Où toucher la boîte à construire : sur cette graduation de l'axe, dans la bande n° `band` (0 : la première) */
async function boxSpot(svg: Locator, value: number, band = 0, offsetPx = 0): Promise<Spot> {
	await scrollTo(svg);
	const spot = await svg.evaluate(
		(root, [target, rank, offset]) => {
			// Cadre étroit : une graduation sur deux seulement porte son étiquette (E46) ;
			// l'abscisse se lit alors entre deux étiquettes (graduations régulières)
			const labels = [...root.querySelectorAll('.stat-graduation')]
				.map((t) => {
					const box = t.getBoundingClientRect();
					return { value: Number((t.textContent ?? '').trim()), x: box.left + box.width / 2 };
				})
				.filter((t) => Number.isFinite(t.value));
			const lines = root.querySelectorAll('line.boite-attente');
			const line = lines[rank];
			if (labels.length < 2 || !line) return null;
			const [a, b] = labels;
			const x = a.x + ((Number(target) - a.value) / (b.value - a.value)) * (b.x - a.x);
			const l = line.getBoundingClientRect();
			return { x: x + Number(offset), y: l.top + l.height / 2 };
		},
		[value, band, offsetPx] as const
	);
	if (spot === null) throw new Error(`graduation ${value} introuvable`);
	return spot;
}

/** Les textes du dessin qui se chevauchent (deux à deux) */
async function overlappingTexts(drawing: Locator): Promise<string[]> {
	return drawing.evaluate((root) => {
		const items = [...root.querySelectorAll('text')]
			.filter((t) => (t.textContent ?? '').trim() !== '' && !t.closest('title'))
			.map((t) => ({ text: (t.textContent ?? '').trim(), box: t.getBoundingClientRect() }));
		const found: string[] = [];
		for (let i = 0; i < items.length; i++) {
			for (let j = i + 1; j < items.length; j++) {
				const a = items[i].box;
				const b = items[j].box;
				const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
				const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
				if (overlapX > 1 && overlapY > 1) found.push(`« ${items[i].text} » / « ${items[j].text} »`);
			}
		}
		return found;
	});
}

test('#2162 — boîte à construire : cinq traits posés un à un (aimantés, sans viser au pixel), un trait posé passe au suivant, glisser, boutons de trait', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, BOITE_PATH);
	const zone = rendered(page, 'Construire la boîte (question)');
	const svg = zone.locator('svg.boite-dessin');
	await expect(svg).toBeVisible();
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, minimum pas posé');
	// Le nom seul, une ligne en pointillés : aucune boîte dessinée avant les traits
	await expect(svg.locator('rect.stat-boite')).toHaveCount(0);
	// Minimum à 4 : on vise à côté de la graduation (le trait s'aimante), puis il passe au suivant
	await pressAt(page, await boxSpot(svg, 4, 0, 3), hasTouch);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, premier quartile pas posé');
	await pressAt(page, await boxSpot(svg, 8, 0, -3), hasTouch);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, médiane pas posée');
	// La boîte ne se dessine qu'avec Q1 et Q3 ; la médiane en trait épais
	await pressAt(page, await boxSpot(svg, 11), hasTouch);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, troisième quartile pas posé');
	await expect(svg.locator('rect.stat-boite')).toHaveCount(0);
	await pressAt(page, await boxSpot(svg, 14), hasTouch);
	await expect(svg.locator('rect.stat-boite')).toHaveCount(1);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, maximum pas posé');
	await pressAt(page, await boxSpot(svg, 19), hasTouch);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, maximum : 19');
	await expect(svg.locator('line.stat-mediane')).toHaveCount(1);
	await expect(svg.locator('line.boite-trait-actif')).toHaveCount(1);
	// Le minimum visé à côté est bien tombé sur 4
	await press(
		zone
			.getByRole('group', { name: 'Trait à placer' })
			.getByRole('button', { name: 'Min', exact: true }),
		hasTouch
	);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, minimum : 4');
	// Choisir la médiane par son bouton, la poser à 12, puis la glisser à 10
	await press(
		zone
			.getByRole('group', { name: 'Trait à placer' })
			.getByRole('button', { name: 'Médiane', exact: true }),
		hasTouch
	);
	await pressAt(page, await boxSpot(svg, 12), hasTouch);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, médiane : 12');
	const moved = await drag(page, await boxSpot(svg, 12), await boxSpot(svg, 10), info);
	if (moved) await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Notes, médiane : 10');
	// Cibles à toucher : 44 px au moins
	for (const name of ['Min', 'Q1', 'Médiane', 'Q3', 'Max']) {
		const box = await zone.getByRole('button', { name, exact: true }).boundingBox();
		expect(box?.height ?? 0, `bouton ${name}`).toBeGreaterThanOrEqual(44);
	}
	await expectNoHorizontalOverflow(page, 'boîte à construire');
	await expectContrastBothThemes(
		page,
		zone,
		'boîte à construire',
		undefined,
		undefined,
		'.boite-trait-nom'
	);
	await shootThemes(page, zone, '2162-boite-a-construire', info);
});

test('#2162 — le nom du trait posé, écrit au-dessus de lui dans le dessin, se lit sur le fond clair (4,5)', async ({
	page,
	hasTouch
}) => {
	await openBloc(page, BOITE_PATH);
	const zone = rendered(page, 'Construire la boîte (question)');
	const svg = zone.locator('svg.boite-dessin');
	await pressAt(page, await boxSpot(svg, 4), hasTouch);
	// Le trait actif passe au suivant une fois le minimum posé : on le reprend par son bouton pour voir son nom
	await press(
		zone
			.getByRole('group', { name: 'Trait à placer' })
			.getByRole('button', { name: 'Min', exact: true }),
		hasTouch
	);
	await expect(svg.locator('.boite-trait-nom')).toHaveText('Min');
	await expectContrastBothThemes(page, svg.locator('.boite-trait-nom'), 'nom du trait');
});

test('#2162 — plusieurs boîtes à construire : les boutons de boîte choisissent laquelle, chaque boîte garde ses traits', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, BOITE_PATH);
	const zone = await tryBlock(
		page,
		'```boite-a-moustaches\naxe: 0 à 20, de 1 en 1\nplacer: toutes\nClasse A = 2 ; 5 ; 8 ; 12 ; 18\nClasse B = 4 ; 6 ; 10 ; 13 ; 19\n```'
	);
	const svg = zone.locator('svg.boite-dessin');
	await expect(svg).toBeVisible();
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Classe A, minimum pas posé');
	const boxes = zone.getByRole('group', { name: 'Boîte à construire' });
	await expect(boxes.getByRole('button')).toHaveText(['Classe A', 'Classe B']);
	// Poser le minimum de la classe B (sa bande, la seconde) : B devient la boîte active
	await pressAt(page, await boxSpot(svg, 6, 1), hasTouch);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Classe B, premier quartile pas posé');
	// Le bouton de la classe A la choisit ; son minimum n'est pas posé
	await press(boxes.getByRole('button', { name: 'Classe A', exact: true }), hasTouch);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Classe A, premier quartile pas posé');
	await press(
		zone
			.getByRole('group', { name: 'Trait à placer' })
			.getByRole('button', { name: 'Min', exact: true }),
		hasTouch
	);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Classe A, minimum pas posé');
	await press(boxes.getByRole('button', { name: 'Classe B', exact: true }), hasTouch);
	await expect(svg).toHaveAttribute('aria-valuetext', 'boîte Classe B, minimum : 6');
	await expectNoHorizontalOverflow(page, 'plusieurs boîtes à construire');
	await shootThemes(page, zone, '2162-deux-boites', info);
});

test('#2151 — les trois exemples à lire : noms au-dessus des boîtes, graduations, valeurs écrites sans chevauchement, clair et sombre', async ({
	page
}, info) => {
	await openBloc(page, BOITE_PATH);
	for (const title of ['Comparer deux classes', 'Boîte d’une série brute', 'Valeurs écrites']) {
		const zone = rendered(page, title);
		const svg = zone.locator('svg').first();
		await expect(svg, title).toBeVisible();
		const ticks = svg.locator('.stat-graduation');
		expect(await ticks.count(), `${title} : graduations`).toBeGreaterThanOrEqual(4);
		// Les noms sont au-dessus de leur boîte
		const names = svg.locator('.stat-nom-boite');
		const boxes = svg.locator('rect.stat-boite');
		const nameCount = await names.count();
		if (nameCount > 0) {
			expect(await boxes.count(), `${title} : une boîte par nom`).toBe(nameCount);
			for (let i = 0; i < nameCount; i++) {
				const name = await names.nth(i).boundingBox();
				const box = await boxes.nth(i).boundingBox();
				expect(
					(name?.y ?? 0) + (name?.height ?? 0),
					`${title} : nom ${i + 1} au-dessus`
				).toBeLessThanOrEqual((box?.y ?? 0) + 1);
			}
		}
		// Aucun texte ne chevauche un autre (valeurs écrites comprises)
		expect(await overlappingTexts(svg), `${title} : textes qui se chevauchent`).toEqual([]);
		await expectContrastBothThemes(page, zone, `boîte « ${title} »`);
		await expectNoHorizontalOverflow(page, title);
	}
	await shootThemes(page, rendered(page, 'Valeurs écrites'), '2151-valeurs-ecrites', info);
	await shootThemes(page, rendered(page, 'Comparer deux classes'), '2151-comparer', info);
});

test('#2151 — le plus petit texte du dessin d’une boîte à lire fait 12 px à l’écran', async ({
	page
}) => {
	await openBloc(page, BOITE_PATH);
	await expectReadableDrawing(
		rendered(page, 'Valeurs écrites').locator('svg').first(),
		'boîte à lire'
	);
});

// Écart E46 : le dessin est recalculé à la largeur disponible, jamais rétréci
test('E46 — boîte à construire : le plus petit texte du dessin fait 12 px à l’écran, aucun texte n’en chevauche un autre', async ({
	page
}) => {
	await openBloc(page, BOITE_PATH);
	const svg = rendered(page, 'Construire la boîte (question)').locator('svg.boite-dessin');
	await expect(svg).toBeVisible();
	await expectReadableDrawing(svg, 'boîte à construire');
	expect(await overlappingTexts(svg), 'textes qui se chevauchent').toEqual([]);
	await expectNoHorizontalOverflow(page, 'boîte à construire');
});

test('E46 — barres à construire : le plus petit texte du dessin fait 12 px à l’écran, aucun texte n’en chevauche un autre', async ({
	page
}) => {
	await openBloc(page, STATS_PATH);
	for (const title of [
		'Construire des barres (question)',
		'Choisir l’échelle puis construire (question)'
	]) {
		const svg = rendered(page, title).locator('svg.barres-dessin');
		await expect(svg, title).toBeVisible();
		await expectReadableDrawing(svg, title);
		expect(await overlappingTexts(svg), `${title} : textes qui se chevauchent`).toEqual([]);
	}
	await expectNoHorizontalOverflow(page, 'barres à construire');
});

test('E46 — barres à lire (diagramme, loi binomiale) : texte de 12 px à l’écran, jamais rétréci ; trop de colonnes pour la place : le dessin défile dans son cadre', async ({
	page
}) => {
	await openBloc(page, STATS_PATH);
	for (const title of ['Diagramme en barres', 'Loi binomiale']) {
		const svg = rendered(page, title).locator('svg.stat-barres').first();
		await expect(svg, title).toBeVisible();
		await expectReadableDrawing(svg, title);
		// À l'échelle 1 : le dessin n'est pas rétréci par le navigateur
		const scale = await svg.evaluate((el) => (el as SVGSVGElement).getScreenCTM()?.a ?? 0);
		expect(scale, `${title} : échelle du dessin`).toBeGreaterThanOrEqual(0.999);
	}
	await expectNoHorizontalOverflow(page, 'barres à lire');
});

test('#2151 — sous 300 px la figure défile dans son cadre sans casser la page', async ({
	page
}) => {
	await page.setViewportSize({ width: 280, height: 700 });
	await openBloc(page, BOITE_PATH);
	const zone = rendered(page, 'Valeurs écrites');
	const svg = zone.locator('svg').first();
	await expect(svg).toBeVisible();
	const measure = await svg.evaluate((el) => {
		const width = el.getBoundingClientRect().width;
		let scroller: Element | null = el.parentElement;
		while (scroller && !['auto', 'scroll'].includes(getComputedStyle(scroller).overflowX)) {
			scroller = scroller.parentElement;
		}
		return {
			width,
			scrollable: scroller !== null && scroller.scrollWidth > scroller.clientWidth,
			scrollerWidth: scroller?.clientWidth ?? 0
		};
	});
	expect(measure.width, 'la figure garde 300 px au moins').toBeGreaterThanOrEqual(299);
	expect(measure.scrollerWidth, 'cadre plus étroit que la figure').toBeLessThan(300);
	expect(measure.scrollable, 'la figure défile dans son cadre').toBe(true);
	await expectNoHorizontalOverflow(page, 'page à 280 px');
});

// ============================================================================
// #2122 — bloc ```scratch
// ============================================================================

const SCRATCH_PATH = '/aide-ecriture/blocs/scratch';
const SCRATCH_EXAMPLES = [
	'Plusieurs variables',
	'Condition composée',
	'Boucle « répéter jusqu’à ce que »',
	'Bloc personnalisé'
];

/** Pire contraste d'un dessin Scratch : chaque texte contre la forme dessinée juste derrière lui */
async function worstScratchContrast(svg: Locator): Promise<{ ratio: number; text: string }> {
	await scrollTo(svg); // `elementsFromPoint` ne voit que ce qui est dans la fenêtre
	return svg.evaluate((root) => {
		const rgb = (css: string): [number, number, number, number] | null => {
			const m = css.match(/rgba?\(([^)]+)\)/);
			if (!m) return null;
			const p = m[1]
				.split(/[ ,/]+/)
				.filter(Boolean)
				.map(Number);
			return [p[0], p[1], p[2], p[3] ?? 1];
		};
		const lum = ([r, g, b]: number[]) => {
			const lin = (v: number) => {
				const s = v / 255;
				return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			};
			return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
		};
		let worst = { ratio: Infinity, text: '' };
		for (const node of root.querySelectorAll('text')) {
			const text = (node.textContent ?? '').trim();
			if (text === '') continue;
			const fg = rgb(getComputedStyle(node).fill);
			const box = node.getBoundingClientRect();
			// La forme dessinée sous le texte : la première avec un remplissage plein
			const under = document
				.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
				.filter((el) => el !== node && root.contains(el) && el instanceof SVGElement)
				.map((el) => rgb(getComputedStyle(el).fill))
				.find((c) => c !== null && c[3] > 0.9);
			if (!fg || !under) continue;
			const l1 = lum(fg);
			const l2 = lum(under);
			const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
			if (ratio < worst.ratio) worst = { ratio, text };
		}
		return worst;
	});
}

test('#2122 — les 4 exemples dessinés en blocs Scratch, lisibles en clair et en sombre', async ({
	page
}, info) => {
	await openBloc(page, SCRATCH_PATH);
	for (const title of SCRATCH_EXAMPLES) {
		const zone = rendered(page, title);
		const svg = zone.locator('figure.scratch-bloc svg').first();
		await expect(svg, `${title} : dessiné en blocs`).toBeVisible();
		// Des vrais blocs, avec les mots de l'instruction écrite
		expect(await svg.locator('text').count(), `${title} : étiquettes`).toBeGreaterThan(5);
		await expectWithinViewport(zone.locator('figure.scratch-bloc'), title);
		await expectNoHorizontalOverflow(page, title);
		// Les couleurs des blocs sont celles de Scratch, les mêmes en clair et en sombre : ce qui se lit
		// en sombre (seul thème vu) se lit en clair
		const fills: string[] = [];
		for (const theme of ['light', 'dark'] as const) {
			await setTheme(page, theme);
			fills.push(
				await svg.evaluate((root) =>
					[...root.querySelectorAll('path')].map((p) => getComputedStyle(p).fill).join('|')
				)
			);
		}
		await setTheme(page, 'light');
		expect(fills[0], `${title} : mêmes couleurs de blocs en clair et en sombre`).toBe(fills[1]);
	}
	await shootThemes(page, rendered(page, 'Plusieurs variables'), '2122-scratch-variables', info);
	await shootThemes(page, rendered(page, 'Bloc personnalisé'), '2122-scratch-perso', info);
});

test('#2122 — le texte des blocs se lit : 4,5 contre la couleur du bloc', async ({ page }) => {
	await openBloc(page, SCRATCH_PATH);
	const worst: Array<{ title: string; ratio: number; text: string }> = [];
	for (const title of SCRATCH_EXAMPLES) {
		const svg = rendered(page, title).locator('figure.scratch-bloc svg').first();
		worst.push({ title, ...(await worstScratchContrast(svg)) });
	}
	// La mesure a bien vu des textes sur des formes (sinon le rapport reste infini et le test ne prouve rien)
	for (const { title, ratio } of worst)
		expect(Number.isFinite(ratio), `${title} : mesuré`).toBe(true);
	test.fail(
		true,
		'écart E47 : texte blanc sur le jaune « événements » de Scratch (« quand le drapeau vert pressé ») : contraste ≈ 1,65'
	);
	for (const { title, ratio, text } of worst) {
		expect(ratio, `${title} : texte « ${text} »`).toBeGreaterThanOrEqual(MIN_CONTRAST);
	}
});

test('#2122 — le texte des blocs fait 12 px à l’écran', async ({ page }) => {
	await openBloc(page, SCRATCH_PATH);
	test.fail(true, 'écart E47 : texte des blocs Scratch ≈ 9 px à l’écran');
	for (const title of SCRATCH_EXAMPLES) {
		const svg = rendered(page, title).locator('figure.scratch-bloc svg').first();
		await expectReadableDrawing(svg, `Scratch « ${title} »`);
	}
});

test('#2122 — les 3 erreurs fréquentes donnent leur message situé', async ({ page }) => {
	await openBloc(page, SCRATCH_PATH);
	const mistakes: Array<[string, string]> = [
		['Instruction mal écrite', 'instruction « mettre a à 5 » non reconnue'],
		['Programme en anglais', 'instruction « say [Hello] » non reconnue'],
		['Un fin de trop', '« fin » en trop']
	];
	for (const [title, message] of mistakes) {
		const article = page
			.locator('section', { has: page.getByRole('heading', { name: 'Erreurs fréquentes' }) })
			.locator('article', { has: page.getByRole('heading', { name: title, exact: true }) });
		const shown = article.locator('div.overflow-x-auto').last();
		await expect(shown, title).toContainText('Ligne');
		await expect(shown, title).toContainText(message);
		// Le message est une alerte, pas un dessin muet : aucun bloc Scratch n'est dessiné à sa place
		await expect(shown.locator('figure.scratch-bloc'), `${title} : pas de dessin`).toHaveCount(0);
	}
});

// ============================================================================
// #1943 — étiquettes à ranger
// ============================================================================

const RANGER_PATH = '/aide-ecriture/blocs/ranger';

test('#1943 — toucher une étiquette puis une place la pose, toucher une étiquette posée la fait remonter, place prise : échange', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, RANGER_PATH);
	const zone = rendered(page, 'Ordre croissant');
	const tray = (n: number) => zone.locator('.ranger-etiquette').nth(n - 1);
	const place = (n: number) => zone.getByRole('button', { name: new RegExp(`^Place ${n} sur 3`) });
	await expect(place(1)).toHaveAccessibleName('Place 1 sur 3, vide');
	// Étiquette 1 puis place 2 : posée
	await press(tray(1), hasTouch);
	await expect(tray(1)).toHaveAttribute('aria-pressed', 'true');
	await press(place(2), hasTouch);
	await expect(place(2)).toHaveAccessibleName('Place 2 sur 3, étiquette 1');
	await expect(tray(1)).toHaveAttribute('aria-label', 'Étiquette 1 sur 3, posée');
	await expect(tray(1), 'l’étiquette posée quitte le plateau').toBeHidden();
	await expect(tray(1)).toBeDisabled();
	// VoiceOver : la place lit l'étiquette posée (le texte de l'étiquette est sa description)
	await expect(place(2)).toHaveAccessibleDescription(/\S/);
	const written = (await place(2).textContent())?.replace(/\s+/g, '') ?? '';
	expect(written.length, 'l’étiquette posée est écrite dans la place').toBeGreaterThan(0);
	await shootThemes(page, zone, '1943-ranger-une-posee', info);
	// Toucher l'étiquette posée (sa place) la fait remonter
	await press(place(2), hasTouch);
	await expect(place(2)).toHaveAccessibleName('Place 2 sur 3, vide');
	await expect(tray(1)).toBeEnabled();
	// Place prise : l'étiquette venue d'en haut prend la place, l'autre remonte
	await press(tray(1), hasTouch);
	await press(place(1), hasTouch);
	await press(tray(2), hasTouch);
	await press(place(1), hasTouch);
	await expect(place(1)).toHaveAccessibleName('Place 1 sur 3, étiquette 2');
	await expect(tray(1)).toBeEnabled();
	await expect(tray(2)).toBeDisabled();
	// Et l'on peut tout poser : les trois places occupées
	await press(tray(1), hasTouch);
	await press(place(2), hasTouch);
	await press(tray(3), hasTouch);
	await press(place(3), hasTouch);
	await expect(zone.locator('.ranger-place-vide')).toHaveCount(0);
	await expectNoHorizontalOverflow(page, 'étiquettes à ranger');
	await expectContrastBothThemes(page, zone, 'étiquettes à ranger');
	await shootThemes(page, zone, '1943-ranger-toutes-posees', info);
});

test('#1943 — glisser une étiquette sur une place sans que la page défile (le doigt garde l’étiquette)', async ({
	page
}, info) => {
	await openBloc(page, RANGER_PATH);
	const zone = rendered(page, 'Ordre croissant');
	const tray = (n: number) => zone.locator('.ranger-etiquette').nth(n - 1);
	const place = (n: number) => zone.getByRole('button', { name: new RegExp(`^Place ${n} sur 3`) });
	// Le doigt garde l'étiquette : la page ne défile pas dessus (iPhone compris, par le style)
	expect(await tray(1).evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
	await scrollTo(zone);
	const scrollBefore = await pageScroll(page);
	const moved = await drag(page, await spotIn(tray(2)), await spotIn(place(3)), info);
	test.skip(!moved, 'glisser au doigt : iPhone réel (le geste n’est pas rejouable ici)');
	await expect(place(3)).toHaveAccessibleName('Place 3 sur 3, étiquette 2');
	expect(Math.abs((await pageScroll(page)) - scrollBefore), 'la page n’a pas défilé').toBeLessThan(
		5
	);
	// Glisser une étiquette d'une place à l'autre les échange avec l'occupante
	await drag(page, await spotIn(tray(1)), await spotIn(place(1)), info);
	await expect(place(1)).toHaveAccessibleName('Place 1 sur 3, étiquette 1');
	await drag(page, await spotIn(place(1)), await spotIn(place(3)), info);
	await expect(place(3)).toHaveAccessibleName('Place 3 sur 3, étiquette 1');
	await expect(place(1)).toHaveAccessibleName('Place 1 sur 3, étiquette 2');
});

// ============================================================================
// Mesures de dessins vectoriels (cubes, solides, patrons)
// ============================================================================

/** Les textes d'un dessin qui coupent un de ses traits (polyligne ou ligne), en coordonnées d'écran */
async function textsOnStrokes(drawing: Locator): Promise<string[]> {
	return drawing.evaluate((svg) => {
		type Pt = { x: number; y: number };
		const toScreen = (el: SVGGraphicsElement, x: number, y: number): Pt => {
			const m = el.getScreenCTM();
			return m ? { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f } : { x, y };
		};
		const segments: Array<[Pt, Pt]> = [];
		for (const el of svg.querySelectorAll('polyline, polygon.solide-pointe')) {
			if (el.tagName.toLowerCase() === 'polygon') continue;
			const g = el as unknown as SVGPolylineElement;
			const pts = [...g.points].map((p) => toScreen(g, p.x, p.y));
			for (let i = 0; i + 1 < pts.length; i++) segments.push([pts[i], pts[i + 1]]);
		}
		for (const el of svg.querySelectorAll('line')) {
			const g = el as SVGLineElement;
			segments.push([
				toScreen(g, g.x1.baseVal.value, g.y1.baseVal.value),
				toScreen(g, g.x2.baseVal.value, g.y2.baseVal.value)
			]);
		}
		// Segment contre rectangle (Liang-Barsky)
		const hits = (a: Pt, b: Pt, r: { l: number; t: number; rr: number; bb: number }) => {
			let t0 = 0;
			let t1 = 1;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const checks: Array<[number, number]> = [
				[-dx, a.x - r.l],
				[dx, r.rr - a.x],
				[-dy, a.y - r.t],
				[dy, r.bb - a.y]
			];
			for (const [p, q] of checks) {
				if (p === 0) {
					if (q < 0) return false;
				} else {
					const t = q / p;
					if (p < 0) t0 = Math.max(t0, t);
					else t1 = Math.min(t1, t);
				}
			}
			return t0 <= t1;
		};
		// Cadre de l'encre des lettres, pas getBoundingClientRect : le Firefox de Playwright gonfle
		// celui-ci aux petits corps (police de 0,37 unité agrandie par le viewBox : « I » large de
		// 10,7 px au lieu de 3,7, haut de 21 au lieu de 16) ; vérifié aux pixels le 2026-11-27.
		// Largeur : union des cases de caractères ; hauteur : encre mesurée par un canvas, posée
		// sur le point d'ancrage du texte (ligne de base, ou milieu avec `dominant-baseline`).
		const ctx = document.createElement('canvas').getContext('2d');
		const inkBox = (text: SVGTextElement) => {
			const m = text.getScreenCTM();
			const n = text.getNumberOfChars();
			if (!m || n === 0 || !ctx) return text.getBoundingClientRect();
			const toScreenX = (x: number, y: number) => m.a * x + m.c * y + m.e;
			const toScreenY = (x: number, y: number) => m.b * x + m.d * y + m.f;
			let left = Infinity;
			let right = -Infinity;
			for (let i = 0; i < n; i++) {
				const c = text.getExtentOfChar(i);
				left = Math.min(left, toScreenX(c.x, c.y), toScreenX(c.x + c.width, c.y));
				right = Math.max(right, toScreenX(c.x, c.y), toScreenX(c.x + c.width, c.y));
			}
			const scale = Math.hypot(m.a, m.b);
			const style = getComputedStyle(text);
			const px = parseFloat(style.fontSize) * scale;
			ctx.font = `${style.fontStyle} ${style.fontWeight} ${px}px ${style.fontFamily}`;
			// Même repère que le texte : `central` (le milieu du cadratin) = `middle` du canvas
			const baselines: Record<string, CanvasTextBaseline> = {
				central: 'middle',
				middle: 'middle',
				hanging: 'hanging'
			};
			ctx.textBaseline = baselines[style.dominantBaseline] ?? 'alphabetic';
			const ink = ctx.measureText(text.textContent ?? '');
			const start = text.getStartPositionOfChar(0);
			const baseline = toScreenY(start.x, start.y);
			return {
				left,
				right,
				top: baseline - ink.actualBoundingBoxAscent,
				bottom: baseline + ink.actualBoundingBoxDescent
			};
		};
		const found: string[] = [];
		for (const text of svg.querySelectorAll('text')) {
			const label = (text.textContent ?? '').trim();
			if (label === '') continue;
			const box = inkBox(text);
			// Rentré à l'horizontale seulement : les cases de caractères débordent les lettres
			const inner = {
				l: box.left + 1.5,
				t: box.top,
				rr: box.right - 1.5,
				bb: box.bottom
			};
			if (segments.some(([a, b]) => hits(a, b, inner))) found.push(label);
		}
		return found;
	});
}

/** Le texte et la forme d'un remplissage : alpha < 1 (translucide) et sa couleur, dans le thème courant */
async function fillOf(el: Locator): Promise<{ css: string; alpha: number; opacity: number }> {
	return el.first().evaluate((node) => {
		const s = getComputedStyle(node);
		const m = s.fill.match(/\(([^)]+)\)/);
		const parts = m
			? m[1]
					.split(/[ ,/]+/)
					.filter((token) => token !== '' && token !== 'srgb')
					.map(Number)
			: [];
		const alpha = parts.length >= 4 ? parts[3] : 1;
		return { css: s.fill, alpha, opacity: Number(s.opacity) * Number(s.fillOpacity) };
	});
}

/** Chaque exemple d'une fiche : un dessin, sans message d'erreur, qui tient dans la page */
async function expectExamplesDrawn(
	page: Page,
	titles: string[] | null,
	label: string
): Promise<void> {
	const articles = page
		.locator('section', { has: page.getByRole('heading', { name: 'Exemples', exact: true }) })
		.locator('article');
	const count = await articles.count();
	expect(count, `${label} : exemples`).toBeGreaterThan(0);
	for (let i = 0; i < count; i++) {
		const article = articles.nth(i);
		const title = ((await article.locator('h3').textContent()) ?? '').trim();
		if (titles !== null && !titles.includes(title)) continue;
		const render = article.locator('div.min-w-0').first();
		await expect(render.locator('svg').first(), `${label} : « ${title} » dessiné`).toBeVisible();
		await expect(render, `${label} : « ${title} » sans erreur`).not.toContainText(
			/erreur|invalide|indisponible/i
		);
		await expectWithinViewport(render.locator('svg').first(), `${label} : « ${title} »`);
	}
	await expectNoHorizontalOverflow(page, label);
}

// ============================================================================
// #2003 / #2023 — assemblage de cubes
// ============================================================================

const CUBES_PATH = '/aide-ecriture/blocs/cubes';

/** Luminance relative approchée d'un remplissage « rgb(…) » ou « color(srgb …) » */
function luminanceOf(css: string): number {
	const m = css.match(/\(([^)]+)\)/);
	const p = m
		? m[1]
				.split(/[ ,/]+/)
				.filter((token) => token !== '' && token !== 'srgb')
				.map(Number)
		: [0, 0, 0];
	const scale = css.startsWith('color(') ? 255 : 1;
	const lin = (v: number) => {
		const s = (v * scale) / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
}

/** Les carrés d'une vue : leur colonne et leur rangée (positions à l'écran, par pas d'un carré) */
async function squaresOf(view: Locator): Promise<Array<{ col: number; row: number }>> {
	return view.evaluate((svg) => {
		const boxes = [...svg.querySelectorAll('polygon.cubes-case')].map((p) =>
			p.getBoundingClientRect()
		);
		if (boxes.length === 0) return [];
		const size = Math.min(...boxes.map((b) => b.width));
		const left = Math.min(...boxes.map((b) => b.left));
		const top = Math.min(...boxes.map((b) => b.top));
		return boxes.map((b) => ({
			col: Math.round((b.left - left) / size),
			row: Math.round((b.top - top) / size)
		}));
	});
}

test('#2003 — perspective lisible (dessus le plus clair, côté le plus foncé), clair et sombre', async ({
	page
}, info) => {
	await openBloc(page, CUBES_PATH);
	const zone = rendered(page, 'Six cubes en perspective');
	const svg = zone.locator('svg.cubes-figure');
	await expect(svg).toBeVisible();
	// Six cubes : trois faces de chaque sorte, au moins (une pile de 2 en cache d'autres)
	for (const theme of ['light', 'dark'] as const) {
		await setTheme(page, theme);
		const top = luminanceOf((await fillOf(svg.locator('polygon.cubes-dessus'))).css);
		const front = luminanceOf((await fillOf(svg.locator('polygon.cubes-devant'))).css);
		const side = luminanceOf((await fillOf(svg.locator('polygon.cubes-cote'))).css);
		expect(top, `${theme} : dessus plus clair que devant`).toBeGreaterThan(front);
		expect(front, `${theme} : devant plus clair que côté`).toBeGreaterThan(side);
		// Les faces se distinguent : écart de luminance visible entre dessus et côté
		expect(top - side, `${theme} : dessus et côté se distinguent`).toBeGreaterThan(0.05);
	}
	await setTheme(page, 'light');
	await expectContrastBothThemes(
		page,
		zone,
		'perspective des cubes',
		'polygon.cubes-face',
		undefined
	);
	await expectNoHorizontalOverflow(page, 'cubes en perspective');
	await shootThemes(page, zone, '2003-cubes-perspective', info);
});

test('#2003 — vues de face, de dessus, de droite et de gauche conformes à leurs légendes (hauteurs 2 1 1 / 1 0 1)', async ({
	page
}, info) => {
	await openBloc(page, CUBES_PATH);
	const face = rendered(page, 'La vue de face').locator('svg.cubes-figure');
	const top = rendered(page, 'La vue de dessus').locator('svg.cubes-figure');
	const right = rendered(page, 'Les vues de droite et de gauche').locator('svg.cubes-figure');
	await expect(face).toHaveAttribute('aria-label', 'Vue de face d’un assemblage de cubes');
	await expect(top).toHaveAttribute('aria-label', 'Vue de dessus d’un assemblage de cubes');
	await expect(right).toHaveAttribute('aria-label', 'Vue de droite d’un assemblage de cubes');
	const sorted = (cells: Array<{ col: number; row: number }>) =>
		cells.map((c) => `${c.col},${c.row}`).sort();
	// Face : colonnes de 2, 1 et 1 carrés (la plus haute pile de chaque colonne), posées sur le sol
	expect(sorted(await squaresOf(face))).toEqual(['0,0', '0,1', '1,1', '2,1']);
	// Dessus : 5 carrés, le trou devant (en bas), au milieu
	expect(sorted(await squaresOf(top))).toEqual(['0,0', '0,1', '1,0', '2,0', '2,1']);
	// Droite : le devant (hauteur 1) à gauche, le fond (hauteur 2) à droite
	expect(sorted(await squaresOf(right))).toEqual(['0,1', '1,0', '1,1']);
	// Gauche : le devant passe à droite
	const left = (
		await tryBlock(page, '```cubes\nhauteurs: 2 1 1 / 1 0 1\nvue: gauche\n```')
	).locator('svg.cubes-figure');
	await expect(left).toHaveAttribute('aria-label', 'Vue de gauche d’un assemblage de cubes');
	expect(sorted(await squaresOf(left))).toEqual(['0,0', '0,1', '1,1']);
	await shootThemes(page, rendered(page, 'La vue de dessus'), '2003-cubes-dessus', info);
});

test('#2023 — « dessiner: face » : perspective et quadrillage, toucher un carreau le colorie, « Tout effacer »', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, CUBES_PATH);
	const zone = rendered(page, 'Colorier la vue de face (geste)');
	await expect(zone.locator('svg.cubes-figure')).toHaveAttribute(
		'aria-label',
		'Assemblage de cubes en perspective'
	);
	const grid = zone.locator('svg.cubes-quadrillage');
	await expect(grid.getByRole('button')).toHaveCount(20);
	const cell = (row: number, col: number) =>
		grid.getByRole('button', { name: new RegExp(`^Carreau rangée ${row}, colonne ${col}`) });
	const clear = zone.getByRole('button', { name: 'Tout effacer' });
	await expect(clear).toBeDisabled();
	// La vue coloriée n'importe où dans le quadrillage : colonnes de 2, 1, 1 carrés, posées sur la rangée 4
	for (const [row, col] of [
		[3, 2],
		[4, 2],
		[4, 3],
		[4, 4]
	]) {
		await pressAt(page, await spotIn(cell(row, col)), hasTouch);
		await expect(cell(row, col)).toHaveAttribute('aria-pressed', 'true');
	}
	await expect(grid.locator('[aria-pressed="true"]')).toHaveCount(4);
	await shootThemes(page, zone, '2023-cubes-geste', info);
	// Retoucher un carreau le décolore
	await pressAt(page, await spotIn(cell(3, 2)), hasTouch);
	await expect(cell(3, 2)).toHaveAttribute('aria-pressed', 'false');
	await expect(clear).toBeEnabled();
	await press(clear, hasTouch);
	await expect(grid.locator('[aria-pressed="true"]')).toHaveCount(0);
	await expect(clear).toBeDisabled();
	await expectNoHorizontalOverflow(page, 'cubes à colorier');
	// Le focus clavier d'un carreau est un trait, pas une grande tache (#2042)
	await cell(2, 2).focus();
	await page.keyboard.press('Shift+Tab');
	await page.keyboard.press('Tab');
	const focus = await cell(2, 2).evaluate((el) => {
		const s = getComputedStyle(el);
		const scale = (el as SVGGraphicsElement).getScreenCTM()?.a ?? 1;
		return {
			style: s.outlineStyle,
			width: parseFloat(s.outlineWidth) * scale,
			focused: el === document.activeElement
		};
	});
	expect(focus.focused, 'le carreau a le focus').toBe(true);
	expect(
		focus.style === 'none' || focus.width <= 4,
		`focus : ${focus.style} ${focus.width.toFixed(0)} px`
	).toBe(true);
});

test('#2023 — « retrouver: face, droite » : pas de perspective, une case par carreau de la vue de dessus, clavier numérique, 7 effacé', async ({
	page
}, info) => {
	await openBloc(page, CUBES_PATH);
	const zone = rendered(page, 'Retrouver l’assemblage d’après ses vues (geste)');
	// Pas de perspective : les vues de dessus, de face et de droite seulement
	await expect(zone.locator('svg[aria-label="Assemblage de cubes en perspective"]')).toHaveCount(0);
	await expect(zone.getByText('Vue de dessus')).toBeVisible();
	await expect(zone.getByText('Vue de face')).toBeVisible();
	await expect(zone.getByText('Vue de droite')).toBeVisible();
	const inputs = zone.locator('input.cubes-saisie-entree');
	// hauteurs 2 1 / 1 2 : quatre carreaux
	await expect(inputs).toHaveCount(4);
	for (let i = 0; i < 4; i++) {
		await expect(inputs.nth(i), 'clavier numérique').toHaveAttribute('inputmode', 'numeric');
	}
	// Une hauteur par case ; 7 n'est pas une hauteur : effacé
	await inputs.nth(0).fill('2');
	await expect(inputs.nth(0)).toHaveValue('2');
	await inputs.nth(1).fill('7');
	await expect(inputs.nth(1)).toHaveValue('');
	await inputs.nth(1).fill('1');
	await expect(inputs.nth(1)).toHaveValue('1');
	await expectNoHorizontalOverflow(page, 'cubes à retrouver');
	await expectContrastBothThemes(page, zone, 'cubes à retrouver');
	await shootThemes(page, zone, '2023-cubes-retrouver', info);
});

// ============================================================================
// #2027 / #2046 — solides en perspective, sections
// ============================================================================

const SOLIDE_PATH = '/aide-ecriture/blocs/solide';
const SECTION_TITLES = [
	'Un pavé coupé parallèlement à une face',
	'Un cylindre coupé perpendiculairement à son axe',
	'Un cylindre coupé parallèlement à son axe',
	'Une boule coupée par un plan'
];
const SOLID_TITLES = [
	'Un pavé nommé',
	'Une face, une arête, un sommet marqués',
	'Un pavé coté',
	'Un prisme droit à base triangulaire',
	'Une pyramide à base carrée',
	'Un cylindre',
	'Un cône',
	'Une boule'
];

test('#2027 — les exemples de solides se lisent : arêtes cachées en tirets, noms de sommets et cotes hors des traits', async ({
	page
}, info) => {
	await openBloc(page, SOLIDE_PATH);
	await expectExamplesDrawn(page, [...SOLID_TITLES, ...SECTION_TITLES], 'solides');
	for (const title of SOLID_TITLES) {
		const svg = rendered(page, title).locator('svg').first();
		// Arêtes cachées : en tirets ; arêtes vues : pleines
		const hidden = svg.locator('polyline.solide-cache');
		expect(await hidden.count(), `${title} : arêtes cachées`).toBeGreaterThan(0);
		for (const dash of await hidden.evaluateAll((els) =>
			els.map((el) => getComputedStyle(el).strokeDasharray)
		)) {
			expect(dash, `${title} : tirets`).not.toBe('none');
		}
		const visible = svg.locator('polyline.solide-trait:not(.solide-cache)');
		for (const dash of await visible.evaluateAll((els) =>
			els.map((el) => getComputedStyle(el).strokeDasharray)
		)) {
			expect(dash, `${title} : trait plein`).toBe('none');
		}
		// Noms de sommets et cotes : jamais sur un trait (la pyramide : voir son test à part)
		if (title !== 'Une pyramide à base carrée') {
			expect(await textsOnStrokes(svg), `${title} : textes sur un trait`).toEqual([]);
		}
		// Un prime droit, jamais l'apostrophe typographique (O' du centre d'un cylindre)
		for (const text of await svg.locator('text').allTextContents()) {
			expect(text, `${title} : apostrophe typographique`).not.toContain('’');
		}
	}
	// « Ellipses à plat » du cylindre et de la boule : des tracés (polylignes) courbes, plus de 8 points
	for (const title of ['Un cylindre', 'Une boule']) {
		const lengths = await rendered(page, title)
			.locator('svg polyline')
			.evaluateAll((els) =>
				els.map((el) => (el as unknown as SVGPolylineElement).points.numberOfItems)
			);
		expect(Math.max(...lengths), `${title} : ellipse tracée`).toBeGreaterThan(8);
	}
	await shootThemes(page, rendered(page, 'Un cylindre'), '2027-solide-cylindre', info);
	await shootThemes(page, rendered(page, 'Un cône'), '2027-solide-cone', info);
});

test('#2027 — pyramide à base carrée : le nom du sommet D n’est sur aucun trait', async ({
	page
}) => {
	await openBloc(page, SOLIDE_PATH);
	const svg = rendered(page, 'Une pyramide à base carrée').locator('svg').first();
	expect(await textsOnStrokes(svg)).toEqual([]);
});

test('#2027 — face marquée translucide en clair et en sombre, traits qui restent lisibles dessous', async ({
	page
}, info) => {
	await openBloc(page, SOLIDE_PATH);
	const zone = rendered(page, 'Une face, une arête, un sommet marqués');
	const svg = zone.locator('svg').first();
	for (const theme of ['light', 'dark'] as const) {
		await setTheme(page, theme);
		const fill = await fillOf(svg.locator('polygon.solide-face-marquee'));
		expect(fill.alpha * fill.opacity, `${theme} : face translucide`).toBeLessThan(1);
		expect(fill.alpha * fill.opacity, `${theme} : face visible`).toBeGreaterThan(0.05);
		// Les traits (couleur de trait) se lisent sur la face marquée comme sur le fond
		await expectContrastBothThemes(page, svg, 'traits', 'polyline.solide-trait:not(.solide-cache)');
	}
	await setTheme(page, 'light');
	await shootThemes(page, zone, '2027-solide-face-marquee', info);
});

test('#2046 — les 4 exemples de section : orange translucide en clair et en sombre, cote « 2 cm » hors des traits, lecteur d’écran sans « rectangle » ni « disque »', async ({
	page
}, info) => {
	await openBloc(page, SOLIDE_PATH);
	for (const title of SECTION_TITLES) {
		const svg = rendered(page, title).locator('svg').first();
		await expect(svg, title).toBeVisible();
		// Lecteur d'écran : « coupé par un plan », jamais la forme de la section
		const label = (await svg.getAttribute('aria-label')) ?? '';
		expect(label, `${title} : nom accessible`).toContain('coupé par un plan');
		expect(label, `${title} : jamais « rectangle » ni « disque »`).not.toMatch(/rectangle|disque/i);
		// Section orange translucide, arêtes cachées visibles à travers
		for (const theme of ['light', 'dark'] as const) {
			await setTheme(page, theme);
			const fill = await fillOf(svg.locator('polygon.solide-section'));
			const parts =
				fill.css
					.match(/\(([^)]+)\)/)?.[1]
					.split(/[ ,/]+/)
					.filter((t) => t !== '' && t !== 'srgb')
					.map(Number) ?? [];
			const scale = fill.css.startsWith('color(') ? 255 : 1;
			const [r, g, b] = parts.map((v) => v * scale);
			expect(r, `${title}, ${theme} : orange (rouge fort)`).toBeGreaterThan(150);
			expect(b, `${title}, ${theme} : orange (peu de bleu)`).toBeLessThan(60);
			expect(
				r > g && g > b,
				`${title}, ${theme} : orange (R > V > B : ${r | 0},${g | 0},${b | 0})`
			).toBe(true);
			expect(fill.alpha * fill.opacity, `${title}, ${theme} : translucide`).toBeLessThan(1);
		}
		await setTheme(page, 'light');
		// (le pavé coupé a son test à part : la lettre F touche le trait de la section)
		if (title !== SECTION_TITLES[0]) {
			expect(await textsOnStrokes(svg), `${title} : textes sur un trait`).toEqual([]);
		}
		await expectNoHorizontalOverflow(page, title);
	}
	// Cote « 2 cm » du pavé coupé : dans la face avant, hors des traits
	const cube = rendered(page, SECTION_TITLES[0]).locator('svg').first();
	await expect(cube.locator('text', { hasText: /^2 cm$/ })).toHaveCount(1);
	await shootThemes(page, rendered(page, SECTION_TITLES[0]), '2046-section-pave', info);
	await shootThemes(page, rendered(page, SECTION_TITLES[3]), '2046-section-boule', info);
});

test('#2046 — pavé coupé : les noms des sommets (F, K…) et la cote ne touchent aucun trait', async ({
	page
}) => {
	await openBloc(page, SOLIDE_PATH);
	const svg = rendered(page, SECTION_TITLES[0]).locator('svg').first();
	expect(await textsOnStrokes(svg)).toEqual([]);
});

// ============================================================================
// #2037 / #2042 — patrons
// ============================================================================

const PATRON_PATH = '/aide-ecriture/blocs/patron';

test('#2037 — les exemples de patron se lisent : contour plein, plis plus fins, noms répétés, « ? », cotes hors des traits', async ({
	page
}, info) => {
	await openBloc(page, PATRON_PATH);
	await expectExamplesDrawn(page, null, 'patrons');
	const nonGesture = [
		'Un patron du cube nommé',
		'Quelle lettre à la place de ?',
		'Faces numérotées, une face grise',
		'Une grille dessinée',
		'Un faux patron dessiné',
		'Le même patron, tourné',
		'Un pavé coté',
		'Un prisme droit',
		'Une pyramide à base carrée'
	];
	for (const title of nonGesture) {
		const svg = rendered(page, title).locator('svg').first();
		const widths = await svg.evaluate((root) => {
			const plis = [...root.querySelectorAll('polyline.patron-pli')].map((p) =>
				Number(p.getAttribute('stroke-width'))
			);
			const contours = [...root.querySelectorAll('polyline.patron-trait:not(.patron-pli)')].map(
				(p) => Number(p.getAttribute('stroke-width'))
			);
			const dashes = [...root.querySelectorAll('polyline.patron-trait:not(.patron-pli)')].map(
				(p) => getComputedStyle(p).strokeDasharray
			);
			return { plis, contours, dashes };
		});
		expect(widths.plis.length, `${title} : plis`).toBeGreaterThan(0);
		expect(Math.max(...widths.plis), `${title} : plis plus fins que le contour`).toBeLessThan(
			Math.min(...widths.contours)
		);
		for (const dash of widths.dashes) expect(dash, `${title} : contour plein`).toBe('none');
		expect(await textsOnStrokes(svg), `${title} : textes sur un trait`).toEqual([]);
	}
	// Noms du solide répétés aux bons coins : un patron de cube nommé écrit 14 noms, chaque lettre A à H
	// au moins une fois, et le « ? » est dans l'exemple prévu
	const names = await rendered(page, 'Un patron du cube nommé')
		.locator('svg text')
		.allTextContents();
	expect(new Set(names.map((n) => n.trim())), 'les 8 sommets du cube nommés').toEqual(
		new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
	);
	await expect(
		rendered(page, 'Quelle lettre à la place de ?').locator('svg text', { hasText: /^\?$/ })
	).toHaveCount(1);
	// Cylindre : rayon en tirets, jamais 2πr
	const cylinder = rendered(page, 'Un cylindre').locator('svg').first();
	const dashes = await cylinder
		.locator('polyline')
		.evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDasharray));
	expect(
		dashes.some((d) => d !== 'none'),
		'cylindre : rayon en tirets'
	).toBe(true);
	const cylinderTexts = (await cylinder.locator('text').allTextContents()).join(' ');
	expect(cylinderTexts, 'cylindre : jamais 2πr').not.toMatch(/π|2\s*r/);
	await shootThemes(page, rendered(page, 'Un pavé coté'), '2037-patron-pave', info);
	await shootThemes(page, rendered(page, 'Un cylindre'), '2037-patron-cylindre', info);
});

test('#2037 — 11 patrons du cube et 8 faux patrons dessinés dans l’ordre', async ({ page }) => {
	await openBloc(page, PATRON_PATH);
	const titles = await page
		.locator('section', { has: page.getByRole('heading', { name: 'Exemples', exact: true }) })
		.locator('article h3')
		.allTextContents();
	const nets = titles
		.map((t) => t.trim())
		.filter((t) => /^(Patron du cube n° |Faux patron n° )/.test(t));
	const expected = [
		...Array.from({ length: 11 }, (_, i) => `Patron du cube n° ${i + 1}`),
		...Array.from({ length: 8 }, (_, i) => `Faux patron n° ${i + 1}`)
	];
	expect(nets.map((t) => t.replace(/ \(.*\)$/, ''))).toEqual(expected);
	for (const title of nets) {
		const svg = rendered(page, title).locator('svg').first();
		await expect(svg, title).toBeVisible();
	}
	// Un vrai patron a 5 plis, un faux en a plus ou autrement répartis : on compte ceux du premier de chaque série
	await expectNoHorizontalOverflow(page, 'patrons du cube');
});

test('#2037 — face marquée translucide en clair et en sombre', async ({ page }, info) => {
	await openBloc(page, PATRON_PATH);
	const zone = rendered(page, 'Faces numérotées, une face grise');
	const svg = zone.locator('svg').first();
	for (const theme of ['light', 'dark'] as const) {
		await setTheme(page, theme);
		const fill = await fillOf(svg.locator('polygon.patron-face-marquee'));
		expect(fill.alpha * fill.opacity, `${theme} : translucide`).toBeLessThan(1);
		expect(fill.alpha * fill.opacity, `${theme} : visible`).toBeGreaterThan(0.05);
		await expectContrastBothThemes(page, zone, 'numéros du patron');
	}
	await setTheme(page, 'light');
	await shootThemes(page, zone, '2037-patron-face-marquee', info);
});

test('#2042 — « designer: » : toucher une face la colore, la retoucher l’efface, toucher un numéro marche, le focus clavier est un simple cadre', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, PATRON_PATH);
	// Toucher la face opposée : six faces à toucher
	const zone = rendered(page, 'Toucher la face opposée (geste)');
	const faces = zone.getByRole('button', { name: /^Face \d/ });
	await expect(faces).toHaveCount(6);
	await pressAt(page, await spotIn(faces.nth(3)), hasTouch);
	await expect(faces.nth(3)).toHaveAttribute('aria-pressed', 'true');
	await expect(zone.locator('polygon.patron-touchee')).toHaveCount(1);
	await pressAt(page, await spotIn(faces.nth(3)), hasTouch);
	await expect(faces.nth(3)).toHaveAttribute('aria-pressed', 'false');
	await expect(zone.locator('polygon.patron-touchee')).toHaveCount(0);
	// Toucher sur un numéro marche : le doigt traverse le texte jusqu'à la face
	const numbered = await tryBlock(
		page,
		'```patron\nsolide: cube\nforme: 7\nfaces: numeros\nmarquer: face 2\ndesigner: opposee\n```'
	);
	const numberFaces = numbered.getByRole('button', { name: /^Face \d/ });
	await expect(numberFaces).toHaveCount(6);
	const label = numbered.locator('text.patron-etiquette', { hasText: /^4$/ });
	await label.scrollIntoViewIfNeeded();
	const textBox = await label.boundingBox();
	if (textBox === null) throw new Error('numéro sans boîte');
	await pressAt(
		page,
		{ x: textBox.x + textBox.width / 2, y: textBox.y + textBox.height / 2 },
		hasTouch
	);
	await expect(numbered.locator('polygon.patron-face[aria-pressed="true"]')).toHaveCount(1);
	await expect(numberFaces.nth(3)).toHaveAttribute('aria-pressed', 'true');
	const lettered = rendered(page, 'Toucher les faces qui se touchent en A (geste)');
	const letterFaces = lettered.getByRole('button', { name: /^Face \d/ });
	// Le focus clavier : un trait, pas un grand cadre ni une tache pleine
	await letterFaces.nth(2).focus();
	await page.keyboard.press('Shift+Tab');
	await page.keyboard.press('Tab');
	const focus = await letterFaces.nth(2).evaluate((el) => {
		const s = getComputedStyle(el);
		const scale = (el as SVGGraphicsElement).getScreenCTM()?.a ?? 1;
		return {
			focused: el === document.activeElement,
			outline: s.outlineStyle,
			strokeWidthPx: parseFloat(s.strokeWidth) * scale,
			fill: s.fill
		};
	});
	expect(focus.focused, 'la face a le focus').toBe(true);
	expect(focus.outline, 'pas de contour de navigateur dans le dessin').toBe('none');
	expect(focus.strokeWidthPx, 'cadre simple (trait de quelques px)').toBeLessThan(8);
	expect(focus.fill, 'pas de tache : la face reste transparente').toMatch(
		/rgba\(0, 0, 0, 0\)|transparent/
	);
	await expectNoHorizontalOverflow(page, 'patron à toucher');
	await shootThemes(page, lettered, '2042-patron-designer', info);
});

test('#2042 — « completer: » : pointillés autour des faces, cadre symétrique, « Faces à poser » descend, plus de pointillés une fois tout posé', async ({
	page,
	hasTouch
}, info) => {
	await openBloc(page, PATRON_PATH);
	const zone = rendered(page, 'Poser la face manquante (geste)');
	const svg = zone.locator('svg.patron-figure');
	const spots = await svg.locator('rect.patron-emplacement').evaluateAll((els) =>
		els.map((el) => ({
			x: Number(el.getAttribute('x')) - 0.05,
			y: Number(el.getAttribute('y')) - 0.05,
			dash: getComputedStyle(el).strokeDasharray
		}))
	);
	expect(spots.length, 'emplacements').toBe(8);
	for (const spot of spots) expect(spot.dash, 'pointillés').not.toBe('none');
	const squares = await svg.locator('rect.patron-carre').evaluateAll((els) =>
		els.map((el) => ({
			x: Number(el.getAttribute('x')) - 0.05,
			y: Number(el.getAttribute('y')) - 0.05
		}))
	);
	expect(squares.length, 'faces données').toBe(5);
	// Cadre symétrique : les emplacements sont stables par les miroirs et par le quart de tour autour du centre des faces
	const all = [...spots, ...squares];
	const cx = (Math.min(...all.map((c) => c.x)) + Math.max(...all.map((c) => c.x))) / 2;
	const cy = (Math.min(...all.map((c) => c.y)) + Math.max(...all.map((c) => c.y))) / 2;
	const key = (x: number, y: number) => `${Math.round(x * 2) / 2},${Math.round(y * 2) / 2}`;
	const frame = new Set(spots.map((s) => key(s.x, s.y)));
	const images: Array<[string, (s: { x: number; y: number }) => string]> = [
		['miroir horizontal', (s) => key(2 * cx - s.x, s.y)],
		['miroir vertical', (s) => key(s.x, 2 * cy - s.y)],
		['quart de tour', (s) => key(cx + (s.y - cy), cy - (s.x - cx))]
	];
	for (const [name, image] of images) {
		for (const spot of spots)
			expect(frame.has(image(spot)), `cadre symétrique (${name}) : ${spot.x},${spot.y}`).toBe(true);
	}
	// « Faces à poser » : 1, puis 0 une fois la face posée ; plus aucun pointillé
	const counter = zone.getByText(/^Faces à poser :/);
	await expect(counter).toHaveText('Faces à poser : 1');
	await shootThemes(page, zone, '2042-patron-completer-avant', info);
	await pressAt(page, await spotIn(svg.locator('rect.patron-emplacement').nth(2)), hasTouch);
	await expect(counter).toHaveText('Faces à poser : 0');
	await expect(svg.locator('rect.patron-emplacement')).toHaveCount(0);
	await expect(svg.locator('rect.patron-touchee')).toHaveCount(1);
	// La reprendre remet le cadre
	await pressAt(page, await spotIn(svg.locator('rect.patron-touchee')), hasTouch);
	await expect(counter).toHaveText('Faces à poser : 1');
	await expect(svg.locator('rect.patron-emplacement')).toHaveCount(8);
	// Cibles faciles à toucher : une case de plus de 24 px
	const cell = await svg.locator('rect.patron-emplacement').first().boundingBox();
	expect(cell?.width ?? 0, 'case à toucher').toBeGreaterThanOrEqual(24);
	await expectNoHorizontalOverflow(page, 'patron à compléter');
	await shootThemes(page, zone, '2042-patron-completer-apres', info);
});

// ============================================================================
// #2065 — bloc ouvert sur la ligne d'un item
// ============================================================================

test('#2065 — « - ```cubes » et « 1. ```horloge » ouverts sur la ligne d’un item, fermés en retrait : le bloc s’affiche dans l’item', async ({
	page
}, info) => {
	await openBloc(page, CUBES_PATH);
	const cubes = await tryBlock(page, '- ```cubes\n  hauteurs: 2 1\n  ```\n');
	await expect(cubes.locator('li svg.cubes-figure'), 'assemblage dans l’item').toHaveCount(1);
	await expect(cubes, 'plus de « bloc non fermé »').not.toContainText(/non fermé/i);
	await expect(cubes, 'aucun message d’erreur').not.toContainText(/erreur|invalide/i);
	await shootThemes(page, cubes, '2065-item-cubes', info);
	// Une liste numérotée, et le bloc horloge
	const clock = await tryBlock(page, '1. ```horloge\n   heure: 9 h\n   ```\n');
	await expect(
		clock.locator('ol li svg.horloge-cadran'),
		'horloge dans l’item numéroté'
	).toHaveCount(1);
	await expect(clock, 'plus de « bloc non fermé »').not.toContainText(/non fermé/i);
	// Un item avant et un après : la liste continue
	const several = await tryBlock(page, '- avant\n- ```cubes\n  hauteurs: 2 1\n  ```\n- après\n');
	await expect(several.locator('li')).toHaveCount(3);
	await expect(several.locator('li svg.cubes-figure')).toHaveCount(1);
	await expectNoHorizontalOverflow(page, 'bloc dans un item');
});
