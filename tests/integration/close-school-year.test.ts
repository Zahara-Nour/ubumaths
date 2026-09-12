/**
 * Clôturer une année scolaire (base locale requise)
 * ================================================
 *
 * Phase 2 de la bascule d'année. Le geste que les cinq volets « élève
 * archivé » ont rendu possible, et qui n'existait encore nulle part : rien
 * n'écrivait jamais `class_members.status = 'archived'`.
 *
 * Clôturer une année, c'est :
 *   - fermer toutes ses classes (`is_active = false`) ;
 *   - archiver toutes leurs adhésions ;
 *   - poser l'échéance de purge, pour que la durée de conservation du registre
 *     des traitements ne dépende pas de la mémoire de quelqu'un.
 *
 * Les cinq volets s'activent alors d'eux-mêmes : plus de fiches, d'exercices,
 * de Python, de notifications de classe, ni de salon. Les comptes, eux,
 * demeurent — la conservation est une décision distincte de l'accès.
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

const service = createServiceRoleClient();

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
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

describe('clôture d’une année scolaire', () => {
	let ecole: string;
	let anneeClose: string;
	let anneeVoisine: string;
	let classeA: string;
	let classeB: string;
	let classeVoisine: string;
	let classeDejaFermee: string;
	let eleveDejaArchive: string;
	let eleve: string;
	let eleveVoisin: string;
	let admin: SupabaseClient<Database>;
	let prof: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		prof = await clientFor(enseignant.email);
		const administrateur = await TestData.profile().withRole('admin').create();
		admin = await clientFor(administrateur.email);

		ecole = await insert('schools', {
			name: 'Lycée clôture ZZ',
			city: 'Testville',
			country: 'France'
		});
		anneeClose = await insert('school_years', {
			school_id: ecole,
			name: '2025-2026 clôture ZZ',
			start_date: '2025-09-01',
			end_date: '2026-06-30',
			is_active: false
		});
		anneeVoisine = await insert('school_years', {
			school_id: ecole,
			name: '2026-2027 clôture ZZ',
			start_date: '2026-08-31',
			end_date: '2027-07-15',
			is_active: true
		});

		const creerClasse = async (nom: string, annee: string) => {
			const id = await insert('classes', {
				name: nom,
				join_code: nom
					.replace(/[^A-Z0-9]/gi, '')
					.slice(0, 8)
					.toUpperCase(),
				school_id: ecole,
				school_year_id: annee
			});
			return id;
		};
		classeA = await creerClasse('CloturAZZ', anneeClose);
		classeB = await creerClasse('CloturBZZ', anneeClose);
		classeVoisine = await creerClasse('VoisineZZ', anneeVoisine);
		classeDejaFermee = await creerClasse('DejaFermeeZZ', anneeClose);
		const { error: fermeture } = await service
			.from('classes')
			.update({ is_active: false })
			.eq('id', classeDejaFermee);
		expect(fermeture).toBeNull();

		const p1 = await TestData.profile().withRole('student').create();
		eleve = p1.id;
		const p2 = await TestData.profile().withRole('student').create();
		eleveVoisin = p2.id;
		const p3 = await TestData.profile().withRole('student').create();
		eleveDejaArchive = p3.id;

		const { error } = await service.from('class_members').insert([
			{ class_id: classeA, student_id: eleve, status: 'active' },
			{ class_id: classeB, student_id: eleve, status: 'active' },
			{ class_id: classeVoisine, student_id: eleveVoisin, status: 'active' },
			{ class_id: classeA, student_id: eleveDejaArchive, status: 'archived' }
		]);
		expect(error).toBeNull();
	});

	afterAll(async () => {
		await service.from('schools').delete().eq('id', ecole);
		await cleanupAllTestData();
	});

	async function classeActive(id: string): Promise<boolean> {
		const { data } = await service.from('classes').select('is_active').eq('id', id).single();
		return (data as { is_active: boolean }).is_active;
	}

	async function adhesionsActives(studentId: string): Promise<number> {
		const { data } = await service
			.from('class_members')
			.select('id')
			.eq('student_id', studentId)
			.eq('status', 'active');
		return (data ?? []).length;
	}

	it('un professeur ne peut pas clôturer une année', async () => {
		// Le geste ferme l'accès de toute une promotion : il est réservé à
		// l'administration, comme la désactivation d'une classe.
		const { error } = await prof.rpc(
			'close_school_year' as never,
			{
				p_school_year_id: anneeClose
			} as never
		);

		// Le CODE compte : `PGRST202` signifierait que la fonction n'existe pas, et
		// ce test passerait alors sans rien prouver. On exige le refus d'accès.
		expect(error?.code).toBe('42501');

		// Et rien ne doit avoir bougé.
		expect(await classeActive(classeA)).toBe(true);
		expect(await adhesionsActives(eleve)).toBe(2);
	});

	it('l’administrateur clôture, et le compte rendu dit ce qui a changé', async () => {
		const { data, error } = await admin.rpc(
			'close_school_year' as never,
			{
				p_school_year_id: anneeClose
			} as never
		);
		expect(error).toBeNull();

		const bilan = data as { classes_fermees: number; adhesions_archivees: number };
		expect(bilan.classes_fermees).toBe(2);
		expect(bilan.adhesions_archivees).toBe(2);
	});

	it('les classes de l’année sont fermées', async () => {
		expect(await classeActive(classeA)).toBe(false);
		expect(await classeActive(classeB)).toBe(false);
	});

	it('les adhésions sont archivées — et les cascades suivent', async () => {
		expect(await adhesionsActives(eleve)).toBe(0);

		// `profiles.class_ids` est le champ que l'application lit réellement :
		// c'est la cascade la plus porteuse, et le titre la promettait sans que
		// rien ne la vérifie.
		const { data: profil } = await service
			.from('profiles')
			.select('class_ids')
			.eq('id', eleve)
			.single();
		expect((profil as { class_ids: string[] | null }).class_ids ?? []).toHaveLength(0);

		// Et la sortie du salon de la classe.
		const { data: salon } = await service
			.from('conversations')
			.select('id')
			.eq('class_id', classeA)
			.eq('is_group', true)
			.single();
		const { data: participants } = await service
			.from('conversation_participants')
			.select('id')
			.eq('conversation_id', (salon as { id: string }).id)
			.eq('user_id', eleve);
		expect(participants ?? []).toHaveLength(0);
	});

	it('l’année voisine n’est pas touchée', async () => {
		// Le témoin qui compte : clôturer 2025-2026 ne doit pas fermer la rentrée.
		expect(await classeActive(classeVoisine)).toBe(true);
		expect(await adhesionsActives(eleveVoisin)).toBe(1);
	});

	it('l’échéance de conservation est DÉRIVÉE, pas posée par le geste', async () => {
		// Une échéance qu'un bouton pose et qu'une réouverture efface n'en est pas
		// une : elle vaut pour toutes les années, clôturées ou non.
		const { data } = await service
			.from('school_years')
			.select('purge_after')
			.in('id', [anneeClose, anneeVoisine]);
		const par = new Map(
			(data as { id?: string; purge_after: string }[]).map((r, i) => [i, r.purge_after])
		);
		expect(par.size).toBe(2);
		for (const [, echeance] of par) {
			expect(echeance).not.toBeNull();
		}
	});

	it('clôturer une année DÉJÀ close est refusé', async () => {
		// Refus explicite plutôt qu'idempotence silencieuse : une seconde clôture
		// écraserait la trace de la première, et c'est cette trace qui rend la
		// réouverture exacte.
		const { error } = await admin.rpc(
			'close_school_year' as never,
			{
				p_school_year_id: anneeClose
			} as never
		);
		expect(error?.code).toBe('22023');
	});

	it('rouvrir ne touche PAS ce qui était déjà fermé avant', async () => {
		// Le cas prouvé sur les données réelles : les six classes de Voltaire
		// étaient DÉJÀ inactives avant toute clôture. Une réouverture qui viserait
		// « toutes les classes inactives de l'année » en rouvrirait six que
		// personne n'avait fermées, écrasant des décisions prises une par une.
		await admin.rpc('reopen_school_year' as never, { p_school_year_id: anneeClose } as never);

		expect(await classeActive(classeDejaFermee)).toBe(false);
		expect(await adhesionsActives(eleveDejaArchive)).toBe(0);

		// On referme pour le test suivant.
		await admin.rpc('close_school_year' as never, { p_school_year_id: anneeClose } as never);
	});

	it('un professeur ne peut pas ROUVRIR une année', async () => {
		// C'est la réouverture qui REND l'accès à toute une promotion : elle
		// mérite le même garde-fou que la clôture, et le même test.
		const { error } = await prof.rpc(
			'reopen_school_year' as never,
			{
				p_school_year_id: anneeClose
			} as never
		);
		expect(error?.code).toBe('42501');
		expect(await adhesionsActives(eleve)).toBe(0);
	});

	it('rouvrir une année jamais clôturée est refusé', async () => {
		const { error } = await admin.rpc(
			'reopen_school_year' as never,
			{
				p_school_year_id: anneeVoisine
			} as never
		);
		expect(error?.code).toBe('22023');
	});

	it('rouvrir l’année remet tout en place', async () => {
		// Réversible : c'est ce qui distingue une clôture d'une suppression.
		const { error } = await admin.rpc(
			'reopen_school_year' as never,
			{
				p_school_year_id: anneeClose
			} as never
		);
		expect(error).toBeNull();

		expect(await classeActive(classeA)).toBe(true);
		expect(await adhesionsActives(eleve)).toBe(2);

		// L'échéance de conservation, elle, ne se rétracte pas.
		const { data } = await service
			.from('school_years')
			.select('purge_after')
			.eq('id', anneeClose)
			.single();
		expect((data as { purge_after: string | null }).purge_after).toBe('2031-06-30');
	});
});
