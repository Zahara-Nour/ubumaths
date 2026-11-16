/**
 * Carnet de liaison (nécessite une base locale)
 * =============================================
 *
 * ADR 0040, chantier `partage-parents` (docs/wip/partage-parents-progress.md).
 *
 * Le carnet est la page d'UN parent sur UN élève, lue SANS COMPTE par un lien
 * qui lui est propre (stocké haché). Ces tests portent surtout sur « qu'est-ce
 * que ça n'ouvre pas » :
 *
 *  - aucune des tables du carnet n'est lisible par `anon` ni par un élève ;
 *    les adresses ne sont lisibles que par le professeur ;
 *  - les fonctions qui reçoivent un lien ne sont appelables que par le service
 *    role (le serveur) : ni `anon`, ni un compte connecté ;
 *  - un lien valide rend, pour un seul élève : le palier de régularité de 5
 *    semaines (règle de la grille du prof), le nombre de révisions en retard
 *    (cartes déjà vues, échéance dépassée), les évaluations faites ou non SANS
 *    note, les liens du cahier et du cours de sa classe — rien d'autre ;
 *  - révoqué, expiré, inexistant, adresse non confirmée, carnet de la classe
 *    désactivé, partage coupé, élève sorti de la classe : la MÊME réponse (null) ;
 *  - deux adresses actives au plus ; « je ne suis pas le parent » efface
 *    l'adresse et interdit de la ressaisir ;
 *  - couper le partage révoque les liens (relu en service role : la RLS échoue
 *    en silence).
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
interface CarnetPayload {
	firstname: string | null;
	weeks: { week_start: string; level: string; holiday: boolean }[];
	revisions: { overdue: number };
	evaluations: { title: string; deadline: string | null; done: boolean }[];
	classes: { name: string; journal_token: string | null; course_token: string | null }[];
	emails_stopped?: boolean;
}

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const TABLES = [
	'class_carnet_settings',
	'parent_contacts',
	'parent_carnet_links',
	'student_carnet_opt_outs',
	'parent_notifications'
] as const;
const COURSE_TOKEN = 'CoursCarnetLiaison01';
const JOURNAL_TOKEN = 'CahierCarnetLiais01';
const DOMAINE = 'example.test';
// Client non typé : les tables du carnet n'entrent dans `database.ts` qu'après
// `db:migrate` + `db:types` (PR suivante).
const service = createServiceRoleClient() as unknown as SupabaseClient;

// Variables
let templateId: string;
let teacherId: string;
let teacher: SupabaseClient;
let eleveA: { id: string; client: SupabaseClient };
let eleveB: { id: string; client: SupabaseClient };
let classId: string;
let classeEteinte: string;
let evaluationFaite: string;
let evaluationNonFaite: string;
let evaluationAutreClasse: string;

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

async function nouvelEleve(
	prenom: string,
	classe: string
): Promise<{
	id: string;
	client: SupabaseClient;
}> {
	const profil = await TestData.profile().withRole('student').create();
	const { error: e1 } = await service
		.from('profiles')
		.update({ firstname: prenom, lastname: 'Nomdefamille' })
		.eq('id', profil.id);
	if (e1) throw new Error(e1.message);
	const { error: e2 } = await service
		.from('class_members')
		.insert({ class_id: classe, student_id: profil.id, status: 'active' });
	if (e2) throw new Error(e2.message);
	return { id: profil.id, client: await clientFor(profil.email!) };
}

/** Rentrée par défaut (classe sans école) : le 1er septembre écoulé */
function premierSeptembre(jour: string): string {
	const annee = Number(jour.slice(0, 4));
	const cette = `${annee}-09-01`;
	return cette <= jour ? cette : `${annee - 1}-09-01`;
}

/** Les 5 lundis du carnet qui touchent la rentrée ou après */
function semainesAttendues(jour: string, rentree: string): string[] {
	return [-4, -3, -2, -1, 0].map((s) => lundi(jour, s)).filter((l) => plusJours(l, 6) >= rentree);
}

/** Jour de Paris (AAAA-MM-JJ) d'un instant */
function jourDeParis(d: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
}

/** Lundi (jour de Paris) de la semaine qui contient `jour`, décalé de `semaines` */
function lundi(jour: string, semaines = 0): string {
	const d = new Date(`${jour}T12:00:00Z`);
	const isodow = ((d.getUTCDay() + 6) % 7) + 1;
	d.setUTCDate(d.getUTCDate() - (isodow - 1) + 7 * semaines);
	return d.toISOString().slice(0, 10);
}

function plusJours(jour: string, n: number): string {
	const d = new Date(`${jour}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

async function traces(
	eleve: string,
	jour: string,
	nombre: number,
	place = 'typing',
	source = 'auto'
) {
	const rows = Array.from({ length: nombre }, () => ({
		student_id: eleve,
		template_id: templateId,
		success: true,
		source,
		place,
		created_at: `${jour}T10:00:00Z`
	}));
	const { error } = await service.from('skill_attempts').insert(rows);
	if (error) throw new Error(error.message);
}

/** Adresse confirmée + lien actif ; rend le jeton en clair */
async function parentConfirme(
	eleve: string,
	email: string,
	lien: { expiresAt?: string } = {}
): Promise<{ contactId: string; jeton: string }> {
	const contactId = await insertId('parent_contacts', {
		student_id: eleve,
		email,
		status: 'confirmed',
		confirmed_at: new Date().toISOString(),
		source: 'teacher'
	});
	const jeton = nouveauJeton();
	const { error } = await service.rpc('issue_parent_carnet_link', {
		p_contact_id: contactId,
		p_token_hash: sha256(jeton),
		p_expires_at: lien.expiresAt ?? new Date(Date.now() + 30 * 86_400_000).toISOString()
	});
	if (error) throw new Error(`issue_parent_carnet_link : ${error.message}`);
	return { contactId, jeton };
}

async function lireCarnet(jeton: string | null): Promise<CarnetPayload | null> {
	const { data, error } = await service.rpc('get_carnet_by_token', { p_token: jeton });
	if (error) throw new Error(`get_carnet_by_token : ${error.message}`);
	return data as CarnetPayload | null;
}

/** Toutes les clés d'un JSON, à toute profondeur */
function cles(valeur: unknown, acc = new Set<string>()): Set<string> {
	if (Array.isArray(valeur)) valeur.forEach((v) => cles(v, acc));
	else if (valeur && typeof valeur === 'object') {
		for (const [k, v] of Object.entries(valeur)) {
			acc.add(k);
			cles(v, acc);
		}
	}
	return acc;
}

async function purger(): Promise<void> {
	await service.from('class_course_share_tokens').delete().in('token', [COURSE_TOKEN]);
	await service.from('class_journal_share_tokens').delete().in('token', [JOURNAL_TOKEN]);
}

// Tests
describe('carnet de liaison (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		await purger();
		const prof = await TestData.profile().withRole('teacher').create();
		teacherId = prof.id;
		teacher = await clientFor(prof.email!);
		templateId = await createFakeTemplate(service, prof.id);

		classId = (await TestData.class().withName('4e Carnet').create()).id;
		classeEteinte = (await TestData.class().withName('4e Sans carnet').create()).id;
		const { error: eReglage } = await service.from('class_carnet_settings').insert([
			{ class_id: classId, enabled: true },
			{ class_id: classeEteinte, enabled: false }
		]);
		if (eReglage) throw new Error(eReglage.message);

		eleveA = await nouvelEleve('Alix', classId);
		eleveB = await nouvelEleve('Basile', classId);

		// Régularité : semaine dernière 2 jours actifs (palier 2-3), il y a deux
		// semaines 1 jour actif + 1 jour à 4 traces (palier 1), une trace de
		// contrôle ne compte pas.
		const aujourdhui = jourDeParis(new Date());
		const s1 = lundi(aujourdhui, -1);
		const s2 = lundi(aujourdhui, -2);
		await traces(eleveA.id, s1, 5);
		await traces(eleveA.id, plusJours(s1, 2), 6);
		await traces(eleveA.id, s2, 5);
		await traces(eleveA.id, plusJours(s2, 1), 4);
		await traces(eleveA.id, plusJours(s2, 1), 3, 'evaluation');
		// Traces posées par le professeur : pas du travail autonome (semaine -3).
		await traces(eleveA.id, lundi(aujourdhui, -3), 6, 'typing', 'teacher');
		// A est aussi membre d'une classe SANS carnet : ni son nom ni ses
		// évaluations ne doivent apparaître.
		const { error: eMembre } = await service
			.from('class_members')
			.insert({ class_id: classeEteinte, student_id: eleveA.id, status: 'active' });
		if (eMembre) throw new Error(eMembre.message);
		// L'élève B travaille beaucoup : rien ne doit fuir dans le carnet de A.
		await traces(eleveB.id, s1, 9);
		await traces(eleveB.id, plusJours(s1, 1), 9);
		await traces(eleveB.id, plusJours(s1, 3), 9);
		await traces(eleveB.id, plusJours(s1, 4), 9);

		// Révisions : 2 en retard (vues, échéance passée), 1 vue à échéance
		// future, 1 jamais vue (échéance « maintenant », pas un retard), et 3 en
		// retard pour B.
		const avant = (jours: number) => new Date(Date.now() - jours * 86_400_000).toISOString();
		const apres = new Date(Date.now() + 5 * 86_400_000).toISOString();
		const carte = (user: string, n: number, next: string, last: string | null) => ({
			user_id: user,
			card_reference_type: 'custom',
			card_reference_id: crypto.randomUUID(),
			next_review: next,
			last_review: last,
			state: last ? 'review' : 'new',
			stability: 1,
			difficulty: 5,
			total_reviews: last ? n : 0,
			review_history: []
		});
		const { error: eCartes } = await service.from('srs_card_stats').insert([
			carte(eleveA.id, 2, avant(3), avant(10)),
			carte(eleveA.id, 3, avant(9), avant(20)),
			carte(eleveA.id, 1, apres, avant(1)),
			carte(eleveA.id, 0, avant(2), null),
			// Échéance passée AUJOURD'HUI (jour de Paris) : pas encore un retard
			carte(eleveA.id, 2, new Date(Date.now() - 60_000).toISOString(), avant(4)),
			carte(eleveB.id, 1, avant(4), avant(8)),
			carte(eleveB.id, 1, avant(4), avant(8)),
			carte(eleveB.id, 1, avant(4), avant(8))
		]);
		if (eCartes) throw new Error(eCartes.message);

		// Évaluations publiées assignées à la classe : une faite (notée 18), une
		// non faite ; une troisième assignée à une autre classe.
		const serie = (titre: string) =>
			insertId('series', {
				title: titre,
				grade: '4',
				items: [{ templateId, quantity: 1, delay: 20 }],
				created_by: teacherId
			});
		const evaluation = async (titre: string, deadline: string, status = 'published') =>
			insertId('evaluations', {
				series_id: await serie(titre),
				form: 'interactive',
				status,
				deadline,
				created_by: teacherId
			});
		evaluationFaite = await evaluation('Contrôle fractions', avant(2));
		evaluationNonFaite = await evaluation('Contrôle puissances', avant(1));
		evaluationAutreClasse = await evaluation('Contrôle autre classe', apres);
		for (const [ev, cl] of [
			[evaluationFaite, classId],
			[evaluationNonFaite, classId],
			[evaluationAutreClasse, classeEteinte]
		]) {
			await insertId('evaluation_assignments', {
				evaluation_id: ev,
				class_id: cl,
				assigned_by: teacherId
			});
		}
		// Un brouillon assigné à la classe : invisible. Une évaluation assignée
		// à A seul : visible.
		const brouillon = await evaluation('Contrôle brouillon', apres, 'draft');
		await insertId('evaluation_assignments', {
			evaluation_id: brouillon,
			class_id: classId,
			assigned_by: teacherId
		});
		const individuelle = await evaluation('Contrôle individuel', apres);
		await insertId('evaluation_assignments', {
			evaluation_id: individuelle,
			student_id: eleveA.id,
			assigned_by: teacherId
		});
		// B a rendu « puissances » ; A l'a commencé sans le rendre : pas fait.
		await insertId('test_sessions', {
			user_id: eleveB.id,
			evaluation_id: evaluationNonFaite,
			mode: 'interactive',
			items: [],
			total_questions: 1,
			grade: 12,
			points_earned: 1,
			completed_at: avant(1)
		});
		await insertId('test_sessions', {
			user_id: eleveA.id,
			evaluation_id: evaluationNonFaite,
			mode: 'interactive',
			items: [],
			total_questions: 1,
			completed_at: null
		});
		await insertId('test_sessions', {
			user_id: eleveA.id,
			evaluation_id: evaluationFaite,
			mode: 'interactive',
			items: [],
			total_questions: 1,
			grade: 18,
			score: 90,
			points_earned: 1,
			completed_at: avant(3)
		});

		// Liens de la classe
		const { error: eCours } = await service.from('class_course_share_tokens').insert({
			class_id: classId,
			token: COURSE_TOKEN,
			expires_at: apres
		});
		if (eCours) throw new Error(eCours.message);
		const { error: eCahier } = await service.from('class_journal_share_tokens').insert({
			class_id: classId,
			token: JOURNAL_TOKEN,
			expires_at: apres
		});
		if (eCahier) throw new Error(eCahier.message);
	}, 180_000);

	afterAll(async () => {
		await purger();
		await service.from('skill_attempts').delete().eq('template_id', templateId);
		await service.from('class_carnet_settings').delete().in('class_id', [classId, classeEteinte]);
		await service.from('class_members').delete().in('class_id', [classId, classeEteinte]);
		await service.from('classes').delete().in('id', [classId, classeEteinte]);
		await cleanupAllTestData();
	});

	describe('tables fermées', () => {
		it.each(TABLES)('anon ne lit pas %s', async (table) => {
			const { data, error } = await anonClient().from(table).select('*').limit(1);
			// Refus explicite (42501) ou zéro ligne : jamais une ligne.
			expect(error?.code === '42501' || (data ?? []).length === 0).toBe(true);
		});

		it('un élève ne lit ni les adresses ni les liens de ses parents', async () => {
			const { contactId } = await parentConfirme(eleveA.id, `parent-a1@${DOMAINE}`);
			const contacts = await eleveA.client.from('parent_contacts').select('id');
			expect(contacts.error?.code === '42501' || (contacts.data ?? []).length === 0).toBe(true);
			const liens = await eleveA.client.from('parent_carnet_links').select('id');
			expect(liens.error?.code === '42501' || (liens.data ?? []).length === 0).toBe(true);
			// Le professeur, lui, les lit — sans aucune empreinte.
			const prof = await teacher.from('parent_contacts').select('id, email').eq('id', contactId);
			expect(prof.data).toEqual([{ id: contactId, email: `parent-a1@${DOMAINE}` }]);
			const empreinte = await teacher.from('parent_contacts').select('email_hash');
			expect(empreinte.error?.code).toBe('42501');
			const jetons = await teacher.from('parent_carnet_links').select('token_hash');
			expect(jetons.error?.code).toBe('42501');
			const etat = await teacher.from('parent_carnet_links').select('id, revoked_at');
			expect(etat.error).toBeNull();
			expect((etat.data ?? []).length).toBeGreaterThan(0);
		});

		it.each([
			['get_carnet_by_token', { p_token: 'x'.repeat(43) }],
			['confirm_parent_contact', { p_token: 'x'.repeat(43) }],
			['refuse_parent_contact', { p_token: 'x'.repeat(43) }],
			['set_parent_emails_stopped', { p_token: 'x'.repeat(43), p_stopped: true }],
			[
				'issue_parent_carnet_link',
				{
					p_contact_id: crypto.randomUUID(),
					p_token_hash: 'a'.repeat(64),
					p_expires_at: new Date().toISOString()
				}
			]
		])('%s est réservée au serveur (anon et élève refusés)', async (fn, args) => {
			for (const client of [anonClient(), eleveA.client]) {
				const { error } = await client.rpc(fn, args);
				expect(error, `${fn} appelable hors serveur`).not.toBeNull();
				expect(['42501', 'PGRST202']).toContain(error!.code);
			}
		});
	});

	describe('lecture par lien', () => {
		it('rend le carnet d’un seul élève, sans note ni donnée personnelle', async () => {
			const { jeton } = await parentConfirme(eleveA.id, `parent-a2@${DOMAINE}`);
			const carnet = await lireCarnet(jeton);
			expect(carnet).not.toBeNull();
			expect(carnet!.firstname).toBe('Alix');

			// 5 semaines, de la plus ancienne à la courante, palier seulement
			const aujourdhui = jourDeParis(new Date());
			const attendues = semainesAttendues(aujourdhui, premierSeptembre(aujourdhui));
			expect(carnet!.weeks.map((w) => w.week_start)).toEqual(attendues);
			const paliers: Record<string, string> = {
				[lundi(aujourdhui, -4)]: '0',
				[lundi(aujourdhui, -3)]: '0',
				[lundi(aujourdhui, -2)]: '1',
				[lundi(aujourdhui, -1)]: '2-3',
				[lundi(aujourdhui, 0)]: '0'
			};
			expect(carnet!.weeks.map((w) => w.level)).toEqual(attendues.map((l) => paliers[l]));

			expect(carnet!.revisions).toEqual({ overdue: 2 });

			const evaluations = [...carnet!.evaluations].sort((x, y) => x.title.localeCompare(y.title));
			expect(evaluations.map((e) => [e.title, e.done])).toEqual([
				['Contrôle fractions', true],
				['Contrôle individuel', false],
				['Contrôle puissances', false]
			]);

			expect(carnet!.classes).toEqual([
				{ name: '4e Carnet', journal_token: JOURNAL_TOKEN, course_token: COURSE_TOKEN }
			]);

			const interdites = ['grade', 'score', 'points_earned', 'email', 'lastname', 'student_id'];
			for (const cle of interdites) expect(cles(carnet).has(cle), cle).toBe(false);
			expect(JSON.stringify(carnet)).not.toContain('Nomdefamille');
		});

		it('la même réponse pour tout lien invalide', async () => {
			const revoque = await parentConfirme(eleveB.id, `parent-b1@${DOMAINE}`);
			// Un second lien pour la même adresse révoque le premier.
			const nouveau = nouveauJeton();
			const { error } = await service.rpc('issue_parent_carnet_link', {
				p_contact_id: revoque.contactId,
				p_token_hash: sha256(nouveau),
				p_expires_at: new Date(Date.now() + 86_400_000).toISOString()
			});
			expect(error).toBeNull();
			expect(await lireCarnet(revoque.jeton)).toBeNull();
			const carnetB = await lireCarnet(nouveau);
			expect(carnetB?.firstname).toBe('Basile');
			const aujourdhui = jourDeParis(new Date());
			expect(carnetB?.weeks.find((w) => w.week_start === lundi(aujourdhui, -1))?.level).toBe('4+');
			expect(carnetB?.revisions).toEqual({ overdue: 3 });

			const expire = await parentConfirme(eleveB.id, `parent-b2@${DOMAINE}`, {
				expiresAt: new Date(Date.now() - 1000).toISOString()
			});
			expect(await lireCarnet(expire.jeton)).toBeNull();
			expect(await lireCarnet(nouveauJeton())).toBeNull();
			expect(await lireCarnet('court')).toBeNull();
			expect(await lireCarnet(null)).toBeNull();
		});

		it('un lien n’est jamais émis pour une adresse non confirmée', async () => {
			const eleve = await nouvelEleve('Camille', classId);
			const contactId = await insertId('parent_contacts', {
				student_id: eleve.id,
				email: `parent-c1@${DOMAINE}`,
				status: 'pending',
				source: 'student'
			});
			const { data, error } = await service.rpc('issue_parent_carnet_link', {
				p_contact_id: contactId,
				p_token_hash: sha256(nouveauJeton()),
				p_expires_at: new Date(Date.now() + 86_400_000).toISOString()
			});
			expect(error).toBeNull();
			expect(data).toBe(false);
			const { count } = await service
				.from('parent_carnet_links')
				.select('id', { count: 'exact', head: true })
				.eq('contact_id', contactId);
			expect(count).toBe(0);
		});

		it('carnet de la classe désactivé ou élève sorti de la classe : null', async () => {
			const eleve = await nouvelEleve('Dominique', classeEteinte);
			const { jeton } = await parentConfirme(eleve.id, `parent-d1@${DOMAINE}`);
			expect(await lireCarnet(jeton)).toBeNull();

			const sortant = await nouvelEleve('Eden', classId);
			const lien = await parentConfirme(sortant.id, `parent-e1@${DOMAINE}`);
			expect(await lireCarnet(lien.jeton)).not.toBeNull();
			const { data } = await service
				.from('class_members')
				.update({ status: 'archived', left_at: new Date().toISOString() })
				.eq('student_id', sortant.id)
				.select('id');
			expect(data).toHaveLength(1);
			expect(await lireCarnet(lien.jeton)).toBeNull();
		});

		it('« ne plus recevoir » ne trahit pas un carnet fermé', async () => {
			const eleve = await nouvelEleve('Lou', classId);
			const { jeton } = await parentConfirme(eleve.id, `parent-l1@${DOMAINE}`);
			const { data } = await service
				.from('class_members')
				.update({ status: 'archived', left_at: new Date().toISOString() })
				.eq('student_id', eleve.id)
				.select('id');
			expect(data).toHaveLength(1);
			const arret = await service.rpc('set_parent_emails_stopped', {
				p_token: jeton,
				p_stopped: true
			});
			expect(arret.error).toBeNull();
			expect(arret.data).toBe(false);
			const inconnu = await service.rpc('set_parent_emails_stopped', {
				p_token: nouveauJeton(),
				p_stopped: true
			});
			expect(inconnu.data).toBe(false);
		});

		it('rentrée et vacances de l’école : aucune semaine d’avant la rentrée', async () => {
			const aujourdhui = jourDeParis(new Date());
			// Rentrée un mercredi : le lundi et le mardi de la même semaine sont avant.
			const rentree = plusJours(lundi(aujourdhui, -1), 2);
			const ecole = await insertId('schools', {
				name: 'École du carnet',
				city: 'Testville',
				country: 'France'
			});
			const annee = await insertId('school_years', {
				school_id: ecole,
				name: 'Année du carnet',
				start_date: rentree,
				end_date: plusJours(rentree, 300),
				is_active: true
			});
			await insertId('school_holidays', {
				school_year_id: annee,
				name: 'Vacances du carnet',
				// Du samedi de la semaine de la rentrée au lundi suivant
				start_date: plusJours(rentree, 3),
				end_date: plusJours(rentree, 5)
			});
			const classe = (await TestData.class().withName('4e Rentrée').create()).id;
			const { error: e1 } = await service
				.from('classes')
				.update({ school_id: ecole })
				.eq('id', classe);
			if (e1) throw new Error(e1.message);
			const { error: e2 } = await service
				.from('class_carnet_settings')
				.insert({ class_id: classe, enabled: true });
			if (e2) throw new Error(e2.message);
			try {
				const eleve = await nouvelEleve('Mael', classe);
				// Travail le lundi AVANT la rentrée, dans la semaine de la rentrée : pas compté
				await traces(eleve.id, lundi(aujourdhui, -1), 6);
				const { jeton } = await parentConfirme(eleve.id, `parent-m1@${DOMAINE}`);
				const carnet = await lireCarnet(jeton);
				expect(carnet?.weeks).toEqual([
					{ week_start: lundi(aujourdhui, -1), level: '0', holiday: true },
					{ week_start: lundi(aujourdhui, 0), level: '0', holiday: true }
				]);
			} finally {
				await service.from('class_carnet_settings').delete().eq('class_id', classe);
				await service.from('class_members').delete().eq('class_id', classe);
				await service.from('classes').delete().eq('id', classe);
				await service.from('school_holidays').delete().eq('school_year_id', annee);
				await service.from('school_years').delete().eq('id', annee);
				await service.from('schools').delete().eq('id', ecole);
			}
		});

		it('« ne plus recevoir » garde le carnet ouvert', async () => {
			const eleve = await nouvelEleve('Frédérique', classId);
			const { jeton, contactId } = await parentConfirme(eleve.id, `parent-f1@${DOMAINE}`);
			const { data, error } = await service.rpc('set_parent_emails_stopped', {
				p_token: jeton,
				p_stopped: true
			});
			expect(error).toBeNull();
			expect(data).toBe(true);
			const relu = await service
				.from('parent_contacts')
				.select('emails_stopped_at')
				.eq('id', contactId)
				.single();
			expect(relu.data?.emails_stopped_at).not.toBeNull();
			expect((await lireCarnet(jeton))?.emails_stopped).toBe(true);
		});
	});

	describe('adresses', () => {
		it('confirmer une adresse en attente, une seule fois, avant échéance', async () => {
			const eleve = await nouvelEleve('Gaël', classId);
			const jeton = nouveauJeton();
			const contactId = await insertId('parent_contacts', {
				student_id: eleve.id,
				email: `parent-g1@${DOMAINE}`,
				status: 'pending',
				source: 'teacher',
				confirm_token_hash: sha256(jeton),
				confirm_expires_at: new Date(Date.now() + 86_400_000).toISOString()
			});
			const { data, error } = await service.rpc('confirm_parent_contact', { p_token: jeton });
			expect(error).toBeNull();
			expect(data).toEqual({ contact_id: contactId, student_id: eleve.id });
			const relu = await service
				.from('parent_contacts')
				.select('status, confirm_token_hash')
				.eq('id', contactId)
				.single();
			expect(relu.data).toEqual({ status: 'confirmed', confirm_token_hash: null });
			// Deuxième clic : plus rien
			const again = await service.rpc('confirm_parent_contact', { p_token: jeton });
			expect(again.data).toBeNull();

			const perime = nouveauJeton();
			await insertId('parent_contacts', {
				student_id: eleve.id,
				email: `parent-g2@${DOMAINE}`,
				status: 'pending',
				source: 'teacher',
				confirm_token_hash: sha256(perime),
				confirm_expires_at: new Date(Date.now() - 1000).toISOString()
			});
			const expire = await service.rpc('confirm_parent_contact', { p_token: perime });
			expect(expire.data).toBeNull();
		});

		it('deux adresses actives au plus', async () => {
			const eleve = await nouvelEleve('Hélie', classId);
			await parentConfirme(eleve.id, `parent-h1@${DOMAINE}`);
			await insertId('parent_contacts', {
				student_id: eleve.id,
				email: `parent-h2@${DOMAINE}`,
				status: 'pending',
				source: 'student'
			});
			const { error } = await service.from('parent_contacts').insert({
				student_id: eleve.id,
				email: `parent-h3@${DOMAINE}`,
				status: 'pending',
				source: 'student'
			});
			expect(error?.code).toBe('UBP01');
		});

		it('une adresse refusée ou invalide ne compte pas, mais ne revient pas en douce', async () => {
			const eleve = await nouvelEleve('Iris', classId);
			const invalide = await insertId('parent_contacts', {
				student_id: eleve.id,
				email: `parent-ir0@${DOMAINE}`,
				status: 'invalid',
				source: 'teacher'
			});
			await insertId('parent_contacts', {
				student_id: eleve.id,
				email: `parent-ir1@${DOMAINE}`,
				status: 'pending',
				source: 'student'
			});
			// Adresse normalisée (espaces, majuscules)
			const deuxieme = await insertId('parent_contacts', {
				student_id: eleve.id,
				email: `  Parent-IR2@Example.Test `,
				status: 'pending',
				source: 'student'
			});
			const relu = await service
				.from('parent_contacts')
				.select('email')
				.eq('id', deuxieme)
				.single();
			expect(relu.data?.email).toBe(`parent-ir2@${DOMAINE}`);
			// Repasser l'adresse invalide en attente : une 3e active, refusée.
			const { error } = await service
				.from('parent_contacts')
				.update({ status: 'pending' })
				.eq('id', invalide);
			expect(error?.code).toBe('UBP01');
		});

		it('« je ne suis pas le parent » efface l’adresse et interdit de la ressaisir', async () => {
			const eleve = await nouvelEleve('Ilan', classId);
			const jeton = nouveauJeton();
			const contactId = await insertId('parent_contacts', {
				student_id: eleve.id,
				email: `inconnu-i1@${DOMAINE}`,
				status: 'pending',
				source: 'student',
				confirm_token_hash: sha256(jeton),
				confirm_expires_at: new Date(Date.now() + 86_400_000).toISOString()
			});
			const { data } = await service.rpc('refuse_parent_contact', { p_token: jeton });
			expect(data).toEqual({ student_id: eleve.id });
			const relu = await service
				.from('parent_contacts')
				.select('status, email')
				.eq('id', contactId)
				.single();
			expect(relu.data).toEqual({ status: 'refused', email: null });

			// Ressaisie, même écrite autrement : refusée par l'unicité de l'empreinte
			const { error } = await service.from('parent_contacts').insert({
				student_id: eleve.id,
				email: '  INCONNU-i1@Example.Test ',
				status: 'pending',
				source: 'student'
			});
			expect(error?.code).toBe('23505');
		});
	});

	describe('partage coupé', () => {
		it('le professeur coupe le partage : liens révoqués, carnet fermé', async () => {
			const eleve = await nouvelEleve('Jade', classId);
			const { jeton, contactId } = await parentConfirme(eleve.id, `parent-j1@${DOMAINE}`);
			expect(await lireCarnet(jeton)).not.toBeNull();

			const { data, error } = await teacher
				.from('student_carnet_opt_outs')
				.insert({ student_id: eleve.id, stopped_by: teacherId })
				.select('student_id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);

			expect(await lireCarnet(jeton)).toBeNull();
			const liens = await service
				.from('parent_carnet_links')
				.select('revoked_at')
				.eq('contact_id', contactId);
			expect(liens.data?.every((l) => l.revoked_at !== null)).toBe(true);
		});

		it('un élève ne coupe pas son propre partage', async () => {
			const eleve = await nouvelEleve('Kim', classId);
			await eleve.client.from('student_carnet_opt_outs').insert({ student_id: eleve.id });
			const { count } = await service
				.from('student_carnet_opt_outs')
				.select('student_id', { count: 'exact', head: true })
				.eq('student_id', eleve.id);
			expect(count).toBe(0);
		});
	});

	describe('côté élève et professeur', () => {
		it('l’élève lit son propre carnet, avec le nombre de parents qui le reçoivent', async () => {
			const { data, error } = await eleveA.client.rpc('get_my_carnet');
			expect(error).toBeNull();
			const carnet = data as CarnetPayload & { parents: number; shared: boolean };
			expect(carnet.firstname).toBe('Alix');
			expect(carnet.revisions).toEqual({ overdue: 2 });
			expect(carnet.shared).toBe(true);
			expect(carnet.parents).toBeGreaterThanOrEqual(1);
			expect(cles(carnet).has('email')).toBe(false);
		});

		it('anon n’a pas de carnet', async () => {
			const { data, error } = await anonClient().rpc('get_my_carnet');
			expect(error !== null || data === null).toBe(true);
		});

		it('l’élève lit les courriels envoyés à ses parents, pas ceux d’un autre', async () => {
			await insertId('parent_notifications', {
				student_id: eleveA.id,
				kind: 'exception',
				reasons: ['evaluation_missed'],
				status: 'sent'
			});
			await insertId('parent_notifications', {
				student_id: eleveB.id,
				kind: 'exception',
				reasons: ['inactivity'],
				status: 'sent'
			});
			const { data } = await eleveA.client.from('parent_notifications').select('student_id');
			expect((data ?? []).length).toBeGreaterThan(0);
			expect((data ?? []).every((n) => n.student_id === eleveA.id)).toBe(true);
		});

		it('le professeur règle le carnet de la classe, pas l’élève', async () => {
			await eleveA.client
				.from('class_carnet_settings')
				.update({ inactivity_days: 30 })
				.eq('class_id', classId);
			const { data, error } = await teacher
				.from('class_carnet_settings')
				.update({ overdue_reviews_days: 10 })
				.eq('class_id', classId)
				.select('overdue_reviews_days');
			expect(error).toBeNull();
			expect(data).toEqual([{ overdue_reviews_days: 10 }]);
			const relu = await service
				.from('class_carnet_settings')
				.select('inactivity_days')
				.eq('class_id', classId)
				.single();
			expect(relu.data?.inactivity_days).toBe(15);
		});
	});
});
