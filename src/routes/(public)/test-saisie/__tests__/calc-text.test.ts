/**
 * Prototype jetable de la saisie naturelle : la logique pure (règles des mots,
 * complétion, passage au texte de Calcul), et les exemples du brief exécutés
 * par la VRAIE chaîne (`runInput` sur un `Atelier`).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { runInput, type CalcResult } from '$lib/atelier/calcul';
import { commandCatalog } from '$lib/atelier/commands';
import {
	calcTextOf,
	cleanedShortcuts,
	commandWords,
	denominatorOf,
	fieldLatexFromText,
	finishedWordLatex,
	lineKindOf,
	proposalsFor,
	templateOf,
	wordAtCaret
} from '../natural-input';

const words = commandWords(commandCatalog(new WebReplEngine()));

/** Le mot fini juste avant le curseur, sur une ligne entière déjà tapée. */
function finished(before: string, terminated = false): string | null {
	const found = wordAtCaret(before, terminated);
	return found === null ? null : finishedWordLatex(found, lineKindOf(before, words), words);
}

function shown(result: CalcResult): string {
	if (result.kind === 'calcul' || result.kind === 'commande') return result.latex ?? result.output;
	if (result.kind === 'refus') return `refus : ${result.message}`;
	if (result.kind === 'definition') return `définition ${result.name}`;
	return result.kind;
}

describe('les modèles à trous viennent des exemples du catalogue', () => {
	it.each([
		['intégrer', '.intégrer x^2 de 0 à 1', '\\text{intégrer}\\,▢\\,\\text{de}\\,▢\\,\\text{à}\\,▢'],
		['résoudre', '.résoudre x^2-3x+1=0', '\\text{résoudre}\\,▢'],
		[
			'taylor',
			'.taylor sin(x) ordre 5 en 0',
			'\\text{taylor}\\,▢\\,\\text{ordre}\\,▢\\,\\text{en}\\,▢'
		],
		['aide', undefined, '\\text{aide}']
	])('%s', (french, example, expected) => {
		expect(templateOf(french, example).replaceAll('\\placeholder{}', '▢')).toBe(expected);
	});
});

describe('un mot devient texte quand il est fini, et seulement à sa place', () => {
	it('un mot de commande en tête de ligne, accents facultatifs, formes conjuguées', () => {
		expect(finished('résoudre')).toBe('\\text{résoudre}');
		expect(finished('resous')).toBe('\\text{resous}');
		expect(finished('integre')).toBe('\\text{integre}');
	});

	it('le calcul ordinaire reste intact : ade, 2de, x de', () => {
		expect(finished('ade')).toBeNull();
		expect(finished('2de')).toBeNull();
		expect(finished('x\\,de')).toBeNull();
		expect(finished('x\\,dériver')).toBeNull();
	});

	it('les petits mots seulement dans une commande', () => {
		expect(finished('\\text{intégrer}\\,x^2\\,de')).toBe('\\text{de}');
		expect(finished('\\text{intégrer}\\,x^2\\,\\text{de}\\,0\\,à')).toBe('\\text{à}');
		// « a » sans accent reste une lettre (le moteur la lit déjà comme « à »)
		expect(finished('\\text{intégrer}\\,x^2\\,\\text{de}\\,0\\,a')).toBeNull();
	});

	it('« sur » après le = d’une fonction, pas ailleurs', () => {
		expect(finished('f\\left(x\\right)=x^2\\,sur')).toBe('\\text{sur}');
		expect(finished('f\\left(x\\right)\\,=\\,x^2\\,sur')).toBe('\\text{sur}');
		expect(finished('2\\,sur')).toBeNull();
	});

	it('une unité seulement après « nombre + espace », hors commande', () => {
		expect(finished('5\\,km')).toBe('\\mathrm{km}');
		expect(finished('5\\,\\mathrm{km}\\,+\\,300\\,m')).toBe('\\mathrm{m}');
		expect(finished('2\\,\\mathrm{h}\\,30\\,\\min')).toBe('\\mathrm{min}');
		expect(finished('5\\,\\mathrm{km}/h')).toBe('\\mathrm{h}');
		expect(finished('5km')).toBeNull();
		expect(finished('2\\,x')).toBeNull();
		expect(finished('\\text{dériver}\\,3\\,t')).toBeNull();
	});

	it('lu après coup (clavier virtuel) : le terminateur est retiré d’abord', () => {
		expect(finished('5\\,km\\,', true)).toBe('\\mathrm{km}');
		expect(finished('5\\,km+', true)).toBe('\\mathrm{km}');
		expect(finished('5\\,km', true)).toBeNull();
		expect(finished('2\\pi\\,', true)).toBeNull();
	});
});

describe('la complétion', () => {
	it('commandes dès 2 lettres en tête de ligne', () => {
		const labels = proposalsFor(wordAtCaret('ré', false), 'calculation', words).map((p) => p.label);
		expect(labels).toEqual(['résoudre', 'réciproque']);
		expect(proposalsFor(wordAtCaret('r', false), 'calculation', words)).toEqual([]);
	});

	it('unités après « nombre + espace », jamais dans une commande', () => {
		const labels = proposalsFor(wordAtCaret('5\\,k', false), 'calculation', words).map(
			(p) => p.label
		);
		expect(labels).toContain('km');
		expect(labels).toContain('km/h');
		expect(proposalsFor(wordAtCaret('\\text{dériver}\\,5\\,k', false), 'command', words)).toEqual(
			[]
		);
	});
});

describe('la fraction et les raccourcis', () => {
	it('le dénominateur d’une fraction de MathLive', () => {
		expect(denominatorOf('\\frac14')).toBe('4');
		expect(denominatorOf('\\frac{2}{x+1}')).toBe('x+1');
	});

	it('les raccourcis qui cassent un mot sont retirés, sin et pi restent', () => {
		const cleaned = cleanedShortcuts({ in: '\\in', or: '\\lor', sin: '\\sin', pi: '\\pi' });
		expect(Object.keys(cleaned)).toEqual(expect.arrayContaining(['sin', 'pi', 'exp']));
		expect(Object.keys(cleaned)).not.toContain('in');
		expect(Object.keys(cleaned)).not.toContain('or');
	});
});

describe('le collage d’un texte brut', () => {
	it.each([
		['résoudre x^2=4', '\\text{résoudre}\\,x^2 = 4'],
		['intégrer x^2 de 0 à 1', '\\text{intégrer}\\,x^2\\,\\text{de}\\,0\\,\\text{à}\\,1'],
		['5 km + 300 m', '5\\,\\mathrm{km}\\,+\\,300\\,\\mathrm{m}']
	])('%s', (text, latex) => {
		expect(fieldLatexFromText(text, words)).toBe(latex);
	});
});

describe('le champ produit le texte que lit runInput, et la vraie chaîne répond', () => {
	const session = { atelier: new Atelier(), engine: new WebReplEngine() };
	it.each([
		['\\frac14+\\frac13', '(1/4)+(1/3)', '\\dfrac{7}{12}'],
		['\\text{résoudre}\\,x^2-4=0', '.résoudre x^2-4=0', 'S = \\left\\{ -2 \\,;\\, 2 \\right\\}'],
		[
			'\\text{résous}\\,x^2=4\\,\\text{dans}\\,\\lbrack0;+\\infty\\lbrack',
			'.résoudre x^2=4 dans [0;+∞[',
			'x = 2'
		],
		['\\text{dériver}\\,x^3', '.dériver x^3', '3 x^2'],
		[
			'\\text{intégrer}\\,x^2\\,\\text{de}\\,0\\,\\text{à}\\,1',
			'.intégrer x^2 de 0 à 1',
			'\\dfrac{1}{3}'
		],
		[
			'f\\left(x\\right)=x^2\\,\\text{sur}\\,\\lbrack0;+\\infty\\lbrack',
			'f(x)=x^2 sur [0;+∞[',
			'définition f'
		],
		['\\text{variations}\\,f', '.variations f', "f'(x) = 2 x"],
		['5\\,\\mathrm{km}\\,+\\,300\\,\\mathrm{m}', '5 km + 300 m', '5{,}3~\\mathrm{km}'],
		['2\\,\\mathrm{h}\\,30\\,\\mathrm{min}', '2 h 30 min', '2~\\mathrm{h}~30~\\mathrm{min}'],
		['\\frac12\\,\\mathrm{m}+1\\,\\mathrm{m}', '1/2 m+1 m', '1{,}5~\\mathrm{m}'],
		['\\text{limite}\\,\\frac1x\\,\\text{en}\\,+\\infty', '.limite \\frac1x en +∞', 'refus']
	])('%s', (latex, text, answer) => {
		const converted = calcTextOf(latex, words);
		expect(converted).toEqual({ ok: true, text });
		if (!converted.ok) return;
		expect(shown(runInput(session, converted.text))).toContain(answer);
	});

	it('une case vide du modèle est refusée avant le moteur', () => {
		expect(calcTextOf('\\text{intégrer}\\,\\placeholder{}', words).ok).toBe(false);
	});
});
