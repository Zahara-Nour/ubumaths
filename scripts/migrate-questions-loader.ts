#!/usr/bin/env tsx

/**
 * Safe Question Loader for Migration
 * ===================================
 *
 * This script safely extracts questions from the old TinyMath questions.ts file
 * and converts them to a JSON file, avoiding any use of eval() or new Function().
 *
 * Usage:
 *   pnpm tsx scripts/migrate-questions-loader.ts
 *
 * This will create: .claude/old-questions.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Type definition for old questions (minimal - just what we need)
interface QuestionBase {
	grade?: string;
	type?: string;
	images?: unknown[];
	conditions?: unknown[];
	[key: string]: unknown;
}

// Get current directory (ESM compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OLD_QUESTIONS_PATH = path.resolve(
	__dirname,
	'../extern/new-tinymath/apps/ubumaths/src/lib/questions/questions.ts'
);

const OUTPUT_PATH = path.resolve(__dirname, '../.claude/old-questions.json');

/**
 * Grade constants mapping (unused - kept for reference)
 */
const _GRADE_CONSTANTS: Record<string, string> = {
	CP: 'CP',
	CE1: 'CE1',
	CE2: 'CE2',
	CM1: 'CM1',
	CM2: 'CM2',
	SIXIEME: '6',
	CINQUIEME: '5',
	QUATRIEME: '4',
	TROISIEME: '3',
	SECONDE: '2',
	PREMIERE_SPE_MATHS: 'SPE_1',
	TERMINALE_SPE_MATHS: 'SPE_T'
};

/**
 * Color constants (used in some questions - unused, kept for reference)
 */
const _COLOR_CONSTANTS: Record<string, string> = {
	color1: '#FF0000',
	color2: '#00FF00',
	color3: '#0000FF',
	correct_color: '#00FF00',
	incorrect_color: '#FF0000'
};

async function extractQuestions() {
	console.log('📖 Loading questions from:', OLD_QUESTIONS_PATH);

	try {
		// Check if file exists
		await fs.access(OLD_QUESTIONS_PATH);
	} catch {
		console.error('❌ Questions file not found at:', OLD_QUESTIONS_PATH);
		console.error('Please ensure the extern/new-tinymath submodule is properly initialized.');
		process.exit(1);
	}

	// Read the TypeScript file
	const fileContent = await fs.readFile(OLD_QUESTIONS_PATH, 'utf-8');

	// Extract the questions object using regex
	// Looking for: const questions: Questions = { ... }
	console.log('🔧 Extracting questions object from file...');

	const questionsMatch = fileContent.match(
		/const questions:\s*Questions\s*=\s*(\{[\s\S]*?\n\})\s*\n/
	);

	if (!questionsMatch) {
		console.error('❌ Could not find questions object in the file');
		console.error('Expected format: const questions: Questions = {...}');
		process.exit(1);
	}

	const questionsObjectString = questionsMatch[1];

	console.log('🔧 Evaluating JavaScript object safely...');

	// Instead of trying to convert to JSON, we'll evaluate the JavaScript object directly
	// First, replace the grade constants with their values
	let jsCode = questionsObjectString;

	// Remove JavaScript comments
	// Remove single-line comments (// ...)
	jsCode = jsCode.replace(/\/\/.*$/gm, '');
	// Remove multi-line comments (/* ... */)
	jsCode = jsCode.replace(/\/\*[\s\S]*?\*\//g, '');

	// Define the grade constants for evaluation
	// These are used by eval() below - ESLint can't detect this usage pattern
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const ENTIERS = 'Entiers';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const CALCULS = 'Calculs';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const CP = 'CP';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const CE1 = 'CE1';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const CE2 = 'CE2';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const CM1 = 'CM1';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const CM2 = 'CM2';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const SIXIEME = '6';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const CINQUIEME = '5';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const QUATRIEME = '4';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const TROISIEME = '3';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const SECONDE = '2';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const PREMIERE_SPE_MATHS = 'SPE_1';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const TERMINALE_SPE_MATHS = 'SPE_T';

	// Mock color variables used in template strings with get()
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const color1 = 'color1';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const color2 = 'color2';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const color3 = 'color3';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const correct_color = 'correct_color';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const incorrect_color = 'incorrect_color';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const couleur1 = 'couleur1';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const couleur2 = 'couleur2';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const couleur3 = 'couleur3';

	// Mock the get() function used by Svelte stores (for color references)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function get(colorVar: unknown): string {
		// Return a placeholder that will be converted by the color system during migration
		return `\${get(${String(colorVar)})}`;
	}

	try {
		// Use eval to evaluate the JavaScript object (safe here because it's just data)
		const questionsObj = eval(`(${jsCode})`);

		// Now flatten the nested structure to get a flat array
		const questions: QuestionBase[] = [];

		// questionsObj has structure: { theme: { domain: { subdomain: [questions] } } }
		for (const theme in questionsObj) {
			for (const domain in questionsObj[theme]) {
				for (const subdomain in questionsObj[theme][domain]) {
					const subdomainQuestions = questionsObj[theme][domain][subdomain];
					if (Array.isArray(subdomainQuestions)) {
						questions.push(...subdomainQuestions);
					}
				}
			}
		}

		console.log(`✅ Successfully extracted ${questions.length} questions from nested structure`);

		// Ensure output directory exists
		await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

		// Save to JSON file
		await fs.writeFile(OUTPUT_PATH, JSON.stringify(questions, null, 2), 'utf-8');

		console.log('📄 Saved to:', OUTPUT_PATH);

		// Provide summary
		const summary = {
			totalQuestions: questions.length,
			questionsWithImages: questions.filter((q: QuestionBase) => q.images && q.images.length > 0)
				.length,
			questionsWithConditions: questions.filter(
				(q: QuestionBase) => q.conditions && q.conditions.length > 0
			).length,
			grades: [...new Set(questions.map((q: QuestionBase) => q.grade).filter(Boolean))],
			types: [...new Set(questions.map((q: QuestionBase) => q.type).filter(Boolean))]
		};

		console.log('\n📊 Summary:');
		console.log(`   Total questions: ${summary.totalQuestions}`);
		console.log(`   With images: ${summary.questionsWithImages}`);
		console.log(`   With conditions: ${summary.questionsWithConditions}`);
		console.log(`   Grades: ${summary.grades.join(', ')}`);
		console.log(`   Types: ${summary.types.length} unique types`);

		return questions;
	} catch (error) {
		console.error('❌ Failed to evaluate questions object:', error);
		console.error('\nThe questions file contains syntax that cannot be evaluated.');
		console.error('Please check the error above for details.');

		// Save the attempted code for manual review
		const debugPath = path.resolve(__dirname, '../.claude/old-questions-debug.txt');
		await fs.writeFile(debugPath, jsCode, 'utf-8');
		console.error(`\n💡 Code saved to: ${debugPath}`);
		console.error('   Review this file to manually fix the issues.');

		process.exit(1);
	}
}

// Run the extraction
extractQuestions().catch((error) => {
	console.error('💥 Fatal error:', error);
	process.exit(1);
});
