/**
 * Rangements des modèles et des exercices dans l'arbre des notions — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261011200000_rangements_modeles_exercices` : chaque modèle de questions
 * (1 005) et chaque exercice (328, « debug » exclu) rangé dans l'arbre, d'après la
 * correspondance VALIDÉE par David (docs/wip/arbre-notions/correspondance/, copie figée
 * dans tests/integration/fixtures/rangements.json) ; types de source « Bac » et « Concours ».
 *
 * Les modèles et exercices n'existent qu'en production. Le test fabrique donc l'état de la
 * prod — des copies minimales portant les VRAIS identifiants — puis rejoue la migration
 * **depuis son fichier**, telle qu'elle sera jouée en production, dans une transaction
 * annulée à la fin. La preuve est INTÉGRALE : chaque rangement est comparé à la fixture.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// TYPES
// ============================================================================

interface Noeud {
	branche: string;
	notion: string;
	sous_notion: string | null;
}

interface Fixture {
	arbre: string;
	modeles: (Noeud & { id: string })[];
	exercices: {
		id: string;
		noeuds: (Noeud & { principal: boolean; position: number })[];
		type_source: string | null;
	}[];
	exclus: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261011200000_rangements_modeles_exercices.sql';
const fixture: Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/rangements.json', 'utf-8')
);
/** Date de modification fabriquée : elle ne doit pas bouger (le rangement n'est pas une modification). */
const AVANT = '2026-01-02T03:04:05.000Z';

function chemin(n: Noeud): string {
	return [n.branche, n.notion, ...(n.sous_notion ? [n.sous_notion] : [])].join(' > ');
}

// ============================================================================
// SUITE
// ============================================================================

describe('Rangements des modèles et des exercices (migration de données)', () => {
	let pg: Client;
	let auteur: string;
	const cheminDe = new Map<string, string>();
	let modeles: Map<string, { node: string | null; updated_at: string }>;
	let rangements: Map<string, { chemin: string; is_primary: boolean; position: number }[]>;
	let typesSource: Map<string, string | null>;
	let exercicesDates: Map<string, string>;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		auteur = prof.id;
		pg = await getPostgresClient();

		await pg.query('begin');
		// L'état de la prod : les modèles et exercices de la correspondance, plus « debug ».
		await pg.query(
			`insert into public.question_templates (id, type, grades, theme, domain, level, variations, status, title, created_at, updated_at)
			 select unnest($1::uuid[]), 'numerical_exact', array['2'], 'copie', 'copie', 1, '[{}]'::jsonb, 'draft', 'copie de la prod', $2::timestamptz, $2::timestamptz`,
			[fixture.modeles.map((m) => m.id), AVANT]
		);
		await pg.query(
			`insert into public.exercises (id, created_by, category, title, created_at, updated_at)
			 select unnest($1::uuid[]), $2::uuid, 'application', 'copie de la prod', $3::timestamptz, $3::timestamptz`,
			[[...fixture.exercices.map((e) => e.id), ...fixture.exclus], auteur, AVANT]
		);

		// La migration, rejouée depuis son fichier.
		await pg.query(readFileSync(MIGRATION, 'utf-8'));

		const noeuds = await pg.query<{ id: string; parent_id: string | null; name: string }>(
			'select id, parent_id, name from public.classification_nodes'
		);
		const parNoeud = new Map(noeuds.rows.map((n) => [n.id, n]));
		for (const n of noeuds.rows) {
			const parts: string[] = [];
			for (
				let c: typeof n | undefined = n;
				c;
				c = c.parent_id ? parNoeud.get(c.parent_id) : undefined
			) {
				parts.unshift(c.name);
			}
			cheminDe.set(n.id, parts.join(' > '));
		}

		const q = await pg.query<{
			id: string;
			classification_node_id: string | null;
			updated_at: Date;
		}>(
			'select id, classification_node_id, updated_at from public.question_templates where id = any($1::uuid[])',
			[fixture.modeles.map((m) => m.id)]
		);
		modeles = new Map(
			q.rows.map((r) => [
				r.id,
				{ node: r.classification_node_id, updated_at: r.updated_at.toISOString() }
			])
		);

		const ids = [...fixture.exercices.map((e) => e.id), ...fixture.exclus];
		const c = await pg.query<{
			exercise_id: string;
			node_id: string;
			is_primary: boolean;
			position: number;
		}>(
			'select exercise_id, node_id, is_primary, position from public.exercise_classifications where exercise_id = any($1::uuid[])',
			[ids]
		);
		rangements = new Map();
		for (const r of c.rows) {
			const liste = rangements.get(r.exercise_id) ?? [];
			liste.push({
				chemin: cheminDe.get(r.node_id) ?? '∅',
				is_primary: r.is_primary,
				position: r.position
			});
			rangements.set(r.exercise_id, liste);
		}

		const x = await pg.query<{ id: string; type: string | null; updated_at: Date }>(
			`select x.id, t.name as type, x.updated_at from public.exercises x
			   left join public.source_types t on t.id = x.source_type_id where x.id = any($1::uuid[])`,
			[ids]
		);
		typesSource = new Map(x.rows.map((r) => [r.id, r.type]));
		exercicesDates = new Map(x.rows.map((r) => [r.id, r.updated_at.toISOString()]));
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('la fixture est la correspondance validée (1 005 modèles, 328 exercices, « debug » exclu)', () => {
		expect(fixture.modeles).toHaveLength(1005);
		expect(fixture.exercices).toHaveLength(328);
		expect(fixture.exclus).toHaveLength(1);
		expect(fixture.exercices.reduce((s, e) => s + e.noeuds.length, 0)).toBe(450);
	});

	it('chaque modèle est rangé EXACTEMENT dans le nœud de la correspondance', () => {
		const ecarts = fixture.modeles
			.map((m) => ({
				id: m.id,
				attendu: chemin(m),
				obtenu: cheminDe.get(modeles.get(m.id)?.node ?? '') ?? '∅'
			}))
			.filter((e) => e.attendu !== e.obtenu);
		expect(ecarts).toEqual([]);
		expect(modeles.size).toBe(1005);
	});

	it('chaque exercice a EXACTEMENT ses rangements, le premier en principal, dans l’ordre', () => {
		const ecarts = fixture.exercices
			.map((e) => {
				const attendu = e.noeuds.map((n) => `${n.position}§${n.principal}§${chemin(n)}`).sort();
				const obtenu = (rangements.get(e.id) ?? [])
					.map((r) => `${r.position}§${r.is_primary}§${r.chemin}`)
					.sort();
				return { id: e.id, attendu, obtenu };
			})
			.filter((e) => JSON.stringify(e.attendu) !== JSON.stringify(e.obtenu));
		expect(ecarts).toEqual([]);
		// « debug » n'est rangé nulle part.
		for (const id of fixture.exclus) expect(rangements.get(id)).toBeUndefined();
	});

	it('les types de source sont posés (7 Bac, 1 Concours) et nulle part ailleurs', () => {
		for (const e of fixture.exercices) {
			expect(typesSource.get(e.id) ?? null, e.id).toBe(e.type_source);
		}
		const valeurs = [...typesSource.values()].filter(Boolean);
		expect(valeurs.filter((v) => v === 'Bac')).toHaveLength(7);
		expect(valeurs.filter((v) => v === 'Concours')).toHaveLength(1);
	});

	it('`updated_at` est préservé : ranger n’est pas modifier le contenu', () => {
		expect([...modeles.values()].every((m) => m.updated_at === AVANT)).toBe(true);
		expect([...exercicesDates.values()].every((d) => d === AVANT)).toBe(true);
	});

	it('les triggers de date sont rétablis après le remplissage', async () => {
		const t = await pg.query<{ tgname: string; tgenabled: string }>(
			`select tgname, tgenabled from pg_trigger
			  where tgname in ('update_question_templates_updated_at', 'exercises_updated_at')`
		);
		expect(t.rows).toHaveLength(2);
		expect(t.rows.every((r) => r.tgenabled === 'O')).toBe(true);
	});
});

describe('Rangements : les branches d’échec de la migration', () => {
	let pg: Client;

	beforeAll(async () => {
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration (présence partielle)', async () => {
		await pg.query('begin');
		try {
			const presents = fixture.modeles.slice(1).map((m) => m.id);
			await pg.query(
				`insert into public.question_templates (id, type, grades, theme, domain, level, variations, status, title)
				 select unnest($1::uuid[]), 'numerical_exact', array['2'], 'copie', 'copie', 1, '[{}]'::jsonb, 'draft', 'copie de la prod'`,
				[presents]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 1004 modèle\(s\)/
			);
		} finally {
			await pg.query('rollback');
		}
	});

	it('la garde refuse le remplissage si un rangement existe déjà', async () => {
		await pg.query('begin');
		try {
			await pg.query(
				`insert into public.question_templates (id, type, grades, theme, domain, level, variations, status, title, classification_node_id)
				 values (gen_random_uuid(), 'numerical_exact', array['2'], 'copie', 'copie', 1, '[{}]'::jsonb, 'draft', 'déjà rangé',
				         (select id from public.classification_nodes where kind = 'notion' and archived_at is null limit 1))`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/rangements déjà présents/
			);
		} finally {
			await pg.query('rollback');
		}
	});
});
