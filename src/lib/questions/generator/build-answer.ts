/**
 * Réponse attendue d'un bloc qui porte sa case (à construire ou à placer)
 * =====================================================================
 *
 * Lit le texte du bloc (variables résolues, sans clôtures) : la valeur de
 * `construire:` (```collection, ```monnaie) ou la graduation d'un point de
 * `placer:` (```line, écrite par `placerAnswer`, comme la réponse de l'élève),
 * ou l'heure de `placer:` (```horloge, sur le cadran de 12 : `9 h 25`), ou
 * l'effectif d'une barre de `placer:` (```barres, `12` ; avec `axe: à choisir`,
 * la première case est l'échelle, `5`), ou une des cinq valeurs d'une boîte de
 * `placer:` (```boite-a-moustaches, `11` : minimum, Q1, médiane, Q3, maximum,
 * boîte après boîte), ou le rang ÉCRIT de
 * l'étiquette d'une place (```ranger, `2` ; le générateur le change en position
 * affichée après le mélange), ou le rang ÉCRIT de la bonne étiquette d'un élément
 * (```associer, `1` ; changé de même en position affichée), ou les parts à colorier d'une figure (```partage,
 * `colorier: 3/8` : `3/8`, parts à colorier sur parts de la figure), ou la vue ou
 * les vues d'un assemblage de cubes (```cubes, `dessiner: face` : `100/111` ;
 * `retrouver: face` : `face : 2 1 / 1 2`), ou les coordonnées d'un point à placer
 * dans un repère (```courbe, `placer: A=(2 ; 3)` : `2;3`, écrites par `pointAnswer`,
 * comme la réponse de l'élève), ou l'équation d'une droite à tracer (```courbe,
 * `tracer: y = 2x - 1` : `y = 2x - 1`, normalisée par le parseur), ou la mesure principale d'un point à placer sur le
 * cercle trigonométrique (```trig, `placer: M = -pi/4` : `-\frac{\pi}{4}`).
 *
 * @module questions/generator/build-answer
 */

import type { BuildKind } from '../types';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import { amountAnswer, toCents } from '$lib/ubumark/utils/monnaie-valeurs';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { parseRangerContent } from '$lib/ubumark/parser/ranger-parser';
import { missingLabelMessage, parseAssocierContent } from '$lib/ubumark/parser/associer-parser';
import { adaptedScale, barsCaseCount } from '$lib/ubumark/utils/barres-placer';
import {
	boxesToPlace,
	boxPlotCaseCount,
	boxValueAnswer,
	CASES_PER_BOX
} from '$lib/ubumark/utils/boxplot-placer';
import { RANGER_MIN_LABELS_IN_QUESTION } from '$lib/ubumark/utils/ranger';
import { parsePartageContent } from '$lib/ubumark/parser/partage-parser';
import { expectedColoringAnswer } from '$lib/ubumark/utils/partage-colorier';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { expectedCubesAnswer } from '$lib/ubumark/utils/cubes-gestes';
import { expectedPatronAnswer } from '$lib/ubumark/utils/patron-gestes';
import { expectedSolideAnswer } from '$lib/ubumark/utils/solide-gestes';
import { timeText } from '$lib/ubumark/utils/horloge-placer';
import { indexOfValue, placerAnswer } from '$lib/ubumark/utils/number-line-placer';
import { expectedInterval, representerAnswer } from '$lib/ubumark/utils/number-line-representer';
import { numVal } from '$lib/ubumark/utils/number-line-render';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { pointAnswer } from '$lib/ubumark/utils/courbe-placer';
import { vectorExpected } from '$lib/ubumark/utils/courbe-vecteur';
import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';
import { expectedStepAnswer, stepOfRadians } from '$lib/ubumark/utils/trig-placer';
import { hasMaskedValue } from '$lib/ubumark/utils/masked-value';
import { parseTortueContent } from '$lib/ubumark/parser/tortue-parser';
import { expectedTortueAnswer } from '$lib/ubumark/utils/tortue-answer';

// Constantes

/** Blocs dont l'énoncé d'évaluation masque la valeur (`masked-statement.ts`) */
const MASKABLE_KINDS = new Set<BuildKind>([
	'line',
	'courbe',
	'trig',
	'tortue',
	'horloge',
	'collection',
	'monnaie',
	'partage',
	'barres',
	'boite-a-moustaches'
]);
export const MASKED_IN_TEMPLATE =
	'« ? » à la place d’une valeur : écris la valeur attendue (le « ? » est réservé à l’énoncé envoyé pendant une évaluation)';
const CASE_IS_AUTOMATIC = 'case: est posée automatiquement, retirer cette ligne du bloc';

// Functions

/**
 * Nombre de cases du bloc : une par point d'une droite à placer, une par barre d'un
 * diagramme à construire, une par étiquette à ranger, une par élément à associer, une
 * par point d'un repère, sinon
 * une ; un bloc illisible compte une case (refusé au générateur avec ses messages)
 */
export function buildCaseCount(kind: BuildKind, source: string): number {
	if (kind === 'line') return Math.max(1, parseNumberLineContent(source).node?.placer?.length ?? 1);
	if (kind === 'ranger') return Math.max(1, parseRangerContent(source).labels.length);
	if (kind === 'associer') return Math.max(1, parseAssocierContent(source).items.length);
	if (kind === 'courbe') return Math.max(1, parseCourbeContent(source).spec?.placer?.length ?? 1);
	if (kind === 'trig') return Math.max(1, parseTrigCircleContent(source).node?.placer?.length ?? 1);
	if (kind === 'barres') {
		const spec = parseStatChartContent('barres', source).spec;
		return Math.max(1, spec ? barsCaseCount(spec) : 1);
	}
	if (kind === 'boite-a-moustaches') {
		const spec = parseStatChartContent('boite-a-moustaches', source).spec;
		return Math.max(1, spec ? boxPlotCaseCount(spec) : 1);
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
	// `?` : forme réservée à l'énoncé envoyé pendant une évaluation (rien à attendre)
	if (MASKABLE_KINDS.has(kind) && hasMaskedValue(source)) return { errors: [MASKED_IN_TEMPLATE] };
	if (kind === 'tortue') {
		// Programme tortue : la comparaison et le programme de référence (`attendu:`)
		const node = parseTortueContent(source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors.map((e) => e.message) };
		if (node.spec?.attendu == null) return { errors: ['attendu: absent'] };
		return { answer: expectedTortueAnswer(node.spec.comparer, node.spec.attendu) };
	}
	if (kind === 'line') {
		const { node, errors } = parseNumberLineContent(source);
		if (node === null) return { errors: errors.map((e) => e.message) };
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		// Droite à représenter : l'intervalle, écrit comme la réponse de l'élève
		if (node.representer?.interval) {
			const state = expectedInterval(node.config, node.representer.interval);
			return { answer: representerAnswer(node.config, state, node.representer.bounded) };
		}
		const target = node.placer?.[point];
		const k = target ? indexOfValue(node.config, numVal(target.value)) : null;
		if (k === null) return { errors: ['placer: absent ou hors graduation'] };
		return { answer: placerAnswer(node.config, k) };
	}
	if (kind === 'courbe') {
		const node = parseCourbeContent(source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.spec === null) return { errors: node.errors.map((e) => e.message) };
		// Droite à tracer : l'équation (le juge accepte toute paire de points de la droite)
		if (node.spec.tracer !== undefined) return { answer: node.spec.tracer.equation };
		// Vecteur à tracer : ses coordonnées, et l'origine imposée (le juge accepte toute flèche du vecteur)
		const vecteur = node.spec.vecteur;
		if (vecteur?.coords) return { answer: vectorExpected(vecteur.coords, vecteur.origin) };
		const target = node.spec.placer?.[point];
		if (target === undefined) return { errors: ['placer: absent'] };
		return { answer: pointAnswer(target.x, target.y) };
	}
	if (kind === 'trig') {
		const { node, errors } = parseTrigCircleContent(source);
		if (node?.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node === null || errors.length > 0) return { errors: errors.map((e) => e.message) };
		const target = node.placer?.[point];
		const step = target ? stepOfRadians(target.angle.radians) : null;
		if (step === null) return { errors: ['placer: absent ou hors des crans'] };
		return { answer: expectedStepAnswer(step) };
	}
	if (kind === 'barres') {
		const node = parseStatChartContent('barres', source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.spec === null) return { errors: node.errors.map((e) => e.message) };
		// Échelle à choisir : sa case vient d'abord (§ 25)
		if (node.spec.chooseScale) {
			if (point === 0) {
				const scale = adaptedScale(node.spec.data.map((d) => d.value));
				return scale === null
					? { errors: ['aucune échelle ne rentre'] }
					: { answer: String(scale) };
			}
			point -= 1;
		}
		const rank = node.spec.toPlace?.[point];
		if (rank === undefined) return { errors: ['placer: absent'] };
		return { answer: String(node.spec.data[rank].value) };
	}
	if (kind === 'boite-a-moustaches') {
		const node = parseStatChartContent('boite-a-moustaches', source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.spec === null) return { errors: node.errors.map((e) => e.message) };
		// Cinq cases par boîte : minimum, Q1, médiane, Q3, maximum
		const box = boxesToPlace(node.spec)[Math.floor(point / CASES_PER_BOX)];
		if (box === undefined) return { errors: ['placer: absent'] };
		return { answer: boxValueAnswer(box.expected[point % CASES_PER_BOX]) };
	}
	if (kind === 'ranger') {
		const node = parseRangerContent(source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors };
		// À 2, le seul désordre est l'inverse : l'élève devinerait sans calculer
		if (node.labels.length < RANGER_MIN_LABELS_IN_QUESTION) {
			return {
				errors: [
					`au moins ${RANGER_MIN_LABELS_IN_QUESTION} étiquettes à ranger dans une question (à 2, l’affichage serait toujours l’inverse : la réponse se devine)`
				]
			};
		}
		return { answer: String(point) };
	}
	if (kind === 'associer') {
		const node = parseAssocierContent(source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors };
		const answer = node.answers[point];
		if (answer === undefined || answer === null) {
			return { errors: [missingLabelMessage(point, node.items[point] ?? '')] };
		}
		return { answer: String(answer) };
	}
	if (kind === 'partage') {
		const node = parsePartageContent(source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors };
		if (node.spec?.colorier === undefined) return { errors: ['colorier: absent'] };
		return { answer: expectedColoringAnswer(node.spec) };
	}
	if (kind === 'cubes') {
		const node = parseEspaceContent(source);
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors };
		if (node.spec?.kind !== 'cubes' || node.spec.task === undefined) {
			return { errors: ['dessiner: ou retrouver: absent'] };
		}
		if (node.spec.givenViews !== undefined) return { errors: [MASKED_IN_TEMPLATE] };
		return { answer: expectedCubesAnswer(node.spec) };
	}
	if (kind === 'patron') {
		const node = parseEspaceContent(source, 'patron');
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors };
		if (node.spec?.kind !== 'patron' || node.spec.task === undefined) {
			return { errors: ['designer: ou completer: absent'] };
		}
		if (node.spec.task.kind === 'completer' && node.spec.task.masked !== undefined) {
			return { errors: [MASKED_IN_TEMPLATE] };
		}
		return { answer: expectedPatronAnswer(node.spec) };
	}
	if (kind === 'solide') {
		const node = parseEspaceContent(source, 'solide');
		if (node.caseIndex !== undefined) return { errors: [CASE_IS_AUTOMATIC] };
		if (node.errors.length > 0) return { errors: node.errors };
		if (node.spec?.kind !== 'solide' || node.spec.task === undefined) {
			return { errors: ['tracer: absent'] };
		}
		return { answer: expectedSolideAnswer(node.spec) };
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
	// Monnaie : `3,45` (virgule, deux chiffres), une somme entière reste `35`
	return {
		answer: kind === 'monnaie' ? amountAnswer(toCents(node.spec.build)) : String(node.spec.build)
	};
}
