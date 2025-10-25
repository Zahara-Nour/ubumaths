<!--
	Skeleton Form Variant
	=====================

	Form skeleton with fields and sections.
	Perfect for pages with forms, settings, or data entry.
-->

<div class="animate-in fade-in space-y-8 duration-300">
	<!-- Page header -->
	<div class="space-y-2">
		<div class="skeleton h-9 w-64 rounded"></div>
		<div class="skeleton h-4 w-96 rounded"></div>
	</div>

	<!-- Form sections -->
	<div class="space-y-6">
		<!-- Section 1 -->
		<div class="space-y-4 rounded-lg border border-border bg-card p-6 shadow">
			<div class="skeleton h-6 w-48 rounded"></div>
			<div class="space-y-4">
				{#each Array(3) as _unused, i (i)}
					<div class="space-y-2">
						<div class="skeleton h-4 w-32 rounded"></div>
						<div class="skeleton h-10 w-full rounded"></div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Section 2 -->
		<div class="space-y-4 rounded-lg border border-border bg-card p-6 shadow">
			<div class="skeleton h-6 w-48 rounded"></div>
			<div class="space-y-4">
				{#each Array(2) as _unused, i (i)}
					<div class="space-y-2">
						<div class="skeleton h-4 w-32 rounded"></div>
						<div class="skeleton h-10 w-full rounded"></div>
					</div>
				{/each}
				<!-- Textarea -->
				<div class="space-y-2">
					<div class="skeleton h-4 w-32 rounded"></div>
					<div class="skeleton h-32 w-full rounded"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Action buttons -->
	<div class="flex justify-end gap-4">
		<div class="skeleton h-10 w-24 rounded"></div>
		<div class="skeleton h-10 w-32 rounded"></div>
	</div>
</div>
