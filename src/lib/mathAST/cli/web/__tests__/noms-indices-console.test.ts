/**
 * Un nom indicé (`a_1`) dans la console : la liste des variables non liées le
 * nomme en entier, comme `getMissingBindings` (revue mathAST, 2026-10-19 :
 * `a_1 x` affichait « (variables: a, x) »).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

describe('les noms indicés dans la console', () => {
	it('a_1 x non lié : « (variables: a_1, x) »', () => {
		expect(new WebReplEngine().execute('a_1 x').output).toContain('(variables: a_1, x)');
	});

	it('u_n non lié : la base et l’indice, comme avant', () => {
		expect(new WebReplEngine().execute('u_n').output).toContain('(variables: n, u)');
	});
});
