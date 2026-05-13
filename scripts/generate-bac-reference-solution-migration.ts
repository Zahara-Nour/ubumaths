#!/usr/bin/env tsx
/**
 * Generate the SQL migration that converts the 19 STRONG Bac exercises
 * from `unit_test` to `reference_solution` (combining their existing
 * `test_cases` as fixed sentinels + a generator).
 *
 * For each STRONG exo:
 *   - Reads ast_requirements, function_name, test_cases, tolerance, solution_code
 *     from the live DB.
 *   - Looks up a hand-curated generator config from GENERATOR_BY_SOURCE
 *     (range chosen to stay inside the function's natural domain — too-small
 *     epsilons would loop forever, too-large `n` would overflow, etc.).
 *   - Emits an UPDATE statement.
 *
 * Output: prints the SQL to stdout. Redirect to the migrations folder.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import type { Database } from '../src/lib/types/database';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Hand-curated generator config per exercise.
// Each entry: tuple expression returning the function args, plus a seed.
// The ranges were chosen to stay inside the function's natural domain:
//   - parameters of "seuil" functions: epsilon range that converges in
//     a reasonable number of iterations (small enough to converge, large
//     enough to avoid 10000+ iterations).
//   - integer `n` parameters: capped so the resulting list/value stays
//     within IEEE 754 (suite_u/5 underflows beyond p ≈ 8).
//   - thresholds: stay above the limit of the converging sequence (so the
//     while-loop terminates).
const GENERATOR_BY_SOURCE: Record<
	string,
	{ code: string; count: number; seed: number; comment: string }
> = {
	'Bac Amérique du Nord 05/2025 Q3': {
		code: '(__import__("random").uniform(1.5, 200),)',
		count: 50,
		seed: 42,
		comment: 'Briggs(a) requires a >= 1.01; large a → many sqrt iterations.'
	},
	'Bac Amérique du Sud 09/2022 Q1.b': {
		code: '(__import__("random").randint(0, 8),)',
		count: 50,
		seed: 42,
		comment: 'suite_u(p) = u^2/5; underflows to 0 beyond p ≈ 8.'
	},
	'Bac Amérique du Sud 09/2022 sujet 2 Q6.b': {
		code: '(__import__("random").uniform(1010, 1990),)',
		count: 50,
		seed: 42,
		comment: 'population(S): S must be > 1000 (sequence converges to 1000).'
	},
	'Bac Amérique du Sud 09/2023 Q2': {
		code: '(__import__("random").randint(0, 12),)',
		count: 50,
		seed: 42,
		comment: 'suite_u(n) ≈ 5^n, capped at n=12 (≈ 10^9 manageable).'
	},
	'Bac Asie 03/2023 Q5': {
		code: '(__import__("random").randint(0, 10),)',
		count: 50,
		seed: 42,
		comment: 'noyaux(n): list of n+1 nuclear-decay terms, capped at n=10.'
	},
	'Bac Asie 05/2022 sujet 2 Q4': {
		code: '(__import__("random").randint(1, 15),)',
		count: 50,
		seed: 42,
		comment: 'suite(n): list of n bacterial-population terms.'
	},
	'Bac Asie 06/2024 Q9': {
		code: '(__import__("random").uniform(0.0001, 0.1),)',
		count: 50,
		seed: 42,
		comment: 'seuil(e) probability epsilon; smaller e → more iterations.'
	},
	'Bac Madagascar 05/2022 Partie B Q1.b': {
		code: '(__import__("random").randint(0, 15),)',
		count: 50,
		seed: 42,
		comment: 'termes(n): interlaced exp sequences, fast convergence.'
	},
	'Bac Métropole 06/2024 Q5.a': {
		code: '(__import__("random").uniform(0.005, 1.0),)',
		count: 50,
		seed: 42,
		comment: 'seuil(h) with ln; h < 0.005 takes 1000+ iterations.'
	},
	'Bac Métropole 06/2024 sujet 2 Partie A Q4': {
		code: '(__import__("random").uniform(0.5, 3.7),)',
		count: 50,
		seed: 42,
		comment: 'alerte_chlore(s): u converges to 3.75 (= 0.3/(1-0.92)).'
	},
	'Bac Métropole 09/2021 Q3': {
		code: '(__import__("random").uniform(0.0001, 0.1),)',
		count: 50,
		seed: 42,
		comment: 'seuil(E) homographic; E < 1e-4 takes too many iterations.'
	},
	'Bac Métropole 09/2023 Q2': {
		code: '(__import__("random").randint(1, 20),)',
		count: 50,
		seed: 42,
		comment: 'suite(n) = n/e^n. Starts at i=1 (n=0 untested).'
	},
	'Bac Nouvelle Calédonie 08/2023 sujet 2 Q2': {
		code: '(__import__("random").randint(0, 25),)',
		count: 50,
		seed: 42,
		comment: 'terme(n) homographic sequence, bounded and convergent.'
	},
	'Bac Polynésie 05/2022 Q1.b': {
		code: '(__import__("random").randint(0, 15),)',
		count: 50,
		seed: 42,
		comment: 'liste(k): list of k+1 harmonic-like terms.'
	},
	'Bac Polynésie 06/2024 Partie A Q1': {
		code: '(__import__("random").randint(0, 25),)',
		count: 50,
		seed: 42,
		comment: 'suite(n) homographic 4/(5-u), converges to 1.'
	},
	'Bac Polynésie 09/2024 Q2.b': {
		code: '(__import__("random").randint(0, 30),)',
		count: 50,
		seed: 42,
		comment: 'pyramide(n) = sum of squares, polynomial in n.'
	},
	// Three "Type Bac" exercises — matched by title since they share `source`.
	__type_bac_annee_seuil__: {
		code: '(__import__("random").uniform(1550, 10000),)',
		count: 50,
		seed: 42,
		comment: 'annee_seuil(s): population P_0 = 1500; s must be > 1500.'
	},
	__type_bac_seuil_arith_geo__: {
		code: '(__import__("random").uniform(0.005, 10.0),)',
		count: 50,
		seed: 42,
		comment: 'seuil(s) arith-geo; converges to 25, so s ≥ 0 is OK.'
	},
	__type_bac_seuil_somme__: {
		code: '(__import__("random").uniform(0.5, 1.6),)',
		count: 50,
		seed: 42,
		comment: 'seuil_somme(s): partial sum of 1/n^2 converges to π^2/6 ≈ 1.6449.'
	}
};

const TYPE_BAC_TITLE_TO_KEY: Record<string, string> = {
	'Seuil — population croissante': '__type_bac_annee_seuil__',
	'Seuil — suite arithmético-géométrique': '__type_bac_seuil_arith_geo__',
	"Seuil — somme partielle d'une série": '__type_bac_seuil_somme__'
};

function escapeSqlString(s: string): string {
	return s.replace(/'/g, "''");
}

async function main(): Promise<void> {
	const { data, error } = await supabase
		.from('python_exercises')
		.select('id, title, source, solution_code, validation_config')
		.ilike('source', '%Bac%')
		.order('source');

	if (error) {
		console.error(error.message);
		process.exit(1);
	}

	console.log('-- Migration: Convert 19 STRONG Bac exercises from unit_test');
	console.log('--            to reference_solution (fixed sentinels + generator).');
	console.log(`-- Created: ${new Date().toISOString().slice(0, 10)}`);
	console.log('--');
	console.log('-- For each converted exo:');
	console.log('--   - existing test_cases are preserved as fixed.cases (sentinels');
	console.log('--     that double-check the reference itself);');
	console.log('--   - solution_code is copied verbatim into reference_code;');
	console.log("--   - a hand-curated generator (range adapted to the function\\'s");
	console.log('--     natural domain) adds random-input coverage;');
	console.log('--   - ast_requirements, function_name, tolerance are preserved.');
	console.log('--');
	console.log('-- Identification is by (source, title) to keep the UPDATE narrow.');
	console.log('-- All 19 exos generated via scripts/generate-bac-reference-solution-migration.ts');
	console.log('');

	let converted = 0;

	for (const row of data ?? []) {
		const cfg = row.validation_config as {
			ast_requirements?: unknown;
			behavior?: {
				kind: string;
				function_name?: string;
				test_cases?: unknown[];
				tolerance?: unknown;
			};
			timeout_ms?: number;
		} | null;
		const behavior = cfg?.behavior;
		if (behavior?.kind !== 'unit_test') continue;
		if (!behavior.function_name) continue;

		const sig = (row.solution_code ?? '').match(/^def\s+\w+\s*\(([^)]*)\)/m);
		if (!sig || sig[1].trim().length === 0) continue; // skip parameterless

		const key = row.source!.includes('Type Bac') ? TYPE_BAC_TITLE_TO_KEY[row.title] : row.source!;
		const gen = key ? GENERATOR_BY_SOURCE[key] : undefined;
		if (!gen) {
			console.error(`-- ⚠ No generator config for: ${row.source} / ${row.title}`);
			continue;
		}

		const newConfig = {
			ast_requirements: cfg?.ast_requirements,
			behavior: {
				kind: 'reference_solution',
				function_name: behavior.function_name,
				reference_code: row.solution_code,
				fixed: { cases: behavior.test_cases ?? [] },
				generator: {
					code: gen.code,
					count: gen.count,
					seed: gen.seed
				},
				...(behavior.tolerance !== undefined && behavior.tolerance !== null
					? { tolerance: behavior.tolerance }
					: {})
			},
			...(cfg?.timeout_ms !== undefined ? { timeout_ms: cfg.timeout_ms } : {})
		};

		// Strip undefined keys for clean JSON.
		const compactConfig = JSON.parse(JSON.stringify(newConfig));

		console.log(`-- ${row.source} — ${row.title}`);
		console.log(`-- ${gen.comment}`);
		console.log('UPDATE python_exercises');
		console.log(
			`SET validation_config = '${escapeSqlString(JSON.stringify(compactConfig, null, 2))}'::jsonb`
		);
		console.log(`WHERE id = '${row.id}';`);
		console.log('');

		converted += 1;
	}

	console.error(`\n✅ Generated UPDATE statements for ${converted} exercises.`);
}

void main();
