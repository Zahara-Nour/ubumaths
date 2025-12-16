<script lang="ts">
	/**
	 * ParameterControls - Controls for adjusting construction parameters
	 *
	 * Provides sliders, checkboxes, and color pickers for adjusting
	 * the parameters defined in the construction script.
	 */

	import type { ConstructionEngine } from '../core/engine.svelte';
	import Slider from '$lib/components/ui/slider/slider.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';

	// Types
	interface Props {
		engine: ConstructionEngine;
		class?: string;
	}

	// Props
	let { engine, class: className = '' }: Props = $props();

	// Derived state from engine
	let paramDefs = $derived(engine.parameterDefs);
	let paramEntries = $derived(Object.entries(paramDefs));
	let hasParameters = $derived(paramEntries.length > 0);

	// Get current parameter value
	function getParamValue(name: string): number | boolean | string {
		return engine.parameters[name];
	}

	// Handle slider value change
	function handleSliderChange(name: string, values: number[]) {
		if (values.length > 0) {
			engine.setParameter(name, values[0]);
		}
	}

	// Handle checkbox change
	function handleCheckboxChange(name: string, checked: boolean) {
		engine.setParameter(name, checked);
	}

	// Handle color change
	function handleColorChange(name: string, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		engine.setParameter(name, input.value);
	}
</script>

{#if hasParameters}
	<div class="parameter-controls rounded-lg bg-muted p-4 {className}">
		<h3 class="mb-3 text-sm font-medium text-foreground">Parametres</h3>

		<div class="space-y-4">
			{#each paramEntries as [name, def] (name)}
				{@const value = getParamValue(name)}
				<div class="parameter-item">
					{#if def.type === 'number'}
						<div class="flex flex-col gap-2">
							<Label for={name} class="text-sm text-muted-foreground">
								{def.label}
							</Label>
							<div class="flex items-center gap-3">
								<div class="flex-1">
									<Slider
										type="single"
										id={name}
										min={def.min}
										max={def.max}
										step={def.step ?? 1}
										value={[value as number]}
										onValueChange={(values: number[]) => handleSliderChange(name, values)}
									/>
								</div>
								<span class="min-w-12 text-right font-mono text-sm text-foreground tabular-nums">
									{value}
								</span>
							</div>
						</div>
					{:else if def.type === 'boolean'}
						<MyCheckbox
							checked={value as boolean}
							label={def.label}
							onCheckedChange={(checked) => {
								if (typeof checked === 'boolean') {
									handleCheckboxChange(name, checked);
								}
							}}
						/>
					{:else if def.type === 'color'}
						<div class="flex items-center gap-3">
							<Label for={name} class="text-sm text-muted-foreground">
								{def.label}
							</Label>
							<Input
								id={name}
								type="color"
								value={value as string}
								oninput={(e) => handleColorChange(name, e)}
								class="h-8 w-14 cursor-pointer p-1"
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
