/**
 * Aperçu de tirages des fichiers de modèles d'un lot (forme « fichier », celle de
 * `create-questions`) — LECTURE SEULE. Chaque variation tirée N fois.
 *
 *   pnpm tsx docs/wip/questions-2de/apercu-fichiers.ts <dossier> [N]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { generateInstance } from '../../../src/lib/questions/generator/instance-generator';
import { readTemplateFile } from '../../../scripts/lib/template-file';
import type { QuestionTemplate } from '../../../src/lib/questions/types';

const [dossier, nombre] = process.argv.slice(2);
const n = Number(nombre ?? 2);
for (const nom of readdirSync(dossier)
	.filter((f) => f.endsWith('.json'))
	.sort()) {
	const extrait = readTemplateFile(JSON.parse(readFileSync(`${dossier}/${nom}`, 'utf8')), nom);
	if (!extrait.ok) {
		console.log(`⛔ ${nom} : ${extrait.error}`);
		continue;
	}
	const modele = extrait.template as unknown as QuestionTemplate;
	console.log(`\n=== ${nom}`);
	modele.variations.forEach((_, vi) => {
		const seul = { ...modele, variations: [modele.variations[vi]] } as QuestionTemplate;
		for (let k = 0; k < n; k++) {
			const r = generateInstance(seul, 1000 * vi + k + 7);
			if (!r.success) {
				console.log(`  ❌ v${vi} : ${r.errors.join('; ')}`);
				continue;
			}
			const { instance } = r;
			console.log(`--- v${vi}.${k}`);
			console.log(`É : ${instance.statement.replace(/```courbe[\s\S]*?```/g, '[courbe]')}`);
			console.log(`R : ${(instance.blanks ?? []).map((b) => b.expectedAnswer).join(' | ')}`);
			for (const s of instance.correction?.steps ?? [])
				console.log(`C : ${s.replace(/```courbe[\s\S]*?```/g, '[courbe]')}`);
		}
	});
}
