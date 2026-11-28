/**
 * Horloge `solution: oui` : les aiguilles attendues dessinées (V109)
 * ==================================================================
 *
 * Le corrigé imprimé d'une série d'automatismes dessine la réponse d'une horloge
 * à régler : `solution: oui`, avec `placer:`, sans `case:` (David, 2026-11-28 :
 * aiguilles en vert). Ce n'est plus un geste à faire (aucune case).
 */
import { describe, expect, it } from 'vitest';

import { generateHorlogeTypst } from '../../generators/horloge-typst';
import { findHorlogesToPlace, parseHorlogeContent } from '../../parser/horloge-parser';

const parse = (...lines: string[]) => parseHorlogeContent(lines.join('\n'));

describe('parseur', () => {
	it('oui : la réponse est dessinée ; non : rien ne change', () => {
		expect(parse('placer: 9 h 25', 'solution: oui').spec?.solution).toBe(true);
		expect(parse('placer: 9 h 25', 'solution: non').spec?.solution).toBeUndefined();
		expect(parse('placer: 9 h 25', 'solution: oui').errors).toEqual([]);
	});

	it('sans placer:, avec une case, ou ni oui ni non : refusé', () => {
		expect(parse('heure: 9 h', 'solution: oui').errors[0]?.message).toMatch(/placer:/);
		expect(parse('placer: 9 h', 'case: 0', 'solution: oui').errors[0]?.message).toMatch(
			/pas avec case/
		);
		expect(parse('placer: 9 h', 'solution: peut-être').errors[0]?.message).toMatch(/oui ou non/);
	});

	it('une horloge dessinée n’est pas un geste à faire', () => {
		const bloc = (extra: string[]) => ['```horloge', 'placer: 9 h 25', ...extra, '```'].join('\n');
		expect(findHorlogesToPlace(bloc([]))).toHaveLength(1);
		expect(findHorlogesToPlace(bloc(['solution: oui']))).toHaveLength(0);
	});
});

describe('PDF', () => {
	it('sans `solution: oui` : un cadran sans aiguilles', () => {
		expect(generateHorlogeTypst(parse('placer: 9 h 25'))).not.toContain('// solution');
	});

	it('les deux aiguilles en vert, à la taille de l’horloge à régler', () => {
		const sans = generateHorlogeTypst(parse('placer: 9 h 25'));
		const avec = generateHorlogeTypst(parse('placer: 9 h 25', 'solution: oui'));
		expect(avec).toContain('// solution');
		// Deux aiguilles de plus que le cadran vide, et en vert (jamais en noir)
		const lignes = (typst: string) => (typst.match(/line\(start/g) ?? []).length;
		expect(lignes(avec) - lignes(sans)).toBe(2);
		expect(avec.match(/paint: rgb\("[^"]+"\)/g)?.length).toBe(2);
		expect(avec.match(/#box\(width: ([\d.]+cm)/)?.[1]).toBe(
			sans.match(/#box\(width: ([\d.]+cm)/)?.[1]
		);
	});

	it('une heure à secondes : la trotteuse aussi, en vert', () => {
		const avec = generateHorlogeTypst(parse('placer: 9 h 25 min 40 s', 'solution: oui'));
		expect(avec.match(/paint: rgb\("[^"]+"\)/g)?.length).toBe(3);
	});
});
