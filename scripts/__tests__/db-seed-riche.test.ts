/**
 * Base locale remplie — les règles qui protègent les données des élèves
 * =====================================================================
 *
 * `pnpm db:seed-riche` lit le contenu de la prod et l'écrit dans la base
 * LOCALE (inventaire : docs/archive/wip/base-locale-inventaire.md, décision de David
 * du 2026-10-10). Ce qui est gardé ici, sans réseau ni base :
 * - jamais d'écriture ailleurs qu'en local, jamais de lecture d'une base locale
 *   prise pour la prod ;
 * - une ligne dont un utilisateur n'est ni le prof ni l'admin (donc un élève)
 *   n'est jamais copiée ;
 * - les identifiants du prof et de l'admin de la prod sont remplacés par ceux
 *   des comptes locaux : aucun identifiant de la prod n'arrive en local ;
 * - aucune table d'élèves ne figure dans la liste de copie.
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
	COPIE,
	INVENTE,
	JAMAIS,
	LIENS_COUPES,
	lireSchema,
	detecterFuite,
	remplacerIds,
	filtrerLignes,
	neutraliser,
	requeteOrphelins,
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
		for (const t of [...INVENTE, ...JAMAIS]) expect(COPIE).not.toContain(t);
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

describe('lireSchema', () => {
	const texte = [
		'export type Database = {',
		'\tgraphql_public: {',
		'\t\tTables: {',
		'\t\t\t[_ in never]: never;',
		'\t\t};',
		'\t};',
		'\tpublic: {',
		'\t\tTables: {',
		'\t\t\tfiches: {',
		'\t\t\t\tRow: {',
		'\t\t\t\t\tid: string;',
		'\t\t\t\t};',
		'\t\t\t\tRelationships: [',
		'\t\t\t\t\t{',
		"\t\t\t\t\t\tforeignKeyName: 'fiches_classe_fkey';",
		"\t\t\t\t\t\tcolumns: ['classe_id'];",
		'\t\t\t\t\t\tisOneToOne: false;',
		"\t\t\t\t\t\treferencedRelation: 'classes';",
		"\t\t\t\t\t\treferencedColumns: ['id'];",
		'\t\t\t\t\t},',
		'\t\t\t\t\t{',
		"\t\t\t\t\t\tforeignKeyName: 'fiches_classe_fkey';",
		"\t\t\t\t\t\tcolumns: ['classe_id'];",
		'\t\t\t\t\t\tisOneToOne: false;',
		"\t\t\t\t\t\treferencedRelation: 'bilan';",
		"\t\t\t\t\t\treferencedColumns: ['id'];",
		'\t\t\t\t\t},',
		'\t\t\t\t\t{',
		"\t\t\t\t\t\tforeignKeyName: 'fiches_section_fkey';",
		"\t\t\t\t\t\tcolumns: ['section_id', 'chapitre_id'];",
		'\t\t\t\t\t\tisOneToOne: false;',
		"\t\t\t\t\t\treferencedRelation: 'sections';",
		"\t\t\t\t\t\treferencedColumns: ['id', 'chapitre_id'];",
		'\t\t\t\t\t}',
		'\t\t\t\t];',
		'\t\t\t};',
		'\t\t\tclasses: {',
		'\t\t\t\tRow: {',
		'\t\t\t\t\tid: string;',
		'\t\t\t\t};',
		'\t\t\t\tRelationships: [];',
		'\t\t\t};',
		'\t\t};',
		'\t\tViews: {',
		'\t\t\tbilan: {',
		'\t\t\t\tRow: {',
		'\t\t\t\t\tid: string;',
		'\t\t\t\t};',
		'\t\t\t};',
		'\t\t};',
		'\t};',
		'};'
	].join('\n');

	it('rend les tables du schéma public avec leurs liens, lien composé compris', () => {
		const { tables } = lireSchema(texte);
		expect([...tables.keys()]).toEqual(['fiches', 'classes']);
		expect(tables.get('fiches')).toEqual([
			{ colonnes: ['classe_id'], vers: 'classes' },
			{ colonnes: ['classe_id'], vers: 'bilan' },
			{ colonnes: ['section_id', 'chapitre_id'], vers: 'sections' }
		]);
		expect(tables.get('classes')).toEqual([]);
	});

	it('rend les vues à part : elles ne sont pas des tables à classer', () => {
		expect([...lireSchema(texte).vues]).toEqual(['bilan']);
	});

	it('refuse un texte où il ne trouve aucune table, plutôt que de tout laisser passer', () => {
		expect(() => lireSchema('export type Database = {}')).toThrow(/aucune table/);
	});
});

describe('classement de toutes les tables (copier, inventer, jamais)', () => {
	// Le schéma tel que `pnpm db:types` l'a généré depuis les migrations du dépôt.
	const { tables: schema, vues } = lireSchema(readFileSync('src/lib/types/database.ts', 'utf8'));
	const familles = { COPIE, INVENTE, JAMAIS };

	it('chaque table du schéma est dans une famille : une table nouvelle se classe avant de passer', () => {
		const classees = new Set([...COPIE, ...INVENTE, ...JAMAIS]);
		expect([...schema.keys()].filter((t) => !classees.has(t))).toEqual([]);
	});

	it('aucune table n’est dans deux familles', () => {
		const toutes = [...COPIE, ...INVENTE, ...JAMAIS];
		expect(toutes.filter((t, i) => toutes.indexOf(t) !== i)).toEqual([]);
	});

	it('aucune famille ne cite une table qui n’existe plus', () => {
		for (const [nom, liste] of Object.entries(familles)) {
			expect({ [nom]: liste.filter((t) => !schema.has(t)) }).toEqual({ [nom]: [] });
		}
	});

	it('une table copiée ne pointe que vers des tables copiées, ou vers un compte', () => {
		// Le contenu s'écrit sans vérification des liens : copier une table sans celle qu'elle
		// désigne laisserait en local des lignes qui pointent dans le vide. La garde porte sur les
		// TABLES ; une ligne écartée par le filtre d'auteur peut encore laisser une ligne
		// orpheline, ce que seule une vérification sur la base voit (journal du chantier, § 7).
		const orphelins: string[] = [];
		for (const table of COPIE) {
			for (const { colonnes, vers } of schema.get(table) ?? []) {
				if (vues.has(vers)) continue; // une vue répète le lien vers la vraie table
				if (vers === 'profiles' || COPIE.includes(vers)) continue;
				if (colonnes.some((c) => LIENS_COUPES.includes(`${table}.${c}`))) continue;
				orphelins.push(`${table}.${colonnes.join('+')} → ${vers}`);
			}
		}
		expect(orphelins).toEqual([]);
	});

	it('un lien coupé existe encore, vers une table non copiée, et il est mis à vide à la copie', () => {
		for (const lien of LIENS_COUPES) {
			const [table, colonne] = lien.split('.');
			const cibles = (schema.get(table) ?? [])
				.filter((l) => l.colonnes.includes(colonne) && !vues.has(l.vers))
				.map((l) => l.vers);
			expect({ lien, cibles: cibles.length }).toEqual({ lien, cibles: 1 });
			expect(COPIE).not.toContain(cibles[0]);
			expect(neutraliser(table, { [colonne]: 'x' }, 0)[colonne]).toBeNull();
		}
	});

	it('les tables de contenu ajoutées le 2026-11-21 sont copiées', () => {
		for (const t of ['dictionary_entries', 'question_template_reviews', 'worksheet_styles']) {
			expect(COPIE).toContain(t);
		}
	});

	it('après audit : ce qui peut porter un élève sans que les gardes le voient n’est pas copié', () => {
		// Identifiants d'inscription sans clé étrangère, nom de dossier libre, documents importés.
		for (const t of ['school_year_closures', 'user_folders', 'rag_documents', 'rag_chunks']) {
			expect(JAMAIS).toContain(t);
		}
	});

	it('après audit : la description d’un tournoi, texte libre du prof, est vidée', () => {
		const t = neutraliser(
			'minesweeper_tournaments',
			{ id: 1, name: 'n', description: 'Bravo Léo' },
			0
		);
		expect(t).toEqual({ id: 1, name: 'n', description: null });
	});

	it('les sections de paquets de révision suivent les paquets : inventées, pas copiées', () => {
		expect(INVENTE).toContain('srs_decks');
		expect(INVENTE).toContain('srs_deck_sections');
	});
});

describe('requeteOrphelins (liens vérifiés après la copie)', () => {
	it('compte les lignes dont la cible manque, pour un lien simple', () => {
		const sql = requeteOrphelins({
			table: 'worksheet_exercises',
			colonnes: ['worksheet_id'],
			schemaCible: 'public',
			cible: 'worksheets',
			colonnesCible: ['id']
		});
		expect(sql).toBe(
			'select count(*)::int n from public."worksheet_exercises" e ' +
				'where e."worksheet_id" is not null ' +
				'and not exists (select 1 from "public"."worksheets" c where c."id" = e."worksheet_id")'
		);
	});

	it('lien composé : une colonne vide suffit à ne pas vérifier la ligne (MATCH SIMPLE)', () => {
		const sql = requeteOrphelins({
			table: 'srs_cards',
			colonnes: ['section_id', 'deck_id'],
			schemaCible: 'public',
			cible: 'srs_deck_sections',
			colonnesCible: ['id', 'deck_id']
		});
		expect(sql).toContain('where e."section_id" is not null and e."deck_id" is not null');
		expect(sql).toContain('c."id" = e."section_id" and c."deck_id" = e."deck_id"');
	});

	it('une cible hors du schéma public (comptes) garde son schéma', () => {
		const sql = requeteOrphelins({
			table: 'profiles',
			colonnes: ['id'],
			schemaCible: 'auth',
			cible: 'users',
			colonnesCible: ['id']
		});
		expect(sql).toContain('from "auth"."users" c');
	});

	it('refuse un lien dont les colonnes ne se correspondent pas une à une', () => {
		expect(() =>
			requeteOrphelins({
				table: 't',
				colonnes: ['a', 'b'],
				schemaCible: 'public',
				cible: 'u',
				colonnesCible: ['id']
			})
		).toThrow(/colonnes/);
	});
});
