<!--
	Skeleton List Variant
	=====================

	List/Table skeleton with header and rows.
	Perfect for pages showing lists, tables, or search results.
-->
<script lang="ts">
	interface Props {
		itemCount?: number;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let { itemCount = 8 }: Props = $props();
</script>

<div class="animate-in fade-in space-y-6 duration-300">
	<!-- Page header with actions -->
	<div class="flex items-center justify-between">
		<div class="space-y-2">
			<div class="skeleton h-9 w-64 rounded"></div>
			<div class="skeleton h-4 w-96 rounded"></div>
		</div>
		<div class="flex gap-2">
			<div class="skeleton h-10 w-32 rounded"></div>
			<div class="skeleton h-10 w-32 rounded"></div>
		</div>
	</div>

	<!-- Search/filters bar -->
	<div class="flex gap-4">
		<div class="skeleton h-10 flex-1 rounded"></div>
		<div class="skeleton h-10 w-32 rounded"></div>
	</div>

	<!-- Table/List content -->
	<div class="overflow-hidden rounded-lg border border-border bg-card shadow">
		<div class="space-y-4 p-6">
			<!-- Table header -->
			<div class="grid grid-cols-5 gap-4">
				{#each Array(5) as _unused, i (i)}
					<div class="skeleton h-4 rounded"></div>
				{/each}
			</div>

			<!-- Table rows -->
			{#each Array(8) as _unused, i (i)}
				<div class="grid grid-cols-5 gap-4">
					{#each Array(5) as _unused2, j (j)}
						<div class="skeleton h-8 rounded"></div>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-between">
		<div class="skeleton h-4 w-32 rounded"></div>
		<div class="flex gap-2">
			{#each Array(5) as _unused, i (i)}
				<div class="skeleton h-10 w-10 rounded"></div>
			{/each}
		</div>
	</div>
</div>
