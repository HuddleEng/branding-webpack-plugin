const path = require('path');
const {spawn} = require('child_process');
const serve = require('./serve');

serve().then(() => {
    const npmRunJestProcess = spawn('npm', ['run', 'jest'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        shell: true
    });

    npmRunJestProcess.on('exit', (error) => {
        if (!error) {
            console.log('Success!');
            process.exit(0);
        } else {
            console.error('Failed tests');
            process.exit(1);
        }
    });

    npmRunJestProcess.on('error', error => {
        console.error(error);
        process.exit(1);
    })
});
