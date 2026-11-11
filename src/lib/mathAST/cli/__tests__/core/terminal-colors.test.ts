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
	PLAIN_PALETTE
} from '../../core/terminal-colors';

const SRC_LIB = join(process.cwd(), 'src/lib');

/** Les seuls fichiers de `src/lib` qui ont le droit d'importer `chalk`. */
const TERMINAL_ENTRY_POINTS = [
	'mathAST/cli/cli.ts',
	'mathAST/cli/repl.ts',
	'mathAST/cli/terminal-palette.ts'
];

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

	it.each(['.help', '.diff x^2', '.variations x^2-3x+1', '.equiv x+x 2x', '.nimporte'])(
		"aucune séquence ANSI pour « %s » quand rien n'est branché",
		(input) => {
			// JSON.stringify écrit ESC sous la forme \u001b
			expect(runInAtelier(input)).not.toContain('\\u001b');
		}
	);
});

describe('chalk reste au terminal', () => {
	it("n'est importé que par les points d'entrée du terminal", () => {
		const importers = sourceFiles(SRC_LIB)
			.filter((file) =>
				/from ['"]chalk['"]|import\(['"]chalk['"]\)/.test(readFileSync(file, 'utf8'))
			)
			.map((file) => relative(SRC_LIB, file))
			.sort();
		expect(importers).toEqual([...TERMINAL_ENTRY_POINTS].sort());
	});
});
