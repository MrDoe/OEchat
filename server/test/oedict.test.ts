import { describe, expect, it } from 'vitest';
import { correctTranscript, germanToOE, toLautschriftWord, transliterate } from '../../shared/oedict.js';

describe('toLautschriftWord (skill rules)', () => {
  it('converts long vowels and diphthongs', () => {
    expect(toLautschriftWord('hāl')).toBe('haal');
    expect(toLautschriftWord('gōd')).toBe('good');
    expect(toLautschriftWord('wīf')).toBe('wiif');
    expect(toLautschriftWord('hūs')).toBe('huus');
    expect(toLautschriftWord('frēond')).toBe('freond');
    expect(toLautschriftWord('hīeran')).toBe('hieran');
    expect(toLautschriftWord('mǣl')).toBe('määl');
    expect(toLautschriftWord('sē')).toBe('seh');
    expect(toLautschriftWord('wē')).toBe('weh');
    expect(toLautschriftWord('hēr')).toBe('hehr');
  });

  it('applies the skill examples verbatim', () => {
    expect(toLautschriftWord('cyning')).toBe('küning');
    expect(toLautschriftWord('ċild')).toBe('tschild');
    expect(toLautschriftWord('scip')).toBe('schip');
    expect(toLautschriftWord('bricg')).toBe('bridsch');
    expect(toLautschriftWord('box')).toBe('box');
    expect(toLautschriftWord('geong')).toBe('jeong');
    expect(toLautschriftWord('gān')).toBe('gaan');
    expect(toLautschriftWord('riht')).toBe('richt');
    expect(toLautschriftWord('þurh')).toBe('thurch');
    expect(toLautschriftWord('nama')).toBe('nama');
    expect(toLautschriftWord('wyrd')).toBe('würd');
    expect(toLautschriftWord('wæter')).toBe('wäter');
    expect(toLautschriftWord('nigon')).toBe('nigon');
    expect(toLautschriftWord('hwelc')).toBe('hweltsch');
    expect(toLautschriftWord('hwilc')).toBe('hwiltsch');
    expect(toLautschriftWord('ælc')).toBe('ältsch');
    expect(toLautschriftWord('folc')).toBe('folk');
    expect(toLautschriftWord('dæġ')).toBe('däj');
    expect(toLautschriftWord('gǣþ')).toBe('gääth');
  });

  it('voices fricatives only between voiced sounds', () => {
    expect(toLautschriftWord('wesað')).toBe('wesath');
    expect(toLautschriftWord('hæfde')).toBe('hävde');
    expect(toLautschriftWord('sweostor')).toBe('sweoßtor');
    expect(toLautschriftWord('swīþe')).toBe('swiithe');
  });

  it('keeps geminated consonants voiceless', () => {
    expect(toLautschriftWord('stocc')).toBe('stokk');
    expect(toLautschriftWord('wiss')).toBe('wißß');
    expect(toLautschriftWord('drifan'.replace('f', 'ff'))).toBe('driffan');
  });

  it('never starts a word with ß', () => {
    expect(toLautschriftWord('sindon')).toBe('sindon');
    expect(toLautschriftWord('sang')).toBe('sang');
    expect(toLautschriftWord('sēo')).toBe('seo');
  });
});

describe('transliterate (OE -> Lautschrift for TTS)', () => {
  it('uses curated lexicon phrases', () => {
    expect(transliterate('iċ eom hāl')).toBe('itsch eom haal');
    expect(transliterate('wes hāl')).toBe('wes haal');
  });

  it('mixes phrases, words and punctuation', () => {
    expect(transliterate('Wes hāl, frēond!')).toBe('Wes haal, freond!');
  });

  it('greets and asks how it goes', () => {
    expect(transliterate('Wes hāl, frēond. Hū gǣþ hit?')).toBe('Wes haal, freond. Huu gääth hit?');
  });

  it('matches single words from the lexicon', () => {
    expect(transliterate('wīf')).toBe('wiif');
    expect(transliterate('wyrd')).toBe('würd');
    expect(transliterate('wæter')).toBe('wäter');
    expect(transliterate('Se')).toBe('Seh');
    expect(transliterate('sē')).toBe('seh');
  });

  it('converts unknown words by rule', () => {
    expect(transliterate('ċild')).toBe('tschild');
    expect(transliterate('þæt')).toBe('thät');
  });

  it('preserves spacing and empty input', () => {
    expect(transliterate('')).toBe('');
    expect(transliterate('iċ   eom')).toBe('itsch eom');
  });

  it('keeps punctuation attached to phrase matches', () => {
    expect(transliterate('wes hāl.')).toBe('wes haal.');
  });
});

describe('correctTranscript (whisper -> Old English guess)', () => {
  it('maps common mis-hearings to OE', () => {
    expect(correctTranscript('i am was hal')).toContain('iċ eom');
    expect(correctTranscript('i am was hal')).toContain('wes hāl');
  });

  it('handles phrase fixes', () => {
    expect(correctTranscript('my name is caedmon')).toContain('mīn nama is');
  });

  it('leaves unknown words alone', () => {
    expect(correctTranscript('some strange words here')).toBe('some strange words here');
  });

  it('does not mangle non-ASCII OE words', () => {
    expect(correctTranscript('hwæt is þa nama?')).toBe('hwæt is þa nama?');
  });
});

describe('germanToOE (German whisper -> Old English)', () => {
  it('maps German-mode whisper output back to OE', () => {
    expect(germanToOE('Itch eom hāl. Mīn nama is Älvred.')).toBe('Iċ eom hāl. Mīn nama is Ælfred.');
    expect(germanToOE('Seh meduseld is gréat sele.')).toBe('Sē meduseld is grēat sele.');
    expect(germanToOE('Wes sindon hehr mid meh?')).toBe('Wes sindon hēr mid mē?');
    expect(germanToOE('Hwät is þīn nama?')).toBe('Hwæt is þīn nama?');
    expect(germanToOE('Wilt thuu drinkan ealu?')).toBe('Wilt þū drincan ealu?');
    expect(germanToOE('Sey küning sit on thää stoole.')).toBe('Sē cyning sit on þǣre stōle.');
    expect(germanToOE('Béoth bliithe miin fréond.')).toBe('Bēoþ blīþe mīn frēond.');
  });

  it('differentiates wyrd from word', () => {
    expect(germanToOE('That is good word, würd.')).toBe('Þæt is gōd word, wyrd.');
    expect(germanToOE('Würd is sät lief.')).toBe('Wyrd is þæt līf.');
  });

  it('recovers German spellings of OE words', () => {
    expect(germanToOE('Hwär is se witter?')).toBe('Hwǣr is sē wæter?');
    expect(germanToOE('Sanchi the Swither, good man.')).toBe('Þancie þē Swīþe, gōd mann.');
    expect(germanToOE('Was ist dein Name?')).toBe('Hwæt is þīn Nama?');
  });

  it('collapses whisper echo duplicates', () => {
    expect(germanToOE('Wes hāl fréond hwäart þū? Wes hāl fréond hwäart þū?')).toBe('Wes hāl frēond hwæt þū?');
  });

  it('leaves unknown tokens via inverse fallback', () => {
    expect(germanToOE('meduseld')).toBe('meduseld');
  });
});

describe('germanToOE echo collapse', () => {
  it('collapses whispered isolated-word echoes', () => {
    expect(germanToOE('word word word')).toBe('word');
  });
});
