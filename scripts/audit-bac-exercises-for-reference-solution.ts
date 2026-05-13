#!/usr/bin/env tsx
/**
 * Ad-hoc audit: fetch all Bac exercises from the live database and assess
 * which ones would benefit from the new `reference_solution` validation
 * strategy.
 *
 * Heuristic candidates for `reference_solution`:
 *   - Currently using `output` or `unit_test` (variable_check is recent)
 *   - Solution defines a function (random inputs are meaningful)
 *   - Pure deterministic computation: no matplotlib, no stdin, no I/O
 *   - Inputs are scalar / list / int — easy to generate with `random`
 *
 * Usage:
 *   pnpm tsx scripts/audit-bac-exercises-for-reference-solution.ts
 *
 * Required env: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import type { Database } from '../src/lib/types/database';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
	process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

type BacRow = {
	id: string;
	title: string;
	source: string | null;
	solution_code: string;
	validation_config: unknown;
};

interface AssessmentInput {
	behaviorKind: 'output' | 'unit_test' | 'variable_check' | 'reference_solution' | null;
	hasDefinedFunction: boolean;
	hasParameters: boolean;
	hasStdin: boolean;
	usesMatplotlib: boolean;
	usesPlotly: boolean;
	isModuleLevelScript: boolean;
	hasIO: boolean;
	functionName: string | null;
}

interface Verdict {
	score: number; // 0-10, higher = stronger candidate
	tier: 'strong' | 'medium' | 'weak' | 'no';
	rationale: string;
}

function extractInfo(row: BacRow): AssessmentInput {
	const cfg = row.validation_config as {
		behavior?: { kind: string; function_name?: string };
	} | null;
	const behaviorKind = (cfg?.behavior?.kind ?? null) as AssessmentInput['behaviorKind'];
	const functionName = cfg?.behavior?.function_name ?? null;

	const code = row.solution_code ?? '';
	const hasDefinedFunction = /^def\s+[a-zA-Z_]/m.test(code);
	const firstDefMatch = code.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/m);
	const hasParameters = firstDefMatch !== null && firstDefMatch[2].trim().length > 0;
	const hasStdin = /\binput\s*\(/.test(code);
	const usesMatplotlib = /(matplotlib|pyplot|plt\.)/i.test(code);
	const usesPlotly = /plotly/i.test(code);
	const hasIO = /\bopen\s*\(/.test(code) || /sys\.argv/.test(code);
	// Module-level = no `def`, statements at top level.
	const isModuleLevelScript = !hasDefinedFunction;

	return {
		behaviorKind,
		hasDefinedFunction,
		hasParameters,
		hasStdin,
		usesMatplotlib,
		usesPlotly,
		isModuleLevelScript,
		hasIO,
		functionName
	};
}

function assess(info: AssessmentInput, _row: BacRow): Verdict {
	// Hard exclusions
	if (info.usesMatplotlib || info.usesPlotly) {
		return { score: 0, tier: 'no', rationale: 'Plot output (matplotlib/plotly)' };
	}
	if (info.hasStdin) {
		return { score: 0, tier: 'no', rationale: 'Reads from stdin (input())' };
	}
	if (info.hasIO) {
		return { score: 0, tier: 'no', rationale: 'Performs file/system I/O' };
	}
	if (info.isModuleLevelScript) {
		return {
			score: 0,
			tier: 'no',
			rationale: 'Module-level script — no function to differential-test'
		};
	}
	if (!info.hasDefinedFunction) {
		return { score: 0, tier: 'no', rationale: 'No function defined' };
	}
	if (info.behaviorKind === 'reference_solution') {
		return { score: 0, tier: 'no', rationale: 'Already uses reference_solution' };
	}

	// Scoring
	let score = 0;
	const reasons: string[] = [];

	// Currently in unit_test with hardcoded values → ideal candidate for
	// random testing (broader coverage, can't be hardcoded by student).
	if (info.behaviorKind === 'unit_test') {
		score += 6;
		reasons.push('unit_test → random testing extends coverage');
	}

	// Currently in output → would also gain from removing print boilerplate.
	if (info.behaviorKind === 'output') {
		score += 5;
		reasons.push('output → switch removes print() boilerplate');
	}

	// Function takes parameters → generator can vary them.
	if (info.hasParameters) {
		score += 3;
		reasons.push('function has parameters');
	} else {
		// Parameterless function — pointless to random-test (always same result)
		score -= 4;
		reasons.push('parameterless function (generator irrelevant)');
	}

	const tier: Verdict['tier'] =
		score >= 7 ? 'strong' : score >= 4 ? 'medium' : score >= 1 ? 'weak' : 'no';

	return { score, tier, rationale: reasons.join(' | ') };
}

async function main(): Promise<void> {
	console.log('🔍 Fetching Bac exercises from the live database...\n');

	const { data, error } = await supabase
		.from('python_exercises')
		.select('id, title, source, solution_code, validation_config')
		.ilike('source', '%Bac%')
		.order('source');

	if (error) {
		console.error('❌ Failed to fetch:', error.message);
		process.exit(1);
	}

	const rows = (data ?? []) as BacRow[];
	console.log(`Found ${rows.length} Bac exercises.\n`);

	const audits = rows.map((row) => {
		const info = extractInfo(row);
		const verdict = assess(info, row);
		return { row, info, verdict };
	});

	// Group by tier
	const byTier = {
		strong: audits.filter((a) => a.verdict.tier === 'strong'),
		medium: audits.filter((a) => a.verdict.tier === 'medium'),
		weak: audits.filter((a) => a.verdict.tier === 'weak'),
		no: audits.filter((a) => a.verdict.tier === 'no')
	};

	const tierMeta: Record<Verdict['tier'], { label: string; icon: string }> = {
		strong: { label: 'STRONG candidates', icon: '🟢' },
		medium: { label: 'MEDIUM candidates', icon: '🟡' },
		weak: { label: 'WEAK candidates', icon: '🟠' },
		no: { label: 'NOT candidates', icon: '⚪' }
	};

	for (const tier of ['strong', 'medium', 'weak', 'no'] as const) {
		const list = byTier[tier];
		if (list.length === 0) continue;
		console.log(
			`\n${tierMeta[tier].icon} ${tierMeta[tier].label} (${list.length})\n${'─'.repeat(70)}`
		);
		for (const { row, info, verdict } of list) {
			console.log(`  [${row.source ?? '?'}] ${row.title}`);
			console.log(
				`    behavior=${info.behaviorKind ?? 'none'}  fn=${info.functionName ?? '-'}` +
					`  hasFn=${info.hasDefinedFunction}  hasParams=${info.hasParameters}  ` +
					`stdin=${info.hasStdin}  plot=${info.usesMatplotlib}  io=${info.hasIO}`
			);
			console.log(`    → score=${verdict.score}, ${verdict.rationale}`);
		}
	}

	console.log(`\n${'═'.repeat(70)}`);
	console.log(`Summary: ${rows.length} Bac exercises`);
	console.log(`  🟢 Strong: ${byTier.strong.length}`);
	console.log(`  🟡 Medium: ${byTier.medium.length}`);
	console.log(`  🟠 Weak:   ${byTier.weak.length}`);
	console.log(`  ⚪ No:     ${byTier.no.length}`);
}

void main();
