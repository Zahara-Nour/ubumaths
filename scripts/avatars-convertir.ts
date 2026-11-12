/**
 * Convertit les images du premier lot de la boutique d'avatars en WebP.
 *
 * Entrée : un dossier de PNG/JPG nommés par la clé du catalogue
 * (`green_candle.png`, `steam_cat.jpg`…).
 * Sortie : `static/avatars/<clé>.webp`, carré 512 × 512, qualité 85.
 *
 * Usage : pnpm avatars:convertir <dossier>
 */

import { readdirSync, mkdirSync } from 'node:fs';
import { extname, basename, join, resolve } from 'node:path';
import sharp from 'sharp';

// Constantes
const OUTPUT_DIR = resolve('static/avatars');
const SIZE = 512;
const KEY_PATTERN = /^[a-z0-9_]{1,50}$/;
const INPUT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// Functions
async function main(): Promise<void> {
	const inputDir = process.argv[2];
	if (!inputDir) {
		console.error('Usage : pnpm avatars:convertir <dossier>');
		process.exit(1);
	}

	mkdirSync(OUTPUT_DIR, { recursive: true });
	const files = readdirSync(inputDir).filter((f) => INPUT_EXTENSIONS.has(extname(f).toLowerCase()));
	if (files.length === 0) {
		console.error(`Aucune image dans ${inputDir}`);
		process.exit(1);
	}

	for (const file of files) {
		const key = basename(file, extname(file));
		if (!KEY_PATTERN.test(key)) {
			console.warn(`⏭  ${file} : nom hors clé du catalogue (a-z, 0-9, _), ignoré`);
			continue;
		}
		const output = join(OUTPUT_DIR, `${key}.webp`);
		const info = await sharp(join(inputDir, file))
			.resize(SIZE, SIZE, { fit: 'cover' })
			.webp({ quality: 85, effort: 6 })
			.toFile(output);
		console.log(`✅ ${file} → static/avatars/${key}.webp (${Math.round(info.size / 1024)} Ko)`);
	}
}

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
