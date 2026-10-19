/**
 * Ce que MathLive écrit quand l'élève tape un angle — la mesure derrière
 * `degrees.ts` (2026-10-19). Tourne dans un vrai navigateur (projet « client »).
 *
 * Mesuré dans Chromium : taper `°` écrit `60\degree` ; une valeur injectée
 * (collage, énoncé) garde `60°` ou `60^{\circ}`. Les trois se lisent 60°.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput } from '../calcul';
import { definitionFromField } from '../mathfield';
import { calcTextOf } from '../natural-input';

async function fieldAfter(act: (mf: HTMLElement & Record<string, never>) => void): Promise<string> {
	const { MathfieldElement } = await import('mathlive');
	const mf = new MathfieldElement();
	document.body.appendChild(mf);
	mf.focus();
	act(mf as unknown as HTMLElement & Record<string, never>);
	const latex = mf.getValue('latex');
	mf.remove();
	return latex;
}

describe('MathLive et le signe degré', () => {
	it('taper « 60° » écrit 60\\degree', async () => {
		const latex = await fieldAfter((mf) =>
			(mf as unknown as { executeCommand(c: [string, string]): void }).executeCommand([
				'typedText',
				'60°'
			])
		);
		expect(latex).toBe('60\\degree');
	});

	it('taper « cos(60°) » : le cosinus de 60°, dans une carte comme dans la console', async () => {
		// Touche par touche : `typedText` ne déclenche pas le raccourci « cos » →
		// `\cos` d'une vraie frappe (D10, `mathlive-shortcuts.svelte.test.ts`) ;
		// le signe degré, si
		const typedKeys = await fieldAfter((mf) => {
			for (const key of 'cos(60°)') {
				(mf as unknown as { executeCommand(c: [string, string]): void }).executeCommand([
					'typedText',
					key
				]);
			}
		});
		expect(typedKeys).toBe('cos(60\\degree)');
		const latex = typedKeys.replace(/^cos/, '\\cos');
		// La carte : une valeur lue dans le champ
		const atelier = new Atelier();
		atelier.create(
			{ kind: 'value', name: 'a', definition: definitionFromField('value', latex) },
			'mathfield'
		);
		const s = { atelier, engine: new WebReplEngine(), seed: () => 1 };
		const a = runInput(s, 'a');
		expect(a.kind === 'calcul' && a.output).toBe('1/2');
		// La console en écriture mathématique : le texte que reçoit Calcul
		const text = calcTextOf(latex, []);
		if (!text.ok) throw new Error(text.message);
		const line = runInput(s, text.text);
		expect(line.kind === 'calcul' && line.output).toBe('1/2');
	});

	it('une valeur injectée garde son écriture : 60^{\\circ}', async () => {
		const latex = await fieldAfter((mf) =>
			(mf as unknown as { insert(s: string): void }).insert('60^{\\circ}')
		);
		expect(latex).toBe('60^{\\circ}');
		const s = { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
		const line = runInput(s, latex);
		expect(line.kind === 'calcul' && line.output).toBe('60°');
	});
});
