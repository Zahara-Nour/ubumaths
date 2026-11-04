import { describe, expect, it } from 'vitest';
import {
	readTemplateFile,
	sameGrades,
	sameTitleLevelGroups,
	withTemplateId
} from '../lib/template-file';

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

	it.each(['theme', 'domain', 'subdomain'])(
		'refuse le champ « %s », abandonné avec le quadruplet (ADR 0035)',
		(champ) => {
			expect(readTemplateFile({ title: 'X', [champ]: 'Entiers' }, 'a.json')).toEqual({
				ok: false,
				error: `a.json : champ « ${champ} » abandonné — le modèle se range dans l’arbre des notions (ADR 0035)`
			});
		}
	);

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

describe('withTemplateId', () => {
	const ID = '0123abcd-0000-4000-8000-000000000000';

	it('écrit l’id en tête du fichier, sans toucher au reste du texte', () => {
		const texte = '{\n\t"title": "X",\n\t"variables": { "a": "1" }\n}\n';
		expect(withTemplateId(texte, ID)).toBe(
			`{\n\t"id": "${ID}",\n\t"title": "X",\n\t"variables": { "a": "1" }\n}\n`
		);
	});

	it('refuse un fichier qui porte déjà un id, ou qui ne commence pas par « { »', () => {
		expect(() => withTemplateId(`{\n\t"id": "${ID}",\n\t"title": "X"\n}\n`, ID)).toThrow(
			/porte déjà un id/
		);
		expect(() => withTemplateId('[]\n', ID)).toThrow(/objet JSON/);
	});

	it.each([
		['fin de ligne CRLF', '{\r\n\t"title": "X"\r\n}\r\n'],
		['BOM', '\uFEFF{\n\t"title": "X"\n}\n'],
		['fichier sur une ligne', '{"title": "X"}\n']
	])('refuse un format inattendu (%s) : vérifié avant toute création', (_cas, texte) => {
		expect(() => withTemplateId(texte, ID)).toThrow(/objet JSON/);
	});
});

describe('sameTitleLevelGroups', () => {
	it('regroupe les fichiers de même titre et même niveau, et eux seuls', () => {
		expect(
			sameTitleLevelGroups([
				{ file: 'a.json', title: 'Dériver', level: 1 },
				{ file: 'b.json', title: 'Dériver', level: 2 },
				{ file: 'c.json', title: 'Dériver', level: 1 },
				{ file: 'd.json', title: 'Intégrer', level: 1 }
			])
		).toEqual([['a.json', 'c.json']]);
	});
});
