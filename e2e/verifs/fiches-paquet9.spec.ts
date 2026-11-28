import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql, TEACHER, withFirstVersion } from './helpers/carnet';
import {
	createWorksheet,
	FICHES_TMP,
	pdfFonts,
	pdfRuns,
	pdfText,
	savePdf,
	STYLE_IDS,
	TEACHER_ID
} from './helpers/fiches';
import { acquireLock, LOCK_WAIT_MAX_MS, refreshLock, releaseLock } from './helpers/verrou';
import { pdfBoxes, rasterPage, type PdfBox } from './helpers/pdf-mesures';
import {
	branchOf,
	composedTitle,
	type TitleTreeNode
} from '../../src/lib/worksheets/worksheet-title';
import { gotoSettled } from './helpers/pages';

/**
 * Paquet 9, fiches : titre par branche, catégorie et notions — base LOCALE
 * =========================================================================
 *
 * Lignes #2938/#2939 (50 fiches reprises, titre par branche) et #2912 (catégorie et notions
 * d'une fiche). La reprise `--appliquer` est une écriture en prod : ici, les 50 fiches reprises
 * du seed local sont LUES (liste) et COPIÉES (décor « Verifs9 … » repéré par sa description) ;
 * aucune fiche du seed n'est modifiée.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
// Tests indépendants, rejoués l'un après l'autre : un rouge n'en saute pas d'autres
test.describe.configure({ mode: 'default' });

// Constantes

const WORKSHEETS_URL = '/dashboard/teacher/contenu/worksheets';
const PREFIX = 'Verifs9 fiches';
const LOCK = 'eleves-21-25';
const STUDENT_PASSWORD = 'local-eleve';
/** Élèves fictifs du paquet : 21 lit en lecture facilitée, 22 et 23 non */
const STUDENTS = {
	'eleve21@local.test': '5eed0000-0000-4000-8000-000000000021',
	'eleve22@local.test': '5eed0000-0000-4000-8000-000000000022',
	'eleve23@local.test': '5eed0000-0000-4000-8000-000000000023'
} as const;
type StudentEmail = keyof typeof STUDENTS;
/** Un paragraphe de plusieurs lignes, pour mesurer l'alignement du texte */
const LONG_PARAGRAPH =
	'Verifs9 paragraphe : une longue phrase qui passe à la ligne plusieurs fois afin que la justification éventuelle du texte se voie sur la page, avec des mots de longueurs très différentes comme ordinateur, ou, extraordinairement, un, anticonstitutionnellement et petit, puis encore de quoi remplir quatre lignes entières sans aucun retour forcé.';

// Functions

/** Le décor d'un passage : repéré par sa description, retiré avant et après */
async function wipe(): Promise<void> {
	await sql(`delete from worksheets where created_by = $1 and description like $2`, [
		TEACHER_ID,
		`${PREFIX}%`
	]);
}

/**
 * Décor du lien du cours (dernier test) : chapitres « Verifs9 chapitre … » et jetons `verifs9…`,
 * balayés sous le verrou au démarrage et à la fin (un arrêt brutal les laisse en base).
 */
async function wipeCourse(): Promise<void> {
	const chapters = await sql<{ id: string }>(
		`select id from class_chapters where title like 'Verifs9 chapitre%'`
	);
	for (const chapter of chapters) {
		await sql(`delete from chapter_worksheets where chapter_id = $1`, [chapter.id]);
		await sql(`delete from class_chapters where id = $1`, [chapter.id]);
	}
	await sql(`delete from class_course_share_tokens where token like 'verifs9%'`);
}

/** Copie brouillon d'une fiche du seed (notions, deux premiers exercices) ; le titre reste celui de la source */
async function copyOf(title: string, tag: string, type?: string): Promise<string> {
	const src = await sql<{ id: string }>(
		`select id from worksheets where title = $1 and created_by = $2 order by status limit 1`,
		[title, TEACHER_ID]
	);
	expect(src.length, `fiche « ${title} » absente de la base locale`).toBe(1);
	const created = await sql<{ id: string }>(
		`insert into worksheets (title, description, type, config, status, created_by, style_id, grades, category, custom_title)
		 select title, $2, coalesce($3, type), config, 'draft', created_by, style_id, grades, category, custom_title
		 from worksheets where id = $1 returning id`,
		[src[0].id, `${PREFIX} ${tag}`, type ?? null]
	);
	const id = created[0].id;
	await sql(
		`insert into worksheet_classifications (worksheet_id, node_id, position)
		 select $2, node_id, position from worksheet_classifications where worksheet_id = $1`,
		[src[0].id, id]
	);
	await sql(
		`insert into worksheet_exercises (worksheet_id, exercise_id, exercise_version_id, position)
		 select $2, exercise_id, exercise_version_id, row_number() over (order by position) from worksheet_exercises
		 where worksheet_id = $1 order by position limit 2`,
		[src[0].id, id]
	);
	return id;
}

/** Arbre des nœuds, pour remonter à la branche d'une notion */
async function treeOf(): Promise<Map<string, TitleTreeNode>> {
	const rows = await sql<{ id: string } & TitleTreeNode>(
		`select id, name, kind, parent_id from classification_nodes`
	);
	return new Map(rows.map((row) => [row.id, row]));
}

/** Ce que le PDF imprime en tête : badge, titre en grand, notions, catégorie ; et le bas de page */
function headOf(pdf: string): { head: PdfBox[]; foot: PdfBox[]; all: PdfBox[] } {
	const { boxes, pages } = pdfBoxes(pdf);
	const first = boxes.filter((box) => box.page === 1);
	const height = pages[0].height;
	return {
		head: first.filter((box) => box.top < 100 && box.text !== 'chiph.re'),
		foot: first.filter((box) => box.top > height - 40),
		all: boxes
	};
}

function boxText(boxes: PdfBox[], text: string): PdfBox {
	const found = boxes.find((box) => box.text === text);
	expect(found, `« ${text} » absent de : ${boxes.map((b) => b.text).join(' | ')}`).toBeTruthy();
	return found as PdfBox;
}

/** Pixels orange (badge du niveau) dans la boîte d'un texte, élargie de 3 pt */
function orangeShare(pdf: string, box: PdfBox): number {
	const dpi = 100;
	const raster = rasterPage(pdf, 1, dpi);
	const scale = dpi / 72;
	let orange = 0;
	let total = 0;
	for (let y = Math.floor((box.top - 3) * scale); y < (box.top + box.height + 3) * scale; y++) {
		for (let x = Math.floor((box.left - 3) * scale); x < (box.left + box.width + 3) * scale; x++) {
			const i = (y * raster.width + x) * 3;
			const [r, g, b] = [raster.data[i], raster.data[i + 1], raster.data[i + 2]];
			total++;
			if (r > 200 && g > 90 && g < 200 && b < 110) orange++;
		}
	}
	return orange / total;
}

/** Le pixel le plus sombre (luminance 0-255) dans la boîte d'un texte */
function darkest(pdf: string, box: PdfBox, fromFraction = 0): number {
	const dpi = 100;
	const raster = rasterPage(pdf, 1, dpi);
	const scale = dpi / 72;
	let min = 255;
	for (
		let y = Math.floor((box.top + box.height * fromFraction) * scale);
		y < (box.top + box.height) * scale;
		y++
	) {
		for (let x = Math.floor(box.left * scale); x < (box.left + box.width) * scale; x++) {
			const i = (y * raster.width + x) * 3;
			min = Math.min(min, (raster.data[i] + raster.data[i + 1] + raster.data[i + 2]) / 3);
		}
	}
	return min;
}

/** Ce que la carte « Informations » de l'éditeur montre du titre composé */
async function composedOnScreen(page: Page): Promise<string> {
	const label = page.getByText('Titre composé', { exact: true });
	await expect(label).toBeVisible();
	return (await label.locator('xpath=following-sibling::p').first().innerText()).trim();
}

/** PDF de la fiche par l'onglet « PDF » du prof (navigation et clics rejoués si la page n'est pas prête) */
async function teacherPdf(page: Page, worksheetId: string, options: { saveAs: string }) {
	await gotoSettled(page, `${WORKSHEETS_URL}/${worksheetId}`);
	const kind = page.getByRole('combobox', { name: /^PDF à générer/ });
	await expect(async () => {
		await page.getByRole('tab', { name: 'PDF' }).click();
		await expect(kind).toBeVisible({ timeout: 8_000 });
	}).toPass({ timeout: 90_000 });
	await pick(page, /^PDF à générer/, /^Fiche\s*(✓)?$/);
	return savePdf(page, 'Telecharger', options.saveAs);
}

async function openEditor(page: Page, id: string): Promise<void> {
	await gotoSettled(page, `${WORKSHEETS_URL}/${id}`);
	await expect(page.getByText('Informations', { exact: true })).toBeVisible();
}

test.beforeAll(async () => {
	assertLocalServerEnv();
	await wipe();
});

test.afterAll(async () => {
	await wipe();
});

test('#2938 #2939 — liste du prof : titres par branche des fiches reprises, titres libres inchangés, « Evaluation : Produit scalaire » est une évaluation', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);
	const tree = await treeOf();

	// Les 50 fiches reprises sont dans la base locale : même nombre que la reprise
	const all = await sql<{
		id: string;
		title: string;
		type: string;
		category: string | null;
		custom_title: boolean;
	}>(
		`select id, title, type, category, custom_title from worksheets
		 where created_by = $1
		   and (description is null or (description not like $2 and description not like 'Verifs%'))
		   and title not like 'Verifs%'`,
		[TEACHER_ID, `${PREFIX}%`]
	);
	expect(all.length).toBe(50);

	// Chaque fiche sans titre libre porte EXACTEMENT le titre composé de sa catégorie et de ses notions
	const composed = all.filter((w) => !w.custom_title);
	expect(composed.length).toBeGreaterThanOrEqual(25);
	for (const w of composed) {
		const rows = await sql<{ node_id: string; name: string }>(
			`select c.node_id, n.name from worksheet_classifications c join classification_nodes n on n.id = c.node_id
			 where c.worksheet_id = $1 order by c.position`,
			[w.id]
		);
		const expected = composedTitle(
			w.category as 'technical_practice' | 'applications' | null,
			rows.map((r) => ({ name: r.name, branch: branchOf(r.node_id, tree) }))
		);
		expect(w.title, `fiche ${w.id}`).toBe(expected);
		expect(w.title).toMatch(/ · (Entraînement technique|Applications)$/);
	}
	// Les titres de la ligne, en clair (pas seulement recalculés par la même fonction)
	const titles = new Set(all.map((w) => w.title));
	for (const wanted of [
		'Suites · Entraînement technique',
		'Suites · Applications',
		'Second degré · Entraînement technique'
	]) {
		expect(titles.has(wanted), wanted).toBe(true);
	}

	// Automatismes, révisions, évaluations : titre libre, inchangé
	for (const w of all.filter((x) => x.category === 'automatisms' || x.category === 'review')) {
		expect(w.custom_title, w.title).toBe(true);
	}
	expect(titles.has('Automatismes : dérivation')).toBe(true);
	expect(titles.has('Préparation Bac Blanc 1')).toBe(true);
	const evaluation = all.find((w) => w.title === 'Evaluation : Produit scalaire');
	expect(evaluation?.type).toBe('assessment');
	expect(evaluation?.custom_title).toBe(true);

	// À l'écran : la liste rend ces titres
	await gotoSettled(page, `${WORKSHEETS_URL}?limit=100`);
	const body = page.locator('main');
	await expect(body.getByText('Suites · Entraînement technique', { exact: true })).toBeVisible();
	await expect(body.getByText('Suites · Applications', { exact: true })).toBeVisible();
	await expect(
		body.getByText('Second degré · Entraînement technique', { exact: true })
	).toBeVisible();
	await expect(body.getByText('Automatismes : dérivation', { exact: true }).first()).toBeVisible();
	await expect(body.getByText('Evaluation : Produit scalaire', { exact: true })).toBeVisible();
	await gotoSettled(page, `${WORKSHEETS_URL}?limit=100&type=assessment`);
	await expect(body.getByText('Evaluation : Produit scalaire', { exact: true })).toBeVisible();
	await expect(body.getByText('Suites · Entraînement technique', { exact: true })).toHaveCount(0);
});

test('#2938 #2912 — PDF d’« Entraînement technique · Suites » : « Suites » en grand, les trois notions dessous, « entraînement technique » en petit, badge orange à gauche, bas de page', async ({
	page
}, testInfo) => {
	test.setTimeout(300_000);
	const id = await copyOf('Suites · Entraînement technique', testInfo.project.name);
	await login(page, TEACHER.email, TEACHER.password);
	const pdf = await teacherPdf(page, id, { saveAs: `p9-suites-${testInfo.project.name}.pdf` });
	const { head, foot } = headOf(pdf);

	const main = boxText(head, 'Suites');
	const notions = boxText(
		head,
		'Généralités sur les suites · Suites arithmétiques · Suites géométriques'
	);
	const sub = boxText(head, 'entraînement technique');
	const badge = boxText(head, '1ère Spé');
	// Taille : le titre en grand, les notions en moyen, la catégorie en petit
	expect(main.size).toBeGreaterThan(notions.size);
	expect(notions.size).toBeGreaterThan(sub.size);
	// Ordre vertical : titre, notions, catégorie dessous
	expect(main.top).toBeLessThan(notions.top);
	expect(notions.top).toBeLessThan(sub.top);
	// Le badge du niveau est à gauche du titre, et orange
	expect(badge.left + badge.width).toBeLessThan(main.left);
	expect(orangeShare(pdf, badge)).toBeGreaterThan(0.08);
	expect(orangeShare(pdf, main)).toBe(0);
	// La catégorie est en gris (plus claire que le titre, sans teinte), le titre en noir
	expect(darkest(pdf, main)).toBeLessThan(60);
	const subTone = darkest(pdf, sub, 0.5);
	expect(subTone).toBeGreaterThan(90);
	expect(subTone).toBeLessThan(200);
	// Bas de page : badge du niveau puis « Suites · Entraînement technique », et la page
	const footTexts = foot.map((box) => box.text);
	expect(footTexts).toContain('1ère Spé');
	expect(footTexts).toContain('Suites · Entraînement technique');
	expect(boxText(foot, '1ère Spé').left).toBeLessThan(
		boxText(foot, 'Suites · Entraînement technique').left
	);
	// Le titre de la fiche n'est écrit qu'une fois en tête (pas le titre de la base en plus)
	expect(pdfText(pdf)[0].split('Suites · Entraînement technique').length - 1).toBe(1);
});

test('#2938 — éditeur : retirer une des trois notions de suites garde « Suites · Entraînement technique », n’en garder qu’une donne son nom, ajouter Dérivation les met en toutes lettres', async ({
	page
}, testInfo) => {
	test.setTimeout(240_000);
	const id = await copyOf('Suites · Entraînement technique', testInfo.project.name);
	await login(page, TEACHER.email, TEACHER.password);
	await openEditor(page, id);
	expect(await composedOnScreen(page)).toBe('Suites · Entraînement technique');

	// Retirer une des trois : deux notions de la même branche → la branche
	await page.getByRole('button', { name: 'Retirer Suites géométriques' }).click();
	await expect.poll(() => composedOnScreen(page)).toBe('Suites · Entraînement technique');
	// N'en garder qu'une : son nom
	await page.getByRole('button', { name: 'Retirer Généralités sur les suites' }).click();
	await expect
		.poll(() => composedOnScreen(page))
		.toBe('Suites arithmétiques · Entraînement technique');

	// Ajouter Dérivation (autre branche) : les notions en toutes lettres, plus de branche
	await chooseNotion(page, 'Fonctions', 'Dérivation');
	await expect
		.poll(() => composedOnScreen(page))
		.toBe('Suites arithmétiques · Dérivation · Entraînement technique');

	// Enregistrer : le titre composé est écrit en base
	await page.getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByText('Modifications enregistrees')).toBeVisible();
	const saved = await sql<{ title: string }>(`select title from worksheets where id = $1`, [id]);
	expect(saved[0].title).toBe('Suites arithmétiques · Dérivation · Entraînement technique');
});

// ============================================================================
// #2912 — catégorie et notions d'une fiche, éditeur puis PDF
// ============================================================================

/** Texte du titre imprimé en grand, notions, catégorie : lu dans la tête du PDF */
function printedHead(pdf: string): string[] {
	return headOf(pdf).head.map((box) => box.text);
}

/** Ouvre un menu et choisit une option ; le menu rouvert si la page n'était pas encore hydratée */
async function pick(page: Page, trigger: RegExp, option: string | RegExp): Promise<void> {
	const wanted = page.getByRole('option', {
		name: typeof option === 'string' ? new RegExp(`^${option}\\s*(✓)?$`) : option
	});
	for (let attempt = 0; attempt < 12; attempt++) {
		await page.getByRole('combobox', { name: trigger }).click();
		try {
			await wanted.waitFor({ state: 'visible', timeout: 5000 });
			await wanted.click();
			return;
		} catch {
			await page.keyboard.press('Escape');
		}
	}
	const seen = await page.getByRole('option').allInnerTexts();
	throw new Error(`option « ${option} » introuvable parmi : ${seen.join(' | ')}`);
}

async function chooseNotion(page: Page, branch: string, notion: string): Promise<void> {
	await pick(page, /^Branche/, branch);
	await pick(page, /^Notion/, notion);
	await page.getByRole('button', { name: 'Ajouter la notion' }).click();
}

async function save(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByText('Modifications enregistrees')).toBeVisible();
}

test('#2912 — brouillon : carte « Informations » (Catégorie, Notion en cascade, Titre libre), titre composé, révisions et plusieurs notions, titre libre seul sur le PDF', async ({
	page
}, testInfo) => {
	test.setTimeout(400_000);
	const tag = testInfo.project.name;
	// Un brouillon neuf : ni catégorie, ni notion, titre libre (comme à la création)
	const id = await copyOf('Suites · Entraînement technique', tag);
	await sql(`delete from worksheet_classifications where worksheet_id = $1`, [id]);
	await sql(
		`update worksheets set category = null, custom_title = true, title = $2 where id = $1`,
		[id, `Verifs9 brouillon ${tag}`]
	);
	await login(page, TEACHER.email, TEACHER.password);
	await openEditor(page, id);
	const card = page.locator('text=Informations').first();
	await expect(card).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'Catégorie : aucune' })).toBeVisible();
	await expect(page.locator('p', { hasText: 'Aucune notion' })).toBeVisible();
	await expect(page.getByRole('combobox', { name: /^Branche/ })).toBeVisible();
	await expect(page.getByRole('combobox', { name: /^Notion/ })).toBeVisible();
	const freeTitle = page.getByRole('checkbox', { name: /Titre libre/ });
	await expect(freeTitle).toBeChecked();

	// Entraînement technique + une notion de suites, case décochée → titre composé enregistré
	await pick(page, /^Catégorie/, 'Entraînement technique');
	await chooseNotion(page, 'Suites', 'Suites arithmétiques');
	await freeTitle.uncheck();
	await expect
		.poll(() => composedOnScreen(page))
		.toBe('Suites arithmétiques · Entraînement technique');
	await save(page);
	expect(
		(await sql<{ title: string }>(`select title from worksheets where id = $1`, [id]))[0].title
	).toBe('Suites arithmétiques · Entraînement technique');

	// PDF : badge à gauche, notion en grand, catégorie en petit dessous, bas de page
	const pdf = await teacherPdf(page, id, { saveAs: `p9-brouillon-${tag}.pdf` });
	const { head, foot } = headOf(pdf);
	const main = boxText(head, 'Suites arithmétiques');
	const sub = boxText(head, 'entraînement technique');
	expect(main.size).toBeGreaterThan(sub.size);
	expect(main.top).toBeLessThan(sub.top);
	expect(boxText(head, '1ère Spé').left + boxText(head, '1ère Spé').width).toBeLessThan(main.left);
	expect(foot.map((b) => b.text)).toEqual(
		expect.arrayContaining(['1ère Spé', 'Suites arithmétiques · Entraînement technique'])
	);

	// Révisions + une seconde notion d'une autre branche → toutes les notions et « Révisions »
	await openEditor(page, id);
	await pick(page, /^Catégorie/, 'Révisions');
	await chooseNotion(page, 'Fonctions', 'Dérivation');
	expect(await composedOnScreen(page)).toBe('Suites arithmétiques · Dérivation · Révisions');
	await save(page);
	expect(
		(await sql<{ title: string }>(`select title from worksheets where id = $1`, [id]))[0].title
	).toBe('Suites arithmétiques · Dérivation · Révisions');

	// Applications avec deux notions : la ligne annonçait « consigne de retirer, Enregistrer refusé ».
	// Périmé : ADR 0041 amendé le 2026-11-19 (autant de notions qu'on veut, la garde de la base est retirée).
	await openEditor(page, id);
	await pick(page, /^Catégorie/, 'Applications');
	await expect(page.getByText(/une seule notion|retire/i)).toHaveCount(0);
	await save(page);
	const applied = await sql<{ category: string; n: string }>(
		`select category, (select count(*) from worksheet_classifications where worksheet_id = $1) n from worksheets where id = $1`,
		[id]
	);
	expect(applied[0].category).toBe('applications');
	expect(Number(applied[0].n)).toBe(2);

	// Titre libre : le titre écrit à la main seul, ni notions ni catégorie dessous
	await openEditor(page, id);
	// Clic perdu si la page n'est pas encore hydratée : on le rejoue jusqu'à ce que la case change
	await expect(async () => {
		await page.getByRole('checkbox', { name: /Titre libre/ }).click();
		await expect(page.getByRole('checkbox', { name: /Titre libre/ })).toBeChecked({
			timeout: 3000
		});
	}).toPass({ timeout: 60_000 });
	await page
		.getByRole('button', { name: /Suites arithmétiques · Dérivation · Applications/ })
		.click();
	await page.getByPlaceholder('Titre de la feuille').fill(`Verifs9 titre à la main ${tag}`);
	await save(page);
	const free = await teacherPdf(page, id, { saveAs: `p9-libre-${tag}.pdf` });
	const freeHead = printedHead(free);
	expect(freeHead).toContain(`Verifs9 titre à la main ${tag}`);
	expect(freeHead.join(' ')).not.toMatch(/Suites arithmétiques|Dérivation|applications/i);
	expect(headOf(free).foot.map((b) => b.text)).toContain(`Verifs9 titre à la main ${tag}`);
});

test('#2912 — évaluation : pas de catégorie dans l’éditeur, le titre seul sur le PDF (les notions ne s’impriment plus dessous)', async ({
	page
}, testInfo) => {
	test.setTimeout(300_000);
	const id = await copyOf('Evaluation : Produit scalaire', testInfo.project.name);
	await login(page, TEACHER.email, TEACHER.password);
	await openEditor(page, id);
	await expect(page.getByText('Catégorie', { exact: true })).toHaveCount(0);
	await expect(page.getByRole('combobox', { name: /^Catégorie/ })).toHaveCount(0);
	// Les notions restent visibles dans l'éditeur…
	await expect(page.getByText('Produit scalaire', { exact: true }).first()).toBeVisible();
	const pdf = await teacherPdf(page, id, { saveAs: `p9-eval-${testInfo.project.name}.pdf` });
	// …mais le PDF n'imprime que le titre. La ligne disait « notions sous le titre » : périmé,
	// ADR 0041 amendé le 2026-11-20 (titre libre ou autre type : lui seul, ni notions ni catégorie).
	const texts = printedHead(pdf);
	expect(texts).toContain('Evaluation : Produit scalaire');
	expect(texts).not.toContain('Produit scalaire');
	expect(texts.join(' ')).not.toMatch(/entraînement|applications|révisions/i);
});

// ============================================================================
// Décor élèves (#2912 PDF de l'élève, #2908 lecture facilitée des PDF)
// ============================================================================

interface Decor {
	worksheet: string;
	assignment: string;
}
let decor: Decor | null = null;
let lockHeld = false;

async function createExercise9(
	title: string,
	statement: string,
	solution: string,
	answers: string
): Promise<string> {
	const rows = await sql<{ id: string }>(
		withFirstVersion(
			`insert into exercises (title, source, grades, topic, created_by, category)
			 values ($1, 'verifs9', '{}', 'Verifs9', $2, 'automatisme') returning id`,
			{ variations: '$3::jsonb' }
		),
		[
			title,
			TEACHER_ID,
			JSON.stringify([
				{
					label: 'guided',
					hints: [],
					statement_md: statement,
					solution_md: solution,
					answers_md: answers
				}
			])
		]
	);
	return rows[0].id;
}

async function resetStudents(): Promise<void> {
	await sql(`delete from student_print_settings where student_id = any($1)`, [
		Object.values(STUDENTS)
	]);
}

async function setSettings(
	email: StudentEmail,
	settings: { easy: boolean; size?: 'normal' | 'large' | 'x_large' }
): Promise<void> {
	await sql(`delete from student_print_settings where student_id = $1`, [STUDENTS[email]]);
	await sql(
		`insert into student_print_settings (student_id, text_size, easy_reading) values ($1, $2, $3)`,
		[STUDENTS[email], settings.size ?? 'normal', settings.easy]
	);
}

async function studentPage(browser: Browser, baseURL: string | undefined, email: StudentEmail) {
	const context = await browser.newContext({ baseURL, acceptDownloads: true });
	const page = await context.newPage();
	await login(page, email, STUDENT_PASSWORD);
	return page;
}

/** PDF d'un élève depuis sa page (sans exiger le calme réseau total, que cette page n'a pas toujours) */
async function studentDownload(
	page: Page,
	assignmentId: string,
	choice: 'Sans corrections' | 'Avec réponses' | 'Avec corrigé',
	saveAs: string
): Promise<string> {
	const pdfButton = page.getByRole('button', { name: 'PDF', exact: true });
	const choiceButton = page.getByRole('button', { name: choice });
	// Serveur partagé et parfois lent : la page se recharge si le menu ne s'ouvre pas (clic avant hydratation)
	await expect(async () => {
		await gotoSettled(page, `/dashboard/student/worksheets/${assignmentId}`);
		await expect(pdfButton).toBeEnabled({ timeout: 30_000 });
		await pdfButton.click();
		await expect(choiceButton).toBeVisible({ timeout: 8_000 });
	}).toPass({ timeout: 180_000 });
	const download = page.waitForEvent('download', { timeout: 180_000 });
	await choiceButton.click();
	const target = resolve(FICHES_TMP, saveAs);
	mkdirSync(dirname(target), { recursive: true });
	await (await download).saveAs(target);
	return target;
}

/**
 * Les polices dont le texte d'une page est ÉCRIT (`pdftohtml -xml`) : `pdffonts` par page liste les
 * ressources du fichier entier, partagées par toutes les pages d'un PDF de plusieurs copies.
 */
function fontNamesOnPage(pdf: string, pageNumber: number): string[] {
	const xml = execFileSync('pdftohtml', ['-xml', '-i', '-stdout', '-q', pdf], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024
	});
	const families = new Map<string, string>();
	for (const m of xml.matchAll(/<fontspec id="(\d+)"[^>]*family="(?:[A-Z]+\+)?([^"]+)"/g)) {
		families.set(m[1], m[2]);
	}
	const page = [...xml.matchAll(/<page number="(\d+)"[^>]*>([\s\S]*?)<\/page>/g)].find(
		(m) => Number(m[1]) === pageNumber
	);
	expect(page, `page ${pageNumber} absente`).toBeTruthy();
	const used = new Set<string>();
	for (const m of (page as RegExpMatchArray)[2].matchAll(/<text [^>]*font="(\d+)"/g)) {
		used.add(families.get(m[1]) ?? '?');
	}
	return [...used];
}

function fontNames(pdf: string): string[] {
	return pdfFonts(pdf).map((line) =>
		line
			.trim()
			.split(/\s+/)[0]
			.replace(/^[A-Z]{6}\+/, '')
	);
}

test.describe('lecture facilitée des PDF et fiches des élèves', () => {
	test.beforeAll(async () => {
		test.setTimeout(LOCK_WAIT_MAX_MS + 120_000);
		await acquireLock(LOCK);
		lockHeld = true;
		await resetStudents();
		await wipeCourse();
		const statement = `${LONG_PARAGRAPH}\n\nVerifs9 formule : $\\frac{a+b}{c} + \\sqrt{x}$ et $u_{n+1} = 3u_n - 4$.`;
		const exercises = [
			await createExercise9(
				'Verifs9 un',
				statement,
				`Verifs9 corrigé : ${LONG_PARAGRAPH}`,
				'Verifs9 réponse : $x = 2$'
			),
			await createExercise9(
				'Verifs9 deux',
				`Verifs9 second énoncé court.`,
				'Verifs9 second corrigé.',
				'Verifs9 seconde réponse'
			)
		];
		const worksheet = await createWorksheet({
			title: 'Verifs9 fiche lecture facilitée',
			styleId: STYLE_IDS.standard,
			exercises: exercises.map((exercise, i) => ({
				exercise: { id: exercise, title: `Verifs9 ${i}` }
			}))
		});
		await sql(`update worksheets set description = $2 where id = $1`, [
			worksheet,
			`${PREFIX} lecture`
		]);
		const assignment = (
			await sql<{ id: string }>(
				`insert into worksheet_assignments
				   (worksheet_id, title, individualized, status, created_by, show_corrections, correction_release_mode)
				 values ($1, 'Verifs9 affectation', false, 'active', $2, true, 'immediate') returning id`,
				[worksheet, TEACHER_ID]
			)
		)[0].id;
		for (const id of Object.values(STUDENTS)) {
			await sql(
				`insert into worksheet_assignment_students (assignment_id, student_id) values ($1, $2)`,
				[assignment, id]
			);
		}
		decor = { worksheet, assignment };
	});

	test.beforeEach(() => {
		if (lockHeld) refreshLock(LOCK);
	});

	test.afterAll(async () => {
		try {
			await wipe();
			await sql(`delete from exercises where created_by = $1 and source = 'verifs9'`, [TEACHER_ID]);
			if (lockHeld) {
				await wipeCourse();
				await resetStudents();
			}
		} finally {
			if (lockHeld) releaseLock(LOCK);
		}
	});

	test('#2908 — élève : case « Lecture facilitée » à côté de « Taille du texte », enregistrée, PDF fiche / réponses / corrigé entièrement en Luciole et Luciole Math, texte aligné à gauche', async ({
		browser,
		baseURL
	}) => {
		test.setTimeout(400_000);
		if (!decor) throw new Error('décor absent');
		await resetStudents();
		const student = await studentPage(browser, baseURL, 'eleve21@local.test');
		try {
			await gotoSettled(student, `/dashboard/student/worksheets/${decor.assignment}`);
			const size = student.getByRole('combobox', { name: /^Taille du texte/ });
			const easy = student.getByRole('checkbox', { name: 'Lecture facilitée' });
			await expect(size).toBeVisible();
			await expect(easy).toBeVisible();
			await expect(easy).not.toBeChecked();
			// Côte à côte : la case est dans la même rangée que la taille du texte
			const [sizeBox, easyBox] = [await size.boundingBox(), await easy.boundingBox()];
			// Au téléphone la rangée passe à la ligne : la mesure n'a de sens qu'en large
			if ((student.viewportSize()?.width ?? 0) >= 768) {
				expect(Math.abs((sizeBox?.y ?? 0) - (easyBox?.y ?? 99999))).toBeLessThan(40);
			}

			// Éteinte : aucune Luciole dans le PDF, texte justifié (le décor de comparaison)
			const normal = await studentDownload(
				student,
				decor.assignment,
				'Sans corrections',
				`p9-normal-${test.info().project.name}.pdf`
			);
			expect(fontNames(normal).join(' ')).not.toMatch(/Luciole/);

			// Cochée : enregistrée pour l'élève
			await easy.check();
			await expect(
				student.getByText('Lecture facilitée enregistrée pour toutes tes fiches')
			).toBeVisible();
			await expect
				.poll(
					async () =>
						(
							await sql<{ easy_reading: boolean }>(
								`select easy_reading from student_print_settings where student_id = $1`,
								[STUDENTS['eleve21@local.test']]
							)
						)[0]?.easy_reading
				)
				.toBe(true);

			const tag = test.info().project.name;
			const pdfs = {
				fiche: await studentDownload(
					student,
					decor.assignment,
					'Sans corrections',
					`p9-easy-fiche-${tag}.pdf`
				),
				reponses: await studentDownload(
					student,
					decor.assignment,
					'Avec réponses',
					`p9-easy-reponses-${tag}.pdf`
				),
				corrige: await studentDownload(
					student,
					decor.assignment,
					'Avec corrigé',
					`p9-easy-corrige-${tag}.pdf`
				)
			};
			for (const [name, pdf] of Object.entries(pdfs)) {
				const fonts = fontNames(pdf);
				expect(
					fonts.some((f) => /^Luciole(-|$)/.test(f) || f.startsWith('Luciole')),
					`${name} : ${fonts}`
				).toBe(true);
				expect(
					fonts.some((f) => /Luciole.*Math/i.test(f)),
					`${name} formules : ${fonts}`
				).toBe(true);
				// Entièrement en Luciole : aucune autre police de texte (ni Shantell du corrigé, ni la police habituelle)
				const others = fonts.filter((f) => !/^Luciole/i.test(f));
				expect(others, `${name} : polices qui ne sont pas Luciole`).toEqual([]);
			}
			// Texte aligné à gauche : un paragraphe long, début de ligne commun, fin de ligne irrégulière
			const lines = paragraphLines(pdfs.fiche);
			expect(lines.length).toBeGreaterThanOrEqual(4);
			const lefts = lines.map((l) => l.left);
			expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThan(1);
			const fullLines = lines.slice(0, -1).map((l) => l.right);
			expect(Math.max(...fullLines) - Math.min(...fullLines)).toBeGreaterThan(4);
			// Recharger : toujours cochée
			await gotoSettled(student, `/dashboard/student/worksheets/${decor.assignment}`);
			await expect(student.getByRole('checkbox', { name: 'Lecture facilitée' })).toBeChecked();

			// Avec « Grande » aussi : encore Luciole, et plus grand
			await pick(student, /^Taille du texte/, /^Grande/);
			await expect(student.getByText(/Taille du texte enregistrée/)).toBeVisible();
			const big = await studentDownload(
				student,
				decor.assignment,
				'Sans corrections',
				`p9-easy-grande-${tag}.pdf`
			);
			expect(fontNames(big).filter((f) => !/^Luciole/i.test(f))).toEqual([]);
			const bodySize = (pdf: string) =>
				Math.max(
					...pdfRuns(pdf)
						.filter((r) => /Verifs9 paragraphe/.test(r.text))
						.map((r) => r.size)
				);
			expect(bodySize(big) / bodySize(pdfs.fiche)).toBeGreaterThan(1.25);
		} finally {
			await student.context().close();
			await resetStudents();
		}
	});

	test('#2908 — prof : aperçu d’une affectation en vue d’un élève, la case montre son réglage et le change pour lui', async ({
		page
	}) => {
		test.setTimeout(500_000);
		if (!decor) throw new Error('décor absent');
		await setSettings('eleve21@local.test', { easy: true });
		await setSettings('eleve22@local.test', { easy: false });
		const names = await sql<{ email: string; firstname: string; lastname: string }>(
			`select email, firstname, lastname from profiles where email = any($1)`,
			[Object.keys(STUDENTS)]
		);
		const nameOf = (email: string) => {
			const found = names.find((n) => n.email === email);
			return `${found?.firstname} ${found?.lastname}`;
		};
		const easyOf = async (email: StudentEmail) =>
			(
				await sql<{ easy_reading: boolean }>(
					`select easy_reading from student_print_settings where student_id = $1`,
					[STUDENTS[email]]
				)
			)[0]?.easy_reading;
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(
			page,
			`/dashboard/teacher/contenu/worksheets/${decor.worksheet}/assignments/${decor.assignment}/preview`
		);
		const checkbox = page.getByRole('checkbox', { name: 'Lecture facilitée' });
		await expect(checkbox).toBeVisible();
		await pick(page, /^Selectionnez un eleve/, new RegExp(`^${nameOf('eleve21@local.test')}`));
		// Un élève qui l'a : la case est cochée ; la décocher la retire pour lui, la recocher la remet
		await expect(checkbox).toBeChecked();
		await checkbox.uncheck();
		await expect.poll(() => easyOf('eleve21@local.test')).toBe(false);
		await checkbox.check();
		await expect.poll(() => easyOf('eleve21@local.test')).toBe(true);
		// Un autre élève (réglage éteint) : la case est décochée ; la cocher l'enregistre pour lui seul
		await pick(
			page,
			/^(Selectionnez un eleve|Élève)/,
			new RegExp(`^${nameOf('eleve22@local.test')}`)
		);
		await expect(checkbox).not.toBeChecked();
		await checkbox.check();
		await expect.poll(() => easyOf('eleve22@local.test')).toBe(true);
		expect(await easyOf('eleve21@local.test')).toBe(true);
		// Le PDF de l'aperçu est en Luciole pour cet élève
		const pdfButton = page.getByRole('button', { name: 'PDF', exact: true });
		await expect(pdfButton).toBeEnabled({ timeout: 60_000 });
		const download = page.waitForEvent('download', { timeout: 180_000 });
		await pdfButton.click();
		const choice = page.getByRole('button', { name: 'Sans corrections' });
		if (await choice.isVisible({ timeout: 5000 }).catch(() => false)) await choice.click();
		const target = resolve(FICHES_TMP, `p9-apercu-eleve22-${test.info().project.name}.pdf`);
		mkdirSync(dirname(target), { recursive: true });
		await (await download).saveAs(target);
		expect(fontNames(target).filter((f) => !/^Luciole/i.test(f))).toEqual([]);
		expect(fontNames(target).some((f) => /^Luciole/i.test(f))).toBe(true);
		await resetStudents();
	});

	test('#2908 — prof : aperçu d’une fiche, « Lecture facilitée » au coup par coup (rien d’enregistré, revient décochée)', async ({
		page
	}) => {
		test.setTimeout(400_000);
		if (!decor) throw new Error('décor absent');
		await setSettings('eleve21@local.test', { easy: false });
		await login(page, TEACHER.email, TEACHER.password);
		const normal = await teacherPdf(page, decor.worksheet, {
			saveAs: `p9-prof-normal-${test.info().project.name}.pdf`
		});
		expect(fontNames(normal).join(' ')).not.toMatch(/Luciole/);
		const easy = page.getByRole('checkbox', { name: 'Lecture facilitée' });
		await expect(easy).not.toBeChecked();
		await easy.check();
		const pdf = await savePdf(page, 'Telecharger', `p9-prof-easy-${test.info().project.name}.pdf`);
		expect(fontNames(pdf).filter((f) => !/^Luciole/i.test(f))).toEqual([]);
		expect(fontNames(pdf).some((f) => /Luciole.*Math/i.test(f))).toBe(true);
		// Rien n'est enregistré pour personne : le réglage de l'élève reste éteint
		const saved = await sql<{ easy_reading: boolean }>(
			`select easy_reading from student_print_settings where student_id = any($1) and easy_reading`,
			[Object.values(STUDENTS)]
		);
		expect(saved).toEqual([]);
		// À la réouverture : de nouveau décochée
		await gotoSettled(page, `/dashboard/teacher/contenu/worksheets/${decor.worksheet}`);
		const reopened = page.getByRole('checkbox', { name: 'Lecture facilitée' });
		await expect(async () => {
			await page.getByRole('tab', { name: 'PDF' }).click();
			await expect(reopened).toBeVisible({ timeout: 8_000 });
		}).toPass({ timeout: 90_000 });
		await expect(reopened).not.toBeChecked();
		await resetStudents();
	});

	test('#2908 — « Imprimer une copie par élève » : seule la copie de l’élève qui a le réglage sort en Luciole', async ({
		page
	}) => {
		test.setTimeout(500_000);
		if (!decor) throw new Error('décor absent');
		await setSettings('eleve21@local.test', { easy: true });
		await setSettings('eleve22@local.test', { easy: false });
		const names = await sql<{ email: string; firstname: string; lastname: string }>(
			`select email, firstname, lastname from profiles where email = any($1)`,
			[Object.keys(STUDENTS)]
		);
		const nameOf = (email: string) => {
			const found = names.find((n) => n.email === email);
			return `${found?.lastname} ${found?.firstname}`.trim();
		};
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(
			page,
			`/dashboard/teacher/contenu/worksheets/${decor.worksheet}/assignments/${decor.assignment}/copies`
		);
		await expect(page.getByRole('heading', { name: 'Copies par élève' })).toBeVisible();
		// Toutes les copies à la suite : chaque page porte le nom de son élève, polices page par page
		const all = await savePdf(
			page,
			'Télécharger',
			`p9-copies-toutes-${test.info().project.name}.pdf`
		);
		const pages = pdfText(all);
		const pageOf = (email: StudentEmail) => pages.findIndex((text) => text.includes(nameOf(email)));
		const [p21, p22, p23] = [
			pageOf('eleve21@local.test'),
			pageOf('eleve22@local.test'),
			pageOf('eleve23@local.test')
		];
		expect(
			[p21, p22, p23].every((index) => index >= 0),
			`noms : ${[p21, p22, p23]}`
		).toBe(true);
		const luciole = (pageNumber: number) =>
			fontNamesOnPage(all, pageNumber + 1).some((f) => /^Luciole/i.test(f));
		expect(luciole(p21), 'copie de l’élève qui a le réglage').toBe(true);
		expect(luciole(p22), 'copie d’un élève sans le réglage').toBe(false);
		expect(luciole(p23), 'copie d’un autre élève sans le réglage').toBe(false);
		// La copie d'un seul élève, choisie dans le menu
		const one = async (email: StudentEmail, saveAs: string) => {
			await pick(page, /^Copie à afficher/, new RegExp(nameOf(email)));
			await expect(page.getByRole('button', { name: 'Télécharger' })).toBeEnabled({
				timeout: 120_000
			});
			return savePdf(page, 'Télécharger', saveAs);
		};
		const tag = test.info().project.name;
		const copy21 = await one('eleve21@local.test', `p9-copie21-${tag}.pdf`);
		expect(fontNames(copy21).filter((f) => !/^Luciole/i.test(f))).toEqual([]);
		const copy22 = await one('eleve22@local.test', `p9-copie22-${tag}.pdf`);
		expect(fontNames(copy22).join(' ')).not.toMatch(/Luciole/);
		await resetStudents();
	});

	test('#2938 #2912 — fiche reprise : PDF de l’élève affecté et lien du cours portent le même en-tête et le même bas de page que celui du prof', async ({
		browser,
		baseURL,
		page
	}, testInfo) => {
		test.setTimeout(500_000);
		const tag = testInfo.project.name;
		const id = await copyOf('Suites · Entraînement technique', tag);
		await sql(`update worksheets set status = 'published' where id = $1`, [id]);
		const assignment = (
			await sql<{ id: string }>(
				`insert into worksheet_assignments
				   (worksheet_id, title, individualized, status, created_by, show_corrections, correction_release_mode)
				 values ($1, 'Verifs9 affectation reprise', false, 'active', $2, true, 'immediate') returning id`,
				[id, TEACHER_ID]
			)
		)[0].id;
		await sql(
			`insert into worksheet_assignment_students (assignment_id, student_id) values ($1, $2)`,
			[assignment, STUDENTS['eleve21@local.test']]
		);
		const expectHead = (pdf: string, label: string) => {
			const { head, foot } = headOf(pdf);
			expect(
				head.map((b) => b.text),
				`${label} : en-tête`
			).toEqual(
				expect.arrayContaining([
					'Suites',
					'Généralités sur les suites · Suites arithmétiques · Suites géométriques',
					'entraînement technique',
					'1ère Spé'
				])
			);
			expect(
				foot.map((b) => b.text),
				`${label} : bas de page`
			).toEqual(expect.arrayContaining(['1ère Spé', 'Suites · Entraînement technique']));
		};

		// L'élève affecté
		const student = await studentPage(browser, baseURL, 'eleve21@local.test');
		try {
			const pdf = await studentDownload(
				student,
				assignment,
				'Sans corrections',
				`p9-reprise-eleve-${tag}.pdf`
			);
			expectHead(pdf, 'PDF de l’élève');
		} finally {
			await student.context().close();
		}

		// Le lien du cours : chapitre visible de la classe + affectation à la classe + jeton actif
		const classes = await sql<{ id: string }>(
			`select id from classes where is_active order by created_at limit 1`
		);
		expect(classes.length, 'aucune classe active en base locale').toBe(1);
		const classId = classes[0].id;
		const chapter = (
			await sql<{ id: string }>(
				`insert into class_chapters (class_id, title, is_visible) values ($1, $2, true) returning id`,
				[classId, `Verifs9 chapitre ${tag}`]
			)
		)[0].id;
		await sql(
			`insert into chapter_worksheets (chapter_id, worksheet_id, published_at) values ($1, $2, now() - interval '1 minute')`,
			[chapter, id]
		);
		await sql(
			`insert into worksheet_assignment_classes (assignment_id, class_id) values ($1, $2)`,
			[assignment, classId]
		);
		const existing = await sql<{ token: string }>(
			`select token from class_course_share_tokens where class_id = $1 and is_active and (expires_at is null or expires_at > now()) limit 1`,
			[classId]
		);
		let token = existing[0]?.token;
		let createdToken = false;
		if (!token) {
			token = `verifs9${tag.replace(/\W/g, '')}${'x'.repeat(24)}`.slice(0, 40);
			await sql(`insert into class_course_share_tokens (class_id, token) values ($1, $2)`, [
				classId,
				token
			]);
			createdToken = true;
		}
		try {
			await gotoSettled(page, `/cours/${token}/fiche/${id}`);
			await expect(
				page.getByRole('heading', { name: 'Suites · Entraînement technique' })
			).toBeVisible({
				timeout: 60_000
			});
			const reader = await savePdf(page, /Telecharger|Télécharger/, `p9-reprise-cours-${tag}.pdf`);
			expectHead(reader, 'PDF du lien du cours');
		} finally {
			if (createdToken)
				await sql(`delete from class_course_share_tokens where token = $1`, [token]);
			await sql(`delete from class_chapters where id = $1`, [chapter]);
		}
	});
});

/** Lignes du paragraphe long : début et fin de chaque ligne, en points */
function paragraphLines(pdf: string): { left: number; right: number; top: number }[] {
	const { boxes } = pdfBoxes(pdf);
	const start = boxes.find((b) => b.page === 1 && b.text.startsWith('Verifs9 paragraphe'));
	expect(start, 'paragraphe long absent du PDF').toBeTruthy();
	const first = start as PdfBox;
	const lines = new Map<number, PdfBox[]>();
	for (const box of boxes.filter((b) => b.page === 1 && b.top >= first.top - 1)) {
		const key = Math.round(box.top / 3);
		lines.set(key, [...(lines.get(key) ?? []), box]);
	}
	return [...lines.values()]
		.map((row) => ({
			left: Math.min(...row.map((b) => b.left)),
			right: Math.max(...row.map((b) => b.left + b.width)),
			top: Math.min(...row.map((b) => b.top))
		}))
		.sort((a, b) => a.top - b.top)
		.slice(0, 6)
		.filter((line) => line.right - line.left > 60);
}
