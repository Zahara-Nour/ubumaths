/**
 * Lire un QR code comme un téléphone : l'image est dessinée dans un canvas
 * par le navigateur, puis décodée par `jsqr`. Pour les tests du projet
 * `client` (navigateur réel) : on asserte le RENDU, pas le texte du SVG.
 */
import jsQR from 'jsqr';

/** Pixels par case : de l'ordre d'un QR de 2,5 cm photographié par un téléphone */
const PX_PER_MODULE = 4;

function decodeImage(image: CanvasImageSource, side: number): string | null {
	const canvas = document.createElement('canvas');
	canvas.width = side;
	canvas.height = side;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('canvas 2d indisponible');
	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, side, side);
	context.drawImage(image, 0, 0, side, side);
	const pixels = context.getImageData(0, 0, side, side);
	return jsQR(pixels.data, side, side)?.data ?? null;
}

/** Le texte lu dans un SVG de QR de `modules` cases de côté (marge comprise) */
export async function decodeSvg(svg: string, modules: number): Promise<string | null> {
	const image = new Image();
	image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	await image.decode();
	return decodeImage(image, modules * PX_PER_MODULE);
}

/** Le texte lu dans une image (PNG téléchargé) */
export async function decodeBlob(blob: Blob): Promise<string | null> {
	const bitmap = await createImageBitmap(blob);
	return decodeImage(bitmap, bitmap.width);
}
