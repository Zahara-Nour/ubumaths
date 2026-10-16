/**
 * Taille du texte des fiches, par élève (base locale requise)
 * ===========================================================
 *
 * Question d'accès tranchée par David (2026-10-16) : l'élève lit et modifie
 * son propre réglage ; le professeur et l'admin, celui de tout élève ;
 * personne d'autre — en particulier pas un AMI, qui lit pourtant la ligne
 * `profiles` entière (d'où une table à part). Anon : rien.
 *
 * ⚠️ La RLS échoue en silence : un refus en lecture rend zéro ligne, un refus
 * en mise à jour affecte zéro ligne. Chaque refus est donc vérifié par une
 * relecture côté service, pas par l'absence d'erreur.
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

const TABLE = 'student_print_settings';

const service = createServiceRoleClient();

/**
 * Client non typé sur la table : elle n'existe pas encore dans `database.ts`
 * (généré depuis la prod) au moment où ce test est écrit.
 */
type LooseClient = {
	from: (table: string) => ReturnType<SupabaseClient['from']>;
};

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

const serviceLoose = service as unknown as LooseClient;

/** La taille enregistrée, lue côté service (vérité de la base). */
async function storedSize(studentId: string): Promise<string | null> {
	const { data, error } = await serviceLoose
		.from(TABLE)
		.select('text_size')
		.eq('student_id', studentId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as { text_size: string } | null)?.text_size ?? null;
}

async function setSize(studentId: string, size: string): Promise<void> {
	const { error } = await serviceLoose
		.from(TABLE)
		.upsert({ student_id: studentId, text_size: size });
	if (error) throw new Error(error.message);
}

describe('taille du texte des fiches : qui lit, qui modifie', () => {
	let eleve: LooseClient;
	let eleveId: string;
	let ami: LooseClient;
	let amiId: string;
	let prof: LooseClient;
	let profId: string;
	let admin: LooseClient;

	beforeAll(async () => {
		await cleanupAllTestData();

		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;
		prof = await clientFor(p.email);

		const ad = await TestData.profile().withRole('admin').create();
		admin = await clientFor(ad.email);

		const e = await TestData.profile().withRole('student').create();
		eleveId = e.id;
		eleve = await clientFor(e.email);

		const a = await TestData.profile().withRole('student').create();
		amiId = a.id;
		ami = await clientFor(a.email);

		// Amitié acceptée : l'ami lit le profil de l'élève — mais pas son réglage.
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

	it("l'élève enregistre puis relit sa propre taille", async () => {
		const { error } = await eleve
			.from(TABLE)
			.upsert({ student_id: eleveId, text_size: 'large' })
			.select();
		expect(error).toBeNull();
		expect(await storedSize(eleveId)).toBe('large');

		const { data } = await eleve.from(TABLE).select('text_size').eq('student_id', eleveId);
		expect(data).toEqual([{ text_size: 'large' }]);
	});

	it("l'élève change sa taille (mise à jour)", async () => {
		await setSize(eleveId, 'large');
		const { data, error } = await eleve
			.from(TABLE)
			.update({ text_size: 'x_large' })
			.eq('student_id', eleveId)
			.select();
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await storedSize(eleveId)).toBe('x_large');
	});

	it('un ami lit le profil mais PAS le réglage', async () => {
		await setSize(eleveId, 'large');
		// Témoin : l'amitié ouvre bien le profil (sinon le test ne prouve rien).
		const { data: profil } = await (ami as unknown as SupabaseClient<Database>)
			.from('profiles')
			.select('id')
			.eq('id', eleveId);
		expect(profil, "l'amitié n'ouvre pas le profil : témoin cassé").toHaveLength(1);

		const { data } = await ami.from(TABLE).select('text_size').eq('student_id', eleveId);
		expect(data).toEqual([]);
	});

	it("un autre élève ne modifie pas le réglage de l'élève", async () => {
		await setSize(eleveId, 'large');
		const { data } = await ami
			.from(TABLE)
			.update({ text_size: 'normal' })
			.eq('student_id', eleveId)
			.select();
		expect(data ?? []).toEqual([]);
		expect(await storedSize(amiId)).toBeNull();
		expect(await storedSize(eleveId)).toBe('large');
	});

	it("un autre élève ne crée pas de réglage au nom de l'élève", async () => {
		await serviceLoose.from(TABLE).delete().eq('student_id', eleveId);
		const { error } = await ami.from(TABLE).insert({ student_id: eleveId, text_size: 'x_large' });
		expect(error).not.toBeNull();
		expect(await storedSize(eleveId)).toBeNull();
	});

	it("le professeur lit et modifie le réglage d'un élève", async () => {
		await setSize(eleveId, 'normal');
		const { data: lu } = await prof.from(TABLE).select('text_size').eq('student_id', eleveId);
		expect(lu).toEqual([{ text_size: 'normal' }]);

		const { data, error } = await prof
			.from(TABLE)
			.upsert({ student_id: eleveId, text_size: 'x_large' })
			.select();
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await storedSize(eleveId)).toBe('x_large');
	});

	it("l'admin lit et modifie le réglage d'un élève", async () => {
		await setSize(eleveId, 'normal');
		const { data, error } = await admin
			.from(TABLE)
			.update({ text_size: 'large' })
			.eq('student_id', eleveId)
			.select();
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await storedSize(eleveId)).toBe('large');
	});

	it("aucun réglage pour un compte qui n'est pas élève", async () => {
		const { error } = await prof.from(TABLE).insert({ student_id: profId, text_size: 'large' });
		expect(error).not.toBeNull();
		expect(await storedSize(profId)).toBeNull();
	});

	it('une taille inconnue est refusée par la base', async () => {
		// Témoin : une taille valide passe (sinon le refus ci-dessous ne prouverait pas le CHECK).
		const { error: valide } = await eleve
			.from(TABLE)
			.upsert({ student_id: eleveId, text_size: 'normal' });
		expect(valide).toBeNull();

		const { error } = await eleve.from(TABLE).upsert({ student_id: eleveId, text_size: 'enorme' });
		expect(error?.code).toBe('23514');
		expect(await storedSize(eleveId)).toBe('normal');
	});

	/** Sans `with check` sur l'UPDATE, l'élève déplacerait sa ligne sur un camarade. */
	it("l'élève ne réécrit pas sa ligne au nom d'un camarade", async () => {
		await serviceLoose.from(TABLE).delete().eq('student_id', amiId);
		await setSize(eleveId, 'x_large');
		const { error } = await eleve
			.from(TABLE)
			.update({ student_id: amiId })
			.eq('student_id', eleveId)
			.select();
		expect(error).not.toBeNull();
		expect(await storedSize(amiId)).toBeNull();
		expect(await storedSize(eleveId)).toBe('x_large');
	});

	it("un autre élève ne supprime pas le réglage de l'élève", async () => {
		await setSize(eleveId, 'large');
		const { data } = await ami.from(TABLE).delete().eq('student_id', eleveId).select();
		expect(data ?? []).toEqual([]);
		expect(await storedSize(eleveId)).toBe('large');
	});

	it('un visiteur (anon) ne lit rien et n’écrit rien', async () => {
		await setSize(eleveId, 'large');
		const anon = anonClient();
		const { error: lecture } = await anon.from(TABLE).select('text_size');
		expect(lecture?.code).toBe('42501');

		const { error: ecriture } = await anon
			.from(TABLE)
			.upsert({ student_id: eleveId, text_size: 'normal' });
		expect(ecriture?.code).toBe('42501');
		expect(await storedSize(eleveId)).toBe('large');
	});
});
