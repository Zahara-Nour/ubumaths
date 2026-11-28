/**
 * Juge d'une case « programme Python » (bloc ```python-a-ecrire, outil 49)
 * ========================================================================
 *
 * Tourne dans le NAVIGATEUR, avant la validation de la carte : le programme de l'élève et la
 * solution de l'auteur sont rejoués par le worker Pyodide des exercices Python
 * (`validateExercise`, comportement `reference_solution`).
 *
 * Choix d'exécution : UN appel au worker par essai. Le générateur du worker reçoit le tuple
 * des arguments de l'essai (`seuil(2)` → `(2,)`, `count: 1`) : chaque appel dit lequel des
 * essais a raté, on s'arrête au premier, et le message cite l'essai tel que l'auteur l'a écrit.
 * Les exigences (fonction définie, `exiger:`) et la syntaxe sont vérifiées au premier appel.
 * Aucun changement du worker ni de ses comparaisons.
 *
 * @module questions/python/judge-python-case
 */

import type {
	ASTRequirement,
	ExerciseValidationConfig,
	ExerciseValidationResult,
	TestCaseResult
} from '#lib/shared/python/types.ts';
import type { PythonExigence } from '#lib/ubumark/types/python-a-ecrire.ts';
import type { PythonExpected, PythonVerdict } from './python-answer';

// ============================================================================
// TYPES
// ============================================================================

/** Ce que le juge demande à l'exécuteur Python (`PlaygroundExecutor` le fournit) */
export interface PythonCaseExecutor {
	validateExercise(
		code: string,
		config: ExerciseValidationConfig
	): Promise<ExerciseValidationResult>;
}

export interface JudgeOptions {
	/**
	 * Programme qui ne s'arrête pas : le worker reste bloqué dans la boucle (le délai du fil
	 * principal ne l'interrompt pas). L'appelant le remplace.
	 */
	onStuck?: () => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Délai de chaque essai, celui des exercices Python */
export const PYTHON_CASE_TIMEOUT_MS = 5000;

const TIMEOUT_ERROR = "Délai d'exécution dépassé";
const NOT_READY_ERROR = "Pyodide n'est pas prêt";

export const PYTHON_EMPTY = 'Tu n’as écrit aucun programme.';
export const PYTHON_NEVER_STOPS =
	'Ton programme ne s’arrête pas (plus de 5 secondes) : vérifie la condition de ta boucle.';
export const PYTHON_NOT_STARTED = 'Python n’a pas pu se lancer : réessaie dans un instant.';

/** Exigences de `exiger:` → exigences des exercices Python */
const REQUIREMENTS: Record<PythonExigence, ASTRequirement> = {
	boucle: {
		type: 'uses_loop',
		message: 'Ta fonction doit utiliser une boucle (`while` ou `for`).'
	},
	'sans print': {
		type: 'no_print',
		message: 'N’utilise pas `print` : ta fonction doit rendre son résultat avec `return`.'
	}
};

/** Erreurs de syntaxe courantes de Python, en français */
const SYNTAX_MESSAGES: [RegExp, string][] = [
	[/^expected ':'$/, 'il manque « : »'],
	[/^invalid syntax/, 'écriture incorrecte'],
	[
		/^expected an indented block/,
		'il manque un retrait (les lignes du bloc doivent être décalées)'
	],
	[/^unexpected indent$/, 'retrait en trop'],
	[
		/^unindent does not match any outer indentation level$/,
		'retrait qui ne correspond à aucun autre'
	],
	[/^'\(' was never closed$/, 'parenthèse jamais fermée'],
	[/^unmatched '\)'$/, 'parenthèse fermée en trop'],
	[/^unterminated string literal/, 'guillemet jamais fermé']
];

// ============================================================================
// FONCTIONS
// ============================================================================

/** Arguments d'un essai, en tuple Python : `seuil(2)` → `(2,)`, `f()` → `()` */
export function argumentsTuple(essai: string): string {
	const open = essai.indexOf('(');
	const inner = essai.slice(open + 1, essai.lastIndexOf(')')).trim();
	return inner === '' ? '()' : `(${inner},)`;
}

/** Message d'une erreur de syntaxe (`Erreur de syntaxe Python : ligne 4 : expected ':'`) */
function syntaxMessage(issue: string): string | null {
	const match = /^Erreur de syntaxe Python : ligne (\d+) : (.*)$/.exec(issue);
	if (!match) return null;
	const detail = match[2].trim();
	const french = SYNTAX_MESSAGES.find(([pattern]) => pattern.test(detail))?.[1] ?? detail;
	return `Erreur de syntaxe ligne ${match[1]} : ${french}.`;
}

/**
 * Erreur Python levée par le programme de l'élève : la dernière ligne de la trace
 * (`NameError: …`) et la dernière ligne de SON programme (`File "<exec>", line 5`)
 */
function runtimeError(trace: string): { line: number | null; error: string } {
	const lines = trace
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l !== '');
	const error = lines[lines.length - 1] ?? trace;
	const own = [...trace.matchAll(/File "<exec>", line (\d+)/g)];
	const last = own[own.length - 1];
	return { line: last ? Number(last[1]) : null, error };
}

function stoppedOnError(trace: string): string {
	const { line, error } = runtimeError(trace);
	return `ton programme s’arrête sur une erreur${line === null ? '' : ` ligne ${line}`} : ${error}`;
}

const isTeacherError = (error: string) =>
	error.startsWith('Solution de référence') || error.includes('dans la solution de référence');

/** Message de l'essai raté (résultat du worker pour cet essai) */
function failureMessage(essai: string, result: TestCaseResult): string {
	const cited = `\`${essai}\``;
	if (result.error !== undefined) {
		if (isTeacherError(result.error)) {
			return `Cette question a un problème (la solution de l’auteur ne marche pas sur ${cited}) : signale-le à ton professeur.`;
		}
		const message = stoppedOnError(result.error);
		// Erreur au chargement du programme (avant tout appel) : pas d'essai à citer
		return result.input === undefined
			? `${message.charAt(0).toUpperCase()}${message.slice(1)}.`
			: `${cited} : ${message}.`;
	}
	if (result.actual === 'None') {
		return `${cited} : ta fonction ne rend rien (as-tu écrit \`return\` ?), on attendait ${result.expected ?? '?'}.`;
	}
	return `${cited} : ta fonction rend ${result.actual ?? '?'}, on attendait ${result.expected ?? '?'}.`;
}

/** Verdict d'un essai ; null s'il est passé */
function essaiVerdict(essai: string, result: ExerciseValidationResult): PythonVerdict | null {
	if (result.valid) return null;
	if (result.error !== undefined) {
		if (result.error === TIMEOUT_ERROR) return { juste: false, message: PYTHON_NEVER_STOPS };
		return { juste: false, message: `${stoppedOnError(result.error)}.` };
	}
	if (result.failed_layer === 'ast') {
		const [issue] = result.ast_issues ?? [];
		return { juste: false, message: (issue && syntaxMessage(issue)) ?? issue };
	}
	const failed = result.test_results.find((r) => !r.passed);
	return { juste: false, ...(failed && { message: failureMessage(essai, failed) }) };
}

/** Réglage du worker pour un essai ; exigences et syntaxe au premier seulement */
function configFor(
	expected: PythonExpected,
	essai: string,
	first: boolean
): ExerciseValidationConfig {
	return {
		...(first && {
			ast_requirements: [
				{
					type: 'defines_function',
					name: expected.fonction,
					message: `Il faut écrire la fonction \`${expected.fonction}\`.`
				},
				...expected.exiger.map((name) => REQUIREMENTS[name])
			]
		}),
		behavior: {
			kind: 'reference_solution',
			function_name: expected.fonction,
			reference_code: expected.solution,
			generator: { code: argumentsTuple(essai), count: 1, seed: 0 }
		},
		timeout_ms: PYTHON_CASE_TIMEOUT_MS
	};
}

/**
 * Juge le programme de l'élève : chaque essai, dans l'ordre, contre la solution de l'auteur ;
 * arrêt au premier raté. Ne lève jamais : une panne de Python est un verdict faux, dit.
 */
export async function judgePythonCase(
	code: string,
	expected: PythonExpected,
	executor: PythonCaseExecutor,
	options: JudgeOptions = {}
): Promise<PythonVerdict> {
	if (code.trim() === '') return { juste: false, message: PYTHON_EMPTY };
	for (const [index, essai] of expected.essais.entries()) {
		let result: ExerciseValidationResult;
		try {
			result = await executor.validateExercise(code, configFor(expected, essai, index === 0));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message === TIMEOUT_ERROR) {
				options.onStuck?.();
				return { juste: false, message: PYTHON_NEVER_STOPS };
			}
			if (message === NOT_READY_ERROR) return { juste: false, message: PYTHON_NOT_STARTED };
			return { juste: false, message: PYTHON_NOT_STARTED };
		}
		const verdict = essaiVerdict(essai, result);
		if (verdict !== null) return verdict;
	}
	return { juste: true };
}
