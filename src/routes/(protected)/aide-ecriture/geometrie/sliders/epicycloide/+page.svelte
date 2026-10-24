<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import DslDemo from '../../DslDemo.svelte';

	const dsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
a = slider(min=30, max=300, valeur=120, pas=10)
B = rotation(P, centre=A, angle=a, couleur="orange")
L = lieu(B, A, couleur="violet")`;
</script>

<svelte:head>
	<title>Rotation autour d'un point mobile — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<BackLink href="/aide-ecriture/geometrie/sliders" label="Retour aux sliders" />
		<h1 class="mt-2 text-2xl font-bold">Rotation autour d'un point mobile</h1>
		<p class="text-muted-foreground">
			A parcourt le cercle. B = rotation(P, centre=A, angle=a). Pour un angle a fixé, B dépend de A
			par une similitude : B décrit donc un cercle, dont le curseur a change le rayon et le centre.
			Déplacez aussi P (vert).
		</p>
	</div>

	<DslDemo {dsl} width={600} height={400} />
</div>
