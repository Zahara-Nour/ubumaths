/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuObjetAncetre from './CLieuObjetAncetre'
export default CLieuObjetParPtLie
// A noter qu'il n'est pas nécessaire de redéfinir depDe pour cet objet car l'objet à tracer dépend
// forcément du point lié générateur

/**
 * Classe représentant un lieu d'objets généré par les positions d'un point lié.
 * @constructor
 * @extends CLieuObjetAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la liste propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué
 * @param {CElementGraphique} elementAssocie  L'objet qui laisse une trace.
 * @param {CValeur} nombreTraces  Le nombre d'objets pour la trace (dynamique).
 * @param {CPointLie} pointLieGenerateur  Le point lié dont les positions génèrent le lieu.
 * @returns {CLieuObjetParPtLie}
 */
function CLieuObjetParPtLie (listeProprietaire, impProto, estElementFinal, couleur,
  masque, elementAssocie, nombreTraces, pointLieGenerateur) {
  if (arguments.length === 1) CLieuObjetAncetre.call(this, listeProprietaire)
  else {
    CLieuObjetAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, elementAssocie, nombreTraces)
    this.pointLieGenerateur = pointLieGenerateur
  }
}
CLieuObjetParPtLie.prototype = new CLieuObjetAncetre()
CLieuObjetParPtLie.prototype.constructor = CLieuObjetParPtLie
CLieuObjetParPtLie.prototype.superClass = 'CLieuObjetAncetre'
CLieuObjetParPtLie.prototype.className = 'CLieuObjetParPtLie'

CLieuObjetParPtLie.prototype.numeroVersion = function () {
  return 2
}

CLieuObjetParPtLie.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.elementAssocie)
  const ind2 = listeSource.indexOf(this.pointLieGenerateur)
  const ind3 = listeSource.indexOf(this.impProto)
  const nombreTracesClone = this.nombreTraces.getClone(listeSource, listeCible)

  const ptelb = new CLieuObjetParPtLie(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, listeCible.get(ind1, 'CElementGraphique'), nombreTracesClone,
    listeCible.get(ind2, 'CPointLie'))
  if (listeCible.className !== 'CPrototype') { ptelb.listeElementsAncetres.setImage(this.listeElementsAncetres, this.listeProprietaire, ptelb.listeProprietaire) }
  return ptelb
}
CLieuObjetParPtLie.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.pointLieGenerateur)
  liste.add(this.elementAssocie)
}
CLieuObjetParPtLie.prototype.metAJour = function () {
  CLieuObjetAncetre.prototype.metAJour.call(this)
  this.etablitListeElementsAncetres()
}

CLieuObjetParPtLie.prototype.dependDePourCapture = function (p) {
  return (this.pointLieGenerateur !== p) && (((p === this) || this.elementAssocie.depDe(p)) || this.nombreTraces.depDe(p))
}
CLieuObjetParPtLie.prototype.positionne = function (infoRandom, dimfen) {
  let nbValeurs, abscisseMini, abscisseMaxi, abscisse, pas, abscisseFinale, i, ptelg
  const nbmax = CLieuObjetAncetre.nombreMaxiPourLieuObjet
  CLieuObjetAncetre.prototype.positionne.call(this, infoRandom, dimfen)
  this.existe = this.existe && this.pointLieGenerateur.existe && (this.nombreObjetsPourLieuObjet() <= nbmax)
  if (!this.existe) return
  const dnbt = Math.round(this.nombreTraces.rendValeur())
  this.existe = (dnbt >= 2) && (dnbt <= nbmax)
  if (!this.existe) return
  // var nbt = (int) dnbt;

  // Changement important de la version 2.5, le nombre de traces étant devenu dynamique
  if (dnbt !== this.listeCopiesObjet.longueur()) this.ajusteListeCopieObjets()
  abscisseMini = this.pointLieGenerateur.abscisseMinimale()
  abscisseMaxi = this.pointLieGenerateur.abscisseMaximale()
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
  if (this.pointLieGenerateur.lieALigneFermee()) {
    nbValeurs = dnbt
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi - pas
  } else {
    nbValeurs = dnbt - 1
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi
  }
  const abscisseInitiale = this.pointLieGenerateur.abscisse
  abscisse = abscisseMini
  this.existe = false
  const elementAssocieMasque = this.elementAssocie.masque
  this.elementAssocie.montre()
  // Modifié version 3.9.1 pour éviter des erreurs d'arrondi
  const nb = dnbt - 1
  for (i = 0; i < dnbt; i++) {
    abscisse = (i === 0) ? abscisseMini : ((i === nb) ? abscisseFinale : abscisse + pas)
    this.pointLieGenerateur.donneAbscisse(abscisse)
    this.listeElementsAncetres.positionne(infoRandom, dimfen)
    this.existe = this.existe || this.elementAssocie.existe
    ptelg = this.listeCopiesObjet.get(i)
    ptelg.setClone(this.elementAssocie)
  }
  this.elementAssocie.masque = elementAssocieMasque
  this.pointLieGenerateur.donneAbscisse(abscisseInitiale)
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
}
// Ajout version 6.3.0
CLieuObjetParPtLie.prototype.positionneFull = function (infoRandom, dimfen) {
  this.nombreTraces.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CLieuObjetParPtLie.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.pointLieGenerateur === p.pointLieGenerateur) && (this.elementAssocie === p.elementAssocie) &&
      this.nombreTraces.confonduAvec(p.nombreTraces)
  } else return false
}
/**
 * Fonction mettant dans this.listeElementsAncetres la liste de tous les objets de la liste
 * propriétaire qui doivent être calculés lorsque le lieu est calculé.
 * @returns {void}
 */
CLieuObjetParPtLie.prototype.etablitListeElementsAncetres = function () {
  if (this.listeProprietaire.className !== 'CPrototype') {
    this.listeElementsAncetres.retireTout()
    const indiceElementAssocie = this.listeProprietaire.indexOf(this.elementAssocie)
    const indicePointLieGenerateur = this.listeProprietaire.indexOf(this.pointLieGenerateur)
    this.listeElementsAncetres.add(this.pointLieGenerateur)
    for (let i = indicePointLieGenerateur + 1; i < indiceElementAssocie; i++) {
      const ptelb = this.listeProprietaire.get(i)
      if ((this.elementAssocie.depDe(ptelb)) && (ptelb.depDe(this.pointLieGenerateur))) {
        this.listeElementsAncetres.add(ptelb)
      }
    }
    this.listeElementsAncetres.add(this.elementAssocie)
  }
}
CLieuObjetParPtLie.prototype.read = function (inps, list) {
  CLieuObjetAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.pointLieGenerateur = list.get(ind1, 'CPointLie')
  if (this.nVersion === 1) this.etablitListeElementsAncetres()
  else this.listeElementsAncetres.read(inps, list)
}
CLieuObjetParPtLie.prototype.write = function (oups, list) {
  CLieuObjetAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.pointLieGenerateur)
  oups.writeInt(ind1)
  this.listeElementsAncetres.write(oups, this.listeProprietaire)
}
