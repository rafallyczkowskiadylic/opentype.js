/**
 * Apply Thai Glyph Composition feature to tokens
 */

 import { ContextParams } from '../../tokenizer';
 import applySubstitution from '../applySubstitution';
 
 /**
  * Update context params
  * @param {any} tokens a list of tokens
  * @param {number} index current item index
  */
 function getContextParams(tokens, index) {
     const context = tokens.map(token => token.activeState.value);
     return new ContextParams(context, index || 0);
 }
 
 /**
  * Apply Thai required glyphs composition substitutions
  * @param {ContextRange} range a range of tokens
  */
 function thaiGlyphComposition() {
    const script = 'thai';
    let tokens = this.tokenizer.tokens;
    let contextParams = getContextParams(tokens, 0);
    contextParams.context.forEach((glyphIndex, index) => {
        contextParams.setCurrentIndex(index);
        let substitutions = this.query.lookupFeature({
            tag: 'ccmp', script, contextParams
        });
        if (substitutions.length) {
            substitutions.forEach(
                action => applySubstitution(action, tokens, index)
            );
            contextParams = getContextParams(tokens, index);
        }
    });
 }
 
 export default thaiGlyphComposition;
 