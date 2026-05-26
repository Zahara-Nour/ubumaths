<!--
	CardEditForm
	============

	Internal subcomponent of `CardEditDialog`. Renders the title + description
	editor and pushes the working values up via `bind:`.

	Why a dedicated component? It is mounted inside a `{#key card.id}` block in
	the parent, so swapping the edited card automatically remounts this
	subtree — the `$bindable` props re-initialise from the parent's freshly
	seeded values on mount, no `$effect` needed.
-->

<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';

	type Props = {
		/** Current title (bindable so the parent can read it). */
		title: string;
		/** Current description / markdown (bindable). */
		description: string;
	};

	let { title = $bindable(''), description = $bindable('') }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<Label for="card-title">Titre</Label>
	<Input
		id="card-title"
		bind:value={title}
		placeholder="Titre de la carte"
		maxlength={200}
		required
	/>
	<p class="text-xs text-muted-foreground">{title.length} / 200</p>
</div>

<div class="flex flex-col gap-2">
	<Label for="card-description">Description</Label>
	<div id="card-description" class="rounded-md border">
		<RichTextEditor
			bind:markdownValue={description}
			preset="standard"
			minHeight="200px"
			maxHeight="40vh"
		/>
	</div>
	<p class="text-xs text-muted-foreground">
		{description.length} / 50000 caractères
	</p>
</div>
