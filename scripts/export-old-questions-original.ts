#!/usr/bin/env tsx

/**
 * Export Old Questions in Original TinyMath Format
 * =================================================
 *
 * This script exports questions from .claude/old-questions.json
 * in their ORIGINAL TinyMath format (no transformation), with
 * a detailed analysis of the old system's features.
 *
 * Output:
 *   data/old-format-export/export-YYYY-MM-DD/
 *   ├── manifest.json           # Complete statistics
 *   ├── bilan-detaille.md       # Detailed French report
 *   ├── questions-completes.json # All questions in original format
 *   ├── by-theme/
 *   │   └── {theme}.json        # Questions grouped by theme
 *   ├── by-type/
 *   │   └── {type}.json         # Questions grouped by detected type
 *   └── analyses/
 *       ├── syntaxe-variables.md  # Variable syntax analysis
 *       ├── options-utilisees.md  # Options usage
 *       ├── types-questions.md    # Question types breakdown
 *       └── exemples-par-type.md  # Examples for each feature
 *
 * Usage:
 *   pnpm tsx scripts/export-old-questions-original.ts
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type {
	QuestionWithMigration,
	OldOption,
	Variables
} from '../src/lib/migration/old-question-types';
import {
	detectQuestionType,
	getVariationCount,
	hasChoices,
	hasImages,
	hasTestAnswers,
	hasVariables,
	hasFillInBlanks
} from '../src/lib/migration/old-question-types';

// ============================================================================
// TYPES
// ============================================================================

interface ThemeStats {
	name: string;
	count: number;
	domains: Map<string, { count: number; subdomains: Map<string, number> }>;
}

interface TypeStats {
	type: string;
	count: number;
	examples: QuestionWithMigration[];
}

interface VariableSyntaxStats {
	pattern: string;
	description: string;
	count: number;
	examples: string[];
}

interface OptionStats {
	option: OldOption;
	count: number;
	questions: number[];
}

interface FullStats {
	total: number;
	byTheme: Map<string, ThemeStats>;
	byType: Map<string, TypeStats>;
	byGrade: Map<string, number>;
	variableSyntax: Map<string, VariableSyntaxStats>;
	options: Map<string, OptionStats>;
	features: {
		withImages: number;
		withChoices: number;
		withVariables: number;
		withTestAnswers: number;
		withCorrections: number;
		withFillInBlanks: number;
		withExpressions: number;
		withMultipleEnounces: number;
		withUnits: number;
		withHelp: number;
		withConditions: number;
		withLimits: number;
	};
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const INPUT_FILE = '.claude/old-questions.json';
const OUTPUT_BASE = 'data/old-format-export';
const TIMESTAMP = new Date().toISOString().split('T')[0];
const EXPORT_DIR = join(OUTPUT_BASE, `export-${TIMESTAMP}`);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function ensureDir(dirPath: string): Promise<void> {
	await mkdir(dirPath, { recursive: true });
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
	await ensureDir(dirname(filePath));
	await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function writeTextFile(filePath: string, content: string): Promise<void> {
	await ensureDir(dirname(filePath));
	await writeFile(filePath, content, 'utf-8');
}

// ============================================================================
// VARIABLE SYNTAX PATTERNS
// ============================================================================

const VARIABLE_PATTERNS: { regex: RegExp; name: string; description: string }[] = [
	{
		regex: /\$e\[(\d+);(\d+)\]/,
		name: 'integer-range',
		description: 'Entier aléatoire dans un intervalle: $e[min;max]'
	},
	{
		regex: /\$e\[[\d;]+\]\\{[^}]+}/,
		name: 'integer-range-exclude',
		description: 'Entier aléatoire avec exclusions: $e[min;max]\\{excl1;excl2}'
	},
	{ regex: /\$e{(\d+):(\d+)}/, name: 'n-digits', description: 'Nombre à N chiffres: $e{N:M}' },
	{
		regex: /\$d{(\d+);(\d+)}/,
		name: 'decimal-digits',
		description: 'Décimal avec N entiers et M décimales: $d{N;M}'
	},
	{
		regex: /\$l{([^}]+)}/,
		name: 'list-choice',
		description: 'Choix dans une liste: $l{a;b;c}'
	},
	{
		regex: /\[\+?_([^_]+)_\]/,
		name: 'eval-expression',
		description: 'Expression évaluée: [_expr_] ou [+_expr_]'
	},
	{
		regex: /\[&(\d+)\*10\+&(\d+)\]/,
		name: 'positional-number',
		description: 'Construction positionnelle: [&1*10+&2]'
	},
	{ regex: /&(\d+)/, name: 'variable-ref', description: 'Référence de variable: &N' }
];

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeVariableSyntax(
	variables: Variables
): Map<string, { pattern: string; example: string }> {
	const found = new Map<string, { pattern: string; example: string }>();

	for (const [varName, expr] of Object.entries(variables)) {
		for (const { regex, name, description } of VARIABLE_PATTERNS) {
			if (regex.test(expr)) {
				if (!found.has(name)) {
					found.set(name, { pattern: description, example: `${varName}: ${expr}` });
				}
				break;
			}
		}
	}

	return found;
}

function analyzeAllQuestions(questions: QuestionWithMigration[]): FullStats {
	const stats: FullStats = {
		total: questions.length,
		byTheme: new Map(),
		byType: new Map(),
		byGrade: new Map(),
		variableSyntax: new Map(),
		options: new Map(),
		features: {
			withImages: 0,
			withChoices: 0,
			withVariables: 0,
			withTestAnswers: 0,
			withCorrections: 0,
			withFillInBlanks: 0,
			withExpressions: 0,
			withMultipleEnounces: 0,
			withUnits: 0,
			withHelp: 0,
			withConditions: 0,
			withLimits: 0
		}
	};

	for (const q of questions) {
		const { theme, domain, subdomain } = q._migration;
		const qType = detectQuestionType(q);
		const grade = q.grade;

		// Theme stats
		if (!stats.byTheme.has(theme)) {
			stats.byTheme.set(theme, {
				name: theme,
				count: 0,
				domains: new Map()
			});
		}
		const themeStats = stats.byTheme.get(theme)!;
		themeStats.count++;

		if (!themeStats.domains.has(domain)) {
			themeStats.domains.set(domain, { count: 0, subdomains: new Map() });
		}
		const domainStats = themeStats.domains.get(domain)!;
		domainStats.count++;
		domainStats.subdomains.set(subdomain, (domainStats.subdomains.get(subdomain) || 0) + 1);

		// Type stats
		if (!stats.byType.has(qType)) {
			stats.byType.set(qType, { type: qType, count: 0, examples: [] });
		}
		const typeStats = stats.byType.get(qType)!;
		typeStats.count++;
		if (typeStats.examples.length < 3) {
			typeStats.examples.push(q);
		}

		// Grade stats
		stats.byGrade.set(grade, (stats.byGrade.get(grade) || 0) + 1);

		// Variable syntax analysis
		if (q.variabless) {
			for (const vars of q.variabless) {
				const syntaxes = analyzeVariableSyntax(vars);
				for (const [name, { pattern, example }] of syntaxes) {
					if (!stats.variableSyntax.has(name)) {
						stats.variableSyntax.set(name, {
							pattern: name,
							description: pattern,
							count: 0,
							examples: []
						});
					}
					const syntaxStats = stats.variableSyntax.get(name)!;
					syntaxStats.count++;
					if (syntaxStats.examples.length < 5 && !syntaxStats.examples.includes(example)) {
						syntaxStats.examples.push(example);
					}
				}
			}
		}

		// Options stats
		if (q.options) {
			for (const opt of q.options) {
				if (!stats.options.has(opt)) {
					stats.options.set(opt, { option: opt, count: 0, questions: [] });
				}
				const optStats = stats.options.get(opt)!;
				optStats.count++;
				if (optStats.questions.length < 5) {
					optStats.questions.push(q._migration.globalIndex);
				}
			}
		}

		// Feature counts
		if (hasImages(q)) stats.features.withImages++;
		if (hasChoices(q)) stats.features.withChoices++;
		if (hasVariables(q)) stats.features.withVariables++;
		if (hasTestAnswers(q)) stats.features.withTestAnswers++;
		if (q.correctionDetailss || q.correctionFormats) stats.features.withCorrections++;
		if (hasFillInBlanks(q)) stats.features.withFillInBlanks++;
		if (q.expressions && q.expressions.length > 0) stats.features.withExpressions++;
		if (q.enounces && q.enounces.length > 1) stats.features.withMultipleEnounces++;
		if (q.units && q.units.length > 0) stats.features.withUnits++;
		if (q.help) stats.features.withHelp++;
		if (q.conditions && q.conditions.length > 0) stats.features.withConditions++;
		if (q.limits) stats.features.withLimits++;
	}

	return stats;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateBilanDetaille(questions: QuestionWithMigration[], stats: FullStats): string {
	const lines: string[] = [];

	lines.push('# Bilan Détaillé des Questions TinyMath (Format Original)');
	lines.push('');
	lines.push(`**Date d'export:** ${new Date().toISOString()}`);
	lines.push(`**Nombre total de questions:** ${stats.total}`);
	lines.push('');

	// -------------------------------------------------------------------------
	lines.push('## 1. Statistiques par Thème');
	lines.push('');
	lines.push('| Thème | Questions | Domaines | Sous-domaines |');
	lines.push('|-------|-----------|----------|---------------|');

	const sortedThemes = Array.from(stats.byTheme.values()).sort((a, b) => b.count - a.count);

	for (const theme of sortedThemes) {
		const domainCount = theme.domains.size;
		const subdomainCount = Array.from(theme.domains.values()).reduce(
			(sum, d) => sum + d.subdomains.size,
			0
		);
		lines.push(`| ${theme.name} | ${theme.count} | ${domainCount} | ${subdomainCount} |`);
	}
	lines.push('');

	// Detailed theme breakdown
	lines.push('### Détail par thème');
	lines.push('');

	for (const theme of sortedThemes) {
		lines.push(`#### ${theme.name} (${theme.count} questions)`);
		lines.push('');

		for (const [domainName, domainData] of theme.domains) {
			lines.push(`- **${domainName}** (${domainData.count} questions)`);
			for (const [subName, count] of domainData.subdomains) {
				lines.push(`  - ${subName}: ${count}`);
			}
		}
		lines.push('');
	}

	// -------------------------------------------------------------------------
	lines.push('## 2. Statistiques par Niveau (Grade)');
	lines.push('');
	lines.push('| Niveau | Questions |');
	lines.push('|--------|-----------|');

	const gradeOrder = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3', '2', 'SPE_1', 'SPE_T'];
	for (const grade of gradeOrder) {
		const count = stats.byGrade.get(grade);
		if (count) {
			lines.push(`| ${grade} | ${count} |`);
		}
	}
	lines.push('');

	// -------------------------------------------------------------------------
	lines.push('## 3. Types de Questions Détectés');
	lines.push('');
	lines.push('| Type | Questions | Description |');
	lines.push('|------|-----------|-------------|');

	const typeDescriptions: Record<string, string> = {
		numerical_exact: 'Réponse numérique exacte',
		numerical_decimal: 'Réponse décimale',
		multiple_choice_single: 'QCM choix unique',
		multiple_choice_multiple: 'QCM choix multiples',
		fill_in_blanks: 'Texte à trous',
		answer_field: 'Champ de réponse structuré',
		expression: 'Expression mathématique'
	};

	const sortedTypes = Array.from(stats.byType.values()).sort((a, b) => b.count - a.count);

	for (const typeStats of sortedTypes) {
		const desc = typeDescriptions[typeStats.type] || typeStats.type;
		lines.push(`| ${typeStats.type} | ${typeStats.count} | ${desc} |`);
	}
	lines.push('');

	// -------------------------------------------------------------------------
	lines.push('## 4. Syntaxe des Variables (Ancien Format)');
	lines.push('');
	lines.push(
		"Cette section documente les différents patterns utilisés dans les définitions de variables de l'ancien système."
	);
	lines.push('');

	const sortedSyntax = Array.from(stats.variableSyntax.values()).sort((a, b) => b.count - a.count);

	for (const syntax of sortedSyntax) {
		lines.push(`### ${syntax.pattern}`);
		lines.push('');
		lines.push(`**Description:** ${syntax.description}`);
		lines.push(`**Occurrences:** ${syntax.count}`);
		lines.push('');
		lines.push('**Exemples:**');
		lines.push('```');
		for (const ex of syntax.examples) {
			lines.push(ex);
		}
		lines.push('```');
		lines.push('');
	}

	// -------------------------------------------------------------------------
	lines.push('## 5. Options de Validation Utilisées');
	lines.push('');
	lines.push('| Option | Utilisations |');
	lines.push('|--------|-------------|');

	const sortedOptions = Array.from(stats.options.values()).sort((a, b) => b.count - a.count);

	for (const opt of sortedOptions) {
		lines.push(`| \`${opt.option}\` | ${opt.count} |`);
	}
	lines.push('');

	// -------------------------------------------------------------------------
	lines.push('## 6. Fonctionnalités Utilisées');
	lines.push('');
	lines.push('| Fonctionnalité | Questions |');
	lines.push('|----------------|-----------|');
	lines.push(`| Variables dynamiques | ${stats.features.withVariables} |`);
	lines.push(`| Choix multiples (QCM) | ${stats.features.withChoices} |`);
	lines.push(`| Expressions mathématiques | ${stats.features.withExpressions} |`);
	lines.push(`| Corrections détaillées | ${stats.features.withCorrections} |`);
	lines.push(`| Images | ${stats.features.withImages} |`);
	lines.push(`| Texte à trous (fill-in-blanks) | ${stats.features.withFillInBlanks} |`);
	lines.push(`| Variations d'énoncés | ${stats.features.withMultipleEnounces} |`);
	lines.push(`| Unités de mesure | ${stats.features.withUnits} |`);
	lines.push(`| Aide intégrée | ${stats.features.withHelp} |`);
	lines.push(`| Conditions de génération | ${stats.features.withConditions} |`);
	lines.push(`| Limites de génération | ${stats.features.withLimits} |`);
	lines.push(`| Validation personnalisée (testAnswers) | ${stats.features.withTestAnswers} |`);
	lines.push('');

	// -------------------------------------------------------------------------
	lines.push('## 7. Exemples Représentatifs par Type');
	lines.push('');

	for (const typeStats of sortedTypes) {
		if (typeStats.examples.length > 0) {
			lines.push(`### ${typeStats.type}`);
			lines.push('');

			const example = typeStats.examples[0];
			lines.push(`**Question ${example._migration.globalIndex}:** ${example.description}`);
			lines.push('');
			lines.push('```json');
			lines.push(JSON.stringify(example, null, 2).substring(0, 2000));
			if (JSON.stringify(example, null, 2).length > 2000) {
				lines.push('... (truncated)');
			}
			lines.push('```');
			lines.push('');
		}
	}

	// -------------------------------------------------------------------------
	lines.push('## 8. Structure des Champs');
	lines.push('');
	lines.push('### Champs obligatoires');
	lines.push('- `description`: Titre de la question');
	lines.push('- `enounces`: Tableau des énoncés (variations)');
	lines.push('- `solutionss`: Tableau des solutions par variation');
	lines.push('- `defaultDelay`: Temps par défaut en secondes');
	lines.push('- `grade`: Niveau scolaire');
	lines.push('');
	lines.push('### Champs optionnels fréquents');
	lines.push('- `variabless`: Définitions de variables par variation');
	lines.push('- `expressions`: Expressions mathématiques à afficher');
	lines.push('- `choicess`: Choix pour QCM');
	lines.push('- `correctionDetailss`: Explications de correction');
	lines.push('- `options`: Options de validation');
	lines.push('- `images`: Chemins des images');
	lines.push('- `subdescription`: Sous-titre optionnel');
	lines.push('');

	// -------------------------------------------------------------------------
	lines.push('## 9. Convention de Nommage des Variables');
	lines.push('');
	lines.push("Dans l'ancien système, les variables utilisent le format `&N` où N est un nombre:");
	lines.push('');
	lines.push('- `&1`, `&2`, `&3`, ... : Variables définies dans `variabless`');
	lines.push('- Utilisées directement dans les énoncés: `$$&1+&2$$`');
	lines.push('- Utilisées dans les expressions évaluées: `[_&1+&2_]`');
	lines.push('');

	// -------------------------------------------------------------------------
	lines.push('## 10. Fichiers de Sortie');
	lines.push('');
	lines.push('```');
	lines.push(`${EXPORT_DIR}/`);
	lines.push('├── manifest.json            # Statistiques complètes en JSON');
	lines.push('├── bilan-detaille.md        # Ce fichier');
	lines.push('├── questions-completes.json # Toutes les questions (format original)');
	lines.push('├── by-theme/');
	lines.push('│   └── {theme}.json         # Questions groupées par thème');
	lines.push('└── by-type/');
	lines.push('    └── {type}.json          # Questions groupées par type détecté');
	lines.push('```');

	return lines.join('\n');
}

function generateSyntaxeVariablesReport(stats: FullStats): string {
	const lines: string[] = [];

	lines.push('# Analyse de la Syntaxe des Variables (TinyMath)');
	lines.push('');
	lines.push(
		"Ce document détaille tous les patterns de syntaxe utilisés pour définir les variables dans l'ancien système."
	);
	lines.push('');

	const sortedSyntax = Array.from(stats.variableSyntax.values()).sort((a, b) => b.count - a.count);

	for (const syntax of sortedSyntax) {
		lines.push(`## ${syntax.pattern}`);
		lines.push('');
		lines.push(`**${syntax.description}**`);
		lines.push('');
		lines.push(`Nombre d'utilisations: ${syntax.count}`);
		lines.push('');
		lines.push('### Exemples concrets');
		lines.push('');
		lines.push('```');
		for (const ex of syntax.examples) {
			lines.push(ex);
		}
		lines.push('```');
		lines.push('');
		lines.push('---');
		lines.push('');
	}

	return lines.join('\n');
}

function generateOptionsReport(stats: FullStats): string {
	const lines: string[] = [];

	lines.push('# Options de Validation (TinyMath)');
	lines.push('');
	lines.push("Ce document liste toutes les options de validation utilisées dans l'ancien système.");
	lines.push('');

	const optionCategories: Record<string, OldOption[]> = {
		Espacement: [
			'enounce-no-spaces',
			'exp-no-spaces',
			'require-correct-spaces',
			'no-penalty-for-incorrect-spaces'
		],
		'Produits implicites': ['require-implicit-products', 'no-penalty-for-explicit-products'],
		Parenthèses: [
			'require-no-extraneous-brackets',
			'no-penalty-for-extraneous-brackets',
			'no-penalty-for-extraneous-brackets-in-first-negative-term'
		],
		'Zéros superflus': [
			'exp-allow-unecessary-zeros',
			'require-no-extraneous-zeros',
			'no-penalty-for-extraneous-zeros'
		],
		'Signes superflus': ['require-no-extraneous-signs', 'no-penalty-for-extraneous-signs'],
		Facteurs: [
			'require-no-factor-one',
			'no-penalty-for-factor-one',
			'require-no-factor-zero',
			'no-penalty-for-factor-zero'
		],
		'Termes nuls': ['require-no-null-terms', 'no-penalty-for-null-terms'],
		Fractions: ['require-reduced-fractions', 'no-penalty-for-non-reduced-fractions'],
		Unités: ['require-specific-unit', 'no-penalty-for-not-respected-unit'],
		Permutations: [
			'disallow-terms-permutation',
			'disallow-factors-permutation',
			'disallow-terms-and-factors-permutation',
			'penalty-for-terms-and-factors-permutation',
			'penalty-for-terms-permutation',
			'penalty-for-factors-permutation'
		],
		'Modifications expression': [
			'shuffle-terms',
			'shuffle-factors',
			'shuffle-terms-and-factors',
			'shallow-shuffle-terms',
			'shallow-shuffle-factors',
			'exp-remove-unecessary-brackets'
		],
		Autres: [
			'no-shuffle-choices',
			'allow-same-expression',
			'allow-same-enounce',
			'remove-null-terms',
			'exhaust',
			'solutions-order-not-important',
			'multiples',
			'one-single-form-solution'
		]
	};

	for (const [category, options] of Object.entries(optionCategories)) {
		lines.push(`## ${category}`);
		lines.push('');
		lines.push('| Option | Utilisations |');
		lines.push('|--------|-------------|');

		for (const opt of options) {
			const optStats = stats.options.get(opt);
			if (optStats) {
				lines.push(`| \`${opt}\` | ${optStats.count} |`);
			}
		}
		lines.push('');
	}

	return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
	console.log('╔══════════════════════════════════════════════════════════════════╗');
	console.log('║   Export Questions TinyMath (Format Original)                   ║');
	console.log('╚══════════════════════════════════════════════════════════════════╝');
	console.log('');

	try {
		// Load questions
		console.log(`📖 Lecture des questions depuis: ${INPUT_FILE}`);
		const content = await readFile(INPUT_FILE, 'utf-8');
		const questions = JSON.parse(content) as QuestionWithMigration[];
		console.log(`✓ ${questions.length} questions chargées`);

		// Analyze
		console.log('\n🔍 Analyse des questions...');
		const stats = analyzeAllQuestions(questions);
		console.log(`✓ Analyse terminée`);
		console.log(`  - ${stats.byTheme.size} thèmes`);
		console.log(`  - ${stats.byType.size} types de questions`);
		console.log(`  - ${stats.variableSyntax.size} patterns de syntaxe`);
		console.log(`  - ${stats.options.size} options différentes`);

		// Create output directory
		await ensureDir(EXPORT_DIR);

		// Write all questions in original format
		console.log('\n📄 Export des fichiers...');
		await writeJsonFile(join(EXPORT_DIR, 'questions-completes.json'), questions);
		console.log(`  ✓ questions-completes.json`);

		// Write by theme
		const byThemeDir = join(EXPORT_DIR, 'by-theme');
		await ensureDir(byThemeDir);
		for (const [theme, themeData] of stats.byTheme) {
			const themeQuestions = questions.filter((q) => q._migration.theme === theme);
			await writeJsonFile(
				join(byThemeDir, `${theme.toLowerCase().replace(/\s+/g, '-')}.json`),
				themeQuestions
			);
		}
		console.log(`  ✓ by-theme/ (${stats.byTheme.size} fichiers)`);

		// Write by type
		const byTypeDir = join(EXPORT_DIR, 'by-type');
		await ensureDir(byTypeDir);
		for (const [type, typeData] of stats.byType) {
			const typeQuestions = questions.filter((q) => detectQuestionType(q) === type);
			await writeJsonFile(join(byTypeDir, `${type}.json`), typeQuestions);
		}
		console.log(`  ✓ by-type/ (${stats.byType.size} fichiers)`);

		// Write analyses
		const analysesDir = join(EXPORT_DIR, 'analyses');
		await ensureDir(analysesDir);

		await writeTextFile(
			join(analysesDir, 'syntaxe-variables.md'),
			generateSyntaxeVariablesReport(stats)
		);
		console.log(`  ✓ analyses/syntaxe-variables.md`);

		await writeTextFile(join(analysesDir, 'options-utilisees.md'), generateOptionsReport(stats));
		console.log(`  ✓ analyses/options-utilisees.md`);

		// Write main report
		await writeTextFile(
			join(EXPORT_DIR, 'bilan-detaille.md'),
			generateBilanDetaille(questions, stats)
		);
		console.log(`  ✓ bilan-detaille.md`);

		// Write manifest
		const manifest = {
			exportDate: new Date().toISOString(),
			totalQuestions: stats.total,
			themes: Object.fromEntries(
				Array.from(stats.byTheme.entries()).map(([k, v]) => [
					k,
					{
						count: v.count,
						domains: Object.fromEntries(
							Array.from(v.domains.entries()).map(([dk, dv]) => [
								dk,
								{
									count: dv.count,
									subdomains: Object.fromEntries(dv.subdomains)
								}
							])
						)
					}
				])
			),
			types: Object.fromEntries(Array.from(stats.byType.entries()).map(([k, v]) => [k, v.count])),
			grades: Object.fromEntries(stats.byGrade),
			variableSyntax: Object.fromEntries(
				Array.from(stats.variableSyntax.entries()).map(([k, v]) => [
					k,
					{ description: v.description, count: v.count, examples: v.examples }
				])
			),
			options: Object.fromEntries(
				Array.from(stats.options.entries()).map(([k, v]) => [k, v.count])
			),
			features: stats.features
		};
		await writeJsonFile(join(EXPORT_DIR, 'manifest.json'), manifest);
		console.log(`  ✓ manifest.json`);

		// Summary
		console.log('');
		console.log('╔══════════════════════════════════════════════════════════════════╗');
		console.log('║                      Export Terminé                              ║');
		console.log('╚══════════════════════════════════════════════════════════════════╝');
		console.log('');
		console.log(`📦 Répertoire: ${EXPORT_DIR}`);
		console.log('');
		console.log('📊 Résumé:');
		console.log(`   Total questions: ${stats.total}`);
		console.log(`   Thèmes: ${stats.byTheme.size}`);
		console.log(`   Types: ${stats.byType.size}`);
		console.log(`   Patterns de syntaxe: ${stats.variableSyntax.size}`);
		console.log(`   Options différentes: ${stats.options.size}`);
		console.log('');
		console.log('📄 Fichiers générés:');
		console.log(`   - bilan-detaille.md (rapport complet)`);
		console.log(`   - manifest.json (données structurées)`);
		console.log(`   - questions-completes.json (toutes les questions)`);
		console.log(`   - by-theme/*.json (par thème)`);
		console.log(`   - by-type/*.json (par type)`);
		console.log(`   - analyses/*.md (analyses détaillées)`);
	} catch (error) {
		console.error('');
		console.error('❌ Erreur:');
		console.error(error instanceof Error ? error.message : String(error));
		if (error instanceof Error && error.stack) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}

main();
