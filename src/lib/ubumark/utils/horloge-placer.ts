/**
 * Horloge à placer — aiguilles de l'élève, réponse et jugement
 * ============================================================
 *
 * L'élève pose les DEUX aiguilles, indépendantes (pas de remontoir : l'erreur
 * « petite aiguille pile sur le 9 à 9 h 45 » reste possible), chacune sur l'un
 * des 60 crans du cadran (chantier `docs/wip/reponses-a-placer-progress.md`
 * § 13, 14).
 *
 * - Réponse de la case : `"47 25"` (cran de la petite aiguille, puis de la
 *   grande ; `-` pour une aiguille pas posée ; `''` sans aiguille posée).
 * - Réponse attendue : l'heure sur le cadran de 12, `"9 h 25"` (`timeText`).
 * - Lecture (`readHands`) : la grande aiguille donne la minute ; la petite doit
 *   être pile sur l'heure si minutes = 0, strictement entre deux heures sinon ;
 *   le juge accepte aussi le cran de sa vraie place (`trueHourTick`).
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/horloge-placer
 */

import type { HorlogeTime } from '../types/horloge';

// Types

/** Crans des deux aiguilles (0 = le 12, 5 = le 1…) ; null : aiguille pas posée */
export interface HorlogeHands {
	hour: number | null;
	minute: number | null;
}

// Constantes

/** Crans d'un tour de cadran : un par minute */
export const HAND_TICKS = 60;

/** Crans entre deux heures */
const TICKS_PER_HOUR = HAND_TICKS / 12;

const ANSWER_REGEX = /^(\d+|-) (\d+|-)$/;
const TIME_REGEX = /^(\d+) h(?: (\d+))?$/;

export const NOTHING_PLACED = 'Tu n’as rien placé.';

// Functions

/** Angle d'un cran, en degrés depuis le 12 */
export function tickAngle(tick: number): number {
	return tick * (360 / HAND_TICKS);
}

/** Cran le plus proche d'un angle (degrés depuis le 12, dans n'importe quel tour) */
export function tickOfAngle(angle: number): number {
	const tick = Math.round(angle / (360 / HAND_TICKS));
	return ((tick % HAND_TICKS) + HAND_TICKS) % HAND_TICKS;
}

/** Réponse de la case ; '' quand aucune aiguille n'est posée */
export function handsAnswer(hands: HorlogeHands): string {
	if (hands.hour === null && hands.minute === null) return '';
	return `${hands.hour ?? '-'} ${hands.minute ?? '-'}`;
}

function tickOf(text: string): number | null {
	if (text === '-') return null;
	const tick = Number(text);
	return tick < HAND_TICKS ? tick : null;
}

/** Aiguilles d'une réponse ; illisible : aucune aiguille posée */
export function handsOfAnswer(answer: string): HorlogeHands {
	const match = ANSWER_REGEX.exec(answer.trim());
	if (!match) return { hour: null, minute: null };
	const hour = tickOf(match[1]);
	const minute = tickOf(match[2]);
	if ((match[1] !== '-' && hour === null) || (match[2] !== '-' && minute === null)) {
		return { hour: null, minute: null };
	}
	return { hour, minute };
}

/** Heure du cadran de 12 : 0 h et 12 h → 12, 14 h → 2 */
function dialHour(hours: number): number {
	return hours % 12 === 0 ? 12 : hours % 12;
}

/**
 * L'heure que montrent les aiguilles, sur le cadran de 12 ; null si une aiguille
 * manque, ou si la petite contredit la grande (pile sur une heure alors que la
 * grande n'est pas sur le 12, ou entre deux heures alors qu'elle y est)
 */
export function readHands(hands: HorlogeHands): HorlogeTime | null {
	if (hands.hour === null || hands.minute === null) return null;
	const onHour = hands.hour % TICKS_PER_HOUR === 0;
	if (onHour !== (hands.minute === 0)) return null;
	return { hours: dialHour(Math.floor(hands.hour / TICKS_PER_HOUR)), minutes: hands.minute };
}

/**
 * Une heure sur le cadran de 12, écrite pour l'élève ET comme réponse attendue
 * d'une horloge à placer : `9 h`, `9 h 05`, `2 h 25` (pour 14 h 25)
 */
export function timeText(time: HorlogeTime): string {
	const hours = dialHour(time.hours);
	if (time.minutes === 0) return `${hours} h`;
	return `${hours} h ${String(time.minutes).padStart(2, '0')}`;
}

/** L'heure d'une réponse attendue (`9 h 25`) ; null si illisible */
export function timeOfAnswer(text: string): HorlogeTime | null {
	const match = TIME_REGEX.exec(text.trim());
	if (!match) return null;
	return { hours: Number(match[1]), minutes: match[2] === undefined ? 0 : Number(match[2]) };
}

function sameTime(a: HorlogeTime, b: HorlogeTime): boolean {
	return dialHour(a.hours) === dialHour(b.hours) && a.minutes === b.minutes;
}

/** Cran le plus proche de la vraie place de la petite aiguille (9 h 05 : 45,4 → 45) */
export function trueHourTick(time: HorlogeTime): number {
	const exact = (time.hours % 12) * TICKS_PER_HOUR + time.minutes / 12;
	return Math.round(exact) % HAND_TICKS;
}

/**
 * Les aiguilles de l'élève (`answer`) montrent-elles l'heure attendue (`expected`) ?
 * Grande aiguille sur la minute ; petite dans le bon secteur (`readHands`), ou sur
 * le cran de sa vraie place : à 1-5 et 54-59 minutes, ce cran est celui d'une
 * heure (9 h 55 : 49,6 → le 10), refusé par le seul secteur (Q16 du chantier)
 */
export function isPlacedTimeCorrect(answer: string, expected: string): boolean {
	const time = timeOfAnswer(expected);
	if (time === null) return false;
	const hands = handsOfAnswer(answer);
	if (hands.minute !== time.minutes) return false;
	if (hands.hour === trueHourTick(time)) return true;
	const read = readHands(hands);
	return read !== null && sameTime(read, time);
}

/** Les phrases de la correction, pour des aiguilles fausses */
export function handsMistakes(hands: HorlogeHands, expected: HorlogeTime): string[] {
	if (hands.hour === null && hands.minute === null) return [NOTHING_PLACED];
	if (hands.hour === null) return ['Tu n’as pas placé la petite aiguille.'];
	if (hands.minute === null) return ['Tu n’as pas placé la grande aiguille.'];
	// Inversées : la petite sur la minute attendue, la grande dans le secteur de l'heure
	const hourStart = (dialHour(expected.hours) % 12) * TICKS_PER_HOUR;
	const minuteInHourSector = hands.minute >= hourStart && hands.minute < hourStart + TICKS_PER_HOUR;
	// Deux aiguilles l'une sur l'autre (pile sur le 9 à 9 h 45) : l'erreur du secteur, dite plus bas
	if (hands.hour === expected.minutes && minuteInHourSector && hands.hour !== hands.minute) {
		return ['Tu as inversé les aiguilles : la petite montre les heures, la grande les minutes.'];
	}
	const read = readHands(hands);
	if (read !== null) return [`Tu as placé les aiguilles sur ${timeText(read)}.`];
	if (hands.minute === 0) {
		return ['La grande aiguille est sur le 12 : la petite doit être pile sur un nombre.'];
	}
	const hour = dialHour(hands.hour / TICKS_PER_HOUR);
	return [
		`La petite aiguille est pile sur le ${hour} : quand la grande n’est pas sur le 12, la petite est entre deux nombres.`
	];
}
