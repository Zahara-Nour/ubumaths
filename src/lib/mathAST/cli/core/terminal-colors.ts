/**
 * Couleurs de terminal des commandes de la console.
 *
 * Les commandes servent à deux endroits : le terminal (`pnpm math`, REPL) et
 * l'atelier, dans le navigateur. Elles écrivent donc leurs mises en valeur par
 * cette palette, qui rend le **texte brut** par défaut ; seul le terminal y
 * branche de vraies couleurs (`enableTerminalColors`, appelée par `cli.ts`).
 *
 * Ainsi aucune bibliothèque de terminal n'entre dans le code envoyé au
 * navigateur, et l'atelier ne reçoit jamais de séquences ANSI.
 */

// =============================================================================
// Types
// =============================================================================

/** Une mise en valeur : prend un texte, le rend (coloré ou non). */
export type Paint = (text: string) => string;

/** Les mises en valeur dont se servent les commandes. */
export interface TerminalPalette {
	readonly bold: Paint;
	readonly dim: Paint;
	readonly cyan: Paint;
	readonly yellow: Paint;
	readonly green: Paint;
	readonly red: Paint;
	readonly gray: Paint;
	readonly magenta: Paint;
	readonly blue: Paint;
	readonly white: Paint;
	readonly boldYellow: Paint;
	readonly boldGreen: Paint;
	readonly boldRed: Paint;
}

// =============================================================================
// Constantes
// =============================================================================

const plainText: Paint = (text) => text;

/** La palette par défaut : aucune couleur. */
export const PLAIN_PALETTE: TerminalPalette = {
	bold: plainText,
	dim: plainText,
	cyan: plainText,
	yellow: plainText,
	green: plainText,
	red: plainText,
	gray: plainText,
	magenta: plainText,
	blue: plainText,
	white: plainText,
	boldYellow: plainText,
	boldGreen: plainText,
	boldRed: plainText
};

// =============================================================================
// Variables
// =============================================================================

let active: TerminalPalette = PLAIN_PALETTE;

// =============================================================================
// Functions
// =============================================================================

/** Branche une palette colorée — à n'appeler que depuis un point d'entrée de terminal. */
export function enableTerminalColors(palette: TerminalPalette): void {
	active = palette;
}

/** Revient au texte brut (tests). */
export function disableTerminalColors(): void {
	active = PLAIN_PALETTE;
}

/**
 * Ce qu'utilisent les commandes : chaque appel lit la palette active, pour que
 * le branchement fait au démarrage du terminal vaille aussi pour les modules
 * déjà chargés.
 */
export const colors: TerminalPalette = {
	bold: (text) => active.bold(text),
	dim: (text) => active.dim(text),
	cyan: (text) => active.cyan(text),
	yellow: (text) => active.yellow(text),
	green: (text) => active.green(text),
	red: (text) => active.red(text),
	gray: (text) => active.gray(text),
	magenta: (text) => active.magenta(text),
	blue: (text) => active.blue(text),
	white: (text) => active.white(text),
	boldYellow: (text) => active.boldYellow(text),
	boldGreen: (text) => active.boldGreen(text),
	boldRed: (text) => active.boldRed(text)
};
