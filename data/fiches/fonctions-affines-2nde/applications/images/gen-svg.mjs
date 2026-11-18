#!/usr/bin/env node
/**
 * Illustrations de la fiche « Fonctions affines : applications » (Seconde)
 * =======================================================================
 *
 * Écrit les SVG dessinés à la main (taxi, thermomètre, réservoir), puis les
 * convertit en PNG de 1 200 px de large, fond blanc, par le Chromium headless
 * de Playwright (devDependency du dépôt). Version `-en` dès qu'il y a du texte
 * à traduire ; le thermomètre n'a que des nombres et « °C » / « °F » : une seule
 * version.
 *
 * Aucune image d'énoncé ne donne une réponse demandée :
 *  - taxi : prise en charge et prix au km (données), aucun prix de course ;
 *  - thermomètre : de 5 °C à 35 °C seulement (ni 0 °C, ni 37 °C, ni 100 °C, ni −40) ;
 *  - réservoir : jauge pleine (60 L) et zone de réserve (15 L), aucune distance.
 *
 * Usage (depuis la racine du worktree) :
 *   node data/fiches/fonctions-affines-2nde/applications/images/gen-svg.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ICI = dirname(fileURLToPath(import.meta.url));
const LARGEUR_PNG = 1200;
const POLICE = 'font-family="Helvetica, Arial, sans-serif"';

// ─── Taxi ──────────────────────────────────────────────────────────────────

/** Taxi vu de côté et son compteur au départ (prise en charge affichée). */
function taxi(t) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" width="600" height="300" ${POLICE}>
  <rect width="600" height="300" fill="#ffffff"/>
  <!-- route -->
  <line x1="10" y1="252" x2="330" y2="252" stroke="#6b7280" stroke-width="3"/>
  <!-- carrosserie -->
  <path d="M30 220 L30 180 Q32 165 50 162 L95 158 L130 115 Q138 106 152 106 L232 106 Q246 106 254 116 L290 158 L312 164 Q326 168 326 182 L326 220 Z"
        fill="#facc15" stroke="#1f2937" stroke-width="3" stroke-linejoin="round"/>
  <!-- vitres -->
  <path d="M110 158 L140 120 Q144 116 150 116 L186 116 L186 158 Z" fill="#bfdbfe" stroke="#1f2937" stroke-width="2.5"/>
  <path d="M196 158 L196 116 L230 116 Q238 116 243 122 L272 158 Z" fill="#bfdbfe" stroke="#1f2937" stroke-width="2.5"/>
  <!-- damier -->
  <g fill="#1f2937">
    <rect x="60" y="184" width="12" height="12"/><rect x="72" y="196" width="12" height="12"/>
    <rect x="84" y="184" width="12" height="12"/><rect x="96" y="196" width="12" height="12"/>
    <rect x="252" y="184" width="12" height="12"/><rect x="264" y="196" width="12" height="12"/>
    <rect x="276" y="184" width="12" height="12"/><rect x="288" y="196" width="12" height="12"/>
  </g>
  <!-- enseigne -->
  <rect x="160" y="84" width="56" height="22" rx="4" fill="#ffffff" stroke="#1f2937" stroke-width="2.5"/>
  <text x="188" y="101" font-size="15" font-weight="bold" text-anchor="middle" fill="#1f2937">TAXI</text>
  <!-- roues -->
  <circle cx="95" cy="222" r="28" fill="#1f2937"/><circle cx="95" cy="222" r="11" fill="#d1d5db"/>
  <circle cx="262" cy="222" r="28" fill="#1f2937"/><circle cx="262" cy="222" r="11" fill="#d1d5db"/>
  <!-- phares -->
  <rect x="314" y="172" width="12" height="10" rx="2" fill="#fde68a" stroke="#1f2937" stroke-width="1.5"/>
  <!-- compteur -->
  <rect x="368" y="60" width="210" height="190" rx="14" fill="#f3f4f6" stroke="#1f2937" stroke-width="3"/>
  <text x="473" y="88" font-size="16" font-weight="bold" text-anchor="middle" fill="#1f2937">${t.compteur}</text>
  <rect x="388" y="100" width="170" height="54" rx="6" fill="#111827"/>
  <text x="548" y="138" font-size="30" font-family="Courier New, monospace" font-weight="bold" text-anchor="end" fill="#4ade80">${t.affichage}</text>
  <text x="388" y="186" font-size="15" fill="#1f2937">${t.prise}</text>
  <text x="388" y="214" font-size="15" fill="#1f2937">${t.km}</text>
  <text x="388" y="238" font-size="13" fill="#6b7280">${t.depart}</text>
</svg>`;
}

const TAXI_FR = {
	compteur: 'Compteur',
	affichage: '4,00 €',
	prise: 'Prise en charge : 4,00 €',
	km: 'Prix au kilomètre : 1,50 €',
	depart: '(affichage au départ)'
};
const TAXI_EN = {
	compteur: 'Taximeter',
	affichage: '€4.00',
	prise: 'Pick-up fee: €4.00',
	km: 'Price per kilometre: €1.50',
	depart: '(display at the start)'
};

// ─── Thermomètre ───────────────────────────────────────────────────────────

/** Thermomètre à double graduation, de 5 °C à 35 °C (41 °F à 95 °F). */
function thermometre() {
	const yC = (c) => 520 - (c - 5) * 15; // 5 °C en bas (y = 520), 35 °C en haut (y = 70)
	const yF = (f) => yC((f - 32) / 1.8);
	let traits = '';
	for (let c = 5; c <= 35; c++) {
		const long = c % 5 === 0 ? 22 : 11;
		traits += `<line x1="${282 - long}" y1="${yC(c)}" x2="282" y2="${yC(c)}" stroke="#1f2937" stroke-width="${c % 5 === 0 ? 2.5 : 1.5}"/>`;
		if (c % 5 === 0)
			traits += `<text x="${282 - long - 8}" y="${yC(c) + 6}" font-size="18" text-anchor="end" fill="#1f2937">${c}</text>`;
	}
	for (let f = 42; f <= 94; f += 2) {
		const long = f % 10 === 0 ? 22 : 11;
		traits += `<line x1="318" y1="${yF(f)}" x2="${318 + long}" y2="${yF(f)}" stroke="#1f2937" stroke-width="${f % 10 === 0 ? 2.5 : 1.5}"/>`;
		if (f % 10 === 0)
			traits += `<text x="${318 + long + 8}" y="${yF(f) + 6}" font-size="18" fill="#1f2937">${f}</text>`;
	}
	const niveau = yC(20);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" width="600" height="640" ${POLICE}>
  <rect width="600" height="640" fill="#ffffff"/>
  <text x="230" y="40" font-size="24" font-weight="bold" text-anchor="middle" fill="#1f2937">°C</text>
  <text x="370" y="40" font-size="24" font-weight="bold" text-anchor="middle" fill="#1f2937">°F</text>
  <!-- tube -->
  <rect x="282" y="50" width="36" height="500" rx="18" fill="#f9fafb" stroke="#1f2937" stroke-width="3"/>
  <!-- liquide -->
  <rect x="291" y="${niveau}" width="18" height="${560 - niveau}" fill="#ef4444"/>
  <circle cx="300" cy="580" r="34" fill="#ef4444" stroke="#1f2937" stroke-width="3"/>
  <rect x="285" y="540" width="30" height="20" fill="#ef4444"/>
  ${traits}
</svg>`;
}

// ─── Réservoir ─────────────────────────────────────────────────────────────

/** Jauge à carburant en demi-cercle, de 0 L à 60 L, réservoir plein au départ. */
function reservoir(t) {
	const cx = 300;
	const cy = 300;
	const r = 200;
	// angle : 0 L à gauche (180°), 60 L à droite (0°)
	const point = (litres, rayon) => {
		// 0 L à 165°, 60 L à 15° : les étiquettes restent au-dessus de la base
		const a = (Math.PI / 180) * (165 - 150 * (litres / 60));
		return [cx + rayon * Math.cos(a), cy - rayon * Math.sin(a)];
	};
	const arc = (de, a, rayon) => {
		const [x1, y1] = point(de, rayon);
		const [x2, y2] = point(a, rayon);
		return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${rayon} ${rayon} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
	};
	let traits = '';
	for (let l = 0; l <= 60; l += 5) {
		const grand = l % 15 === 0;
		const [x1, y1] = point(l, r - (grand ? 30 : 16));
		const [x2, y2] = point(l, r);
		traits += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1f2937" stroke-width="${grand ? 4 : 2}"/>`;
		if (grand) {
			const [xt, yt] = point(l, r + 40);
			traits += `<text x="${xt.toFixed(1)}" y="${(yt + 8).toFixed(1)}" font-size="22" text-anchor="middle" fill="#1f2937">${l} L</text>`;
		}
	}
	// fond : couronne en demi-cercle (arc extérieur, puis arc intérieur en sens inverse)
	const [xo1, yo1] = point(0, r + 14);
	const [xo2, yo2] = point(60, r + 14);
	const [xi2, yi2] = point(60, r - 90);
	const [xi1, yi1] = point(0, r - 90);
	const fond = `M${xo1} ${yo1} A${r + 14} ${r + 14} 0 0 1 ${xo2} ${yo2} L${xi2} ${yi2} A${r - 90} ${r - 90} 0 0 0 ${xi1} ${yi1} Z`;
	const [xa, ya] = point(60, r - 40);
	const [xr, yr] = point(7.5, r - 50);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360" ${POLICE}>
  <rect width="600" height="360" fill="#ffffff"/>
  <path d="${fond}" fill="#f3f4f6" stroke="#1f2937" stroke-width="3"/>
  <path d="${arc(0, 15, r - 4)}" fill="none" stroke="#ef4444" stroke-width="12"/>
  <text x="${xr.toFixed(1)}" y="${(yr + 7).toFixed(1)}" font-size="20" font-weight="bold" text-anchor="middle" fill="#b91c1c" transform="rotate(-56.25 ${xr.toFixed(1)} ${yr.toFixed(1)})">${t.reserve}</text>
  ${traits}
  <!-- pompe -->
  <g transform="translate(276 200)" fill="#1f2937">
    <rect x="0" y="0" width="34" height="48" rx="4"/>
    <rect x="6" y="6" width="22" height="14" fill="#ffffff"/>
    <path d="M34 10 L44 18 L44 40 Q44 46 49 46 Q54 46 54 40 L54 14" fill="none" stroke="#1f2937" stroke-width="4"/>
  </g>
  <!-- aiguille -->
  <line x1="${cx}" y1="${cy}" x2="${xa.toFixed(1)}" y2="${ya.toFixed(1)}" stroke="#1d4ed8" stroke-width="7" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="14" fill="#1d4ed8"/>
  <text x="${cx}" y="345" font-size="18" text-anchor="middle" fill="#1f2937">${t.legende}</text>
</svg>`;
}

const RESERVOIR_FR = { reserve: 'réserve', legende: 'Jauge au départ : réservoir plein' };
const RESERVOIR_EN = { reserve: 'reserve', legende: 'Gauge at the start: full tank' };

// ─── Conversion ────────────────────────────────────────────────────────────

const IMAGES = [
	['affine-taxi', taxi(TAXI_FR)],
	['affine-taxi-en', taxi(TAXI_EN)],
	['affine-thermometre', thermometre()],
	['affine-reservoir', reservoir(RESERVOIR_FR)],
	['affine-reservoir-en', reservoir(RESERVOIR_EN)]
];

const navigateur = await chromium.launch();
try {
	for (const [nom, svg] of IMAGES) {
		writeFileSync(join(ICI, `${nom}.svg`), svg);
		const [, largeur, hauteur] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
		const echelle = LARGEUR_PNG / largeur;
		const page = await navigateur.newPage({
			viewport: { width: largeur, height: hauteur },
			deviceScaleFactor: echelle
		});
		await page.setContent(
			`<!doctype html><html><body style="margin:0;background:#ffffff">${svg}</body></html>`
		);
		await page.screenshot({
			path: join(ICI, `${nom}.png`),
			clip: { x: 0, y: 0, width: largeur, height: hauteur },
			omitBackground: false
		});
		await page.close();
		console.log(`${nom}.png : ${LARGEUR_PNG} × ${Math.round(hauteur * echelle)} px`);
	}
} finally {
	await navigateur.close();
}
