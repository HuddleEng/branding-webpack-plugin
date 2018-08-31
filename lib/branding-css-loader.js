const loaderUtils = require('loader-utils');

module.exports = function brandingCSSLoader(source) {
    const options = loaderUtils.getOptions(this);
    const brandingPlugin = options.plugin;
    brandingPlugin.importedCSS.push(source);
    return source;
};
