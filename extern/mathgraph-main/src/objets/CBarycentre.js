/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CPt from './CPt'
import CNoeudPondere from './CNoeudPondere'

export default CBarycentre

/**
 * Classe représentant un barycentre de n points pondérés.
 * @constructor
 * @extends CPt
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Decalage horizontal du nom
 * @param {number} decY  Decalage vertical du nom
 * @param {boolean} masque  true si l'objet est masque
 * @param {string} nom  Le nom eventuel de l'objet
 * @param {number} tailleNom  Indice de la taille du nom (voir Fonte)
 * @param {MotifPoint} motif  Le motif du point
 * @param {boolean} marquePourTrace  true si le point est marqué pour la trace
 * @param {CNoeudPondere[]} col  Array de CNoeudPondere contenant les points et leurs coefficients.
 * @returns {CBarycentre}
 */
function CBarycentre (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, col) {
  if (arguments.length === 1) {
    CPt.call(this, listeProprietaire)
    this.col = []
  } else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.col = col
  }
}
CBarycentre.prototype = new CPt()
CBarycentre.prototype.constructor = CBarycentre
CBarycentre.prototype.superClass = 'CPt'
CBarycentre.prototype.className = 'CBarycentre'

CBarycentre.prototype.getClone = function (listeSource, listeCible) {
  const colClone = []
  for (let i = 0; i < this.col.length; i++) {
    const noeud = this.col[i]
    const noeudClone = noeud.getClone(listeSource, listeCible)
    colClone.push(noeudClone)
  }
  const ind1 = listeSource.indexOf(this.impProto)
  return new CBarycentre(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, colClone)
}
CBarycentre.prototype.ajouteAntecedents = function (liste) {
  // Pour chacun des points pondérés, on créé un commentaire associé qui affichera le coefficient
  // Tous ces commentaires seront rajoutés à la liste des objets clignotants
  const nbPoints = this.col.length
  for (let i = 0; i < nbPoints; i++) {
    const noeud = this.col[i]
    const point = noeud.pointAssocie
    liste.add(point)
    /** A revoir JavaScript
    var com = new CCommentaire(listeProprietaire, null, false, Color.blue, 0, 0, 0, 10, false, point, 2,
        mtg32.StyleEncadrement.Simple, true,  new Color(230,230,246), noeud.poids.chaineInfo(),
        CAffLiePt.alignHorCent, CAffLiePt.alignVerTop);
    com.positionne(false, frame.cadreActif().dimf);
    liste.add(com);
    */
  }
}
CBarycentre.prototype.initialisePourDependance = function () {
  CPt.prototype.initialisePourDependance.call(this)
  for (let i = 0; i < this.col.length; i++) {
    const noeud = this.col[i]
    noeud.initialisePourDependance()
  }
}

CBarycentre.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  let resultat = false
  for (let i = 0; (i < this.col.length) && !resultat; i++) {
    const noeud = this.col[i]
    resultat = resultat || noeud.pointAssocie.depDe(p) || noeud.poids.depDe(p)
  }
  return this.memDep(resultat || CPt.prototype.depDe.call(this, p))
}
CBarycentre.prototype.dependDePourBoucle = function (p) {
  let resultat = false
  for (let i = 0; (i < this.col.length) && !resultat; i++) {
    const noeud = this.col[i]
    resultat = resultat || noeud.pointAssocie.dependDePourBoucle(p) || noeud.poids.dependDePourBoucle(p)
  }
  return ((p === this) || resultat)
}
CBarycentre.prototype.positionne = function (infoRandom, dimfen) {
  let mt, xg, yg

  this.existe = true
  mt = 0
  xg = 0
  yg = 0
  for (let i = 0; (i < this.col.length); i++) {
    const noeud = this.col[i]
    noeud.poids.positionne(infoRandom, dimfen)
    this.existe = this.existe && (noeud.pointAssocie.existe) && (noeud.poids.existe)
    if (!this.existe) return
    const p = noeud.poids.rendValeur()
    mt = mt + p
    xg = xg + p * noeud.pointAssocie.x
    yg = yg + p * noeud.pointAssocie.y
  }
  if (mt === 0) this.existe = false
  else {
    xg = xg / mt
    yg = yg / mt
    CPt.prototype.placeEn.call(this, xg, yg)
    CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajouté verion 4.6.4
  }
}
CBarycentre.prototype.confonduAvec = function (p) {
  let i, j, nbElementsCommuns, no1, no2
  if (p.className === this.className) {
    if (this.col.length !== p.col.length) return false
    else {
      nbElementsCommuns = 0
      // On crée une copie de col
      const colClone = []
      for (i = 0; i < this.col.length; i++) {
        const noeud = this.col[i]
        const noeudClone = noeud.getClone(this.listeProprietaire, this.listeProprietaire)
        colClone.push(noeudClone)
      }
      for (i = 0; i < p.col.length; i++) {
        no1 = p.col[i]
        for (j = 0; j < colClone.length; j++) {
          no2 = colClone[j]
          if ((no2.pointAssocie === no1.pointAssocie) && (no2.poids.confonduAvec(no1.poids))) {
            nbElementsCommuns++
            colClone.splice(j, 1)
          }
        }
      }
      return nbElementsCommuns === this.col.length
    }
  } else return false
}
CBarycentre.prototype.getNature = function () {
  return NatObj.NBarycentre
}
CBarycentre.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  for (let i = 0; i < this.col.length; i++) {
    this.col[i].remplacePoint(ancienPoint, nouveauPoint)
  }
}
CBarycentre.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  // On lit d'abord le nombre d'objets de la liste
  const nombreObjets = inps.readInt()
  for (let i = 0; i < nombreObjets; i++) {
    const noeud = new CNoeudPondere()
    noeud.read(inps, list)
    this.col.push(noeud)
  }
}
CBarycentre.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const nombreObjets = this.col.length
  oups.writeInt(nombreObjets)
  for (let i = 0; i < this.col.length; i++) {
    const noeud = this.col[i]
    noeud.write(oups, list)
  }
}
