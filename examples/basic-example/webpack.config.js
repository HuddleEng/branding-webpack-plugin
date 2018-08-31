const BrandingPlugin = require('../../lib/branding-plugin');
const brandingPlugin = new BrandingPlugin();
const path = require('path');
module.exports = {
    entry: path.join(__dirname, "./index.js"),
    mode: 'development',
    module: {
        rules: [
            {test: /\.branding$/, use: [brandingPlugin.createLoader()]},
            {test: /\.css$/, use: [{loader: 'style-loader'}, {loader: 'css-loader'}, brandingPlugin.createCSSLoader()]}
        ]
    },
    output: {
        path: path.join(__dirname, "./dist"),
        filename: 'output.js',
        publicPath: 'dist/'
    },
    plugins: [brandingPlugin]
};
