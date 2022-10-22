<script>
	import QuestionCard from './QuestionCard.svelte'
	import { createCorrection } from '$lib/questions/correctionItem'
	export let item

	const { simpleCorrection:correction, coms } = item
	export let magnify

</script>

{#if correction}
	<div class="ml-3 grow flex flex-wrap ">
		<div class="mr-3 mb-4 w-full"  style="word-break: break-word ;min-width: 100px;w-full; white-space: normal;">
			<QuestionCard
				card="{item}"
				correction="{true}"
				flashcard="{!!item.correctionDetails}"
				magnify="{magnify}"
			/>
		</div>
		<div>
			{#if coms.length}
				{#each coms as com}
					<div
						class=" mb-1 z-0 relative"
						style="font-family: 'Handlee', cursive;"
					>
						{@html com}
					</div>
				{/each}
			{/if}
		</div>
	</div>
	<!-- <div
		id="{`correction${number}`}"
		style="word-break: break-word ;min-width: 0;white-space: normal;"
	>
		{#if image}
			{#if imageCorrection}
				{#await imageCorrectionBase64P}
					loading image
				{:then base64}
					<img
						src="{base64}"
						class="my-3"
						style="max-width:500px;max-height:40vh;"
						alt="Alright Buddy!"
					/>
				{:catch error}
					{error}
				{/await}
			{:else}
				{#await imageBase64P}
					loading image
				{:then base64}
					<img
						src="{base64}"
						class="my-3"
						style="max-width:500px;max-height:40vh;"
						alt="Alright Buddy!"
					/>
				{:catch error}
					{error}
				{/await}
			{/if}
		{/if}
		{#if displayDetails && item.correctionDetails}
			{#each detailedCorrection as line}
				<div class="mb-1 z-0 relative">
					{@html line}
				</div>
			{/each}
		{:else}
			{#each correction as line}
				<div class=" mb-1 z-0 relative">
					{@html line}
				</div>
			{/each}

			
		{/if}
	</div> -->
{/if}
