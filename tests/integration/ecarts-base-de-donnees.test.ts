/**
 * Preuves du registre des écarts — suppressions en cascade (base locale)
 * =====================================================================
 *
 * Deux écarts ouverts de `docs/ecarts/registre.md` (L112, L113) ne se prouvent
 * que sur une vraie base. Chacun a ici :
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
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient,
	insertTestExercise
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

// Constantes
// Client non typé : les lectures de contrôle portent sur des tables variées.
const service = createServiceRoleClient() as unknown as SupabaseClient;

// Variables
const nodeIds: string[] = [];
const pointIds: string[] = [];
const exerciseIds: string[] = [];
const entryIds: string[] = [];
const classIds: string[] = [];

// Functions
async function insertId(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data as { id: string }).id;
}

/** Nombre de lignes de `table` où `colonne` vaut `valeur` ; une lecture en échec lève. */
async function compter(table: string, colonne: string, valeur: string): Promise<number> {
	const { count, error } = await service
		.from(table)
		.select('*', { count: 'exact', head: true })
		.eq(colonne, valeur);
	if (error || count === null)
		throw new Error(`${table} : ${error?.message ?? 'compte illisible'}`);
	return count;
}

/** Un point du programme neuf, sous sa propre branche et sa propre notion. */
async function nouveauPoint(): Promise<string> {
	const tag = crypto.randomUUID().slice(0, 8);
	const branche = await insertId('classification_nodes', {
		kind: 'branch',
		name: `TEST branche ${tag}`,
		parent_id: null,
		position: 900
	});
	nodeIds.push(branche);
	const notion = await insertId('classification_nodes', {
		kind: 'notion',
		name: `TEST notion ${tag}`,
		parent_id: branche,
		position: 0
	});
	nodeIds.push(notion);
	const point = await insertId('curriculum_points', {
		code: `TST-${tag}`,
		name: `Point ${tag}`,
		kind: 'savoir_faire',
		grade: '5',
		display_order: 0,
		node_id: notion
	});
	pointIds.push(point);
	return point;
}

describe('preuves des écarts — suppressions en cascade (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
	}, 120_000);

	afterAll(async () => {
		// Enfants d'abord : ce que la preuve n'a pas pu supprimer est encore là.
		await service.from('journal_entry_activities').delete().in('entry_id', entryIds);
		await service.from('class_journal_entries').delete().in('id', entryIds);
		await service.from('exercises').delete().in('id', exerciseIds);
		await service.from('classes').delete().in('id', classIds);
		await service.from('student_point_state').delete().in('point_id', pointIds);
		await service.from('curriculum_points').delete().in('id', pointIds);
		for (const kind of ['notion', 'branch']) {
			await service.from('classification_nodes').delete().in('id', nodeIds).eq('kind', kind);
		}
		await cleanupAllTestData();
	});

	describe('suppression d’un point du programme qu’un élève a travaillé', () => {
		let pointsLibresRestants: number;
		let etatsRestants: number;

		beforeAll(async () => {
			// La suppression peut être refusée par une erreur : seules les lignes
			// relues ensuite disent ce qui s'est passé.
			const libre = await nouveauPoint();
			await service.from('curriculum_points').delete().eq('id', libre);
			pointsLibresRestants = await compter('curriculum_points', 'id', libre);

			const travaille = await nouveauPoint();
			const eleve = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('student_point_state')
				.insert({ point_id: travaille, student_id: eleve.id, total_successes: 3 });
			if (error) throw new Error(`état de l'élève : ${error.message}`);
			if ((await compter('student_point_state', 'point_id', travaille)) !== 1) {
				throw new Error('état de l’élève non écrit');
			}
			await service.from('curriculum_points').delete().eq('id', travaille);
			etatsRestants = await compter('student_point_state', 'point_id', travaille);
		});

		it('témoin : un point que personne n’a travaillé se supprime', () => {
			expect(pointsLibresRestants).toBe(0);
		});

		it.fails('écart L112 : l’acquisition de l’élève sur le point est toujours là', () => {
			expect(etatsRestants).toBe(1);
		});
	});

	describe('suppression d’un exercice cité par une séance du cahier de texte', () => {
		let libresRestants: number;
		let citesRestants: number;

		beforeAll(async () => {
			const prof = await TestData.profile().withRole('teacher').create();

			const libre = await insertTestExercise({ createdBy: prof.id });
			exerciseIds.push(libre.id);
			await service.from('exercises').delete().eq('id', libre.id);
			libresRestants = await compter('exercises', 'id', libre.id);

			const cite = await insertTestExercise({ createdBy: prof.id });
			exerciseIds.push(cite.id);
			const classe = await TestData.class().withName('5e Preuves').create();
			classIds.push(classe.id);
			const seance = await insertId('class_journal_entries', {
				class_id: classe.id,
				entry_date: '2026-02-10'
			});
			entryIds.push(seance);
			await insertId('journal_entry_activities', {
				entry_id: seance,
				kind: 'exercise',
				exercise_id: cite.id
			});
			await service.from('exercises').delete().eq('id', cite.id);
			citesRestants = await compter('exercises', 'id', cite.id);
		});

		it('témoin : un exercice qu’aucune séance ne cite se supprime', () => {
			expect(libresRestants).toBe(0);
		});

		it.fails('écart L113 : l’exercice cité par une séance se supprime aussi', () => {
			expect(citesRestants).toBe(0);
		});
	});
});
