/**
 * Recherche du catalogue Automaths
 * ================================
 *
 * Phase 0 validée par David le 2026-11-18 : titre, description, noms de la
 * notion / sous-notion (pas la branche, retirée le jour même) et intitulés des points du programme ; sans
 * accents ni majuscules ; `$` du LaTeX ignorés ; tous les mots, dans n'importe
 * quel ordre, chacun au début d'un mot ; dès 2 lettres ; résultats groupés par
 * sous-notion dans l'ordre de l'arbre ; au-delà de 60 cartes, les groupes
 * suivants sont repliés.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '#lib/questions/types.ts';
import type { CatalogueNode } from '#lib/questions/catalogue.ts';
import {
	SEARCH_OPEN_CARD_LIMIT,
	initiallyOpenGroups,
	normalizeForSearch,
	searchCatalogue
} from '../catalogue-search';

function modele(
	id: string,
	nodeId: string | null,
	title: string,
	description = '',
	level = 1
): QuestionTemplate {
	return {
		id,
		title,
		description,
		level,
		classification_node_id: nodeId
	} as unknown as QuestionTemplate;
}

function noeud(
	id: string,
	kind: 'branch' | 'notion' | 'subnotion',
	name: string,
	parentId: string | null,
	position: number
): CatalogueNode {
	return { id, kind, name, parent_id: parentId, position };
}

const ARBRE: CatalogueNode[] = [
	noeud('b-geo', 'branch', 'Géométrie', null, 1),
	noeud('b-alg', 'branch', 'Algèbre', null, 0),
	noeud('n-cercle', 'notion', 'Cercle', 'b-geo', 0),
	noeud('s-disque', 'subnotion', 'disque', 'n-cercle', 0),
	noeud('n-litteral', 'notion', 'Calcul littéral', 'b-alg', 0),
	noeud('s-developper', 'subnotion', 'Développer', 'n-litteral', 0)
];

const MODELES = [
	modele('aire', 's-disque', "Aire d'un disque : valeur exacte", 'Rayon $3$ cm'),
	modele('perimetre', 's-disque', "Périmètre d'un disque"),
	modele('dev', 's-developper', 'Développer $(a+b)(c+d)$'),
	modele('general', 'n-cercle', 'Cercle, rayon, diamètre'),
	modele('lineaire', 'n-litteral', 'Fonction linéaire'),
	modele('orphelin', 'n-inconnu', 'Aire perdue')
];

const POINTS = { dev: ['Utiliser la double distributivité'] };

function chercher(query: string, modeles = MODELES) {
	return searchCatalogue(modeles, ARBRE, POINTS, query);
}

function ids(query: string) {
	return chercher(query)
		?.groups.flatMap((g) => g.templates.map((t) => t.id))
		.sort();
}

describe('normalizeForSearch', () => {
	it('retire accents, majuscules, `$` et ponctuation', () => {
		expect(normalizeForSearch("Périmètre d'un DISQUE : $2\\pi R$")).toBe(
			'perimetre d un disque 2 pi r'
		);
	});

	it('écrit « œ » et « æ » en deux lettres', () => {
		expect(normalizeForSearch('Cœur ex æquo')).toBe('coeur ex aequo');
	});
});

describe('searchCatalogue', () => {
	it('moins de 2 lettres : pas de recherche', () => {
		expect(chercher('')).toBeNull();
		expect(chercher('  a ')).toBeNull();
		expect(chercher('$ ')).toBeNull();
	});

	it('cherche dans le titre, sans accent ni majuscule', () => {
		expect(ids('PERIMETRE')).toEqual(['perimetre']);
		expect(ids('périmètre')).toEqual(['perimetre']);
	});

	it('cherche dans la description, LaTeX compris', () => {
		expect(ids('rayon 3')).toEqual(['aire']);
	});

	it('ne cherche pas dans le nom de la branche (« calcul » ramènerait « Nombres et calculs » entier)', () => {
		expect(ids('géométrie')).toEqual([]);
	});

	it('cherche dans les noms de notion et de sous-notion', () => {
		expect(ids('disque')).toEqual(['aire', 'perimetre']);
		expect(ids('litteral')).toEqual(['dev', 'lineaire']);
	});

	it('cherche dans les intitulés des points du programme', () => {
		expect(ids('double distributivité')).toEqual(['dev']);
	});

	it('tous les mots, dans n’importe quel ordre', () => {
		expect(ids('disque aire')).toEqual(['aire']);
		expect(ids('aire perimetre')).toEqual([]);
	});

	it('chaque mot au début d’un mot : « aire » ne trouve pas « linéaire »', () => {
		expect(ids('aire')).toEqual(['aire', 'orphelin']);
		expect(ids('peri')).toEqual(['perimetre']);
	});

	it('groupe par sous-notion, dans l’ordre de l’arbre, avec le chemin et le total', () => {
		const cercle = chercher('cercle');
		expect(cercle?.total).toBe(3);
		expect(cercle?.groups.map((g) => g.path)).toEqual([
			['Géométrie', 'Cercle'],
			['Géométrie', 'Cercle', 'disque']
		]);
		expect(cercle?.groups[1].templates.map((t) => t.id)).toEqual(['aire', 'perimetre']);
	});

	it('branches dans l’ordre de l’arbre (Algèbre avant Géométrie)', () => {
		// « dis » : distributivité (point du modèle d'Algèbre) et disque (Géométrie)
		const resultat = chercher('dis');
		expect(resultat?.groups.map((g) => g.path[0])).toEqual(['Algèbre', 'Géométrie']);
	});

	it('modèle hors de l’arbre : groupe « Non classés », en dernier', () => {
		const resultat = chercher('aire');
		expect(resultat?.groups.map((g) => g.path)).toEqual([
			['Géométrie', 'Cercle', 'disque'],
			['Non classés']
		]);
	});

	it('aucun résultat : total 0, aucun groupe', () => {
		expect(chercher('pythagore')).toEqual({ total: 0, groups: [] });
	});
});

describe('initiallyOpenGroups', () => {
	function groupe(id: string, n: number) {
		return { id, path: [id], templates: Array.from({ length: n }, () => MODELES[0]) };
	}

	it('ouvre les premiers groupes tant que le total reste dans la limite', () => {
		expect(SEARCH_OPEN_CARD_LIMIT).toBe(60);
		expect(initiallyOpenGroups([groupe('a', 30), groupe('b', 30), groupe('c', 1)])).toEqual([
			'a',
			'b'
		]);
	});

	it('peu de résultats : tout est ouvert', () => {
		expect(initiallyOpenGroups([groupe('a', 3), groupe('b', 4)])).toEqual(['a', 'b']);
	});

	it('premier groupe plus grand que la limite : ouvert quand même, seul', () => {
		expect(initiallyOpenGroups([groupe('a', 80), groupe('b', 2)])).toEqual(['a']);
	});
});
