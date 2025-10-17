<script lang="ts">
	export let n: number
	export let status = ''
</script>

<button
	class={'btn size flex h-16 w-16 items-center justify-center text-5xl font-bold ' +
		(status === 'selected'
			? 'variant-filled-primary'
			: status === 'selected-third'
				? 'variant-filled-secondary'
				: 'variant-filled-surface')}
	style="font-family:'Baloo 2', sans-serif;"
	on:click
	disabled={status === 'not_available'}
>
	{n}
</button>
