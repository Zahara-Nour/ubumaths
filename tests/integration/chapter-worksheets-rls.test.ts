/**
 * Fiches rattachées à un chapitre : rattacher n'est pas distribuer (base locale requise)
 * ======================================================================================
 *
 * `chapter_worksheets` sert la préparation à l'avance : le professeur rattache
 * ses fiches à un chapitre avant le cours, puis les distribue quand il veut.
 *
 * L'invariant qui porte tout le geste est donc NÉGATIF : une fiche rattachée
 * mais pas encore distribuée doit rester invisible à l'élève. Si le lien se
 * voyait, la jonction deviendrait un canal de distribution parallèle et la
 * préparation à l'avance n'existerait plus.
 *
 * C'est pour ça que la policy de l'élève exige `student_has_worksheet_access` en
 * plus du chapitre visible — la même fonction qui garde la fiche elle-même.
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

describe('chapter_worksheets — rattacher n’est pas distribuer', () => {
	let enseignantId: string;
	let classe: string;
	let autreClasse: string;
	let chapitreVisible: string;
	let chapitreMasque: string;

	/** Rattachée ET distribuée : l'élève doit la voir. */
	let ficheDistribuee: string;
	/** Rattachée, PAS distribuée : l'élève ne doit rien voir. */
	let fichePreparee: string;

	let lienDistribue: string;
	let lienPrepare: string;
	let lienMasque: string;

	let eleve: SupabaseClient<Database>;
	let eleveAutreClasse: SupabaseClient<Database>;
	let prof: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		enseignantId = enseignant.id;
		prof = await clientFor(enseignant.email);

		const ecole = await insert('schools', {
			name: 'Lycée chapitres ZZ',
			city: 'Ville ZZ',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année en cours chapitres ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});

		const nouvelleClasse = async (nom: string, code: string) =>
			insert('classes', {
				name: nom,
				school_id: ecole,
				school_year_id: annee,
				join_code: code,
				is_active: true
			});

		classe = await nouvelleClasse('1SPE chapitres ZZ', 'ZZCH01');
		autreClasse = await nouvelleClasse('2DE chapitres ZZ', 'ZZCH02');

		const membre = async (classeId: string) => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classeId, student_id: profil.id, status: 'active' });
			expect(error).toBeNull();
			return { id: profil.id, client: await clientFor(profil.email) };
		};

		const a = await membre(classe);
		eleve = a.client;
		const b = await membre(autreClasse);
		eleveAutreClasse = b.client;

		const chapitre = async (titre: string, visible: boolean) =>
			insert('class_chapters', {
				class_id: classe,
				title: titre,
				display_order: 1,
				is_visible: visible
			});

		chapitreVisible = await chapitre('Chapitre visible ZZ', true);
		chapitreMasque = await chapitre('Chapitre masqué ZZ', false);

		const fiche = async (titre: string) =>
			insert('worksheets', {
				title: titre,
				type: 'worksheet',
				status: 'published',
				created_by: enseignantId
			});

		ficheDistribuee = await fiche('Fiche distribuée ZZ');
		fichePreparee = await fiche('Fiche préparée, non distribuée ZZ');

		// Seule la première est distribuée à la classe.
		const affectation = await insert('worksheet_assignments', {
			worksheet_id: ficheDistribuee,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: enseignantId
		});
		{
			const { error } = await service
				.from('worksheet_assignment_classes')
				.insert({ assignment_id: affectation, class_id: classe });
			expect(error).toBeNull();
		}

		// `published_at` : depuis la publication au fur et à mesure, être
		// distribuée ne suffit plus — la fiche doit aussi avoir été mise à
		// disposition DANS le chapitre. Les deux gardes se cumulent, et c'est ce
		// que ce test continue de vérifier côté « distribuée ».
		lienDistribue = await insert('chapter_worksheets', {
			chapter_id: chapitreVisible,
			worksheet_id: ficheDistribuee,
			display_order: 1,
			published_at: new Date(Date.now() - 3600_000).toISOString()
		});
		// Publiée dans le chapitre, mais JAMAIS distribuée : l'invariant historique
		// de ce fichier. Publier ne remplace pas la distribution.
		lienPrepare = await insert('chapter_worksheets', {
			chapter_id: chapitreVisible,
			worksheet_id: fichePreparee,
			display_order: 2,
			published_at: new Date(Date.now() - 3600_000).toISOString()
		});
		lienMasque = await insert('chapter_worksheets', {
			chapter_id: chapitreMasque,
			worksheet_id: ficheDistribuee,
			display_order: 1,
			published_at: new Date(Date.now() - 3600_000).toISOString()
		});
	});

	afterAll(async () => {
		await service
			.from('schools')
			.delete()
			.eq('id', (await ecoleDuTest()) ?? '');
		await cleanupAllTestData();
	});

	/** L'école est retrouvée par la classe : on ne la mémorise pas deux fois. */
	async function ecoleDuTest(): Promise<string | null> {
		const { data } = await service
			.from('classes')
			.select('school_id')
			.eq('id', classe)
			.maybeSingle();
		return data?.school_id ?? null;
	}

	/** Les liens que la RLS de ce client laisse voir. */
	async function liensVisibles(client: SupabaseClient<Database>): Promise<string[]> {
		const { data, error } = await client.from('chapter_worksheets').select('id');
		expect(error).toBeNull();
		return (data ?? []).map((r) => r.id);
	}

	describe('l’élève de la classe', () => {
		it('voit le lien vers une fiche qui lui a été distribuée', async () => {
			expect(await liensVisibles(eleve)).toContain(lienDistribue);
		});

		it('ne voit PAS le lien vers une fiche seulement préparée', async () => {
			// L'invariant central. S'il tombait, rattacher vaudrait distribuer, et
			// le professeur ne pourrait plus préparer son chapitre à l'avance.
			expect(await liensVisibles(eleve)).not.toContain(lienPrepare);
		});

		it('ne voit rien d’un chapitre masqué, même pour une fiche distribuée', async () => {
			expect(await liensVisibles(eleve)).not.toContain(lienMasque);
		});

		it('n’écrit pas dans la jonction', async () => {
			// Ce serait se distribuer une fiche à soi-même.
			const { error } = await eleve.from('chapter_worksheets').insert({
				chapter_id: chapitreVisible,
				worksheet_id: fichePreparee,
				display_order: 9
			});
			expect(error?.code).toBe('42501');
		});

		it('ne supprime pas un lien', async () => {
			const { error } = await eleve.from('chapter_worksheets').delete().eq('id', lienDistribue);
			expect(error).toBeNull();
			// Une suppression que la RLS refuse ne lève rien : elle ne trouve aucune
			// ligne. C'est la PRÉSENCE du lien qu'il faut donc vérifier.
			const { data } = await service
				.from('chapter_worksheets')
				.select('id')
				.eq('id', lienDistribue)
				.maybeSingle();
			expect(data?.id).toBe(lienDistribue);
		});
	});

	describe('l’élève d’une autre classe', () => {
		it('ne voit aucun lien de ce chapitre', async () => {
			const liens = await liensVisibles(eleveAutreClasse);
			expect(liens).not.toContain(lienDistribue);
			expect(liens).not.toContain(lienPrepare);
		});
	});

	describe('le professeur', () => {
		it('voit tous les liens, distribués ou non', async () => {
			const liens = await liensVisibles(prof);
			expect(liens).toContain(lienDistribue);
			// C'est précisément ce qu'il prépare : il doit le voir, lui.
			expect(liens).toContain(lienPrepare);
			expect(liens).toContain(lienMasque);
		});

		it('rattache et détache une fiche', async () => {
			const { data: cree, error: insertError } = await prof
				.from('chapter_worksheets')
				.insert({ chapter_id: chapitreMasque, worksheet_id: fichePreparee, display_order: 5 })
				.select('id')
				.single();
			expect(insertError).toBeNull();
			expect(cree?.id).toBeTruthy();

			const { error: deleteError } = await prof
				.from('chapter_worksheets')
				.delete()
				.eq('id', cree!.id);
			expect(deleteError).toBeNull();

			const { data: apres } = await service
				.from('chapter_worksheets')
				.select('id')
				.eq('id', cree!.id)
				.maybeSingle();
			expect(apres).toBeNull();
		});
	});

	describe('la contrainte', () => {
		it('refuse de rattacher deux fois la même fiche au même chapitre', async () => {
			const { error } = await service
				.from('chapter_worksheets')
				.insert({ chapter_id: chapitreVisible, worksheet_id: ficheDistribuee, display_order: 7 });
			// 23505 = violation d'unicité.
			expect(error?.code).toBe('23505');
		});

		it('détache la fiche quand le chapitre disparaît', async () => {
			// `on delete cascade` : un chapitre supprimé ne laisse pas de liens
			// orphelins qui pointeraient dans le vide.
			const chapitreJetable = await insert('class_chapters', {
				class_id: classe,
				title: 'Chapitre jetable ZZ',
				display_order: 9,
				is_visible: true
			});
			const lienJetable = await insert('chapter_worksheets', {
				chapter_id: chapitreJetable,
				worksheet_id: ficheDistribuee,
				display_order: 1
			});

			const { error } = await service.from('class_chapters').delete().eq('id', chapitreJetable);
			expect(error).toBeNull();

			const { data } = await service
				.from('chapter_worksheets')
				.select('id')
				.eq('id', lienJetable)
				.maybeSingle();
			expect(data).toBeNull();
		});
	});
});
