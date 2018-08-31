import compiler from './compiler';
const basicExampleConfig = require('../examples/basic-example/webpack.config.js');


describe('Branding Plugin', () => {
    const fixtureName = 'branding-loader-1';

    beforeAll(async () => {
        await compiler({config: basicExampleConfig, fixtureName: fixtureName});
        await page.goto('http://localhost:3123/');
    });

    it('It should have red background image if CSS vars are supported', async () => {
        await page.addScriptTag({url: `fixture/${fixtureName}/output.js`});
        const backgroundColor = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('background-color'));
        expect(backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('It should have red background image if CSS vars are NOT supported', async () => {
        await page.evaluate(() => window.CSS.supports = false);
        await page.addScriptTag({url: `fixture/${fixtureName}/output.js`});
        const backgroundColor = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('background-color'));
        const supports = await page.evaluate(() => window.CSS.supports);
        expect(supports).toBe(false);
        expect(backgroundColor).toBe('rgb(255, 0, 0)');
    });
});



