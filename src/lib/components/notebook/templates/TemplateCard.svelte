<!--
	TemplateCard — single template tile in the gallery.

	Visible content:
	  - title
	  - description (truncated to 3 lines via line-clamp)
	  - category badge (when set)
	  - author footer (when not the current user — for shared templates)

	Action: "Utiliser" button POSTs to /api/python-notebooks/from-template/[id]
	and navigates to the cloned notebook's editor. Local `isCloning` state
	prevents the button from being triggered twice while the request flies.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Copy, Loader2, Globe } from 'lucide-svelte';

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
		template: Template;
		/** Current user id — used to decide whether to show the author byline. */
		currentUserId: string;
	}

	let { template, currentUserId }: Props = $props();

	let isCloning = $state(false);

	let authorName = $derived(
		template.profiles
			? `${template.profiles.firstname ?? ''} ${template.profiles.lastname ?? ''}`.trim()
			: ''
	);
	let isOwn = $derived(template.author_id === currentUserId);

	async function handleClone(): Promise<void> {
		if (isCloning) return;
		isCloning = true;
		try {
			const response = await fetch(`/api/python-notebooks/from-template/${template.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			});
			if (!response.ok) {
				const data = (await response.json().catch(() => null)) as { message?: string } | null;
				toaster.error(data?.message ?? 'Erreur lors de la création du notebook');
				return;
			}
			const data = (await response.json()) as { notebook: { id: string; title: string } };
			toaster.success(`Notebook créé : ${data.notebook.title}`);
			await goto(`/python-notebook/${data.notebook.id}`);
		} catch (err) {
			console.error('[TemplateCard] clone failed:', err);
			toaster.error('Erreur réseau lors de la création du notebook');
		} finally {
			isCloning = false;
		}
	}
</script>

<Card.Root class="flex flex-col">
	<Card.Header>
		<div class="flex items-start justify-between gap-2">
			<Card.Title class="text-base">{template.title}</Card.Title>
			{#if template.is_public && isOwn}
				<Badge variant="outline" class="shrink-0 gap-1">
					<Globe class="size-3" aria-hidden="true" />
					Partagé
				</Badge>
			{/if}
		</div>
		{#if template.template_category}
			<Badge variant="secondary" class="mt-1 w-fit">{template.template_category}</Badge>
		{/if}
	</Card.Header>
	<Card.Content class="flex-1">
		{#if template.description}
			<p class="line-clamp-3 text-sm text-muted-foreground">{template.description}</p>
		{:else}
			<p class="text-sm text-muted-foreground italic">Pas de description</p>
		{/if}
	</Card.Content>
	<Card.Footer class="flex items-center justify-between gap-2">
		{#if !isOwn && authorName}
			<span class="truncate text-xs text-muted-foreground" title={authorName}>
				par {authorName}
			</span>
		{:else}
			<span></span>
		{/if}
		<Button onclick={handleClone} disabled={isCloning} size="sm" class="gap-1.5">
			{#if isCloning}
				<Loader2 class="size-4 animate-spin" />
				<span>Création…</span>
			{:else}
				<Copy class="size-4" />
				<span>Utiliser</span>
			{/if}
		</Button>
	</Card.Footer>
</Card.Root>
