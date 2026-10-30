/**
 * Résultat attendu — premier niveau de correction (chantier « résultat attendu »)
 * ==============================================================================
 *
 * Construit, depuis une instance (et la réponse de l'élève s'il y en a une), une
 * DESCRIPTION en données de ce que l'élève voit d'abord : la comparaison
 * `3 + 5 ≠ 9` puis `= 8`, l'énoncé rempli par les solutions, « Ta réponse », les
 * choix d'un QCM, les remarques de forme. Spécification R1-R10 :
 * `docs/archive/wip/resultat-attendu-progress.md`.
 *
 * Aucune couleur ici : chaque valeur porte un statut sémantique (`correct`,
 * `unoptimal`, `incorrect`, `empty`, `solution`, `neutral`) que l'écran ou le PDF
 * traduit à sa façon. Les cases restent dans le markdown sous leurs marqueurs
 * habituels (`\placeholder[N]{}` dans une formule, `{{blank:N}}` dans le texte) :
 * `fillMarkdown` les remplace avec le décor choisi par l'appelant.
 *
 * Pur et sans exception (R10) : une instance inattendue donne un résultat réduit.
 */

import {
	getQuestionType,
	isPlaceKind,
	type BuildKind,
	type QuestionInstance,
	type ValidationStatus
} from './types';
import { rulesDecide } from './rules-suffice';
import { escapeStudentText, neutralizeStudentLatex } from './student-answer-safety';
import { correctChoiceIndexesOf, isChoiceBlank, parseChoiceAnswer } from './choice-case';
import { replaceChoiceBlocks } from '$lib/ubumark/parser/choix-parser';
import { isWorkFigureBlank } from './graded-part';
import { findBuildCollections } from '$lib/ubumark/parser/collection-parser';
import { findBuildMonnaies } from '$lib/ubumark/parser/monnaie-parser';
import { findLinesToPlace } from '$lib/ubumark/parser/number-line-parser';
import { findHorlogesToPlace } from '$lib/ubumark/parser/horloge-parser';
import { findBarsToPlace } from '$lib/ubumark/parser/stat-chart-parser';
import { findRangersToPlace } from '$lib/ubumark/parser/ranger-parser';
import { findPartagesToColorier } from '$lib/ubumark/parser/partage-parser';
import { NOTHING_COLORED } from '$lib/ubumark/utils/partage-colorier';
import {
	findCubesToBuild,
	findPatronsToBuild,
	parseEspaceContent
} from '$lib/ubumark/parser/espace-parser';
import { MISSING_HEIGHTS, NOTHING_COLORED_CUBES } from '$lib/ubumark/utils/cubes-gestes';
import { NOTHING_PLACED, NOTHING_TOUCHED } from '$lib/ubumark/utils/patron-gestes';
import { buildCaseCount } from './generator/build-answer';
import {
	validateAnswerDetailed,
	type DetailedVerdict,
	type StudentAnswer
} from '$lib/utils/answer-validator';

// Types
/** Statut d'affichage : la couleur est choisie par l'écran ou le PDF */
export type ExpectedStatus =
	'correct' | 'unoptimal' | 'incorrect' | 'empty' | 'solution' | 'neutral';

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

/** Case « choix » (bloc ```choix) : ses choix et leurs statuts, ordre AFFICHÉ */
export interface ExpectedChoiceCase {
	/** Case de la question (`case: N` du bloc) */
	index: number;
	multiple: boolean;
	choices: ExpectedChoice[];
}

export type ExpectedLine =
	/** R1 : `lhs = réponse` (juste, forme) ou `lhs ≠ réponse` (valeur fausse) */
	| { kind: 'comparison'; lhs: string; relation: '=' | '≠'; answer: ExpectedFill }
	/**
	 * R1 : `= solution`, encadrée ; `possible` → « Une réponse possible : » (R7).
	 * Aussi R9 d'un calcul R1 (sans réponse) : `lhs = solution`, seule.
	 */
	| { kind: 'solution'; lhs: string; latex: string; possible: boolean }
	/**
	 * R3/R9 : énoncé rempli par les solutions ; `possible` → « Une réponse possible : ».
	 * Les blocs ```choix y restent À LEUR PLACE : `choiceCases` donne, pour chacun,
	 * ses choix avec les statuts du QCM (l'écran les rend dans le bloc)
	 */
	| {
			kind: 'filled-statement';
			markdown: string;
			fills: ExpectedFill[];
			possible: boolean;
			choiceCases?: ExpectedChoiceCase[];
	  }
	/** R3 : « Ta réponse : » — l'énoncé rempli par les cases de l'élève */
	| { kind: 'your-answer'; markdown: string; fills: ExpectedFill[] }
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
	| { kind: 'empty'; text: string }
	/**
	 * Case « figure » (bloc ```figure-a-completer) : la figure elle-même, avec les
	 * tracés de l'élève (`answer`, chaîne `droite(…)` lue par le juge, jamais
	 * rendue en markdown) ; `null` sans réponse (R9) : la bonne droite seule
	 */
	| {
			kind: 'figure';
			index: number;
			source: string;
			answer: string | null;
			status: ExpectedStatus;
	  }
	/**
	 * Figure de travail (bloc ```figure-de-travail) : jamais notée, montrée APRÈS
	 * les réponses ; les traits de l'élève en gris (`answer`, chaîne `droite(…)`),
	 * `''` sans tracé, `null` sans réponse (R9) : la figure de départ seule
	 */
	| { kind: 'work-figure'; index: number; source: string; answer: string | null }
	/**
	 * Case à construire (bloc ```collection ou ```monnaie, `construire:`), droite ou
	 * horloge à placer (```line, ```horloge, `placer:`) : le plan
	 * lui-même, verrouillé, avec la construction de l'élève (`answer`, la valeur
	 * posée) ; `null` sans réponse (R9) ou réponse vide : la construction juste seule
	 */
	| {
			kind: 'build';
			index: number;
			buildKind: BuildKind;
			/** Texte du bloc, sans `case:` */
			source: string;
			answer: string | null;
			status: ExpectedStatus;
			/**
			 * Droite à plusieurs points (une case par point) : la réponse et le statut de
			 * chaque point ; `answer` et `status` disent alors la droite entière
			 */
			answers?: { answer: string; status: ExpectedStatus }[];
			/**
			 * Étiquettes à ranger : la bonne réponse de chaque place (position affichée) ;
			 * le bloc de l'énoncé ne dit pas l'ordre juste
			 */
			expected?: string[];
	  };

export interface ExpectedResult {
	/** Statut global (celui de `validateAnswer`) ; `null` sans réponse d'élève (R9) */
	status: ValidationStatus | null;
	lines: ExpectedLine[];
}

// Constantes
export const EMPTY_ANSWER_TEXT = "Tu n'as rien répondu.";
/** Case à construire laissée vide (plan vide) */
export const EMPTY_BUILD_TEXT = "Tu n'as rien posé.";
/** Droite à placer laissée vide (aucun point) */
export const EMPTY_PLACE_TEXT = "Tu n'as rien placé.";
/** Texte d'une case de ce genre laissée vide : rien posé, placé, colorié ou rempli */
function emptyBuildText(kind: BuildKind, source: string): string {
	if (kind === 'partage') return NOTHING_COLORED;
	if (kind === 'cubes') {
		return parseEspaceContent(source).spec?.task?.kind === 'retrouver'
			? MISSING_HEIGHTS
			: NOTHING_COLORED_CUBES;
	}
	if (kind === 'patron') {
		const spec = parseEspaceContent(source, 'patron').spec;
		return spec?.task?.kind === 'completer' ? NOTHING_PLACED : NOTHING_TOUCHED;
	}
	return isPlaceKind(kind) ? EMPTY_PLACE_TEXT : EMPTY_BUILD_TEXT;
}

/** Case sans valeur connue : pointillés, comme sur une fiche */
const BLANK_TEXT = '……';

/**
 * Bloc ```figure-a-completer (la case « figure », montrée par sa ligne `figure`) ou
 * ```figure-de-travail (montrée par sa ligne `work-figure`)
 */
const FIGURE_CASE_BLOCK = /^```figure-(?:a-completer|de-travail)\b[\s\S]*?^```[ \t]*$/gm;

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

/** L'énoncé sans ses blocs ```figure-a-completer et ```figure-de-travail (leur ligne les montre) */
export function withoutFigureCases(statement: string): string {
	return statement.replace(FIGURE_CASE_BLOCK, '');
}

/**
 * Bloc à construire d'un énoncé, repéré par sa case (`case: N`) : genre, texte sans
 * `case:`, lignes ; droite à placer : une case par point, `first` = la case posée
 */
interface BuildCaseBlock {
	kind: BuildKind;
	source: string;
	startIndex: number;
	endIndex: number;
	first: number;
	/** Nombre de cases du bloc (points d'une droite à placer, barres à construire, sinon 1) */
	cases: number;
}

const CASE_LINE = /^case\s*:\s*(\d+)\s*$/i;

/** Blocs à construire numérotés d'un énoncé (premier niveau, fermés : ceux du générateur) */
function buildCaseBlocks(statement: string): Map<number, BuildCaseBlock> {
	const found = [
		...findBuildCollections(statement).map((b) => ({ ...b, kind: 'collection' as const })),
		...findBuildMonnaies(statement).map((b) => ({ ...b, kind: 'monnaie' as const })),
		...findLinesToPlace(statement).map((b) => ({ ...b, kind: 'line' as const })),
		...findHorlogesToPlace(statement).map((b) => ({ ...b, kind: 'horloge' as const })),
		...findBarsToPlace(statement).map((b) => ({ ...b, kind: 'barres' as const })),
		...findRangersToPlace(statement).map((b) => ({ ...b, kind: 'ranger' as const })),
		...findPartagesToColorier(statement).map((b) => ({ ...b, kind: 'partage' as const })),
		...findCubesToBuild(statement).map((b) => ({ ...b, kind: 'cubes' as const })),
		...findPatronsToBuild(statement).map((b) => ({ ...b, kind: 'patron' as const }))
	];
	const blocks = new Map<number, BuildCaseBlock>();
	for (const block of found) {
		if (block.nested || !block.closed) continue;
		const caseLine = block.body.map((line) => CASE_LINE.exec(line.trim())).find(Boolean);
		if (!caseLine) continue;
		const first = Number(caseLine[1]);
		const source = block.body.filter((line) => !CASE_LINE.test(line.trim())).join('\n');
		const cases = buildCaseCount(block.kind, source);
		const found: BuildCaseBlock = {
			kind: block.kind,
			source,
			startIndex: block.startIndex,
			endIndex: block.startIndex + block.body.length + 1,
			first,
			cases
		};
		for (let k = 0; k < cases; k++) blocks.set(first + k, found);
	}
	return blocks;
}

/** L'énoncé sans ses blocs à construire numérotés (la ligne `build` de chaque case les montre) */
export function withoutBuildCases(statement: string): string {
	const blocks = [...buildCaseBlocks(statement).values()];
	if (blocks.length === 0) return statement;
	return statement
		.split('\n')
		.filter((_, i) => !blocks.some((b) => i >= b.startIndex && i <= b.endIndex))
		.join('\n');
}

/** L'énoncé sans ses blocs ```choix (leurs choix sont montrés à part) */
export function withoutChoiceCases(statement: string): string {
	return replaceChoiceBlocks(statement, () => '');
}

/**
 * Consigne seule au-dessus du résultat attendu : calcul R1 (Q104), ou case
 * « figure » ou à construire quand aucun énoncé rempli ne tient lieu d'énoncé
 */
export function showsInstructionOnly(lines: readonly ExpectedLine[]): boolean {
	if (lines.some((l) => l.kind === 'comparison' || l.kind === 'solution')) return true;
	return (
		lines.some((l) => l.kind === 'figure' || l.kind === 'build') &&
		!lines.some((l) => l.kind === 'filled-statement' || l.kind === 'your-answer')
	);
}

/**
 * Énoncé prêt à remplir : marqueur `<<expr:NOM>>` retiré, et ` = format` ajouté
 * aux formules de la convention « expression » (comme `augmentASTForExpressions`
 * à l'écran), sauf si la formule a déjà ses propres cases. Exporté pour la page à
 * cocher des lots (`scripts/lib/page-a-cocher.ts`).
 */
export function prepareStatement(statement: string, instance: QuestionInstance): string {
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
	// Figures de travail hors compte : jamais une réponse
	const all = instance.blanks ?? [];
	const graded = all.filter((blank) => !isWorkFigureBlank(blank));
	if (graded.length !== 1 || graded[0].type !== 'math') return null;
	const gradedIndex = String(all.indexOf(graded[0]));
	const zones = [...markdown.matchAll(MATH_ZONE)].filter((m) =>
		new RegExp(PLACEHOLDER.source).test(m[1] ?? m[2])
	);
	if (zones.length !== 1) return null;
	const [zone] = zones;
	const match = (zone[1] ?? zone[2]).match(LHS_EQUALS_BLANK);
	if (!match || match[2] !== gradedIndex) return null;
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
	/** Case « figure » : texte du bloc et réponse brute (la figure la dessine, rien n'est rendu) */
	figure?: { source: string; answer: string };
	/**
	 * Case à construire : son bloc et la valeur posée brute (le plan la redessine, rien
	 * n'est rendu) ; droite à placer : `first`, `cases` pour regrouper ses points
	 */
	build?: { kind: BuildKind; source: string; answer: string; first: number; cases: number };
}

function blankViews(
	instance: QuestionInstance,
	answer: StudentAnswer | undefined,
	verdict: DetailedVerdict | undefined
): BlankView[] {
	const builds = buildCaseBlocks(typeof instance.statement === 'string' ? instance.statement : '');
	return (instance.blanks ?? []).flatMap((blank, index) => {
		// Figure de travail : jamais une réponse, sa ligne à part (`workFigureLines`)
		if (!blank || isWorkFigureBlank(blank)) return [];
		// Case choix : sa réponse (indices) n'est jamais rendue en texte, cf. choiceCaseLines
		const context = blank.type === 'text' || blank.type === 'choice' ? 'text' : 'math';
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
				remarks: detail?.remarks ?? [],
				...(blank.construction && {
					figure: { source: blank.construction.source, answer: detail?.answer ?? value }
				}),
				...(blank.construire &&
					builds.has(index) && {
						build: {
							kind: blank.construire,
							source: builds.get(index)!.source,
							answer: value,
							first: builds.get(index)!.first,
							cases: builds.get(index)!.cases
						}
					})
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

/** Cases choix de l'énoncé rempli (absentes : aucune clé) */
const withChoiceCases = (choiceCases: readonly ExpectedChoiceCase[]) =>
	choiceCases.length > 0 ? { choiceCases: [...choiceCases] } : {};

/**
 * R3 avec réponse : énoncé rempli (cases choix à leur place), puis « Ta réponse »
 * et remarques. « Ta réponse » sans les blocs choix (déjà montrés, cochés de
 * l'élève compris), et absente s'il ne reste aucune case à y remplir.
 */
function statementLines(
	markdown: string,
	views: readonly BlankView[],
	status: ValidationStatus,
	choiceCases: readonly ExpectedChoiceCase[]
): ExpectedLine[] {
	if (status === 'correct') {
		return [
			{
				kind: 'filled-statement',
				markdown,
				fills: views.map(studentFill),
				possible: false,
				...withChoiceCases(choiceCases)
			}
		];
	}
	const filled: ExpectedLine = {
		kind: 'filled-statement',
		markdown,
		fills: views.map((v) => solutionFill(v, 'solution')),
		possible: views.some(isOnlyPossible),
		...withChoiceCases(choiceCases)
	};
	if (status === 'empty') return [filled, { kind: 'empty', text: EMPTY_ANSWER_TEXT }];
	if (views.length === 0) return [filled];
	return [
		filled,
		{ kind: 'your-answer', markdown: withoutChoiceCases(markdown), fills: views.map(studentFill) },
		...remarkLines(views)
	];
}

/** Case « figure » : la figure (tracés de l'élève, bonne droite), ses remarques, « rien répondu » */
function figureLines(
	view: BlankView,
	figure: NonNullable<BlankView['figure']>,
	withAnswer: boolean
): ExpectedLine[] {
	const status = toExpectedStatus(view.status ?? 'empty');
	const line: ExpectedLine = {
		kind: 'figure',
		index: view.index,
		source: figure.source,
		answer: withAnswer ? figure.answer : null,
		status: withAnswer ? status : 'solution'
	};
	if (!withAnswer) return [line];
	if (status === 'empty') return [line, { kind: 'empty', text: EMPTY_ANSWER_TEXT }];
	return [line, ...remarkLines([view])];
}

/** Figures de travail : une ligne chacune, après les réponses notées */
function workFigureLines(
	instance: QuestionInstance,
	answer: StudentAnswer | undefined
): ExpectedLine[] {
	return (instance.blanks ?? []).flatMap((blank, index) =>
		blank?.construction && isWorkFigureBlank(blank)
			? [
					{
						kind: 'work-figure' as const,
						index,
						source: blank.construction.source,
						answer: answer ? (answer.values?.[index] ?? '').trim() : null
					}
				]
			: []
	);
}

/** Case à construire : le plan (construction de l'élève, ou juste), « rien répondu » */
function buildLines(
	view: BlankView,
	build: NonNullable<BlankView['build']>,
	withAnswer: boolean
): ExpectedLine[] {
	const status = toExpectedStatus(view.status ?? 'empty');
	const answered = withAnswer && status !== 'empty' && build.answer.trim() !== '';
	const line: ExpectedLine = {
		kind: 'build',
		index: view.index,
		buildKind: build.kind,
		source: build.source,
		answer: answered ? build.answer : null,
		status: answered ? status : 'solution'
	};
	// Propre à la case : une autre case de l'énoncé peut avoir sa réponse
	if (withAnswer && status === 'empty') {
		const text = emptyBuildText(build.kind, build.source);
		return [line, { kind: 'empty', text }];
	}
	return [line];
}

/**
 * Droite à placer à plusieurs points (diagramme à plusieurs barres) : une seule
 * figure, la réponse de chaque point (barre) ; juste quand tous le sont, « rien
 * placé » (« rien posé ») quand aucun ne l'est
 */
function placeLines(
	first: BlankView,
	build: NonNullable<BlankView['build']>,
	points: BlankView[],
	withAnswer: boolean
): ExpectedLine[] {
	const statuses = points.map((p) => toExpectedStatus(p.status ?? 'empty'));
	const answers = points.map((p, k) => ({
		answer: p.build?.answer.trim() ?? '',
		status: statuses[k]
	}));
	const answered = withAnswer && answers.some((a) => a.answer !== '');
	const allAccepted = statuses.every((s) => s === 'correct' || s === 'unoptimal');
	const line: ExpectedLine = {
		kind: 'build',
		index: first.index,
		buildKind: build.kind,
		source: build.source,
		answer: answered ? answers.map((a) => a.answer).join(' ; ') : null,
		status: answered ? (allAccepted ? 'correct' : 'incorrect') : 'solution',
		...(answered && { answers }),
		...(build.kind === 'ranger' && { expected: points.map((p) => p.expected) })
	};
	if (withAnswer && !answered) {
		const text = emptyBuildText(build.kind, build.source);
		return [line, { kind: 'empty', text }];
	}
	return [line];
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

/**
 * Case « choix » : ses choix avec les statuts du QCM, ordre AFFICHÉ, réponse de
 * l'élève lue dans la case (indices d'origine). Rien coché : bons choix encadrés.
 */
function choiceCaseOf(
	instance: QuestionInstance,
	index: number,
	verdict: DetailedVerdict | undefined
): ExpectedChoiceCase | null {
	const blank = instance.blanks?.[index];
	if (!isChoiceBlank(blank)) return null;
	const { choices, order, multiple } = blank.choice;
	const correct = new Set(correctChoiceIndexesOf(blank));
	const answer = verdict?.blanks[index]?.answer ?? '';
	const checked = new Set(parseChoiceAnswer(answer, choices.length) ?? []);
	const nothingChecked = checked.size === 0;
	return {
		index,
		multiple,
		choices: order.flatMap((originalIndex) => {
			const content = choices[originalIndex];
			if (content === undefined) return [];
			const isCorrect = correct.has(originalIndex);
			const isChecked = checked.has(originalIndex);
			let status: ExpectedStatus = isCorrect ? 'solution' : 'neutral';
			if (verdict && !nothingChecked) {
				if (isChecked) status = isCorrect ? 'correct' : 'incorrect';
				// Bon choix oublié : ambre à plusieurs réponses (R5), encadré sinon
				else if (isCorrect && multiple) status = 'unoptimal';
			}
			return [{ originalIndex, content, checked: isChecked, isCorrect, status }];
		})
	};
}

/** Cases des blocs ```choix présents dans le markdown (`case: N`) */
function choiceBlockIndexes(markdown: string): Set<number> {
	const indexes = new Set<number>();
	replaceChoiceBlocks(markdown, (block) => {
		if (block.caseIndex !== undefined) indexes.add(block.caseIndex);
		return '';
	});
	return indexes;
}

function build(
	instance: QuestionInstance,
	answer: StudentAnswer | undefined,
	given: DetailedVerdict | undefined
): ExpectedResult {
	const result = buildAnswers(instance, answer, given);
	const work = workFigureLines(instance, answer);
	return work.length === 0 ? result : { ...result, lines: [...result.lines, ...work] };
}

/** Résultat attendu des cases notées (les figures de travail viennent après, cf. `build`) */
function buildAnswers(
	instance: QuestionInstance,
	answer: StudentAnswer | undefined,
	given: DetailedVerdict | undefined
): ExpectedResult {
	const type = getQuestionType(instance);
	if (type === 'course_card') return { status: null, lines: [] };
	const verdict = given ?? (answer ? validateAnswerDetailed(instance, answer) : undefined);
	const status = verdict?.status ?? null;

	const statement = typeof instance.statement === 'string' ? instance.statement : '';
	// Case « figure » : hors de l'énoncé rempli, sa figure est dans sa ligne. Case
	// « choix » : son bloc reste À SA PLACE dans l'énoncé rempli (`choiceCases`)
	const markdown = prepareStatement(withoutBuildCases(withoutFigureCases(statement)), instance);
	const marked = markedIndexes(markdown);
	const choiceBlocks = choiceBlockIndexes(markdown);
	const views = blankViews(instance, answer, verdict);
	const isChoiceView = (v: BlankView) => isChoiceBlank(instance.blanks?.[v.index]);
	const choiceViews = views.filter((v) => isChoiceView(v) && choiceBlocks.has(v.index));
	const inStatement = views.filter((v) => !v.graphical && !isChoiceView(v) && marked.has(v.index));
	// R8 / R10 : case graphique, ou case introuvable dans l'énoncé
	const outside = views.filter((v) => !inStatement.includes(v) && !choiceViews.includes(v));
	// La figure avant l'énoncé rempli, comme dans l'énoncé (CP-058 : la droite, puis « oui »)
	const figures = outside.flatMap((v) =>
		v.figure ? figureLines(v, v.figure, verdict !== undefined) : []
	);
	// Case à construire : son plan, comme une figure, mais APRÈS l'énoncé rempli : la
	// phrase qui le demande (« Paie le ballon à 35 €. ») vient d'abord
	const builds = outside.flatMap((v) => {
		if (!v.build) return [];
		if (v.build.cases === 1) return buildLines(v, v.build, verdict !== undefined);
		// Droite à plusieurs points, diagramme à plusieurs barres : UNE figure, à la
		// place de sa première case
		if (v.index !== v.build.first) return [];
		const points = outside.filter(
			(other) => other.build?.first === v.build!.first && other.build.kind === v.build!.kind
		);
		return placeLines(v, v.build, points, verdict !== undefined);
	});
	const apart = [
		...builds,
		...outside.flatMap((v) =>
			v.figure || v.build ? [] : [expectedOnlyLine(v, verdict !== undefined)]
		)
	];
	const choiceCases = choiceViews.flatMap((v) => choiceCaseOf(instance, v.index, verdict) ?? []);

	if (inStatement.length === 0 && choiceCases.length === 0) {
		return { status, lines: [...figures, ...apart] };
	}

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
			return { status, lines: [...figures, solution, ...apart] };
		}
		const filled: ExpectedLine = {
			kind: 'filled-statement',
			markdown,
			fills: inStatement.map((v) => solutionFill(v, 'solution')),
			possible: inStatement.some((v) => v.rulesDecide),
			...withChoiceCases(choiceCases)
		};
		return { status, lines: [...figures, filled, ...apart] };
	}

	const main =
		lhs !== null && inStatement.length === 1
			? comparisonLines(lhs, inStatement[0])
			: statementLines(markdown, inStatement, status, choiceCases);
	return { status, lines: [...figures, ...main, ...apart] };
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
