/**
 * Atelier — les commandes de lois : `.geometrique`, `.uniforme`,
 * `.exponentielle` (manche 13, PR c), `.normale` (2026-10-09), et ce qu'elles
 * partagent avec `.binomiale` (Q142).
 *
 * Chaque commande écrit le bloc ```loi correspondant et en montre la scène sous
 * la ligne de l'historique : les MÊMES textes et les mêmes valeurs que dans une
 * fiche, sans code de calcul en double. Aucune liste n'est créée (Q142).
 *
 * L'atelier RETIENT la loi (2026-10-09) : `P(X ⩽ 3)` tapé seul la relit et
 * passe par le même bloc (`lawEvent`) — une seule fonction de calcul.
 *
 * @module atelier/law-commands
 */

import type { Atelier } from './atelier.svelte';
import { Fraction } from '$lib/statistics/fraction';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { buildStatChartScene, type StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';

// =============================================================================
// Types
// =============================================================================

export type LawCommandResult =
	| { readonly ok: true; readonly text: string; readonly chart: StatChartScene }
	| { readonly ok: false; readonly message: string };

/** `P(X ⩽ 3)` tapé seul : la ligne de la probabilité, ou le refus */
export type LawEventResult =
	| { readonly ok: true; readonly text: string }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

const INDICATORS = 'indicateurs: espérance ; variance ; écart type';

const GEOMETRIC_EXAMPLE = '.geometrique X 0,2';
const UNIFORM_EXAMPLE = '.uniforme X 1 6 ou .uniforme X [0 ; 10]';
const EXPONENTIAL_EXAMPLE = '.exponentielle T 0,5';
const NORMAL_EXAMPLE = '.normale Y 0 1';

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

/**
 * `runLawBlock`, puis la loi RETENUE si le bloc l'accepte (2026-10-09) : une
 * nouvelle loi de X remplace l'ancienne ; une ligne refusée ne touche à rien.
 * `lines[0]` est la ligne de tête (`X ~ B(10 ; 0,3)`).
 */
export function runAndRememberLaw(
	atelier: Atelier,
	lines: readonly string[],
	variable: string,
	text: string | null,
	example: string
): LawCommandResult {
	const result = runLawBlock(lines, variable, text, example);
	if (result.ok) atelier.rememberLaw(variable, lines[0]);
	return result;
}

/**
 * `seuil P(X > k) ⩽ 0,05` (binomiale ; géométrique, manche 14) : la ligne du
 * bloc ; `seuil` sans valeur expliqué (revue) ; null si ce n'est pas un seuil
 */
export function thresholdOption(
	option: string,
	variable: string
): { readonly line: string } | { readonly message: string } | null {
	const match = /^seuil(?:\s+(.*))?$/i.exec(option);
	if (!match) return null;
	if (match[1] === undefined || match[1].trim() === '') {
		return {
			message: `« ${option} » sans valeur : écrire par exemple seuil P(${variable} > k) ⩽ 0,05`
		};
	}
	return { line: `seuil: ${match[1].trim()}` };
}

/** Une option de probabilité (`P(X ⩽ 3)`) ; sinon null */
function query(option: string): string | null {
	return option.startsWith('P(') ? option : null;
}

// =============================================================================
// Commandes
// =============================================================================

/** `.geometrique X 0,2 [P(X ⩽ 3) ; P(X > 5 | X > 2) ; jusqu'à 15 ; seuil P(X > k) ⩽ 0,05]` */
export function geometricCommand(atelier: Atelier, argument: string): LawCommandResult {
	const written = normalizeLawArgument(argument);
	if (written === null) return { ok: false, message: SINGLE_LINE };
	const head = ONE_PARAMETER.exec(written);
	if (!head) return lawUsageError(written, GEOMETRIC_EXAMPLE);
	const [, variable, p, rest] = head;

	const lines = [`${variable} ~ G(${p})`, INDICATORS, 'diagramme: oui'];
	const queries: string[] = [];
	for (const option of lawOptions(rest)) {
		const threshold = thresholdOption(option, variable);
		if (threshold !== null) {
			if ('message' in threshold) return { ok: false, message: threshold.message };
			lines.push(threshold.line);
			continue;
		}
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
				message: `« ${option} » : écrire P(${variable} ⩽ 3), jusqu'à 15 ou seuil P(${variable} > k) ⩽ 0,05`
			};
		}
	}
	if (queries.length > 0) lines.push(`probabilités: ${queries.join(' ; ')}`);
	return runAndRememberLaw(atelier, lines, variable, null, GEOMETRIC_EXAMPLE);
}

/** `.uniforme X 1 6 [P(…)]` (discrète) ou `.uniforme X [0 ; 10] [P(…)]` (à densité) */
export function uniformCommand(atelier: Atelier, argument: string): LawCommandResult {
	const written = normalizeLawArgument(argument);
	if (written === null) return { ok: false, message: SINGLE_LINE };
	const interval = INTERVAL.exec(written);
	if (interval) {
		const [, variable, bounds, rest] = interval;
		return uniformBlock(
			atelier,
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
		atelier,
		variable,
		[`${variable} ~ U(${a} ; ${b})`, INDICATORS, 'diagramme: oui'],
		rest
	);
}

/** Les options `P(…)` d'une loi uniforme, puis le bloc */
function uniformBlock(
	atelier: Atelier,
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
	return runAndRememberLaw(atelier, lines, variable, null, UNIFORM_EXAMPLE);
}

/** `.exponentielle T 0,5 [P(T ⩽ 2) ; P(T > 5 | T > 2)]` */
export function exponentialCommand(atelier: Atelier, argument: string): LawCommandResult {
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
	return runAndRememberLaw(atelier, lines, variable, null, EXPONENTIAL_EXAMPLE);
}

/**
 * σ² écrit pour le bloc : décimal exact (`0,25`), sinon fraction (`1/9`) ;
 * `N(μ ; σ²)` est la notation du programme, la calculatrice demande σ
 */
function varianceText(sigma: Fraction): string {
	const variance = sigma.mul(sigma);
	if (!variance.isDecimal()) return variance.toString();
	let places = 0;
	while (places < 40 && (variance.num * 10n ** BigInt(places)) % variance.den !== 0n) places++;
	const digits = ((variance.num * 10n ** BigInt(places)) / variance.den).toString();
	if (places === 0) return digits;
	const padded = digits.padStart(places + 1, '0');
	return `${padded.slice(0, -places)},${padded.slice(-places)}`;
}

/** `.normale Y 0 1 [P(Y ⩽ 1,96) ; P(-1,96 ⩽ Y ⩽ 1,96)]` : Y suit N(μ ; σ²), σ donné */
export function normalCommand(atelier: Atelier, argument: string): LawCommandResult {
	const written = normalizeLawArgument(argument);
	if (written === null) return { ok: false, message: SINGLE_LINE };
	const head = TWO_PARAMETERS.exec(written);
	if (!head) return lawUsageError(written, NORMAL_EXAMPLE);
	const [, variable, mu, sigmaText, rest] = head;
	const sigma = Fraction.parse(sigmaText);
	if (sigma === null || sigma.isNegative() || sigma.equals(Fraction.ZERO)) {
		return { ok: false, message: 'σ est un nombre strictement positif' };
	}
	const lines = [`${variable} ~ N(${mu} ; ${varianceText(sigma)})`, INDICATORS, 'diagramme: oui'];
	const queries: string[] = [];
	for (const option of lawOptions(rest)) {
		if (!query(option)) {
			return { ok: false, message: `« ${option} » : écrire P(${variable} ⩽ 1,96)` };
		}
		queries.push(option);
	}
	if (queries.length > 0) lines.push(`probabilités: ${queries.join(' ; ')}`);
	return runAndRememberLaw(atelier, lines, variable, null, NORMAL_EXAMPLE);
}

// =============================================================================
// Probabilité tapée seule (2026-10-09)
// =============================================================================

/**
 * `P(X\leqslant 3)`, `P\left(X<=3\right)`, `P(T ⩽ 1{,}5)` : l'écriture du bloc
 * (`⩽ ⩾ < > =`, `|`, virgule décimale, moins ASCII)
 */
function eventText(input: string): string {
	return input
		.trim()
		.replace(/\\(?:left|right)/g, '')
		.replace(/\\(?:leqslant|leq|le)(?![a-zA-Z])/g, '⩽')
		.replace(/\\(?:geqslant|geq|ge)(?![a-zA-Z])/g, '⩾')
		.replace(/\\lt(?![a-zA-Z])/g, '<')
		.replace(/\\gt(?![a-zA-Z])/g, '>')
		.replace(/\\(?:mid|vert|lvert|rvert)(?![a-zA-Z])/g, '|')
		.replace(/\\[,;:! ]/g, ' ')
		.replace(/\{,\}/g, ',')
		.replace(/[−–]/g, '-')
		.replace(/≤|<=/g, '⩽')
		.replace(/≥|>=/g, '⩾')
		.replace(/^P\s*\(/, 'P(')
		.replace(/\s+/g, ' ');
}

/** Les formes d'événement que lisent les lois, pour la variable `v` */
function eventShapes(v: string): RegExp[] {
	const n = String.raw`-?\d+(?:[.,]\d+)?`;
	const op = '(?:⩽|⩾|<|>|=)';
	const s = ' ?';
	// X ⩽ a ou a ⩽ X ⩽ b : de part et d'autre du « sachant que » (2026-10-09)
	const side = `(?:${v}${s}${op}${s}${n}|${n}${s}${op}${s}${v}${s}${op}${s}${n})`;
	return [
		`^P\\(${s}${v}${s}${op}${s}${n}${s}\\)$`,
		`^P\\(${s}${n}${s}${op}${s}${v}${s}${op}${s}${n}${s}\\)$`,
		`^P\\(${s}${side}${s}\\|${s}${side}${s}\\)$`,
		`^P\\(${s}\\|${s}${v}${s}(?:[-+]${s}\\d+(?:[.,]\\d+)?${s})?\\|${s}${op}${s}${n}${s}\\)$`
	].map((source) => new RegExp(source));
}

/**
 * `P(X ⩽ 3)` tapé seul dans Calcul : relit la loi RETENUE de X et passe par le
 * même bloc ```loi que la ligne de la loi — même texte, mêmes valeurs. Sans
 * loi : le refus dit comment en définir une.
 */
export function lawEvent(atelier: Atelier, input: string): LawEventResult {
	// Un saut de ligne ou un « ; » glisserait une ligne ou une probabilité de plus dans le bloc
	if (/[\r\n;]/.test(input)) {
		return { ok: false, message: 'Écris une seule probabilité, par exemple P(X ⩽ 3)' };
	}
	const event = eventText(input);
	const variable = /[A-Z]/.exec(event.slice(2))?.[0];
	if (variable === undefined) {
		// `P(x ⩽ 3)` : une minuscule n'est pas une variable aléatoire (revue)
		const lower = /[a-z]/.exec(event.slice(2))?.[0];
		return {
			ok: false,
			message:
				lower === undefined
					? 'Écris la probabilité ainsi : P(X ⩽ 3)'
					: `${lower} n’a pas de loi : une variable aléatoire s’écrit en majuscule, par exemple P(${lower.toUpperCase()} ⩽ 3)`
		};
	}
	const head = atelier.lawOf(variable);
	if (head === undefined) {
		return {
			ok: false,
			message: `${variable} n’a pas de loi : définis-la avec une commande de loi (.binomiale, .geometrique, .uniforme, .exponentielle, .normale), par exemple .normale ${variable} 0 1`
		};
	}
	// `P(2X ⩽ 3)`, `P(X² ⩽ 4)` : hors des formes que lisent les lois (revue)
	if (!eventShapes(variable).some((shape) => shape.test(event))) {
		const v = variable;
		return {
			ok: false,
			message: `Seuls les événements de la forme P(${v} ⩽ a), P(a ⩽ ${v} ⩽ b), P(|${v} − m| ⩽ a) et P(A | B) (par exemple P(${v} > a | ${v} > b)) sont pris en charge.`
		};
	}
	const node = parseStatChartContent(
		'loi',
		[head, 'indicateurs: aucun', `probabilités: ${event}`].join('\n')
	);
	if (node.spec === null) {
		const message = node.errors[0]?.message ?? 'Écris la probabilité ainsi : P(X ⩽ 3)';
		return { ok: false, message: message.replace(/^Ligne \d+ : (?:probabilités : )?/, '') };
	}
	const scene = buildStatChartScene(node.spec, { locale: 'fr' });
	const line = scene.indicators[scene.indicators.length - 1];
	return line === undefined
		? { ok: false, message: 'Écris la probabilité ainsi : P(X ⩽ 3)' }
		: { ok: true, text: line };
}
