/**
 * `pnpm db:a-jour` : les règles
 * =============================
 *
 * La base locale de dev est partagée par les worktrees et peut porter le contenu de la prod
 * (docs/archive/wip/base-locale-progress.md). Gardé ici :
 * - quelles migrations sont en attente (fichier ancien compris, version sans fichier ignorée) ;
 * - mode automatique : seules celles d'origin/main ;
 * - après un échec : noter comme faite seulement une migration de contenu, sur une base au
 *   contenu de la prod, pour une erreur d'état du contenu ; arrêter dans tous les autres cas ;
 * - la cible est locale, ou rien n'est écrit.
 *
 * L'exécution sur une vraie base : tests/integration/db-a-jour.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
	deciderApresEchec,
	enAttente,
	lireFichier,
	porteSaTransaction,
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

describe('porteSaTransaction', () => {
	it('repère un `begin` / `commit` au niveau du fichier', () => {
		expect(porteSaTransaction('begin;\nupdate t set a = 1;\ncommit;')).toBe(true);
		expect(porteSaTransaction('START TRANSACTION;\nupdate t set a = 1;\nCOMMIT;')).toBe(true);
	});

	it('ne confond pas avec le `begin` d’un bloc DO, ni avec un commentaire', () => {
		expect(porteSaTransaction(RANGEMENT)).toBe(false);
		expect(porteSaTransaction('-- begin;\nupdate t set a = 1;')).toBe(false);
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

	it('arrête sur une erreur de logique (P0002, P0003), qui n’est pas une garde', () => {
		const logique = { code: 'P0002', message: 'query returned no rows' };
		expect(deciderApresEchec(RANGEMENT, logique, true).action).toBe('arreter');
	});

	it('arrête sur un verrou non obtenu (55P03) : la migration n’a pas été essayée', () => {
		const verrou = { code: '55P03', message: 'canceling statement due to lock timeout' };
		expect(deciderApresEchec(RANGEMENT, verrou, true).action).toBe('arreter');
	});

	it('arrête sur une migration qui porte sa propre transaction : une partie a pu être validée', () => {
		const d = deciderApresEchec(`begin;\n${RANGEMENT}\ncommit;`, GARDE, true);
		expect(d.action).toBe('arreter');
		expect(d.raison).toContain('propre transaction');
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

	it('refuse un autre compte que celui de la pile locale (tunnel vers une base distante)', () => {
		expect(() =>
			verifierCibleLocale('postgresql://postgres:autre@localhost:5432/postgres')
		).toThrow(/compte de la pile locale/);
		expect(() =>
			verifierCibleLocale('postgresql://admin:postgres@127.0.0.1:54322/postgres')
		).toThrow(/compte de la pile locale/);
	});

	it('refuse un hôte distant', () => {
		expect(() =>
			verifierCibleLocale('postgresql://postgres:postgres@db.exemple.test:5432/postgres')
		).toThrow(/pas locale/);
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

describe('ligne de commande', () => {
	const tsx = resolve(__dirname, '../../node_modules/.bin/tsx');
	const index = resolve(__dirname, '../db-a-jour/index.ts');
	const auto = resolve(__dirname, '../db-a-jour-auto.sh');
	// port 9 (discard) : rien n'y écoute, la connexion est refusée tout de suite
	const INJOIGNABLE = 'postgresql://postgres:postgres@127.0.0.1:9/postgres';

	function lancer(args: string[], pgUrl: string) {
		return spawnSync(tsx, [index, ...args], {
			encoding: 'utf8',
			env: { ...process.env, BASE_LOCALE_PG_URL: pgUrl }
		});
	}

	it('--auto : base injoignable → un avertissement, sortie 0 (ne bloque pas `pnpm dev`)', () => {
		const r = lancer(['--auto'], INJOIGNABLE);
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('injoignable');
	});

	it('sans --auto : base injoignable → sortie 1', () => {
		expect(lancer([], INJOIGNABLE).status).toBe(1);
	});

	it('cible distante : refus avant toute connexion, sortie 1', () => {
		const r = lancer([], 'postgresql://postgres:postgres@db.exemple.test:5432/postgres');
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('pas locale');
	});

	it('--noter sans version à 14 chiffres : usage, sortie 1', () => {
		const r = lancer(['--noter', 'abc'], INJOIGNABLE);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('Usage');
	});

	it('script d’avant `pnpm dev` : ne fait rien en CI, sortie 0', () => {
		const r = spawnSync('bash', [auto], { encoding: 'utf8', env: { ...process.env, CI: 'true' } });
		expect(r.status).toBe(0);
		expect(r.stdout + r.stderr).toBe('');
	});
});
