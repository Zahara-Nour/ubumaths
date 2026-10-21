/**
 * Renommage des grades de la voie technologique
 * =============================================
 *
 * Migration `20261007210000_renommage_grades_voie_technologique` :
 * 1_STMG → 1_TECHNO, T_STMG → T_TECHNO (le programme de maths du tronc commun
 * est commun à toutes les séries technologiques).
 *
 * Ce que le fichier prouve :
 *   R1. les contraintes CHECK (sur curriculum_points, seule table de grade restante du programme) acceptent les nouveaux codes ;
 *   R2. elles refusent les anciens (23514) ;
 *   R3. la normalisation d'une saisie libre renvoie les nouveaux codes,
 *       y compris pour les alias « stmg » hérités ;
 *   R4. le cycle pédagogique des nouveaux codes reste « cycle_terminal ».
 *
 * (La dispense de consentement parental des 1_TECHNO / T_TECHNO est prouvée
 * par consentement-par-niveau.test.ts : son test A2 fait passer un élève en
 * 1_TECHNO puis T_TECHNO et attend consent_required = false — rouge sans la
 * migration, vert avec.)
 *
 * @vitest-environment node
 */
import { describe, it, expect, afterAll } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const service = createServiceRoleClient();

const TEST_CODE_PREFIX = 'TST-TECHNO-';

/** Un nœud réel de l'arbre, pour poser les points de test (node_id est obligatoire). */
async function nodeAncre(): Promise<string> {
	const { data, error } = await service
		.from('curriculum_points')
		.select('node_id')
		.eq('grade', '6')
		.limit(1)
		.single();
	if (error || !data?.node_id) throw new Error(`Aucun nœud d'ancrage : ${error?.message}`);
	return data.node_id;
}

function point(grade: string, code: string, node_id: string) {
	return {
		code: `${TEST_CODE_PREFIX}${code}`,
		name: `TEST renommage techno ${code}`,
		kind: 'savoir_faire',
		grade,
		node_id
	};
}

afterAll(async () => {
	const { error } = await service
		.from('curriculum_points')
		.delete()
		.like('code', `${TEST_CODE_PREFIX}%`)
		.select('id');
	if (error) throw new Error(`Nettoyage des points de test impossible : ${error.message}`);
});

describe('R1 — les nouveaux codes sont acceptés', () => {
	it('curriculum_points accepte 1_TECHNO et T_TECHNO', async () => {
		const node = await nodeAncre();
		const { data, error } = await service
			.from('curriculum_points')
			.insert([point('1_TECHNO', 'premiere', node), point('T_TECHNO', 'terminale', node)])
			.select('id, grade');
		expect(error).toBeNull();
		expect(data).toHaveLength(2);
	});
});

describe('R2 — les anciens codes sont refusés', () => {
	it.each(['1_STMG', 'T_STMG'])('curriculum_points refuse %s (23514)', async (grade) => {
		const { data, error } = await service
			.from('curriculum_points')
			.insert(point(grade, `ancien-${grade}`, await nodeAncre()))
			.select('id');
		expect(data).toBeNull();
		expect(error?.code).toBe('23514');
	});
});

describe('R3 — normalisation des saisies libres', () => {
	it.each([
		['1ère techno', '1_TECHNO'],
		['première technologique', '1_TECHNO'],
		['terminale techno', 'T_TECHNO'],
		// Alias hérités : toujours acceptés en entrée, mais nouveaux codes en sortie.
		['1ere stmg', '1_TECHNO'],
		['terminale stmg', 'T_TECHNO'],
		['stmg', 'T_TECHNO']
	])('normalize_grade_value(%s) → %s', async (saisie, attendu) => {
		const { data, error } = await service.rpc('normalize_grade_value', { input_grade: saisie });
		expect(error).toBeNull();
		expect(data).toBe(attendu);
	});
});

describe('R4 — cycle pédagogique', () => {
	it.each(['1_TECHNO', 'T_TECHNO'])('get_cycle_for_grade(%s) → cycle_terminal', async (grade) => {
		const { data, error } = await service.rpc('get_cycle_for_grade', { p_grade: grade });
		expect(error).toBeNull();
		expect(data).toBe('cycle_terminal');
	});
});
