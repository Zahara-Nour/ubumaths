/**
 * Images locales d'une fiche EN COURS DE RÉDACTION
 * ================================================
 *
 * Une fiche d'applications cite ses illustrations par leur URL du bucket
 * `exercise-images`, que le script de création n'envoie qu'au `--publier`. Pour
 * compiler la fiche AVANT, on place chaque image citée, prise dans
 * `<dossier>/images/` par le nom de fichier de son URL, sous le chemin virtuel
 * qu'écrit le générateur Typst (`virtual/images/<empreinte de l'URL>`) : c'est
 * là que `compile-prod.mjs` lit les images, comme `regen-depuis-base.ts` les y
 * télécharge pour une fiche en base.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { urlToVirtualPath } from '$lib/typst/image-loader';

/**
 * `aConvertir` : image locale dont le format n'est pas celui du chemin virtuel (un
 * WebP, que le générateur renomme `.png`) ; la copier telle quelle donnerait un faux
 * PNG. Les illustrations d'une fiche sont des PNG (docs/pratiques/fiches-exercices.md § 4).
 */
export type ImagesLocales = { copiees: string[]; manquantes: string[]; aConvertir: string[] };

/** URL des images citées (`![alt](URL)`), sans doublon, dans l'ordre de lecture. */
function urlsDesImages(textes: string[]): string[] {
	const urls = textes.flatMap((t) =>
		[...t.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)].map((m) => m[1])
	);
	return [...new Set(urls)];
}

/**
 * Copie dans `<dossier>/virtual/images/` les images citées par `textes` et
 * présentes dans `<dossier>/images/`. Rend les noms copiés et les noms absents.
 */
export function copierImagesLocales(dossier: string, textes: string[]): ImagesLocales {
	const resultat: ImagesLocales = { copiees: [], manquantes: [], aConvertir: [] };
	for (const url of urlsDesImages(textes)) {
		// Le nom du fichier local est le nom décodé (`mon%20schema.png` → `mon schema.png`)
		const nom = decodeURIComponent(basename(new URL(url).pathname));
		const source = join(dossier, 'images', nom);
		if (!existsSync(source)) {
			resultat.manquantes.push(nom);
			continue;
		}
		const nomVirtuel = basename(urlToVirtualPath(url));
		if (extname(nom).toLowerCase() !== extname(nomVirtuel)) {
			resultat.aConvertir.push(nom);
			continue;
		}
		const dossierVirtuel = join(dossier, 'virtual', 'images');
		mkdirSync(dossierVirtuel, { recursive: true });
		copyFileSync(source, join(dossierVirtuel, nomVirtuel));
		resultat.copiees.push(nom);
	}
	return resultat;
}
