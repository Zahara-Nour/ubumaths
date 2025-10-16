import NatCal from '../types/NatCal'
import CAbscisseOrigineRep from './CAbscisseOrigineRep'
import CPointBase from './CPointBase'
import CDroiteAB from './CDroiteAB'

export default CAbsMinRep

/**
 * Objet représentant l'abscisse minimale dans un repère
 * @constructor
 * @extends CAbscisseOrigineRep
 * @param {CListeObjets} listeProprietaire  la liste propriétaire
 * @param {CImplementationProto} impProto  L'implémentation de construction propriétaire (peut être null)
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {string} nomCalcul  Le nom du calcul représentant cette abscisse à l'origine
 * @param {CRepere} rep  Pointe sur le repère associé
 * @returns {void}
 */

function CAbsMinRep (listeProprietaire, impProto, estElementFinal, nomCalcul, rep) {
  if (arguments.length === 1) CAbscisseOrigineRep.call(this, listeProprietaire)
  else {
    CAbscisseOrigineRep.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, rep)
  }
}

CAbsMinRep.prototype = new CAbscisseOrigineRep()
CAbsMinRep.prototype.constructor = CAbsMinRep
CAbsMinRep.prototype.superClass = 'CAbscisseOrigineRep'
CAbsMinRep.prototype.className = 'CAbsMinRep'

CAbsMinRep.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CAbsMinRep(
    listeCible,
    /** @type {CImplementationProto} */
    listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal,
    this.nomCalcul,
    /** @type {CRepere} */
    listeCible.get(ind1, 'CRepere')
  )
}

CAbsMinRep.prototype.getNatureCalcul = function () {
  return NatCal.NAbsOrOrdMinMaxRep
}

CAbsMinRep.prototype.positionne = function (infoRandom, dimfen) {
  const rep = this.rep
  this.existe = rep.existe
  if (this.existe) {
    const list = this.listeProprietaire
    // Il faut déterminer les coordonnées des points éventuels d'intersection de l'axe
    // des abscisses avec le cadre dans lequel on dessine la figure
    // Pour ça on va créer une droite confondue avec l'axe des abscisses et la positionner
    const pt = new CPointBase()
    pt.placeEn(rep.o.x + rep.u.x, rep.o.y + rep.u.y)
    const dt = new CDroiteAB(list, null, false, null, false, 0, 0, true, '', 16, null, 0, rep.o, pt)
    dt.positionne(infoRandom, dimfen)
    if (dt.horsFenetre) {
      this.existe = false
      return
    }
    const absor = rep.abscisseOrigine.rendValeur()
    const ux = rep.uniteX.rendValeur()
    const abs1 = (rep.u.x !== 0)
      ? (dt.xext1 - rep.o.x) / rep.u.x * ux + absor
      : (dt.yext1 - rep.o.y) / rep.u.y * ux + absor
    const abs2 = (rep.u.x !== 0)
      ? (dt.xext2 - rep.o.x) / rep.u.x * ux + absor
      : (dt.yext2 - rep.o.y) / rep.u.y * ux + absor
    this.value = Math.min(abs1, abs2)
  }
}
