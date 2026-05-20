/**
 * lint-angle-builtins.ts
 *
 * Checks that no file in src/, scripts/, or docs/ (except docs/wip/ and
 * CHANGELOG.md) references the old angle builtins removed in geometry-core V1.
 *
 * Forbidden patterns:
 *   marque_angle     – replaced by angle(..., marque="arcsN")
 *   angle_droit      – replaced by angle(..., marque="carre")
 *   angle_vecteurs   – replaced by mesure(u, v)
 *   angleMark        – old type discriminant, now 'angle'
 *   isAngleMark      – old type guard, now isAngle
 *   GeoAngleMark     – old interface name, now GeoAngle
 *   createAngleMark  – old factory, now createAngle
 *   createScalarAngle (word-boundary) – old factory, now createScalarAngleMeasure
 *
 * Usage:
 *   npx tsx scripts/lint-angle-builtins.ts
 *
 * Exit 0 – clean. Exit 1 – occurrences found.
 */

import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FORBIDDEN = [
	'marque_angle',
	'angle_droit',
	'angle_vecteurs',
	'angleMark',
	'isAngleMark',
	'GeoAngleMark',
	'createAngleMark',
	'createScalarAngle\\b'
];

// Directories to search
// Note: constructions converters (src/lib/constructions*/converter.ts) handle IEP XML
// action types which include 'angle_droit' as an IEP instrument name — not a DSL builtin.
// They are excluded from the search.
const SEARCH_DIRS = ['src', 'scripts', 'docs'];

// Paths to exclude (grep --exclude-dir / --exclude)
// __tests__ directories are excluded: remaining occurrences there are either
//   - negative tests asserting that old builtins throw DslRuntimeError (intentional)
//   - test descriptions mentioning old names for documentation purposes
const EXCLUDE_DIRS = ['docs/wip', 'node_modules', '.svelte-kit', 'scripts/output', '__tests__'];
// migrate-constructions-to-dsl.ts reads legacy JSON formats that still use 'angleMark' kind
// as a case label — intentional backward-compat reader, not an emission of the old DSL builtin.
const EXCLUDE_FILES = [
	'CHANGELOG.md',
	'lint-angle-builtins.ts',
	'migrate-angle-builtins-supabase.ts',
	// Migration reference documentation — intentionally lists the removed builtins
	'dsl-builtins.md',
	// Reads legacy JSON format with old 'angleMark' kind — intentional backward-compat reader
	'migrate-constructions-to-dsl.ts',
	// IEP XML instrument type 'angle_droit' — not a DSL builtin, just an IEP action category
	'converter.ts',
	// convert-instrumenpoche.ts handles IEP 'angle_droit' instrument type
	'convert-instrumenpoche.ts'
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const pattern = FORBIDDEN.join('|');

const excludeDirArgs = EXCLUDE_DIRS.map((d) => `--exclude-dir="${d}"`).join(' ');
const excludeFileArgs = EXCLUDE_FILES.map((f) => `--exclude="${f}"`).join(' ');

const cmd = [
	'grep',
	'-rn',
	`-E "${pattern}"`,
	excludeDirArgs,
	excludeFileArgs,
	...SEARCH_DIRS
].join(' ');

let output = '';
let found = false;

try {
	output = execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
	// grep exits 0 when matches are found
	found = output.trim().length > 0;
} catch (err: unknown) {
	// grep exits 1 when NO matches found — that is the success case for us
	if (
		typeof err === 'object' &&
		err !== null &&
		'status' in err &&
		(err as { status: number }).status === 1
	) {
		found = false;
	} else {
		// Actual error (permission, missing dir, etc.)
		console.error('lint-angle-builtins: unexpected grep error');
		console.error(err);
		process.exit(2);
	}
}

if (found) {
	console.error('lint-angle-builtins: FAILED — forbidden angle builtins detected:\n');
	console.error(output);
	console.error(
		'Fix: migrate using the patterns documented in docs/ref/geometry/dsl-builtins.md\n' +
			'     or run: npx tsx scripts/migrate-angle-builtins-supabase.ts --apply'
	);
	process.exit(1);
} else {
	console.log('lint-angle-builtins: OK — no forbidden angle builtins found.');
	process.exit(0);
}
