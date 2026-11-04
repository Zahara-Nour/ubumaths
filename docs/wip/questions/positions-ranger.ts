// Positions affichées d'une variation « étapes à ranger » (graine 0, celle des specs) :
// réponses d'une spec « ordre juste ». Utilisé par lot-1spe-approfondissements-6.py.
//   pnpm exec tsx docs/wip/questions/positions-ranger.ts <modèle.json> <indice de variation>
import { readFileSync } from 'node:fs';
import { generateInstanceWithFixedVariables } from '../../../src/lib/questions/generator/test-instance-builder';
import type { QuestionTemplate } from '../../../src/lib/questions/types';

const [file, vi] = process.argv.slice(2);
const template = JSON.parse(readFileSync(file, 'utf8')) as QuestionTemplate;
const result = generateInstanceWithFixedVariables(template, {}, Number(vi));
if (!result.success) {
	console.error(result.errors);
	process.exit(1);
}
console.log(JSON.stringify(result.instance.blanks.map((b) => b.expectedAnswer)));
