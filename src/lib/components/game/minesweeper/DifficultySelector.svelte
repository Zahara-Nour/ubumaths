<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import { DIFFICULTY_CONFIGS } from '$lib/types/minesweeper';

	// Props
	let {
		selected,
		onChange,
		disabled = false
	}: {
		selected: 'beginner' | 'intermediate' | 'expert';
		onChange: (difficulty: string) => void;
		disabled?: boolean;
	} = $props();

	// Difficulty options with French labels and info
	const items = [
		{
			value: 'beginner',
			label: 'Débutant',
			description: '9×9, 10 mines'
		},
		{
			value: 'intermediate',
			label: 'Intermédiaire',
			description: '16×16, 40 mines'
		},
		{
			value: 'expert',
			label: 'Expert',
			description: '16×30, 99 mines'
		}
	];

	// Format items for MySelect component
	const selectItems = items.map((item) => ({
		value: item.value,
		label: `${item.label} (${item.description})`
	}));

	// Handle change
	function handleChange(value: string) {
		onChange(value);
	}
</script>

<div class="space-y-2">
	<div class="mb-2 text-sm font-medium">Difficulté</div>

	<MySelect
		type="single"
		bind:value={selected}
		items={selectItems}
		{disabled}
		placeholder="Choisir une difficulté"
		onValueChange={handleChange}
		class="w-full"
	/>

	<!-- Info cards for each difficulty -->
	<div class="mt-4 grid gap-2 sm:grid-cols-3">
		{#each items as item (item.value)}
			<div
				class="rounded-lg border p-3 transition-all {selected === item.value
					? 'border-primary bg-primary/5'
					: 'border-border bg-card'}"
			>
				<div class="text-sm font-semibold">{item.label}</div>
				<div class="mt-1 text-xs text-muted-foreground">{item.description}</div>
				<div class="mt-1 text-xs text-muted-foreground">
					Base: {DIFFICULTY_CONFIGS[item.value].baseGidouilles} gidouilles
				</div>
			</div>
		{/each}
	</div>
</div>
