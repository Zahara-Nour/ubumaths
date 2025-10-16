/*
 * Created by yvesb on 15/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatObj from '../types/NatObj'
import ConfirmDlg from '../dialogs/ConfirmDlg'
import Outil from '../outils/Outil'
export default OutilSup

/**
 * Outil servant à créer l'image d'un objet dans une symétrie axiale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilSup (app) {
  Outil.call(this, app, 'Sup', 32811, true, true, true)
}

OutilSup.prototype = new Outil()

OutilSup.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.obj = null
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtObj
  app.indication('indSup')
  if (app.estExercice) {
    const list = app.listePr
    for (let i = 0; i < app.nbObjInit; i++) {
      const el = list.get(i)
      if (el.estDeNature(NatObj.NTtObj)) this.excluDeDesignation(el)
    }
  }
  app.outilPointageCre.reset()
}

OutilSup.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  const self = this
  this.eltASupprimer = elg.antecedentDirect()
  this.obj = elg
  this.ajouteClignotementDe(elg)
  this.resetClignotement()
  let btransf = false // Sera true si l'élément effectif à supprimer est une transformation
  if (this.eltASupprimer.estDeNature(NatObj.NTransformation)) {
    // Si l'objet antécédent direct est une transformation, on regarde s'il y a d'autres images par
    // cette transformation à détruire. Si oui, on ne détruit pas la transformation.
    // Sinon on détruit la transformation et ses dépendants.
    if (list.nombreImagesParTransformationNonDepDe(this.eltASupprimer, elg) > 0) this.eltASupprimer = elg
    else btransf = true
  }
  if (this.eltASupprimer.estDeNature(NatObj.NBipoint)) {
    // CBipoint bip = (CBipoint) eltASupprimer;
    const ptlb1 = this.eltASupprimer.pointReelDansListe(1)
    // if (ptlb1 != elg) ajouteClignotementDe(ptlb1); // Modifié version 4.8
    // Dans le cas d'un élément final de construction il se peut qu'un seul des deux points normalement
    // associés au bipoint ait été créé
    if ((ptlb1 !== null) && (ptlb1 !== elg)) this.ajouteClignotementDe(ptlb1)
    const ptlb2 = this.eltASupprimer.pointReelDansListe(2)
    // if (ptlb2 != elg) ajouteClignotementDe(ptlb2); // Idem modifié version 4.8
    if ((ptlb2 !== null) && (ptlb2 !== elg)) this.ajouteClignotementDe(ptlb2)
    if ((ptlb1 !== null) && (ptlb2 !== null)) { // Ajout version 4.8
      new ConfirmDlg(app, 'ch38', function () { self.callBack(4) }, function () { self.deselect(); self.select() })
    } else this.creeObjet()
  } else this.callBack(btransf ? 3 : 2)
}

// Fonction de callBack appelée après demande de confirmation de suppression d'intersection de 2 objets
// ou directement
OutilSup.prototype.callBack = function (nbtest) {
  const app = this.app
  const list = app.listePr
  const self = this
  if (list.nombreDependants(this.eltASupprimer) >= nbtest) {
    // ajouteClignotementDe(elg);
    // resetClignotement();
    new ConfirmDlg(app, 'ch37', function () { self.creeObjet() }, function () { self.deselect(); self.select() })
  } else this.creeObjet()
}

OutilSup.prototype.creeObjet = function () {
  const app = this.app
  this.annuleClignotement()
  app.detruitDependants(this.eltASupprimer)
  this.saveFig()
  app.reInitConst()
  // this.app.updateToolsToolBar();
  return true
}

OutilSup.prototype.isReadyForTouchEnd = function () {
  return false
}
