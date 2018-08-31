# Branding plugin 🎨
[![Build Status](https://api.travis-ci.org/HuddleEng/branding-webpack-plugin.svg)](https://travis-ci.org/HuddleEng/branding-webpack-plugin/)
[![NPM](https://nodei.co/npm/branding-webpack-plugin.png)](https://www.npmjs.com/package/branding-webpack-plugin)

Use CSS custom properties to theme your app with fallbacks for browsers that don't support it (tested on IE11).

## What it does
Branding plugin allows you to import CSS variables that get applied to the page. 
The CSS variables are defined in a `.branding` file. 
When imported, they get applied to the page, therefore any usage of the CSS variable gets the theme's colour.
You also get access to the colour values in JavaScript.

Branding plugin creates a nice fallback for IE 11 by creating an overrides stylesheet that gets loaded only when the browser doesn't support CSS variables.

The end result is that you can easily import a theme's colours without worrying about browser support.

📃 [**Blog post:** You can read more about how it works here](https://medium.com/huddle-engineering/branding-huddles-ui-using-css-variables-and-webpack-8613dba8aaba)

## Installation and configuration
You'll need webpack 4.

```bash
npm i --save-dev branding-webpack-plugin
```

> A non-supported webpack 3 version also exists. You can install it by running `npm i --save-dev branding-webpack3-plugin`


In your webpack config, create a new instance of BrandingPlugin and 
add its CSS loader to your CSS pipeline, and its loader for *.branding files.

```js
const BrandingPlugin = require('webpack-branding-plugin');
const brandingPlugin = new BrandingPlugin();
module.exports = {
    module: {
        rules: [
            {test: /\.branding$/, use: [brandingPlugin.createLoader()]},
            {test: /\.css$/, use: [{loader: 'style-loader'}, {loader: 'css-loader'}, brandingPlugin.createCSSLoader()]}
        ]
    },
    plugins: [brandingPlugin]
};
```



## Usage
Say you have your app's CSS in `app.css` and some branding/theming colours in `theme.branding`.

**app.css**
```css
body {
    color: black;
    background: var(--my-theme-color);
}
```

**theme.branding**
```css
:root {
    --my-theme-color: red;
}
```

Then, you can import `theme.branding` in your entry JS file:

**index.js**
```js
import './app.css'; // uses CSS and style loader

// uses branding plugin and loader to apply the CSS variables to the page,
// with fallbacks for browsers that don't support it!
import brandingVars from './theme.branding';

console.log(brandingVars); // Output: {'--my-theme-color': 'red'}
```

This also works with dynamic imports `import('./theme.branding')`, which means you can dynamically import a theme
at runtime e.g. ```import(`./theme-${confirm('Enter theme name')}.branding`)```. 
You can [read the blog post](https://medium.com/huddle-engineering/branding-huddles-ui-using-css-variables-and-webpack-8613dba8aaba) to learn more about a real use case. 


## Example

Take a look at the `examples` folder for a working example of how it works.

## Caveats
- CSS overrides are used to override app CSS when the browser doesn't support custom properties. This has [specificity implications](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity).
- There is a known issue where Edge (which supports custom properties) doesn't load images from the correct relative root.  

## Contributions

Contributions welcome via issues and pull requests! Read our [contribution guide here](https://github.com/HuddleEng/Open-Source/blob/master/CONTRIBUTING.md).

There is a basic test to ensure the plugin works with and without CSS variable support.

To run the tests, run:

```bash
npm test
```

You can also run the test server in the background using `npm run serve-test` and run jest directly in another terminal using `npm run jest`.
