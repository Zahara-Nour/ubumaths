<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	// Types
	interface Props {
		onInput: (value: string) => void;
		onSubmit: () => void;
		onBackspace: () => void;
		onClear: () => void;
		onAllClear: () => void;
		visible?: boolean;
	}

	type KeyDefinition = {
		label: string;
		value?: string;
		action?: 'submit' | 'backspace' | 'clear' | 'allClear' | 'more';
		variant?: 'default' | 'secondary' | 'outline' | 'destructive';
	};

	// Props
	let { onInput, onSubmit, onBackspace, onClear, onAllClear, visible = true }: Props = $props();

	// State
	let showMoreFunctions = $state(false);

	// Scientific row keys
	const scientificKeys: KeyDefinition[] = [
		{ label: 'sin', value: '\\sin(' },
		{ label: 'cos', value: '\\cos(' },
		{ label: 'tan', value: '\\tan(' },
		{ label: 'log', value: '\\log(' },
		{ label: 'ln', value: '\\ln(' },
		{ label: '√', value: '\\sqrt{' },
		{ label: '^', value: '^' },
		{ label: 'π', value: '\\pi' },
		{ label: 'e', value: 'e' }
	];

	// Extended functions (shown when "More" is clicked)
	const extendedKeys: KeyDefinition[] = [
		{ label: 'arcsin', value: '\\arcsin(' },
		{ label: 'arccos', value: '\\arccos(' },
		{ label: 'arctan', value: '\\arctan(' },
		{ label: '(', value: '(' },
		{ label: ')', value: ')' },
		{ label: '|x|', value: '\\abs{' },
		{ label: 'x²', value: '^2' },
		{ label: 'x³', value: '^3' },
		{ label: '∞', value: '\\infty' }
	];

	// Numpad keys (4 rows x 5 columns)
	const numpadRows: KeyDefinition[][] = [
		[
			{ label: '7', value: '7' },
			{ label: '8', value: '8' },
			{ label: '9', value: '9' },
			{ label: '÷', value: '\\div' },
			{ label: '←', action: 'backspace', variant: 'secondary' }
		],
		[
			{ label: '4', value: '4' },
			{ label: '5', value: '5' },
			{ label: '6', value: '6' },
			{ label: '×', value: '\\times' },
			{ label: 'C', action: 'clear', variant: 'secondary' }
		],
		[
			{ label: '1', value: '1' },
			{ label: '2', value: '2' },
			{ label: '3', value: '3' },
			{ label: '-', value: '-' },
			{ label: 'AC', action: 'allClear', variant: 'destructive' }
		],
		[
			{ label: '0', value: '0' },
			{ label: '.', value: '.' },
			{ label: 'x', value: 'x' },
			{ label: '+', value: '+' },
			{ label: '=', action: 'submit', variant: 'default' }
		]
	];

	// Handlers
	function handleKeyClick(key: KeyDefinition) {
		if (key.action) {
			switch (key.action) {
				case 'submit':
					onSubmit();
					break;
				case 'backspace':
					onBackspace();
					break;
				case 'clear':
					onClear();
					break;
				case 'allClear':
					onAllClear();
					break;
				case 'more':
					showMoreFunctions = !showMoreFunctions;
					break;
			}
		} else if (key.value) {
			onInput(key.value);
		}
	}

	function getButtonVariant(
		key: KeyDefinition
	): 'default' | 'secondary' | 'outline' | 'destructive' {
		return key.variant ?? 'outline';
	}
</script>

{#if visible}
	<div class="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
		<!-- Scientific row -->
		<div class="flex flex-wrap gap-1.5">
			{#each scientificKeys as key (key.label)}
				<Button
					variant="outline"
					size="sm"
					class="min-w-[2.5rem] flex-1 text-xs font-medium"
					onclick={() => handleKeyClick(key)}
				>
					{key.label}
				</Button>
			{/each}
			<Button
				variant={showMoreFunctions ? 'secondary' : 'outline'}
				size="sm"
				class="min-w-[4rem] text-xs font-medium"
				onclick={() => (showMoreFunctions = !showMoreFunctions)}
			>
				{showMoreFunctions ? '▲ Moins' : '▼ Plus...'}
			</Button>
		</div>

		<!-- Extended functions panel -->
		{#if showMoreFunctions}
			<div class="flex flex-wrap gap-1.5 border-t border-border pt-2">
				{#each extendedKeys as key (key.label)}
					<Button
						variant="outline"
						size="sm"
						class="min-w-[2.5rem] flex-1 text-xs font-medium"
						onclick={() => handleKeyClick(key)}
					>
						{key.label}
					</Button>
				{/each}
			</div>
		{/if}

		<!-- Numpad grid -->
		<div class="grid grid-cols-5 gap-1.5">
			{#each numpadRows as row, rowIndex (rowIndex)}
				{#each row as key (key.label)}
					<Button
						variant={getButtonVariant(key)}
						size="default"
						class="h-12 text-base font-semibold md:h-10"
						onclick={() => handleKeyClick(key)}
					>
						{key.label}
					</Button>
				{/each}
			{/each}
		</div>
	</div>
{/if}
