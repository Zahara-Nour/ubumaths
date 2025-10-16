/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import MacroDlg from './MacroDlg'
import PaneChoixVar from './PaneChoixVar'
import CValeur from '../objets/CValeur'
import $ from 'jquery'

export default MacIncDecVarDlg

/**
 * Boîte de dialogue servant à créer ou modifier une macro d'incrémentation ou décrémentation d'une variable
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param {boolean} binc true s'il s'agit d'une macro d'incrémentation de variable, false sinon
 * @param {CMacroAffectationValeurVariable} mac la macro
 * @param {boolean} modification true si on modifie une macro déjà existante
 * @param callBackOK Fonction de callBack à appeler une fois qu'on a cliqué sur OK
 * @param callBackCancel Fonction de callBack à appeler une fois qu'on a cliqué sur Cancel
 */
function MacIncDecVarDlg (app, binc, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  // Un CValeur pour stocker la valeur choisie avant vérification
  const list = app.listePr
  this.valeur = new CValeur(list, 1)
  const tabPrincipal = ce('table', {
    cellspacing: 2
  })
  this.appendChild(tabPrincipal)
  // Ajout de l'éditeur d'intitulé /////////////////////////////////
  this.addEditInt(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Ajout du pane d'information sur la macro //////////////////////
  this.addPaneInfo(tabPrincipal)
  /// ///////////////////////////////////////////////////////////////
  // Au centre un panneau avec à gauche l'éditeur pour la valeur  //
  // à affecter à la variable et à droite une liste des variables //
  // présentes                                                    //
  /// ///////////////////////////////////////////////////////////////
  const tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.paneChoixVar = new PaneChoixVar(app, true)
  this.paneChoixVar.selectVar(this.mac.variableAssociee)
  tr.appendChild(this.paneChoixVar.container)
  /// ////////////////////////////////////////////////////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create(binc ? 'MacIncVar' : 'MacDecVar', 500)
}

MacIncDecVarDlg.prototype = new MacroDlg()

MacIncDecVarDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  if ($('#inputint').val() !== '') {
    this.mac.variableAssociee = this.paneChoixVar.getVar()
    this.saveBasic()
    this.destroy()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}
