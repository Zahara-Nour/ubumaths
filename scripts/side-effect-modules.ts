/**
 * Modules de `src/lib` qui agissent au chargement
 * ===============================================
 *
 * Rollup (Rolldown sous Vite 8) n'élague un module que s'il peut prouver que
 * son exécution n'a pas d'effet. Il ne le peut pas pour une constante de
 * niveau module construite par un appel (`const RULES = [createRule(P.add(…))]`,
 * `new Set([...])`) : faute de preuve, il garde le module ENTIER dès qu'on le
 * traverse, même si rien de ce qu'il exporte n'est utilisé.
 *
 * Mesuré le 2026-11-11 (chantier amelioration) : importer `parseMarkdown` par
 * `$lib/ubumark` embarquait l'intégration symbolique, `tidy`, les règles de
 * motifs, les générateurs Typst… ~210 Ko gzip de trop sur 67 pages qui
 * affichent du markdown, ~60 Ko sur l'atelier.
 *
 * Le build client déclare donc les modules `.ts` de `src/lib` sans effet de
 * bord, SAUF ceux de la liste ci-dessous, qui font quelque chose au
 * chargement (enregistrer un instrument, configurer zod…). Un module sans
 * effet dont un export est utilisé reste bien sûr dans le build.
 *
 * Garde : `scripts/__tests__/side-effect-modules.test.ts` relit `src/lib` et
 * échoue si un module agit au chargement sans être dans la liste.
 */

/**
 * Chemins relatifs à `src/lib`. Les entrées détectées par
 * `findTopLevelEffects` (instruction de niveau module) ET les effets cachés
 * dans l'initialiseur d'une constante, que la détection ne voit pas
 * (commentés).
 */
export const MODULES_WITH_SIDE_EFFECTS: ReadonlySet<string> = new Set([
	'constructions/instruments/compass.ts',
	'constructions/instruments/index.ts',
	'constructions/instruments/pencil.ts',
	'constructions/instruments/ruler.ts',
	'exercises/typst/exercise-typst-generator.ts',
	'geometry-core/dsl/builtins.ts',
	'mathAST/cli/cli.ts',
	'mathAST/integration/integrators/index.ts',
	'mathAST/pedagogical-solve/quadratic-inequality.ts',
	'questions/answer-assumptions.ts',
	'questions/construction/positions-setup.ts',
	'questions/review/check-template.ts',
	'questions/test-spec-runner.ts',
	'typst/generators/notebook-generator.ts',
	'ubumark/generators/figure-typst-setup.ts',
	'utils/logger.ts',
	// Rien qu'un `import 'mathlive/static.css'` : les polices KaTeX de MathLive.
	'utils/mathlive-styles.ts',
	'workers/js-sandbox.worker.ts',
	'workers/pyodide.worker.ts',
	'worksheets/document/render-exercise.ts',
	'zod-locale.ts',
	// Effet caché dans un initialiseur : `Blockly.Theme.defineTheme` enregistre
	// le thème « chiphre » auprès de Blockly.
	'shared/blockly/config.ts'
]);

const SRC_LIB_TS = /[\\/]src[\\/]lib[\\/](.+\.ts)$/;

/**
 * `treeshake.moduleSideEffects` du build client : `false` pour un module
 * `.ts` de `src/lib` hors liste, `true` (le défaut de Rollup) pour tout le
 * reste — dépendances, composants `.svelte`, CSS, modules virtuels.
 */
export function moduleSideEffects(id: string): boolean {
	const match = SRC_LIB_TS.exec(id);
	if (match === null) return true;
	return MODULES_WITH_SIDE_EFFECTS.has(match[1].replaceAll('\\', '/'));
}
