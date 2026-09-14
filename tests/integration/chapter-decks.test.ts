/**
 * Rattacher un deck de révision à un chapitre (base locale requise)
 * =================================================================
 *
 * L'élève ne voit un deck rattaché que si TROIS conditions tiennent ensemble :
 * le chapitre est visible et il en est membre ACTIF, le rattachement est
 * publié, et le deck lui a été ASSIGNÉ.
 *
 * ⚠️ La troisième n'est pas du zèle. `get_due_cards_for_deck` refuse depuis
 * `20260915320000` un deck qui n'appartient pas à l'appelant : sans elle,
 * l'élève verrait dans son chapitre un deck qu'il ne peut pas ouvrir.
 *
 * ⚠️ Un smoke-test `auth.uid()` NULL ne prouverait rien : le garde du chapitre
 * sort avant.
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
const PUBLIE = new Date(Date.now() - 3600_000).toISOString();

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

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

async function decksVusPar(client: SupabaseClient<Database>, chapitre: string): Promise<string[]> {
	const { data, error } = await client
		.from('chapter_decks')
		.select('id')
		.eq('chapter_id', chapitre);
	expect(error).toBeNull();
	return (data ?? []).map((d) => d.id);
}

describe('decks rattachés à un chapitre', () => {
	let chapitre: string;
	let autreChapitre: string;
	let deckSource: string;
	let lienPublie: string;
	let lienPrepare: string;
	let lienNonAssigne: string;

	let equipe: SupabaseClient<Database>;
	let sansDeck: SupabaseClient<Database>;
	/** Élève actif d'une AUTRE classe : la frontière de l'établissement. */
	let eleveAilleurs: SupabaseClient<Database>;
	/** Ancien membre de la classe : il ne reçoit plus rien. */
	let eleveArchive: SupabaseClient<Database>;
	let lienProgramme: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const prof = await TestData.profile().withRole('teacher').create();

		const ecole = await insert('schools', {
			name: 'Lycée decks QQ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année decks QQ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE decks QQ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'QQDE01',
			is_active: true
		});

		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre decks QQ',
			display_order: 1,
			is_visible: true
		});
		autreChapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Autre chapitre QQ',
			display_order: 2,
			is_visible: true
		});

		const deck = async (nom: string) =>
			insert('srs_decks', { owner_id: prof.id, name: nom, deck_type: 'official' });

		deckSource = await deck('Deck du chapitre QQ');
		const deckPrepare = await deck('Deck préparé QQ');
		const deckJamaisAssigne = await deck('Deck jamais assigné QQ');

		lienPublie = await insert('chapter_decks', {
			chapter_id: chapitre,
			deck_id: deckSource,
			mode: 'force',
			published_at: PUBLIE
		});
		lienPrepare = await insert('chapter_decks', {
			chapter_id: chapitre,
			deck_id: deckPrepare,
			published_at: null
		});
		lienNonAssigne = await insert('chapter_decks', {
			chapter_id: chapitre,
			deck_id: deckJamaisAssigne,
			published_at: PUBLIE
		});

		// Programmé pour demain : le cas que `published_at is not null` aurait
		// laissé passer, et qui montrerait le contenu du contrôle en avance.
		const deckProgramme = await deck('Deck programmé QQ');
		lienProgramme = await insert('chapter_decks', {
			chapter_id: chapitre,
			deck_id: deckProgramme,
			published_at: new Date(Date.now() + 86_400_000).toISOString()
		});

		const ARRIVEE = new Date(Date.now() - 30 * 86_400_000).toISOString();
		const eleve = async (
			decksAssignes: string[],
			options: { classeId?: string; statut?: string } = {}
		) => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service.from('class_members').insert({
				class_id: options.classeId ?? classe,
				student_id: profil.id,
				status: 'active',
				joined_at: ARRIVEE
			});
			expect(error).toBeNull();

			if (options.statut === 'archived') {
				const { error: sortie } = await service
					.from('class_members')
					.update({ status: 'archived' })
					.eq('class_id', options.classeId ?? classe)
					.eq('student_id', profil.id);
				expect(sortie).toBeNull();
			}

			for (const deckAssigne of decksAssignes) {
				// La copie ET son assignation, telles que l'endpoint les crée.
				await insert('srs_decks', {
					owner_id: profil.id,
					name: `Copie QQ ${deckAssigne.slice(0, 8)}`,
					deck_type: 'official',
					is_assigned: true,
					source_deck_id: deckAssigne
				});
				await insert('srs_deck_assignments', {
					source_deck_id: deckAssigne,
					assigned_by: prof.id,
					assigned_to: profil.id,
					assignment_type: 'student'
				});
			}
			return clientFor(profil.email);
		};

		equipe = await eleve([deckSource, deckProgramme]);
		// Même classe, même chapitre : seule l'assignation les sépare.
		sansDeck = await eleve([]);

		// Une SECONDE classe : sans elle, retirer `is_class_student` de la policy
		// laisserait tous les cas au vert.
		const autreClasse = await insert('classes', {
			name: '2DE decks QQ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'QQDE02',
			is_active: true
		});
		eleveAilleurs = await eleve([deckSource], { classeId: autreClasse });
		eleveArchive = await eleve([deckSource], { statut: 'archived' });
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('l’élève équipé voit le deck publié qui lui est assigné', async () => {
		expect(await decksVusPar(equipe, chapitre)).toContain(lienPublie);
	});

	// Ranger un deck dans un chapitre ne le publie pas.
	it('ne voit pas un rattachement préparé', async () => {
		expect(await decksVusPar(equipe, chapitre)).not.toContain(lienPrepare);
	});

	/**
	 * La garde qui évite la porte fermée : `get_due_cards_for_deck` refuse un
	 * deck qui n'appartient pas à l'appelant. Montrer l'entrée sans la copie,
	 * c'est promettre une révision impossible.
	 */
	it('ne voit pas un deck publié mais jamais assigné', async () => {
		expect(await decksVusPar(equipe, chapitre)).not.toContain(lienNonAssigne);
	});

	it('un camarade sans copie ne voit rien du tout', async () => {
		expect(await decksVusPar(sansDeck, chapitre)).toEqual([]);
	});

	/**
	 * La frontière de classe. Cet élève a TOUT — la copie, l'assignation, un
	 * chapitre visible — sauf l'appartenance à la classe. Sans ce cas, retirer
	 * `is_class_student` de la policy ne ferait rougir personne.
	 */
	it('un élève d’une AUTRE classe ne voit rien, même équipé', async () => {
		expect(await decksVusPar(eleveAilleurs, chapitre)).toEqual([]);
	});

	it('un ancien membre de la classe ne voit plus rien', async () => {
		expect(await decksVusPar(eleveArchive, chapitre)).toEqual([]);
	});

	/**
	 * `published_at <= now()`, et non `is not null` : un rattachement programmé
	 * pour demain doit rester invisible AUJOURD'HUI.
	 */
	it('une publication programmée ne montre rien avant l’heure', async () => {
		expect(await decksVusPar(equipe, chapitre)).not.toContain(lienProgramme);
	});

	it('un chapitre masqué ne montre aucun deck', async () => {
		{
			const { error } = await service
				.from('class_chapters')
				.update({ is_visible: false })
				.eq('id', chapitre);
			expect(error).toBeNull();
		}

		try {
			expect(await decksVusPar(equipe, chapitre)).toEqual([]);
		} finally {
			const { error } = await service
				.from('class_chapters')
				.update({ is_visible: true })
				.eq('id', chapitre);
			expect(error).toBeNull();
		}
	});

	it('un élève ne peut pas rattacher un deck lui-même', async () => {
		const { error } = await equipe
			.from('chapter_decks')
			.insert({ chapter_id: chapitre, deck_id: deckSource, published_at: PUBLIE });

		expect(error, 'l’insertion aurait dû être refusée').not.toBeNull();
		expect(error?.code).toBe('42501');
	});

	/**
	 * La garde composite, comme pour les cinq autres contenus : une ressource ne
	 * pointe que vers une section de SON chapitre, et c'est la base qui le tient.
	 */
	it('refuse une section d’un AUTRE chapitre', async () => {
		const { data: sections } = await service
			.from('chapter_sections')
			.select('id')
			.eq('chapter_id', autreChapitre)
			.limit(1);

		const { error } = await service
			.from('chapter_decks')
			.update({ section_id: sections![0].id })
			.eq('id', lienPublie);

		expect(error, 'la base aurait dû refuser').not.toBeNull();
		expect(error?.code).toBe('23503');
	});

	it('un même deck ne se range qu’une fois dans un chapitre', async () => {
		const { error } = await service
			.from('chapter_decks')
			.insert({ chapter_id: chapitre, deck_id: deckSource, published_at: PUBLIE });

		expect(error?.code).toBe('23505');
	});
});
