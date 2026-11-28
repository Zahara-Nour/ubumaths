import { expect, test, type Page } from '@playwright/test';
import {
	ADMIN,
	assertLocalServerEnv,
	login,
	sql,
	TEACHER,
	withFirstVersion
} from './helpers/carnet';
import {
	createWorksheet,
	pdfText,
	pdfToPng,
	STYLE_IDS,
	teacherPdf,
	TEACHER_ID
} from './helpers/fiches';
import {
	blocsPoses,
	chargerEtat,
	couleurRgb,
	estTactile,
	etatCalcul,
	etatTortue,
	glisser,
	glisserBloc,
	suivreBlockly,
	typesDeBlocs
} from './helpers/blockly';
import { brouillons, fence, isTouch, projectName } from './helpers/modele-brouillon';
import { components, isBlack, isInk, rasterPage, share } from './helpers/pdf-mesures';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';

/**
 * Blockly : la tortue publique, les questions tortue et programme de calcul (tri des vérifications manuelles, paquet 7)
 * ====================================================================================================================
 *
 * Reprend les lignes #2627 (Blockly exécute), #2632 (la tortue), #2634 / PR 3b / PR 3c (La Tortue
 * publique), PR 4b (question tortue) et PR 5b (question programme de calcul) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * `/dev/blockly` n'existe plus (commit 144e47da19, ADR 0039 : plus rien n'exécute le code généré
 * par Blockly) : les clauses de #2627 et de #2632 qui vivent encore sont rejouées sur `/tortue`,
 * les autres sont déclarées périmées par un test qui le prouve.
 *
 * Décor : les programmes sont posés par `chargerEtat` (module Blockly de la page, serveur de dev
 * seulement) ; un vrai glisser de bloc (souris, ou doigt sur Android) est joué dans chaque
 * groupe. Les modèles brouillons « Verifs7 blockly <projet> … » sont créés par l'API (admin) et
 * effacés après chaque test.
 *
 * Reste à David, PR 4b et PR 5b (relu contre leurs lignes) : la séance en tant qu'ÉLÈVE (les lignes disent
 * « compte prof puis élève » ; ici l'aperçu admin et la fiche prof seulement) ; le cadre rouge de la question
 * verrouillée après Valider (5b : l'aperçu retourne la carte sur la correction, la face question n'est plus
 * montée) ; l'impression papier du PDF (le fichier est lu, pas imprimé). Les programmes de « position / forme »
 * (4b) et « × 4 + 8 » (5b) sont posés par `chargerEtat`, non glissés : seul le glisser du test « en question »
 * est un vrai geste.
 *
 * Serveur de dev et base locale seulement.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(120_000));

// Constantes

const SHOTS = '.captures/verifs/out-blockly7';
const decor = brouillons('Verifs7 blockly', SHOTS);

/** Les traits du tracé de l'élève sur le quadrillage */
const TRACE = '[data-trace="eleve"] line';
/** Le message de fin ou d'erreur sous le quadrillage de `/tortue` */
const MESSAGE = 'p[role="status"]';

/** « répéter 4 fois (avancer de 5, tourner à gauche de 90) » */
const CARRE = 'répéter 4 [ avancer 5 ; tourner à gauche 90 ]';

// Fonctions

/** Ouvre `/tortue` (sans connexion), espace de blocs prêt */
async function ouvrirTortue(page: Page): Promise<void> {
	suivreBlockly(page);
	await gotoSettled(page, '/tortue');
	await expect(page.getByRole('application', { name: 'Espace de travail Blockly' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Lancer' })).toBeEnabled();
}

/** Sur téléphone, un panneau à la fois : montre le panneau voulu (sans effet sur ordinateur) */
async function montrerOnglet(page: Page, nom: 'Blocs' | 'Tortue'): Promise<void> {
	const onglet = page.getByRole('tab', { name: nom });
	// Les onglets n'existent qu'au téléphone (écran étroit = projets tactiles) : là ils DOIVENT être visibles
	if (isTouch()) {
		await expect(onglet).toBeVisible();
		await onglet.click();
	} else {
		await expect(onglet).toBeHidden();
	}
}

/** Les traits tracés pour l'instant (dans le DOM, même panneau masqué) */
const traits = (page: Page): Promise<number> => page.locator(TRACE).count();

// ============================================================================
// #2627 — « Blockly exécute enfin » : périmée pour /dev/blockly, reste vivant sur /tortue
// ============================================================================

test.describe('#2627 — Blockly exécute enfin', () => {
	test('#2627 — périmée : /dev/blockly n’existe plus (404, même pour l’admin) ; JavaScript, Python exécuté et boucle de 12 s sont retirés (ADR 0039)', async ({
		page
	}) => {
		await login(page, ADMIN.email, ADMIN.password);
		const reponse = await page.goto('/dev/blockly');
		expect(reponse?.status(), '/dev/blockly').toBe(404);
		await expect(page.getByText('Exécuter', { exact: true })).toHaveCount(0);
	});

	test('#2627 — ce qui vit encore sur /tortue : blocs en français, corbeille et zoom affichés, aucune requête vers unpkg', async ({
		page
	}) => {
		const demandes: string[] = [];
		page.on('request', (requete) => demandes.push(requete.url()));
		await ouvrirTortue(page);
		await montrerOnglet(page, 'Blocs');

		// Blocs en français : la boîte à outils et « répéter … fois »
		const categories = page.locator('.blocklyToolboxCategory');
		await expect(categories).toHaveCount(3);
		await glisserBloc(page, 'Boucles', 'répéter', { x: 300, y: 400 });
		await expect(blocsPoses(page).first()).toContainText(/répéter\s*4\s*fois/);

		// Corbeille et zoom : affichés, et d'une taille utile
		for (const [nom, lieu] of [
			['zoom avant', page.locator('.blocklyZoom image, .blocklyZoomIn').first()],
			['corbeille', page.locator('.blocklyTrash').first()]
		] as const) {
			await expect(lieu, nom).toBeVisible();
			const boite = await lieu.boundingBox();
			expect(boite?.width ?? 0, `${nom} : largeur`).toBeGreaterThan(10);
			expect(boite?.height ?? 0, `${nom} : hauteur`).toBeGreaterThan(10);
		}

		// Les images de Blockly (corbeille, zoom) viennent de Chiphre, jamais d'un CDN
		await page.waitForLoadState('networkidle');
		expect(
			demandes.filter((adresse) => /unpkg\.com/.test(adresse)),
			'requêtes vers unpkg'
		).toEqual([]);
		const origine = new URL(page.url()).origin;
		const blockly = demandes.filter((adresse) => /blockly/i.test(adresse));
		expect(blockly.length, 'des fichiers Blockly ont été demandés').toBeGreaterThan(0);
		for (const adresse of blockly) {
			expect(adresse.startsWith(origine), `ressource Blockly servie par Chiphre : ${adresse}`).toBe(
				true
			);
		}
	});
});

// ============================================================================
// #2632 — la tortue : les clauses du mode Tortue de /dev/blockly, sur /tortue
// ============================================================================

test.describe('#2632 — la tortue', () => {
	test('#2632 — boîte à outils : catégories Tortue, Boucles, Math seulement', async ({ page }) => {
		await ouvrirTortue(page);
		await montrerOnglet(page, 'Blocs');
		const noms = (await page.locator('.blocklyToolboxCategory').allInnerTexts()).map((nom) =>
			nom.trim()
		);
		expect(noms).toEqual(['Tortue', 'Boucles', 'Math']);
	});

	test('#2632 — « répéter 4 fois (avancer de 4, tourner à gauche de 90) » : un carré sur le quadrillage et « Tracé terminé : 4 segments. »', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await chargerEtat(page, etatTortue('répéter 4 [ avancer 4 ; tourner à gauche 90 ]'));
		await page.getByRole('button', { name: 'Lancer' }).click();
		await page.getByRole('button', { name: 'Tout de suite' }).click();
		await expect(page.locator(MESSAGE)).toHaveText('Tracé terminé : 4 segments.');
		// Un carré de côté 4 : 4 traits, 2 horizontaux et 2 verticaux, de longueur 4
		const traitsCarre = await page.locator(TRACE).evaluateAll((lignes) =>
			lignes.map((ligne) => {
				const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((a) => Number(ligne.getAttribute(a)));
				return { dx: Math.round(Math.abs(x2 - x1)), dy: Math.round(Math.abs(y2 - y1)) };
			})
		);
		expect(traitsCarre).toHaveLength(4);
		expect(traitsCarre.filter((t) => t.dx === 4 && t.dy === 0)).toHaveLength(2);
		expect(traitsCarre.filter((t) => t.dx === 0 && t.dy === 4)).toHaveLength(2);
		await expect(page.getByText('Le tracé sort du quadrillage')).toHaveCount(0);
	});

	test('#2632 — « avancer de 15 » : « Le tracé sort du quadrillage », ce qui dépasse est coupé', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await chargerEtat(page, etatTortue('avancer 15'));
		await page.getByRole('button', { name: 'Lancer' }).click();
		await page.getByRole('button', { name: 'Tout de suite' }).click();
		await expect(page.getByText('Le tracé sort du quadrillage')).toBeVisible();
		await expect(page.locator(MESSAGE)).toHaveText('Tracé terminé : 1 segment.');
	});

	test('#2632 — « répéter 100000 fois » : arrêt « après 10 000 pas », en rouge, programme refusé', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await chargerEtat(page, etatTortue('répéter 100000 [ avancer 0 ]'));
		await page.getByRole('button', { name: 'Lancer' }).click();
		// Le message n'apparaît qu'à la fin de l'animation : on saute à la fin
		const tout = page.getByRole('button', { name: 'Tout de suite' });
		// 10 000 pas à 16,7 ms : l'animation dure ~ 3 min, le bouton est actif à coup sûr
		await expect(tout).toBeEnabled();
		await tout.click();
		const message = page.locator(MESSAGE);
		await expect(message).toContainText(/arrêté après 10\s000 pas/);
		const couleur = await message.evaluate((el) => getComputedStyle(el).color);
		const ordinaire = await page.locator('h1').evaluate((el) => getComputedStyle(el).color);
		expect(couleur, 'le message d’erreur n’a pas la couleur du texte courant').not.toBe(ordinaire);
	});

	test('#2632 — périmée : « revenir en mode Programme » (message « Les blocs tortue s’exécutent en mode Tortue. ») : plus de mode, /tortue n’a que le bac à sable de la tortue', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await expect(page.getByRole('button', { name: /^Programme$/ })).toHaveCount(0);
		await expect(page.getByText('Les blocs tortue s’exécutent en mode Tortue.')).toHaveCount(0);
	});
});

// ============================================================================
// #2634, PR 3b, PR 3c — La Tortue publique, sans connexion
// ============================================================================

test.describe('#2634 — La Tortue publique', () => {
	test('#2634 — lien « La Tortue » du menu (sans connexion) → /tortue ; le titre et les blocs sont visibles, pas une zone vide', async ({
		page
	}) => {
		await gotoSettled(page, '/');
		if (estTactile()) {
			await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
			await page.getByRole('dialog').getByRole('link', { name: 'La Tortue' }).click();
		} else {
			await page.getByRole('link', { name: 'La Tortue' }).first().click();
		}
		await expect(page).toHaveURL(/\/tortue$/);
		await expect(page.getByRole('heading', { name: 'La Tortue', level: 1 })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Lancer' })).toBeEnabled();

		// Les blocs : l'espace de travail a une taille utile et sa boîte à outils est lisible
		await montrerOnglet(page, 'Blocs');
		const espace = page.getByRole('application', { name: 'Espace de travail Blockly' });
		const boite = await espace.boundingBox();
		expect(boite?.height ?? 0, 'hauteur de l’espace de blocs').toBeGreaterThan(300);
		expect(boite?.width ?? 0, 'largeur de l’espace de blocs').toBeGreaterThan(250);
		await expect(page.locator('.blocklyToolboxCategory')).toHaveCount(3);
		for (const nom of ['Tortue', 'Boucles', 'Math']) {
			await expect(page.locator('.blocklyToolboxCategory').filter({ hasText: nom })).toBeVisible();
		}
		// Le dessin Blockly remplit l'espace (une zone vide aurait une taille nulle)
		const svg = await page.locator('svg.blocklySvg').first().boundingBox();
		expect(svg?.height ?? 0, 'hauteur du dessin Blockly').toBeGreaterThan(300);
		await expectNoHorizontalOverflow(page, '/tortue');
	});

	test('#2634 — téléphone : onglets Blocs / Tortue, « Lancer » bascule sur Tortue, pause de la tortue au départ puis tracé, retour à Blocs avec le programme intact ; ordinateur : deux panneaux côte à côte, sans onglets', async ({
		page
	}) => {
		await ouvrirTortue(page);
		const quadrillage = page.getByRole('img', { name: /Tracé de la tortue/ });
		const espace = page.getByRole('application', { name: 'Espace de travail Blockly' });
		await chargerEtat(page, etatTortue(CARRE));

		if (!estTactile()) {
			await expect(page.getByRole('tablist')).toHaveCount(0);
			await expect(espace).toBeVisible();
			await expect(quadrillage).toBeVisible();
			const [a, b] = await Promise.all([espace.boundingBox(), quadrillage.boundingBox()]);
			expect(b?.x ?? 0, 'le quadrillage est à droite des blocs').toBeGreaterThan(
				(a?.x ?? 0) + (a?.width ?? 0) - 1
			);
			return;
		}

		// Au départ : onglet Blocs, quadrillage masqué
		await expect(page.getByRole('tab', { name: 'Blocs' })).toHaveAttribute('aria-selected', 'true');
		await expect(espace).toBeVisible();
		await expect(quadrillage).toBeHidden();

		// « Lancer » : on passe à Tortue ; au premier instant la tortue est au départ, rien n'est tracé
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect(page.getByRole('tab', { name: 'Tortue' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(quadrillage).toBeVisible();
		await expect(espace).toBeHidden();
		expect(await traits(page), 'pause au départ : rien de tracé').toBe(0);
		await expect(page.locator('#panneau-tortue polygon')).toBeVisible();
		await page.waitForTimeout(250);
		expect(await traits(page), 'toujours en pause à 250 ms').toBe(0);
		// Puis le tracé commence
		await expect.poll(() => traits(page), { timeout: 5000 }).toBeGreaterThan(0);

		// Retour à Blocs : le programme est intact (les mêmes blocs, visibles)
		await page.getByRole('tab', { name: 'Blocs' }).click();
		await expect(espace).toBeVisible();
		expect(await typesDeBlocs(page)).toEqual(
			expect.arrayContaining(['controls_repeat', 'tortue_avancer', 'tortue_gauche'])
		);
		await expect(blocsPoses(page).first()).toContainText(/répéter\s*4\s*fois/);
		const pile = await blocsPoses(page).first().boundingBox();
		expect(pile?.width ?? 0, 'la pile de blocs est dessinée').toBeGreaterThan(100);
	});

	test('#2634 — « répéter 4 fois (avancer de 5, tourner à gauche de 90) » → Lancer : le carré se dessine pas à pas, puis « Tracé terminé : 4 segments. »', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await chargerEtat(page, etatTortue(CARRE));
		await page.getByRole('button', { name: 'Lancer' }).click();
		// On échantillonne le tracé jusqu'au message de fin : 0 au départ, des étapes intermédiaires, puis 4
		const vus = new Set<number>();
		const fin = page.locator(MESSAGE);
		const debut = Date.now();
		while ((await fin.innerText()).trim() === '' && Date.now() - debut < 20_000) {
			vus.add(await traits(page));
			await page.waitForTimeout(60);
		}
		await expect(fin).toHaveText('Tracé terminé : 4 segments.');
		expect(await traits(page)).toBe(4);
		expect(vus.has(0), `le tracé part de rien (vus : ${[...vus]})`).toBe(true);
		expect(
			[1, 2, 3].filter((n) => vus.has(n)).length,
			`le carré se dessine pas à pas (vus : ${[...vus]})`
		).toBeGreaterThanOrEqual(2);
	});

	test('#2634 — « Tout de suite » saute à la fin', async ({ page }) => {
		await ouvrirTortue(page);
		await chargerEtat(page, etatTortue(CARRE));
		const tout = page.getByRole('button', { name: 'Tout de suite' });
		await expect(tout, 'rien à sauter avant de lancer').toBeDisabled();
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect(tout).toBeEnabled();
		expect(await traits(page), 'le carré n’est pas encore fini').toBeLessThan(4);
		await tout.click();
		await expect(page.locator(TRACE)).toHaveCount(4, { timeout: 1000 });
		await expect(page.locator(MESSAGE)).toHaveText('Tracé terminé : 4 segments.');
		await expect(tout, 'plus rien à sauter').toBeDisabled();
	});

	test('#2634 — déplacer un bloc (vrai geste) pendant l’animation arrête l’animation et vide le quadrillage', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await chargerEtat(page, etatTortue('répéter 36 [ avancer 1 ; tourner à gauche 10 ]'));
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect.poll(() => traits(page), { timeout: 5000 }).toBeGreaterThan(0);
		expect(await traits(page), 'animation en cours').toBeLessThan(36);

		// Sur téléphone, on repasse aux blocs : l'animation continue en coulisse
		await montrerOnglet(page, 'Blocs');
		const pile = blocsPoses(page).first();
		await expect(pile).toBeVisible();
		// Le panneau vient de réapparaître : Blockly se redimensionne ; un geste trop tôt part à côté
		await page.waitForTimeout(500);
		// Le doigt peut rater le bloc au premier essai : on rejoue le geste tant que le tracé n'est pas vidé
		for (let essai = 0; essai < 3 && (await traits(page)) > 0; essai++) {
			const boite = await pile.boundingBox();
			if (!boite) throw new Error('pile sans boîte');
			await glisser(
				page,
				{ x: boite.x + 8, y: boite.y + 12 },
				{ x: boite.x + 8 + 60, y: boite.y + 12 + 50 }
			);
			await page.waitForTimeout(400);
		}
		await expect.poll(() => traits(page), { timeout: 3000 }).toBe(0);
		// Elle ne repart pas toute seule
		await page.waitForTimeout(1200);
		expect(await traits(page)).toBe(0);
		await montrerOnglet(page, 'Tortue');
		await expect(page.locator(MESSAGE)).toHaveText('');
	});

	test('#2634 — « répéter 360 fois (avancer de 1, tourner à gauche de 1) » : animation d’environ 12 s, pas plus (~15,5 s sous le WebKit de Playwright : E72, tranché le 2026-11-24)', async ({
		page
	}) => {
		test.setTimeout(180_000);
		await ouvrirTortue(page);
		await chargerEtat(page, etatTortue('répéter 360 [ avancer 1 ; tourner à gauche 1 ]'));
		const debut = Date.now();
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect(page.locator(MESSAGE)).toHaveText(/Tracé terminé : 360 segments\./, {
			timeout: 30_000
		});
		const secondes = (Date.now() - debut) / 1000;
		// 12 s d'animation + 0,6 s de pause au départ ; la marge couvre la charge du serveur partagé.
		// ⚠️ Un serveur de dev chargé (autres agents, builds) peut faire dériver ces durées : un rouge
		// ici se rejoue SEUL, serveur au calme, avant d'être cru.
		expect(secondes, `durée de l’animation : ${secondes} s`).toBeGreaterThan(10);
		// WebKit de Playwright (iPhone, Safari) : 720 étapes à 16,7 ms par `setInterval` (`rythmeAnimation`,
		// `TortueBacASable.lancer`) ; WebKit rend la main moins vite que 16,7 ms et l'animation dure ~15,5 s.
		// Chrome et Android : ~12,4 s. David, le 2026-11-24 : rien à corriger sur cette mesure ; le
		// chronométrage sur un vrai iPhone reste dans `docs/wip/verifications-manuelles.md` (#2634).
		const plafond = ['iphone', 'ordi-safari'].includes(projectName()) ? 18 : 14.5;
		expect(secondes, `durée de l’animation : ${secondes} s`).toBeLessThan(plafond);
	});

	test('#2634 — « Voir en Python » montre forward / left', async ({ page }) => {
		await ouvrirTortue(page);
		await chargerEtat(page, etatTortue(CARRE));
		await montrerOnglet(page, 'Tortue');
		await page.getByText('Voir en Python').click();
		const code = page.locator('details pre code');
		await expect(code).toContainText('forward(5)');
		await expect(code).toContainText('left(90)');
		await expect(code).toContainText('from turtle import *');
		await expect(code).toContainText(/for \w+ in range\(4\)/);
	});

	test('#2634 — vrai glisser d’un bloc depuis la boîte à outils, puis le champ de « répéter » refuse la virgule et le négatif', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await montrerOnglet(page, 'Blocs');
		const espace = await page
			.getByRole('application', { name: 'Espace de travail Blockly' })
			.boundingBox();
		if (!espace) throw new Error('espace sans boîte');
		// Un « répéter » glissé de la catégorie Boucles, puis un « avancer » glissé dans son « faire »
		await glisserBloc(page, 'Boucles', 'répéter', {
			x: espace.x + espace.width * 0.5,
			y: espace.y + 140
		});
		expect(await typesDeBlocs(page)).toEqual(['controls_repeat']);
		const boucle = await blocsPoses(page).first().boundingBox();
		if (!boucle) throw new Error('boucle sans boîte');
		await glisserBloc(page, 'Tortue', 'avancer', { x: boucle.x + 62, y: boucle.y + 44 });
		// Un seul tas : « avancer » est dans la boucle (sinon il serait posé à part)
		await expect(blocsPoses(page)).toHaveCount(1);
		expect(await typesDeBlocs(page)).toEqual(
			expect.arrayContaining(['controls_repeat', 'tortue_avancer'])
		);

		// Le champ du nombre de tours : on y écrit, au clavier
		const champ = blocsPoses(page)
			.first()
			.locator('.blocklyEditableField, .blocklyEditableText')
			.first();
		await expect(champ).toHaveText('4');
		const texteDuChamp = async (): Promise<string> =>
			((await champ.textContent()) ?? '').replace(/\s+/g, '');
		const ecrire = async (saisie: string): Promise<void> => {
			if (estTactile()) {
				// Au doigt, Blockly ouvre une boîte « Modifier la valeur : » avec Annuler / OK
				await champ.tap();
				const boite = page.locator('dialog.blocklyDialog');
				await expect(boite).toBeVisible();
				await boite.locator('input').fill(saisie);
				await boite.getByRole('button', { name: 'OK' }).tap();
				await expect(boite).toBeHidden();
				return;
			}
			await champ.click();
			const entree = page.locator('input.blocklyHtmlInput');
			await expect(entree).toBeVisible();
			await entree.press('ControlOrMeta+a');
			await entree.press('Backspace');
			await entree.pressSequentially(saisie);
			await entree.press('Enter');
			await expect(entree).toHaveCount(0);
		};
		await ecrire('3');
		await expect.poll(texteDuChamp).toBe('3');
		// Un négatif ne reste pas négatif
		await ecrire('-3');
		await expect.poll(texteDuChamp).toBe('0');
		// Une virgule ne fait pas de décimal : le champ ne garde qu'un entier
		await ecrire('2,5');
		await expect.poll(texteDuChamp).toMatch(/^\d+$/);
		expect(await texteDuChamp()).not.toContain(',');
	});
});

// ============================================================================
// PR 4b — Question tortue (modèle brouillon ```tortue)
// ============================================================================

const TORTUE_CARRE = ['attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]', 'montrer: oui'];

/** Un modèle brouillon (admin) dont l'énoncé est `enonce`, ouvert dans l'aperçu ; Blockly est suivi dès la connexion */
async function ouvrirApercu(
	page: Page,
	titre: string,
	enonce: string,
	extra: Record<string, unknown> = {},
	dejaConnecte = false
): Promise<string> {
	suivreBlockly(page);
	return decor.openPreview(page, titre, enonce, extra, dejaConnecte);
}

/** La carte de la question jouée dans l'aperçu admin : l'onglet actif (carte puis correction) */
const carte = (page: Page) => page.locator('[role="tabpanel"][data-state="active"]');

test.describe('PR 4b — Question tortue', () => {
	test('PR 4b — aperçu du modèle brouillon : quadrillage et carré gris, blocs chargés', async ({
		page
	}) => {
		await ouvrirApercu(
			page,
			`${test.info().parallelIndex} 4b apercu`,
			fence('tortue', ...TORTUE_CARRE)
		);
		const zone = carte(page);
		const modele = zone.locator('[data-trace="modele"]').first();
		await expect(modele).toBeAttached({ timeout: 30_000 });
		// Le carré à reproduire : 4 traits, en gris (couleur du texte atténué, translucide)
		await expect(modele.locator('line')).toHaveCount(4);
		const style = await modele.evaluate((el) => {
			const css = getComputedStyle(el);
			return { stroke: css.stroke, opacity: css.strokeOpacity };
		});
		expect(Number(style.opacity), 'trait translucide').toBeLessThan(1);
		const rgb = await couleurRgb(modele, 'stroke');
		expect(Math.max(...rgb) - Math.min(...rgb), 'un gris, pas une couleur').toBeLessThan(30);
		// L'élève n'a rien tracé ; les blocs sont chargés (espace de travail Blockly, boîte à outils)
		await expect(zone.locator('[data-trace="eleve"] line')).toHaveCount(0);
		await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
		await expect(zone.locator('.blocklyToolboxCategory')).toHaveCount(3);
		await expectNoHorizontalOverflow(page, 'aperçu de la question tortue');
	});

	test('PR 4b — en question : poser des blocs (vrai glisser), Lancer, Valider → faux : tracé rouge, carré attendu en pointillés ; copie corrigée « Ton programme » / « Un programme juste »', async ({
		page
	}) => {
		await ouvrirApercu(
			page,
			`${test.info().parallelIndex} 4b faux`,
			fence('tortue', ...TORTUE_CARRE)
		);
		const zone = carte(page);
		await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
		// Au téléphone, la carte montre un panneau à la fois : les blocs d'abord (onglets absents à l'ordinateur)
		const blocs = zone.getByRole('tab', { name: 'Blocs' });
		if (isTouch()) {
			await expect(blocs).toBeVisible();
			await blocs.click();
		} else {
			await expect(blocs).toBeHidden();
		}
		const espace = zone.getByRole('application', { name: 'Espace de travail Blockly' });
		await espace.scrollIntoViewIfNeeded();
		const boite = await espace.boundingBox();
		if (!boite) throw new Error('espace sans boîte');
		// Un vrai geste : « avancer » glissé de la boîte à outils (un trait, pas un carré)
		await glisserBloc(page, 'Tortue', 'avancer', {
			x: boite.x + boite.width * 0.6,
			y: boite.y + 120
		});
		expect(await typesDeBlocs(page)).toEqual(['tortue_avancer']);
		await zone.getByRole('button', { name: 'Lancer' }).click();
		await decor.validate(page);

		// La copie corrigée : l'élève a tracé 1 trait, en rouge ; le carré attendu est en pointillés
		const corrigee = page.locator('.correction-card-wrapper .flip-front');
		await expect(corrigee).toBeVisible({ timeout: 30_000 });
		await expect(corrigee).toContainText('Faux');
		const eleve = corrigee.locator('[data-trace="eleve"]');
		await expect(eleve).toHaveClass(/trace-faux/);
		await expect(eleve.locator('line')).toHaveCount(1);
		const [r, g, b] = await couleurRgb(eleve, 'stroke');
		expect(r, `tracé rouge : ${[r, g, b]}`).toBeGreaterThan(g + 60);
		expect(r, `tracé rouge : ${[r, g, b]}`).toBeGreaterThan(b + 40);
		const attendu = corrigee.locator('[data-trace="attendu"]');
		await expect(attendu.locator('line')).toHaveCount(4);
		expect(await attendu.getAttribute('stroke-dasharray'), 'carré en pointillés').toMatch(/\d/);
		await expect(corrigee.locator('[data-trace="modele"] line')).toHaveCount(4);

		// Les deux programmes, en texte
		const texte = ((await corrigee.innerText()) ?? '').replace(/\s+/g, ' ');
		expect(texte).toContain('Ton programme');
		expect(texte).toContain('avancer 1');
		expect(texte).toContain('Un programme juste');
		expect(texte).toContain('répéter 4 [ avancer 3 ; tourner à droite 90 ]');
		await corrigee.scrollIntoViewIfNeeded();
		await page.screenshot({ path: `${SHOTS}/4b-faux-${projectName()}.png` });
	});

	test('PR 4b — « répéter 4 (avancer 3, tourner à gauche 90) » : faux en position, juste avec comparer: forme (tracé vert)', async ({
		page
	}) => {
		const programme = etatTortue('répéter 4 [ avancer 3 ; tourner à gauche 90 ]');
		// Même carré, tourné d'un quart de tour : position → faux
		await ouvrirApercu(
			page,
			`${test.info().parallelIndex} 4b position`,
			fence('tortue', ...TORTUE_CARRE)
		);
		await expect(carte(page).locator('.blocklyToolboxCategory').first()).toBeVisible({
			timeout: 30_000
		});
		await chargerEtat(page, programme);
		await decor.validate(page);
		const faux = page.locator('.correction-card-wrapper .flip-front');
		await expect(faux).toContainText('Faux', { timeout: 30_000 });
		await expect(faux.locator('[data-trace="eleve"]')).toHaveClass(/trace-faux/);

		// Avec comparer: forme → juste, tracé vert
		await ouvrirApercu(
			page,
			`${test.info().parallelIndex} 4b forme`,
			fence('tortue', ...TORTUE_CARRE, 'comparer: forme'),
			{},
			true
		);
		await expect(carte(page).locator('.blocklyToolboxCategory').first()).toBeVisible({
			timeout: 30_000
		});
		await chargerEtat(page, programme);
		await decor.validate(page);
		const juste = page.locator('.correction-card-wrapper .flip-front');
		await expect(juste).toContainText('Juste', { timeout: 30_000 });
		await expect(juste).not.toContainText('Faux');
		await expect(juste.locator('[data-trace="eleve"]')).toHaveClass(/trace-juste/);
		const [r, g] = await couleurRgb(juste.locator('[data-trace="eleve"]'), 'stroke');
		expect(g, `tracé vert : ${[r, g]}`).toBeGreaterThan(r + 20);
		await page.screenshot({ path: `${SHOTS}/4b-juste-${projectName()}.png` });
	});

	test('PR 4b — téléphone : onglets Blocs / Tortue dans la carte ; ordinateur : côte à côte, sans onglets', async ({
		page
	}) => {
		await ouvrirApercu(
			page,
			`${test.info().parallelIndex} 4b onglets`,
			fence('tortue', ...TORTUE_CARRE)
		);
		const zone = carte(page);
		const espace = zone.getByRole('application', { name: 'Espace de travail Blockly' });
		await expect(espace).toBeVisible({ timeout: 30_000 });
		// Le quadrillage de la question (celui qui porte la figure grise)
		const quadrillage = zone.getByRole('img', { name: /Tracé de la tortue/ }).first();
		if (!estTactile()) {
			await expect(zone.getByRole('tab', { name: 'Blocs' })).toHaveCount(0);
			await expect(quadrillage).toBeVisible();
			return;
		}
		await expect(zone.getByRole('tab', { name: 'Blocs' })).toHaveAttribute('aria-selected', 'true');
		await expect(espace).toBeVisible();
		await expect(quadrillage).toBeHidden();
		await zone.getByRole('tab', { name: 'Tortue' }).click();
		await expect(quadrillage).toBeVisible();
		await expect(espace).toBeHidden();
		await zone.getByRole('tab', { name: 'Blocs' }).click();
		await expect(espace).toBeVisible();
		await expectNoHorizontalOverflow(page, 'carte tortue au téléphone');
	});
});

// ============================================================================
// PR 5b — Question programme de calcul (modèle brouillon ```calcul)
// ============================================================================

const CALCUL = ['attendu: afficher (nombre + 2) × 4', 'départ: afficher nombre + 2'];

test.describe('PR 5b — Question programme de calcul', () => {
	test('PR 5b — aperçu du modèle brouillon : blocs chargés, le programme de départ posé', async ({
		page
	}) => {
		await ouvrirApercu(page, `${test.info().parallelIndex} 5b apercu`, fence('calcul', ...CALCUL));
		const zone = carte(page);
		await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
		// Le départ « afficher nombre + 2 » est posé dans l'espace de blocs, lisible à l'écran
		expect((await typesDeBlocs(page)).sort()).toEqual(
			['calcul_afficher', 'calcul_nombre_choisi', 'calcul_operation'].sort()
		);
		const pile = zone
			.locator('svg.blocklySvg > g.blocklyWorkspace > g.blocklyBlockCanvas > g.blocklyDraggable')
			.first();
		await expect(pile).toBeVisible();
		await expect(pile).toContainText('afficher');
		await expect(pile).toContainText('nombre');
		await expect(pile).toContainText('+');
		await expect(pile).toContainText('2');
		await expectNoHorizontalOverflow(page, 'aperçu de la question de calcul');
		await page.screenshot({ path: `${SHOTS}/5b-apercu-${projectName()}.png` });
	});

	test('PR 5b — en classe (projeté) : le départ se voit', async ({ page }) => {
		await ouvrirApercu(page, `${test.info().parallelIndex} 5b classe`, fence('calcul', ...CALCUL));
		await page.getByRole('tab', { name: 'En classe' }).click();
		const zone = carte(page);
		await expect(zone).toContainText('afficher', { timeout: 30_000 });
		// Le départ « afficher nombre + 2 » est dans l'espace de blocs visible (pas seulement dans le texte)
		expect((await typesDeBlocs(page)).sort()).toEqual(
			['calcul_afficher', 'calcul_nombre_choisi', 'calcul_operation'].sort()
		);
		await page.screenshot({ path: `${SHOTS}/5b-classe-${projectName()}.png` });
	});

	test('PR 5b — en question : « Essayer avec » 5 → Lancer : « Avec 5, le programme affiche : 7 » ; changer + en × efface le lancer ; Valider → faux (verdict rouge ; le cadre de la carte retournée n’est pas observable dans l’aperçu)', async ({
		page
	}) => {
		await ouvrirApercu(page, `${test.info().parallelIndex} 5b faux`, fence('calcul', ...CALCUL));
		const zone = carte(page);
		await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
		const nombre = zone.locator('[data-calcul-focus]');
		await expect(nombre).toHaveValue('5');
		await zone.getByRole('button', { name: 'Lancer' }).click();
		await expect(zone).toContainText('Avec 5, le programme affiche : 7');

		// Changer + en × (le menu déroulant du bloc, au doigt ou à la souris)
		const champ = zone
			.locator('.blocklyDropdownText, .blocklyEditableField')
			.filter({ hasText: '+' })
			.first();
		if (estTactile()) {
			// Au téléphone, le bloc de départ déborde de l'espace (330 px) : on fait glisser l'espace
			// à la main (vrai geste sur le fond) pour amener le « + » sous le doigt
			const espaceBlocs = zone.getByRole('application', { name: 'Espace de travail Blockly' });
			await espaceBlocs.scrollIntoViewIfNeeded();
			const cadre = await espaceBlocs.boundingBox();
			if (!cadre) throw new Error('espace sans boîte');
			await glisser(
				page,
				{ x: cadre.x + cadre.width * 0.9, y: cadre.y + cadre.height * 0.4 },
				{ x: cadre.x + cadre.width * 0.9 - 230, y: cadre.y + cadre.height * 0.4 }
			);
		}
		if (estTactile()) await champ.tap();
		else await champ.click();
		const choix = page
			.locator('.blocklyMenuItem, [role="menuitem"]')
			.filter({ hasText: '×' })
			.first();
		await expect(choix).toBeVisible();
		if (estTactile()) await choix.tap();
		else await choix.click();
		await expect(zone).not.toContainText('Avec 5, le programme affiche');
		expect((await typesDeBlocs(page)).sort()).toEqual(
			['calcul_afficher', 'calcul_nombre_choisi', 'calcul_operation'].sort()
		);

		await decor.validate(page);
		const corrigee = page.locator('.correction-card-wrapper .flip-front');
		await expect(corrigee).toBeVisible({ timeout: 30_000 });
		// Le verdict : « Faux », en rouge
		const verdict = corrigee.getByTestId('global-verdict');
		await expect(verdict).toContainText('Faux');
		const [r, g] = await couleurRgb(verdict);
		expect(r, 'verdict en rouge').toBeGreaterThan(g + 40);
		// Le cadre rouge de la question verrouillée n'est pas observable ici : l'aperçu retourne la carte
		// sur la correction, et la face de la question n'est plus montée (reste à David : séance élève)

		// Copie corrigée : les deux programmes, le tableau des essais, les lignes fausses en rouge
		const texte = ((await corrigee.innerText()) ?? '').replace(/\s+/g, ' ');
		expect(texte).toContain('Ton programme : afficher nombre × 2');
		expect(texte).toContain('Un programme juste : afficher (nombre + 2) × 4');
		const lignes = corrigee.locator('table.calcul-tableau tbody tr');
		await expect(lignes).toHaveCount(7);
		expect(
			await lignes.evaluateAll((trs) => trs.map((tr) => tr.getAttribute('data-juste')))
		).toEqual(Array(7).fill('false'));
		const cellule = corrigee.locator('td.calcul-cellule-fausse').first();
		const [cr, cg] = await couleurRgb(cellule);
		expect(cr, 'cellule fausse en rouge').toBeGreaterThan(cg + 40);
		await corrigee.scrollIntoViewIfNeeded();
		await page.screenshot({ path: `${SHOTS}/5b-faux-${projectName()}.png` });
	});

	test('PR 5b — « afficher nombre × 4 + 8 » est juste (écrit autrement que le programme attendu)', async ({
		page
	}) => {
		await ouvrirApercu(page, `${test.info().parallelIndex} 5b juste`, fence('calcul', ...CALCUL));
		await expect(carte(page).locator('.blocklyToolboxCategory').first()).toBeVisible({
			timeout: 30_000
		});
		await chargerEtat(page, etatCalcul('afficher nombre × 4 + 8'));
		await decor.validate(page);
		const corrigee = page.locator('.correction-card-wrapper .flip-front');
		await expect(corrigee.getByTestId('global-verdict')).toContainText('Juste', {
			timeout: 30_000
		});
		const texte = ((await corrigee.innerText()) ?? '').replace(/\s+/g, ' ');
		expect(texte).toContain('afficher nombre × 4 + 8');
		await page.screenshot({ path: `${SHOTS}/5b-juste-${projectName()}.png` });
	});
});

// ============================================================================
// PR 4b, PR 5b — PDF d'une fiche et aide à l'écriture (prof)
// ============================================================================

/** Préfixe des fiches et exercices de CE worker (effacés par lui seul) */
const fichePrefix = (): string => `Verifs7 blockly ${projectName()} w${test.info().parallelIndex}`;
const sourceExercices = (): string =>
	`verifs7 blockly ${projectName()} w${test.info().parallelIndex}`;

async function exercice(titre: string, enonce: string): Promise<{ id: string; title: string }> {
	const rows = await sql<{ id: string }>(
		withFirstVersion(
			`insert into exercises (title, source, grades, topic, created_by, category)
			 values ($1, $4, '{}', 'Verifs7', $2, 'automatisme') returning id`,
			{ variations: '$3::jsonb' }
		),
		[
			titre,
			TEACHER_ID,
			JSON.stringify([
				{ label: 'guided', hints: [], statement_md: enonce, solution_md: 'Voir la figure.' }
			]),
			sourceExercices()
		]
	);
	return { id: rows[0].id, title: titre };
}

async function effacerFiches(): Promise<void> {
	await sql(`delete from worksheets where created_by = $1 and title like $2`, [
		TEACHER_ID,
		`${fichePrefix()} %`
	]);
	await sql(`delete from exercises where created_by = $1 and source = $2`, [
		TEACHER_ID,
		sourceExercices()
	]);
}

test.describe('PDF de fiche', { tag: '@bureau' }, () => {
	test.skip(() => projectName() !== 'ordi-chrome', 'PDF : même fichier quel que soit l’écran');
	test.afterAll(effacerFiches);

	test('PR 4b, PR 5b — PDF de la fiche : la figure du carré et « À faire sur Chiphre » pour la tortue ; « À faire sur Chiphre » seul pour le calcul (ni attendu, ni départ imprimés)', async ({
		page
	}) => {
		await effacerFiches();
		const tortue = await exercice(
			`${fichePrefix()} tortue`,
			['Fais tracer ce carré à la tortue.', '', fence('tortue', ...TORTUE_CARRE)].join('\n')
		);
		const calcul = await exercice(
			`${fichePrefix()} calcul`,
			['Écris le programme de calcul.', '', fence('calcul', ...CALCUL)].join('\n')
		);
		const fiche = await createWorksheet({
			title: `${fichePrefix()} fiche`,
			styleId: STYLE_IDS.standard,
			exercises: [{ exercise: tortue }, { exercise: calcul }]
		});
		await login(page, TEACHER.email, TEACHER.password);
		const pdf = await teacherPdf(page, fiche, { saveAs: 'blockly7-fiche.pdf' });
		pdfToPng(pdf, 'blockly7-fiche', 80);
		const texte = pdfText(pdf).join('\n').replace(/\s+/g, ' ');

		// Les deux cadres « À faire sur Chiphre », chacun avec sa consigne
		expect(texte.match(/À faire sur Chiphre/g)).toHaveLength(2);
		expect(texte).toContain('À faire sur Chiphre : programme la tortue avec les blocs, à l’écran.');
		expect(texte).toContain(
			'À faire sur Chiphre : assemble le programme de calcul avec les blocs, à l’écran.'
		);
		// Ni le programme attendu, ni le départ, ni le nom des blocs ne sont imprimés
		expect(texte, 'rien du programme n’est imprimé').not.toMatch(
			/attendu|départ|montrer|afficher|répéter|avancer|tourner|nombre \+ 2/i
		);
		// La figure du carré : un quadrillage d'environ 2,5 cm (5 carreaux de 0,5 cm) avec un trait noir
		const raster = rasterPage(pdf, 1, 100);
		const figures = components(raster, isInk, {
			left: 0,
			top: 150,
			right: 595,
			bottom: 330
		}).filter(
			(c) =>
				c.box.right - c.box.left > 60 &&
				c.box.right - c.box.left < 90 &&
				Math.abs(c.box.right - c.box.left - (c.box.bottom - c.box.top)) < 8
		);
		expect(figures, 'un quadrillage carré d’environ 2,5 cm sous la consigne').toHaveLength(1);
		expect(share(raster, isBlack, figures[0].box), 'le carré est tracé en noir').toBeGreaterThan(
			0.02
		);
	});
});

test.describe('Aide à l’écriture (prof)', () => {
	test('PR 4b — aide à l’écriture : la fiche « Programme tortue » (réglages dont `départ`, exemple dessiné)', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/aide-ecriture/blocs/tortue');
		await expect(page.getByRole('heading', { name: 'Programme tortue', level: 1 })).toBeVisible();
		const main = page.locator('#contenu-principal');
		const texte = ((await main.innerText()) ?? '').replace(/\s+/g, ' ');
		for (const cle of ['attendu', 'montrer', 'comparer', 'départ', 'niveau', 'blocs']) {
			expect(texte, `réglage « ${cle} » dans la fiche`).toContain(cle);
		}
		expect(texte).toContain('À faire sur Chiphre');
		// L'exemple est joué : un quadrillage de tortue est dessiné dans la page (rendu à l'arrivée à l'écran)
		await page
			.locator('article')
			.first()
			.evaluate((el) => el.scrollIntoView({ block: 'end' }));
		await expect(
			main.getByRole('img', { name: /Tracé de la tortue/, includeHidden: true }).first()
		).toBeAttached();
		await expectNoHorizontalOverflow(page, 'aide à l’écriture : programme tortue');
	});

	test('PR 5b — aide à l’écriture : la fiche « Programme de calcul » (réglages dont `départ`, `essais`)', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/aide-ecriture/blocs/calcul');
		await expect(
			page.getByRole('heading', { name: 'Programme de calcul', level: 1 })
		).toBeVisible();
		const texte = (
			((await page.locator('#contenu-principal').innerText()) ?? '') as string
		).replace(/\s+/g, ' ');
		for (const cle of ['attendu', 'essais', 'niveau', 'départ']) {
			expect(texte, `réglage « ${cle} » dans la fiche`).toContain(cle);
		}
		expect(texte).toContain('À faire sur Chiphre');
		await expectNoHorizontalOverflow(page, 'aide à l’écriture : programme de calcul');
	});
});
