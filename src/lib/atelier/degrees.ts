/**
 * Atelier — écrire un angle comme sur la copie : `60°`, `60^\circ` (2026-10-19).
 *
 * L'unité degré existe déjà (`60[°]`, `src/lib/mathAST/units`, π/180 rad) : ce
 * module ne fait que LIRE les écritures de l'élève et les ramener à elle.
 *
 * - en texte, un `°` collé après un nombre, un nom ou une parenthèse fermante
 *   devient `[°]` : `cos(60°)` → `cos(60[°])`, `a°` → `a[°]`, `(30+30)°` ;
 * - en LaTeX (MathLive écrit `60\degree` quand on tape `°`, mesuré dans
 *   Chromium ; un énoncé, `60^{\circ}`), il devient `\unit{°}`, que le parseur
 *   LaTeX relit ;
 * - un `°` ailleurs (seul, en tête, après un opérateur) : un refus en français
 *   (`strayDegreeRefusal`), plutôt qu'une lettre « ° » ou un message anglais.
 *
 * `°C` et `°F` restent des températures (`20 °C`).
 *
 * L'écriture de la RÉPONSE est l'autre moitié : `60°`, sans espace (la règle
 * typographique des angles), `60{}^{\circ}` en LaTeX (`degreeSignWritten`).
 *
 * @module atelier/degrees
 */

import { detectInputFormat } from '$lib/mathAST/cli/core/input-detector';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Les écritures du signe degré : `°`, `^°`, `^\circ`, `^{\circ}`, `{}^{\circ}`
 * (l'écriture de l'atelier), `\degree` (MathLive).
 */
const DEGREE_SIGN = String.raw`(?:\{\}\s*\^\s*\{\s*\\circ\s*\}|\^\s*\{\s*\\circ\s*\}|\^\s*\\circ(?![A-Za-z])|\^\s*\{\s*°\s*\}|\^\s*°|°|\\degree(?![A-Za-z]))`;

/** Ce qui peut porter l'unité : un chiffre, une lettre (un nom, `\pi`), `)`, `}`, `π`. */
const TERM_END = String.raw`[\p{L}\p{N})}]`;

/** Les espaces entre le terme et le signe : `60 °`, `60~{}^{\circ}`, `60\,°`. */
const SPACES = String.raw`(?:\s|~|\\[,;: ])*`;

/** Pas une température : `°C`, `°F` (`\degree C` aussi). */
const NOT_TEMPERATURE = String.raw`(?!\s*(?:\\mathrm\{)?[CF](?![A-Za-z]))`;

/**
 * Pas la CIBLE d'une conversion : `1[rad] en °` convertit en degrés (revue) ;
 * le `n` du mot « en » n'est pas un nom qui porterait l'unité.
 */
const NOT_CONVERSION_TARGET = String.raw`(?<!(?:^|[^\p{L}\\])en)`;

const DEGREE_AFTER_TERM = new RegExp(
	`(?<=${TERM_END})${NOT_CONVERSION_TARGET}${SPACES}${DEGREE_SIGN}${NOT_TEMPERATURE}`,
	'gu'
);

/**
 * Une fraction de nombres juste avant le signe : `1/2°` est un demi-degré,
 * `(1/2)[°]` — comme `1/2 m` en lecture naturelle (`grandeurs.md`). Sans les
 * parenthèses, le parseur lit 1/(2°) (revue : un message anglais du moteur).
 */
const NUMBER_FRACTION_BEFORE = new RegExp(
	String.raw`(?<![\p{L}\p{N}.,)\]}])(\d+)\s*/\s*(\d+)(?=${SPACES}${DEGREE_SIGN}${NOT_TEMPERATURE})`,
	'gu'
);

/** La cible d'une conversion, à ne pas refuser : `en °`. */
const CONVERSION_TARGET = /(?<![\p{L}\\])en\s*°/gu;

/** Un signe degré qui reste, hors température. */
const ANY_DEGREE = new RegExp(`${DEGREE_SIGN}${NOT_TEMPERATURE}`, 'u');

/** Les unités déjà écrites : `[°]`, `[km/h]`, `\unit{°}`. */
const WRITTEN_UNITS = /\[[^\]]*\]|\\unit\s*\{[^{}]*\}/g;

export const STRAY_DEGREE_MESSAGE =
	'Le signe ° s’écrit juste après un nombre ou un nom : 60°, cos(60°), a°.';

// =============================================================================
// Fonctions
// =============================================================================

/** Le texte contient-il un signe degré (`°`, `\circ`, `\degree`) ? Test rapide. */
function mentionsDegree(text: string): boolean {
	return text.includes('°') || text.includes('\\circ') || text.includes('\\degree');
}

/**
 * Les degrés de l'élève écrits dans l'unité de l'atelier : `[°]` en texte,
 * `\unit{°}` en LaTeX. `detect` choisit comme la lecture de l'atelier (un texte
 * reconnu comme du LaTeX par `detectInputFormat`, confiance > 0,5).
 *
 * @example
 * withDegreeUnits('cos(60°)', 'text')            // 'cos(60[°])'
 * withDegreeUnits('\\cos(60^{\\circ})', 'detect') // '\\cos(60\\unit{°})'
 */
export function withDegreeUnits(text: string, mode: 'text' | 'latex' | 'detect'): string {
	if (!mentionsDegree(text)) return text;
	const latex =
		mode === 'latex' ||
		(mode === 'detect' &&
			(() => {
				const detected = detectInputFormat(text);
				return detected.format === 'latex' && detected.confidence > 0.5;
			})());
	const fractions = latex ? text : text.replace(NUMBER_FRACTION_BEFORE, '($1/$2)');
	return fractions.replace(DEGREE_AFTER_TERM, latex ? '\\unit{°}' : '[°]');
}

/**
 * Le refus d'un signe degré qui ne suit rien (`°`, `cos(°60)`, `2 + °`), sur un
 * texte où `withDegreeUnits` est déjà passé ; `null` sinon.
 */
export function strayDegreeRefusal(text: string): string | null {
	if (!mentionsDegree(text)) return null;
	const rest = text.replace(WRITTEN_UNITS, ' ').replace(CONVERSION_TARGET, ' ');
	return ANY_DEGREE.test(rest) ? STRAY_DEGREE_MESSAGE : null;
}

/** Une écriture qui porte le signe sans parenthèses : un nombre, une lettre, `\pi`, ou déjà groupée. */
const SIMPLE_TERM = /^(?:\d+(?:[.,]\d+)?|\p{L}|\\pi|\(.*\))$/u;

/** Un terme de texte suivi de ` °` (pas `°C`, `°F`). */
const TEXT_DEGREE = /(?<!\S)(\S+)[ \u00a0\u202f]+°(?![CF])/gu;

/** Une fraction LaTeX (`\dfrac{100}{3}`, `\dfrac{1}{2} \pi`) suivie du signe. */
const LATEX_FRACTION_DEGREE =
	/(\\d?frac\{[^{}]*\}\{[^{}]*\}(?:\s*\\pi)?)(?:~|\\,|\s)*(\{\}\^\{\\circ\})(?!\s*\\mathrm\{[CF]\})/g;

/** Le signe en LaTeX, l'espace avant retirée (pas devant `\mathrm{C}`). */
const LATEX_DEGREE_SPACE = /(?:~|\\,|\s)+(\{\}\^\{\\circ\})(?!\s*\\mathrm\{[CF]\})/g;

/** `100/3` → `(100/3)°`, `-1/2` → `-(1/2)°`, `60` → `60°`. */
function degreeTermText(term: string): string {
	const negative = /^[-−]/.test(term) ? term[0] : '';
	const body = negative === '' ? term : term.slice(1);
	return SIMPLE_TERM.test(body) ? `${term}°` : `${negative}(${body})°`;
}

/**
 * La réponse écrit un angle comme sur la copie : `60°`, pas `60 °` (texte), et
 * `60{}^{\circ}`, pas `60~{}^{\circ}` (LaTeX). Une valeur qui n'est pas un
 * nombre seul prend des parenthèses : `(100/3)°`, `\left(\dfrac{100}{3}\right){}^{\circ}`
 * — `100/3°` se lirait 100/(3°) (revue). Une température garde son espace (`20 °C`).
 */
export function degreeSignWritten(text: string): string {
	if (!mentionsDegree(text)) return text;
	return text
		.replace(TEXT_DEGREE, (_, term: string) => degreeTermText(term))
		.replace(LATEX_FRACTION_DEGREE, '\\left($1\\right)$2')
		.replace(LATEX_DEGREE_SPACE, '$1');
}
