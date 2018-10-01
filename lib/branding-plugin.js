const postcss = require('postcss');
const postCssHelpers = require('./postcss-custom-property-extract');
const path = require('path');
const loaderPath = path.resolve(__dirname, './branding-loader.js');
const loaderUtils = require('loader-utils');
const ReplaceSource = require('webpack-sources').ReplaceSource;

class BrandingPlugin {
    constructor(options = {}) {
        // reference to a list of brandings that will be pushed onto by the branding loader
        this.importedBrandings = [];
        this.importedCSS = [];
        this.options = options;
        this.options.getPlugin = () => this;
        this.outputName = '[name].[contenthash].css';
    }

    createLoader() {
        return {loader: require.resolve('./branding-loader'), options: this.options};
    }

    createCSSLoader() {
        return {loader: require.resolve('./branding-css-loader'), options: this.options};
    }

    apply(compiler) {
        // when the plugin gets executed, listen to when webpack has finished compilation
        compiler.hooks.compilation.tap('BrandingPlugin', (compilation) => {
            compilation.hooks.optimizeChunkAssets.tapAsync('BrandingPlugin', (chunks, callback) => {
                const loadersForChunk = chunk => Array.from(chunk.modulesIterable, module => module.loaders).reduce((acc, curr) => acc.concat(curr), []);
                const filesToPatch = chunks.filter(chunk => loadersForChunk(chunk).find(({loader} = {}) => loader === loaderPath)).map(chunk => chunk.files).reduce((acc, curr) => acc.concat(curr), []);
                if (filesToPatch.length === 0) {
                    callback();
                    return;
                }

                const uniqueImportedCSS = Array.from(new Set(this.importedCSS)); // other webpack plugins could be using branding plugin with the same css.
                const originalCSS = uniqueImportedCSS.join('\n');
                postcss(require('postcss-discard-duplicates')()).process(originalCSS, {from: undefined}).then(originalCSSResult => {
                    const finishedPromises = [];
                    this.importedBrandings.forEach(({outputFileNameToReplace, loaderContext, propValMap}) => {

                        finishedPromises.push(new Promise(resolve => {
                            postcss([postCssHelpers.customPropertiesToValuePlugin({propValMap})]).process(originalCSSResult, {from: undefined}).then(({updatedCSS}) => {
                                const brandingCSSContents = updatedCSS.css;
                                if (compiler.options.mode === 'production') {
                                    const cssnano = require('cssnano');
                                    return postcss([cssnano({preset: 'default'})]).process(brandingCSSContents, {from: undefined}).then(result => {
                                        return result.css;
                                    });
                                } else {
                                    return brandingCSSContents;
                                }
                            }).then(brandingCSSContents => {
                                let actualFileName = loaderUtils.interpolateName(loaderContext, this.outputName, {content: brandingCSSContents});
                                compilation.assets[actualFileName] = {
                                    source: () => brandingCSSContents,
                                    size: () => brandingCSSContents.length
                                };

                                filesToPatch.forEach(fileToPatch => {
                                    const replacedSource = new ReplaceSource(compilation.assets[fileToPatch]);
                                    const original = compilation.assets[fileToPatch].source();

                                    let indexToReplace = original.indexOf(outputFileNameToReplace);
                                    while (indexToReplace !== -1) {
                                        replacedSource.replace(indexToReplace, indexToReplace + outputFileNameToReplace.length - 1, actualFileName);
                                        indexToReplace = original.indexOf(outputFileNameToReplace, indexToReplace + 1); // find next index
                                    }

                                    compilation.assets[fileToPatch] = replacedSource;
                                });
                                resolve();
                            });

                        }));
                    });

                    Promise.all(finishedPromises).then(() => {
                        callback();
                    });
                });
            });
        });
    }
}

module.exports = BrandingPlugin;
