import { describe, expect, it } from 'vitest';
import {
	ecartsNiveaux,
	formaterEcart,
	niveauxManquants,
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
