/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import StyleMarqueSegment from './StyleMarqueSegment'

/**
 * Sett à définir les différents types de marques d'angle.
 * @typedef StyleMarqueAngle
 * @type {Object}
 */
const StyleMarqueAngle = {
  marqueSimple: 1,
  marqueSimple1Trait: 1 << 1,
  marqueSimple2Traits: 1 << 2,
  marqueSimple3Traits: 1 << 3,
  marqueSimpleCroix: 1 << 4,
  marquePleine: 1 << 5,
  marquePleine1Trait: 1 << 6,
  marquePleine2Traits: 1 << 7,
  marquePleine3Traits: 1 << 8,
  marquePleineCroix: 1 << 9,

  styleMarqueSegment: function (style) {
    switch (style) {
      case StyleMarqueAngle.marqueSimple1Trait :
      case StyleMarqueAngle.marquePleine1Trait :
        return StyleMarqueSegment.marqueSimple

      case StyleMarqueAngle.marqueSimple2Traits :
      case StyleMarqueAngle.marquePleine2Traits :
        return StyleMarqueSegment.marqueDouble

      case StyleMarqueAngle.marqueSimple3Traits :
      case StyleMarqueAngle.marquePleine3Traits :
        return StyleMarqueSegment.marqueTriple

      case StyleMarqueAngle.marqueSimpleCroix :
      case StyleMarqueAngle.marquePleineCroix :
        return StyleMarqueSegment.marqueCroix

      default :
        return StyleMarqueSegment.marqueSimple
    }
  }
}

StyleMarqueAngle.marqueRemplie = StyleMarqueAngle.marquePleine |
  StyleMarqueAngle.marquePleine1Trait |
  StyleMarqueAngle.marquePleine2Traits |
  StyleMarqueAngle.marquePleine3Traits |
  StyleMarqueAngle.marquePleineCroix

StyleMarqueAngle.marqueAvecTrait = StyleMarqueAngle.marqueSimple1Trait |
  StyleMarqueAngle.marqueSimple2Traits |
  StyleMarqueAngle.marqueSimple3Traits |
  StyleMarqueAngle.marquePleine1Trait |
  StyleMarqueAngle.marquePleine2Traits |
  StyleMarqueAngle.marquePleine3Traits |
  StyleMarqueAngle.marqueSimpleCroix |
  StyleMarqueAngle.marquePleineCroix

export default StyleMarqueAngle
