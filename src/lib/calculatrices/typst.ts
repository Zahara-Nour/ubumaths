/**
 * Guides calculatrices : la fiche PDF, en Typst, depuis le même guide que la page
 * (phase 0, point 6). Les rappels y sont dépliés : une fiche imprimée ne se replie pas.
 */

import { escapeTypstBrackets } from '$lib/ubumark/generators';
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

/** Texte de l'élève dans un bloc `[...]` : rien ne doit y devenir du code Typst */
function escapeText(text: string): string {
	// `//` ouvre un commentaire en Typst (division entière de Python)
	return escapeTypstBrackets(text).replace(/\//g, '\\/');
}

function renderStep(step: string, keys: Readonly<Record<string, string>>): string {
	return parseStep(step, keys)
		.map((segment) =>
			segment.kind === 'key' ? `#calc-key[${escapeText(segment.label)}]` : escapeText(segment.text)
		)
		.join('');
}

function renderEntry(entry: GuideEntry, model: GuideTypstModel): string {
	const { task, sequence } = entry;
	const lines: string[] = [`#task-card[`, `*${escapeText(task.title)}*`];
	if (sequence.app) lines.push(` — application ${escapeText(sequence.app)}`);
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
			`Pas de fonction dédiée sur la ${escapeText(model.name)} : voici comment faire autrement.`,
			''
		);
	}
	if (sequence.sinceVersion) {
		lines.push(
			`#emph[À partir de la version ${escapeText(sequence.sinceVersion)} du système.]`,
			''
		);
	}
	for (const step of sequence.steps) lines.push(`+ ${renderStep(step, model.keys)}`);
	if (sequence.note) lines.push('', `#text(fill: luma(90))[${escapeText(sequence.note)}]`);
	lines.push(']');
	return lines.join('\n');
}

export function generateGuideTypst({ guide, model, gradeLabel }: GuideTypstInput): string {
	const parts: string[] = [
		PREAMBLE,
		`= Guide ${escapeText(model.name)} — ${escapeText(gradeLabel)}`,
		''
	];
	if (model.systemVersion) {
		parts.push(
			`#text(fill: luma(90))[Système décrit : version ${escapeText(model.systemVersion)}.]`,
			''
		);
	}
	if (guide.own.length > 0) {
		parts.push(`== Nouveau en ${escapeText(gradeLabel)}`, '');
		for (const entry of guide.own) parts.push(renderEntry(entry, model), '');
	}
	for (const recall of guide.recalls) {
		parts.push(`== Rappels : ${escapeText(GRADE_LABELS[recall.grade])}`, '');
		for (const entry of recall.entries) parts.push(renderEntry(entry, model), '');
	}
	if (guide.pitfalls.length > 0) {
		parts.push('== Les pièges', '');
		for (const pitfall of guide.pitfalls) {
			parts.push(
				`#task-card[*${escapeText(pitfall.title)}*`,
				'',
				`${escapeText(pitfall.explanation)}]`,
				''
			);
		}
	}
	return parts.join('\n');
}
