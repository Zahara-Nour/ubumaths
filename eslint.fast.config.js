/**
 * Config eslint « rapide » : uniquement les deux règles maison.
 *
 * Le coût d'eslint vient de `projectService: true`, qui construit tout le
 * programme TypeScript. Or `require-zod-validation` et
 * `require-supabase-error-check` sont des règles AST pures — elles ne consultent
 * jamais le vérificateur de types. Sans le service, elles couvrent tout le
 * projet pour une fraction du coût, ce qui permet de les lancer avant de
 * pousser plutôt que d'attendre un aller-retour CI.
 *
 * `configs.base` installe le parseur Svelte sans activer de règles ; les plugins
 * sont enregistrés (sans leurs règles) pour que les commentaires
 * `eslint-disable` du code se résolvent au lieu de lever « rule not found ».
 *
 * La config complète (`eslint.config.js`) reste la référence en CI.
 */
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import ts from 'typescript-eslint';
import requireZodValidation from './eslint-rules/require-zod-validation.js';
import requireSupabaseErrorCheck from './eslint-rules/require-supabase-error-check.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{ ignores: ['externe/**', 'static/upsilon-simulator/**'] },
	...svelte.configs.base,
	{
		// `configs.base` pose le parseur Svelte mais laisse le `<script>` en JS :
		// sans cette délégation, tout `lang="ts"` casse au premier type annoté.
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] } }
	},
	{
		files: ['**/*.ts'],
		languageOptions: { parser: ts.parser }
	},
	{
		// Aucune règle de ces plugins n'est active ici : leurs `eslint-disable`
		// seraient donc tous signalés inutiles. C'est un artefact de la config
		// réduite, pas une information.
		linterOptions: { reportUnusedDisableDirectives: 'off' }
	},
	{
		// Enregistrés pour leurs noms seulement : aucune de leurs règles n'est activée.
		plugins: { '@typescript-eslint': ts.plugin }
	},
	{
		files: ['src/routes/api/**/*.ts'],
		plugins: { custom: { rules: { 'require-zod-validation': requireZodValidation } } },
		rules: { 'custom/require-zod-validation': 'error' }
	},
	{
		files: ['src/**/*.ts', 'src/**/*.svelte'],
		ignores: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
		plugins: { supabase: { rules: { 'require-error-check': requireSupabaseErrorCheck } } },
		rules: { 'supabase/require-error-check': 'error' }
	}
);
