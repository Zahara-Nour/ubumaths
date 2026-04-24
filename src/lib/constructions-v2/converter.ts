/**
 * InstrumenPoche XML to DSL converter.
 *
 * Converts IEP XML actions to geometry DSL text with @ directives.
 * Simplified version focused on core geometry (points, segments, circles)
 * and instrument directives.
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
	rayon?: string;
	angle?: string;
	texte?: string;
}

/** French color names from IEP hex/name to DSL color. */
const COLOR_MAP: Record<string, string> = {
	'0x000000': 'noir',
	'0xff0000': 'rouge',
	'0x0000ff': 'bleu',
	'0x00ff00': 'vert',
	'0x008000': 'vert',
	'0x006400': 'vert',
	noir: 'noir',
	rouge: 'rouge',
	bleu: 'bleu',
	vert: 'vert',
	orange: 'orange',
	violet: 'violet'
};

function resolveColor(raw?: string): string | undefined {
	if (!raw) return undefined;
	return COLOR_MAP[raw.toLowerCase()];
}

/** Convert IEP XML string to DSL text. */
export async function convertXmlToDsl(xml: string): Promise<DslConversionResult> {
	const warnings: string[] = [];
	const errors: string[] = [];

	let actions: IepAction[];
	try {
		actions = await parseXml(xml);
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

	const lines: string[] = ['# Converti depuis InstrumenPoche'];
	const pointNames = new Map<string, string>(); // IEP id → DSL name
	let nameCounter = 0;

	function getPointName(iepId?: string): string {
		if (!iepId) return `P${++nameCounter}`;
		if (pointNames.has(iepId)) return pointNames.get(iepId)!;
		// Use IEP id as name if it's a valid identifier, otherwise generate
		const name = /^[A-Za-z_]\w*$/.test(iepId) ? iepId : `P${++nameCounter}`;
		pointNames.set(iepId, name);
		return name;
	}

	for (const action of actions) {
		const { objet, mouvement } = action;

		switch (objet) {
			case 'point': {
				switch (mouvement) {
					case 'creer': {
						const name = getPointName(action.id);
						const x = parseFloat(action.abscisse ?? '0');
						const y = parseFloat(action.ordonnee ?? '0');
						const colorPart = resolveColor(action.couleur);
						lines.push(`${name} = point(${x}, ${y})`);
						if (colorPart) {
							lines.push(`style(${name}, couleur="${colorPart}")`);
						}
						break;
					}
					case 'nommer': {
						// Labels are handled by the point name, skip
						break;
					}
					case 'masquer': {
						const name = getPointName(action.id);
						lines.push(`@cacher("${name}")`);
						break;
					}
					case 'montrer': {
						const name = getPointName(action.id);
						lines.push(`@montrer("${name}")`);
						break;
					}
					default:
						warnings.push(`Action point non supportee: ${mouvement}`);
				}
				break;
			}

			case 'crayon': {
				switch (mouvement) {
					case 'montrer':
						lines.push('@instrument("crayon")');
						break;
					case 'masquer':
						lines.push('@cacher');
						break;
					case 'tracer':
					case 'deplacer': {
						// Pencil draws a segment — need start and end points
						// IEP pencil trace is complex, simplify to instruction
						if (action.abscisse && action.ordonnee) {
							lines.push(`@instruction("Tracer...")`);
						}
						break;
					}
					default:
						warnings.push(`Action crayon non supportee: ${mouvement}`);
				}
				break;
			}

			case 'regle': {
				switch (mouvement) {
					case 'montrer':
						lines.push('@instrument("regle")');
						break;
					case 'masquer':
						lines.push('@cacher');
						break;
					case 'translation':
					case 'rotation':
						// Instrument movement — skip (auto-positioned in DSL)
						break;
					case 'tracer': {
						// Ruler trace = segment between two points
						// In IEP this references point IDs, but the format varies
						warnings.push('Trace de regle: segment auto-genere');
						break;
					}
					default:
						warnings.push(`Action regle non supportee: ${mouvement}`);
				}
				break;
			}

			case 'compas': {
				switch (mouvement) {
					case 'montrer':
						lines.push('@instrument("compas")');
						break;
					case 'masquer':
						lines.push('@cacher');
						break;
					case 'ecarter':
					case 'lever':
					case 'coucher':
					case 'retourner':
						// Compass manipulation — skip (handled by animation layer)
						break;
					case 'tracer': {
						// Compass trace = circle or arc
						if (action.id && action.rayon) {
							const center = getPointName(action.id);
							const radius = parseFloat(action.rayon);
							lines.push(`cercle(${center}, rayon=${radius})`);
						}
						break;
					}
					default:
						warnings.push(`Action compas non supportee: ${mouvement}`);
				}
				break;
			}

			case 'equerre': {
				switch (mouvement) {
					case 'montrer':
						lines.push('@instrument("equerre")');
						break;
					case 'masquer':
						lines.push('@cacher');
						break;
					default:
						// Skip movements
						break;
				}
				break;
			}

			case 'trait': {
				if (mouvement === 'creer') {
					// A line/segment between two points
					// IEP uses abscisses/ordonnees (plural) for multi-point lines
					warnings.push('Trait converti en commentaire (format complexe)');
					lines.push('# trait (conversion manuelle necessaire)');
				}
				break;
			}

			case 'texte': {
				if (mouvement === 'ecrire' && action.texte) {
					const text = action.texte
						.replace(/£lt£/g, '<')
						.replace(/£gt£/g, '>')
						.replace(/£guillemet£/g, '"')
						.replace(/<br£gt£/g, ' ');
					lines.push(`@instruction("${text.replace(/"/g, "'")}")`);
				}
				break;
			}

			case 'longueur':
			case 'angle_droit':
			case 'marque':
				// Annotations — skip for now
				warnings.push(`Annotation ${objet} non convertie`);
				break;

			case 'image':
				warnings.push('Images non supportees en DSL');
				break;

			default:
				warnings.push(`Objet inconnu: ${objet}`);
		}

		// Tempo → @pause
		if (action.tempo) {
			const ms = parseInt(action.tempo) * 50;
			if (ms > 0 && ms < 30000) {
				lines.push(`@pause(${ms})`);
			}
		}
	}

	const dsl = lines.join('\n');
	return { success: true, dsl, warnings, errors };
}

/** Parse IEP XML to action list using DOMParser (browser) or xml2js (Node). */
async function parseXml(xml: string): Promise<IepAction[]> {
	if (typeof DOMParser !== 'undefined') {
		return parseWithDOMParser(xml);
	}
	// Node.js fallback using xml2js
	return parseWithXml2js(xml);
}

async function parseWithXml2js(xml: string): Promise<IepAction[]> {
	const { parseStringPromise } = await import('xml2js');
	const doc = await parseStringPromise(xml);
	const root = doc.INSTRUMENPOCHE || doc.instrumenpoche;
	if (!root) throw new Error('Element INSTRUMENPOCHE non trouve');

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
			rayon: attrs.rayon,
			angle: attrs.angle,
			texte: attrs.texte
		});
	}
	return actions;
}

function parseWithDOMParser(xml: string): IepAction[] {
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

	const actions: IepAction[] = [];
	const actionElements = root.querySelectorAll('action');
	actionElements.forEach((el) => {
		const objet = el.getAttribute('objet');
		const mouvement = el.getAttribute('mouvement');
		if (!objet || !mouvement) return;

		actions.push({
			objet,
			mouvement,
			id: el.getAttribute('id') ?? undefined,
			abscisse: el.getAttribute('abscisse') ?? undefined,
			ordonnee: el.getAttribute('ordonnee') ?? undefined,
			nom: el.getAttribute('nom') ?? undefined,
			couleur: el.getAttribute('couleur') ?? undefined,
			tempo: el.getAttribute('tempo') ?? undefined,
			rayon: el.getAttribute('rayon') ?? undefined,
			angle: el.getAttribute('angle') ?? undefined,
			texte: el.getAttribute('texte') ?? undefined
		});
	});

	return actions;
}
