/**
 * Adresse d'un chemin du site porté par une variable (`item.href`, `cityPath(…)`).
 *
 * SvelteKit 3 : `resolve('/…')` attend un id de route (`/(public)/shtam`) ; un chemin
 * s'écrit sans `/` initial (`resolve('shtam')`). Pour un chemin écrit en dur, appeler
 * `resolve` directement : il est vérifié contre les routes. Ce helper sert aux chemins
 * connus seulement à l'exécution, que `resolve` ne sait pas typer (son type se
 * distribue sur une union de chemins et refuse une simple chaîne).
 */
import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';

/** `'/shtam'` → `'/shtam'` préfixé du chemin de base de l'appli (comme `resolve('shtam')`). */
export function resolvePath(path: string): ResolvedPathname {
	const pathname = path.startsWith('/') ? path.slice(1) : path;
	// Le type ne peut pas être vérifié ici : le chemin vient d'une donnée.
	return resolve(pathname as '');
}
