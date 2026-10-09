/**
 * Nettoyage de l'arbre des notions : les facettes disparaissent — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261012080000_nettoyage_facettes_arbre` : l'audit des facettes ENTIÈREMENT
 * TRANCHÉ par David le 2026-10-09 (docs/wip/arbre-notions/audit-facettes.md ; ADR 0020 § 3
 * précisé — une notion n'a qu'un découpage, par contenu mathématique) et les rangements
 * corrigés du lot de l'étape 2 de C5 et du crible. Copie figée des opérations :
 * tests/integration/fixtures/nettoyage-facettes.json.
 *
 * 1. Après les migrations, l'arbre et les points sont dans l'état final (base locale).
 * 2. Les modèles et les exercices n'existent qu'en production. Dans une transaction annulée,
 *    le test exécute le ROLLBACK écrit dans la migration (l'arbre revient à la version .15),
 *    fabrique des copies des identifiants de la prod rangées par la #981 (rejouée depuis son
 *    fichier), puis REJOUE la migration depuis son fichier. La preuve est INTÉGRALE : chaque
 *    modèle et chaque rangement d'exercice est comparé à l'état attendu.
 * 3. Les branches d'échec : présence partielle, état de départ inattendu → rien ne change.
 * 4. Le rollback ramène exactement l'état d'avant.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback } from '../helpers/database/migration-rollback';

// ============================================================================
// TYPES
// ============================================================================

interface Fixture {
	arbre_avant: string;
	arbre_apres: string;
	noeuds: {
		crees: { parent: string; nom: string; chemin_final: string }[];
		reparentes: { avant: string; nouveau_parent: string; chemin_final: string }[];
		renommes: { avant: string; ancien_nom: string; nouveau_nom: string; chemin_final: string }[];
		archives: { avant: string; kind: string; chemin_final: string }[];
	};
	points: { code: string; avant: string; apres: string }[];
	modeles: { id: string; avant: string; apres: string }[];
	rangements: { exercice: string; avant: string; apres: string; principal: boolean }[];
	suppressions: {
		exercice: string;
		noeud: string;
		garde: string;
		principal_transfere: boolean;
		position: number;
	}[];
	attendu_modeles: Record<string, string>;
	attendu_rangements: Record<string, { chemin: string; principal: boolean; position: number }[]>;
}

interface Rangements981 {
	modeles: { id: string }[];
	exercices: { id: string }[];
	exclus: string[];
}

interface Etat {
	/** chemin → genre et archivage, sous les branches de l'arbre (les racines « itest- » sont ignorées) */
	noeuds: Map<string, { kind: string; archived: boolean }>;
	/** code → chemin, points de la nouvelle génération (grade non nul) */
	points: Map<string, string>;
	modeles: Map<string, { chemin: string; updated_at: string }>;
	/** exercice → rangements « position§principal§chemin », triés */
	rangements: Map<string, string[]>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261012080000_nettoyage_facettes_arbre.sql';
const RANGEMENTS_981 = 'supabase/migrations/20261011200000_rangements_modeles_exercices.sql';
const fixture: Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/nettoyage-facettes.json', 'utf-8')
);
const r981: Rangements981 = JSON.parse(
	readFileSync('tests/integration/fixtures/rangements.json', 'utf-8')
);
const BRANCHES = new Set<string>(
	(
		JSON.parse(readFileSync('tests/integration/fixtures/arbre-notions-seed.json', 'utf-8')) as {
			branches: { nom: string }[];
		}
	).branches.map((b) => b.nom)
);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger n'est pas modifier). */
const AVANT = '2026-01-02T03:04:05.000Z';
const IDS_MODELES = r981.modeles.map((m) => m.id);
const IDS_EXERCICES = [...r981.exercices.map((e) => e.id), ...r981.exclus];

// ============================================================================
// FONCTIONS
// ============================================================================

async function lireEtat(pg: Client): Promise<Etat> {
	const n = await pg.query<{
		id: string;
		parent_id: string | null;
		name: string;
		kind: string;
		archived_at: Date | null;
	}>('select id, parent_id, name, kind, archived_at from public.classification_nodes');
	const parId = new Map(n.rows.map((r) => [r.id, r]));
	const chemin = new Map<string, string>();
	const noeuds = new Map<string, { kind: string; archived: boolean }>();
	for (const r of n.rows) {
		const parts: string[] = [];
		let racine = r;
		for (let c: typeof r | undefined = r; c; c = c.parent_id ? parId.get(c.parent_id) : undefined) {
			parts.unshift(c.name);
			racine = c;
		}
		chemin.set(r.id, parts.join(' > '));
		if (BRANCHES.has(racine.name)) {
			noeuds.set(parts.join(' > '), { kind: r.kind, archived: r.archived_at !== null });
		}
	}

	const p = await pg.query<{ code: string; node_id: string | null }>(
		'select code, node_id from public.curriculum_points where grade is not null'
	);
	const points = new Map(p.rows.map((r) => [r.code, chemin.get(r.node_id ?? '') ?? '∅']));

	const q = await pg.query<{
		id: string;
		classification_node_id: string | null;
		updated_at: Date;
	}>(
		'select id, classification_node_id, updated_at from public.question_templates where id = any($1::uuid[])',
		[IDS_MODELES]
	);
	const modeles = new Map(
		q.rows.map((r) => [
			r.id,
			{
				chemin: chemin.get(r.classification_node_id ?? '') ?? '∅',
				updated_at: r.updated_at.toISOString()
			}
		])
	);

	const c = await pg.query<{
		exercise_id: string;
		node_id: string;
		is_primary: boolean;
		position: number;
	}>(
		'select exercise_id, node_id, is_primary, position from public.exercise_classifications where exercise_id = any($1::uuid[])',
		[IDS_EXERCICES]
	);
	const rangements = new Map<string, string[]>();
	for (const r of c.rows) {
		const liste = rangements.get(r.exercise_id) ?? [];
		liste.push(`${r.position}§${r.is_primary}§${chemin.get(r.node_id) ?? '∅'}`);
		rangements.set(r.exercise_id, liste);
	}
	for (const liste of rangements.values()) liste.sort();

	return { noeuds, points, modeles, rangements };
}

/**
 * La prod d'avant le nettoyage, dans la transaction ouverte : l'arbre .15 (rollback du
 * nettoyage), puis les copies des modèles et des exercices, rangés par la #981 rejouée.
 */
async function preparerCopieDeLaProd(pg: Client, auteur: string): Promise<void> {
	await pg.query(extractRollback(MIGRATION));
	await pg.query(
		`insert into public.question_templates (id, type, grades, theme, domain, level, variations, status, title, created_at, updated_at)
		 select unnest($1::uuid[]), 'numerical_exact', array['2'], 'copie', 'copie', 1, '[{}]'::jsonb, 'draft', 'copie de la prod', $2::timestamptz, $2::timestamptz`,
		[IDS_MODELES, AVANT]
	);
	await pg.query(
		`insert into public.exercises (id, created_by, category, title, created_at, updated_at)
		 select unnest($1::uuid[]), $2::uuid, 'application', 'copie de la prod', $3::timestamptz, $3::timestamptz`,
		[IDS_EXERCICES, auteur, AVANT]
	);
	await pg.query(readFileSync(RANGEMENTS_981, 'utf-8'));
}

/** Résout un chemin « branche > notion > sous-notion » en identifiant de nœud (archivés compris). */
async function idDuChemin(pg: Client, chemin: string): Promise<string> {
	const n = await pg.query<{ id: string; parent_id: string | null; name: string }>(
		'select id, parent_id, name from public.classification_nodes'
	);
	const parId = new Map(n.rows.map((r) => [r.id, r]));
	for (const r of n.rows) {
		const parts: string[] = [];
		for (let c: typeof r | undefined = r; c; c = c.parent_id ? parId.get(c.parent_id) : undefined) {
			parts.unshift(c.name);
		}
		if (parts.join(' > ') === chemin) return r.id;
	}
	throw new Error(`chemin introuvable : ${chemin}`);
}

function attenduRangements(exercice: string): string[] {
	return (fixture.attendu_rangements[exercice] ?? [])
		.map((r) => `${r.position}§${r.principal}§${r.chemin}`)
		.sort();
}

// ============================================================================
// SUITES
// ============================================================================

describe("Nettoyage de l'arbre : l'état final après les migrations (base locale)", () => {
	let etat: Etat;

	beforeAll(async () => {
		etat = await lireEtat(await getPostgresClient());
	});

	it("la fixture est l'état final consolidé (arbre .15 → .16)", () => {
		expect(fixture.arbre_avant).toBe('2026-10-07.15');
		expect(fixture.arbre_apres).toBe('2026-10-09.16');
		expect(fixture.noeuds.crees).toHaveLength(3);
		expect(fixture.noeuds.reparentes).toHaveLength(6);
		expect(fixture.noeuds.renommes).toHaveLength(63);
		expect(fixture.noeuds.archives).toHaveLength(74);
		expect(fixture.points).toHaveLength(125);
		expect(fixture.modeles).toHaveLength(234);
		expect(fixture.rangements).toHaveLength(49);
		expect(fixture.suppressions).toHaveLength(4);
	});

	it('les 3 sous-notions créées existent, actives', () => {
		const ecarts = fixture.noeuds.crees.filter((c) => {
			const n = etat.noeuds.get(c.chemin_final);
			return !n || n.archived || n.kind !== 'subnotion';
		});
		expect(ecarts).toEqual([]);
	});

	it('les 6 sous-notions re-parentées sont sous leur nouvelle notion, plus sous l’ancienne', () => {
		const ecarts = fixture.noeuds.reparentes.filter((r) => {
			const n = etat.noeuds.get(r.chemin_final);
			return !n || n.archived || etat.noeuds.has(r.avant);
		});
		expect(ecarts).toEqual([]);
	});

	it('les 63 nœuds renommés portent leur nouveau nom, plus l’ancien', () => {
		const ecarts = fixture.noeuds.renommes.filter((r) => {
			const n = etat.noeuds.get(r.chemin_final);
			return !n || n.archived || etat.noeuds.has(r.avant);
		});
		expect(ecarts).toEqual([]);
	});

	it('les 74 nœuds sont archivés, aucun n’est supprimé, et rien d’autre n’est archivé', () => {
		const ecarts = fixture.noeuds.archives.filter((a) => {
			const n = etat.noeuds.get(a.chemin_final);
			return !n || !n.archived || n.kind !== a.kind;
		});
		expect(ecarts).toEqual([]);
		const archives = [...etat.noeuds.entries()].filter(([, n]) => n.archived).map(([c]) => c);
		expect(archives.sort()).toEqual(fixture.noeuds.archives.map((a) => a.chemin_final).sort());
	});

	it('les 125 points re-rattachés sont sur leur nouveau nœud', () => {
		const ecarts = fixture.points
			.map((p) => ({ code: p.code, attendu: p.apres, obtenu: etat.points.get(p.code) }))
			.filter((p) => p.attendu !== p.obtenu);
		expect(ecarts).toEqual([]);
	});

	it('aucun point ne reste sur un nœud archivé', async () => {
		const pg = await getPostgresClient();
		const r = await pg.query<{ n: string }>(
			`select count(*) as n from public.curriculum_points p
			   join public.classification_nodes c on c.id = p.node_id where c.archived_at is not null`
		);
		expect(Number(r.rows[0].n)).toBe(0);
	});
});

describe('Nettoyage : rejeu sur une copie de la prod (modèles et exercices)', () => {
	let pg: Client;
	/** La prod d'avant le nettoyage : arbre .15 (rollback), copies rangées par la #981. */
	let prod: Etat;
	let apres: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await preparerCopieDeLaProd(pg, prof.id);
		prod = await lireEtat(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
	}, 120_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('le rollback ramène l’arbre .15 : sous-notions créées absentes, anciens noms, rien d’archivé', () => {
		expect(fixture.noeuds.crees.filter((c) => prod.noeuds.has(c.chemin_final))).toEqual([]);
		expect(
			fixture.noeuds.renommes.filter((r) => prod.noeuds.get(r.avant)?.archived !== false)
		).toEqual([]);
		expect(
			fixture.noeuds.reparentes.filter((r) => prod.noeuds.get(r.avant)?.archived !== false)
		).toEqual([]);
		expect(
			fixture.noeuds.archives.filter((a) => prod.noeuds.get(a.avant)?.archived !== false)
		).toEqual([]);
		expect([...prod.noeuds.values()].filter((n) => n.archived)).toEqual([]);
		expect(prod.noeuds.size).toBe(19 + 137 + 540);
	});

	it('le rollback remet chaque point re-rattaché sur son nœud d’avant', () => {
		const ecarts = fixture.points.filter((p) => prod.points.get(p.code) !== p.avant);
		expect(ecarts).toEqual([]);
	});

	it('la copie de la prod est rangée comme par la #981 (modèles sur leur nœud de départ)', () => {
		expect(prod.modeles.size).toBe(1005);
		const ecarts = fixture.modeles.filter((m) => prod.modeles.get(m.id)?.chemin !== m.avant);
		expect(ecarts).toEqual([]);
	});

	it('chaque modèle (1 005) est EXACTEMENT dans le nœud attendu', () => {
		const ecarts = IDS_MODELES.map((id) => ({
			id,
			attendu: fixture.attendu_modeles[id],
			obtenu: apres.modeles.get(id)?.chemin
		})).filter((e) => e.attendu !== e.obtenu);
		expect(ecarts).toEqual([]);
		expect(apres.modeles.size).toBe(1005);
	});

	it('chaque exercice a EXACTEMENT ses rangements attendus (principal et position compris)', () => {
		const ecarts = r981.exercices
			.map((e) => ({
				id: e.id,
				attendu: attenduRangements(e.id),
				obtenu: apres.rangements.get(e.id) ?? []
			}))
			.filter((e) => JSON.stringify(e.attendu) !== JSON.stringify(e.obtenu));
		expect(ecarts).toEqual([]);
		for (const id of r981.exclus) expect(apres.rangements.get(id)).toBeUndefined();
	});

	it('les 4 doublons sont supprimés, et le principal est transféré quand il le fallait', () => {
		for (const s of fixture.suppressions) {
			const liste = (prod.rangements.get(s.exercice) ?? []).map((r) => r.split('§')[2]);
			expect(liste, s.exercice).toContain(s.noeud);
			const final = apres.rangements.get(s.exercice) ?? [];
			// Plus aucun rangement de l'exercice sur la facette archivée.
			expect(final.some((r) => apres.noeuds.get(r.split('§')[2])?.archived)).toBe(false);
			expect(final.filter((r) => r.split('§')[1] === 'true')).toHaveLength(1);
		}
		const transferts = fixture.suppressions.filter((s) => s.principal_transfere);
		expect(transferts).toHaveLength(2);
	});

	it('plus aucun modèle ni rangement d’exercice sur un nœud archivé', () => {
		expect([...apres.modeles.values()].filter((m) => apres.noeuds.get(m.chemin)?.archived)).toEqual(
			[]
		);
		const surArchive = [...apres.rangements.entries()].filter(([, l]) =>
			l.some((r) => apres.noeuds.get(r.split('§')[2])?.archived)
		);
		expect(surArchive).toEqual([]);
	});

	it('`updated_at` des modèles est préservé, et le trigger de date est rétabli', async () => {
		expect([...apres.modeles.values()].every((m) => m.updated_at === AVANT)).toBe(true);
		const t = await pg.query<{ tgenabled: string }>(
			`select tgenabled from pg_trigger where tgname = 'update_question_templates_updated_at'`
		);
		expect(t.rows).toHaveLength(1);
		expect(t.rows[0].tgenabled).toBe('O');
	});

	it('le rollback, rejoué après la migration, ramène EXACTEMENT l’état d’avant', async () => {
		await pg.query(extractRollback(MIGRATION));
		const retour = await lireEtat(pg);
		expect([...retour.noeuds.entries()].sort()).toEqual([...prod.noeuds.entries()].sort());
		expect([...retour.points.entries()].sort()).toEqual([...prod.points.entries()].sort());
		expect([...retour.modeles.entries()].sort()).toEqual([...prod.modeles.entries()].sort());
		expect([...retour.rangements.entries()].sort()).toEqual([...prod.rangements.entries()].sort());
	});
});

describe('Nettoyage : les branches d’échec (rien ne change)', () => {
	let pg: Client;
	let auteur: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		auteur = (await TestData.profile().withRole('teacher').create()).id;
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
		await cleanupAllTestData();
	});

	/** Prépare la copie de la prod, la perturbe, rejoue la migration : elle doit échouer sans rien changer. */
	async function rejouerApres(
		perturbation: string,
		params: (pg: Client) => Promise<unknown[]>,
		attendu: RegExp
	) {
		await pg.query('begin');
		try {
			await preparerCopieDeLaProd(pg, auteur);
			await pg.query(perturbation, await params(pg));
			const avant = await lireEtat(pg);
			await pg.query('savepoint rejeu');
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(attendu);
			await pg.query('rollback to savepoint rejeu');
			const ensuite = await lireEtat(pg);
			expect([...ensuite.noeuds.entries()].sort()).toEqual([...avant.noeuds.entries()].sort());
			expect([...ensuite.points.entries()].sort()).toEqual([...avant.points.entries()].sort());
			expect([...ensuite.modeles.entries()].sort()).toEqual([...avant.modeles.entries()].sort());
		} finally {
			await pg.query('rollback');
		}
	}

	it('TOUT ou RIEN : un modèle à déplacer manquant fait échouer la migration', async () => {
		await rejouerApres(
			'delete from public.question_templates where id = $1',
			async () => [fixture.modeles[0].id],
			/identifiants partiellement présents : 233 modèle\(s\) sur 234/
		);
	}, 60_000);

	it('TOUT ou RIEN : un rangement d’exercice à déplacer manquant fait échouer la migration', async () => {
		const r = fixture.rangements[0];
		await rejouerApres(
			'delete from public.exercise_classifications where exercise_id = $1 and node_id = $2',
			async (pg) => [r.exercice, await idDuChemin(pg, r.avant)],
			/identifiants partiellement présents : 52 rangement\(s\) d'exercice sur 53/
		);
	}, 60_000);

	it('état inattendu : une facette déjà archivée fait échouer la migration', async () => {
		const facette = fixture.noeuds.archives.find((a) => a.kind === 'subnotion');
		if (!facette) throw new Error('fixture : aucune sous-notion archivée');
		await rejouerApres(
			'update public.classification_nodes set archived_at = now() where id = $1',
			async (pg) => [await idDuChemin(pg, facette.avant)],
			/état inattendu : 1 nœud\(s\) en jeu déjà archivé\(s\)/
		);
	}, 60_000);

	it('état inattendu : un point qui n’est pas sur son nœud de départ fait échouer la migration', async () => {
		const p = fixture.points[0];
		await rejouerApres(
			`update public.curriculum_points set node_id = (
			   select id from public.classification_nodes
			    where kind = 'notion' and archived_at is null and id <> $2 order by id limit 1)
			  where code = $1 and grade is not null`,
			async (pg) => [p.code, await idDuChemin(pg, p.avant)],
			/état inattendu : points présents 125\/125, sur leur nœud de départ 124\/125/
		);
	}, 60_000);

	it('une écriture concurrente fait échouer proprement (lock_timeout de 5 s)', () => {
		const sql = readFileSync(MIGRATION, 'utf-8');
		const corps = sql.slice(sql.indexOf('-- ROLLBACK:END'));
		expect(corps).toContain("set local lock_timeout = '5s';");
		expect(extractRollback(MIGRATION)).toContain("set local lock_timeout = '5s';");
	});
});
