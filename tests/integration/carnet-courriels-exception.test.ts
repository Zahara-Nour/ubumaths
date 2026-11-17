/**
 * Carnet de liaison — courriels d'exception, trimestriel, effacement (base locale)
 * ================================================================================
 *
 * ADR 0040, chantier `partage-parents`, PR 4 (E1-E7, Q19, Q21, Q27, Q33-Q38).
 *
 *  - exceptions en cours (`carnet_current_exceptions`) : évaluation non faite
 *    dans les 7 jours qui suivent l'échéance, révisions en retard depuis plus de
 *    N jours, aucun jour actif sur les N derniers jours de classe (vacances
 *    exclues, rien avant la rentrée) ; rien pour un élève sans adresse
 *    confirmée, au partage coupé ou dans une classe sans carnet ;
 *  - épisodes (E2) : un par adresse et par exception, signalé une fois, fermé
 *    quand l'exception disparaît, rouvert si elle revient ; plan d'envoi avec
 *    plafond d'un courriel par semaine (Q19) et vacances (E3) ;
 *  - jeton d'un courriel (Q38) : ouvre le carnet et arrête les courriels tant
 *    que l'adresse a un lien actif ; jamais lisible par un compte ;
 *  - Q27 : évaluation sans échéance non faite gardée dans le carnet ;
 *  - message trimestriel (Q34) et effacement des adresses (Q35).
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null`.
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
import { createFakeTemplate } from '../helpers/competence-referentiel.helpers';

// Types
interface Exception {
	student_id: string;
	reason: string;
	evaluation_id: string | null;
}

interface PlanRow {
	contact_id: string;
	student_id: string;
	email: string;
	firstname: string;
	reasons: string[];
	episode_ids: string[];
	overdue_days: number;
	inactivity_days: number;
}

interface QuarterlyRow {
	contact_id: string;
	period_id: string;
	regular: boolean;
	reviews_up_to_date: boolean;
}

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DOMAINE = 'example.test';
const JOUR = 86_400_000;
// Client non typé : les objets de cette migration n'entrent dans `database.ts`
// qu'après `db:migrate` + `db:types`.
const service = createServiceRoleClient() as unknown as SupabaseClient;

// Variables
let templateId: string;
let teacherId: string;
let teacher: SupabaseClient;
let classId: string;
let classeEteinte: string;
const ecoles: string[] = [];
const classes: string[] = [];
let compteur = 0;

// Functions
function sha256(texte: string): string {
	return createHash('sha256').update(texte).digest('hex');
}

function nouveauJeton(): string {
	return randomBytes(32).toString('base64url');
}

function anonClient(): SupabaseClient {
	return createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function insertId(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data as { id: string }).id;
}

function jourDeParis(d: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
}

function plusJours(jour: string, n: number): string {
	const d = new Date(`${jour}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

function ilYA(jours: number): string {
	return new Date(Date.now() - jours * JOUR).toISOString();
}

const aujourdhui = () => jourDeParis(new Date());

async function nouvelleClasse(
	reglages: Record<string, unknown> = {},
	ecole: string | null = null
): Promise<string> {
	const id = (await TestData.class().withName(`4e Exceptions ${++compteur}`).create()).id;
	classes.push(id);
	if (ecole) {
		const { error } = await service.from('classes').update({ school_id: ecole }).eq('id', id);
		if (error) throw new Error(error.message);
	}
	const { error } = await service
		.from('class_carnet_settings')
		.insert({ class_id: id, enabled: true, ...reglages });
	if (error) throw new Error(error.message);
	return id;
}

/** École avec une année commencée il y a `depuis` jours, des vacances, des trimestres */
async function nouvelleEcole(
	depuis: number,
	vacances: { du: number; au: number }[] = [],
	periodes: { du: number; au: number }[] = []
): Promise<{ ecole: string; annee: string }> {
	const ecole = await insertId('schools', {
		name: `École des exceptions ${++compteur}`,
		city: 'Testville',
		country: 'France'
	});
	ecoles.push(ecole);
	const debut = plusJours(aujourdhui(), -depuis);
	const annee = await insertId('school_years', {
		school_id: ecole,
		name: `Année ${compteur}`,
		start_date: debut,
		end_date: plusJours(debut, 320),
		is_active: true
	});
	for (const v of vacances) {
		await insertId('school_holidays', {
			school_year_id: annee,
			name: 'Vacances',
			start_date: plusJours(aujourdhui(), v.du),
			end_date: plusJours(aujourdhui(), v.au)
		});
	}
	let ordre = 0;
	for (const p of periodes) {
		await insertId('academic_periods', {
			school_year_id: annee,
			type: 'trimester',
			name: `Trimestre ${++ordre}`,
			start_date: plusJours(aujourdhui(), p.du),
			end_date: plusJours(aujourdhui(), p.au),
			period_order: ordre
		});
	}
	return { ecole, annee };
}

/**
 * Élève membre actif de `classe`. Arrivé par défaut il y a 400 jours, avant
 * toute rentrée : seuls les tests de l'arrivée en cours d'année (Q43) posent
 * une date récente.
 */
async function nouvelEleve(
	prenom: string,
	classe: string,
	arriveIlYA = 400
): Promise<{ id: string; email: string; client: () => Promise<SupabaseClient> }> {
	const profil = await TestData.profile().withRole('student').create();
	const { error: e1 } = await service
		.from('profiles')
		.update({ firstname: prenom, lastname: 'Nomdefamille' })
		.eq('id', profil.id);
	if (e1) throw new Error(e1.message);
	const { error: e2 } = await service.from('class_members').insert({
		class_id: classe,
		student_id: profil.id,
		status: 'active',
		joined_at: ilYA(arriveIlYA)
	});
	if (e2) throw new Error(e2.message);
	return { id: profil.id, email: profil.email!, client: () => clientFor(profil.email!) };
}

/** Adresse confirmée + lien actif ; rend le jeton du lien en clair */
async function parentConfirme(
	eleve: string,
	email: string
): Promise<{ contactId: string; jeton: string }> {
	const contactId = await insertId('parent_contacts', {
		student_id: eleve,
		email,
		status: 'confirmed',
		confirmed_at: new Date().toISOString(),
		source: 'teacher'
	});
	const jeton = nouveauJeton();
	const { data, error } = await service.rpc('issue_parent_carnet_link', {
		p_contact_id: contactId,
		p_token_hash: sha256(jeton),
		p_expires_at: new Date(Date.now() + 30 * JOUR).toISOString()
	});
	if (error || data !== true) throw new Error(`issue_parent_carnet_link : ${error?.message}`);
	return { contactId, jeton };
}

/** `nombre` traces autonomes le jour de Paris `jour` (5 = un jour actif) */
async function traces(eleve: string, jour: string, nombre = 5) {
	const rows = Array.from({ length: nombre }, () => ({
		student_id: eleve,
		template_id: templateId,
		success: true,
		source: 'auto',
		place: 'typing',
		created_at: `${jour}T10:00:00Z`
	}));
	const { error } = await service.from('skill_attempts').insert(rows);
	if (error) throw new Error(error.message);
}

/** Partage coupé (élève majeur, Q4) */
async function couperPartage(eleve: string) {
	const { error } = await service
		.from('student_carnet_opt_outs')
		.insert({ student_id: eleve, stopped_by: teacherId });
	if (error) throw new Error(error.message);
}

/** Un jour actif aujourd'hui : écarte l'inactivité des tests qui n'en parlent pas */
async function actifAujourdhui(eleve: string) {
	await traces(eleve, aujourdhui());
}

async function carte(eleve: string, echeance: string, vue: boolean) {
	const { error } = await service.from('srs_card_stats').insert({
		user_id: eleve,
		card_reference_type: 'custom',
		card_reference_id: crypto.randomUUID(),
		next_review: echeance,
		last_review: vue ? ilYA(40) : null,
		state: vue ? 'review' : 'new',
		stability: 1,
		difficulty: 5,
		total_reviews: vue ? 1 : 0,
		review_history: []
	});
	if (error) throw new Error(error.message);
}

async function evaluation(
	titre: string,
	deadline: string | null,
	cible: { class_id?: string; student_id?: string },
	createdAt?: string
): Promise<string> {
	const serie = await insertId('series', {
		title: titre,
		grade: '4',
		items: [{ templateId, quantity: 1, delay: 20 }],
		created_by: teacherId
	});
	const id = await insertId('evaluations', {
		series_id: serie,
		form: 'interactive',
		status: 'published',
		deadline,
		created_by: teacherId,
		...(createdAt ? { created_at: createdAt } : {})
	});
	await insertId('evaluation_assignments', { evaluation_id: id, assigned_by: teacherId, ...cible });
	return id;
}

async function rendue(eleve: string, evaluationId: string) {
	await insertId('test_sessions', {
		user_id: eleve,
		evaluation_id: evaluationId,
		mode: 'interactive',
		items: [],
		total_questions: 1,
		grade: 15,
		points_earned: 1,
		completed_at: new Date().toISOString()
	});
}

async function exceptions(eleve: string): Promise<Exception[]> {
	const { data, error } = await service.rpc('carnet_current_exceptions');
	if (error) throw new Error(`carnet_current_exceptions : ${error.message}`);
	return (data as Exception[]).filter((x) => x.student_id === eleve);
}

async function synchroniser() {
	const { error } = await service.rpc('carnet_sync_exception_episodes');
	if (error) throw new Error(`carnet_sync_exception_episodes : ${error.message}`);
}

async function plan(contactId: string): Promise<PlanRow | undefined> {
	const { data, error } = await service.rpc('carnet_exception_plan');
	if (error) throw new Error(`carnet_exception_plan : ${error.message}`);
	return (data as PlanRow[]).find((r) => r.contact_id === contactId);
}

async function episodes(contactId: string) {
	const { data, error } = await service
		.from('parent_exception_episodes')
		.select('id, reason, evaluation_id, notified_at, closed_at')
		.eq('contact_id', contactId)
		.order('opened_at');
	if (error) throw new Error(error.message);
	return data as {
		id: string;
		reason: string;
		evaluation_id: string | null;
		notified_at: string | null;
		closed_at: string | null;
	}[];
}

async function journal(
	eleve: string,
	contactId: string,
	kind: string,
	quand: string,
	accessHash: string | null = null
) {
	await insertId('parent_notifications', {
		student_id: eleve,
		contact_id: contactId,
		kind,
		status: 'sent',
		created_at: quand,
		access_token_hash: accessHash
	});
}

// Tests
async function titresDuCarnet(jeton: string): Promise<string[]> {
	const { data, error } = await service.rpc('get_carnet_by_token', { p_token: jeton });
	if (error) throw new Error(error.message);
	return (data as { evaluations: { title: string }[] }).evaluations.map((e) => e.title);
}

describe('carnet de liaison — courriels d’exception (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		teacherId = prof.id;
		teacher = await clientFor(prof.email!);
		templateId = await createFakeTemplate(service, prof.id);
		// Classe commune rattachée à une école dont l'année a commencé il y a
		// 80 jours : les tests ne dépendent pas de la date du jour (rentrée).
		classId = await nouvelleClasse({}, (await nouvelleEcole(80)).ecole);
		classeEteinte = (await TestData.class().withName('4e Exceptions éteinte').create()).id;
		classes.push(classeEteinte);
		const { error } = await service
			.from('class_carnet_settings')
			.insert({ class_id: classeEteinte, enabled: false });
		if (error) throw new Error(error.message);
	}, 120_000);

	afterAll(async () => {
		await service.from('skill_attempts').delete().eq('template_id', templateId);
		await service.from('class_carnet_settings').delete().in('class_id', classes);
		await service.from('class_members').delete().in('class_id', classes);
		await service.from('classes').delete().in('id', classes);
		for (const ecole of ecoles) {
			const { data: annees } = await service
				.from('school_years')
				.select('id')
				.eq('school_id', ecole);
			const ids = (annees ?? []).map((a: { id: string }) => a.id);
			await service.from('academic_periods').delete().in('school_year_id', ids);
			await service.from('school_holidays').delete().in('school_year_id', ids);
			await service.from('school_years').delete().in('id', ids);
			await service.from('schools').delete().eq('id', ecole);
		}
		await cleanupAllTestData();
	});

	describe('exceptions en cours (E1, E3)', () => {
		it('évaluation non faite : échéance passée depuis moins de 7 jours, une ligne par évaluation', async () => {
			// Classe à part : ses évaluations échues ne doivent pas toucher les autres tests
			const classe = await nouvelleClasse();
			const eleve = await nouvelEleve('Anouk', classe);
			await parentConfirme(eleve.id, `p-anouk@${DOMAINE}`);
			await actifAujourdhui(eleve.id);
			const manquee = await evaluation('Manquée', ilYA(1), { class_id: classe });
			const individuelle = await evaluation('Individuelle', ilYA(2), { student_id: eleve.id });
			const faite = await evaluation('Faite', ilYA(1), { class_id: classe });
			await rendue(eleve.id, faite);
			await evaluation('Trop vieille', ilYA(10), { class_id: classe });
			await evaluation('À venir', new Date(Date.now() + 3 * JOUR).toISOString(), {
				class_id: classe
			});
			await evaluation('Autre classe', ilYA(1), { class_id: classeEteinte });

			const x = await exceptions(eleve.id);
			expect(x.map((e) => e.reason)).toEqual(['evaluation_missed', 'evaluation_missed']);
			expect(new Set(x.map((e) => e.evaluation_id))).toEqual(new Set([manquee, individuelle]));
		});

		it('évaluation non faite : rien si le réglage de la classe l’éteint', async () => {
			const classe = await nouvelleClasse({ evaluation_missed_alert: false });
			const eleve = await nouvelEleve('Boris', classe);
			await parentConfirme(eleve.id, `p-boris@${DOMAINE}`);
			await actifAujourdhui(eleve.id);
			await evaluation('Manquée sans alerte', ilYA(1), { class_id: classe });
			expect(await exceptions(eleve.id)).toEqual([]);
		});

		it('révisions : la plus ancienne échéance dépassée d’une carte vue a plus de 7 jours', async () => {
			const retard = await nouvelEleve('Céleste', classId);
			await parentConfirme(retard.id, `p-celeste@${DOMAINE}`);
			await actifAujourdhui(retard.id);
			await carte(retard.id, ilYA(9), true);
			await carte(retard.id, ilYA(2), true);

			const leger = await nouvelEleve('Dimitri', classId);
			await parentConfirme(leger.id, `p-dimitri@${DOMAINE}`);
			await actifAujourdhui(leger.id);
			await carte(leger.id, ilYA(5), true);
			// Carte jamais vue, échéance lointaine : pas un retard (Q24)
			await carte(leger.id, ilYA(30), false);

			expect(await exceptions(retard.id)).toEqual([
				{ student_id: retard.id, reason: 'reviews_overdue', evaluation_id: null }
			]);
			expect(await exceptions(leger.id)).toEqual([]);
		});

		it('inactivité : aucun jour actif sur les 15 derniers jours ; 4 traces ne font pas un jour', async () => {
			const inactif = await nouvelEleve('Elouan', classId);
			await parentConfirme(inactif.id, `p-elouan@${DOMAINE}`);
			await traces(inactif.id, plusJours(aujourdhui(), -20));
			await traces(inactif.id, plusJours(aujourdhui(), -3), 4);

			const actif = await nouvelEleve('Faustine', classId);
			await parentConfirme(actif.id, `p-faustine@${DOMAINE}`);
			await traces(actif.id, plusJours(aujourdhui(), -14));

			expect(await exceptions(inactif.id)).toEqual([
				{ student_id: inactif.id, reason: 'inactivity', evaluation_id: null }
			]);
			expect(await exceptions(actif.id)).toEqual([]);
		});

		it('inactivité : les jours de vacances ne comptent pas (E3)', async () => {
			// Vacances sur les 10 derniers jours : la fenêtre de 15 jours de classe
			// remonte à J-25 et voit le jour actif de J-18.
			const { ecole } = await nouvelleEcole(80, [{ du: -10, au: -1 }]);
			const classe = await nouvelleClasse({}, ecole);
			const eleve = await nouvelEleve('Gaspard', classe);
			await parentConfirme(eleve.id, `p-gaspard@${DOMAINE}`);
			await traces(eleve.id, plusJours(aujourdhui(), -18));
			expect(await exceptions(eleve.id)).toEqual([]);

			// Même élève dans une école sans vacances : inactif
			const sans = await nouvelEleve('Hortense', classId);
			await parentConfirme(sans.id, `p-hortense@${DOMAINE}`);
			await traces(sans.id, plusJours(aujourdhui(), -18));
			expect((await exceptions(sans.id)).map((e) => e.reason)).toEqual(['inactivity']);
		});

		it('inactivité : classe sans école (vacances inconnues) → pas d’alerte', async () => {
			const classe = await nouvelleClasse();
			const eleve = await nouvelEleve('Iris', classe);
			await parentConfirme(eleve.id, `p-iris@${DOMAINE}`);
			await traces(eleve.id, plusJours(aujourdhui(), -40));
			expect(await exceptions(eleve.id)).toEqual([]);
		});

		it('inactivité : moins de 15 jours de classe depuis la rentrée → pas d’alerte', async () => {
			const { ecole } = await nouvelleEcole(5);
			const classe = await nouvelleClasse({}, ecole);
			const eleve = await nouvelEleve('Ilyes', classe);
			await parentConfirme(eleve.id, `p-ilyes@${DOMAINE}`);
			expect(await exceptions(eleve.id)).toEqual([]);
		});

		it('rien sans adresse confirmée, partage coupé ou classe sans carnet', async () => {
			const sansAdresse = await nouvelEleve('Jade', classId);
			const coupe = await nouvelEleve('Kylian', classId);
			await parentConfirme(coupe.id, `p-kylian@${DOMAINE}`);
			await couperPartage(coupe.id);
			const eteint = await nouvelEleve('Lou', classeEteinte);
			await parentConfirme(eteint.id, `p-lou@${DOMAINE}`);
			// Tous trois inactifs : ce serait une exception
			expect(await exceptions(sansAdresse.id)).toEqual([]);
			expect(await exceptions(coupe.id)).toEqual([]);
			expect(await exceptions(eteint.id)).toEqual([]);
		});
	});

	describe('épisodes et plan d’envoi (E2, E7, Q19, Q33)', () => {
		it('un épisode par parent, signalé une fois, fermé quand l’exception disparaît, rouvert si elle revient', async () => {
			const eleve = await nouvelEleve('Maëlys', classId);
			const p1 = await parentConfirme(eleve.id, `p-maelys1@${DOMAINE}`);
			const p2 = await parentConfirme(eleve.id, `p-maelys2@${DOMAINE}`);
			// Inactif : une exception
			await synchroniser();
			await synchroniser();
			expect((await episodes(p1.contactId)).map((e) => e.reason)).toEqual(['inactivity']);
			expect((await episodes(p2.contactId)).map((e) => e.reason)).toEqual(['inactivity']);

			const ligne = await plan(p1.contactId);
			expect(ligne?.reasons).toEqual(['inactivity']);
			expect(ligne?.firstname).toBe('Maëlys');
			expect(ligne?.email).toBe(`p-maelys1@${DOMAINE}`);
			expect(ligne?.inactivity_days).toBe(15);

			// Signalé : plus dans le plan, même après le plafond
			const { data: marques, error } = await service
				.from('parent_exception_episodes')
				.update({ notified_at: new Date().toISOString() })
				.in('id', ligne!.episode_ids)
				.select('id');
			if (error) throw new Error(error.message);
			expect(marques).toHaveLength(1);
			await synchroniser();
			expect(await plan(p1.contactId)).toBeUndefined();

			// L'élève travaille : l'épisode se ferme
			await actifAujourdhui(eleve.id);
			await synchroniser();
			const fermes = await episodes(p1.contactId);
			expect(fermes).toHaveLength(1);
			expect(fermes[0].closed_at).not.toBeNull();

			// L'exception revient : nouvel épisode
			await service.from('skill_attempts').delete().eq('student_id', eleve.id);
			await synchroniser();
			const rouverts = await episodes(p1.contactId);
			expect(rouverts).toHaveLength(2);
			expect(rouverts[1].closed_at).toBeNull();
			expect(rouverts[1].notified_at).toBeNull();
		});

		it('plafond : rien si un courriel d’exception ou trimestriel est parti depuis 7 jours ; un lien ne compte pas', async () => {
			const eleve = await nouvelEleve('Nolan', classId);
			const p = await parentConfirme(eleve.id, `p-nolan@${DOMAINE}`);
			await synchroniser();
			await journal(eleve.id, p.contactId, 'link', ilYA(1));
			expect((await plan(p.contactId))?.reasons).toEqual(['inactivity']);

			await journal(eleve.id, p.contactId, 'exception', ilYA(3));
			expect(await plan(p.contactId)).toBeUndefined();

			const autre = await nouvelEleve('Oriane', classId);
			const q = await parentConfirme(autre.id, `p-oriane@${DOMAINE}`);
			await synchroniser();
			await journal(autre.id, q.contactId, 'quarterly', ilYA(2));
			expect(await plan(q.contactId)).toBeUndefined();

			// Après 7 jours, la semaine est passée : le courriel regroupe ce qui est ouvert
			const vieux = await nouvelEleve('Paloma', classId);
			const r = await parentConfirme(vieux.id, `p-paloma@${DOMAINE}`);
			await carte(vieux.id, ilYA(9), true);
			await synchroniser();
			await journal(vieux.id, r.contactId, 'exception', ilYA(8));
			expect((await plan(r.contactId))?.reasons).toEqual(['inactivity', 'reviews_overdue']);
		});

		it('« ne plus recevoir » : aucun épisode ouvert, aucun envoi (E7)', async () => {
			const eleve = await nouvelEleve('Quentin', classId);
			const p = await parentConfirme(eleve.id, `p-quentin@${DOMAINE}`);
			await synchroniser();
			expect(await episodes(p.contactId)).toHaveLength(1);

			const { data, error } = await service
				.from('parent_contacts')
				.update({ emails_stopped_at: new Date().toISOString() })
				.eq('id', p.contactId)
				.select('id');
			if (error) throw new Error(error.message);
			expect(data).toHaveLength(1);
			await synchroniser();
			expect((await episodes(p.contactId))[0].closed_at).not.toBeNull();
			expect(await plan(p.contactId)).toBeUndefined();
		});

		it('vacances aujourd’hui : seules les évaluations non faites partent (E3)', async () => {
			const { ecole } = await nouvelleEcole(80, [{ du: -2, au: 5 }]);
			const classe = await nouvelleClasse({}, ecole);
			const eleve = await nouvelEleve('Romane', classe);
			const p = await parentConfirme(eleve.id, `p-romane@${DOMAINE}`);
			await actifAujourdhui(eleve.id);
			await carte(eleve.id, ilYA(12), true);
			await evaluation('Échéance pendant les vacances', ilYA(1), { class_id: classe });
			await synchroniser();
			expect((await episodes(p.contactId)).map((e) => e.reason).sort()).toEqual([
				'evaluation_missed',
				'reviews_overdue'
			]);
			expect((await plan(p.contactId))?.reasons).toEqual(['evaluation_missed']);
		});
	});

	describe('jeton d’un courriel (Q38)', () => {
		it('ouvre le carnet et arrête les courriels tant que l’adresse a un lien actif', async () => {
			const eleve = await nouvelEleve('Sacha', classId);
			const p = await parentConfirme(eleve.id, `p-sacha@${DOMAINE}`);
			const jeton = nouveauJeton();
			await journal(eleve.id, p.contactId, 'exception', ilYA(0), sha256(jeton));

			const { data: carnet, error } = await service.rpc('get_carnet_by_token', {
				p_token: jeton
			});
			if (error) throw new Error(error.message);
			expect((carnet as { firstname: string }).firstname).toBe('Sacha');

			const { data: arret } = await service.rpc('set_parent_emails_stopped', {
				p_token: jeton,
				p_stopped: true
			});
			expect(arret).toBe(true);
			const { data: contact } = await service
				.from('parent_contacts')
				.select('emails_stopped_at')
				.eq('id', p.contactId)
				.single();
			expect((contact as { emails_stopped_at: string | null }).emails_stopped_at).not.toBeNull();

			// Le lien du parent révoqué : le jeton du courriel meurt avec lui
			const { data: revoques } = await service
				.from('parent_carnet_links')
				.update({ revoked_at: new Date().toISOString() })
				.eq('contact_id', p.contactId)
				.is('revoked_at', null)
				.select('id');
			expect(revoques).toHaveLength(1);
			const { data: mort } = await service.rpc('get_carnet_by_token', { p_token: jeton });
			expect(mort).toBeNull();
			const { data: arretMort } = await service.rpc('set_parent_emails_stopped', {
				p_token: jeton,
				p_stopped: false
			});
			expect(arretMort).toBe(false);
		});

		it('partage coupé : le jeton du courriel n’ouvre rien', async () => {
			const eleve = await nouvelEleve('Timéo', classId);
			const p = await parentConfirme(eleve.id, `p-timeo@${DOMAINE}`);
			const jeton = nouveauJeton();
			await journal(eleve.id, p.contactId, 'exception', ilYA(0), sha256(jeton));
			await couperPartage(eleve.id);
			const { data } = await service.rpc('get_carnet_by_token', { p_token: jeton });
			expect(data).toBeNull();
		});

		it('adresse retirée puis ressaisie : les anciens courriels ne revivent pas avec le lien neuf', async () => {
			const eleve = await nouvelEleve('Tess', classId);
			const p = await parentConfirme(eleve.id, `p-tess@${DOMAINE}`);
			const ancien = nouveauJeton();
			await journal(eleve.id, p.contactId, 'exception', ilYA(1), sha256(ancien));

			// Retrait (le trigger révoque le lien) : le jeton meurt
			const { data: retire } = await service
				.from('parent_contacts')
				.update({ status: 'removed', email: null })
				.eq('id', p.contactId)
				.select('id');
			expect(retire).toHaveLength(1);
			expect((await service.rpc('get_carnet_by_token', { p_token: ancien })).data).toBeNull();

			// Ressaisie sur la MÊME ligne, reconfirmée, lien neuf
			const { data: ressaisie } = await service
				.from('parent_contacts')
				.update({ status: 'confirmed', email: `p-tess@${DOMAINE}` })
				.eq('id', p.contactId)
				.select('id');
			expect(ressaisie).toHaveLength(1);
			const lienNeuf = nouveauJeton();
			const { data: emis } = await service.rpc('issue_parent_carnet_link', {
				p_contact_id: p.contactId,
				p_token_hash: sha256(lienNeuf),
				p_expires_at: new Date(Date.now() + 30 * JOUR).toISOString()
			});
			expect(emis).toBe(true);

			expect((await service.rpc('get_carnet_by_token', { p_token: lienNeuf })).data).not.toBeNull();
			expect((await service.rpc('get_carnet_by_token', { p_token: ancien })).data).toBeNull();
			const { data: arret } = await service.rpc('set_parent_emails_stopped', {
				p_token: ancien,
				p_stopped: true
			});
			expect(arret).toBe(false);
		});

		it('une confirmation ne porte jamais de jeton', async () => {
			const eleve = await nouvelEleve('Ugo', classId);
			const p = await parentConfirme(eleve.id, `p-ugo@${DOMAINE}`);
			const { error } = await service.from('parent_notifications').insert({
				student_id: eleve.id,
				contact_id: p.contactId,
				kind: 'confirmation',
				status: 'sent',
				access_token_hash: sha256(nouveauJeton())
			});
			expect(error?.code).toBe('23514');
		});

		it('l’empreinte du jeton n’est lisible ni par le professeur ni par l’élève', async () => {
			const eleve = await nouvelEleve('Ulysse', classId);
			const p = await parentConfirme(eleve.id, `p-ulysse@${DOMAINE}`);
			await journal(eleve.id, p.contactId, 'exception', ilYA(0), sha256(nouveauJeton()));

			const prof = await teacher
				.from('parent_notifications')
				.select('access_token_hash')
				.eq('student_id', eleve.id);
			expect(prof.error?.code).toBe('42501');
			const client = await eleve.client();
			const lui = await client.from('parent_notifications').select('access_token_hash');
			expect(lui.error?.code).toBe('42501');
			// Les colonnes utiles restent lisibles (page de l'élève)
			const utiles = await client.from('parent_notifications').select('created_at, kind, reasons');
			expect(utiles.data).toHaveLength(1);
		});

		it('les épisodes et les fonctions du cron sont fermés aux comptes', async () => {
			const eleve = await nouvelEleve('Victoire', classId);
			const p = await parentConfirme(eleve.id, `p-victoire@${DOMAINE}`);
			await synchroniser();
			expect(await episodes(p.contactId)).toHaveLength(1);

			for (const client of [anonClient(), teacher, await eleve.client()]) {
				const lecture = await client.from('parent_exception_episodes').select('id');
				expect(lecture.error?.code).toBe('42501');
				for (const fn of [
					'carnet_current_exceptions',
					'carnet_sync_exception_episodes',
					'carnet_exception_plan',
					'carnet_quarterly_plan',
					'carnet_erase_orphan_contacts',
					'carnet_erase_old_notifications'
				]) {
					const appel = await client.rpc(fn);
					expect(appel.error?.code, fn).toBe('42501');
				}
			}
		});
	});

	describe('Q27 : évaluation sans échéance', () => {
		it('reste dans le carnet tant qu’elle n’est pas faite, même ancienne', async () => {
			const eleve = await nouvelEleve('William', classId);
			const p = await parentConfirme(eleve.id, `p-william@${DOMAINE}`);
			await evaluation('Ancienne non faite', null, { class_id: classId }, ilYA(60));
			const faite = await evaluation('Ancienne faite', null, { class_id: classId }, ilYA(60));
			await rendue(eleve.id, faite);
			const { data, error } = await service.rpc('get_carnet_by_token', { p_token: p.jeton });
			if (error) throw new Error(error.message);
			const titres = (data as { evaluations: { title: string }[] }).evaluations.map((e) => e.title);
			expect(titres).toContain('Ancienne non faite');
			expect(titres).not.toContain('Ancienne faite');
		});
	});

	describe('Q27 bornée à l’année scolaire', () => {
		it('une évaluation sans échéance d’avant la rentrée ne reste pas, même non faite', async () => {
			// Rentrée de la classe commune : il y a 80 jours
			const eleve = await nouvelEleve('Xavier', classId);
			const p = await parentConfirme(eleve.id, `p-xavier@${DOMAINE}`);
			await evaluation('Année passée non faite', null, { class_id: classId }, ilYA(200));
			await evaluation('Cette année non faite', null, { class_id: classId }, ilYA(70));
			// Préparée l'été, 10 jours avant la rentrée : de l'année en cours
			await evaluation('Préparée l’été', null, { class_id: classId }, ilYA(90));
			const titres = await titresDuCarnet(p.jeton);
			expect(titres).toContain('Cette année non faite');
			expect(titres).toContain('Préparée l’été');
			expect(titres).not.toContain('Année passée non faite');
		});
	});

	describe('arrivée en cours d’année (Q43)', () => {
		it('inactivité : comptée depuis l’arrivée dans la classe, pas depuis la rentrée', async () => {
			const nouveau = await nouvelEleve('Yanis', classId, 5);
			await parentConfirme(nouveau.id, `p-yanis@${DOMAINE}`);
			// Membre depuis longtemps d'une classe SANS carnet : ignorée
			const { error } = await service.from('class_members').insert({
				class_id: classeEteinte,
				student_id: nouveau.id,
				status: 'active',
				joined_at: ilYA(400)
			});
			if (error) throw new Error(error.message);
			expect(await exceptions(nouveau.id)).toEqual([]);

			// Arrivé il y a 20 jours, rien fait : l'alerte part
			const ancien = await nouvelEleve('Yvonne', classId, 20);
			await parentConfirme(ancien.id, `p-yvonne@${DOMAINE}`);
			expect((await exceptions(ancien.id)).map((e) => e.reason)).toEqual(['inactivity']);
		});

		it('évaluation non faite : seulement si l’échéance suit l’arrivée', async () => {
			const classe = await nouvelleClasse();
			const eleve = await nouvelEleve('Zelie', classe, 3);
			await parentConfirme(eleve.id, `p-zelie@${DOMAINE}`);
			await actifAujourdhui(eleve.id);
			await evaluation('Échue avant l’arrivée', ilYA(5), { class_id: classe });
			const apres = await evaluation('Échue après l’arrivée', ilYA(1), { class_id: classe });
			expect(await exceptions(eleve.id)).toEqual([
				{ student_id: eleve.id, reason: 'evaluation_missed', evaluation_id: apres }
			]);
		});

		it('carnet : ni les semaines ni les évaluations échues d’avant l’arrivée', async () => {
			const classe = await nouvelleClasse({}, (await nouvelleEcole(80)).ecole);
			// Arrivée il y a 10 jours : la semaine de l'arrivée et les suivantes
			const eleve = await nouvelEleve('Zoran', classe, 10);
			const p = await parentConfirme(eleve.id, `p-zoran@${DOMAINE}`);
			await evaluation('Échue avant', ilYA(12), { class_id: classe });
			await evaluation('Échue après', ilYA(2), { class_id: classe });
			await evaluation('À venir', new Date(Date.now() + 3 * JOUR).toISOString(), {
				class_id: classe
			});
			// Sans échéance, créée avant l'arrivée : il peut encore la faire
			await evaluation('Sans échéance', null, { class_id: classe }, ilYA(30));

			const { data, error } = await service.rpc('get_carnet_by_token', { p_token: p.jeton });
			if (error) throw new Error(error.message);
			const carnet = data as { weeks: { week_start: string }[]; evaluations: { title: string }[] };
			const arrivee = jourDeParis(new Date(Date.now() - 10 * JOUR));
			const lundiArrivee = plusJours(
				arrivee,
				-((new Date(`${arrivee}T12:00:00Z`).getUTCDay() + 6) % 7)
			);
			expect(carnet.weeks.length).toBeGreaterThan(0);
			for (const w of carnet.weeks) expect(w.week_start >= lundiArrivee, w.week_start).toBe(true);
			expect(carnet.weeks[0].week_start).toBe(lundiArrivee);
			expect(carnet.evaluations.map((e) => e.title).sort()).toEqual(
				['Sans échéance', 'Échue après', 'À venir'].sort()
			);
		});
	});

	describe('message trimestriel (E4, Q34)', () => {
		async function trimestriel(contactId: string): Promise<QuarterlyRow | undefined> {
			const { data, error } = await service.rpc('carnet_quarterly_plan');
			if (error) throw new Error(`carnet_quarterly_plan : ${error.message}`);
			return (data as QuarterlyRow[]).find((r) => r.contact_id === contactId);
		}

		it('le lendemain de la fin du trimestre, seulement s’il y a du vrai à dire', async () => {
			// Trimestre de J-63 à J-3, sans vacances
			const { ecole } = await nouvelleEcole(70, [], [{ du: -63, au: -3 }]);
			const classe = await nouvelleClasse({}, ecole);

			const regulier = await nouvelEleve('Xavier', classe);
			const p1 = await parentConfirme(regulier.id, `p-xavier@${DOMAINE}`);
			for (let j = -63; j <= -3; j += 7) await traces(regulier.id, plusJours(aujourdhui(), j));

			const aJour = await nouvelEleve('Yasmine', classe);
			const p2 = await parentConfirme(aJour.id, `p-yasmine@${DOMAINE}`);
			await carte(aJour.id, new Date(Date.now() + 3 * JOUR).toISOString(), true);

			const rien = await nouvelEleve('Zoé', classe);
			const p3 = await parentConfirme(rien.id, `p-zoe@${DOMAINE}`);
			await traces(rien.id, plusJours(aujourdhui(), -40));
			await carte(rien.id, ilYA(2), true);

			expect(await trimestriel(p1.contactId)).toMatchObject({
				regular: true,
				reviews_up_to_date: false
			});
			expect(await trimestriel(p2.contactId)).toMatchObject({
				regular: false,
				reviews_up_to_date: true
			});
			expect(await trimestriel(p3.contactId)).toBeUndefined();

			// Déjà parti après la fin du trimestre : plus rien
			await journal(regulier.id, p1.contactId, 'quarterly', ilYA(8));
			expect(await trimestriel(p1.contactId)).toMatchObject({ regular: true });
			await journal(regulier.id, p1.contactId, 'quarterly', ilYA(1));
			expect(await trimestriel(p1.contactId)).toBeUndefined();
		});

		it('déjà parti après la fin du trimestre : plus rien, même hors du plafond', async () => {
			// Trimestre fini à J-20, message parti à J-10 : le plafond (7 jours) ne
			// le bloque plus, seule la règle « déjà parti » joue.
			const { ecole } = await nouvelleEcole(90, [], [{ du: -80, au: -20 }]);
			const classe = await nouvelleClasse({}, ecole);
			const eleve = await nouvelEleve('Bérénice', classe);
			const p = await parentConfirme(eleve.id, `p-berenice@${DOMAINE}`);
			await carte(eleve.id, new Date(Date.now() + 3 * JOUR).toISOString(), true);
			expect(await trimestriel(p.contactId)).toMatchObject({ reviews_up_to_date: true });
			await journal(eleve.id, p.contactId, 'quarterly', ilYA(10));
			expect(await trimestriel(p.contactId)).toBeUndefined();
		});

		it('rien si la classe l’éteint, ni pendant les vacances', async () => {
			const { ecole } = await nouvelleEcole(70, [], [{ du: -63, au: -3 }]);
			const eteinte = await nouvelleClasse({ quarterly_message: false }, ecole);
			const a = await nouvelEleve('Adèle', eteinte);
			const pa = await parentConfirme(a.id, `p-adele@${DOMAINE}`);
			await carte(a.id, new Date(Date.now() + 3 * JOUR).toISOString(), true);
			expect(await trimestriel(pa.contactId)).toBeUndefined();

			const { ecole: e2 } = await nouvelleEcole(70, [{ du: -2, au: 6 }], [{ du: -63, au: -3 }]);
			const enVacances = await nouvelleClasse({}, e2);
			const b = await nouvelEleve('Bastien', enVacances);
			const pb = await parentConfirme(b.id, `p-bastien@${DOMAINE}`);
			await carte(b.id, new Date(Date.now() + 3 * JOUR).toISOString(), true);
			expect(await trimestriel(pb.contactId)).toBeUndefined();
		});
	});

	describe('effacement des adresses (Q21, Q35)', () => {
		it('élève sans classe active : marqué, puis effacé après 90 jours ; revenu : marque retirée', async () => {
			const classe = await nouvelleClasse();
			const parti = await nouvelEleve('Camille', classe);
			const p = await parentConfirme(parti.id, `p-camille@${DOMAINE}`);
			await journal(parti.id, p.contactId, 'link', ilYA(1));
			const revenu = await nouvelEleve('Diane', classe);
			const q = await parentConfirme(revenu.id, `p-diane@${DOMAINE}`);
			const reste = await nouvelEleve('Emile', classId);
			const r = await parentConfirme(reste.id, `p-emile@${DOMAINE}`);

			const { data: archives } = await service
				.from('class_members')
				.update({ status: 'archived' })
				.eq('class_id', classe)
				.select('student_id');
			expect(archives).toHaveLength(2);

			const premier = await service.rpc('carnet_erase_orphan_contacts');
			expect(premier.error).toBeNull();
			const marques = await service
				.from('parent_contacts')
				.select('id, orphaned_since')
				.in('id', [p.contactId, q.contactId, r.contactId]);
			const parId = new Map(
				(marques.data as { id: string; orphaned_since: string | null }[]).map((m) => [
					m.id,
					m.orphaned_since
				])
			);
			expect(parId.get(p.contactId)).toBe(aujourdhui());
			expect(parId.get(q.contactId)).toBe(aujourdhui());
			expect(parId.get(r.contactId)).toBeNull();

			// Diane rejoint une classe active : marque retirée
			const { error: eRetour } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: revenu.id, status: 'active' });
			if (eRetour) throw new Error(eRetour.message);
			// Camille : orpheline depuis 91 jours
			await service
				.from('parent_contacts')
				.update({ orphaned_since: plusJours(aujourdhui(), -91) })
				.eq('id', p.contactId);

			const second = await service.rpc('carnet_erase_orphan_contacts');
			expect(second.data).toBeGreaterThanOrEqual(1);

			const apres = await service
				.from('parent_contacts')
				.select('id, orphaned_since')
				.in('id', [p.contactId, q.contactId]);
			expect(apres.data).toEqual([{ id: q.contactId, orphaned_since: null }]);
			const liens = await service
				.from('parent_carnet_links')
				.select('id')
				.eq('contact_id', p.contactId);
			expect(liens.data).toEqual([]);
			const traces = await service
				.from('parent_notifications')
				.select('contact_id, kind')
				.eq('student_id', parti.id);
			expect(traces.data).toEqual([{ contact_id: null, kind: 'link' }]);
		});
	});

	describe('effacement du journal des courriels (Q42)', () => {
		it('efface les courriels de plus d’un an, quelle que soit leur nature, et garde les autres', async () => {
			const eleve = await nouvelEleve('Fanny', classId);
			const p = await parentConfirme(eleve.id, `p-fanny@${DOMAINE}`);
			await journal(eleve.id, p.contactId, 'link', ilYA(400));
			await journal(eleve.id, p.contactId, 'quarterly', ilYA(367));
			await insertId('parent_notifications', {
				student_id: eleve.id,
				contact_id: null,
				kind: 'exception',
				status: 'failed',
				reasons: ['inactivity'],
				created_at: ilYA(380)
			});
			await journal(eleve.id, p.contactId, 'exception', ilYA(360));
			await journal(eleve.id, p.contactId, 'confirmation', ilYA(1));

			const { data, error } = await service.rpc('carnet_erase_old_notifications');
			expect(error).toBeNull();
			expect(data).toBeGreaterThanOrEqual(3);

			const restes = await service
				.from('parent_notifications')
				.select('kind')
				.eq('student_id', eleve.id)
				.order('created_at');
			expect(restes.data).toEqual([{ kind: 'exception' }, { kind: 'confirmation' }]);
			// L'adresse et le lien du parent ne bougent pas
			const contact = await service.from('parent_contacts').select('id').eq('id', p.contactId);
			expect(contact.data).toHaveLength(1);
		});
	});
});
