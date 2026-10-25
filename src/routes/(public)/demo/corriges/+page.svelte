<!--
	Vitrine : les corrigés des fiches (`/demo/corriges`)
	====================================================

	Une page de Corrigé en image fixe : la page ne charge ni Typst ni les polices.
	L'image vient de la vraie chaîne des fiches (`scripts/fiches/rendu-fiche.ts`,
	puis `compile-prod.mjs --polices-corrige`), avec deux exercices de
	`/dev/polices` ; la recette est dans docs/systeme/utilitaires-et-demos.md
	(chantier demo-debug, PR 6e).
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import { CORRIGE_IMAGE } from './corriges';
</script>

<SeoHead {...demoSeo('/demo/corriges')} />

<div class="mx-auto max-w-4xl space-y-6 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Les corrigés des fiches</h1>
		<p class="text-muted-foreground">
			Chaque fiche d'exercices s'imprime avec son corrigé. La correction y est écrite comme à la
			main, au tableau : une écriture manuscrite pour le texte, et une police mathématique du même
			trait pour les formules. Le bandeau et les titres gardent la police de la fiche.
		</p>
		<p class="text-muted-foreground">
			Ci-dessous, la première page du corrigé d'une fiche de 1re spécialité : une inéquation du
			second degré, puis des équations trigonométriques avec leur cercle.
		</p>
	</header>

	<figure class="space-y-2">
		<!-- Une feuille blanche, dans les deux thèmes -->
		<img
			src={CORRIGE_IMAGE.src}
			width={CORRIGE_IMAGE.width}
			height={CORRIGE_IMAGE.height}
			class="h-auto w-full rounded-md border border-border bg-white shadow-lg"
			alt="Page de corrigé : bandeau vert « Correction », titre « Second degré et trigonométrie », puis deux exercices corrigés en écriture manuscrite. Exercice 1 : trois inéquations du second degré, résolues avec le discriminant et données sous forme d'intervalles. Exercice 2 : la méthode du cercle trigonométrique, puis les équations cos x = √2/2, sin x = −1/2, cos x = −1 et sin x = √3/2, chacune avec son cercle et ses points solutions."
		/>
		<figcaption class="text-center text-sm text-muted-foreground">
			Extrait d'un corrigé imprimé (PDF), première page.
		</figcaption>
	</figure>
</div>
