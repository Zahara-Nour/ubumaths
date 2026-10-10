/**
 * RPC lot 2 : maintenance et actions réservées au prof (base locale requise)
 * =========================================================================
 *
 * Migration `20261003180000_rpc_lot2_maintenance_prof.sql`. Des fonctions
 * SECURITY DEFINER de maintenance (nettoyages, tâches planifiées, journal des
 * tâches, compteur du tuteur) et des actions de prof (énigme du jour,
 * duplication d'un modèle de message) étaient exécutables par tout compte
 * connecté, sans contrôle d'appelant : un élève vidait `audit_logs` avec
 * `cleanup_old_audit_logs(-1)`.
 *
 * Décision de David (Q143) : un élève ne lance plus aucune tâche de
 * maintenance et ne fait plus d'action réservée au prof ; prof et admin gardent
 * ce que leurs écrans font. Le serveur (client service, pg_cron) garde tout.
 *
 * Chaque refus est accompagné d'un TÉMOIN : l'usage légitime doit continuer de
 * marcher, sinon un garde trop large passerait pour une réussite.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { present } from '../helpers/present';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

/** Code Postgres d'un refus (garde `RAISE … 42501` ou EXECUTE retiré). */
const REFUS = '42501';

/** Dates lointaines : aucune collision avec une énigme du jour réelle. */
const DATE_ELEVE = '2099-03-01';
const DATE_PROF = '2099-03-02';
const DATE_SERVICE = '2099-03-03';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

/** Appel RPC non typé : la liste parcourt des signatures variées. */
async function rpc(
	client: SupabaseClient<Database>,
	name: string,
	args: Record<string, unknown> = {}
): Promise<RpcResult> {
	return (await client.rpc(name as never, args as never)) as unknown as RpcResult;
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
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

async function count(table: string, column: string, value: string): Promise<number> {
	const { count: n, error } = await service
		.from(table as never)
		.select('id', { count: 'exact', head: true })
		.eq(column as never, value as never);
	if (error) throw new Error(`${table}: ${error.message}`);
	return n ?? 0;
}

/** Tâches de maintenance retirées à `authenticated` (service_role seul). */
const MAINTENANCE: [string, Record<string, unknown>][] = [
	['cleanup_old_audit_logs', { retention_days: -1 }],
	['cleanup_old_errors', { p_days_old: -1 }],
	['delete_all_resolved_errors', {}],
	['run_cleanup_all', {}],
	['run_cleanup_expired_data', {}],
	['run_flag_stale_python_rechecks', {}],
	['run_recalculate_minesweeper_ref_times', {}],
	['run_weekly_best_bonuses', {}],
	['cleanup_abandoned_minesweeper_games', {}],
	['cleanup_account_deletion_audit', {}],
	['cleanup_expired_cache', {}],
	['cleanup_old_job_runs', {}],
	['cleanup_stale_presence', {}],
	['cleanup_stale_queue_entries', {}],
	['cleanup_stale_trades', {}],
	['cleanup_stuck_job_runs', {}],
	['auto_activate_scheduled_tournaments', {}],
	['auto_complete_ended_tournaments', {}],
	['auto_expire_listings', {}],
	['recalculate_minesweeper_reference_times', {}],
	['refresh_achievement_stats', {}],
	[
		'refresh_achievement_stats_if_needed',
		{ p_force: true, p_max_staleness_minutes: 0, p_max_changes: 0 }
	],
	['start_job_run', { p_job_name: 'rpc-lot2-eleve', p_metadata: {} }],
	[
		'complete_job_run',
		{
			p_run_id: '00000000-0000-4000-8000-000000000000',
			p_status: 'success',
			p_error_message: null,
			p_metadata: {}
		}
	],
	[
		'increment_rate_limit',
		{ p_key: 'rpc-lot2:eleve', p_expires_at: new Date(Date.now() + 60_000).toISOString() }
	],
	[
		'update_student_competence_level',
		{
			p_student_id: '00000000-0000-4000-8000-000000000000',
			p_math_competence_id: '00000000-0000-4000-8000-000000000000'
		}
	]
];

describe('RPC lot 2 : maintenance et actions réservées au prof', () => {
	let prof: SupabaseClient<Database>;
	let eleve: SupabaseClient<Database>;
	let profId: string;
	let eleveId: string;
	let autreId: string;
	let enigme: string;
	let modele: string;
	let auditAncien: string;
	let classe: string;
	let modeleDeClasse: string;
	const modelesCrees: string[] = [];
	const jobRuns: string[] = [];

	beforeAll(async () => {
		await cleanupAllTestData();

		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;
		autreId = (await TestData.profile().withRole('admin').create()).id;
		const e = await TestData.profile().withRole('student').create();
		eleveId = e.id;

		enigme = await insert('riddles', {
			title: 'Énigme RPC lot 2',
			statement: 'Énoncé',
			correction: 'Correction',
			difficulty: 1,
			created_by: profId,
			status: 'published'
		});

		modele = await insert('message_templates', {
			title: 'Modèle RPC lot 2',
			subject_template: 'Sujet',
			body_template: 'Corps',
			trigger_type: 'general',
			scope: 'system',
			created_by: profId
		});
		modelesCrees.push(modele);

		classe = await insert('classes', {
			name: 'Classe RPC lot 2',
			join_code: `L2${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
			grade: '2'
		});
		modeleDeClasse = await insert('message_templates', {
			title: 'Modèle de classe RPC lot 2',
			subject_template: 'Sujet',
			body_template: 'Corps',
			trigger_type: 'general',
			scope: 'class',
			class_id: classe,
			created_by: profId
		});
		modelesCrees.push(modeleDeClasse);

		// Une ligne d'audit ancienne : cleanup_old_audit_logs(-1) l'effacerait.
		auditAncien = await insert('audit_logs', {
			action: 'DELETE',
			table_name: 'rpc_lot2',
			created_at: '2000-01-01T00:00:00Z'
		});

		prof = await clientFor(p.email);
		eleve = await clientFor(e.email);
	});

	afterAll(async () => {
		await service
			.from('riddle_of_the_day')
			.delete()
			.in('date', [DATE_ELEVE, DATE_PROF, DATE_SERVICE]);
		await service.from('riddles').delete().eq('id', enigme);
		await service.from('message_templates').delete().in('id', modelesCrees);
		await service
			.from('template_audit_log')
			.delete()
			.in('performed_by', [profId, eleveId, autreId]);
		await service.from('user_favorite_templates').delete().eq('user_id', eleveId);
		await service.from('classes').delete().eq('id', classe);
		await service.from('audit_logs').delete().eq('id', auditAncien);
		if (jobRuns.length) await service.from('background_job_runs').delete().in('id', jobRuns);
		await service.from('rate_limits').delete().like('key', 'rpc-lot2:%');
		await cleanupAllTestData();
	});

	describe('tâches de maintenance : refusées à un élève', () => {
		it.each(MAINTENANCE)('%s — refus', async (name, args) => {
			const { error } = await rpc(eleve, name, args);
			expect(error?.code).toBe(REFUS);
		});

		it("cleanup_old_audit_logs(-1) n'a pas vidé audit_logs", async () => {
			await rpc(eleve, 'cleanup_old_audit_logs', { retention_days: -1 });
			expect(await count('audit_logs', 'id', auditAncien)).toBe(1);
		});

		it("increment_rate_limit n'a rien écrit", async () => {
			await rpc(eleve, 'increment_rate_limit', {
				p_key: 'rpc-lot2:eleve',
				p_expires_at: new Date(Date.now() + 60_000).toISOString()
			});
			expect(await count('rate_limits', 'key', 'rpc-lot2:eleve')).toBe(0);
		});

		it('témoin : le serveur (client service) les exécute toujours', async () => {
			const start = await rpc(service, 'start_job_run', {
				p_job_name: 'rpc-lot2-service',
				p_metadata: {}
			});
			expect(start.error).toBeNull();
			jobRuns.push(start.data as string);

			const done = await rpc(service, 'complete_job_run', {
				p_run_id: start.data,
				p_status: 'success',
				p_error_message: null,
				p_metadata: {}
			});
			expect(done.error).toBeNull();

			expect((await rpc(service, 'auto_activate_scheduled_tournaments')).error).toBeNull();
			expect((await rpc(service, 'auto_complete_ended_tournaments')).error).toBeNull();
			expect((await rpc(service, 'cleanup_old_errors', { p_days_old: 36500 })).error).toBeNull();

			const inc = await rpc(service, 'increment_rate_limit', {
				p_key: 'rpc-lot2:service',
				p_expires_at: new Date(Date.now() + 60_000).toISOString()
			});
			expect(inc.error).toBeNull();
			expect(inc.data).toBe(1);
		});
	});

	describe('auto_expire_listings : corps réparé', () => {
		// Décor : une annonce ÉCHUE et une annonce EN COURS, chacune avec une
		// proposition en attente ; chaque annonce et chaque proposition porte un
		// verrou sous son propre id (convention 20261003165000).
		let ecole: string;
		let echue: string;
		let enCours: string;
		let propEchue: string;
		let propEnCours: string;
		let retour: RpcResult;

		const verrou = (student: string, entite: string) =>
			insert('marketplace_locked_cards', {
				student_id: student,
				card_instance_id: crypto.randomUUID(),
				locked_for: 'listing',
				locked_entity_id: entite
			});

		const statut = async (table: 'marketplace_listings' | 'marketplace_proposals', id: string) => {
			const { data, error } = await service.from(table).select('status').eq('id', id).single();
			expect(error).toBeNull();
			return present(data, `${table} ${id}`).status;
		};

		beforeAll(async () => {
			const vendeur = (await TestData.profile().withRole('student').create()).id;
			const acheteur = (await TestData.profile().withRole('student').create()).id;
			ecole = await insert('schools', {
				name: 'Lycée RPC lot 2',
				city: 'Testville',
				country: 'France'
			});
			const annonce = () =>
				insert('marketplace_listings', {
					creator_id: vendeur,
					school_id: ecole,
					listing_type: 'sell',
					offered_gidouilles: 5,
					wanted_gidouilles: 1,
					expires_at: new Date(Date.now() + 86_400_000).toISOString()
				});
			echue = await annonce();
			enCours = await annonce();
			const proposition = (listing: string) =>
				insert('marketplace_proposals', {
					listing_id: listing,
					proposer_id: acheteur,
					offered_gidouilles: 2
				});
			propEchue = await proposition(echue);
			propEnCours = await proposition(enCours);
			for (const [student, entite] of [
				[vendeur, echue],
				[vendeur, enCours],
				[acheteur, propEchue],
				[acheteur, propEnCours]
			]) {
				await verrou(student, entite);
			}

			// Le trigger d'insertion fixe l'échéance : on recule celle de l'annonce échue.
			const { error: backError } = await service
				.from('marketplace_listings')
				.update({ expires_at: '2000-01-01T00:00:00Z' })
				.eq('id', echue);
			expect(backError).toBeNull();

			retour = await rpc(service, 'auto_expire_listings');
		});

		afterAll(async () => {
			const entites = [echue, enCours, propEchue, propEnCours];
			await service.from('marketplace_locked_cards').delete().in('locked_entity_id', entites);
			await service.from('marketplace_proposals').delete().in('id', [propEchue, propEnCours]);
			await service.from('marketplace_listings').delete().in('id', [echue, enCours]);
			await service.from('schools').delete().eq('id', ecole);
		});

		it("s'exécute sans erreur et compte l'annonce échue", () => {
			expect(retour.error).toBeNull();
			expect(retour.data).toBeGreaterThanOrEqual(1);
		});

		it("l'annonce échue expire et ses verrous sont levés", async () => {
			expect(await statut('marketplace_listings', echue)).toBe('expired');
			expect(await count('marketplace_locked_cards', 'locked_entity_id', echue)).toBe(0);
		});

		it('la proposition rejetée par l’expiration voit ses verrous levés', async () => {
			const { data: pr } = await service
				.from('marketplace_proposals')
				.select('status, response_message')
				.eq('id', propEchue)
				.single();
			expect(pr).toEqual({ status: 'rejected', response_message: 'Listing expired' });
			expect(await count('marketplace_locked_cards', 'locked_entity_id', propEchue)).toBe(0);
		});

		it('témoin négatif : annonce en cours et sa proposition intactes, verrous compris', async () => {
			expect(await statut('marketplace_listings', enCours)).toBe('active');
			expect(await statut('marketplace_proposals', propEnCours)).toBe('pending');
			expect(await count('marketplace_locked_cards', 'locked_entity_id', enCours)).toBe(1);
			expect(await count('marketplace_locked_cards', 'locked_entity_id', propEnCours)).toBe(1);
		});
	});

	describe('set_riddle_of_the_day : réservé au prof (et au serveur)', () => {
		it("un élève est refusé et rien n'est écrit", async () => {
			const { error } = await rpc(eleve, 'set_riddle_of_the_day', {
				p_riddle_id: enigme,
				p_date: DATE_ELEVE,
				p_selected_by: eleveId
			});
			expect(error?.code).toBe(REFUS);
			expect(await count('riddle_of_the_day', 'date', DATE_ELEVE)).toBe(0);
		});

		it("témoin : le prof la choisit, et selected_by est le prof même s'il en nomme un autre", async () => {
			const { error } = await rpc(prof, 'set_riddle_of_the_day', {
				p_riddle_id: enigme,
				p_date: DATE_PROF,
				p_selected_by: autreId
			});
			expect(error).toBeNull();
			const { data } = await service
				.from('riddle_of_the_day')
				.select('riddle_id, selected_by')
				.eq('date', DATE_PROF)
				.single();
			expect(data).toEqual({ riddle_id: enigme, selected_by: profId });
		});

		it('témoin : le serveur la choisit au nom de p_selected_by', async () => {
			const { error } = await rpc(service, 'set_riddle_of_the_day', {
				p_riddle_id: enigme,
				p_date: DATE_SERVICE,
				p_selected_by: profId
			});
			expect(error).toBeNull();
			const { data } = await service
				.from('riddle_of_the_day')
				.select('selected_by')
				.eq('date', DATE_SERVICE)
				.single();
			expect(data?.selected_by).toBe(profId);
		});
	});

	describe('duplicate_template : prof, en son propre nom', () => {
		const titres = async (titre: string) => {
			const { data, error } = await service
				.from('message_templates')
				.select('id, created_by')
				.eq('title', titre);
			expect(error).toBeNull();
			for (const r of data ?? []) if (!modelesCrees.includes(r.id)) modelesCrees.push(r.id);
			return data ?? [];
		};

		it("un élève est refusé et aucun modèle n'est créé", async () => {
			const { error } = await rpc(eleve, 'duplicate_template', {
				p_template_id: modele,
				p_user_id: eleveId,
				p_new_title: 'RPC lot 2 copie élève'
			});
			expect(error?.code).toBe(REFUS);
			expect(await titres('RPC lot 2 copie élève')).toHaveLength(0);
		});

		it("un prof ne duplique pas au nom d'un autre", async () => {
			const { error } = await rpc(prof, 'duplicate_template', {
				p_template_id: modele,
				p_user_id: autreId,
				p_new_title: 'RPC lot 2 copie forgée'
			});
			expect(error?.code).toBe(REFUS);
			expect(await titres('RPC lot 2 copie forgée')).toHaveLength(0);
		});

		// Depuis 20261003220000 (Q154), la copie est un modèle personnel (scope
		// 'class', sans classe) : l'appel aboutit. Détail : succes-gidouilles.test.ts.
		it('témoin : le prof en son nom passe la garde et obtient sa copie', async () => {
			const { data, error } = await rpc(prof, 'duplicate_template', {
				p_template_id: modele,
				p_user_id: profId,
				p_new_title: 'RPC lot 2 copie prof'
			});
			expect(error).toBeNull();
			modelesCrees.push(data as string);
			const copies = await titres('RPC lot 2 copie prof');
			expect(copies.find((c) => c.id === data)?.created_by).toBe(profId);
		});
	});

	describe('log_template_action : un élève ne journalise que ses favoris', () => {
		it('un élève ne journalise pas une approbation', async () => {
			const { error } = await rpc(eleve, 'log_template_action', {
				p_template_id: modele,
				p_action: 'approved',
				p_performed_by: eleveId
			});
			expect(error?.code).toBe(REFUS);
		});

		it("un élève ne journalise pas un favori au nom d'un autre", async () => {
			const { error } = await rpc(eleve, 'log_template_action', {
				p_template_id: modele,
				p_action: 'favorited',
				p_performed_by: profId
			});
			expect(error?.code).toBe(REFUS);
		});

		it("un élève ne journalise pas un favori qu'il n'a pas", async () => {
			const { error } = await rpc(eleve, 'log_template_action', {
				p_template_id: modele,
				p_action: 'favorited',
				p_performed_by: eleveId
			});
			expect(error?.code).toBe(REFUS);
		});

		// Témoin : la séquence exacte de la route des favoris (POST : insère puis
		// journalise ; DELETE : supprime puis journalise), avec le client élève.
		it('témoin : la route des favoris — ajout puis journal', async () => {
			const { data, error } = await eleve
				.from('user_favorite_templates')
				.insert({ user_id: eleveId, template_id: modele })
				.select('template_id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);

			const log = await rpc(eleve, 'log_template_action', {
				p_template_id: modele,
				p_action: 'favorited',
				p_performed_by: eleveId
			});
			expect(log.error).toBeNull();
		});

		it('un élève ne glisse pas de métadonnées, même sur son vrai favori', async () => {
			const { error } = await rpc(eleve, 'log_template_action', {
				p_template_id: modele,
				p_action: 'favorited',
				p_performed_by: eleveId,
				p_metadata: { notes: 'forgé' }
			});
			expect(error?.code).toBe(REFUS);
		});

		it('un élève ne journalise pas un retrait tant que le favori existe', async () => {
			const { error } = await rpc(eleve, 'log_template_action', {
				p_template_id: modele,
				p_action: 'unfavorited',
				p_performed_by: eleveId
			});
			expect(error?.code).toBe(REFUS);
		});

		it('témoin : la route des favoris — retrait puis journal', async () => {
			const { data, error } = await eleve
				.from('user_favorite_templates')
				.delete()
				.eq('user_id', eleveId)
				.eq('template_id', modele)
				.select('template_id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);

			const log = await rpc(eleve, 'log_template_action', {
				p_template_id: modele,
				p_action: 'unfavorited',
				p_performed_by: eleveId
			});
			expect(log.error).toBeNull();
		});

		it('témoin : le prof modifie son modèle (trigger INVOKER qui journalise)', async () => {
			const { data, error } = await prof
				.from('message_templates')
				.update({ description: 'modifié par le prof' })
				.eq('id', modeleDeClasse)
				.select('id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			// Le trigger a bien journalisé la modification.
			const { count: n } = await service
				.from('template_audit_log')
				.select('id', { count: 'exact', head: true })
				.eq('template_id', modeleDeClasse)
				.eq('action', 'updated');
			expect(n).toBe(1);
		});
	});
});
