import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { sql, withFirstVersion, LATEST_VERSION_OF } from './carnet';

/**
 * Le décor des fiches d'exercices et de leurs PDF, sur la base LOCALE seulement
 * =============================================================================
 *
 * Les vérifications de `fiches.spec.ts` posent des fiches « Verifs … » du prof
 * local (exercices à nous, titres connus), les affectent à des élèves fictifs de
 * `pnpm db:seed-riche`, puis téléchargent les PDF par l'interface et les lisent
 * avec `pdftotext` / `pdffonts` / `pdfinfo` (poppler). Chaque passage remet le
 * décor à zéro : on supprime les fiches et exercices « Verifs … » du prof, puis on
 * les recrée.
 */

// Constantes

export const TEACHER_ID = '11111111-1111-4111-8111-111111111111';
/** Les élèves fictifs de la base de développement */
export const STUDENT_IDS = {
	'eleve01@local.test': '5eed0000-0000-4000-8000-000000000001',
	'eleve02@local.test': '5eed0000-0000-4000-8000-000000000002',
	'eleve03@local.test': '5eed0000-0000-4000-8000-000000000003'
} as const;

/** Styles de Chiphre (`worksheet_styles`) */
export const STYLE_IDS = {
	standard: '00000000-0000-4000-8000-000000000001',
	deuxColonnes: '00000000-0000-4000-8000-000000000008',
	ficheEleve: '00000000-0000-4000-8000-000000000012',
	deuxColonnesPaysage: '00000000-0000-4000-8000-000000000013'
} as const;

export const FICHES_DIR = resolve('.captures/verifs/fiches');
export const FICHES_TMP = resolve('.captures/verifs/fiches/pdf');

/** Nom proposé au téléchargement, par fichier enregistré (« … - Fiche et corrigé.pdf ») */
export const suggestedNames = new Map<string, string>();

export interface FicheExercise {
	id: string;
	title: string;
}

// Functions

/** Une variation d'exercice (`exercises.variations`), avec ou sans corrigé */
function variation(statement: string, solution: string | null, answers?: string) {
	return [
		{
			label: 'guided',
			hints: [],
			statement_md: statement,
			...(solution === null ? {} : { solution_md: solution }),
			...(answers === undefined ? {} : { answers_md: answers })
		}
	];
}

/** Supprime les fiches et exercices « Verifs … » du prof (les affectations suivent en cascade). */
export async function wipeFiches(): Promise<void> {
	await sql(`delete from worksheets where created_by = $1 and title like 'Verifs %'`, [TEACHER_ID]);
	await sql(`delete from exercises where created_by = $1 and source = 'verifs'`, [TEACHER_ID]);
}

export async function createExercise(
	title: string,
	statement: string,
	solution: string | null,
	answers?: string
): Promise<FicheExercise> {
	const rows = await sql<{ id: string }>(
		withFirstVersion(
			`insert into exercises (title, source, grades, topic, created_by, category)
			 values ($1, 'verifs', '{}', 'Verifs', $2, 'automatisme') returning id`,
			{ variations: '$3::jsonb' }
		),
		[title, TEACHER_ID, JSON.stringify(variation(statement, solution, answers))]
	);
	return { id: rows[0].id, title };
}

export interface PlacedExercise {
	exercise: FicheExercise;
	/** Position de la section dans la fiche (0, 1…) ; absent : hors section */
	section?: number;
	points?: number | null;
	/** Cadres de réponse enregistrés dans la fiche (`answer_frame_lines`) */
	frames?: { questions?: (number | null)[]; exercise?: number | null };
}

export interface WorksheetSpec {
	title: string;
	type?: 'worksheet' | 'assessment' | 'homework' | 'exam';
	styleId?: string | null;
	config?: Record<string, unknown>;
	sections?: string[];
	exercises: PlacedExercise[];
	status?: 'draft' | 'published';
}

/** Crée une fiche « Verifs … » du prof avec ses sections et ses exercices ; rend son id. */
export async function createWorksheet(spec: WorksheetSpec): Promise<string> {
	const created = await sql<{ id: string }>(
		`insert into worksheets (title, type, config, status, created_by, style_id, grades)
		 values ($1, $2, $3::jsonb, $4, $5, $6, '{}') returning id`,
		[
			spec.title,
			spec.type ?? 'worksheet',
			JSON.stringify(spec.config ?? {}),
			spec.status ?? 'published',
			TEACHER_ID,
			spec.styleId ?? null
		]
	);
	const worksheetId = created[0].id;
	const sectionIds: string[] = [];
	for (const [index, sectionTitle] of (spec.sections ?? []).entries()) {
		const row = await sql<{ id: string }>(
			`insert into worksheet_sections (worksheet_id, title, position) values ($1, $2, $3) returning id`,
			[worksheetId, sectionTitle, index]
		);
		sectionIds.push(row[0].id);
	}
	// Position par section : l'index unique (fiche, section, position) l'exige
	const counters = new Map<string, number>();
	for (const placed of spec.exercises) {
		const sectionId = placed.section === undefined ? null : sectionIds[placed.section];
		const key = sectionId ?? 'hors';
		const position = (counters.get(key) ?? 0) + 1;
		counters.set(key, position);
		await sql(
			`insert into worksheet_exercises (worksheet_id, exercise_id, exercise_version_id, section_id, position, points, answer_frame_lines)
			 values ($1, $2, ${LATEST_VERSION_OF('$2')}, $3, $4, $5, $6::jsonb)`,
			[
				worksheetId,
				placed.exercise.id,
				sectionId,
				position,
				placed.points ?? null,
				placed.frames ? JSON.stringify(placed.frames) : null
			]
		);
	}
	return worksheetId;
}

/** Affecte une fiche à des élèves (individualisée ou non) ; rend l'id de l'affectation. */
export async function assignWorksheet(
	worksheetId: string,
	studentEmails: (keyof typeof STUDENT_IDS)[],
	options: {
		individualized?: boolean;
		instructions?: string;
		showCorrections?: boolean;
		/** Exercices dont la correction n'est PAS libérée (les autres le sont) */
		hiddenCorrections?: FicheExercise[];
	} = {}
): Promise<string> {
	const rows = await sql<{ id: string }>(
		`insert into worksheet_assignments
		   (worksheet_id, title, instructions, individualized, status, created_by, show_corrections, correction_release_mode)
		 values ($1, 'Verifs affectation', $2, $3, 'active', $4, $5, 'immediate') returning id`,
		[
			worksheetId,
			options.instructions ?? null,
			options.individualized ?? false,
			TEACHER_ID,
			options.showCorrections ?? false
		]
	);
	const assignmentId = rows[0].id;
	for (const hidden of options.hiddenCorrections ?? []) {
		await sql(
			`insert into worksheet_assignment_exercise_settings (assignment_id, worksheet_exercise_id, show_correction)
			 select $1, id, false from worksheet_exercises where worksheet_id = $2 and exercise_id = $3`,
			[assignmentId, worksheetId, hidden.id]
		);
	}
	for (const email of studentEmails) {
		await sql(
			`insert into worksheet_assignment_students (assignment_id, student_id) values ($1, $2)`,
			[assignmentId, STUDENT_IDS[email]]
		);
	}
	return assignmentId;
}

/**
 * Sur l'écran d'une fiche du prof : onglet PDF, choix du PDF, puis téléchargement.
 * Rend le chemin du fichier enregistré sous `FICHES_TMP/<nom>`.
 */
export async function teacherPdf(
	page: Page,
	worksheetId: string,
	options: { kind?: string; saveAs: string }
): Promise<string> {
	await page.goto(`/dashboard/teacher/contenu/worksheets/${worksheetId}`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('tab', { name: 'PDF' }).click();
	await chooseOption(page, 'PDF à générer', options.kind ?? 'Fiche');
	return savePdf(page, 'Telecharger', options.saveAs);
}

/** Ouvre un menu MySelect par son nom accessible (début) et choisit une option. */
export async function chooseOption(page: Page, triggerName: string, option: string): Promise<void> {
	await page.getByRole('combobox', { name: new RegExp(`^${triggerName}`) }).click();
	// L'option déjà choisie s'appelle « Fiche ✓ »
	await page
		.getByRole('option', { name: new RegExp(`^${option.replace(/[+()]/g, '\\$&')}( ✓)?$`) })
		.click();
}

/** Attend que le bouton soit prêt, le clique et enregistre le PDF reçu. */
export async function savePdf(
	page: Page,
	buttonName: string | RegExp,
	saveAs: string
): Promise<string> {
	const button = page.getByRole('button', { name: buttonName });
	await expect(button).toBeEnabled({ timeout: 90_000 });
	const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
	await button.click();
	const download = await downloadPromise;
	const target = resolve(FICHES_TMP, saveAs);
	mkdirSync(dirname(target), { recursive: true });
	await download.saveAs(target);
	suggestedNames.set(target, download.suggestedFilename());
	return target;
}

// Lecture des PDF (poppler : `pdftotext`, `pdffonts`, `pdfinfo`, `pdftoppm`)

import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

/** Le texte du PDF, page par page (séparées par le saut de page `\f`). */
export function pdfText(file: string): string[] {
	return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }).split('\f');
}

/** Les polices du PDF (une ligne par police, nom en tête). */
export function pdfFonts(file: string): string[] {
	return execFileSync('pdffonts', [file], { encoding: 'utf8' })
		.split('\n')
		.slice(2)
		.filter((line) => line.trim() !== '');
}

export interface PdfInfo {
	pages: number;
	/** Largeur et hauteur de la première page, en points */
	width: number;
	height: number;
}

export function pdfInfo(file: string): PdfInfo {
	const out = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
	const pages = Number(/^Pages:\s+(\d+)/m.exec(out)?.[1]);
	const size = /^Page size:\s+([\d.]+) x ([\d.]+)/m.exec(out);
	return { pages, width: Number(size?.[1]), height: Number(size?.[2]) };
}

/** Une image PNG par page, rangée dans `.captures/verifs/fiches/` pour la relecture à l'œil. */
export function pdfToPng(file: string, name: string, resolution = 60): void {
	mkdirSync(FICHES_DIR, { recursive: true });
	execFileSync('pdftoppm', ['-png', '-r', String(resolution), file, resolve(FICHES_DIR, name)]);
}

/** Nom de fichier d'un téléchargement (pour les messages d'erreur). */
export function shortName(file: string): string {
	return basename(file);
}

export interface PdfRun {
	text: string;
	/** Famille de la police sans son préfixe de sous-ensemble (`NewCM10`, `ChiphreMath`…) */
	family: string;
	/** Corps de la police (unité de `pdftohtml`, comparable d'un PDF à l'autre) */
	size: number;
	top: number;
	left: number;
}

/** Chaque ligne de texte du PDF avec sa police (`pdftohtml -xml`) : qui écrit quoi, dans quelle police. */
export function pdfRuns(file: string): PdfRun[] {
	const xml = execFileSync('pdftohtml', ['-xml', '-i', '-stdout', '-q', file], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024
	});
	const families = new Map<string, string>();
	const sizes = new Map<string, number>();
	for (const match of xml.matchAll(
		/<fontspec id="(\d+)" size="(\d+)"[^>]*family="(?:[A-Z]+\+)?([^"]+)"/g
	)) {
		families.set(match[1], match[3]);
		sizes.set(match[1], Number(match[2]));
	}
	return [...xml.matchAll(/<text top="(\d+)" left="(\d+)"[^>]*font="(\d+)">(.*?)<\/text>/g)].map(
		(match) => ({
			top: Number(match[1]),
			left: Number(match[2]),
			family: families.get(match[3]) ?? '?',
			size: sizes.get(match[3]) ?? 0,
			text: match[4].replace(/<[^>]*>/g, '')
		})
	);
}

/**
 * Sur la page d'une fiche d'élève : bouton PDF, puis (si le prof a libéré les
 * corrections) le choix « Sans corrections » / « Avec réponses » / « Avec corrigé ».
 */
export async function studentPdf(
	page: Page,
	assignmentId: string,
	options: { choice?: 'Sans corrections' | 'Avec réponses' | 'Avec corrigé'; saveAs: string }
): Promise<string> {
	await page.goto(`/dashboard/student/worksheets/${assignmentId}`);
	await page.waitForLoadState('networkidle');
	const pdfButton = page.getByRole('button', { name: 'PDF', exact: true });
	await expect(pdfButton).toBeEnabled();
	const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
	await pdfButton.click();
	if (options.choice) await page.getByRole('button', { name: options.choice }).click();
	const download = await downloadPromise;
	const target = resolve(FICHES_TMP, options.saveAs);
	mkdirSync(dirname(target), { recursive: true });
	await download.saveAs(target);
	suggestedNames.set(target, download.suggestedFilename());
	return target;
}

interface Raster {
	width: number;
	height: number;
	/** Pixels RVB, trois octets chacun */
	data: Buffer;
}

/** La page `page` (1 = première) du PDF en pixels, à basse résolution. */
function raster(file: string, page: number): Raster {
	const root = `${file}.p${page}`;
	execFileSync('pdftoppm', ['-r', '30', '-f', String(page), '-l', String(page), file, root]);
	const name = readdirSync(dirname(root)).find(
		(entry) => resolve(dirname(root), entry).startsWith(root) && entry.endsWith('.ppm')
	);
	const ppmPath = resolve(dirname(root), name as string);
	const ppm = readFileSync(ppmPath);
	rmSync(ppmPath);
	// En-tête P6 : « P6\n<largeur> <hauteur>\n255\n » puis les pixels RVB
	let offset = 0;
	const fields: string[] = [];
	while (fields.length < 4) {
		let end = offset;
		while (ppm[end] !== 0x0a && ppm[end] !== 0x20) end++;
		fields.push(ppm.subarray(offset, end).toString('latin1'));
		offset = end + 1;
	}
	return { width: Number(fields[1]), height: Number(fields[2]), data: ppm.subarray(offset) };
}

/** Part des pixels « verts » de la page (le bandeau du corrigé) */
export function greenShare(file: string, page = 1): number {
	const { data } = raster(file, page);
	let green = 0;
	for (let i = 0; i + 2 < data.length; i += 3) {
		if (data[i + 1] > data[i] + 40 && data[i + 1] > data[i + 2] + 40) green++;
	}
	return green / (data.length / 3);
}

/**
 * Un filet vertical près du centre de la page (deux colonnes) : une colonne de
 * pixels non blancs sur plus de la moitié de la hauteur utile.
 */
export function hasCenterRule(file: string, page = 1): boolean {
	const { width, height, data } = raster(file, page);
	const from = Math.floor(width * 0.42);
	const to = Math.ceil(width * 0.58);
	for (let x = from; x <= to; x++) {
		let dark = 0;
		const rows = Math.floor(height * 0.8);
		for (let y = Math.floor(height * 0.1); y < Math.floor(height * 0.9); y++) {
			const i = (y * width + x) * 3;
			if (data[i] < 252 || data[i + 1] < 252 || data[i + 2] < 252) dark++;
		}
		if (dark > rows * 0.6) return true;
	}
	return false;
}

/** Part des pixels gris clair (fond d'une correction) de la page */
export function greyShare(file: string, page = 1): number {
	const { data } = raster(file, page);
	let grey = 0;
	for (let i = 0; i + 2 < data.length; i += 3) {
		const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
		if (Math.abs(r - g) < 4 && Math.abs(g - b) < 4 && r >= 215 && r <= 248) grey++;
	}
	return grey / (data.length / 3);
}

/**
 * « Aperçu vue élève » d'une affectation (côté prof) : bouton PDF, puis le choix
 * des corrections s'il est proposé. Rend le chemin du fichier enregistré.
 */
export async function previewPdf(
	page: Page,
	worksheetId: string,
	assignmentId: string,
	options: { choice?: 'Sans corrections' | 'Avec réponses' | 'Avec corrigé'; saveAs: string }
): Promise<string> {
	await page.goto(
		`/dashboard/teacher/contenu/worksheets/${worksheetId}/assignments/${assignmentId}/preview`
	);
	await page.waitForLoadState('networkidle');
	const pdfButton = page.getByRole('button', { name: 'PDF', exact: true });
	await expect(pdfButton).toBeEnabled({ timeout: 30_000 });
	const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
	await pdfButton.click();
	if (options.choice) await page.getByRole('button', { name: options.choice }).click();
	const download = await downloadPromise;
	const target = resolve(FICHES_TMP, options.saveAs);
	mkdirSync(dirname(target), { recursive: true });
	await download.saveAs(target);
	suggestedNames.set(target, download.suggestedFilename());
	return target;
}

/**
 * Le PDF que l'écran ouvre dans un nouvel onglet (`window.open` d'une adresse
 * blob:) : on remplace `window.open` pour en lire les octets, sans onglet.
 * À appeler avant le clic ; `collectOpenedPdf` rend ensuite le fichier.
 */
export async function captureOpenedPdf(page: Page): Promise<void> {
	await page.evaluate(() => {
		const holder = window as unknown as { __pdf?: number[]; __openErr?: string };
		holder.__pdf = undefined;
		holder.__openErr = undefined;
		// L'adresse blob: n'est pas relisible par fetch (CSP) : on garde le Blob lui-même
		const original = URL.createObjectURL.bind(URL);
		URL.createObjectURL = (object: Blob | MediaSource) => {
			if (object instanceof Blob && object.type === 'application/pdf') {
				void object
					.arrayBuffer()
					.then((buffer) => {
						holder.__pdf = Array.from(new Uint8Array(buffer));
					})
					.catch((err: unknown) => {
						holder.__openErr = String(err);
					});
			}
			return original(object);
		};
		window.open = () => null;
	});
}

export async function collectOpenedPdf(page: Page, saveAs: string): Promise<string> {
	await page.waitForFunction(
		() => {
			const holder = window as unknown as { __pdf?: number[]; __openErr?: string };
			return holder.__pdf !== undefined || holder.__openErr !== undefined;
		},
		null,
		{ timeout: 90_000 }
	);
	const failure = await page.evaluate(
		() => (window as unknown as { __openErr?: string }).__openErr
	);
	if (failure) throw new Error(`Lecture du PDF ouvert impossible : ${failure}`);
	const bytes = await page.evaluate(() => (window as unknown as { __pdf: number[] }).__pdf);
	const target = resolve(FICHES_TMP, saveAs);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, Buffer.from(bytes));
	return target;
}
