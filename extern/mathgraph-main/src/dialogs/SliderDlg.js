/*
 * Created by yvesb on 12/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ceIn } from 'src/kernel/dom'
import MtgDlg from './MtgDlg'
import { addInput } from './dom'

export default SliderDlg

/**
 * @param {MtgApp} app
 * @param {Slider} slider
 * @constructor
 * @extends MtgDlg
 */
function SliderDlg (app, slider) {
  MtgDlg.call(this, app, 'sliderDlg')
  this.slider = slider
  // on ajoute un form parce que c'est plus propre (de mettre les input dans un form)
  // et pour laisser le navigateur gérer la touche entrée
  const form = ceIn(this.div, 'form', { style: 'display:flex; flex-direction:column; align-items:center;' })
  const input = addInput({
    container: form,
    label: '( ' + slider.min + ' → ' + slider.max + ' )',
    attrs: {
      size: 5, // 4 pas assez grand pour iPad
      type: 'number',
      min: slider.min,
      max: slider.max,
      // on met 1 (indépendamment de slider.step qui sert au clic à gauche et à droite du slider)
      // pour laisser saisir n'importe quel entier entre min & max
      step: 1,
      value: slider.val,
    }
  })
  form.onsubmit = (ev) => {
    ev.preventDefault() // on veut pas de post http (ni de get)
    this.OK()
  }
  this.input = input
  this.create(slider.textCode, 400)
}

SliderDlg.prototype = new MtgDlg()

SliderDlg.prototype.onOpen = function () {
  // on appelle pas la méthode parente, pour laisser le clavier numérique éventuel de la tablette s'afficher
  setTimeout(() => {
    this.input.focus()
    // setSelectionRange marche pas sur un type number, faut utiliser select(),
    // mais pas sûr que ça fonctionne sur iPad…
    this.input.select()
    // Si ça fonctionne pas partout, on peut tricher avec
    // this.input.type = 'text'
    // this.input.setSelectionRange(0, this.input.value.length)
    // this.input.type = 'number'
  })
}

SliderDlg.prototype.OK = function () {
  const nb = parseInt(this.input.value)
  this.slider.update(nb)
  this.destroy()
}
