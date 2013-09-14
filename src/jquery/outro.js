  if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
    define('hammer-jquery', ['hammer', 'jquery'], init);
  } else {
    init(window.Hammer, window.jQuery || window.Zepto);
  }

}());