/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAppelFonction from './CAppelFonctionBase'
import CFonc from './CFonc'

// export default CAppelFonction
export default CAppelFonction

CAppelFonction.prototype.calculAvecValeursRemplacees = function (bfrac) {
  const fon = (this.fonctionAssociee.className === 'CFonc')
    ? new CFonc(this.listeProprietaire, null, false, this.fonctionAssociee.nomCalcul,
      '', this.fonctionAssociee.nomsVariables, this.fonctionAssociee.calcul.calculAvecValeursRemplacees(bfrac))
    : this.fonctionAssociee
  return new CAppelFonction(this.listeProprietaire, fon, this.operande.calculAvecValeursRemplacees(bfrac))
}

// Déplacé ici version 6.4.7
CAppelFonction.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  return new CAppelFonction(this.listeProprietaire, this.fonctionAssociee,
    this.operande.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1))
}
