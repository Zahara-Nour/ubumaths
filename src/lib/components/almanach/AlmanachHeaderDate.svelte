<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatMedium, formatShort, type PataphysicalDate } from '$lib/almanach/calendar';

	// Date calculée côté serveur (fuseau de Paris) : pas d'écart à l'hydratation
	let { date }: { date: PataphysicalDate } = $props();

	const short = $derived(formatShort(date));
	const medium = $derived(formatMedium(date));
</script>

<!-- Le nom accessible commence par le texte visible (WCAG 2.5.3), sur mobile comme sur ordinateur.
     text-foreground/70 : contraste ≥ 5,9:1 sur les trois fonds d'en-tête (muted-foreground y tombe à 4,1). -->
<a
	href={resolve('/almanach')}
	aria-label="{medium} : ouvrir l’Almanach des Chiphres"
	class="rounded-sm text-xs whitespace-nowrap text-foreground/70 italic underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	data-testid="almanach-header-date"
>
	<span class="sm:hidden" data-testid="almanach-date-short">{short}</span>
	<span class="hidden sm:inline" data-testid="almanach-date-medium">{medium}</span>
</a>
