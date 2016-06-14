import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('items', { path: '/' }, function() {
    this.route('single', { path: '/:id' });
  });
});

export default Router;
