/**
 * Vérifie que toute variable OBLIGATOIRE de `src/env.ts` existe aussi dans
 * `.github/ci.env`.
 *
 * SvelteKit 3 : `$app/env/*` (et `$env/*`, qui le réexporte) n'expose que les
 * variables déclarées dans `src/env.ts`. Une variable déclarée sans `schema` est
 * obligatoire : absente de l'environnement, la génération des modules d'env
 * échoue (build, tests). En local elles viennent de `.env`, en CI de
 * `.github/ci.env` — et les deux divergent. Déclarer une clé présente seulement
 * en local donne donc une suite **verte en local et rouge en CI**.
 *
 * Le contrôle ne juge pas les valeurs — elles n'ont pas à être vraies en CI,
 * juste à exister. Les variables avec `schema` (facultatives) ne sont pas exigées.
 */
import { readFileSync } from 'node:fs';

const CI_ENV = '.github/ci.env';
const ENV_DECLARATIONS = 'src/env.ts';

function declaredKeys(file) {
	const keys = new Set();
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
		if (m) keys.add(m[1]);
	}
	return keys;
}

// Une déclaration par ligne dans `defineEnvVars({ … })` : `NOM: { … },`.
// Sans `schema` → obligatoire.
const DECLARATION_RE = /^\s*([A-Z_][A-Z0-9_]*)\s*:\s*\{(.*)\},?\s*$/;

const ciKeys = declaredKeys(CI_ENV);
const missing = [];

for (const line of readFileSync(ENV_DECLARATIONS, 'utf8').split('\n')) {
	const m = line.match(DECLARATION_RE);
	if (!m || /\bschema\b/.test(m[2])) continue;
	if (!ciKeys.has(m[1])) missing.push(m[1]);
}

if (missing.length === 0) {
	process.exit(0);
}

console.error(
	`❌ ${missing.length} variable(s) obligatoire(s) de ${ENV_DECLARATIONS} absente(s) de ${CI_ENV} :`
);
for (const name of missing) {
	console.error(`   ${name}`);
}
console.error('');
console.error(
	`Les tests et le build passeront en local et échoueront en CI. Ajoute-les à ${CI_ENV}`
);
console.error('(une valeur de substitution suffit : seule leur présence compte).');
process.exit(1);
