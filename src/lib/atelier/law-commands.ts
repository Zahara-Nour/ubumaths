/**
 * Atelier — les commandes de lois : `.geometrique`, `.uniforme`,
 * `.exponentielle` (manche 13, PR c), et ce qu'elles partagent avec
 * `.binomiale` (Q142).
 *
 * Chaque commande écrit le bloc ```loi correspondant et en montre la scène sous
 * la ligne de l'historique : les MÊMES textes et les mêmes valeurs que dans une
 * fiche, sans code de calcul en double. Aucune liste n'est créée (Q142).
 *
 * @module atelier/law-commands
 */

import type { Atelier } from './atelier.svelte';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { buildStatChartScene, type StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';

// =============================================================================
// Types
// =============================================================================

export type LawCommandResult =
	| { readonly ok: true; readonly text: string; readonly chart: StatChartScene }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

const INDICATORS = 'indicateurs: espérance ; variance ; écart type';

const GEOMETRIC_EXAMPLE = '.geometrique X 0,2';
const UNIFORM_EXAMPLE = '.uniforme X 1 6 ou .uniforme X [0 ; 10]';
const EXPONENTIAL_EXAMPLE = '.exponentielle T 0,5';

/** `X 0,2` puis, éventuellement, les options séparées par « ; » */
const ONE_PARAMETER = /^([A-Z])\s+(\S+)(?:\s+(.*))?$/;
/** `X 1 6` puis les options */
const TWO_PARAMETERS = /^([A-Z])\s+(\S+)\s+(\S+)(?:\s+(.*))?$/;
/** `X [0 ; 10]` puis les options : l'intervalle contient un « ; » */
const INTERVAL = /^([A-Z])\s+\[([^\]\n\r]*)\](?:\s*(.*))?$/;

/** Un intervalle mal fermé, ou des bornes séparées par « ; » sans crochets */
const BROKEN_INTERVAL = /^[A-Z]\s+(?:[[\]]|[^\s;[\]]+\s*;)|^[A-Z]\s+\S+\s+[^\s]*[[\];]/;

/** `jusqu'à 15`, apostrophe droite ou courbe */
const UP_TO = /^jusqu['’]à(?:\s+(.*))?$/i;

// =============================================================================
// Fonctions communes
// =============================================================================

/** Un saut de ligne glisserait une ligne dans le bloc (`diagramme: non`) : refusé dès l'entrée */
const SINGLE_LINE = 'Écris la commande sur une seule ligne';

/**
 * « 30 % » et « 1 / 2 » avec des espaces : comme le bloc les accepte (revue) ;
 * null si l'argument tient sur plusieurs lignes
 */
export function normalizeLawArgument(argument: string): string | null {
	if (/[\r\n]/.test(argument)) return null;
	return argument
		.trim()
		.replace(/(\d)\s+%/g, '$1%')
		.replace(/(\d)\s*\/\s*(\d)/g, '$1/$2');
}

/**
 * La ligne ne se lit pas : une variable en minuscule est expliquée (revue),
 * sinon l'usage. `example` : « .binomiale X 10 0,3 ».
 */
export function lawUsageError(written: string, example: string): LawCommandResult {
	if (/^[a-z]\s+\S+/.test(written)) {
		return { ok: false, message: `La variable s’écrit en majuscule : ${example}` };
	}
	return { ok: false, message: `Écris la commande ainsi : ${example}` };
}

/** Les options de la ligne, séparées par « ; » */
export function lawOptions(rest: string | undefined): string[] {
	return (rest ?? '')
		.split(';')
		.map((o) => o.trim())
		.filter((o) => o !== '');
}

/**
 * Le bloc d'une fiche, analysé et dessiné comme tel : mêmes messages (sans
 * « Ligne N : »), mêmes valeurs. `text` : la ligne de l'historique, ou null
 * pour la tirer du titre du bloc (« Loi de X : G(0,2) » → « X suit G(0,2) »,
 * « … : loi uniforme sur [0 ; 10] » → « X suit la loi uniforme sur [0 ; 10] »).
 */
export function runLawBlock(
	lines: readonly string[],
	variable: string,
	text: string | null,
	example: string
): LawCommandResult {
	const node = parseStatChartContent('loi', lines.join('\n'));
	if (node.spec === null) {
		const message = node.errors[0]?.message ?? `Écris la commande ainsi : ${example}`;
		return { ok: false, message: message.replace(/^Ligne \d+ : /, '') };
	}
	const chart = buildStatChartScene(node.spec, { locale: 'fr' });
	// « loi uniforme sur … » : « X suit LA loi uniforme sur … »
	const name = chart.accessibleTitle.replace(/^Loi de [A-Z] : /, '').replace(/^loi /, 'la loi ');
	return { ok: true, text: text ?? `${variable} suit ${name}`, chart };
}

/** Une option de probabilité (`P(X ⩽ 3)`) ; sinon null */
function query(option: string): string | null {
	return option.startsWith('P(') ? option : null;
}

// =============================================================================
// Commandes
// =============================================================================

/** `.geometrique X 0,2 [P(X ⩽ 3) ; P(X > 5 | X > 2) ; jusqu'à 15]` */
export function geometricCommand(_atelier: Atelier, argument: string): LawCommandResult {
	const written = normalizeLawArgument(argument);
	if (written === null) return { ok: false, message: SINGLE_LINE };
	const head = ONE_PARAMETER.exec(written);
	if (!head) return lawUsageError(written, GEOMETRIC_EXAMPLE);
	const [, variable, p, rest] = head;

	const lines = [`${variable} ~ G(${p})`, INDICATORS, 'diagramme: oui'];
	const queries: string[] = [];
	for (const option of lawOptions(rest)) {
		const upTo = UP_TO.exec(option);
		if (upTo) {
			// Une option sans valeur : dire ce qui manque (revue)
			if (upTo[1] === undefined || upTo[1].trim() === '') {
				return { ok: false, message: "« jusqu'à » sans valeur : écrire par exemple jusqu'à 15" };
			}
			lines.push(`jusqu'à: ${upTo[1].trim()}`);
		} else if (query(option)) queries.push(option);
		else {
			return {
				ok: false,
				message: `« ${option} » : écrire P(${variable} ⩽ 3) ou jusqu'à 15`
			};
		}
	}
	if (queries.length > 0) lines.push(`probabilités: ${queries.join(' ; ')}`);
	return runLawBlock(lines, variable, null, GEOMETRIC_EXAMPLE);
}

/** `.uniforme X 1 6 [P(…)]` (discrète) ou `.uniforme X [0 ; 10] [P(…)]` (à densité) */
export function uniformCommand(_atelier: Atelier, argument: string): LawCommandResult {
	const written = normalizeLawArgument(argument);
	if (written === null) return { ok: false, message: SINGLE_LINE };
	const interval = INTERVAL.exec(written);
	if (interval) {
		const [, variable, bounds, rest] = interval;
		return uniformBlock(
			variable,
			[`${variable} ~ U([${bounds.trim()}])`, INDICATORS, 'répartition: oui', 'diagramme: oui'],
			rest
		);
	}
	// `[0 ; 10[`, `[0 ; 10`, `0 ; 10` : un intervalle mal écrit, pas des options (revue)
	if (BROKEN_INTERVAL.test(written)) {
		return { ok: false, message: 'écrire [0 ; 10] avec deux crochets fermés' };
	}
	const discrete = TWO_PARAMETERS.exec(written);
	if (!discrete) return lawUsageError(written, UNIFORM_EXAMPLE);
	const [, variable, a, b, rest] = discrete;
	return uniformBlock(
		variable,
		[`${variable} ~ U(${a} ; ${b})`, INDICATORS, 'diagramme: oui'],
		rest
	);
}

/** Les options `P(…)` d'une loi uniforme, puis le bloc */
function uniformBlock(
	variable: string,
	lines: string[],
	rest: string | undefined
): LawCommandResult {
	const queries: string[] = [];
	for (const option of lawOptions(rest)) {
		if (!query(option)) {
			return { ok: false, message: `« ${option} » : écrire P(${variable} ⩽ 3)` };
		}
		queries.push(option);
	}
	if (queries.length > 0) lines.push(`probabilités: ${queries.join(' ; ')}`);
	return runLawBlock(lines, variable, null, UNIFORM_EXAMPLE);
}

/** `.exponentielle T 0,5 [P(T ⩽ 2) ; P(T > 5 | T > 2)]` */
export function exponentialCommand(_atelier: Atelier, argument: string): LawCommandResult {
	const written = normalizeLawArgument(argument);
	if (written === null) return { ok: false, message: SINGLE_LINE };
	const head = ONE_PARAMETER.exec(written);
	if (!head) return lawUsageError(written, EXPONENTIAL_EXAMPLE);
	const [, variable, lambda, rest] = head;
	const lines = [`${variable} ~ E(${lambda})`, INDICATORS, 'répartition: oui', 'diagramme: oui'];
	const queries: string[] = [];
	for (const option of lawOptions(rest)) {
		if (!query(option)) {
			return { ok: false, message: `« ${option} » : écrire P(${variable} ⩽ 2)` };
		}
		queries.push(option);
	}
	if (queries.length > 0) lines.push(`probabilités: ${queries.join(' ; ')}`);
	return runLawBlock(lines, variable, null, EXPONENTIAL_EXAMPLE);
}
