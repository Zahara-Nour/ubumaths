/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuObjetAncetre from './CLieuObjetAncetre'
export default CLieuObjetParVariable
// A noter qu'il n'est pas nécessaire de redéfinir depDe pour cet objet car l'objet à tracer dépend
// forcément de la variable génératrice

/**
 * Classe représentant un lieu d'objets généré par les valeurs d'une variable.
 * @constructor
 * @extends CLieuObjetAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la liste propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué
 * @param {CElementGraphique} elementAssocie  L'objet qui laisse une trace.
 * @param {CValeur} nombreTraces  Le nombre d'ojbets pour la trace (dynamique).
 * @param {CVariableBornee} variableGeneratrice  La variable dont les valeurs génèrent le lieu.
 * @returns {CLieuObjetParVariable}
 */
function CLieuObjetParVariable (listeProprietaire, impProto, estElementFinal, couleur,
  masque, elementAssocie, nombreTraces, variableGeneratrice) {
  if (arguments.length === 1) CLieuObjetAncetre.call(this, listeProprietaire)
  else {
    CLieuObjetAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, elementAssocie, nombreTraces)
    this.variableGeneratrice = variableGeneratrice
  }
}
CLieuObjetParVariable.prototype = new CLieuObjetAncetre()
CLieuObjetParVariable.prototype.constructor = CLieuObjetParVariable
CLieuObjetParVariable.prototype.superClass = 'CLieuObjetAncetre'
CLieuObjetParVariable.prototype.className = 'CLieuObjetParVariable'

CLieuObjetParVariable.prototype.numeroVersion = function () {
  return 2
}

CLieuObjetParVariable.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.elementAssocie)
  const ind2 = listeSource.indexOf(this.variableGeneratrice)
  const ind3 = listeSource.indexOf(this.impProto)
  const nombreTracesClone = this.nombreTraces.getClone(listeSource, listeCible)
  const ptelb = new CLieuObjetParVariable(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, listeCible.get(ind1, 'CElementGraphique'), nombreTracesClone,
    listeCible.get(ind2, 'CVariableBornee'))
  if (listeCible.className !== 'CPrototype') {
    ptelb.listeElementsAncetres.setImage(this.listeElementsAncetres, this.listeProprietaire, ptelb.listeProprietaire)
  }
  return ptelb
}
CLieuObjetParVariable.prototype.metAJour = function () {
  CLieuObjetAncetre.prototype.metAJour.call(this)
  this.etablitListeElementsAncetres()
}

CLieuObjetParVariable.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.variableGeneratrice)
  liste.add(this.elementAssocie)
}
CLieuObjetParVariable.prototype.positionne = function (infoRandom, dimfen) {
  let valeur, i, ptelg
  CLieuObjetAncetre.prototype.positionne.call(this, infoRandom, dimfen)
  this.existe = this.existe && (this.nombreObjetsPourLieuObjet() <= CLieuObjetAncetre.nombreMaxiPourLieuObjet)
  const dnbt = Math.round(this.nombreTraces.rendValeur())
  this.existe = this.existe && (dnbt >= 2) && (dnbt <= CLieuObjetAncetre.nombreMaxiPourLieuObjet)
  if (!this.existe) return
  // Changement important de la version 2.5, le nombre de traces étant devenu dynamique
  if (dnbt !== this.listeCopiesObjet.longueur()) this.ajusteListeCopieObjets()
  const valeurMinimale = this.variableGeneratrice.valeurMini
  const valeurMaximale = this.variableGeneratrice.valeurMaxi
  const valeurInitiale = this.variableGeneratrice.valeurActuelle
  // Pour tenir compte des points liés liés à des lieux fermés
  const pas = (valeurMaximale - valeurMinimale) / (dnbt - 1)
  valeur = valeurMinimale

  const elementAssocieMasque = this.elementAssocie.masque
  this.elementAssocie.montre()
  this.existe = false
  const nb = dnbt - 1
  for (i = 0; i < dnbt; i++) {
    // Optimisé version 4.0
    valeur = (i === 0) ? valeurMinimale : ((i === nb) ? valeurMaximale : valeur + pas)
    this.variableGeneratrice.donneValeur(valeur)
    this.listeElementsAncetres.positionne(infoRandom, dimfen)
    this.existe = this.existe || this.elementAssocie.existe
    ptelg = this.listeCopiesObjet.get(i)
    ptelg.setClone(this.elementAssocie)
    // Au cas où l'objet générateur du lieu serait caché
    ptelg.montre()
  }
  this.elementAssocie.masque = elementAssocieMasque
  // On redonne à la variable génératrice sa valeur initiale
  this.variableGeneratrice.donneValeur(valeurInitiale)
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
}
// Ajout version 6.3.0
CLieuObjetParVariable.prototype.positionneFull = function (infoRandom, dimfen) {
  this.nombreTraces.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CLieuObjetParVariable.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.variableGeneratrice === p.variableGeneratrice) &&
    (this.elementAssocie === p.elementAssocie) &&
    this.nombreTraces.confonduAvec(p.nombreTraces)
  } else return false
}
/**
 * Fonction mettant dans this.listeElementsAncetres la liste de tous les objets de la liste
 * propriétaire qui doivent être calculés lorsque le lieu est calculé.
 * @returns {void}
 */
CLieuObjetParVariable.prototype.etablitListeElementsAncetres = function () {
  if (this.listeProprietaire.className !== 'CPrototype') {
    this.listeElementsAncetres.retireTout()
    const indicePointATracer = this.listeProprietaire.indexOf(this.elementAssocie)
    const indiceVariableGeneratrice = this.listeProprietaire.indexOf(this.variableGeneratrice)
    this.listeElementsAncetres.add(this.variableGeneratrice)
    for (let i = indiceVariableGeneratrice + 1; i < indicePointATracer; i++) {
      const ptelb = this.listeProprietaire.get(i)
      if ((this.elementAssocie.depDe(ptelb)) && (ptelb.depDe(this.variableGeneratrice))) { this.listeElementsAncetres.add(ptelb) }
    }
    this.listeElementsAncetres.add(this.elementAssocie)
  }
}
CLieuObjetParVariable.prototype.read = function (inps, list) {
  CLieuObjetAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.variableGeneratrice = list.get(ind1, 'CVariableBornee')
  if (this.nVersion === 1) this.etablitListeElementsAncetres()
  else this.listeElementsAncetres.read(inps, list)
}
CLieuObjetParVariable.prototype.write = function (oups, list) {
  CLieuObjetAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.variableGeneratrice)
  oups.writeInt(ind1)
  this.listeElementsAncetres.write(oups, this.listeProprietaire)
}
