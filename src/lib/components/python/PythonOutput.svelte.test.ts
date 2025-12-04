/**
 * PythonOutput Component Tests
 * ============================
 *
 * Tests for the pedagogic error message translation functionality.
 * These tests verify that Python errors are correctly translated to
 * user-friendly French messages.
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Test Data: Error Translations
// =============================================================================

/**
 * Error translation patterns and their expected pedagogic messages.
 * This mirrors the ERROR_TRANSLATIONS constant in PythonOutput.svelte
 */
const ERROR_TRANSLATIONS: Record<string, { pattern: RegExp; message: string }> = {
	syntaxError: {
		pattern: /SyntaxError:\s*(.+)/i,
		message: 'Erreur de syntaxe : vérifiez la ponctuation (parenthèses, deux-points, guillemets)'
	},
	nameError: {
		pattern: /NameError:\s*name\s+'([^']+)'\s+is not defined/i,
		message: "Variable non définie : '$1' n'existe pas. Avez-vous bien déclaré cette variable ?"
	},
	typeError: {
		pattern: /TypeError:\s*(.+)/i,
		message: "Erreur de type : vous essayez d'utiliser une valeur d'un mauvais type"
	},
	indexError: {
		pattern: /IndexError:\s*(.+)/i,
		message: "Index invalide : vous essayez d'accéder à un élément qui n'existe pas dans la liste"
	},
	keyError: {
		pattern: /KeyError:\s*(.+)/i,
		message: "Clé introuvable : cette clé n'existe pas dans le dictionnaire"
	},
	valueError: {
		pattern: /ValueError:\s*(.+)/i,
		message: "Valeur invalide : la valeur fournie n'est pas acceptable"
	},
	zeroDivision: {
		pattern: /ZeroDivisionError/i,
		message: 'Division par zéro : impossible de diviser par zéro'
	},
	indentationError: {
		pattern: /IndentationError:\s*(.+)/i,
		message: "Erreur d'indentation : vérifiez l'alignement de votre code (espaces/tabulations)"
	},
	importError: {
		pattern: /ImportError:\s*(.+)/i,
		message: "Erreur d'import : le module demandé n'a pas pu être chargé"
	},
	moduleNotFound: {
		pattern: /ModuleNotFoundError:\s*No module named '([^']+)'/i,
		message:
			"Module non trouvé : '$1' n'est pas disponible. Modules disponibles : numpy, matplotlib, sympy"
	},
	attributeError: {
		pattern: /AttributeError:\s*(.+)/i,
		message: 'Attribut non trouvé : cet objet ne possède pas cette propriété ou méthode'
	},
	recursionError: {
		pattern: /RecursionError/i,
		message: "Récursion infinie : votre fonction s'appelle elle-même indéfiniment"
	},
	memoryError: {
		pattern: /MemoryError/i,
		message: 'Mémoire insuffisante : votre programme utilise trop de mémoire'
	}
};

/**
 * Get pedagogic message for a Python error
 * This is a copy of the function logic from PythonOutput.svelte for testing
 */
function getPedagogicMessage(error: string): string | null {
	for (const { pattern, message } of Object.values(ERROR_TRANSLATIONS)) {
		const match = error.match(pattern);
		if (match) {
			// Replace $1, $2, etc. with captured groups
			return message.replace(/\$(\d+)/g, (_, n) => match[parseInt(n)] || '');
		}
	}
	return null;
}

// =============================================================================
// Tests
// =============================================================================

describe('PythonOutput Pedagogic Error Messages', () => {
	// ===========================================================================
	// SyntaxError Tests
	// ===========================================================================

	describe('SyntaxError', () => {
		it('should translate basic SyntaxError', () => {
			const error = 'SyntaxError: invalid syntax';
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				'Erreur de syntaxe : vérifiez la ponctuation (parenthèses, deux-points, guillemets)'
			);
		});

		it('should translate SyntaxError with details', () => {
			const error = "SyntaxError: expected ':'";
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				'Erreur de syntaxe : vérifiez la ponctuation (parenthèses, deux-points, guillemets)'
			);
		});

		it('should be case insensitive', () => {
			const error = 'syntaxerror: missing parentheses';
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				'Erreur de syntaxe : vérifiez la ponctuation (parenthèses, deux-points, guillemets)'
			);
		});
	});

	// ===========================================================================
	// NameError Tests
	// ===========================================================================

	describe('NameError', () => {
		it('should translate NameError with variable name', () => {
			const error = "NameError: name 'x' is not defined";
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				"Variable non définie : 'x' n'existe pas. Avez-vous bien déclaré cette variable ?"
			);
		});

		it('should include the variable name in the message', () => {
			const error = "NameError: name 'myVariable' is not defined";
			const result = getPedagogicMessage(error);

			expect(result).toContain('myVariable');
		});

		it('should handle complex variable names', () => {
			const error = "NameError: name 'user_input_2' is not defined";
			const result = getPedagogicMessage(error);

			expect(result).toContain('user_input_2');
		});
	});

	// ===========================================================================
	// TypeError Tests
	// ===========================================================================

	describe('TypeError', () => {
		it('should translate TypeError', () => {
			const error = "TypeError: can't multiply sequence by non-int";
			const result = getPedagogicMessage(error);

			expect(result).toBe("Erreur de type : vous essayez d'utiliser une valeur d'un mauvais type");
		});

		it('should handle TypeError with function call info', () => {
			const error = "TypeError: 'int' object is not callable";
			const result = getPedagogicMessage(error);

			expect(result).toBe("Erreur de type : vous essayez d'utiliser une valeur d'un mauvais type");
		});
	});

	// ===========================================================================
	// IndexError Tests
	// ===========================================================================

	describe('IndexError', () => {
		it('should translate IndexError', () => {
			const error = 'IndexError: list index out of range';
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				"Index invalide : vous essayez d'accéder à un élément qui n'existe pas dans la liste"
			);
		});

		it('should handle tuple IndexError', () => {
			const error = 'IndexError: tuple index out of range';
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				"Index invalide : vous essayez d'accéder à un élément qui n'existe pas dans la liste"
			);
		});
	});

	// ===========================================================================
	// KeyError Tests
	// ===========================================================================

	describe('KeyError', () => {
		it('should translate KeyError', () => {
			const error = "KeyError: 'name'";
			const result = getPedagogicMessage(error);

			expect(result).toBe("Clé introuvable : cette clé n'existe pas dans le dictionnaire");
		});

		it('should handle numeric KeyError', () => {
			const error = 'KeyError: 42';
			const result = getPedagogicMessage(error);

			expect(result).toBe("Clé introuvable : cette clé n'existe pas dans le dictionnaire");
		});
	});

	// ===========================================================================
	// ValueError Tests
	// ===========================================================================

	describe('ValueError', () => {
		it('should translate ValueError', () => {
			const error = "ValueError: invalid literal for int() with base 10: 'abc'";
			const result = getPedagogicMessage(error);

			expect(result).toBe("Valeur invalide : la valeur fournie n'est pas acceptable");
		});

		it('should handle math domain ValueError', () => {
			const error = 'ValueError: math domain error';
			const result = getPedagogicMessage(error);

			expect(result).toBe("Valeur invalide : la valeur fournie n'est pas acceptable");
		});
	});

	// ===========================================================================
	// ZeroDivisionError Tests
	// ===========================================================================

	describe('ZeroDivisionError', () => {
		it('should translate ZeroDivisionError', () => {
			const error = 'ZeroDivisionError: division by zero';
			const result = getPedagogicMessage(error);

			expect(result).toBe('Division par zéro : impossible de diviser par zéro');
		});

		it('should match just the error name', () => {
			const error = 'ZeroDivisionError';
			const result = getPedagogicMessage(error);

			expect(result).toBe('Division par zéro : impossible de diviser par zéro');
		});
	});

	// ===========================================================================
	// IndentationError Tests
	// ===========================================================================

	describe('IndentationError', () => {
		it('should translate IndentationError', () => {
			const error = 'IndentationError: unexpected indent';
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				"Erreur d'indentation : vérifiez l'alignement de votre code (espaces/tabulations)"
			);
		});

		it('should handle expected indent error', () => {
			const error = 'IndentationError: expected an indented block';
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				"Erreur d'indentation : vérifiez l'alignement de votre code (espaces/tabulations)"
			);
		});
	});

	// ===========================================================================
	// ImportError Tests
	// ===========================================================================

	describe('ImportError', () => {
		it('should translate ImportError', () => {
			const error = "ImportError: cannot import name 'foo' from 'bar'";
			const result = getPedagogicMessage(error);

			expect(result).toBe("Erreur d'import : le module demandé n'a pas pu être chargé");
		});
	});

	// ===========================================================================
	// ModuleNotFoundError Tests
	// ===========================================================================

	describe('ModuleNotFoundError', () => {
		it('should translate ModuleNotFoundError with module name', () => {
			const error = "ModuleNotFoundError: No module named 'pandas'";
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				"Module non trouvé : 'pandas' n'est pas disponible. Modules disponibles : numpy, matplotlib, sympy"
			);
		});

		it('should include the module name in the message', () => {
			const error = "ModuleNotFoundError: No module named 'tensorflow'";
			const result = getPedagogicMessage(error);

			expect(result).toContain('tensorflow');
		});
	});

	// ===========================================================================
	// AttributeError Tests
	// ===========================================================================

	describe('AttributeError', () => {
		it('should translate AttributeError', () => {
			const error = "AttributeError: 'list' object has no attribute 'push'";
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				'Attribut non trouvé : cet objet ne possède pas cette propriété ou méthode'
			);
		});

		it('should handle module AttributeError', () => {
			const error = "AttributeError: module 'numpy' has no attribute 'matrix'";
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				'Attribut non trouvé : cet objet ne possède pas cette propriété ou méthode'
			);
		});
	});

	// ===========================================================================
	// RecursionError Tests
	// ===========================================================================

	describe('RecursionError', () => {
		it('should translate RecursionError', () => {
			const error = 'RecursionError: maximum recursion depth exceeded';
			const result = getPedagogicMessage(error);

			expect(result).toBe("Récursion infinie : votre fonction s'appelle elle-même indéfiniment");
		});

		it('should match just the error name', () => {
			const error = 'RecursionError';
			const result = getPedagogicMessage(error);

			expect(result).toBe("Récursion infinie : votre fonction s'appelle elle-même indéfiniment");
		});
	});

	// ===========================================================================
	// MemoryError Tests
	// ===========================================================================

	describe('MemoryError', () => {
		it('should translate MemoryError', () => {
			const error = 'MemoryError';
			const result = getPedagogicMessage(error);

			expect(result).toBe('Mémoire insuffisante : votre programme utilise trop de mémoire');
		});
	});

	// ===========================================================================
	// Unknown Error Tests
	// ===========================================================================

	describe('Unknown Errors', () => {
		it('should return null for unknown error types', () => {
			const error = 'SomeCustomError: something went wrong';
			const result = getPedagogicMessage(error);

			expect(result).toBe(null);
		});

		it('should return null for empty string', () => {
			const error = '';
			const result = getPedagogicMessage(error);

			expect(result).toBe(null);
		});

		it('should return null for non-error text', () => {
			const error = 'This is just regular output';
			const result = getPedagogicMessage(error);

			expect(result).toBe(null);
		});
	});

	// ===========================================================================
	// Edge Cases
	// ===========================================================================

	describe('Edge Cases', () => {
		it('should handle error in traceback context', () => {
			const error =
				'Traceback (most recent call last):\n  File "<stdin>", line 1\nNameError: name \'x\' is not defined';
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				"Variable non définie : 'x' n'existe pas. Avez-vous bien déclaré cette variable ?"
			);
		});

		it('should match first error if multiple errors present', () => {
			const error = "SyntaxError: invalid syntax\nNameError: name 'x' is not defined";
			const result = getPedagogicMessage(error);

			// Should match SyntaxError first
			expect(result).toBe(
				'Erreur de syntaxe : vérifiez la ponctuation (parenthèses, deux-points, guillemets)'
			);
		});

		it('should handle error with extra whitespace', () => {
			const error = 'SyntaxError:   invalid syntax  ';
			const result = getPedagogicMessage(error);

			expect(result).toBe(
				'Erreur de syntaxe : vérifiez la ponctuation (parenthèses, deux-points, guillemets)'
			);
		});
	});
});

// =============================================================================
// Additional Unit Tests for Component Logic
// =============================================================================

describe('PythonOutput Component Logic', () => {
	describe('hasOutput derived state', () => {
		it('should return false when all outputs are empty', () => {
			const stdout = '';
			const stderr = '';
			const plotData: string | null = null;

			const hasOutput = stdout.length > 0 || stderr.length > 0 || plotData !== null;

			expect(hasOutput).toBe(false);
		});

		it('should return true when stdout is not empty', () => {
			const stdout = 'Hello World';
			const stderr = '';
			const plotData: string | null = null;

			const hasOutput = stdout.length > 0 || stderr.length > 0 || plotData !== null;

			expect(hasOutput).toBe(true);
		});

		it('should return true when stderr is not empty', () => {
			const stdout = '';
			const stderr = 'Error occurred';
			const plotData: string | null = null;

			const hasOutput = stdout.length > 0 || stderr.length > 0 || plotData !== null;

			expect(hasOutput).toBe(true);
		});

		it('should return true when plotData is present', () => {
			const stdout = '';
			const stderr = '';
			const plotData: string | null = 'data:image/png;base64,abc123';

			const hasOutput = stdout.length > 0 || stderr.length > 0 || plotData !== null;

			expect(hasOutput).toBe(true);
		});
	});
});
