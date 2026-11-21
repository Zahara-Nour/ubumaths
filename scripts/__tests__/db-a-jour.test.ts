/**
 * `pnpm db:a-jour` : les règles
 * =============================
 *
 * La base locale de dev est partagée par les worktrees et peut porter le contenu de la prod
 * (docs/wip/base-locale-progress.md). Gardé ici :
 * - quelles migrations sont en attente (fichier ancien compris, version sans fichier ignorée) ;
 * - mode automatique : seules celles d'origin/main ;
 * - après un échec : noter comme faite seulement une migration de contenu, sur une base au
 *   contenu de la prod, pour une erreur d'état du contenu ; arrêter dans tous les autres cas ;
 * - la cible est locale, ou rien n'est écrit.
 *
 * L'exécution sur une vraie base : tests/integration/db-a-jour.test.ts.
 */

import { describe, it, expect } from 'vitest';
import {
	deciderApresEchec,
	enAttente,
	lireFichier,
	separerParOrigine,
	verifierCibleLocale
} from '../db-a-jour/regles';

// ============================================================================
// Constantes
// ============================================================================

const RANGEMENT = `
create temporary table _q_modeles (id uuid primary key) on commit drop;
do $garde$
begin
	if exists (select 1 from public.question_templates q join _q_modeles r on r.id = q.id
	            where q.classification_node_id is not null) then
		raise exception 'modèles déjà rangés depuis le relevé';
	end if;
end $garde$;
update public.question_templates set classification_node_id = null where false;
`;

const SCHEMA = `alter table public.question_templates add column essai int;`;

const GARDE = { code: 'P0001', message: 'modèles déjà rangés depuis le relevé : 3' };

// ============================================================================
// Tests
// ============================================================================

describe('lireFichier', () => {
	it('lit la version et le nom', () => {
		expect(lireFichier('20261120120749_questions_2de_rangement_tags.sql')).toEqual({
			version: '20261120120749',
			nom: 'questions_2de_rangement_tags',
			fichier: '20261120120749_questions_2de_rangement_tags.sql'
		});
	});

	it('écarte ce qui n’est pas une migration horodatée', () => {
		expect(lireFichier('README.md')).toBeNull();
		expect(lireFichier('015_seed.sql')).toBeNull();
		expect(lireFichier('20261120120749_nom.sql.bak')).toBeNull();
	});
});

describe('enAttente', () => {
	const fichiers = [
		'20261103000000_c.sql',
		'20261101000000_a.sql',
		'20261102000000_b.sql',
		'notes.txt'
	];

	it('rend les fichiers dont la version manque, dans l’ordre', () => {
		expect(enAttente(fichiers, ['20261101000000']).map((m) => m.version)).toEqual([
			'20261102000000',
			'20261103000000'
		]);
	});

	it('compte un fichier plus ancien que la dernière version en base (branche mergée tard)', () => {
		expect(enAttente(fichiers, ['20261103000000']).map((m) => m.version)).toEqual([
			'20261101000000',
			'20261102000000'
		]);
	});

	it('ignore une version en base sans fichier (migration d’une autre branche)', () => {
		const appliquees = ['20261101000000', '20261102000000', '20261103000000', '20261199000000'];
		expect(enAttente(fichiers, appliquees)).toEqual([]);
	});
});

describe('separerParOrigine', () => {
	it('sépare les migrations mergées de celles de la branche', () => {
		const attente = enAttente(['20261101000000_a.sql', '20261102000000_b.sql'], []);
		const { mergees, deLaBranche } = separerParOrigine(attente, new Set(['20261101000000_a.sql']));
		expect(mergees.map((m) => m.nom)).toEqual(['a']);
		expect(deLaBranche.map((m) => m.nom)).toEqual(['b']);
	});
});

describe('deciderApresEchec', () => {
	it('note une migration de contenu dont la garde refuse, sur une base au contenu de la prod', () => {
		expect(deciderApresEchec(RANGEMENT, GARDE, true).action).toBe('noter');
	});

	it('note aussi une ligne déjà présente (contrainte, classe 23)', () => {
		const doublon = { code: '23505', message: 'duplicate key value' };
		expect(deciderApresEchec(RANGEMENT, doublon, true).action).toBe('noter');
	});

	it('arrête si la base ne porte pas le contenu de la prod', () => {
		const d = deciderApresEchec(RANGEMENT, GARDE, false);
		expect(d.action).toBe('arreter');
		expect(d.raison).toContain('contenu de la prod');
	});

	it('arrête sur une migration de schéma, même avec une erreur de garde', () => {
		const d = deciderApresEchec(SCHEMA, GARDE, true);
		expect(d.action).toBe('arreter');
		expect(d.raison).toContain('schéma');
	});

	it('arrête si une instruction de schéma se cache derrière du contenu', () => {
		expect(deciderApresEchec(`${RANGEMENT}\n${SCHEMA}`, GARDE, true).action).toBe('arreter');
	});

	it('arrête sur une faute de syntaxe ou un objet inconnu (classe 42)', () => {
		const inconnu = { code: '42703', message: 'column "x" does not exist' };
		expect(deciderApresEchec(RANGEMENT, inconnu, true).action).toBe('arreter');
	});

	it('arrête sur une erreur sans code (connexion coupée)', () => {
		expect(deciderApresEchec(RANGEMENT, { message: 'Connection terminated' }, true).action).toBe(
			'arreter'
		);
	});
});

describe('verifierCibleLocale', () => {
	it('accepte la base locale', () => {
		expect(() =>
			verifierCibleLocale('postgresql://postgres:postgres@127.0.0.1:54322/postgres')
		).not.toThrow();
		expect(() =>
			verifierCibleLocale('postgresql://postgres:postgres@localhost:54322/x')
		).not.toThrow();
	});

	it('refuse un hôte distant', () => {
		expect(() => verifierCibleLocale('postgresql://u:p@db.exemple.test:5432/postgres')).toThrow(
			/pas locale/
		);
	});

	it('refuse un paramètre de requête, qui peut remplacer l’hôte', () => {
		expect(() =>
			verifierCibleLocale(
				'postgresql://postgres:postgres@127.0.0.1:54322/postgres?host=db.exemple.test'
			)
		).toThrow(/paramètre/);
	});

	it('refuse une URL illisible', () => {
		expect(() => verifierCibleLocale('pas une url')).toThrow(/illisible/);
	});
});
