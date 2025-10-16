/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTransformation from '../objets/CTransformation'
import ChoixModificationImageDlg from '../dialogs/ChoixModificationImageDlg'
export default CTransformation

/**
 * Fonction utilisée dans le protocole de la figure et renvoyant true si l'objet peut figurer
 * dans la boîte de dialogue de protocole de la figure.
 * Seulement redéfini pour CBipoint
 * @returns {boolean}
 */
CTransformation.prototype.estVisibleDansHist = function () {
  return true
}

// Fonction à redéfinir pour les descendants
CTransformation.prototype.complementInfo = function () {
  return ''
}

CTransformation.prototype.infoHist = function () {
  return this.complementInfo()
}

CTransformation.prototype.imageModifiableParMenu = function () {
  return false
}

// Modifié version 4.9.9. Renvoie true si une modification a effectivement eu lieu
// Modifié version 5.1.3.
// Ajout d'un troisième paramètre bEnregistrement.
// Si ce paramètre est true, l'état de la figure est enregistré après la modification
// Lorsque cette fonction est appelée par ProtocoloDlg certains points ont été nommés et la figure ne doit pas être enregistée à ce niveau.
CTransformation.prototype.modificationImage = function (app, image, bEnregistement) {
  const liste = app.listePr
  const nbImages = liste.nombreImagesParTransformation(this)
  const self = this
  if (nbImages === 1) {
    // Une seule image pour cette transformation
    // On appelle le dialogue que fournit cette transformation pour se modifier
    this.modifDlg(app, function () {
      self.callBack0(app, bEnregistement, function () {
        app.outilActif.reselect()
      }
      )
    }, function () {
      app.outilActif.reselect()
    })
  } else {
    new ChoixModificationImageDlg(app, function () { self.callBack1(app, bEnregistement) }, function () { self.callBack2(app, image) })
  }
}

CTransformation.prototype.modificationImageForProtocol = function (app, image, callBack, onCancel = null) {
  this.modifDlg(app, callBack, onCancel)
}

/**
 * Fonction appelée par le dialogue dans le cas où il n'y a qu'une image par la transformation
 */
CTransformation.prototype.callBack0 = function (app, bEnregistrement, callBack = null) {
  const list = app.listePr
  list.initialiseDependances()
  list.positionneDependantsDe(false, app.dimf, this, true)
  list.updateDependants(this, app.svgFigure, app.doc.couleurFond, true)
  if (bEnregistrement) app.outilActif.saveFig()
  if (callBack !== null) callBack()
}

// Attention : Il faut passer le paramètre app à cause du cas des translations qui rajoutent un vecteur virtuel
/**
 * Fonction ajoutant à la liste list des éléments montrant quels sont les objets avec lesquels l'objet a été construit
 * Pour les translations définies par origine et extrémité on rajoute en particulier un vecteur clignotant
 * @param {CListeObjets} list La liste clignotante à laquelle ajouter les objets antécédents
 * @param {MtgApp} [app] L'application propriétaire. Ce paramètre ne sert que pour les translations
 */
CTransformation.prototype.ajouteAntecedents = function (list, app) {
}

/**
 * Fonction appelée par le dialogue dans le cas où l'utilisateur a choisi que la modification de la transformation
 * s'applique à tous les objets images.
 */
CTransformation.prototype.callBack1 = function (app, bEnregistrement) {
  const self = this
  this.modifDlg(app, function () {
    self.callBack0(app, bEnregistrement, function () {
      app.outilActif.reselect()
    })
  }, function () {
    app.outilActif.reselect()
  })
}

/**
 * Fonction appelée par le dialogue dans le cas où l'utilisateur a choisi que la modification de la transformation
 * s'applique au seul objet cliqué.
 */
CTransformation.prototype.callBack2 = function (app, image) {
  const self = this
  const list = this.listeProprietaire
  const transclone = this.getClone(list, list)
  app.insereElement(transclone, list.indexOf(this) + 1)
  transclone.modifDlg(app, function () { self.callBack3(app, image, transclone) }, function () { self.callBack4(app, transclone) })
}

CTransformation.prototype.callBack3 = function (app, image, transclone) {
  const list = app.listePr
  list.initialiseDependances()
  list.updateIndexes()
  image.associeATransformation(transclone)
  list.positionneDependantsDe(false, app.dimf, transclone, true)
  list.updateDependants(transclone, app.svgFigure, app.doc.couleurFond, true)
  app.outilActif.reselect()
  // A revoir pour eercice de construction
}

CTransformation.prototype.callBack4 = function (app, transclone) {
  app.detruitElement(transclone) // Pour retirer la transformation clone ajoutée
  app.listePr.updateIndexes()
}
