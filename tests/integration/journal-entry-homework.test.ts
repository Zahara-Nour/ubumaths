/**
 * Travaux à faire d'une séance du cahier de texte (nécessite une base locale)
 * ==========================================================================
 *
 * Migration : 20260910110000_journal_entry_homework.sql
 *
 * Une séance peut désormais porter PLUSIEURS travaux, chacun avec son échéance.
 * Ces tests portent sur les deux choses que ni le typecheck ni les tests
 * unitaires ne peuvent voir :
 *
 *  - la RLS. Un travail est lisible exactement par qui lit déjà la séance qui le
 *    porte — un élève ne doit pas voir le travail d'un brouillon ni d'une séance
 *    future, sans quoi il connaîtrait le programme d'un contrôle avant l'heure ;
 *  - l'atomicité de l'écriture. Remplacer la liste, c'est DELETE + INSERT ; la
 *    fonction doit le faire en une transaction, et refuser ce qui n'est pas une
 *    liste.
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null` : on vérifie ce qui
 * est lu, pas seulement que la requête est passée.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { getUpcomingHomework } from '$lib/server/journal';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/**
 * Accès non typé : `journal_entry_homework` n'entrera dans `database.ts` qu'au
 * `db:types` qui suit la migration en prod. Les tests, eux, sont hors périmètre
 * du typecheck (`tsconfig.check.json` exclut `tests/**`) et peuvent donc être
 * écrits AVANT — c'est ce qui permet de les vérifier rouges.
 */
type Loose = {
	from: (t: string) => {
		insert: (rows: unknown) => PromiseLike<{ data: unknown; error: { message: string } | null }> & {
			select: () => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
		};
		delete: () => {
			in: (c: string, v: string[]) => PromiseLike<{ error: unknown }>;
			eq: (c: string, v: string) => PromiseLike<{ error: unknown }>;
		};
		select: (c: string) => {
			eq: (
				c: string,
				v: string
			) => PromiseLike<{ data: unknown[] | null; error: unknown }> & {
				order: (c: string) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
			};
			limit: (n: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
		};
	};
	rpc: (
		fn: string,
		args: Record<string, unknown>
	) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
};

const loose = (client: unknown) => client as unknown as Loose;

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

const SHARE_TOKEN = 'HhGgFfEeDdCcBbAa';

const PUBLIEE_ID = 'da41e400-0000-4000-8000-00000000d001';
const BROUILLON_ID = 'da41e400-0000-4000-8000-00000000d002';
const FUTURE_ID = 'da41e400-0000-4000-8000-00000000d003';
const AUTRE_CLASSE_ID = 'da41e400-0000-4000-8000-00000000d004';

const TOUTES_LES_SEANCES = [PUBLIEE_ID, BROUILLON_ID, FUTURE_ID, AUTRE_CLASSE_ID];

interface TravailLu {
	id: string;
	entry_id: string;
	content: string;
	due_date: string | null;
	display_order: number;
}

interface CahierPartage {
	entries: {
		id: string;
		homework: { id: string; content: string; due_date: string | null }[];
	}[];
}

function jour(decalage: number): string {
	return new Date(Date.now() + decalage * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Codes d'erreur PostgreSQL, pour distinguer « refusé » de « absent ».
 *
 * Un test de refus qui se contente d'un `error !== null` passe aussi quand la
 * table n'existe pas : il prouve alors « on ne lit pas ce qui n'existe pas »,
 * ce qui n'apprend rien sur la RLS. C'est exactement ce qui rendait ces tests
 * verts sans la migration.
 */
const PRIVILEGE_INSUFFISANT = '42501';
const CONTRAINTE_VIOLEE = '23514';
const PARAMETRE_INVALIDE = '22023';

describe('travaux à faire d’une séance', () => {
	const service = createServiceRoleClient();
	let classeId: string;
	let autreClasseId: string;
	let prof: SupabaseClient<Database>;
	let eleve: SupabaseClient<Database>;
	let eleveAutreClasse: SupabaseClient<Database>;
	let eleveId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const profilProf = await TestData.profile().withRole('teacher').create();
		prof = await clientFor(profilProf.email);

		const classe = await TestData.class().withName('3e Travaux ZZ').create();
		classeId = classe.id;
		const autreClasse = await TestData.class().withName('4e Travaux ZZ').create();
		autreClasseId = autreClasse.id;

		const profilEleve = await TestData.profile().withRole('student').create();
		const profilAutreEleve = await TestData.profile().withRole('student').create();

		const { error: membreError } = await service.from('class_members').insert([
			{ class_id: classeId, student_id: profilEleve.id },
			{ class_id: autreClasseId, student_id: profilAutreEleve.id }
		]);
		expect(membreError).toBeNull();

		eleveId = profilEleve.id;
		eleve = await clientFor(profilEleve.email);
		eleveAutreClasse = await clientFor(profilAutreEleve.email);

		// Dates distinctes : `unique_class_entry_date` impose une séance par
		// classe et par jour.
		const { error: seanceError } = await service.from('class_journal_entries').insert([
			{
				id: PUBLIEE_ID,
				class_id: classeId,
				entry_date: jour(-1),
				lesson_content: 'Théorème de Pythagore',
				is_published: true
			},
			{
				id: BROUILLON_ID,
				class_id: classeId,
				entry_date: jour(-2),
				lesson_content: 'Brouillon',
				is_published: false
			},
			{
				id: FUTURE_ID,
				class_id: classeId,
				entry_date: jour(7),
				lesson_content: 'Contrôle à venir',
				is_published: true
			},
			{
				id: AUTRE_CLASSE_ID,
				class_id: autreClasseId,
				entry_date: jour(-1),
				lesson_content: 'Une autre classe',
				is_published: true
			}
		]);
		expect(seanceError).toBeNull();

		const { error: tokenError } = await service
			.from('class_journal_share_tokens')
			.insert({ class_id: classeId, token: SHARE_TOKEN, is_active: true });
		expect(tokenError).toBeNull();
	});

	afterAll(async () => {
		await service.from('class_journal_share_tokens').delete().eq('token', SHARE_TOKEN);
		await service.from('class_journal_entries').delete().in('id', TOUTES_LES_SEANCES);
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		await loose(service).from('journal_entry_homework').delete().in('entry_id', TOUTES_LES_SEANCES);
	});

	/**
	 * Pose des travaux sur une séance ET vérifie qu'ils sont réellement en base,
	 * en lisant avec le client `service` qui ignore la RLS.
	 *
	 * Toute la valeur des tests de REFUS tient à cette vérification : sans elle,
	 * « l'élève ne voit rien » serait vrai aussi quand rien n'a été écrit.
	 */
	async function poserTravaux(
		entryId: string,
		items: { content: string; due_date: string | null }[]
	): Promise<void> {
		const { error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: entryId,
			p_items: items
		});
		expect(error).toBeNull();

		const { data } = await loose(service)
			.from('journal_entry_homework')
			.select('content')
			.eq('entry_id', entryId);
		expect((data as TravailLu[] | null)?.map((t) => t.content).sort()).toEqual(
			items.map((i) => i.content).sort()
		);
	}

	// ========================================================================
	// Écriture par le professeur
	// ========================================================================

	it('le professeur écrit plusieurs travaux avec des échéances différentes', async () => {
		// LE besoin : un exercice pour le prochain cours, un DM pour la semaine
		// suivante. Deux textes, deux dates, une seule séance.
		const { data, error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [
				{ content: 'Exercices 12 à 15', due_date: jour(3) },
				{ content: 'DM sur les triangles', due_date: jour(10) }
			]
		});

		expect(error).toBeNull();
		const travaux = (data as TravailLu[]).sort((a, b) => a.display_order - b.display_order);
		expect(travaux).toHaveLength(2);
		expect(travaux[0]).toMatchObject({
			content: 'Exercices 12 à 15',
			due_date: jour(3),
			display_order: 0
		});
		expect(travaux[1]).toMatchObject({
			content: 'DM sur les triangles',
			due_date: jour(10),
			display_order: 1
		});
	});

	it('l’ordre du tableau devient l’ordre d’affichage', async () => {
		await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [
				{ content: 'Premier', due_date: null },
				{ content: 'Deuxième', due_date: null },
				{ content: 'Troisième', due_date: null }
			]
		});

		const { data } = await loose(service)
			.from('journal_entry_homework')
			.select('content, display_order')
			.eq('entry_id', PUBLIEE_ID)
			.order('display_order');

		expect((data as TravailLu[]).map((t) => t.content)).toEqual([
			'Premier',
			'Deuxième',
			'Troisième'
		]);
	});

	it('enregistrer REMPLACE la liste au lieu de l’empiler', async () => {
		await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: 'Ancien travail', due_date: jour(3) }]
		});
		await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: 'Travail corrigé', due_date: jour(3) }]
		});

		const { data } = await loose(service)
			.from('journal_entry_homework')
			.select('content')
			.eq('entry_id', PUBLIEE_ID);

		expect((data as TravailLu[]).map((t) => t.content)).toEqual(['Travail corrigé']);
	});

	it('une liste vide efface tous les travaux', async () => {
		await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: 'À retirer', due_date: null }]
		});

		const { error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: []
		});

		expect(error).toBeNull();
		const { data } = await loose(service)
			.from('journal_entry_homework')
			.select('id')
			.eq('entry_id', PUBLIEE_ID);
		expect(data ?? []).toEqual([]);
	});

	it('une échéance vide est acceptée telle quelle (classe sans emploi du temps)', async () => {
		// Le serveur résout normalement « pas de date » au prochain cours ; NULL ne
		// subsiste que pour une classe sans emploi du temps, cas majoritaire en
		// production aujourd'hui.
		const { data, error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: 'Réviser le cours', due_date: '' }]
		});

		expect(error).toBeNull();
		expect((data as TravailLu[])[0].due_date).toBeNull();
	});

	it('refuse ce qui n’est pas une liste', async () => {
		const { error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: { content: 'pas un tableau' }
		});

		expect(error?.code).toBe(PARAMETRE_INVALIDE);
		expect(error?.message).toMatch(/tableau JSON/i);
	});

	it('refuse une liste démesurée', async () => {
		const trop = Array.from({ length: 51 }, (_, i) => ({
			content: `Travail ${i}`,
			due_date: null
		}));

		const { error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: trop
		});

		expect(error?.code).toBe(PARAMETRE_INVALIDE);
		expect(error?.message).toMatch(/maximum 50/i);
	});

	it('refuse un travail sans texte', async () => {
		// Un travail sans texte s'afficherait chez l'élève comme une puce vide
		// avec une échéance et rien à faire.
		const { error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: '   ', due_date: null }]
		});

		expect(error?.code).toBe(CONTRAINTE_VIOLEE);
	});

	it('refuse un travail démesurément long', async () => {
		// La liste est bornée à 50 travaux, mais sans borne PAR travail une séance
		// pèserait autant qu'on veut — et c'est le visiteur du lien de partage qui
		// la retélécharge entièrement.
		const { error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: 'x'.repeat(50_001), due_date: null }]
		});

		expect(error?.code).toBe(CONTRAINTE_VIOLEE);
	});

	it('n’écrit RIEN quand un seul travail de la liste est invalide', async () => {
		// L'atomicité est la raison d'être de cette fonction : le DELETE ne doit
		// pas survivre à l'échec de l'INSERT, sinon enregistrer une liste fautive
		// effacerait le travail déjà saisi.
		await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: 'Travail déjà là', due_date: jour(3) }]
		});

		const { error } = await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [
				{ content: 'Nouveau', due_date: null },
				{ content: '  ', due_date: null }
			]
		});
		expect(error).not.toBeNull();

		const { data } = await loose(service)
			.from('journal_entry_homework')
			.select('content')
			.eq('entry_id', PUBLIEE_ID);
		expect((data as TravailLu[]).map((t) => t.content)).toEqual(['Travail déjà là']);
	});

	it('supprimer la séance supprime ses travaux', async () => {
		const { error: seanceError } = await service.from('class_journal_entries').insert({
			id: 'da41e400-0000-4000-8000-00000000d0ff',
			class_id: classeId,
			entry_date: jour(-30),
			is_published: true
		});
		expect(seanceError).toBeNull();

		await poserTravaux('da41e400-0000-4000-8000-00000000d0ff', [
			{ content: 'Travail orphelin', due_date: null }
		]);

		await service
			.from('class_journal_entries')
			.delete()
			.eq('id', 'da41e400-0000-4000-8000-00000000d0ff');

		const { data } = await loose(service)
			.from('journal_entry_homework')
			.select('id')
			.eq('entry_id', 'da41e400-0000-4000-8000-00000000d0ff');
		expect(data ?? []).toEqual([]);
	});

	// ========================================================================
	// Lecture par l'élève — le périmètre exact de la séance porteuse
	// ========================================================================

	it('un élève de la classe lit le travail d’une séance publiée et passée', async () => {
		await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: 'Exercices 12 à 15', due_date: jour(3) }]
		});

		const { data, error } = await loose(eleve)
			.from('journal_entry_homework')
			.select('content, due_date')
			.eq('entry_id', PUBLIEE_ID);

		expect(error).toBeNull();
		expect((data as TravailLu[]).map((t) => t.content)).toEqual(['Exercices 12 à 15']);
	});

	it('un élève ne lit PAS le travail d’un brouillon', async () => {
		await poserTravaux(BROUILLON_ID, [{ content: 'Travail non publié', due_date: jour(3) }]);

		const { data, error } = await loose(eleve)
			.from('journal_entry_homework')
			.select('content')
			.eq('entry_id', BROUILLON_ID);

		// La RLS filtre, elle ne refuse pas : la requête aboutit sur zéro ligne.
		// Exiger `error === null` distingue ce silence-là de « la table n'existe
		// pas », qui rendrait ce test vert sans rien prouver.
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('un élève ne lit PAS le travail d’une séance future, même publiée', async () => {
		// Sans cette garde, publier une séance à l'avance révélerait le programme
		// du prochain contrôle.
		await poserTravaux(FUTURE_ID, [{ content: 'Réviser tout le chapitre', due_date: jour(14) }]);

		const { data, error } = await loose(eleve)
			.from('journal_entry_homework')
			.select('content')
			.eq('entry_id', FUTURE_ID);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('un élève d’une autre classe ne lit rien', async () => {
		await poserTravaux(PUBLIEE_ID, [{ content: 'Réservé à la 3e', due_date: jour(3) }]);

		const { data, error } = await loose(eleveAutreClasse)
			.from('journal_entry_homework')
			.select('content')
			.eq('entry_id', PUBLIEE_ID);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('un élève ne peut pas écrire de travail', async () => {
		const { error } = await loose(eleve)
			.from('journal_entry_homework')
			.insert({ entry_id: PUBLIEE_ID, content: 'Devoir inventé', due_date: jour(3) });

		// REFUSÉ (42501), pas ABSENT : le code distingue une policy qui fait son
		// travail d'une table manquante.
		expect(error?.code).toBe(PRIVILEGE_INSUFFISANT);
	});

	it('un élève ne peut pas écrire via la fonction non plus', async () => {
		// SECURITY INVOKER : la fonction n'accorde aucun droit que la RLS refuse.
		const { error } = await loose(eleve).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [{ content: 'Devoir inventé', due_date: jour(3) }]
		});

		expect(error?.code).toBe(PRIVILEGE_INSUFFISANT);
	});

	it('anon ne lit rien directement', async () => {
		await poserTravaux(PUBLIEE_ID, [{ content: 'Exercices 12 à 15', due_date: jour(3) }]);

		const { data, error } = await loose(anonClient())
			.from('journal_entry_homework')
			.select('content')
			.limit(5);

		// `anon` n'a AUCUN droit sur la table : le REVOKE le rejette avant même
		// la RLS. C'est un refus (42501), pas une liste vide.
		expect(data).toBeNull();
		expect((error as { code?: string } | null)?.code).toBe(PRIVILEGE_INSUFFISANT);
	});

	// ========================================================================
	// Le lien de partage
	// ========================================================================

	it('le lien de partage rend les travaux de la séance', async () => {
		await loose(prof).rpc('set_journal_entry_homework', {
			p_entry_id: PUBLIEE_ID,
			p_items: [
				{ content: 'Exercices 12 à 15', due_date: jour(3) },
				{ content: 'DM sur les triangles', due_date: jour(10) }
			]
		});

		const { data, error } = await loose(anonClient()).rpc('get_class_journal_by_share_token', {
			p_token: SHARE_TOKEN
		});

		expect(error).toBeNull();
		const cahier = data as CahierPartage;
		const seance = cahier.entries.find((e) => e.id === PUBLIEE_ID);
		expect(seance?.homework.map((t) => t.content)).toEqual([
			'Exercices 12 à 15',
			'DM sur les triangles'
		]);
	});

	it('le lien de partage ne rend pas les travaux d’un brouillon ni d’une séance future', async () => {
		await poserTravaux(BROUILLON_ID, [{ content: 'Secret de brouillon', due_date: jour(3) }]);
		await poserTravaux(FUTURE_ID, [{ content: 'Secret du contrôle', due_date: jour(14) }]);
		await poserTravaux(PUBLIEE_ID, [{ content: 'Visible celui-là', due_date: jour(3) }]);

		const { data } = await loose(anonClient()).rpc('get_class_journal_by_share_token', {
			p_token: SHARE_TOKEN
		});

		// Le témoin visible prouve que la fonction a bien répondu : sans lui, une
		// réponse nulle passerait le test sans rien démontrer.
		expect(JSON.stringify(data)).toMatch(/Visible celui-là/);
		expect(JSON.stringify(data)).not.toMatch(/Secret/);
	});

	it('une séance sans travail rend une liste vide, pas null', async () => {
		// La page publique itère sur ce tableau : un `null` la casserait.
		const { data } = await loose(anonClient()).rpc('get_class_journal_by_share_token', {
			p_token: SHARE_TOKEN
		});

		const seance = (data as CahierPartage).entries.find((e) => e.id === PUBLIEE_ID);
		expect(seance?.homework).toEqual([]);
	});

	// ========================================================================
	// « Travail à venir » de la vue élève
	// ========================================================================

	it('la vue élève reçoit chaque travail séparément, trié par échéance', async () => {
		// Le cas qui motive la fonctionnalité, vu du côté de l'élève : deux
		// travaux d'une MÊME séance, deux échéances, deux cartes.
		await poserTravaux(PUBLIEE_ID, [
			{ content: 'DM sur les triangles', due_date: jour(10) },
			{ content: 'Exercices 12 à 15', due_date: jour(3) }
		]);

		const { data, error } = await getUpcomingHomework(eleve, eleveId);

		expect(error).toBeNull();
		expect(data.map((h) => h.homeworkContent)).toEqual([
			'Exercices 12 à 15',
			'DM sur les triangles'
		]);
	});

	it('l’identifiant est celui du TRAVAIL, la séance est à part', async () => {
		// Deux travaux d'une même séance avec le même `id` feraient deux clés
		// identiques dans le `{#each}` de la page : Svelte n'afficherait qu'une
		// carte, et l'autre devoir disparaîtrait sans erreur.
		await poserTravaux(PUBLIEE_ID, [
			{ content: 'Premier', due_date: jour(3) },
			{ content: 'Second', due_date: jour(4) }
		]);

		const { data } = await getUpcomingHomework(eleve, eleveId);

		expect(new Set(data.map((h) => h.id)).size).toBe(2);
		expect(data.every((h) => h.entryId === PUBLIEE_ID)).toBe(true);
	});

	it('ne remonte pas un travail dont l’échéance est hors fenêtre', async () => {
		await poserTravaux(PUBLIEE_ID, [
			{ content: 'Dans la fenêtre', due_date: jour(3) },
			{ content: 'Bien plus tard', due_date: jour(40) }
		]);

		const { data } = await getUpcomingHomework(eleve, eleveId, 14);

		expect(data.map((h) => h.homeworkContent)).toEqual(['Dans la fenêtre']);
	});

	it('ne remonte pas le travail d’un brouillon', async () => {
		await poserTravaux(BROUILLON_ID, [{ content: 'Travail non publié', due_date: jour(3) }]);

		const { data } = await getUpcomingHomework(eleve, eleveId);

		expect(data).toEqual([]);
	});

	it('ne remonte pas le travail d’une autre classe', async () => {
		await poserTravaux(AUTRE_CLASSE_ID, [{ content: 'Réservé à la 4e', due_date: jour(3) }]);

		const { data } = await getUpcomingHomework(eleve, eleveId);

		expect(data).toEqual([]);
	});

	it('ne remonte pas un travail sans échéance', async () => {
		// Une classe sans emploi du temps : le travail existe, mais il n'a pas de
		// date, donc il n'a rien à faire dans une liste « à venir ».
		await poserTravaux(PUBLIEE_ID, [{ content: 'Réviser le cours', due_date: null }]);

		const { data } = await getUpcomingHomework(eleve, eleveId);

		expect(data).toEqual([]);
	});
});
