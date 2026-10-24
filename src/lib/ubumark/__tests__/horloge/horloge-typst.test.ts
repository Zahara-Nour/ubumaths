/**
 * Bloc ```horloge au PDF (texte Typst produit ; compilation réelle :
 * `horloge-typst-compilation.test.ts`)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generateHorlogeTypst } from '$lib/ubumark/generators/horloge-typst';
import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
import { HORLOGE_UNAVAILABLE } from '$lib/ubumark/types/horloge';

const typst = (...lines: string[]) => generateHorlogeTypst(parseHorlogeContent(lines.join('\n')));
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

describe('bloc ```horloge au PDF', () => {
	it('un cadran de 4 cm par défaut, ses 12 chiffres', () => {
		const out = typst('heure: 9 h 30');
		expect(count(out, /#box\(width: 4cm, height: 4cm\)/g)).toBe(1);
		for (const n of ['1', '6', '12']) expect(out).toContain(`[${n}]`);
		expect(out).not.toContain(HORLOGE_UNAVAILABLE);
	});

	it('la taille demandée', () => {
		expect(typst('heure: 9 h', 'taille: 2,5cm')).toContain('#box(width: 2.5cm, height: 2.5cm)');
	});

	it('autant de cadrans que d’heures, légendes en chaînes littérales', () => {
		const out = typst('heure: 8 h 30 ; 8 h 45 ; 9 h', 'légendes: Départ ; "Arrivée" ; #x [y]');
		expect(count(out, /#box\(width: 4cm/g)).toBe(3);
		expect(out).toContain('"Départ"');
		expect(out).toContain('"\\"Arrivée\\""');
		expect(out).toContain('"#x [y]"');
	});

	it('minutes cachées : une aiguille de moins', () => {
		const lines = (s: string) => count(s, /line\(/g);
		const both = typst('heure: 3 h', 'graduations: aucune');
		const hourOnly = typst('heure: 3 h', 'graduations: aucune', 'minutes: cachées');
		expect(lines(both) - lines(hourOnly)).toBe(1);
	});

	it('cadran 24 : la couronne intérieure', () => {
		const out = typst('heure: 15 h', 'cadran: 24');
		for (const n of ['13', '18', '24']) expect(out).toContain(`[${n}]`);
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation (comportement 24)', () => {
		const out = typst('heure: 25 h');
		expect(out).toContain(HORLOGE_UNAVAILABLE);
		expect(out).not.toContain('#box(width: 4cm');
	});

	it('branché dans generateTypst, au premier niveau et en liste', () => {
		const out = generateTypst(
			parseMarkdown(
				[
					'```horloge',
					'heure: 9 h',
					'```',
					'',
					'1. Et :',
					'',
					'   ```horloge',
					'   heure: 3 h',
					'   ```'
				].join('\n')
			)
		);
		expect(count(out, /#box\(width: 4cm, height: 4cm\)/g)).toBe(2);
	});
});
