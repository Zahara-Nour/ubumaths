/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CConstante from './CConstanteBase'
import COperation from './COperationBase'
import { pgcd, zero13 } from '../kernel/kernel'
import Ope from '../types/Ope'

export default CConstante

// Déplacé ici version 6.4.7
CConstante.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac) {
  if (rempDecParFrac) {
    const liste = this.listeProprietaire
    // CConstante co  = (CConstante) this;
    const va = this.valeur
    if (va === Math.floor(va)) return this
    // Modifié version 7.3 pour optimisation
    // const n = Math.floor(va * Math.pow(10, 9) + 0.5)
    const n = Math.round(va * Math.pow(10, 9))
    const d = 1000000000
    if (!zero13(va - n / Math.pow(10, 9))) return this
    const g = pgcd(n, 1000000000)
    const num = n / g
    const den = d / g
    if (sousdivnorm) {
      if (num === 1) {
        return new COperation(liste, new CConstante(liste, 1), new CConstante(liste, d / g), Ope.Divi)
      }
      return new COperation(liste, new CConstante(liste, num), new COperation(liste, new CConstante(liste, 1),
        new CConstante(liste, den), Ope.Divi), Ope.Mult)
    }
    return new COperation(liste, new CConstante(liste, num), new CConstante(liste, den), Ope.Divi)
  }
  return this
}
