const BrandingPlugin = require('./branding-plugin');

module.exports = function brandingCSSLoader(source) {
    // get reference to the instantiated branding plugin and push current CSS source to the collection
    const brandingPlugin = this.options.plugins && this.options.plugins.find(p => p instanceof BrandingPlugin);
    if(!brandingPlugin){
        throw new Error('Branding CSS Loader: Could not find BrandingPlugin. Make sure you have it in conf.plugins');
    }
    brandingPlugin.importedCSS.push(source);
    return source;
};
