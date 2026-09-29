/**
 * Garde : les tests navigateur chargent les styles de l'application
 * =================================================================
 *
 * `vitest-setup-client.ts` importe `src/app.css`. Sans lui, les classes
 * Tailwind n'ont aucun effet dans les tests : un élément `hidden` ou `opacity-0`
 * reste visible, un `overflow-y-auto` ne défile pas — et un test qui prétend
 * vérifier ce comportement passe à tort (constaté le 2026-09-30).
 */
import { describe, it, expect } from 'vitest';

describe('Tailwind dans les tests navigateur', () => {
	it('les classes utilitaires ont un effet réel', () => {
		const hidden = document.createElement('div');
		hidden.className = 'hidden';
		const styled = document.createElement('div');
		styled.className = 'overflow-y-auto opacity-0 p-4';
		document.body.append(hidden, styled);

		const computed = getComputedStyle(styled);
		expect(getComputedStyle(hidden).display).toBe('none');
		expect(computed.overflowY).toBe('auto');
		expect(computed.opacity).toBe('0');
		expect(computed.paddingTop).toBe('16px');

		hidden.remove();
		styled.remove();
	});
});
