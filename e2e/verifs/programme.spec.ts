import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import {
	ADMIN,
	assertLocalServerEnv,
	login,
	sql,
	TEACHER,
	withFirstVersion
} from './helpers/carnet';
import { TEACHER_ID } from './helpers/fiches';

/**
 * Programme : tags des modèles, cahier de texte, avancement, progression — base LOCALE
 * ======================================================================================
 *
 * Reprend les lignes #1563 (tags du lot 2 bis), #1577 (bascule B1), #1581 (B2),
 * #1583 (B3) et #1589 (« Ma progression » par notion) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Décor : une classe « Verifs2 5e » (niveau 5e) du prof local, des séances (dates de
 * l'année scolaire en cours), un exercice « Verifs2 … ». Il n'y a pas de classe de 5e
 * dans la base locale : on la crée, et on la retire à la fin. Les niveaux des élèves
 * `eleve17`, `eleve18`, `eleve19` et `eleve20`, les tags du modèle « Additionner des
 * fractions » (5e) et l'archivage des points touchés sont remis dans leur état
 * d'origine en `afterAll`.
 */

// Base locale seulement : contre la prod (`VERIFS_URL`), les comptes `local-*` n'existent pas
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
// Un décor partagé, des tests qui s'enchaînent (#1581 : cahier puis Avancement)
test.describe.configure({ mode: 'serial' });

// Constantes

const STUDENT_PASSWORD = 'local-eleve';
const STUDENTS = {
	/** niveau 5e le temps des vérifications (#1563) */
	fifth: 'eleve17@local.test',
	/** sans niveau le temps des vérifications (#1589) */
	noLevel: 'eleve18@local.test',
	/** 1re générale le temps des vérifications (#1589) */
	general: 'eleve19@local.test',
	/** 6e (son niveau d'origine) */
	sixth: 'eleve20@local.test'
} as const;
const CLASS_NAME = 'Verifs2 5e';
const SCHOOL_ID = '05668b78-e4d2-4d85-85b6-183e75d24204';
/** Séances dans l'année scolaire 2026-2027 (la date du jour est en novembre 2026) */
const DATES = {
	journal: '2026-12-07',
	exercise: '2026-12-08',
	archived: '2026-12-09',
	question: '2026-12-10'
};
const ADDITION_5E = '71ee6212-6739-4b1c-adf9-358cfda13cea';
const UNRANKED_TEMPLATE = 'ca7436ae-72f2-4f8c-9489-22642ee71570';
const COMPLETER_UNE_SOMME = '372d4f79-d0d9-4016-bd07-56fd782b5b95';
const SHOTS = '.captures/verifs/programme';

interface PointRow {
	id: string;
	code: string;
	name: string;
	node_id: string;
	sub: string | null;
	notion: string;
	branch: string;
	notion_id: string;
	total: string;
}

// Décor

let classId = '';
let subPoint: PointRow;
let lonePoint: PointRow;
let equationPoint: PointRow;
const originalGrades = new Map<string, string | null>();
let originalTags: { template_id: string; point_id: string }[] = [];
const archivedByUs: string[] = [];

/** Un point actif de 5e : sous la sous-notion (`sub`) ou seul dans sa notion (`lone`) */
async function pickPoints(): Promise<void> {
	const base = `
		select cp.id, cp.code, cp.name, cp.node_id,
		       case when s.kind = 'subnotion' then s.name end as sub,
		       n.name as notion, b.name as branch, n.id as notion_id,
		       (select count(*) from curriculum_points q
		         where q.grade = '5' and q.archived_at is null
		           and (q.node_id = n.id or q.node_id in (select id from classification_nodes where parent_id = n.id))) as total
		  from curriculum_points cp
		  join classification_nodes s on s.id = cp.node_id
		  join classification_nodes n on n.id = case when s.kind = 'subnotion' then s.parent_id else s.id end
		  join classification_nodes b on b.id = n.parent_id
		 where cp.grade = '5' and cp.archived_at is null and s.archived_at is null and n.archived_at is null
		   and cp.name not like '%$%' and cp.name not like '%\\%'`;
	const subs = await sql<PointRow>(
		`${base} and s.kind = 'subnotion' and (select count(*) from curriculum_points q where q.grade = '5' and q.archived_at is null and (q.node_id = n.id or q.node_id in (select id from classification_nodes where parent_id = n.id))) between 2 and 6 order by cp.code limit 1`
	);
	const lones = await sql<PointRow>(
		`${base} and not exists (select 1 from curriculum_points q where q.grade = '5' and q.id <> cp.id and (q.node_id = n.id or q.node_id in (select id from classification_nodes where parent_id = n.id))) order by cp.code limit 1`
	);
	const equations = await sql<PointRow>(`${base} and cp.code = '5-045'`);
	subPoint = subs[0];
	lonePoint = lones[0];
	equationPoint = equations[0];
	expect(subPoint, 'un point de 5e sous une sous-notion').toBeTruthy();
	expect(lonePoint, 'une notion de 5e à un seul point').toBeTruthy();
	expect(equationPoint, 'le point 5-045').toBeTruthy();
}

async function cleanup(): Promise<void> {
	// Les points archivés par un passage interrompu sont restaurés plus bas (archivedByUs vide) :
	// on ne touche à l'archivage que de ce que ce passage a archivé.
	await sql(
		`delete from class_journal_entries where class_id in (select id from classes where name = $1)`,
		[CLASS_NAME]
	);
	await sql(`delete from classes where name = $1`, [CLASS_NAME]);
	await sql(`delete from exercises where created_by = $1 and source = 'verifs2'`, [TEACHER_ID]);
}

test.beforeAll(async () => {
	assertLocalServerEnv();
	await cleanup();
	await pickPoints();
	for (const email of Object.values(STUDENTS)) {
		const rows = await sql<{ grade: string | null }>(
			`select grade from profiles where email = $1`,
			[email]
		);
		if (rows.length !== 1)
			throw new Error(`Profil local ${email} absent : base remplie par db:seed-riche ?`);
		originalGrades.set(email, rows[0].grade);
	}
	originalTags = await sql<{ template_id: string; point_id: string }>(
		`select template_id, point_id from question_template_points where template_id = $1`,
		[ADDITION_5E]
	);
	await sql(`update profiles set grade = '5' where email = $1`, [STUDENTS.fifth]);
	await sql(`update profiles set grade = null where email = $1`, [STUDENTS.noLevel]);
	await sql(`update profiles set grade = '1_GEN' where email = $1`, [STUDENTS.general]);
	const created = await sql<{ id: string }>(
		`insert into classes (name, join_code, grade, is_active, school_id)
		 values ($1, 'V2' || substr(md5(random()::text), 1, 6), '5', true, $2) returning id`,
		[CLASS_NAME, SCHOOL_ID]
	);
	classId = created[0].id;
	for (const date of Object.values(DATES)) {
		await sql(
			`insert into class_journal_entries (class_id, entry_date, lesson_content, is_published)
			 values ($1, $2, $3, false)`,
			[classId, date, `Verifs2 séance du ${date}`]
		);
	}
});

test.afterAll(async () => {
	for (const [email, grade] of originalGrades) {
		await sql(`update profiles set grade = $2 where email = $1`, [email, grade]);
	}
	await sql(`delete from question_template_points where template_id = $1`, [ADDITION_5E]);
	for (const tag of originalTags) {
		await sql(`insert into question_template_points (template_id, point_id) values ($1, $2)`, [
			tag.template_id,
			tag.point_id
		]);
	}
	for (const id of archivedByUs) {
		await sql(`update curriculum_points set archived_at = null where id = $1`, [id]);
	}
	await cleanup();
});

// Functions

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Ouvre une page et la laisse s'hydrater (un clic juste après un `goto` serait perdu). */
async function open(page: Page, address: string): Promise<void> {
	await page.goto(address);
	await page.waitForLoadState('networkidle');
}

async function studentPage(browser: Browser, baseURL: string | undefined, email: string) {
	const context = await browser.newContext({ baseURL });
	const page = await context.newPage();
	await login(page, email, STUDENT_PASSWORD);
	return page;
}

async function entryId(date: string): Promise<string> {
	const rows = await sql<{ id: string }>(
		`select id from class_journal_entries where class_id = $1 and entry_date = $2`,
		[classId, date]
	);
	return rows[0].id;
}

async function coveredRows(date: string, pointId: string) {
	return sql<{ source: string }>(
		`select source from journal_entry_points where entry_id = $1 and point_id = $2`,
		[await entryId(date), pointId]
	);
}

/** Les rangs du cahier de texte : ouvre la branche puis la notion du « Programme travaillé » */
async function openCahierNotion(page: Page, point: PointRow): Promise<void> {
	await page.getByRole('button', { name: new RegExp(`^${escapeRegExp(point.branch)}`) }).click();
	await page
		.getByRole('button', { name: new RegExp(`^${escapeRegExp(point.notion)}\\s*\\(\\d+/\\d+\\)`) })
		.click();
}

function cahierUrl(date: string): string {
	return `/dashboard/teacher/cahier-texte/${classId}/${date}`;
}

function checkboxOf(page: Page | Locator, point: PointRow) {
	return page.getByRole('checkbox', { name: new RegExp(escapeRegExp(point.name)) });
}

// ============================================================================
// #1563 — tags du lot 2 bis
// ============================================================================

test('#1563 — prof : « ax + b = c » sous Algèbre > Équations : premier degré, 4-004 et 4-073 sous Entiers : priorités opératoires > écriture d’une expression', async ({
	page
}) => {
	await login(page, TEACHER.email, TEACHER.password);

	// Modèle « Compléter une somme » : rangé au bon endroit de l'arbre, et tagué 5-045
	const chain = await sql<{ sub: string; notion: string; branch: string; code: string }>(
		`select c.name as sub, p.name as notion, pp.name as branch,
		        (select cp.code from question_template_points q join curriculum_points cp on cp.id = q.point_id where q.template_id = qt.id) as code
		   from question_templates qt
		   join classification_nodes c on c.id = qt.classification_node_id
		   join classification_nodes p on p.id = c.parent_id
		   join classification_nodes pp on pp.id = p.parent_id
		  where qt.id = $1`,
		[COMPLETER_UNE_SOMME]
	);
	expect(chain).toEqual([
		{ sub: 'ax + b = c', notion: 'Équations : premier degré', branch: 'Algèbre', code: '5-045' }
	]);

	// Le programme de 5e : la branche, la notion, le point 5-045
	await open(page, '/dashboard/teacher/programme?grade=5');
	await page.getByRole('button', { name: /^Algèbre/ }).click();
	await page.getByRole('button', { name: /^Équations : premier degré/ }).click();
	const row = page.locator('li', { hasText: '5-045' });
	await expect(row).toContainText('x + b = c');

	// Le programme de 4e : les deux points sous la sous-notion « écriture d'une expression »
	await open(page, '/dashboard/teacher/programme?grade=4');
	await page.getByRole('button', { name: /^Nombres et calculs/ }).click();
	await page.getByRole('button', { name: /^Entiers : priorités opératoires/ }).click();
	for (const code of ['4-004', '4-073']) {
		const point = page.locator('li', { hasText: code });
		await expect(point).toContainText('écriture d’une expression'.replace('’', "'"));
	}
	await page.screenshot({ path: `${SHOTS}/1563-programme-4e.png` });
});

test('#1563 — élève de 5e : « Ma progression » montre le programme du niveau, avec le point tagué 5-045', async ({
	browser,
	baseURL
}) => {
	const student = await studentPage(browser, baseURL, STUDENTS.fifth);
	await open(student, '/dashboard/student/progression');
	await expect(student.getByText(/Programme de 5/)).toBeVisible();
	// La notion de 5-045 est dans la liste ; ses points sont ceux de la notion
	await student.getByRole('button', { name: /non commencées/ }).click();
	const notion = student.getByRole('link', { name: /Équations : premier degré/ });
	await notion.click();
	await student.waitForURL(/\/dashboard\/student\/notions\//);
	const card = student.locator('[data-slot="card"]', { hasText: 'x + b = c' }).first();
	await expect(card).toBeVisible();
	// 5-045 a un modèle tagué : « Pas encore d'entraînement ici » n'y figure pas
	await expect(card).not.toContainText("Pas encore d'entraînement ici");
	await student.screenshot({ path: `${SHOTS}/1563-notion-eleve-5e.png` });
	await student.context().close();
});

// ============================================================================
// #1577 — bascule B1
// ============================================================================

test('#1577 — admin : un modèle rangé montre « Points de programme » (un menu par programme, le point choisi dessous) ; autre point, « Aucun point », compteur, rechargement ; modèle sans nœud : « Rangez d’abord ce modèle »', async ({
	page
}) => {
	test.setTimeout(120_000);
	await login(page, ADMIN.email, ADMIN.password);
	const card = page.locator('[data-slot="card"]', { hasText: 'Points de programme' }).last();

	await open(page, `/dashboard/admin/questions/${ADDITION_5E}/edit`);
	await expect(card).toBeVisible({ timeout: 30_000 });
	await expect(card).toContainText('1 tagué');
	// Un menu par programme (5e et les classes suivantes) ; le premier est celui de la 5e
	const menus = card.getByRole('combobox', { name: /^Point de/ });
	expect(await menus.count()).toBeGreaterThanOrEqual(2);
	const menu = menus.first();
	// Le point tagué (5-026) est rendu dessous, avec son code
	await expect(card).toContainText('5-026');

	// Un autre point : le compteur reste à 1, le point rendu change
	await menu.click();
	const options = page.getByRole('listbox').getByRole('option');
	const labels = await options.allTextContents();
	const other = labels.find((label) => !/Aucun point/.test(label) && !/5-026/.test(label));
	expect(other, 'une option autre que « Aucun point » et le point actuel').toBeTruthy();
	await options
		.filter({ hasText: other as string })
		.first()
		.click();
	await expect(card).not.toContainText('5-026');
	const taggedCodes = () =>
		sql<{ code: string }>(
			`select cp.code from question_template_points q join curriculum_points cp on cp.id = q.point_id where q.template_id = $1`,
			[ADDITION_5E]
		).then((rows) => rows.map((row) => row.code));
	await expect.poll(async () => (await taggedCodes()).length).toBe(1);
	expect(await taggedCodes()).not.toContain('5-026');
	await page.screenshot({ path: `${SHOTS}/1577-modele-autre-point.png` });

	// « Aucun point » : le compteur suit (disparaît), la base est vide, le rechargement le confirme
	await menu.click();
	await page
		.getByRole('listbox')
		.getByRole('option', { name: /Aucun point/ })
		.click();
	await expect(card).not.toContainText('tagué');
	await expect
		.poll(
			async () =>
				(await sql(`select 1 from question_template_points where template_id = $1`, [ADDITION_5E]))
					.length
		)
		.toBe(0);
	await open(page, `/dashboard/admin/questions/${ADDITION_5E}/edit`);
	await expect(card).toBeVisible({ timeout: 30_000 });
	await expect(card).not.toContainText('tagué');
	await expect(card.getByRole('combobox', { name: /^Point de/ }).first()).toContainText(
		'Aucun point'
	);

	// Un modèle sans nœud
	await open(page, `/dashboard/admin/questions/${UNRANKED_TEMPLATE}/edit`);
	await expect(card).toContainText("Rangez d'abord ce modèle", { timeout: 30_000 });
});

test('#1577 — élève, deck « Programme » : sous chaque carte « Notion : … » ; le lien de la notion est revenu depuis #1589 (périmée sur « plus de lien »)', async ({
	browser,
	baseURL
}) => {
	const student = await studentPage(browser, baseURL, STUDENTS.sixth);
	await open(student, '/dashboard/revisions/decks/programme');
	const cards = student.locator('[data-slot="card-content"]', { hasText: 'Prochaine review' });
	const count = await cards.count();
	expect(count, 'des cartes dans le deck Programme').toBeGreaterThan(0);
	for (let i = 0; i < count; i++) {
		await expect(cards.nth(i)).toContainText('Notion :');
	}
	await student.screenshot({ path: `${SHOTS}/1577-deck-programme.png`, fullPage: true });
	await student.context().close();
});

test('#1577 — prof, cahier de texte : une séance qui cite une question taguée allume son point neuf', async ({
	page
}) => {
	test.setTimeout(120_000);
	await login(page, TEACHER.email, TEACHER.password);
	// « Compléter une somme » (5e) est taguée 5-045
	expect(await coveredRows(DATES.question, equationPoint.id)).toHaveLength(0);
	await open(page, cahierUrl(DATES.question));
	await page.getByRole('combobox', { name: /^Question du système/ }).click();
	await page
		.getByRole('option', { name: /^Compléter une somme \(niv\./ })
		.first()
		.click();
	await page
		.locator('div.flex.gap-2', { has: page.getByRole('combobox', { name: /Question/ }) })
		.getByRole('button')
		.click();
	await expect
		.poll(async () => (await coveredRows(DATES.question, equationPoint.id)).map((r) => r.source))
		.toEqual(['auto']);
	// À l'écran : le point est coché, signalé « (auto) »
	await page
		.getByRole('button', { name: new RegExp(`^${escapeRegExp(equationPoint.branch)}`) })
		.click();
	await page
		.getByRole('button', {
			name: new RegExp(`^${escapeRegExp(equationPoint.notion)}\\s*\\(\\d+/\\d+\\)`)
		})
		.click();
	await expect(checkboxOf(page, equationPoint)).toBeChecked();
	await expect(page.getByText('(auto)')).toBeVisible();
	await page.screenshot({ path: `${SHOTS}/1577-cahier-auto.png`, fullPage: true });
});

// ============================================================================
// #1581 — bascule B2
// ============================================================================

test('#1581 — cahier de texte : « Programme travaillé » en branches > notions, sous-notion en étiquette ; cocher, recharger, compteur de la branche à 1 ; décocher → 0', async ({
	page
}) => {
	test.setTimeout(120_000);
	await login(page, TEACHER.email, TEACHER.password);
	await open(page, cahierUrl(DATES.journal));
	await expect(page.getByText('Programme travaillé')).toBeVisible();

	const branchButton = page.getByRole('button', {
		name: new RegExp(`^${escapeRegExp(subPoint.branch)}`)
	});
	await expect(branchButton).toBeVisible();
	// Branche sans compteur : rien de coché
	await expect(branchButton).toHaveText(subPoint.branch);
	await openCahierNotion(page, subPoint);
	// Le ratio de la notion : 0 point coché sur le total de la notion
	await expect(
		page.getByRole('button', {
			name: new RegExp(`^${escapeRegExp(subPoint.notion)}\\s*\\(0/${subPoint.total}\\)`)
		})
	).toBeVisible();
	// La sous-notion est une étiquette à côté du point
	const box = checkboxOf(page, subPoint);
	await expect(box).toBeVisible();
	await expect(
		page
			.locator('div.checkbox-wrapper', { has: box })
			.getByText(subPoint.sub as string, { exact: true })
	).toBeVisible();

	await box.click();
	await expect(box).toBeChecked();
	await expect.poll(async () => (await coveredRows(DATES.journal, subPoint.id)).length).toBe(1);
	// Enregistrer la séance, recharger : toujours coché, compteur de la branche à 1
	await page.getByRole('button', { name: 'Enregistrer' }).click();
	await page.waitForLoadState('networkidle');
	await open(page, cahierUrl(DATES.journal));
	await expect(
		page.getByRole('button', { name: new RegExp(`^${escapeRegExp(subPoint.branch)}`) })
	).toContainText('1');
	await page.getByRole('button', { name: new RegExp(`^${escapeRegExp(subPoint.branch)}`) }).click();
	await page
		.getByRole('button', {
			name: new RegExp(`^${escapeRegExp(subPoint.notion)}\\s*\\(1/${subPoint.total}\\)`)
		})
		.click();
	await expect(checkboxOf(page, subPoint)).toBeChecked();
	await page.screenshot({ path: `${SHOTS}/1581-cahier-coche.png`, fullPage: true });

	// Décocher : le compteur disparaît, la base est vide
	await checkboxOf(page, subPoint).click();
	await expect(checkboxOf(page, subPoint)).not.toBeChecked();
	await expect.poll(async () => (await coveredRows(DATES.journal, subPoint.id)).length).toBe(0);
	await expect(
		page.getByRole('button', { name: new RegExp(`^${escapeRegExp(subPoint.branch)}`) })
	).toHaveText(subPoint.branch);
	// Recocher pour la suite (Avancement)
	await checkboxOf(page, subPoint).click();
	await expect.poll(async () => (await coveredRows(DATES.journal, subPoint.id)).length).toBe(1);
});

test('#1581 — Avancement de la même classe : même arbre, le point compté une seule fois', async ({
	page
}) => {
	await login(page, TEACHER.email, TEACHER.password);
	await open(page, `/dashboard/teacher/avancement?class=${classId}`);
	const branch = page.getByRole('button', {
		name: new RegExp(`^${escapeRegExp(subPoint.branch)}`)
	});
	await expect(branch).toBeVisible();
	await branch.click();
	const notion = page.getByRole('button', {
		name: new RegExp(`^${escapeRegExp(subPoint.notion)}\\s*1/${subPoint.total}$`)
	});
	await expect(notion).toBeVisible();
	await notion.click();
	// Le point : une fois (cellule « 1 »), sa sous-notion en étiquette
	const row = page.locator('div.flex.items-center.gap-2', { hasText: subPoint.name }).last();
	await expect(row.locator('span.rounded').first()).toHaveText('1');
	await expect(row).toContainText(subPoint.sub as string);
	// Aucun autre point de la notion n'est compté : exactement 1 vu
	await page.screenshot({ path: `${SHOTS}/1581-avancement.png`, fullPage: true });
});

test('#1581 — exercice rangé : « Points de programme » ne montre que les points de ses notions, cocher puis recharger ; exercice non rangé : « n’est rangée dans aucune notion »', async ({
	page
}) => {
	test.setTimeout(120_000);
	await login(page, TEACHER.email, TEACHER.password);
	const insert = async (title: string) => {
		const rows = await sql<{ id: string }>(
			withFirstVersion(
				`insert into exercises (title, source, grades, topic, created_by, category, variations)
				 values ($1, 'verifs2', '{5}', 'Verifs2', $2, 'automatisme', $3::jsonb) returning id`
			),
			[
				title,
				TEACHER_ID,
				JSON.stringify([
					{ label: 'guided', hints: [], statement_md: 'Calculer.', solution_md: '1' }
				])
			]
		);
		return rows[0].id;
	};
	const ranked = await insert('Verifs2 exercice rangé');
	const unranked = await insert('Verifs2 exercice non rangé');
	await sql(
		`insert into exercise_classifications (exercise_id, node_id, is_primary) values ($1, $2, true)`,
		[ranked, equationPoint.notion_id]
	);

	await open(page, `/dashboard/teacher/contenu/exercices/${ranked}`);
	const card = page.locator('[data-slot="card"]', { hasText: 'Points de programme' }).last();
	await expect(card).toBeVisible();
	// Seule la branche de la notion où il est rangé
	const branches = card
		.locator('button', { hasText: /^\s*\S/ })
		.filter({ hasText: equationPoint.branch });
	await expect(branches).toHaveCount(1);
	await branches.first().click();
	await card.getByRole('button', { name: /Équations : premier degré/ }).click();
	const box = checkboxOf(card, equationPoint);
	await expect(box).toBeVisible();
	const otherBranches = await card.locator('button').allTextContents();
	expect(
		otherBranches.filter((text) => /Nombres et calculs|Géométrie|Grandeurs/.test(text))
	).toEqual([]);
	await box.click();
	await expect(box).toBeChecked();
	await expect
		.poll(
			async () =>
				(await sql(`select 1 from exercise_curriculum_points where exercise_id = $1`, [ranked]))
					.length
		)
		.toBe(1);
	await open(page, `/dashboard/teacher/contenu/exercices/${ranked}`);
	await card
		.getByRole('button', { name: new RegExp(`^${escapeRegExp(equationPoint.branch)}`) })
		.click();
	await card.getByRole('button', { name: /Équations : premier degré/ }).click();
	await expect(checkboxOf(card, equationPoint)).toBeChecked();

	// Non rangé
	await open(page, `/dashboard/teacher/contenu/exercices/${unranked}`);
	await expect(
		page.getByText(/n’est rangée dans aucune notion|n'est rangée dans aucune notion/)
	).toBeVisible();
});

// ============================================================================
// #1583 — bascule B3
// ============================================================================

test('#1583 — point de 5e archivé déjà coché : « archivé » au cahier, décochable, pas recochable ; « archivé » à l’Avancement sans compter dans « vus / total » ; notion sans autre point : pas de ratio ; exercice tagué sur ce point : pas coché automatiquement', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);
	// Une séance où le point seul de sa notion est déjà coché, puis archivé
	const entry = await entryId(DATES.archived);
	await sql(
		`insert into journal_entry_points (entry_id, point_id, source) values ($1, $2, 'manual')`,
		[entry, lonePoint.id]
	);
	await sql(`update curriculum_points set archived_at = now() where id = $1`, [lonePoint.id]);
	archivedByUs.push(lonePoint.id);

	await open(page, cahierUrl(DATES.archived));
	await page
		.getByRole('button', { name: new RegExp(`^${escapeRegExp(lonePoint.branch)}`) })
		.click();
	await page
		.getByRole('button', {
			name: new RegExp(`^${escapeRegExp(lonePoint.notion)}\\s*\\(\\d+/\\d+\\)`)
		})
		.click();
	const box = checkboxOf(page, lonePoint);
	await expect(box).toBeChecked();
	await expect(page.locator('div.checkbox-wrapper', { has: box })).toContainText('archivé');
	await page.screenshot({ path: `${SHOTS}/1583-cahier-archive.png`, fullPage: true });

	// Avancement : « archivé », notion sans ratio (son seul point est archivé)
	const advancement = await page.context().newPage();
	await open(advancement, `/dashboard/teacher/avancement?class=${classId}`);
	await advancement
		.getByRole('button', { name: new RegExp(`^${escapeRegExp(lonePoint.branch)}`) })
		.click();
	const notionButton = advancement.getByRole('button', {
		name: new RegExp(`^${escapeRegExp(lonePoint.notion)}`)
	});
	await expect(notionButton).toBeVisible();
	await expect(notionButton).not.toContainText(/\d+\/\d+/);
	await notionButton.click();
	await expect(
		advancement.locator('div.flex.items-center.gap-2', { hasText: lonePoint.name }).last()
	).toContainText('archivé');
	await advancement.screenshot({ path: `${SHOTS}/1583-avancement-archive.png`, fullPage: true });
	await advancement.close();

	// Décocher : permis ; recocher : refusé (rien en base, la case revient décochée)
	await box.click();
	await expect(box).not.toBeChecked();
	await expect.poll(async () => (await coveredRows(DATES.archived, lonePoint.id)).length).toBe(0);
	await box.click();
	await page.waitForTimeout(1500);
	expect(await coveredRows(DATES.archived, lonePoint.id)).toHaveLength(0);
	await expect(box).not.toBeChecked();

	// Un exercice tagué sur ce point (archivé) et un autre sur 5-045 (actif) : seul le second allume son point
	const make = async (title: string, nodeId: string, pointId: string) => {
		const rows = await sql<{ id: string }>(
			withFirstVersion(
				`insert into exercises (title, source, grades, topic, created_by, category, variations)
				 values ($1, 'verifs2', '{5}', 'Verifs2', $2, 'automatisme', $3::jsonb) returning id`
			),
			[
				title,
				TEACHER_ID,
				JSON.stringify([
					{ label: 'guided', hints: [], statement_md: 'Calculer.', solution_md: '1' }
				])
			]
		);
		await sql(
			`insert into exercise_classifications (exercise_id, node_id, is_primary) values ($1, $2, true)`,
			[rows[0].id, nodeId]
		);
		await sql(`insert into exercise_curriculum_points (exercise_id, point_id) values ($1, $2)`, [
			rows[0].id,
			pointId
		]);
	};
	await make('Verifs2 exercice du point archivé', lonePoint.node_id, lonePoint.id);
	await make('Verifs2 exercice du point actif', equationPoint.node_id, equationPoint.id);
	await open(page, cahierUrl(DATES.archived));
	for (const title of ['Verifs2 exercice du point actif', 'Verifs2 exercice du point archivé']) {
		await page
			.getByRole('combobox', { name: /du système/ })
			.first()
			.click();
		await page.getByRole('listbox').getByRole('option', { name: title }).click();
		await page
			.locator('div.flex.gap-2', { has: page.getByRole('combobox', { name: /du système/ }) })
			.first()
			.getByRole('button')
			.click();
		await expect(page.locator('li', { hasText: title })).toBeVisible();
	}
	await expect
		.poll(async () => (await coveredRows(DATES.archived, equationPoint.id)).map((r) => r.source))
		.toEqual(['auto']);
	expect(await coveredRows(DATES.archived, lonePoint.id)).toHaveLength(0);
});

// ============================================================================
// #1589 — « Ma progression » par notion
// ============================================================================

test('#1589 — élève de 6e : « Ce que je sais faire » par branche > notion, ◯ / 🟠 / 🟢 sans ✨, compteur identique à la tuile du tableau de bord ; une notion → ses points, retour à la progression ; ancienne adresse → progression', async ({
	browser,
	baseURL
}) => {
	test.setTimeout(120_000);
	const student = await studentPage(browser, baseURL, STUDENTS.sixth);
	await open(student, '/dashboard/student/progression');
	await expect(student.getByRole('tab', { name: 'Ce que je sais faire' })).toBeVisible();
	await expect(student.getByText(/Programme de 6/)).toBeVisible();
	// Les trois états sans ✨
	const body = await student.locator('main.container').innerText();
	expect(body).not.toContain('✨');
	const counter = await student
		.getByText(/^\d+\/\d+ atteintes?$/)
		.first()
		.innerText();
	await student.getByRole('button', { name: /non commencées/ }).click();
	await expect(
		student.locator('[aria-label="Non commencé"], [aria-label^="Non commenc"]').first()
	).toBeVisible();
	await expect(student.locator('section[id^="branche-"]').first()).toBeVisible();
	// Les cartes de notion sont des liens vers la page de la notion
	const notionLinks = student.locator(
		'section[id^="branche-"] a[href^="/dashboard/student/notions/"]'
	);
	expect(await notionLinks.count()).toBeGreaterThan(5);
	await student.screenshot({ path: `${SHOTS}/1589-progression-6e.png`, fullPage: true });

	// La tuile du tableau de bord : le même compteur (« X/Y notions atteintes »)
	await open(student, '/dashboard');
	const tile = await student
		.getByText(/\d+\/\d+ notions? atteintes?/)
		.first()
		.innerText();
	const [done, total] = counter.match(/\d+/g) as string[];
	expect(tile).toContain(`${done}/${total}`);

	// Une notion : ses points, avec la sous-notion nommée, et le retour à la progression
	await open(student, '/dashboard/student/progression');
	await student.getByRole('button', { name: /non commencées/ }).click();
	await notionLinks.first().click();
	await student.waitForURL(/\/dashboard\/student\/notions\//);
	await expect(student.locator('[data-slot="card"]').first()).toBeVisible();
	await student.screenshot({ path: `${SHOTS}/1589-notion-6e.png`, fullPage: true });
	await student.getByRole('link', { name: 'Retour à ma progression' }).click();
	await student.waitForURL(/\/dashboard\/student\/progression/);

	// Ancienne adresse : renvoyée à la progression
	await student.goto('/dashboard/student/objectifs/00000000-0000-4000-8000-000000000000');
	await student.waitForURL(/\/dashboard\/student\/progression\?onglet=objectifs/);
	await student.context().close();
});

test('#1589 — notion : un point sans modèle tagué dit « Pas encore d’entraînement ici », une sous-notion est nommée', async ({
	browser,
	baseURL
}) => {
	const untrainable = await sql<{ notion_id: string; sub: string }>(
		`select n.id as notion_id, s.name as sub
		   from curriculum_points cp
		   join classification_nodes s on s.id = cp.node_id and s.kind = 'subnotion'
		   join classification_nodes n on n.id = s.parent_id
		  where cp.grade = '6' and cp.archived_at is null
		    and not exists (select 1 from question_template_points q join question_templates t on t.id = q.template_id where q.point_id = cp.id and t.status = 'published')
		  order by cp.code limit 1`
	);
	expect(untrainable, 'un point de 6e sans modèle publié, sous une sous-notion').toHaveLength(1);
	const student = await studentPage(browser, baseURL, STUDENTS.sixth);
	await open(student, `/dashboard/student/notions/${untrainable[0].notion_id}`);
	await expect(student.getByText("Pas encore d'entraînement ici").first()).toBeVisible();
	await expect(student.getByText(untrainable[0].sub).first()).toBeVisible();
	await student.context().close();
});

test('#1589 — élève de 1re générale : le programme de son niveau ; élève sans niveau : « Ton niveau n’est pas renseigné »', async ({
	browser,
	baseURL
}) => {
	const general = await studentPage(browser, baseURL, STUDENTS.general);
	await open(general, '/dashboard/student/progression');
	await expect(general.getByText(/Programme de 1/)).toBeVisible();
	await general.screenshot({ path: `${SHOTS}/1589-progression-1gen.png` });
	await general.context().close();

	const none = await studentPage(browser, baseURL, STUDENTS.noLevel);
	await open(none, '/dashboard/student/progression?onglet=objectifs');
	await expect(
		none.getByText("Ton niveau n'est pas renseigné : demande à ton professeur.")
	).toBeVisible();
	await none.screenshot({ path: `${SHOTS}/1589-sans-niveau.png` });
	await none.context().close();
});

test('#1589 — deck « Programme » : lien de notion, retour au Programme', async ({
	browser,
	baseURL
}) => {
	const student = await studentPage(browser, baseURL, STUDENTS.sixth);
	await open(student, '/dashboard/revisions/decks/programme');
	const link = student.locator('a[href*="/dashboard/student/notions/"]').first();
	await expect(link).toBeVisible();
	await link.click();
	await student.waitForURL(/\/dashboard\/student\/notions\/.*depuis=programme/);
	await student.getByRole('link', { name: 'Retour au Programme' }).click();
	await student.waitForURL(/\/dashboard\/revisions\/decks\/programme/);
	await student.context().close();
});
