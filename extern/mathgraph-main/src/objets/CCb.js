/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import COb from './COb'
import Ope from '../types/Ope'
import Opef from '../types/Opef'
import CCbGlob from '../kernel/CCbGlob'
import NatCal from 'src/types/NatCal'

// parmi toutes ces dépendances, on ne peut pas charger ici tous les objetTruc qui ont du
// objetTruc.prototype = new CCb()
// on commente ici et redéclare dans les méthodes qui les utilisent
// et qui pourraient peut-être passer dans un module séparé

// import CAppelFonction from './CAppelFonction'
// import CAppelFonctionComplexe from './CAppelFonctionComplexe'
// import CAppelFonctionNVar from './CAppelFonctionNVar'
// import CAppelFonctionComplexeNVar from './CAppelFonctionComplexeNVar'
// import CAppelFonctionInterne from './CAppelFonctionInterne'
// import CAppelFonctionInterneNVar from './CAppelFonctionInterneNVar'
// import CConstante from './CConstante'
// import CConstantei from './CConstantei'
// import CFonction from './CFonction'
// import CFonction2Var from './CFonction2Var'
// import CFonction3Var from './CFonction3Var'
// import CIntegraleDansFormule from './CIntegraleDansFormule'
// import CMoinsUnaire from './CMoinsUnaire'
// import COp from './COperation'
// import CProduitDansFormule from './CProduitDansFormule'
// import CPuissance from './CPuissance'
// import CResultatValeur from './CResultatValeur'
// import CResultatValeurComplexe from './CResultatValeurComplexe'
// import CVariableFormelle from './CVariableFormelle'
// import CSommeDansFormule from './CSommeDansFormule'
// import CCbNull from './CCbNull'

export default CCb

/**
 * Classe ancêtre de tous les objets de type calcul pouvant être utilisés dans un arbre binaire de calcul.
 * @constructor
 * @extends COb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 */
function CCb (listeProprietaire) {
  if (arguments.length === 0) {
    COb.call(this)
  } else {
    COb.call(this, listeProprietaire)
    // Ajout version 4.8 pour optimiser la fonction depDe
    this.elementTestePourDependDe = null
    this.dependDeElementTeste = false
  }
}

CCb.prototype = new COb()
CCb.prototype.constructor = CCb
CCb.prototype.superClass = 'COb'
CCb.prototype.className = 'CCb'

/**
 * Fonction donnant la nature du calcul à redéfinir pout tous les descendants sauf CCbNull
 * @returns {number}
 */
CCb.prototype.nature = function () {
  return 0
}
// Ajout version 4.8
/**
 * Fonction mémorisant la dépendance de l'objet par rapport à une objet déjà testé
 * @param {boolean} resultat
 * @returns {boolean}
 */
CCb.prototype.memDep = function (resultat) {
  this.dependDeElementTeste = resultat
  return resultat
}

/**
 * Fonction rendant une chaîne de caractères représentant le calcul représenté
 * par this qui est un arbre binaire de calcul.
 * A redéfinir pour les desdendants.
 * Utiliser plutôt chaineCalculSansPar car le résultat peut contenir des parenthèses.
 * @param {string[]|null} variablesFormelles  Un tableau représentant les variables formelles
 * pour une fonction de plusieurs variables.
 * @returns {string}
 */
CCb.prototype.chaineCalcul = function (variablesFormelles = null) {
  return ''
}
/**
 * Fonction rendant une chaîne de caractères sans parenthèses externes
 * représentant le calcul représenté  * par this qui est un arbre binaire de calcul.
 * A redéfinir pour les desdendants.
 * @param {string[]} variablesFormelles  Un tableau représentant les variables formelles
 * pour une fonction de plusieurs variables.
 * @returns {string}
 */
CCb.prototype.chaineCalculSansPar = function (variablesFormelles) {
  return this.chaineCalcul(variablesFormelles)
}
/**
 * Sert à reconstituer une formule LaTeX à partir de son arbre binaire
 * conjointement à chaineLatexSansPar A redéfinir pour les descendants
 */
/**
 * Fonction rendant une chaîne de caractères représentant en laTeX le calcul représenté
 * par this qui est un arbre binaire de calcul.
 * A redéfinir pour les desdendants.
 * Utiliser plutôt chaineLatexSansPar car le résultat peut contenir des parenthèses.
 * @param {string[]} variablesFormelles  Un tableau représentant les variables formelles
 * pour une fonction de plusieurs variables.
 * @param {boolean} fracSimple true si les fractions doivent être représentées avec un \frac
 * sinon elles sont représentées par un \dfrac
 * Par exemple pour un exposant, on passe fracsimple à true pour que les exposants ne soient pas trop gros
 * @returns {string}
 */
CCb.prototype.chaineLatex = function (variablesFormelles, fracSimple = false) {
  return this.chaineCalcul(variablesFormelles, fracSimple)
}
/**
 * Sert à reconstituer une formule à partir de son arbre binaire conjointement
 * à chaineCalcul A redéfinir pour les descendants
 */
/**
 * Fonction rendant une chaîne de caractères sans parenthèses externes
 * représentant en laTeX le calcul représenté
 * par this qui est un arbre binaire de calcul.
 * A redéfinir pour les desdendants.
 * @param {string[]} variablesFormelles  Un tableau représentant les variables formelles
 * pour une fonction de plusieurs variables.
 * @param {boolean} fracSimple true si les fractions doivent être représentées avec un \frac
 * sinon elles sont représentées par un \dfrac
 * Par exemple pour un exposant, on passe fracsimple à true pour que les exposants ne soient pas trop gros
 * @returns {string}
 */
CCb.prototype.chaineLatexSansPar = function (variablesFormelles, fracSimple = false) {
  return this.chaineLatex(variablesFormelles, fracSimple)
}
/**
 * Renvoie true si le calcul est constant (c'est-à-dire nn'utilise pas de valeurs
 * dynamiques) sans faire appel à la fonction Rand().
 * @returns {boolean}
 */
CCb.prototype.estConstant = function () {
  return false
}
/**
 * Fonction renvoyant true si this est un calcul constant renvoyant la valeur 0.
 * Redéfinit dans CConstante.
 * @returns {boolean}
 */
CCb.prototype.estConstante0 = function () {
  return false
}
/**
 * Fonction renvoyant true si le calcul existe.
 * A redéfinir pour les descendants.
 * existe prend un paramètre boolean infoRandom
 * C'est dû à l'optimisation de la fonction de 3 variables si(test,
 * valeurSiVrai, valeurSiFaux) qui nécessite de connaître la valeur
 * du premier argument test pour savoir si le résultat existe ou non. Si test
 * renvoie 1, existe renvoie valeurSiVrai.existe(inforRandom)
 * et sinon ValeurSiFaux.existe(infoRandom)
 * @returns {boolean}
 */
CCb.prototype.existe = function () {
  return true
}
/**
 * Fonction à redéfinir pour tous les descendants.
 * Renvoie un clone de l'objet, listeSource étant la liste propriétaire de l'objet
 * et listeCible la liste propriétaire du clone à créer.
 * @param {CListeObjets} listeSource  La liste propriétaire de l'objet
 * @param {CListeObjets} listeCible  La liste propriétaire de l'objet clone à céer.
 * @returns {CCb}
 */
CCb.prototype.getClone = function (listeSource, listeCible) {
  return null
}
/**
  * Fonction à redéfinir pour tous les descendants.
  * Renvoie une copie conforme de l'objet dans sa liste propriétaire.
  * Utilisé dans les calculs de dérivées.
 * @returns {CCb}
 */
CCb.prototype.getCopie = function () {
  return null
}
// Revu par rapport à la version Java : Paramètre infoRandom supprimé car inutilisé
/**
 * Fonction utilisée pour savoir si une fonction utilisateur existe.
 * Est différent de existe à cause de la fonction de 3 variables si(test, valeurSiVrai, valeurSiFaux)
 * @returns {boolean}
 */
CCb.prototype.existePourFonc = function () {
  return this.existe()
}

/**
 * Fonction servant pour les fonctions à savoir quel est le nombre de variables.
 * @returns {number}
 */
CCb.prototype.nombreVariables = function () {
  return 0
}
/**
 * Fonction renvoyant le résultat du calcul.
 * A redéfinir pour les descendants.
 * @param {Boolean } infoRandom  true si les calculas aléatoires avec rand
 * @returns {number}
 */
CCb.prototype.resultat = function (infoRandom) {
  throw new Error('Appel de Ccb.resultat')
}
// Ajout version 6.7
/**
 * Renvoie un résultat qui est soit un nombre soit soir une matrice réelle sous forme de tableau
 * @param infoRandom
 * @returns {number}
 */
CCb.prototype.resultatMat = function (infoRandom) {
  return this.resultat(infoRandom)
}
// Ajout pour la version 2.0 calculs sur les complexes.
// Le résultat est renvoyé dans z
/**
 * Fonction renvoyant dans zRes le résultat d'un calcul complexe.
 * A redéfinir pour les descendnats.
 * @param {boolean} infoRandom  true si les calculs aléatoires avec rand
 * @param {Complexe} zRes  Le résultat complexe du calcul
 * @returns {void}
 */
CCb.prototype.resultatComplexe = function (infoRandom, zRes) {
  zRes.x = this.resultat(infoRandom)// Par défaut on suppose le calcul réel
  zRes.y = 0
}
/**
 * Appelé lors des appels de fonctions pour fournir le résultat du calcul.
 * A redéfinir pour les descendants.
 * @param {boolean} infoRandom  true si les calculas aléatoires avec rand
 * @param {number[]|string[]} valeurparametre  un tableau donnant les valeurs des paramètres pour une
 * fonction de une ou plusieurs variables.
 * @returns {number}
 */
CCb.prototype.resultatFonction = function (infoRandom, valeurparametre) {
  return this.resultat(infoRandom)
}
/**
 * Appelé lors des appels de fonctions pour fournir le résultat complexe du calcul.
 * A redéfinir pour les descendants.
* @param {boolean} infoRandom  true si les calculas aléatoires avec rand
 * @param {number[]|string[]} valeurParametre  un tableau donnant les valeurs des paramètres pour une
 * @param {Complexe} zRes  Le complexe contenant le résultat.
 * @returns {void}
 */
CCb.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre,
  zRes) {
  this.resultatComplexe(infoRandom, zRes)
}

CCb.prototype.initialisePourDependance = function () {
  this.elementTestePourDependDe = null
  this.elementTestePourDependDePourRec = null
}

/**
 * Fonction renvoyant true si le calcul dépend de p.
 * A redéfinir pour les descendants.
 * @param {CElementBase} p
 * @returns {boolean}
 */
CCb.prototype.depDe = function (p) {
  this.elementTestePourDependDe = p
  return false
}
/**
 * La fonction suivante renverra le même résultat que DepDe sauf dans le
 * cas où le calcul fait réferrence à la fonction Rand de génération d'un
 * nombre aléatoire
 * @param {CElementBase} p
 * @returns {boolean}
 */
CCb.prototype.dependDePourBoucle = function (p) {
  return false
}

// La possibilité que ind soit égalà à -1 a été rajoutée version 6.4.8.
// Sert à tester la dépendance par rapport à toute variable formelle
/**
 * Fonction renvoyant true si l'arbre pointé par this contient un appel de variable
 * formelle, ind étant l'indice de la variable pour une fonction de plusieurs variables ou -1 si
 * on teste la dépendance par rapport à toute variable.
 * A redéfinir pour tous les descendants.
 * @param {number} ind  Indice de la variable pour les fonctions à plusieurs variables.
 * @returns {boolean}
 */
CCb.prototype.dependDeVariable = function (ind) {
  return false // Redéfini pour les descendants
}

/**
 * Fonction qui renvoie le calcul équivalent à this dans lequel les apple de gauche(), left(), si()
 * et les appels de fonctions internes sont remplacés pas leur formule effective
 * Utilisé dans les exercices de calcul pour évaluer la réponse d'un élève
 * @returns {CCb}
 */
CCb.prototype.getCore = function () {
  return this
}

// Ajout version 6.3.4 pour traiter de la même façon la commutativité des opérateurs +,* & et |
/**
 * Ajoute à liste toutes les opérandes d'opérateur de nature natop
 * Est utilisé pour les opérateurs commutatifs: addition, multiplication, ou et et logique
 * @param liste
 * @param natop
 */
CCb.prototype.ajouteOperateursParNat = function (liste, natop) {
  const nat = this.nature()
  if (nat === CCbGlob.natOperation) {
    if (this.ope === natop) {
      this.operande1.ajouteOperateursParNat(liste, natop)
      this.operande2.ajouteOperateursParNat(liste, natop)
    } else { liste.push(this) }
  } else { liste.push(this) }
}

/**
 * Fonction fournissant un calcul dans lequel tous les CResultatValeur
 * et CResultatValeurComplexes sont remplacés par une constante dont la valeur
 * est le résultat du CResultatValeur ou CResultatValeurComplexes.
 * Versionn 6.7 : On rajoute un paramètre booléen bfrac. Si celui-ci est faux, les valeurs non
 * entières seront remplacées par un quotient correspondant à la fraction continue équivalente
 * à 10^(-12) près.
 * @param {boolean} bfrac
 * @returns {CCb}
 */
CCb.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return this
}
/**
 * Renvoie un calcul normalisé équivalent au calcul this.
 * Si rempval est true les appels à des CResultatValeur ou CResultatValeurComplexe
 * sont remplacés par une constante.
 * @param {boolean} rempval si true les multiplications et divisions par 1 sont supprimées (pour les multiplications
 * elles ne sont supprimées que si eliminMult1 est à true
 * @param {boolean} sousdivnorm  Si true, les soustractions sont remplacées par des additions d'opposés et les divisions pas des multiplications par l'inverse.
 * @param {boolean} rempDecParFrac  Si, true, les nombres décimaux (avec au plus 9 décimales) et la fraction irréductible
 * qui les représentent sont considérés comme équivalents.
 * @param {boolean} eliminMult1 si false, quand rempval est true, les multiplications par 1 ne sont pas éliminées
 * @returns {CCb}
 */
CCb.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  // Dans les autres cas on renvoie le même calcul pour les objets ne redéfinissant pas cette fonction (version 6.4.7)
  return this
}

/**
 * Fonction renvayant true si this est équivalent à calc
 * Deux calculs sont équivalents s'ils contiennent les mêmes opérateurs
 * sans tenier compte de l'odre des additions algébriques ou des multiplications.
 * Avant appel, this et calc doivent avoir été normalisés de façon
 * que this et calc ne contiennent que des additions et divisions.
 * @param {CCb} calc  le calcul dont on teste l'équivalence avec this.
 * @returns {boolean}
 */
CCb.prototype.estEquivalentA = function (calc) {
  const nat1 = this.nature()
  const nat2 = calc.nature()
  if (nat1 !== nat2) { return false }
  if (nat1 === CCbGlob.natConstante) {
    return this.valeur === calc.valeur
  }
  if (nat1 === CCbGlob.natMoinsUnaire) {
    return this.operande.estEquivalentA(calc.operande)
  }
  if (nat1 === CCbGlob.natFonction) {
    return (Opef.estEquivalent(this.opef, calc.opef)) && this.operande.estEquivalentA(calc.operande)
  }
  if (nat1 === CCbGlob.natAppelFonction) {
    // Correction version 6.4.8
    // Si on compare deux CintegraleDansFormule, ce sont les formules des fonctions à inétgerer qu'il faut comparer
    // car la fonction interne a été dupliquée.
    // return (this.fonctionAssociee === calc.fonctionAssociee) && this.operande.estEquivalentA(calc.operande)
    // Version 7.4.4 : Attention un appel de fonction est aussi utilisé pour les suites récurrentes
    // et les suites récurrentes ne sont pas définies par un calcul
    if ((this.fonctionAssociee === calc.fonctionAssociee) && this.operande.estEquivalentA(calc.operande)) return true
    else {
      if (this.fonctionAssociee.estDeNatureCalcul(NatCal.NTteSuiteRec)) return false
      return (this.fonctionAssociee.calcul.estEquivalentA(calc.fonctionAssociee.calcul)) && this.operande.estEquivalentA(calc.operande)
    }
  }
  if (nat1 === CCbGlob.natFonction2Var) {
    return (this.opef === calc.opef) && this.operande1.estEquivalentA(calc.operande1) &&
        this.operande2.estEquivalentA(calc.operande2)
  }
  if (nat1 === CCbGlob.natFonction3Var) {
    return (this.opef === calc.opef) && this.operande1.estEquivalentA(calc.operande1) &&
        this.operande2.estEquivalentA(calc.operande2) &&
        this.operande3.estEquivalentA(calc.operande3)
  }
  if (nat1 === CCbGlob.natAppelFonctionNVar) {
    if (this.fonctionAssociee !== calc.fonctionAssociee) return false
    // Correction version 6.3.3
    /*
    var op1 = new Array(this.nbVar);
    for (var i = 0; i < this.nbVar; i++)
      op1[i] = this.operandes[i];
    var op2 = new CCb[calc.nbVar];
    for (i = 0; i < calc.nbVar; i++)
      op2[i] = calc.operandes[i];
    var res = true;
    for (i = 0; i < this.nbVar; i++)
      res = res && op1[i].estEquivalentA(op2[i]);
    */
    let res = true
    // Ligne suivante optimisée version 6.4.1
    // for (var i = 0; i < this.nbVar; i++) { res = res && this.operandes[i].estEquivalentA(calc.operandes[i]) }
    for (let i = 0; (i < this.nbVar) && res; i++) { res = res && this.operandes[i].estEquivalentA(calc.operandes[i]) }
    return res
  }
  if (nat1 === CCbGlob.natVariableFormelle) {
    // CVariableFormelle for1 = (CVariableFormelle) this;
    // CVariableFormelle for2 = (CVariableFormelle) calc;
    return this.indvar === calc.indvar
  }
  if (nat1 === CCbGlob.natOperation) {
    // COperation op1 = (COperation) this;
    // COperation op2 = (COperation) calc;
    const natop1 = this.ope
    const natop2 = calc.ope
    if (natop1 !== natop2) {
      if (natop1 === Ope.InfOuEgal) {
        // a <= b équivalent à b>= a)
        if (natop2 === Ope.SupOuEgal) { return (this.operande1.estEquivalentA(calc.operande2) && this.operande2.estEquivalentA(calc.operande1)) } else return false // Rajouté version 4.7.2
      } else {
        if (natop1 === Ope.Inf) {
        // a < b équivalent à b > a)
          if (natop2 === Ope.Sup) { return (this.operande1.estEquivalentA(calc.operande2) && this.operande2.estEquivalentA(calc.operande1)) } else return false // Rajouté version 4.7.2
        } else {
          if (natop1 === Ope.SupOuEgal) {
            // a >= b équivalent à b <= a)
            if (natop2 === Ope.InfOuEgal) { return (this.operande1.estEquivalentA(calc.operande2) && this.operande2.estEquivalentA(calc.operande1)) } else return false // Rajouté version 4.7.2
          } else {
            if (natop1 === Ope.Sup) {
              // a > b équivalent à b < a)
              if (natop2 === Ope.Inf) { return (this.operande1.estEquivalentA(calc.operande2) && this.operande2.estEquivalentA(calc.operande1)) } else return false // Rajouté version 4.7.2
            } else return false
          }
        }
      }
    }
    // Les deux opérateurs sont les mêmes
    // Modification version 6.3.4 pour traiter de la même façon la commutativité des opérateurs +,* & et |
    if (natop1 === Ope.Plus || natop1 === Ope.Mult || natop1 === Ope.Or || natop1 === Ope.And) {
      // Si l'opérateur est une addition, multiplication, ou ou et logique, il faut vérifier que tous les opérandes sous-jascents sont
      // équivalents pour tenir compte de la commutativité de ces opérateurs
      const list1 = []
      const list2 = []
      this.ajouteOperateursParNat(list1, natop1)
      calc.ajouteOperateursParNat(list2, natop1)
      if (list1.length !== list2.length) return false
      for (let i = 0; i < list1.length; i++) {
        const c1 = list1[i]
        let trouve = false
        for (let j = 0; j < list2.length; j++) {
          const c2 = list2[j]
          if (c1.estEquivalentA(c2)) {
            trouve = true
            list2.splice(j, 1)
            break
          }
        }
        if (!trouve) { return false } else {
          list1.splice(i, 1)
          i-- // Car le terme d'indice i a été retiré
        }
      }
      return true
    }
    // a = b équivalent à b = a
    if ((natop1 === Ope.Egalite) || (natop1 === Ope.And) || (natop1 === Ope.Or)) {
      return (this.operande1.estEquivalentA(calc.operande1) && this.operande2.estEquivalentA(calc.operande2)) ||
          (this.operande1.estEquivalentA(calc.operande2) && this.operande2.estEquivalentA(calc.operande1))
    }
    // Dans les autres cas (division comprise, pour être équivalent les
    // opérandes respectifs
    // doivent être équivalents
    return (this.operande1.estEquivalentA(calc.operande1)) &&
        (this.operande2.estEquivalentA(calc.operande2))
  }
  if (nat1 === CCbGlob.natPuissance) {
    return (this.operande.estEquivalentA(calc.operande) && this.exposant.estEquivalentA(calc.exposant))
  }
  if (nat1 === CCbGlob.natConstantei) return true
  if (nat1 === CCbGlob.natResultatValeur) {
    return this.valeurAssociee === calc.valeurAssociee // Attention test d'identité en JavaScript
  }
  if (nat1 === CCbGlob.natResultatValeurComplexe) {
    return this.valeurAssociee === calc.valeurAssociee
  }
  if (nat1 === CCbGlob.natIntegraleDansFormule) {
    return this.calculASommer.estEquivalentA(calc.calculASommer) && this.bornea.estEquivalentA(calc.bornea) &&
      this.borneb.estEquivalentA(calc.borneb)
  }
  return false
}
/**
 * Renvoie true si this est un produit factorisé par calc ou simplement équivalent à calc
 * ou à son opposé.
 * Avant appel, this et calc doivent être rendus normalisés pour pouvoir reconnaître
 * les réductions au même dénominateur.
 * @param {CCb} calc  Le calcul dont on etste si c'est un facteur commun à this.
 * @returns {boolean}
 */
CCb.prototype.estFactorisePar = function (calc) {
  let list1, list2, i, j, c1, c2, trouve
  const nat1 = this.nature()
  if (nat1 === CCbGlob.natMoinsUnaire) {
    return this.operande.estFactorisePar(calc)
  } else {
    if (nat1 === CCbGlob.natOperation) {
      // COperation op1 = (COperation) this;
      const natop1 = this.ope
      if ((natop1 === Ope.InfOuEgal) || (natop1 === Ope.Inf) || (natop1 === Ope.SupOuEgal) || (natop1 === Ope.Sup) ||
          (natop1 === Ope.Egalite) || (natop1 === Ope.Diff)) {
        return ((this.operande1.estFactorisePar(calc) && this.operande2.estConstante0()) || (this.operande2.estFactorisePar(calc) && this.operande1.estConstante0()))
      }
      if (natop1 === Ope.Mult) {
        // Il faut vérifier si un des facteurs du produit et des facteurs sous-jascents est équivalent à calc
        list1 = []
        list2 = []
        this.ajouteOperateursParNat(list1, Ope.Mult)
        const nat2 = calc.nature()
        if (nat2 !== CCbGlob.natOperation) list2.push(calc)
        else {
          const natop2 = calc.ope
          if (natop2 === Ope.Mult) calc.ajouteOperateursParNat(list2, natop2)
          else list2.push(calc)
        }
        if (list1.length < list2.length) return false
        for (i = 0; i < list2.length; i++) {
          c2 = list2[i]
          trouve = false
          for (j = 0; j < list1.length; j++) {
            c1 = list1[j]
            if (c1.estEquivalentA(c2)) {
              trouve = true
              list1.splice(j, 1)
              break
            }
          }
          if (!trouve) return false
          else {
            list2.splice(i, 1)
            i-- // Car le terme d'indice i a été retiré
          }
        }
        return true
      }
    }
    return this.estEquivalentA(calc)
  }
}
/**
 * Fonction renvoyant true si le calcul est dérivable.
 * A redéfinir pour les descendants pour lesquels ce n'est pas dérivabel.
 * @returns {boolean}
 */
CCb.prototype.deriveePossible = function () {
  return true
}

/**
 * Fontion à redéfinir pout les descendants qui renvoie true si le calcul est bien un calcul acceptable
 * pour un calcul sur les vecteurs
 * @param {string[]} tabNames Un tableau de string contenant les noms de calculs complexes assimilés à des points ou des vecteurs
 * @returns {boolean}
 */
CCb.prototype.isCalcVect = function (tabNames) {
  return false
}

/**
 * Fonction à redéfinir pout les descendants qui renvoie true si le calcul peut être correct pour un calcul vectoriel
 * @param {string[]} tabNames Un tableau de string contenant les noms de calculs complexes assimilés à des points ou des vecteurs
 * @returns {boolean}
 */
CCb.prototype.isCalcOK4Vect = function (tabNames) {
  return true
}

/**
 * Fonction renvoyant true si this représente un résultat d'un calcul complexe nommé vect0
 * Sert pour les exercices de calcul sur les vecteurs ou de calcul de produit scalaire
 * Sera redéfini seulement pour CResultatValeurComplexe
 * @returns {boolean}
 */
CCb.prototype.isVectNul = function () {
  return false
}

/**
 * Fonction servant uniquement dans les exercices sur le produit scalaire pour rendre un calcul
 * adapté à un calcul de produit scalaire.
 * La seule différence avec un arbre de calcul normal est de remplacer un vecteur élevé au carré par le carré de sa norme
 * @param {string[]} tabNames : Tableau contenant les noms des calculs complexes considérés comme des vecteurs
 * @returns {CCb}
 */
CCb.prototype.getCalc4Prosca = function (tabNames) {
  return this
}

/**
 * Fonction appelée pour avoir le résultat d'un appel de fonction d'un calcul matriciel.
 * Ne pourra arriver que pour une somme indicée ou un produit indicé de calcul matriciel
 * @param {boolean} infoRandom  true si les calculas aléatoires avec rand
 * @param {number[]|string[]} valeurParametre  un tableau donnant les valeurs des paramètres pour une fonction matricielle
 * @returns {number}
 */
CCb.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  return this.resultatMat(infoRandom, valeurParametre)
}

/**
 * La fonction suivante sert à pouvoir enchaîner les appels de focntion gauche et droit
 * @param {CCb} arg
 * @returns {CCb}
 */
export function getLeft (arg) {
  const nat = arg.nature()
  if (nat === CCbGlob.natOperation) {
    return arg.membreGauche()
  }
  if (nat === CCbGlob.natMoinsUnaire) {
    return arg.membreGauche()
  }
  if (nat === CCbGlob.natFonction) {
    switch (arg.opef) {
      case Opef.Left :
      case Opef.LeftC :
        return getLeft(getLeft(arg.operande))
      case Opef.Right :
      case Opef.RightC :
        return getLeft(getRight(arg.operande))
    }
  }
  if (nat === CCbGlob.natAppelFonction || nat === CCbGlob.natAppelFonctionNVar) {
    return getLeft(arg.fonctionAssociee.calcul)
  }
  if (nat === CCbGlob.natAppelFonctionInterne || nat === CCbGlob.natAppelFonctionInterneNVar) {
    return getLeft(arg.fonctionInterne)
  }
  // Tout appel de getLeft avec comme argument un CResultatValeur dont l'opérande est
  // autre chose qu'un calcul réel ou complexe donnera un résultat qui n'existe pas
  if (nat === CCbGlob.natResultatValeur || nat === CCbGlob.natResultatValeurComplexe) {
    return arg.membreGauche()
  }
  if (nat === CCbGlob.natFonction3Var) { // Fonction si conditionnel qui est la seule fonction de trois variables
    const x1 = arg.operande1.resultat(false)
    if (x1 === 1) return getLeft(arg.operande2)
    else return getLeft(arg.operande3)
  }
  return arg
}

/**
 * La fonction suivante sert à pouvoir enchaîner les appels de focntion gauche et droit
 * @param {CCb} arg
 * @returns {CCb}
 */
export function getRight (arg) {
  const nat = arg.nature()
  if (nat === CCbGlob.natOperation) {
    return arg.membreDroit()
  }
  if (nat === CCbGlob.natMoinsUnaire) {
    return arg.membreDroit()
  }
  if (nat === CCbGlob.natFonction) {
    switch (arg.opef) {
      case Opef.Left :
      case Opef.LeftC :
        return getRight(getLeft(arg.operande))
      case Opef.Right :
      case Opef.RightC :
        return getRight(getRight(arg.operande))
    }
  }
  if (nat === CCbGlob.natAppelFonction || nat === CCbGlob.natAppelFonctionNVar) {
    return getRight(arg.fonctionAssociee.calcul)
  }
  if (nat === CCbGlob.natAppelFonctionInterne || nat === CCbGlob.natAppelFonctionInterneNVar) {
    return getRight(arg.fonctionInterne)
  }
  // Tout appel de getRight avec comme argument un CResultatValeur dont l'opérande est
  // autre chose qu'un calcul réel ou complexe donnera un résultat qui n'existe pas
  if (nat === CCbGlob.natResultatValeur || nat === CCbGlob.natResultatValeurComplexe) {
    return arg.membreDroit()
  }
  if (nat === CCbGlob.natFonction3Var) { // Fonction si conditionnel qui est la seule fonction de trois variables
    const x1 = arg.operande1.resultat(false)
    if (x1 === 1) return getRight(arg.operande2)
    else return getRight(arg.operande3)
  }
  return arg
}

/**
 * Fonction qui renvoie un calcul obtenu en remplaçant les enchainements de Left et Right par leur résultat effectif
 * @param {CCb} arg
 * @returns {CCb}
 */
export function getRealCalc (arg) {
  const nat = arg.nature()
  if (nat === CCbGlob.natFonction) {
    switch (arg.opef) {
      case Opef.Left :
      case Opef.LeftC :
        return getLeft(getRealCalc(arg.operande))
      case Opef.Right :
      case Opef.RightC :
        return getRight(getRealCalc(arg.operande))
      case Opef.Core :
      case Opef.CoreC :
        return getRealCalc(arg.operande)
    }
  }
  return arg
}
