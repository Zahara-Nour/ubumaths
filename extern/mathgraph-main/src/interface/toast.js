/**
 * @fileOverview
 * Un mini-module pour afficher des notifications qui s'effacent toute seules.
 * On utilise une lib externe, elle pourra changer (ou être remplacé par une implémentation maison plus légère)
 * https://www.npmjs.com/package/simple-notify (un peu gros, 130k pour ça…)
 * https://www.npmjs.com/package/toastify-js (80k quand même)
 * https://www.npmjs.com/package/cute-alert pas très populaire mais 57k
 * https://www.npmjs.com/package/butteruptoasts pas très populaire mais 28k (en fait bcp moins avec src only, un js et un css)
 * https://github.com/mickelsonmichael/js-snackbar existe pas dans npm
 * https://www.npmjs.com/package/@material/snackbar usine à gaz
 */

// on choisi butteruptoast car son code est très simple (un seul js et un seul css)
// et sera facile à reprendre si le module disparait ou si on veut l'adapter

// On pourrait envisager de faire un fork avec
// - virer ce qu'on utilisera pas (onClick, onRender, onTimeout, primaryButton, secondaryButton)
// - permettre un timeout par notif (pour autoriser un timeout 0 qui oblige à cliquer qqchose pour fermer)
// - ajouter une croix pour fermer (pour pouvoir fermer au clic ET copier/coller le message)

// Cf https://butteruptoast.com/ pour la syntaxe
import butterup from 'butteruptoasts'

import { getStr } from '../kernel/kernel'

import 'butteruptoasts/src/butterup.css'

const types = ['info', 'success', 'warning', 'error']
const defaultDelay = 3000
const errorDelay = 20_000

butterup.options.maxToasts = 5 // default 5
butterup.options.toastLife = defaultDelay // default 5000

export default function toast ({ title, message = '', type = 'success' }) {
  // check type valide
  if (!types.includes(type)) {
    console.error(Error(`Level ${types} invalide`))
    type = 'info'
  }
  // toujours en bas à droite
  const location = 'bottom-right'
  if (type === 'error') {
    // on augmente le timeout à 20s
    butterup.options.toastLife = errorDelay
    // et on le repasse ensuite à sa durée normale
    setTimeout(() => {
      butterup.options.toastLife = defaultDelay
    }, errorDelay)
  }
  butterup.toast({
    // si on le trouve pas ça râle en console mais au moins on affiche un truc (bien pratique pour debug iPad)
    title: getStr(title) || title,
    message: getStr(message) || message,
    type,
    icon: true,
    location,
    // on empêche de virer la notif au click (avant timeout) pour permettre de copier/coller le message
    dismissable: false,
  })
}
