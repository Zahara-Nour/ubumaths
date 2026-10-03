/**
 * Garde : toute commande MathLive dont un argument est une valeur ou une chaîne
 * LIBRE est classée — bloquée en mode restreint, ou examinée et sûre.
 *
 * L'audit du 2026-10-03 a contourné la première liste par `\colorbox` : MathLive
 * recopie une couleur non reconnue telle quelle dans `style=`. Une future version
 * de MathLive qui ajouterait une telle commande ferait échouer ce test au lieu
 * de rouvrir la fuite en silence.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REVIEWED_SAFE_MATH_COMMANDS, UNSAFE_MATH_COMMANDS } from '../restricted-rendering';

/** Les commandes de MathLive dont la signature a un argument :value / :string / :raw / :color */
function freeArgumentCommands(): string[] {
	const source = readFileSync(resolve(process.cwd(), 'node_modules/mathlive/mathlive.mjs'), 'utf8');
	const found = new Set<string>();
	// Noms entre "…" ou '…' (`defineFunction('"', …)`), seuls ou en tableau
	const call =
		/defineFunction\(\s*(\[[^\]]*\]|"[^"\n]{1,40}"|'[^'\n]{1,40}')\s*,\s*["']([^"'\n]*)["']/g;
	for (const m of source.matchAll(call)) {
		if (!/:(value|string|color|raw)\b/.test(m[2])) continue;
		for (const name of m[1].matchAll(/"([^"\n]+)"|'([^'\n]+)'/g)) found.add(name[1] ?? name[2]);
	}
	return [...found].sort();
}

describe('commandes MathLive à argument libre', () => {
	const commands = freeArgumentCommands();

	it('en trouve (le format de MathLive est toujours lisible)', () => {
		expect(commands.length).toBeGreaterThan(20);
	});

	it('chacune est classée : bloquée en mode restreint, ou examinée et sûre', () => {
		const classified = new Set<string>([...UNSAFE_MATH_COMMANDS, ...REVIEWED_SAFE_MATH_COMMANDS]);
		expect(commands.filter((c) => !classified.has(c))).toEqual([]);
	});
});
