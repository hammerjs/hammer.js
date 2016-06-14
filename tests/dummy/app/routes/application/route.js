import Ember from 'ember';

const {
  get,
  Route,
  set
  } = Ember;

export default Route.extend({

  setupController(controller, model) {
    this._super(controller, model);

    set(controller, 'currentRouteName', get(this, 'routeName'));
  }

});
