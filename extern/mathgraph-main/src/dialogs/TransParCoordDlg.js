/*
 * Created by yvesb on 10/02/2017.
 */
import { ce } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import CValeur from '../objets/CValeur'
import EditeurvaleurReelle from './EditeurValeurReelle'
import $ from 'jquery'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import PaneListeReperes from './PaneListeReperes'
import { getMtgInput } from './dom'

export default TransParCoordDlg

/**
 * Dialogue de choix des coordonnées d'un translation par coordonnées
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param trans La translation dont les coordonnées doivent être changées
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 */
function TransParCoordDlg (app, trans, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'transParCoordDlg', callBackOK, callBackCancel)
  const self = this
  this.trans = trans
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie pour la première coordonnée avant vérification
  this.valeurx = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour la deuxième coordonnée avant vérification
  this.valeury = new CValeur(list, 0)
  const tabprincipal = ce('table')
  this.appendChild(tabprincipal)
  const trprincipal = ce('tr')
  tabprincipal.appendChild(trprincipal)
  let td = ce('td')
  trprincipal.appendChild(td)

  const tab = ce('table')
  // this.appendChild(tab);
  td.appendChild(tab)
  let tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
  $(label).html(getStr('Valeura') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputX = getMtgInput()
  td.appendChild(this.inputX)
  const indmax = modification ? list.indexOf(trans) - 1 : list.longueur() - 1
  const paneBoutonsValFoncAbs = new PaneBoutonsValFonc(this.app, this, this.inputX, true, indmax)
  tab.appendChild(paneBoutonsValFoncAbs)
  this.editorX = new EditeurvaleurReelle(app, this.inputX, indmax, this.valeurx, null)

  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Valeurb') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputY = getMtgInput()
  td.appendChild(this.inputY)
  this.inputY.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const paneBoutonsValFoncOrd = new PaneBoutonsValFonc(this.app, this, this.inputY, true, indmax)
  tab.appendChild(paneBoutonsValFoncOrd)
  this.editorY = new EditeurvaleurReelle(app, this.inputY, indmax, this.valeury, null)
  if (modification) {
    $(this.inputX).val(replaceSepDecVirg(app, trans.x.calcul))
    $(this.inputY).val(replaceSepDecVirg(app, trans.y.calcul))
  }
  // On rajoute à droite un panneau pour le choix du repère
  td = ce('td')
  trprincipal.appendChild(td)
  this.paneListeReperes = new PaneListeReperes(this.app, indmax)
  td.appendChild(this.paneListeReperes.getTab())
  if (modification) this.paneListeReperes.selectRep(trans.rep)
  this.create('TransParCoord', 550)
}

TransParCoordDlg.prototype = new MtgDlg()

TransParCoordDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputX)
}

// Pour cet outil il faut redéfinir onCancel car on actibe l'outil de capture si abandon
TransParCoordDlg.prototype.onCancel = function () {
  if (this.callBackCancel !== null) this.callBackCancel()
  this.destroy()
  this.app.activeOutilCapt()
}

TransParCoordDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (this.editorX.validate($(this.inputX).val())) {
    if (this.editorY.validate($(this.inputY).val())) {
      this.trans.x = this.valeurx
      this.trans.y = this.valeury
      this.trans.rep = this.paneListeReperes.getSelectedRep()
      if (this.callBackOK !== null) this.callBackOK()
      this.destroy()
    } else $(this.inputY).focus()
  } else $(this.inputX).focus()
}
