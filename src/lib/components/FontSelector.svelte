<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { exerciseFont, type ExerciseFontId, FONT_OPTIONS } from '$lib/stores/exerciseFont.svelte';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	function handleSelect(fontId: ExerciseFontId) {
		exerciseFont.setFont(fontId);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger asChild let:builder>
		<Button builders={[builder]} variant="outline" size="sm" class={className}>
			<svg
				class="mr-2 h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16m-7 6h7"
				/>
			</svg>
			<span style="font-family: {exerciseFont.currentFont.family}">
				{exerciseFont.currentFont.label}
			</span>
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-48">
		<DropdownMenu.Label>Police d'affichage</DropdownMenu.Label>
		<DropdownMenu.Separator />
		{#each FONT_OPTIONS as font (font.id)}
			<DropdownMenu.Item class="cursor-pointer" onclick={() => handleSelect(font.id)}>
				<span class="flex-1" style="font-family: {font.family}">
					{font.label}
				</span>
				{#if exerciseFont.current === font.id}
					<svg class="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				{/if}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
