/**
 * Le glisser DÉLÉGUÉ d'un point de `GeometryCanvas` : la toile ne modifie pas la
 * figure, elle dit à qui la possède où va le point (l'atelier, géométrie lot 3,
 * M1 : une seule vérité). Les mouvements arrivent au plus une fois par image.
 */
export interface PointDrag {
	/** Le point d'id `elementId` se glisse-t-il ? (curseur « main » au survol) */
	readonly canGrab: (elementId: string) => boolean;
	/** Le geste commence sur ce point ; faux : refusé, la toile ne glisse rien. */
	readonly grab: (elementId: string) => boolean;
	/** Le point saisi va en (x ; y), coordonnées du repère ; `snap` : l'aimantation, en unités. */
	readonly move: (x: number, y: number, snap: number) => void;
	/** Le geste est fini (relâcher, annulation du navigateur, fenêtre quittée). */
	readonly release: () => void;
}
