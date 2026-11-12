/**
 * Images locales d'une fiche en rédaction
 * =======================================
 *
 * Une fiche d'applications cite ses illustrations par leur URL du bucket, qui
 * n'existent pas encore pendant la rédaction (le script de création les envoie
 * au `--publier`). `copierImagesLocales` place chaque image citée, prise dans
 * `<dossier>/images/` par son nom de fichier, sous le chemin virtuel que le
 * générateur Typst écrit (`virtual/images/<empreinte de l'URL>`), là où
 * `compile-prod.mjs` la lit. Une image citée absente en local est signalée.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { urlToVirtualPath } from '$lib/typst/image-loader';
import { copierImagesLocales } from '../fiches/images-locales';

const BASE = 'https://exemple.supabase.co/storage/v1/object/public/exercise-images/auteur';
const TAXI = `${BASE}/affine-taxi.png`;
const JAUGE = `${BASE}/affine-jauge.png`;

let dossier: string;

function nomVirtuel(url: string): string {
	return urlToVirtualPath(url).split('/').pop() ?? '';
}

beforeEach(() => {
	dossier = mkdtempSync(join(tmpdir(), 'fiche-images-'));
	mkdirSync(join(dossier, 'images'));
	writeFileSync(join(dossier, 'images', 'affine-taxi.png'), 'octets du taxi');
});

afterEach(() => {
	rmSync(dossier, { recursive: true, force: true });
});

describe('copierImagesLocales', () => {
	it('copie une image citée sous son nom virtuel, octets intacts', () => {
		const r = copierImagesLocales(dossier, [`Texte\n\n![Un taxi](${TAXI}){size=large}\n`]);
		const cible = join(dossier, 'virtual', 'images', nomVirtuel(TAXI));
		expect(readFileSync(cible, 'utf8')).toBe('octets du taxi');
		expect(r).toEqual({ copiees: ['affine-taxi.png'], manquantes: [] });
	});

	it('signale une image citée absente du dossier images/, sans rien copier pour elle', () => {
		const r = copierImagesLocales(dossier, [`![Une jauge](${JAUGE})`]);
		expect(r).toEqual({ copiees: [], manquantes: ['affine-jauge.png'] });
		expect(existsSync(join(dossier, 'virtual', 'images', nomVirtuel(JAUGE)))).toBe(false);
	});

	it('ne traite qu’une fois une image citée dans plusieurs textes', () => {
		const r = copierImagesLocales(dossier, [`![a](${TAXI})`, `![b](${TAXI})`]);
		expect(r.copiees).toEqual(['affine-taxi.png']);
	});

	it('ne crée rien quand aucun texte ne cite d’image', () => {
		const r = copierImagesLocales(dossier, ['Pas d’image ici, juste ~f(x)=2x+1~.']);
		expect(r).toEqual({ copiees: [], manquantes: [] });
		expect(existsSync(join(dossier, 'virtual'))).toBe(false);
	});

	it('ignore un lien ordinaire qui n’est pas une image', () => {
		const r = copierImagesLocales(dossier, [`[le site](https://exemple.org/page)`]);
		expect(r).toEqual({ copiees: [], manquantes: [] });
	});
});
