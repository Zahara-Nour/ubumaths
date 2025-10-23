<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { X } from 'lucide-svelte';

	// Props
	interface Props {
		tags?: string[];
		suggestions?: string[];
		maxTags?: number;
		placeholder?: string;
	}

	let {
		tags = $bindable([]),
		suggestions = [],
		maxTags = 10,
		placeholder = 'Ajouter un tag...'
	}: Props = $props();

	// State
	let inputValue = $state('');
	let showSuggestions = $state(false);

	// Filter suggestions
	let filteredSuggestions = $derived(() => {
		if (!inputValue || !showSuggestions) return [];

		const query = inputValue.toLowerCase();
		return suggestions
			.filter((s) => !tags.includes(s) && s.toLowerCase().includes(query))
			.slice(0, 5);
	});

	function addTag(tag: string) {
		const trimmed = tag.trim().toLowerCase();

		if (!trimmed) return;
		if (tags.includes(trimmed)) return;
		if (tags.length >= maxTags) return;

		tags = [...tags, trimmed];
		inputValue = '';
		showSuggestions = false;
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag(inputValue);
		} else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
			// Remove last tag on backspace if input is empty
			removeTag(tags[tags.length - 1]);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
		}
	}

	function handleBlur() {
		// Delay to allow clicking suggestions
		setTimeout(() => {
			showSuggestions = false;
		}, 200);
	}
</script>

<div class="space-y-2">
	<!-- Input with suggestions -->
	<div class="relative">
		<Input
			type="text"
			bind:value={inputValue}
			{placeholder}
			disabled={tags.length >= maxTags}
			onfocus={() => (showSuggestions = true)}
			onblur={handleBlur}
			onkeydown={handleKeydown}
		/>

		<!-- Suggestions dropdown -->
		{#if showSuggestions && filteredSuggestions().length > 0}
			<div
				class="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg"
			>
				{#each filteredSuggestions() as suggestion}
					<button
						type="button"
						class="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
						onclick={() => addTag(suggestion)}
					>
						{suggestion}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Selected tags -->
	{#if tags.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each tags as tag (tag)}
				<Badge variant="secondary" class="gap-1 pl-3 pr-1">
					{tag}
					<button
						type="button"
						class="ml-1 rounded-sm opacity-70 hover:opacity-100"
						onclick={() => removeTag(tag)}
					>
						<X class="h-3 w-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}

	<!-- Counter -->
	<div class="text-xs text-muted-foreground">
		{tags.length}/{maxTags} tags
	</div>
</div>
