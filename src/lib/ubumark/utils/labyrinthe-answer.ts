/**
 * Réponse d'un labyrinthe à parcourir (bloc ```labyrinthe, `parcourir: oui`)
 * ==========================================================================
 *
 * Réponse de l'élève : son chemin, case après case, `ligne,colonne` séparées d'une espace
 * (`2,1 2,2 3,2`). Réponse attendue (`expectedAnswer` de la case) : la grille, la ligne de
 * l'entrée, puis le bon chemin, séparés par ` | ` :
 *
 *   `6x4 2 | 2,1 2,2 3,2 3,3 3,4 3,5 3,6`
 *
 * Le juge suit la règle, pas un tracé : juste si le chemin part de l'entrée, va de case en
 * case voisine, ne passe que par des cases qui suivent la règle (celles du bon chemin, les
 * seules) et finit sur une sortie (la dernière colonne).
 *
 * @module ubumark/utils/labyrinthe-answer
 */

import type { Case, LabyrintheSpec } from '../types/labyrinthe';

// ============================================================================
// TYPES
// ============================================================================

export interface VerdictLabyrinthe {
	juste: boolean;
	/** Pourquoi c'est faux, pour l'élève ; absent pour un chemin vide ou une attente illisible */
	message?: string;
}

export interface LabyrintheAttendu {
	colonnes: number;
	lignes: number;
	entree: number;
	chemin: Case[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SEPARATEUR = ' | ';

export const LABYRINTHE_ENTREE = 'Le chemin ne part pas de l’entrée.';
export const LABYRINTHE_SAUT = 'Le chemin saute d’une case à une case qui n’est pas sa voisine.';
export const LABYRINTHE_INTRUS = 'Le chemin passe par un nombre qui ne suit pas la règle.';
export const LABYRINTHE_SORTIE = 'Le chemin n’arrive pas à une sortie.';

const CASE = /^(\d+),(\d+)$/;

// ============================================================================
// CHEMIN EN TEXTE
// ============================================================================

const cle = (c: Case) => `${c.ligne},${c.col}`;

/** Chemin en texte : `2,1 2,2 3,2` */
export function ecrireChemin(chemin: readonly Case[]): string {
	return chemin.map(cle).join(' ');
}

/** Lit un chemin écrit par `ecrireChemin` ; null s'il est illisible */
export function lireChemin(texte: string): Case[] | null {
	const mots = texte.trim().split(/\s+/).filter(Boolean);
	const chemin: Case[] = [];
	for (const mot of mots) {
		const m = CASE.exec(mot);
		if (!m) return null;
		chemin.push({ ligne: Number(m[1]), col: Number(m[2]) });
	}
	return chemin;
}

// ============================================================================
// RÉPONSE ATTENDUE
// ============================================================================

/** Réponse attendue d'une case labyrinthe : la grille, l'entrée et le bon chemin */
export function expectedLabyrintheAnswer(spec: LabyrintheSpec): string {
	return `${spec.colonnes}x${spec.lignes} ${spec.entree}${SEPARATEUR}${ecrireChemin(spec.chemin)}`;
}

/** Lit une réponse attendue ; null si elle n'a pas la forme écrite par `expectedLabyrintheAnswer` */
export function readExpectedLabyrintheAnswer(expected: string): LabyrintheAttendu | null {
	const at = expected.indexOf(SEPARATEUR);
	if (at < 0) return null;
	const tete = /^(\d+)x(\d+) (\d+)$/.exec(expected.slice(0, at));
	const chemin = lireChemin(expected.slice(at + SEPARATEUR.length));
	if (tete === null || chemin === null || chemin.length === 0) return null;
	return {
		colonnes: Number(tete[1]),
		lignes: Number(tete[2]),
		entree: Number(tete[3]),
		chemin
	};
}

// ============================================================================
// JUGE
// ============================================================================

const voisines = (a: Case, b: Case) => Math.abs(a.ligne - b.ligne) + Math.abs(a.col - b.col) === 1;

/**
 * Où un chemin cesse d'être juste : son rang (première case fautive) et pourquoi ; null s'il
 * est juste jusqu'au bout (sans dire s'il arrive à une sortie)
 */
export function premiereFaute(
	chemin: readonly Case[],
	attendu: LabyrintheAttendu
): { rang: number; message: string } | null {
	const bonnes = new Set(attendu.chemin.map(cle));
	for (let i = 0; i < chemin.length; i++) {
		const c = chemin[i];
		if (i === 0 && (c.col !== 1 || c.ligne !== attendu.entree)) {
			return { rang: 0, message: LABYRINTHE_ENTREE };
		}
		if (i > 0 && !voisines(chemin[i - 1], c)) return { rang: i, message: LABYRINTHE_SAUT };
		if (!bonnes.has(cle(c))) return { rang: i, message: LABYRINTHE_INTRUS };
	}
	return null;
}

/** Verdict du chemin de l'élève ; une réponse attendue illisible n'est jamais juste. */
export function labyrintheAnswerVerdict(userAnswer: string, expected: string): VerdictLabyrinthe {
	const attendu = readExpectedLabyrintheAnswer(expected);
	if (attendu === null) return { juste: false };
	const chemin = lireChemin(userAnswer);
	if (chemin === null || chemin.length === 0) return { juste: false };
	const faute = premiereFaute(chemin, attendu);
	if (faute !== null) return { juste: false, message: faute.message };
	if (chemin[chemin.length - 1].col !== attendu.colonnes) {
		return { juste: false, message: LABYRINTHE_SORTIE };
	}
	return { juste: true };
}

export function isLabyrintheAnswerCorrect(userAnswer: string, expected: string): boolean {
	return labyrintheAnswerVerdict(userAnswer, expected).juste;
}

/** Le bon chemin dit au corrigé : « Sortie 3 : 73 → 89 → 97 » (sorties numérotées de haut en bas) */
export function cheminDit(spec: LabyrintheSpec): string {
	const fin = spec.chemin[spec.chemin.length - 1];
	const nombres = spec.chemin.map((c) => spec.nombres[c.ligne - 1][c.col - 1]);
	return `Sortie ${fin.ligne} : ${nombres.join(' → ')}`;
}
