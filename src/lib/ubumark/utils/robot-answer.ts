/**
 * Réponse d'un robot à produire (bloc ```robot, `produire: oui`)
 * ==============================================================
 *
 * Réponse de l'élève : son code, en notation texte (`robot-moteur.ts`). Réponse attendue
 * (`expectedAnswer` de la case) : la scène, puis un code le plus court, séparés par ` | ` :
 *
 *   `flèches 8x5 2,1 6,4 4,1 4,2 | → → → → ↑ ↑ ↑`
 *   `avance-pivote 8x5 2,1,droite 6,4 | avance de 4, pivote à gauche, avance de 3`
 *
 * (codage, quadrillage, départ, arrivée, puis les cases grises). Le juge rejoue le code de
 * l'élève sur la scène : tout code qui finit sur l'arrivée est juste.
 *
 * @module ubumark/utils/robot-answer
 */

import { CODAGES, SENS, type Case, type RobotScene } from '../types/robot';
import { ecrireCode, lireCode, simuler } from './robot-moteur';
import type { Instruction } from '../types/robot';

// ============================================================================
// TYPES
// ============================================================================

export interface VerdictRobot {
	juste: boolean;
	/** Pourquoi c'est faux, pour l'élève ; absent pour un code vide ou une attente illisible */
	message?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SEPARATEUR = ' | ';

export const ROBOT_SORTIE = 'Le robot sort du quadrillage.';
export const ROBOT_INTERDITE = 'Le robot bute sur une case grise.';
export const ROBOT_AILLEURS = 'Le robot n’arrive pas sur la case verte.';

const CASE = /^(\d+),(\d+)$/;

// ============================================================================
// SCÈNE EN TEXTE
// ============================================================================

const caseTexte = (c: Case) => `${c.col},${c.ligne}`;

function lireCase(mot: string | undefined): Case | null {
	const m = CASE.exec(mot ?? '');
	return m ? { col: Number(m[1]), ligne: Number(m[2]) } : null;
}

/** Réponse attendue d'une case robot : la scène et un code juste */
export function expectedRobotAnswer(scene: RobotScene, solution: readonly Instruction[]): string {
	if (scene.arrivee === null) throw new Error('robot à produire sans arrivée');
	const depart = caseTexte(scene.depart) + (scene.sens ? `,${scene.sens}` : '');
	const mots = [
		scene.codage,
		`${scene.colonnes}x${scene.lignes}`,
		depart,
		caseTexte(scene.arrivee),
		...scene.interdites.map(caseTexte)
	];
	return `${mots.join(' ')}${SEPARATEUR}${ecrireCode(solution, scene.codage)}`;
}

/** Lit une réponse attendue ; null si elle n'a pas la forme écrite par `expectedRobotAnswer`. */
export function readExpectedRobotAnswer(
	expected: string
): { scene: RobotScene; solution: string } | null {
	const at = expected.indexOf(SEPARATEUR);
	if (at < 0) return null;
	const [codageMot, taille, departMot, arriveeMot, ...grises] = expected.slice(0, at).split(' ');
	const codage = CODAGES.find((c) => c === codageMot);
	const dims = /^(\d+)x(\d+)$/.exec(taille ?? '');
	if (codage === undefined || dims === null) return null;
	const [departCase, sensMot] = (() => {
		const parts = (departMot ?? '').split(',');
		return [lireCase(parts.slice(0, 2).join(',')), parts[2]] as const;
	})();
	const sens = sensMot === undefined ? null : (SENS.find((s) => s === sensMot) ?? undefined);
	const arrivee = lireCase(arriveeMot);
	const interdites = grises.map(lireCase);
	if (departCase === null || sens === undefined || arrivee === null) return null;
	if (interdites.some((c) => c === null)) return null;
	if ((codage === 'avance-pivote') !== (sens !== null)) return null;
	return {
		scene: {
			codage,
			colonnes: Number(dims[1]),
			lignes: Number(dims[2]),
			depart: departCase,
			sens,
			arrivee,
			interdites: interdites as Case[]
		},
		solution: expected.slice(at + SEPARATEUR.length)
	};
}

// ============================================================================
// JUGE
// ============================================================================

/** Verdict du code de l'élève ; une réponse attendue illisible n'est jamais juste. */
export function robotAnswerVerdict(userAnswer: string, expected: string): VerdictRobot {
	const lu = readExpectedRobotAnswer(expected);
	if (lu === null) return { juste: false };
	const code = lireCode(userAnswer, lu.scene.codage);
	if (!code.ok) return { juste: false, message: code.message };
	if (code.instructions.length === 0) return { juste: false };
	const trajet = simuler(lu.scene, code.instructions);
	if (trajet.fin === 'arrivée') return { juste: true };
	if (trajet.fin === 'sortie') return { juste: false, message: ROBOT_SORTIE };
	if (trajet.fin === 'interdite') return { juste: false, message: ROBOT_INTERDITE };
	return { juste: false, message: ROBOT_AILLEURS };
}

export function isRobotAnswerCorrect(userAnswer: string, expected: string): boolean {
	return robotAnswerVerdict(userAnswer, expected).juste;
}
