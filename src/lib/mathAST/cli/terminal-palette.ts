/**
 * Les vraies couleurs du terminal, par `chalk`.
 *
 * ⚠️ Terminal seulement : importé par `cli.ts` et `repl.ts`, jamais par une
 * commande ni par le code de l'atelier (cf. `core/terminal-colors.ts`).
 */

import chalk from 'chalk';
import { enableTerminalColors } from './core/terminal-colors';

/** Branche `chalk` sur la palette des commandes (il décide seul si le terminal sait colorer). */
export function useChalkColors(): void {
	enableTerminalColors({
		bold: (text) => chalk.bold(text),
		dim: (text) => chalk.dim(text),
		cyan: (text) => chalk.cyan(text),
		yellow: (text) => chalk.yellow(text),
		green: (text) => chalk.green(text),
		red: (text) => chalk.red(text),
		gray: (text) => chalk.gray(text),
		magenta: (text) => chalk.magenta(text),
		blue: (text) => chalk.blue(text),
		white: (text) => chalk.white(text),
		boldYellow: (text) => chalk.bold.yellow(text),
		boldGreen: (text) => chalk.bold.green(text),
		boldRed: (text) => chalk.bold.red(text)
	});
}
