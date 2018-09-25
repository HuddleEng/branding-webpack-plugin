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

    const brandingPlugin = options.getPlugin();

    produce(this, this.resource, options, (err, compiledBrandingCSS)=>{

        if(err){
            throw err;
        }

        // we'll use the same file name but with CSS extension
        let outputFileNameToReplace = loaderUtils.interpolateName(this, brandingPlugin.outputName, {content: compiledBrandingCSS});

        // if production, use css nano
        let isProduction = this._compiler.options.mode === 'production';
        let postCssPlugins = [postCssHelpers.parseCSSCustomProperties];
        if(isProduction){
            const cssnano = require('cssnano');
            postCssPlugins.push(cssnano({preset: 'default'}));
        }

        postcss(postCssPlugins).process(compiledBrandingCSS, {from: undefined}).then(({propValMap, css}) => {
            brandingPlugin.importedBrandings.push({outputFileNameToReplace, loaderContext: this, propValMap});
            const exports = {};
            Object.keys(propValMap || {}).forEach(key => exports[key] = propValMap[key].value);
            const output = `
                // CSS variables are supported to inject them into a style tag on the page
                if (!!(window.CSS && window.CSS.supports && window.CSS.supports('--fake-var', 0))) {
                    var style = document.createElement('style');
                    style.type = 'text/css';
                    style.media = 'all';
                    style.appendChild(document.createTextNode(${JSON.stringify(css)}));
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
    const childFilename = `branding-plugin-output`;
    const outputOptions = { filename: childFilename };
    let rootCompilation = getRootCompilation(loader);
    const childCompiler = rootCompilation
        .createChildCompiler(`branding-plugin ${request}`, outputOptions);

    const isProduction = rootCompilation.options.mode === 'production';

    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new LibraryTemplatePlugin(null, 'commonjs2').apply(childCompiler);
    new NodeTargetPlugin().apply(childCompiler);
    new SingleEntryPlugin(loader.context, `!!css-loader?${cssLoaderOptions}!${request}`, 'brandingPluginOutput').apply(childCompiler);
    new LimitChunkCountPlugin({ maxChunks: 1 }).apply(childCompiler);
    const subCache = `subcache ${__dirname} ${request}`;
    childCompiler.hooks.compilation.tap('BrandingChildPlugin', (compilation) => {
        if (compilation.cache) {
            if (!compilation.cache[subCache])
            { compilation.cache[subCache] = {}; }
            compilation.cache = compilation.cache[subCache];
        }
    });
    // We set loaderContext[__dirname] = false to indicate we already in
    // a child compiler so we don't spawn another child compilers from there.
    childCompiler.hooks.thisCompilation.tap('BrandingChildPlugin', (compilation) => {
        compilation.hooks.normalModuleLoader.tap('BrandingChildPlugin', (loaderContext) => {
            loaderContext[__dirname] = false;
        });
    });
    let source;
    childCompiler.hooks.afterCompile.tapAsync('BrandingChildPlugin', (compilation, callback) => {
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
