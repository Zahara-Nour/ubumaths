<script lang="ts">
	let { count = 5 }: { count?: number } = $props();
</script>

<div class="space-y-4">
	{#each Array(count) as _, i (i)}
		<div class="animate-pulse rounded-lg border bg-card p-4">
			<!-- Title skeleton -->
			<div class="mb-3 h-6 w-3/4 rounded bg-muted"></div>

			<!-- Tags skeleton -->
			<div class="mb-2 flex gap-2">
				<div class="h-5 w-16 rounded bg-muted"></div>
				<div class="h-5 w-20 rounded bg-muted"></div>
			</div>

			<!-- Description skeleton -->
			<div class="mb-2 h-4 w-full rounded bg-muted"></div>
			<div class="h-4 w-5/6 rounded bg-muted"></div>
		</div>
	{/each}
</div>
