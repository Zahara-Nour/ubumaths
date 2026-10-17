/**
 * Guides calculatrices : la fiche PDF, en Typst, depuis le même guide que la page
 * (phase 0, point 6). Les rappels y sont dépliés : une fiche imprimée ne se replie pas.
 */

import { GRADE_LABELS } from './levels';
import { parseStep, type Guide, type GuideEntry } from './guide';
import type { CalculatorModel } from './types';

// ===== Types =====

/** Ce que la fiche lit du modèle (la page ne reçoit pas les séquences brutes) */
export type GuideTypstModel = Pick<CalculatorModel, 'name' | 'keys' | 'systemVersion'>;

export interface GuideTypstInput {
	guide: Guide;
	model: GuideTypstModel;
	gradeLabel: string;
}

// ===== Constantes =====

const PREAMBLE = `#set page(paper: "a4", margin: (x: 1.6cm, y: 1.5cm))
#set text(lang: "fr", size: 10pt)
#set par(justify: false)
#let calc-key(label) = box(
  stroke: 0.6pt + luma(120), radius: 2pt, fill: luma(240),
  inset: (x: 3pt, y: 1.5pt), baseline: 1.5pt,
  text(weight: "semibold", size: 9pt, label)
)
#let task-card(body) = block(
  width: 100%, breakable: false, stroke: 0.5pt + luma(200), radius: 4pt,
  inset: 8pt, below: 8pt, body
)
`;

// ===== Fonctions =====

/**
 * Un texte du guide, en chaîne Typst `#"…"` : affiché tel quel, sans aucun balisage.
 * Revue du 2026-10-12 : échapper caractère par caractère laissait passer `~`, les
 * guillemets droits (rendus typographiques, gênant pour du Python à recopier), `--`, et
 * un `- `, `= ` ou `1. ` en tête de note, qui devenaient liste ou titre.
 */
function typstString(value: string): string {
	const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
	return `#"${escaped}"`;
}

function renderStep(step: string, keys: Readonly<Record<string, string>>): string {
	return parseStep(step, keys)
		.map((segment) =>
			segment.kind === 'key'
				? `#calc-key(${typstString(segment.label).slice(1)})`
				: typstString(segment.text)
		)
		.join('');
}

function renderEntry(entry: GuideEntry, model: GuideTypstModel): string {
	const { task, sequence } = entry;
	const lines: string[] = [`#task-card[`, `#strong(${typstString(task.title).slice(1)})`];
	if (sequence.app) lines.push(` — application ${typstString(sequence.app)}`);
	if (!sequence.verifiedOnDevice) lines.push(` #text(fill: red)[(non relu sur la machine)]`);
	lines.push('');
	if (task.status === 'verifier') {
		lines.push(
			'#text(fill: rgb("#0b5a8a"))[Pour contrôler ton résultat, pas pour le remplacer.]',
			''
		);
	}
	if (sequence.noDedicatedFunction) {
		lines.push(
			`Pas de fonction dédiée sur la ${typstString(model.name)} : voici comment faire autrement.`,
			''
		);
	}
	if (sequence.sinceVersion) {
		lines.push(
			`#emph[${typstString(`À partir de la version ${sequence.sinceVersion} du système.`)}]`,
			''
		);
	}
	for (const step of sequence.steps) lines.push(`+ ${renderStep(step, model.keys)}`);
	if (sequence.note) lines.push('', `#text(fill: luma(90))[${typstString(sequence.note)}]`);
	lines.push(']');
	return lines.join('\n');
}

export function generateGuideTypst({ guide, model, gradeLabel }: GuideTypstInput): string {
	const parts: string[] = [
		PREAMBLE,
		`= Guide ${typstString(model.name)} — ${typstString(gradeLabel)}`,
		''
	];
	if (model.systemVersion) {
		parts.push(
			`#text(fill: luma(90))[${typstString(`Système décrit : version ${model.systemVersion}.`)}]`,
			''
		);
	}
	if (guide.own.length > 0) {
		parts.push(`== Nouveau en ${typstString(gradeLabel)}`, '');
		for (const entry of guide.own) parts.push(renderEntry(entry, model), '');
	}
	for (const recall of guide.recalls) {
		parts.push(`== Rappels : ${typstString(GRADE_LABELS[recall.grade])}`, '');
		for (const entry of recall.entries) parts.push(renderEntry(entry, model), '');
	}
	if (guide.pitfalls.length > 0) {
		parts.push('== Les pièges', '');
		for (const pitfall of guide.pitfalls) {
			parts.push(
				`#task-card[#strong(${typstString(pitfall.title).slice(1)})`,
				'',
				`${typstString(pitfall.explanation)}]`,
				''
			);
		}
	}
	return parts.join('\n');
}
