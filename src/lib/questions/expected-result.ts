/**
 * Résultat attendu — premier niveau de correction (chantier « résultat attendu »)
 * ==============================================================================
 *
 * Construit, depuis une instance (et la réponse de l'élève s'il y en a une), une
 * DESCRIPTION en données de ce que l'élève voit d'abord : la comparaison
 * `3 + 5 ≠ 9` puis `= 8`, l'énoncé rempli par les solutions, « Ta réponse », les
 * choix d'un QCM, les remarques de forme. Spécification R1-R10 :
 * `docs/wip/resultat-attendu-progress.md`.
 *
 * Aucune couleur ici : chaque valeur porte un statut sémantique (`correct`,
 * `unoptimal`, `incorrect`, `empty`, `solution`, `neutral`) que l'écran ou le PDF
 * traduit à sa façon. Les cases restent dans le markdown sous leurs marqueurs
 * habituels (`\placeholder[N]{}` dans une formule, `{{blank:N}}` dans le texte) :
 * `fillMarkdown` les remplace avec le décor choisi par l'appelant.
 *
 * Pur et sans exception (R10) : une instance inattendue donne un résultat réduit.
 */

import { getQuestionType, type QuestionInstance, type ValidationStatus } from './types';
import { rulesDecide } from './rules-suffice';
import { escapeStudentText, neutralizeStudentLatex } from './student-answer-safety';
import {
	validateAnswerDetailed,
	type DetailedVerdict,
	type StudentAnswer
} from '$lib/utils/answer-validator';

// Types
/** Statut d'affichage : la couleur est choisie par l'écran ou le PDF */
export type ExpectedStatus =
	| 'correct'
	| 'unoptimal'
	| 'incorrect'
	| 'empty'
	| 'solution'
	| 'neutral';

/** Valeur à mettre dans une case : solution, ou réponse de l'élève */
export interface ExpectedFill {
	index: number;
	/** `math` : LaTeX, dans une formule ; `text` : texte, dans une phrase */
	context: 'math' | 'text';
	/**
	 * LaTeX (math) ou texte. Réponse d'élève : telle que saisie, mais NEUTRALISÉE
	 * (`student-answer-safety`) — elle peut être lue par un autre utilisateur.
	 * `null` : case laissée vide (statut `empty`).
	 */
	value: string | null;
	status: ExpectedStatus;
}

export interface ExpectedChoice {
	/** Indice d'origine (`choices[]`) ; les choix sont rangés dans l'ordre AFFICHÉ */
	originalIndex: number;
	/** Markdown du choix */
	content: string;
	checked: boolean;
	isCorrect: boolean;
	status: ExpectedStatus;
}

export type ExpectedLine =
	/** R1 : `lhs = réponse` (juste, forme) ou `lhs ≠ réponse` (valeur fausse) */
	| { kind: 'comparison'; lhs: string; relation: '=' | '≠'; answer: ExpectedFill }
	/**
	 * R1 : `= solution`, encadrée ; `possible` → « Une réponse possible : » (R7).
	 * Aussi R9 d'un calcul R1 (sans réponse) : `lhs = solution`, seule.
	 */
	| { kind: 'solution'; lhs: string; latex: string; possible: boolean }
	/** R3/R9 : énoncé rempli par les solutions ; `possible` → « Une réponse possible : » */
	| { kind: 'filled-statement'; markdown: string; fills: ExpectedFill[]; possible: boolean }
	/** R3 : « Ta réponse : » — l'énoncé rempli par les cases de l'élève */
	| { kind: 'your-answer'; markdown: string; fills: ExpectedFill[] }
	/** R5 */
	| { kind: 'choices'; choices: ExpectedChoice[] }
	/** R2 : remarque de forme, rattachée à sa case */
	| { kind: 'remark'; index: number | null; text: string }
	/** R8/R10 : réponse attendue seule (case graphique, ou introuvable dans l'énoncé) */
	| {
			kind: 'expected-only';
			index: number;
			context: 'math' | 'text';
			value: string;
			/** R7 : « Une réponse possible : » plutôt que « Réponse attendue : » */
			possible: boolean;
			studentAnswer?: string;
			studentStatus?: ExpectedStatus;
	  }
	| { kind: 'empty'; text: string };

export interface ExpectedResult {
	/** Statut global (celui de `validateAnswer`) ; `null` sans réponse d'élève (R9) */
	status: ValidationStatus | null;
	lines: ExpectedLine[];
}

// Constantes
export const EMPTY_ANSWER_TEXT = "Tu n'as rien répondu.";
/** Case sans valeur connue : pointillés, comme sur une fiche */
const BLANK_TEXT = '……';

/** Une formule : bloc `$$…$$` ou en ligne `$…$` (une seule passe, cf. content-resolver) */
const MATH_ZONE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
/** Marqueur de la convention « expression » en tête de formule */
const EXPR_MARKER = /^\s*<<expr:([A-Za-z0-9_]+)>>/;
const PLACEHOLDER = /\\placeholder\[(\d+)\]\{[^}]*\}/g;
const TEXT_BLANK = /\{\{blank:(\d+)\}\}/g;
/** Les deux marqueurs de case en une passe (une valeur insérée n'est jamais relue) */
const ANY_BLANK = new RegExp(`${PLACEHOLDER.source}|${TEXT_BLANK.source}`, 'g');
/** Formule « membre gauche = case » (R1) */
const LHS_EQUALS_BLANK = /^([\s\S]*?)\s*=\s*\\placeholder\[(\d+)\]\{[^}]*\}\s*$/;
/**
 * Relation dans le membre gauche (dont un second `=`) : ce n'est plus R1. Règle
 * large : toute flèche (`…arrow`, `…Arrow`), toute commande d'inégalité ou
 * d'appartenance, et les symboles Unicode de relation.
 */
const ANY_RELATION = new RegExp(
	[
		String.raw`[<>=≠≤≥≈≡∼≃∈∉⊂⊃⊆⊇→←↔⇒⇐⇔⟹⟸⟺↦]`,
		String.raw`\\[a-zA-Z]*(?:arrow|Arrow)[a-zA-Z]*(?![a-zA-Z])`,
		// Liste fermée (pas de `le…` ouvert : `\left` n'est pas une relation)
		String.raw`\\(?:le|leq|leqq|leqslant|lneq|lneqq|lesssim|nle|nleq|nleqq|nleqslant|ge|geq|geqq|geqslant|gneq|gneqq|gtrsim|nge|ngeq|ngeqq|ngeqslant|lt|gt|ll|gg|lll|ggg|ne|neq|eqsim|approx|approxeq|equiv|sim|simeq|nsim|cong|ncong|propto|asymp|doteq|implies|impliedby|iff|to|gets|mapsto|longmapsto|in|notin|ni|owns|subset|subseteq|subsetneq|nsubseteq|supset|supseteq|supsetneq|nsupseteq|sqsubset|sqsubseteq|sqsupset|sqsupseteq|prec|preceq|succ|succeq|parallel|nparallel|perp|models|vdash|dashv|lessgtr|gtrless|nless|ngtr)(?![a-zA-Z])`
	].join('|')
);
/** Ce qui peut suivre la formule R1 sur sa ligne : ponctuation seule (sinon une unité se perdrait) */
const TRAILING_PUNCTUATION = /^[\s.,;:!?…»)]*$/;

// Functions
/** Statut de validation → statut d'affichage */
function toExpectedStatus(status: ValidationStatus): ExpectedStatus {
	if (status === 'correct') return 'correct';
	if (status === 'unoptimal_form') return 'unoptimal';
	if (status === 'empty') return 'empty';
	return 'incorrect';
}

/** Juste en valeur, quelle que soit l'écriture jugée ensuite */
const isAccepted = (status: ValidationStatus) =>
	status === 'correct' || status === 'unoptimal_form';

/**
 * Remplace chaque case du markdown par `decorate(fill)` ; une case sans valeur
 * devient des pointillés (jamais de marqueur brut, qu'aucun rendu ne sait lire).
 */
export function fillMarkdown(
	markdown: string,
	fills: readonly ExpectedFill[],
	decorate: (fill: ExpectedFill, inFormula: boolean) => string
): string {
	const byIndex = new Map(fills.map((f) => [f.index, f]));
	// Formules du markdown : un marqueur n'est « dans une formule » que s'il est
	// entre `$…$` / `$$…$$` (un `\placeholder` peut traîner dans le texte)
	const zones = [...markdown.matchAll(MATH_ZONE)].map((m) => {
		const start = m.index ?? 0;
		return { start, end: start + m[0].length };
	});
	const inFormula = (offset: number) => zones.some((z) => offset > z.start && offset < z.end);
	return markdown.replace(
		ANY_BLANK,
		(_m: string, mathIndex: string | undefined, textIndex: string | undefined, offset: number) => {
			const fill = byIndex.get(Number(mathIndex ?? textIndex));
			const formula = inFormula(offset);
			if (fill) return decorate(fill, formula);
			if (mathIndex === undefined) return BLANK_TEXT;
			return formula ? `\\text{${BLANK_TEXT}}` : `$\\text{${BLANK_TEXT}}$`;
		}
	);
}

/**
 * Énoncé prêt à remplir : marqueur `<<expr:NOM>>` retiré, et ` = format` ajouté
 * aux formules de la convention « expression » (comme `augmentASTForExpressions`
 * à l'écran), sauf si la formule a déjà ses propres cases.
 */
function prepareStatement(statement: string, instance: QuestionInstance): string {
	const expressions = instance.expressions ?? [];
	return statement.replace(MATH_ZONE, (_m, block: string | undefined, inline: string) => {
		const raw = block ?? inline;
		const marker = raw.match(EXPR_MARKER);
		let content = marker ? raw.slice(marker[0].length) : raw;
		if (marker && !new RegExp(PLACEHOLDER.source).test(content)) {
			const expression = expressions.find((e) => e.name === marker[1]);
			// Écriture affichée (espaces de milliers…), comme l'écran de la question
			if (expression?.displayLatex) content = expression.displayLatex;
			if (expression?.answerFormat) content = `${content.trim()} = ${expression.answerFormat}`;
		}
		return block !== undefined ? `$$${content}$$` : `$${content}$`;
	});
}

/** Indices des cases présentes dans le markdown préparé */
function markedIndexes(markdown: string): Set<number> {
	return new Set(
		[...markdown.matchAll(PLACEHOLDER), ...markdown.matchAll(TEXT_BLANK)].map((m) => Number(m[1]))
	);
}

/**
 * R1 : la seule case est TOUT le membre de droite d'une égalité (convention
 * expression à une case, ou `$… = ?$`). Rend le membre gauche, sinon `null`.
 */
function wholeRightHandSide(markdown: string, instance: QuestionInstance): string | null {
	const blanks = instance.blanks ?? [];
	if (blanks.length !== 1 || blanks[0].type !== 'math') return null;
	const zones = [...markdown.matchAll(MATH_ZONE)].filter((m) =>
		new RegExp(PLACEHOLDER.source).test(m[1] ?? m[2])
	);
	if (zones.length !== 1) return null;
	const [zone] = zones;
	const match = (zone[1] ?? zone[2]).match(LHS_EQUALS_BLANK);
	if (!match || match[2] !== '0') return null;
	const lhs = match[1].trim();
	if (lhs === '' || new RegExp(PLACEHOLDER.source).test(lhs) || ANY_RELATION.test(lhs)) {
		return null;
	}
	// Texte après la formule sur sa ligne (`$x = ?$ cm`) : la ligne R1 le perdrait
	const after = markdown.slice((zone.index ?? 0) + zone[0].length).split('\n')[0];
	if (!TRAILING_PUNCTUATION.test(after)) return null;
	return lhs;
}

interface BlankView {
	index: number;
	context: 'math' | 'text';
	graphical: boolean;
	expected: string;
	rulesDecide: boolean;
	/** Réponse de l'élève, neutralisée (R6 + sécurité) ; `null` si la case est vide */
	student: string | null;
	status: ValidationStatus | null;
	remarks: string[];
}

function blankViews(
	instance: QuestionInstance,
	answer: StudentAnswer | undefined,
	verdict: DetailedVerdict | undefined
): BlankView[] {
	return (instance.blanks ?? []).flatMap((blank, index) => {
		if (!blank) return [];
		const context = blank.type === 'text' ? 'text' : 'math';
		const detail = verdict?.blanks[index];
		const value = answer?.values?.[index] ?? blank.prefilled ?? '';
		// Réponse retenue par le validateur (sans « x = » recopié), sinon telle que saisie
		const typed = detail?.answer ?? (context === 'math' ? answer?.latex?.[index] || value : value);
		// Neutralisée : la réponse peut être lue par le professeur (autre utilisateur).
		// Case graphique : réponse montrée en texte (R8)
		const student =
			typed.trim() === ''
				? null
				: context === 'math' && blank.type !== 'graphical'
					? neutralizeStudentLatex(typed)
					: escapeStudentText(typed);
		return [
			{
				index,
				context,
				graphical: blank.type === 'graphical',
				expected:
					context === 'math'
						? (blank.expectedAnswerLatex ?? blank.expectedAnswer)
						: blank.expectedAnswer,
				rulesDecide: rulesDecide(blank),
				student,
				status: detail?.status ?? null,
				remarks: detail?.remarks ?? []
			}
		];
	});
}

/** Solution montrée : sa réponse juste pour une case `rulesSuffice` (R7), sinon l'attendu */
function solutionFill(view: BlankView, status: ExpectedStatus): ExpectedFill {
	const own = view.rulesDecide && view.status !== null && isAccepted(view.status);
	return {
		index: view.index,
		context: view.context,
		value: own ? (view.student ?? view.expected) : view.expected,
		status
	};
}

/** La solution n'est qu'un exemple : case `rulesSuffice` que l'élève n'a pas réussie */
const isOnlyPossible = (view: BlankView) =>
	view.rulesDecide && (view.status === null || !isAccepted(view.status));

function studentFill(view: BlankView): ExpectedFill {
	return {
		index: view.index,
		context: view.context,
		value: view.student,
		status: toExpectedStatus(view.status ?? 'empty')
	};
}

function remarkLines(views: readonly BlankView[]): ExpectedLine[] {
	return views.flatMap((v) =>
		v.remarks.map((text) => ({ kind: 'remark' as const, index: v.index, text }))
	);
}

/** R1 avec réponse : comparaison, remarques, solution */
function comparisonLines(lhs: string, view: BlankView): ExpectedLine[] {
	const status = view.status ?? 'empty';
	const solution: ExpectedLine = {
		kind: 'solution',
		lhs,
		latex: solutionFill(view, 'solution').value ?? view.expected,
		possible: isOnlyPossible(view)
	};
	if (status === 'empty') return [solution, { kind: 'empty', text: EMPTY_ANSWER_TEXT }];
	const comparison: ExpectedLine = {
		kind: 'comparison',
		lhs,
		// `≠` seulement quand c'est vrai : une valeur fausse ; une mauvaise forme reste `=`
		relation: status === 'incorrect' ? '≠' : '=',
		answer: studentFill(view)
	};
	if (status === 'correct') return [comparison];
	return [comparison, ...remarkLines([view]), solution];
}

/** R3 avec réponse : énoncé rempli, puis « Ta réponse » et remarques */
function statementLines(
	markdown: string,
	views: readonly BlankView[],
	status: ValidationStatus
): ExpectedLine[] {
	if (status === 'correct') {
		return [{ kind: 'filled-statement', markdown, fills: views.map(studentFill), possible: false }];
	}
	const filled: ExpectedLine = {
		kind: 'filled-statement',
		markdown,
		fills: views.map((v) => solutionFill(v, 'solution')),
		possible: views.some(isOnlyPossible)
	};
	if (status === 'empty') return [filled, { kind: 'empty', text: EMPTY_ANSWER_TEXT }];
	return [
		filled,
		{ kind: 'your-answer', markdown, fills: views.map(studentFill) },
		...remarkLines(views)
	];
}

function expectedOnlyLine(view: BlankView, withAnswer: boolean): ExpectedLine {
	return {
		kind: 'expected-only',
		index: view.index,
		context: view.context,
		value: view.expected,
		// R7 : la réponse montrée n'est qu'un exemple (case `rulesSuffice` non réussie)
		possible: isOnlyPossible(view),
		...(withAnswer && {
			studentAnswer: view.student ?? '',
			studentStatus: toExpectedStatus(view.status ?? 'empty')
		})
	};
}

function choiceLines(
	instance: QuestionInstance,
	verdict: DetailedVerdict | undefined
): ExpectedLine[] {
	const choices = instance.choices ?? [];
	const order =
		instance.shuffledChoices && instance.shuffledChoices.length === choices.length
			? instance.shuffledChoices.map((c) => c.originalIndex)
			: choices.map((_, i) => i);
	const nothingChecked = verdict !== undefined && !verdict.choices?.some((c) => c.checked);
	const lines: ExpectedLine[] = [
		{
			kind: 'choices',
			choices: order.flatMap((originalIndex) => {
				const choice = choices[originalIndex];
				if (!choice) return [];
				const detail = verdict?.choices?.find((c) => c.originalIndex === originalIndex);
				const checked = detail?.checked ?? false;
				// QCM à règles : ce sont elles qui disent quels choix sont bons
				const isCorrect = detail?.isCorrect ?? choice.isCorrect;
				let status: ExpectedStatus = isCorrect ? 'solution' : 'neutral';
				if (detail && !nothingChecked) {
					if (detail.outcome === 'checked-correct') status = 'correct';
					else if (detail.outcome === 'checked-wrong') status = 'incorrect';
					// Bon choix oublié : ambre en QCM à plusieurs réponses (R5), encadré sinon
					else if (detail.outcome === 'missed' && instance.multipleAnswers) status = 'unoptimal';
				}
				return [
					{
						originalIndex,
						content: String(choice.content),
						checked,
						isCorrect,
						status
					}
				];
			})
		}
	];
	if (nothingChecked) lines.push({ kind: 'empty', text: EMPTY_ANSWER_TEXT });
	return lines;
}

function build(
	instance: QuestionInstance,
	answer: StudentAnswer | undefined,
	given: DetailedVerdict | undefined
): ExpectedResult {
	const type = getQuestionType(instance);
	if (type === 'course_card') return { status: null, lines: [] };
	const verdict = given ?? (answer ? validateAnswerDetailed(instance, answer) : undefined);
	const status = verdict?.status ?? null;

	if (type === 'multiple_choice') return { status, lines: choiceLines(instance, verdict) };

	const statement = typeof instance.statement === 'string' ? instance.statement : '';
	const markdown = prepareStatement(statement, instance);
	const marked = markedIndexes(markdown);
	const views = blankViews(instance, answer, verdict);
	const inStatement = views.filter((v) => !v.graphical && marked.has(v.index));
	// R8 / R10 : case graphique, ou case introuvable dans l'énoncé
	const apart = views
		.filter((v) => !inStatement.includes(v))
		.map((v) => expectedOnlyLine(v, verdict !== undefined));

	if (inStatement.length === 0) return { status, lines: apart };

	const lhs = wholeRightHandSide(markdown, instance);

	// R9 : sans réponse, l'énoncé rempli seul ; calcul R1 : la solution
	// `3 + 5 = 8` encadrée, comme la ligne de solution d'une réponse vide (lot 3)
	if (!verdict || status === null) {
		if (lhs !== null && inStatement.length === 1) {
			const [view] = inStatement;
			const solution: ExpectedLine = {
				kind: 'solution',
				lhs,
				latex: view.expected,
				possible: view.rulesDecide
			};
			return { status, lines: [solution, ...apart] };
		}
		const filled: ExpectedLine = {
			kind: 'filled-statement',
			markdown,
			fills: inStatement.map((v) => solutionFill(v, 'solution')),
			possible: inStatement.some((v) => v.rulesDecide)
		};
		return { status, lines: [filled, ...apart] };
	}

	const main =
		lhs !== null && inStatement.length === 1
			? comparisonLines(lhs, inStatement[0])
			: statementLines(markdown, inStatement, status);
	return { status, lines: [...main, ...apart] };
}

/**
 * Résultat attendu d'une instance (R1-R10).
 *
 * @param instance - Instance générée
 * @param answer - Réponse de l'élève ; absente → énoncé rempli seul, ou solution
 *   `3 + 5 = 8` d'un calcul R1 (R9)
 * @param verdict - Verdict déjà calculé (`validateAnswerDetailed`), pour ne pas
 *   valider deux fois ; recalculé depuis `answer` sinon
 */
export function buildExpectedResult(
	instance: QuestionInstance,
	answer?: StudentAnswer,
	verdict?: DetailedVerdict
): ExpectedResult {
	try {
		return build(instance, answer, verdict);
	} catch {
		// R10 : jamais d'exception ; au pire, les réponses attendues seules
		try {
			const lines = blankViews(instance, undefined, undefined).map((v) =>
				expectedOnlyLine(v, false)
			);
			return { status: verdict?.status ?? null, lines };
		} catch {
			return { status: null, lines: [] };
		}
	}
}
