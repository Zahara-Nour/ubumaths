import { readFileSync } from 'node:fs';

/**
 * Serveur de dev lancé par Playwright (`pnpm test:verifs`, captures)
 * ==================================================================
 *
 * Quand aucun serveur n'écoute sur le port, Playwright lance la commande de
 * `webServer`, puis l'arrête à la fin en tuant son groupe de processus. Lancé
 * par `pnpm dev`, le serveur survivait : pnpm met le script dans un groupe à lui
 * (`sh -c … && vite dev`), Playwright n'arrête que pnpm et attend sans fin que
 * le port se libère (2 h 30 bloqué le 2026-11-26, défaut 9 du chantier
 * `verifs-auto`).
 *
 * On joue donc le script `dev` de `package.json` sans pnpm : les gardes qui le
 * précèdent (dépôt principal, base locale à jour) restent les siennes, et
 * `vite dev` passe par `exec` dans le shell que Playwright a lancé, donc dans
 * le groupe qu'il arrête.
 */

const VITE_DEV = /(^|&&\s*)vite dev$/;

/** Commande de `webServer` tirée du script `dev` (texte de `package.json`). */
export function devServerCommand(devScript: string, port: number): string {
	if (!VITE_DEV.test(devScript)) {
		throw new Error(
			`Script « dev » inattendu (${devScript}) : il doit finir par « vite dev » (e2e/verifs/serveur-de-dev.ts).`
		);
	}
	return devScript.replace(
		VITE_DEV,
		`$1exec ./node_modules/.bin/vite dev --port ${port} --strictPort`
	);
}

/** Même chose, le script `dev` lu dans le `package.json` du dépôt (pas celui du dossier de lancement). */
export function devServerCommandFromPackage(port: number): string {
	const pkg: unknown = JSON.parse(
		readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
	);
	const scripts = typeof pkg === 'object' && pkg !== null && 'scripts' in pkg ? pkg.scripts : null;
	const dev =
		typeof scripts === 'object' && scripts !== null && 'dev' in scripts ? scripts.dev : null;
	if (typeof dev !== 'string') throw new Error('package.json sans script « dev »');
	return devServerCommand(dev, port);
}
