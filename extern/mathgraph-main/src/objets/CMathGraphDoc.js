/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { saveAs } from 'file-saver'

import Color from '../types/Color'
import { base64Encode, mimeType, mtgFileExtension, getLanguage, version } from '../kernel/kernel'
import CListeObjets from './CListeObjets'
import CPrototype from './CPrototype'
import DataOutputStream from '../entreesSorties/DataOutputStream'
import Dimf from '../types/Dimf'

export default CMathGraphDoc

export const defaultSurfOpacity = 0.2

/**
 * Classe contenant des informations sur la figure et un array de CPrototype
 * (qui peut être vide) ainis que la CListeObjets contenant les objets proprement dits
 * graphiques et non graphiques.
 * Version réservée à mtgApp
 * @constructor
 * @param {string} idDoc  L'id du document ui est celui du svg contenant la figure.
 * @param {boolean} displayOnLoad  true si la figure doit être affichée
 * dès que son chargement est terminé.
 * @param {boolean} isActive  true si la figure est active et répond aux actions souris et clavier.
 * @param {boolean} decimalDot true si le séparateur décimal est le point
 * @returns {CMathGraphDoc}
 */
function CMathGraphDoc (idDoc, displayOnLoad, isActive, decimalDot = true) {
  this.idDoc = idDoc
  this.wheelListener = null //  fonction de callBack appelée quand on zoome ou dézoome avec la molette de la souris
  this.displayOnLoad = arguments.length > 1 ? displayOnLoad : true // Pas utilisé pour le moment
  this.isActive = arguments.length > 2 ? isActive : true
  this.numeroVersion = version
  this.listePr = new CListeObjets('radian', idDoc, decimalDot)
  this.listePr.associeA(this)
  this.language = getLanguage()
  this.texteFigure = ''
  // Version 9.0 : dimMinFig contient les dimensions mini à affecter à la figure quand on l'affiche ou l'édite
  this.dimMinFig = new Dimf(0, 0)
  /** @type {CPrototype[]} */
  this.tablePrototypes = []
  this.isDirty = false
  /** @type {CPt} */
  this.pointCapture = null
  this.couleurFond = Color.white
  this.imageFond = null
  this.imageFondVisible = true
  this.itemsCochesInterdits = true
  this.listeIdMenus = []
  this.type = '' // Pour les événements souris
  this.affichagesFiges = false
  this.marquesAnglesFigees = false
  this.buttonValueAllowed = true
  this.buttonFunctionAllowed = true
  /**
   * Sera mis à true si on rencontre un event mousemove (ça n'existe pas sur les les périphériques uniquement tactiles
   * à la différence de mousedown)
   * @type {boolean}
   */
  this.hasMouse = false // Sera mis à true si un mousemove event est rencontré
  /**
   * Curseur qui sera mis dans body.style.cursor par MtgAppLecteur.prototype.mousemove s'il n'y a pas d'objet proche
   * @type {string}
   */
  this.defaultCursor = 'default'
  /**
   * Une éventuelle map (eventName -> callback) utilisée par la méthode addSvgListener de l'api (toujours null sans usage de l'api)
   * @type {null|Map}
   */
  this.cbmap = null
}

// Modifié version 5.2. On passe un paramètre nVersion qui représente le N° de version de la liste à partir de laquelle le prototype est chargé
/**
 * Fonction chargeant les éventuelles constructions de la figure (CPrototype)
 * @param {DataInputStream} inps
 * @param nVersion Le n° de version de la liste dans laquelle on lit les prototypes
 */
CMathGraphDoc.prototype.readPrototypes = function (inps, nVersion) {
  // On lit d'abord le nombre de prototypes
  const nbProt = inps.readInt()
  for (let i = 0; i < nbProt; i++) {
    this.addPrototype(inps, nVersion)
  }
}

/**
 * Fonction ajoutant un prototype depuis le flux de données binaires inps
 * @param {DataInputStream} inps
 * @param nVersion Le n° de version de la liste dans laquelle on lit les prototypes
 */
CMathGraphDoc.prototype.addPrototype = function (inps, nVersion) {
  const prot = new CPrototype(this.listePr)
  prot.read(inps, nVersion)
  this.tablePrototypes.push(prot)
}

/**
 * Fonction renvoyant la construction de la figure de nom nomProto
 * @param {string} nomProto
 * @returns {CPrototype|null} null s'il n'y a pas de prototype de ce nom
 */
CMathGraphDoc.prototype.getPrototype = function (nomProto) {
  for (let i = 0; i < this.tablePrototypes.length; i++) {
    if (this.tablePrototypes[i].nom === nomProto) return this.tablePrototypes[i]
  }
  return null
}
/**
 * Fonction enregistrant les pprototypes (constructions) de la figure.
 * @param {DataOutputStream} oups
 * @returns {void}
 */
CMathGraphDoc.prototype.writePrototypes = function (oups) {
  oups.writeInt(this.tablePrototypes.length)
  for (let i = 0; i < this.tablePrototypes.length; i++) {
    const prot = this.tablePrototypes[i]
    prot.write(oups)
  }
}
/**
 * Fonction lisant le document depuis un flux de données binaires.
 * @param {DataInputStream} inps
 * @returns {void}
 */
CMathGraphDoc.prototype.read = function (inps) {
  // On saute les 17 premiers octets qui contiennent une chaine
  inps.skip(16)
  this.numeroVersion = inps.readInt()
  // Ligne suivante pour corriger un oubli dans la première version où le numéro de document
  // était nul
  if (this.numeroVersion === 0) this.numeroVersion = 5
  if (this.numeroVersion > version) { // Amélioré version 4.4
    throw new Error('VersionErr')
  }
  const numeroVersion = this.numeroVersion
  // A partir de la version 8.0 (numéro de version 20), les surfaces ont leur propre opacity
  // mais on garde un CMathGraphDoc.opacity pour l'affecter aux surfaces quand on lit les objets surfaces
  // pour les numéros de version supérieurs à 6 et inférieurs ou égaux à 19
  if (numeroVersion >= 6) {
    if (numeroVersion < 20) this.opacity = inps.readFloat()
    else this.opacity = defaultSurfOpacity
  } else this.opacity = 1 // pas de transparence pour les anciennes figures. A modifier dans Options Figure en cours
  this.language = inps.readUTF() // la langue dans laquelle a été créé le document
  // Changements pour la version 1.8 (version 3)
  // Changement pour version 2.0 : on enregistre le degré de transparence des surfaces pleines dans un float
  const couleurRouge = inps.readByte() // initialement readUnsignedByte()
  const couleurVert = inps.readByte()
  const couleurBleu = inps.readByte()
  this.couleurFond = new Color(couleurRouge, couleurVert, couleurBleu)
  const isOld = numeroVersion < 8
  this.imageFondVisible = isOld ? true : inps.readBoolean() // Nouveau version 4.4
  this.modeTraceActive = isOld ? false : inps.readBoolean() // Nouveau version 4.4
  if (isOld) {
    inps.readUTF()
    this.natImageFond = DataOutputStream.nat_noImage
  } else {
    this.natImageFond = inps.readByte()
  }
  if (this.natImageFond !== DataOutputStream.nat_noImage) {
    this.imageFond = inps.readBufferedImage()
    if (numeroVersion > 10) {
      this.widthImageFond = inps.readInt()
      this.heightImageFond = inps.readInt()
    } else {
      const svg = document.getElementById(this.idDoc) // Rajouté version 6.4.1
      this.widthImageFond = svg.getAttribute('width')
      this.heightImageFond = svg.getAttribute('height')
    }
  } else {
    this.imageFond = null
  }
  // On lit un booléen indiquant si les codes d'items de menu correspondent à
  // des items interdits ou non
  this.itemsCochesInterdits = inps.readBoolean()
  // On charge l'éventuelle liste d'items de menus
  const nombreItems = inps.readInt()
  /** @type {number[]} */
  this.listeIdMenus = []
  if (nombreItems !== 0) {
    for (let i = 0; i < nombreItems; i++) {
      const a = inps.readInt()
      this.listeIdMenus.push(a) // à revoir
    }
  }
  if (numeroVersion < 15) {
    inps.readUTF()
    inps.skip(5)
  }
  this.texteFigure = inps.readUTF()
  let minWidth = inps.readInt()
  let minHeight = inps.readInt()
  // Version 9 : On se sert maintenant de ces deux données qui représentent largeur et hauteur mini
  // allouées à la figure en pixels
  if (numeroVersion < 23) {
    minWidth = 0
    minHeight = 0
  }
  this.dimMinFig = new Dimf(minWidth, minHeight)
  this.affichagesFiges = inps.readBoolean()
  this.marquesAnglesFigees = inps.readBoolean()
  // Nouveau pour la version 4.6 : Deux boolean disant si les champs d'édition peuvent avoir des boutons
  // Valeur et Fontions prédéfinies
  if (numeroVersion >= 10) {
    this.buttonValueAllowed = inps.readBoolean()
    this.buttonFunctionAllowed = inps.readBoolean()
  }
  this.readPrototypes(inps, numeroVersion)
  // Nouveauté pour la version 2.5 : La liste doit être au courant du n° de
  // version de document
  const list = this.listePr
  list.numeroVersion = numeroVersion
  list.associeA(this) // Modifié version 4.8
  list.read(inps)
  list.numeroVersion = version
  this.numeroVersion = version
  // Il faut adapter les formules à la langue en cours d'utilisation
  list.reconstruitChainesCalcul()
}
/**
 * Fonction enregistrant le document dans un flux de données binaire.
 * @param {DataOutputStream} oups
 * @returns {void}
 */
CMathGraphDoc.prototype.write = function (oups) {
  oups.writeCString('MathGraphJava1.0')
  oups.writeInt(this.numeroVersion)
  // Changement pour version 2.0 : on enregistre le degré de transparence des surfaces pleines dans un float
  // A partir de la version 8.0 (n° de version 20) chaque élément surface a sa propre opacité et donc
  // on n'enregistre plus une opacity globale pour les surfaces dans le flux
  // oups.writeFloat(this.opacity)
  oups.writeUTF(this.language)
  oups.writeByte(this.couleurFond.getRed())
  oups.writeByte(this.couleurFond.getGreen())
  oups.writeByte(this.couleurFond.getBlue())
  oups.writeBoolean(this.imageFondVisible)
  // Nouveau version 4.4 : un boolean disant si le mode trace est activé
  oups.writeBoolean(this.modeTraceActive)
  if (this.imageFond !== null) {
    oups.writeByte(this.natImageFond)
    oups.writeBufferedImage(this.imageFond, this.natImageFond) // Si pas d'image Fond un int de valeur nulle est enregistré dans le flux.
    oups.writeInt(this.widthImageFond)
    oups.writeInt(this.heightImageFond)
  } else oups.writeByte(DataOutputStream.nat_noImage)
  // On lit un booléen indiquant si les codes d'items de menu correspondent à
  // des items interdits ou non
  oups.writeBoolean(this.itemsCochesInterdits)
  // On enregistre l'éventuelle liste d'items de menus
  const nombreItems = this.listeIdMenus.length
  oups.writeInt(nombreItems)
  if (nombreItems !== 0) {
    for (let i = 0; i < nombreItems; i++) {
      oups.writeInt(this.listeIdMenus[i])
    }
  }
  oups.writeUTF(this.texteFigure)
  oups.writeInt(this.dimMinFig.x)
  oups.writeInt(this.dimMinFig.y)
  oups.writeBoolean(this.affichagesFiges)
  oups.writeBoolean(this.marquesAnglesFigees)
  oups.writeBoolean(this.buttonValueAllowed)
  oups.writeBoolean(this.buttonFunctionAllowed)
  this.writePrototypes(oups)
  this.listePr.write(oups)
}

CMathGraphDoc.prototype.getBase64Code = function () {
  const oups = new DataOutputStream()
  this.write(oups)
  return base64Encode(oups.ba, false)
}

CMathGraphDoc.prototype.toString = function () {
  return this.getBase64Code()
}

/**
 * Retourne le blob binaire du doc (pour mutualiser avec MtgCli.saveAs)
 * @returns {Blob}
 */
CMathGraphDoc.prototype.getBlob = function () {
  const oups = new DataOutputStream()
  this.write(oups)
  const ba = oups.ba
  const len = ba.length
  const buffer = new ArrayBuffer(ba.length)
  const dataView = new DataView(buffer)
  for (let i = 0; i < len; i++) {
    dataView.setUint8(i, ba[i])
  }
  return new Blob([buffer], { type: mimeType })
}

/**
 * Sauvegarde la figure courante dans un fichier binaire mgj
 * @param {string} filename Le nom de fichier sans extension
 */
CMathGraphDoc.prototype.saveAs = function (filename) {
  const blob = this.getBlob()
  saveAs(blob, filename + '.' + mtgFileExtension)
  this.isDirty = false
}

/**
 * Ajout version 5.0.
 * Renvoie un coefficient qui servira à agrandir les marques de segment, d'angles et les points
 * pour les écrans de haute résolution.
 *
// Abandonné
// CMathGraphDoc.prototype.coefForPointsAndMarks = function() {
// On considère une figure de taille 600x400 comme la norme et au-delà on applique un coefficient
// proportionnel à l'aire de la figure
/*
  var d = Math.sqrt(this.sizeWindowx*this.sizeWindowy/800000);
  if (d < 1) return 1; else if (d > 2.5) return 2.5; else return d;

// Pour la version js, toujours égal à 1
//  return 1;
// };

/**
 * Fonction changeant l'état du document
 * @param bModeElectron true si l'applicaton est en mode electron
 * @param {boolean} val  true si le document a changé et false sinon
 */
CMathGraphDoc.prototype.setDirty = function (bModeElectron, val) {
  this.isDirty = val
  // Spécial version electron : Si isDirty est true et si app.electron est true
  // on appelle setDocumentDirty pour que l'utilisateur soit prévenu avant de quitter l'appli
  // setDocumentDirty est une fonction de index.html de electron
  if (bModeElectron && val) setDocumentDirty() // eslint-disable-line no-undef
}

/**
 * Fonction renvoyant true si l'outil d'inex index est autorisé par le document
 * @param index
 * @returns {boolean}
 */
CMathGraphDoc.prototype.toolDispo = function (index) {
  if (index === -1) return true
  let b = false
  for (let i = 0; i < this.listeIdMenus.length; i++) {
    b = b || (this.listeIdMenus[i] === index)
  }
  return this.itemsCochesInterdits ? !b : b
}

CMathGraphDoc.prototype.getList = function () {
  return this.listePr
}
