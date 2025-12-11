<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import type { ExerciseResource, ExerciseResourceType } from '$lib/exercises/types';

	interface Props {
		resources: ExerciseResource[];
		onchange?: (resources: ExerciseResource[]) => void;
	}

	let { resources = $bindable([]), onchange }: Props = $props();

	const resourceTypes: { value: ExerciseResourceType; label: string }[] = [
		{ value: 'video', label: 'Vidéo' },
		{ value: 'pdf', label: 'PDF' },
		{ value: 'link', label: 'Lien' },
		{ value: 'geogebra', label: 'GeoGebra' },
		{ value: 'image', label: 'Image' }
	];

	// New resource form state
	let newType = $state<ExerciseResourceType>('video');
	let newUrl = $state('');
	let newTitle = $state('');
	let newDescription = $state('');

	function addResource() {
		if (!newUrl.trim() || !newTitle.trim()) return;

		const newResource: ExerciseResource = {
			type: newType,
			url: newUrl.trim(),
			title: newTitle.trim(),
			description: newDescription.trim() || undefined
		};

		resources = [...resources, newResource];
		onchange?.(resources);

		// Reset form
		newUrl = '';
		newTitle = '';
		newDescription = '';
	}

	function removeResource(index: number) {
		resources = resources.filter((_, i) => i !== index);
		onchange?.(resources);
	}

	function getTypeIcon(type: ExerciseResourceType): string {
		switch (type) {
			case 'video':
				return '🎬';
			case 'pdf':
				return '📄';
			case 'link':
				return '🔗';
			case 'geogebra':
				return '📐';
			case 'image':
				return '🖼️';
			default:
				return '📎';
		}
	}

	function getTypeLabel(type: ExerciseResourceType): string {
		return resourceTypes.find((t) => t.value === type)?.label || type;
	}
</script>

<div class="space-y-4">
	<!-- Existing resources list -->
	{#if resources.length > 0}
		<div class="space-y-2">
			{#each resources as resource, index (index)}
				<div class="flex items-center gap-2 rounded-md border bg-muted/50 p-2 text-sm">
					<span class="text-lg" title={getTypeLabel(resource.type)}
						>{getTypeIcon(resource.type)}</span
					>
					<div class="min-w-0 flex-1">
						<a
							href={resource.url}
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium hover:underline"
						>
							{resource.title}
						</a>
						{#if resource.description}
							<p class="truncate text-xs text-muted-foreground">{resource.description}</p>
						{/if}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={() => removeResource(index)}
						class="h-8 w-8 p-0 text-destructive hover:text-destructive"
					>
						×
					</Button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Add new resource form -->
	<div class="rounded-md border p-3">
		<p class="mb-3 text-sm font-medium">Ajouter une ressource</p>
		<div class="grid gap-3">
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1">
					<Label for="resource-type" class="text-xs">Type</Label>
					<MySelect type="single" bind:value={newType} items={resourceTypes} placeholder="Type" />
				</div>
				<div class="space-y-1">
					<Label for="resource-title" class="text-xs">Titre</Label>
					<Input
						id="resource-title"
						type="text"
						placeholder="Ex: Vidéo explicative"
						bind:value={newTitle}
						class="h-9"
					/>
				</div>
			</div>
			<div class="space-y-1">
				<Label for="resource-url" class="text-xs">URL</Label>
				<Input
					id="resource-url"
					type="url"
					placeholder="https://..."
					bind:value={newUrl}
					class="h-9"
				/>
			</div>
			<div class="space-y-1">
				<Label for="resource-description" class="text-xs">Description (optionnel)</Label>
				<Input
					id="resource-description"
					type="text"
					placeholder="Ex: Pour aller plus loin"
					bind:value={newDescription}
					class="h-9"
				/>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={addResource}
				disabled={!newUrl.trim() || !newTitle.trim()}
			>
				+ Ajouter
			</Button>
		</div>
	</div>

	{#if resources.length >= 20}
		<p class="text-xs text-muted-foreground">Maximum 20 ressources atteint</p>
	{/if}
</div>
