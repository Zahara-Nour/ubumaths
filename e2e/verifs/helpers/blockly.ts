import { expect, test, type Locator, type Page } from '@playwright/test';
import { texteVersEtatTortue } from '../../../src/lib/shared/blockly/tortue/niveaux';
import type { NiveauTortue } from '../../../src/lib/shared/blockly/tortue/interpreteur';
import { texteVersEtatCalcul } from '../../../src/lib/shared/blockly/calcul/notation';
import { Fingers } from './modele-brouillon';

/**
 * Outils des vérifications Blockly (tortue publique, questions tortue et calcul)
 * ==============================================================================
 *
 * Le serveur de dev ne montre pas son espace de travail Blockly à la page : pour poser un
 * programme sans glisser dix blocs (décor), on rouvre le module `blockly` déjà chargé par la
 * page (même adresse, donc même instance) et on charge l'état sérialisé dans l'espace de travail
 * principal. Réservé au serveur de DEV (adresse `…/node_modules/.vite/deps/blockly.js?v=…`).
 * Les vrais gestes (glisser un bloc de la boîte à outils, déplacer un bloc) passent par
 * `glisserBloc` / `deplacerBloc`, à la souris ou au doigt.
 */

// Types

export interface Point {
	x: number;
	y: number;
}

// Fonctions

/** Téléphone ou ordinateur (le projet du test en cours) */
export const estTactile = (): boolean => test.info().project.use.hasTouch === true;
/** Android : Chromium tactile, seul à savoir envoyer de vrais doigts (protocole CDP) */
export const estAndroid = (): boolean => test.info().project.name === 'android';

/**
 * L'état Blockly sérialisé d'un programme tortue écrit en notation texte (`répéter 4 [ … ]`) ;
 * au niveau 4e / 3e : variables (`mettre n à 6`), calculs et conditions
 */
export function etatTortue(texte: string, niveau: NiveauTortue = 'base'): unknown {
	const lu = texteVersEtatTortue(texte, niveau);
	if (!lu.ok) throw new Error(`programme tortue illisible : ${lu.message}`);
	return lu.etat;
}

/** L'état Blockly sérialisé d'un programme de calcul (`afficher nombre + 2`) */
export function etatCalcul(texte: string): unknown {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) throw new Error(`programme de calcul illisible : ${lu.message}`);
	return lu.etat;
}

/** Les adresses du module `blockly` demandées par chaque page (vues passer, voir `suivreBlockly`) */
const adressesVues = new WeakMap<Page, string>();

/**
 * À appeler AVANT la première navigation du test : note l'adresse du module `blockly` que la page
 * demande au serveur de dev (la mémoire de `performance` est bornée à 250 entrées et une page
 * chargée la sature ; le serveur ré-optimise ses dépendances et change l'adresse en cours de route)
 */
export function suivreBlockly(page: Page): void {
	page.on('request', (requete) => {
		if (/\/node_modules\/\.vite\/deps\/blockly\.js/.test(requete.url())) {
			adressesVues.set(page, requete.url());
		}
	});
}

function adresseBlockly(page: Page): string {
	const adresse = adressesVues.get(page);
	if (!adresse)
		throw new Error('adresse de blockly.js non vue : appeler suivreBlockly(page) avant goto');
	return adresse;
}

/**
 * Dans la page, l'espace de travail à l'écran (son cadre a une taille) : une page peut en monter
 * plusieurs (onglets de l'aperçu), `getMainWorkspace` rend le dernier créé, pas le visible
 */
const ESPACE_VISIBLE = `
	const tous = Blockly.Workspace.getAll().filter((w) => !w.isFlyout && !w.isMutator && w.getInjectionDiv);
	const visibles = tous.filter((w) => w.getInjectionDiv().getBoundingClientRect().width > 0);
	if (visibles.length !== 1) {
		throw new Error(visibles.length + ' espaces Blockly visibles sur ' + tous.length + ' (un seul attendu)');
	}
	return visibles[0];
`;

/** Charge un état sérialisé dans l'espace de travail visible de la page (remplace son contenu) */
export async function chargerEtat(page: Page, etat: unknown): Promise<void> {
	const adresse = adresseBlockly(page);
	await page.evaluate(
		async ({ state, url, code }) => {
			// `import()` dynamique écrit à la main : le compilateur des tests ne le transforme pas
			const importer = new Function('url', 'return import(url)') as (url: string) => Promise<{
				serialization: { workspaces: { load: (s: unknown, w: unknown) => void } };
			}>;
			const Blockly = await importer(url);
			const choisir = new Function('Blockly', code) as (b: unknown) => unknown;
			Blockly.serialization.workspaces.load(state, choisir(Blockly));
		},
		{ state: etat, url: adresse, code: ESPACE_VISIBLE }
	);
}

/** Les types de blocs de l'espace de travail visible (blocs d'ombre exclus) */
export async function typesDeBlocs(page: Page): Promise<string[]> {
	const adresse = adresseBlockly(page);
	return page.evaluate(
		async ({ url, code }) => {
			const importer = new Function('url', 'return import(url)') as (
				url: string
			) => Promise<unknown>;
			const Blockly = await importer(url);
			const choisir = new Function('Blockly', code) as (b: unknown) => {
				getAllBlocks: (ordonne: boolean) => { type: string; isShadow: () => boolean }[];
			};
			return choisir(Blockly)
				.getAllBlocks(false)
				.filter((bloc) => !bloc.isShadow())
				.map((bloc) => bloc.type);
		},
		{ url: adresse, code: ESPACE_VISIBLE }
	);
}

/** Les noms des variables de l'espace de travail visible (créées par « Créer une variable… ») */
export async function nomsDeVariables(page: Page): Promise<string[]> {
	const adresse = adresseBlockly(page);
	return page.evaluate(
		async ({ url, code }) => {
			const importer = new Function('url', 'return import(url)') as (
				url: string
			) => Promise<unknown>;
			const Blockly = await importer(url);
			const choisir = new Function('Blockly', code) as (b: unknown) => {
				getVariableMap: () => { getAllVariables: () => { getName: () => string }[] };
			};
			return choisir(Blockly)
				.getVariableMap()
				.getAllVariables()
				.map((variable) => variable.getName());
		},
		{ url: adresse, code: ESPACE_VISIBLE }
	);
}

/**
 * Crée une variable par le vrai geste : catégorie « Variables », bouton « Créer une variable… »,
 * nom écrit dans la boîte (au centre de l'écran), OK
 */
export async function creerVariable(page: Page, nom: string): Promise<void> {
	const bouton = page.getByText('Créer une variable…');
	// Le volet des variables reste ouvert après une création : un second clic sur la catégorie le fermerait
	if (!(await bouton.isVisible())) {
		await page
			.locator('.blocklyToolboxCategory')
			.filter({ hasText: /^\s*Variables\s*$/ })
			.first()
			.click();
	}
	await bouton.click();
	const boite = page.locator('dialog.blocklyDialog');
	await expect(boite).toBeVisible();
	await boite.locator('input').fill(nom);
	await boite.getByRole('button', { name: 'OK' }).click();
	await expect(boite).toBeHidden();
}

/** Le centre d'un lieu (boîte à l'écran) */
export async function centre(lieu: Locator): Promise<Point> {
	const boite = await lieu.boundingBox();
	if (!boite) throw new Error('lieu sans boîte');
	return { x: boite.x + boite.width / 2, y: boite.y + boite.height / 2 };
}

/** Un glisser de `de` vers `vers` : à la souris, ou au doigt (Android) */
export async function glisser(page: Page, de: Point, vers: Point): Promise<void> {
	if (estAndroid()) {
		await new Fingers(page).drag(de, { x: vers.x - de.x, y: vers.y - de.y });
		return;
	}
	await page.mouse.move(de.x, de.y);
	await page.mouse.down();
	await page.mouse.move(vers.x, vers.y, { steps: 14 });
	await page.mouse.up();
}

/**
 * Ouvre la catégorie de la boîte à outils (`categorie`) et glisse son bloc (`texte`, sous-chaîne
 * de son texte) vers (x ; y) de la page : un vrai geste de l'élève
 */
export async function glisserBloc(
	page: Page,
	categorie: string,
	texte: string,
	vers: Point
): Promise<void> {
	await page
		.locator('.blocklyToolboxCategory')
		.filter({ hasText: new RegExp(`^\\s*${categorie}\\s*$`) })
		.first()
		.click();
	const bloc = page
		.locator('.blocklyFlyout .blocklyBlockCanvas > g.blocklyDraggable')
		.filter({ hasText: texte })
		.first();
	await expect(bloc).toBeVisible();
	const boite = await bloc.boundingBox();
	if (!boite) throw new Error(`bloc « ${texte} » sans boîte`);
	// On saisit le bloc par son bord gauche (le texte), pas par un champ
	await glisser(page, { x: boite.x + 8, y: boite.y + boite.height / 2 }, vers);
}

/** Les blocs posés dans l'espace de travail (hors boîte à outils) : leur texte, de haut en bas */
export function blocsPoses(page: Page): Locator {
	return page.locator(
		'svg.blocklySvg > g.blocklyWorkspace > g.blocklyBlockCanvas > g.blocklyDraggable'
	);
}

/**
 * La couleur calculée d'une propriété (`color`, `stroke`, `border-color`…) en rouge / vert / bleu
 * (0 à 255), quel que soit le format CSS rendu (`rgb()`, `oklch()`, `color(srgb …)`) : le
 * navigateur la convertit lui-même en la peignant sur un pixel
 */
export async function couleurRgb(
	lieu: Locator,
	propriete = 'color'
): Promise<[number, number, number]> {
	return lieu.first().evaluate((el, prop) => {
		const css = getComputedStyle(el).getPropertyValue(prop);
		const toile = document.createElement('canvas');
		toile.width = 1;
		toile.height = 1;
		const contexte = toile.getContext('2d', { willReadFrequently: true });
		if (!contexte) throw new Error('canvas indisponible');
		contexte.fillStyle = css;
		contexte.fillRect(0, 0, 1, 1);
		const [r, g, b] = contexte.getImageData(0, 0, 1, 1).data;
		return [r, g, b] as [number, number, number];
	}, propriete);
}
