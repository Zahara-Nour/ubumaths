import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractRollback } from '../../tests/helpers/database/migration-rollback';
import { instructionDeSchema } from '../lib/migrations-de-donnees';
import {
	examinerModele,
	genererMigration,
	lireRangement,
	nomMigration,
	resoudreChemin,
	type Arbre,
	type ModeleNiveaux,
	type ModeleProd,
	type ModeleRange,
	type Rangement
} from '../lib/migration-rangement';

// ============================================================================
// CONSTANTES
// ============================================================================

const ID = '0000000a-0000-4000-8000-000000000000';
const ID2 = '0000000b-0000-4000-8000-000000000000';
const ARBRE: Arbre = {
	noeuds: [
		{ id: 'b1', parent_id: null, name: 'Nombres et calculs', kind: 'branch', archived_at: null },
		{ id: 'n1', parent_id: 'b1', name: 'Décimaux : calculs', kind: 'notion', archived_at: null },
		{ id: 's1', parent_id: 'n1', name: 'multiplication', kind: 'subnotion', archived_at: null },
		{ id: 's2', parent_id: 'n1', name: 'addition', kind: 'subnotion', archived_at: null },
		{ id: 's3', parent_id: 'n1', name: 'ancienne', kind: 'subnotion', archived_at: '2026-01-01' },
		{ id: 'n2', parent_id: 'b1', name: 'Entiers', kind: 'notion', archived_at: null }
	],
	points: [
		{ id: 'p115', code: '6-115', grade: '6', node_id: 's1', archived_at: null },
		{ id: 'p110', code: '6-110', grade: '6', node_id: 'n1', archived_at: null },
		{ id: 'p101', code: '6-101', grade: '6', node_id: 'n2', archived_at: null },
		{ id: 'p099', code: '6-099', grade: '6', node_id: 's1', archived_at: '2026-01-01' }
	]
};
const MULTIPLICATION = ['Nombres et calculs', 'Décimaux : calculs', 'multiplication'];
const ENTETE = { lot: '6e-x', source: 'scripts/questions/6e-x', date: '2026-11-22' };

// ============================================================================
// FONCTIONS
// ============================================================================

function prod(plus: Partial<ModeleProd> = {}): ModeleProd {
	return {
		id: ID,
		title: 'Multiplier',
		grades: ['6'],
		classification_node_id: null,
		points: [],
		...plus
	};
}

function neuf(point: string | null = '6-115', chemin = MULTIPLICATION): Rangement {
	return { sorte: 'neuf', chemin, point };
}

function range(plus: Partial<ModeleRange> = {}): ModeleRange {
	return {
		id: ID,
		title: 'Multiplier',
		fichier: 'a.json',
		branche: 'Nombres et calculs',
		notion: 'Décimaux : calculs',
		sousNotion: 'multiplication',
		point: '6-115',
		...plus
	};
}

function niveaux(plus: Partial<ModeleNiveaux> = {}): ModeleNiveaux {
	return {
		id: ID2,
		title: 'Quotient',
		fichier: 'b.json',
		avant: ['CM2'],
		apres: ['CM2', '6'],
		...plus
	};
}

// ============================================================================
// SUITES
// ============================================================================

describe('lireRangement', () => {
	it('fichier sans champ : rien à lire', () => {
		expect(lireRangement(undefined, 'a.json')).toEqual({ ok: true, rangement: null });
	});

	it('modèle neuf : chemin de trois nœuds et point', () => {
		expect(lireRangement({ noeud: MULTIPLICATION.join(' > '), point: '6-115' }, 'a.json')).toEqual({
			ok: true,
			rangement: neuf()
		});
	});

	it('modèle neuf rangé sur une notion, sans tag écrit en clair', () => {
		expect(lireRangement({ noeud: 'Nombres et calculs > Entiers', point: null }, 'a.json')).toEqual(
			{
				ok: true,
				rangement: neuf(null, ['Nombres et calculs', 'Entiers'])
			}
		);
	});

	it('niveaux ajoutés', () => {
		expect(lireRangement({ niveauxAjoutes: ['6'] }, 'a.json')).toEqual({
			ok: true,
			rangement: { sorte: 'niveaux', niveaux: ['6'] }
		});
	});

	it.each([
		['null', null],
		['un texte', 'Nombres > Entiers'],
		['point oublié', { noeud: 'A > B' }],
		['nœud oublié', { point: '6-115' }],
		['clé en trop', { noeud: 'A > B', point: '6-115', niveauxAjoutes: ['6'] }],
		['branche seule', { noeud: 'Nombres et calculs', point: '6-115' }],
		['quatre nœuds', { noeud: 'A > B > C > D', point: '6-115' }],
		['nœud vide dans le chemin', { noeud: 'A >  > C', point: '6-115' }],
		['espace en trop', { noeud: 'A > B ', point: '6-115' }],
		['point vide', { noeud: 'A > B', point: '' }],
		['point numérique', { noeud: 'A > B', point: 115 }],
		['niveaux vides', { niveauxAjoutes: [] }],
		['niveau en double', { niveauxAjoutes: ['6', '6'] }],
		['niveaux en texte', { niveauxAjoutes: '6' }]
	])('refuse : %s', (_nom, brut) => {
		const lu = lireRangement(brut, 'a.json');
		expect(lu.ok).toBe(false);
		expect(lu.ok ? '' : lu.erreur).toMatch(/^a\.json : champ « rangement » /);
	});
});

describe('resoudreChemin', () => {
	it('sous-notion : le nœud et sa notion', () => {
		const r = resoudreChemin(ARBRE, MULTIPLICATION);
		expect([r?.noeud.id, r?.notion.id]).toEqual(['s1', 'n1']);
	});

	it('notion seule : le nœud est la notion', () => {
		const r = resoudreChemin(ARBRE, ['Nombres et calculs', 'Entiers']);
		expect([r?.noeud.id, r?.notion.id]).toEqual(['n2', 'n2']);
	});

	it.each([
		['branche inconnue', ['Géométrie', 'Entiers']],
		['notion inconnue', ['Nombres et calculs', 'Fractions']],
		['sous-notion archivée', ['Nombres et calculs', 'Décimaux : calculs', 'ancienne']],
		['sous-notion d’une autre notion', ['Nombres et calculs', 'Entiers', 'multiplication']]
	])('introuvable : %s', (_nom, chemin) => {
		expect(resoudreChemin(ARBRE, chemin)).toBeNull();
	});
});

describe('examinerModele', () => {
	it('modèle neuf sans nœud ni tag : rangé sur sa sous-notion, avec son point', () => {
		expect(examinerModele('a.json', neuf(), prod(), ARBRE)).toEqual({
			sorte: 'range',
			modele: range(),
			alerte: null
		});
	});

	it('point posé sur la NOTION du nœud : accepté', () => {
		const examen = examinerModele('a.json', neuf('6-110'), prod(), ARBRE);
		expect(examen.sorte === 'range' && examen.modele.point).toBe('6-110');
	});

	it('rangé sur une notion, sans tag', () => {
		const examen = examinerModele(
			'a.json',
			neuf(null, ['Nombres et calculs', 'Entiers']),
			prod(),
			ARBRE
		);
		expect(examen).toEqual({
			sorte: 'range',
			modele: range({ notion: 'Entiers', sousNotion: null, point: null }),
			alerte: null
		});
	});

	it('point d’un niveau absent du modèle : rangé, avec une alerte', () => {
		const examen = examinerModele('a.json', neuf(), prod({ grades: ['CM2'] }), ARBRE);
		expect(examen.sorte === 'range' && examen.alerte).toMatch(/6-115 est de niveau 6.*\(CM2\)/);
	});

	it('chemin introuvable : refus', () => {
		const examen = examinerModele(
			'a.json',
			neuf('6-115', ['Nombres et calculs', 'Fractions']),
			prod(),
			ARBRE
		);
		expect(examen).toEqual({
			sorte: 'refuse',
			erreur: "a.json : nœud « Nombres et calculs > Fractions » introuvable dans l'arbre"
		});
	});

	it.each([
		['introuvable', '6-999', /point 6-999 introuvable/],
		['archivé', '6-099', /point 6-099 archivé/],
		[
			'sur un autre nœud',
			'6-101',
			/le point 6-101 est sur « Nombres et calculs > Entiers », ni sur « Nombres et calculs > Décimaux : calculs > multiplication » ni sur sa notion/
		]
	])('point %s : refus', (_nom, code, message) => {
		const examen = examinerModele('a.json', neuf(code), prod(), ARBRE);
		expect(examen.sorte === 'refuse' && examen.erreur).toMatch(message);
	});

	it('point sur une sous-notion SŒUR : refus (ni le nœud ni sa notion)', () => {
		const chemin = ['Nombres et calculs', 'Décimaux : calculs', 'addition'];
		expect(examinerModele('a.json', neuf('6-115', chemin), prod(), ARBRE).sorte).toBe('refuse');
	});

	it('déjà rangé ailleurs en prod : refus, avec ce que porte la prod', () => {
		const examen = examinerModele(
			'a.json',
			neuf(),
			prod({ classification_node_id: 'n2', points: ['p101'] }),
			ARBRE
		);
		expect(examen).toEqual({
			sorte: 'refuse',
			erreur:
				'a.json : 0000000a est déjà rangé ou tagué en prod (nœud « Nombres et calculs > Entiers », point(s) : 6-101)'
		});
	});

	it.each([
		['bon nœud, sans le tag', { classification_node_id: 's1', points: [] }],
		['bon nœud, un tag de trop', { classification_node_id: 's1', points: ['p115', 'p110'] }],
		['bon nœud, autre tag', { classification_node_id: 's1', points: ['p110'] }]
	])('déjà rangé à moitié (%s) : refus', (_nom, etat) => {
		expect(examinerModele('a.json', neuf(), prod(etat), ARBRE).sorte).toBe('refuse');
	});

	it('déjà exactement sur ce nœud avec ce seul point (lot relancé) : ignoré', () => {
		const examen = examinerModele(
			'a.json',
			neuf(),
			prod({ classification_node_id: 's1', points: ['p115'] }),
			ARBRE
		);
		expect(examen.sorte).toBe('ignore');
	});

	it('fichier sans rangement, modèle sans nœud en prod : refus (modèle oublié)', () => {
		expect(examinerModele('a.json', null, prod(), ARBRE)).toEqual({
			sorte: 'refuse',
			erreur:
				"a.json : 0000000a n'a pas de nœud en prod et son fichier n'a pas de champ « rangement »"
		});
	});

	it('fichier sans rangement, modèle déjà rangé : ignoré', () => {
		expect(
			examinerModele('a.json', null, prod({ classification_node_id: 's1' }), ARBRE).sorte
		).toBe('ignore');
	});

	it('niveau ajouté : niveaux du relevé gardés, le neuf à la suite', () => {
		const examen = examinerModele(
			'b.json',
			{ sorte: 'niveaux', niveaux: ['6'] },
			prod({ id: ID2, title: 'Quotient', grades: ['CM2'], classification_node_id: 's1' }),
			ARBRE
		);
		expect(examen).toEqual({ sorte: 'niveaux', modele: niveaux() });
	});

	it('niveau déjà posé : ignoré ; un seul des deux manque : lui seul est ajouté', () => {
		const dejaLa = prod({ grades: ['CM2', '6'] });
		expect(
			examinerModele('b.json', { sorte: 'niveaux', niveaux: ['6'] }, dejaLa, ARBRE).sorte
		).toBe('ignore');
		const examen = examinerModele(
			'b.json',
			{ sorte: 'niveaux', niveaux: ['6', '5'] },
			dejaLa,
			ARBRE
		);
		expect(examen.sorte === 'niveaux' && examen.modele.apres).toEqual(['CM2', '6', '5']);
	});
});

describe('nomMigration', () => {
	it('nom du lot ramené aux lettres, chiffres et soulignés', () => {
		expect(nomMigration('20261122120000', 'idees-6e-décimaux-neufs')).toBe(
			'20261122120000_questions_idees_6e_d_cimaux_neufs_rangement_tags'
		);
	});
});

describe('genererMigration', () => {
	it('refuse un lot vide', () => {
		expect(() => genererMigration(ENTETE, { ranges: [], niveaux: [] })).toThrow(
			/pas de migration vide/
		);
	});

	it('apostrophes des noms de nœuds doublées, titres ramenés à une ligne', () => {
		const sql = genererMigration(ENTETE, {
			ranges: [range({ notion: "L'ordre", title: 'Deux\nlignes', point: null })],
			niveaux: []
		});
		expect(sql).toContain(`('${ID}', 'Nombres et calculs', 'L''ordre', 'multiplication', null)`);
		expect(sql).toContain('« Deux lignes »');
		expect(sql).toContain('→ sans tag');
	});

	it('TOUT ou RIEN sur le nombre de modèles du lot', () => {
		const sql = genererMigration(ENTETE, { ranges: [range(), range({ id: ID2 })], niveaux: [] });
		expect(sql).toContain('if v_presents not in (0, 2) then');
	});

	it('niveaux seuls : pas de table du lot ; rangement seul : pas de bloc de niveaux', () => {
		const seuls = genererMigration(ENTETE, { ranges: [], niveaux: [niveaux()] });
		expect(seuls).not.toContain('_qr_modeles');
		expect(seuls).toContain(`set grades = array['CM2', '6']::text[]`);
		expect(seuls).toContain(`and grades = array['CM2']::text[];`);
		expect(genererMigration(ENTETE, { ranges: [range()], niveaux: [] })).not.toContain('$niveaux$');
	});

	it('le rollback en commentaire s’extrait et défait tout, niveaux gardés', () => {
		const fichier = join(mkdtempSync(join(tmpdir(), 'rangement-')), 'm.sql');
		writeFileSync(fichier, genererMigration(ENTETE, { ranges: [range()], niveaux: [niveaux()] }));
		const retour = extractRollback(fichier);
		expect(retour).toContain(`('${ID}'::uuid, '6-115')`);
		expect(retour).toContain('set classification_node_id = null');
		expect(retour).toContain(
			`set grades = array['CM2']::text[]\n where id = '${ID2}' and grades = array['CM2', '6']::text[];`
		);
	});

	it('rollback d’un lot sans aucun tag : pas de suppression de tags', () => {
		const fichier = join(mkdtempSync(join(tmpdir(), 'rangement-')), 'm.sql');
		writeFileSync(
			fichier,
			genererMigration(ENTETE, { ranges: [range({ point: null })], niveaux: [] })
		);
		expect(extractRollback(fichier)).not.toContain('delete from');
	});

	it('la migration générée ne touche ni schéma ni règles d’accès (garde des migrations de données)', () => {
		const sql = genererMigration(ENTETE, { ranges: [range()], niveaux: [niveaux()] });
		expect(instructionDeSchema(sql)).toBeNull();
	});
});
