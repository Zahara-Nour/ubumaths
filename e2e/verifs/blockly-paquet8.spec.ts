import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, TEACHER } from './helpers/carnet';
import {
	chargerEtat,
	couleurRgb,
	creerVariable,
	etatCalcul,
	etatTortue,
	nomsDeVariables,
	suivreBlockly,
	typesDeBlocs
} from './helpers/blockly';
import { brouillons, fence, isTouch, projectName } from './helpers/modele-brouillon';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';

/**
 * Blockly de 4e / 3e : programmes de calcul, tortue, questions (tri des vérifications manuelles, paquet 8)
 * ========================================================================================================
 *
 * Reprend les lignes #2716 / #2719 (programmes de calcul 4e / 3e), #2683 / #2684 (« Programme pour
 * un résultat donné »), #2700 / #2704 (nombre maximal de blocs), #2742 (tortue de 4e / 3e en bac à
 * sable), #2746 / #2755 (questions tortue de 4e / 3e) et #2761 (nombres de la tortue) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Décor : les programmes sont posés par `chargerEtat` (module Blockly de la page, serveur de dev
 * seulement) ; les variables sont créées par le vrai geste (« Créer une variable… », la boîte, OK).
 * Les modèles réels (5-106, 25991652, d64ddd78) sont ouverts en lecture dans l'aperçu admin ; leur
 * énoncé tire une variation au hasard, donc les clauses qui veulent un énoncé fixe (« 3 → 10 »,
 * spirale de 6 traits, carré de côté 3) sont jouées sur un brouillon « Verifs8 blockly … » qui
 * recopie la variation citée par la ligne (le gabarit est le même, seuls les nombres sont figés).
 * Ces brouillons sont effacés après chaque test.
 *
 * Reste à David : voir la liste du rapport (le compte ÉLÈVE réel — ici l'aperçu admin —, le
 * glisser de blocs au doigt, la prod).
 *
 * Serveur de dev et base locale seulement.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(120_000));

// Constantes

const SHOTS = '.captures/verifs/out-blockly8';
const decor = brouillons('Verifs8 blockly', SHOTS);

/** Les traits du tracé de l'élève sur le quadrillage */
const TRACE = '[data-trace="eleve"] line';
/** Le message de fin ou d'erreur sous le quadrillage de `/tortue` */
const MESSAGE = 'p[role="status"]';

const PROGRAMME_4E =
	'mettre x à nombre × 2 ; si x > 10 alors [ afficher x − 10 ] sinon [ afficher x ]';

// Fonctions

/** Ouvre `/programmes-de-calcul` (sans connexion), espace de blocs prêt */
async function ouvrirCalcul(page: Page): Promise<void> {
	suivreBlockly(page);
	await gotoSettled(page, '/programmes-de-calcul');
	await expect(page.getByRole('application', { name: 'Espace de travail Blockly' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Lancer' })).toBeEnabled();
}

/** Ouvre `/tortue` (sans connexion), espace de blocs prêt */
async function ouvrirTortue(page: Page): Promise<void> {
	suivreBlockly(page);
	await gotoSettled(page, '/tortue');
	await expect(page.getByRole('application', { name: 'Espace de travail Blockly' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Lancer' })).toBeEnabled();
}

/** Le bouton de niveau (« 5e », « 4e », « 3e », « base ») de la page */
async function choisirNiveau(page: Page, niveau: string): Promise<void> {
	const bouton = page.getByRole('button', { name: niveau, exact: true });
	// Un clic avant que la page réagisse (WebKit sous charge) se rejoue
	await expect(async () => {
		await bouton.click();
		await expect(bouton).toHaveAttribute('aria-pressed', 'true', { timeout: 2000 });
	}).toPass({ timeout: 20_000 });
}

/** Sur téléphone, un panneau à la fois : montre le panneau voulu (sans effet sur ordinateur) */
async function montrerOnglet(page: Page, nom: 'Blocs' | 'Tortue'): Promise<void> {
	if (isTouch()) {
		const onglet = page.getByRole('tab', { name: nom });
		await expect(onglet).toBeVisible();
		await onglet.click();
	}
}

/** Les noms des catégories de la boîte à outils, dans l'ordre */
async function categories(page: Page): Promise<string[]> {
	const noms = await page.locator('.blocklyToolboxCategory').allInnerTexts();
	return noms.map((nom) => nom.trim());
}

/** Le texte de la boîte à outils ouverte sur la catégorie `nom` */
async function contenuDeCategorie(page: Page, nom: string): Promise<string> {
	await page
		.locator('.blocklyToolboxCategory')
		.filter({ hasText: new RegExp(`^\\s*${nom}\\s*$`) })
		.first()
		.click();
	const volet = page.locator('.blocklyToolboxFlyout');
	await expect(volet).toBeVisible();
	// Le volet se remplit à l'ouverture : on attend du texte
	await expect
		.poll(async () => ((await volet.textContent()) ?? '').trim().length)
		.toBeGreaterThan(0);
	return ((await volet.textContent()) ?? '').replace(/\s+/g, ' ');
}

/** Rapport de contraste WCAG entre deux couleurs (0 à 255) */
function contraste(a: [number, number, number], b: [number, number, number]): number {
	const luminance = ([r, g, v]: [number, number, number]): number => {
		const lin = (c: number): number => {
			const x = c / 255;
			return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(v);
	};
	const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (clair + 0.05) / (sombre + 0.05);
}

/** Rouge net : le canal rouge domine nettement les deux autres */
async function expectRouge(lieu: Locator, nom: string): Promise<void> {
	const [r, g, b] = await couleurRgb(lieu);
	expect(r, `${nom} en rouge : ${[r, g, b]}`).toBeGreaterThan(g + 40);
	expect(r, `${nom} en rouge : ${[r, g, b]}`).toBeGreaterThan(b + 30);
}

/** Lance le programme de calcul sur `nombre` (champ « Essayer avec », bouton Lancer) */
async function lancerCalcul(page: Page, nombre: string): Promise<void> {
	await page.locator('[data-calcul-focus]').fill(nombre);
	await page.getByRole('button', { name: 'Lancer' }).click();
}

/** Un modèle brouillon (admin) dont l'énoncé est `enonce`, ouvert dans l'aperçu ; Blockly est suivi dès la connexion */
async function ouvrirApercu(page: Page, titre: string, enonce: string): Promise<string> {
	suivreBlockly(page);
	return decor.openPreview(page, `${test.info().parallelIndex} ${titre}`, enonce);
}

/** Un modèle RÉEL (publié) ouvert dans l'aperçu admin, en lecture seule */
async function ouvrirModeleReel(page: Page, id: string): Promise<void> {
	suivreBlockly(page);
	await login(page, 'admin@local.test', 'local-admin');
	await gotoSettled(page, `/dashboard/admin/questions/${id}/preview`);
}

/** La carte de la question jouée dans l'aperçu admin : l'onglet actif (carte puis correction) */
const carte = (page: Page): Locator => page.locator('[role="tabpanel"][data-state="active"]');

/**
 * L'espace de blocs de la carte prêt. La tortue montre un panneau à la fois au téléphone (onglet
 * « Blocs » à montrer) ; le programme de calcul n'a pas d'onglets
 */
async function carteBlocsPrete(page: Page, avecOnglets: boolean): Promise<Locator> {
	const zone = carte(page);
	await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
	const onglet = zone.getByRole('tab', { name: 'Blocs' });
	if (avecOnglets && isTouch()) {
		await expect(onglet).toBeVisible();
		await onglet.click();
	} else {
		await expect(onglet).toBeHidden();
	}
	await zone
		.getByRole('application', { name: 'Espace de travail Blockly' })
		.scrollIntoViewIfNeeded();
	return zone;
}

/** Lance le programme de la carte et saute à la fin de l'animation (sans effet si elle est déjà finie) */
async function lancerCarte(zone: Locator): Promise<void> {
	await zone.getByRole('button', { name: 'Lancer' }).click();
	await zone.getByRole('button', { name: 'Tout de suite' }).click({ force: true });
}

/** Le texte de la copie corrigée, espaces réduits */
async function texteCorrige(page: Page): Promise<string> {
	const corrigee = page.locator('.correction-card-wrapper .flip-front');
	await expect(corrigee).toBeVisible({ timeout: 30_000 });
	return ((await corrigee.innerText()) ?? '').replace(/\s+/g, ' ');
}

// ============================================================================
// #2716, #2719 — Programmes de calcul 4e / 3e
// ============================================================================

test.describe('#2716 — Programmes de calcul 4e / 3e', () => {
	test('#2716 — « 5e » par défaut avec Résultat ; « 4e » : Calcul, Variables, Afficher, Conditions, Boucles (plus de Résultat)', async ({
		page
	}) => {
		await ouvrirCalcul(page);
		await expect(page.getByRole('button', { name: '5e', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(await categories(page)).toEqual(['Calcul', 'Résultat', 'Afficher', 'Boucles']);
		await choisirNiveau(page, '4e');
		expect(await categories(page)).toEqual([
			'Calcul',
			'Variables',
			'Afficher',
			'Conditions',
			'Boucles'
		]);
	});

	test('#2716 — « Créer une variable… » : la boîte s’ouvre au centre, lisible en clair et en sombre', async ({
		page
	}) => {
		await ouvrirCalcul(page);
		await choisirNiveau(page, '4e');
		await page
			.locator('.blocklyToolboxCategory')
			.filter({ hasText: /^\s*Variables\s*$/ })
			.first()
			.click();
		await page.getByText('Créer une variable…').click();
		const boite = page.locator('dialog.blocklyDialog');
		await expect(boite).toBeVisible();

		// Au centre de l'écran (à 12 % de la fenêtre près), en entier dans la fenêtre
		const fenetre = page.viewportSize();
		const cadre = await boite.boundingBox();
		if (!fenetre || !cadre) throw new Error('fenêtre ou boîte sans taille');
		const cx = cadre.x + cadre.width / 2;
		const cy = cadre.y + cadre.height / 2;
		expect(Math.abs(cx - fenetre.width / 2), 'centre horizontal').toBeLessThan(
			fenetre.width * 0.12
		);
		expect(Math.abs(cy - fenetre.height / 2), 'centre vertical').toBeLessThan(
			fenetre.height * 0.12
		);
		expect(cadre.x, 'boîte dans la fenêtre (gauche)').toBeGreaterThanOrEqual(0);
		expect(cadre.x + cadre.width, 'boîte dans la fenêtre (droite)').toBeLessThanOrEqual(
			fenetre.width
		);

		// Lisible : le texte de la consigne, du champ et des deux boutons ressort sur le fond de la boîte
		for (const theme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme: theme });
			await page.waitForFunction(
				(sombre) => document.documentElement.classList.contains('dark') === sombre,
				theme === 'dark'
			);
			await expect(boite).toBeVisible();
			const fond = await couleurRgb(boite, 'background-color');
			const lieux = [
				['consigne', boite.locator('label.blocklyDialogPrompt')],
				['bouton OK', boite.getByRole('button', { name: 'OK' })],
				['bouton Annuler', boite.getByRole('button', { name: 'Annuler' })]
			] as const;
			for (const [nom, lieu] of lieux) {
				const texte = await couleurRgb(lieu, 'color');
				// Le fond propre à l'élément s'il en a un (bouton), sinon celui de la boîte
				const propre = await couleurRgb(lieu, 'background-color');
				const surface = await lieu.evaluate(
					(el) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'
				);
				const rapport = contraste(texte, surface ? propre : fond);
				expect(rapport, `${nom} (${theme}) : contraste ${rapport.toFixed(2)}`).toBeGreaterThan(3);
			}
			await page.screenshot({
				path: `${SHOTS}/2716-boite-variable-${theme === 'dark' ? 'sombre' : 'clair'}-${projectName()}.png`
			});
		}
		await page.emulateMedia({ colorScheme: 'light' });
	});

	test('#2716 — créer `x` ; puis `résultat` → refusé, message rouge sous les blocs', async ({
		page
	}) => {
		await ouvrirCalcul(page);
		await choisirNiveau(page, '4e');
		await creerVariable(page, 'x');
		expect(await nomsDeVariables(page)).toEqual(['x']);
		const refus = page.locator('.calcul-nom-refuse');
		await expect(refus).toHaveCount(0);

		const espace = page.getByRole('application', { name: 'Espace de travail Blockly' });
		const boiteEspace = await espace.boundingBox();
		if (!boiteEspace) throw new Error('espace sans boîte');

		await creerVariable(page, 'résultat');
		await expect(refus, '« résultat » refusé').toBeVisible();
		expect(((await refus.textContent()) ?? '').trim().length, 'message de refus').toBeGreaterThan(
			10
		);
		await expectRouge(refus, 'message de « résultat »');
		// Sous les blocs (l'espace de travail)
		const boiteMessage = await refus.boundingBox();
		expect(boiteMessage?.y ?? 0, 'message sous l’espace de blocs').toBeGreaterThanOrEqual(
			boiteEspace.y + boiteEspace.height - 2
		);
		// La variable refusée n'existe pas : seule `x` reste
		expect(await nomsDeVariables(page)).toEqual(['x']);
	});

	// Une frappe au clavier : sans sens au téléphone
	test('#2716 — @bureau Ctrl+Z annule encore `x` après le refus de `résultat`', async ({
		page
	}) => {
		await ouvrirCalcul(page);
		await choisirNiveau(page, '4e');
		await creerVariable(page, 'x');
		await creerVariable(page, 'résultat');
		await expect(page.locator('.calcul-nom-refuse')).toBeVisible();
		expect(await nomsDeVariables(page)).toEqual(['x']);
		// Le refus n'a pas bloqué l'historique : la création de `x` s'annule encore
		// (un clic sur le fond de l'espace, à droite du volet, lui donne le clavier)
		const boiteEspace = await page
			.getByRole('application', { name: 'Espace de travail Blockly' })
			.boundingBox();
		if (!boiteEspace) throw new Error('espace sans boîte');
		await page.mouse.click(
			boiteEspace.x + boiteEspace.width * 0.8,
			boiteEspace.y + boiteEspace.height * 0.5
		);
		// Ctrl+Z, ou Cmd+Z selon le moteur (la 2e frappe n'a plus rien à défaire)
		await page.keyboard.press('Control+z');
		await page.keyboard.press('Meta+z');
		await expect.poll(() => nomsDeVariables(page)).toEqual([]);
	});

	test('#2716 — créer `x` puis `X` est refusé par la boîte de Blockly (« Une variable nommée « x » existe déjà. ») (E74, tranché le 2026-11-24)', async ({
		page
	}) => {
		await ouvrirCalcul(page);
		await choisirNiveau(page, '4e');
		await creerVariable(page, 'x');

		// Une boîte de Blockly annonce que la variable existe déjà, rien n'est créé
		await page.getByText('Créer une variable…').click();
		const boite = page.locator('dialog.blocklyDialog');
		await boite.locator('input').fill('X');
		await boite.getByRole('button', { name: 'OK' }).click();
		await expect(page.getByText('Une variable nommée « x » existe déjà.')).toBeVisible();
		await page.getByRole('button', { name: 'OK' }).click();
		expect(await nomsDeVariables(page)).toEqual(['x']);
	});

	test('#2716 — « mettre x à nombre × 2 ; si x > 10 alors afficher x − 10 sinon afficher x » : Essayer avec 7 → 4, avec 3 → 6', async ({
		page
	}) => {
		await ouvrirCalcul(page);
		await choisirNiveau(page, '4e');
		await chargerEtat(page, etatCalcul(PROGRAMME_4E));
		// Le programme est bien posé : les blocs d'instruction du texte
		expect(await typesDeBlocs(page)).toEqual(
			expect.arrayContaining(['calcul_si_sinon', 'calcul_afficher', 'logic_compare'])
		);
		const sortie = page.locator('.calcul-sortie');
		await lancerCalcul(page, '7');
		await expect(sortie).toContainText('Avec 7, le programme affiche : 4');
		await lancerCalcul(page, '3');
		await expect(sortie).toContainText('Avec 3, le programme affiche : 6');
		await expect(sortie).not.toContainText('Avec 7');
		await expectNoHorizontalOverflow(page, 'programmes de calcul 4e');
	});

	test('#2716 — « 3e » : et / ou / non dans Conditions, « répéter jusqu’à » dans Boucles', async ({
		page
	}) => {
		await ouvrirCalcul(page);
		await choisirNiveau(page, '4e');
		const conditions4e = await contenuDeCategorie(page, 'Conditions');
		expect(conditions4e).not.toMatch(/\bet\b|\bou\b|\bnon\b/);
		const boucles4e = await contenuDeCategorie(page, 'Boucles');
		expect(boucles4e).not.toContain('jusqu');

		await choisirNiveau(page, '3e');
		expect(await categories(page)).toEqual([
			'Calcul',
			'Variables',
			'Afficher',
			'Conditions',
			'Boucles'
		]);
		const conditions = await contenuDeCategorie(page, 'Conditions');
		expect(conditions).toMatch(/\bet\b/);
		expect(conditions).toMatch(/\bou\b/);
		expect(conditions).toMatch(/\bnon\b/);
		expect(await contenuDeCategorie(page, 'Boucles')).toMatch(/répéter jusqu/);
	});

	test('#2716 — « 3e » puis retour en « 5e » avec ces blocs : Lancer → « Ce bloc n’est pas pris en charge »', async ({
		page
	}) => {
		await ouvrirCalcul(page);
		await choisirNiveau(page, '3e');
		await chargerEtat(page, etatCalcul(PROGRAMME_4E));
		await lancerCalcul(page, '7');
		await expect(page.locator('.calcul-sortie')).toContainText('Avec 7, le programme affiche : 4');

		await choisirNiveau(page, '5e');
		// Le lancer d'avant ne vaut plus, et les blocs de 4e restent en place
		await expect(page.locator('.calcul-sortie')).not.toContainText('Avec 7');
		expect(await typesDeBlocs(page)).toContain('calcul_si_sinon');
		await lancerCalcul(page, '7');
		const sortie = page.locator('.calcul-sortie');
		await expect(sortie).toContainText('Ce bloc n’est pas pris en charge');
		await expect(sortie).not.toContainText('le programme affiche');
		await expectRouge(sortie.locator('p.text-destructive'), 'message d’erreur');
	});

	test('#2719 — aide à l’écriture (prof) : la fiche « Programme de calcul » a le réglage `niveau` et des exemples 4e / 3e', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/aide-ecriture/blocs/calcul');
		await expect(
			page.getByRole('heading', { name: 'Programme de calcul', level: 1 })
		).toBeVisible();
		const texte = ((await page.locator('#contenu-principal').innerText()) ?? '').replace(
			/\s+/g,
			' '
		);
		expect(texte).toContain('niveau');
		expect(texte).toMatch(/5e, 4e ou 3e/);
		expect(texte).toContain('Une condition (4e)');
		expect(texte).toContain('Répéter jusqu’à (3e)');
		expect(texte).toContain('niveau: 4e');
		expect(texte).toContain('niveau: 3e');
		await expectNoHorizontalOverflow(page, 'aide à l’écriture : programme de calcul');
	});
});

// ============================================================================
// #2683, #2684 — « Programme pour un résultat donné » (6-210, befab91c)
// ============================================================================

test.describe('#2683 — Programme pour un résultat donné', () => {
	/** Le gabarit de la 1re variation de befab91c, avec « 3 → 10 » (r = n + a, a = 7) */
	const ENONCE = [
		'Écris un programme qui **affiche $10$** quand on choisit le nombre $3$. Utilise le bloc « nombre choisi » et une addition.',
		'',
		fence('calcul', 'attendu: afficher nombre + 7', 'essais: 3')
	].join('\n');

	/** Pose `programme`, lance (essai 3), valide, et rend le texte de la copie corrigée */
	async function jouer(page: Page, programme: string): Promise<string> {
		const zone = await carteBlocsPrete(page, false);
		await chargerEtat(page, etatCalcul(programme));
		await zone.getByRole('button', { name: 'Lancer' }).click();
		await decor.validate(page);
		return texteCorrige(page);
	}

	test('#2683 — le modèle réel befab91c existe (publié, 6e) et son énoncé est un programme de calcul', async ({
		page
	}) => {
		await ouvrirModeleReel(page, 'befab91c-c77e-464e-a5bf-79206462928d');
		await expect(page.getByText('Programme pour un résultat donné').first()).toBeVisible();
		const zone = carte(page);
		await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
		await expect(zone.locator('[data-calcul-focus]')).toBeVisible();
	});

	test('#2683 — « 3 → 10 » : `afficher 10` est refusé, « Ton programme affiche toujours la même chose… » dans le corrigé', async ({
		page
	}) => {
		await ouvrirApercu(page, '2683 constant', ENONCE);
		const texte = await jouer(page, 'afficher 10');
		const corrigee = page.locator('.correction-card-wrapper .flip-front');
		await expect(corrigee.getByTestId('global-verdict')).toContainText('Faux');
		expect(texte).toContain(
			'Ton programme affiche toujours la même chose, quel que soit le nombre choisi.'
		);
		expect(texte).toContain('Ton programme : afficher 10');
		expect(texte).toContain('Un programme juste : afficher nombre + 7');
	});

	test('#2683 — `afficher 10` : le même message est à l’écran, avant la correction', async ({
		page
	}) => {
		await ouvrirApercu(page, '2683 ecran', ENONCE);
		const zone = await carteBlocsPrete(page, false);
		await chargerEtat(page, etatCalcul('afficher 10'));
		await zone.locator('[data-calcul-focus]').fill('3');
		await zone.getByRole('button', { name: 'Lancer' }).click();
		// Le programme affiche bien 10 avec 3 : c'est ce qu'il fait des AUTRES nombres qui le trahit
		await expect(zone).toContainText('Avec 3, le programme affiche : 10');
		await decor.validate(page);
		// À l'écran (la page entière), le message est dit au moins deux fois : sur la carte et dans le corrigé
		const message = 'Ton programme affiche toujours la même chose, quel que soit le nombre choisi.';
		const corps = ((await page.locator('#contenu-principal').innerText()) ?? '').replace(
			/\s+/g,
			' '
		);
		expect(
			corps.split(message).length - 1,
			'occurrences du message à l’écran'
		).toBeGreaterThanOrEqual(1);
		await texteCorrige(page);
		await expect(page.getByText(message).first()).toBeVisible();
	});

	for (const programme of ['afficher nombre + 7', 'afficher nombre × 3 + 1']) {
		test(`#2683 — « ${programme} » est juste (avec 3 : 10)`, async ({ page }) => {
			await ouvrirApercu(page, `2684 ${programme}`, ENONCE);
			const texte = await jouer(page, programme);
			const corrigee = page.locator('.correction-card-wrapper .flip-front');
			await expect(corrigee.getByTestId('global-verdict')).toContainText('Juste');
			expect(texte).not.toContain('toujours la même chose');
		});
	}
});

// ============================================================================
// #2700, #2704 — Nombre maximal de blocs (5-106)
// ============================================================================

test.describe('#2700 — Nombre maximal de blocs', () => {
	/** Le carré de côté 3 de 5-106 (1re variation), en trois blocs au plus */
	const ENONCE = [
		'Fais tracer à la tortue le carré dessiné en gris, de côté $3$, en utilisant le bloc **répéter**.',
		'',
		fence(
			'tortue',
			'attendu: répéter 4 [ avancer 3 ; tourner à gauche 90 ]',
			'montrer: oui',
			'blocs: 3'
		)
	].join('\n');

	test('#2700 — le modèle réel 5-106 « Répéter des instructions » : « Au plus N blocs » au-dessus du compteur « Blocs : 0 / N »', async ({
		page
	}) => {
		await ouvrirModeleReel(page, '51636342-7294-407b-9fd0-42f9ede6e8a9');
		const zone = carte(page);
		await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
		const consigne = zone.getByText(/^Au plus \d+ blocs?$/);
		await expect(consigne).toBeVisible();
		const compteur = zone.locator('[data-compteur-blocs]');
		await expect(compteur).toHaveText(/^Blocs : 0 \/ \d+$/);
		// « Au-dessus des blocs » : la consigne est plus haut que l'espace de blocs
		const haut = await consigne.boundingBox();
		const espace = await zone
			.getByRole('application', { name: 'Espace de travail Blockly' })
			.boundingBox();
		expect(haut && espace && haut.y < espace.y, 'consigne au-dessus de l’espace de blocs').toBe(
			true
		);
	});

	test('#2700 — « Au plus 3 blocs » (carré), compteur « Blocs : 0 / 3 » ; le carré sans répéter : compteur rouge « Blocs : 7 / 3 », Valider possible → faux et message', async ({
		page
	}) => {
		await ouvrirApercu(page, '2700 sans repeter', ENONCE);
		const zone = await carteBlocsPrete(page, true);
		await expect(zone.getByText('Au plus 3 blocs', { exact: true })).toBeVisible();
		const compteur = zone.locator('[data-compteur-blocs]');
		await expect(compteur).toHaveText('Blocs : 0 / 3');
		await expect(compteur).toHaveAttribute('data-depasse', 'false');

		// Le carré sans répéter : 4 « avancer » et 3 « tourner » = 7 blocs
		await chargerEtat(
			page,
			etatTortue(
				'avancer 3 ; tourner à gauche 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3'
			)
		);
		await expect(compteur).toHaveText('Blocs : 7 / 3');
		await expect(compteur).toHaveAttribute('data-depasse', 'true');
		await expectRouge(compteur, 'compteur');
		await lancerCarte(zone);
		// Le tracé est bon : c'est le nombre de blocs qui est refusé
		await expect(zone.locator(TRACE)).toHaveCount(4);

		// Valider reste possible
		const valider = page.getByRole('button', { name: 'Valider' });
		await valider.scrollIntoViewIfNeeded();
		await expect(valider).toBeEnabled();
		await valider.click();
		const corrigee = page.locator('.correction-card-wrapper .flip-front');
		await expect(corrigee).toBeVisible({ timeout: 30_000 });
		await expect(corrigee.getByTestId('global-verdict')).toContainText('Faux');
		const texte = ((await corrigee.innerText()) ?? '').replace(/\s+/g, ' ');
		expect(texte).toContain('Ton programme utilise 7 blocs ; il en faut au plus 3.');
		// Copie corrigée : le message est sous « Ton programme »
		expect(texte.indexOf('Ton programme utilise 7 blocs')).toBeGreaterThan(
			texte.indexOf('Ton programme :') + 'Ton programme :'.length
		);
		expect(texte).toContain('Ton programme :');
		expect(texte).toContain('Un programme juste');
		await corrigee.scrollIntoViewIfNeeded();
		await page.screenshot({ path: `${SHOTS}/2700-faux-${projectName()}.png` });
	});

	test('#2700 — avec répéter (3 blocs) : compteur « Blocs : 3 / 3 » non rouge, juste', async ({
		page
	}) => {
		await ouvrirApercu(page, '2700 avec repeter', ENONCE);
		const zone = await carteBlocsPrete(page, true);
		await chargerEtat(page, etatTortue('répéter 4 [ avancer 3 ; tourner à gauche 90 ]'));
		const compteur = zone.locator('[data-compteur-blocs]');
		await expect(compteur).toHaveText('Blocs : 3 / 3');
		await expect(compteur).toHaveAttribute('data-depasse', 'false');
		const [r, g] = await couleurRgb(compteur);
		expect(r, 'compteur non rouge').toBeLessThan(g + 40);
		await lancerCarte(zone);
		await decor.validate(page);
		const corrigee = page.locator('.correction-card-wrapper .flip-front');
		await expect(corrigee).toBeVisible({ timeout: 30_000 });
		await expect(corrigee.getByTestId('global-verdict')).toContainText('Juste');
		expect(((await corrigee.innerText()) ?? '').replace(/\s+/g, ' ')).not.toContain(
			'il en faut au plus'
		);
	});

	test('#2704 — aide à l’écriture : le réglage `blocs` dans la fiche « Programme tortue »', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/aide-ecriture/blocs/tortue');
		await expect(page.getByRole('heading', { name: 'Programme tortue', level: 1 })).toBeVisible();
		const texte = ((await page.locator('#contenu-principal').innerText()) ?? '').replace(
			/\s+/g,
			' '
		);
		expect(texte).toContain('blocs');
		expect(texte).toMatch(/blocs: \d+|blocs: N|Au plus/);
	});
});

// ============================================================================
// #2742 — Tortue de 4e / 3e en bac à sable
// ============================================================================

test.describe('#2742 — Tortue de 4e / 3e', () => {
	test('#2742 — « Blocs : base · 4e · 3e » ; base par défaut, avec « Voir en Python » ; sur téléphone, boutons et catégories lisibles', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await expect(page.getByText('Blocs :', { exact: true })).toBeVisible();
		const boutons = page.locator('[role="group"][aria-labelledby="niveau-blocs"] button');
		expect(await boutons.allInnerTexts()).toEqual(['base', '4e', '3e']);
		await expect(page.getByRole('button', { name: 'base', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await montrerOnglet(page, 'Tortue');
		await expect(page.getByText('Voir en Python')).toBeVisible();
		await montrerOnglet(page, 'Blocs');
		expect(await categories(page)).toEqual(['Tortue', 'Boucles', 'Math']);

		// Lisibles : des boutons que le doigt vise (≥ 28 px de haut), un texte d'au moins 12 px
		const mesures = await boutons.evaluateAll((liste) =>
			liste.map((el) => {
				const boite = el.getBoundingClientRect();
				return {
					hauteur: boite.height,
					largeur: boite.width,
					droite: boite.right,
					police: parseFloat(getComputedStyle(el).fontSize)
				};
			})
		);
		expect(mesures, 'trois boutons de niveau mesurés').toHaveLength(3);
		const largeurFenetre = page.viewportSize()?.width ?? 0;
		for (const m of mesures) {
			expect(m.hauteur, 'hauteur d’un bouton de niveau').toBeGreaterThanOrEqual(28);
			expect(m.police, 'police d’un bouton de niveau').toBeGreaterThanOrEqual(12);
			expect(m.droite, 'bouton dans la fenêtre').toBeLessThanOrEqual(largeurFenetre);
		}
		// Les catégories de la boîte à outils : chacune se voit en entier, assez haute pour un doigt
		const cases = await page.locator('.blocklyToolboxCategory').evaluateAll((liste) =>
			liste.map((el) => {
				const boite = el.getBoundingClientRect();
				return { hauteur: boite.height, gauche: boite.left, droite: boite.right };
			})
		);
		expect(cases).toHaveLength(3);
		for (const c of cases) {
			expect(c.hauteur, 'hauteur d’une catégorie').toBeGreaterThanOrEqual(20);
			expect(c.gauche, 'catégorie dans la fenêtre').toBeGreaterThanOrEqual(0);
			expect(c.droite, 'catégorie dans la fenêtre').toBeLessThanOrEqual(largeurFenetre);
		}
		await expectNoHorizontalOverflow(page, 'tortue : niveaux');
	});

	test('#2742 — « 4e » : catégories Calcul et Variables en plus, plus de Python', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await choisirNiveau(page, '4e');
		await montrerOnglet(page, 'Blocs');
		const noms = await categories(page);
		expect(noms).toEqual(expect.arrayContaining(['Tortue', 'Calcul', 'Variables']));
		expect(noms).not.toContain('Math');
		await montrerOnglet(page, 'Tortue');
		await expect(page.getByText('Voir en Python')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Lancer' })).toBeEnabled();
	});

	test('#2742 — variable `n`, « mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ] » → hexagone de 6 segments', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await choisirNiveau(page, '4e');
		await montrerOnglet(page, 'Blocs');
		await creerVariable(page, 'n');
		expect(await nomsDeVariables(page)).toEqual(['n']);
		await chargerEtat(
			page,
			etatTortue('mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]', '4e')
		);
		await page.getByRole('button', { name: 'Lancer' }).click();
		await montrerOnglet(page, 'Tortue');
		await page.getByRole('button', { name: 'Tout de suite' }).click();
		await expect(page.locator(MESSAGE)).toHaveText('Tracé terminé : 6 segments.');

		// Un hexagone régulier de côté 3 : 6 traits de longueur 3, bout à bout, qui se referment,
		// dont les directions font 6 angles distincts
		const segments = await page.locator(TRACE).evaluateAll((lignes) =>
			lignes.map((ligne) => {
				const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((a) => Number(ligne.getAttribute(a)));
				return { x1, y1, x2, y2 };
			})
		);
		expect(segments).toHaveLength(6);
		const angles = new Set<number>();
		segments.forEach((s, i) => {
			expect(Math.hypot(s.x2 - s.x1, s.y2 - s.y1), `longueur du segment ${i + 1}`).toBeCloseTo(
				3,
				1
			);
			const suivant = segments[(i + 1) % 6];
			expect(
				Math.hypot(suivant.x1 - s.x2, suivant.y1 - s.y2),
				`segment ${i + 1} bout à bout`
			).toBeLessThan(0.05);
			angles.add(Math.round((Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI));
		});
		expect(angles.size, 'six directions distinctes').toBe(6);
		await page.screenshot({ path: `${SHOTS}/2742-hexagone-${projectName()}.png` });
	});

	test('#2742 — créer une variable `répéter` : refusée, message sous les blocs', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await choisirNiveau(page, '4e');
		await montrerOnglet(page, 'Blocs');
		await creerVariable(page, 'répéter');
		const refus = page.locator('.tortue-nom-refuse');
		await expect(refus).toBeVisible();
		expect(((await refus.textContent()) ?? '').trim().length).toBeGreaterThan(10);
		await expectRouge(refus, 'message de refus');
		expect(await nomsDeVariables(page)).toEqual([]);
		// Sous les blocs
		const boiteMessage = await refus.boundingBox();
		const espace = await page
			.getByRole('application', { name: 'Espace de travail Blockly' })
			.boundingBox();
		expect(boiteMessage && espace && boiteMessage.y >= espace.y + espace.height - 2).toBe(true);
	});

	test('#2742 — « 3e » : la catégorie Conditions apparaît', async ({ page }) => {
		await ouvrirTortue(page);
		await choisirNiveau(page, '4e');
		await montrerOnglet(page, 'Blocs');
		const noms4e = await categories(page);
		await choisirNiveau(page, '3e');
		const noms = await categories(page);
		expect(noms).toContain('Conditions');
		expect(noms).toEqual(expect.arrayContaining(['Tortue', 'Calcul', 'Variables']));
		expect(noms.length, '3e a au moins autant de catégories que 4e').toBeGreaterThanOrEqual(
			noms4e.length
		);
		expect(await contenuDeCategorie(page, 'Conditions')).toContain('alors');
	});

	test('#2742 — repasser en « base » avec des variables posées : « Lancer » refuse le bloc', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await choisirNiveau(page, '4e');
		await chargerEtat(
			page,
			etatTortue('mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]', '4e')
		);
		await choisirNiveau(page, 'base');
		expect(await typesDeBlocs(page)).toEqual(expect.arrayContaining(['variables_set']));
		await page.getByRole('button', { name: 'Lancer' }).click();
		await montrerOnglet(page, 'Tortue');
		const message = page.locator(MESSAGE);
		await expect(message).toContainText('Ce bloc n’est pas pris en charge');
		await expectRouge(message, 'message d’erreur');
		await expect(page.locator(TRACE)).toHaveCount(0);
	});
});

// ============================================================================
// #2746, #2755 — Questions tortue de 4e / 3e
// ============================================================================

test.describe('#2746 — Questions tortue de 4e / 3e', () => {
	/** La 1re variation de 25991652 (4-067), nombres figés : 6 traits, premier de 1, plus long de 1 */
	const SPIRALE = [
		'Fais tracer à la tortue la spirale dessinée en gris : $6$ traits, le premier mesure $1$ carreau et chaque trait est plus long de $1$ que le précédent.',
		'',
		'Utilise une variable **côté** : au plus $5$ blocs.',
		'',
		fence(
			'tortue',
			'niveau: 4e',
			'attendu: mettre côté à 1 ; répéter 6 [ avancer côté ; tourner à gauche 90 ; ajouter 1 à côté ]',
			'montrer: oui',
			'blocs: 5'
		)
	].join('\n');

	const SPIRALE_JUSTE =
		'mettre côté à 1 ; répéter 6 [ avancer côté ; tourner à gauche 90 ; ajouter 1 à côté ]';

	/** La même spirale sans variable : avancer 1, tourner, avancer 2, tourner… avancer 6 */
	const SPIRALE_SANS_VARIABLE = [1, 2, 3, 4, 5, 6]
		.map((n) => `avancer ${n}`)
		.join(' ; tourner à gauche 90 ; ');

	test('#2746 — le modèle réel 25991652 « Spirale avec une variable » : boîte à outils avec Calcul et Variables, compteur « Blocs : N / 5 ou 7 »', async ({
		page
	}) => {
		await ouvrirModeleReel(page, '25991652-9717-4890-bf23-68ee672a913b');
		const zone = carte(page);
		await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
		expect(await categories(page)).toEqual(
			expect.arrayContaining(['Tortue', 'Calcul', 'Variables'])
		);
		// Trois variations : 5 blocs au plus (spirale, spirale à compléter) ou 7 (escalier)
		await expect(zone.locator('[data-compteur-blocs]')).toHaveText(/^Blocs : \d+ \/ (5|7)$/);
		await expect(zone.getByText(/^Au plus (5|7) blocs$/)).toBeVisible();
	});

	test('#2746 — spirale : « Blocs : 0 / 5 », Calcul et Variables ; le programme à variable → Lancer : la spirale, Valider → juste', async ({
		page
	}) => {
		await ouvrirApercu(page, '2746 spirale', SPIRALE);
		const zone = await carteBlocsPrete(page, true);
		expect(await categories(page)).toEqual(expect.arrayContaining(['Calcul', 'Variables']));
		await expect(zone.locator('[data-compteur-blocs]')).toHaveText('Blocs : 0 / 5');

		await chargerEtat(page, etatTortue(SPIRALE_JUSTE, '4e'));
		await expect(zone.locator('[data-compteur-blocs]')).toHaveText('Blocs : 5 / 5');
		await lancerCarte(zone);
		// La spirale est dessinée dans le quadrillage : 6 traits, le dernier de 6
		await expect(zone.locator(TRACE)).toHaveCount(6);
		await expect(zone.getByText('Le tracé sort du quadrillage')).toHaveCount(0);
		await decor.validate(page);
		const corrigee = page.locator('.correction-card-wrapper .flip-front');
		await expect(corrigee).toBeVisible({ timeout: 30_000 });
		await expect(corrigee.getByTestId('global-verdict')).toContainText('Juste');
		await expect(corrigee.locator('[data-trace="eleve"]')).toHaveClass(/trace-juste/);
		await page.screenshot({ path: `${SHOTS}/2746-spirale-juste-${projectName()}.png` });
	});

	test('#2746 — la même spirale sans variable (avancer 1, 2, 3…) : faux, message du nombre de blocs ; copie corrigée « Ton programme » / « Un programme juste » avec les variables', async ({
		page
	}) => {
		await ouvrirApercu(page, '2746 sans variable', SPIRALE);
		const zone = await carteBlocsPrete(page, true);
		await chargerEtat(page, etatTortue(SPIRALE_SANS_VARIABLE, '4e'));
		// 6 « avancer » et 5 « tourner » = 11 blocs
		await expect(zone.locator('[data-compteur-blocs]')).toHaveText('Blocs : 11 / 5');
		await lancerCarte(zone);
		// Le dessin est le bon : seul le nombre de blocs est en cause
		await expect(zone.locator(TRACE)).toHaveCount(6);
		await decor.validate(page);
		const corrigee = page.locator('.correction-card-wrapper .flip-front');
		await expect(corrigee).toBeVisible({ timeout: 30_000 });
		await expect(corrigee.getByTestId('global-verdict')).toContainText('Faux');
		const texte = ((await corrigee.innerText()) ?? '').replace(/\s+/g, ' ');
		expect(texte).toContain('Ton programme utilise 11 blocs ; il en faut au plus 5.');
		expect(texte).toContain('Ton programme');
		expect(texte).toContain('Un programme juste');
		expect(texte).toContain(SPIRALE_JUSTE);
	});

	test('#2755 — le modèle réel d64ddd78 « Tracer une figure (3e) » : la catégorie Conditions est présente', async ({
		page
	}) => {
		await ouvrirModeleReel(page, 'd64ddd78-fd78-4e81-b41a-db25ce687111');
		const zone = carte(page);
		await expect(zone.locator('.blocklyToolboxCategory').first()).toBeVisible({ timeout: 30_000 });
		const noms = await categories(page);
		expect(noms).toContain('Conditions');
		expect(noms).toEqual(expect.arrayContaining(['Tortue', 'Calcul', 'Variables']));
		await expect(zone.locator('[data-compteur-blocs]')).toHaveText(/^Blocs : \d+ \/ (5|13)$/);
	});
});

// ============================================================================
// #2761 — Nombres de la tortue
// ============================================================================

test.describe('#2761 — Nombres de la tortue', () => {
	/** Lance le programme (niveau 4e) et saute à la fin de l'animation */
	async function lancerEtFinir(page: Page): Promise<void> {
		await page.getByRole('button', { name: 'Lancer' }).click();
		await montrerOnglet(page, 'Tortue');
		const tout = page.getByRole('button', { name: 'Tout de suite' });
		if (await tout.isEnabled()) await tout.click();
	}

	test('#2761 — « mettre n à 2,5 ; répéter n [ avancer 1 ] » : arrêt « Répéter : le nombre de fois vaut 2,5… », pas 3 tours', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await choisirNiveau(page, '4e');
		await chargerEtat(page, etatTortue('mettre n à 2,5 ; répéter n [ avancer 1 ]', '4e'));
		await lancerEtFinir(page);
		const message = page.locator(MESSAGE);
		await expect(message).toHaveText(
			'Répéter : le nombre de fois vaut 2,5, il faut un nombre entier (0, 1, 2…).'
		);
		await expectRouge(message, 'message d’arrêt');
		// Pas de tour du tout (en tout cas pas 3) : le tracé reste vide
		await expect(page.locator(TRACE)).toHaveCount(0);
	});

	test('#2761 — « mettre n à 0,1 × 30 ; répéter n [ avancer 1 ] » : 3 segments, pas d’arrêt', async ({
		page
	}) => {
		await ouvrirTortue(page);
		await choisirNiveau(page, '4e');
		await chargerEtat(page, etatTortue('mettre n à 0,1 × 30 ; répéter n [ avancer 1 ]', '4e'));
		await lancerEtFinir(page);
		await expect(page.locator(MESSAGE)).toHaveText('Tracé terminé : 3 segments.');
		await expect(page.locator(TRACE)).toHaveCount(3);
		await expect(page.getByText('il faut un nombre entier')).toHaveCount(0);
	});

	/** Crée un brouillon à bloc ```tortue (admin) et lit le refus que la génération de la question rend */
	async function refusDuBrouillon(page: Page, titre: string, lignes: string[]): Promise<string> {
		await ouvrirApercu(page, titre, ['Fais tracer.', '', fence('tortue', ...lignes)].join('\n'));
		await page.getByRole('button', { name: 'Générer', exact: true }).click();
		const alerte = page.getByText(/Case 1 \(programme tortue\)/).first();
		await expect(alerte).toBeVisible();
		return ((await alerte.innerText()) ?? '').replace(/\s+/g, ' ');
	}

	test('#2761 — modèle brouillon, bloc ```tortue : `attendu: avancer 1e2` → refus « « 1e2 » : écrire le nombre en entier (100). »', async ({
		page
	}) => {
		const refus = await refusDuBrouillon(page, '2761 exposant', ['attendu: avancer 1e2']);
		expect(refus).toContain('« 1e2 » : écrire le nombre en entier (100).');
	});

	test('#2761 — modèle brouillon, `niveau: 4e` et `attendu: répéter 2,5 [ avancer 1 ]` → refus « il faut un nombre entier de fois »', async ({
		page
	}) => {
		const refus = await refusDuBrouillon(page, '2761 repeter', [
			'niveau: 4e',
			'attendu: répéter 2,5 [ avancer 1 ]'
		]);
		expect(refus).toContain('il faut un nombre entier de fois');
	});
});
