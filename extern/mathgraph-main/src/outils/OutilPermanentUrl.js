/*
 * Created by yvesb on 16/04/2017.
 */
import toast from 'src/interface/toast'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilPermanentUrl

/**
 * Outil pour copier l'url pérenne dans le presse-papiers, mis dans app.outilPermanentUrl
 * @param {MtgApp} app
 * @constructor
 */
function OutilPermanentUrl (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'PermanentUrl', -1, false, false, false, false)
}

OutilPermanentUrl.prototype = new Outil()

OutilPermanentUrl.prototype.select = function () {
  const url = this.app.getPermanentUrl()
  // on est dans le listener, on peut appeler ça en sync ça doit marcher sur iPad
  navigator.clipboard.writeText(url)
    .then(() => {
      toast({ title: 'PermanentUrlCopyOk' })
    })
    .catch(error => {
      console.error(error)
      toast({ title: 'PermanentUrlCopyKo', message: error.message, type: 'error' })
    })
}
