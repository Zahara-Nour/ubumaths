import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import JSZip from 'jszip';
import sharp from 'sharp';
import { templateMarkdown } from '../../src/lib/ubumark/index';
import {
	emailsTo,
	emailText,
	waitForEmail,
	assertLocalServerEnv,
	login,
	sql,
	TEACHER,
	ADMIN,
	withFirstVersion
} from './helpers/carnet';
import {
	assignWorksheet,
	createWorksheet,
	pdfFonts,
	pdfText,
	pdfToPng,
	savePdf,
	chooseOption,
	STYLE_IDS,
	suggestedNames,
	TEACHER_ID,
	teacherPdf
} from './helpers/fiches';
import { components, isInk, pdfBoxes, rasterPage } from './helpers/pdf-mesures';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';

/**
 * Pages du prof et de l'admin, base LOCALE (tri des vérifications manuelles, paquet 7)
 * ====================================================================================
 *
 * Reprend les lignes #2581 / #2582 (aperçu PDF d'une fiche : langue d'impression, zip), #2596 (z
 * de Chiphre Math), #2575 (routes admin en mode administration), #2577 (listes déroulantes),
 * #2586 (compteur d'envois du consentement) et #2609 (fiches « Fonctions affines ») de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Données : tout ce que ces tests créent (fiches, exercices, modèles, élèves, consentements) porte
 * le préfixe « Verifs7 pages <projet> w<n> » et est effacé par CE préfixe seulement. Serveur de
 * dev et base locale seulement : jamais la prod.
 *
 * Non testé, relu contre les lignes : #2596, « si l'ancien z reste, recharger sans cache » (cache du
 * navigateur de David) et « rien d'autre ne change dans les formules » (seuls le z, le 2 et le texte
 * voisin sont mesurés) ; #2581 / #2582, les huit PDF du zip sont comparés par la valeur tirée dans la
 * fiche, le corrigé et la fiche-corrigé (« Réponses » : présence du fichier seulement) ; l'onglet Lot est joué sur une fiche
 * affectée à deux élèves (ses élèves sont ceux des affectations de la fiche) ; aucune impression papier.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(240_000));

// Constantes

const SHOTS = '.captures/verifs/out-pages7';

// Fonctions

const projectName = (): string => test.info().project.name;
const workerPrefix = (): string => `Verifs7 pages ${projectName()} w${test.info().parallelIndex}`;
const sourceExercices = (): string =>
	`verifs7 pages ${projectName()} w${test.info().parallelIndex}`;

/** Un exercice du prof : un énoncé, une solution, éventuellement sa traduction anglaise */
async function exercice(
	titre: string,
	enonce: string,
	solution: string,
	anglais?: { statement_md: string; solution_md: string },
	variables?: { name: string; expression: string }[]
): Promise<{ id: string; title: string }> {
	const rows = await sql<{ id: string }>(
		withFirstVersion(
			`insert into exercises (title, source, grades, topic, created_by, category, variations)
			 values ($1, $4, '{}', 'Verifs7', $2, 'automatisme', $3::jsonb) returning id`
		),
		[
			titre,
			TEACHER_ID,
			JSON.stringify([
				{
					label: 'guided',
					hints: [],
					statement_md: enonce,
					solution_md: solution,
					...(variables ? { variables } : {}),
					...(anglais ? { translations: { en: anglais } } : {})
				}
			]),
			sourceExercices()
		]
	);
	return { id: rows[0].id, title: titre };
}

async function effacerFiches(): Promise<void> {
	await sql(`delete from worksheets where created_by = $1 and title like $2`, [
		TEACHER_ID,
		`${workerPrefix()} %`
	]);
	await sql(`delete from exercises where created_by = $1 and source = $2`, [
		TEACHER_ID,
		sourceExercices()
	]);
}

// ============================================================================
// #2596 — le z de Chiphre Math
// ============================================================================

/**
 * Le profil d'un glyphe : pour chaque rangée de son rectangle d'encre, la part de la largeur
 * couverte. Un z à coins a une barre en haut et une barre en bas (rangées pleines) reliées par une
 * diagonale (rangées du milieu presque vides) ; un 2 a un haut arrondi (rangées moins pleines).
 */
interface Profil {
	/** La rangée la plus pleine parmi le cinquième supérieur / inférieur (0 à 1) */
	barreHaute: number;
	barreBasse: number;
	/** La couverture moyenne du tiers central */
	milieu: number;
	/** Hauteur et largeur du rectangle d'encre, en pixels */
	hauteur: number;
	largeur: number;
}

function profilDe(
	encre: (x: number, y: number) => boolean,
	largeur: number,
	hauteur: number
): Profil {
	let x0 = largeur,
		x1 = -1,
		y0 = hauteur,
		y1 = -1;
	for (let y = 0; y < hauteur; y++) {
		for (let x = 0; x < largeur; x++) {
			if (!encre(x, y)) continue;
			x0 = Math.min(x0, x);
			x1 = Math.max(x1, x);
			y0 = Math.min(y0, y);
			y1 = Math.max(y1, y);
		}
	}
	if (x1 < 0) throw new Error('aucune encre dans le glyphe');
	const l = x1 - x0 + 1;
	const h = y1 - y0 + 1;
	const couverture: number[] = [];
	for (let y = y0; y <= y1; y++) {
		let n = 0;
		for (let x = x0; x <= x1; x++) if (encre(x, y)) n++;
		couverture.push(n / l);
	}
	const cinquieme = Math.ceil(h * 0.2);
	const tiers = couverture.slice(Math.floor(h / 3), Math.ceil((2 * h) / 3));
	return {
		barreHaute: Math.max(...couverture.slice(0, cinquieme)),
		barreBasse: Math.max(...couverture.slice(-cinquieme)),
		milieu: tiers.reduce((a, b) => a + b, 0) / tiers.length,
		hauteur: h,
		largeur: l
	};
}

/** Le z (et lui seul) a ses deux barres pleines et un milieu presque vide */
function expectZACoins(profil: Profil, nom: string): void {
	expect(profil.barreHaute, `${nom} : barre du haut`).toBeGreaterThanOrEqual(0.9);
	expect(profil.barreBasse, `${nom} : barre du bas`).toBeGreaterThanOrEqual(0.9);
	expect(profil.milieu, `${nom} : une diagonale seulement au milieu`).toBeLessThan(0.5);
}

test.describe('#2596 — z de Chiphre Math', () => {
	test.afterAll(effacerFiches);

	test('#2596 — le Corrigé d’une fiche dont une formule contient z (ou \\mathbf{z}) : z à coins (barre du haut, diagonale, barre du bas), pas un 2 ; rien d’autre ne change', async ({
		page
	}) => {
		await effacerFiches();
		const ex = await exercice(
			`${workerPrefix()} z`,
			'Donner la valeur.',
			'Voici : $z$ puis $2$ puis $\\mathbf{z}$.'
		);
		const fiche = await createWorksheet({
			title: `${workerPrefix()} fiche z`,
			styleId: STYLE_IDS.standard,
			exercises: [{ exercise: ex }]
		});
		await login(page, TEACHER.email, TEACHER.password);
		const pdf = await teacherPdf(page, fiche, { kind: 'Corrigé', saveAs: 'pages7-z-corrige.pdf' });
		pdfToPng(pdf, 'pages7-z-corrige', 80);
		// Le corrigé est bien imprimé en Chiphre Math
		expect(pdfFonts(pdf).join('\n')).toContain('ChiphreMath');

		const { boxes } = pdfBoxes(pdf);
		const boite = (texte: string) => {
			const trouvee = boxes.find((b) => b.page === 1 && b.text === texte);
			if (!trouvee) throw new Error(`« ${texte} » absent du PDF`);
			return trouvee;
		};
		const raster = rasterPage(pdf, 1, 600);
		const profilPdf = (texte: string): Profil => {
			const b = boite(texte);
			const [c] = components(raster, isInk, {
				left: b.left - 1,
				top: b.top - 1,
				right: b.left + b.width + 1,
				bottom: b.top + b.height + 1
			});
			const k = raster.dpi / 72;
			const gauche = Math.floor(c.box.left * k);
			const haut = Math.floor(c.box.top * k);
			const largeur = Math.ceil(c.box.right * k) - gauche;
			const hauteur = Math.ceil(c.box.bottom * k) - haut;
			return profilDe(
				(x, y) => {
					const i = ((haut + y) * raster.width + gauche + x) * 3;
					return isInk(raster.data[i], raster.data[i + 1], raster.data[i + 2]);
				},
				largeur,
				hauteur
			);
		};
		const z = profilPdf('𝑧');
		const zGras = profilPdf('𝒛');
		const deux = profilPdf('2');
		expectZACoins(z, 'z (formule)');
		expectZACoins(zGras, 'z gras (\\mathbf{z})');
		// Le 2, lui, a un haut arrondi : sa barre du haut n'est pas pleine, il garde son milieu chargé
		expect(deux.barreHaute, '2 : le haut est arrondi, pas une barre').toBeLessThan(0.85);

		// Le reste de la formule ne change pas : « Voici : », « puis », le point, et le 2 est un 2
		const texte = pdfText(pdf).join('\n').replace(/\s+/g, ' ');
		expect(texte).toContain('Voici :');
		expect(texte).toContain('puis');

		// Une capture agrandie des trois glyphes (800 dpi) pour la relecture de David
		mkdirSync(SHOTS, { recursive: true });
		const { left, top } = boite('Voici : ');
		const k = 800 / 72;
		execFileSync('pdftoppm', [
			'-png',
			'-singlefile',
			'-r',
			'800',
			'-f',
			'1',
			'-l',
			'1',
			'-x',
			String(Math.floor((left - 2) * k)),
			'-y',
			String(Math.floor((top - 4) * k)),
			'-W',
			String(Math.ceil(110 * k)),
			'-H',
			String(Math.ceil(22 * k)),
			pdf,
			resolve(SHOTS, 'z-corrige-agrandi')
		]);
	});

	test('#2596 — /dev/polices (Chiphre Math) : le même z dans MathLive, à coins, et le 2 reste un 2', async ({
		page
	}) => {
		await login(page, ADMIN.email, ADMIN.password);
		await gotoSettled(page, '/dev/polices');
		await expect(page.getByText('Police active:')).toContainText('Chiphre Math');
		const champ = page.locator('math-field').first();
		await expect(champ).toBeVisible({ timeout: 30_000 });
		// Un champ en lecture seule, très grand, avec trois glyphes à mesurer l'un après l'autre
		const glyphes = [
			['z', 'z'],
			['z gras', '\\mathbf{z}'],
			['deux', '2']
		] as const;
		const profils: Record<string, Profil> = {};
		await page.addStyleTag({
			content:
				'math-field::part(virtual-keyboard-toggle), math-field::part(menu-toggle) { display: none !important; }'
		});
		for (const [nom, latex] of glyphes) {
			await champ.evaluate((el, valeur) => {
				const field = el as HTMLElement & { setValue: (v: string) => void; readOnly: boolean };
				field.readOnly = true;
				field.setValue(valeur);
				field.style.setProperty('font-size', '10rem', 'important');
				field.style.background = 'white';
				field.style.color = 'black';
			}, latex);
			await champ.scrollIntoViewIfNeeded();
			const png = await champ.screenshot();
			await mkdir(SHOTS, { recursive: true });
			await writeFile(`${SHOTS}/z-mathlive-${nom.replace(' ', '-')}-${projectName()}.png`, png);
			const { data, info } = await sharp(png)
				.greyscale()
				.raw()
				.toBuffer({ resolveWithObject: true });
			profils[nom] = profilDe((x, y) => data[y * info.width + x] < 128, info.width, info.height);
		}
		expectZACoins(profils['z'], 'z dans MathLive');
		expectZACoins(profils['z gras'], 'z gras dans MathLive');
		expect(profils['deux'].barreHaute, '2 : le haut est arrondi, pas une barre').toBeLessThan(0.85);
	});
});

// ============================================================================
// #2575 — routes admin en mode administration (prof élevé)
// ============================================================================

/** Efface les compteurs de l'élévation (5 par adresse, 3 par compte, non levés en local) */
const effacerLimitesElevation = (): Promise<unknown[]> =>
	sql(
		`delete from public.rate_limits where key = 'ratelimit:elevate:email:admin@local.test' or key like 'ratelimit:elevate:ip:%'`
	);

/** Les modèles et les erreurs de CE worker : effacés par le préfixe de leur titre / message */
async function effacerModelesEtErreurs(): Promise<void> {
	await sql(`delete from public.question_templates where title like $1`, [`${workerPrefix()} %`]);
	await sql(`delete from public.error_logs where message like $1`, [`${workerPrefix()} %`]);
	// Les occurrences regroupées (ce que liste la page) sont alimentées par la base, pas effacées avec les journaux
	await sql(`delete from public.error_occurrences where message like $1`, [`${workerPrefix()} %`]);
}

/** Un brouillon créé par l'API des modèles, au nom de l'admin (le prof n'a pas encore le droit) */
async function creerBrouillon(browser: Browser, titre: string): Promise<string> {
	const contexte = await browser.newContext();
	try {
		const admin = await contexte.newPage();
		await login(admin, ADMIN.email, ADMIN.password);
		const reponse = await admin.request.post('/api/questions/templates', {
			data: {
				type: 'fill_in_blanks',
				title: `${workerPrefix()} ${titre}`,
				grades: ['T_SPE'],
				level: 2,
				status: 'draft',
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
		const corps = (await reponse.json()) as { template?: { id: string } };
		expect(reponse.status(), JSON.stringify(corps)).toBe(201);
		return corps.template?.id ?? '';
	} finally {
		await contexte.close();
	}
}

/** Le prof local se connecte puis passe en mode administration (mot de passe de l'admin local) */
async function elever(page: Page, cible: string): Promise<void> {
	await login(page, TEACHER.email, TEACHER.password);
	await page.goto(cible);
	await page.waitForURL(/\/dashboard\/elevate/);
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="password"]').fill(ADMIN.password);
	await page.locator('button[type="submit"]').click();
	await page.waitForURL((url) => url.pathname === new URL(cible, 'http://x').pathname);
	await page.waitForLoadState('networkidle');
}

test.describe('#2575 — routes admin en mode administration', () => {
	test.describe.configure({ mode: 'serial' });
	test.beforeEach(async () => {
		await effacerLimitesElevation();
		await effacerModelesEtErreurs();
	});
	test.afterAll(async () => {
		await effacerLimitesElevation();
		await effacerModelesEtErreurs();
	});

	test('#2575 — sans mode administration : suppression, publication par lot et écriture sont refusés (403) et le modèle reste', async ({
		page,
		browser
	}) => {
		const id = await creerBrouillon(browser, 'refus');
		await login(page, TEACHER.email, TEACHER.password);
		const suppression = await page.request.delete(`/api/questions/templates/${id}`);
		expect(suppression.status(), 'DELETE sans mode administration').toBe(403);
		const lot = await page.request.post('/api/questions/templates/bulk-status', {
			data: { ids: [id], status: 'published' }
		});
		expect(lot.status(), 'publication par lot sans mode administration').toBe(403);
		const [ligne] = await sql<{ status: string }>(
			`select status from public.question_templates where id = $1`,
			[id]
		);
		expect(ligne?.status, 'le modèle est toujours là, en brouillon').toBe('draft');
		// La page elle-même mène à l'écran d'élévation
		await page.goto('/dashboard/admin/questions');
		await page.waitForURL(/\/dashboard\/elevate/);
	});

	test('#2575 — mode administration : « Supprimer » un brouillon → « Modèle supprimé avec succès », le brouillon disparaît, le publié du même titre reste', async ({
		page,
		browser
	}) => {
		const brouillon = await creerBrouillon(browser, 'doublon');
		const publie = await creerBrouillon(browser, 'doublon');
		await sql(`update public.question_templates set status = 'published' where id = $1`, [publie]);
		await elever(page, '/dashboard/admin/questions');
		await page
			.getByRole('textbox', { name: /Rechercher un modèle/ })
			.fill(`${workerPrefix()} doublon`);
		await page.getByRole('tab', { name: 'Brouillons' }).click();
		await expect(page.getByText('1 brouillon', { exact: true })).toBeVisible();
		const ligne = page.getByRole('row', { name: new RegExp(`${workerPrefix()} doublon`) });
		await expect(ligne).toHaveCount(1);
		await ligne.getByTitle('Supprimer').click();
		await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
		await expect(page.getByText('Modèle supprimé avec succès')).toBeVisible();
		const restant = await sql<{ id: string; status: string }>(
			`select id::text, status from public.question_templates where id = any($1::uuid[])`,
			[[brouillon, publie]]
		);
		expect(restant, 'seul le publié reste').toEqual([{ id: publie, status: 'published' }]);
		await expect(ligne).toHaveCount(0);
	});

	test('#2575 — mode administration : modifier puis enregistrer un brouillon (plus de 403)', async ({
		page,
		browser
	}) => {
		const id = await creerBrouillon(browser, 'modif');
		await elever(page, `/dashboard/admin/questions/${id}/edit`);
		const titre = page.getByRole('textbox', { name: /^Titre/ }).first();
		await expect(titre).toHaveValue(`${workerPrefix()} modif`, { timeout: 30_000 });
		await titre.fill(`${workerPrefix()} modif enregistre`);
		await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
		await expect(page.getByText('Question mise à jour avec succès')).toBeVisible();
		await expect
			.poll(async () => {
				const [ligne] = await sql<{ title: string }>(
					`select title from public.question_templates where id = $1`,
					[id]
				);
				return ligne?.title;
			})
			.toBe(`${workerPrefix()} modif enregistre`);
	});

	test('#2575 — mode administration : publier des brouillons par lot (plus de 403)', async ({
		page,
		browser
	}) => {
		const a = await creerBrouillon(browser, 'lot a');
		const b = await creerBrouillon(browser, 'lot b');
		await elever(page, '/dashboard/admin/questions');
		await page.getByRole('textbox', { name: /Rechercher un modèle/ }).fill(`${workerPrefix()} lot`);
		await page.getByRole('tab', { name: 'Brouillons' }).click();
		await expect(page.getByText('2 brouillons', { exact: true })).toBeVisible();
		await page.getByRole('checkbox', { name: 'Tout cocher (filtrés)' }).click();
		const publier = page.getByRole('button', { name: 'Publier la sélection (2)' });
		await expect(publier).toBeEnabled();
		const reponse = page.waitForResponse(
			(r) =>
				r.url().includes('/api/questions/templates/bulk-status') && r.request().method() === 'POST'
		);
		await publier.click();
		const lot = await reponse;
		expect(lot.status(), 'POST bulk-status en mode administration').toBe(200);
		const compte = (await lot.json()) as { published: unknown[]; refused: unknown[] };
		expect(compte.published, 'les deux sont publiés').toHaveLength(2);
		expect(compte.refused).toEqual([]);
		await expect(page.getByText('2 modèles publiés')).toBeVisible();
		const lignes = await sql<{ status: string }>(
			`select status from public.question_templates where id = any($1::uuid[])`,
			[[a, b]]
		);
		expect(lignes).toEqual([{ status: 'published' }, { status: 'published' }]);
	});

	test('#2575 — mode administration : /dashboard/admin/errors, « Marquer tous comme résolus » en lot fonctionne', async ({
		page
	}) => {
		for (const suffixe of ['a', 'b']) {
			await sql(
				`insert into public.error_logs (error_type, severity, message, url, error_signature)
				 values ('client_js', 'error', $1, '/verifs7', $2)`,
				[`${workerPrefix()} erreur ${suffixe}`, `verifs7-${workerPrefix()}-${suffixe}`]
			);
		}
		await elever(page, '/dashboard/admin/errors');
		await page.getByLabel('Recherche').fill(`${workerPrefix()} erreur`);
		await page.getByRole('button', { name: 'Appliquer', exact: true }).click();
		await page.waitForURL(/search=/);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('.skeleton')).toHaveCount(0);
		const marquer = page.getByRole('button', { name: 'Marquer tous comme résolus' });
		await expect(marquer).toBeEnabled();
		await marquer.click();
		await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
		await expect(page.getByText(/erreurs? résolues? avec succès/)).toBeVisible();
		const lignes = await sql<{ resolved: boolean }>(
			`select resolved from public.error_logs where message like $1`,
			[`${workerPrefix()} erreur %`]
		);
		expect(lignes).toEqual([{ resolved: true }, { resolved: true }]);
	});
});

// ============================================================================
// #2577 — listes déroulantes (bits-ui) : ouvrir, choisir, clavier, téléphone
// ============================================================================

const tactile = (): boolean => test.info().project.use.hasTouch === true;

/** Un toucher (doigt) ou un clic (souris) sur le lieu */
async function appuyer(lieu: Locator): Promise<void> {
	await lieu.scrollIntoViewIfNeeded();
	if (tactile()) await lieu.tap();
	else await lieu.click();
}

/** Le texte lu d'un lieu, espaces réduits */
const texteDe = async (lieu: Locator): Promise<string> =>
	((await lieu.innerText()) ?? '').replace(/\s+/g, ' ').replace('✓', '').trim();

/**
 * Une liste qui s'ouvre, propose plusieurs choix, en prend un autre que le courant et se referme :
 * le déclencheur montre alors le choix, et son nom de lecteur d'écran (`aria-label`) le dit si la
 * liste en donne un qui contient la valeur. Rend le libellé choisi.
 */
async function choisirAutreOption(page: Page, declencheur: Locator): Promise<string> {
	await expect(declencheur).toBeVisible();
	await expect(declencheur).toHaveAttribute('aria-expanded', 'false');
	await appuyer(declencheur);
	await expect(declencheur).toHaveAttribute('aria-expanded', 'true');
	// Dans la liste ouverte seulement (la page peut porter des <select> natifs et leurs <option>)
	const options = page.getByRole('listbox').getByRole('option');
	await expect(options.first()).toBeVisible();
	expect(await options.count(), 'plusieurs choix proposés').toBeGreaterThanOrEqual(2);
	const libelles = await options.evaluateAll((els) =>
		els.map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').replace('✓', '').trim())
	);
	const courant = await options.evaluateAll((els) =>
		els.findIndex((el) => el.getAttribute('aria-selected') === 'true')
	);
	const index = courant === 0 ? 1 : 0;
	await appuyer(options.nth(index));
	await expect(page.getByRole('listbox')).toHaveCount(0);
	await expect(declencheur).toHaveAttribute('aria-expanded', 'false');
	expect(await texteDe(declencheur), 'le déclencheur montre le choix').toContain(libelles[index]);
	return libelles[index];
}

/** Au clavier : Espace ouvre, flèche bas descend, Espace choisit ; Échap referme sans rien changer */
async function parcourirAuClavier(page: Page, declencheur: Locator): Promise<void> {
	const avant = await texteDe(declencheur);
	await declencheur.focus();
	await page.keyboard.press('Space');
	await expect(declencheur).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('listbox').getByRole('option').first()).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('listbox')).toHaveCount(0);
	expect(await texteDe(declencheur), 'Échap ne change rien').toBe(avant);
	// Espace, deux fois flèche bas, Espace : la liste a bougé de deux crans et choisi
	await declencheur.focus();
	await page.keyboard.press('Space');
	await expect(page.getByRole('listbox').getByRole('option').first()).toBeVisible();
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	const surligne = page.locator('[role="option"][data-highlighted]');
	await expect(surligne).toHaveCount(1);
	const voulu = await texteDe(surligne);
	await page.keyboard.press('Space');
	await expect(page.getByRole('listbox')).toHaveCount(0);
	expect(await texteDe(declencheur), 'le déclencheur montre l’option surlignée').toContain(voulu);
}

test.describe('#2577 — listes déroulantes', () => {
	// Le brouillon « listes » du test branche / notion part avec les fiches
	test.afterAll(async () => {
		await effacerFiches();
		await effacerModelesEtErreurs();
	});

	test('#2577 — glossaire : le filtre de niveau s’ouvre, choisit, se referme ; son nom de lecteur d’écran annonce le niveau choisi (attribut ARIA)', async ({
		page
	}) => {
		await gotoSettled(page, '/glossaire');
		const liste = page.getByText('Niveau :', { exact: true }).locator('..').getByRole('combobox');
		const choix = await choisirAutreOption(page, liste);
		// Le nom accessible du déclencheur porte la valeur choisie : c'est ce que dit le lecteur d'écran
		const nom = (await liste.getAttribute('aria-label')) ?? (await texteDe(liste));
		expect(nom).toContain(choix);
		await expectNoHorizontalOverflow(page, 'glossaire');
	});

	test('#2577 — catalogue Automaths : le filtre de niveau s’ouvre, choisit, se referme, et son nom ARIA annonce le niveau', async ({
		page
	}) => {
		await gotoSettled(page, '/automaths');
		const liste = page.getByRole('combobox', { name: /^Niveau :/ });
		const choix = await choisirAutreOption(page, liste);
		// Le nom ARIA du déclencheur est « Niveau : <niveau choisi> »
		expect(await liste.getAttribute('aria-label')).toMatch(/^Niveau : /);
		expect(await liste.getAttribute('aria-label')).toContain(choix.replace(/\s+/g, ' '));
	});

	test('#2577 — au clavier : Espace ouvre, flèches et Espace choisissent, Échap referme (glossaire)', async ({
		page
	}) => {
		test.skip(tactile(), 'clavier : sans objet au téléphone');
		await gotoSettled(page, '/glossaire');
		const liste = page.getByText('Niveau :', { exact: true }).locator('..').getByRole('combobox');
		await parcourirAuClavier(page, liste);
	});

	test('#2577 — branche puis notion d’un modèle : les deux listes s’ouvrent et choisissent (page d’édition, admin)', async ({
		page,
		browser
	}) => {
		const id = await creerBrouillon(browser, 'listes');
		await login(page, ADMIN.email, ADMIN.password);
		await gotoSettled(page, `/dashboard/admin/questions/${id}/edit`);
		const branche = page.getByRole('combobox', { name: /^Branche/ });
		await expect(branche).toBeVisible({ timeout: 30_000 });
		await choisirAutreOption(page, branche);
		const notion = page.getByRole('combobox', { name: /^Notion/ });
		await expect(notion).toBeEnabled();
		await choisirAutreOption(page, notion);
		await expectNoHorizontalOverflow(page, 'édition d’un modèle');
	});

	test('#2577 — style d’une fiche (création d’une fiche) : la liste s’ouvre, choisit, se referme', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/dashboard/teacher/contenu/worksheets/new');
		const style = page.getByRole('combobox', { name: 'Choisir le style' }).first();
		await expect(style).toBeVisible({ timeout: 30_000 });
		await choisirAutreOption(page, style);
		await expectNoHorizontalOverflow(page, 'nouvelle fiche');
	});

	test('#2577 — forme d’un lien de série (« Ajouter une série » d’un modèle de chapitre) : Flash-cards / Contrôle blanc', async ({
		page
	}) => {
		const [modele] = await sql<{ id: string }>(
			`select id::text from public.chapter_templates where created_by = $1 order by created_at limit 1`,
			[TEACHER_ID]
		);
		expect(modele, 'un modèle de chapitre du prof local').toBeTruthy();
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, `/dashboard/teacher/contenu/templates/${modele.id}`);
		await page.getByRole('button', { name: 'Ajouter', exact: true }).first().click();
		await page.getByRole('menuitem', { name: 'Série' }).click();
		const boite = page.getByRole('dialog');
		const forme = boite.getByRole('combobox', { name: /^Forme/ });
		await expect(forme).toContainText('Flash-cards');
		const choix = await choisirAutreOption(page, forme);
		expect(choix).toBe('Contrôle blanc');
		// Rien n'est enregistré : la boîte est fermée sans « Ajouter »
		await boite.getByRole('button', { name: 'Annuler' }).click();
	});
});

// ============================================================================
// #2586 — compteur d'envois du consentement
// ============================================================================

const STUDENT_PASSWORD = 'local-eleve';

/** Un élève de 6e soumis au consentement, dans une classe de test, avec l'adresse de son parent */
async function creerEleveAConsentement(): Promise<{
	classe: string;
	eleveId: string;
	parent: string;
	nom: string;
}> {
	const slug = workerPrefix()
		.replace(/[^a-z0-9]/gi, '')
		.toLowerCase();
	const classe = `${workerPrefix()} classe consentement`;
	// Adresse neuve à chaque passage : les courriels capturés d'un passage précédent restent sur le disque
	const parent = `${slug}${Date.now().toString(36)}parent@local.test`;
	const email = `${slug}eleve@local.test`;
	const [c] = await sql<{ id: string }>(
		`insert into public.classes (name, join_code, is_active) values ($1, $2, true) returning id`,
		[classe, `V7${Math.random().toString(36).slice(2, 8).toUpperCase()}`]
	);
	const [u] = await sql<{ id: string }>(
		`insert into auth.users (
			instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
			raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
			confirmation_token, recovery_token, email_change, email_change_token_new,
			email_change_token_current, reauthentication_token, is_sso_user, is_anonymous
		) values (
			'00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
			$1, crypt($2, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
			'', '', '', '', '', '', false, false
		) returning id`,
		[email, STUDENT_PASSWORD]
	);
	await sql(
		`insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
		 values ($1, $2::uuid, $3::jsonb, 'email', now(), now(), now())`,
		[u.id, u.id, JSON.stringify({ sub: u.id, email, email_verified: true })]
	);
	const nom = `Verifsconsent${test.info().parallelIndex}`;
	await sql(
		`update public.profiles set status = 'approved', firstname = $2, lastname = 'Paquetsept',
		   grade = '6', consent_required = true, consent_granted_at = null, consent_grace_period_ends = null
		 where id = $1`,
		[u.id, nom]
	);
	await sql(
		`insert into public.class_members (class_id, student_id, status) values ($1, $2, 'active')`,
		[c.id, u.id]
	);
	await sql(
		`insert into public.parental_consents (student_id, parent_email, status, email_count) values ($1, $2, 'pending', 0)`,
		[u.id, parent]
	);
	return { classe, eleveId: u.id, parent, nom };
}

async function effacerConsentement(): Promise<void> {
	const slug = workerPrefix()
		.replace(/[^a-z0-9]/gi, '')
		.toLowerCase();
	await sql(
		`delete from public.parental_consents where student_id in (select id from public.profiles where email like $1)`,
		[`${slug}eleve@local.test`]
	);
	await sql(`delete from public.classes where name like $1`, [`${workerPrefix()} %`]);
	await sql(`delete from auth.users where email like $1`, [`${slug}eleve@local.test`]);
}

test.describe('#2586 — compteur d’envois du consentement', () => {
	test.describe.configure({ mode: 'serial' });
	test.beforeEach(effacerConsentement);
	test.afterAll(effacerConsentement);

	/** La ligne de l'élève sur la page des consentements, classe choisie */
	async function ouvrirLigne(page: Page, decor: { classe: string; nom: string; parent: string }) {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/dashboard/teacher/consent');
		await page.getByRole('tab', { name: new RegExp(decor.classe) }).click();
		return page
			.locator('div')
			.filter({ hasText: decor.nom })
			.filter({ hasText: decor.parent })
			.last();
	}

	const compteur = async (eleveId: string): Promise<number> =>
		(
			await sql<{ email_count: number }>(
				`select email_count from public.parental_consents where student_id = $1`,
				[eleveId]
			)
		)[0].email_count;

	test('#2586 — « Envoyer » à un parent : courriel reçu, compteur de l’élève + 1 ; double-clic rapide : un seul courriel, le bouton se désactive, pas de message (E71, tranché le 2026-11-24)', async ({
		page
	}) => {
		const decor = await creerEleveAConsentement();
		const ligne = await ouvrirLigne(page, decor);
		const bouton = ligne.getByRole('button', { name: /^Envoyer/ });
		await expect(bouton).toBeEnabled();
		await expect(ligne).not.toContainText('(1/5)');
		const envois: string[] = [];
		page.on('response', (r) => {
			if (r.url().includes('/api/consent/send-email')) envois.push(`${r.status()}`);
		});
		await bouton.dblclick();
		await expect(page.getByText('Email de consentement envoyé !')).toBeVisible();
		await waitForEmail(decor.parent, 1);
		await page.waitForTimeout(1500);
		// Un courriel, au parent, avec le nom de l'élève ; le compteur de l'élève passe de 0 à 1 et s'affiche
		const recus = await emailsTo(decor.parent);
		expect(recus, 'un seul courriel pour un double-clic').toHaveLength(1);
		expect(await emailText(recus[0])).toContain(decor.nom);
		expect(await compteur(decor.eleveId), 'email_count').toBe(1);
		await expect(ligne.getByRole('button', { name: /Renvoyer/ })).toContainText('(1/5)');
		// Le double-clic n'a produit qu'UNE requête : le bouton est désactivé (« Envoi… ») avant le
		// second clic, qui est donc avalé. Le message « Un envoi est déjà en cours » ne s'affiche pas.
		expect(envois, 'requêtes d’envoi partantes').toEqual(['200']);
		await expect(page.getByText(/Un envoi est déjà en cours/)).toHaveCount(0);
		await page.screenshot({ path: `${SHOTS}/2586-${projectName()}.png` });
	});

	test('#2586 — deux requêtes qui se croisent (deux clics dans le même instant) : un seul courriel part, la seconde affiche « Un envoi est déjà en cours… », le compteur ne monte que d’un', async ({
		page
	}) => {
		const decor = await creerEleveAConsentement();
		const ligne = await ouvrirLigne(page, decor);
		const bouton = ligne.getByRole('button', { name: /^Envoyer/ });
		const reponses: number[] = [];
		page.on('response', (r) => {
			if (r.url().includes('/api/consent/send-email')) reponses.push(r.status());
		});
		// Deux clics dans le même tour d'événements : le bouton n'a pas encore eu le temps de se désactiver
		await bouton.evaluate((el) => {
			(el as HTMLButtonElement).click();
			(el as HTMLButtonElement).click();
		});
		await expect(page.getByText(/Un envoi est déjà en cours/)).toBeVisible();
		await expect(page.getByText('Email de consentement envoyé !')).toBeVisible();
		await waitForEmail(decor.parent, 1);
		await page.waitForTimeout(1000);
		expect([...reponses].sort()).toEqual([200, 409]);
		expect(await emailsTo(decor.parent), 'un seul courriel').toHaveLength(1);
		expect(await compteur(decor.eleveId), 'email_count').toBe(1);
	});
});

// ============================================================================
// #2581, #2582 — aperçu PDF d'une fiche : langue d'impression, « Tout télécharger (.zip) », « Lot »
// ============================================================================

const FICHES_PDF = resolve('.captures/verifs/fiches/pdf');

/** Une fiche en partie traduite : l'exercice A a sa version anglaise, le B reste en français */
async function ficheEnPartieTraduite(): Promise<{ id: string; titre: string; fichier: string }> {
	await effacerFiches();
	const a = await exercice(
		`${workerPrefix()} exercice A`,
		'Trouve le double de {{n}}. Réponse : [_]',
		'Le double de {{n}} est {{d}}.',
		{
			statement_md: 'Find the double of {{n}}. Answer: [_]',
			solution_md: 'The double of {{n}} is {{d}}.'
		},
		[
			{ name: 'n', expression: '{{101..999}}' },
			{ name: 'd', expression: '{{eval:2*n}}' }
		]
	);
	const b = await exercice(
		`${workerPrefix()} exercice B`,
		'Écris la moitié de dix.',
		'La moitié de dix est cinq.'
	);
	const titre = `${workerPrefix()} Fiche traduite`;
	const id = await createWorksheet({
		title: titre,
		styleId: STYLE_IDS.standard,
		exercises: [{ exercise: a }, { exercise: b }]
	});
	return { id, titre, fichier: titre.replace(/ /g, '_') };
}

test.describe('#2581, #2582 — aperçu PDF d’une fiche (langue d’impression, zip, lot)', () => {
	test.skip(() => projectName() !== 'ordi-chrome', 'PDF : même fichier quel que soit l’écran');
	test.afterAll(effacerFiches);

	test('#2581, #2582 — « English » dans « Langue d’impression » : l’aperçu passe en anglais, l’avertissement des exercices non traduits apparaît, « Telecharger » propose Titre_EN.pdf ; la fiche reste en français pour ses élèves', async ({
		page
	}) => {
		const fiche = await ficheEnPartieTraduite();
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, `/dashboard/teacher/contenu/worksheets/${fiche.id}`);
		await page.getByRole('tab', { name: 'PDF' }).click();
		// En français d'abord : pas d'avertissement, le PDF porte le nom du titre
		await expect(page.getByText(/sortira? en français/)).toHaveCount(0);
		const francais = await savePdf(page, 'Telecharger', 'pages7-fiche-fr.pdf');
		expect(suggestedNames.get(francais)).toBe(`${fiche.fichier}.pdf`);
		const textFr = pdfText(francais).join('\n');
		const valeurFr = /double de (\d{3})/.exec(textFr)?.[1];
		expect(valeurFr, 'la valeur tirée, en français').toBeDefined();

		// « English » : l'avertissement, puis un PDF en anglais, aux mêmes valeurs, nommé Titre_EN.pdf
		const avant = await page
			.locator('svg')
			.evaluateAll((els) => els.map((e) => e.outerHTML.length).join());
		await chooseOption(page, "Langue d'impression", 'English');
		await expect(page.getByText('1 exercice sortira en français')).toBeVisible();
		await expect(page.getByText('1 exercice sortira en français').locator('..')).toContainText(
			`${workerPrefix()} exercice B`
		);
		await expect(page.getByRole('button', { name: 'Telecharger' })).toBeEnabled({
			timeout: 90_000
		});
		const apres = await page
			.locator('svg')
			.evaluateAll((els) => els.map((e) => e.outerHTML.length).join());
		expect(apres, 'l’aperçu a été refait').not.toBe(avant);
		const anglais = await savePdf(page, 'Telecharger', 'pages7-fiche-en.pdf');
		expect(suggestedNames.get(anglais), 'nom du PDF anglais').toBe(`${fiche.fichier}_EN.pdf`);
		const textEn = pdfText(anglais).join('\n');
		expect(textEn).toContain('Find the double of');
		expect(textEn, 'valeurs identiques à la version française').toContain(`double of ${valeurFr}`);
		expect(textEn, 'l’exercice non traduit reste en français').toContain('Écris la moitié de dix');
		expect(textEn).not.toContain('Trouve le double');
		pdfToPng(anglais, 'pages7-fiche-en', 70);

		// La fiche reste en français pour ses élèves : rien n'est enregistré
		const [ligne] = await sql<{ language: string | null }>(
			`select config->>'language' as language from public.worksheets where id = $1`,
			[fiche.id]
		);
		expect(ligne.language ?? 'fr').toBe('fr');
		await page.reload();
		await page.waitForLoadState('networkidle');
		await page.getByRole('tab', { name: 'PDF' }).click();
		await expect(page.getByRole('combobox', { name: /^Langue d'impression/ })).toContainText(
			'Français'
		);
	});

	test('#2581, #2582 — « Tout télécharger (.zip) » : « PDF n / 8 » sur le bouton, réglages grisés, puis Titre.zip avec 8 PDF (fiche, réponses, corrigé, fiche et corrigé ; en français puis _EN) aux mêmes valeurs, et l’avertissement des exercices non traduits', async ({
		page
	}) => {
		test.setTimeout(420_000);
		const fiche = await ficheEnPartieTraduite();
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, `/dashboard/teacher/contenu/worksheets/${fiche.id}`);
		await page.getByRole('tab', { name: 'PDF' }).click();
		await expect(page.getByRole('button', { name: 'Telecharger' })).toBeEnabled({
			timeout: 90_000
		});
		const telechargement = page.waitForEvent('download', { timeout: 360_000 });
		await page.getByRole('button', { name: 'Tout télécharger (.zip)' }).click();
		// Le bouton compte les PDF, et les réglages sont grisés pendant le zip
		const progression = page.getByRole('button', { name: /^PDF \d \/ 8$/ });
		await expect(progression).toBeVisible();
		// Pendant tout le zip, on échantillonne : à un moment au moins, les trois réglages sont grisés
		// ensemble (le zip est court, l'échantillon peut en rater le début)
		let grises = 0;
		for (let i = 0; i < 200 && (await progression.count()) > 0; i++) {
			const etats = await Promise.all(
				['PDF à générer', 'Niveau à imprimer', "Langue d'impression"].map((nom) =>
					page
						.getByRole('combobox', { name: new RegExp(`^${nom}`) })
						.first()
						.isDisabled()
				)
			);
			if (etats.every(Boolean)) grises++;
			await page.waitForTimeout(40);
		}
		expect(grises, 'réglages grisés pendant le zip').toBeGreaterThan(0);
		const zipFichier = await telechargement;
		expect(zipFichier.suggestedFilename()).toBe(`${fiche.fichier}.zip`);
		mkdirSync(FICHES_PDF, { recursive: true });
		const chemin = resolve(FICHES_PDF, 'pages7-tout.zip');
		await zipFichier.saveAs(chemin);

		// Huit PDF : quatre formes, en français puis en anglais (_EN)
		const archive = await JSZip.loadAsync(readFileSync(chemin));
		const noms = Object.keys(archive.files).sort();
		const attendus = ['', ' - Réponses', ' - Corrigé', ' - Fiche et corrigé']
			.flatMap((forme) => [`${fiche.fichier}${forme}.pdf`, `${fiche.fichier}${forme}_EN.pdf`])
			.sort();
		expect(noms).toEqual(attendus);
		const texte = async (nom: string): Promise<string> => {
			const cible = resolve(FICHES_PDF, `pages7-zip-${nom.replace(/[^a-zA-Z0-9_.-]/g, '-')}`);
			writeFileSync(cible, await archive.files[nom].async('nodebuffer'));
			return pdfText(cible).join('\n');
		};

		// Aux mêmes valeurs : le nombre tiré est celui de toutes les formes, en français comme en anglais
		const fr = await texte(`${fiche.fichier}.pdf`);
		const en = await texte(`${fiche.fichier}_EN.pdf`);
		const valeur = /double de (\d{3})/.exec(fr)?.[1];
		expect(valeur, 'valeur tirée dans la fiche française').toBeDefined();
		expect(en).toContain(`double of ${valeur}`);
		for (const forme of [' - Corrigé', ' - Fiche et corrigé']) {
			expect(await texte(`${fiche.fichier}${forme}.pdf`), `corrigé FR${forme}`).toContain(
				`${2 * Number(valeur)}`
			);
			expect(await texte(`${fiche.fichier}${forme}_EN.pdf`), `corrigé EN${forme}`).toContain(
				`${2 * Number(valeur)}`
			);
		}

		// Les messages de fin : succès, et l'avertissement des exercices restés en français
		await expect(page.getByText('8 PDF téléchargés, en français et en anglais')).toBeVisible();
		await expect(
			page.getByText('Version anglaise : 1 exercice est resté en français, faute de traduction')
		).toBeVisible();
		await expect(progression).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Tout télécharger (.zip)' })).toBeEnabled();
	});

	test('#2581, #2582 — onglet « Lot » : la langue d’impression y est visible et les PDF par élève finissent en _EN en anglais', async ({
		page
	}) => {
		const fiche = await ficheEnPartieTraduite();
		// Les élèves du lot sont ceux des affectations de la fiche : deux élèves visés nommément
		await assignWorksheet(fiche.id, ['eleve01@local.test', 'eleve02@local.test']);
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, `/dashboard/teacher/contenu/worksheets/${fiche.id}`);
		await page.getByRole('tab', { name: 'PDF' }).click();
		await page.getByRole('tab', { name: 'Lot' }).click();
		await expect(page.getByText('2 eleves', { exact: true })).toBeVisible();
		await expect(page.getByText('Aucun eleve disponible')).toHaveCount(0);
		const langue = page.getByRole('combobox', { name: "Langue d'impression du lot", exact: true });
		await expect(langue).toBeVisible();
		await langue.click();
		await page.getByRole('option', { name: /^English( ✓)?$/ }).click();
		await expect(
			page.getByRole('tabpanel', { name: 'Lot' }).getByText('1 exercice sortira en français')
		).toBeVisible();

		const lot = page.getByRole('button', { name: 'Generer pour tous les eleves' });
		await expect(lot).toBeEnabled({ timeout: 90_000 });
		const telechargement = page.waitForEvent('download', { timeout: 240_000 });
		await lot.click();
		const zipFichier = await telechargement;
		expect(zipFichier.suggestedFilename()).toBe(`${fiche.fichier}_worksheet_EN.zip`);
		mkdirSync(FICHES_PDF, { recursive: true });
		const chemin = resolve(FICHES_PDF, 'pages7-lot.zip');
		await zipFichier.saveAs(chemin);
		const archive = await JSZip.loadAsync(readFileSync(chemin));
		const pdfs = Object.keys(archive.files).filter((nom) => nom.endsWith('.pdf'));
		expect(pdfs, 'un PDF par élève').toHaveLength(2);
		for (const nom of pdfs) expect(nom, 'PDF par élève en anglais').toMatch(/_EN\.pdf$/);
		// En anglais pour de bon : l'exercice traduit sort en anglais
		const cible = resolve(FICHES_PDF, 'pages7-lot-eleve.pdf');
		writeFileSync(cible, await archive.files[pdfs[0]].async('nodebuffer'));
		expect(pdfText(cible).join('\n')).toMatch(/double of \d{3}/);
	});

	test('#2581 — onglet « Lot » d’une fiche affectée à personne : « Aucun eleve disponible »', async ({
		page
	}) => {
		const fiche = await ficheEnPartieTraduite();
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, `/dashboard/teacher/contenu/worksheets/${fiche.id}`);
		await page.getByRole('tab', { name: 'PDF' }).click();
		await page.getByRole('tab', { name: 'Lot' }).click();
		await expect(page.getByText('Aucun eleve disponible')).toBeVisible();
	});
});
