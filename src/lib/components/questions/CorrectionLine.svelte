<script>
	import Badge from '@smui-extra/badge'
	import { correct_color } from '$lib/colors'
	export let line

	if (line && line.choices) {
		console.log('choices', line.choices)
	}
</script>

{#if line}
	{#if line.html}
		<span style="word-break:break-word;white-space:normal;">
			{@html line.html}
		</span>
	{:else if line.choices}
		{#each line.choices as choice, i}
			{#if choice.solution}
				<span
					class="rounded-lg m-2 p-2"
					style="{`display:inline-block;text-align: center;min-width:2em;position:relative; border: 6px solid ${correct_color}`}"
				>
					{#if choice.html}
						{@html choice.html}
					{:else if choice.image}
						<img
							class="white"
							src="{choice.image}"
							style="max-width:min(400px,80%);max-height:40vh;"
							alt="{`choice ${i}`}"
						/>
					{/if}
					{#if choice.badge}
						<Badge
							pos="middle"
							color="{choice.badge === 'correct'
								? 'custom-correct'
								: 'custom-incorrect'}"
							aria-label="{`choice ${i}`}"
							style="min-height: 1.5rem; min-width: 1.5rem; padding: 0;"
						/>
					{/if}
				</span>
			{:else}
				<span
					class="rounded-lg m-2 p-2"
					style="display:inline-block;text-align:center;min-width:2em;position:relative; border:4px solid grey"
				>
					{#if choice.html}
						{@html choice.html}
					{:else if choice.image}
						<img
							class="white"
							src="{choice.image}"
							style="max-width:min(400px,80%);max-height:40vh;"
							alt="{`choice ${i}`}"
						/>
					{/if}
					{#if choice.badge}
						<Badge
							color="custom-incorrect"
							aria-label="{`choice ${i}`}"
							style="min-height: 1.5rem; min-width: 1.5rem; padding: 0;"
						/>
					{/if}
				</span>
			{/if}
		{/each}
	{:else}
		<span
			style="display:inline-block;word-break:break-word;white-space:normal;"
		>
			{@html line}
		</span>
	{/if}
{/if}
