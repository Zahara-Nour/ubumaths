/**
 * Publier une fiche la DONNE vraiment (base locale requise)
 * =========================================================
 *
 * Les tests unitaires prouvent qu'on insère `status: 'active'` et un lien vers
 * la classe. Ils ne prouvent pas que l'élève **voit** la fiche : ça dépend de
 * `student_has_worksheet_access`, d'une adhésion active, d'une classe active et
 * de `available_from`. Une seule condition ratée et le professeur croirait avoir
 * distribué.
 *
 * Ce test-là fait donc le chemin complet, avec les droits réels : le professeur
 * publie, l'élève regarde.
 *
 * Il garde aussi la décision de David sur le retrait : **dépublier ne reprend
 * rien**. L'affectation reste, l'élève garde la fiche dans « Mon travail » — on
 * n'interrompt pas un travail en cours.
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
import { setContentPublication } from '$lib/server/chapters-publication';
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

/** Ce que l'élève voit réellement dans le chapitre. */
async function ficheVisiblePar(
	client: SupabaseClient<Database>,
	chapitre: string
): Promise<string[]> {
	const { data, error } = await client
		.from('chapter_worksheets')
		.select('id')
		.eq('chapter_id', chapitre);
	expect(error, 'lecture élève en erreur').toBeNull();
	return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

describe('publier une fiche la distribue', () => {
	let enseignantId: string;
	let classe: string;
	let chapitre: string;
	let lienFiche: string;
	let ficheId: string;

	let eleve: SupabaseClient<Database>;
	let prof: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		enseignantId = enseignant.id;
		prof = await clientFor(enseignant.email);

		const ecole = await insert('schools', {
			name: 'Lycée distribution XX',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année distribution XX',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '1SPE distribution XX',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'XXDI01',
			is_active: true
		});

		const profil = await TestData.profile().withRole('student').create();
		{
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classe, student_id: profil.id, status: 'active' });
			expect(error).toBeNull();
		}
		eleve = await clientFor(profil.email);

		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre distribution XX',
			display_order: 1,
			is_visible: true
		});

		ficheId = await insert('worksheets', {
			title: 'Fiche à distribuer XX',
			type: 'worksheet',
			status: 'published',
			created_by: enseignantId
		});

		// Rattachée, ni publiée ni distribuée : l'état de départ.
		lienFiche = await insert('chapter_worksheets', {
			chapter_id: chapitre,
			worksheet_id: ficheId,
			display_order: 1,
			published_at: null
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('avant publication, l’élève ne voit rien', async () => {
		expect(await ficheVisiblePar(eleve, chapitre)).not.toContain(lienFiche);
	});

	it('publier rend la fiche visible à l’élève, pour de vrai', async () => {
		const { error } = await setContentPublication(
			{
				contentType: 'worksheet',
				itemId: lienFiche,
				published: true,
				teacherId: enseignantId
			},
			prof
		);
		expect(error).toBeNull();

		// Le vrai verdict : la policy élève, avec ses DEUX gardes.
		expect(await ficheVisiblePar(eleve, chapitre)).toContain(lienFiche);

		// Et une affectation active existe bien pour cette classe.
		const { data: affectations } = await service
			.from('worksheet_assignments')
			.select('id, status, worksheet_assignment_classes(class_id)')
			.eq('worksheet_id', ficheId);
		expect(affectations).toHaveLength(1);
		expect(affectations?.[0].status).toBe('active');
	});

	it('republier n’empile pas une seconde affectation', async () => {
		const { error } = await setContentPublication(
			{
				contentType: 'worksheet',
				itemId: lienFiche,
				published: true,
				teacherId: enseignantId
			},
			prof
		);
		expect(error).toBeNull();

		const { data: affectations } = await service
			.from('worksheet_assignments')
			.select('id')
			.eq('worksheet_id', ficheId);
		// Sans idempotence, l'élève verrait la même fiche deux fois dans
		// « Mon travail ».
		expect(affectations).toHaveLength(1);
	});

	it('dépublier retire la fiche du chapitre mais LAISSE l’affectation', async () => {
		const { error } = await setContentPublication(
			{
				contentType: 'worksheet',
				itemId: lienFiche,
				published: false,
				teacherId: enseignantId
			},
			prof
		);
		expect(error).toBeNull();

		// Retirée du cours…
		expect(await ficheVisiblePar(eleve, chapitre)).not.toContain(lienFiche);

		// …mais le travail en cours n'est pas interrompu : l'affectation demeure.
		const { data: affectations } = await service
			.from('worksheet_assignments')
			.select('id, status')
			.eq('worksheet_id', ficheId);
		expect(affectations).toHaveLength(1);
		expect(affectations?.[0].status).toBe('active');
	});
});
