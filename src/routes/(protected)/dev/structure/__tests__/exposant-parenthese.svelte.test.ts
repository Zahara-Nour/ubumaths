/**
 * Structure d'une expression — l'exposant d'une parenthèse
 * ========================================================
 *
 * `(−½ + x)²` : le marqueur posé autour de la parenthèse faisait de la base un
 * groupe, et MathLive plaçait alors l'exposant d'après le dernier caractère
 * avant `)` (ici `x`, bas) au lieu de la parenthèse : exposant plus bas que
 * dans l'écriture sans marqueurs (mesuré : 66 px de haut au lieu de 73). Le
 * rendu marqué doit être identique à l'écriture usuelle (structure-expression.md,
 * « Comment c'est fait ») ; le cadre de la parenthèse, lui, s'arrête avant
 * l'exposant (A6 : la parenthèse, pas sa puissance).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
// Comme la page : polices et classes du rendu MathLive (le rendu local = celui de la CI)
import '$lib/utils/mathlive-styles';
import {
	MARKER_PREFIX,
	stripMarkers,
	structureFromLatex,
	type ExpressionStructure
} from '$lib/mathAST/structure';
import StructureFormula from '../StructureFormula.svelte';

// Constantes
const POWERS_OF_PARENTHESES = [
	String.raw`\left(-\frac{1}{2}+x\right)^2`,
	String.raw`\left(x-\frac{1}{2}\right)^2`,
	String.raw`(-x+1)^2`,
	String.raw`\left(\frac{1}{2}+x\right)^2`,
	String.raw`4\left(x-\frac{1}{2}\right)^3-1`,
	String.raw`(a+b)^{n+1}`,
	String.raw`(x+1)^{\frac{1}{2}}`,
	String.raw`\left|-\frac{1}{2}+x\right|^2`,
	String.raw`\lfloor -\frac{1}{2}+x\rfloor^2`
];

// Variables
let convert: (latex: string) => string;

beforeAll(async () => {
	// MathLive : import dynamique dans les tests client (docs/pratiques/tests.md § Pièges)
	const mathlive = await import('mathlive');
	convert = (latex) => mathlive.convertLatexToMarkup(latex);
});

// Fonctions
function structureOf(latex: string): ExpressionStructure {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') throw new Error(`non reconnue : ${latex}`);
	return result.structure;
}

/** Hauteur rendue et position du dernier exposant, relatives au rendu */
function rendered(latex: string): { height: number; supTop: number } {
	const host = document.body.appendChild(document.createElement('div'));
	host.style.cssText = 'position: absolute; left: 0; top: 0; font-size: 36px; white-space: nowrap';
	host.innerHTML = convert(latex);
	const box = host.getBoundingClientRect();
	const sups = host.querySelectorAll('.ML__sup, .ML__msubsup');
	const sup = sups[sups.length - 1];
	const supTop = sup ? sup.getBoundingClientRect().top - box.top : Number.NaN;
	host.remove();
	return { height: box.height, supTop };
}

describe('rendu marqué identique à l’écriture usuelle (puissance d’une parenthèse)', () => {
	for (const latex of POWERS_OF_PARENTHESES) {
		it(latex, () => {
			const structure = structureOf(latex);
			const marked = rendered(structure.latex);
			const plain = rendered(stripMarkers(structure.latex));
			expect(marked.height).toBeCloseTo(plain.height, 0);
			expect(marked.supTop).toBeCloseTo(plain.supTop, 0);
		});
	}
});

describe('le cadre de la parenthèse s’arrête avant l’exposant (A6)', () => {
	it.each(['(x+1)^2', String.raw`(x+1)^{\frac{1}{2}}`])('%s', async (latex) => {
		const structure = structureOf(latex);
		const parentheses = structure.nodes.find((n) => n.kind === 'parentheses');
		const exponent = structure.nodes.find((n) => n.role === 'exponent');
		if (!parentheses || !exponent) throw new Error('structure inattendue');
		// Comme dans la page : l'encadré arrive après le rendu de la formule
		const { container, rerender } = await render(StructureFormula, { structure });
		const span = container.querySelector('math-span');
		await expect
			.poll(() => span?.shadowRoot?.querySelectorAll(`[class*="${MARKER_PREFIX}"]`).length ?? 0)
			.toBeGreaterThan(0);
		await rerender({ structure, highlightId: parentheses.id });
		await expect.poll(() => container.querySelectorAll('.structure-frame').length).toBe(1);
		const frame = container.querySelector('.structure-frame')?.getBoundingClientRect();
		const two = span?.shadowRoot
			?.querySelector(`.${MARKER_PREFIX}${exponent.id}`)
			?.getBoundingClientRect();
		// (le « 2 » : l'exposant, quel qu'il soit)
		if (!frame || !two) throw new Error('cadre ou exposant introuvable');
		// La marge du cadre peut effleurer le 2, pas le couvrir
		expect(frame.right).toBeLessThan(two.left + two.width / 2);
	});
});
