<!--
	Admin section landing page
	==========================

	Index for `/dashboard/admin` — the target of the « Administration » nav entry
	and the default post-elevation redirect. Without it the route resolves only to
	the layout and 404s. Access is enforced upstream by `+layout.server.ts`
	(active elevation or a real admin login); the admin-mode banner and the section
	navigation come from the layout. Kept intentionally minimal — a richer
	overview (health stats) can be added later.
-->

<svelte:head>
	<title>Administration — UbuMaths</title>
</svelte:head>

<section class="mx-auto max-w-3xl p-6">
	<h1 class="text-2xl font-bold tracking-tight">Administration</h1>
	<p class="mt-2 text-muted-foreground">
		Sélectionnez une section dans le menu pour gérer le site et la base de données.
	</p>
</section>
