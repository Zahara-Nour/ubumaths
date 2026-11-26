/**
 * Recherche du catalogue Automaths
 * ================================
 *
 * Phase 0 validée par David le 2026-11-18 : titre, description, nom de la
 * sous-notion (pas la branche, retirée le jour même) ; refaite le 2026-11-26
 * (PR B, plus bas) : énoncé, raccourcis, groupe « aussi », pluriels ; sans
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

	it('écrit les exposants en chiffres : « x² » se trouve par « x2 »', () => {
		expect(normalizeForSearch('Développer (x+1)²')).toBe('developper x 1 2');
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

	it('cherche dans le nom de la sous-notion', () => {
		expect(ids('disque')).toEqual(['aire', 'perimetre']);
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
		const rayon = chercher('rayon');
		expect(rayon?.total).toBe(2);
		expect(rayon?.groups.map((g) => g.path)).toEqual([
			['Géométrie', 'Cercle'],
			['Géométrie', 'Cercle', 'disque']
		]);
		expect(chercher('disque')?.groups[0].templates.map((t) => t.id)).toEqual(['aire', 'perimetre']);
	});

	it('à pertinence égale, groupes dans l’ordre de l’arbre (Algèbre avant Géométrie)', () => {
		// « dis » : « Disque » (Géométrie) et « Distribuer » (Algèbre), un titre chacun
		const deux = searchCatalogue(
			[modele('geo', 'n-cercle', 'Disque'), modele('alg', 's-developper', 'Distribuer')],
			ARBRE,
			POINTS,
			'dis'
		);
		expect(deux?.groups.map((g) => g.path[0])).toEqual(['Algèbre', 'Géométrie']);
	});

	it('modèle hors de l’arbre : groupe « Non classés », en dernier', () => {
		const resultat = chercher('aire');
		expect(resultat?.groups.map((g) => g.path)).toEqual([
			['Géométrie', 'Cercle', 'disque'],
			['Non classés']
		]);
	});

	it('aucun résultat : total 0, aucun groupe', () => {
		expect(chercher('pythagore')).toEqual({ total: 0, groups: [], shortcuts: [], others: [] });
	});
});

// ============================================================================
// PR B — phase 0 validée par David le 2026-11-26 (journal `automaths`)
// ============================================================================

function variation(
	statement: string,
	correction?: { steps?: string[]; feedback?: { incorrect?: string } }
) {
	return { statement, correction };
}

function avecVariations(
	id: string,
	nodeId: string,
	title: string,
	variations: ReturnType<typeof variation>[]
): QuestionTemplate {
	return { ...modele(id, nodeId, title), variations } as unknown as QuestionTemplate;
}

describe('PR B — énoncé', () => {
	const enonces = [
		avecVariations('enonce', 's-disque', 'Question A', [
			variation('Trace le cercle de centre $O$.'),
			variation('Mesure le rayon du disque.')
		]),
		avecVariations('choix', 's-developper', 'Question B', [
			variation('Quelle figure ?\n\n```choix\n- un triangle\n- un cercle\n```')
		]),
		avecVariations('figure', 's-developper', 'Question C', [
			variation('Observe.\n\n```figure\ntexte(1, 2, "triangle")\n```\n\nRéponds.')
		]),
		avecVariations('formule', 's-developper', 'Question D', [
			variation('Calcule $\\sqrt{{{carre}}}$ et $$\\text{trapeze}$$ avec {{nom}}.')
		]),
		avecVariations('imbrique', 's-developper', 'Question E', [
			variation('Combien de {{if:k==1|losange|{{if:k==2|losange|carré}}}} ?')
		]),
		avecVariations('figure-variable', 's-developper', 'Question H', [
			variation(
				'Quel objet ?\n\n{{if:k==1|```figure\nc = cercle(o, rayon=1)\n```|{{if:k==2|$\\frac{1}{2}$ rectangle|ovale}}}}\n\nRegarde.'
			)
		]),
		avecVariations('bloc4', 's-developper', 'Question F', [
			variation(
				'Où est la boule ?\n\n````choix\n- ```solide\n  forme: cylindre 1\n  ```\n````\n\nFin.'
			)
		])
	];

	function idsDans(query: string) {
		return searchCatalogue(enonces, ARBRE, {}, query)
			?.groups.flatMap((g) => g.templates.map((t) => t.id))
			.sort();
	}

	it('cherche dans l’énoncé de chaque variation', () => {
		expect(idsDans('cercle centre')).toEqual(['enonce']);
		expect(idsDans('rayon')).toEqual(['enonce']);
	});

	it('ni les choix d’un QCM, ni les figures, ni les blocs imbriqués', () => {
		expect(idsDans('triangle')).toEqual([]);
		expect(idsDans('cylindre')).toEqual([]);
		expect(idsDans('fin')).toEqual(['bloc4']);
		expect(idsDans('reponds')).toEqual(['figure']);
		// Figure dans une variable, accolades simples dans une variable
		expect(idsDans('cercle')).toEqual(['enonce']);
		expect(idsDans('rectangle')).toEqual([]);
		expect(idsDans('regarde')).toEqual(['figure-variable']);
	});

	it('ni les formules, ni les variables (même imbriquées)', () => {
		expect(idsDans('trapeze')).toEqual([]);
		expect(idsDans('carre')).toEqual([]);
		expect(idsDans('nom')).toEqual([]);
		expect(idsDans('losange')).toEqual([]);
		expect(idsDans('calcule')).toEqual(['formule']);
	});

	it('énoncé commun des variations (`shared.statement`) compris', () => {
		const commun = {
			...modele('commun', 's-disque', 'Question G'),
			shared: { statement: 'Un hexagone régulier.' },
			variations: [{}]
		} as unknown as QuestionTemplate;
		expect(searchCatalogue([commun], ARBRE, {}, 'hexagone')?.total).toBe(1);
	});
});

describe('PR B — singulier et pluriel confondus', () => {
	const mots = [
		modele('decimaux', 's-disque', 'Nombres décimaux'),
		modele('decimal', 's-disque', 'Un nombre décimal'),
		modele('prix', 's-disque', 'Le prix'),
		modele('angles', 's-disque', 'Des angles')
	];
	function idsMots(query: string) {
		return searchCatalogue(mots, ARBRE, {}, query)
			?.groups.flatMap((g) => g.templates.map((t) => t.id))
			.sort();
	}

	it('-s : « nombre » et « nombres »', () => {
		expect(idsMots('nombre')).toEqual(['decimal', 'decimaux']);
		expect(idsMots('nombres')).toEqual(['decimal', 'decimaux']);
		expect(idsMots('angle')).toEqual(['angles']);
	});

	it('-aux / -al : « décimal » et « décimaux »', () => {
		expect(idsMots('décimaux')).toEqual(['decimal', 'decimaux']);
		expect(idsMots('décimal')).toEqual(['decimal', 'decimaux']);
	});

	it('-x : « prix »', () => {
		expect(idsMots('prix')).toEqual(['prix']);
	});

	it('-eaux / -eau : « tableau » et « tableaux »', () => {
		const tableaux = [modele('t', 's-disque', 'Tableau de proportionnalité')];
		expect(searchCatalogue(tableaux, ARBRE, {}, 'tableaux')?.total).toBe(1);
		const pluriel = [modele('t', 's-disque', 'Des tableaux')];
		expect(searchCatalogue(pluriel, ARBRE, {}, 'tableau')?.total).toBe(1);
	});

	it('mot mis au singulier : cherché en mot entier (« mois » ne trouve pas « moitié »)', () => {
		const textes = [
			modele('moitie', 's-disque', 'La moitié'),
			modele('mois', 's-disque', 'Les mois')
		];
		const ids = searchCatalogue(textes, ARBRE, {}, 'mois')?.groups.flatMap((g) =>
			g.templates.map((t) => t.id)
		);
		expect(ids).toEqual(['mois']);
	});

	it('nom exact d’un nœud au pluriel dans la recherche : raccourci en tête', () => {
		expect(chercher('cercles')?.shortcuts[0]?.notionId).toBe('n-cercle');
	});
});

describe('PR B — groupe « aussi » : correction et points du programme seulement', () => {
	const modeles = [
		modele('titre', 's-disque', 'Aire du disque'),
		avecVariations('corrige', 's-developper', 'Développer', [
			variation('Développe.', { steps: ['On applique la double distributivité.'] })
		]),
		avecVariations('retour', 's-developper', 'Réduire', [
			variation('Réduis.', { feedback: { incorrect: 'Pense à la distributivité.' } })
		]),
		modele('point', 'n-litteral', 'Fonction affine')
	];
	const points = { point: ['Utiliser la distributivité'] };

	it('mot seulement dans la correction ou un point : à part, pas dans les groupes', () => {
		const resultat = searchCatalogue(modeles, ARBRE, points, 'distributivité');
		expect(resultat?.total).toBe(0);
		expect(resultat?.groups).toEqual([]);
		expect(resultat?.others.map((t) => t.id).sort()).toEqual(['corrige', 'point', 'retour']);
	});

	it('trouvé dans le titre : dans les groupes, jamais en double dans « aussi »', () => {
		const resultat = searchCatalogue(
			[...modeles, modele('les-deux', 's-disque', 'Distributivité')],
			ARBRE,
			points,
			'distributivité'
		);
		expect(resultat?.total).toBe(1);
		expect(resultat?.others.map((t) => t.id)).not.toContain('les-deux');
	});

	it('ni la consigne ni le coup de pouce', () => {
		const consigne = {
			...modele('consigne', 's-disque', 'Question'),
			exerciseInstruction: 'Calculer le volume',
			variations: [{ statement: 'Vas-y.', hint: 'Pense au volume.' }]
		} as unknown as QuestionTemplate;
		const resultat = searchCatalogue([consigne], ARBRE, {}, 'volume');
		expect(resultat?.total).toBe(0);
		expect(resultat?.others).toEqual([]);
	});
});

describe('PR B — groupe le plus pertinent d’abord', () => {
	it('le groupe dont les titres contiennent le mot passe devant celui où il n’est que dans l’énoncé', () => {
		const modeles = [
			avecVariations('enonce-1', 's-developper', 'Question', [variation('Un cercle.')]),
			avecVariations('enonce-2', 's-developper', 'Question', [variation('Deux cercles.')]),
			modele('titre', 's-disque', 'Le cercle')
		];
		const resultat = searchCatalogue(modeles, ARBRE, {}, 'cercle');
		// Algèbre vient avant Géométrie dans l'arbre, mais « Le cercle » est un titre
		expect(resultat?.groups.map((g) => g.id)).toEqual(['s-disque', 's-developper']);
	});

	it('dans un groupe, les titres d’abord', () => {
		const modeles = [
			avecVariations('enonce', 's-disque', 'Question', [variation('Un cercle.')]),
			modele('titre', 's-disque', 'Le cercle')
		];
		const resultat = searchCatalogue(modeles, ARBRE, {}, 'cercle');
		expect(resultat?.groups[0].templates.map((t) => t.id)).toEqual(['titre', 'enonce']);
	});

	it('« Non classés » reste en dernier', () => {
		const modeles = [
			modele('orphelin', 'n-inconnu', 'Aire'),
			avecVariations('enonce', 's-disque', 'Question', [variation('Une aire.')])
		];
		const resultat = searchCatalogue(modeles, ARBRE, {}, 'aire');
		expect(resultat?.groups.map((g) => g.path)).toEqual([
			['Géométrie', 'Cercle', 'disque'],
			['Non classés']
		]);
	});
});

describe('PR B — raccourcis vers une notion ou une sous-notion', () => {
	it('le mot cherché est le nom d’une notion : raccourci, avec son nombre de questions', () => {
		const resultat = chercher('cercle');
		expect(resultat?.shortcuts).toEqual([
			{ notionId: 'n-cercle', rubricId: null, path: ['Cercle'], count: 3 }
		]);
	});

	it('nom d’une sous-notion : raccourci avec la notion et la sous-notion', () => {
		expect(chercher('disques')?.shortcuts).toEqual([
			{ notionId: 'n-cercle', rubricId: 's-disque', path: ['Cercle', 'disque'], count: 2 }
		]);
	});

	it('jamais une branche ; jamais une notion sans question au niveau', () => {
		expect(chercher('géométrie')?.shortcuts).toEqual([]);
		expect(searchCatalogue([MODELES[2]], ARBRE, POINTS, 'cercle')?.shortcuts).toEqual([]);
	});

	it('3 au plus, le nom exact d’abord', () => {
		const arbre: CatalogueNode[] = [
			noeud('b', 'branch', 'Nombres', null, 0),
			noeud('n1', 'notion', 'Fractions et proportions', 'b', 0),
			noeud('n2', 'notion', 'Fractions décimales', 'b', 1),
			noeud('n3', 'notion', 'Fractions égyptiennes', 'b', 2),
			noeud('n4', 'notion', 'Fractions', 'b', 3)
		];
		const modeles = ['n1', 'n2', 'n3', 'n4'].map((n) => modele(`m-${n}`, n, 'Question'));
		const raccourcis = searchCatalogue(modeles, arbre, {}, 'fraction')?.shortcuts ?? [];
		expect(raccourcis).toHaveLength(3);
		expect(raccourcis[0].notionId).toBe('n4');
	});

	it('à longueur de nom égale, la plus fournie d’abord', () => {
		const arbre: CatalogueNode[] = [
			noeud('b', 'branch', 'Nombres', null, 0),
			noeud('n1', 'notion', 'Calcul posé', 'b', 0),
			noeud('n2', 'notion', 'Calcul mental', 'b', 1)
		];
		const modeles = [
			modele('a', 'n1', 'Question'),
			modele('b', 'n2', 'Question'),
			modele('c', 'n2', 'Question')
		];
		const raccourcis = searchCatalogue(modeles, arbre, {}, 'calcul')?.shortcuts ?? [];
		expect(raccourcis.map((r) => r.notionId)).toEqual(['n2', 'n1']);
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
