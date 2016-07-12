/*! Hammer.JS - v2.0.8 - 2016-07-12
 * http://hammerjs.github.io/
 *
 * Copyright (c) 2016 Jorik Tangelder;
 * Licensed under the MIT license */
(function(window, document, exportName, undefined) { 
'use strict';
var SMALL_ARRAY_LENGTH = 200;
var UNDEFINED_KEY = Object.create(null);

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var FastArray = function () {
  function FastArray() {
    var length = arguments.length <= 0 || arguments[0] === undefined ? SMALL_ARRAY_LENGTH : arguments[0];
    var name = arguments.length <= 1 || arguments[1] === undefined ? 'Unknown Pool' : arguments[1];
    classCallCheck(this, FastArray);

    this.init(length, name);
  }

  createClass(FastArray, [{
    key: 'init',
    value: function init() {
      var length = arguments.length <= 0 || arguments[0] === undefined ? SMALL_ARRAY_LENGTH : arguments[0];
      var name = arguments.length <= 1 || arguments[1] === undefined ? 'Unknown Pool' : arguments[1];

      this.name = name;
      this.length = 0;
      this._length = length;
      this._data = new Array(length);
    }
  }, {
    key: 'get',
    value: function get(index) {
      if (index >= 0 && index < this.length) {
        return this._data[index];
      }

      return undefined;
    }
  }, {
    key: 'set',
    value: function set(index, value) {
      if (index > this.length) {
        throw new Error("Index is out of array bounds.");
      }

      if (index === this.length) {
        this.length++;
      }

      this._data[index] = value;
    }
  }, {
    key: 'forEach',
    value: function forEach(cb) {
      for (var i = 0; i < this.length; i++) {
        cb(this._data[i], i);
      }
    }
  }, {
    key: 'emptyEach',
    value: function emptyEach(cb) {
      for (var i = 0; i < this.length; i++) {
        cb(this._data[i], i);
        this._data[i] = undefined;
      }

      this.length = 0;
    }
  }, {
    key: 'mapInPlace',
    value: function mapInPlace(cb) {
      for (var i = 0; i < this.length; i++) {
        this._data[i] = cb(this._data[i], i);
      }
    }
  }, {
    key: 'map',
    value: function map(cb) {
      var arr = new FastArray(this._length, this.name);

      for (var i = 0; i < this.length; i++) {
        arr._data[i] = cb(this._data[i], i);
      }

      return arr;
    }
  }, {
    key: 'push',
    value: function push(item) {
      var index = this.length++;

      if (index === this._length) {
        this._length *= 2;
        this._data.length = this._length;
      }

      this._data[index] = item;
    }
  }, {
    key: 'pop',
    value: function pop() {
      var index = --this.length;

      if (index < 0) {
        this.length = 0;
        return undefined;
      }

      return this._data[index];
    }
  }]);
  return FastArray;
}();

var STREAM_EVENT_POOL = new FastArray(undefined, 'StreamEvent Pool');

var StreamEvent = function () {
  function StreamEvent(name, info, prev) {
    classCallCheck(this, StreamEvent);

    this.init(name, info, prev);
  }

  createClass(StreamEvent, [{
    key: 'init',
    value: function init(name, info, prev) {
      this.name = name;
      this.element = info.event.target;
      this._isImportantEvent = name === 'end' || name === 'start' || prev && prev.name === 'start';
      this._source = this._isImportantEvent ? info.event : undefined;
      this.silenced = false;
      this.prev = prev;
      this.pointerId = info.pointerId;

      // time
      this.time = performance.now();
      this.dT = prev ? this.time - prev.time : 0;

      // current position (clientX/Y)
      this.x = info.x;
      this.y = info.y;

      // deltas off of origin event
      this.originX = info.originX;
      this.originY = info.originY;
      this.totalX = info.x - this.originX;
      this.totalY = info.y - this.originY;

      // deltas off the segment
      this.segmentOriginX = info.segmentOriginX;
      this.segmentOriginY = info.segmentOriginY;
      this.segmentX = info.x - this.segmentOriginX;
      this.segmentY = info.y - this.segmentOriginY;

      // deltas off of last event
      this.dX = prev ? info.x - prev.x : 0;
      this.dY = prev ? info.y - prev.y : 0;

      // prediction values
      this.acceleration = 0;
      this.aX = 0;
      this.aY = 0;

      this.velocity = 0;
      this.vX = 0;
      this.vY = 0;

      this.nextX = 0;
      this.nextY = 0;
    }
  }, {
    key: 'getAccelerationX',
    value: function getAccelerationX() {
      var dT = this.dT;
      var prev = this.prev;

      var vX = this.getVelocityX();
      var _vX = prev.vX;


      return this.aX = (vX - _vX) / dT;
    }
  }, {
    key: 'getAccelerationY',
    value: function getAccelerationY() {
      var dT = this.dT;
      var prev = this.prev;

      var vY = this.getVelocityY();
      var _vY = prev.vY;


      return this.aY = (vY - _vY) / dT;
    }
  }, {
    key: 'getAcceleration',
    value: function getAcceleration() {
      var aX = this.getAccelerationX();
      var aY = this.getAccelerationY();
      var acceleration = this.acceleration = Math.sqrt(aX * aX + aY * aY);

      return { aX: aX, aY: aY, acceleration: acceleration };
    }
  }, {
    key: 'getVelocityX',
    value: function getVelocityX() {
      var dX = this.dX;
      var dT = this.dT;


      return this.vX = dX / dT;
    }
  }, {
    key: 'getVelocityY',
    value: function getVelocityY() {
      var dY = this.dY;
      var dT = this.dT;


      return this.vY = dY / dT;
    }
  }, {
    key: 'getVelocity',
    value: function getVelocity() {
      var vX = this.getVelocityX();
      var vY = this.getVelocityY();
      var velocity = this.velocity = Math.sqrt(vX * vX + vY * vY);

      return { vX: vX, vY: vY, velocity: velocity };
    }
  }, {
    key: 'predictX',
    value: function predictX() {
      var aX = this.getAccelerationX();
      var x = this.x;
      var dX = this.dX;
      var vX = this.vX;
      var dT = this.dT;
      var totalX = this.totalX;

      // distance = initial distance + velocity * time + 1/2 acceleration * time^2

      var nextDeltaX = Math.round(vX * dT + 0.5 * aX * dT * dT);
      var nextdX = dX + nextDeltaX;
      var nextX = x + nextDeltaX;
      var nextTotalX = totalX + nextDeltaX;

      return this.nextX = { x: nextX, dX: nextdX, totalX: nextTotalX };
    }
  }, {
    key: 'predictY',
    value: function predictY() {
      var aY = this.getAccelerationY();
      var y = this.y;
      var dY = this.dY;
      var vY = this.vY;
      var dT = this.dT;
      var totalY = this.totalY;

      // distance = initial distance + velocity * time + 1/2 acceleration * time^2

      var nextDeltaY = Math.round(vY * dT + 0.5 * aY * dT * dT);
      var nextdY = dY + nextDeltaY;
      var nextY = y + nextDeltaY;
      var nextTotalY = totalY + nextDeltaY;

      return this.nextY = { y: nextY, dY: nextdY, totalY: nextTotalY };
    }
  }, {
    key: 'predict',
    value: function predict() {
      var nextX = this.predictX();
      var nextY = this.predictY();

      return { x: nextX, y: nextY };
    }

    // cancel any default behaviors from this event

  }, {
    key: 'silence',
    value: function silence() {
      if (this._source && this._source.cancelable) {
        this._source.preventDefault();
        this._source.stopPropagation();
        this.silenced = true;
      }
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this._source = undefined;
      this.prev = undefined;
      this.element = undefined;

      STREAM_EVENT_POOL.push(this);
    }
  }], [{
    key: 'create',
    value: function create(name, info, prev) {
      var event = STREAM_EVENT_POOL.pop();

      if (event) {
        event.init(name, info, prev);
        return event;
      }

      return new StreamEvent(name, info, prev);
    }
  }]);
  return StreamEvent;
}();

var STREAM_SERIES_POOL = new FastArray(10, 'StreamSeries Pool');

var StreamSeries = function (_FastArray) {
  inherits(StreamSeries, _FastArray);

  function StreamSeries(values) {
    var number = arguments.length <= 1 || arguments[1] === undefined ? SMALL_ARRAY_LENGTH : arguments[1];
    var name = arguments.length <= 2 || arguments[2] === undefined ? 'StreamEvent to List' : arguments[2];
    classCallCheck(this, StreamSeries);

    var _this = possibleConstructorReturn(this, Object.getPrototypeOf(StreamSeries).call(this, number, name));

    _this.init(values, number, name);
    _this._isDestroyed = false;
    return _this;
  }

  createClass(StreamSeries, [{
    key: 'init',
    value: function init(_ref, length, name) {
      var originX = _ref.originX;
      var originY = _ref.originY;

      get(Object.getPrototypeOf(StreamSeries.prototype), 'init', this).call(this, length, name);
      this.originX = originX;
      this.originY = originY;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      if (!this._isDestroyed) {
        this._isDestroyed = true;

        for (var j = 0; j < this.length; j++) {
          this._data[j].destroy();
          this._data[j] = undefined;
        }

        STREAM_SERIES_POOL.push(this);
      }
    }
  }], [{
    key: 'create',
    value: function create(values) {
      var number = arguments.length <= 1 || arguments[1] === undefined ? SMALL_ARRAY_LENGTH : arguments[1];
      var name = arguments.length <= 2 || arguments[2] === undefined ? 'StreamEvent to List' : arguments[2];

      var series = STREAM_SERIES_POOL.pop();

      if (series) {
        series.init(values, number, name);

        return series;
      }

      return new StreamSeries(values, number, name);
    }
  }]);
  return StreamSeries;
}(FastArray);

var MacroTask = function MacroTask(job) {
  classCallCheck(this, MacroTask);

  setTimeout(job, 0);
};

var STREAM_POOL = new FastArray(5, 'Stream Pool');

var Stream = function () {
  function Stream(values) {
    classCallCheck(this, Stream);

    this.init(values);
  }

  createClass(Stream, [{
    key: 'init',
    value: function init(_ref) {
      var pointerId = _ref.pointerId;
      var originX = _ref.originX;
      var originY = _ref.originY;

      this.segments = new FastArray(5, 'Segments');
      this.series = undefined;
      this._isDestroyed = false;
      this._isDestroying = false;
      this.active = false;
      this.pointerId = pointerId;
      this.originX = originX;
      this.originY = originY;
    }
  }, {
    key: 'open',
    value: function open(info) {
      this.active = true;
      this.series = StreamSeries.create({ originX: info.x, originY: info.y });
      this.segments.push(this.series);

      var streamEvent = StreamEvent.create('start', this._addContextToInfo(info));

      this.series.push(streamEvent);
      return streamEvent;
    }
  }, {
    key: 'push',
    value: function push(info) {
      var lastEvent = this.series.get(this.series.length - 1);
      var streamEvent = StreamEvent.create('move', this._addContextToInfo(info), lastEvent);

      this.series.push(streamEvent);
      return streamEvent;
    }
  }, {
    key: 'close',
    value: function close(info) {
      var _this = this;

      this.active = false;
      var lastEvent = this.series.get(this.series.length - 1);
      var streamEvent = StreamEvent.create('end', this._addContextToInfo(info), lastEvent);

      this.series.push(streamEvent);

      this._isDestroying = true;
      new MacroTask(function () {
        _this.destroy();
      });

      return streamEvent;
    }
  }, {
    key: 'silence',
    value: function silence() {
      var series = this.segments.get(0);
      var down = series.get(0);
      var initial = series.get(1);

      down.silence();
      initial.silence();
    }
  }, {
    key: 'split',
    value: function split() {
      var lastEvent = this.series.get(this.series.length - 1);
      this.series = StreamSeries.create({ originX: lastEvent.x, originY: lastEvent.y });
      this.segments.push(this.series);
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      if (!this._isDestroyed) {
        this._isDestroyed = true;
        this.series = undefined;

        this.segments.forEach(function (series) {
          series.destroy();
        });
        this.segments = undefined;

        STREAM_POOL.push(this);
      }
    }
  }, {
    key: '_addContextToInfo',
    value: function _addContextToInfo(info) {
      info.originX = this.originX;
      info.originY = this.originY;
      info.segmentOriginX = this.series.originX;
      info.segmentOriginY = this.series.originY;

      return info;
    }
  }], [{
    key: 'create',
    value: function create(values) {
      var stream = STREAM_POOL.pop();

      if (stream) {
        stream.init(values);
        return stream;
      }

      return new Stream(values);
    }
  }]);
  return Stream;
}();

// All Credit for this goes to the Ember.js Core Team

// This exists because `Object.create(null)` is absurdly slow compared
// to `new EmptyObject()`. In either case, you want a null prototype
// when you're treating the object instances as arbitrary dictionaries
// and don't want your keys colliding with build-in methods on the
// default object prototype.

var proto = Object.create(null, {
  // without this, we will always still end up with (new
  // EmptyObject()).constructor === Object
  constructor: {
    value: undefined,
    enumerable: false,
    writable: true
  }
});

function EmptyObject() {}
EmptyObject.prototype = proto;

var HashMap = function () {
  function HashMap(entries) {
    classCallCheck(this, HashMap);

    this._data = new EmptyObject();

    if (entries) {
      for (var i = 0; i < entries.length; i++) {
        this.data[entries[i][0]] = entries[i][1];
      }
    }
  }

  createClass(HashMap, [{
    key: 'forEach',
    value: function forEach(cb) {
      for (var key in this._data) {
        // skip undefined
        if (this._data[key] !== UNDEFINED_KEY) {
          cb(this._data[key], key);
        }
      }

      return this;
    }
  }, {
    key: 'get',
    value: function get(key) {
      var val = this._data[key];

      return val === UNDEFINED_KEY ? undefined : val;
    }
  }, {
    key: 'set',
    value: function set(key, value) {
      this._data[key] = value;

      return this;
    }
  }, {
    key: 'delete',
    value: function _delete(key) {
      this._data[key] = UNDEFINED_KEY;

      return true;
    }
  }]);
  return HashMap;
}();

var Input = function () {
  function Input(element, manager) {
    classCallCheck(this, Input);

    this.element = element;
    this.handler = null;
    this.handlerStack = [];

    this.attached = false;
    this.streaming = false;
    this.hasMoved = false;

    this.openStreams = 0;
    this.streams = new HashMap();
    this._nextEvents = new HashMap();

    this._handlers = { start: null, update: null, end: null, interrupt: null };
    this.manager = manager;

    this.attach();
  }

  createClass(Input, [{
    key: '_bind',
    value: function _bind(name) {
      var _name;

      var _handlers = this._handlers;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return _handlers[name] = (_name = this[name]).bind.apply(_name, [this].concat(args));
    }
  }, {
    key: 'extractThen',
    value: function extractThen(name, event) {
      this[name](this.extract(event));
    }
  }, {
    key: 'extractManyThen',
    value: function extractManyThen(name, event) {
      this.extractMany(event).forEach(this[name].bind(this));
    }
  }, {
    key: 'start',
    value: function start(eventInfo) {
      var stream = Stream.create({
        pointerId: eventInfo.pointerId,
        originX: eventInfo.x,
        originY: eventInfo.y
      });

      var streams = this.streams;


      streams.forEach(function (stream) {
        return stream.split();
      });

      this.streaming = true;

      this.openStreams++;
      streams.set(stream.pointerId, stream);
      // console.log('opening new stream');
      var streamEvent = stream.open(eventInfo);

      if (this.handler) {
        this.handlerStack.push(this.handler);
        this.handler = null;
      }

      this.manager.recognize(this, streams, stream, streamEvent);

      this._poll();
    }
  }, {
    key: 'trigger',
    value: function trigger(stream, streamEvent) {
      if (this.handler) {
        this.handler.recognize(this, this.streams, stream, streamEvent);
      } else {
        this.manager.recognize(this, this.streams, stream, streamEvent);
      }
    }
  }, {
    key: '_update',
    value: function _update(eventInfo) {
      // console.log('updating');
      var streams = this.streams;

      var stream = streams.get(eventInfo.pointerId);
      var streamEvent = void 0;

      if (!this.streaming) {
        if (!this.handler) {}
        // console.log('closing stream');
        streamEvent = stream.close(eventInfo);

        this.hasMoved = false;
        this.trigger(stream, streamEvent);

        var wasRecognizing = this.handler;

        this.handler = null;

        // vacate this stream
        // console.log('removing stream');
        streams.delete(stream.pointerId);
        this.openStreams--;

        if (wasRecognizing && this.openStreams === 0) {
          this.manager.endInputRecognition();
        }
      } else {
        streamEvent = stream.push(eventInfo);

        this.trigger(stream, streamEvent);
      }
    }
  }, {
    key: '_poll',
    value: function _poll() {
      var _this = this;

      return void requestAnimationFrame(function () {
        _this._nextEvents.forEach(function (event, key) {
          _this._update(event);
          _this._nextEvents.delete(key);
        });

        if (_this.streaming) {
          _this._poll();
        }
      });
    }
  }, {
    key: 'update',
    value: function update(eventInfo) {
      if (!this.streaming) {
        return;
      }

      this._nextEvents.set(eventInfo.pointerId, eventInfo);

      if (!this.hasMoved) {
        this.hasMoved = true;
        this._update(eventInfo);
      }
    }
  }, {
    key: '_close',
    value: function _close(event) {
      if (this.streaming) {
        // console.log('received close event');
        this.streaming = false;
        this._nextEvents.set(event.pointerId, event);
      }
    }
  }, {
    key: 'end',
    value: function end(event) {
      if (this.streaming) {
        this._close(event);
      }
    }
  }, {
    key: 'interrupt',
    value: function interrupt(event) {
      if (this.streaming) {
        this._close(event);
      }
    }
  }, {
    key: 'extract',
    value: function extract() {
      throw new Error('Interface Method Not Implemented');
    }
  }, {
    key: 'extractMany',
    value: function extractMany() {
      throw new Error('Interface Method Not Implemented');
    }
  }, {
    key: 'attach',
    value: function attach() {
      throw new Error('Interface Method Not Implemented');
    }
  }, {
    key: 'deattach',
    value: function deattach() {
      throw new Error('Interface Method Not Implemented');
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.deattach();
      this.manager = null;
      this.element = null;
      this.streams = null;
      this.handler = null;
    }
  }]);
  return Input;
}();

var Layer = function () {
  function Layer(element) {
    classCallCheck(this, Layer);

    this.element = element;
    this.recognizers = [];
    this._handlers = {};
  }

  createClass(Layer, [{
    key: 'recognize',
    value: function recognize(input, streams, stream, streamEvent) {
      var recognizers = this.recognizers;


      for (var i = 0; i < recognizers.length; i++) {
        var recognizer = recognizers[i];

        if (recognizer.recognize(input, streams, stream, streamEvent)) {
          input.handler = recognizer;
          return true;
        }
      }

      return false;
    }
  }, {
    key: 'addRecognizer',
    value: function addRecognizer(recognizerInstance) {
      recognizerInstance.layer = this;
      this.recognizers.push(recognizerInstance);
    }
  }, {
    key: 'emit',
    value: function emit(e) {
      var name = e.name;

      var handlers = (this._handlers['*'] || []).concat(this._handlers[name] || []);

      for (var i = 0; i < handlers.length; i++) {
        handlers[i].call(null, e);
      }
    }
  }, {
    key: 'on',
    value: function on(event, handler) {
      this._handlers[event] = this._handlers[event] || [];
      this._handlers[event].push(handler);
    }
  }, {
    key: 'off',
    value: function off() {}
  }]);
  return Layer;
}();

var TouchInput = function (_Input) {
  inherits(TouchInput, _Input);

  function TouchInput() {
    classCallCheck(this, TouchInput);
    return possibleConstructorReturn(this, Object.getPrototypeOf(TouchInput).apply(this, arguments));
  }

  createClass(TouchInput, [{
    key: 'extract',
    value: function extract(event) {
      return extractTouch(event.changedTouches[0], event);
    }
  }, {
    key: 'extractMany',
    value: function extractMany(event) {
      return Array.prototype.slice.call(event.changedTouches).map(function (touch) {
        return extractTouch(touch, event);
      });
    }
  }, {
    key: 'attach',
    value: function attach() {
      if (this.attached) {
        return;
      }
      var element = this.element;


      element.addEventListener('touchstart', this._bind('extractThen', 'start'), true);
      element.addEventListener('touchend', this._bind('extractThen', 'end'), true);
      element.addEventListener('touchcancel', this._bind('extractThen', 'interrupt'), true);
      element.addEventListener('touchmove', this._bind('extractManyThen', 'update'), true);

      this.attached = true;
    }
  }, {
    key: 'deattach',
    value: function deattach() {
      if (!this.attached) {
        return;
      }
      var element = this.element;
      var _handlers = this._handlers;


      element.removeEventListener('touchstart', _handlers.start, true);
      element.removeEventListener('touchend', _handlers.end, true);
      element.removeEventListener('touchcancel', _handlers.interrupt, true);
      element.removeEventListener('touchmove', _handlers.update, true);
    }
  }]);
  return TouchInput;
}(Input);

function extractTouch(touch, event) {
  return {
    pointerId: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
    event: event
  };
}

var supportsPassive = false;

try {
  var opts = Object.defineProperty({}, 'passive', {
    get: function get() {
      supportsPassive = true;
    }
  });

  window.addEventListener('test', null, opts);
} catch (e) {}

var SUPPORTS_PASSIVE = supportsPassive;

var MouseInput = function (_Input) {
  inherits(MouseInput, _Input);

  function MouseInput() {
    classCallCheck(this, MouseInput);
    return possibleConstructorReturn(this, Object.getPrototypeOf(MouseInput).apply(this, arguments));
  }

  createClass(MouseInput, [{
    key: 'extract',
    value: function extract(event) {
      return {
        pointerId: 'MOUSE_POINTER',
        x: event.clientX,
        y: event.clientY,
        event: event
      };
    }
  }, {
    key: 'attach',
    value: function attach() {
      if (this.attached) {
        return;
      }
      var element = this.element;


      var opts = SUPPORTS_PASSIVE ? { capture: true, passive: true } : true;

      element.addEventListener('mousedown', this._bind('extractThen', 'start'), opts);
      element.addEventListener('mouseup', this._bind('extractThen', 'end'), opts);
      element.addEventListener('mouseexit', this._bind('extractThen', 'interrupt'), opts);
      element.addEventListener('mousemove', this._bind('extractThen', 'update'), opts);

      this.attached = true;
    }
  }, {
    key: 'deattach',
    value: function deattach() {
      if (this.attached) {
        return;
      }
      var element = this.element;
      var _handlers = this._handlers;


      var opts = SUPPORTS_PASSIVE ? { capture: true, passive: true } : true;

      element.removeEventListener('mousedown', _handlers.start, opts);
      element.removeEventListener('mouseup', _handlers.end, opts);
      element.removeEventListener('mouseexit', _handlers.interrupt, opts);
      element.removeEventListener('mousemove', _handlers.update, opts);
    }
  }]);
  return MouseInput;
}(Input);

// import PointerInput from './inputs/pointer';

var MAY_SUPPORT_TOUCH = 'ontouchstart' in window || // html5 browsers
navigator.maxTouchPoints > 0 || // future IE
navigator.msMaxTouchPoints > 0; // current IE10

var MAY_SUPPORT_MOUSE = true;

// const SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;

function availableInputs() {
  var inputs = {};

  if (MAY_SUPPORT_MOUSE) {
    inputs.mouse = MouseInput;
  }

  if (MAY_SUPPORT_TOUCH) {
    inputs.touch = TouchInput;
  }

  return inputs;
}

/**
 * @private
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} target
 * @param {...Object} objects_to_assign
 * @returns {Object} target
 */
var assign = void 0;
if (typeof Object.assign !== 'function') {
  assign = function assign(target) {
    if (target === undefined || target === null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var output = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source !== undefined && source !== null) {
        for (var nextKey in source) {
          if (source.hasOwnProperty(nextKey)) {
            output[nextKey] = source[nextKey];
          }
        }
      }
    }
    return output;
  };
} else {
  assign = Object.assign;
}

var assign$1 = assign;

var DEFAULT_OPTIONS = {
  inputs: availableInputs()
};

var Manager = function () {
  function Manager(rootElement, options) {
    classCallCheck(this, Manager);

    this.rootElement = rootElement || window;
    this.layers = new WeakMap();
    this._recognizedInputs = 0;
    this.isRecognizing = false;

    this.inputs = {};
    this.options = assign$1({}, DEFAULT_OPTIONS, options || {});

    if (this.options.inputs) {
      var inputs = Object.keys(this.options.inputs);

      for (var i = 0; i < inputs.length; i++) {
        var name = inputs[i];
        var InputClass = this.options.inputs[name];

        this.registerInput(name, InputClass);
      }
    }
  }

  createClass(Manager, [{
    key: 'registerInput',
    value: function registerInput(name, InputClass) {
      this.inputs[name] = new InputClass(this.rootElement, this);
    }
  }, {
    key: 'recognize',
    value: function recognize(input, streams, stream, streamEvent) {
      var layer = this._findParentLayer(streamEvent.element);

      while (layer) {
        if (layer.recognize(input, streams, stream, streamEvent)) {
          this.startInputRecognition();
          break;
        }
        layer = layer.parent;
      }

      if (this.isRecognizing && streamEvent.name === 'end') {
        this.endInputRecognition();
      }
    }
  }, {
    key: 'startInputRecognition',
    value: function startInputRecognition() {
      this._recognizedInputs++;
      if (this._recognizedInputs === 1) {
        this.isRecognizing = true;
        document.body.setAttribute('gesture-no-touch', 'true');
      }
    }
  }, {
    key: 'endInputRecognition',
    value: function endInputRecognition() {
      this._recognizedInputs--;
      if (this._recognizedInputs === 0) {
        this.isRecognizing = false;
        document.body.removeAttribute('gesture-no-touch');
      }
    }
  }, {
    key: 'unregisterInput',
    value: function unregisterInput(name) {
      var input = this.inputs[name];

      if (input) {
        this.inputs[name] = null;
        input.destroy();
      }
    }
  }, {
    key: 'registerLayer',
    value: function registerLayer(layer) {
      layer.element.setAttribute('gesture-layer', true);
      this.layers.set(layer.element, layer);

      layer.parent = this._findParentLayer(layer.element.parentNode);

      // insert into linked layer list
      if (layer.parent) {
        layer.child = layer.parent.child;
        layer.parent.child = layer;
      }
    }
  }, {
    key: 'forgetLayer',
    value: function forgetLayer(layer) {
      this.layers.delete(layer.element);

      // join parent/child
      if (layer.parent && layer.child) {
        layer.parent.child = layer.child;

        // unlink parent/child
      } else {
        if (layer.parent) {
          layer.parent.child = null;
        }
        if (layer.child) {
          layer.child.parent = null;
        }
      }
    }
  }, {
    key: '_findParentLayer',
    value: function _findParentLayer(element) {
      do {
        if (element && element.hasAttribute('gesture-layer')) {
          var layer = this.layers.get(element);

          if (layer) {
            return layer;
          }
        }
      } while (element && element !== document.body && (element = element.parentNode));

      return null;
    }
  }, {
    key: '_teardown',
    value: function _teardown() {
      this.streams.touch.destroy();
      this.streams.mouse.destroy();

      this.layers.forEach(function (layer) {
        layer.destroy();
      });

      this.layers = null;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this._teardown();
    }
  }], [{
    key: 'create',
    value: function create() {
      return new Manager();
    }
  }]);
  return Manager;
}();

var Recognizer = function Recognizer(name) {
  classCallCheck(this, Recognizer);

  this.name = name;
};

var HorizontalPan = function () {
  function HorizontalPan(options) {
    classCallCheck(this, HorizontalPan);

    this.name = 'horizontal-pan';
    this.options = options;
    this.layer = undefined;
    this.stream = undefined;

    this.isRecognizing = false;
  }

  createClass(HorizontalPan, [{
    key: 'beginRecognizing',
    value: function beginRecognizing(input, stream) {
      var _this = this;

      this.isRecognizing = true;

      this.stream = stream;
      var series = this.stream.series;


      series.forEach(function (event) {
        _this.relay(event);
      });
    }
  }, {
    key: 'relay',
    value: function relay(event) {
      if (event.name === 'start') {
        this.layer.emit({ name: 'panStart', event: event });
      } else if (event.name === 'end') {
        this.isRecognizing = false;
        this.layer.emit({ name: 'panEnd', event: event });
        this.stream = undefined;
      } else if (event.totalX < 0 || event.prev.totalX < 0) {
        this.layer.emit({ name: 'panLeft', event: event });
      } else {
        this.layer.emit({ name: 'panRight', event: event });
      }
    }
  }, {
    key: 'emit',
    value: function emit(name, event) {
      this.layer.emit({ name: name, event: event });
    }
  }, {
    key: 'recognize',
    value: function recognize(input, streams, stream, streamEvent) {
      if (this.isRecognizing) {
        this.relay(streamEvent);
      } else if (input.openStreams === 1 && streamEvent.totalY === 0 && streamEvent.totalX !== 0) {
        this.beginRecognizing(input, stream);
      }

      return this.isRecognizing;
    }
  }]);
  return HorizontalPan;
}();

var VerticalPan = function () {
  function VerticalPan(options) {
    classCallCheck(this, VerticalPan);

    this.name = 'vertical-pan';
    this.options = options;
    this.layer = undefined;
    this.stream = undefined;

    this.isRecognizing = false;
  }

  createClass(VerticalPan, [{
    key: 'beginRecognizing',
    value: function beginRecognizing(input, streams) {
      var _this = this;

      this.isRecognizing = true;

      this.stream = streams[streams.length - 1];
      var series = this.stream.series;


      series.forEach(function (event) {
        _this.relay(event);
      });
    }
  }, {
    key: 'relay',
    value: function relay(event) {
      if (event.name === 'start') {
        this.layer.emit({ name: 'panStart', event: event });
      } else if (event.name === 'end') {
        this.isRecognizing = false;
        this.layer.emit({ name: 'panEnd', event: event });
        this.stream = undefined;
      } else if (event.totalY < 0 || event.prev.totalY < 0) {
        this.layer.emit({ name: 'panUp', event: event });
      } else {
        this.layer.emit({ name: 'panDown', event: event });
      }
    }
  }, {
    key: 'emit',
    value: function emit(name, event) {
      this.layer.emit({ name: name, event: event });
    }
  }, {
    key: 'recognize',
    value: function recognize(input, streams, streamEvent) {
      if (this.isRecognizing) {
        this.relay(streamEvent);
      } else if (streamEvent.totalX === 0 && streamEvent.totalY !== 0) {
        this.beginRecognizing(input, streams);
      }

      return this.isRecognizing;
    }
  }]);
  return VerticalPan;
}();

// this prevents errors when Hammer is loaded in the presence of an AMD
// style loader but by script tag, not by the loader.

var Hammer = { // jshint ignore:line
  Input: Input,
  Layer: Layer,
  Manager: Manager,
  Recognizer: Recognizer,

  MouseInput: MouseInput,
  TouchInput: TouchInput,

  HorizontalPanRecognizer: HorizontalPan,
  VerticalPanRecognizer: VerticalPan
};

/* jshint ignore:start */
if (typeof define === 'function' && define.amd) {
  define(function () {
    return Hammer;
  });
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = Hammer;
} else {
  window[exportName] = Hammer;
}
/* jshint ignore:end */
})(window, document, 'Hammer');