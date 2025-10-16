/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import InfoLieu from '../types/InfoLieu'
import { testToile } from '../kernel/kernel'
import CLieuDeBase from './CLieuDeBase'
export default CLieuParVariable
// A noter qu'il n'est pas nécessaire de redéfinir depDe pour cet objet car l'objet à tracer dépend
// forcément de la variable génératrice

/**
 * Classe représentant un lieu de points généré par les valeurs d'une variable.
 * @constructor
 * @extends CLieuDeBase
 * @param {CListeObjets} listeProprietaire  la liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} masque  true si l'objet est masqué
 * @param {StyleTrait} style  le style de tracé.
 * @param {CPt} pointATracer  Le point qui laisse une trace.
 * @param {InfoLieu} infoLieu
 * @param {CVariableBornee} variableGeneratrice  La variable dont les valeurs génèrent le lieu.
 * @returns {CLieuParVariable}
 */
function CLieuParVariable (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, pointATracer, infoLieu, variableGeneratrice) {
  if (arguments.length === 1) CLieuDeBase.call(this, listeProprietaire)
  else {
    CLieuDeBase.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style, pointATracer, infoLieu)
    this.variableGeneratrice = variableGeneratrice
  }
}
CLieuParVariable.prototype = new CLieuDeBase()
CLieuParVariable.prototype.constructor = CLieuParVariable
CLieuParVariable.prototype.superClass = 'CLieuDeBase'
CLieuParVariable.prototype.className = 'CLieuParVariable'

CLieuParVariable.prototype.numeroVersion = function () {
  return 2
}

CLieuParVariable.prototype.getClone = function (listeSource, listeCible) {
  const infoLieuClone = new InfoLieu(this.infoLieu)
  const ind1 = listeSource.indexOf(this.pointATracer)
  const ind2 = listeSource.indexOf(this.variableGeneratrice)
  const ind3 = listeSource.indexOf(this.impProto)
  const ptelb = new CLieuParVariable(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CPt'),
    infoLieuClone, listeCible.get(ind2, 'CVariableBornee'))
  if (listeCible.className !== 'CPrototype') { ptelb.listeElementsAncetres.setImage(this.listeElementsAncetres, this.listeProprietaire, ptelb.listeProprietaire) }
  return ptelb
}
CLieuParVariable.prototype.metAJour = function () {
  CLieuDeBase.prototype.metAJour.call(this)
  this.etablitListeElementsAncetres()
}
CLieuParVariable.prototype.positionne = function (infoRandom, dimfen) {
  let valeur, ligneEnCours, indiceLigneEnCours, i,
    auMoinsUneLigne, j, ligneTrouvee, indicePointRajoute

  if (!this.variableGeneratrice.existe) {
    this.existe = false
    return
  }
  const valeurMinimale = this.variableGeneratrice.valeurMini
  const valeurMaximale = this.variableGeneratrice.valeurMaxi
  const valeurInitiale = this.variableGeneratrice.valeurActuelle
  const pas = (valeurMaximale - valeurMinimale) / (this.infoLieu.nombreDePoints - 1)
  valeur = valeurMinimale - pas
  ligneEnCours = false
  indiceLigneEnCours = -1
  const nb = this.infoLieu.nombreDePoints - 1
  for (i = 0; i < this.infoLieu.nombreDePoints; i++) {
    // Optimisation version 4.0 pour éviter les erreurs d'arrondi
    valeur = (i === 0) ? valeurMinimale : ((i === nb) ? valeurMaximale : valeur + pas)
    this.variableGeneratrice.donneValeur(valeur)
    this.listeElementsAncetres.positionne(infoRandom, dimfen)
    if (!this.pointATracer.existe) {
      if (ligneEnCours) {
        this.infoLignes[indiceLigneEnCours].nombrePoints = i - this.infoLignes[indiceLigneEnCours].indicePremierPoint
        ligneEnCours = false
      }
    } else {
      if (!testToile(this.pointATracer.x, this.pointATracer.y)) {
        if (ligneEnCours) {
          this.infoLignes[indiceLigneEnCours].nombrePoints = i - this.infoLignes[indiceLigneEnCours].indicePremierPoint
          ligneEnCours = false
        }
      } else {
        if (ligneEnCours) {
          if (this.infoLieu.gestionDiscontinuite) {
            if ((Math.abs(this.pointATracer.x - this.absPoints[i - 1]) > dimfen.x) ||
            (Math.abs(this.pointATracer.y - this.ordPoints[i - 1]) > dimfen.y)) {
              this.infoLignes[indiceLigneEnCours].nombrePoints = i - this.infoLignes[indiceLigneEnCours].indicePremierPoint
              ligneEnCours = false
            } else {
              this.absPoints[i] = this.pointATracer.x
              this.ordPoints[i] = this.pointATracer.y
              this.infoLignes[indiceLigneEnCours].nombrePoints++
            }
          } else {
            this.absPoints[i] = this.pointATracer.x
            this.ordPoints[i] = this.pointATracer.y
            this.infoLignes[indiceLigneEnCours].nombrePoints++
          }
        } else {
          this.absPoints[i] = this.pointATracer.x
          this.ordPoints[i] = this.pointATracer.y
          indiceLigneEnCours++
          ligneEnCours = true
          this.infoLignes[indiceLigneEnCours].indicePremierPoint = i
          this.infoLignes[indiceLigneEnCours].nombrePoints = 1
        }
      }
    }
  }
  // On redonne à la variable génératrice sa valeur initiale
  this.variableGeneratrice.donneValeur(valeurInitiale)
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
  this.nombreLignes = indiceLigneEnCours + 1
  // Si le lieu n'est formé d'aucune ligne ou s'il est formé
  // de lignes avec un seul point, il n'existe pas
  if (this.nombreLignes === 0) {
    this.existe = false
    return
  }
  auMoinsUneLigne = false
  this.indicePremiereLigne = -1
  this.nombreLignesDePlusieursPoints = 0
  for (j = 0; j <= indiceLigneEnCours; j++) {
    ligneTrouvee = (this.infoLignes[j].nombrePoints >= 2)
    if (ligneTrouvee) {
      this.nombreLignesDePlusieursPoints++
      if (!auMoinsUneLigne) this.indicePremiereLigne = j
      auMoinsUneLigne = true
    }
  }
  if (!auMoinsUneLigne) {
    this.existe = false
    return
  }

  if (this.infoLieu.fermeOuNon) {
    indicePointRajoute = this.infoLignes[indiceLigneEnCours].indicePremierPoint +
     this.infoLignes[indiceLigneEnCours].nombrePoints
    this.absPoints[indicePointRajoute] =
      this.absPoints[this.infoLignes[this.indicePremiereLigne].indicePremierPoint]
    this.ordPoints[indicePointRajoute] =
      this.ordPoints[this.infoLignes[this.indicePremiereLigne].indicePremierPoint]
    this.infoLignes[indiceLigneEnCours].nombrePoints++
  }
  this.existe = true
}
CLieuParVariable.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.pointATracer === p.pointATracer) && (this.variableGeneratrice === p.variableGeneratrice)
  } else return false
}
CLieuParVariable.prototype.etablitListeElementsAncetres = function () {
  if (this.listeProprietaire.className !== 'CPrototype') {
    this.listeElementsAncetres.retireTout()
    const indicePointATracer = this.listeProprietaire.indexOf(this.pointATracer)
    const indiceVariableGeneratrice = this.listeProprietaire.indexOf(this.variableGeneratrice)
    this.listeElementsAncetres.add(this.variableGeneratrice)
    for (let i = indiceVariableGeneratrice + 1; i < indicePointATracer; i++) {
      const ptelb = this.listeProprietaire.get(i)
      if ((this.pointATracer.depDe(ptelb)) && (ptelb.depDe(this.variableGeneratrice))) { this.listeElementsAncetres.add(ptelb) }
    }
    this.listeElementsAncetres.add(this.pointATracer)
  }
}
CLieuParVariable.prototype.read = function (inps, list) {
  CLieuDeBase.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.variableGeneratrice = list.get(ind1, 'CVariableBornee')
  if (this.nVersion === 1) this.etablitListeElementsAncetres()
  else this.listeElementsAncetres.read(inps, list)
}
CLieuParVariable.prototype.write = function (oups, list) {
  CLieuDeBase.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.variableGeneratrice)
  oups.writeInt(ind1)
  this.listeElementsAncetres.write(oups, this.listeProprietaire)
}
