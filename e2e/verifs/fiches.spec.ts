import { expect, test, type Browser, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import {
	assignWorksheet,
	captureOpenedPdf,
	collectOpenedPdf,
	createExercise,
	createWorksheet,
	greenShare,
	greyShare,
	hasCenterRule,
	previewPdf,
	suggestedNames,
	pdfFonts,
	pdfInfo,
	pdfRuns,
	STUDENT_IDS,
	pdfText,
	pdfToPng,
	savePdf,
	STYLE_IDS,
	TEACHER_ID,
	studentPdf,
	teacherPdf,
	wipeFiches,
	type FicheExercise
} from './helpers/fiches';

/**
 * Fiches d'exercices et leurs PDF — base LOCALE
 * =============================================
 *
 * Reprend les lignes #1280→#1297, #1344, #1348, #1352, #1370, #1379, #1386, #1389,
 * #1396, #1428, #1429, #1433/#1438, #1441/#1443, #1445/#1446, #1454 et #1457 de
 * `docs/wip/verifications-manuelles.md`. Les PDF sont fabriqués par le navigateur
 * (comme pour le prof et l'élève), téléchargés, puis lus avec poppler.
 *
 * Décor « Verifs … » posé par `helpers/fiches.ts` (fiches du prof local, affectées
 * à des élèves fictifs de `pnpm db:seed-riche`).
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const STUDENT_PASSWORD = 'local-eleve';
const STUDENT = 'eleve01@local.test';
const TEACHER_ID_FOR_TEMPLATES = TEACHER_ID;

interface Decor {
	exFormula: FicheExercise;
	exNoSolution: FicheExercise;
	exSymbols: FicheExercise;
	wMixed: string;
	aMixed: string;
}

let decor: Decor;

// ============================================================================
// FUNCTIONS
// ============================================================================

test.describe.configure({ mode: 'serial' });

/** Une session d'élève dans un contexte à part (le prof reste connecté dans `page`) */
async function studentPage(
	browser: Browser,
	baseURL: string | undefined,
	email: string = STUDENT
): Promise<Page> {
	const context = await browser.newContext({ baseURL, acceptDownloads: true });
	const page = await context.newPage();
	await login(page, email, STUDENT_PASSWORD);
	return page;
}

// Base locale seulement : contre la prod (`VERIFS_URL`), les comptes `local-*` n'existent pas
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

// Décor retiré même après un échec : fiches « Verifs … » et tailles de texte des élèves
test.afterAll(async () => {
	await wipeFiches();
	await sql(`delete from student_print_settings where student_id = any($1)`, [
		Object.values(STUDENT_IDS)
	]);
});

test.beforeAll(async () => {
	assertLocalServerEnv();
	await wipeFiches();
	const exFormula = await createExercise(
		'Dériver $f(x)=x^2$',
		'Calculer la dérivée de $f(x)=x^2$.',
		"$f'(x)=2x$."
	);
	const exNoSolution = await createExercise(
		'Verifs sans corrigé',
		"Énoncé d'un exercice sans corrigé.",
		null
	);
	const exSymbols = await createExercise(
		'Verifs polices',
		'Calculer.',
		"$\\frac{a+b}{c} + \\sqrt{x}$ ; $\\mathbb{N} \\mathbb{Z} \\mathbb{R}$ ; $P(A) != P(B)$ ; $\\mathcal{P} \\mathcal{B} \\mathcal{E}$ ; $u \\cdot v$ ; $f''(x)$ ; $é + à + ê$ ; légende $\\mu$ $\\sigma$ ; 1ᵉʳ dans le texte. Coût : $\\text{coût : 5 \\$}$ fin."
	);
	const wMixed = await createWorksheet({
		title: 'Verifs fiche mixte',
		styleId: STYLE_IDS.standard,
		sections: ['Verifs section'],
		exercises: [{ exercise: exFormula, section: 0, points: 2 }, { exercise: exNoSolution }]
	});
	const aMixed = await assignWorksheet(wMixed, [STUDENT], {
		instructions: 'Verifs consigne de la prof',
		showCorrections: true
	});
	decor = { exFormula, exNoSolution, exSymbols, wMixed, aMixed };
});

test('#1280→#1297 — le corrigé PDF : formules et texte dans les polices manuscrites', async ({
	page
}) => {
	test.setTimeout(180_000);
	const wFonts = await createWorksheet({
		title: 'Verifs polices du corrigé',
		styleId: STYLE_IDS.standard,
		exercises: [{ exercise: decor.exSymbols }]
	});
	await login(page, TEACHER.email, TEACHER.password);
	const pdf = await teacherPdf(page, wFonts, { kind: 'Corrigé', saveAs: 'polices-corrige.pdf' });
	pdfToPng(pdf, 'polices-corrige', 110);

	// Les symboles sont là, dans le texte du PDF
	const text = pdfText(pdf).join('\n');
	for (const symbol of [
		'ℕ',
		'ℤ',
		'ℝ',
		'≠',
		'𝒫',
		'ℬ',
		'ℰ',
		'·',
		'″',
		'é',
		'à',
		'ê',
		'𝜇',
		'𝜎',
		'1ᵉʳ'
	]) {
		expect(text, `symbole ${symbol}`).toContain(symbol);
	}
	// #1283 : la formule au dollar échappé est entière
	expect(text).toContain('coût : 5 $');

	// Le corps de la correction : ChiphreMath (formules) et Shantell Sans (texte), jamais une autre
	// police. Le titre, le bandeau et le pied de page gardent celle du modèle (NewCM), voulu depuis
	// le 2026-10-18 (`correction-fonts.ts`).
	const runs = pdfRuns(pdf);
	const body = runs.filter((run) => run.top > 300 && run.top < 1200);
	expect(body.length).toBeGreaterThan(10);
	const strangers = body.filter((run) => !/^(ChiphreMath|ShantellSans)/.test(run.family));
	expect(strangers, `lignes du corps dans une autre police : ${JSON.stringify(strangers)}`).toEqual(
		[]
	);
	const families = new Set(body.map((run) => run.family));
	expect([...families].some((family) => family.startsWith('ChiphreMath'))).toBe(true);
	expect([...families].some((family) => family.startsWith('ShantellSans'))).toBe(true);
	expect(pdfFonts(pdf).join('\n')).not.toMatch(/NewCMMath|DejaVu|Noto|LibertinusSerif/);
});

/** Les lignes de texte non vides d'un PDF, espaces ramenés à un seul */
function lines(pdf: string): string[] {
	return pdfText(pdf)
		.join('\n')
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter((line) => line !== '');
}

test('#1344 — PDF du prof et PDF de l’élève : même ordre, mêmes numéros, titre en formule, « Autres exercices »', async ({
	page,
	browser,
	baseURL
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);
	const teacher = await teacherPdf(page, decor.wMixed, { saveAs: 'mixte-prof.pdf' });
	const studentSession = await studentPage(browser, baseURL);
	const student = await studentPdf(studentSession, decor.aMixed, {
		choice: 'Sans corrections',
		saveAs: 'mixte-eleve.pdf'
	});
	pdfToPng(teacher, 'mixte-prof');
	pdfToPng(student, 'mixte-eleve');

	for (const pdf of [teacher, student]) {
		const text = lines(pdf).join('\n');
		// Titre en formule : rendu en maths (𝑓(𝑥) = 𝑥²), jamais le source `$f(x)=x^2$`
		expect(text).toMatch(/Exercice 1\s*:?\s*Dériver 𝑓\(𝑥\) = 𝑥/);
		expect(text).not.toContain('$');
		// L'exercice de la section d'abord, « Autres exercices » au-dessus du hors-section
		const section = text.indexOf('Verifs section');
		const first = text.indexOf('Dériver');
		const others = text.indexOf('Autres exercices');
		const second = text.indexOf('Verifs sans corrigé');
		expect(section).toBeGreaterThan(-1);
		expect(first).toBeGreaterThan(section);
		expect(others).toBeGreaterThan(first);
		expect(second).toBeGreaterThan(others);
		expect(text).toMatch(/Exercice 2\s*:?\s*Verifs sans corrigé/);
	}
	// Même ordre des exercices dans les deux PDF
	const order = (pdf: string) =>
		[
			...lines(pdf)
				.join('\n')
				.matchAll(/Exercice (\d+)\s*:?\s*(Dériver|Verifs sans)/g)
		].map((m) => `${m[1]}${m[2]}`);
	expect(order(teacher)).toEqual(order(student));
	expect(order(teacher)).toEqual(['1Dériver', '2Verifs sans']);

	// Corrigé : l'exercice sans corrigé dit « Correction non écrite. »
	const corrige = await teacherPdf(page, decor.wMixed, {
		kind: 'Corrigé',
		saveAs: 'mixte-corrige.pdf'
	});
	expect(lines(corrige).join('\n')).toContain('Correction non écrite.');
	await studentSession.context().close();
});

test('#1370 — fiche sans style : « Fiche élève » ; Corrigé et Réponses d’une fiche Standard : bandeau vert, mise en page « Fiche élève » ; aucun « pts »', async ({
	page
}) => {
	test.setTimeout(240_000);
	// Fiche Standard avec la case « afficher les points » (clé de l'ancien écran) et 2 points : aucun « pts »
	await sql(`update worksheets set config = '{"show_points": true}'::jsonb where id = $1`, [
		decor.wMixed
	]);
	const wNone = await createWorksheet({
		title: 'Verifs sans style',
		styleId: null,
		sections: ['Verifs section'],
		exercises: [
			{ exercise: decor.exFormula, section: 0, points: 2 },
			{ exercise: decor.exNoSolution }
		]
	});
	await login(page, TEACHER.email, TEACHER.password);

	// Sans gabarit : mise en page « Fiche élève » (deux colonnes, filet central), comme son style explicite
	const none = await teacherPdf(page, wNone, { saveAs: 'sans-style.pdf' });
	expect(hasCenterRule(none)).toBe(true);
	const standard = await teacherPdf(page, decor.wMixed, { saveAs: 'standard.pdf' });
	expect(hasCenterRule(standard)).toBe(false);
	for (const pdf of [none, standard]) expect(lines(pdf).join('\n')).not.toMatch(/pts?\b/);

	// Corrigé et Réponses du style Standard : bandeau vert et mise en page « Fiche élève »
	for (const kind of ['Corrigé', 'Réponses']) {
		const pdf = await teacherPdf(page, decor.wMixed, { kind, saveAs: `standard-${kind}.pdf` });
		pdfToPng(pdf, `standard-${kind}`);
		expect(greenShare(pdf), `${kind} : bandeau vert`).toBeGreaterThan(0.01);
		expect(hasCenterRule(pdf), `${kind} : filet central`).toBe(true);
		expect(lines(pdf).join('\n')).not.toMatch(/pts?\b/);
	}

	// Aperçu Markdown : « Exercice N », jamais « Corvée N »
	await page.goto(`/dashboard/teacher/contenu/worksheets/${decor.wMixed}`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('tab', { name: 'PDF' }).click();
	await page.getByRole('tab', { name: 'Markdown' }).click();
	const markdown = page.getByLabel('Code Markdown');
	await expect(markdown).toBeVisible();
	const source = (await markdown.innerText()) + (await markdown.textContent());
	expect(source).toContain('Exercice 1');
	expect(source).not.toContain('Corvée');
});

test('#1386 — un élève ouvre une fiche distribuée (« Mon travail »), énoncés visibles ; aperçu vue élève du prof', async ({
	page,
	browser,
	baseURL
}) => {
	const student = await studentPage(browser, baseURL);
	await student.goto('/dashboard/student/worksheets');
	await student.waitForLoadState('networkidle');
	await student.getByRole('link', { name: 'Voir la fiche' }).first().click();
	await student.waitForURL(/\/dashboard\/student\/worksheets\/[0-9a-f-]{36}/);
	// L'énoncé s'affiche (avant le correctif : page d'erreur)
	await expect(student.getByRole('button', { name: 'Ouvrir la Corvée 2' })).toBeVisible();
	await student.screenshot({ path: '.captures/verifs/fiches/fiche-eleve-liste.png' });
	await student.getByRole('button', { name: 'Ouvrir la Corvée 1' }).click();
	await expect(student.getByText('Calculer la dérivée de').first()).toBeVisible();
	await student.screenshot({ path: '.captures/verifs/fiches/fiche-eleve-enonce.png' });
	await student.context().close();

	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(
		`/dashboard/teacher/contenu/worksheets/${decor.wMixed}/assignments/${decor.aMixed}/preview`
	);
	await expect(page.getByRole('heading', { name: 'Corvées (2)' })).toBeVisible();
	await expect(page.getByRole('button', { name: /^1 Corvée 1/ })).toBeVisible();
});

test('#1389 — PDF de l’élève : consignes, corrigé sur une nouvelle page (bandeau vert), correction non libérée absente, même PDF que l’aperçu du prof', async ({
	page,
	browser,
	baseURL
}) => {
	test.setTimeout(300_000);
	// Fiche sans style → « Fiche élève » ; Standard → mise en page Standard. Une correction libérée, l'autre non.
	const wFiche = await createWorksheet({
		title: 'Verifs fiche élève sans style',
		styleId: null,
		sections: ['Verifs section'],
		exercises: [
			{ exercise: decor.exFormula, section: 0, points: 2 },
			{ exercise: decor.exNoSolution }
		]
	});
	const aFiche = await assignWorksheet(wFiche, [STUDENT], {
		instructions: 'Verifs consigne de la prof',
		showCorrections: true,
		hiddenCorrections: [decor.exNoSolution]
	});
	await sql(
		`update worksheet_assignments set instructions = $2, show_corrections = true, correction_release_mode = 'immediate' where id = $1`,
		[decor.aMixed, 'Verifs consigne de la prof']
	);
	await sql(
		`insert into worksheet_assignment_exercise_settings (assignment_id, worksheet_exercise_id, show_correction) select $1, id, false from worksheet_exercises where worksheet_id = $2 and exercise_id = $3 on conflict do nothing`,
		[decor.aMixed, decor.wMixed, decor.exNoSolution.id]
	);
	const student = await studentPage(browser, baseURL);

	// Fiche sans style : « Fiche élève », deux colonnes, consignes en encadré, pas de points
	const plain = await studentPdf(student, aFiche, {
		choice: 'Sans corrections',
		saveAs: 'eleve-sans-style.pdf'
	});
	expect(hasCenterRule(plain)).toBe(true);
	expect(lines(plain).join('\n')).toContain('Verifs consigne de la prof');
	expect(lines(plain).join('\n')).not.toMatch(/pts?\b/);

	// Fiche Standard : une colonne, consignes dans la case « Consignes »
	const standard = await studentPdf(student, decor.aMixed, {
		choice: 'Sans corrections',
		saveAs: 'eleve-standard.pdf'
	});
	expect(hasCenterRule(standard)).toBe(false);
	expect(lines(standard).join('\n')).toMatch(/Consignes\s*:\s*Verifs consigne de la prof/);

	// « Avec corrigé » : énoncés dans le style, puis le corrigé sur une nouvelle page, bandeau vert
	for (const [name, assignment] of [
		['sans-style', aFiche],
		['standard', decor.aMixed]
	] as const) {
		const pdf = await studentPdf(student, assignment, {
			choice: 'Avec corrigé',
			saveAs: `eleve-corrige-${name}.pdf`
		});
		pdfToPng(pdf, `eleve-corrige-${name}`);
		expect(pdfInfo(pdf).pages).toBe(2);
		const [statements, correction] = pdfText(pdf);
		expect(statements).toContain('Verifs section');
		expect(statements).not.toContain('f′(x)');
		expect(correction).toContain('CORRECTION');
		expect(correction).toContain('2𝑥');
		expect(greenShare(pdf, 2), `${name} : bandeau vert`).toBeGreaterThan(0.01);
		// Correction non libérée : l'exercice sans corrigé n'y est pas
		expect(correction).not.toContain('Verifs sans corrigé');
		expect(correction).not.toContain('Correction non écrite');
	}

	// Aperçu vue élève du prof : même PDF que celui de l'élève (même texte)
	await login(page, TEACHER.email, TEACHER.password);
	const preview = await previewPdf(page, decor.wMixed, decor.aMixed, {
		choice: 'Sans corrections',
		saveAs: 'apercu-standard.pdf'
	});
	expect(lines(preview)).toEqual(lines(standard));
	await student.context().close();
});

test('#1396 — « Fiche + corrigé » : corrections sur fond gris sous leur énoncé, « — Correction », nom du fichier ; onglet Markdown', async ({
	page
}) => {
	test.setTimeout(240_000);
	// Style Contrôle (système, retiré du menu mais toujours en base : fiches existantes)
	const wControle = await createWorksheet({
		title: 'Verifs fonctions généralités',
		styleId: '00000000-0000-4000-8000-000000000002',
		sections: ['Verifs section'],
		exercises: [{ exercise: decor.exFormula, section: 0 }, { exercise: decor.exNoSolution }]
	});
	await login(page, TEACHER.email, TEACHER.password);
	const pdf = await teacherPdf(page, wControle, {
		kind: 'Fiche + corrigé',
		saveAs: 'fiche-corrige.pdf'
	});
	pdfToPng(pdf, 'fiche-corrige');
	expect(suggestedNames.get(pdf)).toBe('Verifs_fonctions_generalites - Fiche et corrigé.pdf');
	const text = lines(pdf).join('\n');
	// Le titre du document porte « — Correction » ; la police de la fiche (Contrôle) reste celle des énoncés
	expect(text).toContain('Verifs fonctions généralités — Correction');
	// L'énoncé, puis sa correction juste dessous (avant l'exercice suivant)
	expect(text.indexOf('Calculer la dérivée')).toBeLessThan(text.indexOf('2𝑥'));
	expect(text.indexOf('2𝑥')).toBeLessThan(text.indexOf('Verifs sans corrigé'));
	expect(text).toContain('Correction non écrite.');
	expect(greyShare(pdf)).toBeGreaterThan(0.002);

	// Onglet Markdown : la correction sous l'énoncé
	await page.getByRole('tab', { name: 'Markdown' }).click();
	const markdown = page.getByLabel('Code Markdown');
	await expect(markdown).toBeVisible();
	const source = await markdown.textContent();
	expect(source).toContain('Correction');
	expect((source ?? '').indexOf('Calculer la dérivée')).toBeLessThan(
		(source ?? '').indexOf("f'(x)=2x")
	);
});

test('#1379 #1429 — champ « Style » : défaut « Fiche élève », pas d’option « Aucun », ni Contrôle / Examen / Devoirs / Quiz ; création présélectionnée', async ({
	page
}) => {
	const draft = await createWorksheet({
		title: 'Verifs brouillon style',
		styleId: null,
		status: 'draft',
		exercises: [{ exercise: decor.exFormula }]
	});
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(`/dashboard/teacher/contenu/worksheets/${draft}`);
	await page.waitForLoadState('networkidle');

	// Fiche sans style : « Fiche élève (par défaut) »
	await expect(page.getByText('Style', { exact: true }).first()).toBeVisible();
	await page.getByRole('button', { name: 'Fiche élève (par défaut)' }).click();
	await expect(page.getByRole('combobox', { name: 'Choisir le style' })).toHaveText('Fiche élève');
	await page.getByRole('combobox', { name: 'Choisir le style' }).click();
	const options = (await page.getByRole('option').allInnerTexts()).map((text) =>
		text.replace(/\s*✓\s*$/, '').trim()
	);
	expect(options).toContain('Fiche élève');
	expect(options).toContain('Standard');
	expect(options).not.toContain('Aucun');
	for (const retired of ['Contrôle', 'Examen', 'Devoirs', 'Quiz']) {
		expect(options, `style « ${retired} » retiré du menu`).not.toContain(retired);
	}
	await page.keyboard.press('Escape');

	// Plus de case « Points » dans l'écran d'une fiche d'exercices (elle vient du type, ADR 0030)
	await expect(page.getByText(/Points par/)).toHaveCount(0);

	// Création d'une fiche : « Fiche élève » présélectionné, pas d'option « Aucun »
	await page.goto('/dashboard/teacher/contenu/worksheets/new');
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('combobox', { name: 'Choisir le style' })).toHaveText('Fiche élève');
	await page.getByRole('combobox', { name: 'Choisir le style' }).click();
	const creation = (await page.getByRole('option').allInnerTexts()).map((text) =>
		text.replace(/\s*✓\s*$/, '').trim()
	);
	expect(creation).not.toContain('Aucun');
	expect(creation).toContain('Fiche élève');
});

test('#1379 — page des templates : un template créé apparaît dans « Style », renommé le nom suit, refusé à la suppression tant qu’une fiche l’utilise', async ({
	page
}) => {
	test.setTimeout(150_000);
	await sql(`delete from worksheet_styles where owner_id = $1 and name like 'Verifs %'`, [
		TEACHER_ID_FOR_TEMPLATES
	]);
	await sql(`delete from worksheet_templates where created_by = $1 and name like 'Verifs %'`, [
		TEACHER_ID_FOR_TEMPLATES
	]);
	const draft = await createWorksheet({
		title: 'Verifs brouillon gabarit',
		styleId: null,
		status: 'draft',
		exercises: [{ exercise: decor.exFormula }]
	});
	await login(page, TEACHER.email, TEACHER.password);

	// Création (le contenu Typst standard est prérempli)
	await page.goto('/dashboard/teacher/contenu/worksheets/templates/new');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Nom du template').fill('Verifs mon style');
	await page.getByRole('button', { name: 'Creer le template' }).click();
	await page.waitForURL(/\/worksheets\/templates\/[0-9a-f-]{36}$/);

	// Il apparaît dans le menu « Style » d'une fiche
	const open = async () => {
		await page.goto(`/dashboard/teacher/contenu/worksheets/${draft}`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Fiche élève (par défaut)' }).click();
		await page.getByRole('combobox', { name: 'Choisir le style' }).click();
		return (await page.getByRole('option').allInnerTexts()).map((t) =>
			t.replace(/\s*✓\s*$/, '').trim()
		);
	};
	expect(await open()).toContain('Verifs mon style');

	// Renommé : le nom suit
	const row = await sql<{ id: string }>(
		`select id from worksheet_templates where name = 'Verifs mon style'`
	);
	await page.goto(`/dashboard/teacher/contenu/worksheets/templates/${row[0].id}`);
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Nom du template').fill('Verifs mon style renommé');
	await page.getByRole('button', { name: 'Sauvegarder' }).click();
	await expect(
		page.getByText(/Sauvegard|sauvegard|mis à jour|Operation reussie/).first()
	).toBeVisible();
	const renamed = await open();
	expect(renamed).toContain('Verifs mon style renommé');
	expect(renamed).not.toContain('Verifs mon style');

	// Une fiche l'utilise : suppression refusée
	const style = await sql<{ id: string }>(
		`select style_id as id from worksheet_templates where id = $1`,
		[row[0].id]
	);
	await sql(`update worksheets set style_id = $2 where id = $1`, [draft, style[0].id ?? row[0].id]);
	await page.goto('/dashboard/teacher/contenu/worksheets/templates');
	await page.waitForLoadState('networkidle');
	const line = page.getByRole('row', { name: /Verifs mon style renommé/ });
	await line.getByTitle('Supprimer').click();
	await expect(page.getByText(/utilisé par 1 feuille/)).toBeVisible();
	expect(await sql(`select 1 from worksheet_templates where id = $1`, [row[0].id])).toHaveLength(1);

	// Plus utilisé : la suppression passe
	await sql(`update worksheets set style_id = null where id = $1`, [draft]);
	await page.reload();
	await page.waitForLoadState('networkidle');
	await page
		.getByRole('row', { name: /Verifs mon style renommé/ })
		.getByTitle('Supprimer')
		.click();
	await expect(page.getByText('Modèle supprimé')).toBeVisible();
	await sql(`delete from worksheet_styles where owner_id = $1 and name like 'Verifs %'`, [
		TEACHER_ID_FOR_TEMPLATES
	]);
});

test('#1454 — style « 2 colonnes - paysage » : A4 paysage, deux colonnes à filet centré pour fiche, réponses, corrigé, fiche + corrigé ; « Fiche élève » reste en portrait', async ({
	page
}) => {
	test.setTimeout(300_000);
	const wLandscape = await createWorksheet({
		title: 'Verifs deux colonnes paysage',
		styleId: STYLE_IDS.deuxColonnesPaysage,
		sections: ['Verifs section'],
		exercises: [{ exercise: decor.exFormula, section: 0 }, { exercise: decor.exNoSolution }]
	});
	const wPortrait = await createWorksheet({
		title: 'Verifs fiche élève portrait',
		styleId: STYLE_IDS.ficheEleve,
		sections: ['Verifs section'],
		exercises: [{ exercise: decor.exFormula, section: 0 }, { exercise: decor.exNoSolution }]
	});
	await login(page, TEACHER.email, TEACHER.password);
	for (const kind of ['Fiche', 'Réponses', 'Corrigé', 'Fiche + corrigé']) {
		const pdf = await teacherPdf(page, wLandscape, { kind, saveAs: `paysage-${kind}.pdf` });
		pdfToPng(pdf, `paysage-${kind.replace(/\W+/g, '-')}`);
		const info = pdfInfo(pdf);
		// A4 paysage : 841,89 × 595,28 pt
		expect(info.width, `${kind} : largeur`).toBeGreaterThan(info.height);
		expect(Math.round(info.width)).toBe(842);
		expect(Math.round(info.height)).toBe(595);
		expect(hasCenterRule(pdf), `${kind} : filet vertical au centre`).toBe(true);
	}
	const portrait = await teacherPdf(page, wPortrait, { saveAs: 'portrait.pdf' });
	const info = pdfInfo(portrait);
	expect(info.height).toBeGreaterThan(info.width);
});

test('#1457 — élève : « Taille du texte » enregistrée, PDF à 18 pt en gardant les colonnes, menu conservé au rechargement', async ({
	browser,
	baseURL
}) => {
	test.setTimeout(300_000);
	await sql(`delete from student_print_settings where student_id = $1`, [STUDENT_IDS[STUDENT]]);
	const wColumns = await createWorksheet({
		title: 'Verifs taille du texte',
		styleId: STYLE_IDS.ficheEleve,
		exercises: [{ exercise: decor.exFormula }, { exercise: decor.exNoSolution }]
	});
	const aColumns = await assignWorksheet(wColumns, [STUDENT]);
	const student = await studentPage(browser, baseURL);
	await student.goto(`/dashboard/student/worksheets/${aColumns}`);
	await student.waitForLoadState('networkidle');

	const normal = await studentPdf(student, aColumns, { saveAs: 'taille-normale.pdf' });
	const bodySize = (pdf: string) =>
		Math.max(
			...pdfRuns(pdf)
				.filter((run) => /Calculer|Énoncé/.test(run.text))
				.map((run) => run.size)
		);
	const sizeNormal = bodySize(normal);

	await student.getByRole('combobox', { name: /^Taille du texte/ }).click();
	await student.getByRole('option', { name: /^Très grande/ }).click();
	await expect(student.getByText(/Taille du texte enregistrée/)).toBeVisible();
	const large = await studentPdf(student, aColumns, { saveAs: 'taille-tres-grande.pdf' });
	pdfToPng(large, 'taille-tres-grande');
	// 10 pt → 18 pt (facteur 1,8) ; colonnes du style gardées
	expect(bodySize(large) / sizeNormal).toBeGreaterThan(1.6);
	expect(bodySize(large) / sizeNormal).toBeLessThan(2);
	expect(hasCenterRule(large)).toBe(true);

	// Recharger : le menu reste sur « Très grande »
	await student.goto(`/dashboard/student/worksheets/${aColumns}`);
	await student.waitForLoadState('networkidle');
	await expect(student.getByRole('combobox', { name: /^Taille du texte/ })).toHaveText(
		/Très grande/
	);
	// Une autre fiche sort aussi en grand
	const other = await studentPdf(student, decor.aMixed, {
		choice: 'Sans corrections',
		saveAs: 'taille-autre.pdf'
	});
	const otherSize = Math.max(
		...pdfRuns(other)
			.filter((run) => /Calculer/.test(run.text))
			.map((run) => run.size)
	);
	expect(otherSize / sizeNormal).toBeGreaterThan(1.6);
	await student.context().close();
	await sql(`delete from student_print_settings where student_id = $1`, [STUDENT_IDS[STUDENT]]);
});

/** Cinq exercices « Verifs ordre A… E » avec corrigé, pour les tests d'ordre et de copies */
async function createFiveExercises(): Promise<FicheExercise[]> {
	const exercises: FicheExercise[] = [];
	for (const letter of ['A', 'B', 'C', 'D', 'E']) {
		exercises.push(
			await createExercise(
				`Verifs ordre ${letter}`,
				`Énoncé de l'exercice ${letter}.`,
				`Corrigé de l'exercice ${letter}.`
			)
		);
	}
	return exercises;
}

/** L'ordre des exercices lu sur la page de l'élève : « Verifs ordre B », … */
async function orderOnScreen(student: Page, assignmentId: string): Promise<string[]> {
	await student.goto(`/dashboard/student/worksheets/${assignmentId}`);
	await student.waitForLoadState('networkidle');
	const buttons = student.getByRole('button', { name: /^Ouvrir la Corvée \d/ });
	await expect(buttons.first()).toBeVisible();
	const names = await buttons.allInnerTexts();
	return names.map((name) => /Verifs ordre ([A-E])/.exec(name)?.[1] ?? name);
}

/** L'ordre des exercices lu dans le texte d'un PDF */
function orderInPdf(pdf: string): string[] {
	return [
		...pdfText(pdf)
			.join('\n')
			.matchAll(/Verifs ordre ([A-E])/g)
	].map((match) => match[1]);
}

test('#1348 — mélanger les exercices, affectation individualisée : un ordre par élève, le même à l’écran et dans son PDF, stable ; case décochée : ordre normal', async ({
	browser,
	baseURL
}) => {
	test.setTimeout(400_000);
	const five = await createFiveExercises();
	const wShuffle = await createWorksheet({
		title: 'Verifs ordre mélangé',
		styleId: STYLE_IDS.ficheEleve,
		config: { shuffle_exercises: true },
		exercises: five.map((exercise) => ({ exercise }))
	});
	const emails = ['eleve01@local.test', 'eleve02@local.test', 'eleve03@local.test'] as const;
	const assignment = await assignWorksheet(wShuffle, [...emails], {
		individualized: true,
		showCorrections: true
	});

	const screens: string[][] = [];
	for (const email of emails) {
		const student = await studentPage(browser, baseURL, email);
		const first = await orderOnScreen(student, assignment);
		const pdf = await studentPdf(student, assignment, {
			choice: 'Sans corrections',
			saveAs: `ordre-${email}.pdf`
		});
		// Le même ordre à l'écran et dans le PDF
		expect(orderInPdf(pdf), `${email} : PDF`).toEqual(first);
		// Stable après rechargement
		expect(await orderOnScreen(student, assignment), `${email} : après rechargement`).toEqual(
			first
		);
		// Son corrigé suit son ordre
		const withCorrection = await studentPdf(student, assignment, {
			choice: 'Avec corrigé',
			saveAs: `ordre-corrige-${email}.pdf`
		});
		const [, correction] = pdfText(withCorrection);
		expect(
			[...correction.matchAll(/Corrigé de l.exercice ([A-E])/g)].map((match) => match[1]),
			`${email} : corrigé`
		).toEqual(first);
		screens.push(first);
		await student.context().close();
	}
	// Chaque élève a SON ordre : deux élèves ne se ressemblent pas, et ce n'est pas l'ordre normal
	expect(new Set(screens.map((order) => order.join(''))).size).toBe(3);
	expect(screens.every((order) => order.join('') !== 'ABCDE')).toBe(true);

	// Case décochée : l'ordre normal, pour tout le monde
	await sql(`update worksheets set config = '{}'::jsonb where id = $1`, [wShuffle]);
	const student = await studentPage(browser, baseURL, emails[0]);
	expect(await orderOnScreen(student, assignment)).toEqual(['A', 'B', 'C', 'D', 'E']);
	await student.context().close();
});

test('#1445 #1446 #1457 — « Imprimer une copie par élève » : toutes les copies par ordre alphabétique ou une seule, nom pré-imprimé, énoncés propres à l’élève, taille du texte de l’élève', async ({
	page,
	browser,
	baseURL
}) => {
	test.setTimeout(400_000);
	const five = await createFiveExercises();
	// Fiche d'exercices SANS l'option « nom de l'élève » : le nom est pré-imprimé quand même
	const wCopies = await createWorksheet({
		title: 'Verifs copies par élève',
		styleId: STYLE_IDS.ficheEleve,
		config: { shuffle_exercises: true },
		exercises: five.map((exercise) => ({ exercise }))
	});
	const emails = ['eleve01@local.test', 'eleve02@local.test', 'eleve03@local.test'] as const;
	const assignment = await assignWorksheet(wCopies, [...emails], { individualized: true });
	// L'élève 02 lit en « Grande » ; les autres en normale
	await sql(`delete from student_print_settings where student_id = any($1)`, [
		Object.values(STUDENT_IDS)
	]);
	await sql(`insert into student_print_settings (student_id, text_size) values ($1, 'large')`, [
		STUDENT_IDS['eleve02@local.test']
	]);
	const profiles = await sql<{ email: string; firstname: string; lastname: string }>(
		`select email, firstname, lastname from profiles where email = any($1)`,
		[[...emails]]
	);
	const nameOf = (email: string) => {
		const profile = profiles.find((p) => p.email === email);
		return `${profile?.lastname} ${profile?.firstname}`.trim();
	};

	await login(page, TEACHER.email, TEACHER.password);
	// Depuis l'aperçu de l'affectation : le bouton mène à la page des copies
	await page.goto(
		`/dashboard/teacher/contenu/worksheets/${wCopies}/assignments/${assignment}/preview`
	);
	await page.getByRole('link', { name: 'Imprimer une copie par élève' }).click();
	await page.waitForURL(/\/copies/);
	await expect(page.getByRole('heading', { name: 'Copies par élève' })).toBeVisible();

	// Toutes les copies à la suite : ordre alphabétique, nom pré-imprimé
	const download = page.getByRole('button', { name: 'Télécharger' });
	await expect(download).toBeEnabled({ timeout: 120_000 });
	const all = await savePdf(page, 'Télécharger', 'copies-toutes.pdf');
	pdfToPng(all, 'copies-toutes');
	const text = pdfText(all).join('\n');
	const expectedOrder = emails.map(nameOf).sort((a, b) => a.localeCompare(b, 'fr'));
	const positions = expectedOrder.map((name) => text.indexOf(name));
	expect(
		positions.every((position) => position >= 0),
		`noms pré-imprimés : ${expectedOrder}`
	).toBe(true);
	expect([...positions].sort((a, b) => a - b)).toEqual(positions);
	// 3 copies : 3 fois la fiche (le titre revient une fois par copie)
	expect(text.split('Verifs copies par élève').length - 1).toBeGreaterThanOrEqual(3);
	expect(pdfInfo(all).pages).toBeGreaterThanOrEqual(3);

	// La copie d'un seul élève : son nom, ses énoncés dans son ordre (individualisé)
	await page.getByRole('combobox', { name: /^Copie à afficher/ }).click();
	await page.getByRole('option', { name: new RegExp(nameOf('eleve01@local.test')) }).click();
	await expect(download).toBeEnabled({ timeout: 120_000 });
	const one = await savePdf(page, 'Télécharger', 'copies-eleve01.pdf');
	expect(pdfInfo(one).pages).toBe(1);
	const oneText = pdfText(one).join('\n');
	expect(oneText).toContain(nameOf('eleve01@local.test'));
	expect(oneText).not.toContain(nameOf('eleve03@local.test'));
	// Individualisé : la copie porte les énoncés dans l'ordre de l'élève, celui de son écran
	const student01 = await studentPage(browser, baseURL, 'eleve01@local.test');
	const onScreen = await orderOnScreen(student01, assignment);
	await student01.context().close();
	expect(orderInPdf(one)).toEqual(onScreen);

	// #1457 côté prof : taille du texte de l'élève 02, grande ; les autres copies, normales
	const twoPdf = async (email: string, saveAs: string) => {
		await page.getByRole('combobox', { name: /^Copie à afficher/ }).click();
		await page.getByRole('option', { name: new RegExp(nameOf(email)) }).click();
		await expect(download).toBeEnabled({ timeout: 120_000 });
		return savePdf(page, 'Télécharger', saveAs);
	};
	const big = await twoPdf('eleve02@local.test', 'copies-eleve02.pdf');
	const bodySize = (pdf: string) =>
		Math.max(
			...pdfRuns(pdf)
				.filter((run) => /Énoncé de/.test(run.text))
				.map((run) => run.size)
		);
	expect(bodySize(big) / bodySize(one)).toBeGreaterThan(1.25);
	// Un autre élève (taille normale) : copie à la taille normale, et son propre ordre
	const normal03 = await twoPdf('eleve03@local.test', 'copies-eleve03.pdf');
	expect(bodySize(normal03) / bodySize(one)).toBeLessThan(1.1);
	expect(orderInPdf(normal03).join('')).not.toBe(orderInPdf(one).join(''));
	await sql(`delete from student_print_settings where student_id = any($1)`, [
		Object.values(STUDENT_IDS)
	]);
});

test('#1457 — prof : « Taille du texte » de l’aperçu d’une fiche (revient à Normale), « Prévisualiser comme » un élève montre et enregistre SA taille', async ({
	page
}) => {
	test.setTimeout(300_000);
	await login(page, TEACHER.email, TEACHER.password);
	const normal = await teacherPdf(page, decor.wMixed, { saveAs: 'prof-taille-normale.pdf' });
	const size = (pdf: string) =>
		Math.max(
			...pdfRuns(pdf)
				.filter((run) => /Calculer/.test(run.text))
				.map((run) => run.size)
		);

	// Aperçu d'une fiche : Grande → PDF agrandi
	await page.getByRole('combobox', { name: /^Taille du texte/ }).click();
	await page.getByRole('option', { name: /^Grande/ }).click();
	const large = await savePdf(page, 'Telecharger', 'prof-taille-grande.pdf');
	expect(size(large) / size(normal)).toBeGreaterThan(1.25);
	expect(size(large) / size(normal)).toBeLessThan(1.6);

	// À la réouverture : de nouveau Normale
	await page.goto(`/dashboard/teacher/contenu/worksheets/${decor.wMixed}`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('tab', { name: 'PDF' }).click();
	await expect(page.getByRole('combobox', { name: /^Taille du texte/ })).toHaveText(/Normale/);

	// Aperçu d'une affectation, « Prévisualiser comme » un élève : le menu montre SA taille
	await sql(`delete from student_print_settings where student_id = $1`, [STUDENT_IDS[STUDENT]]);
	await sql(`insert into student_print_settings (student_id, text_size) values ($1, 'large')`, [
		STUDENT_IDS[STUDENT]
	]);
	const who = await sql<{ firstname: string; lastname: string }>(
		`select firstname, lastname from profiles where email = $1`,
		[STUDENT]
	);
	await page.goto(
		`/dashboard/teacher/contenu/worksheets/${decor.wMixed}/assignments/${decor.aMixed}/preview`
	);
	await page.waitForLoadState('networkidle');
	await page.getByRole('combobox', { name: 'Selectionnez un eleve...' }).click();
	await page
		.getByRole('option', { name: new RegExp(`${who[0].firstname} ${who[0].lastname}`) })
		.click();
	await expect(page.getByRole('combobox', { name: /^Taille du texte/ })).toHaveText(/Grande/);

	// La changer l'enregistre pour lui
	await page.getByRole('combobox', { name: /^Taille du texte/ }).click();
	await page.getByRole('option', { name: /^Très grande/ }).click();
	await expect
		.poll(
			async () =>
				(
					await sql<{ text_size: string }>(
						`select text_size from student_print_settings where student_id = $1`,
						[STUDENT_IDS[STUDENT]]
					)
				)[0]?.text_size
		)
		.toBe('x_large');
	await sql(`delete from student_print_settings where student_id = $1`, [STUDENT_IDS[STUDENT]]);
});

test('#1428 — chaque type de fiche : ses options seulement, en-tête du PDF selon le type, Réponses et Corrigé : le titre seul, plus de « Options d’affichage »', async ({
	page
}) => {
	test.setTimeout(400_000);
	const config: Record<string, Record<string, unknown>> = {
		worksheet: { show_student_name: true },
		assessment: { show_points: true, calculator: 'forbidden', answers_on_sheet: true },
		homework: { due_date: '2026-12-01' },
		exam: { calculator: 'allowed', answers_on_sheet: true }
	};
	// Ce que l'écran d'une fiche en brouillon propose, par type
	const options: Record<string, { present: RegExp[]; absent: RegExp[] }> = {
		worksheet: {
			present: [/Nom de l'élève/],
			absent: [/Points par/, /Calculatrice/, /Réponses sur le sujet/, /Date de rendu/]
		},
		assessment: {
			present: [/Points par/, /Calculatrice/, /Réponses sur le sujet/],
			absent: [/Nom de l'élève/, /Date de rendu/]
		},
		homework: {
			present: [/Date de rendu/],
			absent: [/Nom de l'élève/, /Points par/, /Calculatrice/, /Réponses sur le sujet/]
		},
		exam: {
			present: [/Calculatrice/, /Réponses sur le sujet/, /toujours imprimés/],
			absent: [/Nom de l'élève/, /Date de rendu/]
		}
	};
	// En-tête de la fiche imprimée, par type
	const header: Record<string, { present: RegExp[]; absent: RegExp[] }> = {
		worksheet: {
			present: [/Nom :/],
			absent: [/Classe :/, /Date :/, /pts/, /calculatrice/i, /Durée/, /À rendre/]
		},
		assessment: {
			present: [
				/Nom :/,
				/Classe :/,
				/Date :/,
				/La calculatrice est interdite/,
				/Total : 2 Points/,
				/2 pts/
			],
			absent: [/Durée/, /À rendre/]
		},
		homework: {
			present: [/Nom :/, /Classe :/, /À rendre pour le : 1 décembre 2026/],
			absent: [/Date :/, /pts/, /calculatrice/i, /Durée/]
		},
		exam: {
			present: [
				/Nom :/,
				/Classe :/,
				/Date :/,
				/Durée : 90 minutes/,
				/La calculatrice est autorisée/,
				/Total : 2 Points/,
				/2 pts/
			],
			absent: [/À rendre/]
		}
	};
	await login(page, TEACHER.email, TEACHER.password);
	for (const type of ['worksheet', 'assessment', 'homework', 'exam'] as const) {
		const id = await createWorksheet({
			title: `Verifs type ${type}`,
			type,
			styleId: STYLE_IDS.standard,
			config: config[type],
			status: 'draft',
			exercises: [{ exercise: decor.exFormula, points: 2 }]
		});
		if (type === 'exam')
			await sql(`update worksheets set estimated_duration_minutes = 90 where id = $1`, [id]);

		// Les options du type, et seulement elles ; plus de panneau « Options d'affichage »
		await page.goto(`/dashboard/teacher/contenu/worksheets/${id}`);
		await page.waitForLoadState('networkidle');
		const body = page.locator('#contenu-principal');
		await expect(body.getByText('Titre', { exact: true }).first()).toBeVisible();
		for (const pattern of options[type].present)
			await expect(body.getByText(pattern).first(), `${type} : ${pattern}`).toBeVisible();
		for (const pattern of options[type].absent)
			await expect(body.getByText(pattern), `${type} : pas ${pattern}`).toHaveCount(0);
		await expect(body.getByText(/Options d'affichage/)).toHaveCount(0);

		// PDF de la fiche : l'en-tête du type
		const sheet = await teacherPdf(page, id, { saveAs: `type-${type}.pdf` });
		const sheetText = pdfText(sheet).join('\n');
		for (const pattern of header[type].present)
			expect(sheetText, `${type} : fiche ${pattern}`).toMatch(pattern);
		for (const pattern of header[type].absent)
			expect(sheetText, `${type} : fiche sans ${pattern}`).not.toMatch(pattern);

		// Réponses et Corrigé : le titre seul (ni nom, ni classe, ni date, ni calculatrice, ni durée)
		for (const kind of ['Réponses', 'Corrigé']) {
			const pdf = await teacherPdf(page, id, { kind, saveAs: `type-${type}-${kind}.pdf` });
			const text = pdfText(pdf).join('\n');
			expect(text).toContain(`Verifs type ${type}`);
			expect(text, `${type} ${kind}`).not.toMatch(
				/Nom :|Classe :|Date :|calculatrice|Durée|À rendre|Total :/i
			);
		}
	}
});

test('#1433 #1438 — évaluation avec « Réponses sur le sujet » : cadres par question ou par exercice, −/+ (auto → modifié ↺, 0 = pas de cadre), « Aperçu : N pages », même mise en page dans le PDF de l’élève', async ({
	page,
	browser,
	baseURL
}) => {
	test.setTimeout(400_000);
	const exQuestions = await createExercise(
		'Verifs cadres',
		'1. Calculer $2+3$.\n2. Calculer $4+5$.',
		'1. $5$.\n2. $9$.'
	);
	const wFrames = await createWorksheet({
		title: 'Verifs cadres de réponse',
		type: 'assessment',
		styleId: STYLE_IDS.standard,
		status: 'draft',
		config: { answers_on_sheet: true },
		exercises: [{ exercise: exQuestions }]
	});
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(`/dashboard/teacher/contenu/worksheets/${wFrames}`);
	await page.waitForLoadState('networkidle');

	// Un cadre après chaque question (par défaut) : une ligne de réglage par question
	const rows = page.getByTestId('cadre-ligne');
	await expect(rows).toHaveCount(2);
	await expect(rows.first()).toContainText('auto');

	// « + » : auto devient « modifié ↺ » ; ↺ remet en auto
	await page.getByRole('button', { name: 'Une ligne de plus, question 1' }).click();
	await expect(rows.first()).toContainText('modifié');
	await page.getByRole('button', { name: 'Remettre en automatique, question 1' }).click();
	await expect(rows.first()).toContainText('auto');

	// 0 ligne = pas de cadre : on descend à 0 la première question, la deuxième reste en auto
	const dbFrames = async () =>
		(
			await sql<{ frames: unknown }>(
				`select answer_frame_lines as frames from worksheet_exercises where worksheet_id = $1`,
				[wFrames]
			)
		)[0]?.frames;
	for (let i = 0; i < 30; i++) {
		const text = await rows.first().innerText();
		if (/\b0 ligne/.test(text)) break;
		await page.getByRole('button', { name: 'Une ligne de moins, question 1' }).click();
	}
	await expect.poll(dbFrames, { timeout: 15_000 }).toEqual({ questions: [0, null] });

	// L'onglet PDF : « Aperçu : 1 page » (sans avertissement)
	await page.getByRole('tab', { name: 'PDF' }).click();
	const pages = page.getByTestId('apercu-pages');
	await expect(pages).toContainText(/1\s+page\s*$/, { timeout: 90_000 });
	await expect(pages).not.toHaveClass(/amber/);

	// Beaucoup de lignes (plafond 25) : plus d'une page, « ⚠ Aperçu : 2 pages »
	await sql(
		`update worksheet_exercises set answer_frame_lines = '{"questions":[25,25]}'::jsonb where worksheet_id = $1`,
		[wFrames]
	);
	await page.reload();
	await page.waitForLoadState('networkidle');
	await page.getByRole('tab', { name: 'PDF' }).click();
	await expect(pages).toContainText(/\d+\s+pages/, { timeout: 90_000 });
	const shown = Number(/(\d+)\s+pages/.exec(await pages.innerText())?.[1]);
	expect(shown).toBeGreaterThan(1);
	await expect(pages).toHaveClass(/amber/);
	const teacher = await savePdf(page, 'Telecharger', 'cadres-prof.pdf');
	pdfToPng(teacher, 'cadres-prof');
	expect(pdfInfo(teacher).pages).toBe(shown);

	// Après l'exercice (un seul cadre) : une seule ligne de réglage
	await sql(
		`update worksheets set config = '{"answers_on_sheet":true,"answer_frames":"exercise"}'::jsonb where id = $1`,
		[wFrames]
	);
	await page.goto(`/dashboard/teacher/contenu/worksheets/${wFrames}`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('cadre-ligne')).toHaveCount(1);

	// Le PDF de l'élève a les mêmes cadres : même nombre de pages que celui du prof
	await sql(
		`update worksheets set config = '{"answers_on_sheet":true}'::jsonb, status = 'published' where id = $1`,
		[wFrames]
	);
	const assignment = await assignWorksheet(wFrames, [STUDENT]);
	const student = await studentPage(browser, baseURL);
	const studentFile = await studentPdf(student, assignment, { saveAs: 'cadres-eleve.pdf' });
	pdfToPng(studentFile, 'cadres-eleve');
	expect(pdfInfo(studentFile).pages).toBe(shown);
	await student.context().close();
});

test('#1441 #1443 — dupliquer une fiche : la copie garde traductions, « indispensable », variante choisie et cadres ; plafond de 25 lignes', async ({
	page
}) => {
	test.setTimeout(150_000);
	const source = await createWorksheet({
		title: 'Verifs source à dupliquer',
		type: 'assessment',
		styleId: STYLE_IDS.standard,
		config: { answers_on_sheet: true },
		sections: ['Verifs section source'],
		exercises: [
			{
				exercise: decor.exFormula,
				section: 0,
				frames: { questions: [3, null], exercise: 5 }
			}
		]
	});
	await sql(
		`update worksheets set translations = '{"en":{"title":"Verifs english title"}}'::jsonb where id = $1`,
		[source]
	);
	await sql(
		`update worksheet_sections set translations = '{"en":{"title":"Verifs english section"}}'::jsonb where worksheet_id = $1`,
		[source]
	);
	await sql(
		`update worksheet_exercises set translations = '{"en":{"custom_instructions":"Verifs english instructions"}}'::jsonb,
		   is_essential = true, variation_index = 1, custom_instructions = 'Verifs consigne' where worksheet_id = $1`,
		[source]
	);

	await login(page, TEACHER.email, TEACHER.password);
	await page.goto('/dashboard/teacher/contenu/worksheets?search=Verifs%20source');
	await page.waitForLoadState('networkidle');
	await page
		.getByRole('row', { name: /Verifs source à dupliquer/ })
		.getByTitle('Dupliquer')
		.click();
	await expect(page.getByText('Feuille dupliquee')).toBeVisible();

	const copies = await sql<{ id: string; translations: unknown }>(
		`select id, translations from worksheets where created_by = $1 and title like 'Verifs source à dupliquer%' and id <> $2`,
		[TEACHER_ID, source]
	);
	expect(copies).toHaveLength(1);
	expect(copies[0].translations).toEqual({ en: { title: 'Verifs english title' } });
	const rows = await sql<Record<string, unknown>>(
		`select translations, is_essential, variation_index, answer_frame_lines, custom_instructions
		 from worksheet_exercises where worksheet_id = $1`,
		[copies[0].id]
	);
	expect(rows).toHaveLength(1);
	expect(rows[0]).toMatchObject({
		translations: { en: { custom_instructions: 'Verifs english instructions' } },
		is_essential: true,
		variation_index: 1,
		answer_frame_lines: { questions: [3, null], exercise: 5 },
		custom_instructions: 'Verifs consigne'
	});
	const sections = await sql<{ translations: unknown }>(
		`select translations from worksheet_sections where worksheet_id = $1`,
		[copies[0].id]
	);
	expect(sections[0].translations).toEqual({ en: { title: 'Verifs english section' } });

	// Plafond : 25 lignes au plus (la base refuse 26, l'écran ne propose pas « + » à 25)
	await expect(
		sql(
			`update worksheet_exercises set answer_frame_lines = '{"questions":[26]}'::jsonb where worksheet_id = $1`,
			[source]
		)
	).rejects.toThrow(/answer_frame_lines/);
	await sql(`update worksheets set status = 'draft' where id = $1`, [source]);
	await sql(
		`update worksheet_exercises set answer_frame_lines = '{"exercise":25}'::jsonb where worksheet_id = $1`,
		[source]
	);
	await sql(
		`update worksheets set config = '{"answers_on_sheet":true,"answer_frames":"exercise"}'::jsonb where id = $1`,
		[source]
	);
	await page.goto(`/dashboard/teacher/contenu/worksheets/${source}`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('button', { name: /^Une ligne de plus/ })).toBeDisabled();
});

test('#1352 — signalement d’une affectation individualisée : « Voir la copie de <prénom> » puis « Corriger l’exercice »', async ({
	page,
	browser,
	baseURL
}) => {
	test.setTimeout(300_000);
	const five = await createFiveExercises();
	const wReport = await createWorksheet({
		title: 'Verifs signalement',
		styleId: STYLE_IDS.ficheEleve,
		config: { shuffle_exercises: true },
		exercises: five.map((exercise) => ({ exercise }))
	});
	const emails = ['eleve01@local.test', 'eleve03@local.test'] as const;
	const assignment = await assignWorksheet(wReport, [...emails], { individualized: true });

	// L'élève ouvre un exercice et le signale (éditeur de texte riche)
	const student = await studentPage(browser, baseURL, emails[0]);
	await student.goto(`/dashboard/student/worksheets/${assignment}`);
	await student.waitForLoadState('networkidle');
	await student.getByRole('button', { name: /^Ouvrir la Corvée 1/ }).click();
	await student
		.getByRole('button', { name: /Signaler une erreur dans cette Corvée/ })
		.first()
		.click();
	await student.locator('.ProseMirror').last().click();
	await student.keyboard.type('Verifs : une faute de frappe dans cet énoncé, à corriger.');
	await student.getByRole('button', { name: 'Envoyer le signalement' }).click();
	await expect(student.getByText(/signalement.*envoy|Signalement envoy/i).first()).toBeVisible();
	await student.screenshot({ path: '.captures/verifs/fiches/signalement-eleve.png' });
	await student.context().close();

	const reports = await sql<{ id: string; worksheet_exercise_id: string }>(
		`select id, worksheet_exercise_id from worksheet_error_reports where assignment_id = $1`,
		[assignment]
	);
	expect(reports).toHaveLength(1);

	// Le prof : la page du signalement propose les deux liens
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(
		`/dashboard/teacher/contenu/worksheets/${wReport}/assignments/${assignment}/reports/${reports[0].id}`
	);
	await page.waitForLoadState('networkidle');
	const copy = page.getByRole('link', { name: /^Voir la copie de / });
	await expect(copy).toBeVisible();
	await copy.click();
	await page.waitForURL(/\/preview/);
	// L'aperçu « vue élève » est présélectionné sur cet élève
	await expect(page.getByRole('combobox', { name: 'Selectionnez un eleve...' })).not.toHaveText(
		/Vue Capitaine/
	);
	await page.screenshot({ path: '.captures/verifs/fiches/signalement-copie.png' });

	await page.goBack();
	await page.getByRole('link', { name: 'Corriger l’exercice' }).click();
	await page.waitForURL(/\/contenu\/exercices\//);
});

test('#1352 — corrigé de classe d’une affectation individualisée : choix de l’élève (MySelect), 2 colonnes, titres sans numéro', async ({
	page
}) => {
	test.setTimeout(300_000);
	const five = await createFiveExercises();
	const wClass = await createWorksheet({
		title: 'Verifs corrigé de classe',
		styleId: STYLE_IDS.ficheEleve,
		config: { shuffle_exercises: true },
		exercises: five.map((exercise) => ({ exercise }))
	});
	const assignment = await assignWorksheet(wClass, ['eleve01@local.test', 'eleve03@local.test'], {
		individualized: true,
		showCorrections: true
	});
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(`/dashboard/teacher/contenu/worksheets/${wClass}`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('tab', { name: 'Assignations' }).click();
	await page
		.getByText(/Verifs affectation/)
		.first()
		.click();
	await captureOpenedPdf(page);
	await page.getByRole('button', { name: 'PDF', exact: true }).click();

	// Chaque élève a sa copie : la liste des élèves s'ouvre (MySelect), le corrigé part de la copie choisie
	await expect(page.getByRole('dialog', { name: 'Corrigé de classe' })).toBeVisible();
	await expect(page.getByRole('combobox', { name: /Choisir un élève|Élève/ })).toBeVisible();
	await page.getByRole('button', { name: 'Produire le corrigé' }).click();
	const pdf = await collectOpenedPdf(page, 'corrige-de-classe.pdf');
	pdfToPng(pdf, 'corrige-de-classe');

	// Deux colonnes à filet central ; les titres des exercices SANS numéro ni nom d'élève
	expect(hasCenterRule(pdf)).toBe(true);
	const text = pdfText(pdf).join('\n');
	expect(text).toMatch(/Corrigé de l.exercice A/);
	expect(text).toContain('Chaque élève a sa propre version');
	expect(text).toMatch(/Verifs ordre [A-E]/);
	expect(text).not.toMatch(/Exercice \d+\s*:\s*Verifs ordre/);
	expect(text).not.toMatch(/^\s*\d+\s+Verifs ordre/m);
	expect(text).not.toMatch(/Élève 0[13]|01 Élève|03 Élève/);
	void assignment;
});

test('#1352 — élève déjà sur la fiche : cliquer la notification « Voir l’exercice » fait défiler jusqu’à l’exercice', async ({
	browser,
	baseURL
}) => {
	test.setTimeout(150_000);
	const five = await createFiveExercises();
	const wScroll = await createWorksheet({
		title: 'Verifs défilement',
		styleId: STYLE_IDS.ficheEleve,
		exercises: five.map((exercise) => ({ exercise }))
	});
	const assignment = await assignWorksheet(wScroll, [STUDENT]);
	const lastExercise = await sql<{ id: string }>(
		`select id from worksheet_exercises where worksheet_id = $1 and exercise_id = $2`,
		[wScroll, five[4].id]
	);
	const target = lastExercise[0].id;
	// La notification que le serveur envoie à l'élève quand son signalement est validé
	await sql(`delete from notifications where title = 'Verifs : signalement validé'`);
	await sql(
		`insert into notifications (title, message, type, priority, target_type, target_user_ids, action_label, action_url, is_system, system_event_type)
		 values ('Verifs : signalement validé', '<p>Ton signalement a été validé.</p>', 'info', 'normal', 'users', $1, 'Voir l’exercice', $2, true, 'error_report_validated')`,
		[[STUDENT_IDS[STUDENT]], `/dashboard/student/worksheets/${assignment}#exercice-${target}`]
	);

	const context = await browser.newContext({ baseURL, viewport: { width: 1000, height: 380 } });
	const student = await context.newPage();
	await login(student, STUDENT, STUDENT_PASSWORD);
	await student.goto(`/dashboard/student/worksheets/${assignment}`);
	await student.waitForLoadState('networkidle');
	const anchor = student.locator(`#exercice-${target}`);
	await expect(anchor).toHaveCount(1);
	const action = student.getByRole('button', { name: 'Voir l’exercice' }).first();
	await expect(action).toBeVisible({ timeout: 30_000 });
	await expect(anchor).not.toBeInViewport();
	await action.click();
	// La page défile : l'exercice visé arrive à l'écran
	await expect(anchor).toBeInViewport({ timeout: 10_000 });
	await student.screenshot({ path: '.captures/verifs/fiches/defilement-notification.png' });
	await sql(`delete from notifications where title = 'Verifs : signalement validé'`);
	await context.close();
});
