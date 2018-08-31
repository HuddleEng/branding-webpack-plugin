const BrandingPlugin = require('./branding-plugin');
const loaderUtils = require('loader-utils');

const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');
const LimitChunkCountPlugin = require('webpack/lib/optimize/LimitChunkCountPlugin');
const postcss = require('postcss');
const postCssHelpers = require('./postcss-custom-property-extract');

module.exports = function brandingLoader() {
    const done = this.async();
    const options = loaderUtils.getOptions(this);

    // get reference to the instantiated babel plugin and push the current branding path to the collection
    const brandingPlugin = this.options.plugins && this.options.plugins.find(p => p instanceof BrandingPlugin);
    if(!brandingPlugin){
        throw new Error('Branding Loader: Could not find BrandingPlugin. Make sure you have it in conf.plugins');
    }


    produce(this, this.resource, options, (err, compiledBrandingCSS)=>{

        if(err){
            throw err;
        }

        // we'll use the same file name but with CSS extension
        let outputFileNameToReplace = loaderUtils.interpolateName(this, brandingPlugin.outputName, {content: compiledBrandingCSS});

        postcss([postCssHelpers.parseCSSCustomProperties]).process(compiledBrandingCSS, {from: undefined}).then(({propValMap}) => {
            brandingPlugin.importedBrandings.push({outputFileNameToReplace, loaderContext: this, propValMap});
            const exports = {};
            Object.keys(propValMap || {}).forEach(key => exports[key] = propValMap[key].value);
            const output = `
                // CSS variables are supported to inject them into a style tag on the page
                if (!!(window.CSS && window.CSS.supports && window.CSS.supports('--fake-var', 0))) {
                    var style = document.createElement('style');
                    style.type = 'text/css';
                    style.media = 'all';
                    style.appendChild(document.createTextNode(${JSON.stringify(compiledBrandingCSS)}));
                    document.head.appendChild(style);
                } else {
                    // no CSS variable support so link the branding output that is created in the branding plugin later
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.type = 'text/css';
                    link.href = __webpack_public_path__ + ${JSON.stringify(outputFileNameToReplace)};
                    link.media = 'all';
                    document.addEventListener('DOMContentLoaded', function(){
                        document.body.appendChild(link); 
                    });
                }
                module.exports = ${JSON.stringify(exports)};
        `;
            done(null, output);

        });
    }, {});
};


// Adapted from https://github.com/wikiwi/value-loader/blob/master/index.js (MIT License)
function produce(loader, request, options, callback) {
    const cssLoaderOptions = JSON.stringify(options.css || {});
    const childFilename = 'branding-plugin-output-filename';
    const outputOptions = { filename: childFilename };
    const childCompiler = getRootCompilation(loader)
        .createChildCompiler(`branding-plugin ${request}`, outputOptions);
    childCompiler.apply(new NodeTemplatePlugin(outputOptions));
    childCompiler.apply(new LibraryTemplatePlugin(null, 'commonjs2'));
    childCompiler.apply(new NodeTargetPlugin());
    childCompiler.apply(new SingleEntryPlugin(loader.context, `!!css-loader?${cssLoaderOptions}!${request}`));
    childCompiler.apply(new LimitChunkCountPlugin({ maxChunks: 1 }));
    const subCache = `subcache ${__dirname} ${request}`;
    childCompiler.plugin('compilation', (compilation) => {
        if (compilation.cache) {
            if (!compilation.cache[subCache])
            { compilation.cache[subCache] = {}; }
            compilation.cache = compilation.cache[subCache];
        }
    });
    // We set loaderContext[__dirname] = false to indicate we already in
    // a child compiler so we don't spawn another child compilers from there.
    childCompiler.plugin('this-compilation', (compilation) => {
        compilation.plugin('normal-module-loader', (loaderContext) => {
            loaderContext[__dirname] = false;
        });
    });
    let source;
    childCompiler.plugin('after-compile', (compilation, callback) => {
        source = compilation.assets[childFilename] && compilation.assets[childFilename].source();

        // Remove all chunk assets
        compilation.chunks.forEach((chunk) => {
            chunk.files.forEach((file) => {
                delete compilation.assets[file];
            });
        });

        callback();
    });

    childCompiler.runAsChild((err, entries, compilation) => {
        if (err) return callback(err);

        if (compilation.errors.length > 0) {
            return callback(compilation.errors[0]);
        }
        if (!source) {
            return callback(new Error('Didn\'t get a result from child compiler'));
        }
        compilation.fileDependencies.forEach((dep) => {
            loader.addDependency(dep);
        }, loader);
        compilation.contextDependencies.forEach((dep) => {
            loader.addContextDependency(dep);
        }, loader);

        let exports;
        try {
            exports = loader.exec(source, request);
        } catch (e) {
            return callback(e);
        }
        if (exports) {
            exports.toString();
            callback(null, exports.toString());
        } else {
            callback();
        }
    });
}


function getRootCompilation(loader) {
    let compiler = loader._compiler;
    let compilation = loader._compilation;
    while (compiler.parentCompilation) {
        compilation = compiler.parentCompilation;
        compiler = compilation.compiler;
    }
    return compilation;
}
