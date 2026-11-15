/**
 * Convertit les images du premier lot de la boutique d'avatars en WebP.
 *
 * Entrée : un dossier de PNG/JPG nommés par la clé du catalogue
 * (`green_candle.png`, `steam_cat.jpg`…).
 * Sortie : `static/avatars/<clé>.webp`, carré 512 × 512, qualité 85.
 *
 * Recadrage : l'IA laisse souvent une grande marge autour du sujet, qui devient
 * minuscule à 24-40 px. Le script rogne le fond uni, puis agrandit le sujet
 * jusqu'à ce que sa boîte tienne juste dans le cercle d'affichage (diagonale =
 * 94 % du diamètre), sur le fond crème d'origine.
 *
 * Usage : pnpm avatars:convertir <dossier>
 */

import { readdirSync, mkdirSync } from 'node:fs';
import { extname, basename, join, resolve } from 'node:path';
import sharp from 'sharp';

// Constantes
const OUTPUT_DIR = resolve('static/avatars');
const SIZE = 512;
// Part du diamètre occupée par la diagonale du sujet (marge de sécurité du cercle)
const DIAGONAL_RATIO = 0.94;
const TRIM_THRESHOLD = 25;
const KEY_PATTERN = /^[a-z0-9_]{1,50}$/;
const INPUT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// Functions
async function fitSubjectInCircle(path: string): Promise<Buffer> {
	const image = sharp(path);
	const { width: fullWidth = 0, height: fullHeight = 0 } = await image.metadata();

	// Couleur du fond = pixel du coin haut-gauche ; boîte du sujet par rognage
	const corner = await sharp(path)
		.extract({ left: 0, top: 0, width: 1, height: 1 })
		.raw()
		.toBuffer();
	const background = { r: corner[0], g: corner[1], b: corner[2] };
	const { info } = await sharp(path)
		.trim({ background, threshold: TRIM_THRESHOLD })
		.toBuffer({ resolveWithObject: true });
	const left = -(info.trimOffsetLeft ?? 0);
	const top = -(info.trimOffsetTop ?? 0);

	// Carré centré sur le sujet, de côté tel que sa diagonale tienne dans le cercle.
	// On découpe l'image d'origine (même grain de papier), sans aplat rapporté.
	const side = Math.min(
		fullWidth,
		fullHeight,
		Math.ceil(Math.hypot(info.width, info.height) / DIAGONAL_RATIO)
	);
	const cx = left + info.width / 2;
	const cy = top + info.height / 2;
	const x = Math.round(Math.min(Math.max(cx - side / 2, 0), fullWidth - side));
	const y = Math.round(Math.min(Math.max(cy - side / 2, 0), fullHeight - side));

	return sharp(path)
		.extract({ left: x, top: y, width: side, height: side })
		.resize(SIZE, SIZE)
		.png()
		.toBuffer();
}

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
		const info = await fitSubjectInCircle(join(inputDir, file)).then((buffer) =>
			sharp(buffer).webp({ quality: 85, effort: 6 }).toFile(output)
		);
		console.log(`✅ ${file} → static/avatars/${key}.webp (${Math.round(info.size / 1024)} Ko)`);
	}
}

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
