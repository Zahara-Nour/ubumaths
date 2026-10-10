/**
 * Continuité de sign(u) quand u = 0 n'est pas résolue
 *
 * Mesuré avant le correctif : les zéros de l'argument de `sign` sont les
 * points de saut. Un échec du solveur devenait « aucun zéro », donc « aucun
 * saut », et `sign(eˣ − 3x)` — qui saute vers 0,62 et 1,51 — était déclarée
 * « continue sur tout son domaine de définition ».
 */

import { describe, it, expect } from 'vitest';
import { analyzeContinuity } from '../continuity';
import { parseCustom } from '../../parser/custom';

describe('sign(eˣ − 3x) : les sauts ne sont pas trouvés', () => {
	it('ne se déclare pas continue, et dit pourquoi', () => {
		const result = analyzeContinuity(parseCustom('sign(e^x - 3x)'), 'x', {
			verbosity: 'summarized'
		});
		expect(result.candidatesUnresolved).toBe(true);
		expect(result.isContinuousOnDomain).toBe(false);
		const summary = result.steps?.at(-1)?.description ?? '';
		expect(summary).not.toContain('continue sur tout son domaine');
		expect(summary).toContain("n'a pas pu");
	});
});

describe('Ce qui ne doit pas bouger', () => {
	it('sign(2x + 3) : un saut en −3/2, sans drapeau', () => {
		const result = analyzeContinuity(parseCustom('sign(2x + 3)'), 'x');
		expect(result.candidatesUnresolved).toBeFalsy();
		expect(result.discontinuities).toHaveLength(1);
	});

	it('abs(e^x − 3x) : continue (les zéros de |u| ne sont pas des sauts)', () => {
		const result = analyzeContinuity(parseCustom('abs(e^x - 3x)'), 'x');
		expect(result.candidatesUnresolved).toBeFalsy();
		expect(result.isContinuousOnDomain).toBe(true);
	});

	it('sign(e^x + 1) : aucun zéro DÉMONTRÉ, continue', () => {
		const result = analyzeContinuity(parseCustom('sign(e^x + 1)'), 'x');
		expect(result.candidatesUnresolved).toBeFalsy();
		expect(result.isContinuousOnDomain).toBe(true);
	});
});
