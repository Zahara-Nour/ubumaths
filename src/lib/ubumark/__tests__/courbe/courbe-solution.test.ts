/**
 * Repère `solution: oui` : la réponse dessinée (V108, M44)
 * ========================================================
 *
 * Le corrigé imprimé d'une série d'automatismes dessine la réponse d'un repère
 * à compléter : `solution: oui`, avec `placer:` ou `tracer:`, sans `case:`.
 * Le repère n'est plus un geste à faire (aucune case), écran et PDF dessinent
 * la même réponse (`solvedOverlay`).
 */
import { describe, expect, it } from 'vitest';

import { generateCourbeTypst } from '../../generators/courbe-typst';
import { findCourbesToPlace, parseCourbeContent } from '../../parser/courbe-parser';
import { solvedOverlay } from '../../utils/courbe-solution';

const WINDOW = ['x: -5 ; 5', 'y: -5 ; 5', 'grille: 1'];
const block = (...lines: string[]) => parseCourbeContent([...WINDOW, ...lines].join('\n'));

describe('parseur', () => {
	it('oui : la réponse est dessinée ; non : rien ne change', () => {
		expect(block('tracer: x = 3', 'solution: oui').spec?.solution).toBe(true);
		expect(block('tracer: x = 3', 'solution: non').spec?.solution).toBeUndefined();
	});

	it('sans geste, avec une case, ou ni oui ni non : refusé', () => {
		expect(block('solution: oui').errors[0]?.message).toMatch(/placer: ou tracer:/);
		expect(block('tracer: x = 3', 'case: 0', 'solution: oui').errors[0]?.message).toMatch(
			/pas avec case/
		);
		expect(block('tracer: x = 3', 'solution: peut-être').errors[0]?.message).toMatch(/oui ou non/);
	});

	it('un repère dessiné n’est pas un geste à faire', () => {
		const repere = (extra: string[]) =>
			['```courbe', ...WINDOW, 'tracer: x = 3', ...extra, '```'].join('\n');
		expect(findCourbesToPlace(repere([]))).toHaveLength(1);
		expect(findCourbesToPlace(repere(['solution: oui']))).toHaveLength(0);
	});
});

describe('réponse dessinée', () => {
	it('droite verticale : d’un bord à l’autre, deux nœuds', () => {
		const { marks, traces } = solvedOverlay(block('tracer: x = 3', 'solution: oui').spec!);
		expect(traces).toEqual([
			{ from: { x: 3, y: -5 }, to: { x: 3, y: 5 }, arrow: false, dashed: false }
		]);
		expect(marks).toHaveLength(2);
		expect(marks.every((m) => m.x === 3 && m.name === '')).toBe(true);
	});

	it('points à placer : nommés', () => {
		const { marks } = solvedOverlay(block('placer: A=(2 ; 3)', 'solution: oui').spec!);
		expect(marks).toEqual([{ name: 'A', x: 2, y: 3 }]);
	});

	it('PDF : la droite verticale en vert ; sans `solution: oui`, rien', () => {
		expect(generateCourbeTypst(block('tracer: x = 3'))).not.toContain('// solution');
		const out = generateCourbeTypst(block('tracer: x = 3', 'solution: oui'));
		expect(out).toContain('// solution droite');
	});
});
