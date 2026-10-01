/**
 * Ce que l'élève voit suit l'horloge de la BASE (base locale requise)
 * ===================================================================
 *
 * Même famille que `published-at-horloge-base.test.ts` : la RLS compare à
 * `now()` (horloge de Postgres) ; le code ajoutait un filtre PostgREST avec
 * l'heure de NODE. Les deux filtres se combinent en ET, donc le plus strict
 * gagne, et un décalage d'horloge cache à l'élève ce que la RLS lui donne.
 *
 * - `available_from` (fiches) : le filtre de Node exclut ce qui est postérieur
 *   à SON heure. Le cas qui casse est donc Node en RETARD — la fiche tout juste
 *   distribuée (`available_from` = `now()` de la base) disparaît.
 * - `expires_at` (notifications) : le filtre de Node exclut ce qui expire
 *   avant SON heure. Le cas qui casse est Node en AVANCE.
 *
 * Le sens du décalage est choisi pour faire échouer l'ancien code ; dans
 * l'autre sens, la RLS rattrape seule et rien ne se voit.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { getStudentWorkInbox } from '$lib/server/student-inbox';
import { getUnreadNotifications } from '$lib/server/notifications';
import type { Database } from '$lib/types/database';
import { GET as listerFichesEleve } from '../../src/routes/api/student/worksheets/+server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Le décalage forcé entre Node et la base, très au-dessus du seuil mesuré. */
const DECALAGE_MS = 2000;

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

/** Client AUTHENTIFIÉ : avec `service_role`, la RLS ne filtrerait plus rien. */
function buildLocals(userId: string, client: SupabaseClient<Database>): App.Locals {
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: userId } as User }),
		user: { id: userId } as User,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
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

describe('la visibilité élève ne dépend pas de l’horloge de Node', () => {
	let eleveId: string;
	let eleve: SupabaseClient<Database>;
	let ficheId: string;
	let affectationId: string;
	let notificationId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		const ecole = await insert('schools', {
			name: 'Lycée horloge élève HE',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année horloge élève HE',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE horloge élève HE',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'HEHO01',
			is_active: true
		});

		const profil = await TestData.profile().withRole('student').create();
		eleveId = profil.id;
		{
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classe, student_id: eleveId, status: 'active' });
			expect(error).toBeNull();
		}
		eleve = await clientFor(profil.email);

		ficheId = await insert('worksheets', {
			title: 'Fiche tout juste distribuée HE',
			type: 'worksheet',
			status: 'published',
			created_by: enseignant.id
		});
		// `available_from` laissé à son défaut : le `now()` de la BASE, comme une
		// distribution réelle.
		affectationId = await insert('worksheet_assignments', {
			worksheet_id: ficheId,
			status: 'active',
			created_by: enseignant.id
		});
		await insert('worksheet_assignment_classes', {
			assignment_id: affectationId,
			class_id: classe
		});

		// Expire dans une minute : pas encore expirée pour la base.
		notificationId = await insert('notifications', {
			title: 'Notification horloge HE',
			message: 'Encore valable',
			type: 'info',
			target_type: 'users',
			target_user_ids: [eleveId],
			expires_at: new Date(Date.now() + 60_000).toISOString()
		});
	}, 120_000);

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('« Mon travail » montre la fiche tout juste distribuée, Node en retard de 2 s', async () => {
		vi.setSystemTime(new Date(Date.now() - DECALAGE_MS));
		const inbox = await getStudentWorkInbox(eleve as never, eleveId);
		vi.useRealTimers();

		const toutes = [
			...inbox.late,
			...inbox.thisWeek,
			...inbox.later,
			...inbox.noDeadline,
			...inbox.doneRecently
		].map((item) => item.itemId);
		expect(toutes).toContain(ficheId);
	});

	it('GET /api/student/worksheets la liste, Node en retard de 2 s', async () => {
		vi.setSystemTime(new Date(Date.now() - DECALAGE_MS));
		const response = await listerFichesEleve({
			locals: buildLocals(eleveId, eleve),
			url: new URL('http://localhost/api/student/worksheets')
		} as never);
		vi.useRealTimers();

		expect(response.status).toBe(200);
		const body = (await response.json()) as { worksheets: { assignment_id: string }[] };
		expect(body.worksheets.map((w) => w.assignment_id)).toContain(affectationId);
	});

	it('une notification non expirée pour la base reste visible, Node en avance de 2 min', async () => {
		// 2 min et non 2 s : la notification expire dans 60 s, l'avance doit la
		// dépasser pour que l'ancien filtre la cache.
		vi.setSystemTime(new Date(Date.now() + 120_000));
		const { notifications } = await getUnreadNotifications(eleve as never, eleveId);
		vi.useRealTimers();

		expect(notifications.map((n) => n.id)).toContain(notificationId);
	});
});
