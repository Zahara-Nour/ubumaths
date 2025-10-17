<script lang="ts">
	export let n: number
	export let selected = false
</script>

<button
	class={'btn size h-15 w-15 flex items-center justify-center text-3xl font-bold ' +
		(selected ? 'variant-filled-primary' : 'variant-filled-surface')}
	style="font-family:'Baloo 2', sans-serif;"
>
	{n}
</button>
