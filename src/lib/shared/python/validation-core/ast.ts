/**
 * AST-layer helpers for the exercise-validation pipeline.
 *
 * Runtime-agnostic: everything works off an explicit `pyodide` handle and a
 * caller-provided `namespace` PyProxy, so this module runs unchanged in the
 * browser Web Worker and in a Node serverless function.
 */

import type { PyodideInterface, PyProxy, ASTRequirement } from '$lib/shared/python';

/**
 * Detect a Python SyntaxError without raising. Returns the formatted error
 * message on failure, or `null` if the code parses cleanly. Used as a
 * pre-check before AST requirements so a SyntaxError surfaces once with a
 * dedicated message rather than being absorbed by every requirement check.
 */
export async function detectSyntaxError(
	pyodide: PyodideInterface,
	code: string,
	namespace: PyProxy
): Promise<string | null> {
	namespace.set('_chiphre_syntax_code', code);
	try {
		const message = (await pyodide.runPythonAsync(
			`
import ast as _chiphre_ast

_msg = None
try:
    _chiphre_ast.parse(_chiphre_syntax_code)
except SyntaxError as _e:
    _line = _e.lineno or 0
    _detail = _e.msg or 'erreur de syntaxe'
    _msg = f"ligne {_line} : {_detail}"
_msg
`,
			{ globals: namespace }
		)) as string | null;
		return message ?? null;
	} finally {
		try {
			namespace.delete('_chiphre_syntax_code');
		} catch {
			// Ignore cleanup errors
		}
	}
}

/**
 * Run AST structural checks against the parsed code, returning the list of
 * issues (one entry per failed requirement). An empty array means every
 * requirement passed.
 *
 * @param namespace Isolated Python dict. AST analysis only inspects the
 *   parsed code and doesn't execute it, so isolation is not strictly required
 *   here, but reusing the namespace keeps the pipeline coherent in case
 *   behavior runs next.
 */
export async function runASTChecks(
	pyodide: PyodideInterface,
	code: string,
	requirements: ASTRequirement[],
	namespace: PyProxy
): Promise<string[]> {
	const astIssues: string[] = [];

	for (const requirement of requirements) {
		try {
			namespace.set('_chiphre_ast_code', code);
			namespace.set('_chiphre_ast_requirement_type', requirement.type);
			namespace.set('_chiphre_ast_requirement_name', requirement.name || '');

			const passed = (await pyodide.runPythonAsync(
				`
import ast

_code = _chiphre_ast_code
_req_type = _chiphre_ast_requirement_type
_req_name = _chiphre_ast_requirement_name
_passed = False

try:
    _tree = ast.parse(_code)

    if _req_type == 'uses_loop':
        # Check for For or While loops
        for node in ast.walk(_tree):
            if isinstance(node, (ast.For, ast.While)):
                _passed = True
                break

    elif _req_type == 'uses_recursion':
        # Check if function calls itself
        for node in ast.walk(_tree):
            if isinstance(node, ast.FunctionDef):
                func_name = node.name
                for child in ast.walk(node):
                    if isinstance(child, ast.Call):
                        if isinstance(child.func, ast.Name) and child.func.id == func_name:
                            _passed = True
                            break

    elif _req_type == 'defines_function':
        # Check for function definition with specific name
        for node in ast.walk(_tree):
            if isinstance(node, ast.FunctionDef):
                if _req_name and node.name == _req_name:
                    _passed = True
                    break
                elif not _req_name:
                    _passed = True
                    break

    elif _req_type == 'defines_class':
        # Check for class definition with specific name
        for node in ast.walk(_tree):
            if isinstance(node, ast.ClassDef):
                if _req_name and node.name == _req_name:
                    _passed = True
                    break
                elif not _req_name:
                    _passed = True
                    break

    elif _req_type == 'uses_list_comprehension':
        # Check for list comprehension
        for node in ast.walk(_tree):
            if isinstance(node, ast.ListComp):
                _passed = True
                break

    elif _req_type == 'no_global_variables':
        # Check for assignments outside functions
        _has_global_vars = False
        for node in _tree.body:
            if isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                _has_global_vars = True
                break
        _passed = not _has_global_vars

    elif _req_type == 'no_print':
        # Check for print() calls
        _has_print = False
        for node in ast.walk(_tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == 'print':
                    _has_print = True
                    break
        _passed = not _has_print

    elif _req_type == 'uses_import':
        # Check for import of specific module
        for node in ast.walk(_tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if _req_name and alias.name == _req_name:
                        _passed = True
                        break
                    elif not _req_name:
                        _passed = True
                        break
            elif isinstance(node, ast.ImportFrom):
                if _req_name and node.module == _req_name:
                    _passed = True
                    break
                elif not _req_name:
                    _passed = True
                    break

except SyntaxError:
    _passed = False

_passed
`,
				{ globals: namespace }
			)) as boolean;

			namespace.delete('_chiphre_ast_code');
			namespace.delete('_chiphre_ast_requirement_type');
			namespace.delete('_chiphre_ast_requirement_name');

			if (!passed) {
				astIssues.push(requirement.message);
			}
		} catch (error) {
			try {
				namespace.delete('_chiphre_ast_code');
				namespace.delete('_chiphre_ast_requirement_type');
				namespace.delete('_chiphre_ast_requirement_name');
			} catch {
				// Ignore cleanup errors (key may not exist)
			}

			astIssues.push(
				`${requirement.message} (erreur: ${error instanceof Error ? error.message : String(error)})`
			);
		}
	}

	return astIssues;
}
