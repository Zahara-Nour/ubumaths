/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import { getMtgInput } from './dom'
import MacroDlg from './MacroDlg'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import PaneChoixVar from './PaneChoixVar'
import EditeurvaleurReelle from './EditeurValeurReelle'
import CValeur from '../objets/CValeur'
import $ from 'jquery'

export default MacAffValVarDlg

/**
 * Boîte de dialogue servant à créer ou modifier une macro affectant une valeur à une variable
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param {CMacroAffectationValeurVariable} mac la macro
 * @param {boolean} modification true si on modifie une macro déjà existante
 * @param callBackOK Fonction de callBack à appeler une fois qu'on a cliqué sur OK
 * @param callBackCancel Fonction de callBack à appeler une fois qu'on a cliqué sur Cancel
 */
function MacAffValVarDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie avant vérification
  this.valeur = new CValeur(list, 0)
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
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneCentreHaut = ce('table', {
    cellspacing: 2
  })
  tr.appendChild(paneCentreHaut)
  tr = ce('tr')
  paneCentreHaut.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('Valeur') + ':')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const input = getMtgInput({
    id: 'mtginput'
  })
  td.appendChild(input)
  const indmax = modification ? list.indexOf(mac) - 1 : list.longueur() - 1
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
  paneCentreHaut.appendChild(paneBoutonsValFonc)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneCentreBas = ce('table', {
    cellspacing: 2
  })
  tr.appendChild(paneCentreBas)
  tr = ce('tr')
  paneCentreBas.appendChild(tr)
  this.paneChoixVar = new PaneChoixVar(app, true, 'AffectA')
  tr.appendChild(this.paneChoixVar.container)
  /// ////////////////////////////////////////////////////////////////////////////////////////////////////
  this.editor = new EditeurvaleurReelle(app, input, indmax, this.valeur, null)
  if (modification) {
    $(input).val(replaceSepDecVirg(app, mac.valeurAssociee.calcul))
    this.paneChoixVar.selectVar(this.mac.variableAssociee)
  }
  this.addPaneBas(tabPrincipal)
  this.create('MacAffValVar', 550)
}

MacAffValVarDlg.prototype = new MacroDlg()

MacAffValVarDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  if ($('#inputint').val() !== '') {
    if (this.editor.validate($('#mtginput').val())) {
      this.saveBasic()
      this.mac.valeurAssociee = this.valeur
      this.mac.variableAssociee = this.paneChoixVar.getVar()
      this.destroy()
      if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
      if (this.callBackOK !== null) this.callBackOK()
    }
  } else this.avertIncorrect()
}
