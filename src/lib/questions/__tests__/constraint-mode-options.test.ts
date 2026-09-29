/**
 * Libellé du défaut dans l'éditeur de contraintes : `form` est `strict` par
 * défaut, les autres contraintes `warn` (ADR 0013).
 */
import { describe, it, expect } from 'vitest';
import { constraintModeOptions } from '../constraint-constants';

describe('constraintModeOptions', () => {
	it('form : « Défaut (strict) »', () => {
		expect(constraintModeOptions('form')[0]).toEqual({ value: '', label: 'Défaut (strict)' });
	});

	it('brackets : « Défaut (warn) »', () => {
		expect(constraintModeOptions('brackets')[0]).toEqual({ value: '', label: 'Défaut (warn)' });
	});

	it('les modes explicites restent proposés', () => {
		expect(constraintModeOptions('form').map((o) => o.value)).toEqual([
			'',
			'strict',
			'warn',
			'off'
		]);
	});
});
