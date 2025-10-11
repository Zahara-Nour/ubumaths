<div class="w-full space-y-6">
	<!-- Header skeleton -->
	<div class="flex items-center justify-between">
		<div class="space-y-2">
			<div class="h-8 w-64 bg-muted rounded animate-pulse"></div>
			<div class="h-4 w-48 bg-muted rounded animate-pulse"></div>
		</div>
		<div class="h-10 w-32 bg-muted rounded animate-pulse"></div>
	</div>

	<!-- Table skeleton -->
	<div class="bg-card rounded-lg shadow border border-border overflow-hidden">
		<div class="overflow-x-auto p-6 space-y-4">
			<!-- Table header -->
			<div class="grid grid-cols-5 gap-4">
				<div class="h-4 w-24 bg-muted rounded animate-pulse"></div>
				<div class="h-4 w-20 bg-muted rounded animate-pulse"></div>
				<div class="h-4 w-32 bg-muted rounded animate-pulse"></div>
				<div class="h-4 w-16 bg-muted rounded animate-pulse"></div>
				<div class="h-4 w-20 bg-muted rounded animate-pulse"></div>
			</div>

			<!-- Table rows -->
			{#each Array(5) as _}
				<div class="grid grid-cols-5 gap-4">
					<div class="h-8 bg-muted rounded animate-pulse"></div>
					<div class="h-8 bg-muted rounded animate-pulse"></div>
					<div class="h-8 bg-muted rounded animate-pulse"></div>
					<div class="h-8 bg-muted rounded animate-pulse"></div>
					<div class="h-8 bg-muted rounded animate-pulse"></div>
				</div>
			{/each}
		</div>
	</div>
</div>
