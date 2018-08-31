const handler = require('serve-handler');
const http = require('http');
const port = 3123;

function serve() {
    return new Promise(resolve => {
        const server = http.createServer((request, response) => {
            return handler(request, response, {
                public: __dirname
            });
        });

        server.listen(port, () => {
            console.log('Listening on port ' + port);
            resolve(port);
        });
    });
}

if (require.main === module) {
    serve();
}

module.exports = serve;
