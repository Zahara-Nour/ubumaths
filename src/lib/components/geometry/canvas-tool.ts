/**
 * Un outil de construction DÉLÉGUÉ de `GeometryCanvas` : la toile ne crée rien,
 * elle dit à qui la possède où l'on a cliqué (barre d'outils de la vue
 * Géométrie de l'atelier, lot 3, PR 2). Tant qu'un outil est passé, un clic
 * sur un point ne le glisse pas : il le choisit.
 */
export interface CanvasNear {
	readonly elementIds: readonly string[];
	readonly radius: number;
	/** La taille d'un pixel, en unités du repère (`1 / ppu`). */
	readonly pixel: number;
}

export interface CanvasTool {
	/**
	 * Un clic (sans glisser) en (x ; y), coordonnées du repère. `pointId` : le
	 * point visé (8 px à la souris, 20 px au doigt), ou `null` ; `snap` :
	 * l'aimantation aux entiers, en unités du repère ; `near` : les autres
	 * éléments à la même distance (droites, cercles, courbes), le plus proche
	 * d'abord, et cette distance en unités du repère (lot 3, PR 3).
	 */
	readonly click: (
		x: number,
		y: number,
		pointId: string | null,
		snap: number,
		near: CanvasNear
	) => void;
	/** Le pointeur survole (x ; y), ou quitte la toile (`null`) : le fantôme le suit. */
	readonly hover: (at: { x: number; y: number } | null) => void;
}
