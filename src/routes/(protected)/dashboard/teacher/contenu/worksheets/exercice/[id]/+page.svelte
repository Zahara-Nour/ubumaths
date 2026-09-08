<!--
	Page de résolution : le `load` redirige toujours vers la fiche, ou lève une
	erreur si la référence est morte. Ce composant n'est donc jamais rendu — il
	existe parce que SvelteKit exige un `+page.svelte` pour qu'une route existe,
	et c'est cette existence que vérifie le test du registre d'adressage.
-->
<p class="p-4 text-muted-foreground">Redirection vers la fiche…</p>
