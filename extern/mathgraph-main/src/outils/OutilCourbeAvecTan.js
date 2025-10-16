/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import { getStr } from '../kernel/kernel'
import CCalcul from '../objets/CCalcul'
import CImplementationProto from '../objets/CImplementationProto'
import CMesureX from '../objets/CMesureX'
import CourbeAvecTanDlg from '../dialogs/CourbeAvecTanDlg'
import CourbeAvecTanCoefDlg from '../dialogs/CourbeAvecTanCoefDlg'
import CMesureY from 'src/objets/CMesureY'
import CValeur from 'src/objets/CValeur'
import CResultatValeur from 'src/objets/CResultatValeur'
import CMatrice from 'src/objets/CMatrice'

export default OutilCourbeAvecTan

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilCourbeAvecTan (app) {
  Outil.call(this, app, 'CourbeAvecTan', 32986, true)
}
OutilCourbeAvecTan.prototype = new Outil()

OutilCourbeAvecTan.prototype.select = function () {
  Outil.prototype.select.call(this)
  const self = this
  new CourbeAvecTanDlg(this.app, function (nbPoints, rep, bpoly, nbPointsCourbe) {
    self.suite(nbPoints, rep, bpoly, nbPointsCourbe)
  }, function () { self.app.activeOutilCapt() })
}

/**
 * Une fois que la boîte de dialogue demandant le repère et le nombre de points a été validé, cette fonction
 * est appelée avec le nombre de points demandés nbPoints et le repère rep en paramètres
 * @param {number} nbPoints le nombre de points (de 2 à 10)
 * @param {CRepere} rep le repère choisi
 * @param {boolean} bpoly true si on doit utiliser une fonction polynôme unique. Dans ce cas
 * @param {number} nbPointsCourbe le nombre de points de la courbe finale
 * on utilise un calcul polynomial au lieu de raccorder des sgements de fonctions polynômes du
 * troisème degré
 */
OutilCourbeAvecTan.prototype.suite = function (nbPoints, rep, bpoly, nbPointsCourbe) {
  this.nbPoints = nbPoints
  this.rep = rep
  this.bpoly = bpoly
  this.nbPointsCourbe = nbPointsCourbe
  const app = this.app
  const list = app.listePr
  // On crée maintenant nbPoints calculs qui contiendront les coefficients directeurs souhaités pour les tangentes
  this.coef = []
  // On crée un tableau qui contiendra des pointeurs sur les points cliqués qui n'étaient pas nommés
  this.ptsSansNom = []
  for (let i = 0; i < nbPoints; i++) {
    this.coef[i] = new CCalcul(list, null, false, list.genereNomPourCalcul('mt', true), '0')
    app.ajouteElement(this.coef[i])
  }
  // Maintenant on va attendre que l'utilisateur ait cliqué sur nnPoints
  this.nbPtsCliques = 0 // Ce nombre augmentera à chaque fois qu'on clique sur un point
  this.points = [] // Ce tableau contiendra des pointeurs sur les points cliqués
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  app.indication(getStr('indCourTan1') + '1' + getStr('indCourTan2'), '', true)
}

OutilCourbeAvecTan.prototype.traiteObjetDesigne = function (elg) {
  const self = this
  const app = this.app
  const list = app.listePr
  const nbPoints = this.nbPoints
  let j; let k; let w
  this.nbPtsCliques++
  this.points.push(elg)
  this.ajouteClignotementDe(elg)
  this.excluDeDesignation(elg)
  if (this.nbPtsCliques === 1) this.resetClignotement()
  // Si tous les points cont été désignés, on implémente la construction correspondant au nombre de points
  // puis on ouvre une boîte de dialogue permetteant de modifier les coefficients
  if (this.nbPtsCliques >= nbPoints) {
    const indImplementation = list.longueur()
    // On réordonne les points par ordre d'abscisse croissante
    // On affecte des noms aux points qui n'étaient pas nommés en les mémorisant de façon à supprimer le nom
    // si on abandonne l'outil lors de la boîte de dialogue de choix des coefficients
    const abs = []
    for (j = 0; j < nbPoints; j++) {
      abs[j] = new CMesureX(list, null, false, '', this.rep, this.points[j])
      abs[j].positionne()
    }
    for (j = 0; j < nbPoints - 1; j++) {
      for (k = j + 1; k < nbPoints; k++) {
        if (abs[k].abscisse < abs[j].abscisse) {
          w = abs[k]
          abs[k] = abs[j]
          abs[j] = w
          w = this.points[k]
          this.points[k] = this.points[j]
          this.points[j] = w
        }
      }
    }
    // Dans le cas où l'utilisateur annulerait on prépare un array this.ptsSansNom
    for (j = 0; j < nbPoints; j++) {
      if (this.points[j].nom === '') {
        this.ptsSansNom.push(this.points[j])
        this.points[j].nom = list.genereNomPourPoint()
        this.points[j].updateName(app.svg, true)
      }
    }
    // Suivant le choix d'utiliser une  seule fonction polynomiale ou non on utilise
    // une macro construction différente
    let impProto
    if (this.bpoly) {
      const proto = app.docConsAv.getPrototype('PolyParPtTan')
      // On crée des mesures d'abscisses de tous les points cliqués
      // On crée des mesures d'abscisses  et d'ordonnées pour chacun des points créés
      const tabmesabs = []
      const tabmesord = []
      for (let i = 0; i < nbPoints; i++) {
        const pt = this.points[i]
        if (pt.nom === '') {
          pt.donneNom(list.genereNomPourPointOuDroite('M', true))
          pt.nomMasque = true
        }
        const mesabs = new CMesureX(list, null, false,
          list.genereNomPourCalcul('mesx', true), this.rep, this.points[i])
        tabmesabs.push(mesabs)
        const mesord = new CMesureY(list, null, false,
          list.genereNomPourCalcul('mesy', true), this.rep, this.points[i])
        tabmesord.push(mesord)
        app.ajouteElement(mesabs)
        app.ajouteElement(mesord)
      }
      // On crée une matrice de deux colonnes formées des coordonnées mesurées
      // On crée une matrice de deux colonnes formées des mesures d'abscisses en première colonne
      // et d'ordonnées en deuxième
      const tabVal = []
      for (let i = 0; i < nbPoints; i++) {
        const lig = []
        for (let j = 0; j < 2; j++) {
          lig.push(new CValeur(list, new CResultatValeur(list, tabmesabs[i])))
          lig.push(new CValeur(list, new CResultatValeur(list, tabmesord[i])))
        }
        tabVal.push(lig)
      }
      const mat = new CMatrice(list, null, false, list.genereNomPourCalcul('matCoord', true),
        nbPoints, 2, tabVal)
      app.ajouteElement(mat)
      // On crée une matrice colonne contenant des CResultatValeur des calculs créés pour contenir les coefficients
      // directeurs des tangentes
      const tabValCoeff = []
      for (let i = 0; i < nbPoints; i++) {
        const lig = []
        tabValCoeff.push(lig)
        lig.push(new CValeur(list, new CResultatValeur(list, this.coef[i])))
      }
      const matcoef = new CMatrice(list, null, false, list.genereNomPourCalcul('matCoef', true),
        nbPoints, 1, tabValCoeff)
      app.ajouteElement(matcoef)
      proto.get(0).elementAssocie = mat
      proto.get(1).elementAssocie = matcoef
      impProto = new CImplementationProto(list, proto)
      impProto.implemente(app.dimf, proto)
      impProto.nomProto = getStr('CourbeAvecTan')
      // La construction produit comme objets finaux une matrice colonne formée des coefficients
      // du polynôme et une fonction
      // Il faut en plus rajouter la courbe de cette fonction
      // Dernier paramètre false car pas de gestion auto des discontinuités
      app.ajouteCourbeSurR(this.rep, list.get(list.longueur() - 1),
        list.genereNomPourPointOuDroite('x', true),
        list.genereNomPourCalcul('x', true),
        list.genereNomPourCalcul('y', true),
        this.nbPointsCourbe, true, true, false)
    } else {
      const proto = app.docConsAv.getPrototype('CourbeAvecTgte' + nbPoints)
      proto.get(0).elementAssocie = this.rep
      for (j = 0; j < nbPoints; j++) proto.get(j + 1).elementAssocie = this.coef[j]
      for (j = 0; j < nbPoints; j++) proto.get(j + nbPoints + 1).elementAssocie = this.points[j]
      impProto = new CImplementationProto(list, proto)
      impProto.implemente(app.dimf, proto)
      impProto.nomProto = getStr('CourbeAvecTan')
      const lieu = impProto.premierFinal(NatObj.NLieu)
      lieu.infoLieu.nombreDePoints = this.nbPointsCourbe
      lieu.donneCouleur(app.getCouleur())
      lieu.donneStyle(app.getStyleTrait())
    }
    const indImpProto = list.indexOf(impProto)
    list.positionne(false, app.dimf)
    list.setReady4MathJax()
    list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
    new CourbeAvecTanCoefDlg(this.app, this.coef, this.points, list.longueur() - 1,
      function () {
        self.annuleClignotement()
        app.outilCourbeAvecTan.saveFig()
        // Ligne suivnat  à appeler dès qu'on crée des objets en implémentant une macro construction
        if (app.estExercice) app.listePourConst = app.listePourConstruction()
        app.activeOutilCapt()
      }, function () {
        self.annuleClignotement()
        // Il faut enlever les noms des points qui avaient été nommés
        for (j = 0; j < self.ptsSansNom.length; j++) {
          self.ptsSansNom[j].nom = ''
          self.ptsSansNom[j].updateName(app.svgFigure, true)
        }
        // Il faut détruire tout ce qui avait été rajouté
        list.removegElements(app.svgFigure, this.interm, indImpProto)
        app.detruitDerniersElements(list.longueur() - indImplementation + self.nbPoints)
        app.activeOutilCapt()
      })
  } else app.indication(getStr('indCourTan1') + String(this.nbPtsCliques + 1) + getStr('indCourTan2'), '', true)
}

OutilCourbeAvecTan.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NRepere) > 0) && (list.nombreObjetsParNatureVisibles(NatObj.NTtPoint) > 2)
}

OutilCourbeAvecTan.prototype.isLineTool = function () {
  return true
}
