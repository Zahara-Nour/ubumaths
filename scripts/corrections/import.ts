/**
 * Écrire les corrections d'un lot dans les modèles (prod)
 * =======================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 * À lancer seulement après le FEU VERT de David sur l'aperçu du lot.
 *
 * Usage :
 *   pnpm corrections:import pilote              (simulation : lit la prod, n'écrit rien)
 *   pnpm corrections:import pilote --publier    (écrit `variations[].correction`)
 *
 * Pour chaque modèle du lot, avant toute écriture :
 * - la ligne de prod doit être IDENTIQUE à l'instantané relu (`updated_at`) :
 *   un modèle modifié depuis est écarté (régénérer le lot) ;
 * - aucune variation ne doit déjà avoir une correction (pas d'écrasement) ;
 * - la proposition doit passer le vérificateur (50 tirages par variation).
 * Écriture : seule la colonne `variations` change, sous condition `updated_at`
 * inchangé ; la ligne rendue est relue (la RLS échoue en silence : 0 ligne).
 * Sauvegarde JSON des lignes visées avant écriture (dossier ignoré par git).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Json } from '../../src/lib/types/database';
import { toQuestionTemplate } from '../../src/lib/types/question-template';
import { createScriptClient, hasFlag } from '../relecture/common';
import { parseRows, readProposal, readSnapshotRows } from './lib/files';
import { injectCorrection } from './lib/proposal';
import { verifyProposal } from './lib/verify';
import { findLot } from './lots';

const BACKUP_DIR = 'data/migration-output/backups';

async function main(): Promise<number> {
	const lot = findLot(process.argv[2]);
	const publish = hasFlag('--publier');
	const { supabase, target } = createScriptClient(publish);
	console.log(`${publish ? 'ÉCRITURE' : 'SIMULATION'} — base : ${target}`);

	const snapshot = new Map(readSnapshotRows(lot.name).map((row) => [row.id, row]));
	const ids = lot.entries.map((entry) => entry.templateId);
	const { data, error } = await supabase.from('question_templates').select('*').in('id', ids);
	if (error) throw new Error(`lecture des modèles : ${error.message}`);
	const liveRows = parseRows(data, 'question_templates');

	const ready: { id: string; updatedAt: string | null; variations: Json }[] = [];
	for (const entry of lot.entries) {
		const live = liveRows.find((row) => row.id === entry.templateId);
		const frozen = snapshot.get(entry.templateId);
		const label = `${entry.code} ${entry.templateId.slice(0, 8)}`;
		if (!live || !frozen) {
			console.log(`  ✗ ${label} : absent de la prod ou de l'instantané`);
			continue;
		}
		if (live.updated_at !== frozen.updated_at) {
			console.log(`  ✗ ${label} : modifié en prod depuis l'instantané (régénérer le lot)`);
			continue;
		}
		const template = toQuestionTemplate(live);
		const proposal = readProposal(lot.name, entry.templateId);
		const report = verifyProposal(template, proposal);
		if (!report.passed) {
			console.log(`  ✗ ${label} : vérification rouge (pnpm corrections:check ${lot.name})`);
			continue;
		}
		const injected = injectCorrection(template, proposal);
		ready.push({
			id: live.id,
			updatedAt: live.updated_at,
			variations: injected.variations as unknown as Json
		});
		console.log(`  ✓ ${label} ${template.title} (${report.instances} tirages verts)`);
	}
	console.log(`\n${ready.length}/${lot.entries.length} modèle(s) prêt(s).`);
	if (!publish) {
		console.log('Simulation : rien n’a été écrit. Ajouter --publier après feu vert.');
		return ready.length === lot.entries.length ? 0 : 1;
	}

	mkdirSync(BACKUP_DIR, { recursive: true });
	const backup = join(
		BACKUP_DIR,
		`corrections-${lot.name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
	);
	writeFileSync(backup, JSON.stringify(liveRows, null, 2));
	console.log(`Sauvegarde : ${backup}`);

	for (const row of ready) {
		let query = supabase
			.from('question_templates')
			.update({ variations: row.variations })
			.eq('id', row.id);
		query =
			row.updatedAt === null ? query.is('updated_at', null) : query.eq('updated_at', row.updatedAt);
		const { data: written, error: writeError } = await query.select('id');
		if (writeError) throw new Error(`${row.id} : ${writeError.message}`);
		if (!written || written.length !== 1) {
			throw new Error(`${row.id} : ${written?.length ?? 0} ligne écrite (modifié entre-temps ?)`);
		}
		console.log(`  écrit ${row.id}`);
	}
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
