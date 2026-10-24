/**
 * Script DSL du flocon de Von Koch piloté par un curseur `n`.
 *
 * Le DSL n'exécute ses boucles qu'une fois, au chargement : une boucle bornée par
 * un curseur est refusée (« Nombre attendu »). Le script construit donc d'avance
 * toutes les étapes. Chaque pointe ajoutée à l'étape k sort de son côté avec une
 * hauteur multipliée par t_k = (|n − (k−1)| − |n − k| + 1) / 2, qui vaut 0 tant
 * que n ≤ k − 1 et 1 dès que n ≥ k. Le curseur avance par pas de 1 : on voit
 * exactement l'étape n, jamais d'état intermédiaire.
 */

const SQRT3 = Math.sqrt(3);

/** Hauteur d'une pointe rapportée à la longueur du côté qui la porte : √3/6. */
const BUMP = (SQRT3 / 6).toFixed(6);

/**
 * @param steps nombre d'étapes construites (le curseur va de 0 à `steps`)
 * @param side longueur du côté du triangle de départ
 */
export function buildKochDsl(steps: number, side = 6): string {
	const half = side / 2;
	// Triangle équilatéral de centre O, parcouru dans le sens direct :
	// l'extérieur d'un côté PQ est à droite, direction (Q.y − P.y ; −(Q.x − P.x)).
	const yBottom = -(half * SQRT3) / 3;
	const yTop = (2 * half * SQRT3) / 3;
	const lines = [
		`n = slider(min=0, max=${steps}, valeur=0, pas=1)`,
		`A = point(${-half}, ${yBottom.toFixed(6)}, visible=faux)`,
		`B = point(${half}, ${yBottom.toFixed(6)}, visible=faux)`,
		`C = point(0, ${yTop.toFixed(6)}, visible=faux)`
	];
	let vertices = ['A', 'B', 'C'];
	let count = 0;
	for (let k = 1; k <= steps; k++) {
		const below = k === 1 ? 'n' : `n - ${k - 1}`;
		lines.push(`t${k} = (abs(${below}) - abs(n - ${k}) + 1) / 2`);
		const next: string[] = [];
		vertices.forEach((p, i) => {
			const q = vertices[(i + 1) % vertices.length];
			count++;
			const [a, s, b] = [`a${count}`, `s${count}`, `b${count}`];
			lines.push(
				`${a} = point(${p}.x + (${q}.x - ${p}.x)/3, ${p}.y + (${q}.y - ${p}.y)/3, visible=faux)`,
				`${s} = point((${p}.x + ${q}.x)/2 + t${k}*(${q}.y - ${p}.y)*${BUMP}, (${p}.y + ${q}.y)/2 - t${k}*(${q}.x - ${p}.x)*${BUMP}, visible=faux)`,
				`${b} = point(${p}.x + 2*(${q}.x - ${p}.x)/3, ${p}.y + 2*(${q}.y - ${p}.y)/3, visible=faux)`
			);
			next.push(p, a, s, b);
		});
		vertices = next;
	}
	lines.push(
		`F = polygone(${vertices.join(', ')}, couleur="bleu", remplissage="bleu", opacite_fond=0.15)`
	);
	return lines.join('\n');
}
