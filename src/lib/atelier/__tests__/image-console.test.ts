/**
 * « Image d'un nombre » depuis la carte d'une fonction — lot 3 de
 * `docs/wip/atelier-refonte-interface-phase0.md`.
 *
 * Décision de David (2026-10-18) : l'action prépare `f(` dans la console ;
 * l'élève tape x et valide, comme s'il avait tapé `f(3)` lui-même.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { actionsFor } from '../actions';

function withF(definition = 'x^2'): { atelier: Atelier; desk: CalcDesk } {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	return { atelier, desk: new CalcDesk(atelier) };
}

describe('« Image d’un nombre »', () => {
	it('est une action d’une fonction', () => {
		const { atelier } = withF();

		const labels = actionsFor(atelier.get('f')!, atelier).map((a) => a.label);

		expect(labels).toContain('Image d’un nombre');
	});

	it('prépare f( dans la console, sans rien écrire dans l’historique', () => {
		const { desk } = withF();

		const outcome = desk.runFromPanel('image', 'f');

		expect(outcome).toBe('needs-argument');
		expect(desk.draft).toBe('f(');
		expect(desk.entries).toHaveLength(0);
	});

	it('la ligne complétée donne l’image', () => {
		const { desk } = withF();
		desk.runFromPanel('image', 'f');

		desk.draft = `${desk.draft}3)`;
		desk.submit(desk.draft);

		expect(desk.entries.at(-1)?.text).toContain('9');
	});

	it('est indisponible, avec sa raison, quand f ne peut rien produire', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');

		const image = actionsFor(atelier.get('f')!, atelier).find((a) => a.id === 'image');

		expect(image?.disabledReason).toBeDefined();
	});
});
