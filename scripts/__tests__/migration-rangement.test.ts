import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractRollback } from '../../tests/helpers/database/migration-rollback';
import { instructionDeSchema } from '../lib/migrations-de-donnees';
import {
	examinerModele,
	genererMigration,
	lireFixture,
	lireRangement,
	nomMigration,
	resoudreChemin,
	type Arbre,
	type ModeleNiveaux,
	type ModeleProd,
	type ModeleRange,
	type ModeleTags,
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
		{ id: 'n2', parent_id: 'b1', name: 'Entiers', kind: 'notion', archived_at: null },
		{ id: 'b2', parent_id: null, name: 'Probabilités', kind: 'branch', archived_at: null },
		{ id: 'n3', parent_id: 'b2', name: 'Variables aléatoires', kind: 'notion', archived_at: null },
		{ id: 's4', parent_id: 'n3', name: 'loi', kind: 'subnotion', archived_at: null }
	],
	points: [
		{ id: 'p115', code: '6-115', grade: '6', node_id: 's1', archived_at: null },
		{ id: 'p110', code: '6-110', grade: '6', node_id: 'n1', archived_at: null },
		{ id: 'p101', code: '6-101', grade: '6', node_id: 'n2', archived_at: null },
		{ id: 'p099', code: '6-099', grade: '6', node_id: 's1', archived_at: '2026-01-01' },
		{ id: 'ps355', code: '1SPE-355', grade: '1_SPE', node_id: 's4', archived_at: null },
		{ id: 'ps356', code: '1SPE-356', grade: '1_SPE', node_id: 'n3', archived_at: null },
		{ id: 'pt095', code: '1TECHNO-095', grade: '1_TECHNO', node_id: 'n3', archived_at: null },
		{ id: 'pm013', code: '6-013', grade: '6', node_id: 'n3', archived_at: null }
	]
};
const MULTIPLICATION = ['Nombres et calculs', 'Décimaux : calculs', 'multiplication'];
const LOI = ['Probabilités', 'Variables aléatoires', 'loi'];
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

function neuf(point: string | string[] | null = '6-115', chemin = MULTIPLICATION): Rangement {
	return {
		sorte: 'neuf',
		chemin,
		points: point === null ? [] : typeof point === 'string' ? [point] : point
	};
}

function ajouts(niveauxAjoutes: string[], pointsAjoutes: string[] = []): Rangement {
	return { sorte: 'ajouts', niveaux: niveauxAjoutes, points: pointsAjoutes };
}

/** Le modèle de 1re rangé sur « loi », tagué 1SPE-355 seul (le cas réel de l'outil 66) */
function probas(plus: Partial<ModeleProd> = {}): ModeleProd {
	return prod({
		id: ID2,
		title: 'Loi',
		grades: ['1_SPE', '1_TECHNO'],
		classification_node_id: 's4',
		points: ['ps355'],
		...plus
	});
}

function range(plus: Partial<ModeleRange> = {}): ModeleRange {
	return {
		id: ID,
		title: 'Multiplier',
		fichier: 'a.json',
		branche: 'Nombres et calculs',
		notion: 'Décimaux : calculs',
		sousNotion: 'multiplication',
		points: ['6-115'],
		...plus
	};
}

function tags(plus: Partial<ModeleTags> = {}): ModeleTags {
	return {
		id: ID2,
		title: 'Loi',
		fichier: 'b.json',
		noeud: 'Probabilités > Variables aléatoires > loi',
		avant: ['1SPE-355'],
		ajoutes: ['1TECHNO-095'],
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

	it('modèle neuf : une liste de points, un par programme', () => {
		expect(
			lireRangement({ noeud: LOI.join(' > '), point: ['1SPE-355', '1TECHNO-095'] }, 'a.json')
		).toEqual({ ok: true, rangement: neuf(['1SPE-355', '1TECHNO-095'], LOI) });
	});

	it('niveaux ajoutés', () => {
		expect(lireRangement({ niveauxAjoutes: ['6'] }, 'a.json')).toEqual({
			ok: true,
			rangement: ajouts(['6'])
		});
	});

	it('points ajoutés, seuls ou avec des niveaux', () => {
		expect(lireRangement({ pointsAjoutes: ['1TECHNO-095'] }, 'a.json')).toEqual({
			ok: true,
			rangement: ajouts([], ['1TECHNO-095'])
		});
		expect(
			lireRangement({ niveauxAjoutes: ['1_TECHNO'], pointsAjoutes: ['1TECHNO-095'] }, 'a.json')
		).toEqual({ ok: true, rangement: ajouts(['1_TECHNO'], ['1TECHNO-095']) });
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
		['niveaux en texte', { niveauxAjoutes: '6' }],
		['niveau inconnu', { niveauxAjoutes: ['6e'] }],
		['niveau qui finirait le commentaire SQL', { niveauxAjoutes: ["6\r; select 'x'; --"] }],
		['saut de ligne dans le chemin', { noeud: 'A > B\rC', point: '6-115' }],
		['saut de ligne dans le point', { noeud: 'A > B', point: '6-115\n' }],
		['liste de points vide', { noeud: 'A > B', point: [] }],
		['point en double dans la liste', { noeud: 'A > B', point: ['6-115', '6-115'] }],
		['point vide dans la liste', { noeud: 'A > B', point: ['6-115', ''] }],
		['points ajoutés vides', { pointsAjoutes: [] }],
		['points ajoutés en texte', { pointsAjoutes: '1TECHNO-095' }],
		['point ajouté en double', { pointsAjoutes: ['1TECHNO-095', '1TECHNO-095'] }],
		['points ajoutés avec un nœud', { noeud: 'A > B', point: null, pointsAjoutes: ['6-115'] }],
		['champ vide', {}]
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
			modele: range()
		});
	});

	it('point posé sur la NOTION du nœud : accepté', () => {
		const examen = examinerModele('a.json', neuf('6-110'), prod(), ARBRE);
		expect(examen.sorte === 'range' && examen.modele.points).toEqual(['6-110']);
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
			modele: range({ notion: 'Entiers', sousNotion: null, points: [] })
		});
	});

	it('point d’un niveau absent du modèle : refus', () => {
		const examen = examinerModele('a.json', neuf(), prod({ grades: ['CM2'] }), ARBRE);
		expect(examen).toEqual({
			sorte: 'refuse',
			erreur: 'a.json : le point 6-115 est de niveau 6, absent des niveaux du modèle (CM2)'
		});
	});

	it('deux points de deux programmes, sur le nœud et sur sa notion : rangé avec les deux', () => {
		const examen = examinerModele(
			'a.json',
			neuf(['1SPE-355', '1TECHNO-095'], LOI),
			prod({ grades: ['1_SPE', '1_TECHNO'] }),
			ARBRE
		);
		expect(examen).toEqual({
			sorte: 'range',
			modele: range({
				branche: 'Probabilités',
				notion: 'Variables aléatoires',
				sousNotion: 'loi',
				points: ['1SPE-355', '1TECHNO-095']
			})
		});
	});

	it('deux points du même programme : refus', () => {
		const examen = examinerModele(
			'a.json',
			neuf(['1SPE-355', '1SPE-356'], LOI),
			prod({ grades: ['1_SPE'] }),
			ARBRE
		);
		expect(examen.sorte === 'refuse' && examen.erreur).toBe(
			'a.json : 1SPE-355 et 1SPE-356 sont du même programme (1_SPE) — un modèle a au plus un point par programme'
		);
	});

	it('second point d’un niveau que le modèle n’a pas : refus', () => {
		const examen = examinerModele(
			'a.json',
			neuf(['1SPE-355', '1TECHNO-095'], LOI),
			prod({ grades: ['1_SPE'] }),
			ARBRE
		);
		expect(examen.sorte === 'refuse' && examen.erreur).toMatch(
			/1TECHNO-095 est de niveau 1_TECHNO, absent des niveaux du modèle \(1_SPE\)/
		);
	});

	it('lot relancé avec deux points déjà posés : ignoré ; un seul des deux posé : refus', () => {
		const rangement = neuf(['1SPE-355', '1TECHNO-095'], LOI);
		const grades = ['1_SPE', '1_TECHNO'];
		expect(
			examinerModele(
				'a.json',
				rangement,
				prod({ grades, classification_node_id: 's4', points: ['pt095', 'ps355'] }),
				ARBRE
			).sorte
		).toBe('ignore');
		expect(
			examinerModele(
				'a.json',
				rangement,
				prod({ grades, classification_node_id: 's4', points: ['ps355'] }),
				ARBRE
			).sorte
		).toBe('refuse');
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
			ajouts(['6']),
			prod({ id: ID2, title: 'Quotient', grades: ['CM2'], classification_node_id: 's1' }),
			ARBRE
		);
		expect(examen).toEqual({ sorte: 'ajouts', niveaux: niveaux(), tags: null });
	});

	it('niveau déjà posé : ignoré ; un seul des deux manque : lui seul est ajouté', () => {
		const dejaLa = prod({ grades: ['CM2', '6'], classification_node_id: 's1' });
		expect(examinerModele('b.json', ajouts(['6']), dejaLa, ARBRE).sorte).toBe('ignore');
		const examen = examinerModele('b.json', ajouts(['6', '5']), dejaLa, ARBRE);
		expect(examen.sorte === 'ajouts' && examen.niveaux?.apres).toEqual(['CM2', '6', '5']);
	});
});

describe('examinerModele, niveaux', () => {
	it('niveau ajouté à un modèle SANS nœud en prod : refus (jamais rangé)', () => {
		const examen = examinerModele('b.json', ajouts(['5']), prod(), ARBRE);
		expect(examen.sorte === 'refuse' && examen.erreur).toMatch(
			/b\.json : 0000000a n'a pas de nœud en prod — « niveauxAjoutes » et « pointsAjoutes »/
		);
	});
});

describe('examinerModele, points ajoutés', () => {
	it('cas réel : le modèle tagué 1SPE-355 gagne 1TECHNO-095, posé sur la notion de son nœud', () => {
		expect(examinerModele('b.json', ajouts([], ['1TECHNO-095']), probas(), ARBRE)).toEqual({
			sorte: 'ajouts',
			niveaux: null,
			tags: tags()
		});
	});

	it('point déjà posé : ignoré ; l’un posé, l’autre non : lui seul est ajouté', () => {
		const deja = probas({ points: ['ps355', 'pt095'] });
		expect(examinerModele('b.json', ajouts([], ['1TECHNO-095']), deja, ARBRE).sorte).toBe('ignore');
		const examen = examinerModele(
			'b.json',
			ajouts([], ['1SPE-355', '1TECHNO-095']),
			probas(),
			ARBRE
		);
		expect(examen.sorte === 'ajouts' && examen.tags?.ajoutes).toEqual(['1TECHNO-095']);
	});

	it('modèle rangé sans tag qui gagne son premier point', () => {
		const examen = examinerModele(
			'b.json',
			ajouts([], ['1TECHNO-095']),
			probas({ points: [] }),
			ARBRE
		);
		expect(examen.sorte === 'ajouts' && examen.tags).toEqual(tags({ avant: [] }));
	});

	it('niveau et point du même programme ajoutés ensemble : les deux posés', () => {
		const examen = examinerModele(
			'b.json',
			ajouts(['1_TECHNO'], ['1TECHNO-095']),
			probas({ grades: ['1_SPE'] }),
			ARBRE
		);
		expect(examen).toEqual({
			sorte: 'ajouts',
			niveaux: {
				id: ID2,
				title: 'Loi',
				fichier: 'b.json',
				avant: ['1_SPE'],
				apres: ['1_SPE', '1_TECHNO']
			},
			tags: tags()
		});
	});

	it('point d’un niveau que le modèle n’a pas, et que le fichier n’ajoute pas : refus', () => {
		const examen = examinerModele(
			'b.json',
			ajouts([], ['1TECHNO-095']),
			probas({ grades: ['1_SPE'] }),
			ARBRE
		);
		expect(examen.sorte === 'refuse' && examen.erreur).toMatch(
			/1TECHNO-095 est de niveau 1_TECHNO, absent des niveaux du modèle \(1_SPE\)/
		);
	});

	it('second point d’un programme déjà tagué : refus', () => {
		const examen = examinerModele('b.json', ajouts([], ['1SPE-356']), probas(), ARBRE);
		expect(examen.sorte === 'refuse' && examen.erreur).toMatch(
			/1SPE-355 et 1SPE-356 sont du même programme \(1_SPE\)/
		);
	});

	it.each([
		['introuvable', '1SPE-999', /point 1SPE-999 introuvable/],
		[
			'ni sur le nœud ni sur sa notion',
			'6-115',
			/le point 6-115 est sur « Nombres et calculs > Décimaux : calculs > multiplication », ni sur « Probabilités > Variables aléatoires > loi »/
		]
	])('point %s : refus', (_nom, code, message) => {
		const examen = examinerModele(
			'b.json',
			ajouts([], [code]),
			probas({ grades: ['1_SPE', '1_TECHNO', '6'] }),
			ARBRE
		);
		expect(examen.sorte === 'refuse' && examen.erreur).toMatch(message);
	});

	it('modèle sans nœud en prod : refus', () => {
		const examen = examinerModele(
			'b.json',
			ajouts([], ['1TECHNO-095']),
			probas({ classification_node_id: null, points: [] }),
			ARBRE
		);
		expect(examen.sorte).toBe('refuse');
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
		expect(() => genererMigration(ENTETE, { ranges: [], niveaux: [], tags: [] })).toThrow(
			/pas de migration vide/
		);
	});

	it('apostrophes des noms de nœuds doublées, titres ramenés à une ligne', () => {
		const sql = genererMigration(ENTETE, {
			ranges: [range({ notion: "L'ordre", title: 'Deux\nlignes', points: [] })],
			niveaux: [],
			tags: []
		});
		expect(sql).toContain(`('${ID}', 'Nombres et calculs', 'L''ordre', 'multiplication')`);
		expect(sql).not.toContain('insert into _qr_tags');
		expect(sql).toContain('« Deux lignes »');
		expect(sql).toContain('→ sans tag');
	});

	it('TOUT ou RIEN sur le nombre de modèles du lot', () => {
		const sql = genererMigration(ENTETE, {
			ranges: [range(), range({ id: ID2 })],
			niveaux: [],
			tags: []
		});
		expect(sql).toContain('if v_presents not in (0, 2) then');
	});

	it('niveaux seuls : pas de table du lot ; rangement seul : pas de bloc de niveaux', () => {
		const seuls = genererMigration(ENTETE, { ranges: [], niveaux: [niveaux()], tags: [] });
		expect(seuls).not.toContain('_qr_modeles');
		expect(seuls).toContain(`set grades = array['CM2', '6']::text[]`);
		expect(seuls).toContain(`and grades = array['CM2']::text[];`);
		expect(genererMigration(ENTETE, { ranges: [range()], niveaux: [], tags: [] })).not.toContain(
			'$niveaux$'
		);
	});

	it('le rollback en commentaire s’extrait et défait tout, niveaux gardés', () => {
		const fichier = join(mkdtempSync(join(tmpdir(), 'rangement-')), 'm.sql');
		writeFileSync(
			fichier,
			genererMigration(ENTETE, { ranges: [range()], niveaux: [niveaux()], tags: [] })
		);
		const retour = extractRollback(fichier);
		expect(retour).toContain(`('${ID}'::uuid, '6-115')`);
		expect(retour).toContain('set classification_node_id = null');
		expect(retour).toContain(
			`('${ID}'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication'::text)`
		);
		expect(retour).toContain(
			'and t.classification_node_id = case when r.sous_notion is null then n.id else s.id end;'
		);
		expect(retour).toContain(
			`set grades = array['CM2']::text[]\n where id = '${ID2}' and grades = array['CM2', '6']::text[];`
		);
	});

	it('aucune ligne hors commentaire avant le corps, même avec un retour chariot dans le lot ou la source', () => {
		const sql = genererMigration(
			{ lot: "x\r; select 'a'; --", source: "d\r; select 'b'; --", date: '2026-11-22' },
			{
				ranges: [range({ title: "t\r; select 'c'; --" })],
				niveaux: [niveaux()],
				tags: [tags({ id: ID, title: "u\r; select 'd'; --" })]
			}
		);
		const entete = sql.slice(0, sql.indexOf('-- ROLLBACK:END'));
		expect(entete).not.toContain('\r');
		expect(entete.split('\n').filter((l) => l !== '' && !l.startsWith('--'))).toEqual([]);
	});

	it('rollback d’un lot sans aucun tag : pas de suppression de tags', () => {
		const fichier = join(mkdtempSync(join(tmpdir(), 'rangement-')), 'm.sql');
		writeFileSync(
			fichier,
			genererMigration(ENTETE, { ranges: [range({ points: [] })], niveaux: [], tags: [] })
		);
		expect(extractRollback(fichier)).not.toContain('delete from');
	});

	it('la migration générée ne touche ni schéma ni règles d’accès (garde des migrations de données)', () => {
		const sql = genererMigration(ENTETE, { ranges: [range()], niveaux: [niveaux()], tags: [] });
		expect(instructionDeSchema(sql)).toBeNull();
	});

	it('modèle rangé avec deux points : deux lignes de tags, rollback qui retire les deux', () => {
		const fichier = join(mkdtempSync(join(tmpdir(), 'rangement-')), 'm.sql');
		const sql = genererMigration(ENTETE, {
			ranges: [range({ points: ['1SPE-355', '1TECHNO-095'] })],
			niveaux: [],
			tags: []
		});
		writeFileSync(fichier, sql);
		expect(sql).toContain(
			`insert into _qr_tags (id, code) values\n\t('${ID}', '1SPE-355'),\n\t('${ID}', '1TECHNO-095');`
		);
		expect(sql).toContain('→ 1SPE-355 + 1TECHNO-095');
		const retour = extractRollback(fichier);
		expect(retour).toContain(`('${ID}'::uuid, '1SPE-355'),\n\t('${ID}'::uuid, '1TECHNO-095')`);
	});

	it('points ajoutés : garde des tags du relevé, rollback qui ne retire que l’ajouté', () => {
		const fichier = join(mkdtempSync(join(tmpdir(), 'rangement-')), 'm.sql');
		const sql = genererMigration(ENTETE, { ranges: [], niveaux: [], tags: [tags()] });
		writeFileSync(fichier, sql);
		expect(sql).not.toContain('_qr_modeles');
		expect(sql).toContain(`insert into _qt_ajouts (id, code) values\n\t('${ID2}', '1TECHNO-095');`);
		expect(sql).toContain(
			`v_codes @> array['1SPE-355']::text[] and v_codes <@ array['1SPE-355']::text[]`
		);
		expect(sql).toContain('tags de 0000000b changés depuis le relevé');
		expect(sql).toContain(': tags {1SPE-355} + 1TECHNO-095');
		const retour = extractRollback(fichier);
		expect(retour).toContain(`('${ID2}'::uuid, '1TECHNO-095')`);
		expect(retour).not.toContain('1SPE-355');
		expect(retour).not.toContain('classification_node_id');
		expect(instructionDeSchema(sql)).toBeNull();
	});
});

describe('lireFixture', () => {
	it('fixture d’avant l’outil 66 (`point`, sans `tags`) : ramenée à la forme d’aujourd’hui', () => {
		const { points: _p, ...sansPoints } = range();
		expect(
			lireFixture({
				migration: 'm.sql',
				ranges: [
					{ ...sansPoints, point: '6-115' },
					{ ...sansPoints, id: ID2, point: null }
				],
				niveaux: [niveaux()]
			})
		).toEqual({
			migration: 'm.sql',
			ranges: [range(), range({ id: ID2, points: [] })],
			niveaux: [niveaux()],
			tags: []
		});
	});

	it('fixture d’aujourd’hui : inchangée', () => {
		const f = { migration: 'm.sql', ranges: [range()], niveaux: [], tags: [tags()] };
		expect(lireFixture(f)).toEqual(f);
	});
});
