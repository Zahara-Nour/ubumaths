/**
 * §6 bis N4 — un collage s'annule.
 *
 * Tourne dans un vrai navigateur : c'est le seul endroit où la pile
 * d'annulation de MathLive existe vraiment.
 */

import { describe, it, expect } from 'vitest';
import { insertPasted } from '../paste';

describe('annulation d’un collage', () => {
	it('revient à l’état d’avant', async () => {
		const { MathfieldElement } = await import('mathlive');
		const mf = new MathfieldElement();
		document.body.appendChild(mf);

		mf.setValue('x^2', { format: 'latex' });
		insertPasted(mf, 'sin(x)');
		expect(mf.getValue('latex')).toContain('\\sin');

		mf.executeCommand('undo');
		expect(mf.getValue('latex')).toBe('x^2');

		mf.remove();
	});
});
