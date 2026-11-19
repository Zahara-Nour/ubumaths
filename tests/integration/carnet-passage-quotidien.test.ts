/**
 * Carnet de liaison — le passage quotidien (base locale, Brevo simulé)
 * ====================================================================
 *
 * ADR 0040, chantier `partage-parents`, PR 4b. `runCarnetDaily` contre la base
 * locale, avec le client service du TEST passé explicitement (jamais celui de
 * l'environnement, qui pourrait viser la prod) et Brevo remplacé par un faux :
 *
 *  - un consentement accordé sans adresse → adresse créée, lien envoyé (Q29) ;
 *  - un élève inactif → un courriel d'exception, journalisé « sent » avec un
 *    jeton qui ouvre le carnet ; épisode marqué signalé (E2) ;
 *  - second passage le même jour → rien (épisode signalé, plafond Q19) ;
 *  - Brevo en échec → ligne « failed », épisode non signalé : nouvel essai (E6) ;
 *  - plafond du passage (Q36).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

// Faux Brevo : rien ne part, chaque appel est gardé.
const envois = vi.hoisted(() => ({
	exception: [] as { to: string; token: string; reasons: string[] }[],
	link: [] as { to: string }[],
	echec: false
}));

vi.mock('#lib/server/email/brevo.ts', () => ({
	sendCarnetExceptionEmail: vi.fn(
		async (to: string, data: { token: string; reasons: string[] }) => {
			envois.exception.push({ to, token: data.token, reasons: data.reasons });
			return envois.echec ? { success: false, error: 'simulé' } : { success: true };
		}
	),
	sendCarnetQuarterlyEmail: vi.fn(async () => ({ success: true })),
	sendCarnetLinkEmail: vi.fn(async (to: string) => {
		envois.link.push({ to });
		return { success: true };
	}),
	sendCarnetConfirmationEmail: vi.fn(async () => ({ success: true }))
}));

// Le client de l'environnement ne doit jamais servir ici.
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => {
		throw new Error('client service de l’environnement appelé pendant le test');
	}
}));

const { runCarnetDaily } = await import('#lib/server/carnet/courriels.ts');

// Constantes
const DOMAINE = 'example.test';
const service = createServiceRoleClient() as unknown as SupabaseClient<Database>;
const brut = service as unknown as SupabaseClient;

// Variables
let classId: string;
let ecoleId: string;
let anneeId: string;

// Functions
function sha256(texte: string): string {
	return createHash('sha256').update(texte).digest('hex');
}

async function insertId(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await brut.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data as { id: string }).id;
}

async function nouvelEleve(prenom: string): Promise<string> {
	const profil = await TestData.profile().withRole('student').create();
	const { error: e1 } = await brut
		.from('profiles')
		.update({ firstname: prenom, lastname: 'Nomdefamille' })
		.eq('id', profil.id);
	if (e1) throw new Error(e1.message);
	const { error: e2 } = await brut
		.from('class_members')
		// Arrivé avant toute rentrée (Q43 : le carnet compte depuis l'arrivée)
		.insert({
			class_id: classId,
			student_id: profil.id,
			status: 'active',
			joined_at: new Date(Date.now() - 400 * 86_400_000).toISOString()
		});
	if (e2) throw new Error(e2.message);
	return profil.id;
}

async function parentConfirme(eleve: string, email: string): Promise<string> {
	const contactId = await insertId('parent_contacts', {
		student_id: eleve,
		email,
		status: 'confirmed',
		confirmed_at: new Date().toISOString(),
		source: 'teacher'
	});
	const { data, error } = await brut.rpc('issue_parent_carnet_link', {
		p_contact_id: contactId,
		p_token_hash: sha256(randomBytes(32).toString('base64url')),
		p_expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString()
	});
	if (error || data !== true) throw new Error(`issue_parent_carnet_link : ${error?.message}`);
	return contactId;
}

async function notifications(eleve: string) {
	const { data, error } = await brut
		.from('parent_notifications')
		.select('kind, status, reasons, access_token_hash')
		.eq('student_id', eleve)
		.order('created_at');
	if (error) throw new Error(error.message);
	return data as {
		kind: string;
		status: string;
		reasons: string[];
		access_token_hash: string | null;
	}[];
}

// Tests
describe('carnet de liaison — passage quotidien (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		// Le chat de la classe (trigger) a besoin du professeur du site.
		await TestData.profile().withRole('teacher').create();
		ecoleId = await insertId('schools', {
			name: 'École du passage',
			city: 'Testville',
			country: 'France'
		});
		const debut = new Date(Date.now() - 80 * 86_400_000).toISOString().slice(0, 10);
		anneeId = await insertId('school_years', {
			school_id: ecoleId,
			name: 'Année du passage',
			start_date: debut,
			end_date: new Date(Date.now() + 240 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classId = (await TestData.class().withName('4e Passage').create()).id;
		const { error: e1 } = await brut
			.from('classes')
			.update({ school_id: ecoleId })
			.eq('id', classId);
		if (e1) throw new Error(e1.message);
		const { error: e2 } = await brut
			.from('class_carnet_settings')
			.insert({ class_id: classId, enabled: true });
		if (e2) throw new Error(e2.message);
	}, 120_000);

	beforeEach(() => {
		envois.exception.length = 0;
		envois.link.length = 0;
		envois.echec = false;
	});

	afterAll(async () => {
		await brut.from('class_carnet_settings').delete().eq('class_id', classId);
		await brut.from('class_members').delete().eq('class_id', classId);
		await brut.from('classes').delete().eq('id', classId);
		await brut.from('school_years').delete().eq('id', anneeId);
		await brut.from('schools').delete().eq('id', ecoleId);
		await cleanupAllTestData();
	});

	it('consentement sans adresse → lien ; élève inactif → un courriel avec un jeton qui ouvre le carnet', async () => {
		const consenti = await nouvelEleve('Agathe');
		await insertId('parental_consents', {
			student_id: consenti,
			parent_email: `p-agathe@${DOMAINE}`,
			status: 'granted',
			consent_given_at: new Date().toISOString()
		});
		const inactif = await nouvelEleve('Benoît');
		const contact = await parentConfirme(inactif, `p-benoit@${DOMAINE}`);

		const rapport = await runCarnetDaily(service);

		expect(envois.link.map((e) => e.to)).toContain(`p-agathe@${DOMAINE}`);
		// Agathe vient de recevoir son lien ; inactive aussi : son courriel
		// d'exception part (le lien ne compte pas dans le plafond).
		const benoit = envois.exception.filter((e) => e.to === `p-benoit@${DOMAINE}`);
		expect(benoit).toHaveLength(1);
		expect(benoit[0].reasons).toEqual(['inactivity']);
		expect(rapport.exceptions.sent).toBeGreaterThanOrEqual(1);

		const lignes = await notifications(inactif);
		expect(lignes).toEqual([
			{
				kind: 'exception',
				status: 'sent',
				reasons: ['inactivity'],
				access_token_hash: sha256(benoit[0].token)
			}
		]);
		const { data: carnet } = await brut.rpc('get_carnet_by_token', {
			p_token: benoit[0].token
		});
		expect((carnet as { firstname: string }).firstname).toBe('Benoît');

		const { data: episodes } = await brut
			.from('parent_exception_episodes')
			.select('notified_at')
			.eq('contact_id', contact);
		expect(episodes).toHaveLength(1);
		expect((episodes as { notified_at: string | null }[])[0].notified_at).not.toBeNull();

		// Second passage : rien de neuf pour Benoît
		envois.exception.length = 0;
		await runCarnetDaily(service);
		expect(envois.exception.filter((e) => e.to === `p-benoit@${DOMAINE}`)).toEqual([]);
		expect(await notifications(inactif)).toHaveLength(1);
	});

	it('Brevo en échec → ligne « failed », épisode non signalé, nouvel essai au passage suivant (E6)', async () => {
		const eleve = await nouvelEleve('Capucine');
		const contact = await parentConfirme(eleve, `p-capucine@${DOMAINE}`);

		envois.echec = true;
		await runCarnetDaily(service);
		expect((await notifications(eleve)).map((n) => n.status)).toEqual(['failed']);
		const { data: avant } = await brut
			.from('parent_exception_episodes')
			.select('notified_at')
			.eq('contact_id', contact);
		expect((avant as { notified_at: string | null }[])[0].notified_at).toBeNull();

		envois.echec = false;
		await runCarnetDaily(service);
		expect((await notifications(eleve)).map((n) => n.status)).toEqual(['failed', 'sent']);
		expect(envois.exception.filter((e) => e.to === `p-capucine@${DOMAINE}`)).toHaveLength(2);
	});

	it('plafond partagé : les liens manquants épuisent le budget, aucune exception ne part (Q36)', async () => {
		const consenti = await nouvelEleve('Fanny');
		await insertId('parental_consents', {
			student_id: consenti,
			parent_email: `p-fanny@${DOMAINE}`,
			status: 'granted',
			consent_given_at: new Date().toISOString()
		});
		const inactif = await nouvelEleve('Gilles');
		await parentConfirme(inactif, `p-gilles@${DOMAINE}`);

		const rapport = await runCarnetDaily(service, 1);
		expect(envois.link.length + envois.exception.length).toBe(1);
		expect(rapport.capped).toBe(true);
		expect(rapport.quarterly).toEqual({ sent: 0, failed: 0 });
	});

	it('plafond du passage : au plus N courriels, le reste demain (Q36)', async () => {
		const a = await nouvelEleve('Doriane');
		await parentConfirme(a, `p-doriane@${DOMAINE}`);
		const b = await nouvelEleve('Eliott');
		await parentConfirme(b, `p-eliott@${DOMAINE}`);

		const rapport = await runCarnetDaily(service, 1);
		expect(envois.exception.length + envois.link.length).toBeLessThanOrEqual(1);
		expect(rapport.capped).toBe(true);

		await runCarnetDaily(service, 50);
		const partis = envois.exception.map((e) => e.to);
		expect(partis).toContain(`p-doriane@${DOMAINE}`);
		expect(partis).toContain(`p-eliott@${DOMAINE}`);
	});
});
