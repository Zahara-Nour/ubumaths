<script lang="ts">
	/**
	 * ParameterInput Component
	 *
	 * One named constant — `a`, `b`, … — with the slider that sweeps it.
	 *
	 * A parameter is referenced by its name inside any expression, and
	 * substituted before evaluation: moving the slider redraws every curve that
	 * mentions it.
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import { Trash2 } from '@lucide/svelte';
	import { PARAMETER_SLIDER_STEPS } from '$lib/grapheur/types';
	import type { Parameter } from '$lib/grapheur/types';

	// Props
	let { parameter }: { parameter: Parameter } = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Why the last rename was refused, shown under the field. */
	let renameError = $state<string | null>(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	/** Fine enough to sweep smoothly, coarse enough to keep the value readable. */
	const step = $derived(Math.max((parameter.max - parameter.min) / PARAMETER_SLIDER_STEPS, 1e-6));

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleSlide(value: number) {
		grapheurStore.updateParameter(parameter.id, { value });
	}

	function handleNumberInput(field: 'value' | 'min' | 'max') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			const parsed = Number.parseFloat(event.currentTarget.value);
			if (!Number.isFinite(parsed)) return;

			grapheurStore.updateParameter(parameter.id, { [field]: parsed });
		};
	}

	/**
	 * Renaming is committed on blur rather than on each keystroke: passing
	 * through an already-taken letter while typing would reject a name the user
	 * has not finished writing.
	 */
	function handleRename(event: Event & { currentTarget: HTMLInputElement }) {
		const wanted = event.currentTarget.value;
		if (wanted === parameter.name) {
			renameError = null;
			return;
		}

		renameError = grapheurStore.renameParameter(parameter.id, wanted);
		if (renameError) event.currentTarget.value = parameter.name;
	}

	function handleRemove() {
		grapheurStore.removeParameter(parameter.id);
	}
</script>

<div class="flex flex-col gap-1 rounded border border-border/60 bg-muted/30 p-2">
	<div class="flex items-center gap-2">
		<Input
			value={parameter.name}
			onblur={handleRename}
			class="h-7 w-10 text-center font-serif text-sm"
			maxlength={1}
			aria-label="Nom du paramètre {parameter.name}"
		/>
		<span class="font-serif text-sm">=</span>
		<Input
			type="number"
			step="any"
			value={parameter.value}
			oninput={handleNumberInput('value')}
			class="h-7 w-24 text-xs"
			aria-label="Valeur du paramètre {parameter.name}"
		/>
		<Button
			variant="ghost"
			size="sm"
			onclick={handleRemove}
			class="ml-auto h-7 w-7 p-0"
			title="Supprimer le paramètre {parameter.name}"
			aria-label="Supprimer le paramètre {parameter.name}"
		>
			<Trash2 class="h-4 w-4" />
		</Button>
	</div>

	{#if renameError}
		<p class="text-xs text-destructive" role="alert">{renameError}</p>
	{/if}

	<div class="flex items-center gap-2">
		<Input
			type="number"
			step="any"
			value={parameter.min}
			oninput={handleNumberInput('min')}
			class="h-7 w-16 text-xs"
			aria-label="Borne inférieure de {parameter.name}"
		/>
		<Slider
			type="single"
			value={parameter.value}
			min={parameter.min}
			max={parameter.max}
			{step}
			onValueChange={handleSlide}
			aria-label="Curseur du paramètre {parameter.name}"
		/>
		<Input
			type="number"
			step="any"
			value={parameter.max}
			oninput={handleNumberInput('max')}
			class="h-7 w-16 text-xs"
			aria-label="Borne supérieure de {parameter.name}"
		/>
	</div>
</div>
