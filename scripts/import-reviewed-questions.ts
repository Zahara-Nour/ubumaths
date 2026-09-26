/**
 * Importer les questions TinyMath APPROUVÉES (en brouillon)
 * =========================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 * À lancer seulement après le FEU VERT de David sur le lot.
 *
 * Remplace, pour la relecture, `import-questions-to-db.ts` et
 * `migrate-questions-phase1.ts --publier` (qui ignorent les corrections).
 *
 * Usage :
 *   pnpm relecture:import --lot docs/relecture/relatifs            (simulation)
 *   pnpm relecture:import --lot docs/relecture/relatifs --publier  (écrit)
 *   pnpm relecture:import --index 0,1,2 --publier
 *
 * Sélection : `review_status = 'approved'` et pas de `new_template_id`,
 * restreinte au lot (ses fichiers de verdict) ou aux index donnés.
 * Contenu : la version corrigée (`migration_edits`), sinon la transformation
 * actuelle ; statut forcé à `draft` ; `test_specs` écrit. Une question dont
 * une spec est rouge (ou sans spec, ou dont un tirage échoue) est écartée.
 * Rejouable sans doublon. S'arrête à la première erreur d'écriture.
 */

import {
	importReviewedQuestion,
	listImportCandidates
} from '../src/lib/server/migration/review-db';
import { draftTemplate } from '../src/lib/migration/review/review-file';
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
	// Avec --lot, seul le contenu RELU (fichier de verdict) est importable
	const reviewed = lot
		? new Map(readReviewFiles(lot).map((review) => [review.globalIndex, draftTemplate(review)]))
		: undefined;
	const indices = reviewed ? [...reviewed.keys()] : parseIndexList(argValue('--index'));
	if (!indices) {
		console.error('Préciser --lot <dossier> ou --index 1,2,3 (voir l’en-tête du script).');
		return 1;
	}

	const { supabase, target } = createScriptClient(publish);
	console.log(`Base : ${target}`);
	console.log(`Mode : ${publish ? '⚠️  PUBLICATION (écrit en base)' : 'SIMULATION (rien écrit)'}`);

	const candidates = await listImportCandidates(supabase, indices);
	const oldQuestions = await loadOldQuestions();
	const reviewerId = await findReviewerId(supabase);
	console.log(
		`${indices.length} question(s) visée(s), ${candidates.length} approuvée(s) et non importée(s)`
	);
	const found = new Set(candidates.map((c) => c.globalIndex));
	const missing = indices.filter((index) => !found.has(index));
	if (missing.length > 0) {
		console.log(`Sans candidat (non approuvée, déjà importée ou doublon) : ${missing.join(', ')}`);
	}
	console.log('');
	if (candidates.length === 0) return 0;

	if (publish) {
		const path = await backupRows(
			supabase,
			'import',
			candidates.map((c) => c.hash)
		);
		console.log(`Sauvegarde : ${path}\n`);
	}

	const ctx = { supabase, reviewerId, now: new Date().toISOString(), dryRun: !publish };
	const counts = { imported: 0, planned: 0, refused: 0, skipped: 0 };
	for (const candidate of candidates) {
		const old = oldQuestions.get(candidate.globalIndex);
		if (!old) throw new Error(`ancienne question #${candidate.globalIndex} introuvable`);
		const expected = reviewed?.get(candidate.globalIndex);
		if (reviewed && !expected) {
			counts.refused++;
			console.log(`#${candidate.globalIndex} : ❌ écartée — le fichier relu ne l’approuve pas`);
			continue;
		}
		const outcome = await importReviewedQuestion(ctx, old, expected);
		counts[outcome.status]++;
		const mark = {
			imported: `✅ importée → ${outcome.templateId}`,
			planned: '… prévue',
			refused: '❌ écartée',
			skipped: '– ignorée'
		}[outcome.status];
		const why = outcome.reasons.length ? ` — ${outcome.reasons.join(', ')}` : '';
		console.log(`#${candidate.globalIndex} : ${mark}${why}`);
	}

	console.log(
		`\n${candidates.length} analysée(s) : ${counts.imported} importée(s), ${counts.planned} prévue(s), ` +
			`${counts.refused} écartée(s), ${counts.skipped} ignorée(s).`
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
