/*jshint node:true*/
var faker = require('faker');
var assign = require('object-assign');
var bodyParser = require('body-parser');

function between(min, max) {
  return Math.floor(Math.random() * (max + 1 - min) + min);
}

var MODEL_DEFAULTS = {
  __deleted: false
};

function itemFactory() {
  return assign({
    id: null,
    title: faker.lorem.words(between(3, 8)),
    description: faker.lorem.sentences(between(2, 5))
  }, MODEL_DEFAULTS);
}

function Store(factory, type) {
  this._recordMap = {};
  this._records = [];
  this._nextID = 0;
  this._schema = factory;
  this._type = type;
}

Store.prototype.clone = function clone(records) {
  return records.map(function(record) {
    return assign({}, record);
  });
};

Store.prototype.serializeOne = function serializeOne(record) {
  return {
    data: {
      id: record.id,
      type: this._type,
      attributes: assign({}, record)
    }
  };
};

Store.prototype.normalizeOne = function normalizeOne(record) {
  var values = record.data && record.data.attributes ? record.data.attributes : {};

  delete values.id;

  return values;
};

Store.prototype.serializeMany = function serializeMany(records) {
  var _this = this;
  var data = records.map(function(record) {
    return _this.serializeOne(record).data;
  });

  return { data: data };
};

Store.prototype.findRecord = function findRecord(id) {
  var record = this._recordMap[id];

  if (!record || record.__deleted) {
    throw new Error(404);
  }

  return this.serializeOne(record);
};

Store.prototype.createRecord = function createRecord(data) {
  var record = {};

  if (!data) {
    throw new Error(500);
  }

  var values = this.normalizeOne(data);

  assign(record, this._schema(), values, { id: this._nextID++ });
  this._records.push(record);
  this._recordMap[record.id] = record;

  return this.serializeOne(record);
};

Store.prototype.findAll = function findAll() {
  return this.serializeMany(this._records.filter(function(record) {
    return !record.__deleted;
  }));
};

Store.prototype.deleteRecord = function deleteRecord(id) {
  var record = this._recordMap[id];

  if (!record || record.__deleted) {
    throw new Error(500);
  }

  record.__deleted = true;
};

Store.prototype.updateRecord = function updateRecord(id, data) {
  var record = this._recordMap[id];

  if (!data || !record || record.__deleted) {
    throw new Error(500);
  }

  var values = this.normalizeOne(data);

  assign(record, values);

  return this.serializeOne(record);
};

module.exports = function(app) {
  var express = require('express');
  var itemsRouter = express.Router();
  var store = new Store(itemFactory, 'items');

  for (var i = 0; i < 50; i++) {
    store.createRecord({});
  }

  itemsRouter.get('/', function(req, res) {
    res.send(store.findAll());
  });

  itemsRouter.post('/', function(req, res) {
    res.status(201).send(store.createRecord(req.body));
  });

  itemsRouter.get('/:id', function(req, res) {
    res.send(store.findRecord(req.params.id));
  });

  itemsRouter.put('/:id', function(req, res) {
    res.send(store.updateRecord(req.params.id, req.body));
  });

  itemsRouter.delete('/:id', function(req, res) {
    store.deleteRecord(req.params.id);
    res.status(204).end();
  });

  // The POST and PUT call will not contain a request body
  // because the body-parser is not included by default.
  // To use req.body, run:

  //    npm install --save-dev body-parser

  // After installing, you need to `use` the body-parser for
  // this mock uncommenting the following line:
  //
  app.use('/api/items', bodyParser.json());
  app.use('/api/items', itemsRouter);
};
