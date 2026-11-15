/**
 * Série d'automatismes : question à programme (tortue, calcul ; chantier `blockly`, PR 5)
 * et robot à produire (chantier `suite-fleches`, PR 1b)
 * ======================================================================================
 *
 * Un programme se fait à l'écran : une question à programme n'entre pas dans une série
 * d'automatismes (tranché par David le 2026-11-14). Le refus le dit au prof, au lieu de
 * « 0 case(s) dans l'énoncé pour 1 réponse(s) ». Un robot à produire, lui, se fait sur papier : le
 * quadrillage et 15 cases à l'énoncé, un code juste au corrigé.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import { buildSerie } from '../serie-automatismes';

function modele(id: string, statement: string): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['5'],
		level: 1,
		status: 'draft',
		variations: [{ statement: templateMarkdown(statement) }]
	} as unknown as QuestionTemplate;
}

const MODELES = new Map([
	['tortue', modele('tortue', 'Trace.\n\n```tortue\nattendu: avancer 3\n```')],
	['calcul', modele('calcul', 'Programme.\n\n```calcul\nattendu: afficher nombre + 2\n```')]
]);

describe('buildSerie — question à programme', () => {
	it.each(['tortue', 'calcul'])('%s : refusée avec un message clair', (id) => {
		expect(() => buildSerie(MODELES, [{ templateId: id, seed: 1 }])).toThrow(
			`${id} : une question à programme (tortue, calcul) ne peut pas entrer dans une série d’automatismes`
		);
	});
});

describe('buildSerie — robot à produire', () => {
	const robot = (...lignes: string[]) =>
		new Map([
			[
				'robot',
				modele('robot', ['Code.', '', '```robot', ...lignes, 'produire: oui', '```'].join('\n'))
			]
		]);

	it('énoncé : le bloc sans case: (le PDF dessine le quadrillage et 15 cases)', () => {
		const serie = buildSerie(robot('quadrillage: 8 x 5', 'départ: 2, 1', 'arrivée: 6, 4'), [
			{ templateId: 'robot', seed: 1 }
		]);
		expect(serie.statement).toContain('```robot');
		expect(serie.statement).toContain('produire: oui');
		expect(serie.statement).not.toMatch(/case\s*:/);
	});

	it('corrigé : le quadrillage seul, puis le CODE juste (jamais la scène de la réponse attendue)', () => {
		const serie = buildSerie(robot('quadrillage: 8 x 5', 'départ: 2, 1', 'arrivée: 6, 4'), [
			{ templateId: 'robot', seed: 1 }
		]);
		expect(serie.solution).toContain('```robot');
		expect(serie.solution).not.toContain('produire');
		const code = /Un code juste : \*\*(.+)\*\*/.exec(serie.solution)?.[1];
		expect(code).toBeDefined();
		expect(code).not.toContain('|');
		expect(code).not.toContain('8x5');
		// Le plus court : 4 cases à droite, 3 en haut, dans un ordre ou l'autre
		expect(code!.split(' ').sort()).toEqual(['↑', '↑', '↑', '→', '→', '→', '→'].sort());
		// Le code vient APRÈS la fin du bloc
		expect(serie.solution.indexOf('Un code juste')).toBeGreaterThan(
			serie.solution.lastIndexOf('```')
		);
	});

	it('avance-pivote : le code juste en mots', () => {
		const serie = buildSerie(
			robot('quadrillage: 8 x 5', 'codage: avance-pivote', 'départ: 2, 1, droite', 'arrivée: 6, 1'),
			[{ templateId: 'robot', seed: 1 }]
		);
		expect(serie.solution).toContain('Un code juste : **avance de 4**');
	});
});
