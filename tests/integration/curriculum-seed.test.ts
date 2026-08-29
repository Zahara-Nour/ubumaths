/**
 * Seeds du référentiel de programme — contrôle de forme et de volume.
 *
 * Les seeds sont générés depuis les markdown de `docs/wip/referentiel/` :
 *   - 6ᵉ      → `20260621160000_seed_curriculum_6e.sql`
 *   - 1ʳᵉ spé → `20260830090000_seed_curriculum_1re_spe.sql`
 *     (généré par `scripts/generate-curriculum-1re-spe-seed.ts`)
 *
 * Ces tests ne re-valident pas le contenu pédagogique (c'est la relecture du
 * markdown qui fait ça) mais verrouillent ce qui casserait silencieusement :
 * un volume qui s'effondre, un `kind` hors énumération, un `rang` posé par
 * erreur, ou la typologie du BO qui ne se retrouve plus en base.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createServiceRoleClient } from '../helpers/competence-referentiel.helpers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/types/database';

let service: SupabaseClient<Database>;

beforeAll(() => {
	service = createServiceRoleClient() as unknown as SupabaseClient<Database>;
});

/** Tous les points d'un grade, via l'arbre. */
async function pointsOfGrade(grade: string) {
	const { data: themes, error: tErr } = await service
		.from('curriculum_themes')
		.select('id, name, display_order')
		.eq('grade', grade);
	expect(tErr).toBeNull();

	const themeIds = (themes ?? []).map((t) => t.id);
	if (themeIds.length === 0) return { themes: themes ?? [], objectives: [], points: [] };

	const { data: objectives } = await service
		.from('curriculum_objectives')
		.select('id, theme_id, name')
		.in('theme_id', themeIds);

	const objectiveIds = (objectives ?? []).map((o) => o.id);
	const { data: points } = await service
		.from('curriculum_points')
		.select('id, objective_id, name, kind, regime_acquisition, exigence, rang')
		.in('objective_id', objectiveIds);

	return { themes: themes ?? [], objectives: objectives ?? [], points: points ?? [] };
}

describe('Seed du programme — 1ʳᵉ spécialité', () => {
	it('pose 6 thèmes, 14 objectifs et 153 points', async () => {
		const { themes, objectives, points } = await pointsOfGrade('1_SPE');
		expect(themes).toHaveLength(6);
		expect(objectives).toHaveLength(14);
		expect(points).toHaveLength(153);
	});

	it('reproduit la typologie du BO (Contenus / Capacités attendues / Démonstrations)', async () => {
		const { points } = await pointsOfGrade('1_SPE');
		const by = (k: string) => points.filter((p) => p.kind === k).length;
		expect(by('connaissance')).toBe(49); // Contenus
		expect(by('savoir_faire')).toBe(93); // Capacités attendues + approfondissements
		expect(by('demonstration')).toBe(11); // Démonstrations
	});

	// La partie « Automatismes » du BO n'est PAS un thème de cet arbre : ses points
	// sont des acquis des années antérieures (seconde pour l'essentiel) que le
	// programme demande d'entretenir. Les créer ici en dupliquerait la définition.
	// Ils vivront dans l'arbre du niveau où ils sont introduits, marqués
	// leur appartenance à la liste de 1ʳᵉ (`curriculum_point_automatismes`).
	it('ne crée pas de thème « Automatismes »', async () => {
		const { themes } = await pointsOfGrade('1_SPE');
		expect(themes.map((t) => t.name)).not.toContain('Automatismes');
		expect(themes.map((t) => t.name).sort()).toEqual(
			[
				'Algorithmique et programmation',
				'Algèbre',
				'Analyse',
				'Géométrie',
				'Probabilités et statistiques',
				'Vocabulaire ensembliste et logique'
			].sort()
		);
	});

	it('laisse regime_acquisition au défaut et ne crée aucune liste d’automatismes', async () => {
		const { points } = await pointsOfGrade('1_SPE');
		// Le prof bascule en `fluence` les points qu'il décide de travailler par
		// répétition ; le seed ne présume de rien.
		expect(points.every((p) => p.regime_acquisition === 'diversite')).toBe(true);

		// Aucune liste d'automatismes : les points concernés appartiennent aux
		// programmes des années antérieures, dont les arbres n'existent pas encore.
		const { data: listes } = await service
			.from('curriculum_point_automatismes')
			.select('point_id')
			.eq('grade', '1_SPE');
		expect(listes ?? []).toHaveLength(0);
	});

	it('marque en approfondissement les 28 points hors attendus', async () => {
		const { points } = await pointsOfGrade('1_SPE');
		expect(points.filter((p) => p.exigence === 'approfondissement')).toHaveLength(28);
		expect(points.filter((p) => p.exigence === 'attendu')).toHaveLength(125);
	});

	it('ne pose aucun rang : le programme ne propose pas d’échelle de difficulté', async () => {
		const { points } = await pointsOfGrade('1_SPE');
		expect(points.filter((p) => p.rang !== null)).toHaveLength(0);
	});

	it('ne laisse aucun kind hors énumération ni aucun nom vide', async () => {
		const { points } = await pointsOfGrade('1_SPE');
		const valid = new Set(['connaissance', 'savoir_faire', 'demonstration']);
		expect(points.every((p) => valid.has(p.kind))).toBe(true);
		expect(points.every((p) => p.name.trim().length > 0)).toBe(true);
	});
});

describe('Seed du programme — 6ᵉ (non-régression)', () => {
	it('reste à 6 thèmes, 20 objectifs et 95 points', async () => {
		const { themes, objectives, points } = await pointsOfGrade('6');
		expect(themes).toHaveLength(6);
		expect(objectives).toHaveLength(20);
		expect(points).toHaveLength(95);
	});

	it('a un kind renseigné sur tous ses points (colonne devenue NOT NULL)', async () => {
		const { points } = await pointsOfGrade('6');
		expect(points.every((p) => p.kind !== null)).toBe(true);
		expect(points.filter((p) => p.kind === 'connaissance')).toHaveLength(27);
		expect(points.filter((p) => p.kind === 'savoir_faire')).toHaveLength(68);
	});
});
