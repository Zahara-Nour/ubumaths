<script>
	import { fullScreen } from '$lib/stores'
	import PageHeader from '$lib/ui/PageHeader.svelte'
	import Trio from './Trio.svelte'
</script>

<div class="container mx-auto px-4 pt-2">
	{#if !$fullScreen}
		<PageHeader title="Trio" />
	{/if}
	<Trio />
</div>
