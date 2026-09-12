/**
 * admin_compose_class — composer une classe, école comprise (base locale requise)
 * ================================================================================
 *
 * Le geste inscrit des élèves dans une classe et, si cette classe appartient à
 * une autre école, y déplace leur profil. Les deux DOIVENT tenir ensemble :
 * un élève inscrit dans une classe de l'école B mais rattaché à l'école A
 * verrait ses fiches (elles suivent la classe) mais le calendrier, les
 * trimestres et le marché de A — trois policies lisent `profiles.school_id`.
 *
 * C'est pour cette seule raison que le geste est une fonction Postgres et non
 * deux écritures côté client : la transaction est celle de Postgres.
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

/** L'école du profil, telle que la base la voit après coup. */
async function ecoleDuProfil(id: string): Promise<string | null> {
	const { data, error } = await service.from('profiles').select('school_id').eq('id', id).single();
	expect(error).toBeNull();
	return data?.school_id ?? null;
}

async function adhesion(classeId: string, eleveId: string) {
	const { data, error } = await service
		.from('class_members')
		.select('status')
		.eq('class_id', classeId)
		.eq('student_id', eleveId)
		.maybeSingle();
	expect(error).toBeNull();
	return data?.status ?? null;
}

describe('admin_compose_class', () => {
	let ancienneEcole: string;
	let nouvelleEcole: string;
	let classeCible: string;
	let classeArchivee: string;
	let classeAnneeFinie: string;
	let admin: SupabaseClient<Database>;
	let prof: SupabaseClient<Database>;
	let profId: string;

	async function nouvelEleve(ecole: string): Promise<string> {
		const profil = await TestData.profile().withRole('student').create();
		const { error } = await service
			.from('profiles')
			.update({ school_id: ecole })
			.eq('id', profil.id);
		expect(error).toBeNull();
		return profil.id;
	}

	beforeAll(async () => {
		await cleanupAllTestData();

		const compteAdmin = await TestData.profile().withRole('admin').create();
		admin = await clientFor(compteAdmin.email);

		const compteProf = await TestData.profile().withRole('teacher').create();
		profId = compteProf.id;
		prof = await clientFor(compteProf.email);

		const ecole = (nom: string) => ({ name: nom, city: 'Ville ZZ', country: 'France' });
		ancienneEcole = await insert('schools', ecole('Lycée quitté ZZ'));
		nouvelleEcole = await insert('schools', ecole('Cours particuliers ZZ'));

		const anneeOuverte = await insert('school_years', {
			school_id: nouvelleEcole,
			name: '2026-2027 compose ZZ',
			start_date: '2026-08-31',
			end_date: '2099-07-15',
			is_active: true
		});
		const anneeFinie = await insert('school_years', {
			school_id: nouvelleEcole,
			name: '2024-2025 compose ZZ',
			start_date: '2024-09-01',
			end_date: '2025-06-30',
			is_active: false
		});

		classeCible = await insert('classes', {
			name: 'Groupe particulier ZZ',
			school_id: nouvelleEcole,
			school_year_id: anneeOuverte,
			join_code: 'ZZC001',
			is_active: true
		});
		classeArchivee = await insert('classes', {
			name: 'Groupe archivé ZZ',
			school_id: nouvelleEcole,
			school_year_id: anneeOuverte,
			join_code: 'ZZC002',
			is_active: false
		});
		classeAnneeFinie = await insert('classes', {
			name: 'Groupe année finie ZZ',
			school_id: nouvelleEcole,
			school_year_id: anneeFinie,
			join_code: 'ZZC003',
			is_active: true
		});
	});

	afterAll(async () => {
		await service.from('schools').delete().in('id', [ancienneEcole, nouvelleEcole]);
		await cleanupAllTestData();
	});

	async function composer(client: SupabaseClient<Database>, classeId: string, eleves: string[]) {
		return client.rpc('admin_compose_class', {
			p_class_id: classeId,
			p_student_ids: eleves
		});
	}

	describe('le cas qui motive la fonction : franchir l’école', () => {
		it('inscrit ET déplace le profil, d’un seul geste', async () => {
			const eleve = await nouvelEleve(ancienneEcole);

			const { data, error } = await composer(admin, classeCible, [eleve]);
			expect(error).toBeNull();
			expect(data).toEqual([{ enrolled: 1, moved: 1 }]);

			expect(await adhesion(classeCible, eleve)).toBe('active');
			// Sans ça, l'élève verrait le calendrier et le marché de son ancienne
			// école tout en travaillant dans la nouvelle classe.
			expect(await ecoleDuProfil(eleve)).toBe(nouvelleEcole);
		});

		it('ne déplace personne quand l’école est déjà la bonne', async () => {
			const eleve = await nouvelEleve(nouvelleEcole);

			const { data, error } = await composer(admin, classeCible, [eleve]);
			expect(error).toBeNull();
			expect(data).toEqual([{ enrolled: 1, moved: 0 }]);
			expect(await ecoleDuProfil(eleve)).toBe(nouvelleEcole);
		});
	});

	describe('ce que le geste ne fait pas', () => {
		it('ne duplique pas un élève déjà membre', async () => {
			const eleve = await nouvelEleve(nouvelleEcole);
			await composer(admin, classeCible, [eleve]);

			const { data, error } = await composer(admin, classeCible, [eleve]);
			expect(error).toBeNull();
			expect(data).toEqual([{ enrolled: 0, moved: 0 }]);

			const { count } = await service
				.from('class_members')
				.select('id', { count: 'exact', head: true })
				.eq('class_id', classeCible)
				.eq('student_id', eleve);
			expect(count).toBe(1);
		});

		it('ne réactive pas une adhésion archivée dans la classe cible', async () => {
			// Réactiver serait une décision du professeur, pas un effet de bord.
			const eleve = await nouvelEleve(nouvelleEcole);
			const { error: insertError } = await service
				.from('class_members')
				.insert({ class_id: classeCible, student_id: eleve, status: 'archived' });
			expect(insertError).toBeNull();

			const { data, error } = await composer(admin, classeCible, [eleve]);
			expect(error).toBeNull();
			expect(data).toEqual([{ enrolled: 0, moved: 0 }]);
			expect(await adhesion(classeCible, eleve)).toBe('archived');
		});

		it('n’inscrit ni ne déplace un compte qui n’est pas un élève', async () => {
			// Un identifiant de professeur glissé dans la liste ne doit surtout pas
			// voir son école réécrite.
			const ecoleAvant = await ecoleDuProfil(profId);

			const { data, error } = await composer(admin, classeCible, [profId]);
			expect(error).toBeNull();
			expect(data).toEqual([{ enrolled: 0, moved: 0 }]);
			expect(await ecoleDuProfil(profId)).toBe(ecoleAvant);
			expect(await adhesion(classeCible, profId)).toBeNull();
		});
	});

	describe('les refus, et ce qu’ils laissent derrière eux', () => {
		it('refuse une classe archivée sans avoir déplacé personne', async () => {
			// La preuve que le garde passe AVANT les écritures : l'école du profil
			// est intacte après le refus.
			const eleve = await nouvelEleve(ancienneEcole);

			const { error } = await composer(admin, classeArchivee, [eleve]);
			expect(error).not.toBeNull();
			expect(await ecoleDuProfil(eleve)).toBe(ancienneEcole);
			expect(await adhesion(classeArchivee, eleve)).toBeNull();
		});

		it('refuse une année scolaire terminée sans avoir déplacé personne', async () => {
			const eleve = await nouvelEleve(ancienneEcole);

			const { error } = await composer(admin, classeAnneeFinie, [eleve]);
			expect(error).not.toBeNull();
			expect(await ecoleDuProfil(eleve)).toBe(ancienneEcole);
		});

		it('refuse une classe inexistante', async () => {
			const eleve = await nouvelEleve(ancienneEcole);
			const { error } = await composer(admin, '00000000-0000-0000-0000-000000000000', [eleve]);
			expect(error).not.toBeNull();
		});

		it('refuse un appelant qui n’est pas admin', async () => {
			// Le professeur est le seul autre rôle privilégié. S'il pouvait
			// appeler la fonction, il déplacerait des élèves entre écoles.
			const eleve = await nouvelEleve(ancienneEcole);

			const { error } = await composer(prof, classeCible, [eleve]);
			expect(error?.code).toBe('42501');
			expect(await ecoleDuProfil(eleve)).toBe(ancienneEcole);
			expect(await adhesion(classeCible, eleve)).toBeNull();
		});
	});
});
