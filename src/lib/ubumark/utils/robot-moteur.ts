/**
 * Moteur du robot (bloc ```robot)
 * ===============================
 *
 * Code en notation texte, déplacement case par case, code le plus court (chantier
 * `suite-fleches`, journal `docs/wip/suite-fleches-progress.md`).
 *
 * Notation d'un code :
 * - flèches : `→ → ↑` (espaces ou virgules) ; chaque flèche avance d'une case ;
 * - avance-pivote : `avance de 4, pivote à gauche, avance de 3` ; « avance de n » (1 à 9)
 *   avance de n cases dans le sens du robot, « pivote » tourne d'un quart de tour sur place.
 *
 * Aucune dépendance (ni Blockly, ni DOM) : lu par le parseur, le juge et l'écran.
 *
 * @module ubumark/utils/robot-moteur
 */

import {
	ROBOT_MAX_AVANCE,
	ROBOT_MAX_INSTRUCTIONS,
	ROBOT_MAX_VIRAGES,
	SENS,
	type Case,
	type Codage,
	type Instruction,
	type RobotScene,
	type Sens
} from '../types/robot';

// ============================================================================
// TYPES
// ============================================================================

export type LectureCode =
	{ ok: true; instructions: Instruction[] } | { ok: false; message: string };

/** Comment finit le déplacement */
export type FinRobot = 'arrivée' | 'ailleurs' | 'sortie' | 'interdite';

export interface Trajet {
	/** Cases occupées, départ compris, jusqu'à la dernière atteinte */
	chemin: Case[];
	/** Sens du robot à la fin (avance-pivote ; en flèches, le sens de la dernière flèche) */
	sens: Sens | null;
	fin: FinRobot;
	/** Case où le robot n'a pas pu entrer (sortie, interdite) ; null sinon */
	bute: Case | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const FLECHE_DE: Record<string, Sens> = { '↑': 'haut', '→': 'droite', '↓': 'bas', '←': 'gauche' };
const FLECHE_VERS: Record<Sens, string> = { haut: '↑', droite: '→', bas: '↓', gauche: '←' };

const PAS: Record<Sens, Case> = {
	haut: { col: 0, ligne: 1 },
	droite: { col: 1, ligne: 0 },
	bas: { col: 0, ligne: -1 },
	gauche: { col: -1, ligne: 0 }
};

const AVANCE = /^avance\s+de\s+(\d+)\.?$/i;
/** « à » ou « a » (sans accent, au clavier) */
const PIVOTE = /^pivote\s+[àa]\s+(gauche|droite)\.?$/i;

// ============================================================================
// NOTATION
// ============================================================================

const inconnue = (mot: string): LectureCode => ({
	ok: false,
	message: `Instruction inconnue : « ${mot} ».`
});

/** Lire un code ; vide = aucune instruction. Plus de 15 instructions : refusé. */
export function lireCode(brut: string, codage: Codage): LectureCode {
	// « à » décomposé (NFD) par certaines saisies : recomposé
	const texte = brut.normalize('NFC');
	const instructions: Instruction[] = [];
	if (codage === 'flèches') {
		// Flèches collées (`→→↑`) : une par caractère
		const mots = texte.replace(/[↑→↓←]/g, ' $& ').split(/[\s,]+/);
		for (const mot of mots.filter((m) => m !== '')) {
			const sens = FLECHE_DE[mot];
			if (sens === undefined) return inconnue(mot);
			instructions.push({ kind: 'flèche', sens });
		}
	} else {
		for (const brut of texte.split(',')) {
			const mot = brut.trim().replace(/\s+/g, ' ');
			if (mot === '') continue;
			const avance = AVANCE.exec(mot);
			const pivote = PIVOTE.exec(mot);
			if (avance) {
				const pas = Number(avance[1]);
				if (pas < 1 || pas > ROBOT_MAX_AVANCE) return inconnue(mot);
				instructions.push({ kind: 'avance', pas });
			} else if (pivote) {
				instructions.push({
					kind: 'pivote',
					cote: pivote[1].toLowerCase() === 'gauche' ? 'gauche' : 'droite'
				});
			} else {
				return inconnue(mot);
			}
		}
	}
	if (instructions.length > ROBOT_MAX_INSTRUCTIONS) {
		return { ok: false, message: `${ROBOT_MAX_INSTRUCTIONS} instructions au plus.` };
	}
	return { ok: true, instructions };
}

/** Écrire une instruction : `→`, `avance de 3`, `pivote à gauche` */
export function ecrireInstruction(instruction: Instruction): string {
	if (instruction.kind === 'flèche') return FLECHE_VERS[instruction.sens];
	if (instruction.kind === 'avance') return `avance de ${instruction.pas}`;
	return `pivote à ${instruction.cote}`;
}

/** Écrire un code dans la notation que `lireCode` relit */
export function ecrireCode(instructions: readonly Instruction[], codage: Codage): string {
	return instructions.map(ecrireInstruction).join(codage === 'flèches' ? ' ' : ', ');
}

// ============================================================================
// DÉPLACEMENT
// ============================================================================

const memeCase = (a: Case, b: Case) => a.col === b.col && a.ligne === b.ligne;

function tourner(sens: Sens, cote: 'gauche' | 'droite'): Sens {
	const i = SENS.indexOf(sens);
	return SENS[(i + (cote === 'droite' ? 1 : 3)) % 4];
}

/** La case est-elle libre (dans le quadrillage, pas grise) ? */
function obstacle(scene: RobotScene, c: Case): 'sortie' | 'interdite' | null {
	if (c.col < 1 || c.col > scene.colonnes || c.ligne < 1 || c.ligne > scene.lignes) return 'sortie';
	if (scene.interdites.some((g) => memeCase(g, c))) return 'interdite';
	return null;
}

/** Faire avancer le robot ; il s'arrête à la première case où il ne peut pas entrer. */
export function simuler(scene: RobotScene, instructions: readonly Instruction[]): Trajet {
	let ici = scene.depart;
	let sens = scene.sens;
	const chemin: Case[] = [ici];
	const pas = (vers: Sens): Trajet | null => {
		const suivante = { col: ici.col + PAS[vers].col, ligne: ici.ligne + PAS[vers].ligne };
		const bloque = obstacle(scene, suivante);
		if (bloque) return { chemin, sens, fin: bloque, bute: suivante };
		ici = suivante;
		chemin.push(ici);
		return null;
	};
	for (const instruction of instructions) {
		if (instruction.kind === 'pivote') {
			if (sens !== null) sens = tourner(sens, instruction.cote);
			continue;
		}
		if (instruction.kind === 'flèche') {
			sens = instruction.sens;
			const arret = pas(sens);
			if (arret) return arret;
			continue;
		}
		if (sens === null) continue;
		for (let k = 0; k < instruction.pas; k++) {
			const arret = pas(sens);
			if (arret) return arret;
		}
	}
	const arrive = scene.arrivee !== null && memeCase(ici, scene.arrivee);
	return { chemin, sens, fin: arrive ? 'arrivée' : 'ailleurs', bute: null };
}

/** Virages d'un code : changements de sens entre deux flèches, ou chaque « pivote » */
export function virages(instructions: readonly Instruction[]): number {
	let n = 0;
	let avant: Sens | null = null;
	for (const instruction of instructions) {
		if (instruction.kind === 'pivote') n++;
		if (instruction.kind === 'flèche') {
			if (avant !== null && avant !== instruction.sens) n++;
			avant = instruction.sens;
		}
	}
	return n;
}

// ============================================================================
// CODE LE PLUS COURT
// ============================================================================

interface Etat {
	c: Case;
	sens: Sens | null;
	virages: number;
	parent: Etat | null;
	instruction: Instruction | null;
}

const cle = (e: Etat) => `${e.c.col},${e.c.ligne},${e.sens ?? '-'},${e.virages}`;

/** Les coups possibles depuis un état (instruction, état suivant) */
function suivants(scene: RobotScene, e: Etat): Etat[] {
	const out: Etat[] = [];
	const vers = (c: Case, sens: Sens) => ({
		col: c.col + PAS[sens].col,
		ligne: c.ligne + PAS[sens].ligne
	});
	if (scene.codage === 'flèches') {
		for (const sens of SENS) {
			const c = vers(e.c, sens);
			if (obstacle(scene, c)) continue;
			const v = e.virages + (e.sens !== null && e.sens !== sens ? 1 : 0);
			out.push({ c, sens, virages: v, parent: e, instruction: { kind: 'flèche', sens } });
		}
		return out;
	}
	if (e.sens === null) return out;
	// La plus grande avance d'abord : à longueur égale, le corrigé dit « avance de 9, avance
	// de 2 » plutôt que « avance de 2, avance de 9 »
	const avances: Etat[] = [];
	let c = e.c;
	for (let pas = 1; pas <= ROBOT_MAX_AVANCE; pas++) {
		c = vers(c, e.sens);
		if (obstacle(scene, c)) break;
		avances.push({
			c,
			sens: e.sens,
			virages: e.virages,
			parent: e,
			instruction: { kind: 'avance', pas }
		});
	}
	out.push(...avances.reverse());
	for (const cote of ['gauche', 'droite'] as const) {
		out.push({
			c: e.c,
			sens: tourner(e.sens, cote),
			virages: e.virages + 1,
			parent: e,
			instruction: { kind: 'pivote', cote }
		});
	}
	return out;
}

/**
 * Un code le plus court du départ à l'arrivée (le moins de virages parmi les plus courts), de
 * 15 instructions et 4 virages au plus ; null s'il n'y en a pas (ou pas d'arrivée).
 */
export function plusCourtCode(scene: RobotScene): Instruction[] | null {
	const arrivee = scene.arrivee;
	if (arrivee === null || memeCase(arrivee, scene.depart)) return null;
	let couche: Etat[] = [
		{ c: scene.depart, sens: scene.sens, virages: 0, parent: null, instruction: null }
	];
	const vus = new Set(couche.map(cle));
	for (let longueur = 1; longueur <= ROBOT_MAX_INSTRUCTIONS; longueur++) {
		const prochaine: Etat[] = [];
		for (const e of couche) {
			for (const s of suivants(scene, e)) {
				if (s.virages > ROBOT_MAX_VIRAGES) continue;
				const k = cle(s);
				if (vus.has(k)) continue;
				vus.add(k);
				prochaine.push(s);
			}
		}
		const arrives = prochaine.filter((e) => memeCase(e.c, arrivee));
		if (arrives.length > 0) {
			let meilleur = arrives[0];
			for (const e of arrives) if (e.virages < meilleur.virages) meilleur = e;
			const code: Instruction[] = [];
			for (let e: Etat | null = meilleur; e?.instruction; e = e.parent) code.unshift(e.instruction);
			return code;
		}
		if (prochaine.length === 0) return null;
		couche = prochaine;
	}
	return null;
}
