// on déplace ici dans un fichier séparé tout ce qui était dans kernel et dépendait de Vect ou autre chose
import { colineaires, distancePointPoint, intersectionDroitesSecantes, zero } from './kernel'
import PositionDroites from 'src/types/PositionDroites'
import Vect from 'src/types/Vect'
import PositionCercleCercle from 'src/types/PositionCercleCercle'
import PositionDroiteCercle from 'src/types/PositionDroiteCercle'

/**
 * Renvoie true si les poins de coordonnées (xa,ya), (xb,yb) et (xc,yc)
 * sont considérés comme pratiquement alignés.
 * @param {number} xa
 * @param {number} ya
 * @param {number} xb
 * @param {number} yb
 * @param {number} xc
 * @param {number} yc
 * @returns {boolean}
 */
export function aligne (xa, ya, xb, yb, xc, yc) {
  const u = new Vect()
  const v = new Vect()
  u.x = xb - xa
  u.y = yb - ya
  v.x = xc - xa
  v.y = yc - ya
  const nu = u.norme()
  const nv = v.norme()
  if (zero(nu) || zero(nv)) {
    return true
  }
  const k = (u.x * v.y - v.x * u.y) / nu / nv
  return zero(k)
}

/**
 * Renvoie true si le point de coordonnées (x,y) est considéré comme appartenant
 * au segment dont les extrémités ont pour coordonnées (p1x,p1y) et (p2x,p2y).
 * @param {number} x
 * @param {number} y
 * @param {number} p1x
 * @param {number} p1y
 * @param {number} p2x
 * @param {number} p2y
 * @returns {boolean}
 */
export function appartientSegment (x, y, p1x, p1y, p2x, p2y) {
  const difx = p2x - p1x
  const absx = Math.abs(difx)
  const dify = p2y - p1y
  const absy = Math.abs(dify)
  if (zero(difx) && zero(dify)) {
    return (zero(x - p1x) && zero(y - p1y))
  }
  if (!(aligne(p1x, p1y, p2x, p2y, x, y))) {
    return false
  }
  const k = (absy > absx)
    ? (y - p1y) / dify
    : (x - p1x) / difx
  // Modification apportée pour la version 1.9.5 pour compter avec les erreurs d'arrondi
  return (((k >= 0) && (k <= 1)) || zero(k) || zero(1 - k))
}

/**
 * Pour un point G intérieur à un triangle dont les sommets sont (x1,y1) (x2, y2) et (x3, y3), renvoie dans alpha
 * beta et gamma les coordonnées barycentriques normalisées du point de coordonnées (x,y) (la somme des coeff est 1)
 * G peut être éventuelleùent sur M1M2 ou sur M1M3
 * @param {number} x
 * @param {number} y
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @param {Pointeur} alpha
 * @param {Pointeur} beta
 * @param {Pointeur} gamma
 * @returns {void}
 */
export function coefficientsPointInterieur (x, y, x1, y1, x2, y2, x3, y3, alpha, beta, gamma) {
  if (appartientSegment(x, y, x1, y1, x2, y2)) {
    coefficientsPointSurSegment(x, y, x1, y1, x2, y2, alpha, beta)
    gamma.setValue(0)
    return
  }
  if (appartientSegment(x, y, x1, y1, x3, y3)) {
    coefficientsPointSurSegment(x, y, x1, y1, x3, y3, alpha, gamma)
    beta.setValue(0)
    return
  }
  const u = new Vect(x, y, x1, y1)
  const v = new Vect(x2, y2, x3, y3)
  // On calcule l'intersection de (AM) avec (BC)
  const d = u.x * v.y - v.x * u.y // d ne doit pas être nul car u et v ne sont pas colinéaires
  // puisque le point est strictement intérieur au triangle
  const k1 = u.y * x1 - u.x * y1
  const k2 = v.y * x2 - v.x * y2
  const xs = (u.x * k2 - v.x * k1) / d
  const ys = (u.y * k2 - v.y * k1) / d
  // xs et ys sont les coordonnées du point d'intersection H qui est sur le segment [BC]
  const ga = u.norme()
  const v1 = new Vect(xs, ys, x2, y2)
  const hb = v1.norme()
  const v2 = new Vect(xs, ys, x3, y3)
  const hc = v2.norme()
  const v3 = new Vect(xs, ys, x, y)
  const gh = v3.norme()
  const den1 = ga + gh
  const den2 = den1 * (hb + hc)
  alpha.setValue(gh / den1)
  beta.setValue(ga * hc / den2)
  gamma.setValue(ga * hb / den2)
}

/**
 * Fonction calculant les coefficients barycentriques d'un point sur un segment
 * @param {number} x  abscisse du point qui est sur le segment
 * @param {number} y  ordonnée du point qui est sur le segment
 * @param {number} x1  Abscisse du point1 du segment
 * @param {number} y1  Ordonnée du point1 du segment
 * @param {number} x2  Abscisse du point2 du segment
 * @param {number} y2  Ordonnée du point2 du segment
 * @param {Pointeur} a  Au retour, getValue() renvoie le premier coefficient barycentrique.
 * @param {Pointeur} b  Au retour, getValue() renvoie le second coefficient barycentrique.
 * @returns {void}
 */
export function coefficientsPointSurSegment (x, y, x1, y1, x2, y2, a, b) {
  const u = new Vect(x, y, x1, y1)
  const v = new Vect(x, y, x2, y2)
  const nu = u.norme()
  const nv = v.norme()
  const d = nu + nv
  a.setValue(nv / d)
  b.setValue(nu / d)
}

/**
 * Fonction renvoyant true seulement si le point de coordonnées (x; y)intérieur
 * au triangle dont les sommets ont pour coordonnées (x1; y1), (x2, y2) et (x3, y3).
 * Il peut être sur le côté M1M2 ou sur le côté M2M3.
 * Sert pour déterminer la position d'un point lié à l'intérieur d'un polygone.
 * @param {number} x
 * @param {number} y
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @returns {boolean}
 */
export function estInterieurATriangle (x, y, x1, y1, x2, y2, x3, y3) {
  if (appartientSegment(x, y, x1, y1, x2, y2) || appartientSegment(x, y, x2, y2, x3, y3)) return true
  const u = new Vect(x, y, x1, y1)
  const v = new Vect(x, y, x2, y2)
  const w = new Vect(x, y, x3, y3)
  const ang = u.mesureAngleVecteurs(v) + v.mesureAngleVecteurs(w) + w.mesureAngleVecteurs(u)
  const q = Math.abs(Math.round(ang / (2 * Math.PI)))
  return q === 1
}

/**
 * Calcule l'intersection de deux droites et renvoie un entier du type PositionDroites
 * @param {number} p1x  Abscisse d'un point de la première droite
 * @param {number} p1y  Ordonnée d'un point de la première droite
 * @param {Vect} u1  Vecteur directeur de la première droite.
 * @param {number} p2x  Abscisse d'un point de la deuxième droite
 * @param {number} p2y  Ordonnée d'un point de la deuxième droite
 * @param {Vect} u2  Vecteur directeur de la deuxième droite.
 * @param {Point} pointInt  Contient au retour les coordonnées du point d'intersection.
 * @returns {PositionDroites}
 */
export function intersection (p1x, p1y, u1, p2x, p2y, u2, pointInt) {
  const d = u1.x * u2.y - u2.x * u1.y
  // Modifié pour la version 1.9 : on teste la presque nullité du sinus et
  // non du déterminant
  if (zero(d / u1.norme() / u2.norme())) {
    const w = new Vect(p1x, p1y, p2x, p2y)
    // Il faut appeler colineaires() car w peut être nul
    return (colineaires(u1, w)) ? PositionDroites.Confondues : PositionDroites.Paralleles
  }
  const position = PositionDroites.Secantes
  const k1 = u1.y * p1x - u1.x * p1y
  const k2 = u2.y * p2x - u2.x * p2y
  pointInt.x = (u1.x * k2 - u2.x * k1) / d
  pointInt.y = (u1.y * k2 - u2.y * k1) / d
  return position
}

// Idem pour l'intersection d'une droite et d'un cercle
/**
 * Calcule l'intersection de deux cercles et renvoie un entier du type PositionCercleCercle
 * donnant la nature de cette intersection.
 * @param {number} c1x  Abscisse du centre du premier cercle.
 * @param {number} c1y  Ordonnée du centre du premier cercle.
 * @param {number} r1  Rayon du premier cercle.
 * @param {number} c2x  Abscisse du centre du second cercle.
 * @param {number} c2y  Ordonnée du centre du second cercle.
 * @param {number} r2  Rayon du second cercle.
 * @param {CPt} point1
 * @param {CPt} point2
 * @returns {PositionCercleCercle}
 */
export function intersectionCercleCercle (c1x, c1y, r1, c2x, c2y, r2, point1, point2) {
  let d, xi, yi, xh, yh, k
  const u = new Vect()
  const v = new Vect()
  if (zero(c1x - c2x) && zero(c1y - c2y)) {
    if (zero(r1 - r2)) return PositionCercleCercle.Confondus
    else return PositionCercleCercle.Vide
  } else {
    xi = (c1x + c2x) / 2
    yi = (c1y + c2y) / 2 // coordonnées du milieu de M1M2;
    const u0 = new Vect(c1x, c1y, c2x, c2y)
    d = distancePointPoint(c1x, c1y, c2x, c2y)
    u0.vecteurColineaire(1, u) // u colinéaire à M1M2 et même sens
    k = (r1 * r1 - r2 * r2) / 2 / d
    xh = xi + k * u.x
    yh = yi + k * u.y
    u.getOrthogonal(v)
    const positionDroites = intersectionDroiteCercle(xh, yh, v, c1x, c1y, r1, point1, point2)
    switch (positionDroites) {
      case PositionDroiteCercle.Tangents:
        return PositionCercleCercle.Tangents
      case PositionDroiteCercle.Secants:
        return PositionCercleCercle.Secants
      case PositionDroiteCercle.Vide:
        return PositionCercleCercle.Vide
      default : return PositionCercleCercle.Vide // Pour satisfaire le compilateur
    }
  }
}

/**
 * Calcule l'intersection d'une droite et un cercle et renvoie un entier du type PositionDroiteCercle
 * donnant la nature de cette intersection.
 * @param {number} px  Abscisse d'un point de la droite.
 * @param {number} py  Ordonnées d'un point de la droite.
 * @param {Vect} u  Un vecteur directeur de la droite.
 * @param {number} cx  Abscisse du cntre du cercle.
 * @param {number} cy  Ordonnée du cntre du cercle.
 * @param {number} R  Le rayon d cercle.
 * @param {Point} point1  Contient au retour les coordonnées du premier point d'intersection
 * (si il y en a).
 * @param {Point} point2  Contient au retour les coordonnées du second point d'intersection
 * (si il y en a).
 * @returns {PositionDroiteCercle}
 */
export function intersectionDroiteCercle (px, py, u, cx, cy, R, point1, point2) {
  const a = u.x
  const b = u.y
  const k1 = px - cx
  const k2 = py - cy
  const k3 = a * k1 + b * k2
  const k4 = a * k2 - b * k1
  const n2 = a * a + b * b
  const distcentredroite = Math.abs(a * k2 - b * k1) / Math.sqrt(n2)

  if (zero(distcentredroite - R)) {
    const t1 = -k3 / n2
    point1.x = px + a * t1
    point1.y = py + b * t1
    point2.x = point1.x
    point2.y = point1.y
    return PositionDroiteCercle.Tangents
  }

  if (distcentredroite > R) {
    return PositionDroiteCercle.Vide
  }

  const dis = n2 * R * R - k4 * k4
  const t1 = (Math.sqrt(dis) - k3) / n2// formules du second degré
  const t2 = (-Math.sqrt(dis) - k3) / n2
  point1.x = px + a * t1
  point1.y = py + b * t1
  point2.x = px + a * t2
  point2.y = py + b * t2
  return PositionDroiteCercle.Secants
}

/**
 * Renvoie dans res.x et res.y les coordonnées du projeté orthogonal du point
 * de coordonnées (x1,y1) sur la droite passant par le point de coordonnées
 * (p1x,p1y) et de vecteur directeur u.
 * @param {number} x1
 * @param {number} y1
 * @param {number} p1x
 * @param {number} p1y
 * @param {Vect} u
 * @param {Object} res
 * @returns {void}
 */
export function projetteOrtho (x1, y1, p1x, p1y, u, res) {
  const v = new Vect()
  u.getOrthogonal(v)
  intersectionDroitesSecantes(x1, y1, v, p1x, p1y, u, res)
}
