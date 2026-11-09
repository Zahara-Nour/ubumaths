/**
 * `.résoudre` : les étapes de l'Atelier concluent sur la réponse du registre
 * (chantier `registre-reference`, D1, D3, R5 et Q2).
 *
 * La réponse est l'ensemble des solutions, équations comprises : `S = \{3\}`,
 * `S = ]-\infty ; 3[`, `S = \{ \pi/4 + k\pi, k \in \mathbb{Z} \}` (David,
 * 2026-11-01 et 2026-11-03). Deux contrôles par ligne : la dernière étape
 * affichée est la ligne affichée ; la ligne affichée est la réponse du
 * registre (`answer`), à l'écriture près des espaces.
 * Lignes : les `.résoudre` des tests de l'Atelier, relevées le 2026-11-03.
 */

import { describe, expect, it } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { resolveCommand } from '../commands';
import { Atelier } from '../atelier.svelte';
import { runInput } from '../calcul';
import { displayUnitsInLatex } from '$lib/mathAST/units/display';
import { degreeSignWritten } from '$lib/mathAST/cli/core/degrees';

const LINES: readonly string[] = [
	'-x^2+x+1=0',
	// Plusieurs solutions en ln : décimaux à la française (revue de la PR 2b)
	'(e^x-0.5)(e^x-3)=0',
	'(e^x-0.5)(e^x-3)=0 dans [-5;5]',
	'(x-1)^(2/3)=4',
	'(x^2-1)^2>0',
	'(x+1)^2=4',
	'|2x+1|=5',
	'0,5x + 1 = 0,2',
	'0,5x+3=1',
	'0.5x+3=1',
	'0=0 dans ]0;1]',
	'0x=5',
	'1/x=0',
	'2 t = 3 pour t',
	'2(x+1)<7',
	'2/3x+1=5',
	'2t+1<5',
	'2t+1<5 ; t',
	'2t+1=7',
	'2x = 0,6',
	'2x^3=x',
	'2x+1<7',
	'2x+1=5',
	'2x=3',
	'3 = 2 x',
	'3 = 2t',
	'3 = 2t ; t',
	'3-v=1 ; v',
	'3x = 1',
	'3x+5=14',
	'3x+5=14 x',
	'A = 2',
	'a t = 3 pour t',
	'a x = 4',
	'b*x+5=14',
	'cos(-2x)=0',
	'cos(-60°)x=1',
	'cos(π/3)x=1',
	'cos(π/5)x=1',
	'cos(20°)x=1',
	'cos(2x)=cos(x)',
	'cos(60°)t = 1',
	'cos(60°)x=1',
	'cos(x)=sin(x)',
	'e^(2x)-3e^x+2=0',
	'e^x=2',
	'e^x=3',
	'e^x=e',
	'sin(2x)=sin(x)',
	'sin(3x)=1',
	'sin(x)=0 dans [0;4]',
	'sin(x)=1/2',
	'sin(x)cos(x)=0',
	'sin(x/3)=0',
	'sqrt(x)=1/2',
	't^2=4 dans [0;+∞[ pour t',
	'tan(x)=1',
	'x - A = 0',
	'x^(-2/3)=4',
	'x^(1/3)=x^3',
	'x^(2/3)=4',
	'x^(2/3)=x',
	'x^2 - x - 1 = 0',
	'x^2 = 0,5',
	'x^2 = 3/4',
	'x^2 = 4',
	'x^2 = cos(20°) dans [0;5]',
	'x^2-3x+1=0',
	'x^2-3x+2=0',
	'x^2-4=0',
	'x^2-4>=0',
	'x^2-5x+6=0',
	'x^2=-1',
	'x^2=1',
	'x^2=1 dans [0;2]',
	'x^2=1/4 dans [0,1;1]',
	'x^2=2',
	'x^2=2 dans [0;1,5]',
	'x^2=4',
	'x^2=4 dans [0;+∞[',
	'x^2=4 dans [0;5]',
	'x^2>0',
	'x^2>4',
	'x^3 = cos(60°) pour x',
	'x^3-x=0',
	'x^3=8',
	'x^4 = cos(0°) pour x',
	'x^4=2',
	'x+0.5=2',
	'x+cos(π/3)=1',
	'x+cos(420°)=1',
	'x=x',
	'x=x dans [0;1]',
	'x=x+1 dans [0;1]'
];

/**
 * La réponse du registre telle que l'Atelier l'écrit : unités en LaTeX lisible,
 * degré en exposant (`20~\\unit{°}` → `20{}^{\\circ}`), comme `.simplifier`.
 */
function asShown(answer: string): string {
	return degreeSignWritten(displayUnitsInLatex(answer));
}

function flat(latex: string | undefined): string {
	return (latex ?? '').replace(/\s+/g, '');
}

describe('.résoudre : l’Atelier conclut sur la réponse du registre', () => {
	it.each(LINES)('%s', (line) => {
		const typed = `.résoudre ${line}`;
		const registre = new WebReplEngine().execute(resolveCommand(typed));
		const shown = runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, typed);
		const answered = registre.success && registre.answer !== undefined;
		// L'Atelier répond : le registre aussi (PR 2c — virgule, degrés, décimaux lus)
		if (shown.kind === 'commande') expect(answered, 'l’Atelier répond, le registre non').toBe(true);
		if (shown.kind !== 'commande') {
			expect(answered, 'le registre répond, l’Atelier refuse').toBe(false);
			return;
		}
		const last = shown.steps?.at(-1);
		if (last !== undefined) expect(flat(last.expressionLatex)).toBe(flat(shown.latex));
		if (answered) expect(flat(shown.latex)).toBe(flat(asShown(registre.answer ?? '')));
	});
});
