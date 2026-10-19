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

const DEGREE_AFTER_TERM = new RegExp(
	`(?<=${TERM_END})${SPACES}${DEGREE_SIGN}${NOT_TEMPERATURE}`,
	'gu'
);

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
	return text.replace(DEGREE_AFTER_TERM, latex ? '\\unit{°}' : '[°]');
}

/**
 * Le refus d'un signe degré qui ne suit rien (`°`, `cos(°60)`, `2 + °`), sur un
 * texte où `withDegreeUnits` est déjà passé ; `null` sinon.
 */
export function strayDegreeRefusal(text: string): string | null {
	if (!mentionsDegree(text)) return null;
	return ANY_DEGREE.test(text.replace(WRITTEN_UNITS, ' ')) ? STRAY_DEGREE_MESSAGE : null;
}

/**
 * La réponse écrit un angle comme sur la copie : `60°`, pas `60 °` (texte), et
 * `60{}^{\circ}`, pas `60~{}^{\circ}` (LaTeX). Une température garde son espace
 * (`20 °C`).
 */
export function degreeSignWritten(text: string): string {
	if (!mentionsDegree(text)) return text;
	return text
		.replace(/(?<=[\p{N})π])[ \u00a0\u202f]+°(?![CF])/gu, '°')
		.replace(/(?:~|\\,|\s)+(\{\}\^\{\\circ\})(?!\s*\\mathrm\{[CF]\})/g, '$1');
}
