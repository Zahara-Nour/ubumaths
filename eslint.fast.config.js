/**
 * Config eslint « rapide » : les règles de la config complète, sans le service
 * TypeScript.
 *
 * Le coût d'eslint vient de `projectService: true`, qui construit tout le
 * programme TypeScript. La config complète (`eslint.config.js`) ne le pose que
 * sur les fichiers Svelte, et ses règles de niveau ERREUR sont des règles AST
 * ou de jeton :
 *
 * - `js.configs.recommended` : `no-fallthrough` (CI rouge de #927 alors que ce
 *   lint rapide était vert), `no-case-declarations`, `no-useless-escape`,
 *   `no-irregular-whitespace` (#762), `prefer-const`, `no-empty`… ;
 * - `ts.configs.recommended`, la variante SANS types de typescript-eslint :
 *   `no-explicit-any`, `ban-ts-comment`, `no-unused-expressions`,
 *   `no-unused-vars`… ;
 * - `svelte.configs.recommended` : `require-each-key`, `valid-each-key`,
 *   `no-unused-svelte-ignore`, `no-useless-mustaches`… ;
 * - les deux règles maison : `custom/require-zod-validation`,
 *   `supabase/require-error-check`.
 *
 * Seule exception : `svelte/no-unused-props` exige les types et se tait sans
 * eux (`getTypeScriptTools` rend null) — elle reste vue par la CI seule.
 *
 * On réutilise donc la config complète telle quelle en retirant seulement
 * `projectService` : la liste des règles ne peut pas diverger de la CI. Les
 * règles en `warn` ne font pas échouer la CI ; `scripts/lint-fast.sh` passe
 * `--quiet` pour n'afficher que les erreurs.
 */
import fullConfig from './eslint.config.js';

/**
 * Copie d'un bloc de config sans `projectService` (le parseur TS des
 * `<script lang="ts">` et `svelteConfig` sont conservés).
 */
function withoutProjectService(block) {
	const parserOptions = block.languageOptions?.parserOptions;
	if (!parserOptions || !('projectService' in parserOptions)) return block;
	const { projectService: _projectService, ...rest } = parserOptions;
	return {
		...block,
		languageOptions: { ...block.languageOptions, parserOptions: rest }
	};
}

export default fullConfig.map(withoutProjectService);
