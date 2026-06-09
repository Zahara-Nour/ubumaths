#!/usr/bin/env tsx
// scripts/generate-competence-seeds.ts
//
// Generates supabase/migrations/20260609120002_competence_referentiel_seeds.sql
// from the markdown referentiel files:
//   - docs/wip/referentiel/6e-savoirs.md       → Family A (knowledge)
//   - docs/wip/referentiel/college-competences.md → Family B (competence)
//
// Run with: pnpm tsx scripts/generate-competence-seeds.ts
//
// The script writes the SQL to stdout and to the migration file.
// It is safe to re-run: the generated SQL uses ON CONFLICT DO NOTHING via
// a DO $$ block that checks for existing rows before inserting.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Capacity {
	rang: number;
	name: string;
	knowledge_type: 'automatisme' | 'capacite_attendue';
}

interface Objective {
	number: number; // original item number (1-3, 5-19, no 4)
	name: string;
	capacities: Capacity[];
}

interface Theme {
	number: number;
	name: string;
	objectives: Objective[];
}

interface Observable {
	code: string; // 'A1', 'B2', etc.
	studentText: string; // name (énoncé élève 1ʳᵉ personne)
	teacherText: string; // teacher_grid_text
}

interface Subdimension {
	letter: string; // 'A', 'B', 'C', 'D'
	name: string;
	observables: Observable[];
}

interface MathCompetence {
	order: number;
	code: string; // 'chercher', 'calculer', etc.
	name: string; // 'Chercher', 'Calculer', etc.
	glossForStudent: string;
	subdimensions: Subdimension[];
}

// ---------------------------------------------------------------------------
// Parse 6e-savoirs.md → Family A
// ---------------------------------------------------------------------------

function parseSavoirs(content: string): Theme[] {
	const themes: Theme[] = [];
	const lines = content.split('\n');

	// Theme line pattern: ## Thème N — Name
	const themePattern = /^## Thème (\d+) — (.+)$/;
	// Item line pattern: ### Item N — Name
	const itemPattern = /^### Item (\d+) — (.+?)(?:\s*⚡)?$/;

	let currentTheme: Theme | null = null;
	let currentObjective: Objective | null = null;
	let inTable = false;
	let tableHeaderPassed = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Detect theme
		const themeMatch = themePattern.exec(line);
		if (themeMatch) {
			currentTheme = {
				number: parseInt(themeMatch[1]),
				name: themeMatch[2].trim(),
				objectives: []
			};
			themes.push(currentTheme);
			currentObjective = null;
			inTable = false;
			tableHeaderPassed = false;
			continue;
		}

		// Detect objective/item
		const itemMatch = itemPattern.exec(line);
		if (itemMatch) {
			currentObjective = {
				number: parseInt(itemMatch[1]),
				name: itemMatch[2].trim(),
				capacities: []
			};
			if (currentTheme) {
				currentTheme.objectives.push(currentObjective);
			}
			inTable = false;
			tableHeaderPassed = false;
			continue;
		}

		// Table detection: starts with "| Rang |"
		if (line.match(/^\| Rang \|/) || line.match(/^\| ---- \|/)) {
			if (line.match(/^\| Rang \|/)) {
				inTable = true;
				tableHeaderPassed = false;
			} else if (inTable) {
				tableHeaderPassed = true; // separator row
			}
			continue;
		}

		// Table row: | N | Capacity text | Type |
		if (inTable && tableHeaderPassed && line.startsWith('|')) {
			// Exit table on blank line
			if (line.trim() === '') {
				inTable = false;
				tableHeaderPassed = false;
				continue;
			}

			// Parse row: | N ⭐? | Capacité | Type |
			const parts = line.split('|').map((p) => p.trim());
			// parts[0] is empty, parts[1] = rang, parts[2] = name, parts[3] = type
			if (parts.length < 4) continue;

			const rangStr = parts[1].replace(/[^0-9]/g, '');
			const rang = parseInt(rangStr);
			if (isNaN(rang) || rang < 1 || rang > 4) continue;

			const name = parts[2].trim();
			// Type field: `automatisme` or `capacite_attendue` (inside backticks)
			const typeMatch = parts[3].match(/`([^`]+)`/);
			const rawType = typeMatch ? typeMatch[1] : parts[3].trim().replace(/`/g, '');
			const knowledge_type = rawType === 'automatisme' ? 'automatisme' : 'capacite_attendue';

			if (currentObjective && name) {
				currentObjective.capacities.push({ rang, name, knowledge_type });
			}
			continue;
		}

		// Exit table if line doesn't start with |
		if (inTable && !line.startsWith('|')) {
			inTable = false;
			tableHeaderPassed = false;
		}
	}

	return themes;
}

// ---------------------------------------------------------------------------
// Parse college-competences.md → Family B
// ---------------------------------------------------------------------------

// Capitalize first letter, lowercase rest (for display names)
function capitalize(s: string): string {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function parseCompetences(content: string): MathCompetence[] {
	const competences: MathCompetence[] = [];
	const lines = content.split('\n');

	// Competence heading: ## N. NAME (all caps in source)
	const competencePattern = /^## (\d+)\. (.+)$/;
	// Subdimension heading: #### A — Name
	const subdimPattern = /^#### ([A-D]) — (.+)$/;

	// Extract gloss per competence from the vue élève table.
	// Pattern: | **Chercher**    | essayer des pistes, persévérer | ... |
	// The table has variable spacing; use split('|') to parse robustly.
	// The table names are in normal case; headings are UPPERCASE. Match case-insensitively.
	const glossMap: Record<string, string> = {}; // key = normalized uppercase (no accents)
	for (const line of lines) {
		if (!line.startsWith('|')) continue;
		const parts = line.split('|').map((p) => p.trim());
		// parts[0] = '', parts[1] = **Name**, parts[2] = gloss, parts[3] = coeur, parts[4] = ''
		if (parts.length < 4) continue;
		const boldMatch = /^\*\*([^*]+)\*\*$/.exec(parts[1]);
		if (!boldMatch) continue;
		const competenceName = boldMatch[1].trim();
		const gloss = parts[2].trim();
		// Only store if gloss looks like a real gloss (not a table header)
		if (gloss && !gloss.startsWith('-') && !gloss.toLowerCase().includes('glose')) {
			const key = competenceName.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
			glossMap[key] = gloss;
		}
	}

	let currentCompetence: MathCompetence | null = null;
	let currentSubdim: Subdimension | null = null;
	let inTable = false;
	let tableHeaderPassed = false;
	let inObservableSection = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Detect competence section (## N. NAME)
		const compMatch = competencePattern.exec(line);
		if (compMatch) {
			const order = parseInt(compMatch[1]);
			const rawName = compMatch[2].trim(); // e.g. 'CHERCHER', 'MODÉLISER'
			// Code: lowercase, no accents
			const code = toCode(rawName);
			// Lookup gloss using normalized uppercase key
			const normKey = rawName.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
			const gloss = glossMap[normKey] || '';
			// Display name: capitalize first letter only (Chercher, Calculer, etc.)
			const displayName = capitalize(rawName);

			currentCompetence = {
				order,
				code,
				name: displayName,
				glossForStudent: gloss,
				subdimensions: []
			};
			competences.push(currentCompetence);
			currentSubdim = null;
			inTable = false;
			tableHeaderPassed = false;
			inObservableSection = false;
			continue;
		}

		// Detect observable section header
		if (line.includes('### Observables')) {
			inObservableSection = true;
			continue;
		}

		// Stop observable section at rules section
		if (line.includes('### Règle de validation') || line.includes('### Note d')) {
			inObservableSection = false;
			inTable = false;
			continue;
		}

		if (!inObservableSection) continue;

		// Detect subdimension heading: #### A — Name
		const subdimMatch = subdimPattern.exec(line);
		if (subdimMatch) {
			currentSubdim = {
				letter: subdimMatch[1],
				name: subdimMatch[2].trim(),
				observables: []
			};
			if (currentCompetence) {
				currentCompetence.subdimensions.push(currentSubdim);
			}
			inTable = false;
			tableHeaderPassed = false;
			continue;
		}

		// Table detection
		if (line.match(/^\| Code\s*\|/) || line.match(/^\| --/)) {
			if (line.match(/^\| Code\s*\|/)) {
				inTable = true;
				tableHeaderPassed = false;
			} else if (inTable && line.match(/^\| --/)) {
				tableHeaderPassed = true;
			}
			continue;
		}

		// Parse table row: | **A1** | Student text | Teacher text |
		if (inTable && tableHeaderPassed && line.startsWith('|')) {
			if (line.trim() === '') {
				inTable = false;
				tableHeaderPassed = false;
				continue;
			}

			const parts = line.split('|').map((p) => p.trim());
			// parts[0] = '', parts[1] = code, parts[2] = student, parts[3] = teacher
			if (parts.length < 4) continue;

			// Extract code from **A1**
			const codeMatch = parts[1].match(/\*\*([A-D]\d+)\*\*/);
			if (!codeMatch) continue;
			const code = codeMatch[1];

			const studentText = parts[2].trim();
			const teacherText = parts[3].trim();

			if (currentSubdim && studentText) {
				currentSubdim.observables.push({ code, studentText, teacherText });
			}
			continue;
		}

		if (inTable && !line.startsWith('|')) {
			inTable = false;
			tableHeaderPassed = false;
		}
	}

	return competences;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCode(name: string): string {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]/g, '');
}

function esc(s: string): string {
	return s.replace(/'/g, "''");
}

// ---------------------------------------------------------------------------
// Validate parsed data
// ---------------------------------------------------------------------------

function validate(themes: Theme[], competences: MathCompetence[]): void {
	// Count items (objectives)
	let totalObjectives = 0;
	let totalCapacities = 0;
	for (const theme of themes) {
		totalObjectives += theme.objectives.length;
		for (const obj of theme.objectives) {
			totalCapacities += obj.capacities.length;
			if (obj.capacities.length !== 4) {
				console.error(
					`WARNING: Item ${obj.number} "${obj.name}" has ${obj.capacities.length} capacities (expected 4)`
				);
			}
		}
	}

	console.error(
		`Family A: ${themes.length} themes, ${totalObjectives} objectives, ${totalCapacities} capacities`
	);
	if (themes.length !== 6) console.error(`  ERROR: expected 6 themes, got ${themes.length}`);
	if (totalObjectives !== 18)
		console.error(`  ERROR: expected 18 objectives, got ${totalObjectives}`);
	if (totalCapacities !== 72)
		console.error(`  ERROR: expected 72 capacities, got ${totalCapacities}`);

	// Count subdimensions and observables
	let totalSubdims = 0;
	let totalObservables = 0;
	for (const comp of competences) {
		totalSubdims += comp.subdimensions.length;
		for (const subdim of comp.subdimensions) {
			totalObservables += subdim.observables.length;
		}
	}

	console.error(
		`Family B: ${competences.length} competences, ${totalSubdims} subdimensions, ${totalObservables} observables`
	);
	if (competences.length !== 6)
		console.error(`  ERROR: expected 6 competences, got ${competences.length}`);
	if (totalSubdims !== 22) console.error(`  ERROR: expected 22 subdimensions, got ${totalSubdims}`);
	if (totalObservables !== 56)
		console.error(`  ERROR: expected 56 observables, got ${totalObservables}`);

	// Verify no item #4
	for (const theme of themes) {
		for (const obj of theme.objectives) {
			if (obj.number === 4) {
				console.error(`  ERROR: Item #4 found (should have been removed)`);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Generate SQL
// ---------------------------------------------------------------------------

function generateSQL(themes: Theme[], competences: MathCompetence[]): string {
	const now = new Date()
		.toISOString()
		.replace('T', ' ')
		.replace(/\.\d+Z$/, ' UTC');
	const lines: string[] = [];

	lines.push(`-- ============================================================================`);
	lines.push(`-- Migration: Competence Referentiel — Seeds (Phase 1 step 1.3)`);
	lines.push(`-- Generated: ${now}`);
	lines.push(`-- Generator: scripts/generate-competence-seeds.ts`);
	lines.push(`--`);
	lines.push(`-- Re-generate with: pnpm tsx scripts/generate-competence-seeds.ts`);
	lines.push(`--`);
	lines.push(`-- Sources:`);
	lines.push(`--   Family A (knowledge) : docs/wip/referentiel/6e-savoirs.md`);
	lines.push(`--   Family B (competence): docs/wip/referentiel/college-competences.md`);
	lines.push(`--`);
	lines.push(`-- Counts (verified by script):`);

	let totalObjectives = 0;
	let totalCapacities = 0;
	for (const theme of themes) {
		totalObjectives += theme.objectives.length;
		for (const obj of theme.objectives) totalCapacities += obj.capacities.length;
	}
	let totalSubdims = 0;
	let totalObservables = 0;
	for (const comp of competences) {
		totalSubdims += comp.subdimensions.length;
		for (const subdim of comp.subdimensions) totalObservables += subdim.observables.length;
	}

	lines.push(
		`--   Family A: ${themes.length} themes | ${totalObjectives} objectives | ${totalCapacities} capacities`
	);
	lines.push(
		`--   Family B: ${competences.length} competences | ${totalSubdims} subdimensions | ${totalObservables} observables`
	);
	lines.push(`-- ============================================================================`);
	lines.push(``);

	// -----------------------------------------------------------------------
	// Single DO $$ block — verbose but fully explicit and readable
	// -----------------------------------------------------------------------
	lines.push(`DO $$`);
	lines.push(`DECLARE`);

	// Declare variables for theme IDs
	for (const theme of themes) {
		const varName = `v_theme_${toCode(theme.name)}_id`;
		lines.push(`  ${varName} UUID;`);
	}
	lines.push(``);

	// Declare variables for objective IDs
	for (const theme of themes) {
		for (const obj of theme.objectives) {
			const varName = `v_obj_${obj.number}_id`;
			lines.push(`  ${varName} UUID;`);
		}
	}
	lines.push(``);

	// Declare variables for math competence IDs
	for (const comp of competences) {
		const varName = `v_comp_${comp.code}_id`;
		lines.push(`  ${varName} UUID;`);
	}
	lines.push(``);

	// Declare variables for subdimension IDs
	for (const comp of competences) {
		for (const subdim of comp.subdimensions) {
			const varName = `v_subdim_${comp.code}_${subdim.letter.toLowerCase()}_id`;
			lines.push(`  ${varName} UUID;`);
		}
	}

	lines.push(`BEGIN`);
	lines.push(``);

	// -----------------------------------------------------------------------
	// FAMILY A — skill_themes
	// -----------------------------------------------------------------------
	lines.push(`  -- ========================================================================`);
	lines.push(`  -- FAMILY A — skill_themes`);
	lines.push(`  -- ========================================================================`);
	lines.push(``);

	for (const theme of themes) {
		const varName = `v_theme_${toCode(theme.name)}_id`;
		lines.push(`  -- Theme ${theme.number}: ${theme.name}`);
		lines.push(`  SELECT id INTO ${varName}`);
		lines.push(`    FROM public.skill_themes`);
		lines.push(`   WHERE niveau_scolaire = '6e' AND name = '${esc(theme.name)}';`);
		lines.push(`  IF ${varName} IS NULL THEN`);
		lines.push(`    INSERT INTO public.skill_themes (niveau_scolaire, name, display_order)`);
		lines.push(`    VALUES ('6e', '${esc(theme.name)}', ${theme.number})`);
		lines.push(`    RETURNING id INTO ${varName};`);
		lines.push(`  END IF;`);
		lines.push(``);
	}

	// -----------------------------------------------------------------------
	// FAMILY A — skill_objectives
	// -----------------------------------------------------------------------
	lines.push(`  -- ========================================================================`);
	lines.push(`  -- FAMILY A — skill_objectives`);
	lines.push(`  -- ========================================================================`);
	lines.push(``);

	for (const theme of themes) {
		const themeVar = `v_theme_${toCode(theme.name)}_id`;
		lines.push(`  -- Theme ${theme.number}: ${theme.name}`);

		for (let idx = 0; idx < theme.objectives.length; idx++) {
			const obj = theme.objectives[idx];
			const objVar = `v_obj_${obj.number}_id`;
			const displayOrder = idx + 1; // 1-based within theme

			lines.push(`  -- Item ${obj.number}: ${obj.name}`);
			lines.push(`  SELECT id INTO ${objVar}`);
			lines.push(`    FROM public.skill_objectives`);
			lines.push(`   WHERE theme_id = ${themeVar} AND name = '${esc(obj.name)}';`);
			lines.push(`  IF ${objVar} IS NULL THEN`);
			lines.push(`    INSERT INTO public.skill_objectives (theme_id, name, display_order)`);
			lines.push(`    VALUES (${themeVar}, '${esc(obj.name)}', ${displayOrder})`);
			lines.push(`    RETURNING id INTO ${objVar};`);
			lines.push(`  END IF;`);
			lines.push(``);
		}
	}

	// -----------------------------------------------------------------------
	// FAMILY A — skills (capacities)
	// -----------------------------------------------------------------------
	lines.push(`  -- ========================================================================`);
	lines.push(`  -- FAMILY A — skills (capacities, 72 rows)`);
	lines.push(`  -- ========================================================================`);
	lines.push(``);

	for (const theme of themes) {
		for (const obj of theme.objectives) {
			const objVar = `v_obj_${obj.number}_id`;
			lines.push(`  -- Item ${obj.number}: ${obj.name}`);
			for (const cap of obj.capacities) {
				lines.push(`  INSERT INTO public.skills`);
				lines.push(`    (objective_id, name, knowledge_type, display_order, niveau_scolaire)`);
				lines.push(
					`  SELECT ${objVar}, '${esc(cap.name)}', '${cap.knowledge_type}', ${cap.rang}, '6e'`
				);
				lines.push(`  WHERE NOT EXISTS (`);
				lines.push(`    SELECT 1 FROM public.skills`);
				lines.push(`    WHERE objective_id = ${objVar} AND display_order = ${cap.rang}`);
				lines.push(`  );`);
			}
			lines.push(``);
		}
	}

	// -----------------------------------------------------------------------
	// FAMILY B — math_competences
	// -----------------------------------------------------------------------
	lines.push(`  -- ========================================================================`);
	lines.push(`  -- FAMILY B — math_competences`);
	lines.push(`  -- ========================================================================`);
	lines.push(``);

	for (const comp of competences) {
		const varName = `v_comp_${comp.code}_id`;
		lines.push(`  -- Competence ${comp.order}: ${comp.name}`);
		lines.push(`  SELECT id INTO ${varName}`);
		lines.push(`    FROM public.math_competences`);
		lines.push(`   WHERE code = '${esc(comp.code)}';`);
		lines.push(`  IF ${varName} IS NULL THEN`);
		lines.push(
			`    INSERT INTO public.math_competences (code, name, gloss_for_student, display_order)`
		);
		lines.push(
			`    VALUES ('${esc(comp.code)}', '${esc(comp.name)}', '${esc(comp.glossForStudent)}', ${comp.order})`
		);
		lines.push(`    RETURNING id INTO ${varName};`);
		lines.push(`  END IF;`);
		lines.push(``);
	}

	// -----------------------------------------------------------------------
	// FAMILY B — math_competence_subdimensions
	// -----------------------------------------------------------------------
	lines.push(`  -- ========================================================================`);
	lines.push(`  -- FAMILY B — math_competence_subdimensions`);
	lines.push(`  -- ========================================================================`);
	lines.push(``);

	for (const comp of competences) {
		const compVar = `v_comp_${comp.code}_id`;
		lines.push(`  -- Competence: ${comp.name}`);

		for (let idx = 0; idx < comp.subdimensions.length; idx++) {
			const subdim = comp.subdimensions[idx];
			const subdimVar = `v_subdim_${comp.code}_${subdim.letter.toLowerCase()}_id`;
			const displayOrder = idx + 1;

			lines.push(`  -- Subdimension ${subdim.letter}: ${subdim.name}`);
			lines.push(`  SELECT id INTO ${subdimVar}`);
			lines.push(`    FROM public.math_competence_subdimensions`);
			lines.push(`   WHERE math_competence_id = ${compVar} AND letter = '${subdim.letter}';`);
			lines.push(`  IF ${subdimVar} IS NULL THEN`);
			lines.push(`    INSERT INTO public.math_competence_subdimensions`);
			lines.push(`      (math_competence_id, letter, name, display_order)`);
			lines.push(
				`    VALUES (${compVar}, '${subdim.letter}', '${esc(subdim.name)}', ${displayOrder})`
			);
			lines.push(`    RETURNING id INTO ${subdimVar};`);
			lines.push(`  END IF;`);
			lines.push(``);
		}
	}

	// -----------------------------------------------------------------------
	// FAMILY B — skills (observables)
	// -----------------------------------------------------------------------
	lines.push(`  -- ========================================================================`);
	lines.push(`  -- FAMILY B — skills (observables, 56 rows)`);
	lines.push(`  -- ========================================================================`);
	lines.push(``);

	for (const comp of competences) {
		for (const subdim of comp.subdimensions) {
			const subdimVar = `v_subdim_${comp.code}_${subdim.letter.toLowerCase()}_id`;
			lines.push(`  -- ${comp.name} > ${subdim.letter} — ${subdim.name}`);

			for (let idx = 0; idx < subdim.observables.length; idx++) {
				const obs = subdim.observables[idx];
				const displayOrder = idx + 1;

				lines.push(`  INSERT INTO public.skills`);
				lines.push(
					`    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)`
				);
				lines.push(`  SELECT ${subdimVar}, '${esc(obs.code)}', '${esc(obs.studentText)}',`);
				lines.push(`         '${esc(obs.teacherText)}', ${displayOrder}, 'college'`);
				lines.push(`  WHERE NOT EXISTS (`);
				lines.push(`    SELECT 1 FROM public.skills`);
				lines.push(
					`    WHERE subdimension_id = ${subdimVar} AND observable_code = '${esc(obs.code)}'`
				);
				lines.push(`  );`);
			}
			lines.push(``);
		}
	}

	lines.push(`END $$;`);
	lines.push(``);

	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
	const savoirsPath = join(ROOT, 'docs/wip/referentiel/6e-savoirs.md');
	const competencesPath = join(ROOT, 'docs/wip/referentiel/college-competences.md');
	const outputPath = join(
		ROOT,
		'supabase/migrations/20260609120002_competence_referentiel_seeds.sql'
	);

	console.error('Reading source files...');
	const savoirsContent = readFileSync(savoirsPath, 'utf-8');
	const competencesContent = readFileSync(competencesPath, 'utf-8');

	console.error('Parsing 6e-savoirs.md (Family A)...');
	const themes = parseSavoirs(savoirsContent);

	console.error('Parsing college-competences.md (Family B)...');
	const competences = parseCompetences(competencesContent);

	console.error('Validating parsed data...');
	validate(themes, competences);

	// Debug: print parsed structure details
	console.error('\n--- Theme breakdown ---');
	for (const theme of themes) {
		const items = theme.objectives.map((o) => o.number).join(', ');
		console.error(`  Theme ${theme.number} "${theme.name}": items [${items}]`);
	}

	console.error('\n--- Competence breakdown ---');
	for (const comp of competences) {
		const subdimSummary = comp.subdimensions
			.map((s) => `${s.letter}(${s.observables.length})`)
			.join(' ');
		console.error(`  ${comp.code}: ${subdimSummary}`);
	}

	console.error('\nGenerating SQL...');
	const sql = generateSQL(themes, competences);

	// Write to migration file
	writeFileSync(outputPath, sql, 'utf-8');
	console.error(`\nSQL written to: ${outputPath}`);

	const lineCount = sql.split('\n').length;
	console.error(`Lines: ${lineCount}`);

	// Also output to stdout
	process.stdout.write(sql);
}

main();
