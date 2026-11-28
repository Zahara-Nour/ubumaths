/**
 * Réponse d'une grille à contraintes (bloc ```yohaku)
 * ===================================================
 *
 * Réponse de l'élève : ce qu'il a écrit dans les cases à remplir, en LaTeX (MathLive), dans
 * l'ordre de lecture (ligne par ligne, de gauche à droite), en tableau JSON :
 *
 *   `["x+2","x+3","2x+1"]`
 *
 * Réponse attendue (`expectedAnswer` de la case) : l'opération, la solution de l'auteur en
 * LaTeX (chaque case, celles à remplir marquées) et les totaux, en JSON :
 *
 *   `{"operation":"produit","cases":[["x + 2","x + 3"],["2 x + 1","x + 1"]],"remplir":[[true,true],[true,false]],"lignes":[…],"colonnes":[…]}`
 *
 * Le juge suit les contraintes, pas la solution : juste si chaque ligne et chaque colonne
 * donne son total (équivalence de mathAST). Plusieurs remplissages sont justes.
 *
 * @module ubumark/utils/yohaku-answer
 */

import { areEquivalent } from '#lib/math/index.ts';
import { calculLatex } from './yohaku-moteur';
import { YOHAKU_TAILLE, type YohakuOperation, type YohakuSpec } from '../types/yohaku';

// ============================================================================
// TYPES
// ============================================================================

export interface YohakuAttendu {
	operation: YohakuOperation;
	/** LaTeX de la solution de l'auteur, case par case */
	cases: string[][];
	remplir: boolean[][];
	/** Totaux en LaTeX */
	lignes: string[];
	colonnes: string[];
}

export interface VerdictYohaku {
	juste: boolean;
	/** Pourquoi c'est faux, pour l'élève ; absent pour une attente illisible */
	message?: string;
	/** Lignes fausses (0 = en haut) et colonnes fausses (0 = à gauche), pour les marquer */
	lignesFausses: number[];
	colonnesFausses: number[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const YOHAKU_INCOMPLET = 'Remplis toutes les cases.';
export const YOHAKU_ILLISIBLE = 'Une case ne se lit pas : vérifie ce que tu as écrit.';

/** Temps donné à une équivalence (comme une case d'expression) */
const TIMEOUT_MS = 500;

const ORDINAUX = ['1re', '2e'];

// ============================================================================
// RÉPONSE ATTENDUE
// ============================================================================

/** Réponse attendue d'une grille à remplir : l'opération, la solution, les totaux */
export function expectedYohakuAnswer(spec: YohakuSpec): string {
	const attendu: YohakuAttendu = {
		operation: spec.operation,
		cases: spec.cases.map((l) => l.map((c) => c.latex)),
		remplir: spec.cases.map((l) => l.map((c) => c.aRemplir)),
		lignes: spec.lignes,
		colonnes: spec.colonnes
	};
	return JSON.stringify(attendu);
}

const estGrille = <T>(v: unknown, garde: (x: unknown) => x is T): v is T[][] =>
	Array.isArray(v) &&
	v.length === YOHAKU_TAILLE &&
	v.every((l) => Array.isArray(l) && l.length === YOHAKU_TAILLE && l.every(garde));

const estTexte = (x: unknown): x is string => typeof x === 'string';
const estBooleen = (x: unknown): x is boolean => typeof x === 'boolean';
const estPaire = (v: unknown): v is string[] =>
	Array.isArray(v) && v.length === YOHAKU_TAILLE && v.every(estTexte);

/** Lit une réponse attendue ; null si elle n'a pas la forme écrite par `expectedYohakuAnswer` */
export function readExpectedYohakuAnswer(expected: string): YohakuAttendu | null {
	let lu: unknown;
	try {
		lu = JSON.parse(expected);
	} catch {
		return null;
	}
	if (typeof lu !== 'object' || lu === null) return null;
	const o = lu as Record<string, unknown>;
	if (o.operation !== 'somme' && o.operation !== 'produit') return null;
	if (!estGrille(o.cases, estTexte) || !estGrille(o.remplir, estBooleen)) return null;
	if (!estPaire(o.lignes) || !estPaire(o.colonnes)) return null;
	return {
		operation: o.operation,
		cases: o.cases,
		remplir: o.remplir,
		lignes: o.lignes,
		colonnes: o.colonnes
	};
}

/** Nombre de cases à remplir */
export function casesARemplir(attendu: Pick<YohakuAttendu, 'remplir'>): number {
	return attendu.remplir.flat().filter(Boolean).length;
}

/** Réponse juste à donner en exemple : la solution de l'auteur, cases à remplir seulement */
export function yohakuSolutionAnswer(attendu: YohakuAttendu): string {
	return ecrireReponse(attendu.cases.flat().filter((_, i) => attendu.remplir.flat()[i]));
}

// ============================================================================
// RÉPONSE DE L'ÉLÈVE
// ============================================================================

/** Réponse en texte : `["x+2","x+3"]` */
export function ecrireReponse(valeurs: readonly string[]): string {
	return JSON.stringify(valeurs);
}

/** Lit une réponse écrite par `ecrireReponse` ; null si elle est illisible */
export function lireReponse(texte: string): string[] | null {
	if (texte.trim() === '') return [];
	let lu: unknown;
	try {
		lu = JSON.parse(texte);
	} catch {
		return null;
	}
	return Array.isArray(lu) && lu.every(estTexte) ? lu : null;
}

/** La grille de l'élève : ses cases à remplir mises à leur place, les cases données gardées */
export function grilleEleve(attendu: YohakuAttendu, valeurs: readonly string[]): string[][] {
	let k = 0;
	return attendu.cases.map((ligne, l) =>
		ligne.map((solution, c) => (attendu.remplir[l][c] ? (valeurs[k++] ?? '') : solution))
	);
}

// ============================================================================
// JUGE
// ============================================================================

function message(op: YohakuOperation, lignes: number[], colonnes: number[]): string {
	const quoi = op === 'somme' ? 'la bonne somme' : 'le bon produit';
	const noms = [
		...lignes.map((l) => `la ${ORDINAUX[l]} ligne`),
		...colonnes.map((c) => `la ${ORDINAUX[c]} colonne`)
	];
	const sujet =
		noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
	const verbe = noms.length === 1 ? 'donne' : 'donnent';
	const sujetMaj = sujet.charAt(0).toUpperCase() + sujet.slice(1);
	return `${sujetMaj} ne ${verbe} pas ${quoi}.`;
}

const equivalent = (a: string, b: string): boolean => {
	try {
		return areEquivalent(a, b, { timeoutMs: TIMEOUT_MS });
	} catch {
		return false;
	}
};

/** Verdict de la grille de l'élève ; une réponse attendue illisible n'est jamais juste. */
export function yohakuAnswerVerdict(userAnswer: string, expected: string): VerdictYohaku {
	const rien = { lignesFausses: [], colonnesFausses: [] };
	const attendu = readExpectedYohakuAnswer(expected);
	if (attendu === null) return { juste: false, ...rien };
	const valeurs = lireReponse(userAnswer);
	if (valeurs === null) return { juste: false, message: YOHAKU_ILLISIBLE, ...rien };
	const n = casesARemplir(attendu);
	if (valeurs.length !== n || valeurs.some((v) => v.trim() === '')) {
		return { juste: false, message: YOHAKU_INCOMPLET, ...rien };
	}
	const g = grilleEleve(attendu, valeurs);
	const op = attendu.operation;
	const lignesFausses = [0, 1].filter(
		(l) => !equivalent(calculLatex(op, g[l][0], g[l][1]), attendu.lignes[l])
	);
	const colonnesFausses = [0, 1].filter(
		(c) => !equivalent(calculLatex(op, g[0][c], g[1][c]), attendu.colonnes[c])
	);
	if (lignesFausses.length === 0 && colonnesFausses.length === 0) {
		return { juste: true, ...rien };
	}
	return {
		juste: false,
		message: message(op, lignesFausses, colonnesFausses),
		lignesFausses,
		colonnesFausses
	};
}

export function isYohakuAnswerCorrect(userAnswer: string, expected: string): boolean {
	return yohakuAnswerVerdict(userAnswer, expected).juste;
}
