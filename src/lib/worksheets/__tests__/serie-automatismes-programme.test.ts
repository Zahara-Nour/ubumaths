/**
 * Série d'automatismes : question à programme (tortue, calcul ; chantier `blockly`, PR 5)
 * ======================================================================================
 *
 * Un programme se fait à l'écran : une question à programme n'entre pas dans une série
 * d'automatismes (tranché par David le 2026-11-14). Le refus le dit au prof, au lieu de
 * « 0 case(s) dans l'énoncé pour 1 réponse(s) ».
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
