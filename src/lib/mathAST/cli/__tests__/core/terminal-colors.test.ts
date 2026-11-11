/**
 * Les commandes rendent du texte brut ; seul le terminal colore.
 *
 * Garde aussi que `chalk` n'entre que par les points d'entrée du terminal :
 * importé par une commande, il partirait dans le code de l'atelier.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';
import {
	colors,
	disableTerminalColors,
	enableTerminalColors,
	PLAIN_PALETTE,
	type TerminalPalette
} from '../../core/terminal-colors';
import { useChalkColors } from '../../terminal-palette';
import chalk from 'chalk';

const SRC = join(process.cwd(), 'src');

/** Les seuls fichiers de `src` qui ont le droit d'importer `chalk`. */
const TERMINAL_ENTRY_POINTS = [
	'lib/mathAST/cli/cli.ts',
	'lib/mathAST/cli/repl.ts',
	'lib/mathAST/cli/terminal-palette.ts'
];

/** Toute mention du module `chalk` (import, import nu, sous-chemin, require). */
const CHALK_SPECIFIER = /['"]chalk(\/[^'"]*)?['"]/;

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
		return /\.(ts|svelte)$/.test(entry.name) ? [path] : [];
	});
}

/** Tout ce que la console de l'atelier reçoit pour une ligne tapée. */
function runInAtelier(input: string): string {
	return JSON.stringify(new WebReplEngine().execute(input));
}

afterEach(() => disableTerminalColors());

describe('palette des commandes', () => {
	it('rend le texte brut par défaut', () => {
		expect(colors.bold('a')).toBe('a');
		expect(colors.boldRed('b')).toBe('b');
	});

	it('suit la palette branchée par le terminal', () => {
		enableTerminalColors({ ...PLAIN_PALETTE, cyan: (text) => `<c>${text}</c>` });
		expect(colors.cyan('x')).toBe('<c>x</c>');
		expect(colors.bold('x')).toBe('x');
	});

	it.each([
		'.help',
		'.diff x^2',
		'.variations x^2-3x+1',
		'.equiv x+x 2x',
		'.eval x>2 x=3',
		'.integrate 2x',
		'.domain 1/x',
		'.inv 2x+1',
		'.normal (x+1)^2',
		'.nimporte'
	])("aucune séquence ANSI pour « %s » quand rien n'est branché", (input) => {
		// JSON.stringify écrit ESC sous la forme \u001b
		expect(runInAtelier(input)).not.toContain('\\u001b');
	});
});

describe('chalk reste au terminal', () => {
	it("n'est importé que par les points d'entrée du terminal", () => {
		const importers = sourceFiles(SRC)
			.filter((file) => CHALK_SPECIFIER.test(readFileSync(file, 'utf8')))
			.map((file) => relative(SRC, file))
			.sort();
		expect(importers).toEqual([...TERMINAL_ENTRY_POINTS].sort());
	});
});

describe('le terminal branche chalk', () => {
	it('chaque mise en valeur rend le style chalk du même nom', () => {
		const level = chalk.level;
		chalk.level = 1;
		try {
			useChalkColors();
			const expected: Record<keyof TerminalPalette, string> = {
				bold: chalk.bold('t'),
				dim: chalk.dim('t'),
				cyan: chalk.cyan('t'),
				yellow: chalk.yellow('t'),
				green: chalk.green('t'),
				red: chalk.red('t'),
				gray: chalk.gray('t'),
				magenta: chalk.magenta('t'),
				blue: chalk.blue('t'),
				white: chalk.white('t'),
				boldYellow: chalk.bold.yellow('t'),
				boldGreen: chalk.bold.green('t'),
				boldRed: chalk.bold.red('t')
			};
			for (const [name, painted] of Object.entries(expected)) {
				expect(colors[name as keyof TerminalPalette]('t'), name).toBe(painted);
				expect(painted, name).not.toBe('t');
			}
		} finally {
			chalk.level = level;
		}
	});
});
