/**
 * Migration des QCM en cases choix (chantier figure-et-choix, lot 4, § 2.11 du journal)
 * =====================================================================================
 *
 * Usage :
 *   pnpm tsx scripts/migrer-qcm-en-cases.ts                # ESSAI : lit la base, n'écrit rien
 *   pnpm tsx scripts/migrer-qcm-en-cases.ts --ecrire       # écrit (après le deploy:prod des lots 1-3)
 *   pnpm tsx scripts/migrer-qcm-en-cases.ts --fichiers     # réécrit les sources scripts/questions/**
 *
 * Base visée : celle du `.env` (la prod). L'écriture, lancée par David avec `!`, ne
 * touche que les modèles dont la garde ne trouve AUCUN écart (`compareMigration`) ;
 * chaque mise à jour vise la ligne lue (même `id`, même `updated_at`, encore QCM) et
 * vérifie la ligne rendue (la RLS échoue en silence). Copie de sauvegarde des lignes
 * lues et rapport dans `data/migration-output/qcm-en-cases/` (ignoré par git).
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QuestionTemplate } from '$lib/questions/types';
import { toQuestionTemplate } from '$lib/types/question-template';
import { toJson } from '$lib/types/database-helpers';
import { createScriptClient, hasFlag } from './relecture/common';
import { compareMigration, convertQcmTemplate, type MigrationCheck } from './lib/qcm-en-cases';

// Types

interface Verdict {
	id: string;
	title: string;
	status?: string;
	migrable: boolean;
	reason?: string;
	notes: string[];
	check?: MigrationCheck;
}

// Constantes

const OUTPUT_DIR = 'data/migration-output/qcm-en-cases';
const QUESTIONS_DIR = 'scripts/questions';
const SEEDS = 50;
/** Écarts montrés par modèle dans la sortie (tous dans le rapport) */
const SHOWN_GAPS = 3;

// Fonctions

/** Conversion et garde d'un modèle : le verdict, et le modèle converti s'il est migrable */
function judge(
	id: string,
	template: QuestionTemplate
): { verdict: Verdict; converted?: QuestionTemplate } {
	const base = { id, title: template.title, status: template.status, notes: [] as string[] };
	const conversion = convertQcmTemplate(template);
	if (!conversion.ok) return { verdict: { ...base, migrable: false, reason: conversion.reason } };
	const check = compareMigration(template, conversion.template, SEEDS);
	const migrable = check.gaps.length === 0 && check.newReasons.length === 0 && check.compared > 0;
	return {
		verdict: {
			...base,
			migrable,
			notes: conversion.notes,
			check,
			...(!migrable && {
				reason:
					check.compared === 0
						? 'aucun tirage comparé'
						: `${check.gaps.length} écart(s), ${check.newReasons.length} refus nouveau(x)`
			})
		},
		converted: migrable ? conversion.template : undefined
	};
}

function printVerdicts(verdicts: Verdict[]): void {
	for (const verdict of verdicts.filter((v) => !v.migrable)) {
		console.log(
			`  ✗ ${verdict.title} (${verdict.status ?? '?'}, ${verdict.id}) : ${verdict.reason}`
		);
		for (const gap of verdict.check?.gaps.slice(0, SHOWN_GAPS) ?? []) {
			console.log(
				`      v${gap.variationIndex + 1} graine ${gap.seed} : ${gap.what.slice(0, 300)}`
			);
		}
		for (const reason of verdict.check?.newReasons ?? []) console.log(`      refus : ${reason}`);
	}
	const migrables = verdicts.filter((v) => v.migrable);
	const compared = verdicts.reduce((sum, v) => sum + (v.check?.compared ?? 0), 0);
	console.log(
		`\n${migrables.length} / ${verdicts.length} migrables ; ${compared} tirages comparés (${SEEDS} graines par variation, dix fois plus si la bonne réponse est calculée)`
	);
	for (const verdict of migrables.filter((v) => v.notes.length > 0)) {
		console.log(`  ℹ ${verdict.title} : ${verdict.notes.join(' ; ')}`);
	}
}

function writeOutput(name: string, value: unknown): string {
	mkdirSync(OUTPUT_DIR, { recursive: true });
	const path = join(OUTPUT_DIR, `${new Date().toISOString().replaceAll(':', '-')}-${name}.json`);
	writeFileSync(path, JSON.stringify(value, null, '\t'));
	return path;
}

/** Fichiers .json sous un dossier, récursivement, triés */
function jsonFiles(dir: string): string[] {
	return readdirSync(dir)
		.sort()
		.flatMap((name) => {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) return jsonFiles(path);
			return name.endsWith('.json') ? [path] : [];
		});
}

/** Sources : un modèle QCM converti en place (tabulations, comme les fichiers) */
function migrateFiles(): number {
	const verdicts: Verdict[] = [];
	let written = 0;
	for (const file of jsonFiles(QUESTIONS_DIR)) {
		const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
		const template = { ...raw, id: file } as unknown as QuestionTemplate;
		const conversion = convertQcmTemplate(template);
		if (!conversion.ok && conversion.reason.startsWith('pas un QCM')) continue;
		const { verdict, converted } = judge(file, template);
		verdicts.push(verdict);
		if (!converted) continue;
		const { id: _id, ...content } = converted;
		writeFileSync(file, `${JSON.stringify(content, null, '\t')}\n`);
		written++;
	}
	printVerdicts(verdicts);
	console.log(`\n${written} fichier(s) réécrit(s)`);
	return verdicts.every((v) => v.migrable) ? 0 : 1;
}

async function migrateDatabase(write: boolean): Promise<number> {
	const { supabase, target } = createScriptClient(write);
	console.log(`${write ? '✍️  ÉCRITURE' : '🔍 ESSAI'} — base ${target}\n`);

	const { data: rows, error } = await supabase
		.from('question_templates')
		.select('*')
		.eq('type', 'multiple_choice')
		.order('title');
	if (error) throw new Error(`lecture des QCM : ${error.message}`);
	console.log(`${rows.length} QCM lus`);
	console.log(`sauvegarde : ${writeOutput('sauvegarde', rows)}\n`);

	const judged = rows.map((row) => ({ row, ...judge(row.id, toQuestionTemplate(row)) }));
	const verdicts = judged.map((entry) => entry.verdict);
	printVerdicts(verdicts);
	console.log(`rapport : ${writeOutput('rapport', verdicts)}`);
	if (!write) {
		console.log('\nESSAI : rien n’a été écrit (--ecrire pour écrire les modèles migrables)');
		return 0;
	}

	let updated = 0;
	let missed = 0;
	for (const { row, converted } of judged) {
		if (!converted) continue;
		const { data, error: updateError } = await supabase
			.from('question_templates')
			.update({
				type: 'fill_in_blanks',
				variations: toJson(converted.variations),
				shared: toJson(converted.shared ?? null),
				options: toJson(converted.options ?? null),
				multiple_answers: null,
				test_specs: toJson(converted.testSpecs ?? null)
			})
			.eq('id', row.id)
			.eq('type', 'multiple_choice')
			.eq('updated_at', row.updated_at)
			.select('id');
		if (updateError) {
			console.error(`⛔ ${row.title} (${row.id}) : ${updateError.message}`);
			missed++;
			continue;
		}
		if (!data || data.length !== 1) {
			console.error(`⛔ ${row.title} (${row.id}) : ligne non mise à jour (modifiée entre-temps ?)`);
			missed++;
			continue;
		}
		updated++;
	}
	const skipped = judged.length - judged.filter((entry) => entry.converted).length;
	console.log(
		`\n${missed + skipped === 0 ? '✅' : '⚠️ '} ${updated} modèle(s) migré(s), ${missed} non écrit(s), ${skipped} refusé(s) par la garde`
	);
	// Relancer est sûr : seules les lignes encore QCM sont visées
	if (missed + skipped > 0) console.log('Relancer le script reprend les lignes encore QCM.');
	return missed + skipped === 0 ? 0 : 1;
}

async function main(): Promise<number> {
	if (hasFlag('--fichiers')) return migrateFiles();
	return migrateDatabase(hasFlag('--ecrire'));
}

main().then(
	(code) => process.exit(code),
	(err: unknown) => {
		console.error(err);
		process.exit(1);
	}
);
