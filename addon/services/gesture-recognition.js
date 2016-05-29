import Ember from 'ember';
import Manager from 'history/-private/gestures/manager';

const {
  Service
  } = Ember;

export default Service.extend({

  manager: null,

  init() {
    this._super();
    this.manager = new Manager();
  }
});
