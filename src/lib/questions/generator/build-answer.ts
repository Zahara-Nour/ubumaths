/**
 * Réponse attendue d'un bloc qui porte sa case (à construire ou à placer)
 * =====================================================================
 *
 * Lit le texte du bloc (variables résolues, sans clôtures) : la valeur de
 * `construire:` (```collection, ```monnaie) ou la graduation d'un point de
 * `placer:` (```line, écrite par `placerAnswer`, comme la réponse de l'élève),
 * ou l'heure de `placer:` (```horloge, sur le cadran de 12 : `9 h 25`), ou
 * l'effectif d'une barre de `placer:` (```barres, `12`), ou le rang ÉCRIT de
 * l'étiquette d'une place (```ranger, `2` ; le générateur le change en position
 * affichée après le mélange).
 *
 * @module questions/generator/build-answer
 */

import type { BuildKind } from '../types';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { parseRangerContent } from '$lib/ubumark/parser/ranger-parser';
import { timeText } from '$lib/ubumark/utils/horloge-placer';
import { indexOfValue, placerAnswer } from '$lib/ubumark/utils/number-line-placer';
import { numVal } from '$lib/ubumark/utils/number-line-render';

// Constantes

const CASE_IS_AUTOMATIC = 'case: est posée automatiquement, retirer cette ligne du bloc';

// Functions

/**
 * Nombre de cases du bloc : une par point d'une droite à placer, une par barre d'un
 * diagramme à construire, une par étiquette à ranger, sinon une ; un bloc illisible
 * compte une case (refusé au générateur avec ses messages)
 */
export function buildCaseCount(kind: BuildKind, source: string): number {
	if (kind === 'line') return Math.max(1, parseNumberLineContent(source).node?.placer?.length ?? 1);
	if (kind === 'ranger') return Math.max(1, parseRangerContent(source).labels.length);
	if (kind === 'barres') {
		return Math.max(1, parseStatChartContent('barres', source).spec?.toPlace?.length ?? 1);
	}
	return 1;
}

/**
 * La réponse du bloc (droite à placer : celle du point de rang `point` ; diagramme
 * en barres : celle de la barre à construire de rang `point` ; étiquettes à ranger :
 * le rang écrit de la place `point`), ou les messages qui l'empêchent (pour le prof)
 */
export function buildAnswerOf(
	kind: BuildKind,
	source: string,
	point = 0
): { answer: string } | { errors: string[] } {
	if (kind === 'line') {
		const { node, errors } = parseNumberLineContent(source);
		if (node === null) return { errors: errors.map((e) => e.message) };
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		const target = node.placer?.[point];
		const k = target ? indexOfValue(node.config, numVal(target.value)) : null;
		if (k === null) return { errors: ['placer: absent ou hors graduation'] };
		return { answer: placerAnswer(node.config, k) };
	}
	if (kind === 'barres') {
		const node = parseStatChartContent('barres', source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.spec === null) return { errors: node.errors.map((e) => e.message) };
		const rank = node.spec.toPlace?.[point];
		if (rank === undefined) return { errors: ['placer: absent'] };
		return { answer: String(node.spec.data[rank].value) };
	}
	if (kind === 'ranger') {
		const node = parseRangerContent(source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors };
		return { answer: String(point) };
	}
	if (kind === 'horloge') {
		const node = parseHorlogeContent(source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors.map((e) => e.message) };
		if (node.spec?.placer === undefined) return { errors: ['placer: absent'] };
		return { answer: timeText(node.spec.placer) };
	}
	const node = kind === 'collection' ? parseCollectionContent(source) : parseMonnaieContent(source);
	if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
	if (node.errors.length > 0) return { errors: node.errors.map((e) => e.message) };
	if (node.spec?.build === undefined) return { errors: [] };
	return { answer: String(node.spec.build) };
}
