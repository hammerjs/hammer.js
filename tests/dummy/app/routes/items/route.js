import Ember from 'ember';

const {
  get,
  set,
  Route
  } = Ember;

export default Route.extend({

  model() {
    return this.get('store').findAll('item');
  },

  setupController(controller, model) {
    this._super(controller, model);

    set(controller, 'currentRouteName', get(this, 'routeName'));
  }

});
