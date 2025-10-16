/*
 * Created by yvesb on 01/02/2017.
 */
/*
 * Created by yvesb on 02/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, ceIn } from 'src/kernel/dom'
import MtgDlg from './MtgDlg'
import { addZoomListener, getStr, uniteAngleDegre, uniteAngleRadian } from '../kernel/kernel'
import NewRepDlg from './NewRepDlg'
import NewRepMilliDlg from './NewRepMilliDlg'
import FigParCodeDlg from './FigParCodeDlg'
import NewFigBaseDlg from './NewFigBaseDlg'
import { figRepModif, figRepModifVect, repQuad } from '../kernel/figures'
import $ from 'jquery'

export default NewFigDlg

/**
 *
 * @param {MtgApp} app
 * @param callBackOK
 * @param callBackCancel
 * @constructor
 */
function NewFigDlg (app, callBackOK, callBackCancel) {
  const self = this
  MtgDlg.call(this, app, 'newFigDlg', callBackOK, callBackCancel)
  const tabPrincipal = ce('table', {
    cellspacing: 5
  })
  // Choix du type de figure
  this.appendChild(tabPrincipal)
  this.niveauCollege = app.level === app.levels[1]
  const tabNiv = this.niveauCollege
    ? [1, 2, 3, 4, 5, 6, 11, 12, 13]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  tabNiv.forEach((i) => {
    const tr = ceIn(tabPrincipal, 'tr')
    const td = ceIn(tr, 'td')
    const label = ceIn(td, 'label', {
      for: 'mtgchoix' + i
    })
    label.innerHTML = getStr('newFig' + i)
    const input = ce('input', {
      id: 'mtgchoix' + i,
      type: 'radio',
      name: 'mtchoix'
    })
    td.appendChild(input)
    input.onclick = () => self.onclick()
    if (i === 1) input.setAttribute('checked', 'checked')
  })

  // Choix de l'unité d'angle de la figure saut pour le mode collège où c'est le degré
  if (!this.niveauCollege) {
    let tr = ceIn(tabPrincipal, 'tr', {
      align: 'center'
    })
    let td = ceIn(tr, 'td')
    const tab2 = ceIn(td, 'table', {
      cellspacing: 5,
      id: 'tab2',
    })
    tr = ceIn(tab2, 'tr')
    td = ceIn(tr, 'td')
    let label = ceIn(td, 'label', {
      style: 'color:blue'
    })
    label.innerHTML = getStr('UniteAngFig')
    const choix = ['Degre', 'Radian']
    for (let i = 0; i < 2; i++) {
      tr = ceIn(tab2, 'tr')
      td = ceIn(tr, 'td')
      label = ceIn(td, 'label', {
        for: 'mtgua' + i
      })
      label.innerHTML = getStr(choix[i])
      const input = ceIn(td, 'input', {
        id: 'mtgua' + i,
        type: 'radio',
        name: 'mtgua'
      })
      if (i === 1 - app.listePr.uniteAngle) input.setAttribute('checked', 'checked')
    }
  }
  if (app.pwa) {
    // figures en localStorage
    let figure = localStorage.getItem('mtgFig1')
    if (figure) {
      // this.map va associer les id des inputs au code Base 64 de figure mémorisé
      this.map = new Map()
      const intl = new Intl.DateTimeFormat(app.language, { dateStyle: 'full', timeStyle: 'short' })
      let i = 1
      const tr = ceIn(tabPrincipal, 'tr')
      const td = ceIn(tr, 'td', { style: 'text-align:center; margin-top:1rem;' })
      td.innerHTML = getStr('LastFiguresUsed')

      while (figure && figure !== 'null') {
        const tr = ceIn(tabPrincipal, 'tr')
        const td = ceIn(tr, 'td')
        const label = ceIn(td, 'label')
        const id = 'mtgFig' + i
        const ts = Number(localStorage.getItem(id + 'ts'))
        const jour = ts ? intl.format(new Date(ts)) : '???'
        label.innerHTML = getStr('FigOf') + ' ' + jour
        this.map.set(id, figure)
        const input = ceIn(label, 'input', { id, type: 'radio', name: 'mtchoix' })
        input.addEventListener('click', () => this.onclick())
        i++
        figure = localStorage.getItem('mtgFig' + i)
      }
    }
  }

  // Création de la boîte de dialogue par jqueryui
  this.create('NewFig', 500)
}

NewFigDlg.prototype = new MtgDlg()

NewFigDlg.prototype.onclick = function () {
  // on cherche si l'index est dans [1;8]
  // Suivantt le choix on active ou nom d'autoriser le choix de l'unité d'angle
  let ind
  for (ind = 1; ind < 9; ind++) {
    if ($('#mtgchoix' + ind)?.prop('checked')) break
  }
  $('#tab2').css('display', ((ind <= 8) && (ind !== 6)) ? 'inline' : 'none')
}

NewFigDlg.prototype.OK = function () {
  let code
  const app = this.app
  let tab
  const uniteAngle = this.niveauCollege
    ? uniteAngleDegre
    : $('#' + 'mtgua0').prop('checked') ? uniteAngleDegre : uniteAngleRadian
  const list = app.listePr
  let ind
  for (ind = 1; ind <= 13; ind++) {
    if ($('#mtgchoix' + ind).prop('checked')) break
  }
  switch (ind) {
    case 1 :
      new NewRepDlg(app, uniteAngle, this.callBackOK)
      break
    case 2 :
      new NewRepMilliDlg(app, uniteAngle, this.callBackOK)
      break
    case 3 :
      app.setFigByCode(repQuad)
      this.callBackOK()
      break
    case 4 :
      app.setNewfigWithUnity(uniteAngle)
      this.callBackOK()
      break
    case 5 :
      list.retireTout()
      app.retireTout()
      app.resetDoc()
      app.prepareTracesEtImageFond()
      app.initSansLongueurUnite(uniteAngle)
      app.creeCommentaireDesignation()
      app.calculateAndDisplay(false)
      app.reInitConst() // Pour réinitialiser une éventuelle construction en cours
      app.gestionnaire.initialise()
      if (app.electron) {
        resetDocument() // eslint-disable-line no-undef
      }
      // On met à jour les icônes de la barre horizontale
      app.updateToolbar()
      app.updateToolsToolBar()
      // On adapte la dimension des svg si nécessaire (cas où des dimensions minimales ont été demandées)
      app.resizeSvgFig()
      if (app.zoomOnWheel) addZoomListener(app.doc, app.svgFigure, app.svgGlob) // Ajoute au doc le listener sur le wheel
      this.callBackOK()
      break
    case 6 :
      tab = []
      for (let i = 0; i < 14; i++) tab.push('fig' + i)
      new NewFigBaseDlg(app, tab, false, this.callBackOK)
      break
    case 7 :
      if (uniteAngle === uniteAngleDegre) {
        app.setFigByCode(figRepModif, false)
        const listePr = app.listePr
        listePr.uniteAngle = uniteAngleDegre
        listePr.giveFormula2('plat', '180')
        listePr.giveFormula2('angvar', '60')
        code = app.doc.getBase64Code()
        app.setFigByCode(code)
      } else {
        app.setFigByCode(figRepModif)
      }
      this.callBackOK()
      break
    case 8 :
      if (uniteAngle === uniteAngleDegre) {
        app.setFigByCode(figRepModifVect, false)
        const listePr = app.listePr
        listePr.uniteAngle = uniteAngleDegre
        listePr.giveFormula2('plat', '180')
        listePr.giveFormula2('angvar', '60')
        code = app.doc.getBase64Code()
        app.setFigByCode(code)
      } else {
        app.setFigByCode(figRepModifVect)
      }
      this.callBackOK()
      break
    case 9 :
      new NewFigBaseDlg(app, ['cour', 'courParam', 'courPol', 'graSuiteunfn', 'graSuitRecPrPt', 'graSuitRecPrTer'],
        true, this.callBackOK)
      break
    case 10:
      new NewFigBaseDlg(app, ['loiBin', 'loiBinIntConf', 'loiBinApp', 'loiExp', 'loiNorm', 'loiNormeualpha', 'loiNormInv'],
        true, this.callBackOK)
      break
    case 11 :
      new NewFigBaseDlg(app, ['reporthog', 'reporthon', 'cube', 'boite', 'cyl', 'coneSimp', 'coneDb', 'tetra', 'tetrareg',
        'pyrcarre', 'pyrregbasecar', 'pyrrect', 'prismtriang', 'prismtrap', 'surf'], true, this.callBackOK)
      break
    case 12 :
      new NewFigBaseDlg(app, ['histogParam', 'histogDoubleParam', 'histogEmpileParam', 'histogSimpleMensuel',
        'histogDoubleMensuel', 'histogDoubleMensuelEmpile', 'diagrammeCir', 'diagrammeSemiCir', 'boiteMoustaches',
        'boiteMoustachesAvecDec', 'boiteMoustachesDouble', 'boiteMoustachesDoubleAvecDec'], true, this.callBackOK)
      break
    case 13 :
      // new FigParCodeDlg(app, this.callBackOK, this.callBackOK);
      new FigParCodeDlg(app, this.callBackOK, this.callBackOK)
      break

    default: {
      // à priori une figure
      const $inputChecked = $('#newFigDlg input:checked')
      if ($inputChecked) {
        let id = $inputChecked[0].id // Le premier input sémlectionné est celui du choix degré ou radian
        // sauf si on est en mode élémentaire ou collège ou le radian n'est pas proposé
        if (!id.startsWith('mtgFig')) id = $inputChecked[1].id
        const fig = this.map.get(id)
        if (fig) {
          app.setFigByCode(fig)
          this.callBackOK()
        }
      }
    }
  }
  this.destroy()
}
