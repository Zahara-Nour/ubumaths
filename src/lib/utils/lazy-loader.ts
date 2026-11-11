/**
 * Chargement à la demande d'un module
 * ===================================
 *
 * Enveloppe un `import()` pour qu'un module lourd ne pèse pas sur le premier
 * chargement de la page, sans le télécharger deux fois :
 * - un seul téléchargement, même si plusieurs appelants le demandent en même
 *   temps ;
 * - une fois chargé, `loaded` le rend tout de suite, sans attendre une
 *   promesse (pas d'état « chargement » qui clignote) ;
 * - un échec (réseau coupé, nouvelle version déployée) n'est pas retenu : le
 *   `load()` suivant réessaie.
 */

export interface LazyLoader<T> {
	/** Le module, s'il est déjà chargé. */
	readonly loaded: T | undefined;
	/** Charge le module (une seule fois) et le rend. */
	load(): Promise<T>;
}

export function lazyLoader<T>(importer: () => Promise<T>): LazyLoader<T> {
	let loaded: T | undefined;
	let pending: Promise<T> | null = null;
	return {
		get loaded() {
			return loaded;
		},
		load() {
			pending ??= importer().then(
				(value) => {
					loaded = value;
					return value;
				},
				(error: unknown) => {
					pending = null;
					throw error;
				}
			);
			return pending;
		}
	};
}
