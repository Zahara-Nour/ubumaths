/**
 * Pedagogical Simplify — Identités log/exp demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const IDENTITES_LOG_EXP: DemoCategory = {
	name: 'identites-log-exp',
	cases: [
		// Le snapshot figeait « no steps » : manque comblé par fix/normalize-ln-exp
		// (normalize réduit e^{ln x} → x, étape `euler-identities`).
		{ label: 'e^(ln x)', latex: 'e^{\\ln(x)}', intent: 'reduire' },
		{ label: 'ln(eˣ)', latex: '\\ln(e^x)', intent: 'reduire' },
		{ label: 'ln(2·3)', latex: '\\ln(2 \\cdot 3)', intent: 'reduire' }
	]
};
