import prettier from 'eslint-config-prettier';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import { loadConfig } from '@sveltejs/load-config';
import requireZodValidation from './eslint-rules/require-zod-validation.js';
import requireSupabaseErrorCheck from './eslint-rules/require-supabase-error-check.js';

// SvelteKit 3 : la config Svelte vit dans les options du plugin `sveltekit()` de vite.config.ts
const loadedSvelteConfig = (await loadConfig('./', { traverse: false }))?.config;
// `version.name` vaut `Date.now()` à chaque chargement : ESLint met la config dans
// l'empreinte de son cache, qui changeait donc à chaque lancement, et les ~1 300
// fichiers Svelte étaient tous relus (Lint de la CI de version : 25 min, cache restauré).
// Ni eslint-plugin-svelte ni svelte-eslint-parser ne lisent `version` : on le retire.
const svelteConfig = loadedSvelteConfig && { ...loadedSvelteConfig, version: undefined };

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		ignores: ['extern/**', 'externe/**', 'static/upsilon-simulator/**']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			// Allow variables starting with _ to be unused (common convention for intentionally unused variables)
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			// Disable navigation resolve requirement - we use static string literals which are safe
			'svelte/no-navigation-without-resolve': 'off',
			// Disable overly strict Svelte rules that produce false positives for legitimate patterns
			'svelte/no-dom-manipulating': 'off', // Required for canvas/WebGL (MathGraph32, MathLive)
			'svelte/no-at-html-tags': 'off', // Required for sanitized markdown rendering
			'svelte/prefer-svelte-reactivity': 'warn', // Sometimes $state is more appropriate than Svelte wrappers
			'svelte/prefer-writable-derived': 'warn' // Sometimes $state + $effect is clearer than $derived
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	// Custom rules for API routes
	{
		files: ['src/routes/api/**/*.ts'],
		plugins: {
			custom: {
				rules: {
					'require-zod-validation': requireZodValidation
				}
			}
		},
		rules: {
			'custom/require-zod-validation': 'error'
		}
	},
	// Une requête PostgREST qui échoue rend `data === null` sans lever : ignorer
	// `error`, c'est afficher un écran vide sans trace. La règle exige seulement
	// que l'erreur soit nommée ; ce qu'on en fait reste une décision de contexte.
	{
		files: ['src/**/*.ts', 'src/**/*.svelte'],
		ignores: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
		plugins: {
			supabase: {
				rules: {
					'require-error-check': requireSupabaseErrorCheck
				}
			}
		},
		rules: {
			'supabase/require-error-check': 'error'
		}
	},
	// La forme canonique d'une expression a un nom : `canonicalForm`
	// (`#lib/mathAST/normal/canonical-form.ts`). Écrit en ligne, l'appel se
	// recopie sans qu'on sache qu'il sert à comparer ou à calculer, pas à
	// montrer (ADR 0032). Règle AST : les appels écrits sur plusieurs lignes
	// sont vus aussi.
	{
		files: ['src/**/*.ts', 'src/**/*.svelte'],
		ignores: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector:
						"CallExpression[callee.name='denormalize'] > CallExpression.arguments[callee.name='normalize']",
					message:
						'Écrire `canonicalForm(…)` (`#lib/mathAST/normal/canonical-form.ts`) au lieu de `denormalize(normalize(…))`.'
				}
			]
		}
	}
);
