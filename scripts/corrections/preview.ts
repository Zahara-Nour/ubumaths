/**
 * Écrire l'aperçu humain d'un lot
 * ===============================
 *
 * Usage : pnpm corrections:preview pilote
 *
 * Écrit `docs/corrections/<lot>/APERCU.md` depuis l'instantané et les
 * propositions (aucune base).
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lotDir, readProposal, readSnapshot } from './lib/files';
import { buildPreview } from './lib/preview';
import { findLot } from './lots';

try {
	const lot = findLot(process.argv[2]);
	const templates = readSnapshot(lot.name);
	const items = lot.entries.map((entry) => {
		const template = templates.get(entry.templateId);
		if (!template) throw new Error(`${entry.templateId} absent de l'instantané`);
		return { template, proposal: readProposal(lot.name, entry.templateId) };
	});
	const path = join(lotDir(lot.name), 'APERCU.md');
	writeFileSync(path, buildPreview(lot.name, lot.description, items));
	console.log(`Aperçu : ${path} (${items.length} modèle(s))`);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
