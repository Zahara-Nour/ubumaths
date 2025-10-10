<div class="w-full space-y-6">
	<!-- Header skeleton -->
	<div class="flex items-center justify-between">
		<div class="space-y-2">
			<div class="placeholder h-8 w-64 animate-pulse"></div>
			<div class="placeholder h-4 w-48 animate-pulse"></div>
		</div>
		<div class="placeholder h-10 w-32 animate-pulse"></div>
	</div>

	<!-- Table skeleton -->
	<div class="bg-surface-100-900 rounded-lg shadow border border-surface-200-800 overflow-hidden">
		<div class="overflow-x-auto p-6 space-y-4">
			<!-- Table header -->
			<div class="grid grid-cols-5 gap-4">
				<div class="placeholder h-4 w-24 animate-pulse"></div>
				<div class="placeholder h-4 w-20 animate-pulse"></div>
				<div class="placeholder h-4 w-32 animate-pulse"></div>
				<div class="placeholder h-4 w-16 animate-pulse"></div>
				<div class="placeholder h-4 w-20 animate-pulse"></div>
			</div>

			<!-- Table rows -->
			{#each Array(5) as _}
				<div class="grid grid-cols-5 gap-4">
					<div class="placeholder h-8 animate-pulse"></div>
					<div class="placeholder h-8 animate-pulse"></div>
					<div class="placeholder h-8 animate-pulse"></div>
					<div class="placeholder h-8 animate-pulse"></div>
					<div class="placeholder h-8 animate-pulse"></div>
				</div>
			{/each}
		</div>
	</div>
</div>
