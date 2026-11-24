/**
 * Moteur du bloc ```labyrinthe
 * ============================
 *
 * - `lireRegle` / `regleDite` : la règle écrite par l'auteur (`premier`, `multiple de 3`,
 *   `chiffre des centièmes = 7`), et dite à l'élève.
 * - `suitLaRegle` : un nombre écrit (`12,374`, `43 512`) suit-il la règle ?
 * - `tirerLabyrinthe` : d'une graine, l'entrée, le chemin et les nombres. Le chemin va de
 *   l'entrée (colonne 1) à la dernière colonne, qu'il ne touche qu'à sa fin, et ne se touche
 *   jamais lui-même (deux cases non consécutives ne sont pas voisines) : ses cases sont les
 *   seules qui suivent la règle, il est donc le seul chemin juste. Les autres cases portent
 *   des intrus choisis pour tromper (premier : impairs qui ne finissent pas par 5 ; multiple :
 *   à 1 ou 2 d'un multiple ; chiffre d'un rang : le chiffre cherché à un autre rang).
 *
 * Sans dépendance à l'écran : le parseur, le juge, l'écran et le PDF le partagent.
 *
 * @module ubumark/utils/labyrinthe-moteur
 */

import { createRandomSource, randomInt, shuffled, type RandomSource } from '#lib/utils/random.ts';
import {
	LABYRINTHE_MAX_DIVISEUR,
	LABYRINTHE_MIN_DIVISEUR,
	RANGS,
	positionDuRang,
	type Case,
	type Labyrinthe,
	type Rang,
	type Regle
} from '../types/labyrinthe';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Espace fine insécable des grands nombres */
const ESPACE_FINE = ' ';

/** Essais d'un parcours de chemin avant de viser plus court */
const BUDGET_PARCOURS = 4000;

/** Essais pour tirer un nombre qui n'est pas déjà dans la grille */
const ESSAIS_DISTINCT = 30;

const sansAccent = (texte: string) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '');

// ============================================================================
// RÈGLE
// ============================================================================

export type RegleLue = { ok: true; regle: Regle } | { ok: false; message: string };

/** Lit la règle d'un bloc ; accents, majuscules et pluriels tolérés */
export function lireRegle(texte: string): RegleLue {
	const t = sansAccent(texte.trim().toLowerCase()).replace(/\s+/g, ' ');
	if (/^(nombres? )?premiers?$/.test(t)) return { ok: true, regle: { kind: 'premier' } };

	const multiple = /^multiples? de (\d+)$/.exec(t);
	if (multiple) {
		const diviseur = Number(multiple[1]);
		if (diviseur < LABYRINTHE_MIN_DIVISEUR || diviseur > LABYRINTHE_MAX_DIVISEUR) {
			return {
				ok: false,
				message: `règle « ${texte.trim()} » : multiple de ${LABYRINTHE_MIN_DIVISEUR} à ${LABYRINTHE_MAX_DIVISEUR}`
			};
		}
		return { ok: true, regle: { kind: 'multiple', diviseur } };
	}

	const chiffre = /^chiffre des (.+?) ?= ?(\d+)$/.exec(t);
	if (chiffre) {
		const rang = RANGS.find((r) => sansAccent(r) === chiffre[1]);
		if (rang === undefined) {
			return {
				ok: false,
				message: `règle « ${texte.trim()} » : rang inconnu (${RANGS.join(', ')})`
			};
		}
		const c = Number(chiffre[2]);
		if (c > 9) {
			return { ok: false, message: `règle « ${texte.trim()} » : un chiffre de 0 à 9` };
		}
		return { ok: true, regle: { kind: 'chiffre', rang, chiffre: c } };
	}

	return {
		ok: false,
		message: `règle « ${texte.trim()} » inconnue (premier, multiple de 3, chiffre des centièmes = 7)`
	};
}

/** La règle dite à l'élève : « nombres premiers », « multiples de 3 »… */
export function regleDite(regle: Regle): string {
	if (regle.kind === 'premier') return 'nombres premiers';
	if (regle.kind === 'multiple') return `multiples de ${regle.diviseur}`;
	return `nombres dont le chiffre des ${regle.rang} est ${regle.chiffre}`;
}

function estPremier(n: number): boolean {
	if (!Number.isInteger(n) || n < 2) return false;
	for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
	return true;
}

/** Chiffre d'un nombre écrit à une position (0 = unités, -1 = dixièmes…) ; 0 hors du nombre */
function chiffreA(texte: string, position: number): number {
	const [entier, decimales = ''] = texte.split(',');
	const chiffre = position >= 0 ? entier[entier.length - 1 - position] : decimales[-position - 1];
	return chiffre === undefined ? 0 : Number(chiffre);
}

/** Un nombre écrit (`12,374`, `43 512`) suit-il la règle ? */
export function suitLaRegle(regle: Regle, nombre: string): boolean {
	// \s couvre les espaces insécables et fines des grands nombres
	const texte = nombre.replace(/\s/g, '');
	if (regle.kind === 'chiffre')
		return chiffreA(texte, positionDuRang(regle.rang)) === regle.chiffre;
	const n = Number(texte.replace(',', '.'));
	if (regle.kind === 'premier') return estPremier(n);
	return Number.isInteger(n) && n % regle.diviseur === 0;
}

// ============================================================================
// NOMBRES
// ============================================================================

/** Un nombre écrit d'après ses chiffres : virgule, espaces fines dès 5 chiffres entiers */
export function ecrireNombre(entier: readonly number[], decimales: readonly number[]): string {
	let partie = entier.join('');
	if (partie.length >= 5) partie = partie.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
	return decimales.length === 0 ? partie : `${partie},${decimales.join('')}`;
}

/**
 * Le plus long des nombres qu'une règle peut tirer, écrit comme dans la grille : il fixe la
 * largeur des cases (premier : jusqu'à 200 ; multiple de d : jusqu'à max(100, 20 d) ; chiffre :
 * la forme du rang)
 */
export function nombreLePlusLong(regle: Regle): string {
	if (regle.kind === 'premier') return '199';
	if (regle.kind === 'multiple') return String(Math.max(100, 20 * regle.diviseur));
	const forme = formeChiffre(regle.rang, regle.chiffre);
	const chiffres = Array.from({ length: forme.entiers + forme.decimales }, (_, i) => (i + 1) % 10);
	return ecrireNombre(chiffres.slice(0, forme.entiers), chiffres.slice(forme.entiers));
}

/**
 * Colonnes qui tiennent sur un téléphone de 375 px de large (iPhone SE), dans la carte d'une
 * question, d'après la longueur des nombres. Mesuré le 2026-11-24 avec des cases d'au moins
 * 34 px (`LabyrintheGrille.svelte`) : 7 colonnes de 3 caractères, 5 de 4 à 6, 4 de 7.
 */
export function colonnesSurTelephone(regle: Regle): number {
	const longueur = nombreLePlusLong(regle).length;
	if (longueur <= 3) return 7;
	if (longueur <= 6) return 5;
	return 4;
}

/** Tire `combien` éléments d'une réserve, sans répétition tant qu'elle suffit */
function piocher<T>(reserve: readonly T[], combien: number, random: RandomSource): T[] {
	const tirage: T[] = [];
	while (tirage.length < combien && reserve.length > 0) {
		tirage.push(...shuffled(reserve, random).slice(0, combien - tirage.length));
	}
	return tirage;
}

const entre = (min: number, max: number) =>
	Array.from({ length: max - min + 1 }, (_, i) => min + i);

/** Premier : les premiers, et des impairs non premiers qui ne finissent pas par 5 */
function nombresPremier(bons: number, intrus: number, random: RandomSource) {
	const reserves = (max: number) => ({
		bons: entre(2, max).filter(estPremier),
		intrus: entre(9, max).filter((n) => n % 2 === 1 && n % 10 !== 5 && !estPremier(n))
	});
	let r = reserves(100);
	if (r.bons.length < bons || r.intrus.length < intrus) r = reserves(200);
	return {
		bons: piocher(r.bons, bons, random).map(String),
		intrus: piocher(r.intrus, intrus, random).map(String)
	};
}

/** Multiple de d : des multiples, et des nombres à 1 ou 2 d'un multiple */
function nombresMultiple(d: number, bons: number, intrus: number, random: RandomSource) {
	const max = Math.max(100, 20 * d);
	const ecart = (n: number) => Math.min(n % d, d - (n % d));
	return {
		bons: piocher(
			entre(d, max).filter((n) => n % d === 0),
			bons,
			random
		).map(String),
		intrus: piocher(
			entre(d + 1, max).filter((n) => n % d !== 0 && ecart(n) <= 2),
			intrus,
			random
		).map(String)
	};
}

/** Forme des nombres d'une règle « chiffre des … » : chiffres de la partie entière et décimales */
function formeChiffre(rang: Rang, chiffre: number): { entiers: number; decimales: number } {
	const position = positionDuRang(rang);
	if (position >= 0) return { entiers: Math.max(3, position + 2), decimales: 0 };
	let decimales = Math.max(3, -position);
	// Un 0 au dernier rang ne s'écrirait pas : une décimale de plus
	if (chiffre === 0 && decimales === -position) decimales += 1;
	return { entiers: 2, decimales };
}

/**
 * Un nombre de la forme, son chiffre à `position` imposé, un autre rang portant `ailleurs`
 * (intrus). Premier chiffre et dernière décimale jamais nuls.
 */
function nombreChiffre(
	forme: { entiers: number; decimales: number },
	position: number,
	ici: number,
	ailleurs: number | null,
	random: RandomSource
): string {
	const positions = [
		...entre(0, forme.entiers - 1).reverse(),
		...entre(1, forme.decimales).map((k) => -k)
	];
	const tete = forme.entiers - 1;
	const queue = forme.decimales > 0 ? -forme.decimales : null;
	const nonNul = (p: number) => p === tete || p === queue;
	const chiffres = new Map<number, number>();
	for (const p of positions) chiffres.set(p, randomInt(nonNul(p) ? 1 : 0, 9, random));
	chiffres.set(position, ici);
	if (ailleurs !== null) {
		const libres = positions.filter((p) => p !== position && !(ailleurs === 0 && nonNul(p)));
		chiffres.set(libres[randomInt(0, libres.length - 1, random)], ailleurs);
	}
	const lire = (p: number) => chiffres.get(p) ?? 0;
	return ecrireNombre(
		entre(0, forme.entiers - 1)
			.reverse()
			.map(lire),
		entre(1, forme.decimales).map((k) => lire(-k))
	);
}

function nombresChiffre(
	rang: Rang,
	chiffre: number,
	bons: number,
	intrus: number,
	random: RandomSource
) {
	const forme = formeChiffre(rang, chiffre);
	const position = positionDuRang(rang);
	const tete = forme.entiers - 1;
	const queue = forme.decimales > 0 ? -forme.decimales : null;
	const autresChiffres = entre(0, 9).filter(
		(c) => c !== chiffre && !(c === 0 && (position === tete || position === queue))
	);
	const vus = new Set<string>();
	const distinct = (tirer: () => string) => {
		let nombre = tirer();
		for (let essai = 0; essai < ESSAIS_DISTINCT && vus.has(nombre); essai++) nombre = tirer();
		vus.add(nombre);
		return nombre;
	};
	return {
		bons: Array.from({ length: bons }, () =>
			distinct(() => nombreChiffre(forme, position, chiffre, null, random))
		),
		intrus: Array.from({ length: intrus }, () =>
			distinct(() =>
				nombreChiffre(
					forme,
					position,
					autresChiffres[randomInt(0, autresChiffres.length - 1, random)],
					chiffre,
					random
				)
			)
		)
	};
}

// ============================================================================
// CHEMIN
// ============================================================================

const cle = (c: Case) => `${c.ligne},${c.col}`;

const voisinesDe = (c: Case, colonnes: number, lignes: number): Case[] =>
	[
		{ ligne: c.ligne - 1, col: c.col },
		{ ligne: c.ligne + 1, col: c.col },
		{ ligne: c.ligne, col: c.col - 1 },
		{ ligne: c.ligne, col: c.col + 1 }
	].filter((v) => v.ligne >= 1 && v.ligne <= lignes && v.col >= 1 && v.col <= colonnes);

/**
 * Un chemin de `depart` à la dernière colonne, de `longueurMin` cases au moins, qui ne se
 * touche pas ; null si le parcours (au hasard, borné) n'en trouve pas.
 */
function parcourir(
	depart: Case,
	colonnes: number,
	lignes: number,
	longueurMin: number,
	random: RandomSource
): Case[] | null {
	const chemin: Case[] = [depart];
	const pris = new Set([cle(depart)]);
	let budget = BUDGET_PARCOURS;

	const avancer = (): boolean => {
		if (budget-- <= 0) return false;
		const ici = chemin[chemin.length - 1];
		for (const v of shuffled(voisinesDe(ici, colonnes, lignes), random)) {
			if (pris.has(cle(v))) continue;
			// Ne touche aucune case du chemin, sauf celle d'où il vient
			const touche = voisinesDe(v, colonnes, lignes).some(
				(w) => pris.has(cle(w)) && cle(w) !== cle(ici)
			);
			if (touche) continue;
			if (v.col === colonnes) {
				if (chemin.length + 1 < longueurMin) continue;
				chemin.push(v);
				return true;
			}
			chemin.push(v);
			pris.add(cle(v));
			if (avancer()) return true;
			chemin.pop();
			pris.delete(cle(v));
			if (budget <= 0) return false;
		}
		return false;
	};

	return avancer() ? chemin : null;
}

function tirerChemin(colonnes: number, lignes: number, random: RandomSource) {
	const entree = randomInt(1, lignes, random);
	const depart = { ligne: entree, col: 1 };
	// Viser un chemin qui serpente, puis plus court si la grille n'en a pas la place
	const vise = colonnes + (lignes - 1) + Math.floor(colonnes / 2);
	for (let longueurMin = vise; longueurMin > colonnes; longueurMin--) {
		const chemin = parcourir(depart, colonnes, lignes, longueurMin, random);
		if (chemin !== null) return { entree, chemin };
	}
	// Toujours possible : tout droit
	return {
		entree,
		chemin: entre(1, colonnes).map((col) => ({ ligne: entree, col }))
	};
}

// ============================================================================
// LABYRINTHE
// ============================================================================

/**
 * Le labyrinthe d'une graine : même graine, même labyrinthe.
 *
 * ⚠️ Seule la graine est gardée dans l'énoncé d'une instance, alors que le juge lit le chemin écrit
 * dans la réponse attendue : toute modification du tirage (ici, `piocher`, `utils/random.ts`)
 * redessinerait une autre grille sur les copies existantes. Test « golden » :
 * `labyrinthe-moteur.test.ts`.
 */
export function tirerLabyrinthe(
	colonnes: number,
	lignes: number,
	regle: Regle,
	graine: number
): Labyrinthe {
	const random = createRandomSource(graine);
	const { entree, chemin } = tirerChemin(colonnes, lignes, random);
	const bons = chemin.length;
	const intrus = colonnes * lignes - bons;
	const tirage =
		regle.kind === 'premier'
			? nombresPremier(bons, intrus, random)
			: regle.kind === 'multiple'
				? nombresMultiple(regle.diviseur, bons, intrus, random)
				: nombresChiffre(regle.rang, regle.chiffre, bons, intrus, random);

	const surLeChemin = new Map(chemin.map((c, i) => [cle(c), i]));
	let k = 0;
	const nombres = entre(1, lignes).map((ligne) =>
		entre(1, colonnes).map((col) => {
			const i = surLeChemin.get(cle({ ligne, col }));
			return i === undefined ? tirage.intrus[k++] : tirage.bons[i];
		})
	);
	return { entree, nombres, chemin };
}
