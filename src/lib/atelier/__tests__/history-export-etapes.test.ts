/**
 * V25 : les titres des étapes pédagogiques portent leurs formules entre
 * `$…$` (rendues par ubumark). L'export ubumark doit les garder en formules,
 * pas les échapper en `\$` — et toujours neutraliser `*` et `~` hors des maths.
 */

import { describe, it, expect } from 'vitest';
import type { Entry } from '../desk.svelte';
import { historyToUbumark } from '../history-export';
import { parseMarkdown } from '$lib/ubumark';

const now = new Date('2026-10-12T10:00:00Z');

function entryWithStep(title: string): Entry {
	return {
		id: 1,
		label: '.résoudre 2/3x+1=5',
		text: 'x = 6',
		latex: 'x = 6',
		failed: false,
		replay: { kind: 'saisie', input: '.résoudre 2/3x+1=5' },
		steps: [{ id: 1, rule: 'divide-both-sides', title, expressionLatex: 'x = 6' }]
	} as Entry;
}

/** La ligne de liste de l'étape, telle qu'exportée */
function stepLine(md: string): string {
	const line = md.split('\n').find((l) => l.startsWith('- '));
	if (line === undefined) throw new Error('pas de ligne d’étape');
	return line;
}

describe('export ubumark : les maths d’un titre d’étape', () => {
	it('restent des formules `$…$`, relues comme telles', () => {
		const md = historyToUbumark(
			[entryWithStep('On divise les deux membres par $\\dfrac{2}{3}$')],
			now
		);
		const line = stepLine(md);

		expect(line).toBe('- On divise les deux membres par $\\dfrac{2}{3}$ : $x = 6$');
		const inline = JSON.stringify(parseMarkdown(line));
		expect(inline).toContain('"expression":"\\\\dfrac{2}{3}"');
		expect(inline).not.toContain('\\\\$');
	});

	it('la prose autour reste neutralisée : ni italique, ni formule `~`', () => {
		const md = historyToUbumark([entryWithStep('Pas à pas ~ 2*3 avec $u = x$')], now);

		expect(stepLine(md)).toBe('- Pas à pas \\~ 2×3 avec $u = x$ : $x = 6$');
	});

	it('un `$` isolé dans un titre reste un caractère', () => {
		const md = historyToUbumark([entryWithStep('Coût : 5 $')], now);

		expect(stepLine(md)).toBe('- Coût : 5 \\$ : $x = 6$');
	});
});
