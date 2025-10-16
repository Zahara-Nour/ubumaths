/*
 * Created by yvesb on 20/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ce } from 'src/kernel/dom'
import { descriptionNature, getStr } from '../kernel/kernel'
import NatObj from '../types/NatObj'
import Nat from '../types/Nat'
import MtgDlg from './MtgDlg'
import $ from 'jquery'
import ChoixObjProchesDlg from 'src/dialogs/ChoixObjProchesDlg'

export default ChoixTypeDlg

/**
 * Dialogue de choix de type lorsqu'on a cliqué à un endroit de la figure où plusieurs objets de type
 * différent étaient proches du pointeur souris
 * @constructor
 * @param {MtgApp} app L'application proprétaire
 * @param {InfoProx} info Le InfoProx de l'outil de pointage
 * @param typesDesignables Les types parmi lesquels on doit choisir
 * @param  {OutilPointage} outilPointage l'outil de pointage appelant la boite de dialogue
 * @param cible Le nom de l'objet de pointage auquel il faudra affecter le premier élément ou le dernier
 * @param {Point} point Coordonnées du point cliqué lors de l'appel
 * @param {string} deviceType 'mouse' ou 'touch' suivant le type de device
 * @param callBackOK La fonction à appeler après un clic sur le bouton OK
 * @param bMemeMasque true si on doit accepter de choisir des objets masqués (sert quand on demande le choix entre plusieurs objets du même type)
 * si, pour le type choisi, il y avait plusieurs objets de ce type proches. Dans ce cas cette boîte de dialogue
 * en lance une autre de choix entre premier objet et dernier objet
 */
function ChoixTypeDlg (app, info, typesDesignables, outilPointage, cible, point, deviceType, callBackOK = null,
  bMemeMasque = false) {
  let i, j, td, nat, test, option
  // if (app.dlg !== null) return;
  MtgDlg.call(this, app, 'choixTypeDlg', callBackOK)
  // Il peut arriver que l'endroit où on a cliqué soit aussi l'endroit d'un des deux boutons
  // OK ou Cancel et que la boîte se referme tout de suite.
  // Pour éviter cela on regardera le temps entre le début de la création de la boîte
  // et l'appui sur un de ces deux boutons
  this.info = info
  // this.typesDesignables = typesDesignables;
  this.outilPointage = outilPointage
  this.cible = cible
  this.point = point // Mémorisé car utilisé quand on utilise ChoixObjProchesDlg
  this.deviceType = deviceType // Idem
  this.bMemeMasque = bMemeMasque
  // Le tableau vect contiendra les chaînes de caractères représentant les types parmi lesquels choisir
  // Le tableau types contiendra les types parmi lesquels choisir (du type NatObj)
  // Le tableau indicesTypes contiendra l'indice de chacun des types proposés dasn la liste
  const vect = []
  this.indicesTypes = []
  j = 0
  for (i = 0; i < NatObj.nombreTypesDesignables; i++) {
    nat = NatObj.conversionNumeroNature[i]
    test = Nat.and(nat, typesDesignables)
    if (test.isNotZero()) {
      this.indicesTypes[j] = i
      j++
      vect.push(getStr(descriptionNature[i]))
    }
  }
  const tab = ce('table', {
    cellspacing: 10
  })
  this.appendChild(tab)
  const tr = ce('TR')
  tab.appendChild(tr)
  td = ce('TD', {
    valign: 'top'
  })
  tr.appendChild(td)
  const label = ce('label')
  $(label).html(getStr('ChoixTypeDlg1'))
  td.appendChild(label)
  td = ce('TD', {
    valign: 'top'
  })
  tr.appendChild(td)
  this.select = ce('select', {
    size: 6, // Le nombre de lignes visilbles par défaut
    style: 'width:300px'
  })
  td.appendChild(this.select)
  // C'est là qu'on ajoute tous les types disponibles dans la liste déroulante
  for (i = 0; i < vect.length; i++) {
    option = ce('Option')
    if (i === 0) option.setAttribute('selected', 'selected')
    $(option).html(vect[i])
    this.select.appendChild(option)
  }
  this.create('TypeAPrec', 500)
}

ChoixTypeDlg.prototype = new MtgDlg()

ChoixTypeDlg.prototype.OK = function () {
  const app = this.app
  const i = this.select.selectedIndex
  const ind = this.indicesTypes[i] // ind contient l'indice réel du type choisi dans la table de tous les indices
  this.destroy()
  if (this.info.infoParType[ind].nombreVoisins === 1) { // Il n'y a qu'un seul objet voisin du type choisi
    this.outilPointage[this.cible] = this.info.infoParType[ind].premierVoisin
    if (this.callBackOK !== null) this.callBackOK()
  } else {
    // Si plusieurs objets du type choisi on lance une boîte de dialogue de choix de l'objet de ce type
    /*
    new PremierDernierDlg(this.app, this.outilPointage, this.cible,
      this.info.infoParType[ind].premierVoisin, this.info.infoParType[ind].dernierVoisin, this.callBackOK)
     */
    new ChoixObjProchesDlg(app, this.outilPointage, this.cible, NatObj.conversionNumeroNature[ind], this.point,
      app.listeExclusion, this.deviceType, false, this.bMemeMasque, this.callBackOK)
  }
}
