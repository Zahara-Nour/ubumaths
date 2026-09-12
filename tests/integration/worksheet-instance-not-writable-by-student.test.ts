/**
 * L'élève ne réécrit pas son instance de fiche (base locale requise)
 * ==================================================================
 *
 * `worksheet_instances.instance_data` porte le contenu RÉSOLU de la fiche, et
 * les deux routes de génération de PDF le lisent. La policy UPDATE accorde le
 * droit sur le seul `student_id = auth.uid()`, sans vérifier l'affectation : à
 * la lire, un élève pourrait réécrire ce que son PDF imprimé contiendrait.
 *
 * Il ne peut pas, et ce n'est pas la policy qui l'en empêche : c'est le trigger
 * `prevent_worksheet_instance_tampering`, qui refuse toute modification de
 * `instance_data`, `variant_seed`, `worksheet_id` et `student_id` par qui n'est
 * ni propriétaire de la fiche ni admin. Il ne laisse passer que les champs de
 * progression.
 *
 * CE TRIGGER N'AVAIT AUCUN TEST. C'est tout l'objet de ce fichier. La garantie
 * d'intégrité du PDF ne tient qu'à lui, et un `create or replace` distrait la
 * ferait disparaître en silence — le dépôt a déjà payé ce piège une fois, sur
 * un `stable` perdu.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

/** Client de service : ensemencement et constats, jamais un appel testé. */
const service = createServiceRoleClient();

const CONTENU_ORIGINE = { exercises: [{ statement: 'énoncé d’origine ZZ' }] };
const CONTENU_FALSIFIE = { exercises: [{ statement: 'énoncé réécrit par l’élève ZZ' }] };

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

/** Le contenu réellement stocké, tel que la base le voit. */
async function contenuStocke(instanceId: string): Promise<unknown> {
	const { data, error } = await service
		.from('worksheet_instances')
		.select('instance_data')
		.eq('id', instanceId)
		.single();
	expect(error).toBeNull();
	return data?.instance_data;
}

describe('instance de fiche : l’élève lit, il n’écrit pas', () => {
	let enseignantId: string;
	let ficheId: string;
	let instanceId: string;
	let eleveId: string;
	let eleve: SupabaseClient<Database>;
	let proprietaire: SupabaseClient<Database>;
	let admin: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const prof = await TestData.profile().withRole('teacher').create();
		enseignantId = prof.id;
		proprietaire = await clientFor(prof.email);

		const compteAdmin = await TestData.profile().withRole('admin').create();
		admin = await clientFor(compteAdmin.email);

		const profil = await TestData.profile().withRole('student').create();
		eleveId = profil.id;
		eleve = await clientFor(profil.email);

		ficheId = await insert('worksheets', {
			title: 'Fiche à instance ZZ',
			type: 'worksheet',
			status: 'published',
			created_by: enseignantId
		});

		instanceId = await insert('worksheet_instances', {
			worksheet_id: ficheId,
			student_id: eleveId,
			instance_data: CONTENU_ORIGINE,
			variant_seed: 42,
			status: 'generated'
		});
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/** Tente la réécriture et rend ce que la base a réellement gardé. */
	async function tenteReecriture(client: SupabaseClient<Database>) {
		const { error } = await client
			.from('worksheet_instances')
			.update({ instance_data: CONTENU_FALSIFIE })
			.eq('id', instanceId);
		return { error, contenu: await contenuStocke(instanceId) };
	}

	// Un second compte `teacher` est refusé par l'invariant mono-professeur de la
	// base : « un enseignant qui n'a pas créé la fiche » n'est pas un état
	// atteignable, et il n'y a donc rien à tester de ce côté.
	describe('ce qui est fermé', () => {
		it('l’élève ne réécrit pas le contenu de sa propre instance', async () => {
			// On vérifie le CONTENU, pas seulement l'erreur : une policy qui ne
			// matche pas ne lève rien du tout, elle ne trouve aucune ligne. Un test
			// sur `error` seul resterait vert alors que la ligne aurait changé.
			const { error, contenu } = await tenteReecriture(eleve);
			// Ici c'est un trigger, donc il y a bien une exception — et son message
			// dit précisément ce qui a été refusé.
			expect(error?.message).toContain('Cannot modify instance_data');
			expect(contenu).toEqual(CONTENU_ORIGINE);
		});

		it('ni la graine de variante, qui détermine ses énoncés', async () => {
			const { error } = await eleve
				.from('worksheet_instances')
				.update({ variant_seed: 99 })
				.eq('id', instanceId);
			expect(error?.message).toContain('Cannot modify variant_seed');

			const { data } = await service
				.from('worksheet_instances')
				.select('variant_seed')
				.eq('id', instanceId)
				.single();
			expect(data?.variant_seed).toBe(42);
		});

		it('ni l’élève à qui l’instance appartient', async () => {
			const { error } = await eleve
				.from('worksheet_instances')
				.update({ student_id: enseignantId })
				.eq('id', instanceId);
			expect(error?.message).toContain('Cannot modify student_id');
		});
	});

	describe('ce qui reste ouvert', () => {
		it('l’élève lit toujours sa propre instance', async () => {
			// La policy SELECT n'est pas touchée. Si elle l'avait été, la fiche de
			// l'élève s'afficherait vide — et rien dans le reste de la suite ne
			// l'aurait signalé.
			const { data, error } = await eleve
				.from('worksheet_instances')
				.select('id, instance_data')
				.eq('id', instanceId);
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(data?.[0].instance_data).toEqual(CONTENU_ORIGINE);
		});

		it('le professeur propriétaire de la fiche réécrit toujours', async () => {
			const { error } = await proprietaire
				.from('worksheet_instances')
				.update({ instance_data: CONTENU_FALSIFIE })
				.eq('id', instanceId);
			expect(error).toBeNull();
			expect(await contenuStocke(instanceId)).toEqual(CONTENU_FALSIFIE);

			// On remet en place par le propriétaire, pas par le client de service :
			// le trigger est SECURITY DEFINER et lit `auth.uid()`, qui est NUL pour
			// `service_role` — il le traite donc comme un tiers et le bloque aussi.
			// Surprenant, mais cohérent : personne ne réécrit `instance_data` sans
			// être identifié comme le professeur.
			const { error: resetError } = await proprietaire
				.from('worksheet_instances')
				.update({ instance_data: CONTENU_ORIGINE })
				.eq('id', instanceId);
			expect(resetError).toBeNull();
		});

		it('l’élève met à jour ses champs de progression', async () => {
			// Le trigger les laisse passer explicitement. Rien dans l'application
			// ne les écrit aujourd'hui, et rien ne les lit : ce test documente le
			// contrat, il ne réclame pas une fonctionnalité.
			const { error } = await eleve
				.from('worksheet_instances')
				.update({ status: 'in_progress' })
				.eq('id', instanceId);
			expect(error).toBeNull();
		});

		it('l’admin réécrit toujours', async () => {
			const { error } = await admin
				.from('worksheet_instances')
				.update({ instance_data: CONTENU_FALSIFIE })
				.eq('id', instanceId);
			expect(error).toBeNull();
			expect(await contenuStocke(instanceId)).toEqual(CONTENU_FALSIFIE);
		});
	});
});
