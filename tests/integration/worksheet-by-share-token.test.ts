/**
 * Ouvrir une fiche depuis le lien de consultation du cahier de texte
 * =================================================================
 *
 * Migration : 20260909180000_worksheet_by_share_token.sql
 *
 * Le jeton n'ouvre PAS « les fiches » : il ouvre celles que le professeur a
 * CITÉES dans une séance visible. Ces tests portent surtout sur ce que la
 * fonction doit REFUSER — c'est là qu'un élargissement d'accès se glisserait.
 *
 * L'appelant est `anon`, exactement comme un lecteur sans compte : tester avec
 * le service role ne prouverait rien, puisqu'il contourne les RLS.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

/** Un lecteur sans compte : exactement ce dont dispose le porteur du lien. */
function anon(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

const TOKEN = 'jetonDeTest0123456789abc';

async function insert(table: string, row: Record<string, unknown>): Promise<void> {
	const { error } = await service.from(table as never).insert(row as never);
	if (error) throw new Error(`${table} : ${error.message}`);
}

describe('fiche accessible par le lien de consultation', () => {
	let classId: string;
	let citee: string;
	let nonCitee: string;
	let lecteur: SupabaseClient<Database>;

	async function ouvrir(token: string, worksheetId: string) {
		const { data, error } = await lecteur.rpc('get_worksheet_by_share_token', {
			p_token: token,
			p_worksheet_id: worksheetId
		});
		expect(error).toBeNull();
		return data as { id: string; title: string; exercises: unknown[] } | null;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		lecteur = anon();

		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = (await TestData.class().create()) as { id: string };
		classId = klass.id;

		const fiches: string[] = [];
		for (const titre of ['Fiche citée', 'Fiche NON citée']) {
			const { data, error } = await service
				.from('worksheets')
				.insert({ title: titre, type: 'worksheet', status: 'published', created_by: teacher.id })
				.select('id')
				.single();
			if (error) throw new Error(`fiche : ${error.message}`);
			fiches.push(data.id);
		}
		[citee, nonCitee] = fiches;

		const exercise = (await TestData.exercise(teacher.id).create()) as { id: string };
		await insert('worksheet_exercises', {
			worksheet_id: citee,
			exercise_id: exercise.id,
			position: 1
		});

		// Une séance publiée, d'aujourd'hui, qui cite la première fiche.
		await insert('class_journal_entries', {
			class_id: classId,
			entry_date: new Date().toISOString().slice(0, 10),
			is_published: true,
			lesson_content: `<p>[[worksheet:${citee}|Fiche citée]]</p>`
		});

		// Le jeton est en dur et `cleanupAllTestData` ne couvre pas cette table :
		// un run interrompu laissait la ligne, et le run suivant échouait sur
		// `class_journal_share_tokens_token_key` — tous les tests du fichier
		// sautés, pour une raison sans rapport avec ce qu'ils vérifient.
		await service.from('class_journal_share_tokens').delete().eq('token', TOKEN);

		await insert('class_journal_share_tokens', {
			class_id: classId,
			token: TOKEN,
			created_by: teacher.id,
			is_active: true
		});
	});

	afterAll(async () => {
		await service.from('class_journal_share_tokens').delete().eq('token', TOKEN);
		await service.from('worksheets').delete().in('id', [citee, nonCitee]);
		await cleanupAllTestData();
	});

	it('ouvre la fiche CITÉE, avec ses exercices', async () => {
		const fiche = await ouvrir(TOKEN, citee);

		expect(fiche?.id).toBe(citee);
		expect(fiche?.title).toBe('Fiche citée');
		expect(fiche?.exercises).toHaveLength(1);
	});

	it('REFUSE une fiche non citée, même avec un jeton valide', async () => {
		// Le cœur du dispositif : le jeton n'ouvre pas le catalogue.
		expect(await ouvrir(TOKEN, nonCitee)).toBeNull();
	});

	it('refuse un jeton inconnu', async () => {
		expect(await ouvrir('jetonInvalide0123456789', citee)).toBeNull();
	});

	it('refuse un jeton révoqué', async () => {
		await service
			.from('class_journal_share_tokens')
			.update({ is_active: false })
			.eq('token', TOKEN);
		expect(await ouvrir(TOKEN, citee)).toBeNull();

		await service.from('class_journal_share_tokens').update({ is_active: true }).eq('token', TOKEN);
		expect(await ouvrir(TOKEN, citee)).not.toBeNull();
	});

	it('refuse quand la classe est archivée', async () => {
		// Archiver une classe doit valoir révocation de son lien.
		await service.from('classes').update({ is_active: false }).eq('id', classId);
		expect(await ouvrir(TOKEN, citee)).toBeNull();

		await service.from('classes').update({ is_active: true }).eq('id', classId);
	});

	it('refuse si la séance qui cite la fiche n’est pas publiée', async () => {
		await service
			.from('class_journal_entries')
			.update({ is_published: false })
			.eq('class_id', classId);
		expect(await ouvrir(TOKEN, citee)).toBeNull();

		await service
			.from('class_journal_entries')
			.update({ is_published: true })
			.eq('class_id', classId);
	});

	it('refuse si la séance est datée dans le FUTUR', async () => {
		// Une séance publiée à l'avance ne doit pas fuiter le prochain contrôle.
		const demain = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
		await service
			.from('class_journal_entries')
			.update({ entry_date: demain })
			.eq('class_id', classId);
		expect(await ouvrir(TOKEN, citee)).toBeNull();

		await service
			.from('class_journal_entries')
			.update({ entry_date: new Date().toISOString().slice(0, 10) })
			.eq('class_id', classId);
	});

	it('une citation dans les DEVOIRS compte aussi', async () => {
		// Le travail à faire vit dans `journal_entry_homework` depuis qu'une séance
		// peut en porter plusieurs. La fonction doit y chercher la citation :
		// sinon une fiche donnée à faire à la maison reste INACCESSIBLE depuis le
		// lien partagé — l'élève clique, et la fonction répond `null` sans rien
		// expliquer.
		//
		// Le contenu de cours est réécrit SANS citation, pour que le devoir soit
		// la seule source. Sans ça, le test passerait par le contenu de séance et
		// ne prouverait rien.
		const { data: seance, error: seanceError } = await service
			.from('class_journal_entries')
			.update({ lesson_content: '<p>Cours, sans aucune citation.</p>' })
			.eq('class_id', classId)
			.select('id')
			.single();
		expect(seanceError).toBeNull();

		const { error: travailError } = await service.from('journal_entry_homework').insert({
			entry_id: (seance as { id: string }).id,
			content: `<p>Pour demain : [[worksheet:${citee}|Fiche citée]]</p>`,
			due_date: null
		});
		expect(travailError).toBeNull();

		expect(await ouvrir(TOKEN, citee)).not.toBeNull();
	});

	it('anon n’a AUCUN accès direct à la table des fiches', async () => {
		// La fonction est `security definer` : c'est elle, et elle seule, qui
		// autorise. Sans ça, le jeton serait superflu.
		const { data } = await lecteur.from('worksheets').select('id').eq('id', citee);
		expect(data ?? []).toEqual([]);
	});
});
