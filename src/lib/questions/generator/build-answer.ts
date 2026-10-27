/**
 * Réponse attendue d'un bloc qui porte sa case (à construire ou à placer)
 * =====================================================================
 *
 * Lit le texte du bloc (variables résolues, sans clôtures) : la valeur de
 * `construire:` (```collection, ```monnaie) ou la graduation d'un point de
 * `placer:` (```line, écrite par `placerAnswer`, comme la réponse de l'élève).
 *
 * @module questions/generator/build-answer
 */

import type { BuildKind } from '../types';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { indexOfValue, placerAnswer } from '$lib/ubumark/utils/number-line-placer';
import { numVal } from '$lib/ubumark/utils/number-line-render';

// Constantes

const CASE_IS_AUTOMATIC = 'case: est posée automatiquement, retirer cette ligne du bloc';

// Functions

/**
 * La réponse du bloc (droite à placer : celle du point de rang `point`), ou les
 * messages qui l'empêchent (pour le prof)
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
	const node = kind === 'collection' ? parseCollectionContent(source) : parseMonnaieContent(source);
	if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
	if (node.errors.length > 0) return { errors: node.errors.map((e) => e.message) };
	if (node.spec?.build === undefined) return { errors: [] };
	return { answer: String(node.spec.build) };
}
