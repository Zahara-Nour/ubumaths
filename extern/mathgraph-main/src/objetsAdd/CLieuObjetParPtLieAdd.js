/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuObjetParPtLie from '../objets/CLieuObjetParPtLie'
import { getStr } from '../kernel/kernel'
import CLieuObjetAncetre from '../objets/CLieuObjetAncetre'

export default CLieuObjetParPtLie

CLieuObjetParPtLie.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('LieuObj') + ' ' + getStr('of') + ' ' + this.elementAssocie.getNom() +
    ' ' + getStr('chinfo207') + ' ' + this.pointLieGenerateur.getName()
}

CLieuObjetParPtLie.prototype.estGenereParPointLie = function (pointlie) {
  return this.pointLieGenerateur === pointlie
}

CLieuObjetParPtLie.prototype.positionneTikz = function (infoRandom, dimfen) {
  let nbValeurs, abscisseMini, abscisseMaxi, abscisse, pas, abscisseFinale
  const plg = this.pointLieGenerateur
  CLieuObjetAncetre.prototype.positionneTikz.call(this, infoRandom, dimfen)
  this.existe = this.existe && plg.existe && (this.nombreObjetsPourLieuObjet() <= CLieuObjetAncetre.nombreMaxiPourLieuObjet)
  if (!this.existe) return
  const dnbt = Math.round(this.nombreTraces.rendValeur())
  this.existe = (dnbt >= 2) && (dnbt <= CLieuObjetAncetre.nombreMaxiPourLieuObjet)
  if (!this.existe) return
  const nbt = Math.round(dnbt)

  // Changement important de la version 2.5, le nombre de traces étant devenu dynamique
  if (nbt !== this.listeCopiesObjet.longueur()) this.ajusteListeCopieObjets()
  abscisseMini = plg.abscisseMinimale()
  abscisseMaxi = plg.abscisseMaximale()
  if (abscisseMini === abscisseMaxi) {
    this.existe = false
    return
  } else {
    if (abscisseMini > abscisseMaxi) {
      const w = abscisseMini
      abscisseMini = abscisseMaxi
      abscisseMaxi = w
    }
  }
  // Pour tenir compte des points liés liés à des lieux fermés
  if (plg.lieALigneFermee()) {
    nbValeurs = nbt
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi - pas
  } else {
    nbValeurs = nbt - 1
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi
  }
  const abscisseInitiale = plg.abscisse
  abscisse = abscisseMini

  this.existe = false
  const elementAssocieMasque = this.elementAssocie.masque
  this.elementAssocie.montre()
  // Modifié version 3.9.1 pour éviter des erreurs d'arrondi
  const nb = nbt - 1
  for (let i = 0; i < nbt; i++) {
    abscisse = (i === 0) ? abscisseMini : ((i === nb) ? abscisseFinale : abscisse + pas)
    plg.donneAbscisse(abscisse)
    this.listeElementsAncetres.positionneTikz(infoRandom, dimfen)
    this.existe = this.existe || this.elementAssocie.existe
    const ptelg = this.listeCopiesObjet.get(i)
    ptelg.setCloneTikz(this.elementAssocie)
  }
  this.elementAssocie.masque = elementAssocieMasque
  this.pointLieGenerateur.donneAbscisse(abscisseInitiale)
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
}

CLieuObjetParPtLie.prototype.estDefiniParObjDs = function (listeOb) {
  return CLieuObjetAncetre.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.pointLieGenerateur.estDefPar(listeOb)
  // && this.nombreTraces.estDefiniParObjDs(listeOb); // Supprimé version 6.3.0. Inutile
}
