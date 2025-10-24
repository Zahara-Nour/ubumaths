<!--
	Skeleton Dashboard Variant
	==========================

	Dashboard skeleton with stats cards and content grid.
	Perfect for dashboard pages with metrics and overview.
-->

<div class="space-y-6 animate-in fade-in duration-300">
	<!-- Page header -->
	<div class="space-y-2">
		<div class="skeleton h-9 w-64 rounded"></div>
		<div class="skeleton h-4 w-96 rounded"></div>
	</div>

	<!-- Stats cards grid -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each Array(4) as _, i (i)}
			<div class="skeleton h-32 rounded-lg"></div>
		{/each}
	</div>

	<!-- Main content section -->
	<div class="space-y-4">
		<div class="skeleton h-6 w-48 rounded"></div>
		<div class="skeleton h-64 w-full rounded-lg"></div>
	</div>

	<!-- Secondary content grid -->
	<div class="grid gap-4 lg:grid-cols-2">
		<div class="skeleton h-48 rounded-lg"></div>
		<div class="skeleton h-48 rounded-lg"></div>
	</div>
</div>
