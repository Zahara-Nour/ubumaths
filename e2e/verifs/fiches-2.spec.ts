import { execFileSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql, TEACHER, withFirstVersion } from './helpers/carnet';
import {
	chooseOption,
	createWorksheet,
	greenShare,
	hasCenterRule,
	pdfInfo,
	pdfRuns,
	pdfText,
	pdfToPng,
	savePdf,
	STYLE_IDS,
	studentPdf,
	teacherPdf,
	TEACHER_ID,
	type FicheExercise
} from './helpers/fiches';

/**
 * Fiches d'exercices : « Fiche élève » en grande taille, Réponses, polices du corrigé,
 * numérotation 1) a) i), image disparue — base LOCALE
 * ============================================================================================
 *
 * Reprend les lignes #1460, #1461, #1462 (PDF image indisponible, « Fiche élève » en
 * paysage en Grande / Très grande, Réponses sans titres de section), #1465 (polices du
 * corrigé) et « numérotation 1) a) i) » de `docs/wip/verifications-manuelles.md`.
 *
 * Complète `fiches.spec.ts` sans le toucher : décor « Verifs2 … » seulement (fiches,
 * affectations ; exercices de source `verifs2`), élève `eleve16`. `wipeFiches` n'est pas
 * appelé : il remettrait à zéro les fiches « Verifs % » de l'autre fichier.
 */

// Base locale seulement : contre la prod (`VERIFS_URL`), les comptes `local-*` n'existent pas
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
// Un décor partagé, des tests qui s'enchaînent (#1581 : cahier puis Avancement)
test.describe.configure({ mode: 'serial' });

// Constantes

const STUDENT = 'eleve16@local.test';
const STUDENT_ID = '5eed0000-0000-4000-8000-000000000016';
const STUDENT_PASSWORD = 'local-eleve';
const SECTION_TITLE = 'Verifs2 section A';
const SHOTS = '.captures/verifs/programme';

/** Le texte de la liste imbriquée, tel qu'un auteur l'écrit en Markdown */
const NESTED_STATEMENT = [
	'1. Verifs2 première question',
	'   1. Verifs2 sous-question un',
	'   2. Verifs2 sous-question deux',
	'      1. Verifs2 point un',
	'      2. Verifs2 point deux',
	'2. Verifs2 seconde question'
].join('\n');
/** Le corrigé de l'exercice est une liste imbriquée lui aussi */
const NESTED_SOLUTION = [
	'1. Verifs2 corrigé première',
	'   1. Verifs2 corrigé sous un',
	'   2. Verifs2 corrigé sous deux',
	'      1. Verifs2 corrigé point un',
	'      2. Verifs2 corrigé point deux',
	'2. Verifs2 corrigé seconde'
].join('\n');
const FLAT_STATEMENT = ['1. Verifs2 plat un', '2. Verifs2 plat deux', '3. Verifs2 plat trois'].join(
	'\n'
);

interface Decor {
	nested: FicheExercise;
	flat: FicheExercise;
	image: FicheExercise;
	/** Fiche « Fiche élève » : section, liste imbriquée, liste plate */
	worksheet: string;
	assignment: string;
	/** Fiche dont une image a disparu */
	worksheetImage: string;
}

let decor: Decor;
/** Réglage d'origine de l'élève (null : pas encore lu, rien à rendre) */
let originalPrintSettings: { text_size: string }[] | null = null;

// Functions

async function wipe(): Promise<void> {
	await sql(`delete from worksheets where created_by = $1 and title like 'Verifs2 %'`, [
		TEACHER_ID
	]);
	await sql(`delete from exercises where created_by = $1 and source = 'verifs2'`, [TEACHER_ID]);
}

async function createExercise2(
	title: string,
	statement: string,
	solution: string,
	answers?: string
): Promise<FicheExercise> {
	const rows = await sql<{ id: string }>(
		withFirstVersion(
			`insert into exercises (title, source, grades, topic, created_by, category, variations)
			 values ($1, 'verifs2', '{}', 'Verifs2', $2, 'automatisme', $3::jsonb) returning id`
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
					...(answers === undefined ? {} : { answers_md: answers })
				}
			])
		]
	);
	return { id: rows[0].id, title };
}

/** Affecte une fiche à `eleve16` avec corrections libérées ; rend l'id de l'affectation. */
async function assignToStudent(worksheetId: string): Promise<string> {
	const rows = await sql<{ id: string }>(
		`insert into worksheet_assignments
		   (worksheet_id, title, individualized, status, created_by, show_corrections, correction_release_mode)
		 values ($1, 'Verifs2 affectation', false, 'active', $2, true, 'immediate') returning id`,
		[worksheetId, TEACHER_ID]
	);
	await sql(
		`insert into worksheet_assignment_students (assignment_id, student_id) values ($1, $2)`,
		[rows[0].id, STUDENT_ID]
	);
	return rows[0].id;
}

async function setTextSize(size: 'normal' | 'large' | 'x_large'): Promise<void> {
	await sql(`delete from student_print_settings where student_id = $1`, [STUDENT_ID]);
	if (size !== 'normal') {
		await sql(`insert into student_print_settings (student_id, text_size) values ($1, $2)`, [
			STUDENT_ID,
			size
		]);
	}
}

async function studentSession(browser: Browser, baseURL: string | undefined): Promise<Page> {
	const context = await browser.newContext({ baseURL, acceptDownloads: true });
	const page = await context.newPage();
	await login(page, STUDENT, STUDENT_PASSWORD);
	return page;
}

/** Les lignes de texte non vides d'un PDF, espaces ramenés à un seul */
function lines(pdf: string): string[] {
	return pdfText(pdf)
		.join('\n')
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter((line) => line !== '');
}

function occurrences(pdf: string, needle: string): number {
	return lines(pdf).join('\n').split(needle).length - 1;
}

function isLandscape(pdf: string): boolean {
	const info = pdfInfo(pdf);
	return info.width > info.height;
}

/** Nombre d'images incorporées au PDF (`pdfimages -list`) */
function imageCount(pdf: string): number {
	const out = execFileSync('pdfimages', ['-list', pdf], { encoding: 'utf8' });
	return Math.max(0, out.split('\n').filter((line) => line.trim() !== '').length - 2);
}

/** Choisit la « Taille du texte » de l'aperçu du prof (menu de l'onglet PDF) */
async function teacherTextSize(page: Page, option: 'Normale' | 'Grande' | 'Très grande') {
	await page.getByRole('combobox', { name: /^Taille du texte/ }).click();
	await page.getByRole('option', { name: new RegExp(`^${option}`) }).click();
}

/**
 * Le numéro affiché de chaque item de liste de la zone, dans l'ordre du document : le
 * navigateur rend `content` non résolu (`counter(enum2, lower-alpha) ") "`), on en lit donc
 * le style du compteur suivi du séparateur.
 */
async function displayedNumbers(page: Page, scope: string): Promise<string[]> {
	const found = await page
		.locator(scope)
		.first()
		.evaluate((root) => {
			const items = [...root.querySelectorAll('ol > li')];
			return {
				numbers: items.map((li) => {
					const before = getComputedStyle(li, '::before').content;
					const style = /counter\(\w+(?:, ([\w-]+))?\)/.exec(before)?.[1] ?? 'decimal';
					return before.includes(')') ? `${style})` : before;
				}),
				html: (() => {
					const probe = [...root.querySelectorAll('*')].find(
						(el) =>
							el.textContent?.trim().startsWith('Verifs2 première question') &&
							el.children.length === 0
					);
					const chain: string[] = [];
					for (
						let el: Element | null = probe ?? null;
						el && chain.length < 7;
						el = el.parentElement
					) {
						chain.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
					}
					return `${chain.join(' < ')} || ${probe?.parentElement?.parentElement?.outerHTML.slice(0, 700)}`;
				})()
			};
		});
	expect(found.numbers.length, `aucune liste ordonnée dans ${found.html}`).toBeGreaterThan(0);
	return found.numbers;
}

/** La page montre la liste plusieurs fois (énoncé, corrigé…) : chaque affichage a les mêmes numéros */
function expectRepeated(numbers: string[], oneDisplay: string[]): void {
	expect(numbers.length % oneDisplay.length).toBe(0);
	for (let start = 0; start < numbers.length; start += oneDisplay.length) {
		expect(numbers.slice(start, start + oneDisplay.length)).toEqual(oneDisplay);
	}
}

// Décor

test.beforeAll(async () => {
	assertLocalServerEnv();
	await wipe();
	originalPrintSettings = await sql<{ text_size: string }>(
		`select text_size from student_print_settings where student_id = $1`,
		[STUDENT_ID]
	);
	await setTextSize('normal');
	const nested = await createExercise2(
		'Verifs2 liste imbriquée',
		NESTED_STATEMENT,
		NESTED_SOLUTION,
		'Verifs2 réponse : un'
	);
	const flat = await createExercise2(
		'Verifs2 liste plate',
		FLAT_STATEMENT,
		'Verifs2 corrigé plat.',
		'Verifs2 réponse : plat'
	);
	const image = await createExercise2(
		'Verifs2 image disparue',
		'Verifs2 énoncé avec une image.\n\n![figure](https://image-disparue.invalid/verifs2-absente.png)',
		'Verifs2 corrigé de l’image.',
		'Verifs2 réponse : image'
	);
	const worksheet = await createWorksheet({
		title: 'Verifs2 fiche élève',
		styleId: STYLE_IDS.ficheEleve,
		sections: [SECTION_TITLE],
		exercises: [{ exercise: nested, section: 0 }, { exercise: flat }]
	});
	const worksheetImage = await createWorksheet({
		title: 'Verifs2 fiche image',
		styleId: STYLE_IDS.ficheEleve,
		exercises: [{ exercise: image }]
	});
	const assignment = await assignToStudent(worksheet);
	decor = { nested, flat, image, worksheet, assignment, worksheetImage };
});

test.afterAll(async () => {
	await wipe();
	if (originalPrintSettings === null) return;
	await sql(`delete from student_print_settings where student_id = $1`, [STUDENT_ID]);
	for (const row of originalPrintSettings) {
		await sql(`insert into student_print_settings (student_id, text_size) values ($1, $2)`, [
			STUDENT_ID,
			row.text_size
		]);
	}
});

// ============================================================================
// #1461 — « Fiche élève » en Grande / Très grande : paysage
// ============================================================================

test('#1461 — « Fiche élève » côté élève : fiche, corrigé et fiche + réponses en paysage (deux colonnes) en Grande et Très grande ; en taille normale, tout reste en portrait', async ({
	browser,
	baseURL
}) => {
	test.setTimeout(600_000);
	const student = await studentSession(browser, baseURL);
	const pdfOf = (choice: 'Sans corrections' | 'Avec réponses' | 'Avec corrigé', saveAs: string) =>
		studentPdf(student, decor.assignment, { choice, saveAs });

	// Taille normale : portrait (témoin)
	await setTextSize('normal');
	const normal = await pdfOf('Sans corrections', 'g-normale-fiche.pdf');
	expect(isLandscape(normal), 'normale : fiche en portrait').toBe(false);

	// Grande : fiche et corrigé en paysage à deux colonnes, Réponses en portrait
	await setTextSize('large');
	const largeSheet = await pdfOf('Sans corrections', 'g-grande-fiche.pdf');
	const largeKey = await pdfOf('Avec corrigé', 'g-grande-corrige.pdf');
	const largeAnswers = await pdfOf('Avec réponses', 'g-grande-reponses.pdf');
	pdfToPng(largeSheet, 'g-grande-fiche');
	pdfToPng(largeKey, 'g-grande-corrige');
	pdfToPng(largeAnswers, 'g-grande-reponses');
	expect(isLandscape(largeSheet), 'grande : fiche en paysage').toBe(true);
	expect(hasCenterRule(largeSheet), 'grande : fiche à deux colonnes').toBe(true);
	expect(isLandscape(largeKey), 'grande : corrigé en paysage').toBe(true);
	expect(hasCenterRule(largeKey), 'grande : corrigé à deux colonnes').toBe(true);
	// « Avec réponses » = fiche + réponses : toutes formes sauf « Réponses » seul passent en
	// paysage (docs/systeme/fiches-et-pdf.md, taille du texte) ; « Réponses » seul est vérifié côté prof
	expect(isLandscape(largeAnswers), 'grande : fiche + réponses en paysage').toBe(true);
	expect(hasCenterRule(largeAnswers), 'grande : fiche + réponses à deux colonnes').toBe(true);

	// Très grande : même règle
	await setTextSize('x_large');
	const xLargeSheet = await pdfOf('Sans corrections', 'g-tres-grande-fiche.pdf');
	const xLargeAnswers = await pdfOf('Avec réponses', 'g-tres-grande-reponses.pdf');
	expect(isLandscape(xLargeSheet), 'très grande : fiche en paysage').toBe(true);
	expect(isLandscape(xLargeAnswers), 'très grande : fiche + réponses en paysage').toBe(true);
	await student.context().close();
	await setTextSize('normal');
});

test('#1461 — côté prof, « Taille du texte » Grande : fiche et corrigé en paysage, Réponses en portrait ; Normale : portrait', async ({
	page
}) => {
	test.setTimeout(600_000);
	await login(page, TEACHER.email, TEACHER.password);
	const normal = await teacherPdf(page, decor.worksheet, { saveAs: 'p-normale-fiche.pdf' });
	expect(isLandscape(normal), 'Normale : fiche en portrait').toBe(false);

	await teacherTextSize(page, 'Grande');
	const sheet = await savePdf(page, 'Telecharger', 'p-grande-fiche.pdf');
	expect(isLandscape(sheet), 'Grande : fiche en paysage').toBe(true);
	expect(hasCenterRule(sheet), 'Grande : fiche à deux colonnes').toBe(true);

	await chooseOption(page, 'PDF à générer', 'Corrigé');
	const key = await savePdf(page, 'Telecharger', 'p-grande-corrige.pdf');
	expect(isLandscape(key), 'Grande : corrigé en paysage').toBe(true);

	await chooseOption(page, 'PDF à générer', 'Réponses');
	const answers = await savePdf(page, 'Telecharger', 'p-grande-reponses.pdf');
	expect(isLandscape(answers), 'Grande : Réponses en portrait').toBe(false);
});

// ============================================================================
// #1462 — Réponses sans titres de section
// ============================================================================

test('#1462 — les Réponses (et la fin « Avec les réponses » de l’élève) sans titres de section ; la fiche et le corrigé les gardent', async ({
	page,
	browser,
	baseURL
}) => {
	test.setTimeout(600_000);
	await login(page, TEACHER.email, TEACHER.password);
	const sheet = await teacherPdf(page, decor.worksheet, { saveAs: 's-fiche.pdf' });
	const key = await teacherPdf(page, decor.worksheet, { kind: 'Corrigé', saveAs: 's-corrige.pdf' });
	const answers = await teacherPdf(page, decor.worksheet, {
		kind: 'Réponses',
		saveAs: 's-reponses.pdf'
	});
	expect(occurrences(sheet, SECTION_TITLE), 'fiche : titre de section').toBeGreaterThan(0);
	expect(occurrences(key, SECTION_TITLE), 'corrigé : titre de section').toBeGreaterThan(0);
	// Les Réponses existent bien (non vides) mais sans le titre de section
	expect(lines(answers).join('\n')).toContain('Verifs2 réponse : un');
	expect(occurrences(answers, SECTION_TITLE), 'Réponses : aucun titre de section').toBe(0);
	pdfToPng(answers, 's-reponses');

	// L'élève, « Avec réponses » : la fiche (un titre) puis les réponses (aucun titre de plus)
	const student = await studentSession(browser, baseURL);
	const plain = await studentPdf(student, decor.assignment, {
		choice: 'Sans corrections',
		saveAs: 's-eleve-fiche.pdf'
	});
	const withAnswers = await studentPdf(student, decor.assignment, {
		choice: 'Avec réponses',
		saveAs: 's-eleve-avec-reponses.pdf'
	});
	expect(lines(withAnswers).join('\n')).toContain('Verifs2 réponse : un');
	expect(occurrences(withAnswers, SECTION_TITLE)).toBe(occurrences(plain, SECTION_TITLE));
	await student.context().close();
});

// ============================================================================
// #1460 — image disparue
// ============================================================================

test('#1460 — une fiche dont une image a disparu : le PDF sort, avec un cadre « Image indisponible » à la place', async ({
	page
}) => {
	test.setTimeout(300_000);
	await login(page, TEACHER.email, TEACHER.password);
	// Témoin : la fiche sans image n'incorpore aucune image
	const control = await teacherPdf(page, decor.worksheet, { saveAs: 'i-temoin.pdf' });
	expect(imageCount(control), 'fiche sans image : aucune image dans le PDF').toBe(0);

	const pdf = await teacherPdf(page, decor.worksheetImage, { saveAs: 'i-image.pdf' });
	pdfToPng(pdf, 'i-image', 90);
	expect(pdfInfo(pdf).pages).toBeGreaterThanOrEqual(1);
	expect(lines(pdf).join('\n')).toContain('Verifs2 énoncé avec une image.');
	// Le cadre de remplacement est une image incorporée au PDF
	expect(imageCount(pdf), 'cadre « Image indisponible » incorporé').toBeGreaterThan(0);
});

// ============================================================================
// #1465 — polices du corrigé
// ============================================================================

test('#1465 — corrigé d’une « Fiche élève » : titres, bandeau vert, titres d’exercice et de section, numéros de page dans la police habituelle ; seules les corrections en Shantell Sans / Chiphre Math', async ({
	page,
	browser,
	baseURL
}) => {
	test.setTimeout(400_000);
	await login(page, TEACHER.email, TEACHER.password);
	const teacherKey = await teacherPdf(page, decor.worksheet, {
		kind: 'Corrigé',
		saveAs: 'f-corrige.pdf'
	});
	const student = await studentSession(browser, baseURL);
	const studentKey = await studentPdf(student, decor.assignment, {
		choice: 'Avec corrigé',
		saveAs: 'f-eleve-corrige.pdf'
	});
	await student.context().close();

	for (const [name, pdf] of [
		['prof', teacherKey],
		['élève', studentKey]
	] as const) {
		pdfToPng(pdf, `f-corrige-${name}`);
		const runs = pdfRuns(pdf);
		const handwritten = /^(ChiphreMath|ShantellSans)/;
		// Le bandeau vert du corrigé est là
		const greenest = Math.max(
			...Array.from({ length: pdfInfo(pdf).pages }, (_, index) => greenShare(pdf, index + 1))
		);
		expect(greenest, `${name} : bandeau vert (une page au moins)`).toBeGreaterThan(0.01);
		// Le titre de la fiche, le titre de section, le titre d'exercice : jamais en manuscrit
		for (const heading of [
			'Verifs2 fiche élève',
			SECTION_TITLE,
			'Verifs2 liste imbriquée',
			'Autres exercices'
		]) {
			const found = runs.filter((run) => run.text.includes(heading));
			expect(found.length, `${name} : « ${heading} » présent`).toBeGreaterThan(0);
			for (const run of found) {
				expect(run.family, `${name} : « ${heading} » en ${run.family}`).not.toMatch(handwritten);
			}
		}
		// Un numéro de page : un nombre seul, au bas de la page, jamais en manuscrit
		const pageNumbers = runs.filter((run) => /^\d{1,2}$/.test(run.text.trim()) && run.top > 1000);
		for (const run of pageNumbers) {
			expect(run.family, `${name} : numéro de page en ${run.family}`).not.toMatch(handwritten);
		}
		// La correction écrite : en manuscrit, et seulement elle
		const corrections = runs.filter((run) => run.text.includes('Verifs2 corrigé'));
		expect(corrections.length, `${name} : corrections présentes`).toBeGreaterThan(0);
		for (const run of corrections) {
			expect(run.family, `${name} : correction en ${run.family}`).toMatch(handwritten);
		}
	}
});

// ============================================================================
// numérotation 1) a) i)
// ============================================================================

test('numérotation 1) a) i) — PDF : liste imbriquée numérotée 1) a) i), liste à un seul niveau 1) 2) 3)', async ({
	page
}) => {
	test.setTimeout(300_000);
	await login(page, TEACHER.email, TEACHER.password);
	for (const [kind, word] of [
		['Fiche', 'Verifs2'],
		['Corrigé', 'Verifs2 corrigé']
	] as const) {
		const pdf = await teacherPdf(page, decor.worksheet, { kind, saveAs: `n-${kind}.pdf` });
		const text = lines(pdf).join('\n');
		const first = kind === 'Fiche' ? 'première question' : 'première';
		const second = kind === 'Fiche' ? 'seconde question' : 'seconde';
		const subOne = kind === 'Fiche' ? 'sous-question un' : 'sous un';
		const subTwo = kind === 'Fiche' ? 'sous-question deux' : 'sous deux';
		expect(text, `${kind} : 1)`).toMatch(new RegExp(`1\\) ${word} ${first}`));
		expect(text, `${kind} : a)`).toMatch(new RegExp(`a\\) ${word} ${subOne}`));
		expect(text, `${kind} : b)`).toMatch(new RegExp(`b\\) ${word} ${subTwo}`));
		expect(text, `${kind} : i)`).toMatch(new RegExp(`i\\) ${word} point un`));
		expect(text, `${kind} : ii)`).toMatch(new RegExp(`ii\\) ${word} point deux`));
		expect(text, `${kind} : 2)`).toMatch(new RegExp(`2\\) ${word} ${second}`));
	}
	// Liste à un seul niveau : 1) 2) 3), jamais a) b) c) (la fiche porte l'énoncé)
	const sheet = lines(await teacherPdf(page, decor.worksheet, { saveAs: 'n-plat.pdf' })).join('\n');
	expect(sheet, 'plat 1)').toMatch(/1\) Verifs2 plat un/);
	expect(sheet, 'plat 2)').toMatch(/2\) Verifs2 plat deux/);
	expect(sheet, 'plat 3)').toMatch(/3\) Verifs2 plat trois/);
	expect(sheet, 'plat sans a)').not.toMatch(/a\) Verifs2 plat/);
});

test('numérotation 1) a) i) — à l’écran, élève et prof : 1) puis a) puis i), liste à un seul niveau 1) 2) 3)', async ({
	page,
	browser,
	baseURL
}) => {
	test.setTimeout(180_000);
	const nested = [
		'decimal)',
		'lower-alpha)',
		'lower-alpha)',
		'lower-roman)',
		'lower-roman)',
		'decimal)'
	];
	const flat = ['decimal)', 'decimal)', 'decimal)'];

	// Élève : la page de l'exercice de sa fiche
	const student = await studentSession(browser, baseURL);
	await student.goto(`/dashboard/student/worksheets/${decor.assignment}`);
	await student.waitForLoadState('networkidle');
	await student.getByRole('button', { name: /^Ouvrir la Corvée 1/ }).click();
	await expect(student.getByText('Verifs2 première question').first()).toBeVisible();
	expectRepeated(await displayedNumbers(student, 'body'), nested);
	await student.screenshot({ path: `${SHOTS}/numerotation-eleve.png`, fullPage: true });
	await student.goto(`/dashboard/student/worksheets/${decor.assignment}`);
	await student.waitForLoadState('networkidle');
	await student.getByRole('button', { name: /^Ouvrir la Corvée 2/ }).click();
	await expect(student.getByText('Verifs2 plat un').first()).toBeVisible();
	expectRepeated(await displayedNumbers(student, 'body'), flat);
	await student.context().close();

	// Prof : l'aperçu vue élève de l'affectation, puis la page de l'exercice
	await login(page, TEACHER.email, TEACHER.password);
	const preview = `/dashboard/teacher/contenu/worksheets/${decor.worksheet}/assignments/${decor.assignment}/preview`;
	await page.goto(preview);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: /Corvée 1/ }).click();
	await expect(page.getByText('Verifs2 première question').first()).toBeVisible();
	await page.screenshot({ path: `${SHOTS}/numerotation-prof.png`, fullPage: true });
	expectRepeated(await displayedNumbers(page, 'body'), nested);
	await page.goto(preview);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: /Corvée 2/ }).click();
	await expect(page.getByText('Verifs2 plat un').first()).toBeVisible();
	expectRepeated(await displayedNumbers(page, 'body'), flat);
});
