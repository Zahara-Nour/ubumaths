/**
 * `pnpm db:a-jour` sur une vraie base : jouer les migrations en attente sans rien effacer
 * ======================================================================================
 *
 * Panne rejouée le 2026-11-21 (docs/archive/wip/base-locale-progress.md § 9) : une base locale au
 * contenu de la prod restait bloquée sur la première migration de contenu déjà faite en prod,
 * et la CLI refusait de tourner dès que la base portait la migration d'une autre branche.
 *
 * Chaque test travaille dans une base JETABLE créée sur le Postgres local (`create database`),
 * avec son propre historique et un dossier de migrations temporaire : la base de dev et son
 * historique ne sont jamais touchés.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, type ClientConfig } from 'pg';
import {
	marquerContenuDeProd,
	mettreAJour,
	noterALaMain,
	porteLeContenuDeProd
} from '../../scripts/db-a-jour/appliquer';

// ============================================================================
// Constantes
// ============================================================================

const PG: ClientConfig = {
	host: process.env.SUPABASE_DB_HOST || 'localhost',
	port: parseInt(process.env.SUPABASE_DB_PORT || '54322'),
	user: process.env.SUPABASE_DB_USER || 'postgres',
	password: process.env.SUPABASE_DB_PASSWORD || 'postgres'
};

const TABLE = '20261101000000_table.sql';
const COLONNE = '20261103000000_colonne.sql';
const RANGEMENT = '20261102000000_questions_rangement_tags.sql';

/** Une migration de contenu : sa garde refuse un modèle déjà rangé, comme en prod. */
const SQL_RANGEMENT = `
create temporary table _q_modeles (id int primary key) on commit drop;
insert into _q_modeles values (1);
do $garde$
declare v_ranges integer;
begin
	select count(*) into v_ranges from public.modeles m join _q_modeles r on r.id = m.id
	 where m.noeud is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
end $garde$;
update public.modeles m set noeud = 'calcul' from _q_modeles r where r.id = m.id;
`;

// ============================================================================
// Variables
// ============================================================================

let admin: Client;
let db: Client;
let base: string;
let dossier: string;

// ============================================================================
// Fonctions
// ============================================================================

function ecrire(fichier: string, sql: string): void {
	writeFileSync(join(dossier, fichier), sql);
}

async function historique(): Promise<string[]> {
	const { rows } = await db.query<{ version: string }>(
		'select version from supabase_migrations.schema_migrations order by version'
	);
	return rows.map((r) => r.version);
}

async function colonnes(table: string): Promise<string[]> {
	const { rows } = await db.query<{ column_name: string }>(
		`select column_name from information_schema.columns
		  where table_schema = 'public' and table_name = $1 order by ordinal_position`,
		[table]
	);
	return rows.map((r) => r.column_name);
}

// ============================================================================
// Tests
// ============================================================================

beforeEach(async () => {
	base = `a_jour_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	admin = new Client({ ...PG, database: process.env.SUPABASE_DB_NAME || 'postgres' });
	await admin.connect();
	await admin.query(`create database ${base}`);
	db = new Client({ ...PG, database: base });
	await db.connect();
	await db.query(`
		create schema supabase_migrations;
		create table supabase_migrations.schema_migrations (
			version text primary key, statements text[], name text
		);
	`);
	dossier = mkdtempSync(join(tmpdir(), 'db-a-jour-'));
	ecrire(TABLE, 'create table public.modeles (id int primary key, noeud text);');
});

afterEach(async () => {
	await db.end();
	await admin.query(`drop database if exists ${base} with (force)`);
	await admin.end();
	rmSync(dossier, { recursive: true, force: true });
});

describe('mettreAJour', () => {
	it('joue les migrations en attente dans l’ordre et les inscrit à l’historique', async () => {
		ecrire(COLONNE, 'alter table public.modeles add column niveau int;');

		const bilan = await mettreAJour(db, { dossier });

		expect(bilan.jouees.map((m) => m.fichier)).toEqual([TABLE, COLONNE]);
		expect(bilan.arret).toBeUndefined();
		expect(await historique()).toEqual(['20261101000000', '20261103000000']);
		expect(await colonnes('modeles')).toEqual(['id', 'noeud', 'niveau']);
	});

	it('ne rejoue rien et n’efface rien au second passage', async () => {
		await mettreAJour(db, { dossier });
		await db.query(`insert into public.modeles values (7, 'géométrie')`);

		const bilan = await mettreAJour(db, { dossier });

		expect(bilan.jouees).toEqual([]);
		const { rows } = await db.query('select id, noeud from public.modeles');
		expect(rows).toEqual([{ id: 7, noeud: 'géométrie' }]);
	});

	it('tourne malgré une version en base sans fichier (migration d’une autre branche)', async () => {
		await db.query(
			`insert into supabase_migrations.schema_migrations (version, name) values ('20261199000000', 'autre_branche')`
		);

		const bilan = await mettreAJour(db, { dossier });

		expect(bilan.jouees.map((m) => m.fichier)).toEqual([TABLE]);
		expect(await historique()).toEqual(['20261101000000', '20261199000000']);
	});

	it('joue un fichier plus ancien que la dernière version en base', async () => {
		await mettreAJour(db, { dossier });
		ecrire(COLONNE, 'alter table public.modeles add column niveau int;');
		await mettreAJour(db, { dossier });
		ecrire(RANGEMENT, 'alter table public.modeles add column tardive int;');

		const bilan = await mettreAJour(db, { dossier });

		expect(bilan.jouees.map((m) => m.fichier)).toEqual([RANGEMENT]);
		expect(await colonnes('modeles')).toContain('tardive');
	});

	it('joue normalement une migration de contenu quand le modèle n’est pas encore rangé', async () => {
		await mettreAJour(db, { dossier });
		await db.query(`insert into public.modeles values (1, null)`);
		await marquerContenuDeProd(db);
		ecrire(RANGEMENT, SQL_RANGEMENT);

		const bilan = await mettreAJour(db, { dossier });

		expect(bilan.jouees.map((m) => m.fichier)).toEqual([RANGEMENT]);
		expect(bilan.notees).toEqual([]);
		const { rows } = await db.query('select noeud from public.modeles where id = 1');
		expect(rows[0].noeud).toBe('calcul');
	});

	it('contenu de la prod : note la migration de contenu déjà faite, et joue les suivantes', async () => {
		await mettreAJour(db, { dossier });
		await db.query(`insert into public.modeles values (1, 'rangé en prod')`);
		await marquerContenuDeProd(db);
		ecrire(RANGEMENT, SQL_RANGEMENT);
		ecrire(COLONNE, 'alter table public.modeles add column niveau int;');
		const lignes: string[] = [];

		const bilan = await mettreAJour(db, { dossier, dire: (l) => lignes.push(l) });

		expect(bilan.notees.map((n) => n.migration.fichier)).toEqual([RANGEMENT]);
		expect(bilan.notees[0].message).toContain('déjà rangés');
		expect(bilan.jouees.map((m) => m.fichier)).toEqual([COLONNE]);
		expect(bilan.arret).toBeUndefined();
		expect(await historique()).toEqual(['20261101000000', '20261102000000', '20261103000000']);
		// le contenu venu de la prod n'est pas touché
		const { rows } = await db.query('select noeud from public.modeles where id = 1');
		expect(rows[0].noeud).toBe('rangé en prod');
		expect(lignes.join('\n')).toContain('notée comme faite');
	});

	it('sans contenu de la prod : la même migration arrête tout, rien n’est noté', async () => {
		await mettreAJour(db, { dossier });
		await db.query(`insert into public.modeles values (1, 'rangé à la main')`);
		ecrire(RANGEMENT, SQL_RANGEMENT);
		ecrire(COLONNE, 'alter table public.modeles add column niveau int;');

		const bilan = await mettreAJour(db, { dossier });

		expect(bilan.arret?.migration.fichier).toBe(RANGEMENT);
		expect(bilan.arret?.message).toContain('déjà rangés');
		expect(bilan.jouees).toEqual([]);
		expect(await historique()).toEqual(['20261101000000']);
		expect(await colonnes('modeles')).toEqual(['id', 'noeud']);
	});

	it('une migration de schéma en échec arrête tout, même sur une base au contenu de la prod', async () => {
		await mettreAJour(db, { dossier });
		await marquerContenuDeProd(db);
		ecrire(
			RANGEMENT,
			`alter table public.modeles add column a int;
			 do $$ begin raise exception 'garde de schéma'; end $$;`
		);
		ecrire(COLONNE, 'alter table public.modeles add column niveau int;');

		const bilan = await mettreAJour(db, { dossier });

		expect(bilan.arret?.migration.fichier).toBe(RANGEMENT);
		expect(bilan.arret?.raison).toContain('schéma');
		// transaction annulée en entier : la colonne posée avant l'erreur n'existe pas
		expect(await colonnes('modeles')).toEqual(['id', 'noeud']);
		expect(await historique()).toEqual(['20261101000000']);
	});

	it('une migration qui porte sa propre transaction est jouée, et jamais notée après un échec', async () => {
		await mettreAJour(db, { dossier });
		await marquerContenuDeProd(db);
		ecrire(RANGEMENT, `begin;\ninsert into public.modeles values (5, null);\ncommit;`);
		ecrire(
			COLONNE,
			`begin;\ninsert into public.modeles values (6, null);\ncommit;
			 do $$ begin raise exception 'garde après le commit'; end $$;`
		);

		const bilan = await mettreAJour(db, { dossier });

		expect(bilan.jouees.map((m) => m.fichier)).toEqual([RANGEMENT]);
		expect(bilan.notees).toEqual([]);
		expect(bilan.arret?.migration.fichier).toBe(COLONNE);
		expect(bilan.arret?.raison).toContain('propre transaction');
		expect(await historique()).toEqual(['20261101000000', '20261102000000']);
		// la connexion reste utilisable : aucune transaction laissée ouverte
		const { rows } = await db.query('select count(*)::int n from public.modeles');
		expect(rows[0].n).toBe(2);
	});

	it('`attenteVerrou` : une table tenue par une autre connexion arrête la mise à jour, sans la bloquer', async () => {
		await mettreAJour(db, { dossier });
		const autre = new Client({ ...PG, database: base });
		await autre.connect();
		await autre.query('begin; lock table public.modeles in access exclusive mode');
		ecrire(COLONNE, 'alter table public.modeles add column niveau int;');
		try {
			const bilan = await mettreAJour(db, { dossier, attenteVerrou: '200ms' });

			expect(bilan.arret?.migration.fichier).toBe(COLONNE);
			expect(bilan.arret?.message).toContain('lock timeout');
			expect(await historique()).toEqual(['20261101000000']);
		} finally {
			await autre.query('rollback');
			await autre.end();
		}
	});

	it('prévient PostgREST quand une migration a été jouée, pas sinon', async () => {
		const recus: string[] = [];
		db.on('notification', (n) => recus.push(n.channel));
		await db.query('listen pgrst');

		await mettreAJour(db, { dossier });
		await db.query('select 1');
		expect(recus).toEqual(['pgrst']);

		await mettreAJour(db, { dossier });
		await db.query('select 1');
		expect(recus).toEqual(['pgrst']);
	});

	it('`seulement` : ne joue que les fichiers désignés et rend les autres', async () => {
		ecrire(COLONNE, 'alter table public.modeles add column niveau int;');

		const bilan = await mettreAJour(db, { dossier, seulement: new Set([TABLE]) });

		expect(bilan.jouees.map((m) => m.fichier)).toEqual([TABLE]);
		expect(bilan.ecartees.map((m) => m.fichier)).toEqual([COLONNE]);
		expect(await colonnes('modeles')).toEqual(['id', 'noeud']);
	});

	it('`essai` : dit ce qui serait joué, n’écrit rien', async () => {
		const bilan = await mettreAJour(db, { dossier, essai: true });

		expect(bilan.prevues.map((m) => m.fichier)).toEqual([TABLE]);
		expect(await historique()).toEqual([]);
		expect(await colonnes('modeles')).toEqual([]);
	});

	it('refuse une base sans historique de migrations', async () => {
		await db.query('drop schema supabase_migrations cascade');

		await expect(mettreAJour(db, { dossier })).rejects.toThrow(/Historique des migrations absent/);
	});
});

describe('marque « contenu de la prod »', () => {
	it('absente par défaut, présente après le marquage, qui se rejoue sans erreur', async () => {
		expect(await porteLeContenuDeProd(db)).toBe(false);
		await marquerContenuDeProd(db);
		await marquerContenuDeProd(db);
		expect(await porteLeContenuDeProd(db)).toBe(true);
	});
});

describe('noterALaMain', () => {
	it('inscrit une migration en attente à l’historique sans la jouer', async () => {
		const m = await noterALaMain(db, dossier, '20261101000000');

		expect(m.fichier).toBe(TABLE);
		expect(await historique()).toEqual(['20261101000000']);
		expect(await colonnes('modeles')).toEqual([]);
	});

	it('refuse une version qui n’est pas en attente', async () => {
		await expect(noterALaMain(db, dossier, '20269999000000')).rejects.toThrow(/Aucune migration/);
	});
});
