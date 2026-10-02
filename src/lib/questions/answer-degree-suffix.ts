/**
 * Suffixe « ° » recopié derrière une valeur (correctif du 2026-10-02)
 *
 * L'énoncé « $\frac{5\pi}{6}\text{ rad}=?\,^\circ$ » affiche ° APRÈS la case ;
 * l'élève le retape (`150^\circ`, `150°`, `150\degree`). Comme le « x = »
 * recopié (answer-variable-prefix.ts), la réponse est jugée sans ce suffixe —
 * mais seulement quand l'attendu est une valeur SANS unité : une case à unité
 * garde le traitement des unités (où ° est une unité à part entière).
 */
import { degreeSymbolLatex } from './units/student-input';

// Constants

/**
 * Le reste, puis un groupe vide facultatif (`{}^{\circ}`, forme affichée de °),
 * des espacements facultatifs, et un ° final, seul de la réponse.
 */
const TRAILING_DEGREE = /^([^°]*?)(?:\s|\\[,;:! ]|\\quad|~|\{\s*\})*°\s*$/;

/** Unité dans l'attendu : `\unit{…}` ou degré écrit */
const EXPECTED_UNIT = /\\unit\{|°|\\circ(?![A-Za-z])|\\degree(?![A-Za-z])/;

// Functions

/** L'attendu est-il une valeur sans unité (aucun `\unit{}`, aucun degré) ? */
export function expectsUnitlessValue(expected: string): boolean {
	return !EXPECTED_UNIT.test(expected);
}

/**
 * La réponse sans « ° » final, quand l'attendu est une valeur sans unité.
 * Sinon (ou si rien ne précède le degré) la réponse telle quelle.
 */
export function withoutDegreeSuffix(answer: string, expected: string): string {
	if (!expectsUnitlessValue(expected)) return answer;
	const match = TRAILING_DEGREE.exec(degreeSymbolLatex(answer));
	if (!match) return answer;
	const value = match[1].trim();
	return value === '' ? answer : value;
}
