/**
 * Lecture facilitée des fiches, par élève (base locale requise)
 * =============================================================
 *
 * Question d'accès tranchée par David (2026-11-19, D10 du chantier
 * `lecture-facilitee`) : personne de nouveau. La colonne `easy_reading` de
 * `student_print_settings` est lue et modifiée par l'élève lui-même, son
 * professeur et l'admin ; ni par un AMI (qui lit pourtant la ligne `profiles`
 * entière), ni par un autre élève, ni par anon.
 *
 * ⚠️ La RLS échoue en silence : chaque refus est vérifié par une relecture
 * côté service, pas par l'absence d'erreur.
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
import type { Database } from '#lib/types/database.ts';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Client non typé sur la table : la colonne n'existe pas encore dans
 * `database.ts` (généré depuis la prod) au moment où ce test est écrit.
 */
type LooseClient = {
	from: (table: string) => ReturnType<SupabaseClient['from']>;
};

/** Le réglage tel que la base le garde */
interface StoredSettings {
	text_size: string;
	easy_reading: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const TABLE = 'student_print_settings';

const service = createServiceRoleClient();
const serviceLoose = service as unknown as LooseClient;

// ============================================================================
// FONCTIONS
// ============================================================================

async function clientFor(email: string): Promise<LooseClient> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client as unknown as LooseClient;
}

function anonClient(): LooseClient {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	}) as unknown as LooseClient;
}

/** Le réglage enregistré, lu côté service (vérité de la base) */
async function stored(studentId: string): Promise<StoredSettings | null> {
	const { data, error } = await serviceLoose
		.from(TABLE)
		.select('text_size, easy_reading')
		.eq('student_id', studentId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data as StoredSettings | null;
}

async function setStored(studentId: string, settings: Partial<StoredSettings>): Promise<void> {
	const { error } = await serviceLoose.from(TABLE).upsert({ student_id: studentId, ...settings });
	if (error) throw new Error(error.message);
}

// ============================================================================
// TESTS
// ============================================================================

describe('lecture facilitée des fiches : qui lit, qui modifie', () => {
	let eleve: LooseClient;
	let eleveId: string;
	let ami: LooseClient;
	let amiId: string;
	let prof: LooseClient;
	let admin: LooseClient;

	beforeAll(async () => {
		await cleanupAllTestData();

		const p = await TestData.profile().withRole('teacher').create();
		prof = await clientFor(p.email);

		const ad = await TestData.profile().withRole('admin').create();
		admin = await clientFor(ad.email);

		const e = await TestData.profile().withRole('student').create();
		eleveId = e.id;
		eleve = await clientFor(e.email);

		const a = await TestData.profile().withRole('student').create();
		amiId = a.id;
		ami = await clientFor(a.email);

		// Amitié acceptée : l'ami lit le profil de l'élève — mais pas son réglage
		const { error } = await service.from('friendships').insert({
			requester_id: eleveId,
			addressee_id: amiId,
			status: 'accepted',
			friendship_type: 'friend'
		});
		if (error) throw new Error(`friendships: ${error.message}`);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('une ligne sans réglage explicite est éteinte', async () => {
		await serviceLoose.from(TABLE).delete().eq('student_id', eleveId);
		await setStored(eleveId, { text_size: 'large' });
		expect(await stored(eleveId)).toEqual({ text_size: 'large', easy_reading: false });
	});

	it("l'élève allume sa lecture facilitée sans toucher à sa taille", async () => {
		await setStored(eleveId, { text_size: 'x_large', easy_reading: false });
		const { data, error } = await eleve
			.from(TABLE)
			.upsert({ student_id: eleveId, easy_reading: true })
			.select('easy_reading');
		expect(error).toBeNull();
		expect(data).toEqual([{ easy_reading: true }]);
		expect(await stored(eleveId)).toEqual({ text_size: 'x_large', easy_reading: true });
	});

	it("l'élève relit son réglage", async () => {
		await setStored(eleveId, { easy_reading: true });
		const { data } = await eleve.from(TABLE).select('easy_reading').eq('student_id', eleveId);
		expect(data).toEqual([{ easy_reading: true }]);
	});

	it('un ami lit le profil mais PAS la lecture facilitée', async () => {
		await setStored(eleveId, { easy_reading: true });
		// Témoin : l'amitié ouvre bien le profil (sinon le test ne prouve rien)
		const { data: profil } = await (ami as unknown as SupabaseClient<Database>)
			.from('profiles')
			.select('id')
			.eq('id', eleveId);
		expect(profil, "l'amitié n'ouvre pas le profil : témoin cassé").toHaveLength(1);

		const { data } = await ami.from(TABLE).select('easy_reading').eq('student_id', eleveId);
		expect(data).toEqual([]);
	});

	it("un autre élève n'éteint pas la lecture facilitée de l'élève", async () => {
		await setStored(eleveId, { easy_reading: true });
		const { data } = await ami
			.from(TABLE)
			.update({ easy_reading: false })
			.eq('student_id', eleveId)
			.select();
		expect(data ?? []).toEqual([]);
		expect((await stored(eleveId))?.easy_reading).toBe(true);
	});

	it("le professeur lit et modifie la lecture facilitée d'un élève", async () => {
		await setStored(eleveId, { easy_reading: false });
		const { data: lu } = await prof.from(TABLE).select('easy_reading').eq('student_id', eleveId);
		expect(lu).toEqual([{ easy_reading: false }]);

		const { data, error } = await prof
			.from(TABLE)
			.update({ easy_reading: true })
			.eq('student_id', eleveId)
			.select();
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await stored(eleveId))?.easy_reading).toBe(true);
	});

	it("l'admin modifie la lecture facilitée d'un élève", async () => {
		await setStored(eleveId, { easy_reading: true });
		const { data, error } = await admin
			.from(TABLE)
			.update({ easy_reading: false })
			.eq('student_id', eleveId)
			.select();
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await stored(eleveId))?.easy_reading).toBe(false);
	});

	it('un visiteur (anon) ne lit rien et n’écrit rien', async () => {
		await setStored(eleveId, { easy_reading: true });
		const anon = anonClient();
		const { error: lecture } = await anon.from(TABLE).select('easy_reading');
		expect(lecture?.code).toBe('42501');

		const { error: ecriture } = await anon
			.from(TABLE)
			.upsert({ student_id: eleveId, easy_reading: false });
		expect(ecriture?.code).toBe('42501');
		expect((await stored(eleveId))?.easy_reading).toBe(true);
	});
});
