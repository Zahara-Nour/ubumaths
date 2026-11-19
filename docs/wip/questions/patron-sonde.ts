// Sonde du lot 8f du CM1 (`lot-cm1-8f.py`) : erreurs, réponse attendue et jugement d’un bloc patron à geste.
// Entrée (stdin) : [{ src, essais?: string[] }] ; sortie : [{ src, errors? , answer?, juges? }]
import { parseEspaceContent } from '../../../src/lib/ubumark/parser/espace-parser.ts';
import {
	expectedPatronAnswer,
	isPatronAnswerCorrect
} from '../../../src/lib/ubumark/utils/patron-gestes.ts';
import { readFileSync } from 'node:fs';
const items: { src: string; essais?: string[] }[] = JSON.parse(readFileSync(0, 'utf8'));
const out = items.map(({ src, essais }) => {
	const node = parseEspaceContent(src, 'patron');
	if (node.errors.length > 0) return { src, errors: node.errors };
	if (node.spec?.kind !== 'patron' || node.spec.task === undefined)
		return { src, errors: ['pas de geste'] };
	const answer = expectedPatronAnswer(node.spec);
	return { src, answer, juges: (essais ?? []).map((x) => isPatronAnswerCorrect(x, answer)) };
});
console.log(JSON.stringify(out));
