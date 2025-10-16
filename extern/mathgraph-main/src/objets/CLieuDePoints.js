/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import InfoLieu from '../types/InfoLieu'
import { MAX_VALUE, testToile } from '../kernel/kernel'
import CLieuDeBase from './CLieuDeBase'
export default CLieuDePoints
// A noter qu'il n'est pas nécessaire de redéfinir depDe pour cet objet car l'objet à tracer dépend
// forcément du point lié générateur
/**
 * Classe représentant un lieu de points généré par les positions d'un point lié.
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
 * @param {CPointLie} pointLieGenerateur  Le point dont les positions génèrent le lieu.
 * @returns {CLieuDePoints}
 */
function CLieuDePoints (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, pointATracer, infoLieu, pointLieGenerateur) {
  if (arguments.length === 1) CLieuDeBase.call(this, listeProprietaire)
  else {
    CLieuDeBase.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style, pointATracer, infoLieu)
    this.pointLieGenerateur = pointLieGenerateur
  }
}
CLieuDePoints.prototype = new CLieuDeBase()
CLieuDePoints.prototype.constructor = CLieuDePoints
CLieuDePoints.prototype.superClass = 'CLieuDeBase'
CLieuDePoints.prototype.className = 'CLieuDePoints'

CLieuDePoints.prototype.numeroVersion = function () {
  return 2
}

CLieuDePoints.prototype.getClone = function (listeSource, listeCible) {
  const infoLieuClone = new InfoLieu(this.infoLieu)

  const ind1 = listeSource.indexOf(this.pointATracer)
  const ind2 = listeSource.indexOf(this.pointLieGenerateur)
  const ind3 = listeSource.indexOf(this.impProto)
  const ptelb = new CLieuDePoints(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CPt'),
    infoLieuClone, listeCible.get(ind2, 'CPointLie'))
  if (listeCible.className !== 'CPrototype') { ptelb.listeElementsAncetres.setImage(this.listeElementsAncetres, this.listeProprietaire, ptelb.listeProprietaire) }
  return ptelb
}
CLieuDePoints.prototype.metAJour = function () {
  CLieuDeBase.prototype.metAJour.call(this)
  // Bug corrigé version 4.0 : il faut mettre à jour la liste d'éléments ancêtres car metAJour est appelé quand
  // on modifie un obejt dont dépend cet objet
  // if (nVersion == 1) etablitListeElementsAncetres();
  this.etablitListeElementsAncetres()
}
CLieuDePoints.prototype.positionne = function (infoRandom, dimfen) {
  let abscisseMini, abscisseMaxi, abscisse, pas, abscisseFinale, nbValeurs, ligneEnCours,
    indiceLigneEnCours, i, auMoinsUneLigne, j, ligneTrouvee, indicePointRajoute
  if (!this.pointLieGenerateur.existe) {
    this.existe = false
    return
  }
  abscisseMini = this.pointLieGenerateur.abscisseMinimale()
  abscisseMaxi = this.pointLieGenerateur.abscisseMaximale()
  if (abscisseMini === abscisseMaxi) {
    this.existe = false
    return
  } else {
    // On ordonne l'abscisse minimale et maximale
    if (abscisseMini > abscisseMaxi) {
      const w = abscisseMini
      abscisseMini = abscisseMaxi
      abscisseMaxi = w
    }
  }
  const abscisseInitiale = this.pointLieGenerateur.abscisse
  // Modification pour la version 1.9.5
  if (this.pointLieGenerateur.lieALigneFermee()) {
    nbValeurs = this.infoLieu.nombreDePoints
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi - pas
  } else {
    nbValeurs = this.infoLieu.nombreDePoints - 1
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi
  }
  abscisse = abscisseMini
  ligneEnCours = false
  indiceLigneEnCours = -1
  const nb = this.infoLieu.nombreDePoints - 1
  for (i = 0; i < this.infoLieu.nombreDePoints; i++) {
    // Modifié version 3.9.1 pour éviter des erreurs d'arrondi
    // Bug corrigé version 4.0
    abscisse = (i === 0) ? abscisseMini : ((i < nb) ? abscisse + pas : abscisseFinale)
    this.pointLieGenerateur.donneAbscisse(abscisse)
    this.listeElementsAncetres.positionne(infoRandom, dimfen)
    if (!this.pointATracer.existe) {
      this.absPoints[i] = MAX_VALUE
      this.ordPoints[i] = MAX_VALUE
      if (ligneEnCours) {
        this.infoLignes[indiceLigneEnCours].nombrePoints = i - this.infoLignes[indiceLigneEnCours].indicePremierPoint
        ligneEnCours = false
      }
    } else {
      if (!(testToile(this.pointATracer.x, this.pointATracer.y))) {
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
  } // for

  // On  remet le point ancêtre à sa position initiale
  this.pointLieGenerateur.donneAbscisse(abscisseInitiale)
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
  // Si le lieu est déclaré comme fermé, il n'existera que s'il
  // n'est formé que d'une seule ligne avec au moins deux points
  if (this.infoLieu.fermeOuNon) {
    indicePointRajoute = this.infoLignes[indiceLigneEnCours].indicePremierPoint +
      this.infoLignes[indiceLigneEnCours].nombrePoints

    this.absPoints[indicePointRajoute] =
      this.absPoints[this.infoLignes[this.indicePremiereLigne].indicePremierPoint]
    this.ordPoints[indicePointRajoute] =
      this.ordPoints[this.infoLignes[this.indicePremiereLigne].indicePremierPoint]
    // infoLignes[indicePremiereLigne].nombrePoints++;
    this.infoLignes[indiceLigneEnCours].nombrePoints++
  }
  this.existe = true
}
CLieuDePoints.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.pointATracer === p.pointATracer) && (this.pointLieGenerateur === p.pointLieGenerateur)
  } else return false
}

CLieuDePoints.prototype.dependDePourCapture = function (p) {
  // Un lieu de points n'a pas à être redessiné si on bouge le point
  // lié qui l'a engendré}
  return ((p === this) || (this.pointATracer.depDe(p) && (p !== this.pointLieGenerateur)))
}
/**
 * Fonction mettant dans this.listeElementsAncetres la liste de tous les objets de la liste
 * propriétaire qui doivent être calculés lorsque le lieu est calculé.
 * @returns {void}
 */
CLieuDePoints.prototype.etablitListeElementsAncetres = function () {
  if (this.listeProprietaire.className !== 'CPrototype') {
    this.listeElementsAncetres.retireTout()
    const indicePointATracer = this.listeProprietaire.indexOf(this.pointATracer)
    const indicePointLieGenerateur = this.listeProprietaire.indexOf(this.pointLieGenerateur)
    this.listeElementsAncetres.add(this.pointLieGenerateur)
    for (let i = indicePointLieGenerateur + 1; i < indicePointATracer; i++) {
      const ptelb = this.listeProprietaire.get(i)
      if ((this.pointATracer.depDe(ptelb)) && (ptelb.depDe(this.pointLieGenerateur))) { this.listeElementsAncetres.add(ptelb) }
    }
    this.listeElementsAncetres.add(this.pointATracer)
  }
}
CLieuDePoints.prototype.read = function (inps, list) {
  CLieuDeBase.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.pointLieGenerateur = list.get(ind1, 'CPointLie')
  if (this.nVersion === 1) this.etablitListeElementsAncetres()
  else this.listeElementsAncetres.read(inps, list)
}
CLieuDePoints.prototype.write = function (oups, list) {
  CLieuDeBase.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.pointLieGenerateur)
  oups.writeInt(ind1)
  this.listeElementsAncetres.write(oups, this.listeProprietaire)
}
