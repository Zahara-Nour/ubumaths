/**
 * Vérification d'un template avant import
 * =======================================
 *
 * Un template n'est importable que si TOUT passe :
 * - `validateTemplate` (structure) et le schéma Zod strict (clés mal orthographiées) ;
 * - au moins une spec de test, et toutes vertes (même validateur que l'élève) ;
 *   sauf carte de cours : aucune spec, mais recto et verso non vides à chaque tirage ;
 * - chaque variation génère une instance sur `instances` tirages (0 échec) ;
 * - E1 (Q37, chantier simplify-carte) : quand une case exige une forme de l'élève
 *   (`requiredForm`), la réponse de la correction automatique d'une dérivée ou d'une
 *   primitive passe ce juge à chaque tirage, qu'elle demande une forme (`finalForm`) ou non ;
 * - case « figure » (bloc ```figure-a-completer) : à chaque tirage, la figure se
 *   construit et porte les points de `verifier:` (sinon toute réponse de l'élève
 *   serait jugée fausse : `eval:` qui rend une fraction LaTeX, CP-058).
 *
 * Les avertissements (`warnings`) ne changent jamais le verdict : variable qui peut
 * être négative citée sans parenthèses (`x-{{a}}` → `x--3`), cf. negative-substitution.ts ;
 * écriture des nombres (2026-11-26) : euros au-delà du centime, `;dN` sur une valeur qui a
 * plus de N décimales (dits par les `{{eval}}` pendant les tirages, `collectEvalWarnings`),
 * réponse attendue arrondie (`;aN`, `;pN`) dans une case sans `precision`.
 *
 * « 0 problème » n'est une preuve que si on sait combien d'éléments ont été
 * analysés : le rapport compte les specs et les tirages.
 */

import type { QuestionTemplate } from '#lib/questions/types.ts';
import { validateTemplate } from '#lib/questions/validators/template-validator.ts';
import { questionTemplateSchema } from '#lib/questions/template-schema.ts';
import { runAllTestSpecs, type TestSpecResult } from '#lib/questions/test-spec-runner.ts';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { collectEvalWarnings } from '#lib/mathAST/eval/eval-warnings.ts';
import { parseEvalExpressionWithModifiers } from '#lib/ubumark/index.ts';
import { calculusFinalAnswerLatex } from '#lib/questions/generator/correction-generator.ts';
import { requiredFormVerdict } from '#lib/questions/required-form-validator.ts';
import { readingOf } from '#lib/questions/formula-reading.ts';
import type { QuestionInstance } from '#lib/questions/types.ts';
import { isBlankValueCorrect, validateAnswerDetailed } from '#lib/utils/answer-validator.ts';
import { expectedErrorOf } from '#lib/questions/expected-errors.ts';
import {
	findUnparenthesizedNegatives,
	type VariableDraw
} from '#lib/questions/validators/negative-substitution.ts';
import {
	constructionExpected,
	constructionPositions,
	constructionShapes
} from '#lib/questions/construction/positions.ts';
import {
	assertConstructionChecks,
	ConstructionAuthorError
} from '#lib/questions/construction/judge.ts';
// Inscrit le calcul des positions (geometry-core) dont la garde des figures a besoin
import '#lib/questions/construction/positions-setup.ts';
import {
	courseCardFront,
	hasCourseCardBackContent,
	isCourseCard
} from '#lib/questions/course-card.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationFailure {
	variationIndex: number;
	seed: number;
	errors: string[];
}

export interface TemplateCheckReport {
	templateErrors: string[];
	schemaErrors: string[];
	specs: TestSpecResult[];
	generation: {
		/** Tirages tentés, toutes variations confondues */
		attempts: number;
		failures: GenerationFailure[];
	};
	/** E1 (Q37) : la réponse de la correction jugée par la forme exigée de l'élève */
	correctionForm: {
		/** Tirages vérifiés (correction automatique de dérivée ou de primitive ET forme exigée) */
		checked: number;
		failures: GenerationFailure[];
	};
	/** Cases « figure » : la figure de chaque tirage se construit, avec les points de `verifier:` */
	figures: {
		/** Tirages qui portent au moins une case « figure » */
		checked: number;
		failures: GenerationFailure[];
	};
	passed: boolean;
	/** Raisons de l'échec, en français (vide si `passed`) */
	reasons: string[];
	/** Avertissements, en français : à relire, sans effet sur `passed` */
	warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_INSTANCES_PER_VARIATION = 50;

// ============================================================================
// FUNCTIONS
// ============================================================================

/** `id` est porté par la base, absent du schéma strict de l'éditeur */
function withoutId(template: QuestionTemplate): Omit<QuestionTemplate, 'id'> {
	const { id: _id, ...rest } = template;
	return rest;
}

/** Une variable (partagée ou d'une variation) s'appelle `e`, le nom de la constante d'Euler */
function declaresEulerVariable(template: QuestionTemplate): boolean {
	const variables = [
		...(template.shared?.variables ?? []),
		...template.variations.flatMap((variation) => variation.variables ?? [])
	];
	return variables.some((variable) => variable.name === 'e');
}

/** Chaque variation, seule, génère-t-elle sur `instances` tirages ? */
function checkGeneration(
	template: QuestionTemplate,
	instances: number
): TemplateCheckReport['generation'] & {
	draws: VariableDraw[];
	correctionForm: TemplateCheckReport['correctionForm'];
	figures: TemplateCheckReport['figures'];
	/** Ce que les `{{eval}}` ont signalé pendant les tirages (écriture des nombres) */
	evalWarnings: string[];
} {
	const failures: GenerationFailure[] = [];
	const draws: VariableDraw[] = [];
	const correctionForm: TemplateCheckReport['correctionForm'] = { checked: 0, failures: [] };
	const figures: TemplateCheckReport['figures'] = { checked: 0, failures: [] };
	const evalWarnings: string[] = [];
	const cleanCoefficients = template.shared?.cleanCoefficients === true;
	let attempts = 0;

	template.variations.forEach((variation, variationIndex) => {
		const single: QuestionTemplate = { ...template, variations: [variation] };
		for (let seed = 1; seed <= instances; seed++) {
			attempts++;
			const { result, warnings } = collectEvalWarnings(() => generateInstance(single, seed));
			evalWarnings.push(...warnings);
			if (!result.success) {
				failures.push({ variationIndex, seed, errors: result.errors });
				continue;
			}
			// Valeurs réellement tirées : de quoi dire si une variable peut être négative
			draws.push({ variationIndex, seed, variables: result.instance.resolvedVariables ?? [] });
			const formErrors = correctionFormErrors(result.instance, cleanCoefficients);
			if (formErrors !== null) {
				correctionForm.checked++;
				if (formErrors.length > 0) {
					correctionForm.failures.push({ variationIndex, seed, errors: formErrors });
				}
			}
			const replayErrors = expectedErrorReplayErrors(result.instance);
			if (replayErrors.length > 0) failures.push({ variationIndex, seed, errors: replayErrors });
			const figureErrors = constructionErrors(result.instance);
			if (figureErrors !== null) {
				figures.checked++;
				if (figureErrors.length > 0) {
					figures.failures.push({ variationIndex, seed, errors: figureErrors });
				}
			}
			if (isCourseCard(template)) {
				// Carte de cours : recto et verso doivent être non vides APRÈS résolution
				const errors: string[] = [];
				if (courseCardFront(result.instance).trim() === '') errors.push('recto vide');
				if (!hasCourseCardBackContent(result.instance)) errors.push('verso vide');
				if (errors.length > 0) failures.push({ variationIndex, seed, errors });
			}
		}
	});

	return { attempts, failures, draws, correctionForm, figures, evalWarnings };
}

/** Avertissements d'écriture gardés, les autres comptés (chaque tirage a ses valeurs) */
const MAX_EVAL_WARNINGS = 3;

/** Un même avertissement revient à chaque tirage : dit une fois, et au plus 3 différents */
function firstEvalWarnings(warnings: string[]): string[] {
	const distinct = [...new Set(warnings)];
	if (distinct.length <= MAX_EVAL_WARNINGS) return distinct;
	return [
		...distinct.slice(0, MAX_EVAL_WARNINGS),
		`… et ${distinct.length - MAX_EVAL_WARNINGS} autre(s) avertissement(s) d’écriture des nombres sur d’autres tirages`
	];
}

/** `{{eval:…}}` d'un texte de modèle */
const EVAL_TOKEN = /\{\{eval:(?:[^{}]|\{\{[^{}]*\}\}|\{[^{}]*\})*\}\}/g;

/** `{{p}}` (ou `{{p;()}}`) : une variable citée dans un texte de modèle */
const VARIABLE_REFERENCE = /\{\{([A-Za-z_]\w*)(?:;[^{}]*)?\}\}/g;

/** Réglage d'écriture d'un `{{eval:…}}` : arrondi (`;aN`, `;pN`), décimales (`;dN`), aucun */
function writingKind(token: string): 'rounding' | 'decimals' | null {
	try {
		const modifiers = parseEvalExpressionWithModifiers(token)?.modifiers;
		if (modifiers?.roundDecimals !== undefined || modifiers?.significantDigits !== undefined) {
			return 'rounding';
		}
		return modifiers?.minDecimals !== undefined ? 'decimals' : null;
	} catch {
		// Réglage refusé : l'erreur de tirage le dit déjà
		return null;
	}
}

/**
 * Les `{{eval:…}}` réglés d'une réponse attendue : écrits dans l'attendu, ou dans la
 * définition d'une variable qu'il cite (`{{p}}`, p = `{{eval:x;a2}}`). L'arrondi d'abord.
 */
function answerWritings(
	expectedAnswer: string,
	variables: ReadonlyMap<string, string>
): { where: string; kind: 'rounding' | 'decimals' }[] {
	const direct = (expectedAnswer.match(EVAL_TOKEN) ?? []).map((token) => ({
		where: token,
		token
	}));
	const cited = [...expectedAnswer.matchAll(VARIABLE_REFERENCE)].flatMap(([reference, name]) =>
		(variables.get(name)?.match(EVAL_TOKEN) ?? []).map((token) => ({
			where: `${reference} (${name} = ${token})`,
			token
		}))
	);
	const found = [...direct, ...cited].flatMap(({ where, token }) => {
		const kind = writingKind(token);
		return kind === null ? [] : [{ where, kind }];
	});
	return found.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'rounding' ? -1 : 1));
}

/**
 * Réponse attendue réglée dans une case sans `precision` (ni dans la case, ni dans
 * `blankDefaults` de la variation ou du modèle) : arrondie (`;aN`, `;pN`), l'élève qui
 * n'arrondit pas est compté faux sans message ; décimales imposées (`;dN`), l'élève qui
 * recopie les zéros du corrigé est en forme à améliorer.
 */
function roundedAnswerWithoutPrecision(template: QuestionTemplate): string[] {
	const shared = template.shared?.blankDefaults?.precision;
	return template.variations.flatMap((variation, variationIndex) => {
		const variables = new Map(
			[...(template.shared?.variables ?? []), ...(variation.variables ?? [])].map(
				(variable) => [variable.name, variable.expression] as const
			)
		);
		return (variation.blanks ?? []).flatMap((blank, blankIndex) => {
			if ((blank.precision ?? variation.blankDefaults?.precision ?? shared) !== undefined)
				return [];
			const [first] = answerWritings(blank.expectedAnswer, variables);
			if (first === undefined) return [];
			const where = `variation ${variationIndex + 1}, case ${blankIndex + 1} : ${first.where}`;
			return [
				first.kind === 'rounding'
					? `${where} — arrondi dans la réponse attendue, mais la case n’a pas de précision : l’élève qui n’arrondit pas sera compté faux sans message (donner une \`precision\`)`
					: `${where} — décimales imposées dans la réponse attendue, mais la case n’a pas de précision : l’élève qui recopie ces zéros sera en forme à améliorer (donner une \`precision\`)`
			];
		});
	});
}

/** Statuts d'une réponse de la bonne valeur : l'erreur prévue tombe sur la bonne réponse */
const RIGHT_VALUE_STATUSES = new Set(['correct', 'unoptimal_form', 'bad_form']);

/**
 * Erreurs prévues d'un tirage (idée 3) : chacune, répondue telle quelle, doit être
 * jugée fausse ET déclencher son message (ou celui d'une erreur prévue de même
 * valeur écrite avant elle). Celle qui tombe sur la bonne réponse du tirage est
 * ignorée (erreur de signe quand le résultat vaut 0) : l'élève aurait juste.
 */
function expectedErrorReplayErrors(instance: QuestionInstance): string[] {
	const blanks = instance.blanks ?? [];
	const rightAnswers = blanks.map((blank) => blank.expectedAnswerLatex ?? blank.expectedAnswer);
	return blanks.flatMap((blank, i) =>
		(blank.expectedErrors ?? []).flatMap((error, k) => {
			const where = `case ${i + 1}, erreur prévue ${k + 1} (${error.answerLatex})`;
			const answers = rightAnswers.map((answer, j) => (j === i ? error.answerLatex : answer));
			const verdict = validateAnswerDetailed(instance, { values: answers, latex: answers }).blanks[
				i
			];
			if (!verdict) return [`${where} : case introuvable`];
			if (RIGHT_VALUE_STATUSES.has(verdict.status)) return [];
			if (verdict.status !== 'incorrect') return [`${where} : réponse jugée « ${verdict.status} »`];
			const found = expectedErrorOf(instance, verdict);
			const sameOrEarlier = (blank.expectedErrors ?? []).slice(0, k + 1);
			return found !== null && sameOrEarlier.includes(found)
				? []
				: [`${where} : la réponse ne déclenche pas son message`];
		})
	);
}

/**
 * Cases « figure » d'un tirage : ce qui empêche de les juger (figure qui ne se
 * construit pas, point de `verifier:` absent…) ; `null` sans case « figure ».
 * Même calcul que le juge de l'élève (`constructionPositions`).
 */
function constructionErrors(instance: QuestionInstance): string[] | null {
	const constructions = (instance.blanks ?? []).flatMap((blank) =>
		blank.construction ? [blank.construction] : []
	);
	if (constructions.length === 0) return null;
	return constructions.flatMap(({ source, checks }) => {
		try {
			assertConstructionChecks(
				checks,
				constructionPositions(source),
				constructionShapes(source),
				constructionExpected(source),
				source
			);
			return [];
		} catch (error) {
			if (error instanceof ConstructionAuthorError) return [error.message];
			// Pas une erreur d'auteur (bug du moteur) : refusé aussi, mais dit comme tel
			return [`erreur inattendue en construisant la figure : ${String(error)}`];
		}
	});
}

/**
 * E1 (Q37) : les formes exigées que la réponse de la correction ne passe pas ;
 * `null` quand il n'y a rien à vérifier (pas de correction automatique de dérivée ou de
 * primitive, aucune forme exigée, ou pas de réponse finale). Avec ou sans `finalForm` :
 * la forme par défaut doit, elle aussi, passer le juge (David, 2026-10-24).
 */
function correctionFormErrors(
	instance: QuestionInstance,
	cleanCoefficients: boolean
): string[] | null {
	const kind = instance.correction?.generatedSteps?.kind;
	if (kind !== 'differentiate' && kind !== 'integrate') return null;
	// Le juge de l'élève ne lit que la forme de chaque case (`blank.requiredForm`, où
	// `instance-generator` reporte celle de la variation) : `instance.requiredForm` non
	const blanks = (instance.blanks ?? []).flatMap((blank) =>
		blank.requiredForm === undefined ? [] : [{ blank, form: blank.requiredForm }]
	);
	if (blanks.length === 0) return null;
	const answer = calculusFinalAnswerLatex(instance, { cleanCoefficients });
	// Rien de généré (repli sur la correction écrite) ou pas de valeur (V28) : rien à juger
	if (answer === null) return null;
	// Seules les cases dont la correction donne la VALEUR (f′(x), pas f′(2) à côté) :
	// même pipeline que l'élève (`isBlankValueCorrect`, puis la forme)
	const answered = blanks.filter(({ blank }) => isBlankValueCorrect(answer, blank, instance));
	if (answered.length === 0) return null;
	const reading = readingOf(instance);
	return answered
		.filter(({ form }) => requiredFormVerdict(answer, form, { ...reading }) !== 'ok')
		.map(({ form }) => `correction : ${answer} (forme exigée ${JSON.stringify(form)})`);
}

export function checkTemplate(
	candidate: Omit<QuestionTemplate, 'id'> & { id?: string },
	options: { instances?: number } = {}
): TemplateCheckReport {
	const instances = options.instances ?? DEFAULT_INSTANCES_PER_VARIATION;
	// Un template transformé n'a pas encore d'`id` (la base le donnera)
	const template: QuestionTemplate = { ...candidate, id: candidate.id ?? 'verification' };

	const templateErrors = validateTemplate(template);
	const schema = questionTemplateSchema.safeParse(withoutId(template));
	const schemaErrors = schema.success
		? []
		: schema.error.issues.map((issue) => `${issue.path.join('.')} : ${issue.message}`);
	const specs = runAllTestSpecs(template);
	const { draws, correctionForm, figures, evalWarnings, ...generation } = checkGeneration(
		template,
		instances
	);
	const warnings = [
		...findUnparenthesizedNegatives(template, draws),
		...firstEvalWarnings(evalWarnings),
		...roundedAnswerWithoutPrecision(template)
	];

	const reasons: string[] = [];
	// Contrainte `question_templates_level_positive` ; les niveaux TinyMath commencent à 0
	if (!(template.level >= 1))
		reasons.push(`niveau ${template.level} : la base exige un niveau ≥ 1`);
	if (templateErrors.length > 0) reasons.push(`${templateErrors.length} erreur(s) de structure`);
	if (schemaErrors.length > 0) reasons.push(`${schemaErrors.length} erreur(s) de schéma`);
	// Une carte de cours n'a pas de réponse : pas de spec exigée (ni tolérée)
	const courseCard = isCourseCard(template);
	if (courseCard && specs.length > 0) reasons.push('une carte de cours ne porte pas de spec');
	if (!courseCard && specs.length === 0) reasons.push('aucune spec de test');
	// Chaque variation doit prouver qu'une bonne réponse est acceptée
	const uncovered = template.variations
		.map((_, index) => index)
		.filter(
			(index) =>
				!(template.testSpecs ?? []).some(
					(spec) => (spec.variationIndex ?? 0) === index && spec.expected.status === 'correct'
				)
		);
	if (!courseCard && specs.length > 0 && uncovered.length > 0) {
		reasons.push(
			`variation(s) sans spec « correct » : ${uncovered.map((index) => index + 1).join(', ')}`
		);
	}
	// `e` est la constante d'Euler : une variable `e` serait lue 2,718… (`1 + e`, `{{if:e==0|…}}`)
	if (declaresEulerVariable(template)) {
		reasons.push('variable « e » : réservée à la constante d’Euler, choisir une autre lettre');
	}
	if (generation.attempts === 0) reasons.push('aucun tirage effectué');
	const failedSpecs = specs.filter((spec) => !spec.passed).length;
	if (failedSpecs > 0) reasons.push(`${failedSpecs} spec(s) rouge(s) sur ${specs.length}`);
	if (generation.failures.length > 0) {
		reasons.push(`${generation.failures.length} tirage(s) en échec sur ${generation.attempts}`);
	}
	if (correctionForm.failures.length > 0) {
		reasons.push(
			`${correctionForm.failures.length} tirage(s) sur ${correctionForm.checked} où la correction n’a pas la forme exigée de l’élève`
		);
	}

	if (figures.failures.length > 0) {
		reasons.push(
			`${figures.failures.length} tirage(s) sur ${figures.checked} où la figure à compléter ne se juge pas`
		);
	}

	return {
		templateErrors,
		schemaErrors,
		specs,
		generation,
		correctionForm,
		figures,
		passed: reasons.length === 0,
		reasons,
		warnings
	};
}

/** Message d'erreur prévue attendu par une spec, et ceux obtenus */
function messageDetail(result: TestSpecResult): string {
	const wanted = result.spec.expected.expectedErrorMessage;
	if (wanted === undefined) return '';
	const got = result.actual.expectedErrorMessages;
	return ` ; message attendu « ${wanted} », obtenu ${got.length === 0 ? 'aucun' : got.map((m) => `« ${m} »`).join(', ')}`;
}

/** Rapport lisible (terminal), qui dit toujours combien d'éléments ont été analysés */
export function formatCheckReport(report: TemplateCheckReport): string {
	const lines: string[] = [];
	const green = report.specs.filter((spec) => spec.passed).length;
	lines.push(`Specs : ${green}/${report.specs.length} vertes`);
	for (const result of report.specs) {
		const mark = result.passed ? '✅' : '❌';
		const detail = result.passed
			? ''
			: ` — attendu ${result.spec.expected.status}, obtenu ${result.actual.status}${messageDetail(result)}${result.error ? ` (${result.error})` : ''}`;
		lines.push(`  ${mark} ${result.spec.description}${detail}`);
	}
	const { attempts, failures } = report.generation;
	lines.push(`Tirages : ${attempts - failures.length}/${attempts} réussis`);
	for (const failure of failures.slice(0, 5)) {
		lines.push(
			`  ❌ variation ${failure.variationIndex + 1}, tirage ${failure.seed} : ${failure.errors.join('; ')}`
		);
	}
	if (failures.length > 5) lines.push(`  … et ${failures.length - 5} autre(s)`);
	const { checked, failures: formFailures } = report.correctionForm;
	if (checked > 0) {
		lines.push(`Forme de la correction (E1) : ${checked - formFailures.length}/${checked} tirages`);
		for (const failure of formFailures.slice(0, 5)) {
			lines.push(
				`  ❌ variation ${failure.variationIndex + 1}, tirage ${failure.seed} : ${failure.errors.join('; ')}`
			);
		}
		if (formFailures.length > 5) lines.push(`  … et ${formFailures.length - 5} autre(s)`);
	}
	const { checked: figuresChecked, failures: figureFailures } = report.figures;
	if (figuresChecked > 0) {
		lines.push(
			`Figures construites : ${figuresChecked - figureFailures.length}/${figuresChecked} tirages`
		);
		for (const failure of figureFailures.slice(0, 5)) {
			lines.push(
				`  ❌ variation ${failure.variationIndex + 1}, tirage ${failure.seed} : ${failure.errors.join('; ')}`
			);
		}
		if (figureFailures.length > 5) lines.push(`  … et ${figureFailures.length - 5} autre(s)`);
	}
	for (const error of report.templateErrors) lines.push(`Structure : ${error}`);
	for (const error of report.schemaErrors) lines.push(`Schéma : ${error}`);
	for (const warning of report.warnings) lines.push(`Avertissement : ${warning}`);
	lines.push(
		report.passed
			? 'VERDICT : importable'
			: `VERDICT : NON importable — ${report.reasons.join(', ')}`
	);
	return lines.join('\n');
}
