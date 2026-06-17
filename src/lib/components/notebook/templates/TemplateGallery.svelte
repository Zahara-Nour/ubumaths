<!--
	TemplateGallery — three-section grid of notebook templates.

	Buckets:
	  - "Mes templates"      : authored by currentUserId
	  - "Templates partagés" : public, authored by someone else
	  - "Templates UbuMaths" : system (empty in V1)

	Empty sections collapse silently. If every bucket is empty, render a
	full-section empty state pointing the teacher at "Enregistrer comme
	template" from the notebook editor.
-->
<script lang="ts">
	import TemplateCard from './TemplateCard.svelte';
	import { Sparkles } from '@lucide/svelte';

	interface Author {
		firstname: string | null;
		lastname: string | null;
	}

	interface Template {
		id: string;
		title: string;
		description: string | null;
		author_id: string;
		is_public: boolean | null;
		template_category: string | null;
		profiles: Author | null;
	}

	interface Props {
		templates: Template[];
		currentUserId: string;
	}

	let { templates, currentUserId }: Props = $props();

	let own = $derived(templates.filter((t) => t.author_id === currentUserId));
	let shared = $derived(
		templates.filter((t) => t.author_id !== currentUserId && t.is_public === true)
	);

	let isEmpty = $derived(own.length === 0 && shared.length === 0);
</script>

{#if isEmpty}
	<div
		class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center"
	>
		<Sparkles class="size-8 text-muted-foreground" aria-hidden="true" />
		<div class="space-y-1">
			<p class="text-base font-medium">Aucun template pour l'instant</p>
			<p class="max-w-md text-sm text-muted-foreground">
				Ouvrez un notebook, cliquez sur <span class="font-medium">Enregistrer comme template</span>
				depuis la toolbar pour en créer un.
			</p>
		</div>
	</div>
{:else}
	<div class="space-y-8">
		{#if own.length > 0}
			<section class="space-y-3">
				<h2 class="text-lg font-semibold">Mes templates</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each own as template (template.id)}
						<TemplateCard {template} {currentUserId} />
					{/each}
				</div>
			</section>
		{/if}

		{#if shared.length > 0}
			<section class="space-y-3">
				<h2 class="text-lg font-semibold">Templates partagés</h2>
				<p class="text-xs text-muted-foreground">
					Templates publics créés par d'autres enseignants.
				</p>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each shared as template (template.id)}
						<TemplateCard {template} {currentUserId} />
					{/each}
				</div>
			</section>
		{/if}
	</div>
{/if}
