<!--
	Kanban Board Detail - Phase 4 Placeholder
	==========================================

	This route is a stub. The full board view (columns + drag&drop cards) is
	delivered by Phase 4. We ship the stub now so that `resolve('/organisation/
	kanban/[boardId]')` typechecks from the boards list page.
-->

<script lang="ts">
	import { page } from '$app/state';
	import { Construction } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	const boardId = $derived(page.params.boardId ?? '');
</script>

<div
	class="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/30 p-10 text-center"
>
	<Construction class="h-10 w-10 text-muted-foreground" aria-hidden="true" />
	<h2 class="text-xl font-semibold">Vue tableau en construction</h2>
	<p class="text-sm text-muted-foreground">
		L'affichage détaillé du tableau (colonnes et cartes) arrivera dans la prochaine version.
	</p>
	<p class="text-xs text-muted-foreground">
		Identifiant du tableau : <code class="rounded bg-muted px-1.5 py-0.5">{boardId}</code>
	</p>
	<Button href="/organisation/kanban" variant="outline" class="mt-2">Retour aux tableaux</Button>
</div>
