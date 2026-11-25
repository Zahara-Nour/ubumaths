import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { templateMarkdown } from '../../src/lib/ubumark/index';
import { buildSeriesLink } from '../../src/lib/validation/series';
import { ADMIN, assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { chooseOption, pdfText, pdfToPng, savePdf } from './helpers/fiches';
import { inkBox, isInk, pdfBoxes, pdfRawText, rasterPage, share } from './helpers/pdf-mesures';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';

/**
 * Modèles de questions et fiches, paquet 6 (tri des vérifications manuelles)
 * =========================================================================
 *
 * Reprend les lignes #2536 / #2538 (choix `<`, `=`, `>`), #2489 (éditer un modèle publié), #2492
 * (liste admin des modèles) et #2509 (évaluation de rattrapage) de `docs/wip/verifications-manuelles.md`.
 *
 * Décor : la base locale est une copie de la prod (mêmes identifiants). Les lignes de la prod se
 * jouent sur ces copies, jamais en écriture, SAUF #2489 qui crée, publie, édite puis efface SON
 * modèle « Verifs6 blocs <projet> w<n> … » (jamais un modèle publié existant).
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(240_000));

// Constantes

const SHOTS = '.captures/verifs/out-blocs6';
const PREFIX = 'Verifs6 blocs';
/** « Comparer deux nombres entiers » : un modèle par niveau (CP, CE1, CE2, CM1) */
const COMPARER = [
	'943151d0-0af5-46f0-bce8-e4acbd5f1029',
	'd4245f88-26a7-4608-991b-bfac03f996a5',
	'68775a97-3dd5-4bc6-8af0-1ec9544e9a19',
	'0021eee7-2b1d-4228-ada9-6c759c01d0ec'
];
const CART_KEY = 'chiphre_question_cart';
const RATTRAPAGE_ID = 'f337aa82-b020-4348-bf05-f99f4782f99b';
const ELEVATION_LIMITS = `delete from public.rate_limits where key = 'ratelimit:elevate:email:admin@local.test' or key like 'ratelimit:elevate:ip:%'`;

// Fonctions

const projectName = (): string => test.info().project.name;
const isTouch = (): boolean => test.info().project.use.hasTouch === true;
/** Préfixe complet des modèles de CE worker (projet + numéro de worker) */
const workerPrefix = (): string => `${PREFIX} ${projectName()} w${test.info().parallelIndex}`;

test.afterAll(async () => {
	await sql(`delete from question_templates where title like $1`, [`${workerPrefix()} %`]);
});

async function press(locator: Locator): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (isTouch()) await locator.tap();
	else await locator.click();
}

/** Attend la fin des animations (le retournement d'une carte fausse les mesures en cours de route) */
async function settle(page: Page): Promise<void> {
	await page
		.waitForFunction(
			() => document.getAnimations().every((a) => a.playState !== 'running'),
			undefined,
			{
				timeout: 5000
			}
		)
		.catch(() => undefined);
	await page.waitForTimeout(300);
}

async function shot(page: Page, name: string): Promise<void> {
	await mkdir(SHOTS, { recursive: true });
	await page.screenshot({ path: `${SHOTS}/${name}-${projectName()}.png` });
}

// ============================================================================
// #2536, #2538 — choix `<`, `=`, `>` en symboles, contre leur lettre
// ============================================================================

interface ChoiceRow {
	letter: string;
	text: string;
	/** Écart entre le bord gauche de la ligne et celui de la formule, en part de la largeur de la ligne */
	offset: number;
	/** Largeur de la formule rendue (0 : non rendue) */
	width: number;
}

/** Les choix dessinés (lettre + formule) de la zone, ligne par ligne */
async function choiceRows(scope: Locator): Promise<ChoiceRow[]> {
	return scope.evaluateAll(async (roots) => {
		const rows: Array<{ letter: string; text: string; offset: number; width: number }> = [];
		for (const root of roots) {
			for (const letter of root.querySelectorAll('[data-letter], li.choice > .font-semibold')) {
				// Une tuile à défilement ne dessine un choix qu'à son entrée à l'écran : on le lui amène d'abord
				letter.scrollIntoView({ block: 'center' });
				await new Promise((done) => setTimeout(done, 40));
				const row = letter.closest('li, button, [role="radio"]');
				if (!row) continue;
				const box = row.getBoundingClientRect();
				const formula = row.querySelector('math-div, math-span');
				const formulaBox = formula?.getBoundingClientRect();
				rows.push({
					letter: (letter.textContent ?? '').trim(),
					text: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
					offset: formulaBox ? (formulaBox.left - box.left) / box.width : -1,
					width: formulaBox?.width ?? 0
				});
			}
		}
		return rows;
	});
}

/** Trois choix A, B, C = `<`, `=`, `>` en symboles (jamais `$$<$$`) */
function expectSymbols(rows: ChoiceRow[], label: string): void {
	expect(
		rows.map((r) => r.letter),
		`${label} : lettres`
	).toEqual(['A', 'B', 'C']);
	const symbols = rows.map((r) =>
		r.text
			.replace(/^[ABC]\s*/, '')
			.replace(/bonne réponse|mauvaise réponse/g, '')
			.trim()
	);
	expect(symbols, `${label} : symboles`).toEqual(['<', '=', '>']);
	for (const r of rows)
		expect(r.text, `${label} : ${r.letter} jamais en code brut`).not.toContain('$');
}

test.describe('#2536 #2538 — choix `<`, `=`, `>`', () => {
	test('#2536 #2538 — catalogue : « Comparer deux nombres entiers » (CP, CE1, CE2, CM1) : A < , B = , C > en symboles, calés contre leur lettre, jamais `$$<$$` ; le verso aussi', async ({
		page
	}) => {
		await gotoSettled(page, '/automaths');
		await page
			.getByRole('searchbox')
			.or(page.getByPlaceholder(/echerch/))
			.first()
			.fill('Comparer deux nombres entiers');
		await expect(page.getByText('Comparer deux nombres entiers').first()).toBeVisible({
			timeout: 30_000
		});
		await page.waitForLoadState('networkidle');
		// Les cartes du catalogue : une carte par modèle homonyme (au moins les quatre niveaux)
		await expect
			.poll(async () => page.locator('[data-letter]').count(), { timeout: 30_000 })
			.toBeGreaterThanOrEqual(12);
		await expect
			.poll(
				async () =>
					(await choiceRows(page.locator('main .flip-card-front'))).every((r) => r.width > 0),
				{ timeout: 30_000 }
			)
			.toBe(true);
		const rows = await choiceRows(page.locator('main .flip-card-front'));
		expect(rows.length, 'au moins quatre cartes de trois choix').toBeGreaterThanOrEqual(12);
		// Chaque choix de symbole : lettre puis formule, calée à gauche (pas au milieu de la ligne)
		const symbolRows = rows.filter((r) =>
			['<', '=', '>'].includes(r.text.replace(/^[ABC]\s*/, '').trim())
		);
		expect(symbolRows.length, 'des choix de symboles').toBeGreaterThanOrEqual(12);
		for (const r of symbolRows) {
			expect(r.text, `${r.letter} jamais en code brut`).not.toContain('$');
			expect(r.width, `${r.letter} : formule rendue`).toBeGreaterThan(0);
			expect(
				r.offset,
				`${r.letter} : la formule est contre sa lettre (${r.offset.toFixed(2)} de la ligne)`
			).toBeLessThan(0.3);
		}
		await shot(page, '2536-catalogue');
		// Le verso de la première carte (« Voir la correction ») : mêmes symboles, bonne réponse marquée
		await press(page.getByRole('button', { name: 'Voir la correction' }).first());
		await expect(page.getByRole('button', { name: 'Retour à la question' }).first()).toBeVisible();
		await settle(page);
		const back = page.locator('main .flip-card-back').first();
		await expect
			.poll(async () => (await choiceRows(back)).every((r) => r.width > 0), { timeout: 15_000 })
			.toBe(true);
		const verso = await choiceRows(back);
		expectSymbols(verso, 'verso du catalogue');
		for (const r of verso)
			expect(r.offset, `verso ${r.letter} contre sa lettre`).toBeLessThan(0.45);
		await expect(back.getByText('bonne réponse')).toHaveCount(1);
	});

	test('#2536 #2538 — panier « Ma série » : mêmes choix contre leur lettre au recto ; « Voir la correction » : bonne réponse marquée, symboles inchangés', async ({
		page
	}) => {
		await page.addInitScript(([key, json]) => localStorage.setItem(key, json), [
			CART_KEY,
			JSON.stringify([{ templateId: COMPARER[0], quantity: 1, delay: 20 }])
		] as const);
		await gotoSettled(page, '/automaths/panier');
		const card = page.locator('main');
		await expect(card.locator('.flip-card-front [data-letter]').first()).toBeVisible({
			timeout: 30_000
		});
		// La carte est une tuile à défilement : un choix hors de la tuile se dessine quand il y entre
		await expect
			.poll(
				async () => (await choiceRows(card.locator('.flip-card-front'))).every((r) => r.width > 0),
				{ timeout: 15_000 }
			)
			.toBe(true);
		const recto = await choiceRows(card.locator('.flip-card-front'));
		expectSymbols(recto, 'recto');
		for (const r of recto) {
			expect(r.width, `recto ${r.letter} : formule rendue`).toBeGreaterThan(0);
			expect(
				r.offset,
				`recto ${r.letter} : contre sa lettre (${r.offset.toFixed(2)})`
			).toBeLessThan(0.3);
		}
		await shot(page, '2536-panier-recto');
		await press(page.getByRole('button', { name: 'Voir la correction' }).first());
		await expect(page.getByRole('button', { name: 'Retour à la question' }).first()).toBeVisible();
		await settle(page);
		const verso = await choiceRows(card.locator('.flip-card-back'));
		expectSymbols(verso, 'verso');
		await expect(card.getByText('bonne réponse').first()).toBeVisible();
		for (const r of verso) {
			expect(r.width, `verso ${r.letter} : formule rendue`).toBeGreaterThan(0);
			expect(
				r.offset,
				`verso ${r.letter} : contre sa lettre (${r.offset.toFixed(2)})`
			).toBeLessThan(0.45);
		}
		await shot(page, '2536-panier-verso');
	});

	test('#2536 #2538 — écran de réponse de l’élève : rien ne change (les symboles restent centrés dans leur bouton), la correction montre toujours <, =, >', async ({
		page
	}) => {
		const link = buildSeriesLink('', [{ templateId: COMPARER[0], quantity: 1, delay: 0 }], {
			mode: 'typing',
			seed: 5
		});
		await gotoSettled(page, link);
		const card = page.getByTestId('typing-card');
		await card.locator('.flip-card-front').waitFor();
		const radios = card.locator('.flip-card-front').getByRole('radio');
		await expect(radios).toHaveCount(3);
		const rows = await radios.evaluateAll((els) =>
			els.map((el) => {
				const box = el.getBoundingClientRect();
				const formula = el.querySelector('math-div, math-span')?.getBoundingClientRect();
				return {
					text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
					offset: formula ? (formula.left - box.left) / box.width : -1
				};
			})
		);
		expect(rows.map((r) => r.text.replace(/^[ABC]\s*/, ''))).toEqual(['<', '=', '>']);
		// Centrées (comme avant #2538) : le milieu du bouton, pas la lettre
		for (const r of rows) {
			expect(r.offset, `formule centrée dans son bouton (${r.offset.toFixed(2)})`).toBeGreaterThan(
				0.35
			);
		}
		await shot(page, '2536-eleve-reponse');
		await press(radios.nth(0));
		await page.getByRole('button', { name: 'Valider' }).click();
		await expect(
			page
				.getByTestId('typing-card')
				.getByText(/^(Juste|Faux)$/)
				.first()
		).toBeVisible();
		expect(await card.innerText()).not.toContain('$$');
	});
});

// ============================================================================
// #2489 — éditer un modèle publié
// ============================================================================

test.describe('#2489 — éditer un modèle publié', { tag: '@bureau' }, () => {
	async function publishedModel(page: Page, name: string): Promise<{ id: string; title: string }> {
		const title = `${workerPrefix()} ${name}`;
		const response = await page.request.post('/api/questions/templates', {
			data: {
				type: 'fill_in_blanks',
				title,
				grades: ['T_SPE'],
				level: 2,
				status: 'published',
				delay: 60,
				variations: [
					{
						statement: templateMarkdown('Combien font 2 + 3 ?\n\nRéponse : [_]'),
						blanks: [{ expectedAnswer: '5' }]
					}
				],
				testSpecs: [
					{
						answers: ['5'],
						expected: { status: 'correct' },
						description: 'cinq',
						variables: {},
						variationIndex: 0
					}
				]
			}
		});
		const body = (await response.json()) as { template?: { id: string } };
		expect(response.status(), JSON.stringify(body)).toBe(201);
		return { id: body.template?.id ?? '', title };
	}

	const statusOf = async (id: string): Promise<{ status: string; title: string }> =>
		(
			await sql<{ status: string; title: string }>(
				`select status, title from question_templates where id = $1`,
				[id]
			)
		)[0];

	test('#2489 — la page d’un modèle publié propose « Enregistrer » et « Repasser en brouillon » (plus « Publier ») ; Enregistrer garde le modèle publié et la modification, sans alerte « réponse manquante » ; un refus du serveur s’affiche sous le formulaire ; « Repasser en brouillon » rend « Publier »', async ({
		page
	}) => {
		await login(page, ADMIN.email, ADMIN.password);
		const model = await publishedModel(page, '2489 publie');
		await page.goto(`/dashboard/admin/questions/${model.id}/edit`);
		await page.waitForLoadState('networkidle');

		// Les boutons d'un modèle publié
		await expect(page.getByRole('button', { name: 'Enregistrer', exact: true })).toBeVisible({
			timeout: 30_000
		});
		await expect(
			page.getByRole('button', { name: 'Repasser en brouillon', exact: true })
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Publier', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Enregistrer brouillon' })).toHaveCount(0);

		// Une modification de détail, puis « Enregistrer » : publié, modification gardée, aucune alerte
		const renamed = `${model.title} modifié`;
		const titleField = page.getByRole('textbox', { name: /^Titre/ }).first();
		await titleField.fill(renamed);
		await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
		await expect
			.poll(async () => (await statusOf(model.id)).title, { timeout: 30_000 })
			.toBe(renamed);
		expect((await statusOf(model.id)).status, 'reste publié').toBe('published');
		await expect(page.getByText(/réponse manquante/i)).toHaveCount(0);
		await expect(page.getByText('Erreurs à corriger')).toHaveCount(0);
		await shot(page, '2489-enregistre');

		// Un refus du serveur : la réponse attendue passe de 5 à 6 (en mode JSON), le test « cinq » devient rouge
		// → le serveur refuse l'enregistrement et ses raisons s'affichent sous le formulaire
		// Après l'enregistrement la page renvoie à la liste : on rouvre le modèle
		await page.waitForURL((url) => url.pathname === '/dashboard/admin/questions');
		await page.goto(`/dashboard/admin/questions/${model.id}/edit`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('textbox', { name: /^Titre/ }).first()).toHaveValue(renamed);
		await page.getByRole('button', { name: 'JSON', exact: true }).click();
		const editor = page.locator('.cm-content').first();
		await expect(editor).toContainText('expectedAnswer', { timeout: 15_000 });
		// L'éditeur de code (CodeMirror) : on y remplace la réponse attendue par une transaction
		const replaced = await editor.evaluate((element) => {
			type Editor = {
				state: { doc: { toString(): string } };
				dispatch(spec: { changes: { from: number; to: number; insert: string } }): void;
			};
			const holder = element as unknown as {
				cmView?: { view?: Editor };
				cmTile?: { view?: Editor; root?: { view?: Editor } };
			};
			const view = holder.cmView?.view ?? holder.cmTile?.view ?? holder.cmTile?.root?.view;
			if (!view) return false;
			const text = view.state.doc.toString();
			const old = '"expectedAnswer": "5"';
			const at = text.indexOf(old);
			if (at < 0) return false;
			view.dispatch({
				changes: { from: at, to: at + old.length, insert: '"expectedAnswer": "6"' }
			});
			return true;
		});
		expect(replaced, 'la réponse attendue de l’éditeur JSON est remplacée').toBe(true);
		await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
		await expect(page.getByText('Erreurs à corriger')).toBeVisible({ timeout: 30_000 });
		await shot(page, '2489-refus');
		// Rien n'est enregistré par un refus : toujours publié, avec sa réponse d'origine
		const after = await sql<{
			status: string;
			variations: Array<{ blanks?: Array<{ expectedAnswer: string }> }>;
		}>(`select status, variations from question_templates where id = $1`, [model.id]);
		expect(after[0].status, 'toujours publié après le refus').toBe('published');
		expect(after[0].variations[0].blanks?.[0]?.expectedAnswer, 'réponse d’origine gardée').toBe(
			'5'
		);

		// « Repasser en brouillon » (confirmation) : le brouillon propose « Publier »
		await page.getByRole('button', { name: 'Repasser en brouillon', exact: true }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Repasser en brouillon' }).click();
		await expect
			.poll(async () => (await statusOf(model.id)).status, { timeout: 30_000 })
			.toBe('draft');
		await expect(page.getByRole('button', { name: 'Publier', exact: true })).toBeVisible({
			timeout: 30_000
		});
		await expect(page.getByRole('button', { name: 'Enregistrer brouillon' })).toBeVisible();
	});
});

// ============================================================================
// #2492 — liste des modèles (admin)
// ============================================================================

test.describe('#2492 — liste admin des modèles', { tag: '@bureau' }, () => {
	test.beforeEach(() => sql(ELEVATION_LIMITS));
	test.afterAll(() => sql(ELEVATION_LIMITS));

	const FILTERED = '/dashboard/admin/questions?grades=1_SPE&minLevel=6&maxLevel=6';
	/** Les modèles que ces filtres gardent, lus en base (brouillons et publiés) */
	const expected = (search?: string) =>
		sql<{ id: string; title: string; status: string }>(
			`select id::text, title, status from question_templates
			  where '1_SPE' = any(grades) and level between 6 and 6
			    and ($1::text is null or title ilike '%' || $1 || '%' or id::text like $1 || '%')`,
			[search ?? null]
		);

	async function shown(page: Page): Promise<string[]> {
		return page
			.locator('tbody tr:has([role="checkbox"])')
			.evaluateAll((rows) =>
				rows.map((row) =>
					(row.querySelectorAll('td')[2]?.textContent ?? '').replace(/\s+/g, ' ').trim()
				)
			);
	}

	const countOf = async (page: Page): Promise<number> => {
		const text = (await page.locator('#contenu-principal').innerText()).match(
			/(\d+) templates? trouvés?/
		);
		return text ? Number(text[1]) : -1;
	};

	test('#2492 — prof non élevé : la liste filtrée mène à l’élévation puis revient FILTRÉE ; recherche sans la casse, par début d’identifiant (8 caractères), « 2024 » dans les titres seulement ; « Tout cocher (filtrés) » ne coche que les résultats', async ({
		page
	}) => {
		const all = await sql<{ n: string }>(`select count(*)::text n from question_templates`);
		const filtered = await expected();
		expect(filtered.length, 'des modèles 1re spé niveau 6 en base').toBeGreaterThan(5);
		expect(filtered.length, 'les filtres réduisent la liste').toBeLessThan(Number(all[0].n) / 10);

		await login(page, TEACHER.email, TEACHER.password);
		await page.goto(FILTERED);
		await page.waitForURL(/\/dashboard\/elevate/);
		// L'adresse d'origine, filtres compris, voyage avec l'élévation
		expect(decodeURIComponent(new URL(page.url()).searchParams.get('redirect') ?? '')).toBe(
			FILTERED
		);
		await page.waitForLoadState('networkidle');
		await page.locator('input[type="password"]').fill(ADMIN.password);
		await page.locator('button[type="submit"]').click();
		await page.waitForURL((url) => url.pathname === '/dashboard/admin/questions');
		await page.waitForLoadState('networkidle');

		// Revenu FILTRÉ : l'adresse garde ses filtres, la liste ne montre que les modèles du filtre
		const url = new URL(page.url());
		expect([
			url.searchParams.get('grades'),
			url.searchParams.get('minLevel'),
			url.searchParams.get('maxLevel')
		]).toEqual(['1_SPE', '6', '6']);
		await expect.poll(() => countOf(page), { timeout: 30_000 }).toBe(filtered.length);
		await expect(page.getByText('Page 1 sur 1')).toBeVisible();
		expect((await shown(page)).length, 'une ligne par modèle').toBe(filtered.length);
		await shot(page, '2492-filtre');

		const search = page.getByLabel("Titre ou début d'identifiant");
		const apply = page.getByRole('button', { name: 'Appliquer les filtres' });
		const searchFor = async (text: string, count: number): Promise<void> => {
			await search.fill(text);
			await apply.click();
			await expect.poll(() => countOf(page), { timeout: 30_000 }).toBe(count);
		};

		// Un mot du titre, sans tenir compte de la casse
		const word = 'SUITE';
		const byWord = await expected(word);
		expect(byWord.length, 'le mot est dans au moins un titre').toBeGreaterThan(0);
		await searchFor(word, byWord.length);
		for (const title of await shown(page)) {
			expect(title.toLowerCase(), `« ${title} » contient « suite »`).toContain('suite');
		}
		await shot(page, '2492-recherche-suite');

		// Le début d'identifiant (8 caractères) du modèle « variations lu sur la courbe »
		await searchFor('7f82d15a', 1);
		expect((await shown(page))[0]).toContain('Dresser le tableau de variations');

		// « 2024 » : seulement les titres (aucune date, aucun identifiant n'est cherché)
		const byYear = await expected('2024');
		await searchFor('2024', byYear.length);
		for (const title of await shown(page)) expect(title).toContain('2024');

		// « Tout cocher (filtrés) » : ne coche que les résultats de la recherche, dans l'onglet ouvert (jamais les
		// autres pages ni la base) ; l'onglet « Publiés » est celui de la liste
		await searchFor(word, byWord.length);
		const published = page.getByRole('tabpanel', { name: 'Publiés' });
		const expectedChecked = byWord.filter((m) => m.status === 'published').length;
		expect(expectedChecked, 'des résultats publiés').toBeGreaterThan(0);
		await published.getByText('Tout cocher (filtrés)').click();
		const rows = published.locator('tbody tr:has([role="checkbox"])');
		await expect(rows).toHaveCount(expectedChecked);
		const checked = await rows
			.getByRole('checkbox')
			.evaluateAll((boxes) =>
				boxes.map(
					(box) =>
						box.getAttribute('aria-checked') === 'true' ||
						box.getAttribute('data-state') === 'checked'
				)
			);
		expect(checked.every(Boolean), 'toutes les cases des résultats cochées').toBe(true);
		await expect(
			page.getByRole('button', {
				name: new RegExp(`Repasser en brouillon \\(${expectedChecked}\\)`)
			})
		).toBeVisible();
		await shot(page, '2492-tout-cocher');
	});
});

// ============================================================================
// #2509 — évaluation de rattrapage : second degré
// ============================================================================

test.describe('#2509 — évaluation de rattrapage', { tag: '@bureau' }, () => {
	test('#2509 — la fiche : les trois exercices dans l’ordre, durée, pas de points ; PDF : en-tête d’évaluation sans points, figures du dauphin et du massif, corrigés ; version anglaise', async ({
		page
	}) => {
		const [row] = await sql<{
			estimated_duration_minutes: number | null;
			translations: { en?: { title?: string } } | null;
		}>(`select estimated_duration_minutes, translations from worksheets where id = $1`, [
			RATTRAPAGE_ID
		]);
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto(`/dashboard/teacher/contenu/worksheets/${RATTRAPAGE_ID}`);
		await page.waitForLoadState('networkidle');
		const main = (await page.locator('#contenu-principal').innerText()).replace(/\s+/g, ' ');
		const order = ['Le saut du dauphin', 'Le massif de fleurs', "L'atelier de bougies"].map((t) =>
			main.indexOf(t, main.indexOf('3 Corvée'))
		);
		expect(
			order.every((i) => i >= 0),
			'les trois exercices sont listés'
		).toBe(true);
		expect(
			[...order].sort((a, b) => a - b),
			'dans l’ordre dauphin, massif, bougies'
		).toEqual(order);
		// La durée affichée est celle de la base (la ligne disait 40 min ; la fiche a été éditée depuis)
		expect(main).toContain(`${row.estimated_duration_minutes} min`);
		await expectNoHorizontalOverflow(page, 'fiche de rattrapage');

		// PDF de l'évaluation : en-tête d'évaluation, sans points affichés
		const fiche = await savePdfOf(page, 'Fiche', 'paquet6-rattrapage-fr.pdf');
		pdfToPng(fiche, 'paquet6-rattrapage-fr', 70);
		const text = pdfText(fiche).join('\n');
		expect(text).toContain('Évaluation de rattrapage : second degré');
		expect(text).toMatch(/Nom\s*:/);
		expect(text).toMatch(/Date\s*:/);
		expect(text).toMatch(/Classe\s*:/);
		expect(text).toContain('La calculatrice est interdite.');
		expect(text, 'aucun point affiché').not.toMatch(/\bpts?\b|points?\s*\)|\/\s*\d+\s*points?/i);
		// Les figures du dauphin (colonne 1, sous son énoncé) et du massif (haut de la colonne 2) : de l'encre
		// posée, dont des couleurs (eau, parabole, carré vert) ; les repères des figures sont tracés, pas écrits
		const { pages } = pdfBoxes(fiche);
		const middle = pages[0].width / 2;
		const raster = rasterPage(fiche, 1, 100);
		const colored = (r: number, g: number, b: number): boolean =>
			Math.max(r, g, b) - Math.min(r, g, b) > 40;
		const dauphinZone = { left: 20, top: 295, right: middle - 6, bottom: 445 };
		const massifZone = { left: middle + 6, top: 190, right: pages[0].width - 20, bottom: 370 };
		const dauphin = inkBox(raster, isInk, dauphinZone);
		expect(dauphin && dauphin.bottom - dauphin.top > 60, 'dauphin : un dessin sous l’énoncé').toBe(
			true
		);
		expect(
			share(raster, colored, dauphinZone),
			'dauphin : la figure est en couleurs'
		).toBeGreaterThan(0.01);
		const massif = inkBox(raster, isInk, massifZone);
		expect(
			massif && massif.bottom - massif.top > 100,
			'massif : un dessin en haut de la colonne 2'
		).toBe(true);
		expect(
			share(raster, colored, massifZone),
			'massif : la figure est en couleurs'
		).toBeGreaterThan(0.05);

		// Corrigé : les trois exercices avec leur solution
		await page.goto(`/dashboard/teacher/contenu/worksheets/${RATTRAPAGE_ID}`);
		await page.waitForLoadState('networkidle');
		const corrige = await savePdfOf(page, 'Corrigé', 'paquet6-rattrapage-corrige.pdf');
		// Deux colonnes : l'ordre de lecture du fichier (une colonne après l'autre), pas la mise en page
		const solutions = pdfRawText(corrige).join('\n').replace(/\s+/g, ' ');
		expect(solutions).toMatch(/CORRECTION/);
		for (const title of ['Le saut du dauphin', 'Le massif de fleurs', 'L’atelier de bougies']) {
			expect(solutions, `« ${title} » au corrigé`).toContain(title);
		}
		expect(solutions, 'solution du dauphin (maximum)').toMatch(/4,5/);
		expect(solutions, 'solution du massif (3 m et 7 m)').toMatch(/3\s*m\s*et\s*7\s*m/);
		expect(solutions, 'solution des bougies (bénéfice maximal)').toMatch(/128/);

		// Version anglaise : l'en-tête, la consigne et les énoncés sont en anglais
		const en = await englishPdf(page);
		const textEn = pdfText(en).join('\n');
		expect(textEn).toMatch(/Surname\s*:/);
		expect(textEn).toMatch(/Class\s*:/);
		expect(textEn).toContain('Calculators are not allowed.');
		expect(textEn).toContain('During a show, a dolphin leaps out of the water');
		expect(textEn, 'plus de consigne française').not.toContain('La calculatrice est interdite.');
		pdfToPng(en, 'paquet6-rattrapage-en', 70);
	});

	test('#2509 — version anglaise, l’en-tête du PDF porte le titre anglais de la fiche (« Retake test: quadratic functions »)', async ({
		page
	}) => {
		// E57 (corrigé) : le schéma de réponse de `GET /api/worksheets/<id>` retirait `translations`, donc
		// l'onglet PDF imprimait le titre français malgré la traduction en base
		const [row] = await sql<{ translations: { en?: { title?: string } } | null }>(
			`select translations from worksheets where id = $1`,
			[RATTRAPAGE_ID]
		);
		const english = row.translations?.en?.title ?? '';
		expect(english, 'titre anglais en base').not.toBe('');
		await login(page, TEACHER.email, TEACHER.password);
		const textEn = pdfText(await englishPdf(page)).join('\n');
		// Le PDF anglais est bien celui lu (sinon un PDF vide passerait pour l'écart)
		expect(textEn).toContain('Calculators are not allowed.');
		expect(textEn, 'titre anglais imprimé').toContain(english);
	});
});

/** Le PDF anglais de l'évaluation, par l'onglet PDF (langue d'impression « English ») */
async function englishPdf(page: Page): Promise<string> {
	await page.goto(`/dashboard/teacher/contenu/worksheets/${RATTRAPAGE_ID}`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('tab', { name: 'PDF' }).click();
	await chooseOption(page, "Langue d'impression", 'English');
	return savePdf(page, 'Telecharger', 'paquet6-rattrapage-en.pdf');
}

/** Le PDF `kind` (« Fiche », « Corrigé ») de la fiche ouverte, par l'onglet PDF */
async function savePdfOf(page: Page, kind: string, saveAs: string): Promise<string> {
	await page.getByRole('tab', { name: 'PDF' }).click();
	await chooseOption(page, 'PDF à générer', kind);
	return savePdf(page, 'Telecharger', saveAs);
}
