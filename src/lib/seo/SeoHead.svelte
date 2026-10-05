<!--
	En-tête de référencement d'une page publique : titre, description, URL canonique
	et balises de partage (Open Graph, Twitter). Une seule source pour toutes les pages.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from './site';

	// Types

	interface Props {
		title: string;
		description: string;
		/** `article` pour une page datée et signée (un article du Shtam) */
		type?: 'website' | 'article';
		/** Chemin d'une image 1200 × 630 dans `static/` */
		image?: string;
		/** Demande aux moteurs de ne pas indexer la page */
		noindex?: boolean;
	}

	// Props

	let {
		title,
		description,
		type = 'website',
		image = DEFAULT_OG_IMAGE,
		noindex = false
	}: Props = $props();

	// Variables

	// Chemin seul : les paramètres de requête ne font pas une autre page
	const url = $derived(absoluteUrl(page.url.pathname));
	const imageUrl = $derived(absoluteUrl(image));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	{#if noindex}
		<meta name="robots" content="noindex" />
	{/if}
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content="fr_FR" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="Père Ubu, mascotte de Chiphre, les maths de la chandelle verte"
	/>
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
