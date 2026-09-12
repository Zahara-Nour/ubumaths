/**
 * Une classe appartient à une année scolaire (base locale requise)
 * ===============================================================
 *
 * Phase 1 de la bascule d'année — voir
 * `docs/wip/bascule-annee-scolaire-etat-des-lieux.md`.
 *
 * `school_years` existait, portait les trimestres et les vacances, et servait
 * déjà au calendrier de séances du cahier de texte. Mais `classes` n'avait
 * aucune colonne vers cette table : `classes.is_active` tenait lieu de
 * rattachement à l'année, à la main. C'est pourquoi ce drapeau portait deux
 * sens contradictoires — « pas encore ouverte » et « terminée » : il remplaçait
 * un lien qui n'avait jamais été posé.
 *
 * Cette phase pose le lien. Elle ne change AUCUN accès : rien ne lit encore
 * `school_year_id`, et `is_active` continue de gouverner comme avant.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';

const service = createServiceRoleClient();

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('rattachement d’une classe à son année scolaire', () => {
	let ecoleA: string;
	let ecoleB: string;
	let anneeA: string;
	let anneeB2025: string;
	let anneeB2026: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		await TestData.profile().withRole('teacher').create();

		const ecole = (nom: string) => ({ name: nom, city: 'Ville ZZ', country: 'France' });
		ecoleA = await insert('schools', ecole('École à une année ZZ'));
		ecoleB = await insert('schools', ecole('École à deux années ZZ'));

		anneeA = await insert('school_years', {
			school_id: ecoleA,
			name: '2026-2027 A ZZ',
			start_date: '2026-08-31',
			end_date: '2027-07-15',
			is_active: true
		});
		anneeB2025 = await insert('school_years', {
			school_id: ecoleB,
			name: '2025-2026 B ZZ',
			start_date: '2025-09-01',
			end_date: '2026-06-30',
			is_active: false
		});
		anneeB2026 = await insert('school_years', {
			school_id: ecoleB,
			name: '2026-2027 B ZZ',
			start_date: '2026-08-31',
			end_date: '2027-07-15',
			is_active: true
		});
	});

	afterAll(async () => {
		await service.from('schools').delete().in('id', [ecoleA, ecoleB]);
		await cleanupAllTestData();
	});

	/** Le rattrapage de la migration, rejoué sur des classes fabriquées. */
	async function rattraper(): Promise<void> {
		const pg = await getPostgresClient();
		await pg.query(`
			update public.classes c
			set school_year_id = sy.id
			from public.school_years sy
			where sy.school_id = c.school_id
				and c.school_year_id is null
				and c.created_at::date between sy.start_date and sy.end_date;

			update public.classes c
			set school_year_id = sy.id
			from public.school_years sy
			where sy.school_id = c.school_id
				and c.school_year_id is null
				and (select count(*) from public.school_years s2 where s2.school_id = c.school_id) = 1;
		`);
	}

	async function anneeDe(classeId: string): Promise<string | null> {
		const { data, error } = await service
			.from('classes')
			.select('school_year_id')
			.eq('id', classeId)
			.single();
		expect(error).toBeNull();
		return (data as { school_year_id: string | null }).school_year_id;
	}

	async function creerClasse(ecoleId: string, nom: string, creeeLe: string): Promise<string> {
		const id = await insert('classes', {
			name: nom,
			join_code: nom
				.replace(/[^A-Z0-9]/gi, '')
				.slice(0, 8)
				.toUpperCase(),
			school_id: ecoleId
		});
		// La date de création se pose après coup : elle a un défaut `now()`.
		const pg = await getPostgresClient();
		await pg.query('update public.classes set created_at = $1 where id = $2', [creeeLe, id]);
		return id;
	}

	it('la colonne existe et accepte NULL pendant la transition', async () => {
		const classe = await creerClasse(ecoleA, 'TransitionZZ', '2026-09-04');
		// Rien ne la remplit à la création : la Phase 1 ne pose pas de trigger.
		expect(await anneeDe(classe)).toBeNull();
	});

	it('le rattrapage déduit l’année quand l’école n’en a qu’UNE', async () => {
		// Y compris pour une date HORS des bornes : `1SPE-TEST`, créée six jours
		// avant le début de l'année, tombait dans le trou entre deux exercices.
		// L'école ne comptant qu'une année, il n'y a pourtant aucune ambiguïté.
		const horsBornes = await creerClasse(ecoleA, 'HorsBornesZZ', '2026-08-25');
		await rattraper();
		expect(await anneeDe(horsBornes)).toBe(anneeA);
	});

	it('et il départage par la DATE quand l’école en a plusieurs', async () => {
		const ancienne = await creerClasse(ecoleB, 'AncienneZZ', '2025-10-12');
		const nouvelle = await creerClasse(ecoleB, 'NouvelleZZ', '2026-09-04');
		await rattraper();
		expect(await anneeDe(ancienne)).toBe(anneeB2025);
		expect(await anneeDe(nouvelle)).toBe(anneeB2026);
	});

	it('une classe reste rattachée à une année de SON école', async () => {
		// Le garde-fou : un rattrapage qui ignorerait `school_id` pourrait coller
		// à une classe l'année d'un autre établissement.
		const classe = await creerClasse(ecoleA, 'ControleZZ', '2026-09-04');
		await rattraper();

		const { data, error } = await service
			.from('classes')
			.select('school_id, school_year_id')
			.eq('id', classe)
			.single();
		expect(error).toBeNull();
		const ligne = data as { school_id: string; school_year_id: string };

		const { data: annee } = await service
			.from('school_years')
			.select('school_id')
			.eq('id', ligne.school_year_id)
			.single();
		expect((annee as { school_id: string }).school_id).toBe(ligne.school_id);
	});

	it('le rattrapage est idempotent', async () => {
		await creerClasse(ecoleA, 'IdempotentZZ', '2026-09-04');
		await rattraper();
		const pg = await getPostgresClient();
		const { rows } = await pg.query(`
			select count(*)::int as restantes
			from public.classes c
			where c.school_year_id is null and c.school_id is not null
		`);
		expect((rows[0] as { restantes: number }).restantes).toBe(0);
	});

	it('une classe SANS école reste sans année', async () => {
		// `classes.school_id` est nullable : sans école, aucune année ne peut être
		// déduite. Le rattrapage doit la laisser tranquille, pas échouer.
		const orpheline = await insert('classes', {
			name: 'OrphelineZZ',
			join_code: 'ORPHZZ01'
		});
		await rattraper();
		expect(await anneeDe(orpheline)).toBeNull();
	});
});
