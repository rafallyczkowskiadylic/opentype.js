import assert from 'assert';
import { Font, Glyph, Path, loadSync } from '../src/opentype';

describe('font.js', function() {
    let font;

    const fGlyph = new Glyph({name: 'f', unicode: 102, path: new Path(), advanceWidth: 1, index: 1 });
    const iGlyph = new Glyph({name: 'i', unicode: 105, path: new Path(), advanceWidth: 1, index: 2 });
    const ffGlyph = new Glyph({name: 'f_f', unicode: 0xfb01, path: new Path(), advanceWidth: 1, index: 3 });
    const fiGlyph = new Glyph({name: 'f_i', unicode: 0xfb02, path: new Path(), advanceWidth: 1, index: 4 });
    const ffiGlyph = new Glyph({name: 'f_f_i', unicode: 0xfb03, path: new Path(), advanceWidth: 1, index: 5 });

    const glyphs = [
        new Glyph({name: '.notdef', unicode: 0, path: new Path(), advanceWidth: 1}),
        fGlyph, iGlyph, ffGlyph, fiGlyph, ffiGlyph
    ];

    beforeEach(function() {
        font = new Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: 0,
            fsSelection: 42,
            tables: {os2: {achVendID: 'TEST'}},
            glyphs: glyphs
        });

        font.kerningPairs = {};
    });

    describe('Font constructor', function() {
        it('accept 0 as descender value', function() {
            assert.equal(font.descender, 0);
        });
        it('tables definition must be supported', function() {
            assert.equal(font.tables.os2.achVendID, 'TEST');
        });
        it('tables definition must blend with default tables values', function() {
            assert.equal(font.tables.os2.usWidthClass, 5);
        });
        it('tables definition can override defaults values', function() {
            assert.equal(font.tables.os2.fsSelection, 42);
        });
        it('tables definition shall be serialized', function() {
            const os2 = font.toTables().tables.find(table => table.tableName === 'OS/2');
            assert.equal(os2.achVendID, 'TEST');
        });
    });

    describe('stringToGlyphs', function() {
        it('must support standard ligatures', function() {
            assert.deepEqual(font.stringToGlyphs('fi'), [fGlyph, iGlyph]);
            font.substitution.add('liga', { sub: [1, 1, 2], by: 5 });
            font.substitution.add('liga', { sub: [1, 1], by: 3 });
            font.substitution.add('liga', { sub: [1, 2], by: 4 });
            assert.deepEqual(font.stringToGlyphs('ff'), [ffGlyph]);
            assert.deepEqual(font.stringToGlyphs('fi'), [fiGlyph]);
            assert.deepEqual(font.stringToGlyphs('ffi'), [ffiGlyph]);
            assert.deepEqual(font.stringToGlyphs('fffiffif'), [ffGlyph, fiGlyph, ffiGlyph, fGlyph]);
        });

        it('works on fonts with coverage table format 2', function() {
            const vibur = loadSync('./fonts/Vibur.woff');
            const glyphs = vibur.stringToGlyphs('er');
            assert.equal(glyphs.length, 1);
            assert.equal(glyphs[0].name, 'er');
        });

        it('works on fonts with coverage table format 2 on low memory mode', function() {
            const vibur = loadSync('./fonts/Vibur.woff', {lowMemory: true});
            const glyphs = vibur.stringToGlyphs('er');
            assert.equal(glyphs.length, 1);
            assert.equal(glyphs[0].name, 'er');
        });
    });

    describe('getFeaturesConfig', () => {
        it('returns default rendering config if options are ommited', () => {
            const configResult = font.getFeaturesConfig();
            assert.deepStrictEqual(configResult, [
                { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
                { script: 'latn', tags: ['liga', 'rlig'] },
                { script: 'thai', tags: ['liga', 'ccmp'] },
                { script: 'DFLT', tags: ['mark'] },
            ]);
        });

        it('returns default rendering config if features attribute is ommited', () => {
            const configResult = font.getFeaturesConfig({
                // features: {} // ommited
            });
            assert.deepStrictEqual(configResult, [
                { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
                { script: 'latn', tags: ['liga', 'rlig'] },
                { script: 'thai', tags: ['liga', 'ccmp'] },
                { script: 'DFLT', tags: ['mark'] },
            ]);
        });

        it('allows to update features for supported scripts (DFLT, latn)', () => {
            const configResult = font.getFeaturesConfig({
                features: {}
            });

            assert.deepStrictEqual(configResult, [
                { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
                { script: 'latn', tags: [] },
                { script: 'thai', tags: ['liga', 'ccmp'] },
                { script: 'DFLT', tags: [] },
            ]);

            const configResult2 = font.getFeaturesConfig({
                features: { liga: true, mark: true }
            });

            assert.deepStrictEqual(configResult2, [
                { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
                { script: 'latn', tags: ['liga'] },
                { script: 'thai', tags: ['liga', 'ccmp'] },
                { script: 'DFLT', tags: ['mark'] },
            ]);

            const configResult3 = font.getFeaturesConfig({
                features: { liga: true, rlig: true, mark: true }
            });

            assert.deepStrictEqual(configResult3, [
                { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
                { script: 'latn', tags: ['liga', 'rlig'] },
                { script: 'thai', tags: ['liga', 'ccmp'] },
                { script: 'DFLT', tags: ['mark'] },
            ]);

            const configResult4 = font.getFeaturesConfig({
                features: { liga: false, rlig: true, mark: false }
            });

            assert.deepStrictEqual(configResult4, [
                { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
                { script: 'latn', tags: ['rlig'] },
                { script: 'thai', tags: ['liga', 'ccmp'] },
                { script: 'DFLT', tags: [] },
            ]);
        });
    });

    describe('Positioning features support', () => {
        describe('KERN - Kerning', () => {
            beforeEach(() => {
                font.tables.gpos = {
                    version: 1,
                    scripts: [{
                        tag: 'DFLT',
                        script: {
                            defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] },
                            langSysRecords: []
                        }
                    }],
                    features: [],
                    lookups: []
                };
                
                font.kerningPairs = {
                    [`${ffGlyph.index},${ffiGlyph.index}`]: 18,
                    [`${ffGlyph.index},${fGlyph.index}`]: -9
                };
            });

            it('supports a kern table if no kern lookup tables set', () => {
                const result = font.getGlyphsPositions([ffGlyph, ffiGlyph], { kerning: true });
                assert.deepStrictEqual(result, [ { xAdvance: 18, yAdvance: 0 }, { xAdvance: 0, yAdvance: 0 } ]);

                const result2 = font.getGlyphsPositions([ffGlyph, fGlyph], { kerning: true });
                assert.deepStrictEqual(result2, [ { xAdvance: -9, yAdvance: 0 }, { xAdvance: 0, yAdvance: 0 } ]);
            });

            it('supports a kern lookup tables', () => {
                font.tables.gpos = {
                    version: 1,
                    scripts: [{
                        tag: 'DFLT',
                        script: {
                            defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [0] },
                            langSysRecords: []
                        }
                    }],
                    features: [{
                        tag: 'kern',
                        feature: { featureParams: 0, lookupListIndexes: [0]}
                    }],
                    lookups: [
                        {
                            'lookupType': 2,
                            'lookupFlag': 0,
                            'subtables': [{
                                'posFormat': 1,
                                'coverage': {
                                    'format': 1,
                                    'glyphs': [3]
                                },
                                'pairSets': [
                                    [{
                                        'secondGlyph': 5,
                                        'value1': {
                                            'xAdvance': -91
                                        }
                                    }]
                                ]
                            }]
                        }
                    ]
                };
                
                const result = font.getGlyphsPositions([ffGlyph, ffiGlyph], { kerning: true });
                assert.deepStrictEqual(result, [ { xAdvance: -91, yAdvance: 0 }, { xAdvance: 0, yAdvance: 0 } ]);
            });

            it('can be disabled with options.kerning flag', () => {
                const result = font.getGlyphsPositions([ffGlyph, ffiGlyph], { kerning: false });
                assert.deepStrictEqual(result, [ { xAdvance: 0, yAdvance: 0 }, { xAdvance: 0, yAdvance: 0 } ]);
            });
        });
        
        describe('MARK - MarkToBase Attachment', () => {
            beforeEach(() => {
                font.tables.gpos = {
                    version: 1,
                    scripts: [{
                        tag: 'DFLT',
                        script: {
                            defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [0] },
                            langSysRecords: []
                        }
                    }, {
                        tag: 'arab',
                        script: {
                            defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [0] },
                            langSysRecords: []
                        }
                    }],
                    features: [{
                        tag: 'mark',
                        feature: { featureParams: 0, lookupListIndexes: [0]}
                    }],
                    lookups: [{
                        'lookupType': 4,
                        'lookupFlag': 0,
                        'subtables': [{
                            'posFormat': 1,
                            'markCoverage': {
                                'format': 1,
                                'glyphs': [5]
                            },
                            'baseCoverage': {
                                'format': 2,
                                'ranges': [{
                                    'start': 2,
                                    'end': 4,
                                    'index': 0
                                }]
                            },
                            'markArray': [{
                                'class': 0,
                                'attachmentPoint': {
                                    'format': 1,
                                    'xCoordinate': -134,
                                    'yCoordinate': 812
                                }
                            }],
                            'baseArray': [
                                [{
                                    'format': 1,
                                    'xCoordinate': -133,
                                    'yCoordinate': -500
                                }],
                                [{
                                    'format': 1,
                                    'xCoordinate': 511,
                                    'yCoordinate': 91
                                }]
                            ]
                        }]
                    }]
                };

                font.kerningPairs = {};
            });

            it('supports a mark lookup table', () => {
                const result = font.getGlyphsPositions([ffGlyph, ffiGlyph], { kerning: true });
                assert.deepStrictEqual(result, [ { xAdvance: 0, yAdvance: 0 }, { xAdvance: 644, yAdvance: -721 } ]);
            });

            it('supports a mark feature with kern feature', () => {
                font.kerningPairs = {
                    [`${ffGlyph.index},${ffiGlyph.index}`]: 32,
                    [`${ffGlyph.index},${fGlyph.index}`]: -9
                };

                const result = font.getGlyphsPositions([ffGlyph, ffiGlyph], { kerning: true });
                assert.deepStrictEqual(result, [ { xAdvance: 32, yAdvance: 0 }, { xAdvance: 644, yAdvance: -721 } ]);
            });

            it('is enabled by default', () => {
                const resultDFLT = font.getGlyphsPositions([ffGlyph, ffiGlyph], { kerning: false });
                assert.deepStrictEqual(resultDFLT, [ { xAdvance: 0, yAdvance: 0 }, { xAdvance: 644, yAdvance: -721 } ]);

                const result = font.getGlyphsPositions([ffGlyph, ffiGlyph], { kerning: false, script: 'arab' });
                assert.deepStrictEqual(result, [ { xAdvance: 0, yAdvance: 0 }, { xAdvance: 644, yAdvance: -721 } ]);
            });

            it('can be disabled with options.features.mark flag', () => {
                const result = font.getGlyphsPositions([ffGlyph, ffiGlyph], { features: { mark: false } });
                assert.deepStrictEqual(result, [ { xAdvance: 0, yAdvance: 0 }, { xAdvance: 0, yAdvance: 0 } ]);
            });
        });
    });

    describe('DEV - Mark To Base Attachment', () => {
        it('gives valid path data for the thai fonts', () => {
            const thFont = loadSync('./fonts/SFProTHDisplay_Semi.ttf');
            // const thFont = loadSync('./fonts/NotoSansThai-Medium.ttf');
            // const thFont = loadSync('./fonts/Kodchasan-Regular.ttf'); // mkmk
            
            const fontSize = 40;
            const kerning = true;
            const tracking = -15;
            const letterSpacing = 0;
            const xPos = 24;
            const yPos = 0;

            // Test input
            // const contentStrLine = 'ฤๅรื่องปัจจุบันของคุลกที่ต้';
            const contentStrLine = 'รื่';
            // const contentStrLine = 'ปับัจุปัคุ';
            // const contentStrLine = ' -串流、下載、分享,  享受5G 超快感。';
            // const contentStrLine =  'เริ่มต้นที่ ฿29,500'

            const path = thFont.getPath(contentStrLine, xPos, yPos, fontSize, {
                kerning, 
                tracking,
                letterSpacing
            });

            console.log(path.toPathData(1));
        });
    });
});
