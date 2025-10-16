import { ce } from 'src/kernel/dom'
import { getStr } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import PaneListeReperes from './PaneListeReperes'
import $ from 'jquery'
import CPointDansRepere from 'src/objets/CPointDansRepere'
import CConstante from 'src/objets/CConstanteBase'
import CTermMat from 'src/objets/CTermMat'
import CValeur from 'src/objets/CValeur'

export default NuagePtsDlg

/**
 * Dialogue pour créer un nuage de points correspondant aux données d'une matrice à deux colonnes
 * @param {MtgApp} app
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function NuagePtsDlg (app, callBackOK, callBackCancel) {
  MtgDlg.call(this, app, 'NuageDlg', callBackOK, callBackCancel)
  const list = app.listePr
  const tabMat = list.tabMat2Col()
  this.tabMat = tabMat
  const tabPrincipal = ce('table')
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tabHaut = ce('table')
  tr.appendChild(tabHaut)
  tr = ce('tr')
  tabHaut.appendChild(tr)
  const tdg = ce('td')
  tr.appendChild(tdg)
  const tabHautg = ce('table')
  tdg.appendChild(tabHautg)
  const tdd = ce('td')
  tr.appendChild(tdd)
  const tabHautd = ce('table')
  tdd.appendChild(tabHautd)
  tr = ce('tr')
  tabHautg.appendChild(tr)
  let label = ce('label')
  $(label).html(getStr('NuagePtDlg1'))
  tr.appendChild(label)
  tr = ce('tr')
  tabHautg.appendChild(tr)
  this.select = ce('SELECT', {
    size: 8, // Le nombre de lignes visibles par défaut
    style: 'width:180px'
  })
  const self = this
  this.select.onchange = function () {
    self.onSelectChange()
  }
  tr.appendChild(this.select)
  // C'est là qu'on ajoute les noms des valeurs numériques disponibles dans la liste déroulante
  for (let i = 0; i < this.tabMat.length; i++) {
    const option = ce('Option', {
      class: 'mtgOption'
    })
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(tabMat[i].nomCalcul)
    this.select.appendChild(option)
  }
  // A droite en haut un panneau de choix de repère
  tr = ce('tr')
  tabHautd.appendChild(tr)
  this.paneListeRep = new PaneListeReperes(app, list.longueur() - 1)
  tr.appendChild(this.paneListeRep.getTab())
  // En bas un panneau d'info sur la matrice sélectionnée
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
  this.onSelectChange()
  this.create('NuagePt', 500)
}

NuagePtsDlg.prototype = new MtgDlg()

NuagePtsDlg.prototype.onSelectChange = function () {
  const ind = this.select.selectedIndex
  if (ind === -1) return
  const el = this.tabMat[ind]
  $('#mtginfo').text(el.infoHist())
}

NuagePtsDlg.prototype.OK = function () {
  const app = this.app
  const list = app.listePr
  const rep = this.paneListeRep.getSelectedRep()
  const mat = this.tabMat[this.select.selectedIndex]
  const nbl = mat.n
  for (let i = 0; i < nbl; i++) {
    const pt = new CPointDansRepere(list, null, false, app.getCouleur(), false, 0, 3, false,
      '', app.getTaillePoliceNom(), app.getStylePoint(), false, rep,
      new CValeur(list, new CTermMat(list, new CConstante(list, i + 1), new CConstante(list, 1), mat)),
      new CValeur(list, new CTermMat(list, new CConstante(list, i + 1), new CConstante(list, 2), mat))
    )
    app.ajouteElement(pt, false)
    pt.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  }
  app.gestionnaire.enregistreFigureEnCours('NuagePt')
  app.activeOutilCapt()
  this.destroy()
}
