/**
 * Vérifie que toute variable importée depuis `$env/static/*` existe aussi dans
 * `.github/ci.env`.
 *
 * SvelteKit engendre les membres de `$env/static/*` à partir de l'environnement
 * réel. En local ils viennent de `.env`, en CI de `.github/ci.env` — et les deux
 * divergent (10 clés d'un côté, 5 de l'autre au 2026-09-08). Importer une clé
 * présente seulement en local donne donc un typecheck **vert en local et rouge
 * en CI**, sans rien pour prévenir : exactement l'aller-retour qu'on cherche à
 * supprimer.
 *
 * Le contrôle ne juge pas les valeurs — elles n'ont pas à être vraies en CI,
 * juste à exister pour que le membre soit émis.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CI_ENV = '.github/ci.env';
const ROOT = 'src';

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) return walk(p);
		return /\.(ts|svelte|js)$/.test(name) ? [p] : [];
	});
}

function declaredKeys(file) {
	const keys = new Set();
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
		if (m) keys.add(m[1]);
	}
	return keys;
}

// Capture le bloc `{ … }` d'un import, y compris sur plusieurs lignes, et
// seulement pour `$env/static/*` — `$env/dynamic/*` se lit à l'exécution.
const IMPORT_RE =
	/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]\$env\/static\/(?:private|public)['"]/g;

const ciKeys = declaredKeys(CI_ENV);
const missing = new Map();

for (const file of walk(ROOT)) {
	const source = readFileSync(file, 'utf8');
	for (const match of source.matchAll(IMPORT_RE)) {
		for (const raw of match[1].split(',')) {
			const name = raw.split(/\s+as\s+/)[0].trim();
			if (!name || !/^[A-Z_][A-Z0-9_]*$/.test(name)) continue;
			if (!ciKeys.has(name)) {
				if (!missing.has(name)) missing.set(name, []);
				missing.get(name).push(file);
			}
		}
	}
}

if (missing.size === 0) {
	process.exit(0);
}

console.error(
	`❌ ${missing.size} variable(s) importée(s) de $env/static absente(s) de ${CI_ENV} :`
);
for (const [name, files] of missing) {
	console.error(`   ${name}  —  ${files.join(', ')}`);
}
console.error('');
console.error(`Le typecheck passera en local et échouera en CI. Ajoute-les à ${CI_ENV}`);
console.error('(une valeur de substitution suffit : seule leur présence compte).');
process.exit(1);
