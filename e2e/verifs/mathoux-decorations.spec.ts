import { expect, test, type Locator, type Page } from '@playwright/test';
import { MATHOU_RACES } from '../../src/lib/components/mathoux/mathou-races';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock } from './helpers/verrou';

/**
 * Mathoux : décorations et gidouilles — les vérifications manuelles, sur la base locale
 * =====================================================================================
 *
 * Reprend les lignes #1747 (lunettes et chapeaux), #1725 (colliers), #1704
 * (décorations de panse, achat), #1685/#1689 (gidouilles du travail) et #1681
 * (aucune spirale sur la panse) de `docs/wip/verifications-manuelles.md`.
 *
 *   VERIFS_PORT=5179 pnpm test:verifs mathoux-decorations --project ordi-chrome
 *
 * Élèves utilisés : eleve10, eleve11 et eleve14 (eleve10 à eleve15 seulement).
 * Les tables de leurs lignes sont photographiées avant et remises après
 * (`afterAll`), comme `gamification.spec.ts` ; gidouilles et consentement aussi.
 *
 * Captures : `.captures/verifs/mathoux/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.describe.configure({ mode: 'serial' });

// Constantes

const PASSWORD = 'local-eleve';
const E10 = { email: 'eleve10@local.test', id: '5eed0000-0000-4000-8000-000000000010' };
const E11 = { email: 'eleve11@local.test', id: '5eed0000-0000-4000-8000-000000000011' };
const E13 = { email: 'eleve13@local.test', id: '5eed0000-0000-4000-8000-000000000013' };
const E14 = { email: 'eleve14@local.test', id: '5eed0000-0000-4000-8000-000000000014' };
const ALL_IDS = [E10, E11, E13, E14].map((e) => e.id);
const SHOTS = '.captures/verifs/mathoux';

/** Tables de l'élève photographiées puis remises (clé : `student_id`). */
const SNAPSHOT_TABLES = [
	'student_buddies',
	'student_last_visits',
	'student_mathoux',
	'student_mathou_decorations',
	'student_point_state',
	'student_observable_state'
] as const;
/** Tables où l'on ajoute des lignes : on retire celles créées depuis le début. */
const APPENDED_TABLES = ['skill_attempts', 'gidouilles_activity', 'reward_events'] as const;

/** Catalogue attendu : panse = la ligne #1704 ; colliers, lunettes, chapeaux = `mathou_decoration_catalog` en base (qui débite). */
const PANSE = [
	{ id: 'heart', name: 'Cœur', price: 10 },
	{ id: 'star', name: 'Étoile', price: 10 },
	{ id: 'gidouille', name: 'Petite gidouille', price: 20 },
	{ id: 'cockade', name: 'Cocarde', price: 20 },
	{ id: 'medal', name: 'Médaille de la Grande Passoire', price: 40 },
	{ id: 'coat_of_arms', name: 'Blason', price: 40 }
] as const;
const COLLIERS = [
	{ id: 'bell', name: 'Ruban à grelot', price: 10 },
	{ id: 'bow_tie', name: 'Nœud papillon', price: 10 },
	{ id: 'leather', name: 'Collier de cuir', price: 20 },
	{ id: 'order_chain', name: 'Collier de l’Ordre de la Grande Passoire', price: 40 }
] as const;
const LUNETTES = [
	{ id: 'round_glasses', name: 'Lunettes rondes', price: 10 },
	{ id: 'sunglasses', name: 'Lunettes de soleil', price: 10 },
	{ id: 'monocle', name: 'Monocle', price: 20 },
	{ id: 'pince_nez', name: 'Pince-nez', price: 20 },
	{ id: 'spiral_glasses', name: 'Lunettes à gidouille', price: 40 }
] as const;
const CHAPEAUX = [
	{ id: 'bowler', name: 'Chapeau melon', price: 10 },
	{ id: 'beret', name: 'Béret', price: 10 },
	{ id: 'boater', name: 'Canotier', price: 10 },
	{ id: 'top_hat', name: 'Haut-de-forme', price: 20 },
	{ id: 'pointed_hat', name: 'Chapeau pointu', price: 20 }
] as const;

type Row = 'panse' | 'cou' | 'yeux' | 'tete';
type Slot = 'decoration' | 'collar' | 'glasses' | 'hat';

// Décor

let startedAt = '';
const snapshot = new Map<string, unknown[]>();
let startProfiles: {
	id: string;
	gidouilles: string;
	consent_required: boolean;
	consent_granted_at: string | null;
	consent_grace_period_ends: string | null;
	consent_rule_pending: boolean;
	age_declaration: string | null;
	age_declared_at: string | null;
}[] = [];

let lockHeld = false;

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	// Mêmes élèves que gamification : un seul des deux fichiers à la fois
	await acquireLock('eleves-10-15');
	lockHeld = true;
	startedAt = (await sql<{ now: string }>('select now()::text as now'))[0].now;
	for (const table of SNAPSHOT_TABLES) {
		const rows = await sql<{ r: unknown }>(
			`select to_jsonb(t) as r from ${table} t where student_id = any($1)`,
			[ALL_IDS]
		);
		snapshot.set(
			table,
			rows.map((row) => row.r)
		);
	}
	startProfiles = await sql(
		`select id, gidouilles::text, consent_required, consent_granted_at::text,
		        consent_grace_period_ends::text, consent_rule_pending, age_declaration,
		        age_declared_at::text
		 from profiles where id = any($1)`,
		[ALL_IDS]
	);
	// La question « As-tu 15 ans ou plus ? » (2nde soumise au consentement) cacherait la page :
	// on pose une déclaration, remise en l'état par l'`afterAll`
	await sql(
		`update profiles set age_declaration = '15_plus', age_declared_at = now()
		 where id = any($1) and age_declaration is null`,
		[ALL_IDS]
	);
});

test.afterAll(async () => {
	try {
		await restoreDecor();
	} finally {
		if (lockHeld) releaseLock('eleves-10-15');
	}
});

async function restoreDecor(): Promise<void> {
	if (!startedAt) return;
	for (const table of APPENDED_TABLES) {
		await sql(`delete from ${table} where student_id = any($1) and created_at >= $2`, [
			ALL_IDS,
			startedAt
		]);
	}
	for (const table of SNAPSHOT_TABLES) {
		// Table pas photographiée (beforeAll interrompu) : on n'y touche pas
		const rows = snapshot.get(table);
		if (rows === undefined) continue;
		await sql(`delete from ${table} where student_id = any($1)`, [ALL_IDS]);
		if (rows.length > 0) {
			await sql(
				`insert into ${table} select * from jsonb_populate_recordset(null::${table}, $1::jsonb)`,
				[JSON.stringify(rows)]
			);
		}
	}
	for (const row of startProfiles) {
		await sql(
			`update profiles set gidouilles = $2::numeric, consent_required = $3,
			   consent_granted_at = $4::timestamptz, consent_grace_period_ends = $5::timestamptz,
			   consent_rule_pending = $6, age_declaration = $7, age_declared_at = $8::timestamptz
			 where id = $1`,
			[
				row.id,
				row.gidouilles,
				row.consent_required,
				row.consent_granted_at,
				row.consent_grace_period_ends,
				row.consent_rule_pending,
				row.age_declaration,
				row.age_declared_at
			]
		);
	}
}

// Functions

function onlyDesktopChrome(testInfo: { project: { name: string } }): void {
	test.skip(testInfo.project.name !== 'ordi-chrome', 'décor partagé : ordinateur Chrome seul');
}

async function goto(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

async function studentPage(page: Page, student: { email: string }): Promise<void> {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await login(page, student.email, PASSWORD);
	await page.waitForLoadState('networkidle');
}

async function chatterie(page: Page): Promise<void> {
	await goto(page, '/dashboard/student/chatterie');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function setBalance(student: { id: string }, amount: number): Promise<void> {
	await sql('update profiles set gidouilles = $2::numeric where id = $1', [student.id, amount]);
}

async function balance(student: { id: string }): Promise<number> {
	const rows = await sql<{ g: string }>(
		'select gidouilles::text as g from profiles where id = $1',
		[student.id]
	);
	return Number(rows[0].g);
}

/** Aucune décoration achetée, aucun Mathou paré. */
async function resetLooks(student: { id: string }): Promise<void> {
	await sql('delete from student_mathou_decorations where student_id = $1', [student.id]);
	await sql(
		`update student_mathoux set decoration = null, collar = null, glasses = null, hat = null
		 where student_id = $1`,
		[student.id]
	);
}

interface Born {
	notionId: string;
	notionName: string;
	asleep: boolean;
}

/** Les Mathoux nés de l'élève (mémoire), avec le nom de leur notion. */
async function bornMathoux(student: { id: string }): Promise<Born[]> {
	const rows = await sql<{ notion_id: string; name: string; asleep: boolean }>(
		`select m.notion_id, n.name, m.asleep from student_mathoux m
		 join classification_nodes n on n.id = m.notion_id
		 where m.student_id = $1 order by n.name`,
		[student.id]
	);
	return rows.map((r) => ({ notionId: r.notion_id, notionName: r.name, asleep: r.asleep }));
}

async function setStage(
	student: { id: string },
	born: Born,
	stage: 'chaton' | 'matou' | 'grand_matou'
): Promise<void> {
	await sql('update student_mathoux set best_stage = $3 where student_id = $1 and notion_id = $2', [
		student.id,
		born.notionId,
		stage
	]);
}

async function wearing(student: { id: string }, born: Born): Promise<Record<Slot, string | null>> {
	const rows = await sql<Record<Slot, string | null>>(
		`select decoration, collar, glasses, hat from student_mathoux
		 where student_id = $1 and notion_id = $2`,
		[student.id, born.notionId]
	);
	return rows[0];
}

async function wear(
	student: { id: string },
	born: Born,
	slot: Slot,
	value: string | null
): Promise<void> {
	if (value !== null) {
		// Une pièce ne se porte que si elle est achetée (clé étrangère), et par un seul Mathou
		await sql(
			`insert into student_mathou_decorations (student_id, decoration, price_paid)
			 values ($1, $2, 0) on conflict do nothing`,
			[student.id, value]
		);
		await sql(`update student_mathoux set ${slot} = null where student_id = $1 and ${slot} = $2`, [
			student.id,
			value
		]);
	}
	await sql(`update student_mathoux set ${slot} = $3 where student_id = $1 and notion_id = $2`, [
		student.id,
		born.notionId,
		value
	]);
}

/** La carte d'un Mathou sur la Chatterie, par le nom de sa notion. */
function card(page: Page, born: Born): Locator {
	return page.locator('li', { has: page.getByText(born.notionName, { exact: true }) }).filter({
		has: page.locator('svg[role="img"]')
	});
}

/** Une partie du dessin d'un Mathou (`data-part`). */
function part(scope: Locator, name: string): Locator {
	return scope.locator(`svg[role="img"] [data-part="${name}"]`);
}

async function mathouName(scope: Locator): Promise<string> {
	return (await scope.locator('p.text-lg').first().innerText()).trim();
}

async function openDecorer(page: Page, born: Born): Promise<Locator> {
	const c = card(page, born);
	await c.getByRole('button', { name: /^Décorer / }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

async function closeDialog(page: Page): Promise<void> {
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** La rangée de la fenêtre « Décorer » et l'élément d'un objet du catalogue. */
function rowOf(dialog: Locator, row: Row): Locator {
	return dialog.locator(`section[data-row="${row}"]`);
}
function itemOf(dialog: Locator, row: Row, id: string): Locator {
	return rowOf(dialog, row).locator(`li[data-decoration="${id}"]`);
}

/** Journal : lignes `reward_events` de l'élève dont la description est celle-ci. */
async function journal(
	student: { id: string },
	description: string
): Promise<{ amount: string | null }[]> {
	return sql<{ amount: string | null }>(
		`select amount::text as amount from reward_events
		 where student_id = $1 and description = $2 and created_at >= $3
		   and event_type in ('spent', 'earned')`,
		[student.id, description, startedAt]
	);
}

/** Une rangée complète : le catalogue, les prix, chacun dessiné sur CE Mathou. */
async function expectRow(
	dialog: Locator,
	row: Row,
	catalog: readonly { id: string; name: string; price: number }[],
	slot: string,
	mathouFirstName: string,
	/** Déjà achetées : le prix n'est plus affiché (« Achetée », « Portée par … ») */
	owned: readonly string[] = []
): Promise<void> {
	await expect(rowOf(dialog, row).locator('li[data-decoration]')).toHaveCount(catalog.length);
	for (const [index, item] of catalog.entries()) {
		const li = rowOf(dialog, row).locator('li[data-decoration]').nth(index);
		await expect(li, `${item.name} dans l'ordre du catalogue`).toHaveAttribute(
			'data-decoration',
			item.id
		);
		await expect(li.locator('p.font-medium')).toHaveText(item.name);
		if (!owned.includes(item.id)) {
			await expect(li, `prix de ${item.name}`).toContainText(
				new RegExp(`^\\s*${item.name}\\s+${item.price}\\s`)
			);
		}
		// Dessinée sur ce Mathou : l'image porte son nom et la pièce est dans le dessin
		await expect(li.locator('svg[role="img"]')).toHaveAttribute(
			'aria-label',
			new RegExp(`^${mathouFirstName} avec : `)
		);
		await expect(li.locator(`svg[role="img"] ${slot}`)).toHaveCount(1);
	}
}

/** Une série d'une seule question (« Faire grandir » raccourci), sans réponse : copie de gamification.spec. */
async function playOneQuestionSeries(
	page: Page,
	beforeStart: () => Promise<void> = async () => undefined
): Promise<void> {
	await goto(page, '/dashboard/student/chatterie');
	const href = await page.locator('a[aria-label^="Faire grandir"]').first().getAttribute('href');
	expect(href, 'un « Faire grandir » sur la Chatterie').not.toBeNull();
	const url = new URL(href as string, 'http://local');
	const raw = url.searchParams.get('modeles') ?? '';
	const items = JSON.parse(decodeURIComponent(decodeURIComponent(raw))) as {
		templateId: string;
		quantity: number;
		delay: number;
	}[];
	const one = [{ ...items[0], quantity: 1, delay: 10 }];
	const query = encodeURIComponent(encodeURIComponent(JSON.stringify(one)));
	// Après la Chatterie : sa page calcule la collection et consommerait les nouveautés
	await beforeStart();
	for (let attempt = 1; attempt <= 2; attempt++) {
		await goto(page, `/automaths/test?modeles=${query}&mode=interactive`);
		await expect(async () => {
			const start = page.getByRole('button', { name: /C'est parti/ });
			if (await start.isVisible()) await start.click();
			await expect(page.getByText(/Question 1 sur \d+|Résultats du test/).first()).toBeVisible({
				timeout: 4000
			});
		}).toPass({ timeout: 30_000 });
		const done = await page
			.getByText('Résultats du test')
			.waitFor({ timeout: 30_000 })
			.then(() => true)
			.catch(() => false);
		if (done) return;
	}
	await expect(page.getByText('Résultats du test')).toBeVisible({ timeout: 1000 });
}

// Trois Mathoux éveillés (chaton, matou, grand matou) et un en sieste, choisis dans eleve14
interface Cast {
	chaton: Born;
	matou: Born;
	grand: Born;
	sieste: Born;
}
let cast: Cast;

// ============================================================================
// Distribution : trois stades éveillés et une sieste
// ============================================================================

test.describe('décor : les Mathoux d’eleve14', () => {
	test('trois Mathoux éveillés (chaton, matou, grand matou) et un en sieste, sans rien porter', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E14);
		await resetLooks(E14);
		await chatterie(page);
		// Éveillé ou non : ce que la page DIT maintenant (la sieste est recalculée à l'affichage)
		const all = await bornMathoux(E14);
		const awake: Born[] = [];
		const asleep: Born[] = [];
		for (const m of all) {
			const napping = (await card(page, m).getByText('Fait la sieste').count()) > 0;
			(napping ? asleep : awake).push(m);
		}
		expect(awake.length, 'eleve14 a au moins trois Mathoux éveillés').toBeGreaterThanOrEqual(3);
		expect(asleep.length, 'et au moins un en sieste').toBeGreaterThanOrEqual(1);
		cast = { chaton: awake[0], matou: awake[1], grand: awake[2], sieste: asleep[0] };
		await setStage(E14, cast.matou, 'matou');
		await setStage(E14, cast.grand, 'grand_matou');
		// La Chatterie paie les étapes (naissance, matou…) : on la laisse le faire AVANT de fixer le solde
		await chatterie(page);
		await expect(card(page, cast.chaton).getByText('Chaton', { exact: true })).toBeVisible();
		await expect(card(page, cast.matou).getByText('Matou', { exact: true })).toBeVisible();
		await expect(card(page, cast.grand).getByText('Grand matou', { exact: true })).toBeVisible();
		await expect(card(page, cast.sieste).getByText('Fait la sieste')).toBeVisible();
	});
});

// ============================================================================
// #1681 — aucune spirale sur la panse
// ============================================================================

test.describe('#1681 aucune spirale sur la panse', () => {
	test('#1681 : aucun Mathou ne porte de décoration de panse, silhouettes comprises', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await chatterie(page);
		const mathoux = page.locator('svg[role="img"][data-stage]');
		expect(await mathoux.count(), 'des Mathoux dessinés').toBeGreaterThan(3);
		// Parmi eux, des silhouettes « à découvrir »
		const silhouettes = page.locator('svg[role="img"][data-silhouette="true"]');
		expect(await silhouettes.count(), 'des silhouettes').toBeGreaterThan(0);
		await expect(page.locator('svg[role="img"] [data-part="decoration"]')).toHaveCount(0);
		await expect(page.locator('svg[role="img"] [data-decoration]')).toHaveCount(0);
		await expect(page.locator('svg[role="img"] [data-part="silhouette"]').first()).toBeVisible();
		await page.screenshot({ path: `${SHOTS}/chatterie-sans-decoration.png`, fullPage: true });
	});

	test('#1681 : les races à motif gardent leur motif propre, panse vide (arabesques, losanges, croissant)', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(150_000);
		const byName = (name: string) => MATHOU_RACES.find((r) => r.name === name);
		const jabr = byName('le Al Jabr Oriental');
		expect(jabr, 'la race existe').toBeDefined();
		// Les races visibles chez les élèves du décor : on cherche chaque race à motif née quelque part
		const wanted = ['le Al Jabr Oriental', 'le Lunaire de Patatovie', 'le Chaussé Combinatoire'];
		const seen = new Map<string, { student: string }>();
		for (const student of [E14, E13, E11]) {
			await page.context().clearCookies();
			await studentPage(page, student);
			await chatterie(page);
			for (const name of wanted) {
				if (seen.has(name)) continue;
				const section = page.locator('section[aria-labelledby^="race-"]', {
					has: page.locator('header p', { hasText: name })
				});
				if ((await section.count()) === 0) continue;
				// Un Mathou né de cette race (pas seulement des silhouettes)
				let born = section.locator('svg[role="img"][data-stage]:not([data-silhouette])');
				if ((await born.count()) === 0) {
					// Race seulement en silhouettes chez cet élève : on fait naître le premier Mathou à découvrir
					// (mémoire écrite en base, remise en l'état par l'`afterAll`), puis on recharge
					if (student !== E13) continue;
					const silhouette = section.locator('li').filter({
						has: page.locator('svg[role="img"][data-silhouette="true"]')
					});
					if ((await silhouette.count()) === 0) continue;
					const notion = (await silhouette.first().locator('p.font-medium').innerText()).trim();
					const found = await sql<{ id: string }>(
						`select id from classification_nodes where name = $1 and kind = 'notion' limit 1`,
						[notion]
					);
					if (found.length === 0) continue;
					await sql(
						`insert into student_mathoux (student_id, notion_id, best_stage)
						 values ($1, $2, 'chaton') on conflict do nothing`,
						[student.id, found[0].id]
					);
					await chatterie(page);
					born = section.locator('svg[role="img"][data-stage]:not([data-silhouette])');
					if ((await born.count()) === 0) continue;
				}
				seen.set(name, { student: student.email });
				const avatar = born.first();
				const race = byName(name);
				if (!race) throw new Error(`race inconnue : ${name}`);
				await expect(
					avatar.locator('[data-part="decoration"]'),
					`${name} : panse vide`
				).toHaveCount(0);
				const motif = avatar.locator('[data-part="motif"]');
				await expect(motif.locator('path').first()).toBeAttached();
				if (name === 'le Al Jabr Oriental') {
					// Arabesques rouges : des traits (pas des aplats) de la couleur secondaire de la race
					const strokes = await motif
						.locator('path[stroke]:not([stroke="none"])')
						.evaluateAll((els) => els.map((el) => el.getAttribute('stroke')));
					expect(strokes.length, 'arabesques tracées sur les flancs et au front').toBeGreaterThan(
						0
					);
					expect(new Set(strokes)).toEqual(new Set([race.secondary]));
					// Yeux vairons : bleu à gauche, cuivre à droite. Les Mathoux de la Chatterie dorment
					// (yeux fermés) : on les lit sur la fenêtre « Décorer », où ils sont éveillés (rangée « Yeux »)
					const carte = section
						.locator('li')
						.filter({ has: page.locator('svg[role="img"][data-stage]:not([data-silhouette])') })
						.first();
					await carte.getByRole('button', { name: /^Décorer / }).click();
					const dialog = page.getByRole('dialog');
					await expect(dialog).toBeVisible();
					const irises = await rowOf(dialog, 'yeux')
						.locator('li[data-decoration]')
						.first()
						.locator('[data-part="iris"]')
						.evaluateAll((els) => els.map((el) => el.getAttribute('fill')));
					expect(irises).toEqual([race.eyes, race.eyesRight]);
					expect(race.eyes).not.toBe(race.eyesRight);
					await dialog.screenshot({ path: `${SHOTS}/race-al-jabr-yeux-vairons.png` });
					await closeDialog(page);
					await section.screenshot({ path: `${SHOTS}/race-al-jabr.png` });
				} else {
					// Les autres : leur motif est dessiné (aplats de la couleur de la race), aucune volute
					const fills = await motif
						.locator('path')
						.evaluateAll((els) => els.map((el) => el.getAttribute('fill')));
					expect(
						fills.some((f) => f === race.secondary || f === race.tertiary),
						`${name} : motif de ses couleurs`
					).toBe(true);
					await section.screenshot({ path: `${SHOTS}/race-${name.replace(/\W+/g, '-')}.png` });
				}
			}
		}
		// Chaque race à voir doit l'avoir été : sinon la ligne n'est pas vérifiée, on le dit
		const missing = wanted.filter((name) => !seen.has(name));
		expect(
			missing,
			`races jamais vues nées chez eleve14, eleve13 ni eleve11 : ${missing.join(', ')}`
		).toEqual([]);
	});
});

// ============================================================================
// #1704 — décorations de panse, achat avec les gidouilles
// ============================================================================

test.describe('#1704 décorations de panse', () => {
	test('#1704 : « Décorer » un Mathou né, six décorations dessinées sur CE Mathou, prix 10/10/20/20/40/40', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await setBalance(E14, 60);
		await chatterie(page);
		// Pas de « Décorer » sur une silhouette
		const silhouetteCards = page.locator('li', {
			has: page.locator('svg[role="img"][data-silhouette="true"]')
		});
		expect(await silhouetteCards.count()).toBeGreaterThan(0);
		await expect(silhouetteCards.getByRole('button', { name: /Décorer/ })).toHaveCount(0);

		const name = await mathouName(card(page, cast.chaton));
		const dialog = await openDecorer(page, cast.chaton);
		await expect(dialog.getByRole('heading', { name: `Décorer ${name}` })).toBeVisible();
		await expectRow(dialog, 'panse', PANSE, '[data-part="decoration"]', name);
		// Chaque rangée porte la décoration PROPRE à sa pièce
		for (const item of PANSE) {
			await expect(
				itemOf(dialog, 'panse', item.id).locator(
					`[data-part="decoration"][data-decoration="${item.id}"]`
				)
			).toHaveCount(1);
		}
		await dialog.screenshot({ path: `${SHOTS}/decorer-panse.png` });
	});

	test('#1704 : acheter la cocarde (−20, journal), la poser sur un autre Mathou, la retirer (gratuit)', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E14);
		await resetLooks(E14);
		await setBalance(E14, 60);
		await chatterie(page);
		const nameA = await mathouName(card(page, cast.chaton));
		const nameB = await mathouName(card(page, cast.matou));

		// Achat : solde −20, cocarde sur la panse du Mathou, ligne au journal
		let dialog = await openDecorer(page, cast.chaton);
		await dialog.getByRole('button', { name: `Acheter Cocarde pour ${nameA}` }).click();
		await expect(itemOf(dialog, 'panse', 'cockade')).toContainText(`Portée par ${nameA}`);
		expect(await balance(E14), 'solde −20').toBe(40);
		expect(
			(await journal(E14, 'Chatterie : cocarde achetée')).map((r) => Number(r.amount))
		).toEqual([20]);
		const bought = await sql<{ price_paid: number }>(
			`select price_paid from student_mathou_decorations where student_id = $1 and decoration = 'cockade'`,
			[E14.id]
		);
		expect(bought.map((r) => r.price_paid)).toEqual([20]);
		expect((await wearing(E14, cast.chaton)).decoration).toBe('cockade');
		await closeDialog(page);
		await expect(
			part(card(page, cast.chaton), 'decoration'),
			'la cocarde sur la panse du Mathou'
		).toHaveAttribute('data-decoration', 'cockade');
		await card(page, cast.chaton).screenshot({ path: `${SHOTS}/cocarde-achetee.png` });

		// Poser sur un autre Mathou : elle quitte le premier, sans frais
		dialog = await openDecorer(page, cast.matou);
		await expect(itemOf(dialog, 'panse', 'cockade')).toContainText(`Portée par ${nameA}`);
		await dialog.getByRole('button', { name: `Poser Cocarde sur ${nameB}` }).click();
		await expect(itemOf(dialog, 'panse', 'cockade')).toContainText(`Portée par ${nameB}`);
		expect((await wearing(E14, cast.chaton)).decoration, 'elle a quitté le premier').toBeNull();
		expect((await wearing(E14, cast.matou)).decoration).toBe('cockade');
		expect(await balance(E14), 'déplacer ne coûte rien').toBe(40);
		await closeDialog(page);
		await expect(part(card(page, cast.chaton), 'decoration')).toHaveCount(0);
		await expect(part(card(page, cast.matou), 'decoration')).toHaveAttribute(
			'data-decoration',
			'cockade'
		);

		// Retirer : panse nue, gratuit
		dialog = await openDecorer(page, cast.matou);
		await dialog.getByRole('button', { name: `Retirer Cocarde, portée par ${nameB}` }).click();
		await expect(itemOf(dialog, 'panse', 'cockade')).toContainText('Achetée');
		expect((await wearing(E14, cast.matou)).decoration).toBeNull();
		expect(await balance(E14), 'retirer ne coûte rien').toBe(40);
		await closeDialog(page);
		await expect(part(card(page, cast.matou), 'decoration')).toHaveCount(0);
		// Toujours achetée (une seule ligne d'achat)
		const owned = await sql<{ n: string }>(
			`select count(*)::text as n from student_mathou_decorations where student_id = $1`,
			[E14.id]
		);
		expect(Number(owned[0].n)).toBe(1);
	});

	test('#1704 : solde trop bas, « Il te manque N gidouilles » et aucun « Acheter »', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await setBalance(E14, 5);
		await chatterie(page);
		const dialog = await openDecorer(page, cast.chaton);
		await expect(itemOf(dialog, 'panse', 'heart')).toContainText('Il te manque 5 gidouilles');
		await expect(itemOf(dialog, 'panse', 'cockade')).toContainText('Il te manque 15 gidouilles');
		await expect(itemOf(dialog, 'panse', 'coat_of_arms')).toContainText(
			'Il te manque 35 gidouilles'
		);
		await expect(rowOf(dialog, 'panse').getByRole('button', { name: /^Acheter/ })).toHaveCount(0);
		const before = await balance(E14);
		expect(before).toBe(5);
		await dialog.screenshot({ path: `${SHOTS}/decorer-solde-trop-bas.png` });
	});

	test('#1704 : un Mathou en sieste garde sa décoration ; elle se pose par-dessus les motifs', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await wear(E14, cast.sieste, 'decoration', 'heart');
		await chatterie(page);
		const napping = card(page, cast.sieste);
		await expect(napping.getByText('Fait la sieste')).toBeVisible();
		await expect(part(napping, 'decoration')).toHaveAttribute('data-decoration', 'heart');
		await expect(part(napping, 'bonnet'), 'en sieste : bonnet de nuit').toHaveCount(1);

		// Six Mathoux, dont des races à motif (marbré, croissant) : la décoration vient APRÈS le motif dans le dessin
		const all = await bornMathoux(E14);
		const raceOf = await page.locator('section[aria-labelledby^="race-"]').evaluateAll((sections) =>
			sections.flatMap((section) => {
				const race = section.querySelector('header p')?.textContent?.trim() ?? '';
				return [...section.querySelectorAll('li')]
					.filter((li) => li.querySelector('svg[data-stage]:not([data-silhouette])'))
					.map((li) => ({
						race,
						notion: li.querySelector('p.text-xs')?.textContent?.trim() ?? ''
					}));
			})
		);
		const priority = ['le Marbré de Bedonstan', 'le Lunaire de Patatovie'];
		const ranked = all
			.map((m) => ({ m, race: raceOf.find((r) => r.notion === m.notionName)?.race ?? '' }))
			.sort((x, y) => Number(priority.includes(y.race)) - Number(priority.includes(x.race)));
		const chosen = ranked.slice(0, PANSE.length);
		for (const [i, c] of chosen.entries()) await wear(E14, c.m, 'decoration', PANSE[i].id);
		const racesDecorated = new Set(chosen.map((c) => c.race));
		for (const race of priority) expect(racesDecorated, `${race} décoré`).toContain(race);
		await chatterie(page);
		const avatars = page.locator('svg[role="img"][data-stage]:not([data-silhouette])');
		const orders = await avatars.evaluateAll((svgs) =>
			svgs.map((svg) => {
				const motif = svg.querySelector('[data-part="motif"]');
				const deco = svg.querySelector('[data-part="decoration"]');
				if (!motif || !deco) return null;
				return Boolean(motif.compareDocumentPosition(deco) & Node.DOCUMENT_POSITION_FOLLOWING);
			})
		);
		expect(orders.filter((o) => o !== null).length, 'six Mathoux décorés').toBe(PANSE.length);
		expect(
			orders.every((o) => o === null || o === true),
			'décoration dessinée par-dessus le motif'
		).toBe(true);
		await page.screenshot({ path: `${SHOTS}/toutes-decorees.png`, fullPage: true });
		await resetLooks(E14);
	});

	test('#1704 : Marché, onglet Boutique : vitrine des six, lien « Décorer mes Mathoux », aucun achat', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await setBalance(E14, 100);
		await goto(page, '/dashboard/student/marketplace');
		await page.getByRole('tab', { name: /Boutique/ }).click();
		const vitrine = page.locator('section[aria-labelledby="vitrine-decorations"]');
		await expect(vitrine.getByRole('heading', { name: 'Décorations des Mathoux' })).toBeVisible();
		await expect(vitrine.getByRole('heading', { name: 'Sur la panse' })).toBeVisible();
		for (const item of PANSE) {
			await expect(
				vitrine.getByRole('img', { name: `Un Mathou avec : ${item.name}` })
			).toBeVisible();
			await expect(vitrine.getByText(item.name, { exact: true })).toBeVisible();
		}
		await expect(vitrine.getByRole('button')).toHaveCount(0);
		await expect(vitrine.getByRole('link', { name: 'Décorer mes Mathoux' })).toHaveAttribute(
			'href',
			/\/dashboard\/student\/chatterie/
		);
		await vitrine.screenshot({ path: `${SHOTS}/marche-vitrine.png` });
	});

	test('#1704 : sans consentement parental, « Acheter » est grisé et une phrase l’explique', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await setBalance(E14, 60);
		// Consentement exigé, jamais donné, délai de grâce dépassé : lecture seule
		await sql(
			`update profiles set consent_required = true, consent_granted_at = null,
			   consent_grace_period_ends = now() - interval '1 day' where id = $1`,
			[E14.id]
		);
		try {
			await chatterie(page);
			const name = await mathouName(card(page, cast.chaton));
			const dialog = await openDecorer(page, cast.chaton);
			await expect(
				dialog.getByText('Pour acheter une décoration, il faut l’accord de tes parents.')
			).toBeVisible();
			const buy = dialog.getByRole('button', { name: `Acheter Cocarde pour ${name}` });
			await expect(buy).toBeVisible();
			await expect(buy).toBeDisabled();
			expect(await balance(E14)).toBe(60);
			await dialog.screenshot({ path: `${SHOTS}/decorer-sans-consentement.png` });
		} finally {
			const start = startProfiles.find((p) => p.id === E14.id);
			await sql(
				`update profiles set consent_required = $2, consent_granted_at = $3::timestamptz,
				   consent_grace_period_ends = $4::timestamptz where id = $1`,
				[
					E14.id,
					start?.consent_required,
					start?.consent_granted_at,
					start?.consent_grace_period_ends
				]
			);
		}
	});

	test('#1704 : le prof voit les décorations sur la Chatterie de l’élève, sans « Décorer »', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await resetLooks(E14);
		await wear(E14, cast.chaton, 'decoration', 'medal');
		await login(page, TEACHER.email, 'local-teacher');
		await page.waitForLoadState('networkidle');
		await goto(page, `/dashboard/teacher/students/${E14.id}/chatterie`);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Chatterie de');
		await expect(
			part(card(page, cast.chaton), 'decoration'),
			'la médaille visible chez le prof'
		).toHaveAttribute('data-decoration', 'medal');
		await expect(page.getByRole('button', { name: /Décorer/ })).toHaveCount(0);
		await page.screenshot({ path: `${SHOTS}/prof-decoration.png`, fullPage: true });
		await resetLooks(E14);
	});
});

// ============================================================================
// #1725 — colliers
// ============================================================================

test.describe('#1725 colliers', () => {
	test('#1725 : rangée « Cou » : quatre colliers dessinés avec la décoration de panse déjà portée', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await wear(E14, cast.chaton, 'decoration', 'cockade');
		await setBalance(E14, 100);
		await chatterie(page);
		const name = await mathouName(card(page, cast.chaton));
		const dialog = await openDecorer(page, cast.chaton);
		await expectRow(dialog, 'cou', COLLIERS, '[data-part="collier"]', name);
		for (const item of COLLIERS) {
			const svg = itemOf(dialog, 'cou', item.id).locator('svg[role="img"]');
			await expect(svg.locator(`[data-part="collier"][data-collar="${item.id}"]`)).toHaveCount(1);
			// Avec la cocarde déjà portée
			await expect(svg.locator('[data-part="decoration"][data-decoration="cockade"]')).toHaveCount(
				1
			);
		}
		await dialog.screenshot({ path: `${SHOTS}/decorer-cou.png` });
	});

	test('#1725 : acheter un collier (journal), le poser sur un autre Mathou (il quitte le premier), le retirer', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E14);
		await resetLooks(E14);
		await setBalance(E14, 50);
		await chatterie(page);
		const nameA = await mathouName(card(page, cast.chaton));
		const nameB = await mathouName(card(page, cast.matou));
		let dialog = await openDecorer(page, cast.chaton);
		await dialog.getByRole('button', { name: `Acheter Collier de cuir pour ${nameA}` }).click();
		await expect(itemOf(dialog, 'cou', 'leather')).toContainText(`Porté par ${nameA}`);
		expect(await balance(E14), 'solde −20').toBe(30);
		expect(
			(await journal(E14, 'Chatterie : collier de cuir acheté')).map((r) => Number(r.amount))
		).toEqual([20]);
		await closeDialog(page);
		await expect(part(card(page, cast.chaton), 'collier')).toHaveAttribute(
			'data-collar',
			'leather'
		);

		dialog = await openDecorer(page, cast.matou);
		await dialog.getByRole('button', { name: `Poser Collier de cuir sur ${nameB}` }).click();
		await expect(itemOf(dialog, 'cou', 'leather')).toContainText(`Porté par ${nameB}`);
		expect((await wearing(E14, cast.chaton)).collar).toBeNull();
		expect((await wearing(E14, cast.matou)).collar).toBe('leather');
		expect(await balance(E14)).toBe(30);
		await closeDialog(page);
		await expect(part(card(page, cast.chaton), 'collier')).toHaveCount(0);
		await expect(part(card(page, cast.matou), 'collier')).toHaveAttribute('data-collar', 'leather');

		dialog = await openDecorer(page, cast.matou);
		await dialog
			.getByRole('button', { name: `Retirer Collier de cuir, porté par ${nameB}` })
			.click();
		await expect(itemOf(dialog, 'cou', 'leather')).toContainText('Acheté');
		expect((await wearing(E14, cast.matou)).collar).toBeNull();
		expect(await balance(E14)).toBe(30);
		await closeDialog(page);
		await expect(part(card(page, cast.matou), 'collier')).toHaveCount(0);
	});

	test('#1725 : grand matou : la bande sous la fraise, le pendentif dessous ; chaton collier + panse ; sieste : le collier reste', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await wear(E14, cast.grand, 'collar', 'order_chain');
		await wear(E14, cast.chaton, 'collar', 'bell');
		await wear(E14, cast.chaton, 'decoration', 'heart');
		await wear(E14, cast.sieste, 'collar', 'bow_tie');
		await chatterie(page);
		// Grand matou : bande (collier) AVANT la fraise, pendentif APRÈS elle dans le dessin
		const grand = card(page, cast.grand).locator('svg[role="img"]');
		await expect(grand.locator('[data-part="collerette"]')).toHaveCount(1);
		const order = await grand.evaluate((svg) => {
			const after = (a: Element | null, b: Element | null) =>
				Boolean(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
			const band = svg.querySelector('[data-part="collier"]');
			const ruff = svg.querySelector('[data-part="collerette"]');
			const pendant = svg.querySelector('[data-part="collier-pendentif"]');
			return {
				bandBeforeRuff: after(band, ruff),
				pendantAfterRuff: after(ruff, pendant),
				hasPendant: pendant !== null
			};
		});
		expect(order).toEqual({ bandBeforeRuff: true, pendantAfterRuff: true, hasPendant: true });
		await card(page, cast.grand).screenshot({ path: `${SHOTS}/collier-grand-matou.png` });
		// Chaton : collier et décoration de panse ensemble
		const chaton = card(page, cast.chaton);
		await expect(part(chaton, 'collier')).toHaveAttribute('data-collar', 'bell');
		await expect(part(chaton, 'decoration')).toHaveAttribute('data-decoration', 'heart');
		await chaton.screenshot({ path: `${SHOTS}/collier-chaton-panse.png` });
		// Sieste : le collier reste, le bonnet de nuit aussi
		const sieste = card(page, cast.sieste);
		await expect(sieste.getByText('Fait la sieste')).toBeVisible();
		await expect(part(sieste, 'collier')).toHaveAttribute('data-collar', 'bow_tie');
		await expect(part(sieste, 'bonnet')).toHaveCount(1);
		await resetLooks(E14);
	});

	test('#1725 : Marché, onglet Boutique : « Au cou » sous « Sur la panse », sans achat ; vue prof : le collier se voit', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await goto(page, '/dashboard/student/marketplace');
		await page.getByRole('tab', { name: /Boutique/ }).click();
		const vitrine = page.locator('section[aria-labelledby="vitrine-decorations"]');
		const titles = await vitrine.getByRole('heading', { level: 3 }).allInnerTexts();
		expect(titles.indexOf('Au cou'), '« Au cou » vient').toBeGreaterThan(-1);
		expect(titles.indexOf('Au cou')).toBeGreaterThan(titles.indexOf('Sur la panse'));
		expect(titles.indexOf('Sur la panse')).toBeGreaterThan(-1);
		for (const item of COLLIERS) {
			await expect(
				vitrine.getByRole('img', { name: `Un Mathou avec : ${item.name}` })
			).toBeVisible();
		}
		await expect(vitrine.getByRole('button')).toHaveCount(0);

		await wear(E14, cast.matou, 'collar', 'leather');
		const teacher = await page.context().browser()?.newContext();
		if (!teacher) throw new Error('navigateur indisponible');
		const prof = await teacher.newPage();
		try {
			await login(prof, TEACHER.email, 'local-teacher');
			await prof.waitForLoadState('networkidle');
			await goto(prof, `/dashboard/teacher/students/${E14.id}/chatterie`);
			await expect(part(card(prof, cast.matou), 'collier')).toHaveAttribute(
				'data-collar',
				'leather'
			);
		} finally {
			await teacher.close();
		}
		await resetLooks(E14);
	});
});

// ============================================================================
// #1747 — lunettes et chapeaux
// ============================================================================

test.describe('#1747 lunettes et chapeaux', () => {
	test('#1747 : rangées « Yeux » (5 lunettes) et « Tête » (5 chapeaux) dessinées avec ce que porte déjà le Mathou ; accords', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E14);
		await resetLooks(E14);
		await wear(E14, cast.matou, 'decoration', 'cockade');
		await wear(E14, cast.matou, 'collar', 'bell');
		await sql(
			`insert into student_mathou_decorations (student_id, decoration, price_paid)
			 values ($1, 'sunglasses', 10), ($1, 'monocle', 20), ($1, 'beret', 10)`,
			[E14.id]
		);
		await wear(E14, cast.chaton, 'glasses', 'sunglasses');
		await wear(E14, cast.sieste, 'glasses', 'monocle');
		await wear(E14, cast.grand, 'hat', 'beret');
		await setBalance(E14, 100);
		await chatterie(page);
		const name = await mathouName(card(page, cast.matou));
		const nameLunettes = await mathouName(card(page, cast.chaton));
		const nameMonocle = await mathouName(card(page, cast.sieste));
		const nameBeret = await mathouName(card(page, cast.grand));
		const dialog = await openDecorer(page, cast.matou);
		await expectRow(dialog, 'yeux', LUNETTES, '[data-part="lunettes"]', name, [
			'sunglasses',
			'monocle'
		]);
		await expectRow(dialog, 'tete', CHAPEAUX, '[data-part="chapeau"]', name, ['beret']);
		// Dessinées sur ce Mathou avec ce qu'il porte déjà (panse, cou)
		for (const [row, catalog] of [
			['yeux', LUNETTES],
			['tete', CHAPEAUX]
		] as const) {
			for (const item of catalog) {
				const svg = itemOf(dialog, row, item.id).locator('svg[role="img"]');
				await expect(
					svg.locator('[data-part="decoration"][data-decoration="cockade"]')
				).toHaveCount(1);
				await expect(svg.locator('[data-part="collier"][data-collar="bell"]')).toHaveCount(1);
			}
		}
		// Accords : « Portées par » (lunettes), « Porté par » (monocle, chapeaux)
		await expect(itemOf(dialog, 'yeux', 'sunglasses')).toContainText(`Portées par ${nameLunettes}`);
		await expect(itemOf(dialog, 'yeux', 'monocle')).toContainText(`Porté par ${nameMonocle}`);
		await expect(itemOf(dialog, 'tete', 'beret')).toContainText(`Porté par ${nameBeret}`);
		await expect(itemOf(dialog, 'yeux', 'round_glasses')).not.toContainText(/Porté|Acheté/);
		await dialog.screenshot({ path: `${SHOTS}/decorer-yeux-tete.png` });
	});

	test('#1747 : acheter un monocle (−20, journal), le poser sur un autre Mathou, le retirer', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E14);
		await resetLooks(E14);
		await setBalance(E14, 50);
		await chatterie(page);
		const nameA = await mathouName(card(page, cast.chaton));
		const nameB = await mathouName(card(page, cast.matou));
		let dialog = await openDecorer(page, cast.chaton);
		await dialog.getByRole('button', { name: `Acheter Monocle pour ${nameA}` }).click();
		await expect(itemOf(dialog, 'yeux', 'monocle')).toContainText(`Porté par ${nameA}`);
		expect(await balance(E14)).toBe(30);
		expect((await journal(E14, 'Chatterie : monocle acheté')).map((r) => Number(r.amount))).toEqual(
			[20]
		);
		await closeDialog(page);
		await expect(part(card(page, cast.chaton), 'lunettes')).toHaveAttribute(
			'data-glasses',
			'monocle'
		);

		dialog = await openDecorer(page, cast.matou);
		await dialog.getByRole('button', { name: `Poser Monocle sur ${nameB}` }).click();
		await expect(itemOf(dialog, 'yeux', 'monocle')).toContainText(`Porté par ${nameB}`);
		expect((await wearing(E14, cast.chaton)).glasses).toBeNull();
		expect((await wearing(E14, cast.matou)).glasses).toBe('monocle');
		expect(await balance(E14)).toBe(30);
		await closeDialog(page);
		await expect(part(card(page, cast.chaton), 'lunettes')).toHaveCount(0);

		dialog = await openDecorer(page, cast.matou);
		await dialog.getByRole('button', { name: `Retirer Monocle, porté par ${nameB}` }).click();
		await expect(itemOf(dialog, 'yeux', 'monocle')).toContainText('Acheté');
		expect((await wearing(E14, cast.matou)).glasses).toBeNull();
		expect(await balance(E14)).toBe(30);
		await closeDialog(page);
		await expect(part(card(page, cast.matou), 'lunettes')).toHaveCount(0);
	});

	test('#1747 : quatre emplacements ensemble ; grand matou : le chapeau remplace la couronne, sans chapeau la couronne revient', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E14);
		await resetLooks(E14);
		for (const [m, looks] of [
			[cast.chaton, ['heart', 'bell', 'round_glasses', 'beret']],
			[cast.matou, ['cockade', 'bow_tie', 'sunglasses', 'bowler']],
			[cast.grand, ['coat_of_arms', 'order_chain', 'spiral_glasses', 'top_hat']]
		] as const) {
			await wear(E14, m, 'decoration', looks[0]);
			await wear(E14, m, 'collar', looks[1]);
			await wear(E14, m, 'glasses', looks[2]);
			await wear(E14, m, 'hat', looks[3]);
		}
		await chatterie(page);
		for (const m of [cast.chaton, cast.matou, cast.grand]) {
			const c = card(page, m);
			for (const p of ['decoration', 'collier', 'lunettes', 'chapeau']) {
				await expect(part(c, p), `${p} sur ${m.notionName}`).toHaveCount(1);
			}
			await c.screenshot({
				path: `${SHOTS}/quatre-emplacements-${m === cast.chaton ? 'chaton' : m === cast.matou ? 'matou' : 'grand-matou'}.png`
			});
		}
		const grand = card(page, cast.grand);
		await expect(part(grand, 'couronne'), 'le chapeau remplace la couronne').toHaveCount(0);
		await expect(part(grand, 'collerette'), 'la fraise reste').toHaveCount(1);
		// Sans chapeau : la couronne revient
		await wear(E14, cast.grand, 'hat', null);
		await chatterie(page);
		await expect(part(card(page, cast.grand), 'couronne')).toHaveCount(1);
		await expect(part(card(page, cast.grand), 'chapeau')).toHaveCount(0);
		await card(page, cast.grand).screenshot({ path: `${SHOTS}/grand-matou-couronne.png` });

		// Grandir de matou à grand matou avec un chapeau : il reste, pas de couronne
		await wear(E14, cast.matou, 'hat', 'bowler');
		await setStage(E14, cast.matou, 'grand_matou');
		await chatterie(page);
		const grown = card(page, cast.matou);
		await expect(grown.getByText('Grand matou', { exact: true })).toBeVisible();
		await expect(part(grown, 'chapeau')).toHaveAttribute('data-hat', 'bowler');
		await expect(part(grown, 'couronne')).toHaveCount(0);
		await setStage(E14, cast.matou, 'matou');
	});

	test('#1747 : sieste : ni lunettes ni chapeau, bonnet de nuit ; le Mathou éveillé les garde', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		await studentPage(page, E14);
		await resetLooks(E14);
		await wear(E14, cast.sieste, 'glasses', 'monocle');
		await wear(E14, cast.sieste, 'hat', 'top_hat');
		await wear(E14, cast.chaton, 'glasses', 'pince_nez');
		await wear(E14, cast.chaton, 'hat', 'pointed_hat');
		await chatterie(page);
		const nap = card(page, cast.sieste);
		await expect(nap.getByText('Fait la sieste')).toBeVisible();
		await expect(part(nap, 'lunettes')).toHaveCount(0);
		await expect(part(nap, 'chapeau')).toHaveCount(0);
		await expect(part(nap, 'bonnet')).toHaveCount(1);
		// Ils sont toujours à lui : la base les retient
		expect(await wearing(E14, cast.sieste)).toMatchObject({
			glasses: 'monocle',
			hat: 'top_hat'
		});
		const up = card(page, cast.chaton);
		await expect(part(up, 'lunettes')).toHaveAttribute('data-glasses', 'pince_nez');
		await expect(part(up, 'chapeau')).toHaveAttribute('data-hat', 'pointed_hat');
		await expect(part(up, 'bonnet')).toHaveCount(0);
		await nap.screenshot({ path: `${SHOTS}/sieste-sans-lunettes-chapeau.png` });
		await resetLooks(E14);
	});

	test('#1747 : Marché, Boutique : « Sur les yeux », « Sur la tête », sans achat ; vue prof : lunettes et chapeau visibles', async ({
		page,
		browser
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E14);
		await resetLooks(E14);
		await goto(page, '/dashboard/student/marketplace');
		await page.getByRole('tab', { name: /Boutique/ }).click();
		const vitrine = page.locator('section[aria-labelledby="vitrine-decorations"]');
		await expect(vitrine.getByRole('heading', { name: 'Sur les yeux' })).toBeVisible();
		await expect(vitrine.getByRole('heading', { name: 'Sur la tête' })).toBeVisible();
		for (const item of [...LUNETTES, ...CHAPEAUX]) {
			await expect(
				vitrine.getByRole('img', { name: `Un Mathou avec : ${item.name}` })
			).toBeVisible();
		}
		await expect(vitrine.getByRole('button')).toHaveCount(0);
		await vitrine.screenshot({ path: `${SHOTS}/marche-yeux-tete.png` });

		await wear(E14, cast.matou, 'glasses', 'round_glasses');
		await wear(E14, cast.matou, 'hat', 'boater');
		const context = await browser.newContext();
		const prof = await context.newPage();
		try {
			await login(prof, TEACHER.email, 'local-teacher');
			await prof.waitForLoadState('networkidle');
			await goto(prof, `/dashboard/teacher/students/${E14.id}/chatterie`);
			const seen = card(prof, cast.matou);
			await expect(part(seen, 'lunettes')).toHaveAttribute('data-glasses', 'round_glasses');
			await expect(part(seen, 'chapeau')).toHaveAttribute('data-hat', 'boater');
		} finally {
			await context.close();
		}
		await resetLooks(E14);
	});
});

// ============================================================================
// #1685, #1689 — gidouilles du travail
// ============================================================================

test.describe('#1685 #1689 gidouilles du travail', () => {
	test('#1685 #1689 : un Mathou naît en fin de série : carte « +N gidouilles pour tes Mathoux. », solde, journal, vue du prof', async ({
		page,
		browser
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(240_000);
		await studentPage(page, E11);
		await chatterie(page);
		const born = await bornMathoux(E11);
		expect(born.length).toBeGreaterThan(0);
		const target = born[0];
		const name = await mathouName(card(page, target));
		let before = 0;
		let since = startedAt;
		await playOneQuestionSeries(page, async () => {
			// Un Mathou à faire naître ; le plafond du jour doit laisser la place
			await sql(`delete from student_mathoux where student_id = $1 and notion_id = $2`, [
				E11.id,
				target.notionId
			]);
			// Les autres Mathoux déjà payés : seule la naissance de celui-ci reste à verser
			await sql(
				`update student_mathoux set rewarded_stage = best_stage, rewarded_grades = starred_grades
				 where student_id = $1`,
				[E11.id]
			);
			await sql(
				`delete from gidouilles_activity where student_id = $1 and reason like 'Chatterie : %'
				 and created_at >= now() - interval '24 hours'`,
				[E11.id]
			);
			before = await balance(E11);
			since = (await sql<{ now: string }>('select now()::text as now'))[0].now;
		});
		const news = page.getByTestId('mathou-news-card');
		await expect(news).toBeVisible({ timeout: 15_000 });
		const phrase = await news.getByText(/\+\d+ gidouilles? pour tes Mathoux\./).innerText();
		const announced = Number(/\+(\d+)/.exec(phrase)?.[1]);
		expect([3, 8], 'né chaton +3, né matou +8').toContain(announced);
		await news.screenshot({ path: `${SHOTS}/naissance-gidouilles.png` });
		// Le solde a monté d'autant (aucun autre gain dans cette série)
		const after = await balance(E11);
		expect(after - before, 'le solde monte du montant annoncé').toBe(announced);
		// Journal des récompenses
		// Seule la naissance de CETTE série : la visite de la Chatterie d'avant a payé l'ancienne
		const lines = await sql<{ amount: string }>(
			`select amount::text as amount from reward_events
			 where student_id = $1 and description = $2 and created_at >= $3`,
			[E11.id, `Chatterie : naissance de ${name}`, since]
		);
		expect(lines.length, `une ligne de naissance de ${name}`).toBe(1);
		expect(Number(lines[0].amount)).toBe(3);

		// Prof : ces lignes sont visibles dans le journal de l'élève
		const context = await browser.newContext();
		const prof = await context.newPage();
		try {
			await login(prof, TEACHER.email, 'local-teacher');
			await prof.waitForLoadState('networkidle');
			await goto(prof, `/dashboard/teacher/students/${E11.id}/journal`);
			await expect(prof.getByText(`Chatterie : naissance de ${name}`).first()).toBeVisible({
				timeout: 15_000
			});
			await prof.screenshot({ path: `${SHOTS}/prof-journal-naissance.png`, fullPage: true });
		} finally {
			await context.close();
		}
	});

	test('#1685 #1689 : plafond de 20 gidouilles par jour pour les étapes ; le reste attend le lendemain', async ({
		page
	}, testInfo) => {
		onlyDesktopChrome(testInfo);
		test.setTimeout(120_000);
		await studentPage(page, E10);
		await chatterie(page);
		// Rien n'a été versé aujourd'hui : on fait renaître les sept Mathoux (7 × 3 = 21 > 20)
		await sql(
			`delete from gidouilles_activity where student_id = $1 and reason like 'Chatterie : %' and created_at >= now() - interval '24 hours'`,
			[E10.id]
		);
		await sql(`delete from student_mathoux where student_id = $1`, [E10.id]);
		const before = await balance(E10);
		await chatterie(page);
		const paid = await sql<{ total: string }>(
			`select coalesce(sum(delta), 0)::text as total from gidouilles_activity
			 where student_id = $1 and reason like 'Chatterie : %' and delta > 0
			   and created_at >= now() - interval '24 hours'`,
			[E10.id]
		);
		const total = Number(paid[0].total);
		expect(total, 'des gidouilles versées').toBeGreaterThan(0);
		expect(total, 'au plus 20 sur 24 heures').toBeLessThanOrEqual(20);
		expect((await balance(E10)) - before, 'le solde a monté du versé').toBe(total);
		const unpaid = await sql<{ n: string }>(
			`select count(*)::text as n from student_mathoux where student_id = $1 and rewarded_stage is null`,
			[E10.id]
		);
		expect(Number(unpaid[0].n), 'des étapes restent à payer demain').toBeGreaterThan(0);
	});
});
