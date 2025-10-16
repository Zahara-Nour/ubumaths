/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { addZoomListener, getStr, uniteAngleRadian } from '../kernel/kernel'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import CValeur from '../objets/CValeur'
import EditeurValeurReelle from './EditeurValeurReelle'
import CImplementationProto from '../objets/CImplementationProto'
import CCalcul from '../objets/CCalcul'
import CObjetDuplique from '../objets/CObjetDuplique'
import NatObj from '../types/NatObj'
import { getMtgInput } from './dom'

export default NewRepMilliDlg
/**
 * Dialogue de création d'une nouvelle figure munie d'un repère millimétré
 * @constructor
 * @param {MtgApp} app Application propriétaire
 * @param uniteAng L'unité d'angle d la figure (degré ou radian)
 * @param callBackOK Fonctio de callBack à appeler après avoir validé
 */
function NewRepMilliDlg (app, uniteAng, callBackOK) {
  MtgDlg.call(this, app, 'NewRepMilliDlg', callBackOK)
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

  // Quatre éditeurs de formule pour l'abscisse à l'origine, l'ordonnée à l'origine et les unités
  tr = ce('tr')
  tabPrincipal.appendChild(tr)
  const tab5 = ce('table')
  tr.appendChild(tab5)
  tr = ce('tr')
  tab5.appendChild(tr)
  let td = ce('td')
  tr.appendChild(td)
  let label = ce('label')
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
  let input = ce('input', {
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
  // Pour les qautre lignes suivantes 1 comme avant dernier paramètre car une fois
  // La liste effacée, on rajoute la constante pi et ces 4 valeurs ne peuve,t dépendre que de pi
  this.editororx = new EditeurValeurReelle(app, this.inputabsor, 1, this.absor, null)
  this.editorory = new EditeurValeurReelle(app, this.inputordor, 1, this.ordor, null)
  this.editorux = new EditeurValeurReelle(app, this.inputunitex, 1, this.unitex, null)
  this.editoruy = new EditeurValeurReelle(app, this.inputunitey, 1, this.unitey, null)
  // Création de la boîte de dialogue par jqueryui
  this.create('NewRepDlg', 600)
}

NewRepMilliDlg.prototype = new MtgDlg()

NewRepMilliDlg.prototype.OK = function () {
  const app = this.app
  let dup
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
          const avecvect = $('#cbavecvect').prop('checked')
          const avecgrad = !$('#rdsansgr').prop('checked')
          list.ajouteRepereOrthonormal(app.dimf, false, false, false, 'O', 'I', 'J', avecvect ? 'i' : '',
            avecvect ? 'j' : '', this.absor, this.ordor, this.unitex, this.unitey, avecgrad)
          // On crée quatre calculs représentant les valeurs minis et maxis du millimétrage en
          // abscisse et en ordonnée
          const tab1 = ['xmin', 'xmax', 'ymin', 'ymax']
          const tab2 = ['-25', '25', '-20', '20']
          const cal = []
          let i
          for (i = 0; i < 4; i++) {
            cal.push(new CCalcul(list, null, false, tab1[i], tab2[i]))
            app.ajouteElement(cal[i])
          }
          const proto = app.docCons.getPrototype('PapierMillimetre')
          proto.get(0).elementAssocie = list.premierRepVis(false)
          for (i = 0; i < 4; i++) proto.get(i + 1).elementAssocie = cal[i]
          const pointO = list.premierParNat(NatObj.NPointBase)
          // pointO.nom = "O"; // Car O a été renommé en O1 par l'implémentation de construction
          const pointI = list.premierParNat(NatObj.NPointLie)
          // pointI.nom = "I"; // Car I a été renommé en I1 par l'implémentation de construction
          const pointJ = list.premierParNat(NatObj.NTtPoint, 3) // Car on recherche J le quatrième point de la figure (un CPointLieBipoint)
          // pointJ.donneNom("J");
          const impProto = new CImplementationProto(list, proto)
          impProto.implemente(app.dimf, proto)
          // On donne à l'implémntation de prototype le nom PapMilli sans tenir compte de la langue
          // car on veut que les leuxs d'objets de cette implémentation ne soient pas désignables
          // impProto.nomProto = getStr("PapMil");
          impProto.nomProto = 'PapMilli'

          const bgrsimple = $('#rdgrsimple').prop('checked')
          const bgrtrig = $('#rdgrtrig').prop('checked')

          if (bgrsimple) app.creeGrad('GraduationAxesRepere')
          else if (bgrtrig) {
            app.creeGrad('GraduationReperePourTrigo')
            list.uniteAngle = uniteAngleRadian
          }
          // Si on a gradué, on fait en sorte que les graduations n'effacent pas le fond
          if (bgrsimple || bgrtrig) {
            pointI.nomMasque = true
            pointJ.nomMasque = true
            for (i = 0; i < list.longueur(); i++) {
              const el = list.get(i)
              if (el.estDeNature(NatObj.NComouLatex)) el.effacementFond = false
            }
          }
          // On ajoute des dupliqués des points O, I et J et des axes
          for (i = 1; i < 3; i++) {
            const line = list.premierParNat(NatObj.NDroite, i)
            dup = new CObjetDuplique(list, null, false, false, line)
            list.add(dup)
          }
          const dupO = new CObjetDuplique(list, null, false, false, pointO)
          list.add(dupO)
          const dupI = new CObjetDuplique(list, null, false, false, pointI)
          list.add(dupI)
          const dupJ = new CObjetDuplique(list, null, false, false, pointJ)
          list.add(dupJ)
          // Si on demandé des vecteurs on ajoute des dupliqués des vecteurs et des affichages LaTeX associés
          if (avecvect) {
            for (i = 0; i < 2; i++) {
              const vect = list.premierParNat(NatObj.NVecteur, i)
              dup = new CObjetDuplique(list, null, false, false, vect)
              list.add(dup)
              const lat = list.premierParNat(NatObj.NLatex, i)
              dup = new CObjetDuplique(list, null, false, false, lat)
              list.add(dup)
            }
          }
          app.calculateAndDisplay(false)
          app.gestionnaire.initialise()
          // On met à jour les icônes de la barre horizontale
          app.updateToolbar()
          app.updateToolsToolBar()
          // On adapte la dimension des svg si nécessaire (cas où des dimensions minimales ont été demandées)
          app.resizeSvgFig()
          if (app.zoomOnWheel) addZoomListener(app.doc, app.svgFigure, app.svgGlob) // Ajoute au doc le listener sur le wheel
          this.callBackOK()
          this.destroy()
        } else this.inputunitey.focus()
      } else this.inputunitex.focus()
    } else this.inputordor.focus()
  } else {
    this.inputabsor.focus()
  }
}
