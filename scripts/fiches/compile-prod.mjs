#!/usr/bin/env node
/**
 * Compile des fichiers .typ avec le compilateur EXACT de la production
 * ====================================================================
 *
 * En production, le PDF est compilé dans le navigateur par typst.ts 0.6.1-rc5
 * (`src/lib/typst/compiler/typst-compiler.ts`), avec les paquets `@preview`
 * (cetz, vartable…). Le Typst CLI local (0.14) n'est PAS un bon témoin : il échoue
 * sur cetz 0.3.0 (faux négatif) et accepte des choses que 0.6.1-rc5 refuse. Une
 * seule erreur fait échouer TOUT le PDF d'une fiche.
 *
 * Le compilateur est `@myriaddreamin/typst-ts-web-compiler`, épinglé en devDependency
 * sur la MÊME version que celle que la production charge depuis le CDN
 * (`TYPST_VERSION` de typst-compiler.ts : les garder égales). Les paquets `@preview`
 * sont téléchargés à la demande (curl). Les images d'une fiche (`/virtual/images/…`) sont
 * lues dans un dossier `virtual/images/` placé à côté du .typ.
 *
 * Écrit `<nom>.pdf` à côté de chaque `<nom>.typ` ; code de sortie 1 si un seul
 * fichier échoue.
 *
 * Usage : node scripts/fiches/compile-prod.mjs <fichier.typ>...
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createTypstCompiler } from '@myriaddreamin/typst.ts/compiler';
import {
	loadFonts,
	withAccessModel,
	withPackageRegistry
} from '@myriaddreamin/typst.ts/options.init';
import { MemoryAccessModel } from '@myriaddreamin/typst.ts/fs/memory';
import { NodeFetchPackageRegistry } from '@myriaddreamin/typst.ts/fs/package.node';

const WASM = join(
	'node_modules',
	'@myriaddreamin',
	'typst-ts-web-compiler',
	'pkg',
	'typst_ts_web_compiler_bg.wasm'
);
// Police mathématique : STIX Two Math (macOS) ; le texte utilise les polices intégrées
const MATH_FONT = '/System/Library/Fonts/Supplemental/STIXTwoMath.otf';

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
	console.error('Usage : node scripts/fiches/compile-prod.mjs <fichier.typ>...');
	process.exit(2);
}
if (!existsSync(WASM)) {
	console.error(`Compilateur introuvable : ${WASM} (lancer depuis la racine, après pnpm install)`);
	process.exit(2);
}
if (!existsSync(MATH_FONT)) {
	console.error(`Police mathématique introuvable : ${MATH_FONT} (adapter MATH_FONT)`);
	process.exit(2);
}

const acces = new MemoryAccessModel();
// Téléchargement immédiat : différé dans getBody, un paquet introuvable n'aurait
// jamais rendu 404 (le `catch` était inaccessible) et l'erreur surgissait plus loin.
const telecharger = (_m, url) => {
	try {
		const corps = execFileSync('curl', ['-sfL', url]);
		return { statusCode: 200, getBody: () => corps };
	} catch {
		return { statusCode: 404 };
	}
};
const compilateur = createTypstCompiler();
await compilateur.init({
	getModule: () => readFileSync(WASM),
	beforeBuild: [
		loadFonts([new Uint8Array(readFileSync(MATH_FONT))]),
		withAccessModel(acces),
		withPackageRegistry(new NodeFetchPackageRegistry(acces, telecharger))
	]
});

let echecs = 0;
for (const f of fichiers) {
	const images = join(dirname(f), 'virtual', 'images');
	if (existsSync(images)) {
		for (const img of readdirSync(images)) {
			compilateur.mapShadow(
				`/virtual/images/${img}`,
				new Uint8Array(readFileSync(join(images, img)))
			);
		}
	}
	compilateur.addSource('/main.typ', readFileSync(f, 'utf8'));
	// format 1 = PDF
	const r = await compilateur.compile({
		mainFilePath: '/main.typ',
		format: 1,
		diagnostics: 'full'
	});
	const erreurs = (r.diagnostics ?? []).filter(
		(d) => d.severity === 'Error' || d.severity === 'error' || d.severity === 0
	);
	if (r.result) writeFileSync(f.replace(/\.typ$/, '.pdf'), r.result);
	else echecs++;
	console.log(
		`${f.split('/').pop()} ${r.result ? 'OK' : '⛔ ÉCHEC'}`,
		erreurs.length ? JSON.stringify(erreurs).slice(0, 600) : ''
	);
}
process.exit(echecs ? 1 : 0);
