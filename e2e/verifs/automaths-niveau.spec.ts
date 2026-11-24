import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

/**
 * `/automaths` — filtre par niveau — ligne #2566 du tri (paquet 6)
 * ================================================================
 *
 * Page publique, sans compte : jouable contre la prod (`VERIFS_URL=https://chiph.re`).
 *
 *   VERIFS_PORT=5179 pnpm test:verifs e2e/verifs/automaths-niveau.spec.ts
 *   VERIFS_URL=https://chiph.re pnpm test:verifs e2e/verifs/automaths-niveau.spec.ts
 *
 * Les attendus se calculent sur la liste publique des modèles (`/api/questions/templates/all`)
 * lue par le test lui-même : pour un niveau, les branches et notions qui ont au moins un modèle
 * de ce niveau, chacune avec son nombre de questions. Le test ne réutilise pas le filtre de
 * l'application : il recompte à la main, d'après les niveaux écrits sur chaque modèle.
 *
 * Au téléphone, la colonne des notions devient un menu : ces tests sont `@bureau`.
 */

// Types

interface Node {
	id: string;
	kind: 'branch' | 'notion' | 'subnotion';
	name: string;
	parent_id: string | null;
}

interface Catalogue {
	templates: { id: string; grades: string[] | null; classification_node_id: string | null }[];
	nodes: Node[];
}

/** Branches et notions attendues : nom → nombre de questions, et pour chaque branche ses notions */
interface Expected {
	total: number;
	branches: Map<string, { count: number; notions: Map<string, number> }>;
}

// Constantes

/** Niveaux d'un niveau et des niveaux inférieurs, d'après l'arbre des prérequis (1re techno : par la 2de, pas par la 1re spé) */
const LOWER = {
	'6': ['6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP'],
	'1_TECHNO': ['1_TECHNO', '2', '3', '4', '5', '6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']
} as const;

// Functions

/**
 * Ouvre `/automaths` (ou recharge la page) et rend la liste des modèles TELLE QUE LA PAGE L'A REÇUE :
 * d'autres vérifications créent et suppriment des modèles en même temps, une seconde lecture
 * pourrait différer de ce que la page montre.
 */
async function openCatalogue(page: Page, reload = false): Promise<Catalogue> {
	let received: Catalogue | null = null;
	// La page reçoit la réponse que le test lit : une seule requête, donc le même contenu
	const handler = async (route: Route) => {
		const response = await route.fetch();
		const body = await response.text();
		received = JSON.parse(body) as Catalogue;
		await route.fulfill({ response, body });
	};
	await page.route('**/api/questions/templates/all', handler);
	try {
		if (reload) await page.reload();
		else await page.goto('/automaths');
		await expect.poll(() => received !== null, { timeout: 30_000 }).toBe(true);
		await page.waitForLoadState('networkidle');
	} finally {
		await page.unroute('**/api/questions/templates/all', handler);
	}
	return received as unknown as Catalogue;
}

/** Les branches et notions qui ont au moins un modèle d'un de ces niveaux (`null` : tous les niveaux) */
function expectedFor(catalogue: Catalogue, grades: readonly string[] | null): Expected {
	const byId = new Map(catalogue.nodes.map((node) => [node.id, node]));
	const up = (id: string | null, kind: Node['kind']): Node | null => {
		let node = id ? (byId.get(id) ?? null) : null;
		while (node && node.kind !== kind)
			node = node.parent_id ? (byId.get(node.parent_id) ?? null) : null;
		return node;
	};
	const expected: Expected = { total: 0, branches: new Map() };
	for (const template of catalogue.templates) {
		if (grades && !(template.grades ?? []).some((grade) => grades.includes(grade))) continue;
		expected.total += 1;
		const branch = up(template.classification_node_id, 'branch');
		const notion = up(template.classification_node_id, 'notion');
		if (!branch || !notion) continue;
		const entry = expected.branches.get(branch.name) ?? { count: 0, notions: new Map() };
		entry.count += 1;
		entry.notions.set(notion.name, (entry.notions.get(notion.name) ?? 0) + 1);
		expected.branches.set(branch.name, entry);
	}
	return expected;
}

/** « Entiers : numération , 5 questions » → { name, count } */
function parseEntry(label: string): { name: string; count: number } {
	const match = /^(.*?)\s*,\s*(\d+)\s+questions?$/.exec(label.replace(/\s+/g, ' ').trim());
	if (!match) throw new Error(`entrée de la colonne des notions illisible : « ${label} »`);
	return { name: match[1].trim(), count: Number(match[2]) };
}

const notionsNav = (page: Page): Locator =>
	page.getByRole('navigation', { name: 'Notions', exact: true });

/** Les entrées de la colonne des notions : celles du premier niveau (branches), ou les notions d'une branche */
async function columnLabels(page: Page, branch: string | null): Promise<string[]> {
	return notionsNav(page).evaluate((nav, branchName) => {
		// Nom lu dans le bouton, nombre de questions dans sa mention pour lecteur d'écran (« , 5 questions »)
		const labelOf = (button: Element) =>
			`${button.querySelector('span.flex-1')?.textContent ?? ''}${button.querySelector('.sr-only')?.textContent ?? ''}`;
		const isTopLevel = (button: Element) => !button.closest('li')?.parentElement?.closest('li');
		const buttons = [...nav.querySelectorAll('button')];
		if (branchName === null) return buttons.filter(isTopLevel).map(labelOf);
		const top = buttons.find(
			(button) =>
				isTopLevel(button) &&
				/^(.*?)\s*,\s*\d+\s+questions?$/.exec(labelOf(button).replace(/\s+/g, ' ').trim())?.[1] ===
					branchName
		);
		const item = top?.closest('li');
		return item ? [...item.querySelectorAll(':scope ul button')].map(labelOf) : [];
	}, branch);
}

/** Les branches montrées : nom → nombre de questions */
async function shownBranches(page: Page): Promise<Map<string, number>> {
	const labels = await columnLabels(page, null);
	return new Map(
		labels.map((label) => parseEntry(label)).map((entry) => [entry.name, entry.count])
	);
}

/** Les notions de la branche dépliée */
async function shownNotions(page: Page, branch: string): Promise<Map<string, number>> {
	const labels = await columnLabels(page, branch);
	return new Map(
		labels.map((label) => parseEntry(label)).map((entry) => [entry.name, entry.count])
	);
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Choisit un niveau dans le menu « Niveau » */
async function chooseGrade(page: Page, displayName: string): Promise<void> {
	await page.getByRole('combobox', { name: /^Niveau/ }).click();
	await page.getByRole('option', { name: displayName, exact: true }).click();
	await expect(page.getByRole('combobox', { name: `Niveau : ${displayName}` })).toBeVisible();
}

/** Passe à la vue « Notions » (celle qui range par branche et notion) */
async function showNotionsView(page: Page): Promise<void> {
	const toggle = page.getByRole('group', { name: 'Parcourir par' }).getByRole('button', {
		name: 'Notions',
		exact: true
	});
	if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-pressed')) !== 'true') {
		await toggle.click();
	}
	await expect(notionsNav(page)).toBeVisible();
}

/** Ce que la colonne montre = ce qui est attendu : branches, puis notions de chaque branche */
async function expectColumnMatches(page: Page, expected: Expected, label: string): Promise<void> {
	const branches = await shownBranches(page);
	expect(
		Object.fromEntries([...branches].sort()),
		`${label} : branches (nom → nombre de questions)`
	).toEqual(
		Object.fromEntries([...expected.branches].map(([name, entry]) => [name, entry.count]).sort())
	);
	for (const [name, entry] of expected.branches) {
		// Une branche déjà dépliée (la première) se replierait au clic
		const branchButton = notionsNav(page).getByRole('button', {
			name: new RegExp(`^${escapeRegExp(name)} ,`)
		});
		if ((await branchButton.getAttribute('aria-expanded')) !== 'true') {
			// Clic dans la page : la colonne défile avec elle, un clic « à la souris » rate sa cible
			await branchButton.evaluate((button) => (button as HTMLElement).click());
		}
		await expect(branchButton).toHaveAttribute('aria-expanded', 'true');
		const notions = await shownNotions(page, name);
		expect(Object.fromEntries([...notions].sort()), `${label} : notions de « ${name} »`).toEqual(
			Object.fromEntries([...entry.notions].sort())
		);
	}
}

test.describe('#2566 — filtre par niveau de /automaths', { tag: '@bureau' }, () => {
	test('#2566 — « Tous les niveaux » par défaut : menu « Niveau », pas de case « et niveaux inférieurs », toutes les branches', async ({
		page
	}) => {
		test.setTimeout(180_000);
		const catalogue = await openCatalogue(page);
		await expect(page.getByRole('combobox', { name: 'Niveau : tous les niveaux' })).toBeVisible();
		await expect(page.getByRole('checkbox', { name: 'et niveaux inférieurs' })).toHaveCount(0);
		await showNotionsView(page);
		const expected = expectedFor(catalogue, null);
		expect(expected.branches.size).toBeGreaterThan(5);
		const branches = await shownBranches(page);
		expect(Object.fromEntries([...branches].sort())).toEqual(
			Object.fromEntries([...expected.branches].map(([name, entry]) => [name, entry.count]).sort())
		);
	});

	test('#2566 — « 6ème » : seules les branches et notions qui ont des modèles de 6e restent, « et niveaux inférieurs » décochée ; l’adresse porte `?niveau=6`', async ({
		page
	}) => {
		test.setTimeout(300_000);
		const catalogue = await openCatalogue(page);
		await chooseGrade(page, '6ème');
		await showNotionsView(page);
		const lower = page.getByRole('checkbox', { name: 'et niveaux inférieurs' });
		await expect(lower).toBeVisible();
		await expect(lower).not.toBeChecked();
		const params = new URL(page.url()).searchParams;
		expect(params.get('niveau')).toBe('6');
		expect(params.has('inferieurs')).toBe(false);

		const all = expectedFor(catalogue, null);
		const sixth = expectedFor(catalogue, ['6']);
		// Le filtre retire bien quelque chose : moins de questions qu'au total
		expect(sixth.total).toBeGreaterThan(0);
		expect(sixth.total).toBeLessThan(all.total);
		await expectColumnMatches(page, sixth, '6ème seule');
	});

	test('#2566 — cocher « et niveaux inférieurs » : CM2 … CP reviennent ; l’adresse porte `?niveau=6&inferieurs=1` et un rechargement garde le filtre', async ({
		page
	}) => {
		test.setTimeout(300_000);
		const catalogue = await openCatalogue(page);
		await chooseGrade(page, '6ème');
		await showNotionsView(page);
		const sixth = expectedFor(catalogue, ['6']);
		const withLower = expectedFor(catalogue, LOWER['6']);
		// Les niveaux du primaire ajoutent des questions
		expect(withLower.total).toBeGreaterThan(sixth.total);

		await page.getByRole('checkbox', { name: 'et niveaux inférieurs' }).check();
		await expect.poll(() => new URL(page.url()).searchParams.get('inferieurs')).toBe('1');
		expect(new URL(page.url()).searchParams.get('niveau')).toBe('6');
		await expectColumnMatches(page, withLower, '6ème et niveaux inférieurs');

		// Un rechargement garde le filtre : menu, case et colonne
		const reloaded = await openCatalogue(page, true);
		await expect(page.getByRole('combobox', { name: 'Niveau : 6ème' })).toBeVisible();
		await expect(page.getByRole('checkbox', { name: 'et niveaux inférieurs' })).toBeChecked();
		const params = new URL(page.url()).searchParams;
		expect(params.get('niveau')).toBe('6');
		expect(params.get('inferieurs')).toBe('1');
		await showNotionsView(page);
		const branches = await shownBranches(page);
		const reloadedExpected = expectedFor(reloaded, LOWER['6']);
		expect(Object.fromEntries([...branches].sort())).toEqual(
			Object.fromEntries(
				[...reloadedExpected.branches].map(([name, entry]) => [name, entry.count]).sort()
			)
		);
	});

	test('#2566 — « 1re techno » + niveaux inférieurs ne montre pas la 1re spé (les prérequis passent par la 2de)', async ({
		page
	}) => {
		test.setTimeout(300_000);
		const catalogue = await openCatalogue(page);
		await chooseGrade(page, '1ère technologique');
		await page.getByRole('checkbox', { name: 'et niveaux inférieurs' }).check();
		await expect.poll(() => new URL(page.url()).searchParams.get('inferieurs')).toBe('1');
		expect(new URL(page.url()).searchParams.get('niveau')).toBe('1_TECHNO');
		await showNotionsView(page);
		const withLower = expectedFor(catalogue, LOWER['1_TECHNO']);
		// Précondition : des modèles de 1re spé existent, ils sont bien hors du compte attendu
		const onlySpe = catalogue.templates.filter(
			(template) =>
				(template.grades ?? []).includes('1_SPE') &&
				!(template.grades ?? []).some((grade) =>
					(LOWER['1_TECHNO'] as readonly string[]).includes(grade)
				)
		);
		expect(onlySpe.length, 'modèles réservés à la 1re spé').toBeGreaterThan(0);
		await expectColumnMatches(page, withLower, '1re techno et niveaux inférieurs');
	});

	test('#2566 — un niveau sans modèle : « Aucune question pour ce niveau. » (vue « Notions » ; la vue « Programme » montre ses points « Pas encore de question »)', async ({
		page
	}) => {
		test.setTimeout(180_000);
		const catalogue = await openCatalogue(page);
		const emptyGrade = ['T_EXP', 'T_GEN'].find(
			(code) => !catalogue.templates.some((template) => (template.grades ?? []).includes(code))
		);
		expect(emptyGrade, 'un niveau sans modèle parmi T_EXP et T_GEN').toBeDefined();
		const names: Record<string, string> = {
			T_EXP: 'Terminale maths expertes',
			T_GEN: 'Terminale générale'
		};
		await chooseGrade(page, names[emptyGrade!]);
		expect(new URL(page.url()).searchParams.get('niveau')).toBe(emptyGrade);
		// Un niveau qui a un programme s'ouvre sur « Programme » : ses points, sans question
		const toggle = page.getByRole('group', { name: 'Parcourir par' });
		// La Terminale générale n'a pas de programme de maths (tronc commun) : pas de bascule
		if (emptyGrade === 'T_EXP') {
			await expect(toggle).toHaveCount(1);
			await expect(page.getByText('Pas encore de question').first()).toBeVisible();
			await toggle.getByRole('button', { name: 'Notions', exact: true }).click();
		} else {
			await expect(toggle).toHaveCount(0);
		}
		await expect(page.getByText('Aucune question pour ce niveau.')).toBeVisible();
	});
});
