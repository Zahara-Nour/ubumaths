/*
 * Created by yvesb on 29/12/2016.
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

export default PtParCoordDlg

/**
 * Dialogue de choix des coordonnées d'un point dans un repère
 * @constructor
 * @param {MtgApp} app La mtgApp propriétaire
 * @param point Le point dont les coordonnées doivent être changées
 * @param modification boolean : true si l'angle de la rotation est un angle déjà existant à modifier
 * @param callBackOK Fonction de callBack à appeler quand l'utilisateur clique sur OK
 * Dans le cas où sbutton vaut "Implem" ou ", cette fonction prend un paramètre proto qui est le prototype de la figure sélectionné
 * @param callBackCancel Fonction de callBack à appeler si l'utilisateur annule

 */
function PtParCoordDlg (app, point, modification, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'ptParCoordDlg', callBackOK, callBackCancel)
  const self = this
  this.point = point
  this.modification = modification
  const list = app.listePr
  // Un CValeur pour stocker la valeur choisie pour l'abscisse avant vérification
  this.valeurAbs = new CValeur(list, 0)
  // Un CValeur pour stocker la valeur choisie pour l'ordonnée avant vérification
  this.valeurOrd = new CValeur(list, 0)
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
  $(label).html(getStr('Abscisse') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputAbs = getMtgInput({
  })
  this.inputAbs.onkeyup = function (ev) {
    this.demarquePourErreur()
    if ($(self.inputOrd).val().length !== 0) {
      if (ev.keyCode === 13) {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }

  td.appendChild(this.inputAbs)
  const indmax = modification ? list.indexOf(point) - 1 : list.longueur() - 1
  const paneBoutonsValFoncAbs = new PaneBoutonsValFonc(this.app, this, this.inputAbs, true, indmax)
  tab.appendChild(paneBoutonsValFoncAbs)
  this.editorAbs = new EditeurvaleurReelle(app, this.inputAbs, indmax, this.valeurAbs, null)

  tr = ce('tr')
  tab.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Ordonnee') + ' : ')
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputOrd = getMtgInput({
  })
  this.inputOrd.onkeyup = function (ev) {
    this.demarquePourErreur()
    if ($(self.inputAbs).val().length !== 0) {
      if (ev.keyCode === 13) {
        $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
        self.OK()
      }
    }
  }

  td.appendChild(this.inputOrd)
  const paneBoutonsValFoncOrd = new PaneBoutonsValFonc(this.app, this, this.inputOrd, true, indmax)
  tab.appendChild(paneBoutonsValFoncOrd)
  this.editorOrd = new EditeurvaleurReelle(app, this.inputOrd, indmax, this.valeurOrd, null)
  if (modification) {
    $(this.inputAbs).val(replaceSepDecVirg(app, point.abs.calcul))
    $(this.inputOrd).val(replaceSepDecVirg(app, point.ord.calcul))
  }
  // On rajoute à droite un panneau pour le choix du repère
  td = ce('td')
  trprincipal.appendChild(td)
  this.paneListeReperes = new PaneListeReperes(this.app, indmax)
  td.appendChild(this.paneListeReperes.getTab())
  if (modification) this.paneListeReperes.selectRep(point.rep)
  this.create('PtParCoord', 550)
}

PtParCoordDlg.prototype = new MtgDlg()

PtParCoordDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputAbs)
}

PtParCoordDlg.prototype.OK = function () {
  // if (this.app.lastDlgId() !== this.id) return;
  // On regarde si l'entrée est correcte sur le plan syntaxique
  if (this.editorAbs.validate($(this.inputAbs).val())) {
    if (this.editorOrd.validate($(this.inputOrd).val())) {
      this.point.abs = this.valeurAbs
      this.point.ord = this.valeurOrd
      this.point.rep = this.paneListeReperes.getSelectedRep()
      // this.app.outilPtParCoord.actionApresDlg();
      if (this.modification) this.app.gestionnaire.enregistreFigureEnCours('ModifObj')
      if (this.callBackOK !== null) this.callBackOK()
      this.destroy()
    } else $(this.inputOrd).focus()
  } else $(this.inputAbs).focus()
}
