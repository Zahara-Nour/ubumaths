/**
 * Helpers pour tester un `load` SvelteKit.
 *
 * Un `load` est typé `MaybePromise<void | données>` : avant de lire ses
 * données, un test doit écarter `void`. `loadedData` le fait en échouant si
 * le load n'a rien rendu — un test qui attend des données doit alors rougir,
 * pas lire `undefined.rows`.
 */
export function loadedData<T extends object>(result: T | void): T {
	if (!result) throw new Error('Le load n’a rendu aucune donnée');
	return result;
}
