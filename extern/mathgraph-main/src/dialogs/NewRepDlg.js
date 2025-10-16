/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ce, ceIn } from 'src/kernel/dom'
import { addZoomListener, getStr, uniteAngleRadian } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import CValeur from '../objets/CValeur'
import EditeurValeurReelle from './EditeurValeurReelle'
import { getMtgInput } from './dom'
import CImplementationProto from '../objets/CImplementationProto'
import NatCal from '../types/NatCal'

export default NewRepDlg

/**
 * Dialogue de création d'une nouvelle figure munie d'un repère
 * @param {MtgApp} app Application propriétaire
 * @param uniteAng L'unité d'angle d la figure (degré ou radian)
 * @param callBackOK Fonction de callBack à appeler après avoir validé
 * @constructor
 */
function NewRepDlg (app, uniteAng, callBackOK) {
  MtgDlg.call(this, app, 'NewRepDlg', callBackOK)
  this.uniteAng = uniteAng
  // On crée 4 CValeur pour abscisses et ordonnées à l'origine et unités sur les axes
  const list = app.listePr
  this.absor = new CValeur(list, 0)
  this.ordor = new CValeur(list, 0)
  this.unitex = new CValeur(list, 1)
  this.unitey = new CValeur(list, 1)
  const tabPrincipal = ce('table', { cellspacing: 5 })
  this.appendChild(tabPrincipal)
  let tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tab2 = ce('table')
  tr.appendChild(tab2)
  tr = ce('tr')
  tab2.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  // Le bouton radio de choix de repère orthonormal
  let input = ce('input', {
    id: 'rdorthon',
    type: 'radio',
    name: 'mtgtyperep'
  })
  input.setAttribute('checked', 'checked') // Repère orthonormal coché par défaut
  td.appendChild(input)
  td = ce('td')
  tr.appendChild(td)
  let label = ce('label', {
    for: 'rdorthon'
  })
  $(label).html(getStr('NewRepDlg1'))
  td.appendChild(label)

  td = ce('td')
  tr.appendChild(td)
  // Le bouton radio de choix de repère orthogonal
  input = ce('input', {
    id: 'rdorthog',
    type: 'radio',
    name: 'mtgtyperep'
  })
  td.appendChild(input)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label', {
    for: 'rdorthog'
  })
  $(label).html(getStr('NewRepDlg2'))
  td.appendChild(label)

  td = ce('td')
  tr.appendChild(td)
  // Le bouton radio de choix de repère oblique quelconque
  input = ce('input', {
    id: 'rdobli',
    type: 'radio',
    name: 'mtgtyperep'
  })
  td.appendChild(input)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label', {
    for: 'rdobli'
  })
  $(label).html(getStr('NewRepDlg3'))
  td.appendChild(label)

  td = ce('td')
  tr.appendChild(td)
  // Le bouton radio de choix de repère oblique normé
  input = ce('input', {
    id: 'rdobinor',
    type: 'radio',
    name: 'mtgtyperep'
  })
  td.appendChild(input)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label', {
    for: 'rdobinor'
  })
  $(label).html(getStr('NewRepDlg4'))
  td.appendChild(label)

  // 3 checkbox radio de choix de type de quadrillage
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tab3 = ce('table')
  tr.appendChild(tab3)
  td = ce('td')
  tab3.appendChild(td)
  // Le bouton radio de choix de quadrillage vertical
  input = ce('input', {
    id: 'rdquadver',
    type: 'checkBox'
  })
  input.setAttribute('checked', 'checked')
  td.appendChild(input)
  td = ce('td')
  tab3.appendChild(td)
  label = ce('label', {
    for: 'rdquadver'
  })
  $(label).html(getStr('NewRepDlg5'))
  td.appendChild(label)

  // quadrillé
  td = ce('td')
  tab3.appendChild(td)
  // Le bouton radio de choix de quadrillage horizontal
  input = ce('input', {
    id: 'rdquadhor',
    type: 'checkBox'
  })
  input.setAttribute('checked', 'checked')
  td.appendChild(input)
  td = ce('td')
  tab3.appendChild(td)
  label = ce('label', {
    for: 'rdquadhor'
  })
  $(label).html(getStr('NewRepDlg6'))
  td.appendChild(label)

  // Le bouton radio de choix de quadrillage pointille
  td = ce('td')
  tab3.appendChild(td)
  // Le bouton radio de choix de repère orthonormal
  input = ce('input', {
    id: 'rdquadpoint',
    type: 'checkBox'
  })
  td.appendChild(input)
  td = ce('td')
  tab3.appendChild(td)
  label = ce('label', {
    for: 'rdquadpoint'
  })
  $(label).html(getStr('NewRepDlg7'))
  td.appendChild(label)

  // Quatre éditeurs de formule pour l'abscisse à l'origine, l'ordonnée à l'origine et les unités
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tab5 = ce('table')
  tr.appendChild(tab5)
  tr = ce('tr')
  tab5.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('OrAbs'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputabsor = getMtgInput({
    id: 'inputabsor'
  })
  td.appendChild(this.inputabsor)
  $(this.inputabsor).val(0)

  tr = ce('tr')
  tab5.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('OrOrd'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputordor = getMtgInput({
    id: 'inputordor'
  })
  td.appendChild(this.inputordor)
  $(this.inputordor).val(0)

  tr = ce('tr')
  tab5.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Unitex'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputunitex = getMtgInput({
    id: 'inputunitex'
  })
  td.appendChild(this.inputunitex)
  $(this.inputunitex).val(1)

  tr = ce('tr')
  tab5.appendChild(tr)
  td = ce('td')
  tr.appendChild(td)
  label = ce('label')
  $(label).html(getStr('Unitey'))
  td.appendChild(label)
  td = ce('td')
  tr.appendChild(td)
  this.inputunitey = getMtgInput({
    id: 'inputunitey'
  })
  td.appendChild(this.inputunitey)
  $(this.inputunitey).val(1)

  // Boutons de choix de type de graduation
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tab4 = ce('table')
  tr.appendChild(tab4)
  td = ce('td')
  tab4.appendChild(td)
  // Le bouton radio de choix de repère sans graduation
  input = ce('input', {
    id: 'rdsansgr',
    type: 'radio',
    name: 'mtggrad'
  })
  td.appendChild(input)
  td = ce('td')
  tab4.appendChild(td)
  label = ce('label', {
    for: 'rdsansgr'
  })
  $(label).html(getStr('NewRepDlg12'))
  td.appendChild(label)

  td = ce('td')
  tab4.appendChild(td)
  // Le bouton radio de choix de graduation simple
  input = ce('input', {
    id: 'rdgrsimple',
    type: 'radio',
    name: 'mtggrad'
  })
  td.appendChild(input)
  input.setAttribute('checked', 'checked') // Gradution simple par défaut
  td = ce('td')
  tab4.appendChild(td)
  label = ce('label', {
    for: 'rdgrsimple'
  })
  $(label).html(getStr('NewRepDlg13'))
  td.appendChild(label)

  ce('td')
  tab4.appendChild(td)
  // Le bouton radio de choix de graduation pour trigo
  input = ce('input', {
    id: 'rdgrtrig',
    type: 'radio',
    name: 'mtggrad'
  })
  td.appendChild(input)
  td = ce('td')
  tab4.appendChild(td)
  label = ce('label', {
    for: 'rdgrtrig'
  })
  $(label).html(getStr('NewRepDlg14'))
  td.appendChild(label)

  // On rajoute un checkBox
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  input = ce('input', {
    id: 'cbavecvect',
    type: 'checkBox'
  })
  tr.appendChild(input)
  label = ce('label', {
    for: 'cbavecvect'
  })
  $(label).html(getStr('NewRepDlg15'))
  tr.appendChild(label)
  // Quatre lignes pour choisir si on veut on non des flèches au bout des axes
  // et si on veut ou non des étiquettes au bout des axes
  tr = ceIn(tabPrincipal, 'tr')
  this.cbFlechex = ceIn(tr, 'input', {
    type: 'checkbox',
    id: 'cbFlechex'
  })
  this.cbFlechex.checked = true
  label = ceIn(tr, 'label', {
    for: 'cbFlechex'
  })
  $(label).html(getStr('AddFlechex'))
  tr = ceIn(tabPrincipal, 'tr')
  this.cbFlechey = ceIn(tr, 'input', {
    type: 'checkbox',
    id: 'cbFlechey'
  })
  this.cbFlechey.checked = true
  label = ceIn(tr, 'label', {
    for: 'cbFlechey'
  })
  $(label).html(getStr('AddFlechey'))
  tr = ceIn(tabPrincipal, 'tr')
  label = ceIn(tr, 'label')
  $(label).html(getStr('EtiqAxex'))
  this.inputEtiqx = ceIn(tr, 'input', {
    type: 'text'
  })
  tr = ceIn(tabPrincipal, 'tr')
  label = ceIn(tr, 'label')
  $(label).html(getStr('EtiqAxey'))
  this.inputEtiqy = ceIn(tr, 'input', {
    type: 'text'
  })
  // Pour les quatre lignes suivantes 1 comme avant dernier paramètre car une fois
  // La liste effacée, on rajoute la constante pi et ces 4 valeurs ne peuve,t dépendre que de pi
  this.editororx = new EditeurValeurReelle(app, this.inputabsor, 1, this.absor, null)
  this.editorory = new EditeurValeurReelle(app, this.inputordor, 1, this.ordor, null)
  this.editorux = new EditeurValeurReelle(app, this.inputunitex, 1, this.unitex, null)
  this.editoruy = new EditeurValeurReelle(app, this.inputunitey, 1, this.unitey, null)
  // Création de la boîte de dialogue par jqueryui
  this.create('NewRepDlg', 600)
}

NewRepDlg.prototype = new MtgDlg()

NewRepDlg.prototype.OK = function () {
  const app = this.app
  const svgFig = app.svgFigure
  if (this.editororx.validate($('#inputabsor').val())) {
    if (this.editorory.validate($('#inputordor').val())) {
      if (this.editorux.validate($('#inputunitex').val())) {
        if (this.editoruy.validate($('#inputunitey').val())) {
          app.listePr.retireTout()
          app.retireTout()
          app.resetDoc()
          // app.listePr vient de changer
          const list = app.listePr
          app.prepareTracesEtImageFond()
          list.uniteAngle = this.uniteAng
          list.ajouteConstantePi()
          app.creeCommentaireDesignation()
          const quadver = $('#rdquadver').prop('checked')
          const quadhor = $('#rdquadhor').prop('checked')
          const quadpoint = $('#rdquadpoint').prop('checked')
          const avecvect = $('#cbavecvect').prop('checked')
          const avecgrad = !$('#rdsansgr').prop('checked')
          if ($('#rdorthon').prop('checked')) {
            list.ajouteRepereOrthonormal(app.dimf, quadhor, quadver, quadpoint, 'O', 'I', 'J', avecvect ? 'i' : '',
              avecvect ? 'j' : '', this.absor, this.ordor, this.unitex, this.unitey, avecgrad)
          } else {
            if ($('#rdorthog').prop('checked')) {
              list.ajouteRepereOrthogonal(app.dimf, quadhor, quadver, quadpoint, 'O', 'I', 'J', avecvect ? 'i' : '',
                avecvect ? 'j' : '', this.absor, this.ordor, this.unitex, this.unitey, avecgrad)
            } else {
              if ($('#rdobli').prop('checked')) {
                list.ajouteRepereOblique(app.dimf, quadhor, quadver, quadpoint, 'O', 'I', 'J', avecvect ? 'i' : '',
                  avecvect ? 'j' : '', this.absor, this.ordor, this.unitex, this.unitey, avecgrad)
              } else {
                list.ajouteRepereObliqueNorme(app.dimf, quadhor, quadver, quadpoint, 'O', 'I', 'J',
                  avecvect ? 'i' : '', avecvect ? 'j' : '', this.absor, this.ordor, this.unitex, this.unitey, avecgrad)
              }
            }
          }
          if ($('#rdgrsimple').prop('checked')) app.creeGrad('GraduationAxesRepere')
          else if ($('#rdgrtrig').prop('checked')) {
            app.creeGrad('GraduationReperePourTrigo')
            list.uniteAngle = uniteAngleRadian
          }
          app.gestionnaire.initialise()
          // On met à jour les icônes de la barre horizontale
          app.updateToolbar()
          app.updateToolsToolBar()
          // On adapte la dimension des svg si nécessaire (cas où des dimensions minimales ont été demandées)
          app.resizeSvgFig()
          // On regarde si on a demandé d'ajouter des flèches et des étiquettes au bout des axes
          // Pour les étiquettes on utile des macros constructions qui meu donne un angle constant nul
          if (this.cbFlechex.checked) {
            if (this.inputEtiqx.value) {
              // On charge la construction qui est contenue dans this.app.docConst
              const proto = this.app.docCons.getPrototype('AjoutFlecheAxeAbsAvecEtiq0')
              proto.get(0).elementAssocie = list.premierParNatCal(NatCal.NRepere)
              const impProto = new CImplementationProto(list, proto)
              impProto.implemente(app.dimf, proto)
              impProto.nomProto = getStr('AddArrowx')
              // On change le texte créé par le prototype par le contenu de l'éditeur
              list.get(list.longueur() - 1).chaineCommentaire = this.inputEtiqx.value
            } else {
              // On charge la construction qui est contenue dans this.app.docConst
              const proto = this.app.docCons.getPrototype('AjoutFlecheAxeAbs')
              proto.get(0).elementAssocie = list.premierParNatCal(NatCal.NRepere)
              const impProto = new CImplementationProto(list, proto)
              impProto.implemente(app.dimf, proto)
              impProto.nomProto = getStr('AddArrowx')
            }
          } else {
            const proto = this.app.docCons.getPrototype('AjoutEtiqAxeAbs0')
            proto.get(0).elementAssocie = list.premierParNatCal(NatCal.NRepere)
            const impProto = new CImplementationProto(list, proto)
            impProto.implemente(app.dimf, proto)
            impProto.nomProto = getStr('AddLabelx')
            // On change le texte créé par le prototype par le contenu de l'éditeur
            list.get(list.longueur() - 1).chaineCommentaire = this.inputEtiqx.value
          }
          if (this.cbFlechey.checked) {
            if (this.inputEtiqy.value) {
              // On charge la construction qui est contenue dans this.app.docConst
              const proto = this.app.docCons.getPrototype('AjoutFlecheAxeOrdAvecEtiq0')
              proto.get(0).elementAssocie = list.premierParNatCal(NatCal.NRepere)
              const impProto = new CImplementationProto(list, proto)
              impProto.implemente(app.dimf, proto)
              impProto.nomProto = getStr('AddArrowy')
              // On change le texte créé par le prototype par le contenu de l'éditeur
              list.get(list.longueur() - 1).chaineCommentaire = this.inputEtiqy.value
            } else {
              // On charge la construction qui est contenue dans this.app.docConst
              const proto = this.app.docCons.getPrototype('AjoutFlecheAxeOrd')
              proto.get(0).elementAssocie = list.premierParNatCal(NatCal.NRepere)
              const impProto = new CImplementationProto(list, proto)
              impProto.implemente(app.dimf, proto)
              impProto.nomProto = getStr('AddArrowy')
            }
          } else {
            const proto = this.app.docCons.getPrototype('AjoutEtiqAxeOrd0')
            proto.get(0).elementAssocie = list.premierParNatCal(NatCal.NRepere)
            const impProto = new CImplementationProto(list, proto)
            impProto.implemente(app.dimf, proto)
            impProto.nomProto = getStr('AddLabely')
            // On change le texte créé par le prototype par le contenu de l'éditeur
            list.get(list.longueur() - 1).chaineCommentaire = this.inputEtiqy.value
          }
          app.calculateAndDisplay(false)
          if (app.zoomOnWheel) addZoomListener(app.doc, svgFig, app.svgGlob) // Ajoute au doc le listener sur le wheel
          this.callBackOK()
          this.destroy()
        } else this.inputunitey.focus()
      } else this.inputunitex.focus()
    } else this.inputordor.focus()
  } else {
    this.inputabsor.focus()
  }
}
