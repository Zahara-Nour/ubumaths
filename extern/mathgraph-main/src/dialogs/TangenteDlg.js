/*
 * Created by yvesb on 13/04/2017.
 */
/*
 * Created by yvesb on 01/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import CValeur from '../objets/CValeur'
import NatCal from '../types/NatCal'
import CImplementationProto from '../objets/CImplementationProto'
import PaneListeReperes from './PaneListeReperes'
import PaneBoutonsValFonc from './PaneBoutonsValFonc'
import $ from 'jquery'
import 'jquery-textrange'
import EditeurValeurReelle from './EditeurValeurReelle'
import EditeurNomCalcul from '../dialogs/EditeurNomCalcul'
import { getMtgInput } from './dom'
export default TangenteDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function TangenteDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'CourbeDlg', callBackOK, callBackCancel)
  const self = this
  const list = app.listePr
  this.inf = list.listeParNatCal(app, NatCal.NFoncR1Var, -1)
  // Un CValeur pour stocker les valeurs pour l'équation, a, b et c.
  this.valAbs = new CValeur(list)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabListes = ce('table')
  tr.appendChild(tabListes)
  tr = ce('tr')
  tabListes.appendChild(tr)
  let td = ce('td')
  tabListes.appendChild(td)
  const caption = ce('caption', {
    class: 'mtgcaption',
    style: 'width:220px'
  })
  $(caption).html(getStr('TgteDlg1'))
  td.appendChild(caption)
  this.select = ce('SELECT', {
    size: 5, // Le nombre de lignes visibles par défaut
    style: 'width:220px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }
  td.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.inf.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.inf.noms[i])
    this.select.appendChild(option)
  }
  td = ce('td')
  $(td).css('vertical-align', 'top')
  tabListes.appendChild(td)
  this.paneListeRep = new PaneListeReperes(app, list.longueur() - 1)
  td.appendChild(this.paneListeRep.getTab())
  // Un ligne contenant un tableau donnant des infos sur la fonction sélectionnée
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const paneInfo = ce('table')
  tr.appendChild(paneInfo)
  tr = ce('tr')
  paneInfo.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  $(td).css('vertical-align', 'top')
  let label = ce('label')
  $(label).html(getStr('InfoFonc'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  const textarea = ce('textarea', {
    id: 'info',
    cols: 35,
    rows: 2,
    disabled: 'true'
  })
  tr.appendChild(textarea)
  // En bas un tableau pour contenir les deux éditeurs
  tr = ce('table')
  tabPrincipal.appendChild(tr)
  const paneBas = ce('table')
  tr.appendChild(paneBas)
  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('TgteDlg2'))
  td = ce('td')
  tr.appendChild(td)
  this.inputAbs = getMtgInput()
  td.appendChild(this.inputAbs)
  this.inputAbs.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  const paneBoutonsValFonc = new PaneBoutonsValFonc(this.app, this, this.inputAbs, true, -1)
  paneBas.appendChild(paneBoutonsValFonc)
  tr = ce('tr')
  paneBas.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  td.appendChild(label)
  $(label).html(getStr('TgteDlg3'))
  td = ce('td')
  tr.appendChild(td)
  this.inputName = getMtgInput()
  $(this.inputName).val(list.genereNomPourCalcul('m', true))
  td.appendChild(this.inputName)
  this.editeurAbs = new EditeurValeurReelle(app, this.inputAbs, list.longueur() - 1, this.valAbs, null)
  this.editeurNom = new EditeurNomCalcul(app, true, this.inputName)
  this.onSelectChange()
  this.create('Tangente', 500)
}

TangenteDlg.prototype = new MtgDlg()

TangenteDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, this.inputAbs)
}

TangenteDlg.prototype.onSelectChange = function () {
  $('#info').val(this.inf.pointeurs[this.select.selectedIndex].infoHist())
}

TangenteDlg.prototype.OK = function () {
  const app = this.app
  const list = app.listePr
  if (this.editeurAbs.validate() && this.editeurNom.validate()) {
    // Si la valeur choisie pour l'abscisse n'est pas une références à une valeur existante
    // on crée un nouveau calcul qu'on ajoute à la figure
    const valeurAbs = this.valAbs.getCalcForImpProto(app, 'abs', true)
    const proto = app.docCons.getPrototype('Tangente')
    proto.get(0).elementAssocie = this.inf.pointeurs[this.select.selectedIndex] // Pointe sur la fonction
    proto.get(1).elementAssocie = valeurAbs
    proto.get(2).elementAssocie = this.paneListeRep.getSelectedRep()
    const impProto = new CImplementationProto(list, proto)
    impProto.implemente(app.dimf, proto)
    impProto.nomProto = getStr('Tangente')
    const lon = list.longueur()
    const indImpProto = list.indexOf(impProto)
    // On donne au calcul final le nom choisi pour l'abscisse
    list.get(lon - 2).donneNom($(this.inputName).val())
    // On modifie le nom de l'implémentation (pour internationalisation)
    impProto.nomProto = getStr('Tangente')
    // On modifie le dernier objet implémenté qui est un affichage de valeur lié à un point
    const droite = list.get(lon - 1)
    droite.donneStyle(app.getStyleTrait())
    droite.donneCouleur(app.getCouleur())
    list.positionne(false, app.dimf)
    list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
    app.gestionnaire.enregistreFigureEnCours('Tangente')
    this.destroy()
    app.activeOutilCapt()
  }
}
