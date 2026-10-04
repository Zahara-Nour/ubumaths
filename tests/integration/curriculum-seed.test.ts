/**
 * Seeds du référentiel de programme — contrôle de forme et de volume.
 *
 * Les seeds sont générés depuis les markdown de `docs/wip/referentiel/` :
 *   - 6ᵉ      → `20260621160000_seed_curriculum_6e.sql`
 *   - 1ʳᵉ spé → `20260830090000_seed_curriculum_1re_spe.sql`
 *   - 2de     → `20260903090000_seed_curriculum_2de.sql`
 *   - Tˡᵉ spé → `20261004100000_seed_curriculum_terminale_spe.sql`
 *   - Tˡᵉ maths complémentaires → `20261004150000_seed_curriculum_terminale_comp.sql`
 *   - Tˡᵉ maths expertes → `20261004170000_seed_curriculum_terminale_exp.sql`
 *     (tous générés par `scripts/generate-curriculum-seed.ts`)
 *
 * Ces tests ne re-valident pas le contenu pédagogique (c'est la relecture du
 * markdown qui fait ça) mais verrouillent ce qui casserait silencieusement :
 * un volume qui s'effondre, un `kind` hors énumération, un `rang` posé par
 * erreur, ou la typologie du BO qui ne se retrouve plus en base.
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	createAuthenticatedClient,
	TestData,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
		.select('id, objective_id, name, code, kind, regime_acquisition, exigence, rang')
		.in('objective_id', objectiveIds);

	return { themes: themes ?? [], objectives: objectives ?? [], points: points ?? [] };
}

describe('Seed du programme — 1ʳᵉ spécialité', () => {
	it('pose 6 thèmes, 14 objectifs et 173 points', async () => {
		const { themes, objectives, points } = await pointsOfGrade('1_SPE');
		expect(themes).toHaveLength(6);
		expect(objectives).toHaveLength(14);
		expect(points).toHaveLength(173);
	});

	it('reproduit la typologie du BO (Contenus / Capacités attendues / Démonstrations)', async () => {
		const { points } = await pointsOfGrade('1_SPE');
		const by = (k: string) => points.filter((p) => p.kind === k).length;
		expect(by('connaissance')).toBe(64); // Contenus
		expect(by('savoir_faire')).toBe(98); // Capacités attendues + approfondissements
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
		expect(points.filter((p) => p.exigence === 'attendu')).toHaveLength(145);
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

describe('Seed du programme — code stable', () => {
	it('donne un code unique à chacun des 173 points', async () => {
		const { points } = await pointsOfGrade('1_SPE');
		const codes = points.map((p) => p.code).filter(Boolean);
		expect(codes).toHaveLength(173);
		expect(new Set(codes).size).toBe(173);
		expect(codes.every((c) => /^1SPE-\d{3}$/.test(c!))).toBe(true);
	});

	// La 6ᵉ a été seedée avant l'existence de la colonne : ses points ont été
	// rattrapés par le backfill de 20260831090000. Sans code, ils seraient
	// incitables dans une fiche et non transportables d'un environnement à
	// l'autre — et l'insertion échouerait désormais (colonne NOT NULL).
	it('a rattrapé les 95 points de 6ᵉ, série indépendante', async () => {
		const { points } = await pointsOfGrade('6');
		const codes = points.map((p) => p.code);
		expect(codes).toHaveLength(95);
		expect(codes.every((c) => /^6-\d{3}$/.test(c!))).toBe(true);
		expect(new Set(codes).size).toBe(95);
	});
});

/**
 * L'amorçage doit être rejouable sans rien écraser.
 *
 * On ne peut pas relancer une migration depuis vitest, mais on peut verrouiller
 * la forme qui rend le rejeu inoffensif — c'est elle, et non le contenu, qui a
 * changé le 2026-08-31 : le seed synchronisait depuis le markdown (`ON CONFLICT
 * … DO UPDATE`) et archivait ce qui en avait disparu. Sur une base où le prof a
 * travaillé dans la page Programme, ce rejeu défaisait son travail.
 */
describe('Seed du programme — amorçage et non synchronisation', () => {
	const seed = readFileSync(
		new URL(
			'../../supabase/migrations/20260830090000_seed_curriculum_1re_spe.sql',
			import.meta.url
		),
		'utf8'
	);

	it('sort sans rien faire si le niveau existe déjà', () => {
		expect(seed).toMatch(
			/IF EXISTS \(SELECT 1 FROM public\.curriculum_themes WHERE grade = '1_SPE'\) THEN/
		);
		expect(seed).toMatch(/RETURN;/);
	});

	it('ne met à jour ni n’archive quoi que ce soit', () => {
		expect(seed).not.toMatch(/on conflict/i);
		expect(seed).not.toMatch(/archived_at/i);
		expect(seed).not.toMatch(/^\s*update\s/im);
	});

	it('ne renseigne pas les colonnes qui appartiennent au prof', () => {
		// `regime_acquisition` et `rang` sont ses choix pédagogiques : le seed les
		// laisse aux défauts de la table plutôt que de les imposer.
		expect(seed).not.toMatch(/regime_acquisition\s*[,)]/);
		expect(seed).not.toMatch(/\brang\b\s*[,)]/);
	});
});

describe('Seed du programme — seconde', () => {
	it('pose 6 thèmes, 14 objectifs et 185 points', async () => {
		const { themes, objectives, points } = await pointsOfGrade('2');
		expect(themes).toHaveLength(6);
		expect(objectives).toHaveLength(14);
		expect(points).toHaveLength(185);
	});

	it('reproduit la typologie du BO', async () => {
		const { points } = await pointsOfGrade('2');
		const by = (k: string) => points.filter((p) => p.kind === k).length;
		expect(by('connaissance')).toBe(68); // Contenus
		expect(by('savoir_faire')).toBe(105); // Capacités attendues + approfondissements
		expect(by('demonstration')).toBe(12); // Démonstrations
	});

	// Même exclusion qu'en 1ʳᵉ (décision 12) : les automatismes du BO sont des
	// acquis du collège, ils vivront dans l'arbre du niveau qui les introduit.
	it('ne crée pas de thème « Automatismes »', async () => {
		const { themes } = await pointsOfGrade('2');
		expect(themes.map((t) => t.name)).not.toContain('Automatismes');
	});

	it('donne un code unique à chacun des 185 points', async () => {
		const { points } = await pointsOfGrade('2');
		const codes = points.map((p) => p.code);
		expect(codes).toHaveLength(185);
		expect(new Set(codes).size).toBe(185);
		expect(codes.every((c) => /^2-\d{3}$/.test(c!))).toBe(true);
	});
});

describe('Seed du programme — terminale spécialité', () => {
	it('pose 5 thèmes, 18 objectifs et 262 points', async () => {
		const { themes, objectives, points } = await pointsOfGrade('T_SPE');
		expect(themes).toHaveLength(5);
		expect(objectives).toHaveLength(18);
		expect(points).toHaveLength(262);
	});

	it('reproduit la typologie du BO', async () => {
		const { points } = await pointsOfGrade('T_SPE');
		const by = (k: string) => points.filter((p) => p.kind === k).length;
		expect(by('connaissance')).toBe(101); // Contenus
		expect(by('savoir_faire')).toBe(143); // Capacités attendues + approfondissements
		expect(by('demonstration')).toBe(18); // Démonstrations
		expect(points.filter((p) => p.exigence === 'approfondissement')).toHaveLength(55);
	});

	// Le BO de terminale n'a pas de partie « Automatismes » : les cinq thèmes
	// sont ceux de son sommaire.
	it('suit les thèmes du sommaire du BO', async () => {
		const { themes } = await pointsOfGrade('T_SPE');
		expect(themes.map((t) => t.name).sort()).toEqual(
			[
				'Algorithmique et programmation',
				'Algèbre et géométrie',
				'Analyse',
				'Probabilités',
				'Vocabulaire ensembliste et logique'
			].sort()
		);
	});

	it('donne un code unique à chacun des 262 points', async () => {
		const { points } = await pointsOfGrade('T_SPE');
		const codes = points.map((p) => p.code);
		expect(codes).toHaveLength(262);
		expect(new Set(codes).size).toBe(262);
		expect(codes.every((c) => /^TSPE-\d{3}$/.test(c!))).toBe(true);
		// Contigus : TSPE-001 à TSPE-262, sans trou.
		const numbers = codes.map((c) => Number(c!.slice(5))).sort((a, b) => a - b);
		expect(numbers).toEqual(Array.from({ length: 262 }, (_, i) => i + 1));
	});

	it('laisse au prof regime_acquisition et rang', async () => {
		const { points } = await pointsOfGrade('T_SPE');
		expect(points).toHaveLength(262);
		expect(points.every((p) => p.regime_acquisition === 'diversite')).toBe(true);
		expect(points.filter((p) => p.rang !== null)).toHaveLength(0);
	});

	it('sort sans rien faire si le niveau existe déjà', () => {
		const seed = readFileSync(
			new URL(
				'../../supabase/migrations/20261004100000_seed_curriculum_terminale_spe.sql',
				import.meta.url
			),
			'utf8'
		);
		expect(seed).toMatch(
			/IF EXISTS \(SELECT 1 FROM public\.curriculum_themes WHERE grade = 'T_SPE'\) THEN/
		);
		expect(seed).not.toMatch(/on conflict/i);
		expect(seed).not.toMatch(/^\s*update\s/im);
	});
});

/**
 * Accès au programme de terminale (Q147, tranché par David le 2026-10-03) :
 * tout utilisateur CONNECTÉ lit le texte du programme — contenu officiel, sans
 * donnée d'élève. Un visiteur anonyme ne lit rien.
 */
describe('Seed du programme — terminale spécialité, accès', () => {
	afterAll(async () => {
		await cleanupCompetenceTestData();
	});

	it('un élève connecté lit les 262 points', async () => {
		const student = await TestData.profile().withRole('student').create();
		const client = (await createAuthenticatedClient(
			student.email
		)) as unknown as SupabaseClient<Database>;

		const { data, error } = await client
			.from('curriculum_points')
			.select('code')
			.like('code', 'TSPE-%');
		expect(error).toBeNull();
		expect(data ?? []).toHaveLength(262);
	});

	it('un visiteur anonyme ne lit aucun point', async () => {
		// Les 262 points existent bien : sans cela, « 0 ligne » ne prouverait rien.
		const { points } = await pointsOfGrade('T_SPE');
		expect(points).toHaveLength(262);

		const anon = createClient<Database>(
			process.env.SUPABASE_TEST_URL || 'http://localhost:54321',
			process.env.SUPABASE_TEST_ANON_KEY ||
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
			{ auth: { persistSession: false, autoRefreshToken: false } }
		);

		const { data } = await anon.from('curriculum_points').select('code').like('code', 'TSPE-%');
		expect(data ?? []).toHaveLength(0);
	});
});

describe('Seed du programme — terminale maths complémentaires', () => {
	it('pose 3 thèmes, 10 objectifs et 139 points', async () => {
		const { themes, objectives, points } = await pointsOfGrade('T_COMP');
		expect(themes).toHaveLength(3);
		expect(objectives).toHaveLength(10);
		expect(points).toHaveLength(139);
	});

	it('reproduit la typologie du BO', async () => {
		const { points } = await pointsOfGrade('T_COMP');
		const by = (k: string) => points.filter((p) => p.kind === k).length;
		expect(by('connaissance')).toBe(57); // Contenus
		expect(by('savoir_faire')).toBe(68); // Capacités attendues + exemples d'algorithme
		expect(by('demonstration')).toBe(14); // Démonstrations possibles
	});

	// Le BO ne propose que des démonstrations « possibles » : les proposer n'est
	// pas les exiger (décision de David, 2026-10-04). Aucune n'est donc attendue.
	it('range toutes les démonstrations en approfondissement', async () => {
		const { points } = await pointsOfGrade('T_COMP');
		const demonstrations = points.filter((p) => p.kind === 'demonstration');
		expect(demonstrations).toHaveLength(14);
		expect(demonstrations.every((p) => p.exigence === 'approfondissement')).toBe(true);
		expect(points.filter((p) => p.exigence === 'approfondissement')).toHaveLength(26);
	});

	// Bâti sur la partie « Contenus » (Q149) ; « Algorithmique et programmation »
	// ne porte aucune capacité propre et ne donne pas de thème.
	it('suit les thèmes de la partie « Contenus » du BO', async () => {
		const { themes } = await pointsOfGrade('T_COMP');
		expect(themes.map((t) => t.name).sort()).toEqual(
			['Analyse', 'Probabilités et statistique', 'Vocabulaire ensembliste et logique'].sort()
		);
	});

	it('donne des codes TCOMP-001 à TCOMP-139, uniques et contigus', async () => {
		const { points } = await pointsOfGrade('T_COMP');
		const codes = points.map((p) => p.code);
		expect(codes.every((c) => /^TCOMP-\d{3}$/.test(c!))).toBe(true);
		const numbers = codes.map((c) => Number(c!.slice(6))).sort((a, b) => a - b);
		expect(numbers).toEqual(Array.from({ length: 139 }, (_, i) => i + 1));
	});

	it('laisse au prof regime_acquisition et rang', async () => {
		const { points } = await pointsOfGrade('T_COMP');
		expect(points).toHaveLength(139);
		expect(points.every((p) => p.regime_acquisition === 'diversite')).toBe(true);
		expect(points.filter((p) => p.rang !== null)).toHaveLength(0);
	});

	it('sort sans rien faire si le niveau existe déjà', () => {
		const seed = readFileSync(
			new URL(
				'../../supabase/migrations/20261004150000_seed_curriculum_terminale_comp.sql',
				import.meta.url
			),
			'utf8'
		);
		expect(seed).toMatch(
			/IF EXISTS \(SELECT 1 FROM public\.curriculum_themes WHERE grade = 'T_COMP'\) THEN/
		);
		expect(seed).not.toMatch(/on conflict/i);
		expect(seed).not.toMatch(/^\s*update\s/im);
	});
});

/** Accès (Q147) : même règle que la spécialité — connecté lit, anon ne lit rien. */
describe('Seed du programme — terminale maths complémentaires, accès', () => {
	afterAll(async () => {
		await cleanupCompetenceTestData();
	});

	it('un élève connecté lit les 139 points', async () => {
		const student = await TestData.profile().withRole('student').create();
		const client = (await createAuthenticatedClient(
			student.email
		)) as unknown as SupabaseClient<Database>;

		const { data, error } = await client
			.from('curriculum_points')
			.select('code')
			.like('code', 'TCOMP-%');
		expect(error).toBeNull();
		expect(data ?? []).toHaveLength(139);
	});

	it('un visiteur anonyme ne lit aucun point', async () => {
		// Les 139 points existent bien : sans cela, « 0 ligne » ne prouverait rien.
		const { points } = await pointsOfGrade('T_COMP');
		expect(points).toHaveLength(139);

		const anon = createClient<Database>(
			process.env.SUPABASE_TEST_URL || 'http://localhost:54321',
			process.env.SUPABASE_TEST_ANON_KEY ||
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
			{ auth: { persistSession: false, autoRefreshToken: false } }
		);

		const { data } = await anon.from('curriculum_points').select('code').like('code', 'TCOMP-%');
		expect(data ?? []).toHaveLength(0);
	});
});

describe('Seed du programme — terminale maths expertes', () => {
	it('pose 3 thèmes, 11 objectifs et 153 points', async () => {
		const { themes, objectives, points } = await pointsOfGrade('T_EXP');
		expect(themes).toHaveLength(3);
		expect(objectives).toHaveLength(11);
		expect(points).toHaveLength(153);
	});

	it('reproduit la typologie du BO', async () => {
		const { points } = await pointsOfGrade('T_EXP');
		const by = (k: string) => points.filter((p) => p.kind === k).length;
		expect(by('connaissance')).toBe(65); // Contenus
		expect(by('savoir_faire')).toBe(72); // Capacités + algorithmes + problèmes possibles
		expect(by('demonstration')).toBe(16); // Démonstrations
	});

	// Ici le BO dit « Démonstrations », sans « possibles » : elles sont attendues
	// (contrairement aux maths complémentaires). Les 32 approfondissements sont
	// les exemples d'algorithmes et les « Problèmes possibles » (décision de David).
	it('garde les démonstrations attendues et les problèmes possibles en approfondissement', async () => {
		const { points } = await pointsOfGrade('T_EXP');
		const demonstrations = points.filter((p) => p.kind === 'demonstration');
		expect(demonstrations).toHaveLength(16);
		expect(demonstrations.every((p) => p.exigence === 'attendu')).toBe(true);
		const deeper = points.filter((p) => p.exigence === 'approfondissement');
		expect(deeper).toHaveLength(32);
		expect(deeper.every((p) => p.kind === 'savoir_faire')).toBe(true);
	});

	// Arithmétique et Graphes et matrices n'ont pas de sous-parties dans le BO :
	// chacune est découpée en trois objectifs (décision de David, 2026-10-04).
	it('découpe les parties 2 et 3 en trois objectifs chacune', async () => {
		const { objectives, points } = await pointsOfGrade('T_EXP');
		const expected: Array<[string, number, number]> = [
			['Divisibilité et congruences', 71, 83],
			['PGCD, théorèmes de Bézout et de Gauss', 84, 98],
			['Nombres premiers', 99, 111],
			['Graphes', 112, 121],
			['Matrices', 122, 138],
			['Chaînes de Markov', 139, 153]
		];
		for (const [name, first, last] of expected) {
			const objective = objectives.find((o) => o.name === name);
			expect(objective, name).toBeDefined();
			const numbers = points
				.filter((p) => p.objective_id === objective!.id)
				.map((p) => Number(p.code!.slice(5)))
				.sort((a, b) => a - b);
			expect(numbers, name).toEqual(Array.from({ length: last - first + 1 }, (_, i) => first + i));
		}
	});

	it('suit les trois parties du BO', async () => {
		const { themes } = await pointsOfGrade('T_EXP');
		expect(themes.map((t) => t.name).sort()).toEqual(
			['Arithmétique', 'Graphes et matrices', 'Nombres complexes'].sort()
		);
	});

	it('donne des codes TEXP-001 à TEXP-153, uniques et contigus', async () => {
		const { points } = await pointsOfGrade('T_EXP');
		const codes = points.map((p) => p.code);
		expect(codes.every((c) => /^TEXP-\d{3}$/.test(c!))).toBe(true);
		const numbers = codes.map((c) => Number(c!.slice(5))).sort((a, b) => a - b);
		expect(numbers).toEqual(Array.from({ length: 153 }, (_, i) => i + 1));
	});

	it('laisse au prof regime_acquisition et rang', async () => {
		const { points } = await pointsOfGrade('T_EXP');
		expect(points).toHaveLength(153);
		expect(points.every((p) => p.regime_acquisition === 'diversite')).toBe(true);
		expect(points.filter((p) => p.rang !== null)).toHaveLength(0);
	});

	it('sort sans rien faire si le niveau existe déjà', () => {
		const seed = readFileSync(
			new URL(
				'../../supabase/migrations/20261004170000_seed_curriculum_terminale_exp.sql',
				import.meta.url
			),
			'utf8'
		);
		expect(seed).toMatch(
			/IF EXISTS \(SELECT 1 FROM public\.curriculum_themes WHERE grade = 'T_EXP'\) THEN/
		);
		expect(seed).not.toMatch(/on conflict/i);
		expect(seed).not.toMatch(/^\s*update\s/im);
	});
});

/** Accès (Q147) : même règle que la spécialité — connecté lit, anon ne lit rien. */
describe('Seed du programme — terminale maths expertes, accès', () => {
	afterAll(async () => {
		await cleanupCompetenceTestData();
	});

	it('un élève connecté lit les 153 points', async () => {
		const student = await TestData.profile().withRole('student').create();
		const client = (await createAuthenticatedClient(
			student.email
		)) as unknown as SupabaseClient<Database>;

		const { data, error } = await client
			.from('curriculum_points')
			.select('code')
			.like('code', 'TEXP-%');
		expect(error).toBeNull();
		expect(data ?? []).toHaveLength(153);
	});

	it('un visiteur anonyme ne lit aucun point', async () => {
		// Les 153 points existent bien : sans cela, « 0 ligne » ne prouverait rien.
		const { points } = await pointsOfGrade('T_EXP');
		expect(points).toHaveLength(153);

		const anon = createClient<Database>(
			process.env.SUPABASE_TEST_URL || 'http://localhost:54321',
			process.env.SUPABASE_TEST_ANON_KEY ||
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
			{ auth: { persistSession: false, autoRefreshToken: false } }
		);

		const { data } = await anon.from('curriculum_points').select('code').like('code', 'TEXP-%');
		expect(data ?? []).toHaveLength(0);
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
