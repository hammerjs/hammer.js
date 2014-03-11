// AMD export
if(typeof define == 'function' && define.amd) {
  define(function(){
    return Hammer;
  });
}
// commonjs export
else if(typeof module == 'object' && module.exports) {
  module.exports = Hammer;
}
// browser export
else {
  window.Hammer = Hammer;
}