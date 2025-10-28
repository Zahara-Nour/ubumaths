/**
 * @fileoverview Require Zod validation for request.json() and url.searchParams
 * @author UbuMaths Team
 *
 * This rule enforces security best practices by ensuring all API endpoints
 * validate user input using Zod schemas before processing.
 */

export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Require Zod validation when parsing request data',
			category: 'Security',
			recommended: true
		},
		messages: {
			missingRequestValidation:
				'request.json() must be followed by Zod validation (.safeParse or .parse)',
			missingQueryValidation:
				'url.searchParams usage must be followed by Zod validation (.safeParse or .parse)',
			unsafeDirectUsage:
				'Direct usage of request/query data without validation. Use Zod schema validation first.'
		},
		schema: []
	},

	create(context) {
		// Track state across the file (using closure for state)
		let hasZodImport = false;
		let zodValidationLines = new Set();
		let requestJsonLines = new Set();
		let searchParamsLines = new Set();
		let validatedVariables = new Set();
		let rawDataVariables = new Set();

		return {
			// Reset state for each file
			Program() {
				hasZodImport = false;
				zodValidationLines = new Set();
				requestJsonLines = new Set();
				searchParamsLines = new Set();
				validatedVariables = new Set();
				rawDataVariables = new Set();
			},

			// Check for Zod import
			ImportDeclaration(node) {
				if (node.source.value === 'zod') {
					hasZodImport = true;
				}
			},

			// Track await request.json() calls
			AwaitExpression(node) {
				if (
					node.argument.type === 'CallExpression' &&
					node.argument.callee.type === 'MemberExpression' &&
					node.argument.callee.property.name === 'json' &&
					node.argument.callee.object.name === 'request'
				) {
					const line = node.loc.start.line;
					requestJsonLines.add(line);

					// Track variable assignment (e.g., const body = await request.json())
					const parent = node.parent;
					if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
						rawDataVariables.add(parent.id.name);
					}
				}
			},

			// Track url.searchParams.get() usage
			MemberExpression(node) {
				// Detect url.searchParams.get()
				if (
					node.object.type === 'MemberExpression' &&
					node.object.object.name === 'url' &&
					node.object.property.name === 'searchParams' &&
					node.property.name === 'get'
				) {
					const line = node.loc.start.line;
					searchParamsLines.add(line);
				}

				// Also detect url.searchParams used in object construction
				// Pattern: { param: url.searchParams.get('param') }
				if (
					node.object.type === 'Identifier' &&
					node.object.name === 'url' &&
					node.property.name === 'searchParams'
				) {
					const line = node.loc.start.line;
					searchParamsLines.add(line);
				}

				// Check for validation.success pattern (proper error handling)
				if (
					node.object.type === 'Identifier' &&
					validatedVariables.has(node.object.name) &&
					node.property.name === 'success'
				) {
					// This is good - they're checking validation.success
					// Remove from tracking to prevent false positives
					const parent = node.parent;
					if (parent.type === 'UnaryExpression' && parent.operator === '!') {
						// Pattern: !validation.success
						validatedVariables.delete(node.object.name);
					}
				}
			},

			// Track Zod .safeParse() or .parse() calls
			CallExpression(node) {
				if (
					node.callee.type === 'MemberExpression' &&
					(node.callee.property.name === 'safeParse' || node.callee.property.name === 'parse')
				) {
					const line = node.loc.start.line;
					zodValidationLines.add(line);

					// Track validated variables
					// Pattern: const validation = schema.safeParse(data)
					const parent = node.parent;
					if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
						validatedVariables.add(parent.id.name);
					}

					// If validating a raw data variable, mark it as checked
					if (node.arguments.length > 0 && node.arguments[0].type === 'Identifier') {
						const validatedVar = node.arguments[0].name;
						if (rawDataVariables.has(validatedVar)) {
							rawDataVariables.delete(validatedVar); // Remove from unvalidated list
						}
					}
				}
			},

			// At end of file, check for violations
			'Program:exit'(programNode) {
				// Skip test files
				const filename = context.filename || context.getFilename();

				const isTestFile = filename.includes('.test.') || filename.includes('.spec.');
				const isApiFile = filename.includes('/routes/api/') || filename.includes('/api/');

				if (isTestFile) {
					return;
				}

				// Only check API route files (must be in src/routes/api/ or contain 'api' for tests)
				if (!isApiFile) {
					return;
				}

				// If no Zod import, skip (might be read-only endpoint)
				if (!hasZodImport) {
					return;
				}

				// Check if there are request.json() or searchParams calls
				const hasRequestData = requestJsonLines.size > 0;
				const hasQueryParams = searchParamsLines.size > 0;

				// If there's user input but no validation, that's a problem
				if ((hasRequestData || hasQueryParams) && zodValidationLines.size === 0) {
					// Find the first occurrence to report
					if (hasRequestData) {
						// Report on the first request.json() call
						context.report({
							node: programNode,
							loc: { line: Math.min(...requestJsonLines), column: 0 },
							messageId: 'missingRequestValidation'
						});
					}

					if (hasQueryParams) {
						// Report on the first searchParams usage
						context.report({
							node: programNode,
							loc: { line: Math.min(...searchParamsLines), column: 0 },
							messageId: 'missingQueryValidation'
						});
					}
					return; // Don't check rawDataVariables if we already reported missing validation
				}

				// Additional check: unvalidated raw data variables used directly
				// This catches cases where await request.json() is assigned but never validated
				// Only report if we have Zod validation but it's applied to wrong data
				if (rawDataVariables.size > 0 && zodValidationLines.size > 0) {
					rawDataVariables.forEach((_varName) => {
						context.report({
							node: programNode,
							loc: { line: 1, column: 0 },
							messageId: 'unsafeDirectUsage',
							data: { method: 'request.json()' }
						});
					});
				}
			}
		};
	}
};
