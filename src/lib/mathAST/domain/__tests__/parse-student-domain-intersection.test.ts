/**
 * `∩` entre intervalles, seulement sur option (chantier tidy-conditions,
 * 2026-10-26) : l'atelier en a besoin pour `dans …` ; une réponse d'élève ne
 * l'accepte pas (`]0;+∞[ ∩ ]-∞;5]` n'est pas `]0;5]` écrit).
 */

import { describe, it, expect } from 'vitest';
import { parseStudentDomain } from '../validation/parse-student-domain';
import { formatInterval } from '../format';

const read = (input: string) => {
	const result = parseStudentDomain(input, 'x', { intersections: true });
	return result.success ? formatInterval(result.domain) : null;
};

describe('∩ entre intervalles, sur option', () => {
	it.each([
		[']0;+∞[ ∩ ]-∞;5]', formatInterval(okDomain(']0;5]'))],
		['[-1;1] ∩ [0;2]', formatInterval(okDomain('[0;1]'))],
		[']-∞;0[ ∪ ]0;+∞[ ∩ ]-∞;3]', formatInterval(okDomain(']-∞;0[ ∪ ]0;3]'))],
		['ℝ \\ {0} ∩ [-2;2]', formatInterval(okDomain('[-2;0[ ∪ ]0;2]'))]
	])('%s → %s', (input, expected) => {
		expect(read(input)).toBe(expected);
	});

	it('\\cap de MathLive se lit ∩', () => {
		expect(read(']0;+\\infty[ \\cap ]-\\infty;5]')).toBe(formatInterval(okDomain(']0;5]')));
	});

	it('intersection incomplète : refus', () => {
		expect(read(']0;+∞[ ∩')).toBeNull();
	});

	it('sans l’option, une réponse d’élève refuse ∩', () => {
		expect(parseStudentDomain(']0;+∞[ ∩ ]-∞;5]', 'x').success).toBe(false);
	});
});

function okDomain(input: string) {
	const result = parseStudentDomain(input, 'x');
	if (!result.success) throw new Error(input);
	return result.domain;
}
