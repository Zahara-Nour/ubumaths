/**
 * `pi` nu dans les calculs d'un modèle : repérage et réécriture `\pi`
 */

import { describe, it, expect } from 'vitest';
import { rewriteBarePi } from '$lib/ubumark/parameterization/validator/bare-pi';

describe('rewriteBarePi : calculs réécrits', () => {
	it.each([
		['{{eval:cos(p*pi/d)}}', '{{eval:cos(p*\\pi/d)}}'],
		['$z=e^{i{{eval:m*pi/6}}}$', '$z=e^{i{{eval:m*\\pi/6}}}$'],
		['{{eval:5pi}}', '{{eval:5\\pi}}'],
		['{{eval:-pi+2*pi}}', '{{eval:-\\pi+2*\\pi}}'],
		['{{eval:{{a}}*pi;d}}', '{{eval:{{a}}*\\pi;d}}'],
		['{{if:a>0|{{eval:pi/2}}|0}}', '{{if:a>0|{{eval:\\pi/2}}|0}}'],
		['{{eval:2*pi', '{{eval:2*\\pi']
	])('%s → %s', (text, expected) => {
		const { value, occurrences } = rewriteBarePi({ statement: text });
		expect(value.statement).toBe(expected);
		expect(occurrences).toHaveLength(1);
	});

	it('condition de `conditions` et expression de variable : le champ entier', () => {
		const { value, occurrences } = rewriteBarePi({
			variations: [
				{
					conditions: ['cos(a*pi/6) > 0'],
					variables: [{ name: 'c', expression: 'eval:round(2^n*cos(n*pi/6))' }]
				}
			]
		});
		expect(value.variations[0].conditions[0]).toBe('cos(a*\\pi/6) > 0');
		expect(value.variations[0].variables[0].expression).toBe('eval:round(2^n*cos(n*\\pi/6))');
		expect(occurrences.map((o) => o.path)).toEqual([
			'variations[0].conditions[0]',
			'variations[0].variables[0].expression'
		]);
	});

	it('expression de variable sans eval: : seuls ses {{eval:…}}', () => {
		const { value } = rewriteBarePi({
			variables: [{ name: 'a', expression: '{{eval:pi/6}}' }]
		});
		expect(value.variables[0].expression).toBe('{{eval:\\pi/6}}');
	});

	it('compte chaque pi nu', () => {
		const { occurrences } = rewriteBarePi({ s: '{{eval:pi/2}} et {{eval:2*pi}} puis {{eval:pi}}' });
		expect(occurrences).toEqual([
			{ path: 's', calculation: '{{eval:pi/2}} et {{eval:2*pi}} puis {{eval:pi}}', count: 3 }
		]);
	});
});

describe('rewriteBarePi : ce qui ne change pas', () => {
	it.each([
		['\\pi déjà écrit', '{{eval:cos(\\pi/3)}}'],
		['pi au sein d’un mot', '{{eval:pin+api}}'],
		['pi hors calcul (texte)', 'Une pièce, pi au hasard'],
		['pi dans une formule ~…~ (lue p × i, signalée ailleurs)', '~2pi~'],
		['pi dans la branche d’un {{if:…}}', '{{if:a>0|pi|2}}'],
		['pi dans la condition d’un {{if:…}} (jamais lue π)', '{{if:sin(a*pi/6)>0|1|2}}'],
		['bloc courbe (sa propre lecture)', '```courbe\nx: -2*pi ; 2*pi\n```'],
		['option angleModulo', '2pi']
	])('%s', (_label, text) => {
		const { value, occurrences } = rewriteBarePi({ statement: text });
		expect(value.statement).toBe(text);
		expect(occurrences).toEqual([]);
	});

	it('expression de variable en texte : « pièce » n’est pas π', () => {
		const variation = { variables: [{ name: 'objet', expression: '{{pièce|pile}}' }] };
		expect(rewriteBarePi(variation).occurrences).toEqual([]);
	});

	it('expression de variable en texte ou liste : non touchée', () => {
		const variation = { variables: [{ name: 'c', expression: '{{pi|e}}' }] };
		expect(rewriteBarePi(variation).occurrences).toEqual([]);
	});

	it('une valeur sans pi rend la même structure', () => {
		const template = { a: [1, null, true, { b: '{{eval:2+3}}' }] };
		expect(rewriteBarePi(template).value).toEqual(template);
	});
});
