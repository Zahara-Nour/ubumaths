/**
 * Aperçu humain d'un lot : `docs/corrections/<lot>/APERCU.md`
 * ===========================================================
 *
 * Pour chaque modèle : titre, id, code, puis 3 tirages rendus (énoncé, réponse
 * attendue, étapes de correction avec leur LaTeX), lisibles sur GitHub.
 * Les couleurs `{{color:…}}` sont déjà résolues en `#RRGGBB` à la génération.
 */

import type { QuestionInstance, QuestionTemplate } from '../../../src/lib/questions/types';
import { generateInstance } from '../../../src/lib/questions/generator/instance-generator';
import { injectCorrection, type Proposal } from './proposal';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PREVIEW_SEEDS = [1, 2, 3];

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Énoncé lisible hors application : marqueurs retirés, case → `\square` */
export function readableStatement(statement: string): string {
	return statement
		.replace(/<<expr:[^>]*>>/g, '')
		.replace(/\\placeholder\[\d+\]\{[^}]*\}/g, '\\square')
		.replace(/\{\{blank:\d+\}\}/g, '…');
}

/** Réponse attendue : LaTeX de la case, ou texte du bon choix */
export function expectedAnswer(instance: QuestionInstance): string {
	if (instance.blanks && instance.blanks.length > 0) {
		return instance.blanks.map((b) => `$${b.expectedAnswerLatex ?? b.expectedAnswer}$`).join(' ; ');
	}
	const correct = (instance.choices ?? []).filter((c) => c.isCorrect).map((c) => String(c.content));
	return correct.length > 0 ? correct.join(' ; ') : '(inconnue)';
}

/** Une étape de correction en markdown GitHub : un bloc `$$` seul sur sa ligne */
function readableStep(step: string): string {
	return step.replace(/\s*\$\$([\s\S]+?)\$\$\s*/g, '\n\n$$$$\n$1\n$$$$\n\n').trim();
}

/** Tirage de la variation choisie par la graine (même règle que la génération) */
function renderInstance(template: QuestionTemplate, seed: number): string {
	const result = generateInstance(template, seed);
	if (!result.success) return `> ⚠️ graine ${seed} : ${result.errors.join(' ; ')}`;
	const instance = result.instance;
	const steps = (instance.correction?.steps ?? []).map((s) => readableStep(String(s)));
	return [
		`#### Tirage ${seed} (variation ${instance.selectedVariationIndex ?? 0})`,
		'',
		'**Énoncé**',
		'',
		readableStatement(String(instance.statement)),
		'',
		`**Réponse attendue** : ${expectedAnswer(instance)}`,
		'',
		'**Correction**',
		'',
		...steps.flatMap((step, i) => [`*Étape ${i + 1}*`, '', step, ''])
	].join('\n');
}

/** Section d'un modèle */
export function previewSection(template: QuestionTemplate, proposal: Proposal): string {
	const injected = injectCorrection(template, proposal);
	const notes = proposal.notes.map((note) => `- ${note}`).join('\n');
	return [
		`## ${proposal.code} — ${template.title}`,
		'',
		`\`${template.id}\` · ${template.grades.join(', ')} · niveau ${template.level} · ` +
			`${template.variations.length} variation(s) · correction ${proposal.source === 'generated' ? 'générée' : 'rédigée'}`,
		'',
		...(notes ? [notes, ''] : []),
		...PREVIEW_SEEDS.map((seed) => renderInstance(injected, seed)),
		'',
		'---',
		''
	].join('\n');
}

/** Le fichier APERCU.md complet */
export function buildPreview(
	lotName: string,
	description: string,
	items: { template: QuestionTemplate; proposal: Proposal }[]
): string {
	return [
		`# Aperçu des corrections — lot « ${lotName} »`,
		'',
		`> ${description}. Généré par \`pnpm corrections:preview ${lotName}\` : ne pas éditer à la main ` +
			`(éditer la proposition \`<id>.json\` ou le lot, puis régénérer). ` +
			`Couleurs : orange = ce que l'on transforme, bleu = étape intermédiaire, vert = conclusion ` +
			`(cf. docs/pratiques/corrections-redaction.md).`,
		'',
		...items.map(
			({ template, proposal }) =>
				`- ${proposal.code} — ${template.title} \`${template.id.slice(0, 8)}\``
		),
		'',
		...items.map(({ template, proposal }) => previewSection(template, proposal))
	].join('\n');
}
