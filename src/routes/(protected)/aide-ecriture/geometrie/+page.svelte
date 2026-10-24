<script lang="ts">
	import { resolve } from '$app/paths';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
</script>

<svelte:head>
	<title>Géométrie · Aide à l’écriture · Chiphre</title>
</svelte:head>

<div class="p-4">
	<BackLink href="/aide-ecriture" label="Retour à l’aide à l’écriture" />
	<h1 class="mb-4 text-2xl font-bold">Géométrie</h1>
	<p class="mb-4 text-muted-foreground">
		Démonstrations interactives du langage de figures. Déplacez les points pour explorer.
	</p>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		<a
			href={resolve('/aide-ecriture/geometrie/rendering')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Modes de rendu</h2>
			<p class="text-sm text-muted-foreground">Normal, rough, mixed, parametres rough.js</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/curves')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Courbes et analyse</h2>
			<p class="text-sm text-muted-foreground">
				Droites, fonctions, tangentes, zeros/extrema, coniques, implicites
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/parametric')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Courbes paramétriques</h2>
			<p class="text-sm text-muted-foreground">
				t → (x(t), y(t)) — cercle, cardioïde, Lissajous, cycloïde, spirale, animations
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/polar')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Courbes polaires</h2>
			<p class="text-sm text-muted-foreground">
				r = f(θ) — cercle, cardioïde, limaçon, rosaces, spirale, exemples réactifs
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/piecewise')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Domaines et fonctions par morceaux</h2>
			<p class="text-sm text-muted-foreground">
				Restriction de domaine (sur ]a;b]), piecewise (forme si / sur), bornes réactives
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/vectors')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Vecteurs</h2>
			<p class="text-sm text-muted-foreground">
				Construction, operations, normes, produit scalaire
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/transformations')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Transformations</h2>
			<p class="text-sm text-muted-foreground">
				Rotation, symetrie, translation, composition, projection, inversion
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/conics')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Coniques transformees</h2>
			<p class="text-sm text-muted-foreground">
				Courbes et coniques transformees, similitude, implicites
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/circles')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Constructions sur les cercles</h2>
			<p class="text-sm text-muted-foreground">
				Cercle par 3 points, secteur, couronne, corde, puissance, remplissage
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/intersections')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Intersections</h2>
			<p class="text-sm text-muted-foreground">
				LC, CC, LQ, QQ, LF, FF — droites, cercles, coniques, fonctions
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/point-sur')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Points contraints — point_sur()</h2>
			<p class="text-sm text-muted-foreground">
				Points sur segment, droite, demidroite, cercle, arc — draggable
			</p>
		</a>
		<a href={resolve('/aide-ecriture/geometrie/lieu')} class="rounded-lg border p-4 hover:bg-muted">
			<h2 class="font-bold">Lieu geometrique</h2>
			<p class="text-sm text-muted-foreground">
				Trajectoire d'un point quand un autre glisse sur son chemin
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/trace')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Trace (lieu progressif)</h2>
			<p class="text-sm text-muted-foreground">
				Accumulation progressive des positions d'un point au fil des interactions
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/triangles')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Points remarquables du triangle</h2>
			<p class="text-sm text-muted-foreground">
				Centre de gravite, orthocentre, cercles inscrit/circonscrit, droite et cercle d'Euler
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/sliders')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Sliders interactifs</h2>
			<p class="text-sm text-muted-foreground">
				Parametres dynamiques : rayon, angle, rapport controles par slider
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/measurements')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Mesures et texte</h2>
			<p class="text-sm text-muted-foreground">
				Distances, angles, aires affichees sur la figure avec mesure() et texte()
			</p>
		</a>
		<a
			href={resolve('/aide-ecriture/geometrie/images')}
			class="rounded-lg border p-4 hover:bg-muted"
		>
			<h2 class="font-bold">Images</h2>
			<p class="text-sm text-muted-foreground">
				Placement d'images sur les figures : position libre, ancree a un point, deplacable
			</p>
		</a>
	</div>
</div>
