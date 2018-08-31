import path from 'path';
import webpack from 'webpack';
import rimraf from 'rimraf';

export default ({config, fixtureName}) => {
    let fixturePath = path.join(__dirname, 'fixture', fixtureName);
    config.output = {
        path: fixturePath,
        filename: 'output.js',
        publicPath: `fixture/${fixtureName}`
    };
    const compiler = webpack(config);

    return new Promise((resolve, reject) => {
        rimraf(fixturePath, () => {
            compiler.run((err, stats) => {
                if (err || stats.hasErrors()) reject(err);

                resolve(stats);
            });
        });
    });
};
