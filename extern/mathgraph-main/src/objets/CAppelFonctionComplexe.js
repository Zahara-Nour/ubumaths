/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CFoncComplexe from './CFoncComplexe'
import CAppelFonction from './CAppelFonctionBase'
import CAppelFonctionComplexe from './CAppelFonctionComplexeBase'

export default CAppelFonctionComplexe

CAppelFonctionComplexe.prototype.calculAvecValeursRemplacees = function (bfrac) {
  const fon = (this.fonctionAssociee.className === 'CFonc')
    ? new CFoncComplexe(this.listeProprietaire, null, false, '', '', this.fonctionAssociee.nomsVariables, this.fonctionAssociee.calcul.calculAvecValeursRemplacees(bfrac))
    : this.fonctionAssociee
  return new CAppelFonction(this.listeProprietaire, fon, this.operande.calculAvecValeursRemplacees(bfrac))
}
