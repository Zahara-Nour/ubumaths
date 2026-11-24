import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertLocalServerEnv } from './helpers/carnet';
import { buildSeriesLink } from '../../src/lib/validation/series';

/**
 * Modèles de questions des lots 2 bis et C — base LOCALE
 * ======================================================
 *
 * Reprend les lignes #1568, #1569 (lot C) et #1564 (lot A du lot 2 bis) de
 * `docs/wip/verifications-manuelles.md`. Ces lignes parlent de la prod ; la base locale
 * est une copie de la prod avec les mêmes identifiants (modèles et tags), les mêmes
 * modèles se jouent donc ici par le lien de série public `/automaths/test?…&mode=typing`.
 * Ce qui ne se voit qu'en prod (le contenu réel vu par les élèves, « Ma progression »
 * d'un élève réel de CE1) reste à David.
 *
 * Rien n'est écrit en base : séries jouées sans compte.
 */

// Base locale seulement : contre la prod, les graines donneraient les mêmes questions mais le décor local manque
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

test.beforeAll(() => {
	assertLocalServerEnv();
});

// Constantes

const COMPARER_ENTIERS = '943151d0-0af5-46f0-bce8-e4acbd5f1029'; // CP-006
const QUOTIENT_ENTIER = 'e6ddf5d7-2885-4e75-a375-ddf3fd43fc02'; // CE2-018
const TABLEAUX_PROPORTIONNALITE = [
	'496ac62e-9ff1-44e5-b85d-0a16752cfcda',
	'd01e97d6-e65b-4526-8444-493bc46bc860'
]; // 6-190
const LONGUEUR_REELLE = '52bf3fb9-a815-4a94-9425-f524278fbbc1'; // 6-193
const FORME_DECIMALE = 'dd7db98e-2c46-4b1f-9501-edfa5b161ac1'; // CM2-039
/** Lot A du lot 2 bis : les sept modèles de la ligne #1564 */
const LOT_A: Record<string, string> = {
	'3bbe92f2-84f0-487f-9ca1-2077248a313b': 'Calculer une somme',
	'f1a392f5-060d-4e1c-b7a5-2920a054b83b': 'Calculer une somme',
	'b100ddb2-e91d-402c-9940-012da8236d1d': 'Calculer une différence',
	'b9a9048a-d973-47a3-ad5b-acbde2d80a66': 'Calculer une différence',
	'dd7db98e-2c46-4b1f-9501-edfa5b161ac1': "Déterminer la forme décimale d'une fraction",
	'39c5bcfa-6d2d-4b5b-9aab-a1b6edd6e558': 'Trouver le plus grand facteur commun',
	'3abfcd7b-cd0a-4035-970a-609b3e447369': 'Trouver le plus grand facteur commun'
};

// Functions

async function openQuestion(page: Page, templateId: string, seed: number): Promise<Locator> {
	const link = buildSeriesLink('', [{ templateId, quantity: 1, delay: 0 }], {
		mode: 'typing',
		seed
	});
	await page.goto(link);
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor();
	await page.waitForTimeout(400);
	return card;
}

/** Le texte brut de la face avant, formules comprises (`textContent` : le texte lu des formules KaTeX) */
async function frontText(card: Locator): Promise<string> {
	return ((await card.locator('.flip-card-front').first().textContent()) ?? '').replace(
		/\s+/g,
		' '
	);
}

/** Choisit la réponse `index` (0 = A) puis « Valider » */
async function chooseAndValidate(page: Page, card: Locator, index: number): Promise<string> {
	await card.locator('.flip-card-front').getByRole('radio').nth(index).click();
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(card.getByText(/^(Juste|Faux|½ point)$/).first()).toBeVisible();
	return ((await card.innerText()) ?? '').replace(/\s+/g, ' ');
}

async function fieldValue(card: Locator): Promise<string> {
	return card
		.locator('math-field')
		.first()
		.evaluate((element) => (element as HTMLElement & { value: string }).value);
}

// ============================================================================
// #1568 — Comparer deux nombres entiers (CP-006)
// ============================================================================

test('#1568 — « Comparer deux nombres entiers » (CP-006) : « a … b », choix < = > toujours dans cet ordre, parfois « = » juste', async ({
	page
}) => {
	test.setTimeout(240_000);
	let equalSeed: number | null = null;
	let lessSeed: number | null = null;
	for (let seed = 1; seed <= 30; seed++) {
		const card = await openQuestion(page, COMPARER_ENTIERS, seed);
		const symbols = (
			await card.locator('.flip-card-front').getByRole('radio').allTextContents()
		).map((text) => /[<=>]/.exec(text)?.[0]);
		expect(symbols, `graine ${seed} : ordre des choix`).toEqual(['<', '=', '>']);
		const pair = /(\d+)\s*(?:…|\.\.\.|\\ldots)\s*(\d+)/.exec(await frontText(card));
		expect(
			pair,
			`graine ${seed} : « a … b » dans l'énoncé : ${await frontText(card)}`
		).not.toBeNull();
		const [a, b] = [Number(pair?.[1]), Number(pair?.[2])];
		if (a === b && equalSeed === null) equalSeed = seed;
		if (a < b && lessSeed === null) lessSeed = seed;
		if (equalSeed !== null && lessSeed !== null) break;
	}
	expect(equalSeed, 'une graine où les deux nombres sont égaux').not.toBeNull();
	expect(lessSeed, 'une graine où a < b').not.toBeNull();

	// Deux nombres égaux : « = » (B) est juste
	const equalCard = await openQuestion(page, COMPARER_ENTIERS, equalSeed as number);
	expect(await chooseAndValidate(page, equalCard, 1)).toContain('Juste');
	// a < b : « = » est faux, « < » est juste
	const lessCard = await openQuestion(page, COMPARER_ENTIERS, lessSeed as number);
	expect(await chooseAndValidate(page, lessCard, 1)).toContain('Faux');
	const lessRight = await openQuestion(page, COMPARER_ENTIERS, lessSeed as number);
	expect(await chooseAndValidate(page, lessRight, 0)).toContain('Juste');
	await page.screenshot({ path: '.captures/verifs/programme/1568-comparer.png' });
});

// ============================================================================
// #1568 — Calculer un quotient entier (CE2-018)
// ============================================================================

test('#1568 — « Calculer un quotient entier » (CE2-018) : « a ÷ b », et la bonne réponse est comptée juste', async ({
	page
}) => {
	test.setTimeout(180_000);
	for (const seed of [1, 2, 3]) {
		const card = await openQuestion(page, QUOTIENT_ENTIER, seed);
		const shown = await fieldValue(card);
		const division = /^(\d+)\\div\s*(\d+)=/.exec(shown);
		expect(division, `graine ${seed} : « a ÷ b = » (reçu : ${shown})`).not.toBeNull();
		const [a, b] = [Number(division?.[1]), Number(division?.[2])];
		expect(a % b, `graine ${seed} : ${a} ÷ ${b} tombe juste`).toBe(0);

		const field = card.locator('math-field').first();
		const box = await field.boundingBox();
		await field.click({
			position: { x: Math.max(5, (box?.width ?? 30) - 15), y: (box?.height ?? 20) / 2 }
		});
		await page.waitForTimeout(500);
		await page.keyboard.type(String(a / b), { delay: 80 });
		await page.getByRole('button', { name: 'Valider' }).click();
		await expect(page.locator('[id$="-etats"]')).toHaveText(/Case 1 : juste/);
	}
});

// ============================================================================
// #1569 — Reconnaître un tableau de proportionnalité (6-190)
// ============================================================================

test('#1569 — « Reconnaître si un tableau est un tableau de proportionnalité » (6-190) : tableau à traits verticaux, « Masse (kg) / Prix (€) » ou « Durée (h) / Distance (km) » lisibles, produits du corrigé', async ({
	page
}) => {
	test.setTimeout(240_000);
	const headers = new Set<string>();
	for (const templateId of TABLEAUX_PROPORTIONNALITE) {
		for (const seed of [1, 2, 3, 4]) {
			const card = await openQuestion(page, templateId, seed);
			const result = await chooseAndValidate(page, card, 0);
			const formulas = await card.locator('math-span').allTextContents();
			const table = formulas.find((tex) => tex.includes('\\begin{array}'));
			expect(table, `graine ${seed} : un tableau dans ${JSON.stringify(formulas)}`).toBeTruthy();
			// Traits verticaux : `{|l|c|c|}`
			expect(table).toMatch(/\\begin\{array\}\{\|[lcr|]+\|\}/);
			const labels = [...(table as string).matchAll(/\\text\{([^}]*)\}/g)].map((m) => m[1]);
			expect(labels.length, `graine ${seed} : deux intitulés`).toBe(2);
			for (const label of labels) {
				// Intitulé lisible : du texte, jamais un source brut (`\`, `$`, accolades)
				expect(label).toMatch(/^[A-Za-zÀ-ÿ' ]+( \([A-Za-z€]+\))?$/);
				headers.add(label);
			}
			// Le corrigé : les produits « 7 × 4 = 28 » sont écrits, et la réponse expliquée
			expect(
				formulas.some((tex) => /\\times/.test(tex)),
				`graine ${seed} : produits du corrigé`
			).toBe(true);
			expect(result).toContain('Correction');
		}
	}
	// Au moins un intitulé à unité (« Prix (€) », « Masse (kg) »…) se rencontre, euro compris
	expect(
		[...headers].some((label) => /\((€|kg|h|km)\)$/.test(label)),
		JSON.stringify([...headers])
	).toBe(true);
});

// ============================================================================
// #1568 — Calculer la longueur réelle (6-193)
// ============================================================================

test('#1568 — « Calculer la longueur réelle » (6-193) : « 1 cm représente 1 km », et la bonne réponse (en km) est comptée juste', async ({
	page
}) => {
	test.setTimeout(300_000);
	let found = false;
	for (let seed = 1; seed <= 24 && !found; seed++) {
		const card = await openQuestion(page, LONGUEUR_REELLE, seed);
		const spans = await card.locator('.flip-card-front math-span').allTextContents();
		if (!spans.some((tex) => /^1~\\mathrm\{km\}$/.test(tex))) continue;
		expect(await frontText(card)).toContain('cm représente');
		const measured = spans.map((tex) => /^(\d+)~\\mathrm\{cm\}$/.exec(tex)?.[1]).find(Boolean);
		expect(
			measured,
			`graine ${seed} : longueur mesurée dans ${JSON.stringify(spans)}`
		).toBeTruthy();
		const field = card.locator('math-field').first();
		const box = await field.boundingBox();
		await field.click({
			position: { x: Math.max(5, (box?.width ?? 30) - 15), y: (box?.height ?? 20) / 2 }
		});
		await page.waitForTimeout(500);
		await page.keyboard.type(`${measured} km`, { delay: 80 });
		await page.getByRole('button', { name: 'Valider' }).click();
		await expect(page.locator('[id$="-etats"]')).toHaveText(/Case 1 : juste/);
		await page.screenshot({ path: '.captures/verifs/programme/1568-longueur-reelle.png' });
		found = true;
	}
	expect(found, '« 1 cm représente 1 km » rencontré dans les 24 premières graines').toBe(true);
});

// ============================================================================
// #1564 — lot A du lot 2 bis
// ============================================================================

test('#1564 — « Déterminer la forme décimale d’une fraction » (CM2-039) : seulement 1/10, 1/100, 1/1000, 4/2, 1/2, 1/4, 3/4, 3/2, 5/2 (plus 3/1000, 1/5, 7/2, 9/2)', async ({
	page
}) => {
	test.setTimeout(300_000);
	const allowed = new Set(['1/10', '1/100', '1/1000', '4/2', '1/2', '1/4', '3/4', '3/2', '5/2']);
	const seen = new Set<string>();
	for (let seed = 1; seed <= 30; seed++) {
		const card = await openQuestion(page, FORME_DECIMALE, seed);
		const text = await frontText(card);
		const shown = await card
			.locator('.flip-card-front')
			.first()
			.evaluate((front) =>
				[...front.querySelectorAll('annotation')].map((a) => a.textContent ?? '')
			);
		const fraction = [...shown, text]
			.map((source) => /\\d?frac\{(\d+)\}\{(\d+)\}/.exec(source))
			.find((match) => match !== null);
		expect(
			fraction,
			`graine ${seed} : fraction dans ${JSON.stringify(shown)} / ${text}`
		).toBeTruthy();
		const key = `${fraction?.[1]}/${fraction?.[2]}`;
		expect(allowed.has(key), `graine ${seed} : ${key} est dans la liste du lot A`).toBe(true);
		seen.add(key);
	}
	// La variété existe : plusieurs fractions différentes sur 30 graines
	expect(seen.size).toBeGreaterThan(2);
});

for (const [templateId, title] of Object.entries(LOT_A)) {
	test(`#1564 — ${title} (${templateId.slice(0, 8)}) : énoncé et corrigé lisibles, sans source brut ni valeur vide`, async ({
		page
	}) => {
		test.setTimeout(240_000);
		for (const seed of [1, 2, 3, 4]) {
			const card = await openQuestion(page, templateId, seed);
			const front = await frontText(card);
			expect(front.length, `graine ${seed} : énoncé non vide`).toBeGreaterThan(10);
			for (const bad of ['{{', 'NaN', 'undefined', 'Infinity']) {
				expect(front, `graine ${seed} : « ${bad} » dans l'énoncé`).not.toContain(bad);
			}
			// Le corrigé : on retourne la carte en validant une réponse vide puis on lit le verso
			await page.getByRole('button', { name: 'Valider' }).click();
			await expect(card.getByText('Correction').first()).toBeVisible();
			const all = ((await card.textContent()) ?? '').replace(/\s+/g, ' ');
			for (const bad of ['{{', 'NaN', 'undefined', 'Infinity']) {
				expect(all, `graine ${seed} : « ${bad} » dans le corrigé`).not.toContain(bad);
			}
			const correction = all.slice(all.indexOf('Correction'));
			expect(correction.length, `graine ${seed} : corrigé non vide`).toBeGreaterThan(20);
		}
	});
}
