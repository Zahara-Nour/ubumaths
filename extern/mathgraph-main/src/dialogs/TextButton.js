/*
 * Created by yvesb on 13/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import $ from 'jquery'
import { addImg, ce } from 'src/kernel/dom'
import 'jquery-textrange'

export default TextButton

/**
 * Bouton servant à insérer un code LaTeX dans un textarea
 * this.container un élément de tableau td à insérer dans un tableau.
 * Ce td contient l'image proprement dit
 * @constructor
 * @param {MtgApp} app L'application propriétaire
 * @param nomFichier Nom du fichier image associé (sans suffixe, le fichier devant être un png)
 * @param chaineLatex Valeur de la chaîne LaTeX à insérer
 * @param textarea Le textarea dans lequel doit se faire l'insertion du conde LaTeX
 * @param decalage ce qu'il faut ajouter à la position du curseur après insertion
 * @param callBack fonction de callBack à appeler lors du clic après insertino du code
 */
function TextButton (app, nomFichier, chaineLatex, textarea, decalage, callBack) {
  this.chLatex = chaineLatex
  this.ta = textarea
  this.dec = decalage
  this.callBack = callBack
  const self = this
  const td = ce('td')
  this.container = td
  addImg(td, nomFichier, { width: 24, height: 24 })
  td.style.border = '1px solid lightgray'
  td.onclick = function () {
    self.onclick()
  }
}

TextButton.prototype.onclick = function () {
  const st = $(this.ta).val()
  const deb = $(this.ta).textrange('get', 'start')
  const fin = $(this.ta).textrange('get', 'end')
  const selection = st.substring(deb, fin)
  $(this.ta).val(st.substring(0, deb) + this.chLatex.substring(0, this.dec) + selection +
    this.chLatex.substring(this.dec) + st.substring(fin))
  $(this.ta).textrange('setcursor', deb + this.dec)
  this.callBack()
}
