/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTranslation from '../objets/CTranslation'
import CTransformation from '../objets/CTransformation'
import CVecteur from '../objets/CVecteur'
import StyleTrait from '../types/StyleTrait'
import StyleFleche from '../types/StyleFleche'
import Color from '../types/Color'
import { getStr } from '../kernel/kernel'
export default CTranslation

CTranslation.prototype.complementInfo = function () {
  return getStr('Trans') + ' ' + 'T(' + this.or.getName() + this.ex.getName() + ')'
}

CTranslation.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CTransformation.prototype.depDe4Rec.call(this, p) ||
    this.or.depDe4Rec(p) || this.ex.depDe4Rec(p))
}

/**
 * Fonction ajoutant à la liste list des éléments montrant quels sont les objets avec lesquels l'objet a été construit
 * Pour les translations définies par origine et extrémité on rajoute en particulier un vecteur clignotant
 * @param {CListeObjets} list La liste clignotante à laquelle ajouter les objets antécédents
 * @param {MtgApp} app L'application propriétaire. Ce paramètre ne sert que pour les translations
 */
CTranslation.prototype.ajouteAntecedents = function (list, app) {
  list.add(this.or)
  list.add(this.ex)
  // On crée en plus un vecteur clignotant pour visualiser la translation
  // Important : Le premier paramètre correspondant à la liste propriétaire est null
  // de façon à ce que OutilProtocole.annuleClignotement retire l'implémentation graphique
  // du vecteur rajouté
  const vecteurClignotant = new CVecteur(list, null, false, Color.blue, false,
    new StyleTrait(list, StyleTrait.styleTraitContinu, 2),
    this.or, this.ex, StyleFleche.FlecheLonguePleine)
  // On donne à ce vecteur un membre isTransit qui sera utilisé dans l'outil OutilProtocole dans la fonction
  // annuleclignotement
  vecteurClignotant.isTransit = true
  vecteurClignotant.positionne()
  vecteurClignotant.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  list.add(vecteurClignotant)
}

CTranslation.prototype.estDefiniParObjDs = function (listeOb) {
  return this.or.estDefPar(listeOb) &&
  this.ex.estDefPar(listeOb)
}
