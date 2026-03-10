/**
 * Export a single question by globalIndex
 *
 * Usage:
 *   pnpm tsx scripts/export-single-question.ts 20
 */

import { readFile } from 'node:fs/promises';
import type { QuestionWithMigration } from '../src/lib/migration/old-question-types';
import { transformQuestion } from '../src/lib/migration/question-transformer';
import type { ImageUrlMapping } from '../src/lib/migration/question-transformer';

const INPUT_FILE = '.claude/old-questions.json';
const IMAGE_MAPPING_FILE = 'scripts/image-url-mapping.json';

async function main(): Promise<void> {
	const index = parseInt(process.argv[2], 10);
	if (isNaN(index)) {
		console.error('Usage: pnpm tsx scripts/export-single-question.ts <globalIndex>');
		process.exit(1);
	}

	const questions = JSON.parse(await readFile(INPUT_FILE, 'utf-8')) as QuestionWithMigration[];
	const q = questions.find((q) => q._migration.globalIndex === index);
	if (!q) {
		console.error(`Question #${index} not found`);
		process.exit(1);
	}

	let imageMapping: ImageUrlMapping = {};
	try {
		imageMapping = JSON.parse(await readFile(IMAGE_MAPPING_FILE, 'utf-8')) as ImageUrlMapping;
	} catch {
		console.warn('No image mapping file found, proceeding without it');
	}

	const result = transformQuestion(q, index, { imageUrlMapping: imageMapping });

	if (!result.success) {
		console.error('Transform failed:', result.errors);
	}
	if (result.warnings?.length) {
		console.warn('Warnings:', result.warnings);
	}

	console.log(JSON.stringify(result.template, null, 2));
}

main();
