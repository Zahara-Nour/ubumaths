/**
 * Question Instance Generator
 * ===========================
 *
 * Main orchestrator for generating question instances from templates.
 * Handles complete resolution pipeline:
 * 1. Template validation
 * 2. Circular dependency detection
 * 3. Variable resolution
 * 4. Content resolution
 * 5. Choice shuffling (cases choix, bloc ```choix)
 *
 * @module questions/generator/instance-generator
 */

import type {
	QuestionTemplate,
	QuestionInstance,
	GenerationResult,
	QuestionVariation,
	QuestionVariable,
	SharedVariationDefaults,
	ResolvedCorrection,
	InstanceBlank,
	RequiredForm,
	ResolvedVariable,
	AnswerKind,
	BlankDefaults,
	CalculusBlankFields,
	TemplateBlank,
	ValidationRule,
	BuildKind
} from '../types';
import { collectEvalWarnings, replayEvalWarnings } from '#lib/mathAST/eval/eval-warnings.ts';
import { buildKindName, getQuestionType, isPlaceKind } from '../types';
import type { ResolvedMarkdown, TemplateMarkdown } from '#lib/ubumark/index.ts';
import {
	templateMarkdown,
	resolvedMarkdown,
	detectCircularDependencies
} from '#lib/ubumark/index.ts';
import { validateTemplate } from '../validators/template-validator';
import { resolveVariables } from './variable-resolver';
import {
	resolveMarkdownContent,
	resolveExpression,
	insertExpressionMarkers,
	resolveAnswerFormat,
	convertToLatex
} from './content-resolver';
import { shuffleChoices } from './choice-shuffler';
import { assignBlankIndices } from './assign-blank-indices';
import { parseOperationContent } from '#lib/ubumark/parser/operation-parser.ts';
import {
	compositeBuiltNames,
	isDiagonalRectangleCheck,
	isRuledPolygonCheck
} from '#lib/ubumark/types/construction.ts';
import { hasCollectionToBuild } from '#lib/ubumark/parser/collection-parser.ts';
import { hasMonnaieToBuild } from '#lib/ubumark/parser/monnaie-parser.ts';
import { hasLineToPlace } from '#lib/ubumark/parser/number-line-parser.ts';
import { hasHorlogeToPlace } from '#lib/ubumark/parser/horloge-parser.ts';
import { hasStatChartToPlace } from '#lib/ubumark/parser/stat-chart-parser.ts';
import { hasCourbeToPlace } from '#lib/ubumark/parser/courbe-parser.ts';
import { hasTrigCircleToPlace } from '#lib/ubumark/parser/trig-circle-parser.ts';
import { hasTortueToProgram } from '#lib/ubumark/parser/tortue-parser.ts';
import { readExpectedTortueAnswer } from '#lib/ubumark/utils/tortue-answer.ts';
import { hasCalculToProgram } from '#lib/ubumark/parser/calcul-parser.ts';
import { readExpectedCalculAnswer } from '#lib/ubumark/utils/calcul-answer.ts';
import {
	findRobotsToProduce,
	hasRobotToProduce,
	parseRobotContent
} from '#lib/ubumark/parser/robot-parser.ts';
import { readExpectedRobotAnswer } from '#lib/ubumark/utils/robot-answer.ts';
import { avecGraines, hasLabyrintheAParcourir } from '#lib/ubumark/parser/labyrinthe-parser.ts';
import {
	ecrireChemin,
	readExpectedLabyrintheAnswer
} from '#lib/ubumark/utils/labyrinthe-answer.ts';
import { hasYohakuARemplir } from '#lib/ubumark/parser/yohaku-parser.ts';
import {
	yohakuSolutionAnswer,
	readExpectedYohakuAnswer
} from '#lib/ubumark/utils/yohaku-answer.ts';
import { hasVariationToFill } from '#lib/ubumark/parser/variation-table-parser.ts';
import {
	readSignTableCases,
	infinityToken,
	signTableAnswerLatex,
	signTableCaseIndices,
	type SignTableAnswer
} from '../sign-table-case';
import { barsCaseCount } from '#lib/ubumark/utils/barres-placer.ts';
import { boxPlotCaseCount } from '#lib/ubumark/utils/boxplot-placer.ts';
import {
	findRangersToPlace,
	hasRangerToPlace,
	parseRangerContent,
	replaceRangerBlocks,
	serializeRangerBlock
} from '#lib/ubumark/parser/ranger-parser.ts';
import { rangerOrder } from '#lib/ubumark/utils/ranger.ts';
import {
	findAssociersToPlace,
	hasAssocierToPlace,
	parseAssocierContent,
	replaceAssocierBlocks,
	serializeAssocierBlock
} from '#lib/ubumark/parser/associer-parser.ts';
import {
	findTrousToPlace,
	hasTrousToPlace,
	parseTrousContent,
	replaceTrousBlocks,
	serializeTrousBlock
} from '#lib/ubumark/parser/trous-parser.ts';
import type { TrousSegment } from '#lib/ubumark/types/trous.ts';
import { hasPartageToColorier } from '#lib/ubumark/parser/partage-parser.ts';
import {
	hasCubesToBuild,
	hasPatronsToBuild,
	hasSolidesToBuild
} from '#lib/ubumark/parser/espace-parser.ts';
import type { RangerSign } from '#lib/ubumark/types/ranger.ts';
import type { AssocierGesture } from '#lib/ubumark/types/associer.ts';
import { buildAnswerOf, MASKED_IN_TEMPLATE } from './build-answer';
import { parseMarkdown } from '#lib/ubumark/parser/markdown-parser.ts';
import { operationExpectedAnswer } from '#lib/ubumark/utils/operation-answer.ts';
import { divisionExpectedAnswers } from '#lib/ubumark/utils/operation-division-answer.ts';
import {
	WORK_FIGURE_ALONE_MESSAGE,
	readConstructionHeader
} from '#lib/ubumark/parser/construction-parser.ts';
import { parseFigureContent } from '#lib/ubumark/parser/figure-parser.ts';
import {
	parseChoiceBody,
	replaceChoiceBlocks,
	serializeChoiceBlock,
	type ChoiceBlockSpec
} from '#lib/ubumark/parser/choix-parser.ts';
import { formatChoiceAnswer, readExpectedChoices } from '../choice-case';
import { toFrenchDecimal } from '#lib/utils/french-math.ts';
import { normalizeExpression, detectExpressionType } from '#lib/ubumark/parameterization/index.ts';
import {
	applyRemoveSpaces,
	AuthorExpressionError
} from '#lib/ubumark/parameterization/resolver/variable-resolver.ts';
import { resolveVariableConditionals } from './variable-conditionals';
import { buildCorrectionContext, resolveCorrectionContent } from './correction-resolver';
import { generateCorrection } from './correction-generator';
import { declaredGenericFunctions, templateGenericFunctions } from '../generic-functions';
import { resolveCapitalPairs } from '../capital-pairs';
import { cleanCoefficientsCustom } from '../clean-coefficients';
import { expectedIntervalsLatex } from '../intervals/interval-answer';
import { expectedVectorLatex } from '../vectors/vector-answer';
import { expectedMatrixLatex } from '../matrices/matrix-answer';
import { evaluateConditions } from './condition-evaluator';
import { createRandomSource, randomIndex, type RandomSource } from '#lib/utils/random.ts';
import { expectedInRequiredUnit } from '#lib/questions/units/required-unit.ts';
import {
	IMPOSSIBLE_EXPECTED,
	impossibleAnswerLatex,
	isImpossibleExpected
} from '#lib/questions/impossible-answer.ts';

// ============================================================================
// SHARED DEFAULTS MERGING
// ============================================================================

/**
 * Deux étiquettes d'un même bloc ```ranger ont-elles le même texte avec ce tirage ?
 * Les étiquettes sont résolues à part, sur une source de hasard jetable : le tirage
 * de l'instance n'est pas touché (le générateur refuse encore le doublon s'il en reste).
 */
function rangerLabelsCollide(
	statement: TemplateMarkdown | undefined,
	variables: ResolvedVariable[],
	genericFunctions: Parameters<typeof resolveMarkdownContent>[3],
	cleanCoefficients: boolean,
	capitalPairs: Parameters<typeof resolveMarkdownContent>[5]
): boolean {
	const text = String(statement ?? '');
	if (!text.includes('```ranger')) return false;
	return findRangersToPlace(text).some((block) => {
		const { labels } = parseRangerContent(block.body.join('\n'));
		const resolved = labels.map((label) =>
			String(
				resolveMarkdownContent(
					templateMarkdown(label),
					variables,
					createRandomSource(0),
					genericFunctions,
					cleanCoefficients,
					capitalPairs
				)
			).trim()
		);
		return new Set(resolved).size < resolved.length;
	});
}

/**
 * Un robot à produire (```robot + `produire: oui`) est-il impossible avec ce tirage (aucun
 * code de 15 instructions et 4 virages au plus, départ ou arrivée sur une case grise, arrivée
 * au départ) ? Résolu à part, comme `rangerLabelsCollide` : les variables seules, d'où le refus
 * de `{{random:` dans le bloc (`ROBOT_RANDOM_MESSAGE`). Condition implicite : le tirage est
 * refait ; si aucun ne convient, le dernier passe et le bloc dit son erreur au prof. Toute autre
 * erreur (case hors du quadrillage, clé inconnue) n'est pas une affaire de tirage : pas de
 * nouvel essai, le prof la voit tout de suite.
 */
function robotSceneImpossible(
	statement: TemplateMarkdown | undefined,
	variables: ResolvedVariable[],
	genericFunctions: Parameters<typeof resolveMarkdownContent>[3],
	cleanCoefficients: boolean,
	capitalPairs: Parameters<typeof resolveMarkdownContent>[5]
): boolean {
	const text = String(statement ?? '');
	if (!text.includes('```robot')) return false;
	return findRobotsToProduce(text).some((block) => {
		const resolved = String(
			resolveMarkdownContent(
				templateMarkdown(block.body.join('\n')),
				variables,
				createRandomSource(0),
				genericFunctions,
				cleanCoefficients,
				capitalPairs
			)
		);
		const node = parseRobotContent(resolved);
		return (
			node.spec === null &&
			node.errors.every((e) => ROBOT_TIRAGE_ERRORS.some((motif) => motif.test(e.message)))
		);
	});
}

/**
 * Graine de la source des erreurs prévues, MÉLANGÉE (pas `seed + k`, qui serait la
 * source d'instance d'une autre graine). Exception assumée à « jamais `f(seed)` »
 * (`utils/random.ts`) : la source principale ne doit pas être consommée, sinon tous
 * les tirages suivants bougeraient ; une corrélation avec elle est sans effet ici.
 */
/**
 * Attendue (ou erreur prévue) `impossible` sur la case `index` : seulement sur une case
 * ordinaire qui porte un bouton (`impossibleLabel`) ; sinon le tirage échoue, message pour l'auteur.
 */
function assertImpossibleAllowed(
	index: number,
	isOrdinaryMathBlank: boolean,
	impossibleLabel: string | undefined
): asserts impossibleLabel is string {
	if (!isOrdinaryMathBlank) {
		throw new Error(
			`La case ${index + 1} attend « ${IMPOSSIBLE_EXPECTED} », mais le bouton « ${IMPOSSIBLE_EXPECTED} » est réservé aux cases ordinaires (sans nature de réponse).`
		);
	}
	if (impossibleLabel === undefined) {
		throw new Error(
			`La case ${index + 1} attend « ${IMPOSSIBLE_EXPECTED} » mais n'a pas de bouton « ${IMPOSSIBLE_EXPECTED} » (impossibleLabel).`
		);
	}
}

function expectedErrorsSeed(seed: number): number {
	return Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
}

/**
 * Graine de la source du coup de pouce (idée 5) : même raison que
 * `expectedErrorsSeed`, autre mélange (les deux sources restent indépendantes).
 */
function hintSeed(seed: number): number {
	return Math.imul(seed ^ 0x7f4a7c15, 0xc2b2ae35) >>> 0;
}

/** Erreurs d'un bloc robot qui tiennent au tirage (`robotSceneImpossible`) */
const ROBOT_TIRAGE_ERRORS = [/aucun code de/, /l’arrivée est le départ/, /est sur une case grise/];

const ROBOT_RANDOM_MESSAGE =
	'Robot à produire : pas de {{random:…}} dans le bloc ```robot (le tirage ne pourrait pas être vérifié) ; utiliser une variable';

/** Un robot à produire tire-t-il un hasard dans son bloc (`{{random:`) ? */
function robotHasRandom(statement: TemplateMarkdown | undefined): boolean {
	const text = String(statement ?? '');
	if (!text.includes('```robot')) return false;
	return findRobotsToProduce(text).some((block) => block.body.join('\n').includes('{{random'));
}

/**
 * Deux éléments d'un même bloc ```associer ont-ils le même texte avec ce tirage, ou
 * deux étiquettes écrites différemment ? Résolus à part, comme `rangerLabelsCollide`.
 */
function associerTextsCollide(
	statement: TemplateMarkdown | undefined,
	variables: ResolvedVariable[],
	genericFunctions: Parameters<typeof resolveMarkdownContent>[3],
	cleanCoefficients: boolean,
	capitalPairs: Parameters<typeof resolveMarkdownContent>[5]
): boolean {
	const text = String(statement ?? '');
	if (!text.includes('```associer')) return false;
	const resolve = (written: string) =>
		String(
			resolveMarkdownContent(
				templateMarkdown(written),
				variables,
				createRandomSource(0),
				genericFunctions,
				cleanCoefficients,
				capitalPairs
			)
		).trim();
	return findAssociersToPlace(text).some((block) => {
		const { items, labels } = parseAssocierContent(block.body.join('\n'));
		// Seuls deux textes ÉCRITS différents comptent : deux éléments écrits identiques
		// sont refusés par le parseur, avec son message (inutile de retirer)
		const collide = (written: string[]) => {
			const resolved = written.map(resolve);
			return resolved.some((text, i) =>
				resolved.some((other, j) => j > i && other === text && written[j] !== written[i])
			);
		};
		return collide(items) || collide(labels);
	});
}

/**
 * Deux étiquettes d'un même bloc ```trous écrites différemment ont-elles le même
 * texte avec ce tirage ? Résolues à part, comme `rangerLabelsCollide` (deux trous à
 * la même étiquette écrite sont permis : elle n'est montrée qu'une fois).
 */
function trousLabelsCollide(
	statement: TemplateMarkdown | undefined,
	variables: ResolvedVariable[],
	genericFunctions: Parameters<typeof resolveMarkdownContent>[3],
	cleanCoefficients: boolean,
	capitalPairs: Parameters<typeof resolveMarkdownContent>[5]
): boolean {
	const text = String(statement ?? '');
	if (!text.includes('```trous')) return false;
	return findTrousToPlace(text).some((block) => {
		const { labels } = parseTrousContent(block.body.join('\n'));
		const resolved = labels.map((label) =>
			String(
				resolveMarkdownContent(
					templateMarkdown(label),
					variables,
					createRandomSource(0),
					genericFunctions,
					cleanCoefficients,
					capitalPairs
				)
			).trim()
		);
		return new Set(resolved).size < resolved.length;
	});
}

/** Ce qui donne la réponse d'un bloc qui porte sa case, pour les messages au prof */
function blockAnswerName(kind: BuildKind): string {
	if (kind === 'line')
		return 'la graduation, l’intervalle ou le partage de la droite graduée (placer:, representer:, graduer:)';
	if (kind === 'horloge') return 'l’heure de l’horloge (placer:)';
	if (kind === 'barres') return 'l’effectif de la barre (placer:)';
	if (kind === 'boite-a-moustaches') return 'les valeurs de la boîte (placer:)';
	if (kind === 'ranger') return 'l’étiquette à sa place (bloc ranger)';
	if (kind === 'associer') return 'l’étiquette de chaque élément (bloc associer, « -> »)';
	if (kind === 'trous') return 'l’étiquette de chaque trou (bloc trous, « [étiquette] »)';
	if (kind === 'partage') return 'la fraction du bloc partage (colorier:)';
	if (kind === 'cubes') return 'la vue ou les vues du bloc cubes (dessiner:, retrouver:)';
	if (kind === 'patron') return 'les faces du bloc patron (designer:, completer:)';
	if (kind === 'solide') return 'les points du bloc solide (tracer:)';
	if (kind === 'courbe')
		return 'les coordonnées du point, la droite ou le vecteur du repère (placer:, tracer:)';
	if (kind === 'trig') return 'la mesure du point du cercle trigonométrique (placer:)';
	if (kind === 'tortue') return 'le programme du bloc tortue (attendu:)';
	if (kind === 'calcul') return 'le programme du bloc calcul (attendu:)';
	if (kind === 'robot') return 'le code du robot (calculé d’après la scène)';
	if (kind === 'labyrinthe') return 'le chemin du labyrinthe (tiré avec la grille)';
	if (kind === 'yohaku') return 'les cases de la grille (la solution écrite dans le bloc)';
	return `la valeur du bloc ${kind} (construire:)`;
}

/**
 * Merge shared and per-variation variables.
 *
 * Per-variation variables can reference shared variables (resolved in declaration order).
 * If a per-variation variable has the same name as a shared variable, it overrides it.
 *
 * @param shared - Shared variable definitions (resolved first)
 * @param perVariation - Per-variation variable definitions (can override shared)
 * @returns Merged array of variables, or undefined if both are empty
 */
function mergeVariables(
	shared: QuestionVariable[] | undefined,
	perVariation: QuestionVariable[] | undefined
): QuestionVariable[] | undefined {
	if (!shared?.length) return perVariation;
	if (!perVariation?.length) return shared;

	// Collect names that are overridden by per-variation
	const overriddenNames = new Set(perVariation.map((v) => v.name));

	// Filter out shared variables that are overridden
	const effectiveShared = shared.filter((v) => !overriddenNames.has(v.name));

	// Shared variables first (so per-variation can reference them), then per-variation
	return [...effectiveShared, ...perVariation];
}

/**
 * Merge shared defaults with variation-specific values.
 *
 * Variation values override shared values for most fields.
 * Special case: `variables` are MERGED (shared first, per-variation can reference/override).
 *
 * @param shared - Shared defaults that apply to all variations
 * @param variation - Variation-specific values
 * @returns Resolved variation with shared defaults applied
 */
function resolveVariationWithShared(
	shared: SharedVariationDefaults | undefined,
	variation: QuestionVariation
): QuestionVariation {
	if (!shared) return variation;

	return {
		// statement: empty string falls through to shared (use ||)
		// Fall back to empty TemplateMarkdown if neither has value (edge case)
		statement: variation.statement || shared.statement || templateMarkdown(''),

		// correction: full structure (use ??)
		correction: variation.correction ?? shared.correction,

		// validationRules: per-variation overrides entirely (use ??)
		validationRules: variation.validationRules ?? shared.validationRules,

		// requiredForm: per-variation overrides shared
		requiredForm: variation.requiredForm ?? shared.requiredForm,

		// variables: MERGE (shared first, per-variation can reference/override)
		variables: mergeVariables(shared.variables, variation.variables),

		// conditions: per-variation overrides shared
		conditions: variation.conditions ?? shared.conditions,

		// blanks: per-variation only (no shared equivalent for now)
		blanks: variation.blanks,

		// blankDefaults: per-variation overrides shared
		blankDefaults: variation.blankDefaults ?? shared.blankDefaults,

		// answerFormats: per-variation overrides shared
		answerFormats: variation.answerFormats ?? shared.answerFormats,

		// Coup de pouce : par variation seulement
		hint: variation.hint,
		hintFromFirstStep: variation.hintFromFirstStep
	};
}

/** Forme exigée par motif : variables tirées remplacées par leur valeur */
function resolveRequiredForm(
	requiredForm: RequiredForm | undefined,
	resolvedVariables: ResolvedVariable[],
	random: RandomSource
): RequiredForm | undefined {
	if (!requiredForm || typeof requiredForm === 'string') return requiredForm;
	// Chaque marqueur remplacé par sa valeur ; tout ce qui n'est pas un nombre positif est
	// parenthésé (`9 / (-3)` reconnaît `9:(-3)` ; une formule `a+1` reste un seul opérande)
	const resolve = (pattern: string) =>
		pattern.replace(MARKER_REGEX, (marker) => {
			// Une valeur dans un motif : une durée reste UNE grandeur (2026-11-03)
			const value = resolveExpression(marker, resolvedVariables, random, {
				durations: 'single'
			}).trim();
			return /^\d+(?:\.\d+)?$/.test(value) ? value : `(${value})`;
		});
	return requiredForm.acceptable === undefined
		? { pattern: resolve(requiredForm.pattern) }
		: { pattern: resolve(requiredForm.pattern), acceptable: resolve(requiredForm.acceptable) };
}

/**
 * Normalise une réponse attendue (ou un préremplissage) écrite en syntaxe simplifiée.
 * Un nom nu qui ne désigne AUCUNE variable déclarée reste tel quel : `e`, `i` sont des
 * constantes (Euler, imaginaire), pas des variables manquantes. Seul un nom déclaré
 * devient une référence `{{nom}}`.
 */
function normalizeAnswerExpression(
	expression: string,
	resolvedVariables: ResolvedVariable[]
): string {
	if (detectExpressionType(expression) === 'variable-ref') {
		const name = expression.trim();
		if (!resolvedVariables.some((v) => v.name === name)) return expression;
	}
	return normalizeExpression(expression);
}

/** Champs propres à chaque case de calcul (cf. `CalculusBlankFields`) */
const CALCULUS_FIELDS: Partial<Record<AnswerKind, readonly (keyof CalculusBlankFields)[]>> = {
	primitive: ['integrand', 'variable', 'interval'],
	'solution-ed': ['equation', 'solutionMode', 'variable', 'function', 'initial'],
	resolution: ['equation', 'variable', 'minLines']
};

/** Champ sans lequel la case ne peut pas être jugée */
const CALCULUS_REQUIRED_FIELD: Partial<Record<AnswerKind, keyof CalculusBlankFields>> = {
	primitive: 'integrand',
	'solution-ed': 'equation',
	resolution: 'equation'
};

/** Champs dont les variables tirées sont résolues (`{{a}}x^2` → `3x^2`) */
const CALCULUS_TEMPLATED_FIELDS = new Set<keyof CalculusBlankFields>([
	'integrand',
	'interval',
	'equation',
	'initial'
]);

/**
 * Champs d'une case « primitive », « solution-ed » ou « resolution » : case > blankDefaults,
 * variables tirées résolues. Seuls ceux de son `answerKind` sont recopiés.
 * Lève une erreur si le champ indispensable manque (`integrand`, `equation`).
 */
function resolveCalculusFields(
	answerKind: AnswerKind | undefined,
	blank: TemplateBlank,
	defaults: BlankDefaults | undefined,
	resolvedVariables: ResolvedVariable[],
	random: RandomSource
): CalculusBlankFields {
	const fields = answerKind ? CALCULUS_FIELDS[answerKind] : undefined;
	if (!answerKind || !fields) return {};
	const resolved: Record<string, string | number> = {};
	for (const field of fields) {
		const raw = blank[field] ?? defaults?.[field];
		if (raw === undefined) continue;
		if (typeof raw !== 'string' || !CALCULUS_TEMPLATED_FIELDS.has(field)) {
			resolved[field] = raw;
			continue;
		}
		const text = resolveVariableConditionals(raw, resolvedVariables, { strict: true });
		resolved[field] = text.includes('{{')
			? resolveExpression(text, resolvedVariables, random)
			: text;
	}
	const required = CALCULUS_REQUIRED_FIELD[answerKind];
	const requiredValue = required ? resolved[required] : undefined;
	if (required && (typeof requiredValue !== 'string' || !requiredValue.trim())) {
		throw new Error(`Case « ${answerKind} » sans champ « ${required} »`);
	}
	return resolved as CalculusBlankFields;
}

/** Un marqueur `{{…}}`, imbrications comprises (`{{eval:{{a}}*2}}`) */
const MARKER_REGEX = /\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}/g;

/** Marqueur d'une variable seule (`{{n}}`) : substitué par l'évaluateur de règles */
const BARE_MARKER_REGEX = /^\{\{\s*[A-Za-z_]\w*\s*\}\}$/;

/**
 * Calcule les marqueurs `{{eval:…}}` (et toute formule `{{a+1}}`) d'une règle de
 * validation. L'évaluateur de règles ne sait substituer que `{{nom}}` : une borne
 * `{{eval:floor(S/p1)}}` lui arrivait telle quelle, était illisible, et la règle
 * refusait toute réponse. Les `{{nom}}` restent pour l'évaluateur ; le reste est
 * remplacé par sa valeur, parenthésée hors nombre positif (`-3`, `\dfrac{31}{3}`).
 */
function resolveValidationRules(
	rules: ValidationRule[] | undefined,
	resolvedVariables: ResolvedVariable[],
	random: RandomSource
): ValidationRule[] | undefined {
	if (!rules) return rules;
	const resolve = (text: string) =>
		text.replace(MARKER_REGEX, (marker) => {
			if (BARE_MARKER_REGEX.test(marker)) return marker;
			// Une valeur dans un motif : une durée reste UNE grandeur (2026-11-03)
			const value = resolveExpression(marker, resolvedVariables, random, {
				durations: 'single'
			}).trim();
			return /^\d+(?:\.\d+)?$/.test(value) ? value : `(${value})`;
		});
	return rules.map((rule): ValidationRule => {
		switch (rule.type) {
			case 'divisor':
				return { ...rule, dividend: resolve(rule.dividend) };
			case 'multiple':
				return { ...rule, base: resolve(rule.base) };
			case 'range':
				return { ...rule, min: resolve(rule.min), max: resolve(rule.max) };
			case 'equation_root':
				return { ...rule, equation: resolve(rule.equation) };
			case 'equivalent':
			case 'custom':
				return { ...rule, expression: resolve(rule.expression) };
			default:
				return rule;
		}
	});
}

/** Noms affectés dans le script d'une figure (`A = point(1, 2)`), sans l'interpréter */
function namesAssignedIn(figureSource: string): Set<string> {
	const names = new Set<string>();
	for (const match of figureSource.matchAll(/^\s*([A-Za-z][A-Za-z0-9_']*)\s*=(?!=)/gm)) {
		names.add(match[1]);
	}
	return names;
}

/**
 * Generate a question instance from a template
 *
 * @param template - Question template
 * @param seed - Graine facultative (0 comprise) : elle initialise UNE source de hasard,
 *   consommée dans l'ordre par toute la génération ; sans graine, Math.random.
 * @returns Generation result (success with instance or failure with errors)
 *
 * @example
 * ```typescript
 * const template: QuestionTemplate = {
 *   id: 'uuid',
 *   type: 'numerical_exact',
 *   statement: [{ type: 'text', content: 'Calculate $${@:a} + {@:b}$$' }],
 *   variables: [
 *     { name: 'a', expression: '{#:1-10}' },
 *     { name: 'b', expression: '{#:1-10}' }
 *   ],
 *   grades: ['6'],
 *   delay: 30
 * };
 *
 * const result = generateInstance(template, 42);
 * if (result.success) {
 *   console.log(result.instance.statement[0].content);  // "Calculate $$7 + 3$$"
 * }
 * ```
 */
export function generateInstance(template: QuestionTemplate, seed?: number): GenerationResult {
	try {
		// 1. Validate template structure
		const validationErrors = validateTemplate(template);
		if (validationErrors.length > 0) {
			return {
				success: false,
				errors: validationErrors
			};
		}

		// 2. Une seule source de hasard pour toute l'instance, consommée dans l'ordre :
		//    variation, variables (et nouveaux essais), énoncé, réponses, choix, corrigé.
		//    Aucun tirage n'est recalculé depuis la graine.
		const random = createRandomSource(seed);
		// Erreurs prévues (idée 3) : leur propre source, pour ne décaler AUCUN tirage
		// de l'instance (une copie régénérée par sa graine reste la même, ADR 0015)
		const errorRandom = createRandomSource(
			seed === undefined ? undefined : expectedErrorsSeed(seed)
		);

		// Select a variation
		const variationIndex = randomIndex(template.variations.length, random);
		const selectedVariation = template.variations[variationIndex];

		// 3. Merge shared defaults with variation-specific values
		const resolvedVariation = resolveVariationWithShared(template.shared, selectedVariation);

		// Fonctions déclarées par le modèle (`P`, `C`) : toutes les formules les lisent.
		// Sans déclaration, `undefined` partout → défauts du parseur, rien ne change.
		const genericFunctionNames = declaredGenericFunctions(template.shared?.genericFunctions);
		const genericFunctions = templateGenericFunctions(genericFunctionNames);
		// Sens de `AB` (longueur ou produit), résolu UNE fois ici (Q-K) : déclaration du
		// modèle → longueur (le contexte de la branche est lu à l'enregistrement, par
		// l'éditeur, qui écrit alors la déclaration). Porté par l'instance jusqu'au parseur.
		const { capitalPairs } = resolveCapitalPairs({
			declaration: template.shared?.capitalPairs
		});
		// Coefficients nettoyés (`1x-1y+0` → `x-y`) : strictement `true`, sinon rien ne change
		const cleanCoefficients = template.shared?.cleanCoefficients === true;

		// 4. Detect circular dependencies in resolved variation
		if (resolvedVariation.variables) {
			const circularResult = detectCircularDependencies(resolvedVariation.variables);
			if (!circularResult.valid) {
				return {
					success: false,
					errors: circularResult.errors.map((err) => err.message)
				};
			}
		}

		if (robotHasRandom(resolvedVariation.statement)) {
			return { success: false, errors: [ROBOT_RANDOM_MESSAGE] };
		}

		// 5. Resolve variables in declaration order (with condition retry loop).
		// Un tirage est rejeté et recommencé quand une condition est fausse, mais aussi quand
		// une variable ne se calcule pas pour CE tirage (division par zéro, arccos(3/2)) :
		// c'est une condition implicite. L'échec n'est rendu qu'après épuisement des essais.
		const MAX_CONDITION_RETRIES = 100;
		const conditions = resolvedVariation.conditions ?? [];
		let resolvedVariables: ResolvedVariable[] | undefined;
		let lastVariableError: string | undefined;
		let conditionFailures = 0;
		let rangerCollisions = 0;
		let associerCollisions = 0;
		let trousCollisions = 0;
		/** Dernier tirage rejeté pour un robot impossible : repris si aucun ne convient */
		let robotFallback: ResolvedVariable[] | undefined;
		// Avertissements d'écriture des `{{eval}}` (question:specs) : ceux du tirage RETENU
		// seulement, un tirage rejeté par une condition n'a rien à signaler
		let candidateWarnings: string[] = [];
		let retainedWarnings: string[] = [];
		let robotFallbackWarnings: string[] = [];
		for (let attempt = 0; attempt <= MAX_CONDITION_RETRIES; attempt++) {
			// Nouvel essai : la source continue, les tirages sont donc neufs
			let candidate: ResolvedVariable[];
			try {
				const collected = collectEvalWarnings(() =>
					resolveVariables(resolvedVariation.variables || [], random)
				);
				candidate = collected.result;
				candidateWarnings = collected.warnings;
			} catch (error) {
				// Faute d'écriture du modèle : la même à chaque tirage, inutile de relancer
				if (error instanceof AuthorExpressionError) {
					return { success: false, errors: [error.message] };
				}
				lastVariableError = error instanceof Error ? error.message : String(error);
				continue;
			}
			conditionFailures++;
			// Étiquettes à ranger : deux étiquettes au même texte après tirage, condition implicite
			if (!evaluateConditions(conditions, candidate)) continue;
			if (
				rangerLabelsCollide(
					resolvedVariation.statement,
					candidate,
					genericFunctions,
					cleanCoefficients,
					capitalPairs
				)
			) {
				rangerCollisions++;
				continue;
			}
			// Éléments à associer : deux éléments (ou deux étiquettes) au même texte après tirage
			if (
				associerTextsCollide(
					resolvedVariation.statement,
					candidate,
					genericFunctions,
					cleanCoefficients,
					capitalPairs
				)
			) {
				associerCollisions++;
				continue;
			}
			// Texte à trous : deux étiquettes au même texte après tirage
			if (
				trousLabelsCollide(
					resolvedVariation.statement,
					candidate,
					genericFunctions,
					cleanCoefficients,
					capitalPairs
				)
			) {
				trousCollisions++;
				continue;
			}
			// Robot à produire : aucun code possible avec ce tirage
			if (
				robotSceneImpossible(
					resolvedVariation.statement,
					candidate,
					genericFunctions,
					cleanCoefficients,
					capitalPairs
				)
			) {
				robotFallback = candidate;
				robotFallbackWarnings = candidateWarnings;
				continue;
			}
			resolvedVariables = candidate;
			retainedWarnings = candidateWarnings;
			break;
		}

		if (resolvedVariables === undefined && associerCollisions > 0) {
			return {
				success: false,
				errors: [
					`Éléments à associer : deux éléments identiques (ou deux étiquettes) à chacun des ${associerCollisions} tirages ; écrire une condition qui les rend différents`
				]
			};
		}

		if (resolvedVariables === undefined && trousCollisions > 0) {
			return {
				success: false,
				errors: [
					`Texte à trous : deux étiquettes identiques à chacun des ${trousCollisions} tirages (laquelle irait où ?) ; écrire une condition qui les rend différentes`
				]
			};
		}

		// Robot à produire impossible à chaque tirage : le dernier passe, la case dira pourquoi
		if (resolvedVariables === undefined && robotFallback !== undefined) {
			resolvedVariables = robotFallback;
			retainedWarnings = robotFallbackWarnings;
		}
		replayEvalWarnings(retainedWarnings);

		if (resolvedVariables === undefined && rangerCollisions > 0) {
			return {
				success: false,
				errors: [
					`Étiquettes à ranger : deux étiquettes identiques à chacun des ${rangerCollisions} tirages (laquelle irait où ?) ; écrire une condition qui les rend différentes`
				]
			};
		}

		if (resolvedVariables === undefined) {
			return {
				success: false,
				errors: [
					conditionFailures === 0
						? `Failed to resolve variables after ${MAX_CONDITION_RETRIES} retries: ${lastVariableError}`
						: `Failed to generate variables satisfying conditions after ${MAX_CONDITION_RETRIES} retries. Conditions: ${conditions.join(', ')}` +
							(lastVariableError !== undefined
								? ` (some draws could not be computed: ${lastVariableError})`
								: '')
				]
			};
		}

		// 5b. Detect expression variable names (convention: name starts with "expression")
		const expressionNames = new Set(
			resolvedVariables.filter((v) => v.name.startsWith('expression')).map((v) => v.name)
		);

		// 5c. Insert <<expr:NAME>> markers in template before variable resolution
		let statementTemplate: TemplateMarkdown = resolvedVariation.statement ?? templateMarkdown('');
		if (expressionNames.size > 0) {
			const markedStatement = insertExpressionMarkers(String(statementTemplate), expressionNames);
			statementTemplate = templateMarkdown(markedStatement);
		}

		// 6. Resolve statement markdown (with expression markers if present). Labyrinthe à
		// parcourir : sa graine posée dans le bloc, tirée de la source de l'instance (chaque
		// instance a son labyrinthe ; écran, corrigé et juge lisent le même)
		const resolvedStatement: ResolvedMarkdown = resolvedMarkdown(
			avecGraines(
				resolveMarkdownContent(
					statementTemplate,
					resolvedVariables,
					random,
					genericFunctions,
					cleanCoefficients,
					capitalPairs
				),
				random
			)
		);

		// 7. Resolve type-specific fields from resolved variation (inferred from structure)
		let resolvedBlanks: InstanceBlank[] | undefined;
		let expressionsArray: QuestionInstance['expressions'] = undefined;
		let finalStatement: ResolvedMarkdown = resolvedStatement;

		// Un bloc ```operation à remplir, ```figure-a-completer ou ```collection à construire
		// porte sa case, même sans `blanks` dans le modèle — dans une question à trous
		// seulement (une carte de cours n'a pas de case)
		const hasOperationBlock =
			(/^\s*>?\s*```(?:operation|figure-a-completer|figure-de-travail)\s*$/m.test(
				String(resolvedStatement)
			) ||
				hasCollectionToBuild(String(resolvedStatement)) ||
				hasMonnaieToBuild(String(resolvedStatement)) ||
				hasLineToPlace(String(resolvedStatement)) ||
				hasHorlogeToPlace(String(resolvedStatement)) ||
				hasStatChartToPlace(String(resolvedStatement)) ||
				hasCourbeToPlace(String(resolvedStatement)) ||
				hasTrigCircleToPlace(String(resolvedStatement)) ||
				hasTortueToProgram(String(resolvedStatement)) ||
				hasCalculToProgram(String(resolvedStatement)) ||
				hasRobotToProduce(String(resolvedStatement)) ||
				hasLabyrintheAParcourir(String(resolvedStatement)) ||
				hasYohakuARemplir(String(resolvedStatement)) ||
				hasRangerToPlace(String(resolvedStatement)) ||
				hasAssocierToPlace(String(resolvedStatement)) ||
				hasTrousToPlace(String(resolvedStatement)) ||
				hasPartageToColorier(String(resolvedStatement)) ||
				hasCubesToBuild(String(resolvedStatement)) ||
				hasPatronsToBuild(String(resolvedStatement)) ||
				hasSolidesToBuild(String(resolvedStatement)) ||
				hasVariationToFill(String(resolvedStatement))) &&
			getQuestionType({ options: template.options }) === 'fill_in_blanks';
		if (resolvedVariation.blanks || hasOperationBlock) {
			// 7a. Fill-in-blanks pipeline
			const templateBlanks = resolvedVariation.blanks ?? [];

			// Resolve answerFormats for expression variables (variable resolution + LaTeX conversion)
			let resolvedAnswerFormats: Record<string, string> | undefined;
			if (expressionNames.size > 0) {
				resolvedAnswerFormats = {};
				for (const exprName of Array.from(expressionNames)) {
					// Sans format : une case par `?` de l'expression (`(7*?)+?` → 2 cases ; une
					// expression à cases n'affiche pas son format, cf. fill-blanks-utils)
					const holes = (
						resolvedVariables.find((v) => v.name === exprName)?.value.match(/\?/g) ?? []
					).length;
					const rawFormat =
						resolvedVariation.answerFormats?.[exprName] ?? '?'.repeat(Math.max(1, holes));
					resolvedAnswerFormats[exprName] = resolveAnswerFormat(
						rawFormat,
						resolvedVariables,
						random,
						genericFunctions,
						capitalPairs
					);
				}
			}

			// Call assignBlankIndices (? → \placeholder[N]{}, [_] → {{blank:N}})
			const blankResult = assignBlankIndices(String(resolvedStatement), resolvedAnswerFormats);

			if (blankResult.operationErrors) {
				return { success: false, errors: blankResult.operationErrors };
			}
			if (blankResult.constructionErrors) {
				return { success: false, errors: blankResult.constructionErrors };
			}
			if (blankResult.buildErrors) {
				return { success: false, errors: blankResult.buildErrors };
			}
			if (blankResult.choiceErrors) {
				return { success: false, errors: blankResult.choiceErrors };
			}
			if (blankResult.variationErrors) {
				return { success: false, errors: blankResult.variationErrors };
			}

			// Cases des blocs ```choix : choix et réglages lus ici ; bonne réponse portée par
			// la case (`expectedAnswer`), lue et le mélange tiré à son rang (plus bas)
			const choiceCases = new Map<number, ChoiceBlockSpec>();
			for (const [key, body] of Object.entries(blankResult.choiceBlanks ?? {})) {
				const index = Number(key);
				const spec = parseChoiceBody(body.split('\n'));
				const errors = [...spec.errors];
				if (spec.caseIndex !== undefined) {
					errors.unshift('case: est posée automatiquement, retirer cette ligne du bloc');
				}
				if (template.options?.orderIndependent) {
					errors.push('une case choix ne se combine pas avec « ordre indifférent »');
				}
				if (errors.length > 0) {
					return {
						success: false,
						errors: [`Case ${index + 1} (bloc choix) : ${errors.join(' ; ')}`]
					};
				}
				choiceCases.set(index, spec);
			}

			// Cases des blocs ```figure-a-completer : la figure de l'élève, jugée par les
			// vérifications du bloc (positions lues au jugement, cf. questions/construction)
			const constructionCases = new Map<number, NonNullable<InstanceBlank['construction']>>();
			for (const [key, source] of Object.entries(blankResult.constructionBlanks ?? {})) {
				const index = Number(key);
				const header = readConstructionHeader(source);
				const errors = [...header.errors, ...parseFigureContent(header.figureSource).errors];
				// `verifier: ?` : forme réservée à l'énoncé envoyé pendant une évaluation
				if (header.spec.masked) errors.unshift({ message: MASKED_IN_TEMPLATE });
				if (header.spec.caseIndex !== undefined) {
					errors.unshift({
						message: 'case: est posée automatiquement, retirer cette ligne du bloc'
					});
				}
				// Faute de frappe dans `verifier:` : vue ici (lecture légère des noms affectés,
				// `Z = …`), sinon l'élève aurait un « faux » pour une erreur de l'auteur
				const named = namesAssignedIn(header.figureSource);
				// Figure composée (outil n° 45) : un point construit à une étape d'avant n'est pas nommé
				const builtBefore = new Set<string>();
				for (const check of header.spec.checks) {
					// Symétrique : l'axe ou le centre est nommé aussi (`d = droite(P, Q)`, `O = point(…)`) ;
					// point à placer : son expression est calculée à la publication (`check-template`) ;
					// triangle (lot 4) : A, B et ce qui donne les longueurs, C est à construire
					// angle (lot 5) : A et O (`check.points`), le côté est à tracer
					// segment de longueur donnée (ADR 0036) : A seulement, B est à tracer
					// carré / rectangle coté (PR 6 de `regle-graduee`) : A et B, C et D sont à construire
					const names =
						check.kind === 'point' || check.kind === 'droite' || check.kind === 'cercle'
							? []
							: check.kind === 'segment_par'
								? check.points.filter((name) => !builtBefore.has(name))
								: isRuledPolygonCheck(check)
									? check.points.slice(0, 2)
									: // Rectangle sans équerre : A et C (la diagonale), B et D sont à construire
										isDiagonalRectangleCheck(check)
										? [check.points[0], check.points[2]]
										: check.kind === 'segment'
											? [check.point]
											: check.kind === 'symetrique'
												? [...(check.points ?? []), check.by]
												: check.kind === 'triangle'
													? check.model
														? // Reproduire (n° 47) : le modèle et A ; B seulement s'il est tracé
															[...check.model, check.points[0]]
														: [
																check.points[0],
																check.points[1],
																// En carreaux (n° 20), rien à nommer
																...check.lengths.flatMap((l) => ('source' in l ? l.source : []))
															]
													: check.points;
					for (const name of compositeBuiltNames(check)) builtBefore.add(name);
					for (const name of names) {
						if (!named.has(name)) {
							errors.push({
								message: `Ligne ${check.line} : le point ${name} n’est pas nommé dans la figure (écrire « ${name} = … »)`
							});
						}
					}
				}
				if (template.options?.orderIndependent) {
					errors.push({ message: 'une case figure ne se combine pas avec « ordre indifférent »' });
				}
				if (errors.length > 0) {
					return {
						success: false,
						errors: [
							`Case ${index + 1} (bloc figure-a-completer) : ${errors.map((e) => e.message).join(' ; ')}`
						]
					};
				}
				constructionCases.set(index, { source, checks: header.spec.checks });
			}
			// Cases des blocs ```figure-de-travail : l'élève trace pour vérifier, jamais
			// notées (retirées avant toute notation, cf. `gradedPart`) ; « ordre
			// indifférent » permis, elles ne sont jamais appariées
			for (const [key, source] of Object.entries(blankResult.workFigureBlanks ?? {})) {
				const index = Number(key);
				const header = readConstructionHeader(source, { work: true });
				const errors = [...header.errors, ...parseFigureContent(header.figureSource).errors];
				if (header.spec.caseIndex !== undefined) {
					errors.unshift({
						message: 'case: est posée automatiquement, retirer cette ligne du bloc'
					});
				}
				if (errors.length > 0) {
					return {
						success: false,
						errors: [
							`Case ${index + 1} (bloc figure-de-travail) : ${errors.map((e) => e.message).join(' ; ')}`
						]
					};
				}
				constructionCases.set(index, { source, checks: [], work: true });
			}
			const workFigureCount = [...constructionCases.values()].filter((c) => c.work).length;
			if (workFigureCount > 0 && workFigureCount === blankResult.totalBlanks) {
				return { success: false, errors: [WORK_FIGURE_ALONE_MESSAGE] };
			}

			// Cases des blocs ```operation : réponse calculée par le bloc, jamais écrite
			const operationAnswers = new Map<number, string>();
			for (const [key, source] of Object.entries(blankResult.operationBlanks ?? {})) {
				const index = Number(key);
				// Division euclidienne : la case du reste suit celle du quotient, déjà traitée
				if (operationAnswers.has(index)) continue;
				const node = parseOperationContent(source);
				if (node.caseIndex !== undefined) {
					return {
						success: false,
						errors: [
							`Case ${index + 1} (bloc operation) : case: est posée automatiquement, retirer cette ligne du bloc`
						]
					};
				}
				if (node.spec === null || node.errors.length > 0) {
					return {
						success: false,
						errors: [
							`Case ${index + 1} (bloc operation) : ${node.errors.map((e) => e.message).join(' ; ')}`
						]
					};
				}
				const answers =
					node.spec.operator === '÷'
						? divisionExpectedAnswers(node.spec)
						: [operationExpectedAnswer(node.spec)];
				answers.forEach((answer, k) => operationAnswers.set(index + k, answer));
			}

			// Cases des blocs ```collection et ```monnaie à construire, des droites et
			// horloges à placer, des barres à construire : réponse = la valeur du bloc
			const buildAnswers = new Map<number, { kind: BuildKind; answer: string }>();
			// Étiquettes à ranger : ordre AFFICHÉ de chaque bloc, par case de sa première place
			const rangerOrders = new Map<
				number,
				{ order: number[]; labels: string[]; sign: RangerSign }
			>();
			// Éléments à associer : ordre AFFICHÉ des étiquettes de chaque bloc, par case de son premier élément
			const associerOrders = new Map<
				number,
				{ order: number[]; gesture: AssocierGesture; items: string[]; labels: string[] }
			>();
			// Texte à trous : ordre AFFICHÉ de la réserve de chaque bloc, par case de son premier trou
			const trousOrders = new Map<
				number,
				{ order: number[]; lines: TrousSegment[][]; labels: string[] }
			>();
			for (const [key, { kind, source, point }] of Object.entries(blankResult.buildBlanks ?? {})) {
				const index = Number(key);
				const read = buildAnswerOf(kind, source, point);
				const errors = 'errors' in read ? read.errors : [];
				// Le juge apparierait une construction avec une autre case (34 tapé ailleurs)
				if (template.options?.orderIndependent) {
					errors.push(
						`${kind === 'cubes' || kind === 'patron' || kind === 'solide' || kind === 'courbe' || kind === 'trig' || kind === 'tortue' || kind === 'calcul' || kind === 'robot' || kind === 'labyrinthe' ? 'un' : 'une'} ${kind === 'partage' || kind === 'cubes' || kind === 'patron' || kind === 'solide' || kind === 'tortue' || kind === 'calcul' || kind === 'robot' || kind === 'labyrinthe' || kind === 'yohaku' ? buildKindName(kind) : isPlaceKind(kind) ? `${buildKindName(kind)} à placer` : 'case à construire'} ne se combine pas avec « ordre indifférent »`
					);
				}
				if (errors.length > 0 || !('answer' in read)) {
					return {
						success: false,
						errors: [`Case ${index + 1} (${buildKindName(kind)}) : ${errors.join(' ; ')}`]
					};
				}
				if (kind === 'ranger') {
					// Mélange du bloc à sa première place, sur la source de hasard de l'instance ;
					// réponse = la position affichée de l'étiquette écrite à ce rang
					const first = index - (point ?? 0);
					let shown = rangerOrders.get(first);
					if (!shown) {
						const { labels, sign } = parseRangerContent(source);
						shown = { order: rangerOrder(labels.length, random), labels, sign };
						rangerOrders.set(first, shown);
					}
					buildAnswers.set(index, {
						kind,
						answer: String(shown.order.indexOf(Number(read.answer)))
					});
					continue;
				}
				if (kind === 'associer') {
					// Mélange des étiquettes au premier élément du bloc ; réponse = la position
					// affichée de la bonne étiquette de l'élément
					const first = index - (point ?? 0);
					let shown = associerOrders.get(first);
					if (!shown) {
						const { gesture, items, labels } = parseAssocierContent(source);
						shown = { order: rangerOrder(labels.length, random), gesture, items, labels };
						associerOrders.set(first, shown);
					}
					buildAnswers.set(index, {
						kind,
						answer: String(shown.order.indexOf(Number(read.answer)))
					});
					continue;
				}
				if (kind === 'trous') {
					// Mélange de la réserve au premier trou du bloc ; réponse = la position
					// affichée de la bonne étiquette du trou
					const first = index - (point ?? 0);
					let shown = trousOrders.get(first);
					if (!shown) {
						const { lines, labels } = parseTrousContent(source);
						shown = { order: rangerOrder(labels.length, random), lines, labels };
						trousOrders.set(first, shown);
					}
					buildAnswers.set(index, {
						kind,
						answer: String(shown.order.indexOf(Number(read.answer)))
					});
					continue;
				}
				buildAnswers.set(index, { kind, answer: read.answer });
			}
			// Cases des tableaux de signes à compléter : réponse = la cellule cachée du bloc
			const signTableAnswers = new Map<number, SignTableAnswer>();
			for (const [key, { source, cell }] of Object.entries(blankResult.variationBlanks ?? {})) {
				// Un tableau est lu une fois, à sa première case
				if (cell > 0) continue;
				const first = Number(key);
				const read = readSignTableCases(source, first, {
					orderIndependent: template.options?.orderIndependent
				});
				if ('errors' in read) return { success: false, errors: read.errors };
				read.answers.forEach((answer, k) => signTableAnswers.set(first + k, answer));
			}
			if (signTableAnswers.size > 0) {
				// Le tableau que l'écran de l'élève lit vraiment porte chacune de ses cases
				const shown = new Set(
					parseMarkdown(blankResult.statement).children.flatMap((child) =>
						child.type === 'variation-table' ? signTableCaseIndices(child) : []
					)
				);
				for (const index of signTableAnswers.keys()) {
					if (!shown.has(index)) {
						return {
							success: false,
							errors: [
								`Case ${index + 1} (tableau de signes) : bloc illisible à l'écran (fence de fin \`\`\` en retrait, ou bloc dans un bloc de code ?)`
							]
						};
					}
				}
			}

			// Chaque case à construire doit être un bloc que l'écran de l'élève lit vraiment
			// (droite à placer : ses cases, une par point) :
			// une fence de fin en retrait, un bloc montré dans un bloc de code ``` ne le sont
			// pas (repérage ligne à ligne ≠ parseur), et l'élève n'aurait rien où répondre
			if (buildAnswers.size > 0) {
				const shown = new Set(
					parseMarkdown(blankResult.statement).children.flatMap((child) => {
						if (child.type === 'number-line') {
							const first = child.caseIndex;
							if (child.representer !== undefined && first !== undefined) return [first];
							// Droite à graduer : la case des parts, puis une par point
							if (child.graduer !== undefined && first !== undefined) {
								return [first, ...(child.placer ?? []).map((_, k) => first + 1 + k)];
							}
							if (child.placer === undefined || first === undefined) return [];
							return child.placer.map((_, k) => first + k);
						}
						if (child.type === 'courbe') {
							const first = child.caseIndex;
							if ((child.spec?.tracer || child.spec?.vecteur) && first !== undefined)
								return [first];
							if (!child.spec?.placer || first === undefined) return [];
							return child.spec.placer.map((_, k) => first + k);
						}
						if (child.type === 'tortue' || child.type === 'calcul') {
							return child.spec !== null && child.caseIndex !== undefined ? [child.caseIndex] : [];
						}
						if (child.type === 'robot') {
							return child.spec?.produire && child.caseIndex !== undefined ? [child.caseIndex] : [];
						}
						if (child.type === 'labyrinthe') {
							return child.spec?.parcourir && child.caseIndex !== undefined
								? [child.caseIndex]
								: [];
						}
						if (child.type === 'yohaku') {
							return child.spec !== null && child.caseIndex !== undefined ? [child.caseIndex] : [];
						}
						if (child.type === 'trig-circle') {
							const first = child.caseIndex;
							if (!child.placer || first === undefined) return [];
							return child.placer.map((_, k) => first + k);
						}
						if (child.type === 'horloge') {
							return child.spec?.placer !== undefined && child.caseIndex !== undefined
								? [child.caseIndex]
								: [];
						}
						if (child.type === 'partage') {
							return child.spec?.colorier !== undefined &&
								child.errors.length === 0 &&
								child.caseIndex !== undefined
								? [child.caseIndex]
								: [];
						}
						if (child.type === 'espace') {
							return child.spec?.task !== undefined &&
								child.errors.length === 0 &&
								child.caseIndex !== undefined
								? [child.caseIndex]
								: [];
						}
						if (child.type === 'ranger') {
							const first = child.caseIndex;
							if (first === undefined) return [];
							return child.labels.map((_, k) => first + k);
						}
						if (child.type === 'associer') {
							const first = child.caseIndex;
							if (first === undefined) return [];
							return child.items.map((_, k) => first + k);
						}
						if (child.type === 'trous') {
							const first = child.caseIndex;
							if (first === undefined) return [];
							return child.answers.map((_, k) => first + k);
						}
						if (child.type === 'stat-chart') {
							const first = child.caseIndex;
							if (first === undefined || !child.spec) return [];
							const cases = child.spec.boxPlot?.toPlace
								? boxPlotCaseCount(child.spec)
								: child.spec.toPlace
									? barsCaseCount(child.spec)
									: 0;
							return Array.from({ length: cases }, (_, k) => first + k);
						}
						return (child.type === 'collection' || child.type === 'monnaie') &&
							child.spec !== null &&
							child.errors.length === 0 &&
							child.caseIndex !== undefined
							? [child.caseIndex]
							: [];
					})
				);
				for (const [index, { kind }] of buildAnswers) {
					if (!shown.has(index)) {
						return {
							success: false,
							errors: [
								`Case ${index + 1} (${buildKindName(kind)}) : bloc illisible à l'écran (fence de fin \`\`\` en retrait, ou bloc dans un bloc de code ?)`
							]
						};
					}
				}
			}

			// Coherence check: totalBlanks must match blanks[] length. Les cases des blocs
			// ```operation peuvent manquer à blanks[] (insérées à leur rang) ; présentes,
			// elles ne donnent que des réglages.
			// Les cases des blocs ```figure-a-completer aussi.
			const isBlockCase = (index: number) =>
				operationAnswers.has(index) ||
				constructionCases.has(index) ||
				buildAnswers.has(index) ||
				signTableAnswers.has(index);
			const blockCaseCount =
				operationAnswers.size + constructionCases.size + buildAnswers.size + signTableAnswers.size;
			let alignedBlanks: TemplateBlank[];
			if (templateBlanks.length === blankResult.totalBlanks) {
				for (const index of operationAnswers.keys()) {
					if ((templateBlanks[index].expectedAnswer ?? '').trim() !== '') {
						return {
							success: false,
							errors: [
								`Case ${index + 1} : sa réponse vient du calcul du bloc operation ; laisser expectedAnswer vide`
							]
						};
					}
				}
				for (const [index, { work }] of constructionCases) {
					if ((templateBlanks[index].expectedAnswer ?? '').trim() !== '') {
						const name = work ? 'figure-de-travail' : 'figure-a-completer';
						return {
							success: false,
							errors: [
								`Case ${index + 1} : sa réponse est la figure de l’élève (bloc ${name}) ; laisser expectedAnswer vide`
							]
						};
					}
				}
				for (const index of signTableAnswers.keys()) {
					if ((templateBlanks[index].expectedAnswer ?? '').trim() !== '') {
						return {
							success: false,
							errors: [
								`Case ${index + 1} : sa réponse vient du tableau de signes ; laisser expectedAnswer vide`
							]
						};
					}
				}
				for (const [index, { kind }] of buildAnswers) {
					if ((templateBlanks[index].expectedAnswer ?? '').trim() !== '') {
						return {
							success: false,
							errors: [
								`Case ${index + 1} : sa réponse est ${blockAnswerName(kind)} ; laisser expectedAnswer vide`
							]
						};
					}
				}
				alignedBlanks = templateBlanks;
			} else if (templateBlanks.length === blankResult.totalBlanks - blockCaseCount) {
				const others = [...templateBlanks];
				alignedBlanks = Array.from({ length: blankResult.totalBlanks }, (_, index) =>
					isBlockCase(index) ? { expectedAnswer: '' } : others.shift()!
				);
			} else {
				return {
					success: false,
					errors: [
						`Blank count mismatch: statement has ${blankResult.totalBlanks} blank(s) but blanks[] has ${templateBlanks.length} entry/entries`
					]
				};
			}

			// Use modified statement from assignBlankIndices
			finalStatement = resolvedMarkdown(blankResult.statement);

			// Build instance.blanks[] with inferred types and merged validation
			// Ordre affiché de chaque case choix (posé dans le bloc de l'énoncé, plus bas)
			const choiceOrders = new Map<number, NonNullable<InstanceBlank['choice']>>();
			resolvedBlanks = alignedBlanks.map((templateBlank, i) => {
				const choiceSpec = choiceCases.get(i);
				if (choiceSpec) {
					// Bonne réponse : indice(s) d'origine, dynamique possible (`{{eval:…}}`, `{{if:…}}`)
					const raw = resolveVariableConditionals(
						templateBlank.expectedAnswer ?? '',
						resolvedVariables,
						{
							strict: true
						}
					);
					const resolved = raw.includes('{{')
						? resolveExpression(raw, resolvedVariables, random)
						: raw;
					const expected = readExpectedChoices(
						resolved,
						choiceSpec.choices.length,
						choiceSpec.multiple,
						{ computed: (templateBlank.expectedAnswer ?? '').includes('{{') }
					);
					if (expected.errors.length > 0) {
						throw new Error(`Case ${i + 1} (bloc choix) : ${expected.errors.join(' ; ')}`);
					}
					// Mélange de la case, sur la source de hasard de l'instance (à son rang)
					const order = choiceSpec.shuffle
						? shuffleChoices(
								choiceSpec.choices.map((content) => ({
									content: resolvedMarkdown(content),
									isCorrect: false
								})),
								random
							).map((choice) => choice.originalIndex)
						: choiceSpec.choices.map((_, index) => index);
					const choice = { choices: choiceSpec.choices, order, multiple: choiceSpec.multiple };
					choiceOrders.set(i, choice);
					return {
						expectedAnswer: formatChoiceAnswer(expected.indexes),
						type: 'choice',
						choice
					};
				}
				const construction = constructionCases.get(i);
				if (construction?.work) {
					// Figure de travail : rien d'attendu, jamais notée
					return { expectedAnswer: '', type: 'graphical', construction };
				}
				if (construction) {
					// Réponse attendue symbolique (`droite(A;B)`, `symetrique(d)`) : affichage du corrigé
					return {
						expectedAnswer: construction.checks
							.map((check) =>
								check.kind === 'point'
									? `point(${check.name})`
									: check.kind === 'droite'
										? `droite(${check.name})`
										: check.kind === 'cercle'
											? `cercle(${check.name})`
											: check.kind === 'symetrique'
												? `symetrique(${[...(check.points ?? []), check.by].join(';')})`
												: check.kind === 'segment'
													? `segment(${check.point}${check.end};${check.length}mm)`
													: `droite(${check.points[0]};${check.points[1]})`
							)
							.join('|'),
						type: 'graphical',
						construction
					};
				}
				// Case d'un tableau de signes : sa propre case, sans les réglages de la variation
				// (`answerKind`, unité, précision… jugeraient la valeur de x comme autre chose)
				const signTableAnswer = signTableAnswers.get(i);
				if (signTableAnswer) {
					const tableBlank: InstanceBlank = {
						expectedAnswer: signTableAnswer.answer,
						type: blankResult.blankTypes[i],
						cellule: signTableAnswer.kind,
						expectedAnswerLatex: signTableAnswerLatex(signTableAnswer),
						// Valeur de x jugée par équivalence (phase 0) : `1,5` vaut `\frac{3}{2}`
						...(signTableAnswer.kind === 'valeur' && { acceptDecimal: true })
					};
					// Case valeur (valeur, limite) : erreurs prévues comme une case de calcul
					// (chantier `variation-limite-infinie`) ; signe, marque, flèche : refusées plus bas
					const tableErrors = templateBlank.expectedErrors ?? [];
					if (signTableAnswer.kind === 'valeur' && tableErrors.length > 0) {
						tableBlank.expectedErrors = tableErrors.map((error, k) => {
							try {
								const raw = resolveVariableConditionals(error.answer, resolvedVariables, {
									strict: true
								});
								const normalized = normalizeAnswerExpression(raw, resolvedVariables);
								const answer = normalized.includes('{{')
									? resolveExpression(normalized, resolvedVariables, errorRandom)
									: normalized;
								return {
									answer,
									answerLatex:
										infinityToken(answer) ??
										convertToLatex(answer, genericFunctions, false, capitalPairs),
									message: error.message,
									...(error.label !== undefined && { label: error.label })
								};
							} catch (cause) {
								const reason = cause instanceof Error ? cause.message : String(cause);
								throw new Error(`Case ${i + 1}, erreur prévue ${k + 1} : ${reason}`);
							}
						});
					}
					if (templateBlank.neverChoice === true) tableBlank.neverChoice = true;
					return tableBlank;
				}
				const operationAnswer = operationAnswers.get(i);
				const buildAnswer = buildAnswers.get(i);
				const blockAnswer = operationAnswer ?? buildAnswer?.answer;
				const blank =
					blockAnswer === undefined
						? templateBlank
						: { ...templateBlank, expectedAnswer: blockAnswer };
				// Resolve expectedAnswer:
				// - Math blanks: normalize then resolve, like variables do.
				//   normalizeExpression converts "eval:a+b" → "{{eval:a+b}}", etc.
				// - Text blanks: only resolve if already contains {{...}}.
				//   Bare words like "pair", "entier" are literal text, not variable refs.
				// `{{if:…}}` tranché d'abord : sinon son `|` est lu comme une liste de tirage
				const rawExpected = resolveVariableConditionals(blank.expectedAnswer, resolvedVariables, {
					strict: true
				});
				// `;hms` écrit une durée pour l'affichage (`{2[h]}{15[min]}`) : jamais une réponse attendue
				if (/;[^{}]*\bhms\b/.test(rawExpected)) {
					throw new Error(
						`;hms sert à l'affichage d'une durée, pas à une réponse attendue : ${rawExpected} (écrire la durée dans une seule unité, ex. ;[min])`
					);
				}
				const isMathBlank = blankResult.blankTypes[i] === 'math';
				const answerKind = blank.answerKind ?? resolvedVariation.blankDefaults?.answerKind;
				// Bouton « impossible » : case mathématique ordinaire seulement (ignoré sinon) — ni
				// nature de réponse, ni case d'un bloc (opération, geste à construire)
				const isOrdinaryMathBlank =
					isMathBlank && answerKind === undefined && blockAnswer === undefined;
				const impossibleLabel = isOrdinaryMathBlank
					? (blank.impossibleLabel ?? resolvedVariation.blankDefaults?.impossibleLabel)
					: undefined;
				// Tirage sans réponse : `impossible` n'est pas une expression (lu i·m·p·o…)
				const impossibleDraw = isMathBlank && isImpossibleExpected(rawExpected);
				if (impossibleDraw) assertImpossibleAllowed(i, isOrdinaryMathBlank, impossibleLabel);
				const normalized = impossibleDraw
					? IMPOSSIBLE_EXPECTED
					: isMathBlank
						? normalizeAnswerExpression(rawExpected, resolvedVariables)
						: rawExpected;
				const resolvedExpected = normalized.includes('{{')
					? resolveExpression(normalized, resolvedVariables, random)
					: normalized;
				// Option du modèle : `1x-1y+0=0` → `x-y=0` (case mathématique sans unité ni
				// ensemble ; une formule illisible reste telle quelle)
				const isCleanable =
					cleanCoefficients &&
					isMathBlank &&
					!(blank.unit ?? resolvedVariation.blankDefaults?.unit) &&
					answerKind !== 'intervalles' &&
					answerKind !== 'vecteur' &&
					answerKind !== 'matrice';
				// Unité imposée : l'attendu s'écrit dans cette unité (`1.5[km]` → `1500[m]`)
				const required = (blank.unit ?? resolvedVariation.blankDefaults?.unit)?.required;
				const expectedAnswer = impossibleDraw
					? IMPOSSIBLE_EXPECTED
					: isCleanable
						? cleanCoefficientsCustom(resolvedExpected, genericFunctions, capitalPairs)
						: required
							? expectedInRequiredUnit(resolvedExpected, required)
							: resolvedExpected;

				// `i` matches the blank counter assigned by `assignBlankIndices`
				// (left-to-right, consecutive, 0-based). If that contract changes,
				// this lookup silently returns undefined.
				const expressionName = blankResult.expressionNameByIndex?.[i];
				const vectorMode = blank.vectorMode ?? resolvedVariation.blankDefaults?.vectorMode;
				const openableBounds =
					blank.openableBounds ?? resolvedVariation.blankDefaults?.openableBounds;
				const angleModulo = blank.angleModulo ?? resolvedVariation.blankDefaults?.angleModulo;
				const calculusFields = resolveCalculusFields(
					answerKind,
					blank,
					resolvedVariation.blankDefaults,
					resolvedVariables,
					random
				);
				const resolved: InstanceBlank = {
					expectedAnswer,
					type: blankResult.blankTypes[i],
					precision: blank.precision ?? resolvedVariation.blankDefaults?.precision,
					// Même héritage que le reste : case > blankDefaults > variation/shared
					// (resolvedVariation.requiredForm = variation ?? shared).
					// Un motif peut nommer les nombres tirés (`{{a}} / {{b}}` → `9 / 3`)
					requiredForm: resolveRequiredForm(
						blank.requiredForm ??
							resolvedVariation.blankDefaults?.requiredForm ??
							resolvedVariation.requiredForm,
						resolvedVariables,
						random
					),
					validationRules: resolveValidationRules(
						blank.validationRules ?? resolvedVariation.validationRules,
						resolvedVariables,
						random
					),
					unit: blank.unit ?? resolvedVariation.blankDefaults?.unit,
					...((blank.rulesSuffice ?? resolvedVariation.blankDefaults?.rulesSuffice) && {
						rulesSuffice: true
					}),
					...((blank.acceptDecimal ?? resolvedVariation.blankDefaults?.acceptDecimal) && {
						acceptDecimal: true
					}),
					...((blank.acceptCombinatorialNotation ??
						resolvedVariation.blankDefaults?.acceptCombinatorialNotation) && {
						acceptCombinatorialNotation: true
					}),
					...(answerKind && { answerKind }),
					...(answerKind === 'vecteur' && vectorMode && { vectorMode }),
					...(answerKind === 'intervalles' && openableBounds && { openableBounds: true }),
					// Argument « à 2π près » : case ordinaire seulement
					...(answerKind === undefined && angleModulo && { angleModulo }),
					...(impossibleLabel !== undefined && { impossibleLabel }),
					...calculusFields,
					pool: blank.pool,
					...(expressionName !== undefined && { expressionName })
				};
				if (blank.prefilled) {
					resolved.prefilled = resolveExpression(
						normalizeAnswerExpression(blank.prefilled, resolvedVariables),
						resolvedVariables,
						random
					);
					const hasRemoveSpaces =
						blank.removeSpaces ??
						resolvedVariation.blankDefaults?.removeSpaces ??
						template.defaultDisplayOptions?.removeSpaces;
					if (resolved.type === 'math' && hasRemoveSpaces) {
						resolved.prefilled = applyRemoveSpaces(resolved.prefilled);
					}
				}
				// Generate expectedAnswerLatex for math blanks
				if (resolved.type === 'math') {
					// Ensemble en notation intervalle : ni expression ni calcul, rendu à part
					// Vecteur : rendu en colonne ; matrice : en pmatrix
					resolved.expectedAnswerLatex =
						impossibleDraw && impossibleLabel !== undefined
							? impossibleAnswerLatex(impossibleLabel)
							: resolved.answerKind === 'intervalles'
								? expectedIntervalsLatex(resolved.expectedAnswer)
								: resolved.answerKind === 'vecteur'
									? expectedVectorLatex(resolved.expectedAnswer)
									: resolved.answerKind === 'matrice'
										? expectedMatrixLatex(resolved.expectedAnswer)
										: convertToLatex(
												resolved.expectedAnswer,
												genericFunctions,
												isCleanable,
												capitalPairs
											);
				}
				if (operationAnswer !== undefined) {
					resolved.operation = true;
					resolved.expectedAnswerLatex = toFrenchDecimal(operationAnswer);
				}
				if (buildAnswer !== undefined) {
					resolved.construire = buildAnswer.kind;
					// Programme tortue ou de calcul : le corrigé montre le programme, sans la
					// comparaison ni les essais ; robot : le code, sans la scène
					resolved.expectedAnswerLatex =
						buildAnswer.kind === 'labyrinthe'
							? ecrireChemin(readExpectedLabyrintheAnswer(buildAnswer.answer)?.chemin ?? [])
							: buildAnswer.kind === 'yohaku'
								? (() => {
										const attendu = readExpectedYohakuAnswer(buildAnswer.answer);
										return attendu ? yohakuSolutionAnswer(attendu) : buildAnswer.answer;
									})()
								: buildAnswer.kind === 'tortue'
									? (readExpectedTortueAnswer(buildAnswer.answer)?.attendu ?? buildAnswer.answer)
									: buildAnswer.kind === 'calcul'
										? (readExpectedCalculAnswer(buildAnswer.answer)?.attendu ?? buildAnswer.answer)
										: buildAnswer.kind === 'robot'
											? (readExpectedRobotAnswer(buildAnswer.answer)?.solution ??
												buildAnswer.answer)
											: buildAnswer.answer;
				}
				// Erreurs prévues : réponses résolues comme l'attendu ; messages plus bas,
				// une fois toutes les cases connues (`{{solution}}` permis)
				const expectedErrors = templateBlank.expectedErrors ?? [];
				if (expectedErrors.length > 0) {
					if (
						resolved.type !== 'math' ||
						resolved.construire !== undefined ||
						resolved.rulesSuffice === true ||
						// Primitive, solution d'équation différentielle : jugées sur `integrand` /
						// `equation`, jamais sur l'attendu — une erreur prévue n'y serait jamais vue
						resolved.answerKind === 'primitive' ||
						resolved.answerKind === 'solution-ed' ||
						resolved.answerKind === 'resolution' ||
						template.options?.orderIndependent === true
					) {
						throw new Error(
							`Case ${i + 1} : une erreur prévue ne va que dans une case à écriture mathématique ordinaire (ni texte, ni geste, ni primitive, ni solution d'équation différentielle, ni résolution ligne par ligne, ni case jugée par ses règles seules, ni cases appariées librement)`
						);
					}
					resolved.expectedErrors = expectedErrors.map((error, k) => {
						try {
							const raw = resolveVariableConditionals(error.answer, resolvedVariables, {
								strict: true
							});
							// Erreur prévue « l'élève a cliqué le bouton » (tirage qui a une réponse) :
							// pas une expression, jamais lue par le parseur
							if (isImpossibleExpected(raw)) {
								assertImpossibleAllowed(i, isOrdinaryMathBlank, impossibleLabel);
								return {
									answer: IMPOSSIBLE_EXPECTED,
									answerLatex: impossibleAnswerLatex(impossibleLabel),
									message: error.message,
									...(error.label !== undefined && { label: error.label })
								};
							}
							const normalizedError = normalizeAnswerExpression(raw, resolvedVariables);
							const resolvedError = normalizedError.includes('{{')
								? resolveExpression(normalizedError, resolvedVariables, errorRandom)
								: normalizedError;
							const answer = isCleanable
								? cleanCoefficientsCustom(resolvedError, genericFunctions, capitalPairs)
								: required
									? expectedInRequiredUnit(resolvedError, required)
									: resolvedError;
							const answerLatex =
								answerKind === 'intervalles'
									? expectedIntervalsLatex(answer)
									: answerKind === 'vecteur'
										? expectedVectorLatex(answer)
										: answerKind === 'matrice'
											? expectedMatrixLatex(answer)
											: convertToLatex(answer, genericFunctions, isCleanable, capitalPairs);
							return {
								answer,
								answerLatex,
								message: error.message,
								...(error.label !== undefined && { label: error.label })
							};
						} catch (cause) {
							const reason = cause instanceof Error ? cause.message : String(cause);
							throw new Error(`Case ${i + 1}, erreur prévue ${k + 1} : ${reason}`);
						}
					});
				}
				if (templateBlank.neverChoice === true) resolved.neverChoice = true;
				return resolved;
			});
			// Erreur prévue sur une case sortie plus tôt (choix, figure, tableau de signes)
			alignedBlanks.forEach((templateBlank, i) => {
				if (
					(templateBlank.expectedErrors?.length ?? 0) > 0 &&
					!resolvedBlanks?.[i]?.expectedErrors
				) {
					throw new Error(
						`Case ${i + 1} : une erreur prévue ne va que dans une case à écriture mathématique ordinaire (ni choix, ni figure, ni case de tableau)`
					);
				}
			});

			// Blocs ```choix de l'énoncé : choix dans l'ordre AFFICHÉ, `melanger:` retiré
			if (choiceOrders.size > 0) {
				finalStatement = resolvedMarkdown(
					replaceChoiceBlocks(String(finalStatement), (block) => {
						const choice =
							block.caseIndex === undefined ? undefined : choiceOrders.get(block.caseIndex);
						if (!choice || block.caseIndex === undefined) return '';
						return serializeChoiceBlock({
							caseIndex: block.caseIndex,
							multiple: choice.multiple,
							choices: choice.order.map((index) => choice.choices[index])
						});
					})
				);
			}

			// Blocs ```ranger de l'énoncé : étiquettes dans l'ordre AFFICHÉ (l'ordre écrit
			// est la réponse)
			if (rangerOrders.size > 0) {
				finalStatement = resolvedMarkdown(
					replaceRangerBlocks(String(finalStatement), (block) => {
						const shown =
							block.caseIndex === undefined ? undefined : rangerOrders.get(block.caseIndex);
						if (!shown || block.caseIndex === undefined) return '';
						return serializeRangerBlock({
							caseIndex: block.caseIndex,
							sign: shown.sign,
							labels: shown.order.map((index) => shown.labels[index])
						});
					})
				);
			}

			// Blocs ```associer de l'énoncé : sans les liens, étiquettes dans l'ordre AFFICHÉ
			if (associerOrders.size > 0) {
				finalStatement = resolvedMarkdown(
					replaceAssocierBlocks(String(finalStatement), (block) => {
						const shown =
							block.caseIndex === undefined ? undefined : associerOrders.get(block.caseIndex);
						if (!shown || block.caseIndex === undefined) return '';
						return serializeAssocierBlock({
							caseIndex: block.caseIndex,
							gesture: shown.gesture,
							items: shown.items,
							labels: shown.order.map((index) => shown.labels[index])
						});
					})
				);
			}

			// Blocs ```trous de l'énoncé : trous vides, réserve dans l'ordre AFFICHÉ
			if (trousOrders.size > 0) {
				finalStatement = resolvedMarkdown(
					replaceTrousBlocks(String(finalStatement), (block) => {
						const shown =
							block.caseIndex === undefined ? undefined : trousOrders.get(block.caseIndex);
						if (!shown || block.caseIndex === undefined) return '';
						return serializeTrousBlock({
							caseIndex: block.caseIndex,
							lines: shown.lines,
							labels: shown.order.map((index) => shown.labels[index])
						});
					})
				);
			}

			// Build instance.expressions[] from expression variables
			if (expressionNames.size > 0) {
				expressionsArray = [];
				for (const exprName of Array.from(expressionNames)) {
					const variable = resolvedVariables.find((v) => v.name === exprName);
					if (!variable) {
						return {
							success: false,
							errors: [
								`Expression variable "${exprName}" referenced in statement but not found in resolved variables`
							]
						};
					}
					expressionsArray.push({
						name: exprName,
						latex: convertToLatex(variable.value, genericFunctions, false, capitalPairs),
						displayLatex: variable.displayValue ?? undefined,
						answerFormat: blankResult.answerFormats?.[exprName],
						value: variable.value
					});
				}
			}
		}

		// 7c. Resolve correction with pseudo-variables (AFTER blanks)
		let resolvedCorrection: ResolvedCorrection | undefined;
		if (resolvedVariation.correction) {
			const correctionContext = buildCorrectionContext(resolvedBlanks, resolvedVariables);

			const { feedback, steps, generatedSteps } = resolvedVariation.correction;
			resolvedCorrection = {};

			// Mode B — copy `generatedSteps` declaration as-is (no resolution :
			// `expression` / `equation` may still hold `{{vars}}` ; resolution
			// happens inside `generateCorrection()` later in the pipeline).
			if (generatedSteps) {
				resolvedCorrection.generatedSteps = generatedSteps;
			}

			if (feedback) {
				resolvedCorrection.feedback = {};
				if (feedback.correct) {
					resolvedCorrection.feedback.correct = resolveCorrectionContent(
						feedback.correct,
						resolvedVariables,
						correctionContext,
						random,
						genericFunctions,
						cleanCoefficients,
						capitalPairs
					);
				}
				if (feedback.incorrect) {
					resolvedCorrection.feedback.incorrect = resolveCorrectionContent(
						feedback.incorrect,
						resolvedVariables,
						correctionContext,
						random,
						genericFunctions,
						cleanCoefficients,
						capitalPairs
					);
				}
				if (feedback.partial) {
					resolvedCorrection.feedback.partial = resolveCorrectionContent(
						feedback.partial,
						resolvedVariables,
						correctionContext,
						random,
						genericFunctions,
						cleanCoefficients,
						capitalPairs
					);
				}
			}

			if (steps) {
				resolvedCorrection.steps = steps.map((step) =>
					resolveCorrectionContent(
						step,
						resolvedVariables,
						correctionContext,
						random,
						genericFunctions,
						cleanCoefficients,
						capitalPairs
					)
				);
			}
		}

		// 7 bis. Messages des erreurs prévues, résolus comme le corrigé (variables,
		// `{{solution}}`), sur leur propre source de hasard
		if (resolvedBlanks?.some((blank) => blank.expectedErrors)) {
			const errorContext = buildCorrectionContext(resolvedBlanks, resolvedVariables);
			for (const blank of resolvedBlanks) {
				blank.expectedErrors = blank.expectedErrors?.map((error) => ({
					...error,
					message: String(
						resolveCorrectionContent(
							templateMarkdown(error.message),
							resolvedVariables,
							errorContext,
							errorRandom,
							genericFunctions,
							cleanCoefficients,
							capitalPairs
						)
					).trim()
				}));
			}
		}

		// 7 ter. Coup de pouce (idée 5) : la première étape déjà résolue, ou l'indice
		// écrit résolu comme le corrigé, sur sa propre source de hasard
		let hint: ResolvedMarkdown | undefined;
		if (resolvedVariation.hintFromFirstStep) {
			hint = resolvedCorrection?.steps?.[0];
		} else if (resolvedVariation.hint) {
			hint = resolveCorrectionContent(
				resolvedVariation.hint,
				resolvedVariables,
				buildCorrectionContext(resolvedBlanks, resolvedVariables),
				createRandomSource(seed === undefined ? undefined : hintSeed(seed)),
				genericFunctions,
				cleanCoefficients,
				capitalPairs
			);
		}

		// Résolu en vide (`{{if:…}}` faux) : pas de coup de pouce plutôt qu'un bouton vide
		if (hint !== undefined && String(hint).trim() === '') hint = undefined;

		// 8. Construct instance
		const instance: QuestionInstance = {
			templateId: template.id,
			statement: finalStatement,
			resolvedVariables,
			exerciseInstruction: template.exerciseInstruction,
			options: template.options,
			...(genericFunctionNames && { genericFunctions: genericFunctionNames }),
			capitalPairs,
			grades: template.grades,
			level: template.level,
			delay: template.delay,
			correction: resolvedCorrection,
			...(hint !== undefined && { hint }),
			blanks: resolvedBlanks,
			expressions: expressionsArray,
			requiredForm: resolveRequiredForm(resolvedVariation.requiredForm, resolvedVariables, random),
			generatedAt: new Date().toISOString(),
			seed,
			selectedVariationIndex: variationIndex
		};

		// 9. Mode B — pre-render pedagogical steps if `correction.generatedSteps`
		// was declared. Strict early-return inside when absent, so this is a
		// no-op for the vast majority of templates. Coupling with
		// `correction-generator.ts` is intentional and unidirectional.
		const finalInstance = generateCorrection(instance, { cleanCoefficients });

		return {
			success: true,
			instance: finalInstance
		};
	} catch (error) {
		return {
			success: false,
			errors: [error instanceof Error ? error.message : `Unknown error: ${String(error)}`]
		};
	}
}

/**
 * Generate multiple instances from a template
 *
 * Useful for creating practice sets or test banks.
 *
 * @param template - Question template
 * @param count - Number of instances to generate
 * @param baseSeed - Base seed (instances will use baseSeed + index)
 * @returns Array of generation results
 */
export function generateMultipleInstances(
	template: QuestionTemplate,
	count: number,
	baseSeed?: number
): GenerationResult[] {
	const results: GenerationResult[] = [];

	for (let i = 0; i < count; i++) {
		const seed = baseSeed !== undefined ? baseSeed + i : undefined;
		results.push(generateInstance(template, seed));
	}

	return results;
}
