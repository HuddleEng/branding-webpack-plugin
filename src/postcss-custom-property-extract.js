const postcss = require('postcss');

const parseCSSCustomProperties = postcss.plugin("postcss-custom-properties-parse", () => {
    return function plugin(style, result) {
        new Promise((resolve) => {
            const propvalmap = parse(style);
            if(Object.keys(propvalmap).length){
                result.propValMap = propvalmap;
                resolve(propvalmap);
            } else {
                resolve();
            }
        });
    };
});

const customPropertiesToValuePlugin = postcss.plugin("postcss-custom-properties-replace", (options = {}) => {
    return function plugin(style, result) {
        new Promise((resolve) => {
            const copied = copy(style);
            const updatedCSS = customPropertiesToValue(copied.root, options.propValMap);
            result.updatedCSS = updatedCSS;
            resolve(updatedCSS);
        });
    };
});


module.exports = {
    parseCSSCustomProperties,
    customPropertiesToValuePlugin
};

function parse(style){
    const map = {};

    style.walkRules((rule) => {
        const notRoot = rule.selectors.length !== 1 ||
            rule.selectors[0] !== ':root' ||
            rule.parent.type !== 'root';

        // only variables declared for `:root` are supported
        if (notRoot) {
            return;
        }

        rule.each((decl) => {
            const prop = decl.prop;
            if (prop && prop.indexOf('--') === 0) {
                if (!map[prop]) {
                    map[prop] = { value: decl.value };
                }
            }
        });
    });

    return map;
}


function copy(style){
    const root = postcss.root();

    style.walkDecls((decl) => {
        const value = decl.value;

        if (!value || value.indexOf("var(") === -1) {
            return;
        }

        const rule = decl.parent.clone();
        const declBucketsToAnalyse = new Map();
        const analyseDeclLater = (decl) => {
            if(declBucketsToAnalyse.has(decl.prop)){
                declBucketsToAnalyse.get(decl.prop).push(decl);
            } else {
                declBucketsToAnalyse.set(decl.prop, [decl]);
            }
        };

        rule.walkDecls((clonedDecl)=>{
            analyseDeclLater(clonedDecl);
        });

        declBucketsToAnalyse.forEach(declBucket => {
            // remove all decls except the last one. Remove the last one too, if it has no var()
            declBucket.forEach((clonedDecl, index) => {
                if (!(index === declBucket.length - 1 && clonedDecl.prop === decl.prop && clonedDecl.value === decl.value)){
                    rule.removeChild(clonedDecl);
                }
            });
        });

        root.append(rule);
    });

    return root.toResult();
}


function customPropertiesToValue(style, valkeymap){
    const root = postcss.root();

    style.walkDecls((decl) => {
        const value = decl.value;

        if (!value || value.indexOf("var(") === -1) {
            return;
        }

        const key = value.match(/\(([^)]+)\)/)[1];
        const mappedValue = valkeymap && valkeymap[key] && valkeymap[key].value;

        if(mappedValue){
            const rule = decl.parent.clone();

            rule.walkDecls((clonedDecl)=>{
                if (clonedDecl.prop === decl.prop && clonedDecl.value === decl.value) {
                    clonedDecl.value = clonedDecl.value.replace(/var\s*\(.+?\)/, mappedValue);
                } else {
                    rule.removeChild(clonedDecl);
                }
            });

            root.append(rule);
        }
    });

    return root.toResult();
}
