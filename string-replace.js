const fs = require('fs');
const pkg = require('./package.json');

let hammer = fs.readFileSync('hammer.js', 'utf8');
hammer = hammer.replace(/{{PKG_VERSION}}/g, pkg.version);

fs.writeFile('hammer.js', hammer, 'utf8', (err) => {
  if (err) {
    throw err;
  }
  console.log('String Replaced!');
});
