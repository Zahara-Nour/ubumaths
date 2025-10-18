<div class="w-full space-y-6">
	<!-- Header skeleton -->
	<div class="flex items-center justify-between">
		<div class="space-y-2">
			<div class="h-8 w-64 animate-pulse rounded bg-muted"></div>
			<div class="h-4 w-48 animate-pulse rounded bg-muted"></div>
		</div>
		<div class="h-10 w-32 animate-pulse rounded bg-muted"></div>
	</div>

	<!-- Table skeleton -->
	<div class="overflow-hidden rounded-lg border border-border bg-card shadow">
		<div class="space-y-4 overflow-x-auto p-6">
			<!-- Table header -->
			<div class="grid grid-cols-5 gap-4">
				<div class="h-4 w-24 animate-pulse rounded bg-muted"></div>
				<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
				<div class="h-4 w-32 animate-pulse rounded bg-muted"></div>
				<div class="h-4 w-16 animate-pulse rounded bg-muted"></div>
				<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
			</div>

			<!-- Table rows -->
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each Array(5) as _unused, i (i)}
				<div class="grid grid-cols-5 gap-4">
					<div class="h-8 animate-pulse rounded bg-muted"></div>
					<div class="h-8 animate-pulse rounded bg-muted"></div>
					<div class="h-8 animate-pulse rounded bg-muted"></div>
					<div class="h-8 animate-pulse rounded bg-muted"></div>
					<div class="h-8 animate-pulse rounded bg-muted"></div>
				</div>
			{/each}
		</div>
	</div>
</div>
