import { describe, expect, it } from 'vitest';
import {
	ecartsNiveaux,
	EXCEPTIONS_NIVEAUX,
	formaterEcart,
	niveauxManquants,
	separerExceptions,
	type Exception,
	type LigneTag
} from '../lib/niveaux-des-tags';

function tag(
	id: string,
	grades: string[],
	pointGrade: string,
	plus: Partial<LigneTag> = {}
): LigneTag {
	return { id, title: `modèle ${id}`, status: 'published', grades, pointGrade, ...plus };
}

describe('niveauxManquants', () => {
	it('rien ne manque quand chaque niveau de tag est dans grades', () => {
		expect(niveauxManquants(['1_SPE', '1_TECHNO'], ['1_SPE', '1_TECHNO'])).toEqual([]);
	});

	it('rend les niveaux absents, sans doublon, triés', () => {
		expect(niveauxManquants(['1_SPE'], ['1_TECHNO', '1_SPE', '1_GEN', '1_TECHNO'])).toEqual([
			'1_GEN',
			'1_TECHNO'
		]);
	});

	it('un modèle sans niveau : tous ceux de ses tags manquent', () => {
		expect(niveauxManquants([], ['2'])).toEqual(['2']);
	});

	it('un niveau de grades sans tag n’est pas un écart', () => {
		expect(niveauxManquants(['2', '1_SPE'], ['1_SPE'])).toEqual([]);
	});
});

describe('ecartsNiveaux', () => {
	it('regroupe les tags par modèle et ne garde que les modèles en écart', () => {
		const ecarts = ecartsNiveaux([
			tag('a', ['1_SPE'], '1_SPE'),
			tag('a', ['1_SPE'], '1_TECHNO'),
			tag('b', ['1_SPE', '1_TECHNO'], '1_SPE'),
			tag('b', ['1_SPE', '1_TECHNO'], '1_TECHNO')
		]);
		expect(ecarts.map((e) => [e.id, e.manquants])).toEqual([['a', ['1_TECHNO']]]);
	});

	it('publiés d’abord, puis par titre', () => {
		const ecarts = ecartsNiveaux([
			tag('z', ['1_SPE'], '1_GEN', { status: 'draft', title: 'A' }),
			tag('y', ['1_SPE'], '1_GEN', { title: 'C' }),
			tag('x', ['1_SPE'], '1_GEN', { title: 'B' })
		]);
		expect(ecarts.map((e) => e.id)).toEqual(['x', 'y', 'z']);
	});

	it('aucune ligne : aucun écart', () => {
		expect(ecartsNiveaux([])).toEqual([]);
	});
});

describe('formaterEcart', () => {
	it('id court, statut, niveaux, manquants, titre', () => {
		const [e] = ecartsNiveaux([
			tag('f52395d1-31ca-4bdb-be8f-723c5d96d2ac', ['1_SPE'], '1_TECHNO', { title: 'Tangente' })
		]);
		expect(formaterEcart(e)).toBe('  f52395d1 published [1_SPE] + 1_TECHNO  « Tangente »');
	});
});

describe('separerExceptions', () => {
	const exceptions: ReadonlyMap<string, Exception> = new Map([
		['e', { niveaux: ['T_COMP', 'T_SPE'], raison: 'décision X' }]
	]);

	it('un écart couvert par son exception est mis à part, avec sa raison', () => {
		const ecarts = ecartsNiveaux([tag('e', ['2'], 'T_COMP'), tag('a', ['1_SPE'], '1_GEN')]);
		const { restants, excuses } = separerExceptions(ecarts, exceptions);
		expect(restants.map((r) => r.id)).toEqual(['a']);
		expect(excuses.map((x) => [x.ecart.id, x.raison])).toEqual([['e', 'décision X']]);
	});

	it('un niveau manquant hors de l’exception reste un écart', () => {
		const ecarts = ecartsNiveaux([tag('e', ['2'], 'T_COMP'), tag('e', ['2'], '1_GEN')]);
		const { restants, excuses } = separerExceptions(ecarts, exceptions);
		expect(restants.map((r) => [r.id, r.manquants])).toEqual([['e', ['1_GEN', 'T_COMP']]]);
		expect(excuses).toEqual([]);
	});

	it('les exceptions du dépôt : les 5 brouillons de seconde (questions-2de Q7 c)', () => {
		expect([...EXCEPTIONS_NIVEAUX.keys()].map((id) => id.slice(0, 8)).sort()).toEqual([
			'1cfc575d',
			'4016b05c',
			'77d6fedc',
			'9d7c4d98',
			'f3e68e4b'
		]);
		expect([...EXCEPTIONS_NIVEAUX.values()].every((e) => e.raison.includes('Q7'))).toBe(true);
	});
});
