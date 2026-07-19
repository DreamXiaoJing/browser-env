'use strict';

const { makeNative, defineProp } = require('../lib/guard');

function install(sandbox, config = {}) {
  const cfg = config.performance || {};

  const timeOrigin = cfg.timeOrigin || Date.now();
  const startTime = process.hrtime.bigint();

  const marks = new Map();
  const measures = new Map();
  const entries = [];

  function PerformanceEntry() {}
  makeNative(PerformanceEntry, 'PerformanceEntry');

  function makeEntry(name, entryType, startTime, duration) {
    const entry = {};
    entry.name = name;
    entry.entryType = entryType;
    entry.startTime = startTime;
    entry.duration = duration;
    entry.toJSON = makeNative(function() {
      return { name, entryType, startTime, duration };
    }, 'toJSON');
    Object.setPrototypeOf(entry, PerformanceEntry.prototype);
    return entry;
  }

  function PerformanceMark() {}
  makeNative(PerformanceMark, 'PerformanceMark');
  Object.setPrototypeOf(PerformanceMark.prototype, PerformanceEntry.prototype);

  function PerformanceMeasure() {}
  makeNative(PerformanceMeasure, 'PerformanceMeasure');
  Object.setPrototypeOf(PerformanceMeasure.prototype, PerformanceEntry.prototype);

  function PerformanceNavigationTiming() {}
  makeNative(PerformanceNavigationTiming, 'PerformanceNavigationTiming');
  Object.setPrototypeOf(PerformanceNavigationTiming.prototype, PerformanceEntry.prototype);

  function PerformanceResourceTiming() {}
  makeNative(PerformanceResourceTiming, 'PerformanceResourceTiming');
  Object.setPrototypeOf(PerformanceResourceTiming.prototype, PerformanceEntry.prototype);

  function PerformancePaintTiming() {}
  makeNative(PerformancePaintTiming, 'PerformancePaintTiming');
  Object.setPrototypeOf(PerformancePaintTiming.prototype, PerformanceEntry.prototype);

  function PerformanceObserver(callback) {
    this._callback = callback;
    this._observerType = null;
    this._enabled = false;
  }
  makeNative(PerformanceObserver, 'PerformanceObserver');

  PerformanceObserver.prototype.observe = makeNative(function(options) {
    this._observerType = options.type;
    this._enabled = true;
  }, 'observe');

  PerformanceObserver.prototype.disconnect = makeNative(function() {
    this._enabled = false;
    this._observerType = null;
  }, 'disconnect');

  PerformanceObserver.prototype.takeRecords = makeNative(function() {
    return [];
  }, 'takeRecords');

  PerformanceObserver.supportedEntryTypes = ['mark', 'measure', 'navigation', 'resource', 'paint'];

  const performance = {
    timeOrigin: timeOrigin,

    now: makeNative(function now() {
      const elapsed = Number(process.hrtime.bigint() - startTime) / 1e6;
      return elapsed;
    }, 'now'),

    timing: {
      navigationStart: cfg.navigationStart || timeOrigin,
      unloadEventStart: 0,
      unloadEventEnd: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: timeOrigin,
      domainLookupStart: timeOrigin,
      domainLookupEnd: timeOrigin,
      connectStart: timeOrigin,
      connectEnd: timeOrigin,
      secureConnectionStart: timeOrigin,
      requestStart: timeOrigin,
      responseStart: timeOrigin + 50,
      responseEnd: timeOrigin + 200,
      domLoading: timeOrigin + 250,
      domInteractive: timeOrigin + 500,
      domContentLoadedEventStart: timeOrigin + 550,
      domContentLoadedEventEnd: timeOrigin + 600,
      domComplete: timeOrigin + 1000,
      loadEventStart: timeOrigin + 1000,
      loadEventEnd: timeOrigin + 1050,
      toJSON: makeNative(function() { return this; }, 'toJSON')
    },

    navigation: {
      type: cfg.navigationType || 0,
      redirectCount: 0,
      toJSON: makeNative(function() { return this; }, 'toJSON')
    },

    memory: {
      jsHeapSizeLimit: cfg.jsHeapSizeLimit || 4294705152,
      totalJSHeapSize: cfg.totalJSHeapSize || 10000000,
      usedJSHeapSize: cfg.usedJSHeapSize || 8000000
    },

    mark: makeNative(function mark(name, options) {
      if (typeof name !== 'string') {
        throw new TypeError("Failed to execute 'mark' on 'Performance': parameter 1 is not of type 'string'.");
      }
      const entry = makeEntry(name, 'mark', this.now(), 0);
      Object.setPrototypeOf(entry, PerformanceMark.prototype);
      marks.set(name, entry);
      entries.push(entry);
      return entry;
    }, 'mark'),

    clearMarks: makeNative(function clearMarks(name) {
      if (name !== undefined) {
        marks.delete(name);
      } else {
        marks.clear();
      }
    }, 'clearMarks'),

    measure: makeNative(function measure(name, startMark, endMark, options) {
      let startTime = 0;
      let endTime = this.now();

      if (startMark && marks.has(startMark)) {
        startTime = marks.get(startMark).startTime;
      }
      if (endMark && marks.has(endMark)) {
        endTime = marks.get(endMark).startTime;
      }

      const entry = makeEntry(name, 'measure', startTime, endTime - startTime);
      Object.setPrototypeOf(entry, PerformanceMeasure.prototype);
      measures.set(name, entry);
      entries.push(entry);
      return entry;
    }, 'measure'),

    clearMeasures: makeNative(function clearMeasures(name) {
      if (name !== undefined) {
        measures.delete(name);
      } else {
        measures.clear();
      }
    }, 'clearMeasures'),

    getEntries: makeNative(function getEntries() {
      const result = [];
      const navEntry = makeEntry('document', 'navigation', 0, this.timing.loadEventEnd - this.timing.navigationStart);
      Object.setPrototypeOf(navEntry, PerformanceNavigationTiming.prototype);
      result.push(navEntry);

      const paintEntry = makeEntry('first-paint', 'paint', this.timing.responseEnd, 0);
      Object.setPrototypeOf(paintEntry, PerformancePaintTiming.prototype);
      result.push(paintEntry);

      const fcpEntry = makeEntry('first-contentful-paint', 'paint', this.timing.responseEnd + 100, 0);
      Object.setPrototypeOf(fcpEntry, PerformancePaintTiming.prototype);
      result.push(fcpEntry);

      for (const entry of marks.values()) result.push(entry);
      for (const entry of measures.values()) result.push(entry);
      for (const entry of entries) {
        if (entry.entryType === 'resource') result.push(entry);
      }
      return result;
    }, 'getEntries'),

    getEntriesByType: makeNative(function getEntriesByType(type) {
      return this.getEntries().filter(e => e.entryType === type);
    }, 'getEntriesByType'),

    getEntriesByName: makeNative(function getEntriesByName(name, type) {
      return this.getEntries().filter(e => e.name === name && (!type || e.entryType === type));
    }, 'getEntriesByName'),

    toJSON: makeNative(function toJSON() {
      return {
        timeOrigin: this.timeOrigin,
        timing: this.timing,
        navigation: this.navigation
      };
    }, 'toJSON'),

    addEventListener: makeNative(function(type, cb, opts) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb, opts) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent')
  };

  sandbox.Performance = function Performance() {};
  makeNative(sandbox.Performance, 'Performance');
  sandbox.performance = performance;
  sandbox.PerformanceEntry = PerformanceEntry;
  sandbox.PerformanceMark = PerformanceMark;
  sandbox.PerformanceMeasure = PerformanceMeasure;
  sandbox.PerformanceNavigationTiming = PerformanceNavigationTiming;
  sandbox.PerformanceResourceTiming = PerformanceResourceTiming;
  sandbox.PerformancePaintTiming = PerformancePaintTiming;
  sandbox.PerformanceObserver = PerformanceObserver;

  Object.setPrototypeOf(performance, sandbox.Performance.prototype);

  Object.defineProperty(performance, Symbol.toStringTag, {
    value: 'Performance',
    writable: false,
    configurable: true,
    enumerable: false
  });
}

module.exports = { install };