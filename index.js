const http2 = require('http2');
const { execSync } = require('child_process');
const fs = require('fs');

// this is the domain. Change it to `example.com` or your own domain.
const DOMAIN = 'bla.test';

// If the cert was already generated, use it. Otherwise generate a new one.
if (!fs.existsSync(`${DOMAIN}.key`) || !fs.existsSync(`${DOMAIN}.cert`)) {
  // Generate a certificate signing request (CSR)
  const csr = execSync(`openssl req -new -newkey rsa:4096 -nodes -keyout ${DOMAIN}.key -out ${DOMAIN}.csr -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=${DOMAIN}"`).toString();

  // Use the CSR to create a self-signed server certificate
  const cert = execSync(`openssl req -new -newkey rsa:4096 -days 365 -nodes -x509 -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=${DOMAIN}" -keyout ${DOMAIN}.key  -out ${DOMAIN}.cert`).toString();
}

// By default this creates a http2 server.
const server = http2.createSecureServer({
  key: fs.readFileSync(`${DOMAIN}.key`),
  cert: fs.readFileSync(`${DOMAIN}.cert`),
});

server.on('stream', (stream, headers) => {
  // The default path of what you want to return.
  if (headers[':path'] === '/data') {

    // Read the JSON file
    fs.readFile('./data.json', 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        stream.respond({ ':status': 500 });
        stream.end('Internal Server Error');
        return;
      }

      const contentLength = Buffer.byteLength(data, 'utf8');
      stream.respond({
        'content-type': 'application/json',
        'content-length': `${contentLength}`,
        ':status': 200
      });

      // Send the JSON data as the response
      stream.end(data);
    });
  } else {
    stream.respond({ ':status': 302, "location": `http://${DOMAIN}:80/data` });
    stream.end('Not Found');
  }
});

server.listen(443, () => {
  console.log(`Server listening on https://${DOMAIN}:443`);
});

const http = require('http');

const hserver = http.createServer((req, res) => {
  if (req.url === '/data') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Hello, World!</h1>');
  } else {
    res.writeHead(400);
    res.end();
  }
});

hserver.listen(80, () => {
  console.log(`Server running on port 80`);
});
