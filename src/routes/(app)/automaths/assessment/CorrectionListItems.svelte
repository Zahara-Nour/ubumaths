<script>
	import { STATUS_CORRECT, STATUS_UNOPTIMAL_FORM } from '../../../../lib/questions/correction'
	import CorrectionItem from '$lib/components/questions/CorrectionItem.svelte'
	import { correct_color, incorrect_color, unoptimal_color } from '$lib/colors'

	export let items
	export let magnify = 1
</script>

{#each items as item}
	{@const color =
		item.status === STATUS_CORRECT
			? correct_color
			: item.status === STATUS_UNOPTIMAL_FORM
			? unoptimal_color
			: incorrect_color}
	<div
		class="w-full flex justify-start items-start mb-5"
		
	>
		<div
			class="relative mr-0"
			style="{`font-size:${magnify*1.5}rem;font-family:'pacifico';color:white;background:${color}; border-radius: 50%;width:4.5rem; height:4.5rem`}"
		>
			<span
				class="absolute"
				style="display:inline-block; top: 50%;left: 50%;transform: translate(-50%, -70%);margin: 0;"
			>
				{item.num}
			</span>
		</div>
		<CorrectionItem item="{item}" magnify={magnify}/>
	</div>
{/each}
