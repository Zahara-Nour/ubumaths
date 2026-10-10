/**
 * Questions de cours : filtre du catalogue et lecture élève, contre la vraie base
 * ===============================================================================
 *
 * Étape 1 du chantier « questions de cours » (docs/archive/wip/questions-de-cours-progress.md) :
 *   1. le filtre PostgREST `COURSE_QUESTION_FILTER` retrouve une carte de cours ET un
 *      modèle marqué `options.courseQuestion`, et pas un modèle ordinaire ;
 *   2. un élève lit les `options` d'un modèle publié par la jointure utilisée pour le
 *      paquet Programme (sinon plus aucun modèle n'y entrerait).
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
import { COURSE_QUESTION_FILTER } from '$lib/questions/course-question';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const THEME = 'ZZ-questions-de-cours';
const IDS = {
	carte: crypto.randomUUID(),
	marque: crypto.randomUUID(),
	ordinaire: crypto.randomUUID(),
	brouillon: crypto.randomUUID()
};
let pointId = '';

const service = createServiceRoleClient();

function template(id: string, type: string, options: Record<string, unknown>, level: number) {
	return {
		id,
		type,
		title: `Modèle ${id.slice(0, 8)} ZZ`,
		theme: THEME,
		domain: 'Tests',
		subdomain: null,
		level,
		grades: ['1_SPE'],
		status: level === 4 ? 'draft' : 'published',
		options,
		variations:
			type === 'course_card'
				? [{ statement: 'Définition ?', correction: { steps: ['Réponse.'] } }]
				: [{ statement: 'Combien font $2+2$ ? $?$', blanks: [{ expectedAnswer: '4' }] }]
	};
}

describe('questions de cours : filtre et lecture élève', () => {
	let eleve: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();
		await service.from('question_templates').delete().eq('theme', THEME);
		const { error } = await service
			.from('question_templates')
			.insert([
				template(IDS.carte, 'course_card', { courseCard: true }, 1),
				template(IDS.marque, 'fill_in_blanks', { courseQuestion: true }, 2),
				template(IDS.ordinaire, 'fill_in_blanks', {}, 3),
				template(IDS.brouillon, 'fill_in_blanks', {}, 4)
			] as never);
		expect(error, 'décor non posé').toBeNull();

		// Un point du programme, auquel on rattache un modèle publié et un brouillon
		const { data: theme, error: errTheme } = await service
			.from('curriculum_themes' as never)
			.insert({ grade: '1_SPE', name: `T ${THEME}` } as never)
			.select('id')
			.single();
		expect(errTheme).toBeNull();
		const { data: objective, error: errObj } = await service
			.from('curriculum_objectives' as never)
			.insert({ theme_id: (theme as { id: string }).id, name: `O ${THEME}` } as never)
			.select('id')
			.single();
		expect(errObj).toBeNull();
		const { data: point, error: errPoint } = await service
			.from('curriculum_points' as never)
			.insert({
				objective_id: (objective as { id: string }).id,
				name: `P ${THEME}`,
				kind: 'connaissance'
			} as never)
			.select('id')
			.single();
		expect(errPoint).toBeNull();
		pointId = (point as { id: string }).id;
		const { error: errTag } = await service.from('question_template_points' as never).insert([
			{ template_id: IDS.ordinaire, point_id: pointId },
			{ template_id: IDS.brouillon, point_id: pointId }
		] as never);
		expect(errTag).toBeNull();

		const profil = await TestData.profile().withRole('student').create();
		eleve = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { error: errLogin } = await eleve.auth.signInWithPassword({
			email: profil.email,
			password: DEFAULT_TEST_PASSWORD
		});
		expect(errLogin).toBeNull();
	});

	afterAll(async () => {
		await service
			.from('question_template_points' as never)
			.delete()
			.eq('point_id', pointId);
		await service.from('question_templates').delete().eq('theme', THEME);
		await service
			.from('curriculum_themes' as never)
			.delete()
			.eq('name', `T ${THEME}`);
		await cleanupAllTestData();
	});

	it('le filtre du catalogue retrouve la carte et le modèle marqué, pas le modèle ordinaire', async () => {
		const { data, error } = await service
			.from('question_templates')
			.select('id')
			.eq('theme', THEME)
			.or(COURSE_QUESTION_FILTER);
		expect(error).toBeNull();
		expect((data ?? []).map((r) => r.id).sort()).toEqual([IDS.carte, IDS.marque].sort());
	});

	it("un élève lit les options d'un modèle publié (jointure du paquet Programme)", async () => {
		const { data, error } = await eleve
			.from('question_templates')
			.select('id, options, status')
			.eq('id', IDS.marque)
			.single();
		expect(error).toBeNull();
		expect(data?.status).toBe('published');
		expect((data?.options as { courseQuestion?: boolean } | null)?.courseQuestion).toBe(true);
	});

	it('la jointure réelle du paquet Programme rend options et statut du modèle publié, rien pour un brouillon', async () => {
		// Même forme que record-series-reviews.ts : question_template_points → question_templates(options, status)
		const { data, error } = await eleve
			.from('question_template_points' as never)
			.select('template_id, question_templates(options, status)')
			.eq('point_id', pointId);
		expect(error).toBeNull();
		const rows = (data ?? []) as Array<{
			template_id: string;
			question_templates: { options: unknown; status: string } | null;
		}>;
		const publie = rows.find((r) => r.template_id === IDS.ordinaire);
		expect(publie?.question_templates?.status).toBe('published');
		const brouillon = rows.find((r) => r.template_id === IDS.brouillon);
		// Brouillon invisible pour l'élève : la règle entersProgrammeDeck ne l'ajoute pas
		expect(brouillon?.question_templates ?? null).toBeNull();
	});
});
