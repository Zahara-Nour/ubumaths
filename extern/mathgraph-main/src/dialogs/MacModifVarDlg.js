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

import AvertDlg from './AvertDlg'

export default MacModifVarDlg

/**
 * Boîte de dialogue servant à créer ou modifier une macro de modification de variable
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param {CMacroAffectationValeurVariable} mac la macro
 * @param {boolean} modification true si on modifie une macro déjà existante
 * @param callBackOK Fonction de callBack à appeler une fois qu'on a cliqué sur OK
 * @param callBackCancel Fonction de callBack à appeler une fois qu'on a cliqué sur Cancel
 */
function MacModifVarDlg (app, mac, modification, callBackOK, callBackCancel) {
  MacroDlg.call(this, app, mac, modification, callBackOK, callBackCancel)
  let i, tr, td, tdg, label, input, paneBoutonsValFonc
  const list = app.listePr
  const tab = ['Act', 'Pas', 'Min', 'Max']
  /// //////////////////////////////////////////////////////////////////////
  // Quuatre CValeur pour stocker les valeur choisies avant vérification //
  /// //////////////////////////////////////////////////////////////////////
  this.valMin = new CValeur(list, 0)
  this.valMax = new CValeur(list, 0)
  this.valPas = new CValeur(list, 0)
  this.valAct = new CValeur(list, 0)
  /// //////////////////////////////////////////////////////////////////////
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
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  this.paneChoixVar = new PaneChoixVar(app, true)
  tr.appendChild(this.paneChoixVar.container)
  /// ///////////////////////////////////////////////////////////////////////////////////////////
  // Un tableau au centre de deux colonnes pour le choix des valeurs mini, actuelle et du pas //
  /// ///////////////////////////////////////////////////////////////////////////////////////////
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneCentre = ce('table', {
    cellspacing: 2
  })
  tr.appendChild(paneCentre)
  const indmax = modification ? list.indexOf(mac) - 1 : list.longueur() - 1
  for (i = 0; i < 4; i++) {
    if ((i === 0) || (i === 2)) {
      tdg = ce('td')
      paneCentre.appendChild(tdg)
    }
    tr = ce('tr')
    tdg.appendChild(tr)
    td = ce('td')
    tr.appendChild(td)
    label = ce('label')
    $(label).html(getStr('Val' + tab[i]))
    td.appendChild(label)
    td = ce('td')
    tr.appendChild(td)
    input = getMtgInput({
      size: 14
    })
    td.appendChild(input)
    this['input' + tab[i]] = input
    paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, input, true, indmax)
    tdg.appendChild(paneBoutonsValFonc)
  }

  /// ////////////////////////////////////////////////////////////////////////////////////////////////////
  // Création de quatre éditeurs pour vérifier la validité des entrées
  for (i = 0; i < 4; i++) {
    this['editor' + tab[i]] = new EditeurvaleurReelle(app, this['input' + tab[i]],
      indmax, this['val' + tab[i]], null)
  }
  if (modification) {
    this.paneChoixVar.selectVar(this.mac.variableAssociee)
    for (i = 0; i < 4; i++) {
      $(this['input' + tab[i]]).val(replaceSepDecVirg(app, mac['val' + tab[i]].calcul))
    }
  }
  /// ///////////////////////////////////////////////////////
  // Ajout en bas du panneau de choix de mode d'affichage //
  /// ///////////////////////////////////////////////////////
  this.addPaneBas(tabPrincipal)
  this.create('MacModifVar', 600)
}

MacModifVarDlg.prototype = new MacroDlg()

MacModifVarDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  const self = this
  let i
  if ($('#inputint').val() !== '') {
    const tab = ['Act', 'Pas', 'Min', 'Max']
    for (i = 0; i < 4; i++) {
      if (!this['editor' + tab[i]].validate($(this['input' + tab[i]]).val())) return
      this['val' + tab[i]].positionne()
    }
    if ((this.valMin.valeur >= this.valMax.valeur) || (this.valPas.valeur > (this.valMax.valeur - this.valMin.valeur)) ||
        (this.valAct.valeur < this.valMin.valeur) || (this.valAct.valeur > this.valMax.valeur)) {
      new AvertDlg(this.app, 'Incorrect', function () {
        self.inputMin.marquePourErreur()
        self.inputMin.focus()
      })
      return
    }
    this.saveBasic()
    this.mac.valeurAssociee = this.valeur
    this.mac.variableAssociee = this.paneChoixVar.getVar()
    for (i = 0; i < 4; i++) {
      this.mac['val' + tab[i]] = this['val' + tab[i]]
    }
    this.destroy()
    if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
    if (this.callBackOK !== null) this.callBackOK()
  } else this.avertIncorrect()
}
