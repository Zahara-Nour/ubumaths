/*
 * Created by yvesb on 19/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce, cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import Fonte from '../types/Fonte'
import { isMobileDevice, preventDefault } from '../kernel/kernel'
import AvertDlg from '../dialogs/AvertDlg'
// import $ from 'jquery'
import $ from 'jquery'

export default NameEditor

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function NameEditor (app) {
  this.app = app
  this.eltAssocie = null // Pointera sur un point ou une droite dont on peut entrer le nom
  this.isVisible = false
  this.editeur = ce('input', {
    type: 'text',
    class: 'mtgnameinput',
    size: 4
  })
  this.editeur.addEventListener('mousedown', (evt) => {
    // On ne fait pas de preventdefault pour que le focus soit donné par l'événement
    evt.stopPropagation()
    // this.editeur.focus()
  })
  this.editeur.addEventListener('touchstart', (evt) => {
    // On ne fait pas de preventdefault pour que le focus soit donné par l'événement
    evt.stopPropagation()
    // this.editeur.focus()
  })
  // Pour que le foreign Object soit visible il faut connaître ses dimensions.
  // Pour cela on l'affiche d'abord dans le div parent de l'appli ou du lecteur
  const parentDiv = app.svg.containerDiv
  parentDiv.appendChild(this.editeur)
  // On mémorise les dimensions de l'éditeur
  const width = this.editeur.clientWidth + 4
  const height = this.editeur.clientHeight + 6
  parentDiv.removeChild(this.editeur)  // this.editeur.size = 2;
  this.editeur.owner = this
  this.foreigntElt = cens('foreignObject', {
    x: 0,
    y: 0,
    width,
    height
  })

  // this.editeur.onblur = this.onblur;
  this.editeur.onkeypress = this.onkeypress
  this.editeur.onkeyup = this.onkeyup
  this.foreigntElt.appendChild(this.editeur)
  // On n'impose pas une fontSize sur l'éditeur car sinon sur iPad l'éditeur n'a pas une allure "normale"
  // this.editeur.style.fontSize = '16px'
  // this.editeur.style.fontFamily = "TNR"; // Modifié version 6.3.5
  // this.editeur.style.fontFamily = 'Roboto' // Il faut utiliser une fonte monospace pour que size soit respecté
  this.foreigntElt.style.visibility = 'hidden'
  app.svgGlob.appendChild(this.foreigntElt)
}

NameEditor.prototype.associeA = function (el) {
  // Version 9.4.0 : on peut de nouveau mettre un éditeur de nom à la volée sur tablette ou tél
  // if (isMobileDevice) return
  this.montre(false) // Pour que si l'utilisateur a entré un nom sans appuyer sur OK ça marche aussi.
  this.montre(true)
  this.eltAssocie = el
  $(this.editeur).val('')
  this.associeAPoint = el.estDeNature(NatObj.NTtPoint)
}

NameEditor.prototype.focus = function () {
  const self = this
  // Précaution pour les périphériques mobiles
  setTimeout(function () {
    self.editeur.focus()
  }, 200)
}

NameEditor.prototype.montre = function (b) {
  this.isVisible = b
  this.foreigntElt.style.visibility = b ? 'visible' : 'hidden'
  if (!b) {
    // On regarde si l'éditeur contient une chaîne non vide alors que l'élement associé  aun nom vide
    // C'est alors que l'utilisateur a oiublié d'appuyer sur la touche Entrée.
    const el = this.eltAssocie
    const text = this.editeur.value
    const list = this.app.listePourConst
    if ((el !== null) && (el.nom === '')) {
      if ((this.associeAPoint ? Fonte.validationNomPoint(text) : Fonte.validationNomDroite(text)) &&
        !list.existePointOuDroiteMemeNom(null, text)) {
        el.nom = text
        el.updateName(this.app.svgFigure)
      }
    }
    this.eltAssocie = null
  }
}

NameEditor.prototype.onkeyup = function () {
  this.owner.demarquePourErreur()
}

NameEditor.prototype.onkeypress = function (evt) {
  let text
  const self = this
  if (evt.keyCode === 13) { // On a pressé la touche Entrée
    const owner = this.owner
    if (owner.elementAssocie !== null) {
      // Modification version 6.3.5 : Pour les macs ou Ipad on remplace les apostrophes courbes qui
      // sont générées par le clavier Français par des apostrophes droites
      text = this.value.replace(/’/g, "'")
      /*
      if (text.length === 0) {
        self.owner.montre(false);
        return;
      }
      */
      const app = owner.app
      const nomValide = (text === '') || (owner.associeAPoint ? Fonte.validationNomPoint(text) : Fonte.validationNomDroite(text))
      if (nomValide) {
        if ((text !== '') && app.listePourConst.existePointOuDroiteMemeNom(null, text)) {
          new AvertDlg(app, 'ExisteMemeNom', function () {
            self.focus()
          })
          preventDefault(evt)
        } else {
          if (owner.eltAssocie) { // Test rajouté suite à un rapport BusNag
            owner.eltAssocie.donneNom(text)
            // owner.eltAssocie.afficheNom(app.svgFigure);
            owner.eltAssocie.updateName()
            app.gestionnaire.enregistreFigureEnCours('Nommer')
            this.value = ''
            preventDefault(evt)
            this.blur() // Ajouté pour que sur péripérique mobile le clavier se replie
            // On retourne en haut de la page (important pour périphériques mobiles)
            // $('html,body').scrollTop(0); Abandonné
            // Si on est en train de créer l'intersection d'une droite et un cercle ou de deux cercles
            // On passe au deuxième point d'intersection.
            if (owner.eltAssocie.className === 'CPointLieBipoint') {
              if (owner.eltAssocie !== owner.pointAssociePre) {
                const bp = owner.eltAssocie.ptBipoint
                const plb = bp.pointReelDansListe((owner.eltAssocie.indiceDansBipoint === 1) ? 2 : 1)
                // plb peut être nul par exemple avec l'outil de création d'un rectangle direct
                owner.pointAssociePre = plb
                if ((plb !== null) && plb.existe && (plb.nom === '') && plb.dansFenetre) {
                  // Modification version 6.1.0 : S'il existe un point déjà nommé presque confondu avec le point d'intersection
                  // on ne propose pas d'éditer son nom.
                  if (app.listePr.premierPointNommeProcheDe(plb) === null) {
                    owner.associeA(plb)
                    owner.setPosition()
                  } else owner.montre(false)
                } else owner.montre(false)
              } else owner.montre(false)
            } else {
              // On regarde si le point dont on édite le nom n'est pas le dernier objet de la figure
              //  S'il ne l'est pas et si on trouve à partir de la fin un point rajouté on édite son nom
              const list = app.listePr
              const index = owner.eltAssocie.index
              if (index !== list.longueur() - 1) {
                let trouve = false
                let last
                for (let i = list.longueur() - 1; i > index; i--) {
                  last = list.get(i)
                  if (!last.estElementIntermediaire() && last.estDeNature(NatObj.NTtPoint) && !last.masque) {
                    trouve = true
                    break
                  }
                }
                if (trouve && last.dansFenetre) {
                  owner.associeA(last)
                  owner.setPosition()
                } else owner.montre(false)
              } else owner.montre(false)
            }
          }
        }
      } else {
        self.owner.marquePourErreur()
        new AvertDlg(app, 'NomInvalide', function () {
          self.focus()
        })
        preventDefault(evt)
      }
    }
  }
}

NameEditor.prototype.setPosition = function () {
  this.demarquePourErreur()
  let x, y
  const app = this.app
  if (this.eltAssocie === null) return
  const pointAssocie = this.associeAPoint ? this.eltAssocie : null
  const droiteAssociee = this.associeAPoint ? null : this.eltAssocie
  const width = this.editeur.clientWidth
  const height = this.editeur.clientHeight
  const decalagevert = height + 3
  const decalagehor = width / 2
  const xmax = app.dimf.x
  const ymax = app.dimf.y
  x = (pointAssocie !== null) ? pointAssocie.x - decalagehor : droiteAssociee.xNom - droiteAssociee.decX - decalagehor
  if (x + width > xmax) x = x - decalagehor
  else if (x < 0) x = x + decalagehor
  y = (pointAssocie !== null) ? pointAssocie.y + 15 : droiteAssociee.yNom - droiteAssociee.decY
  if (y > ymax - decalagevert) y -= (pointAssocie !== null) ? 2 * decalagevert : decalagevert
  $(this.foreigntElt).attr('x', x)
  $(this.foreigntElt).attr('y', y)
  const horsEcran = (pointAssocie !== null) ? !pointAssocie.dansFenetre : droiteAssociee.horsFenetre
  if (horsEcran) this.montre(false)
  else {
    this.isVisible = true
    if (!isMobileDevice) this.focus()
  }
}

NameEditor.prototype.marquePourErreur = function () {
  $(this.editeur).css('background-color', '#F5a9BC')
  this.isRed = true
}
NameEditor.prototype.demarquePourErreur = function () {
  if (this.isRed) $(this.editeur).css('background-color', '#FFFFFF')
  this.isRed = false
}
