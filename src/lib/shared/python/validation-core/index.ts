/**
 * Exercise-validation core.
 *
 * Runtime-agnostic implementation of the exercise-validation pipeline: AST
 * requirements → behavior layer, with namespace ownership, an incompatible-mode
 * guard for checkpoint runs, a timeout race, and full error capture.
 *
 * The `pyodide` handle is threaded explicitly through every helper, so the core
 * has no dependency on a module-level singleton and no browser-specific import.
 * It never calls `postMessage`: it always resolves to an
 * `ExerciseValidationResult` (validation failures — including timeouts — are
 * data, not thrown errors). This lets the same code run in the browser Web
 * Worker and in a Node serverless function.
 */

import type {
	PyodideInterface,
	PyProxy,
	ExerciseValidationConfig,
	ExerciseValidationResult,
	ASTRequirement
} from '$lib/shared/python';
import { detectSyntaxError, runASTChecks } from './ast';
import { runBehavior } from './runners';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT_MS = 5000;

// =============================================================================
// Functions
// =============================================================================

/**
 * Run the exercise-validation pipeline against `code` for the given `config`.
 *
 * Namespace handling:
 * - If `options.namespace` is provided (notebook checkpoint mode), the borrowed
 *   namespace is used as-is and NOT destroyed — it holds the student's notebook
 *   state across cells. `options.skipCodeExec` (defaults `false`) is threaded to
 *   the behavior runners so `code` is not re-exec'd.
 * - Otherwise (standard exercise mode), a fresh isolated dict is created, owned,
 *   and destroyed in the `finally` block so state can't leak between runs.
 *
 * Always resolves to an `ExerciseValidationResult`; validation failures and
 * timeouts are encoded in the result rather than thrown.
 */
export async function runExerciseValidation(
	pyodide: PyodideInterface,
	code: string,
	config: ExerciseValidationConfig,
	options?: { namespace?: PyProxy; skipCodeExec?: boolean }
): Promise<ExerciseValidationResult> {
	const startTime = performance.now();
	const timeout = config.timeout_ms || DEFAULT_TIMEOUT_MS;

	// Namespace resolution:
	// - If `options.namespace` is provided (notebook checkpoint mode), borrow the
	//   persistent context's namespace. The student's variables/functions are
	//   already populated by the notebook cell execution, so behavior runners
	//   skip the "exec student code" step (see `skipCodeExec` below).
	// - Otherwise (standard exercise mode), create a fresh isolated dict so
	//   the student code can be exec'd without leaking state between
	//   consecutive validations or into the playground namespace.
	let namespace: PyProxy;
	let isOwnedNamespace = false;
	const skipCodeExec = options?.namespace ? Boolean(options.skipCodeExec) : false;

	if (options?.namespace) {
		namespace = options.namespace;
	} else {
		namespace = pyodide.runPython('dict()') as PyProxy;
		isOwnedNamespace = true;
	}

	const behaviorKind = config.behavior?.kind;
	const hasAST = (config.ast_requirements?.length ?? 0) > 0;

	// Reject combinations that would corrupt or surprise in checkpoint mode.
	// `output` and `reference_solution` runners ignore `skipCodeExec` and re-exec
	// the top-level code (+ inject stdin/stdout scaffolding), which would pollute
	// the persistent notebook namespace. `ast_requirements` would apply to the
	// (typically empty) top-level `code` parameter rather than to the preceding
	// cells of the notebook — semantically meaningless in V1.
	if (
		skipCodeExec &&
		(behaviorKind === 'output' || behaviorKind === 'reference_solution' || hasAST)
	) {
		const reason =
			behaviorKind === 'output' || behaviorKind === 'reference_solution'
				? `Mode "${behaviorKind}" non supporté en checkpoint (V1) — utilisez assert, unit_test ou variable_check.`
				: `Les "ast_requirements" ne sont pas supportés en checkpoint (V1) — utilisez un mode behavior seul.`;
		// The borrowed namespace must NOT be destroyed here (checkpoint mode never
		// owns it), and we own no fresh namespace in this branch, so there is
		// nothing to clean up before returning.
		return {
			valid: false,
			failed_layer: null,
			behavior_kind: behaviorKind,
			test_results: [],
			error: reason,
			execution_time_ms: Math.round(performance.now() - startTime)
		};
	}

	try {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Timeout')), timeout);
		});

		const validationPromise: Promise<ExerciseValidationResult> = (async () => {
			let astIssues: string[] | undefined;

			if (hasAST) {
				const requirements = config.ast_requirements as ASTRequirement[];
				const syntaxIssue = await detectSyntaxError(pyodide, code, namespace);
				if (syntaxIssue) {
					return {
						valid: false,
						failed_layer: 'ast',
						behavior_kind: behaviorKind,
						ast_issues: [`Erreur de syntaxe Python : ${syntaxIssue}`],
						test_results: [],
						execution_time_ms: 0
					};
				}

				astIssues = await runASTChecks(pyodide, code, requirements, namespace);

				if (astIssues.length > 0) {
					return {
						valid: false,
						failed_layer: 'ast',
						behavior_kind: behaviorKind,
						ast_issues: astIssues,
						test_results: [],
						execution_time_ms: 0
					};
				}
			}

			if (config.behavior) {
				const { valid, test_results } = await runBehavior(
					pyodide,
					code,
					config.behavior,
					namespace,
					skipCodeExec
				);
				return {
					valid,
					failed_layer: valid ? null : 'behavior',
					behavior_kind: config.behavior.kind,
					ast_issues: astIssues,
					test_results,
					execution_time_ms: 0
				};
			}

			// AST-only success
			return {
				valid: true,
				failed_layer: null,
				behavior_kind: undefined,
				ast_issues: astIssues,
				test_results: [],
				execution_time_ms: 0
			};
		})();

		const result = await Promise.race([validationPromise, timeoutPromise]);
		result.execution_time_ms = Math.round(performance.now() - startTime);
		return result;
	} catch (error) {
		const executionTime = Math.round(performance.now() - startTime);
		const isTimeout = error instanceof Error && error.message === 'Timeout';

		return {
			valid: false,
			failed_layer: null,
			behavior_kind: behaviorKind,
			test_results: [],
			error: isTimeout
				? "Délai d'exécution dépassé"
				: error instanceof Error
					? error.message
					: String(error),
			execution_time_ms: executionTime
		};
	} finally {
		// Only destroy the namespace if we own it. Borrowed contexts (notebook
		// checkpoints) must outlive this validation — they hold the student's
		// notebook state across cells.
		if (isOwnedNamespace) {
			if (typeof (namespace as { destroy?: () => void }).destroy === 'function') {
				(namespace as { destroy: () => void }).destroy();
			}
		}
	}
}
