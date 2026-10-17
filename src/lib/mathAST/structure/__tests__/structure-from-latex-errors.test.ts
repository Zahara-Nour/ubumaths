/**
 * `structureFromLatex` : ne rattrape que la lecture
 * ================================================
 *
 * Une erreur du parseur rend `unrecognized` en silence (saisie de l'élève) ; une
 * exception de `buildStructure` est un défaut du module : elle est signalée
 * (`console.error`) avant de rendre `unrecognized`, pour que la page reste en vie.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { number } from '../../factory';

// Constantes
const parseLatexSafe = vi.hoisted(() => vi.fn());

vi.mock('../../parser', () => ({ parseLatexSafe }));
// toLatex en panne : simule un défaut de buildStructure sur une expression bien lue
vi.mock('../../latex-generator', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../latex-generator')>()),
	toLatex: () => {
		throw new Error('défaut simulé');
	}
}));

const { structureFromLatex } = await import('..');

describe('structureFromLatex : erreurs', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		parseLatexSafe.mockReset();
	});

	it('le parseur lève (plafond de sécurité…) : unrecognized, sans bruit', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		parseLatexSafe.mockImplementation(() => {
			throw new Error('trop long');
		});
		expect(structureFromLatex('x+1')).toEqual({ status: 'unrecognized' });
		expect(consoleError).not.toHaveBeenCalled();
	});

	it('buildStructure lève : signalé par console.error, puis unrecognized', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		parseLatexSafe.mockReturnValue({ ast: number('5'), errors: [] });
		expect(structureFromLatex('x+1')).toEqual({ status: 'unrecognized' });
		expect(consoleError).toHaveBeenCalledTimes(1);
	});
});
