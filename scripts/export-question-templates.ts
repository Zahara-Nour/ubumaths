/**
 * Exporter des modèles de questions de la base en fichiers JSON (lecture seule)
 * ============================================================================
 *
 * Instantané du contenu EN BASE, au format de `update-published-questions.ts` et de
 * `create-questions.ts` (camelCase, `testSpecs`) : point de départ d'une correction
 * relue en diff. N'écrit jamais en base.
 *
 * Usage :
 *   pnpm tsx scripts/export-question-templates.ts --dir <dossier> --ids <id8>[,<id8>…]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toQuestionTemplate } from '$lib/types/question-template';
import { argValue, createScriptClient } from './relecture/common';

/** Ordre des clés du fichier, celui des instantanés déjà versionnés */
const KEYS = [
	'id',
	'title',
	'description',
	'grades',
	'theme',
	'domain',
	'subdomain',
	'level',
	'delay',
	'status',
	'shared',
	'options',
	'variations',
	'testSpecs'
] as const;

async function main(): Promise<number> {
	const dossier = argValue('--dir');
	const ids = argValue('--ids')?.split(',').filter(Boolean) ?? [];
	if (!dossier || ids.length === 0) {
		console.error(
			'Usage : pnpm tsx scripts/export-question-templates.ts --dir <dossier> --ids <id8>,…'
		);
		return 2;
	}
	const { supabase, target } = createScriptClient(false);
	console.log(`🔍 LECTURE — base ${target}\n`);
	mkdirSync(dossier, { recursive: true });

	const { data, error } = await supabase.from('question_templates').select('*');
	if (error) throw error;

	for (const prefix of ids) {
		const rows = (data ?? []).filter((r) => r.id.startsWith(prefix));
		if (rows.length !== 1) {
			console.error(`⛔ ${prefix} : ${rows.length} modèle(s) trouvé(s), 1 attendu`);
			return 1;
		}
		const template = toQuestionTemplate(rows[0]) as unknown as Record<string, unknown>;
		const ordered = Object.fromEntries(
			KEYS.filter((k) => template[k] !== undefined && template[k] !== null).map((k) => [
				k,
				template[k]
			])
		);
		const file = join(dossier, `${prefix.slice(0, 8)}.json`);
		writeFileSync(file, `${JSON.stringify(ordered, null, '\t')}\n`);
		console.log(`✓ ${file} — ${rows[0].title} (${rows[0].status})`);
	}
	return 0;
}

main().then(
	(code) => process.exit(code),
	(e: unknown) => {
		console.error(e);
		process.exit(1);
	}
);
