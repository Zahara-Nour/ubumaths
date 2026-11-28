<script lang="ts">
	/**
	 * Suggestion « Durée observée : 35 s » sous la durée d'une ligne (chantier
	 * `durees-ajustees`, A1) : panier et éditeur de série. Rien sans suggestion.
	 * Rien ne change sans le geste du prof (« Appliquer »).
	 */
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Gauge } from '@lucide/svelte';
	import { OBSERVED_LABEL } from '#lib/types/duration-signals.ts';

	let {
		seconds,
		onapply,
		class: className = ''
	}: {
		/** Durée suggérée (secondes) ; null : rien */
		seconds: number | null;
		onapply: (seconds: number) => void;
		class?: string;
	} = $props();
</script>

{#if seconds !== null}
	<p
		class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm {className}"
		data-duree-observee
		title="Durée dans laquelle 80 % des questions tirées à tes élèves ont été validées"
	>
		<Gauge class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
		<span>{OBSERVED_LABEL}&nbsp;: <strong>{seconds}&nbsp;s</strong></span>
		<Button
			type="button"
			size="sm"
			variant="outline"
			class="h-7 px-2"
			aria-label="Appliquer la durée observée de {seconds} secondes"
			onclick={() => onapply(seconds)}
		>
			Appliquer
		</Button>
	</p>
{/if}
