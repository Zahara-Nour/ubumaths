/** @module lib/core/loadJqueryDialog */

// les imports dynamiques des css plaisent pas à l'éditeur
import 'jquery-ui/themes/base/base.css'
import 'jquery-ui/themes/base/theme.css'
import 'jquery-ui/themes/base/dialog.css'

// cf https://stackoverflow.com/questions/38417328/import-jquery-ui-and-jquery-with-npm-install

/**
 * Charge jQuery et le plugin dialog de jquery-ui avec leurs dépendances dans le bon ordre…
 * Lancé par mtgLoad, tous les `import 'jquery'` devrait ensuite retourner un jQuery avec dialog
 * @returns {Promise<JQueryUI>}
 */
export default async function loadJqueryDialog () {
  const { default: $ } = await import('jquery')
  // sans ça on a du `jQuery is not defined` dans dialog.js
  window.jQuery = $
  // noinspection JSConstantReassignment
  window.$ = $
  // ni de charger jquery-ui/ui/widget avant de charger dialog (ça donne du $.widget is not a function)
  await Promise.all([
    // on en profite pour charger ces deux trucs, qui n'ont rien à voir avec jquery-ui mais qui dépendent de jquery
    // et dont MtgApp a toujours besoin
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-textrange'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('../../outilsExternes/spectrum/spectrum.js'),
    // import('jquery-ui/dist/jquery-ui.min') // avec lui seul tout fonctionne, mais on charge tous les widgets… 330ko vs ~50
    // on se limite aux dépendances de https://api.jqueryui.com/dialog/
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/widget') // lui défini $.ui, il doit être chargé et exécuté avant d'en charger d'autres
  ])
  await Promise.all([
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/unique-id'), // sans lui l'appel de dialog() plante
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/widgets/button') // doit être chargé avant focusable
  ])
  await Promise.all([
    // et les morceaux de jquery-ui dont on a besoin
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/widgets/mouse'), // indispensable pour resizable
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/plugin'), // indispensable pour resizable
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/keycode'), // sinon ça plante dans des listeners de dialog
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/data'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/disable-selection'), // indispensable pour resizable
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/effect'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/tabbable'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/focusable'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/safe-active-element'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/position'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/scroll-parent'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/safe-blur'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/widgets/dialog'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/widgets/resizable'),
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui/ui/widgets/draggable'),
    // aj de https://www.npmjs.com/package/jquery-ui-touch-punch pour tenter de rendre les dialog draggable au touch
    // il a fallu le patcher car il utilise jQuery en global qui n'existe pas dans un import
    // @ts-ignore TS7016: Could not find a declaration file for module …
    import('jquery-ui-touch-punch')
      .then(m => m.default($))
  ])
  // await import('jquery-ui/ui/effects/effect-transfer')
  return $
}
