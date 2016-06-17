import Ember from 'ember';

export default function(moduleName, exportName = 'default') {
  let module = Ember.__loader.require(moduleName);

  return module[exportName];
}
