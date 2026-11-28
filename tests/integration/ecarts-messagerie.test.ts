/**
 * Preuves du registre des écarts — messagerie, avertissements, carnet (base locale)
 * ================================================================================
 *
 * Quatre écarts ouverts de `docs/ecarts/registre.md` (L79, L82, L83, L84) ne se
 * prouvent que sur une vraie base. Chacun a ici :
 *
 *  - un **témoin**, test ordinaire : le même geste, sur un cas permis, marche ;
 *  - sa **preuve**, en `it.fails` : elle affirme le comportement ATTENDU, donc
 *    elle échoue tant que l'écart est vrai, et `it.fails` la compte verte.
 *
 * Le jour où l'écart est corrigé, la preuve passe, `it.fails` devient rouge et
 * la CI s'arrête : retirer alors `.fails` ET le marqueur du nom du test (le mot
 * « écart » suivi de l'identifiant). Le registre lit ce marqueur par une
 * commande (`! grep`) : sans lui, la ligne se ferme à la tâche de nuit.
 *
 * ⚠️ Un `it.fails` est vert dès que son corps lève, quelle qu'en soit la raison.
 * Donc chaque sonde tourne dans un `beforeAll` (une panne de décor y est rouge)
 * et le corps d'une preuve ne contient qu'UNE affirmation, sur un résultat déjà
 * lu.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { createNotification } from '#lib/server/notifications.ts';
import type { Database } from '#lib/types/database.ts';

// Types
type Prof = SupabaseClient<Database>;

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DOMAINE = 'example.test';
const JOUR = 86_400_000;
// Client non typé : les lectures de contrôle portent sur des tables variées.
const service = createServiceRoleClient() as unknown as SupabaseClient;

// Variables
let teacherId: string;
let teacher: Prof;
let ecoleId: string;
let anneeId: string;
let periodeId: string;
let classeA: string;
let classeB: string;
const notifications: string[] = [];
let compteur = 0;

// Functions
function sha256(texte: string): string {
	return createHash('sha256').update(texte).digest('hex');
}

function nouveauJeton(): string {
	return randomBytes(32).toString('base64url');
}

function jour(decalage: number): string {
	return new Date(Date.now() + decalage * JOUR).toISOString().slice(0, 10);
}

async function insertId(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data as { id: string }).id;
}

async function nouvelleClasse(nom: string): Promise<string> {
	const id = (await TestData.class().withName(nom).create()).id;
	const { error } = await service.from('classes').update({ school_id: ecoleId }).eq('id', id);
	if (error) throw new Error(error.message);
	return id;
}

/** Élève, membre de `classe` avec le statut donné (aucune adhésion si `classe` est nul). */
async function nouvelEleve(
	classe: string | null,
	statut: 'active' | 'archived' = 'active'
): Promise<string> {
	const profil = await TestData.profile().withRole('student').create();
	const { error: e1 } = await service
		.from('profiles')
		.update({ firstname: `Élève${++compteur}`, lastname: 'Nomdefamille' })
		.eq('id', profil.id);
	if (e1) throw new Error(e1.message);
	if (classe) {
		const { error: e2 } = await service.from('class_members').insert({
			class_id: classe,
			student_id: profil.id,
			status: statut,
			joined_at: new Date(Date.now() - 400 * JOUR).toISOString()
		});
		if (e2) throw new Error(e2.message);
	}
	return profil.id;
}

/** Nombre de lignes de `table` où `colonne` vaut `valeur` ; une lecture en échec lève. */
async function compter(table: string, colonne: string, valeur: string): Promise<number> {
	const { data, error } = await service.from(table).select('id').eq(colonne, valeur);
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data ?? []).length;
}

describe('preuves des écarts — messagerie, avertissements, carnet (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		teacherId = prof.id;
		teacher = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { error } = await teacher.auth.signInWithPassword({
			email: prof.email!,
			password: DEFAULT_TEST_PASSWORD
		});
		if (error) throw new Error(`connexion du prof impossible : ${error.message}`);

		ecoleId = await insertId('schools', {
			name: 'École des preuves',
			city: 'Testville',
			country: 'France'
		});
		anneeId = await insertId('school_years', {
			school_id: ecoleId,
			name: 'Année des preuves',
			start_date: jour(-80),
			end_date: jour(240),
			is_active: true
		});
		periodeId = await insertId('academic_periods', {
			school_year_id: anneeId,
			type: 'trimester',
			name: 'Trimestre 1',
			start_date: jour(-80),
			end_date: jour(20),
			period_order: 1
		});
		classeA = await nouvelleClasse('4e Preuves A');
		classeB = await nouvelleClasse('4e Preuves B');
	}, 120_000);

	afterAll(async () => {
		const classes = [classeA, classeB];
		await service.from('notifications').delete().in('id', notifications);
		await service.from('student_warnings').delete().in('class_id', classes);
		await service.from('class_carnet_settings').delete().in('class_id', classes);
		await service.from('class_members').delete().in('class_id', classes);
		await service.from('classes').delete().in('id', classes);
		await service.from('academic_periods').delete().eq('school_year_id', anneeId);
		await service.from('school_years').delete().eq('id', anneeId);
		await service.from('schools').delete().eq('id', ecoleId);
		await cleanupAllTestData();
	});

	describe('avertissement posé dans une classe où l’élève n’est pas', () => {
		let chezLui: number;
		let ailleurs: number;

		beforeAll(async () => {
			const eleve = await nouvelEleve(classeA);
			const poser = async (classe: string) => {
				// Un refus peut venir en erreur ou en `success: false` : seule la
				// ligne écrite, relue ensuite, dit ce qui s'est passé.
				await teacher.rpc('add_warning', {
					p_student_id: eleve,
					p_class_id: classe,
					p_academic_period_id: periodeId,
					p_warning_type: 'C'
				});
				const { data, error } = await service
					.from('student_warnings')
					.select('id')
					.eq('student_id', eleve)
					.eq('class_id', classe);
				if (error) throw new Error(error.message);
				return (data ?? []).length;
			};
			chezLui = await poser(classeA);
			ailleurs = await poser(classeB);
		});

		it('témoin : dans sa classe, l’avertissement est écrit', () => {
			expect(chezLui).toBe(1);
		});

		it.fails('écart L82 : dans une autre classe, aucun avertissement n’est écrit', () => {
			expect(ailleurs).toBe(0);
		});
	});

	describe('notification nominative à un élève qui a quitté ses classes', () => {
		let actif: { success: boolean; error?: string };
		let parti: { success: boolean; error?: string };

		beforeAll(async () => {
			const viser = async (eleve: string) => {
				const resultat = await createNotification(
					teacher,
					{
						title: 'Preuve',
						message: '<p>Un mot pour toi.</p>',
						type: 'info',
						priority: 'normal',
						target_type: 'users',
						target_user_ids: [eleve]
					},
					teacherId
				);
				if (resultat.id) notifications.push(resultat.id);
				return resultat;
			};
			actif = await viser(await nouvelEleve(classeA));
			parti = await viser(await nouvelEleve(classeA, 'archived'));
		});

		it('témoin : un élève actif de la classe est visé', () => {
			expect(actif).toMatchObject({ success: true });
		});

		it('un élève dont la seule adhésion est archivée est refusé (L83)', () => {
			expect(parti.success).toBe(false);
		});
	});

	describe('message privé du prof à un élève de test', () => {
		let recuOrdinaire: number;
		let recuDeTest: number;

		beforeAll(async () => {
			const ecrire = async (eleve: string) => {
				// Refus = exception de la fonction : on lit ce que l'élève a reçu.
				await teacher.rpc('send_private_message', {
					p_sender_id: teacherId,
					p_recipient_ids: [eleve],
					p_subject: 'Preuve',
					p_content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bonjour' }] }]
					}
				});
				return compter('message_inbox', 'recipient_id', eleve);
			};
			const ordinaire = await nouvelEleve(classeA);
			const deTest = await nouvelEleve(classeA);
			const { data, error } = await service
				.from('profiles')
				.update({ is_test: true })
				.eq('id', deTest)
				.select('id');
			if (error || data?.length !== 1) throw new Error('élève de test non marqué');
			recuOrdinaire = await ecrire(ordinaire);
			recuDeTest = await ecrire(deTest);
		});

		it('témoin : un élève ordinaire reçoit le message', () => {
			expect(recuOrdinaire).toBe(1);
		});

		it.fails('écart L84 : un élève de test ne reçoit rien', () => {
			expect(recuDeTest).toBe(0);
		});
	});

	describe('compteur d’ouvertures du lien d’un parent', () => {
		let parLeLien: number;
		let parLeCourriel: number;

		beforeAll(async () => {
			const { error: reglage } = await service
				.from('class_carnet_settings')
				.insert({ class_id: classeA, enabled: true });
			if (reglage) throw new Error(reglage.message);
			const eleve = await nouvelEleve(classeA);
			const contactId = await insertId('parent_contacts', {
				student_id: eleve,
				email: `p-preuve@${DOMAINE}`,
				status: 'confirmed',
				confirmed_at: new Date().toISOString(),
				source: 'teacher'
			});
			const lien = nouveauJeton();
			const { data: emis, error: emission } = await service.rpc('issue_parent_carnet_link', {
				p_contact_id: contactId,
				p_token_hash: sha256(lien),
				p_expires_at: new Date(Date.now() + 30 * JOUR).toISOString()
			});
			if (emission || emis !== true) throw new Error('lien du parent non émis');
			const courriel = nouveauJeton();
			await insertId('parent_notifications', {
				student_id: eleve,
				contact_id: contactId,
				kind: 'exception',
				status: 'sent',
				access_token_hash: sha256(courriel)
			});

			const ouvertures = async (): Promise<number> => {
				const { data, error } = await service
					.from('parent_carnet_links')
					.select('access_count')
					.eq('contact_id', contactId)
					.is('revoked_at', null)
					.single();
				if (error) throw new Error(error.message);
				return (data as { access_count: number }).access_count;
			};
			/** Ouvre le carnet par `jeton` et rend ce que le compteur du lien a gagné. */
			const ouvrir = async (jeton: string): Promise<number> => {
				const avant = await ouvertures();
				const { data, error } = await service.rpc('get_carnet_by_token', { p_token: jeton });
				if (error || !data) throw new Error('carnet non ouvert');
				return (await ouvertures()) - avant;
			};
			parLeLien = await ouvrir(lien);
			parLeCourriel = await ouvrir(courriel);
		});

		it('témoin : ouvrir par le lien compte une ouverture', () => {
			expect(parLeLien).toBe(1);
		});

		it.fails('écart L79 : ouvrir par le jeton d’un courriel ne compte pas pour le lien', () => {
			expect(parLeCourriel).toBe(0);
		});
	});
});
