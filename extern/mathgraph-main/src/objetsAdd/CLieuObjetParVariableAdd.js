/*
 * Created by yvesb on 29/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuObjetParVariable from '../objets/CLieuObjetParVariable'
import CLieuObjetAncetre from '../objets/CLieuObjetAncetre'
import { getStr } from '../kernel/kernel'
export default CLieuObjetParVariable

CLieuObjetParVariable.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('LieuObj') + ' ' + getStr('of') + ' ' + this.elementAssocie.getNom() +
    ' ' + getStr('chinfo207') + ' ' + this.variableGeneratrice.nomCalcul
}

CLieuObjetParVariable.prototype.positionneTikz = function (infoRandom, dimfen) {
  let valeur
  CLieuObjetAncetre.prototype.positionneTikz.call(this, infoRandom, dimfen)
  const vg = this.variableGeneratrice
  this.existe = this.existe && (this.nombreObjetsPourLieuObjet() <= CLieuObjetAncetre.nombreMaxiPourLieuObjet)
  const dnbt = Math.round(this.nombreTraces.rendValeur())
  this.existe = this.existe && (dnbt >= 2) && (dnbt <= CLieuObjetAncetre.nombreMaxiPourLieuObjet)
  if (!this.existe) return
  const nbt = Math.round(dnbt)
  if (nbt !== this.listeCopiesObjet.longueur()) this.ajusteListeCopieObjets()
  const valeurMinimale = vg.valeurMini
  const valeurMaximale = vg.valeurMaxi
  const valeurInitiale = vg.valeurActuelle
  const pas = (valeurMaximale - valeurMinimale) / (nbt - 1)
  valeur = valeurMinimale

  const elementAssocieMasque = this.elementAssocie.masque
  this.elementAssocie.montre()
  this.existe = false
  const nb = nbt - 1
  for (let i = 0; i < nbt; i++) {
    valeur = (i === 0) ? valeurMinimale : ((i === nb) ? valeurMaximale : valeur + pas)
    vg.donneValeur(valeur)
    this.listeElementsAncetres.positionneTikz(infoRandom, dimfen)
    this.existe = this.existe || this.elementAssocie.existe
    const ptelg = this.listeCopiesObjet.get(i)
    ptelg.setCloneTikz(this.elementAssocie)
    ptelg.montre()
  }
  this.elementAssocie.masque = elementAssocieMasque
  // On redonne à la variable génératrice sa valeur initiale
  vg.donneValeur(valeurInitiale)
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
}

CLieuObjetParVariable.prototype.estDefiniParObjDs = function (listeOb) {
  return CLieuObjetAncetre.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.variableGeneratrice.estDefPar(listeOb)
  // && this.nombreTraces.estDefiniParObjDs(listeOb); // Supprimé version 6.3.0. Inutile
}
