/**
 * Carnets Python et paquets SRS : quatre règles d'accès (base locale requise)
 * ==========================================================================
 *
 * Migration : 20261004213000_carnets_srs_acces.sql (règles 1 à 3).
 * Règle 4 : déjà en prod depuis 20260912170000 — non-régression seulement.
 *
 *   1. Seuls prof et admin rendent un carnet public.
 *   2. Un paquet assigné / auto-géré / copie (`source_deck_id`) est créé par le
 *      serveur seul, jamais par un compte connecté.
 *   3. Un élève n'écrit un checkpoint run que sur un carnet qui lui est ASSIGNÉ.
 *   4. Un élève retiré d'une classe (`status <> 'active'`) ne lit plus les
 *      carnets assignés à cette classe.
 *
 * Chaque refus a son témoin légitime : une migration qui refuserait TOUT
 * passerait les refus.
 *
 * ⚠️ La RLS refuse en silence (zéro ligne) : chaque écriture est faite avec
 * `.select()` et la base est relue avec le client service.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import { rpcNullable } from '$lib/types/database-helpers';

// Le module serveur prend son client service dans process.env (qui peut viser la
// prod via .env) : on le branche explicitement sur la base LOCALE de test.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

import { ensureProgrammeDeck } from '$lib/server/srs/programme-deck';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;
type Resultat = { error: { code?: string; message: string } | null; data: unknown[] | null };

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** `valid_content_structure` exige version, metadata et cells (tableau). */
const CONTENU = { version: '1.0', metadata: {}, cells: [] };

const service = createServiceRoleClient();

// ============================================================================
// FONCTIONS
// ============================================================================

async function clientFor(email: string): Promise<Client> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

/** Nombre de lignes d'une table qui satisfont `colonne = valeur`, hors RLS. */
async function compter(table: string, colonne: string, valeur: string): Promise<number> {
	const { count, error } = await service
		.from(table as never)
		.select('*', { count: 'exact', head: true })
		.eq(colonne, valeur);
	if (error) throw new Error(`${table}: ${error.message}`);
	return count ?? 0;
}

async function lireCarnet(id: string) {
	const { data, error } = await service
		.from('python_notebooks')
		.select('is_public, title')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

async function lirePaquet(id: string) {
	const { data, error } = await service
		.from('srs_decks')
		.select('is_assigned, is_auto_managed, source_deck_id, name')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

async function runsDe(userId: string, notebookId: string): Promise<number> {
	const { count, error } = await service
		.from('python_notebook_checkpoint_runs')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId)
		.eq('notebook_id', notebookId);
	if (error) throw new Error(error.message);
	return count ?? 0;
}

function refusee(res: Resultat) {
	const refus = res.error !== null || !res.data || res.data.length === 0;
	expect(refus, 'écriture acceptée alors qu’elle devait être refusée').toBe(true);
}

function acceptee(res: Resultat) {
	expect(res.error?.message ?? null).toBeNull();
	expect(res.data?.length).toBe(1);
}

// ============================================================================
// TESTS
// ============================================================================

describe('carnets Python et paquets SRS : quatre règles d’accès', () => {
	let prof: Client;
	let profId: string;
	let eleve: Client;
	let eleveId: string;
	let archive: Client;
	let archiveId: string;
	let classeId: string;
	/** Carnet du prof, public, NON assigné. */
	let carnetPublic: string;
	/** Carnet du prof, privé, assigné à la classe. */
	let carnetAssigne: string;
	/** Carnet de l'ÉLÈVE, public, non assigné (le seul que la RLS lui laisse lire). */
	let carnetPublicEleve: string;
	/** Second carnet du prof, et l'assignation de `carnetAssigne`. */
	let autreCarnetProf: string;
	let assignationId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const suffixe = crypto.randomUUID().slice(0, 8);

		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;
		prof = await clientFor(p.email);

		const classe = await TestData.class().withName(`2nde carnets ${suffixe}`).create();
		classeId = classe.id;

		const membre = async (status: string) => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classeId, student_id: profil.id, status });
			expect(error).toBeNull();
			return { id: profil.id, client: await clientFor(profil.email) };
		};
		const actif = await membre('active');
		eleveId = actif.id;
		eleve = actif.client;
		const ancien = await membre('archived');
		archiveId = ancien.id;
		archive = ancien.client;

		carnetPublic = await insert('python_notebooks', {
			title: `Carnet public ${suffixe}`,
			content: CONTENU,
			author_id: profId,
			is_public: true
		});
		carnetAssigne = await insert('python_notebooks', {
			title: `Carnet assigné ${suffixe}`,
			content: CONTENU,
			author_id: profId
		});
		assignationId = await insert('python_notebook_assignments', {
			notebook_id: carnetAssigne,
			class_id: classeId,
			shared_by: profId
		});
		autreCarnetProf = await insert('python_notebooks', {
			title: `Autre carnet prof ${suffixe}`,
			content: CONTENU,
			author_id: profId
		});
		// Posé hors API, comme l'état que la règle 1 rend désormais impossible.
		carnetPublicEleve = await insert('python_notebooks', {
			title: `Carnet public élève ${suffixe}`,
			content: CONTENU,
			author_id: eleveId,
			is_public: true
		});
	}, 120_000);

	afterAll(async () => {
		await service
			.from('python_notebook_checkpoint_runs')
			.delete()
			.in('user_id', [eleveId, archiveId]);
		await service.from('python_notebooks').delete().in('author_id', [eleveId, profId]);
		await service.from('srs_deck_assignments').delete().eq('assigned_by', profId);
		await service.from('srs_decks').delete().in('owner_id', [eleveId, archiveId, profId]);
		await cleanupAllTestData();
	});

	// ── Règle 1 : carnet public ───────────────────────────────────────────────

	describe('1. carnet public : prof et admin seulement', () => {
		it('un élève ne crée pas de carnet public', async () => {
			const titre = `Public élève ${crypto.randomUUID()}`;
			const res = await eleve
				.from('python_notebooks')
				.insert({ title: titre, content: CONTENU, author_id: eleveId, is_public: true })
				.select('id');

			refusee(res);
			expect(await compter('python_notebooks', 'title', titre)).toBe(0);
		});

		it('un élève ne rend pas public son carnet', async () => {
			const id = await insert('python_notebooks', {
				title: 'Carnet privé élève',
				content: CONTENU,
				author_id: eleveId
			});

			const res = await eleve
				.from('python_notebooks')
				.update({ is_public: true })
				.eq('id', id)
				.select('id');

			refusee(res);
			expect((await lireCarnet(id)).is_public).toBe(false);
		});

		it('un élève ne crée pas de template', async () => {
			const titre = `Template élève ${crypto.randomUUID()}`;
			const res = await eleve
				.from('python_notebooks')
				.insert({ title: titre, content: CONTENU, author_id: eleveId, is_template: true })
				.select('id');

			refusee(res);
			expect(await compter('python_notebooks', 'title', titre)).toBe(0);
		});

		it('un élève ne passe pas son carnet en template public', async () => {
			const id = await insert('python_notebooks', {
				title: 'Futur faux template',
				content: CONTENU,
				author_id: eleveId
			});

			const res = await eleve
				.from('python_notebooks')
				.update({ is_template: true, is_public: true })
				.eq('id', id)
				.select('id');

			refusee(res);
			const { data } = await service
				.from('python_notebooks')
				.select('is_template, is_public')
				.eq('id', id)
				.single();
			expect(data).toEqual({ is_template: false, is_public: false });
		});

		it('témoin : l’élève crée et modifie toujours un carnet privé', async () => {
			const creation = await eleve
				.from('python_notebooks')
				.insert({ title: 'Mon carnet', content: CONTENU, author_id: eleveId, is_public: false })
				.select('id');
			acceptee(creation);
			const id = (creation.data as { id: string }[])[0].id;

			const maj = await eleve
				.from('python_notebooks')
				.update({ title: 'Mon carnet renommé' })
				.eq('id', id)
				.select('id');
			acceptee(maj);
			expect(await lireCarnet(id)).toEqual({ is_public: false, title: 'Mon carnet renommé' });
		});

		it('témoin : le prof crée un carnet public et rend public un carnet privé', async () => {
			const creation = await prof
				.from('python_notebooks')
				.insert({ title: 'Public prof', content: CONTENU, author_id: profId, is_public: true })
				.select('id');
			acceptee(creation);

			const id = await insert('python_notebooks', {
				title: 'Privé prof',
				content: CONTENU,
				author_id: profId
			});
			acceptee(
				await prof.from('python_notebooks').update({ is_public: true }).eq('id', id).select('id')
			);
			expect((await lireCarnet(id)).is_public).toBe(true);
		});

		it('témoin : le prof crée toujours un template public', async () => {
			acceptee(
				await prof
					.from('python_notebooks')
					.insert({
						title: 'Template prof',
						content: CONTENU,
						author_id: profId,
						is_template: true,
						is_public: true
					})
					.select('id')
			);
		});
	});

	// ── Assignations de carnets : pas de repointage ───────────────────────────

	describe('assignation de carnet : le prof ne la repointe pas vers le carnet d’un autre', () => {
		it('repointer vers le carnet d’un élève est refusé', async () => {
			const res = await prof
				.from('python_notebook_assignments')
				.update({ notebook_id: carnetPublicEleve })
				.eq('id', assignationId)
				.select('id');

			refusee(res);
			const { data } = await service
				.from('python_notebook_assignments')
				.select('notebook_id')
				.eq('id', assignationId)
				.single();
			expect(data?.notebook_id).toBe(carnetAssigne);
		});

		it('témoin : le prof modifie toujours son assignation vers son propre carnet', async () => {
			acceptee(
				await prof
					.from('python_notebook_assignments')
					.update({ notebook_id: autreCarnetProf, readonly: true })
					.eq('id', assignationId)
					.select('id')
			);
			// Remise en état pour les règles 3 et 4.
			acceptee(
				await prof
					.from('python_notebook_assignments')
					.update({ notebook_id: carnetAssigne, readonly: null })
					.eq('id', assignationId)
					.select('id')
			);
		});
	});

	// ── Règle 2 : paquets créés par le serveur ────────────────────────────────

	describe('2. paquet assigné, auto-géré ou copie : le serveur seul', () => {
		const paquet = (ownerId: string, extra: Record<string, unknown>) => ({
			owner_id: ownerId,
			name: `Paquet ${crypto.randomUUID()}`,
			deck_type: 'personal',
			...extra
		});

		it.each([
			['assigné', { is_assigned: true }],
			['auto-géré', { is_auto_managed: true }],
			['copie (source_deck_id)', { source_deck_id: 'SOURCE' }]
		])('un élève ne crée pas de paquet %s', async (_nom, extra) => {
			const source = await insert('srs_decks', paquet(profId, {}));
			const champs = Object.fromEntries(
				Object.entries(extra).map(([k, v]) => [k, v === 'SOURCE' ? source : v])
			);
			const ligne = paquet(eleveId, champs);

			const res = await eleve.from('srs_decks').insert(ligne).select('id');

			refusee(res);
			expect(await compter('srs_decks', 'name', ligne.name)).toBe(0);
		});

		it('le prof ne crée pas non plus de copie assignée avec SON client', async () => {
			const source = await insert('srs_decks', paquet(profId, {}));
			const ligne = paquet(eleveId, { is_assigned: true, source_deck_id: source });

			const res = await prof.from('srs_decks').insert(ligne);

			expect(res.error, 'la copie forgée par le prof est passée').not.toBeNull();
			expect(await compter('srs_decks', 'name', ligne.name)).toBe(0);
		});

		it('un élève ne transforme pas son paquet en copie', async () => {
			const source = await insert('srs_decks', paquet(profId, {}));
			const id = await insert('srs_decks', paquet(eleveId, {}));

			const res = await eleve
				.from('srs_decks')
				.update({ source_deck_id: source })
				.eq('id', id)
				.select('id');

			refusee(res);
			expect((await lirePaquet(id)).source_deck_id).toBeNull();
		});

		it('témoin : l’élève crée et renomme toujours un paquet personnel', async () => {
			const creation = await eleve.from('srs_decks').insert(paquet(eleveId, {})).select('id');
			acceptee(creation);
			const id = (creation.data as { id: string }[])[0].id;

			acceptee(await eleve.from('srs_decks').update({ name: 'Renommé' }).eq('id', id).select('id'));
			expect((await lirePaquet(id)).name).toBe('Renommé');
		});

		it('témoin : le prof crée et renomme toujours son propre paquet', async () => {
			const creation = await prof.from('srs_decks').insert(paquet(profId, {})).select('id');
			acceptee(creation);
			const id = (creation.data as { id: string }[])[0].id;
			acceptee(
				await prof.from('srs_decks').update({ name: 'Deck prof' }).eq('id', id).select('id')
			);
		});

		it('témoin : le serveur crée le paquet Programme d’un nouvel élève', async () => {
			const neuf = await TestData.profile().withRole('student').create();
			const client = await clientFor(neuf.email);

			const id = await ensureProgrammeDeck(client, neuf.id);

			expect(await lirePaquet(id)).toMatchObject({
				is_auto_managed: true,
				is_assigned: false,
				source_deck_id: null
			});
			await service.from('srs_decks').delete().eq('owner_id', neuf.id);
		});

		it('constat (inchangé) : marquer son deck source `is_assigned` était déjà refusé', async () => {
			// assign/+server.ts fait cet UPDATE avec le client du prof et ignore
			// l'erreur. La policy UPDATE n'a qu'un USING, qui sert de WITH CHECK :
			// refusé AVANT cette migration aussi. Documenté, pas corrigé ici.
			const id = await insert('srs_decks', paquet(profId, {}));

			const res = await prof
				.from('srs_decks')
				.update({ is_assigned: true })
				.eq('id', id)
				.select('id');

			refusee(res);
			expect((await lirePaquet(id)).is_assigned).toBe(false);
		});
	});

	// ── Règle 3 : checkpoint runs ─────────────────────────────────────────────

	describe('3. checkpoint runs : carnet assigné seulement', () => {
		it('pas de checkpoint run sur un carnet public non assigné (le sien)', async () => {
			const res = await eleve.rpc('upsert_checkpoint_run', {
				p_notebook_id: carnetPublicEleve,
				p_cell_id: 'cellule-1',
				p_status: 'passed',
				p_error_message: rpcNullable<string>(null)
			});

			expect(res.error, 'le run sur un carnet non assigné est passé').not.toBeNull();
			expect(await runsDe(eleveId, carnetPublicEleve)).toBe(0);
		});

		it('constat : le carnet public d’un PROF était déjà hors d’atteinte', async () => {
			// La sous-requête `pn.is_public` de la policy permissive est évaluée
			// sous la RLS de l'élève, qui ne lit pas ce carnet : refusé avant la
			// migration aussi.
			const res = await eleve.rpc('upsert_checkpoint_run', {
				p_notebook_id: carnetPublic,
				p_cell_id: 'cellule-0',
				p_status: 'passed',
				p_error_message: rpcNullable<string>(null)
			});
			expect(res.error).not.toBeNull();
			expect(await runsDe(eleveId, carnetPublic)).toBe(0);
		});

		it('ni par l’indice (mark_checkpoint_hint_revealed)', async () => {
			const res = await eleve.rpc('mark_checkpoint_hint_revealed', {
				p_notebook_id: carnetPublicEleve,
				p_cell_id: 'cellule-2'
			});

			expect(res.error, 'l’indice sur un carnet non assigné est passé').not.toBeNull();
			expect(await runsDe(eleveId, carnetPublicEleve)).toBe(0);
		});

		it('ni par un INSERT direct', async () => {
			const res = await eleve
				.from('python_notebook_checkpoint_runs')
				.insert({
					notebook_id: carnetPublicEleve,
					user_id: eleveId,
					cell_id: 'cellule-3',
					status: 'passed'
				})
				.select('cell_id');

			refusee(res);
			expect(await runsDe(eleveId, carnetPublicEleve)).toBe(0);
		});

		it('témoin : sur un carnet assigné, le run passe et se met à jour', async () => {
			for (const status of ['failed', 'passed']) {
				const res = await eleve.rpc('upsert_checkpoint_run', {
					p_notebook_id: carnetAssigne,
					p_cell_id: 'cellule-a',
					p_status: status,
					p_error_message: rpcNullable<string>(null)
				});
				expect(res.error?.message ?? null).toBeNull();
			}

			const { data, error } = await service
				.from('python_notebook_checkpoint_runs')
				.select('status, attempt_count')
				.eq('user_id', eleveId)
				.eq('notebook_id', carnetAssigne)
				.eq('cell_id', 'cellule-a')
				.single();
			expect(error).toBeNull();
			expect(data).toEqual({ status: 'passed', attempt_count: 2 });
		});
	});

	// ── Règle 4 : élève retiré de la classe (non-régression) ──────────────────

	describe('4. élève retiré de la classe : ne lit plus le carnet assigné', () => {
		it('l’élève archivé ne lit pas le carnet assigné à la classe', async () => {
			const { data, error } = await archive
				.from('python_notebooks')
				.select('id')
				.eq('id', carnetAssigne);
			expect(error).toBeNull();
			expect(data).toEqual([]);
		});

		it('témoin : l’élève actif le lit', async () => {
			const { data, error } = await eleve
				.from('python_notebooks')
				.select('id')
				.eq('id', carnetAssigne);
			expect(error).toBeNull();
			expect(data).toEqual([{ id: carnetAssigne }]);
		});
	});
});
