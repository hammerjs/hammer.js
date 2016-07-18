var fs = require('fs');
var pkg = require('./package.json');

var hammer = fs.readFileSync('hammer.js','utf8');
hammer = hammer.replace(/{{PKG_VERSION}}/g,pkg.version)

fs.writeFile('hammer.js', hammer,'utf8',function (err) {
  if(err)
    throw err
  console.log("String Replaced");
})
