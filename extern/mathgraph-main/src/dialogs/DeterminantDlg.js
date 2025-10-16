import { ce } from 'src/kernel/dom'
import { getStr, replaceSepDecVirg } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
//
import $ from 'jquery'
import EditeurNomCalcul from './EditeurNomCalcul'
import { getMtgInput } from './dom'
import NatCal from '../types/NatCal'
import CCalcul from 'src/objets/CCalculBase'
import CFonctionMat from 'src/objets/CFonctionMat'
import Opef from 'src/types/Opef'
import CResultatValeur from 'src/objets/CResultatValeur'

export default DeterminantDlg

/**
 * Dialogue pour créer le déterminant d'une matrice
 * @param {MtgApp} app
 * @constructor
 */
function DeterminantDlg (app) {
  MtgDlg.call(this, app, 'DetDlg')
  const self = this
  const list = app.listePr
  this.listeObj = list.listeParNatCal(app, NatCal.NTteMatrice, -1)
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  const div = ce('div')
  tr.appendChild(div)
  let label = ce('label')
  $(label).html(getStr('NomCalcul') + ' : ')
  div.appendChild(label)
  const inputName = getMtgInput({
    id: 'inputName'
  })
  inputName.onkeyup = function (ev) {
    this.demarquePourErreur()
    if (ev.keyCode === 13) {
      $(this).blur() // Nécéssaire sur ipad pour une raison que j'ignore
      self.OK()
    }
  }
  div.appendChild(inputName)
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabMil = ce('table')
  tr.appendChild(tabMil)
  tr = ce('tr')
  tabMil.appendChild(tr)
  label = ce('label')
  tr.appendChild(label)
  $(label).html(getStr('Det') + ' ' + getStr('of') + ' : ')
  tr = ce('tr')
  tabMil.appendChild(tr)
  this.select = ce('SELECT', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:180px'
  })
  this.select.onchange = function () {
    self.onSelectChange()
  }
  tr.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.listeObj.noms.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(this.listeObj.noms[i])
    this.select.appendChild(option)
  }
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabBas = ce('table')
  tr.appendChild(tabBas)
  tr = ce('tr')
  tabBas.appendChild(tr)
  label = ce('label')
  $(label).html(getStr('Info'))
  tr.appendChild(label)
  tr = ce('tr')
  tabBas.appendChild(tr)
  const inputinf = ce('textarea', {
    id: 'mtginfo',
    disabled: 'true',
    cols: 40,
    rows: 4
  })
  tr.appendChild(inputinf)
  this.editeurName = new EditeurNomCalcul(app, !this.modification, inputName)
  this.onSelectChange()
  this.create('Det', 450)
}

DeterminantDlg.prototype = new MtgDlg()

DeterminantDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.listeObj.pointeurs[ind]
  $('#mtginfo').text(el.infoHist())
}

DeterminantDlg.prototype.onOpen = function () {
  MtgDlg.prototype.onOpen.call(this, 'inputName')
}

DeterminantDlg.prototype.OK = function () {
  const app = this.app
  const list = app.listePr
  // if (app.lastDlgId() !== this.id) return;
  if (this.editeurName.validate()) {
    // Pour créer le calcul on implémente une macro-construction
    /*
    const proto = app.docConsAv.getPrototype('det')
    proto.get(0).elementAssocie = this.listeObj.pointeurs[this.select.selectedIndex] // La matrice sélectionnée
    const impProto = new CImplementationProto(list, proto)
    impProto.implemente(app.dimf, proto)
    impProto.nomProto = getStr('Det')
    // Le dernier objet créé est le déterminant. On le renomme
    list.get(list.longueur() - 1).nomCalcul = $('#inputName').val()
    this.app.gestionnaire.enregistreFigureEnCours('Det')
    this.destroy()
     */
    const cb = new CFonctionMat(list, Opef.Deter, new CResultatValeur(list, this.listeObj.pointeurs[this.select.selectedIndex]))
    const ch = replaceSepDecVirg(app, cb)
    const calc = new CCalcul(list, null, false, $('#inputName').val(), ch, cb)
    app.ajouteElement(calc)
    calc.positionne()
    this.app.gestionnaire.enregistreFigureEnCours('Det')
    this.destroy()
  }
}
