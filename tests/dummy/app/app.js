import Ember from 'ember';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';

let App;

Ember.MODEL_FACTORY_INJECTIONS = true;

App = Ember.Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver,
  customEvents: {
    touchstart: null,
    touchmove: null,
    touchcancel: null,
    touchend: null,
    mousedown: null,
    mouseenter: null,
    mousemove: null,
    mouseleave: null,
    mouseup: null,
    drag: null,
    dragend: null,
    dragenter: null,
    dragleave: null,
    dragover: null,
    dragstart: null,
    drop: null,
    dblclick: null
  }
});

loadInitializers(App, config.modulePrefix);

export default App;
