/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CSommeDansFormule from 'src/objets/CSommeDansFormule'
import CCb from 'src/objets/CCb'
import { erreurCalculException, MAX_VALUE, MIN_VALUE } from 'src/kernel/kernel'
import CCbGlob from 'src/kernel/CCbGlob'
import mathjs from 'src/kernel/mathjs'
const { add } = mathjs
export default CSommeMatDansForm

/**
 * Classe représentant une somme indicée de matrices dans un arbre binaire de calcul.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CCb} calculASommer  Le calcul à sommer.
 * @param {CCb} indiceDebut  L'indice de départ.
 * @param {CCb} indiceFin  L'indice de fin.
 * @param {CCb} pas  Le pas à ajouter à l'indice pour chaque somme (1 la plupart du temps)
 * @param {string} nomVariable  Le nom choisi pour la variable de sommation.
 * @returns {CSommeMatDansForm}
 */
function CSommeMatDansForm (listeProprietaire, calculASommer, indiceDebut, indiceFin, pas, nomVariable) {
  if (arguments.length === 1) CCb.call(this, listeProprietaire)
  else {
    CSommeDansFormule.call(this, listeProprietaire, calculASommer, indiceDebut, indiceFin, pas, nomVariable)
  }
}

CSommeMatDansForm.prototype = new CSommeDansFormule()
CSommeMatDansForm.prototype.constructor = CSommeMatDansForm
CSommeMatDansForm.prototype.superClass = 'CSommeDansFormule'
CSommeMatDansForm.prototype.className = 'CSommeMatDansForm'

// getClone doit être redéfini pour cet objet
CSommeMatDansForm.prototype.getClone = function (listeSource, listeCible) {
  return new CSommeMatDansForm(listeCible, this.calculASommer.getClone(listeSource, listeCible),
    this.indiceDebut.getClone(listeSource, listeCible), this.indiceFin.getClone(listeSource, listeCible),
    this.pas.getClone(listeSource, listeCible), this.nomVariable)
}

/**
 * Fonction calculant ce qui doit être renvoyé
 * @param {number[]} arrayparam Un array contenant la valeur des paramètres à utiliser (un seul pour resultatMat,
 * le nombre de paramètres précédents + 1 pour resultatMatFonction, les valeurs de la variable
 * de boucle devant être affectées au dernier élément du tableau)
 * @param {number} inddeb valeur de début pour le paramètre de boucle
 * @param {number} indfin valeur de fin pour le paramètre de boucle
 * @param {number} pas valeur de fin pour le paramètre de boucle
 * @param {boolean} infoRandom : true si les calculs de random doivent être réinitialisés
 * @returns {number} la valeur de la somme si elle existe (nombre ou matrice)
 */
CSommeMatDansForm.prototype.resultatMatBase = function (arrayparam, inddeb, indfin, pas, infoRandom) {
  const n = arrayparam.length - 1
  this.listeProprietaire.nombreIterations += (indfin - inddeb) / pas
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  arrayparam[n] = inddeb
  let somme = this.calculASommer.resultatMatFonction(infoRandom, arrayparam)
  let nbColInit, nbLigInit
  if (typeof somme === 'number') {
    nbColInit = 1
    nbLigInit = 1
  } else {
    const sizeInit = somme.size()
    nbLigInit = sizeInit[0]
    nbColInit = sizeInit[1]
  }
  for (let i = inddeb + pas; i <= indfin; i += pas) {
    arrayparam[n] = i
    const res = this.calculASommer.resultatMatFonction(infoRandom, arrayparam)
    let nbCol, nbLig
    if (typeof res === 'number') {
      nbCol = 1
      nbLig = 1
    } else {
      const size = res.size()
      nbLig = size[0]
      nbCol = size[1]
    }
    if (nbCol !== nbColInit || nbLig !== nbLigInit) throw new Error(erreurCalculException)
    else {
      if (nbCol === 1 && nbLig === 1) somme = somme + res
      else somme = add(somme, res)
    }
  }
  return somme
}

CSommeMatDansForm.prototype.resultatMat = function (infoRandom) {
  const val = new Array(1)
  const dinddeb = this.indiceDebut.resultatMat(infoRandom)
  if (typeof dinddeb !== 'number') throw new Error(erreurCalculException)
  if ((dinddeb > MAX_VALUE) || (dinddeb < MIN_VALUE) || (dinddeb !== Math.floor(dinddeb))) throw new Error(erreurCalculException)
  const dindfin = this.indiceFin.resultatMat(infoRandom)
  if (typeof dindfin !== 'number') throw new Error(erreurCalculException)
  if ((dindfin > MAX_VALUE) || (dindfin < MIN_VALUE) || (dindfin !== Math.floor(dindfin)) ||
    (dindfin < dinddeb)) throw new Error(erreurCalculException)
  const dpas = this.pas.resultatMat(infoRandom)
  if (typeof dpas !== 'number') throw new Error(erreurCalculException)
  if ((dpas > MAX_VALUE) || (dpas < MIN_VALUE) ||
    (dpas !== Math.floor(dpas)) || (dpas <= 0)) throw new Error(erreurCalculException)
  return this.resultatMatBase(val, dinddeb, dindfin, dpas, infoRandom)
}

CSommeMatDansForm.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  // const val = new Array(1)
  let val, i
  if (valeurParametre instanceof Array) {
    const n = valeurParametre.length
    val = new Array(n + 1)
    for (i = 0; i < n; i++) val[i] = valeurParametre[i]
  } else {
    val = new Array(2)
    val[0] = valeurParametre
  }
  const dinddeb = this.indiceDebut.resultatMat(infoRandom)
  if (typeof dinddeb !== 'number') throw new Error(erreurCalculException)
  if ((dinddeb > MAX_VALUE) || (dinddeb < MIN_VALUE) || (dinddeb !== Math.floor(dinddeb))) throw new Error(erreurCalculException)
  const dindfin = this.indiceFin.resultatMat(infoRandom)
  if (typeof dindfin !== 'number') throw new Error(erreurCalculException)
  if ((dindfin > MAX_VALUE) || (dindfin < MIN_VALUE) || (dindfin !== Math.floor(dindfin)) ||
    (dindfin < dinddeb)) throw new Error(erreurCalculException)
  const dpas = this.pas.resultatMat(infoRandom)
  if (typeof dpas !== 'number') throw new Error(erreurCalculException)
  if ((dpas > MAX_VALUE) || (dpas < MIN_VALUE) ||
    (dpas !== Math.floor(dpas)) || (dpas <= 0)) throw new Error(erreurCalculException)
  return this.resultatMatBase(val, dinddeb, dindfin, dpas, infoRandom)
}
