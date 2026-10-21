import { describe, expect, it } from 'vitest';
import { readTemplateFile, sameGrades } from '../lib/template-file';

describe('readTemplateFile', () => {
	it('rend le modèle brut tel quel', () => {
		const brut = { title: 'Dériver', grades: ['1_SPE'] };
		expect(readTemplateFile(brut, 'a.json')).toEqual({ ok: true, template: brut });
	});

	it('refuse le champ « points », abandonné', () => {
		const resultat = readTemplateFile({ title: 'Dériver', points: ['1SPE-135'] }, 'a.json');
		expect(resultat).toEqual({
			ok: false,
			error:
				'a.json : champ « points » abandonné — rattacher le modèle aux points dans sa page admin'
		});
	});

	it('refuse aussi un champ « points » vide', () => {
		expect(readTemplateFile({ title: 'X', points: [] }, 'a.json').ok).toBe(false);
	});

	it.each([null, [], 'texte', 3])('refuse un fichier qui n’est pas un objet (%j)', (brut) => {
		expect(readTemplateFile(brut, 'a.json')).toEqual({
			ok: false,
			error: 'a.json : le fichier doit contenir un objet JSON'
		});
	});
});

describe('sameGrades', () => {
	it('compare comme des ensembles', () => {
		expect(sameGrades(['1_SPE', '2'], ['2', '1_SPE'])).toBe(true);
		expect(sameGrades(['2', '2'], ['2'])).toBe(true);
		expect(sameGrades(['2'], ['1_SPE'])).toBe(false);
	});
});
