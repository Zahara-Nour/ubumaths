/*
 * Created by yvesb on 15/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Nat from '../types/Nat'
import Outil from './Outil'
import addQueue from 'src/kernel/addQueue'
export default OutilCapt
/**
 * Outil servant à capturer un point, un affichage, une marque d'angle ...
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilCapt (app) {
  Outil.call(this, app, 'Capt', 33023, false, true, true)
}
OutilCapt.prototype = new Outil()

OutilCapt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const listeExclusion = this.app.listeExclusion
  const doc = this.app.doc
  let nature = NatObj.NPointMobile
  // Version 6.4 : Si on est en mode exercice, on ne permet de déplacer que les points mobiles
  if (!app.estExercice) {
    if (!doc.marquesAnglesFigees) nature = Nat.or(nature, NatObj.NMarqueAngle)
    if (!doc.affichagesFiges) nature = Nat.or(nature, NatObj.NAffLieAPoint, NatObj.NLieuObjet)
  }
  // var test = Nat.and(NatObj.NAffLieAPoint, NatObj.NCommentaire);
  app.outilPointageCapture.aDesigner = nature
  // On ajoute à la liste d'exclusion de désignation tous les points mobiles punaisés
  for (const elb of doc.listePr.col) {
    // Ajout version 6.2.0 pour ne pas pouvoir bouger un affichage de longueur orienté.
    // Depuis la version 8.1 (n° de version) sert aussi à ne pas pouvoir capturer un affichage
    // (texte, latex, image, affichage de valeur, macro) qui a été punaisé ou une marque d'angle
    if (elb.fixed) listeExclusion.add(elb)
    else {
      // Si l'objet est un lieu d'objet d'un affichage et si l'affichage a été punaisé, on interdit
      // de faire glisser le lieu
      if (elb.estDeNature(NatObj.NLieuObjet)) {
        const eltass = elb.elementAssocie
        if (eltass.estDeNature(NatObj.NAffLieAPoint) && eltass.fixed) listeExclusion.add(elb)
      }
    }
  }
  app.outilPointageActif = this.app.outilPointageCapture
  app.outilPointageActif.reset()
  // Version 6.4.7 : On utilise la pile de MathJax suite à rapport Bugsnag (on tentait d'afficher l'indication trop tôt)
  addQueue(() => app.indication('indCapt'))
}

OutilCapt.prototype.isWorking = function () {
  const app = this.app
  const outilPoint = app.outilPointageCapture
  return app.elementCapture !== null || app.isTranslating || outilPoint.cadre_Ver_Capt || outilPoint.cadre_Hor_Capt
}
