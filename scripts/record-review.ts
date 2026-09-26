/**
 * Reporter en base les verdicts de relecture d'un lot
 * ===================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 * À lancer seulement après le FEU VERT de David sur le lot.
 *
 * Usage :
 *   pnpm relecture:verdicts --lot docs/relecture/relatifs                (simulation)
 *   pnpm relecture:verdicts --lot docs/relecture/relatifs --publier      (écrit)
 *
 * Options :
 *   --index 12,13   restreindre à ces questions du lot
 *   --remplacer     écraser une version corrigée existante et différente
 *   --publier       ⚠️ écrit dans migration_tracking / migration_edits
 *
 * Pour chaque verdict : template vérifié (specs + 50 tirages par variation),
 * sauvegarde des lignes visées avant écriture, chaque écriture relue.
 * S'arrête à la première erreur d'écriture (les suivantes ne sont pas tentées).
 */

import { recordReview } from '../src/lib/server/migration/review-db';
import { generateStableQuestionHash } from '../src/lib/server/migration/hash-utils';
import {
	argValue,
	backupRows,
	createScriptClient,
	findReviewerId,
	hasFlag,
	loadOldQuestions,
	parseIndexList,
	readReviewFiles
} from './relecture/common';

async function main(): Promise<number> {
	const publish = hasFlag('--publier');
	const lot = argValue('--lot');
	if (!lot) {
		console.error('Préciser --lot <dossier> (voir l’en-tête du script).');
		return 1;
	}
	const only = parseIndexList(argValue('--index'));

	const { supabase, target } = createScriptClient(publish);
	console.log(`Base : ${target}`);
	console.log(`Mode : ${publish ? '⚠️  PUBLICATION (écrit en base)' : 'SIMULATION (rien écrit)'}`);

	const reviews = readReviewFiles(lot).filter(
		(review) => !only || only.includes(review.globalIndex)
	);
	const oldQuestions = await loadOldQuestions();
	const reviewerId = await findReviewerId(supabase);
	console.log(`${reviews.length} verdict(s) dans ${lot}\n`);
	if (reviews.length === 0) return 1;

	const hashes = reviews.map((review) => {
		const old = oldQuestions.get(review.globalIndex);
		if (!old) throw new Error(`ancienne question #${review.globalIndex} introuvable`);
		return generateStableQuestionHash(old as unknown as Record<string, unknown>);
	});
	if (publish) console.log(`Sauvegarde : ${await backupRows(supabase, 'verdicts', hashes)}\n`);

	const ctx = {
		supabase,
		reviewerId,
		now: new Date().toISOString(),
		dryRun: !publish,
		allowReplaceEdit: hasFlag('--remplacer')
	};
	const counts = { written: 0, planned: 0, refused: 0 };
	for (const review of reviews) {
		const outcome = await recordReview(ctx, oldQuestions.get(review.globalIndex)!, review);
		counts[outcome.status]++;
		const mark = { written: '✅ écrit', planned: '… prévu', refused: '❌ refusé' }[outcome.status];
		const why = outcome.reasons.length ? ` — ${outcome.reasons.join(', ')}` : '';
		console.log(`#${review.globalIndex} ${review.verdict} : ${mark}${why}`);
	}

	console.log(
		`\n${reviews.length} analysé(s) : ${counts.written} écrit(s), ${counts.planned} prévu(s), ${counts.refused} refusé(s).`
	);
	if (!publish) console.log('SIMULATION — ajouter --publier pour écrire.');
	return counts.refused === 0 ? 0 : 1;
}

main()
	.then((code) => process.exit(code))
	.catch((error: unknown) => {
		console.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	});
