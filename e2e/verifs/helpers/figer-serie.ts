/**
 * Fige une série d'automatismes d'un modèle de la base LOCALE, comme les scripts de création de
 * fiches (`buildSerie`) : lance `pnpm exec tsx e2e/verifs/helpers/figer-serie.ts <id> <graine>…`,
 * écrit `{ "statement": …, "solution": … }` (JSON) sur la sortie.
 *
 * Lancé en processus à part par `figerSerie` (alias `#lib` résolus par tsx, pas par Playwright).
 */
import pg from 'pg';
import { toQuestionTemplate } from '#lib/types/question-template.ts';
import { buildSerie } from '#lib/worksheets/serie-automatismes.ts';

const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function main(): Promise<void> {
	const [templateId, ...seeds] = process.argv.slice(2);
	if (!templateId || seeds.length === 0) throw new Error('usage : figer-serie.ts <id> <graine>…');
	const db = new pg.Client({ connectionString: LOCAL_DB });
	await db.connect();
	try {
		const { rows } = await db.query('select * from question_templates where id = $1', [templateId]);
		if (rows.length !== 1) throw new Error(`modèle ${templateId} introuvable en base locale`);
		const modeles = new Map([[templateId, toQuestionTemplate(rows[0])]]);
		const serie = buildSerie(
			modeles,
			seeds.map((seed) => ({ templateId, seed: Number(seed) }))
		);
		process.stdout.write(JSON.stringify(serie));
	} finally {
		await db.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
