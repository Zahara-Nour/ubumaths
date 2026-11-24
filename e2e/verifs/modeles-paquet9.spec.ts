import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildSeriesLink } from '../../src/lib/validation/series';
import { assertLocalServerEnv, sql } from './helpers/carnet';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';

/**
 * Modèles de questions, paquet 9 (tri des vérifications manuelles) — base LOCALE
 * ==============================================================================
 *
 * Reprend les lignes #2944 / #2945 / #2946 (2de « nombres et calculs » : bloc ranger, préfixes,
 * décimaux à virgule, droites graduées, réunion d'intervalles) et #2869 (CM1, « Les faces d'une
 * pyramide », variation 3, correction au téléphone) de `docs/wip/verifications-manuelles.md`.
 *
 * Les modèles de la base locale portent les identifiants de la prod : on joue le VRAI modèle
 * publié par le lien de série public (`/automaths/test?…&mode=typing&graine=…`), variation et
 * graine fixées, jamais une copie. Une première lecture SQL vérifie que chaque modèle cité existe
 * en local ET est publié : un modèle absent fait échouer le test (la ligne reste alors pour la prod).
 * Rien n'est écrit en base. Captures à l'œil : `.captures/verifs/modeles-paquet9/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(300_000));

// Constantes

const SHOTS = '.captures/verifs/modeles-paquet9';
const COMPARER_RANGER = '51f08367-a8db-4714-a119-821107398cdb';
const CARRES_CUBES = 'c7840c10-3e06-4aa7-ab97-257f80cd16d2';
const PREFIXES = '204ac445-03a6-4c17-b4a3-67704cf664fd';
const ENCADRER = '9f01ca57-6330-40b6-a423-997ff357a6f3';
const ARRONDIR = 'e75cb1a3-56f6-4498-b6bf-06e852b3252d';
const LIRE_ABSCISSE = 'a692569a-ec38-413b-a774-4991d8c88b94';
const INEGALITES = 'b720edd7-fe00-4ff7-a26a-f23b4dbd72ec';
const VALEUR_ABSOLUE = '37b3a637-bd6e-46ae-bf85-a19175d41c9a';
const PLACER_REEL = '3b0a04c0-1af8-4040-9537-0aef99b31dd0';
const PYRAMIDE = 'b423785d-cfe4-4387-a617-d71ab18838a1';

/** Les modèles cités par les lignes du paquet : tous doivent exister en local, publiés */
const CITED: Record<string, string> = {
	'Comparer une fraction à 1… ranger': COMPARER_RANGER,
	'Ranger des carrés et des cubes': CARRES_CUBES,
	'Préfixes et puissances de 10': PREFIXES,
	'Encadrer entre deux puissances de 10': ENCADRER,
	'Arrondir un nombre décimal': ARRONDIR,
	"Lire l'abscisse d'un point": LIRE_ABSCISSE,
	'Inégalités et intervalles': INEGALITES,
	'Résoudre |x − a| > r': VALEUR_ABSOLUE,
	'Placer un réel sur une droite graduée': PLACER_REEL,
	"Les faces d'une pyramide": PYRAMIDE
};

/** Plus petite taille de texte lisible d'une étiquette de figure au téléphone, en px rendus */
const MIN_LABEL_PX = 11;
/**
 * Plancher de bon sens de l'écart entre deux graduations (px) : en dessous, elles se confondent.
 * Le seuil de confort du doigt n'est pas décidé ici : l'écart mesuré est rapporté, pas jugé.
 */
const MIN_TICK_GAP_PX = 8;

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
			{ timeout: 5000 }
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
	await card.locator('.flip-card-front').waitFor({ timeout: 100_000 });
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

/** Ce qui est tapé dans UNE case MathLive : le contenu de ses gabarits, sinon sa valeur entière */
async function typedIn(field: Locator): Promise<string> {
	const value = await field.evaluate((el) => (el as HTMLElement & { value: string }).value);
	const holes = [...value.matchAll(/\\placeholder\[\d+\]\{([^}]*)\}/g)].map((m) => m[1]);
	return (holes.length > 0 ? holes.join('') : value).trim();
}

/** Met le focus dans la case MathLive (geste réel : toucher ou clic), puis tape. */
async function typeInto(page: Page, field: Locator, text: string): Promise<void> {
	for (let attempt = 1; attempt <= 3; attempt++) {
		await closeKeyboard(page);
		const prompt = field.locator('.ML__prompt');
		if ((await prompt.count()) > 0) {
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

/** Les formules (LaTeX source) d'une zone, blocs inclus */
function formulas(zone: Locator): Promise<string[]> {
	return zone.locator('math-span, math-div').allTextContents();
}

/** Les valeurs (LaTeX) des cases MathLive d'une zone */
function fieldSources(zone: Locator): Promise<string[]> {
	return zone
		.locator('math-field')
		.evaluateAll((els) => els.map((el) => (el as HTMLElement & { value: string }).value));
}

/** Le texte VISIBLE des cases MathLive (leur ombre : ce que l'œil lit, pas le LaTeX) */
function fieldRendered(zone: Locator): Promise<string[]> {
	return zone
		.locator('math-field')
		.evaluateAll((els) => els.map((el) => (el.shadowRoot?.textContent ?? '').replace(/​/g, '')));
}

/**
 * Le texte VISIBLE de toutes les formules d'une zone (cases MathLive, formules statiques) : le
 * rendu de leur ombre, jamais le LaTeX source que leur DOM léger garde caché
 */
function renderedMath(zone: Locator): Promise<string[]> {
	return zone
		.locator('math-field, math-span, math-div')
		.evaluateAll((els) =>
			els.map((el) =>
				((el.shadowRoot?.querySelector('.ML__latex') ?? el.shadowRoot)?.textContent ?? '').replace(
					/\u200b/g,
					''
				)
			)
		);
}

/** Valide et rend le verdict lu sur la carte (« Juste », « Faux », « ½ point ») */
async function validate(page: Page, card: Locator): Promise<string> {
	await closeKeyboard(page);
	await card.getByRole('button', { name: 'Valider' }).click();
	const verdict = card.getByText(/^(Juste|Faux|½ point)$/).first();
	await expect(verdict).toBeVisible();
	return ((await verdict.textContent()) ?? '').trim();
}

// ============================================================================
// Les modèles cités existent en local et sont publiés
// ============================================================================

test('#2944 #2945 #2946 #2869 — chaque modèle cité par les lignes existe dans la base locale et est publié', async () => {
	const rows = await sql<{ id: string; status: string }>(
		`select id, status from question_templates where id = any($1::uuid[])`,
		[Object.values(CITED)]
	);
	for (const [title, id] of Object.entries(CITED)) {
		const row = rows.find((r) => r.id === id);
		expect(row, `« ${title} » (${id}) absent de la base locale`).toBeDefined();
		expect(row?.status, `« ${title} » publié`).toBe('published');
	}
});

// ============================================================================
// #2944 — le bloc ranger
// ============================================================================

/** Valeur d'une étiquette de rangement, lue sur son LaTeX source (`0{,}7^2`, `\dfrac{3}{7}`, `\sqrt{1{,}2}`) */
function valueOf(latex: string): number {
	const s = latex.replace(/\\,|\\ |\s/g, '').replace(/\{,\}/g, '.');
	let m = s.match(/^\\sqrt\{(.+)\}$/);
	if (m) return Math.sqrt(valueOf(m[1]));
	m = s.match(/^\\[dt]?frac\{(.+?)\}\{(.+?)\}$/);
	if (m) return valueOf(m[1]) / valueOf(m[2]);
	m = s.match(/^(.+)\^(\d)$/);
	if (m) return valueOf(m[1]) ** Number(m[2]);
	if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
	throw new Error(`étiquette illisible : « ${latex} »`);
}

/** Le LaTeX source de chaque étiquette du plateau, dans l'ordre où elles sont mélangées */
async function trayLabels(card: Locator): Promise<string[]> {
	return (await card.locator('.flip-card-front .ranger-etiquette').allTextContents()).map((t) =>
		t.trim()
	);
}

/** Le plateau de la carte : étiquette n° `i` (0 = première affichée) et place n° `k` */
const tray = (card: Locator, i: number): Locator =>
	card.locator('.flip-card-front .ranger-etiquette').nth(i);
const place = (card: Locator, k: number): Locator =>
	card.locator(`.flip-card-front [data-ranger-place="${k}"]`);

/** Pose, par le geste (toucher une étiquette puis sa place), l'étiquette `order[k]` à la place k */
async function arrange(card: Locator, order: number[]): Promise<void> {
	for (const [k, label] of order.entries()) {
		await press(tray(card, label));
		await press(place(card, k));
		await expect(place(card, k)).toHaveAccessibleName(
			new RegExp(`^Place ${k + 1} sur \\d+, étiquette`)
		);
	}
}

/** L'ordre croissant : pour chaque place, l'indice (au plateau) de l'étiquette qui lui revient */
function ascendingOrder(labels: string[]): number[] {
	return labels
		.map((label, index) => ({ index, value: valueOf(label) }))
		.sort((a, b) => a.value - b.value)
		.map((entry) => entry.index);
}

test.describe('#2944 — le bloc ranger se joue', () => {
	test('#2944 — « Comparer une fraction à 1, un entier et une fraction, ranger », variation 3 : l’ordre juste est accepté (Juste)', async ({
		page
	}) => {
		const card = await openSeries(page, COMPARER_RANGER, 3, 2);
		const labels = await trayLabels(card);
		expect(labels, 'quatre étiquettes : fraction, deux décimaux, fraction').toHaveLength(4);
		await arrange(card, ascendingOrder(labels));
		await shot(page, '2944-ranger-fraction-pose');
		expect(await validate(page, card)).toBe('Juste');
		await shot(page, '2944-ranger-fraction-juste');
	});

	test('#2944 — même modèle : le piège 0,68 / 0,7 (comparer 68 et 7 comme des entiers) est refusé (Faux), la correction écrit 0,7 = 0,70', async ({
		page
	}) => {
		const card = await openSeries(page, COMPARER_RANGER, 3, 2);
		const labels = await trayLabels(card);
		const order = ascendingOrder(labels);
		// Les deux décimaux, voisins dans l'ordre juste : l'un à deux chiffres (0,68), l'autre à un (0,7)
		const decimals = order.filter((i) => /^0\{,\}\d+$/.test(labels[i]));
		expect(decimals, 'deux décimaux à ranger').toHaveLength(2);
		const [petit, grand] = decimals;
		expect(labels[petit].length, 'le plus petit a deux décimales (0,68)').toBeGreaterThan(
			labels[grand].length
		);
		expect(Math.abs(order.indexOf(petit) - order.indexOf(grand)), 'ils se suivent').toBe(1);
		// L'erreur : 68 > 7 « donc » 0,68 > 0,7 → les deux décimaux échangés
		const trap = order.map((i) => (i === petit ? grand : i === grand ? petit : i));
		await arrange(card, trap);
		expect(await validate(page, card)).toBe('Faux');
		const back = card.locator('.flip-card-back');
		await expect(back.getByText(/on ne compare pas/).first()).toBeVisible();
		await shot(page, '2944-ranger-piege-faux');
	});

	test('#2944 — « Ranger des carrés et des cubes » : les trois variations (0,a ³ ² ·, avec racine, plus grand que 1) acceptent l’ordre juste ; un ordre à l’envers est refusé', async ({
		page
	}) => {
		for (const variation of [0, 1, 2]) {
			const card = await openSeries(page, CARRES_CUBES, 2 + variation, variation);
			const labels = await trayLabels(card);
			expect(labels.length, `variation ${variation + 1} : étiquettes`).toBe(
				variation === 0 ? 3 : 4
			);
			const order = ascendingOrder(labels);
			await arrange(card, order);
			expect(await validate(page, card), `variation ${variation + 1} : ordre juste`).toBe('Juste');
			await shot(page, `2944-carres-cubes-v${variation + 1}-juste`);
		}
		const card = await openSeries(page, CARRES_CUBES, 3, 0);
		const labels = await trayLabels(card);
		await arrange(card, ascendingOrder(labels).reverse());
		expect(await validate(page, card), 'ordre à l’envers').toBe('Faux');
		await shot(page, '2944-carres-cubes-faux');
	});

	test('#2944 @bureau — glisser une étiquette sur sa place à la souris la pose, puis la glisser en haut la fait remonter', async ({
		page
	}) => {
		const card = await openSeries(page, CARRES_CUBES, 2, 0);
		const labels = await trayLabels(card);
		const smallest = ascendingOrder(labels)[0];
		const from = tray(card, smallest);
		await from.scrollIntoViewIfNeeded();
		const a = await from.boundingBox();
		const b = await place(card, 0).boundingBox();
		if (!a || !b) throw new Error('étiquette ou place sans boîte');
		await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
		await page.mouse.down();
		await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
		await page.mouse.up();
		await expect(place(card, 0)).toHaveAccessibleName(/^Place 1 sur 3, étiquette/);
		const tr = await card.locator('.flip-card-front [data-ranger-tray]').boundingBox();
		const p = await place(card, 0).boundingBox();
		if (!tr || !p) throw new Error('plateau ou place sans boîte');
		await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
		await page.mouse.down();
		await page.mouse.move(tr.x + tr.width / 2, tr.y + tr.height / 2, { steps: 10 });
		await page.mouse.up();
		await expect(place(card, 0)).toHaveAccessibleName('Place 1 sur 3, vide');
	});
});

// ============================================================================
// #2945 — « TW » rendu proprement
// ============================================================================

/** Aucun reste de commande LaTeX lisible dans un texte rendu */
function expectNoRawLatex(text: string, where: string): void {
	expect(text, `${where} : pas de \\mathrm lisible`).not.toMatch(/mathrm|\\text|\\unit|\\\\/);
}

test('#2945 — « Préfixes et puissances de 10 », 1 TW = 10^? W (graine 5) : « TW » lu à l’écran, ni \\mathrm ni \\text visibles, dans l’énoncé comme dans la correction', async ({
	page
}) => {
	const card = await openSeries(page, PREFIXES, 5, 0);
	const front = card.locator('.flip-card-front');
	expect((await fieldSources(front)).join(' '), 'la graine 5 donne bien des TW').toContain('TW');
	// Le rendu de la case (ce que l'œil lit)
	const rendered = (await renderedMath(front)).join(' ');
	expect(rendered, 'TW visible dans l’énoncé').toContain('TW');
	expectNoRawLatex(rendered, 'énoncé');
	await shot(page, '2945-tw-enonce');

	await typeInto(page, front.locator('math-field').first(), '5');
	expect(await validate(page, card)).toBe('Faux');
	const back = card.locator('.flip-card-back');
	await back.locator('math-span, math-field').first().scrollIntoViewIfNeeded();
	await page.waitForTimeout(600);
	const backRendered = await renderedMath(back);
	expect(
		backRendered.filter((t) => t.includes('TW')).length,
		'« TW » dans la réponse, la correction et le rappel des préfixes'
	).toBeGreaterThanOrEqual(2);
	for (const text of backRendered) expectNoRawLatex(text, 'correction');
	await shot(page, '2945-tw-correction');

	// Et la bonne réponse (12) est acceptée
	const ok = await openSeries(page, PREFIXES, 5, 0);
	await typeInto(page, ok.locator('.flip-card-front math-field').first(), '12');
	expect(await validate(page, ok)).toBe('Juste');
});

// ============================================================================
// #2946 — décimaux à virgule et espaces fines (0,003 2)
// ============================================================================

/** Un nombre à l'écriture décimale groupée par trois après la virgule : `0{,}003\,2` */
const GROUPED = /\d+\{,\}\d{3}\\,\d+/;

/**
 * Les écarts (px) entre les chiffres de la partie décimale rendue de la case : MathLive pose chaque
 * caractère dans son ombre, l'espace fine `\,` ne s'y lit pas comme un caractère mais comme un vide.
 * Rend le texte du décimal et l'écart qui suit chacun de ses chiffres.
 */
async function decimalGaps(field: Locator): Promise<{ text: string; gaps: number[] } | null> {
	return field.evaluate((el) => {
		const root = el.shadowRoot;
		if (!root) return null;
		const chars: { c: string; left: number; right: number }[] = [];
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const text = node.textContent ?? '';
			for (let i = 0; i < text.length; i++) {
				if (text[i] === '​') continue;
				const range = document.createRange();
				range.setStart(node, i);
				range.setEnd(node, i + 1);
				const box = range.getBoundingClientRect();
				if (box.width > 0) chars.push({ c: text[i], left: box.left, right: box.right });
			}
		}
		const all = chars.map((ch) => ch.c).join('');
		const m = all.match(/0,(\d{4,})/);
		if (!m || m.index === undefined) return null;
		const digits = chars.slice(m.index + 2, m.index + 2 + m[1].length);
		return {
			text: m[0],
			gaps: digits.slice(1).map((d, i) => Math.round((d.left - digits[i].right) * 10) / 10)
		};
	});
}

test('#2946 — « Encadrer entre deux puissances de 10 », v1 : un décimal à plus de trois chiffres après la virgule (0,003 2) s’écrit avec la virgule et une espace fine entre les groupes de trois, lue dans l’énoncé rendu, jamais de point', async ({
	page
}) => {
	let found: { seed: number; card: Locator } | null = null;
	// La graine donne n (1..5) : n ≥ 3 → au moins 4 décimales (0,003 2 ; 0,000 65 ; 0,000 031)
	for (const seed of [3, 5, 7, 8, 11, 14, 15, 17]) {
		const card = await openSeries(page, ENCADRER, seed, 0);
		const source = (await fieldSources(card.locator('.flip-card-front'))).join(' ');
		if (GROUPED.test(source)) {
			found = { seed, card };
			break;
		}
	}
	expect(found, 'une graine à décimal groupé trouvée').not.toBeNull();
	const front = found!.card.locator('.flip-card-front');
	const source = (await fieldSources(front)).join(' ');
	console.log(`GRAINE ${found!.seed} : ${source}`);
	expect(source, 'jamais de point décimal').not.toMatch(/\d\.\d/);
	const field = front.locator('math-field').first();
	const rendered = (await renderedMath(front)).join(' ');
	expect(rendered, 'virgule décimale rendue').toMatch(/0,\d{4,}/);
	expect(rendered, 'jamais de point décimal rendu').not.toMatch(/\d\.\d/);
	// L'espace fine : le vide après le 3e chiffre est plus grand que l'écart ordinaire entre deux chiffres
	const reading = await decimalGaps(field);
	expect(reading, 'décimal à 4 chiffres ou plus lu dans la case rendue').not.toBeNull();
	const { gaps } = reading!;
	const separator = gaps[2];
	const others = gaps.filter((_, i) => i !== 2);
	expect(
		separator,
		`vide entre le 3e et le 4e chiffre (${separator} px) contre ${others.join(' / ')} px ailleurs`
	).toBeGreaterThan(Math.max(...others) + 1);
	await shot(page, '2946-encadrer-espace-fine');
});

test('#2946 — « Encadrer entre deux puissances de 10 » : la bonne réponse (−2 et −1 pour 0,022) est acceptée, une erreur (2 et 1) refusée', async ({
	page
}) => {
	// Graine 2 : 0,022 → 10^(-2) ≤ 0,022 < 10^(-1)
	const card = await openSeries(page, ENCADRER, 2, 0);
	const source = (await fieldSources(card.locator('.flip-card-front'))).join(' ');
	expect(source).toContain('0{,}022');
	const fields = card.locator('.flip-card-front math-field');
	await typeInto(page, fields.first(), '-2');
	// Deux gabarits dans la même case : on passe au suivant par la tabulation du gabarit
	await page.keyboard.press('Tab');
	await page.keyboard.type('-1', { delay: 80 });
	expect(await validate(page, card)).toBe('Juste');

	// L'erreur classique : les exposants positifs (2 et 1) pour un nombre plus petit que 1
	const wrong = await openSeries(page, ENCADRER, 2, 0);
	await typeInto(page, wrong.locator('.flip-card-front math-field').first(), '2');
	await page.keyboard.press('Tab');
	await page.keyboard.type('1', { delay: 80 });
	expect(await validate(page, wrong)).toBe('Faux');
});

test('#2946 — « Arrondir un nombre décimal » : les décimaux de l’énoncé, de la case et de la correction ont une virgule, aucun point ; l’arrondi juste (virgule) est accepté', async ({
	page
}) => {
	// Variation 2 : arrondi au dixième d'un nombre à trois décimales
	const card = await openSeries(page, ARRONDIR, 1, 1);
	const front = card.locator('.flip-card-front');
	const statement = [...(await formulas(front)), ...(await fieldSources(front))].join(' ');
	expect(statement, 'énoncé : une virgule décimale').toMatch(/\d\{,\}\d/);
	expect(statement, 'énoncé : jamais de point décimal').not.toMatch(/\d\.\d/);
	const shown = (await front.innerText()) + ' ' + (await fieldRendered(front)).join(' ');
	expect(shown, 'énoncé rendu : jamais de point décimal').not.toMatch(/\d\.\d/);
	// L'arrondi au dixième, calculé ici sur le nombre lu dans l'énoncé (trois décimales)
	const x = statement.match(/(\d+)\{,\}(\d{1,3})/);
	expect(x, `nombre décimal à virgule dans l'énoncé : ${statement}`).not.toBeNull();
	const milliemes = Number(x![1]) * 1000 + Number(x![2].padEnd(3, '0'));
	const dixiemes = Math.floor((milliemes + 50) / 100);
	const answer = `${Math.floor(dixiemes / 10)},${dixiemes % 10}`.replace(/,0$/, '');
	await typeInto(page, front.locator('math-field').first(), '99999');
	expect(await validate(page, card)).toBe('Faux');
	const back = card.locator('.flip-card-back');
	const correction = (await formulas(back)).join(' ');
	expect(correction, 'correction : virgule, jamais de point').not.toMatch(/\d\.\d/);
	expect(correction.replace(/\s+/g, ''), `la correction donne l'arrondi ${answer}`).toContain(
		answer.replace(',', '{,}')
	);
	await shot(page, '2946-arrondir-correction');
	const ok = await openSeries(page, ARRONDIR, 1, 1);
	await typeInto(page, ok.locator('.flip-card-front math-field').first(), answer);
	expect(await validate(page, ok), `${answer} accepté`).toBe('Juste');
});

// ============================================================================
// #2946 — droites graduées sur téléphone
// ============================================================================

interface LineReading {
	ticks: number;
	labels: { text: string; px: number; left: number; right: number }[];
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
		const labels = [...container.querySelectorAll('.number-line-label')]
			.filter((label) => !label.classList.contains('hidden-label'))
			.map((label) => {
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
		return {
			ticks: xs.length,
			labels,
			minGap: Math.min(...gaps),
			left: svgBox.left,
			right: svgBox.right
		};
	});
}

/** Mesure la droite de la carte, la note dans le rapport du test, vérifie qu'elle tient dans l'écran */
async function measureLine(page: Page, card: Locator, name: string): Promise<LineReading> {
	const line = card.locator('.flip-card-front .number-line-container').first();
	await line.scrollIntoViewIfNeeded();
	await expect(line).toBeVisible();
	await page.waitForTimeout(500);
	const reading = await readLine(line);
	const viewport = page.viewportSize();
	if (!viewport) throw new Error('fenêtre sans taille');
	expect(reading.labels.length, `${name} : étiquettes mesurées`).toBeGreaterThanOrEqual(1);
	expect(reading.left, `${name} : bord gauche dans l'écran`).toBeGreaterThanOrEqual(0);
	expect(reading.right, `${name} : bord droit dans l'écran`).toBeLessThanOrEqual(viewport.width);
	const sizes = reading.labels.map((l) => Math.round(l.px * 10) / 10);
	const summary = `${name} : étiquettes ${sizes.join(' / ')} px (min ${Math.min(...sizes)}${Math.min(...sizes) < MIN_LABEL_PX ? `, SOUS ${MIN_LABEL_PX}` : ''}), écart de graduations min ${Math.round(reading.minGap)} px, ${projectName()} ${viewport.width} px`;
	test.info().annotations.push({ type: 'taille-etiquettes', description: summary });
	console.log(`MESURE ${summary} | ${reading.labels.map((l) => `« ${l.text} »`).join(' ')}`);
	// Les graduations restent assez écartées pour le doigt (l'étiquette de chacune est centrée dessus)
	expect(reading.minGap, `${name} : écart entre graduations`).toBeGreaterThanOrEqual(
		MIN_TICK_GAP_PX
	);
	return reading;
}

test.describe('#2946 — droites graduées lisibles', () => {
	test('#2946 — « Lire l’abscisse d’un point » v4 (repères −0,5…, pas 0,01), v5 (repères 3 000…, pas 250) et v6 (pas 0,025) : la droite tient dans l’écran, étiquettes sans chevauchement, taille mesurée', async ({
		page
	}) => {
		for (const [variation, name] of [
			[3, 'lire v4 (pas 0,01)'],
			[4, 'lire v5 (repères en milliers)'],
			[5, 'lire v6 (pas 0,025)']
		] as const) {
			const card = await openSeries(page, LIRE_ABSCISSE, 4, variation);
			const reading = await measureLine(page, card, name);
			if (variation === 4) {
				// Repères de 1 000 en 1 000 : l'étiquette s'écrit avec une espace fine, ex. « 3 000 »
				expect(
					reading.labels.some((l) => /\d,?\d{3}|\d{4}/.test(l.text.replace(/\\,/g, ''))),
					'un repère en milliers étiqueté'
				).toBe(true);
			}
			if (variation === 5) {
				const front = card.locator('.flip-card-front');
				expect((await formulas(front)).join(' '), 'virgule, jamais de point').not.toMatch(/\d\.\d/);
			}
			await expectNoHorizontalOverflow(page, name);
			await shot(page, `2946-lire-abscisse-v${variation + 1}`);
		}
	});

	test('#2946 — « Inégalités et intervalles » v4 : la droite coloriée (segment, crochets) se lit à l’écran, hors de l’axe gris', async ({
		page
	}) => {
		const card = await openSeries(page, INEGALITES, 4, 3);
		const reading = await measureLine(page, card, 'inégalités v4');
		expect(reading.labels.length, 'repères de −6 à 6').toBeGreaterThanOrEqual(5);
		const line = card.locator('.flip-card-front .number-line-container').first();
		const style = await line.evaluate((container) => {
			const read = (el: Element | null) => {
				if (!el) return null;
				const s = getComputedStyle(el);
				return { stroke: s.stroke, width: parseFloat(s.strokeWidth) };
			};
			return {
				segment: read(container.querySelector('.nl-segment')),
				axis: read(container.querySelector('.nl-axis')),
				brackets: container.querySelectorAll('.nl-bracket').length
			};
		});
		expect(style.segment, 'un segment colorié').not.toBeNull();
		expect(style.segment!.stroke, 'le segment a une couleur').not.toBe('none');
		expect(style.segment!.stroke, 'le segment n’a pas la couleur de l’axe').not.toBe(
			style.axis?.stroke
		);
		expect(style.segment!.width, 'trait épais').toBeGreaterThan(style.axis?.width ?? 0);
		expect(style.brackets, 'deux crochets').toBeGreaterThanOrEqual(2);
		await expectNoHorizontalOverflow(page, 'inégalités v4');
		await shot(page, '2946-inegalites-v4');
	});

	test('#2946 — « Placer un réel sur une droite graduée » v1 à v3 (déjà en prod) : taille des étiquettes mesurée au téléphone (rapportée, la ligne annonce 11 à 15 px)', async ({
		page
	}) => {
		for (const [variation, name] of [
			[0, 'placer v1 (dixièmes)'],
			[1, 'placer v2 (tiers)'],
			[2, 'placer v3 (quarts)']
		] as const) {
			const card = await openSeries(page, PLACER_REEL, 2, variation);
			await measureLine(page, card, name);
			await shot(page, `2946-placer-v${variation + 1}`);
		}
	});
});

// ============================================================================
// #2946 — « Résoudre |x − a| > r » : réunion tapée au clavier
// ============================================================================

test('#2946 @clavier-mathlive — « Résoudre |x − a| > r », v1 : la réunion tapée au clavier ]−∞ ; a−r[ ∪ ]a+r ; +∞[ est acceptée, une seule branche refusée', async ({
	page
}) => {
	const card = await openSeries(page, VALEUR_ABSOLUE, 1, 0);
	const statement = (await formulas(card.locator('.flip-card-front'))).join(' ');
	const m = statement.match(/\\lvert x-(\d+)\\rvert\s*(>|\\geqslant)\s*(\d+)/);
	expect(m, `énoncé lisible : ${statement}`).not.toBeNull();
	const a = Number(m![1]);
	const r = Number(m![3]);
	const strict = m![2] === '>';
	const open1 = strict ? '[' : ']';
	const open2 = strict ? ']' : '[';
	const field = card.locator('.flip-card-front math-field').first();
	// Une seule branche d'abord : refusée
	await typeInto(page, field, `]-infty;${a - r}${open1}`);
	expect(await validate(page, card), 'une seule branche').toBe('Faux');
	// La réunion complète, tapée
	const ok = await openSeries(page, VALEUR_ABSOLUE, 1, 0);
	const okField = ok.locator('.flip-card-front math-field').first();
	await typeInto(page, okField, `]-infty;${a - r}${open1}`);
	// MathLive : « \cup » + espace fait le symbole ∪, la suite se tape à la suite
	await page.keyboard.type('\\cup ', { delay: 80 });
	await page.keyboard.type(`${open2}${a + r};+infty[`, { delay: 80 });
	const typed = await typedIn(okField);
	expect(typed, 'la réunion est écrite dans la case').toMatch(/\\cup/);
	await shot(page, '2946-reunion-tapee');
	expect(await validate(page, ok), 'réunion tapée').toBe('Juste');
});

// ============================================================================
// #2869 — « Les faces d'une pyramide », variation 3, au téléphone
// ============================================================================

test('#2869 — « Les faces d’une pyramide » (CM1), variation 3 : réponse fausse, la correction passe à la ligne sans déborder, seul « triangles » est en couleur', async ({
	page
}) => {
	const card = await openSeries(page, PYRAMIDE, 1, 2);
	await expect(
		card
			.locator('.flip-card-front')
			.getByText('Quelle phrase est vraie pour toutes les pyramides ?')
	).toBeVisible();
	// Une réponse fausse : « Sa base est un carré. »
	await press(
		card.locator('.flip-card-front [role="radio"]').filter({ hasText: 'Sa base est un carré.' })
	);
	expect(await validate(page, card)).toBe('Faux');
	const back = card.locator('.flip-card-back');
	const lastStep = back.getByText(/Ce qui est toujours vrai/).first();
	await lastStep.scrollIntoViewIfNeeded();
	await expect(lastStep).toBeVisible();
	await page.waitForTimeout(500);
	const viewport = page.viewportSize();
	if (!viewport) throw new Error('fenêtre sans taille');
	const reading = await lastStep.evaluate((el) => {
		const step = el.closest('p') ?? el;
		const range = document.createRange();
		range.selectNodeContents(step);
		const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
		const box = step.getBoundingClientRect();
		const overflowing = [...step.querySelectorAll('*')]
			.map((child) => child.getBoundingClientRect())
			.filter((r) => r.width > 0 && (r.left < -0.5 || r.right > window.innerWidth + 0.5)).length;
		// Chaque morceau de texte de la phrase, avec sa couleur calculée : le texte courant, puis le
		// rendu (ombre) de chaque formule, dont le LaTeX source reste caché dans leur DOM léger
		const defaultColor = getComputedStyle(step).color;
		const pieces: { text: string; color: string }[] = [];
		const collect = (root: Node, skipMath: boolean) => {
			const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
			for (let node = walker.nextNode(); node; node = walker.nextNode()) {
				const text = (node.textContent ?? '').replace(/\u200b/g, '').trim();
				const parent = node.parentElement;
				if (text === '' || !parent) continue;
				if (skipMath && parent.closest('math-span, math-div, math-field')) continue;
				pieces.push({ text, color: getComputedStyle(parent).color });
			}
		};
		collect(step, true);
		for (const math of step.querySelectorAll('math-span, math-div')) {
			const rendered = math.shadowRoot?.querySelector('.ML__latex');
			if (rendered) collect(rendered, false);
		}
		return {
			text: (step.textContent ?? '').replace(/\s+/g, ' ').trim(),
			lineCount: lines.size,
			left: box.left,
			right: box.right,
			scrollWidth: (step as HTMLElement).scrollWidth,
			clientWidth: (step as HTMLElement).clientWidth,
			overflowing,
			defaultColor,
			pieces
		};
	});
	expect(reading.text, 'la dernière phrase').toContain('triangles');
	expect(reading.left, 'phrase : bord gauche dans l’écran').toBeGreaterThanOrEqual(0);
	expect(reading.right, 'phrase : bord droit dans l’écran').toBeLessThanOrEqual(viewport.width);
	expect(reading.overflowing, 'aucun morceau ne dépasse de l’écran').toBe(0);
	expect(reading.scrollWidth, 'phrase : pas de défilement horizontal').toBeLessThanOrEqual(
		reading.clientWidth + 1
	);
	expect(reading.lineCount, 'la phrase passe à la ligne (téléphone)').toBeGreaterThanOrEqual(
		viewport.width <= 500 ? 2 : 1
	);
	// Seul « triangles » est en couleur : tous les autres morceaux ont la couleur du texte
	const colored = reading.pieces.filter((p) => p.color !== reading.defaultColor);
	expect(
		colored.map((p) => p.text).join(''),
		`seul « triangles » est coloré (couleur du texte ${reading.defaultColor}) parmi ${JSON.stringify(reading.pieces)}`
	).toBe('triangles');
	expect(new Set(colored.map((p) => p.color)).size, 'une seule couleur').toBe(1);
	expect(
		reading.pieces.some((p) => p.color === reading.defaultColor),
		'le reste de la phrase garde la couleur du texte'
	).toBe(true);
	await expectNoHorizontalOverflow(page, 'correction de la pyramide');
	await shot(page, '2869-pyramide-correction');
});
