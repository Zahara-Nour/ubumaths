/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuObjetAncetre from '../objets/CLieuObjetAncetre'
import CElementGraphique from '../objets/CElementGraphique'
import NatObj from '../types/NatObj'
import { getStr } from '../kernel/kernel'
import LieuObjetDlg from '../dialogs/LieuObjetDlg'
import $ from 'jquery'

export default CLieuObjetAncetre

/**
 * Fonction utilisée dans la boîte de dialogue ProtocoleDlg et montrant ou cachant le g Element
 * représentant graphiquement l'objet.
 * Doit être redéfini pour les lieux d'objets qui contient eux-aussi de g elements
 * @param bshow Si true on montre le g Element sinon on le cache
 */

CLieuObjetAncetre.prototype.showgElt = function (bshow) {
  CElementGraphique.prototype.showgElt.call(this, bshow)
  const g = this.g
  for (let i = 0; i < g.childNodes.length; i++) {
    const node = g.childNodes[i]
    if (node.localName === 'g') $(node).attr('visibility', bshow ? 'visible' : 'hidden')
  }
}

CLieuObjetAncetre.prototype.depDe4Rec = function (p) {
  return CElementGraphique.prototype.depDe4Rec.call(this, p) ||
    this.elementAssocie.depDe4Rec(p) || this.nombreTraces.depDe4Rec(p)
}

CLieuObjetAncetre.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  // Pour les repères avec papier millimétré, les lieuxs d'objets servant à représenter le quadrillage
  // ne doivent pas être désignables à la souris. L'implémentation de prototype a pour nom "PapMilli"
  if ((!this.existe || (masquage && this.masque)) || ((this.impProto !== null) && (this.impProto.nomProto === 'PapMilli'))) return -1
  for (let i = 0; i < this.listeCopiesObjet.longueur(); i++) {
    const elg = this.listeCopiesObjet.get(i)
    if (elg.existe) {
      const d = elg.distancePoint(xp, yp, masquage, distmin)
      if ((d < distmin) && (d !== -1)) return d
    }
  }
  return -1
}

CLieuObjetAncetre.prototype.modifiableParMenu = function () {
  // Les lieux d'objets sont modifiables par l'outil de modification d'objet graphique même
  // s'ils sont des éléments finaux de construction et sont des affichages de valeur ou des affichages de texet ou de LaTeX.
  return !this.estElementFinal || this.estCapturableSouris()
}

CLieuObjetAncetre.prototype.modifDlg = function (app, callBack1, callBack2) {
  new LieuObjetDlg(app, this, true, callBack1, callBack2)
}

CLieuObjetAncetre.prototype.estCapturableSouris = function () {
  return this.elementAssocie.estDeNature(NatObj.NComOuLatexOuAffVal)
}

// Modifié par rapport à la version Java
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CLieuObjetAncetre.prototype.genereNom = function () {
  CLieuObjetAncetre.ind++
  return getStr('rlieuOb') + CLieuObjetAncetre.ind
}

CLieuObjetAncetre.prototype.setCloneTikz = function (ptel) {
  CElementGraphique.prototype.setCloneTikz.call(this, ptel)
  for (let i = 0; i < this.listeCopiesObjet.longueur(); i++) {
    const elb1 = this.listeCopiesObjet.get(i)
    const elb2 = ptel.listeCopiesObjet.get(i)
    elb1.setCloneTikz(elb2)
  }
}

CLieuObjetAncetre.prototype.positionneTikz = function (infoRandom, dimfen) {
  CElementGraphique.prototype.positionneTikz.call(this, infoRandom, dimfen)
  this.nombreTraces.positionne(infoRandom, dimfen)
  this.existe = this.existe && this.nombreTraces.existe
}

CLieuObjetAncetre.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ch = ''
  for (let i = 0; i < this.listeCopiesObjet.longueur(); i++) {
    const elg = this.listeCopiesObjet.get(i)
    if (elg.existe) {
      const st = elg.tikz(dimf, false, coefmult, bu)
      if (st !== '') {
        ch += st + '\n'
      }
    }
  }
  if (ch.endsWith('\n')) ch = ch.substring(0, ch.length - 1)
  return ch
}

CLieuObjetAncetre.prototype.addTikzColors = function (stb, vect) {
  stb = CElementGraphique.prototype.addTikzColors.call(this, stb, vect)
  // Il faut appeler addTikzColor pour chaque élément car ça peut par exemple
  // être un affichage de texte avec couleur de fond
  if (this.existe) stb = this.listeCopiesObjet.get(0).addTikzColors(stb, vect)
  return stb
}

CLieuObjetAncetre.prototype.estDefiniParObjDs = function (listeOb) {
  return this.elementAssocie.estDefPar(listeOb) &&
    this.nombreTraces.estDefiniParObjDs(listeOb)
}
