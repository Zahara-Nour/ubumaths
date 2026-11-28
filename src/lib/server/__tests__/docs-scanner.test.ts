/**
 * Doc de l'admin : rubriques rangées d'après les vrais dossiers de `docs/`, et
 * recherche qui filtre sur le titre et le chemin (V116).
 */
import { describe, expect, it } from 'vitest';
import {
	docCategoryName,
	filterDocCategories,
	orderDocCategories,
	type DocCategory
} from '#lib/server/docs-scanner.ts';

// Functions

function category(path: string, docs: { path: string; title: string }[]): DocCategory {
	return {
		name: path,
		icon: '📄',
		path,
		docs: docs.map((d) => ({ ...d, category: path }))
	};
}

describe('orderDocCategories : ordre des rubriques', () => {
	it('systeme, pratiques, adr, wip, archive en tête, dans cet ordre ; les autres après', () => {
		const paths = ['archive', 'ref', 'adr', 'wip', 'pratiques', 'systeme'];
		const ordered = orderDocCategories(paths.map((p) => category(p, [])));
		expect(ordered.map((c) => c.path)).toEqual([
			'systeme',
			'pratiques',
			'adr',
			'wip',
			'archive',
			'ref'
		]);
	});
});

describe('docCategoryName', () => {
	it('nomme en français les rubriques connues', () => {
		expect(docCategoryName('systeme')).toBe('Système');
		expect(docCategoryName('adr')).toBe('Décisions (ADR)');
	});

	it('une rubrique inconnue garde le nom de son dossier, avec une capitale', () => {
		expect(docCategoryName('ref')).toBe('Ref');
	});
});

describe('filterDocCategories', () => {
	const categories = [
		category('systeme', [
			{ path: 'base-de-donnees.md', title: 'Base de données' },
			{ path: 'serveur.md', title: 'Serveur' }
		]),
		category('pratiques', [{ path: 'rls-echecs-silencieux.md', title: 'Les refus silencieux' }])
	];

	it('sans recherche : tout', () => {
		expect(filterDocCategories(categories, null)).toEqual(categories);
		expect(filterDocCategories(categories, '  ')).toEqual(categories);
	});

	it('garde les docs dont le titre contient le texte, sans tenir compte des accents ni de la casse', () => {
		const result = filterDocCategories(categories, 'DONNEES');
		expect(result.map((c) => c.path)).toEqual(['systeme']);
		expect(result[0].docs.map((d) => d.path)).toEqual(['base-de-donnees.md']);
	});

	it('garde les docs dont le chemin contient le texte', () => {
		const result = filterDocCategories(categories, 'rls');
		expect(result.map((c) => c.path)).toEqual(['pratiques']);
	});

	it('cherche aussi dans le nom de la rubrique', () => {
		const result = filterDocCategories(categories, 'pratiques/rls');
		expect(result[0].docs.map((d) => d.path)).toEqual(['rls-echecs-silencieux.md']);
	});

	it('rien ne correspond : aucune rubrique', () => {
		expect(filterDocCategories(categories, 'introuvable')).toEqual([]);
	});
});
