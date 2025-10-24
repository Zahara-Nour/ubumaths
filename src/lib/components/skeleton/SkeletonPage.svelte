<!--
	Skeleton Page Component
	=======================

	Full-page skeleton loader for main content during navigation.
	Shows a realistic loading state for page content.

	Usage: Display this during navigation, hide when content is ready
-->

<div class="space-y-6 animate-in fade-in duration-300">
	<!-- Page header skeleton -->
	<div class="space-y-2">
		<div class="skeleton h-9 w-64 rounded"></div>
		<div class="skeleton h-4 w-96 rounded"></div>
	</div>

	<!-- Content blocks skeleton -->
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each Array(6) as _, i (i)}
			<div class="skeleton h-48 rounded-lg"></div>
		{/each}
	</div>

	<!-- Additional content skeleton -->
	<div class="space-y-4">
		<div class="skeleton h-6 w-48 rounded"></div>
		<div class="skeleton h-64 w-full rounded-lg"></div>
	</div>
</div>
