<script lang="ts">
</script>

<svelte:head>
	<title>Geometry Demo — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-4">
	<div>
		<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
			>&larr; Geometry Demos</a
		>
		<h1 class="mt-2 text-2xl font-bold">Sliders interactifs</h1>
		<p class="text-muted-foreground">
			Les sliders permettent de controler dynamiquement les parametres geometriques (rayon, angle,
			rapport). Chaque figure a sa page dediee.
		</p>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<a href="/geometry-demo/sliders/limacon" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Limacon de Pascal</h2>
			<p class="text-sm text-muted-foreground">
				6 constructions explorees : homothetie, double homothetie, conchoide, implicite, pole hors
				cercle, cas particuliers.
			</p>
		</a>
		<a href="/geometry-demo/sliders/epicycloide" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Epicycloide parametrique</h2>
			<p class="text-sm text-muted-foreground">
				Rotation autour du driver. Deltoide, asteroide, etoiles.
			</p>
		</a>
		<a href="/geometry-demo/sliders/conchoide" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Conchoide de Nicomede</h2>
			<p class="text-sm text-muted-foreground">
				Deux branches via intersection droite/cercle. Boucle interieure.
			</p>
		</a>
		<a href="/geometry-demo/sliders/spirographe" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Spirographe</h2>
			<p class="text-sm text-muted-foreground">
				Milieu de deux points lies par rotation. Pentagone, hexagone, etoile.
			</p>
		</a>
		<a href="/geometry-demo/sliders/rosace" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Rosace dynamique</h2>
			<p class="text-sm text-muted-foreground">Intersection de deux cercles avec rayon variable.</p>
		</a>
		<a href="/geometry-demo/sliders/cercle" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Cercle dynamique</h2>
			<p class="text-sm text-muted-foreground">Rayon variable avec carre inscrit.</p>
		</a>
		<a href="/geometry-demo/sliders/homothetie" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Homothetie variable</h2>
			<p class="text-sm text-muted-foreground">
				Rapport k controlant la position relative. Locus avec k negatif.
			</p>
		</a>
		<a href="/geometry-demo/sliders/similitude" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Similitude (rotation + homothetie)</h2>
			<p class="text-sm text-muted-foreground">
				Deux sliders : angle et rapport. Spirales et rosaces combinees.
			</p>
		</a>
		<a href="/geometry-demo/sliders/integrale" class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Integrale dynamique</h2>
			<p class="text-sm text-muted-foreground">
				Aire signee sous une courbe avec bornes mobiles. Sous-regions teintees selon le signe de f.
			</p>
		</a>
	</div>
</div>
