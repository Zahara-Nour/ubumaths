/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Constantes définissant les différentes positions relatives de deux objets
 * @typedef PositionRelative
 * @type {Object}
 */
const PositionRelative = {
  appartient: 0,
  nappartient: 1,
  paralleles: 2,
  confondus: 3,
  secants: 4,
  secants1Point: 5,
  secants2Point: 6,
  tangents: 7,
  vide: 8,
  memeSupportDroite: 9,
  memeSupportCercle: 10
}
export default PositionRelative
