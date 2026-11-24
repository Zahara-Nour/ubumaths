import { expect, test, type Page } from '@playwright/test';
import { buildSeriesLink, type SeriesItem } from '../../src/lib/validation/series';
import { allowClipboard, readClipboard } from './helpers/atelier';
import { ADMIN, login, sql, TEACHER } from './helpers/carnet';
import { gotoSettled, shoot } from './helpers/pages';

/**
 * Automaths, « Ma série » et séries du prof — paquet 5 du tri (ADR 0035 : séries sur le modèle)
 * ===========================================================================================
 *
 * Reprend les lignes #2385, #2380, #2378, #2382, #2369, #2376, #2377 de
 * `docs/wip/verifications-manuelles.md` (ajoutées du 3 au 5 novembre).
 *
 * Pages publiques (catalogue, « Ma série », lien de série, formes de test) : jouables contre la
 * prod (`VERIFS_URL=https://chiph.re`) ; les tests marqués « base locale » se sautent alors.
 *
 * Attendus changés par une décision écrite depuis : le panier s'appelle « Ma série »
 * (`921719ffa3`, 2026-11-19 : le message devient « Série d'une ancienne version vidée. ») ;
 * « Entraînement » n'existe plus dans le choix de la forme (formes : En classe, Contrôle blanc,
 * Course aux nombres, Flash-cards, Saisie) ; le catalogue a pris la colonne des notions et les
 * sections de sous-notion (`364e64fb88`, 2026-11-18) à la place des onglets.
 */

// Constantes

const SHOTS = 'automaths-series';
const LOCAL = process.env.VERIFS_URL === undefined;
const CART_KEY = 'chiphre_question_cart';
/** « Opérations sur les limites » et « Limite en un point : dénominateur… » (T spé, niveau 2) */
const LIMITS: SeriesItem[] = [
	{ templateId: '07bce646-6a88-4b7c-aaf6-fe07ffa63ed6', quantity: 5, delay: 20 },
	{ templateId: '04ec9518-1d43-461c-beb0-aa38d62b6835', quantity: 5, delay: 20 }
];
/** Branche où deux majuscules collées désignent un produit */
const MATRICES_BRANCH = 'Matrices';

// Variables

let createdIds: string[] = [];

// Functions

const projectName = (): string => test.info().project.name;
const isPhone = (): boolean => test.info().project.use.isMobile === true;

/** Met une série dans « Ma série » (localStorage) avant le premier chargement de la page */
async function seedCart(page: Page, value: unknown): Promise<void> {
	await page.addInitScript(
		([key, json]) => {
			if (!sessionStorage.getItem('verifs-seeded')) {
				localStorage.setItem(key, json);
				sessionStorage.setItem('verifs-seeded', '1');
			}
		},
		[CART_KEY, JSON.stringify(value)] as const
	);
}

async function cartItems(page: Page): Promise<unknown[]> {
	return page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[],
		CART_KEY
	);
}

function templateIds(items: unknown[]): string[] {
	return items.map((item) => (item as { templateId: string }).templateId);
}

test.afterEach(async () => {
	if (createdIds.length > 0) {
		await sql(`delete from question_templates where id = any($1::uuid[])`, [createdIds]);
	}
	createdIds = [];
});

// Tests

test.describe('#2385 — ancienne forme retirée', () => {
	test('#2385 — un ancien lien `?categories=…` affiche le message de l’ancienne version', async ({
		page
	}) => {
		await gotoSettled(page, '/automaths/panier?categories=%5B%7B%22category%22%3A%22x%22%7D%5D');
		await expect(
			page.getByText("Ce lien vient d'une ancienne version de Chiphre et ne peut plus être ouvert.")
		).toBeVisible();
	});

	test('#2385 — une ancienne série (lignes `category`) est vidée au premier chargement, avec son message', async ({
		page
	}) => {
		await seedCart(page, [
			{ category: 'Calcul', quantity: 2, delay: 20 },
			{ category: 'Fractions', quantity: 1, delay: 20 }
		]);
		// Le message est passager : on le guette dès le chargement, sans attendre le réseau.
		// Émis avant le montage du Toaster, il doit quand même s'afficher.
		await page.goto('/automaths', { waitUntil: 'commit' });
		await expect(page.getByText("Série d'une ancienne version vidée.")).toBeVisible();
		expect(await cartItems(page)).toEqual([]);
	});
});

test.describe('#2380 — séries sur le modèle (ADR 0035)', () => {
	test('#2380 — deux modèles ajoutés depuis le catalogue, « Copier le lien » (sans forme) : `?modeles=` remplit « Ma série » d’un autre navigateur', async ({
		page,
		browser
	}) => {
		await gotoSettled(page, '/automaths');
		const adds = page.getByRole('button', { name: 'Ajouter à ma série' }).locator('visible=true');
		await adds.nth(0).click();
		await adds.nth(1).click();
		await expect.poll(async () => (await cartItems(page)).length).toBe(2);
		const ids = templateIds(await cartItems(page));

		await gotoSettled(page, '/automaths/panier');
		await allowClipboard(page);
		await page.getByRole('button', { name: 'Copier le lien' }).click();
		const url = new URL(await readClipboard(page));
		expect(url.pathname).toBe('/automaths/panier');
		expect(url.searchParams.has('modeles')).toBe(true);
		expect(url.searchParams.has('categories')).toBe(false);

		// Un autre navigateur : contexte neuf, « Ma série » vide
		const other = await browser.newContext(test.info().project.use);
		const otherPage = await other.newPage();
		try {
			await gotoSettled(otherPage, `${url.pathname}${url.search}`);
			await expect.poll(async () => templateIds(await cartItems(otherPage))).toEqual(ids);
			await expect(otherPage.getByText('Modèle retiré')).toHaveCount(0);
			await shoot(otherPage, `${SHOTS}-2380-lien-recu`, projectName());
		} finally {
			await other.close();
		}
	});

	test('#2380 — base locale : les séries du prof s’ouvrent dans l’éditeur, aucun « Modèle retiré »', async ({
		page
	}) => {
		test.skip(!LOCAL, 'base locale');
		test.setTimeout(180_000);
		const rows = await sql<{ id: string; title: string }>(
			// Séries dont tous les modèles sont publiés (un brouillon est « Modèle retiré », voulu)
			`select s.id::text, s.title from series s join auth.users u on u.id = s.created_by
			 where u.email = $1 and not exists (
			   select 1 from jsonb_array_elements(s.items) e
			   left join question_templates qt on qt.id::text = e->>'templateId'
			   where qt.status is distinct from 'published')
			 order by s.title limit 6`,
			[TEACHER.email]
		);
		expect(rows.length).toBeGreaterThanOrEqual(5);
		await login(page, TEACHER.email, TEACHER.password);
		for (const row of rows) {
			await gotoSettled(page, `/dashboard/teacher/series/${row.id}/edit`);
			// Le titre du premier modèle de la série s'affiche (pas un identifiant ni « Modèle retiré »)
			const [first] = await sql<{ title: string }>(
				`select qt.title from series s, jsonb_array_elements(s.items) with ordinality e(item, n)
				 join question_templates qt on qt.id::text = e.item->>'templateId'
				 where s.id = $1 order by e.n limit 1`,
				[row.id]
			);
			await expect(page.getByText(first.title, { exact: false }).first()).toBeVisible();
			await expect(page.getByText('Modèle retiré')).toHaveCount(0);
		}
	});
});

test.describe('#2378 — /automaths rangé selon l’arbre', () => {
	test('#2378 — colonne des notions, sections de sous-notion dans l’ordre de l’arbre ; aucun ancien sous-domaine', async ({
		page
	}) => {
		await gotoSettled(page, '/automaths');
		// Ordinateur : colonne des notions par branche ; téléphone : un menu « Notion : … »
		if (isPhone()) {
			await expect(page.getByText(/^Notion : .+ · \d+$/).first()).toBeVisible();
		} else {
			const notions = page.getByRole('navigation', { name: 'Notions', exact: true });
			await expect(notions.getByRole('button', { name: /^Nombres et calculs/ })).toBeVisible();
		}
		const subnotions = page.getByRole('navigation', { name: 'Sous-notions' });
		await expect(subnotions).toBeVisible();
		if (LOCAL) {
			const notionName = (await page.getByRole('heading', { level: 2 }).first().innerText()).trim();
			const expected = await sql<{ name: string }>(
				`select c.name from classification_nodes c join classification_nodes n on n.id = c.parent_id
				 where n.name = $1 and c.archived_at is null order by c.position`,
				[notionName]
			);
			const shown = await subnotions
				.getByRole('button')
				.evaluateAll((buttons) =>
					buttons.map((button) =>
						(button.textContent ?? '').replace(/([\s,]*\d+(\s*questions?)?)+\s*$/, '').trim()
					)
				);
			expect(shown.length).toBeGreaterThan(1);
			// Les sous-notions montrées gardent l'ordre de l'arbre (`position`)
			const order = expected.map((row) => row.name);
			expect(
				shown.every((name) => order.includes(name)),
				shown.join(' | ')
			).toBe(true);
			expect([...shown].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(shown);
		}
		await shoot(page, `${SHOTS}-2378-catalogue`, projectName());
	});
});

test.describe('#2369 #2377 — série des limites et lancer d’un clic', () => {
	test('#2369 — « Ma série » des limites (T spé) : chaque modèle a son aperçu, aucun « Aperçu indisponible »', async ({
		page
	}) => {
		await seedCart(page, LIMITS);
		await gotoSettled(page, '/automaths/panier');
		await expect(page.getByText('Opérations sur les limites').first()).toBeVisible();
		await expect(page.getByText(/Limite en un point/).first()).toBeVisible();
		await expect(page.getByText('Aperçu indisponible')).toHaveCount(0);
		await shoot(page, `${SHOTS}-2369-panier`, projectName());
	});

	test('#2369 — la série se joue en entier : 10 questions, aucune sautée', async ({ page }) => {
		await gotoSettled(page, buildSeriesLink('', LIMITS, { mode: 'typing', seed: 2369 }));
		test.setTimeout(240_000);
		const card = page.getByTestId('typing-card');
		const validate = page.getByRole('button', { name: 'Valider' });
		for (let n = 1; n <= 10; n++) {
			await card.locator('.flip-card-front').waitFor();
			// Compteur sans trou : la question n° n suit la n-1
			await expect(page.getByTestId('typing-position')).toHaveText(
				new RegExp(`^Question ${n} / 10$`)
			);
			// Une réponse quelconque : on joue la série, on ne la réussit pas. MathLive perd parfois la
			// première frappe : on recommence tant que « Valider » reste grisé
			const field = card.locator('math-field').first();
			const radio = card.locator('.flip-card-front').getByRole('radio').first();
			for (let attempt = 1; attempt <= 3 && !(await validate.isEnabled()); attempt++) {
				if ((await field.count()) > 0) {
					await field.scrollIntoViewIfNeeded();
					const box = await field.boundingBox();
					await field.click({ position: { x: Math.max(5, (box?.width ?? 20) - 15), y: 10 } });
					await page.waitForTimeout(500);
					await page.keyboard.type('7', { delay: 80 });
				} else await radio.click();
				const close = page.locator('.math-keyboard-close');
				if ((await close.count()) > 0) await close.click();
			}
			await validate.click();
			await page.locator('[data-typing-next]').click();
		}
		// Dix questions vues, une par une : l'écran de fin, pas une onzième
		await expect(page.getByTestId('typing-summary')).toBeVisible();
		await expect(page.getByText('Série terminée')).toBeVisible();
		await expect(page.getByTestId('typing-position')).toHaveCount(0);
	});

	for (const form of ['En classe', 'Contrôle blanc', 'Flash-cards', 'Saisie'] as const) {
		test(`#2377 — « Commencer un test » puis un clic sur « ${form} » lance la série aussitôt`, async ({
			page
		}) => {
			await seedCart(page, LIMITS);
			await gotoSettled(page, '/automaths/panier');
			await page.getByRole('button', { name: /Commencer un test/ }).click();
			await page.getByRole('dialog').getByText(form, { exact: true }).click();
			await expect(page).toHaveURL(/\/automaths\/test\?/);
		});
	}

	test('#2377 — « Course aux nombres » affiche le temps, puis « Commencer le test » la lance ; le bouton se rejoint en défilant', async ({
		page
	}) => {
		await seedCart(page, LIMITS);
		await gotoSettled(page, '/automaths/panier');
		await page.getByRole('button', { name: /Commencer un test/ }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByText('Course aux nombres', { exact: true }).click();
		await expect(page).toHaveURL(/\/automaths\/panier/);
		const start = dialog.getByRole('button', { name: 'Commencer le test' });
		await start.scrollIntoViewIfNeeded();
		await expect(start).toBeInViewport();
		await shoot(page, `${SHOTS}-2377-course`, projectName());
		await start.click();
		await expect(page).toHaveURL(/\/automaths\/test\?.*mode=course/);
	});
});

test.describe('#2376 — Automaths rapide', () => {
	test('#2376 — catalogue → « Ma série » → catalogue sans relire les modèles', async ({ page }) => {
		await seedCart(page, LIMITS);
		const templateCalls: string[] = [];
		page.on('request', (request) => {
			if (/question_templates|\/api\/questions\/templates/.test(request.url())) {
				templateCalls.push(request.url());
			}
		});
		// Temps jusqu'à la première tuile jouable (« Ajouter à ma série ») : ~2 s attendues
		// (7 à 11 s avant #2376) ; plafond large à 5 s pour ne pas dépendre du réseau du jour
		const started = Date.now();
		await page.goto('/automaths', { waitUntil: 'commit' });
		await page.getByRole('button', { name: 'Ajouter à ma série' }).first().waitFor();
		const readyMs = Date.now() - started;
		test
			.info()
			.annotations.push({ type: 'durée', description: `/automaths prêt en ${readyMs} ms` });
		expect(readyMs).toBeLessThan(5000);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('navigation', { name: 'Sous-notions' })).toBeVisible();
		const afterFirst = templateCalls.length;
		// Le catalogue a bien lu ses modèles au premier chargement (sinon le test ne prouve rien)
		expect(afterFirst).toBeGreaterThan(0);
		// Téléphone : la barre « Ma série · … » en bas ouvre le panneau ; ordinateur : la colonne
		if (isPhone()) await page.getByRole('button', { name: /^Ma série · / }).click();
		await page
			.getByRole('link', { name: 'Ouvrir ma série' })
			.locator('visible=true')
			.first()
			.click();
		await expect(page).toHaveURL(/\/automaths\/panier/);
		await page.waitForLoadState('networkidle');
		await page.goBack();
		await expect(page.getByRole('navigation', { name: 'Sous-notions' })).toBeVisible();
		await page.waitForLoadState('networkidle');
		expect(templateCalls.slice(afterFirst), 'requêtes de modèles après le 1er chargement').toEqual(
			[]
		);
	});
});

test.describe('#2382 — éditeur de modèle rangé par l’arbre (base locale)', () => {
	test.skip(!LOCAL, 'base locale');

	test('#2382 — sous Matrices, « AB » = « un produit » posé à l’enregistrement et relu à la réouverture ; ni thème ni domaine', async ({
		page
	}) => {
		const [node] = await sql<{ id: string }>(
			`select n.id::text from classification_nodes n join classification_nodes b on b.id = n.parent_id
			 where b.name = $1 and n.kind = 'notion' and n.archived_at is null order by n.position limit 1`,
			[MATRICES_BRANCH]
		);
		await login(page, ADMIN.email, ADMIN.password);
		const response = await page.request.post('/api/questions/templates', {
			data: {
				type: 'fill_in_blanks',
				title: `Verifs5 ${projectName()} 2382 AB`,
				grades: ['T_SPE'],
				level: 2,
				status: 'draft',
				delay: 60,
				classification_node_id: node.id,
				variations: [{ statement: 'Calcule $AB$ : [[1]]' }]
			}
		});
		const body = (await response.json()) as { template?: { id: string } };
		expect(response.status(), JSON.stringify(body)).toBe(201);
		const id = body.template?.id ?? '';
		createdIds.push(id);

		await gotoSettled(page, `/dashboard/admin/questions/${id}/edit`);
		await expect(page.getByRole('combobox', { name: /^Branche/ })).toContainText(MATRICES_BRANCH);
		await expect(page.getByRole('combobox', { name: /^(Thème|Domaine)/ })).toHaveCount(0);
		const capital = page.getByRole('combobox', { name: /Deux majuscules collées/ });
		await expect(capital).toContainText(/produit/);
		await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
		await expect
			.poll(async () => {
				const [row] = await sql<{ cp: string | null }>(
					`select shared->>'capitalPairs' cp from question_templates where id = $1`,
					[id]
				);
				return row?.cp ?? null;
			})
			.toBe('product');
		await gotoSettled(page, `/dashboard/admin/questions/${id}/edit`);
		await expect(page.getByRole('combobox', { name: /Deux majuscules collées/ })).toContainText(
			/produit/
		);
		await shoot(page, `${SHOTS}-2382-editeur`, projectName());
	});
});
