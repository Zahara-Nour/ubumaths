/**
 * QCM → case choix (chantier figure-et-choix, lot 4, § 2.11 du journal)
 * =====================================================================
 *
 * Logique pure, partagée par la migration de la base (`scripts/migrer-qcm-en-cases.ts`)
 * et la réécriture des sources (`scripts/questions/**`) ; testée dans
 * `scripts/__tests__/qcm-en-cases.test.ts`.
 *
 * Conversion d'un modèle QCM (mêmes `id`, rien d'autre ne bouge) :
 * - chaque variation reçoit un bloc ```choix en fin d'énoncé (ses choix, sinon ceux
 *   de `shared`), `plusieurs: oui` si `multipleAnswers`, `melanger: non` si
 *   `options.shuffleChoices === false` ;
 * - sa bonne réponse devient la case : `blanks: [{ expectedAnswer }]`, indices de
 *   `correctChoiceIndex` joints par `;` (calculés gardés tels quels) ;
 * - `?` d'une formule de l'énoncé → `…` (« … » de David, 2026-10-26) : dans un QCM il
 *   n'était qu'un signe, dans une question à cases il serait une case. Le caractère
 *   U+2026, pas `\ldots` : la notation maison (`(-a)*?=b`) ne lit pas `\ldots` et la
 *   formule resterait brute ;
 * - variables `expression…` renommées `expr…` : dans une question à cases, une
 *   variable `expression…` porte une case (« = ? »), dans un QCM elle ne fait
 *   qu'afficher ; renommées partout où un `{{…}}`, une condition ou une spec les cite ;
 * - `test_specs` : `selectedChoices` → `answers` (« 0;2 »).
 *
 * La garde (`compareMigration`) vérifie ensuite, tirage par tirage, que l'élève
 * voit la même chose et que la même réponse est juste.
 */

import type { QuestionTemplate, QuestionVariation, TestSpec } from '$lib/questions/types';
import { getQuestionType } from '$lib/questions/types';
import { splitIntoSegments } from '$lib/questions/generator/assign-blank-indices';
import { serializeTemplateChoiceBlock } from '$lib/ubumark/parser/choix-parser';
import { formatChoiceAnswer, parseChoiceAnswer } from '$lib/questions/choice-case';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { findChoiceBlocks } from '$lib/ubumark/parser/choix-parser';
import { checkTemplate } from '$lib/migration/review/check-template';
import { resolveMarkdownContent } from '$lib/questions/generator/content-resolver';
import {
	declaredGenericFunctions,
	templateGenericFunctions
} from '$lib/questions/generic-functions';
import { templateMarkdown } from '$lib/ubumark/types/template';

// Types

export type ConversionResult =
	{ ok: true; template: QuestionTemplate; notes: string[] } | { ok: false; reason: string };

type Choices = NonNullable<QuestionVariation['choices']>;

export interface MigrationGap {
	variationIndex: number;
	seed: number;
	what: string;
}

export interface MigrationCheck {
	/** Tirages comparés (ancien et nouveau générés), toutes variations confondues */
	compared: number;
	gaps: MigrationGap[];
	/** Raisons de refus du contrôle d'import que l'ancien modèle n'avait pas */
	newReasons: string[];
}

// Constantes

/** Remplace le `?` d'une formule : « nombre manquant », comme les autres QCM */
const ELLIPSIS = '…';
/** Nom de variable qui porte une case dans une question à cases (cf. instance-generator) */
const EXPRESSION_NAME = /\bexpression(\w*)\b/g;

// Fonctions

/** `?` des formules (`$…$`, `$$…$$`) → `…` ; le texte hors formule est rendu tel quel */
export function mathQuestionMarksToEllipsis(statement: string): string {
	return splitIntoSegments(statement)
		.map((segment) =>
			segment.type === 'math'
				? `${segment.openDelim}${segment.content.replaceAll('?', ELLIPSIS)}${segment.closeDelim}`
				: segment.content
		)
		.join('');
}

/** Énoncé d'une instance sans ses blocs ```choix (fin d'espaces ignorée) */
function withoutChoiceBlocks(statement: string): string {
	const lines = statement.split('\n');
	const kept = new Set(lines.keys());
	for (const range of findChoiceBlocks(lines)) {
		for (let i = range.startIndex; i <= range.endIndex; i++) kept.delete(i);
	}
	return lines
		.filter((_, i) => kept.has(i))
		.join('\n')
		.trimEnd();
}

/** `expression…` → `expr…` dans les `{{…}}` d'un texte (le texte hors `{{…}}` est gardé) */
function renameInPlaceholders(text: string): string {
	return text.replace(/\{\{[^{}]*\}\}/g, (placeholder) =>
		placeholder.replace(EXPRESSION_NAME, 'expr$1')
	);
}

/**
 * Renomme les variables `expression…` d'un modèle (`expr…`) : déclarations, `{{…}}` de
 * tout texte, expressions des variables, conditions, variables des specs. Rendu tel
 * quel s'il n'en a pas ; refus si un nom `expr…` est déjà pris.
 */
export function renameExpressionVariables(
	template: QuestionTemplate
): { ok: true; template: QuestionTemplate; renamed: string[] } | { ok: false; reason: string } {
	const declared = [
		...(template.shared?.variables ?? []),
		...template.variations.flatMap((variation) => variation.variables ?? [])
	].map((variable) => variable.name);
	const renamed = [...new Set(declared.filter((name) => /^expression\w*$/.test(name)))];
	if (renamed.length === 0) return { ok: true, template, renamed };
	const taken = renamed
		.map((name) => name.replace(/^expression/, 'expr'))
		.filter((name) => declared.includes(name));
	if (taken.length > 0) return { ok: false, reason: `nom déjà pris : ${taken.join(', ')}` };

	const renameValue = (value: unknown, key?: string): unknown => {
		if (typeof value === 'string') {
			// Noms, expressions des variables et conditions : du code, renommé en entier
			if (key === 'name' || key === 'expression' || key === 'condition')
				return value.replace(EXPRESSION_NAME, 'expr$1');
			return renameInPlaceholders(value);
		}
		if (Array.isArray(value)) {
			return value.map((item) =>
				key === 'conditions' && typeof item === 'string'
					? item.replace(EXPRESSION_NAME, 'expr$1')
					: renameValue(item)
			);
		}
		if (value && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value).map(([k, v]) => [
					key === 'variables' && !Array.isArray(value) ? k.replace(EXPRESSION_NAME, 'expr$1') : k,
					renameValue(v, k)
				])
			);
		}
		return value;
	};
	const { variations, shared, testSpecs } = template;
	return {
		ok: true,
		renamed,
		template: {
			...template,
			variations: renameValue(variations) as QuestionVariation[],
			...(shared && { shared: renameValue(shared) as QuestionTemplate['shared'] }),
			...(testSpecs && { testSpecs: renameValue(testSpecs) as TestSpec[] })
		}
	};
}

/** Bonne réponse du QCM → réponse attendue de la case (« 1 », « 0;{{f1}} ») */
function expectedAnswerOf(correctChoiceIndex: string | string[]): string {
	const indexes = Array.isArray(correctChoiceIndex) ? correctChoiceIndex : [correctChoiceIndex];
	return indexes.map((index) => index.trim()).join(';');
}

/** Spec QCM → spec de case choix ; une spec qui a déjà `answers` est gardée */
function convertSpec(spec: TestSpec): TestSpec {
	if (spec.selectedChoices === undefined) return spec;
	const { selectedChoices, ...rest } = spec;
	return { ...rest, answers: [formatChoiceAnswer(selectedChoices)] };
}

/** Retire des clés d'un objet ; `undefined` s'il ne reste rien */
function without<T extends object>(value: T | undefined, keys: string[]): T | undefined {
	if (!value) return value;
	const copy: Record<string, unknown> = { ...value };
	for (const key of keys) delete copy[key];
	return Object.keys(copy).length > 0 ? (copy as T) : undefined;
}

/**
 * Convertit un modèle QCM en question à case choix. Refus (rien de converti) :
 * pas un QCM, variation sans choix, sans bonne réponse, sans énoncé, ou qui a
 * déjà des cases.
 */
export function convertQcmTemplate(original: QuestionTemplate): ConversionResult {
	const type = getQuestionType({
		choices: original.variations?.[0]?.choices,
		shared: original.shared,
		options: original.options
	});
	if (type !== 'multiple_choice') return { ok: false, reason: `pas un QCM (${type})` };

	const renaming = renameExpressionVariables(original);
	if (!renaming.ok) return { ok: false, reason: renaming.reason };
	const template = renaming.template;
	const shared = template.shared;
	const multiple = template.multipleAnswers === true;
	const shuffle = template.options?.shuffleChoices !== false;
	const notes: string[] =
		renaming.renamed.length > 0 ? [`variables renommées : ${renaming.renamed.join(', ')}`] : [];
	const variations: QuestionVariation[] = [];

	for (const [index, variation] of template.variations.entries()) {
		const label = `variation ${index + 1}`;
		const choices: Choices | undefined = variation.choices ?? shared?.choices;
		const correct = variation.correctChoiceIndex ?? shared?.correctChoiceIndex;
		// Comme le générateur : un énoncé vide passe la main à celui de `shared`
		const statement = variation.statement || shared?.statement;
		if (!choices || choices.length === 0) return { ok: false, reason: `${label} : aucun choix` };
		if (correct === undefined || (Array.isArray(correct) && correct.length === 0)) {
			return { ok: false, reason: `${label} : aucune bonne réponse` };
		}
		if (!statement) return { ok: false, reason: `${label} : aucun énoncé` };
		if (variation.blanks && variation.blanks.length > 0) {
			return { ok: false, reason: `${label} : a déjà des cases` };
		}
		if (choices.some((choice) => choice.isCorrect !== undefined)) {
			return { ok: false, reason: `${label} : bonne réponse portée par isCorrect` };
		}

		const withoutMarks = mathQuestionMarksToEllipsis(statement);
		if (withoutMarks !== statement) notes.push(`${label} : « ? » de formule → « … »`);
		const block = serializeTemplateChoiceBlock({
			multiple,
			shuffle,
			choices: choices.map((choice) => choice.content)
		});
		const { choices: _choices, correctChoiceIndex: _correct, ...rest } = variation;
		variations.push({
			...rest,
			statement: `${withoutMarks.trimEnd()}\n\n${block}`,
			blanks: [{ expectedAnswer: expectedAnswerOf(correct) }]
		});
	}

	const {
		multipleAnswers: _multiple,
		shared: _shared,
		options: _options,
		testSpecs,
		...rest
	} = template;
	const converted: QuestionTemplate = { ...rest, variations };
	const nextShared = without(shared, ['choices', 'correctChoiceIndex', 'statement']);
	if (nextShared) converted.shared = nextShared;
	const nextOptions = without(template.options, ['shuffleChoices']);
	if (nextOptions) converted.options = nextOptions;
	if (testSpecs) converted.testSpecs = testSpecs.map(convertSpec);
	return { ok: true, template: converted, notes };
}

/** Écart entre deux valeurs comparées en JSON, ou `null` */
function differs(what: string, before: unknown, after: unknown): string | null {
	const a = JSON.stringify(before);
	const b = JSON.stringify(after);
	return a === b ? null : `${what} : ${a} → ${b}`;
}

/**
 * Garde de la migration : pour chaque variation et chaque graine, l'ancien modèle et
 * le nouveau tirent les mêmes variables, le même énoncé (bloc choix mis à part, `?` de
 * formule → « … »), les mêmes choix, dans le même ordre (mélangés ou non), la même bonne réponse
 * et la même correction ;
 * le nouveau n'a qu'une case, la case choix. Le contrôle d'import (specs comprises)
 * ne trouve rien que l'ancien n'avait déjà.
 */
export function compareMigration(
	before: QuestionTemplate,
	after: QuestionTemplate,
	seeds: number
): MigrationCheck {
	const gaps: MigrationGap[] = [];
	let compared = 0;
	before.variations.forEach((variation, variationIndex) => {
		const oldSingle: QuestionTemplate = { ...before, variations: [variation] };
		const newSingle: QuestionTemplate = {
			...after,
			variations: [after.variations[variationIndex]]
		};
		// Bonne réponse calculée : une branche rare peut rendre un indice que la case refuse
		// (le QCM le lisait par `parseInt`) → dix fois plus de tirages
		const computed = JSON.stringify(
			variation.correctChoiceIndex ?? before.shared?.correctChoiceIndex ?? ''
		).includes('{{');
		const draws = computed ? seeds * 10 : seeds;
		// Mélange : la graine ne le reproduit pas (tiré à un autre rang), seul compte « fixe
		// ou mélangé ». Fixe : l'ordre de l'auteur à chaque tirage ; mélangé : il bouge au moins une fois.
		const fixed = before.options?.shuffleChoices === false;
		let moved = false;
		for (let seed = 1; seed <= draws; seed++) {
			const gap = (what: string) => gaps.push({ variationIndex, seed, what });
			const oldResult = generateInstance(oldSingle, seed);
			const newResult = generateInstance(newSingle, seed);
			if (!oldResult.success) {
				if (newResult.success) gap('l’ancien échoue, le nouveau génère');
				continue;
			}
			if (!newResult.success) {
				gap(`le nouveau échoue : ${newResult.errors.join(' ; ')}`);
				continue;
			}
			compared++;
			const old = oldResult.instance;
			const next = newResult.instance;
			const blanks = next.blanks ?? [];
			const blank = blanks[0];
			if (blanks.length !== 1 || !blank?.choice) {
				gap(`${blanks.length} case(s), il en faut une seule, la case choix`);
				continue;
			}
			// Un choix du QCM sans `{{…}}` n'était pas résolu ; dans le bloc, il l'est avec
			// l'énoncé (formule normalisée : `(u_n)` → `\left( u_n \right)`, `e` → `\exponentialE`).
			// Admis s'il vaut l'ancien choix passé par la même résolution.
			const resolveLikeStatement = (content: string) =>
				String(
					resolveMarkdownContent(
						templateMarkdown(content),
						next.resolvedVariables ?? [],
						() => 0,
						templateGenericFunctions(declaredGenericFunctions(before.shared?.genericFunctions)),
						before.shared?.cleanCoefficients === true,
						next.capitalPairs
					)
				);
			const oldChoices = (old.choices ?? []).map((choice, index) => {
				const content = String(choice.content);
				const resolved = blank.choice.choices[index];
				return resolved !== content && resolved === resolveLikeStatement(content)
					? resolved
					: content;
			});
			const oldCorrect = (old.choices ?? []).flatMap((choice, index) =>
				choice.isCorrect ? [index] : []
			);
			const newCorrect = parseChoiceAnswer(blank.expectedAnswer, blank.choice.choices.length);
			for (const found of [
				differs(
					'variables',
					(old.resolvedVariables ?? []).map((variable) => ({
						...variable,
						name: variable.name.replace(/^expression/, 'expr')
					})),
					next.resolvedVariables
				),
				differs(
					'énoncé',
					// Marque `<<expr:…>>` : retirée par le parseur à l'affichage d'un QCM
					mathQuestionMarksToEllipsis(String(old.statement).replace(/<<expr:\w+>>/g, '')).trimEnd(),
					withoutChoiceBlocks(String(next.statement))
				),
				differs('choix', oldChoices, blank.choice.choices),
				differs('bonne réponse', oldCorrect, newCorrect),
				differs('plusieurs', old.multipleAnswers === true, blank.choice.multiple),
				differs('correction', old.correction, next.correction)
			]) {
				if (found) gap(found);
			}
			const identity = blank.choice.order.every((original, position) => original === position);
			if (fixed && !identity) gap(`mélange : ordre de l’auteur attendu, ${blank.choice.order}`);
			moved ||= !identity;
		}
		if (!fixed && compared > 0 && !moved) {
			gaps.push({ variationIndex, seed: draws, what: 'mélange : choix jamais mélangés' });
		}
	});

	const oldReasons = new Set(checkTemplate(before).reasons);
	const newReasons = checkTemplate(after).reasons.filter((reason) => !oldReasons.has(reason));
	return { compared, gaps, newReasons };
}
