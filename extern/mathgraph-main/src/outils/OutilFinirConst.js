/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CListeObjets from '../objets/CListeObjets'
import CPrototype from '../objets/CPrototype'
import NatCal from '../types/NatCal'
import NatObj from '../types/NatObjAdd'
import AvertDlg from '../dialogs/AvertDlg'
import ModifConstDlg from '../dialogs/ModifConstDlg'
export default OutilFinirConst

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilFinirConst (app) {
  // Attention : Pour cet outil le troisième pramètre est "CreationConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'CreationConst', -1, false, false, false, false)
}

OutilFinirConst.prototype = new Outil()

OutilFinirConst.prototype.select = function () {
  let i; let elb; let natureSources; const self = this
  const app = this.app
  const listePr = app.listePr
  const liste1 = new CListeObjets()
  const liste2 = new CListeObjets()
  // liste1 sera formée de tous les objets sources, objets non graphiques en premier
  liste1.ajouteElementsDe(app.listeSrcNG)
  liste1.ajouteElementsDe(app.listeSrcG)
  // liste2 sera formé de tous les objets finaux
  liste2.ajouteElementsDe(app.listeFinNG)
  liste2.ajouteElementsDe(app.listeFinG)
  // On réordonne la liste de tous les objets finaux
  liste2.reordonne(listePr)
  if (!this.verifieObjSrcTousUtilises(liste1, liste2)) {
    new AvertDlg(app, 'ErrConst', function () {
      self.app.activeOutilCapt()
    })
    return
  }

  const listeInterm = this.listeIntermediaires(liste1, liste2)
  // Comme on permet de désigner comme objet final un point libre qui figurait dans les objets sources,
  // Il faut les retirer de la liste des objets sources
  for (i = 0; i < liste1.longueur(); i++) {
    elb = liste1.get(i)
    if (elb.estDeNature(NatObj.NPointBase) && liste2.contains(elb)) {
      liste1.removeObj(elb)
      i-- // Car l'élément a été retiré de la liste
      app.listeSrcG.removeObj(elb)
    }
  }
  // Modification version 3.1.5 : Comme on peut maintenant choisir comme objet final une variable
  // à condition qu'elle ait d'abord été choisie dans les objets sources, il faut les retirer
  // de la liste des objets sources
  let aumoinsUneVariableRetiree = false
  for (i = 0; i < liste1.longueur(); i++) {
    elb = liste1.get(i)
    if (elb.estDeNatureCalcul(NatCal.NVariable) && liste2.contains(elb)) {
      liste1.removeObj(elb)
      i-- // Car l'élément a été retiré de la liste
      app.listeSrcNG.removeObj(elb)
      aumoinsUneVariableRetiree = true
    }
  }
  if (app.listeSrcNG.longueur() === 0) natureSources = CPrototype.graph
  else {
    if (app.listeSrcG.longueur() === 0) natureSources = CPrototype.calc
    else natureSources = CPrototype.mixtes
  }

  if (aumoinsUneVariableRetiree) {
    new AvertDlg(app, 'AvConst1', function () {
      self.finit(liste1, liste2, listeInterm, natureSources)
    })
  } else this.finit(liste1, liste2, listeInterm, natureSources)
}

OutilFinirConst.prototype.finit = function (liste1, liste2, listeInterm, natureSources) {
  let i; let elb
  const liste = new CListeObjets()
  const app = this.app
  const listePr = app.listePr
  // Attention : il ne faut pas réordonner les éléments sources car ceux
  // de type calcul doivent être désignés en premier
  liste.ajouteElementsDe(listeInterm)
  liste.ajouteElementsDe(liste2)
  liste.reordonne(listePr) // Important
  // On ajoute en tête de liste les éléments de liste1 (sources)
  for (i = liste1.longueur() - 1; i >= 0; i--) {
    elb = liste1.get(i)
    liste.insereElement(elb, 0)
  }
  const proto = new CPrototype(listePr, natureSources, liste1.longueur(), liste, liste2)
  new ModifConstDlg(app, proto, function () {
    app.doc.tablePrototypes.push(proto)
    app.reInitConst() // Pour réinitialiser la construction en cours
    app.activeOutilCapt()
  }, function () {
    app.activeOutilCapt()
    app.reInitConst() // Pour réinitialiser la construction en cours
  })
}

/**
 * fonction de classe renvoyant true si tous les éléments de la liste listeFinaux dépendent
 * bien de au moins un élément de la liste listeSources et false sinon
 * @param listeSources
 * @param listeFinaux
 * @returns {boolean}
 */
OutilFinirConst.prototype.verifieObjSrcTousUtilises = function (listeSources, listeFinaux) {
  for (let i = 0; i < listeSources.longueur(); i++) { if (!listeFinaux.depDe(listeSources.get(i))) return false }
  return true
}

OutilFinirConst.prototype.listeIntermediaires = function (listeSources, listeFinaux) {
  let i; let ind; let elb; let j; let el2
  const listePr = this.app.listePr
  const listeOb = new CListeObjets()
  listeOb.ajouteElementsDe(listeSources)
  const liste = new CListeObjets()
  const listeVariablesEtCalcConstInterm = new CListeObjets()
  // On rajoute à ListeOb les variables qui sont pas des objets sources
  // telles qu'il existe des objets dépendant  à la fois des objets sources
  // et de la variable et chacune des ces variables est rajoutée
  // à la liste des objets listo ainsi qu'à la liste des objets intermédiaires
  // Même chose avec les calculs intermédiaires contants dont dépend au moins un des objets finaux
  for (ind = 0; ind < listePr.longueur(); ind++) {
    elb = listePr.get(ind)
    if (elb.estDeNatureCalcul(NatCal.NVariable)) {
      if (!listeOb.contains(elb)) {
        for (j = 0; j < listeFinaux.longueur(); j++) {
          el2 = listeFinaux.get(j)
          if (el2.depDe(elb) && el2.dependDeAuMoinsUn(listeOb)) {
            if (!listeOb.contains(elb)) listeOb.add(elb)
            if (!listeVariablesEtCalcConstInterm.contains(elb)) listeVariablesEtCalcConstInterm.add(elb)
          }
        }
      }
    } else {
      if (elb.estDeNatureCalcul(NatCal.NTtCalcouFoncRouC)) {
        if (!listeOb.contains(elb)) {
          // CCalcul cal = (CCalcul) elb;
          // if (elb.estConstant()) { // Modifié version 6.3.0 pour outil de création de construction
          if (elb.estConstantPourConst()) {
            for (j = 0; j < listeFinaux.longueur(); j++) {
              el2 = listeFinaux.get(j)
              if (el2.depDe(elb) && el2.dependDeAuMoinsUn(listeOb)) {
                if (!listeOb.contains(elb)) listeOb.add(elb)
                if (!listeVariablesEtCalcConstInterm.contains(elb)) listeVariablesEtCalcConstInterm.add(elb)
              }
            }
          }
        }
      }
    }
  }

  // Il faut vérifier si les variables et calculs constants qui ont été rajoutés à la liste listeVariablesEtCalcConstInterm
  // sont bien indipensables.
  // C'est nécéssaire car par exemple si un repère a été créé avec comme point J l'image
  // d'un autre point par une rotation alors ce repère dépendra de la constante pi mais pourtant
  // cette constante n'a pas forcément à faire partie des objets intermédiaires.

  // Très important : il ne suffit pas d'aller jusqu'à l'élément qui précède le dernier
  // objet final car d'autres objets peuvent suivre entre celui-ci et le dernier
  // par exemple en cas de point lié à un bipoint
  const der = listeFinaux.get(listeFinaux.longueur() - 1)
  const indDernierFinal = listePr.indexOf(der)
  for (i = 0; i < indDernierFinal; i++) {
    elb = listePr.get(i)
    if (
      listeVariablesEtCalcConstInterm.contains(elb) ||
      (
        !listeOb.contains(elb) &&
        !listeFinaux.contains(elb) &&
        listeFinaux.depDe(elb) &&
        // Ligne suivante rajouté version 3.5.1 pour éviter que quand on choisit
        // comme objets sources des objets construits à partir d'autres
        // certains objets inutiles soient pris dans la liste d'objets intermédiaires
        (!(!listeSources.contains(elb) && listeSources.depDe(elb))) &&
        elb.estDefiniParObjDs(listeOb)
      )
    ) {
      liste.add(elb)
    }
  }
  liste.reordonne(listePr)
  return liste
}

OutilFinirConst.prototype.activationValide = function () {
  const app = this.app
  return app.listeFinNG.longueur() > 0 || app.listeFinG.longueur() > 0
}
