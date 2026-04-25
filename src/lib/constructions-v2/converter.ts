/**
 * InstrumenPoche XML to DSL converter.
 *
 * Converts IEP XML actions directly to geometry DSL text with @ directives.
 * Handles coordinate transformation, crayon/compas state tracking,
 * point deduplication, and pause filtering.
 */

export interface DslConversionResult {
	success: boolean;
	dsl?: string;
	warnings: string[];
	errors: string[];
}

interface IepAction {
	objet: string;
	mouvement: string;
	id?: string;
	abscisse?: string;
	ordonnee?: string;
	nom?: string;
	couleur?: string;
	tempo?: string;
	ecart?: string;
	debut?: string;
	fin?: string;
	sens?: string;
	epaisseur?: string;
	pointille?: string;
	style?: string;
	forme?: string;
	texte?: string;
	cible?: string;
	// Multi-point traces (forme="libre")
	abscisses?: string;
	ordonnees?: string;
	// angle_droit specific
	abscisse_sommet?: string;
	ordonnee_sommet?: string;
	abscisse_inter?: string;
	ordonnee_inter?: string;
}

interface PointInfo {
	id: string;
	name: string;
	x: number; // pixel coords (final position after translations)
	y: number;
}

// Default viewBox and pixels-per-unit
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const PPU = 40;

/** Round to 2 decimal places. */
function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

/** Convert pixel X to math X. */
function pxToMathX(px: number, viewW: number): number {
	return round2((px - viewW / 2) / PPU);
}

/** Convert pixel Y to math Y (flip). */
function pxToMathY(py: number, viewH: number): number {
	return round2((viewH / 2 - py) / PPU);
}

/** Convert pixel distance to math distance. */
function pxToMathDist(px: number): number {
	return round2(px / PPU);
}

/** Clean IEP text encoding. */
function cleanText(raw: string): string {
	return raw
		.replace(/£lt£/g, '<')
		.replace(/£gt£/g, '>')
		.replace(/£guillemet£/g, '"')
		.replace(/<br£gt£/g, ' ')
		.replace(/<[^>]+>/g, '') // strip HTML tags
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Sanitize a point name to be a valid DSL identifier. */
function sanitizeName(name: string): string {
	// Names like £i(A,1) → A1, M' → M_prime
	let s = name
		.replace(/£i\(([^,)]+),\s*(\d+)\)/g, '$1$2') // £i(A,1) → A1
		.replace(/'/g, '_prime')
		.replace(/[^A-Za-z0-9_]/g, '');
	if (!/^[A-Za-z_]/.test(s)) s = 'P' + s;
	return s || 'P';
}

/** Convert IEP XML string to DSL text. */
export async function convertXmlToDsl(xml: string): Promise<DslConversionResult> {
	const warnings: string[] = [];
	const errors: string[] = [];

	let actions: IepAction[];
	let viewW = DEFAULT_WIDTH;
	let viewH = DEFAULT_HEIGHT;
	try {
		const parsed = await parseXml(xml);
		actions = parsed.actions;
		if (parsed.viewBoxWidth) viewW = parsed.viewBoxWidth;
		if (parsed.viewBoxHeight) viewH = parsed.viewBoxHeight;
	} catch (e) {
		return {
			success: false,
			warnings,
			errors: [e instanceof Error ? e.message : 'Erreur de parsing XML']
		};
	}

	if (actions.length === 0) {
		return { success: false, warnings, errors: ['Aucune action trouvee dans le XML'] };
	}

	// ── Phase 1: Pre-scan ──
	// Build point name map (id → name) from "nommer" actions
	// Build point position map (id → final {x, y} in pixels) from "creer" + "translation"
	const pointNameById = new Map<string, string>();
	const pointPosByIdPx = new Map<string, { x: number; y: number }>();
	const usedNames = new Set<string>();

	for (const action of actions) {
		if (action.objet === 'point') {
			if (action.mouvement === 'nommer' && action.id && action.nom) {
				const name = sanitizeName(action.nom);
				pointNameById.set(action.id, name);
				usedNames.add(name);
			}
			if (action.mouvement === 'creer' && action.id) {
				const x = parseFloat(action.abscisse ?? '0');
				const y = parseFloat(action.ordonnee ?? '0');
				pointPosByIdPx.set(action.id, { x, y });
			}
			if (action.mouvement === 'translation' && action.id) {
				const x = parseFloat(action.abscisse ?? '0');
				const y = parseFloat(action.ordonnee ?? '0');
				// Update final position
				pointPosByIdPx.set(action.id, { x, y });
			}
		}
	}

	// ── Phase 2: Generate DSL ──
	const points: PointInfo[] = [];
	const emittedPointIds = new Set<string>();
	const lines: string[] = ['# Converti depuis InstrumenPoche'];
	let autoNameCounter = 0;
	let lastLineWasPause = false;

	// Crayon state (pixel coords)
	let crayonX = 0;
	let crayonY = 0;

	// Compas state (pixel coords)
	let compasX = 0;
	let compasY = 0;
	let compasEcart = 0; // radius in pixels

	function getPointName(id: string): string {
		if (pointNameById.has(id)) return pointNameById.get(id)!;
		// Generate a name
		let name: string;
		do {
			autoNameCounter++;
			name = `P${autoNameCounter}`;
		} while (usedNames.has(name));
		pointNameById.set(id, name);
		usedNames.add(name);
		return name;
	}

	/** Resolve position in pixels from cible or abscisse/ordonnee. */
	function resolvePositionPx(
		action: IepAction
	): { x: number; y: number; pointName?: string } | null {
		if (action.cible) {
			const pos = pointPosByIdPx.get(action.cible);
			if (pos) {
				const name = pointNameById.get(action.cible);
				return { x: pos.x, y: pos.y, pointName: name };
			}
			warnings.push(`Cible inconnue: ${action.cible}`);
			return null;
		}
		if (action.abscisse !== undefined && action.ordonnee !== undefined) {
			return { x: parseFloat(action.abscisse), y: parseFloat(action.ordonnee) };
		}
		return null;
	}

	/** Find existing point near pixel position (tolerance ~6px). */
	function findNearbyPoint(px: number, py: number): PointInfo | undefined {
		const TOL = 6;
		for (const p of points) {
			if (Math.abs(p.x - px) < TOL && Math.abs(p.y - py) < TOL) {
				return p;
			}
		}
		return undefined;
	}

	/** Get or create a point reference at given pixel position. */
	function pointRefAt(px: number, py: number): string {
		const existing = findNearbyPoint(px, py);
		if (existing) return existing.name;

		// Create an anonymous point (avoid name collisions)
		let name: string;
		do {
			autoNameCounter++;
			name = `P${autoNameCounter}`;
		} while (usedNames.has(name));
		usedNames.add(name);
		const mx = pxToMathX(px, viewW);
		const my = pxToMathY(py, viewH);
		lines.push(`${name} = point(${mx}, ${my})`);
		points.push({ id: `auto_${autoNameCounter}`, name, x: px, y: py });
		return name;
	}

	function emitLine(line: string): void {
		lastLineWasPause = false;
		lines.push(line);
	}

	function emitPause(ms: number): void {
		if (ms < 200) return;
		if (lastLineWasPause) return;
		lastLineWasPause = true;
		lines.push(`@pause(${ms})`);
	}

	/** Emit a point definition if not already emitted. */
	function emitPoint(id: string): void {
		if (emittedPointIds.has(id)) return;
		emittedPointIds.add(id);
		const name = getPointName(id);
		const pos = pointPosByIdPx.get(id);
		if (!pos) {
			warnings.push(`Point ${id} sans position`);
			return;
		}
		const mx = pxToMathX(pos.x, viewW);
		const my = pxToMathY(pos.y, viewH);
		emitLine(`${name} = point(${mx}, ${my})`);
		points.push({ id, name, x: pos.x, y: pos.y });
	}

	// Process actions
	for (const action of actions) {
		const { objet, mouvement } = action;

		switch (objet) {
			case 'point': {
				switch (mouvement) {
					case 'creer': {
						if (action.id) {
							emitPoint(action.id);
						}
						break;
					}
					case 'nommer':
						// Handled in pre-scan, skip
						break;
					case 'masquer': {
						if (action.id) {
							const name = getPointName(action.id);
							emitLine(`@cacher("${name}")`);
						}
						break;
					}
					case 'montrer': {
						if (action.id) {
							const name = getPointName(action.id);
							emitLine(`@montrer("${name}")`);
						}
						break;
					}
					case 'translation':
						// Position update handled in pre-scan, skip
						break;
					default:
						warnings.push(`Action point non supportee: ${mouvement}`);
				}
				break;
			}

			case 'crayon': {
				switch (mouvement) {
					case 'montrer':
						emitLine('@instrument("crayon")');
						break;
					case 'masquer':
						emitLine('@cacher');
						break;
					case 'translation': {
						// Move crayon without drawing
						const pos = resolvePositionPx(action);
						if (pos) {
							crayonX = pos.x;
							crayonY = pos.y;
						}
						break;
					}
					case 'tracer': {
						// Skip freehand drawing (forme="libre")
						if (action.forme === 'libre') {
							warnings.push('Trace libre (main levee) ignore');
							break;
						}

						const dest = resolvePositionPx(action);
						if (!dest) break;

						// Skip degenerate segments (white border frame traces)
						if (action.couleur === 'blanc') {
							crayonX = dest.x;
							crayonY = dest.y;
							break;
						}

						const startName = pointRefAt(crayonX, crayonY);
						const endName = pointRefAt(dest.x, dest.y);

						if (action.forme === 'demidroite') {
							emitLine(`demidroite(${startName}, ${endName})`);
						} else {
							emitLine(`segment(${startName}, ${endName})`);
						}

						// Update crayon position
						crayonX = dest.x;
						crayonY = dest.y;
						break;
					}
					default:
						// Ignore other crayon actions
						break;
				}
				break;
			}

			case 'compas': {
				switch (mouvement) {
					case 'montrer':
						emitLine('@instrument("compas")');
						break;
					case 'masquer':
						emitLine('@cacher');
						break;
					case 'translation': {
						const pos = resolvePositionPx(action);
						if (pos) {
							compasX = pos.x;
							compasY = pos.y;
						}
						break;
					}
					case 'ecarter': {
						if (action.ecart) {
							compasEcart = parseFloat(action.ecart);
						} else if (action.cible) {
							// ecarter to target = distance from compas to target
							const pos = pointPosByIdPx.get(action.cible);
							if (pos) {
								compasEcart = Math.sqrt((compasX - pos.x) ** 2 + (compasY - pos.y) ** 2);
							}
						}
						break;
					}
					case 'tracer': {
						// Arc: center is compas position, radius is ecart
						const centerName = pointRefAt(compasX, compasY);
						const radius = pxToMathDist(compasEcart);
						const debut = parseFloat(action.debut ?? '0');
						const fin = parseFloat(action.fin ?? '360');
						emitLine(`arc(${centerName}, rayon=${radius}, debut=${debut}, fin=${fin})`);
						break;
					}
					case 'lever':
					case 'coucher':
					case 'retourner':
					case 'rotation':
						// Animation only, skip
						break;
					default:
						warnings.push(`Action compas non supportee: ${mouvement}`);
				}
				break;
			}

			case 'regle': {
				switch (mouvement) {
					case 'montrer':
						emitLine('@instrument("regle")');
						break;
					case 'masquer':
						emitLine('@cacher');
						break;
					default:
						// translation, rotation, zoom, vide, graduations — skip
						break;
				}
				break;
			}

			case 'equerre': {
				switch (mouvement) {
					case 'montrer':
						emitLine('@instrument("equerre")');
						break;
					case 'masquer':
						emitLine('@cacher');
						break;
					default:
						// Skip movements
						break;
				}
				break;
			}

			case 'texte': {
				if (mouvement === 'ecrire' && action.texte) {
					const text = cleanText(action.texte);
					if (text) {
						emitLine(`@instruction("${text.replace(/"/g, "'")}")`);
					}
				}
				// creer, masquer, translation — skip
				break;
			}

			case 'longueur': {
				if (mouvement === 'creer') {
					// Length mark annotation — skip with comment
					warnings.push('Marque de longueur non convertie');
				}
				break;
			}

			case 'angle_droit': {
				if (mouvement === 'creer') {
					// Try to emit angle_droit if we can find the 3 points
					if (action.abscisse_sommet !== undefined && action.ordonnee_sommet !== undefined) {
						const sx = parseFloat(action.abscisse_sommet);
						const sy = parseFloat(action.ordonnee_sommet);
						const vertex = findNearbyPoint(sx, sy);
						if (vertex) {
							emitLine(`# angle_droit au sommet ${vertex.name}`);
						} else {
							emitLine('# angle_droit (points non identifies)');
						}
					} else {
						emitLine('# angle_droit');
					}
				}
				break;
			}

			case 'marque': {
				if (mouvement === 'creer') {
					warnings.push('Marque de segment non convertie');
				}
				break;
			}

			case 'trait': {
				// masquer objet="trait" — hide a drawn element by id; skip
				break;
			}

			default:
				// image, other unknown objects
				if (!['commentaire'].includes(objet)) {
					warnings.push(`Objet ignore: ${objet}`);
				}
		}

		// Tempo → @pause
		if (action.tempo) {
			const ms = parseInt(action.tempo) * 50;
			if (ms > 0 && ms < 30000) {
				emitPause(ms);
			}
		}
	}

	const dsl = lines.join('\n');
	return { success: true, dsl, warnings, errors };
}

// ── XML Parsing ──

interface ParsedXml {
	actions: IepAction[];
	viewBoxWidth?: number;
	viewBoxHeight?: number;
}

/** Parse IEP XML to action list using DOMParser (browser) or xml2js (Node). */
async function parseXml(xml: string): Promise<ParsedXml> {
	if (typeof DOMParser !== 'undefined') {
		return parseWithDOMParser(xml);
	}
	return parseWithXml2js(xml);
}

function extractAttrs(el: Element): IepAction {
	const get = (name: string) => el.getAttribute(name) ?? undefined;
	return {
		objet: get('objet')!,
		mouvement: get('mouvement')!,
		id: get('id'),
		abscisse: get('abscisse'),
		ordonnee: get('ordonnee'),
		nom: get('nom'),
		couleur: get('couleur'),
		tempo: get('tempo'),
		ecart: get('ecart'),
		debut: get('debut'),
		fin: get('fin'),
		sens: get('sens'),
		epaisseur: get('epaisseur'),
		pointille: get('pointille'),
		style: get('style'),
		forme: get('forme'),
		texte: get('texte'),
		cible: get('cible'),
		abscisses: get('abscisses'),
		ordonnees: get('ordonnees'),
		abscisse_sommet: get('abscisse_sommet'),
		ordonnee_sommet: get('ordonnee_sommet'),
		abscisse_inter: get('abscisse_inter'),
		ordonnee_inter: get('ordonnee_inter')
	};
}

function parseWithDOMParser(xml: string): ParsedXml {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'text/xml');

	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		throw new Error(`XML invalide: ${parseError.textContent}`);
	}

	const root = doc.querySelector('INSTRUMENPOCHE') || doc.querySelector('instrumenpoche');
	if (!root) {
		throw new Error('Element INSTRUMENPOCHE non trouve');
	}

	// Extract viewBox
	let viewBoxWidth: number | undefined;
	let viewBoxHeight: number | undefined;
	const viewBox = root.querySelector('viewBox');
	if (viewBox) {
		const w = viewBox.getAttribute('width');
		const h = viewBox.getAttribute('height');
		if (w) viewBoxWidth = parseInt(w);
		if (h) viewBoxHeight = parseInt(h);
	}

	const actions: IepAction[] = [];
	root.querySelectorAll('action').forEach((el) => {
		const attrs = extractAttrs(el);
		if (!attrs.objet || !attrs.mouvement) return;
		actions.push(attrs);
	});

	return { actions, viewBoxWidth, viewBoxHeight };
}

async function parseWithXml2js(xml: string): Promise<ParsedXml> {
	const { parseStringPromise } = await import('xml2js');
	const doc = await parseStringPromise(xml);
	const root = doc.INSTRUMENPOCHE || doc.instrumenpoche;
	if (!root) throw new Error('Element INSTRUMENPOCHE non trouve');

	// Extract viewBox
	let viewBoxWidth: number | undefined;
	let viewBoxHeight: number | undefined;
	const vb = root.viewBox;
	if (vb && vb[0] && vb[0].$) {
		if (vb[0].$.width) viewBoxWidth = parseInt(vb[0].$.width);
		if (vb[0].$.height) viewBoxHeight = parseInt(vb[0].$.height);
	}

	const rawActions = root.action ?? [];
	const actions: IepAction[] = [];
	for (const a of rawActions) {
		const attrs = a.$ ?? a;
		if (!attrs.objet || !attrs.mouvement) continue;
		actions.push({
			objet: attrs.objet,
			mouvement: attrs.mouvement,
			id: attrs.id,
			abscisse: attrs.abscisse,
			ordonnee: attrs.ordonnee,
			nom: attrs.nom,
			couleur: attrs.couleur,
			tempo: attrs.tempo,
			ecart: attrs.ecart,
			debut: attrs.debut,
			fin: attrs.fin,
			sens: attrs.sens,
			epaisseur: attrs.epaisseur,
			pointille: attrs.pointille,
			style: attrs.style,
			forme: attrs.forme,
			texte: attrs.texte,
			cible: attrs.cible,
			abscisses: attrs.abscisses,
			ordonnees: attrs.ordonnees,
			abscisse_sommet: attrs.abscisse_sommet,
			ordonnee_sommet: attrs.ordonnee_sommet,
			abscisse_inter: attrs.abscisse_inter,
			ordonnee_inter: attrs.ordonnee_inter
		});
	}

	return { actions, viewBoxWidth, viewBoxHeight };
}
