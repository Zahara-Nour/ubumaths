/**
 * `use:enhance` qui reste sur la page
 * ===================================
 *
 * Depuis SvelteKit 3, `update()` d'un formulaire amélioré navigue par défaut vers l'adresse de
 * l'action (`?/save`), privée de la recherche de la page : `?class=…&week=…`, `?depuis=profil`,
 * un jeton `?u=…&t=…` étaient perdus. `navigate: false` rend le comportement d'avant : le
 * résultat s'applique à la page affichée, les données sont relues, une redirection du serveur est
 * toujours suivie.
 *
 * Usage : `<form method="POST" action="?/save" use:enhance={stayOnPage}>` à la place d'un
 * `use:enhance` nu ; dans un callback, `await update({ navigate: false })`.
 */

import type { SubmitFunction } from '$app/forms';

export const stayOnPage: SubmitFunction = () => {
	return async ({ update }) => {
		await update({ navigate: false });
	};
};
