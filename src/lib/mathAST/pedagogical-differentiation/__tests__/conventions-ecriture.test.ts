/**
 * Les conventions d'écriture de David, appliquées à la dérivation expliquée.
 *
 * ⚠️ Même règle que pour `pedagogical-solve` (#365) : **pas de point médian
 * pour une multiplication**, c'est `\times`. Les explications de ce module
 * l'employaient neuf fois — « (\sin u)' = \cos(u) \cdot u' » — et elles
 * arrivent désormais sous les yeux de l'élève, dans l'atelier.
 */

import { describe, it, expect } from 'vitest';
import { generatePedagogicalDifferentiationSteps } from '../index';
import { PedagogicalDifferentiationRenderer } from '../renderer';
import { parseCustomSafe } from '../../parser/custom';
import { EXPLANATIONS } from '../descriptions-fr';

function ast(source: string) {
	const parsed = parseCustomSafe(source);
	if (parsed.ast === undefined) throw new Error(`parse KO : ${source}`);
	return parsed.ast;
}

function renderedFor(source: string) {
	const result = generatePedagogicalDifferentiationSteps(ast(source), {
		variable: 'x',
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	return new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
}

/** Tout ce qu'une étape et ses sous-étapes donnent à lire. */
function allText(source: string): string {
	const parts: string[] = [];
	const walk = (steps: readonly { title: string; explanation?: string; subSteps?: never }[]) => {
		for (const step of steps) {
			parts.push(step.title, step.explanation ?? '');
			if (step.subSteps) walk(step.subSteps);
		}
	};
	walk(renderedFor(source) as never);
	return parts.join(' ');
}

describe('les multiplications s’écrivent en croix', () => {
	it('la composition avec un sinus', () => {
		const texte = allText('sin(x^2)');

		expect(texte).toContain('\\times');
		expect(texte).not.toContain('\\cdot');
	});

	it('une constante en facteur', () => {
		expect(allText('3*sin(x)')).not.toContain('\\cdot');
	});

	it('une puissance composée', () => {
		expect(allText('(x^2+1)^3')).not.toContain('\\cdot');
	});

	it('une exponentielle composée', () => {
		expect(allText('exp(x^2)')).not.toContain('\\cdot');
	});

	/**
	 * ⚠️ Le garde qui compte : les explications sont écrites une par une dans
	 * `descriptions-fr.ts`, et rien n'empêche d'en ajouter une au point médian.
	 * On les vérifie donc TOUTES, pas seulement celles qu'un exemple traverse.
	 */
	it('aucune explication du module n’emploie le point médian', () => {
		// `EXPLANATIONS` est indexé par niveau, puis par règle.
		const fautives: string[] = [];
		for (const [level, rules] of Object.entries(EXPLANATIONS)) {
			for (const [rule, explain] of Object.entries(rules)) {
				if (typeof explain !== 'function') continue;
				const texte = String(explain({} as never));
				if (texte.includes('\\cdot')) fautives.push(`${level}/${rule}`);
			}
		}

		expect(fautives).toEqual([]);
	});

	it('et il y a bien des explications à vérifier', () => {
		// ⚠️ Sans ce compte, le test ci-dessus passerait sur une table VIDE —
		// vert en ne vérifiant rien.
		const total = Object.values(EXPLANATIONS).reduce(
			(n, rules) => n + Object.keys(rules).length,
			0
		);
		expect(total).toBeGreaterThan(10);
	});
});
