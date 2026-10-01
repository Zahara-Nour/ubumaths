/**
 * Auditer le RENDU des tirages d'un modèle de question
 * ====================================================
 *
 * LECTURE SEULE — n'écrit jamais en base.
 *
 * Les specs de test (`question:specs`) ne regardent que la réponse : un énoncé qui affiche
 * `x^2-1x-2` ou un corrigé qui écrit `x+0` les laisse vertes. Ce script tire N instances par
 * variation et cherche, dans l'énoncé, les choix, la réponse attendue et le corrigé :
 *  - un coefficient 1 écrit (`1x`, `-1x`, `1(x+2)`) ;
 *  - deux signes collés (`+ -3`, `- -2`) ;
 *  - un terme nul (`+ 0`, `0x`) ;
 *  - un gabarit non résolu (`{{`, `<<`), `NaN`, `undefined` ;
 *  - un tableau ```variation qui ne se lit pas, ou qui casse la génération Typst.
 *
 * Usage :
 *   pnpm tsx scripts/audit-question-draws.ts --file <json> [--instances 200]
 *   pnpm tsx scripts/audit-question-draws.ts --dir <dossier> [--instances 200]
 *   pnpm tsx scripts/audit-question-draws.ts --template <uuid>   (relu en base)
 *
 * Code de sortie : 0 si aucun défaut, 1 sinon. Le rapport dit combien de tirages ont été lus.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QuestionTemplate } from '$lib/questions/types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { toQuestionTemplate } from '$lib/types/question-template';
import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';
import { parseMarkdown } from '$lib/ubumark/parser/markdown-parser';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { argValue, createScriptClient } from './relecture/common';

// ============================================================================
// TYPES
// ============================================================================

interface Defect {
	variationIndex: number;
	seed: number;
	kind: string;
	excerpt: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Motifs interdits hors des tableaux ```variation (où `-inf, -2` est légitime) */
const TEXT_DEFECTS: { kind: string; regex: RegExp }[] = [
	// `1x`, `-1x`, `+ 1 x`, `1(x`, `1\left(` — mais ni `11x`, ni `\frac{1}{x}`, ni `x_1x`
	{ kind: 'coefficient 1 écrit', regex: /(?<![\d.,{}_^\\])1\s*(?:[xyz](?![a-z])|\(|\\left\()/ },
	{ kind: 'signes collés', regex: /[+-]\s*[+-]\s*\d/ },
	// `+ 0` en fin de terme (pas `+ 0{,}5`, ni `+ 0.5`, ni `+ 05`)
	{ kind: 'terme nul', regex: /[+-]\s*0(?![\d.,{])/ },
	{ kind: 'coefficient nul', regex: /(?<![\d.,{])0\s*[xyz](?![a-z])/ },
	// `-8 0` : un `{{eval:s;+}}` qui vaut 0 n'écrit pas de signe
	{ kind: 'nombres juxtaposés', regex: /(?<![\^\d{.,])\d+\s+\d/ },
	{ kind: 'gabarit non résolu', regex: /\{\{(?!solution|color)|<<(?!expr:)/ },
	{ kind: 'valeur indéfinie', regex: /NaN|undefined|Infinity/ }
];

const VARIATION_BLOCK = /```variation\n([\s\S]*?)```/g;

// ============================================================================
// FONCTIONS
// ============================================================================

function templatesFromArgs(): Promise<{ name: string; template: QuestionTemplate }[]> {
	const file = argValue('--file');
	const dir = argValue('--dir');
	const id = argValue('--template');
	const fromFile = (path: string) => ({
		name: path,
		template: { id: 'audit', ...JSON.parse(readFileSync(path, 'utf8')) } as QuestionTemplate
	});
	if (file) return Promise.resolve([fromFile(file)]);
	if (dir) {
		return Promise.resolve(
			readdirSync(dir)
				.filter((f) => f.endsWith('.json'))
				.sort()
				.map((f) => fromFile(join(dir, f)))
		);
	}
	if (id) {
		const { supabase, target } = createScriptClient(false);
		console.log(`Base : ${target} (lecture seule)`);
		return Promise.resolve(
			supabase
				.from('question_templates')
				.select('*')
				.eq('id', id)
				.single()
				.then(({ data, error }) => {
					if (error || !data) throw new Error(`modèle ${id} : ${error?.message ?? 'introuvable'}`);
					return [{ name: id, template: toQuestionTemplate(data) }];
				})
		);
	}
	throw new Error('Préciser --file, --dir ou --template');
}

/** Valeur d'une abscisse de tableau : `-inf`, entier, décimal, `-\\dfrac{7}{4}` (NaN sinon) */
function numericValue(point: string): number {
	if (point === '-inf') return -Infinity;
	if (point === '+inf') return Infinity;
	const fraction = /^(-?)\\d?frac\{(\d+)\}\{(\d+)\}$/.exec(point);
	if (fraction) return (fraction[1] ? -1 : 1) * (Number(fraction[2]) / Number(fraction[3]));
	return Number(point);
}

/** Défauts d'un texte rendu (énoncé, choix, étape de corrigé) */
function textDefects(text: string): { kind: string; excerpt: string }[] {
	const found: { kind: string; excerpt: string }[] = [];
	// Ni les tableaux, ni les chemins d'images (`forme-canonique-0-600.png`)
	const withoutTables = text.replace(VARIATION_BLOCK, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '');
	for (const { kind, regex } of TEXT_DEFECTS) {
		const match = regex.exec(withoutTables);
		if (match) {
			const start = Math.max(0, match.index - 25);
			found.push({ kind, excerpt: withoutTables.slice(start, match.index + 25) });
		}
	}
	for (const block of text.matchAll(VARIATION_BLOCK)) {
		const lines = block[1].split('\n');
		const { errors } = parseVariationTableContent(lines);
		if (errors.length > 0) {
			found.push({ kind: 'tableau illisible', excerpt: errors.map((e) => e.message).join('; ') });
		}
		// Le parseur accepte une ligne dont l'abscisse n'est pas dans `domain` : elle disparaît
		const domain = lines
			.find((l) => l.trim().startsWith('domain:'))
			?.replace(/^\s*domain:\s*/, '')
			.split(',')
			.map((p) => p.trim().replace(/^[\][]|[\][]$/g, ''));
		// Abscisses strictement croissantes (deux racines égales = tableau faux)
		const values = (domain ?? []).map(numericValue);
		if (values.some((v, i) => i > 0 && !(v > values[i - 1]))) {
			found.push({ kind: 'domaine non croissant', excerpt: domain?.join(' ; ') ?? '' });
		}
		for (const line of lines.filter((l) => /^\s{2,}\S/.test(l))) {
			const key = line.slice(0, line.indexOf(':')).trim();
			const unknown = key.split(',').filter((p) => !domain?.includes(p.trim()));
			if (unknown.length > 0) {
				found.push({ kind: 'abscisse hors domaine', excerpt: `${key} ∉ {${domain?.join(' ; ')}}` });
			}
		}
	}
	if (VARIATION_BLOCK.test(text)) {
		VARIATION_BLOCK.lastIndex = 0;
		try {
			generateTypst(parseMarkdown(text));
		} catch (error) {
			found.push({
				kind: 'Typst en échec',
				excerpt: error instanceof Error ? error.message : String(error)
			});
		}
	}
	return found;
}

function auditTemplate(template: QuestionTemplate, instances: number) {
	const defects: Defect[] = [];
	let draws = 0;
	let tables = 0;
	template.variations.forEach((variation, variationIndex) => {
		const single: QuestionTemplate = { ...template, variations: [variation] };
		for (let seed = 1; seed <= instances; seed++) {
			const result = generateInstance(single, seed);
			if (!result.success) {
				defects.push({ variationIndex, seed, kind: 'tirage en échec', excerpt: result.errors[0] });
				continue;
			}
			draws++;
			const { instance } = result;
			const texts = [
				instance.statement,
				...(instance.choices ?? []).map((c) => c.content),
				...(instance.blanks ?? []).map((b) => b.expectedAnswer),
				...(instance.correction?.steps ?? [])
			].map((t) => String(t));
			for (const text of texts) {
				if (text.includes('```variation')) tables++;
				for (const d of textDefects(text)) defects.push({ variationIndex, seed, ...d });
			}
		}
	});
	return { defects, draws, tables };
}

async function main(): Promise<number> {
	const instances = Number(argValue('--instances') ?? 200);
	let failures = 0;
	for (const { name, template } of await templatesFromArgs()) {
		const { defects, draws, tables } = auditTemplate(template, instances);
		const verdict = defects.length === 0 ? '✅' : `❌ ${defects.length} défaut(s)`;
		console.log(
			`${name} — « ${template.title} » : ${draws} tirages lus (${template.variations.length} var.), ${tables} tableau(x) — ${verdict}`
		);
		const shown = new Set<string>();
		for (const d of defects) {
			const key = `${d.variationIndex}|${d.kind}`;
			if (shown.has(key)) continue;
			shown.add(key);
			const count = defects.filter((x) => `${x.variationIndex}|${x.kind}` === key).length;
			console.log(
				`   var. ${d.variationIndex}, graine ${d.seed} (${count}×) : ${d.kind} — « ${d.excerpt} »`
			);
		}
		if (defects.length > 0) failures++;
	}
	return failures === 0 ? 0 : 1;
}

main()
	.then((code) => process.exit(code))
	.catch((error: unknown) => {
		console.error(`⛔ ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	});
