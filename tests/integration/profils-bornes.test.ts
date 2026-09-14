/**
 * Qui peut lire le profil de qui (base locale requise)
 * =====================================================
 *
 * `Anyone can view profiles for leaderboard` était en `using (true)` : tout
 * compte connecté lisait les 83 profils de la base, dont les adresses e-mail de
 * 81 élèves MINEURS.
 *
 * ⚠️ Et comme les policies permissives se combinent en OU, ce `true` rendait
 * sans effet les QUATRE policies écrites pour borner cet accès. Elles étaient
 * là, correctes, et inutiles.
 *
 * Ce fichier fixe ce qui reste lisible une fois le `true` retiré. Il vérifie
 * les deux sens — ce qu'on voit ET ce qu'on ne voit plus — parce qu'une policy
 * trop serrée viderait la liste d'amis sans que rien ne le signale.
 *
 * ⚠️ Un smoke-test `auth.uid()` NULL ne prouverait rien : toutes les policies
 * restantes rendent faux sans session, donc tous les cas négatifs passeraient.
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

/** Les profils que ce client arrive à lire parmi ceux qu'on lui désigne. */
async function profilsVusPar(
	client: SupabaseClient<Database>,
	ids: string[]
): Promise<Set<string>> {
	const { data, error } = await client.from('profiles').select('id').in('id', ids);
	expect(error).toBeNull();
	return new Set((data ?? []).map((p) => p.id));
}

describe('qui peut lire le profil de qui', () => {
	let moi: SupabaseClient<Database>;
	let prof: SupabaseClient<Database>;
	let moiId: string;
	let amiId: string;
	let camaradeId: string;
	/** ⚠️ Même classe, adhésion ARCHIVÉE — sans lui, « camarades ACTIFS » ne teste pas « actifs ». */
	let exCamaradeId: string;
	let profId: string;
	let inconnuId: string;
	let demandeurId: string;
	let demandeurEmail: string;
	let tous: string[];

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		profId = enseignant.id;
		prof = await clientFor(enseignant.email);

		const ecole = await insert('schools', {
			name: 'Lycée profils PP',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année profils PP',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE profils PP',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'PPPR01',
			is_active: true
		});

		const eleve = async (statut: 'active' | 'archived' | null) => {
			const profil = await TestData.profile().withRole('student').create();
			if (statut) {
				const { error } = await service.from('class_members').insert({
					class_id: classe,
					student_id: profil.id,
					status: statut
				});
				expect(error).toBeNull();
			}
			return profil;
		};

		const p0 = await eleve('active');
		moiId = p0.id;
		moi = await clientFor(p0.email);

		// Camarade : même classe, ACTIF. Couvert par `are_classmates`.
		camaradeId = (await eleve('active')).id;

		// ⚠️ Ancien camarade : MÊME classe, adhésion ARCHIVÉE. Sans lui, le cas
		// « je vois mes camarades ACTIFS » aurait le mot « actifs » dans son
		// titre et pas dans son décor : un `are_classmates` qui oublierait le
		// filtre de statut passerait au vert. Et 77 adhésions sur 78 sont
		// archivées en production.
		exCamaradeId = (await eleve('archived')).id;

		// Ami : AUCUNE classe en commun — c'est tout l'enjeu de la policy amis.
		amiId = (await eleve(null)).id;
		await insert('friendships', {
			requester_id: moiId,
			addressee_id: amiId,
			status: 'accepted',
			friendship_type: 'friend'
		});

		// Demandeur : amitié en ATTENTE, volontairement non couverte.
		const d = await eleve(null);
		demandeurId = d.id;
		demandeurEmail = d.email;
		await insert('friendships', {
			requester_id: demandeurId,
			addressee_id: moiId,
			status: 'pending',
			friendship_type: 'friend'
		});

		// Inconnu : ni classe, ni amitié, ni tournoi.
		inconnuId = (await eleve(null)).id;

		tous = [moiId, camaradeId, exCamaradeId, amiId, demandeurId, inconnuId];
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('je vois mon propre profil', async () => {
		expect(await profilsVusPar(moi, tous)).toContain(moiId);
	});

	it('je vois mes camarades ACTIFS', async () => {
		expect(await profilsVusPar(moi, tous)).toContain(camaradeId);
	});

	/**
	 * ⚠️ LE cas que la policy « amis » existe pour tenir. Cet ami ne partage
	 * AUCUNE classe : sans elle, retirer le `using (true)` viderait la liste
	 * d'amis — en production, ce serait 112 amitiés sur 112.
	 */
	it('je vois mes AMIS, même sans classe commune', async () => {
		expect(await profilsVusPar(moi, tous)).toContain(amiId);
	});

	/**
	 * ⚠️ LE cas que l'auditeur a réclamé. Sans lui, « je vois mes camarades
	 * ACTIFS » a le mot « actifs » dans son titre et pas dans son décor : un
	 * `are_classmates` qui oublierait `status = 'active'` passerait au vert.
	 * En production, 77 adhésions sur 78 sont archivées.
	 */
	it('je ne vois PLUS un camarade dont l’adhésion est archivée', async () => {
		expect(await profilsVusPar(moi, tous)).not.toContain(exCamaradeId);
	});

	/**
	 * Le sens UNIQUE de la demande en attente. Le destinataire voit qui le
	 * sollicite — sans quoi les 18 demandes vivantes de la production
	 * deviendraient invisibles, et irrattrapables : `unique_friendship` empêche
	 * de renvoyer la demande.
	 */
	it('je vois qui m’envoie une demande d’ami', async () => {
		expect(await profilsVusPar(moi, tous)).toContain(demandeurId);
	});

	it('je ne vois PAS un inconnu', async () => {
		expect(await profilsVusPar(moi, tous)).not.toContain(inconnuId);
	});

	/**
	 * ⚠️ L'AUTRE SENS, et c'est lui qui protège. Le DEMANDEUR ne voit pas le
	 * profil qu'il sollicite : sans ça, envoyer une demande suffirait à lire
	 * n'importe quel profil de son école — exactement le trou que
	 * `20260915480000` vient de fermer côté `friendships`.
	 */
	it('envoyer une demande n’ouvre PAS le profil visé', async () => {
		const demandeur = await clientFor(demandeurEmail);
		expect(await profilsVusPar(demandeur, tous)).not.toContain(moiId);
	});

	/**
	 * ⚠️ La raison d'être de `get_staff_directory()`. Un élève ne lit PAS le
	 * profil de son professeur en direct : celui-ci n'est ni un camarade, ni un
	 * ami, ni un co-participant de tournoi. C'est pour ça que six écrans passent
	 * par le RPC, qui rend le nom et l'avatar sans jamais l'e-mail.
	 *
	 * Si ce cas passait au vert un jour, c'est qu'une policy aurait rouvert les
	 * profils du personnel — et exposé leur e-mail du même geste.
	 */
	it('un élève ne lit PAS le profil du professeur en direct', async () => {
		expect(await profilsVusPar(moi, [...tous, profId])).not.toContain(profId);
	});

	/**
	 * Le témoin côté professeur. `is_my_student` ignore son paramètre et rend
	 * `is_teacher_or_admin()` : le professeur doit garder TOUS les élèves, y
	 * compris ceux qu'aucune classe ne relie à lui.
	 */
	it('le professeur voit tous les profils d’élèves', async () => {
		const vus = await profilsVusPar(prof, tous);
		for (const id of [moiId, camaradeId, exCamaradeId, amiId, demandeurId, inconnuId]) {
			expect(vus, 'le professeur a perdu la vue d’un élève').toContain(id);
		}
	});
});
