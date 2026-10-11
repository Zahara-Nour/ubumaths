/**
 * Base locale remplie — les règles qui protègent les données des élèves
 * =====================================================================
 *
 * `pnpm db:seed-riche` lit le contenu de la prod et l'écrit dans la base
 * LOCALE (inventaire : docs/wip/base-locale-inventaire.md, décision de David
 * du 2026-10-10). Ce qui est gardé ici, sans réseau ni base :
 * - jamais d'écriture ailleurs qu'en local, jamais de lecture d'une base locale
 *   prise pour la prod ;
 * - une ligne dont un utilisateur n'est ni le prof ni l'admin (donc un élève)
 *   n'est jamais copiée ;
 * - les identifiants du prof et de l'admin de la prod sont remplacés par ceux
 *   des comptes locaux : aucun identifiant de la prod n'arrive en local ;
 * - aucune table d'élèves ne figure dans la liste de copie.
 */

import { describe, it, expect } from 'vitest';
import {
	COPIE,
	JAMAIS,
	detecterFuite,
	remplacerIds,
	filtrerLignes,
	neutraliser,
	valeurPg,
	verifierCibles
} from '../db-seed-riche/regles';

const PROD = 'https://cnevnzsvixxpnurautls.supabase.co';
const LOCAL = 'http://127.0.0.1:54321';
const PG_LOCAL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

describe('verifierCibles', () => {
	it('accepte prod → local', () => {
		expect(() => verifierCibles({ source: PROD, cible: LOCAL, pg: PG_LOCAL })).not.toThrow();
	});

	it('refuse une cible qui n’est pas locale', () => {
		expect(() => verifierCibles({ source: PROD, cible: PROD, pg: PG_LOCAL })).toThrow(/locale/);
	});

	it('refuse une connexion Postgres qui n’est pas locale', () => {
		const pgProd = 'postgresql://postgres:x@db.cnevnzsvixxpnurautls.supabase.co:5432/postgres';
		expect(() => verifierCibles({ source: PROD, cible: LOCAL, pg: pgProd })).toThrow(/Postgres/);
	});

	it('refuse une source locale (le .env prod mal rempli)', () => {
		expect(() => verifierCibles({ source: LOCAL, cible: LOCAL, pg: PG_LOCAL })).toThrow(/source/);
	});

	it('accepte localhost comme 127.0.0.1', () => {
		const pg = 'postgresql://postgres:postgres@localhost:54322/postgres';
		expect(() =>
			verifierCibles({ source: PROD, cible: 'http://localhost:54321', pg })
		).not.toThrow();
	});
});

describe('filtrerLignes', () => {
	const correspondance = new Map([
		['prof-prod', 'prof-local'],
		['admin-prod', 'admin-local']
	]);

	it('remplace l’auteur prof ou admin par le compte local', () => {
		const r = filtrerLignes(
			[
				{ id: 1, created_by: 'prof-prod' },
				{ id: 2, created_by: 'admin-prod' }
			],
			['created_by'],
			correspondance
		);
		expect(r.gardees).toEqual([
			{ id: 1, created_by: 'prof-local' },
			{ id: 2, created_by: 'admin-local' }
		]);
		expect(r.ecartees).toBe(0);
	});

	it('écarte toute ligne dont un utilisateur est un élève', () => {
		const r = filtrerLignes(
			[
				{ id: 1, owner_id: 'eleve-1' },
				{ id: 2, owner_id: 'prof-prod' }
			],
			['owner_id'],
			correspondance
		);
		expect(r.gardees).toEqual([{ id: 2, owner_id: 'prof-local' }]);
		expect(r.ecartees).toBe(1);
	});

	it('écarte aussi quand c’est une colonne secondaire qui désigne un élève', () => {
		const r = filtrerLignes(
			[{ id: 1, created_by: 'prof-prod', reviewed_by: 'eleve-1' }],
			['created_by', 'reviewed_by'],
			correspondance
		);
		expect(r.gardees).toEqual([]);
		expect(r.ecartees).toBe(1);
	});

	it('garde le contenu système, sans auteur', () => {
		const r = filtrerLignes([{ id: 1, created_by: null }], ['created_by'], correspondance);
		expect(r.gardees).toEqual([{ id: 1, created_by: null }]);
	});

	it('ne modifie pas les lignes reçues', () => {
		const ligne = { id: 1, created_by: 'prof-prod' };
		filtrerLignes([ligne], ['created_by'], correspondance);
		expect(ligne.created_by).toBe('prof-prod');
	});
});

describe('valeurPg', () => {
	it('sérialise le JSON, y compris un tableau JSON', () => {
		expect(valeurPg({ a: 1 }, 'jsonb')).toBe('{"a":1}');
		expect(valeurPg([1, 2], 'jsonb')).toBe('[1,2]');
		expect(valeurPg([1, 2], 'json')).toBe('[1,2]');
	});

	it('laisse les tableaux Postgres et les scalaires tels quels', () => {
		expect(valeurPg(['a', 'b'], 'ARRAY')).toEqual(['a', 'b']);
		expect(valeurPg('x', 'text')).toBe('x');
		expect(valeurPg(null, 'jsonb')).toBeNull();
	});
});

describe('liste de copie', () => {
	it('ne contient aucune table d’élèves ni d’échanges', () => {
		for (const t of JAMAIS) expect(COPIE).not.toContain(t);
	});

	it('n’a pas de doublon', () => {
		expect(new Set(COPIE).size).toBe(COPIE.length);
	});
});

describe('neutraliser', () => {
	it('remplace le code d’inscription et coupe les inscriptions d’une classe', () => {
		const r = neutraliser(
			'classes',
			{
				id: 'c',
				name: '5e A',
				join_code: 'VRAI42',
				registration_open: true,
				google_classroom_course_id: 'g1'
			},
			0
		);
		expect(r).toEqual({
			id: 'c',
			name: '5e A',
			join_code: 'LOCAL001',
			registration_open: false,
			google_classroom_course_id: null,
			description: null,
			tutor_config: null
		});
	});

	it('ne touche pas aux autres tables', () => {
		const l = { id: 1, join_code: 'X' };
		expect(neutraliser('exercises', l, 0)).toBe(l);
	});
});

describe('remplacerIds (en profondeur)', () => {
	const correspondance = new Map([['prof-prod-0000', 'prof-local']]);

	it('remplace un identifiant du personnel partout : colonne simple, JSON imbriqué, tableau', () => {
		const r = remplacerIds(
			{
				updated_by: 'prof-prod-0000',
				snap: { auteur: 'prof-prod-0000', liste: ['prof-prod-0000', 'x'] }
			},
			correspondance
		);
		expect(r).toEqual({
			updated_by: 'prof-local',
			snap: { auteur: 'prof-local', liste: ['prof-local', 'x'] }
		});
	});

	it('remplace aussi un identifiant cité à l’intérieur d’un texte', () => {
		expect(remplacerIds({ t: 'par prof-prod-0000.' }, correspondance)).toEqual({
			t: 'par prof-local.'
		});
	});
});

describe('detecterFuite', () => {
	const interdits = {
		ids: ['eleve-uuid-1', 'prof-prod-0000'],
		noms: ['Camille Durand']
	};

	it('rien de personnel : null', () => {
		expect(detecterFuite({ id: 1, enonce: 'Résoudre 2x + 3 = 7' }, interdits)).toBeNull();
	});

	it('un identifiant d’utilisateur de prod caché dans un JSON', () => {
		expect(detecterFuite({ shared: { avec: ['eleve-uuid-1'] } }, interdits)).toMatch(/identifiant/);
	});

	it('un identifiant du personnel resté (colonne sans clé étrangère)', () => {
		expect(detecterFuite({ updated_by: 'prof-prod-0000' }, interdits)).toMatch(/identifiant/);
	});

	it('un nom de fichier « @0.5x » (images haute densité) n’est pas une adresse', () => {
		expect(detecterFuite({ image_path: 'cartes/dragon@0.5x.webp' }, interdits)).toBeNull();
	});

	it('une adresse e-mail', () => {
		expect(detecterFuite({ notes: 'écrire à camille.d@exemple.fr' }, interdits)).toMatch(/e-mail/);
	});

	it('le nom complet d’un élève, sans tenir compte de la casse', () => {
		expect(detecterFuite({ description: 'Bravo à camille durand !' }, interdits)).toMatch(/nom/);
	});

	it('ne révèle jamais la donnée trouvée dans son message', () => {
		const m = detecterFuite({ description: 'Bravo à Camille Durand' }, interdits) ?? '';
		expect(m).not.toContain('Camille');
	});
});

describe('neutraliser (après audit)', () => {
	it('exclut les documents liés à la prod et coupe le texte libre des classes et de l’emploi du temps', () => {
		expect(COPIE).not.toContain('chapter_documents');
		const c = neutraliser(
			'classes',
			{ id: 'c', name: 'n', description: 'd', tutor_config: { x: 1 }, join_code: 'J' },
			0
		);
		expect(c.description).toBeNull();
		expect(c.tutor_config).toBeNull();
		expect(neutraliser('class_schedules', { id: 1, notes: 'Lucas absent' }, 0).notes).toBeNull();
	});
});

describe('verifierCibles (après audit)', () => {
	it('refuse une URL Postgres avec des paramètres, qui pourraient changer l’hôte', () => {
		expect(() =>
			verifierCibles({ source: PROD, cible: LOCAL, pg: `${PG_LOCAL}?host=db.exemple.com` })
		).toThrow(/paramètre/);
	});
});

describe('liste de copie (après audit)', () => {
	it('copie class_chapters, parent des chapitres, et pas chapter_decks, qui pointe vers des paquets d’élèves', () => {
		expect(COPIE).toContain('class_chapters');
		expect(COPIE).not.toContain('chapter_decks');
	});
});
