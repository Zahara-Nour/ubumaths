/*
 * Created by yvesb on 05/06/2017.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import ProtocoleDlg from '../dialogs/ProtocoleDlg'
import NatObj from '../types/NatObj'
import $ from 'jquery'
import addQueue from 'src/kernel/addQueue'
export default OutilProtocole

/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilProtocole (app) {
  Outil.call(this, app, 'Protocole', 32892, true, true)
}

OutilProtocole.prototype = new Outil()

/**
 * Version 4.6 : On passe par la pile de MathJax pour être sûr que la boîte de dialogue ne démarre que
 * lorsque les affichages en cours sont finis, en particulier si une macro exécutant un suite de macro était en cours d'exécution
 * Outil.prototype.select va lui demander d'arrêter et on ne doit rien faire tant que la macro n'a aps fini de s'arrêter
 */
OutilProtocole.prototype.select = function () {
  const app = this.app
  if (app.estExercice && app.listePr.longueur() === app.nbObjInit) {
    app.activeOutilCapt()
    return
  }
  Outil.prototype.select.call(this)
  addQueue(function () {
    new ProtocoleDlg(app, function () {
      app.reCreateDisplay()
      app.activeOutilCapt()
    })
  })
}

OutilProtocole.prototype.resetClignotement = function () {
  if (this.timer !== null) this.annuleClignotement()
  this.app.clignotementPair = true
  const self = this
  const app = this.app
  this.timer = setInterval(function () {
    if (self.timer === null) return
    app.clignotementPair = !app.clignotementPair
    const list = app.listeClignotante
    for (let i = 0; i < list.longueur(); i++) {
      const el = list.get(i)
      if (el.estDeNature(NatObj.NLieuObjet)) {
        // Lignes suivantes modifiées version 6.5.2 pour corriger un bug : Lors de l'historique
        // les lieux d'objets clignotants ne disparaissaient pas quand on remontait dans la liste
        // et qu'ils étaient dans la phase visible du clignotement
        const g = el.g
        $(g).attr('visibility', app.clignotementPair ? 'visible' : 'hidden')
        for (let j = 0; j < g.childNodes.length; j++) {
          const node = g.childNodes[j]
          if (node.localName === 'g') $(node).attr('visibility', app.clignotementPair ? 'visible' : 'hidden')
        }
      } else if (el.estDeNature(NatObj.NTtObj)) {
        $(el.g).attr('visibility', app.clignotementPair ? 'visible' : 'hidden')
        if (el.estDeNature(NatObj.NObjNommable)) {
          if (el.gname) $(el.gname).attr('visibility', app.clignotementPair ? 'visible' : 'hidden')
        }
      }
    }
  }, 500)
}

OutilProtocole.prototype.annuleClignotement = function () {
  clearInterval(this.timer)
  this.timer = null
  // Important : Si, dans la boîte de dialogue de protocole, un veteur clignotant a été rajouté
  // pour visualiser une translation par origine et extrémité
  // et il faut retirer son implémentation graphique (c'est le dernier objet ajouté à la liste clignotante)
  // IL possède un nembre isTransit qui permey de l'identifier
  const app = this.app
  const list = app.listeClignotante
  const long = list.longueur()
  if (long !== 0) {
    for (let i = 0; i < long; i++) {
      const el = list.get(i)
      if (el.isTransit) el.removegElement(app.svgFigure)
    }
  }
  this.app.listeClignotante.retireTout()
}
