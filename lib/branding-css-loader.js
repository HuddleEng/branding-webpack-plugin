const loaderUtils = require('loader-utils');

module.exports = function brandingCSSLoader(source) {
    const options = loaderUtils.getOptions(this);
    const brandingPlugin = options.getPlugin();
    brandingPlugin.importedCSS.push(source);
    return source;
};
