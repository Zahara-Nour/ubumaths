<!--
	TradePresenceIndicator Component
	================================
	Simple presence indicator showing if the trading partner is online.

	Features:
	- Green/gray dot indicator
	- "En ligne" / "Hors ligne" status text

	Props:
	- online: boolean - Whether partner is online
-->
<script lang="ts">
	interface Props {
		online: boolean;
	}

	let { online }: Props = $props();
</script>

<div class="flex items-center gap-2 text-sm">
	<!-- Status dot -->
	<span
		class="inline-block h-2.5 w-2.5 rounded-full {online
			? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]'
			: 'bg-muted-foreground/40'}"
		aria-hidden="true"
	></span>

	<!-- Status text -->
	<span class="text-muted-foreground">
		{online ? 'En ligne' : 'Hors ligne'}
	</span>
</div>
