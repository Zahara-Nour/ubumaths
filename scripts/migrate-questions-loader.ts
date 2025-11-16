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

// Get current directory (ESM compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OLD_QUESTIONS_PATH = path.resolve(
	__dirname,
	'../extern/new-tinymath/apps/ubumaths/src/lib/questions/questions.ts'
);

const OUTPUT_PATH = path.resolve(__dirname, '../.claude/old-questions.json');

/**
 * Grade constants mapping
 */
const GRADE_CONSTANTS: Record<string, string> = {
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
 * Color constants (used in some questions)
 */
const COLOR_CONSTANTS: Record<string, string> = {
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

	// Extract the questions array using regex
	// Looking for: export const questions: Questions = [ ... ]
	const questionsMatch = fileContent.match(
		/export\s+const\s+questions[^=]*=\s*(\[[\s\S]*?\])\s*(?:;|$)/
	);

	if (!questionsMatch) {
		console.error('❌ Could not find questions array in the file');
		console.error('Expected format: export const questions: Questions = [...]');
		process.exit(1);
	}

	const questionsArrayString = questionsMatch[1];

	console.log('🔧 Transforming questions to JSON-safe format...');

	// Transform the JavaScript array to JSON-safe format
	let jsonString = questionsArrayString;

	// Replace grade constants
	Object.keys(GRADE_CONSTANTS).forEach((key) => {
		const regex = new RegExp(`\\b${key}\\b`, 'g');
		jsonString = jsonString.replace(regex, `"${GRADE_CONSTANTS[key]}"`);
	});

	// Replace color constants
	Object.keys(COLOR_CONSTANTS).forEach((key) => {
		const regex = new RegExp(`\\b${key}\\b`, 'g');
		jsonString = jsonString.replace(regex, `"${COLOR_CONSTANTS[key]}"`);
	});

	// Convert JavaScript object notation to JSON
	// Replace unquoted object keys
	jsonString = jsonString.replace(/(\w+):/g, '"$1":');

	// Replace single quotes with double quotes (careful with escaped quotes)
	jsonString = jsonString.replace(/'/g, '"');

	// Fix escaped characters
	jsonString = jsonString.replace(/\\"/g, '\\"');

	// Remove trailing commas (not valid in JSON)
	jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

	// Remove JavaScript-specific syntax (functions, template literals, etc.)
	// This is a simplified approach - for complex cases, manual review may be needed
	jsonString = jsonString.replace(/\$\{[^}]*\}/g, ''); // Remove template literals
	jsonString = jsonString.replace(/`/g, '"'); // Replace backticks

	try {
		// Attempt to parse the JSON
		const questions = JSON.parse(jsonString);

		// Ensure output directory exists
		await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

		// Save to JSON file
		await fs.writeFile(OUTPUT_PATH, JSON.stringify(questions, null, 2), 'utf-8');

		console.log(
			'✅ Successfully extracted',
			Array.isArray(questions) ? questions.length : 'unknown number of',
			'questions'
		);
		console.log('📄 Saved to:', OUTPUT_PATH);

		// Provide summary
		if (Array.isArray(questions)) {
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
		}

		return questions;
	} catch (error) {
		console.error('❌ Failed to parse questions as JSON:', error);
		console.error(
			'\nThe questions file contains JavaScript syntax that cannot be automatically converted to JSON.'
		);
		console.error('Please manually review and convert the questions file to valid JSON format.');
		console.error('\nCommon issues to fix:');
		console.error('  - Remove or convert function expressions');
		console.error('  - Remove template literals (${...})');
		console.error('  - Ensure all keys are quoted');
		console.error('  - Remove trailing commas');
		console.error('  - Convert undefined to null');

		// Save the attempted conversion for manual review
		const debugPath = path.resolve(__dirname, '../.claude/old-questions-debug.txt');
		await fs.writeFile(debugPath, jsonString, 'utf-8');
		console.error(`\n💡 Attempted conversion saved to: ${debugPath}`);
		console.error('   Review this file to manually fix the conversion issues.');

		process.exit(1);
	}
}

// Run the extraction
extractQuestions().catch((error) => {
	console.error('💥 Fatal error:', error);
	process.exit(1);
});
