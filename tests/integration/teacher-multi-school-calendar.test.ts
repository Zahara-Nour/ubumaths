/**
 * Le professeur voit le calendrier de TOUTES ses écoles (base locale requise)
 * ==========================================================================
 *
 * Le modèle est mono-professeur : un seul enseignant, dont toutes les écoles
 * sont les siennes. Ses CLASSES lui sont d'ailleurs déjà visibles sans
 * condition d'école (`view_own_classes` = `is_teacher_or_admin()`).
 *
 * Mais son CALENDRIER ne l'était pas : années scolaires, vacances et périodes
 * étaient filtrées sur `profiles.school_id`. Un professeur qui tient une
 * seconde école — un établissement d'accueil, un groupe de cours particuliers —
 * ne voyait donc ni son année, ni ses vacances. Conséquence directe : le
 * calendrier de séances du cahier de texte ne proposait aucune échéance pour
 * les classes de cette école, et n'excluait pas ses vacances.
 *
 * ⚠️ CE QUI NE BOUGE PAS : la frontière ÉLÈVE. Un élève ne voit que le
 * calendrier de SON école — c'est la frontière safeguarding, et les tests
 * témoins ci-dessous la vérifient dans les deux sens.
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

const service = createServiceRoleClient();

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
	return client;
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

describe('calendrier du professeur sur plusieurs écoles', () => {
	/** L'école du profil du professeur. */
	let ecolePrincipale: string;
	/** Une seconde école : cours particuliers, établissement d'accueil… */
	let ecoleSecondaire: string;
	let anneePrincipale: string;
	let anneeSecondaire: string;
	let vacancesSecondaire: string;
	let periodeSecondaire: string;
	let vacancesPrincipale: string;
	let periodePrincipale: string;
	let prof: SupabaseClient<Database>;
	let elevePrincipale: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const ecole = (nom: string) => ({ name: nom, city: 'Ville ZZ', country: 'France' });
		ecolePrincipale = await insert('schools', ecole('Lycée principal ZZ'));
		ecoleSecondaire = await insert('schools', ecole('Cours particuliers ZZ'));

		const enseignant = await TestData.profile().withRole('teacher').create();
		const { error: rattachement } = await service
			.from('profiles')
			.update({ school_id: ecolePrincipale })
			.eq('id', enseignant.id);
		expect(rattachement).toBeNull();
		prof = await clientFor(enseignant.email);

		const eleve = await TestData.profile().withRole('student').create();
		const { error: rattachementEleve } = await service
			.from('profiles')
			.update({ school_id: ecolePrincipale })
			.eq('id', eleve.id);
		expect(rattachementEleve).toBeNull();
		elevePrincipale = await clientFor(eleve.email);

		anneePrincipale = await insert('school_years', {
			school_id: ecolePrincipale,
			name: '2026-2027 principale ZZ',
			start_date: '2026-09-01',
			end_date: '2027-07-01',
			is_active: true
		});
		anneeSecondaire = await insert('school_years', {
			school_id: ecoleSecondaire,
			name: '2026-2027 particuliers ZZ',
			start_date: '2026-09-01',
			end_date: '2027-07-01',
			is_active: true
		});

		vacancesSecondaire = await insert('school_holidays', {
			school_year_id: anneeSecondaire,
			name: 'Toussaint particuliers ZZ',
			start_date: '2026-10-17',
			end_date: '2026-11-02'
		});
		vacancesPrincipale = await insert('school_holidays', {
			school_year_id: anneePrincipale,
			name: 'Toussaint principale ZZ',
			start_date: '2026-10-17',
			end_date: '2026-11-02'
		});
		periodePrincipale = await insert('academic_periods', {
			school_year_id: anneePrincipale,
			name: 'Trimestre 1 principale ZZ',
			type: 'trimester',
			period_order: 1,
			start_date: '2026-09-01',
			end_date: '2026-12-20'
		});

		periodeSecondaire = await insert('academic_periods', {
			school_year_id: anneeSecondaire,
			name: 'Trimestre 1 particuliers ZZ',
			type: 'trimester',
			period_order: 1,
			start_date: '2026-09-01',
			end_date: '2026-12-20'
		});
	});

	afterAll(async () => {
		await service.from('schools').delete().in('id', [ecolePrincipale, ecoleSecondaire]);
		await cleanupAllTestData();
	});

	async function voit(
		client: SupabaseClient<Database>,
		table: string,
		id: string
	): Promise<boolean> {
		const { data, error } = await client
			.from(table as never)
			.select('id')
			.eq('id', id);
		expect(error).toBeNull();
		return (data ?? []).length === 1;
	}

	// ── Le professeur ──────────────────────────────────────────────────────

	it('le témoin — il voit le calendrier de son école principale', async () => {
		expect(await voit(prof, 'school_years', anneePrincipale)).toBe(true);
	});

	it('il voit l’année scolaire de sa SECONDE école', async () => {
		expect(await voit(prof, 'school_years', anneeSecondaire)).toBe(true);
	});

	it('il voit ses vacances', async () => {
		// Sans elles, le calendrier de séances du cahier de texte proposerait des
		// échéances en pleine période de congés.
		expect(await voit(prof, 'school_holidays', vacancesSecondaire)).toBe(true);
	});

	it('il voit ses périodes', async () => {
		expect(await voit(prof, 'academic_periods', periodeSecondaire)).toBe(true);
	});

	// ── L'élève : la frontière ne bouge pas ────────────────────────────────

	it('le témoin — l’élève voit le calendrier de SON école', async () => {
		expect(await voit(elevePrincipale, 'school_years', anneePrincipale)).toBe(true);
	});

	it('le témoin — l’élève voit les périodes de SON école', async () => {
		// Sans ce cas, les témoins négatifs ci-dessous ne distinguent pas « la
		// frontière tient » de « la table ne rend rien à personne » : perdre la
		// policy élève laisserait tous les tests verts pendant que les élèves
		// perdraient leur calendrier.
		expect(await voit(elevePrincipale, 'academic_periods', periodePrincipale)).toBe(true);
	});

	it('l’élève ne voit PAS l’année d’une autre école', async () => {
		// La frontière safeguarding. L'ouverture accordée au professeur ne doit en
		// aucun cas déborder sur les élèves.
		expect(await voit(elevePrincipale, 'school_years', anneeSecondaire)).toBe(false);
	});

	it('ni ses périodes', async () => {
		expect(await voit(elevePrincipale, 'academic_periods', periodeSecondaire)).toBe(false);
	});

	it('aucune vacance — `school_holidays` n’a PAS de policy élève', async () => {
		// Ce cas ne teste pas une frontière d'école : l'élève ne voit AUCUNE
		// vacance, pas même celles de sa propre école, faute de policy. D'où
		// l'assertion sur les deux — sans quoi le nom du test laisserait croire à
		// une frontière, et une future policy élève le ferait rougir comme s'il
		// s'agissait d'une régression.
		expect(await voit(elevePrincipale, 'school_holidays', vacancesPrincipale)).toBe(false);
		expect(await voit(elevePrincipale, 'school_holidays', vacancesSecondaire)).toBe(false);
	});

	it('un visiteur anonyme ne voit aucun calendrier', async () => {
		// Deux issues acceptables, et elles DIFFÈRENT entre local et production :
		// en production `anon` détient un GRANT SELECT hérité sur ces tables, donc
		// la requête aboutit et rend zéro ligne ; en local le grant est absent et
		// PostgreSQL refuse d'emblée (42501). Dans les deux cas il ne voit rien —
		// exiger l'une des deux ferait rougir le test sur l'autre environnement.
		const anonyme = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		const neVoitRien = async (table: string, id: string) => {
			const { data, error } = await anonyme
				.from(table as never)
				.select('id')
				.eq('id', id);
			if (error) {
				expect(error.code, `${table} : refus attendu, autre erreur reçue`).toBe('42501');
				return;
			}
			expect(data ?? []).toHaveLength(0);
		};

		await neVoitRien('school_years', anneePrincipale);
		await neVoitRien('school_years', anneeSecondaire);
		await neVoitRien('academic_periods', periodePrincipale);
		await neVoitRien('school_holidays', vacancesPrincipale);
	});

	// L'ADMINISTRATEUR n'est pas testé ici : `Admins can manage school years`
	// (FOR ALL) lui donnait déjà tout avant cette migration, qui ne le concerne
	// donc pas.
});
