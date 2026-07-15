'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * performance 模块
 *
 * 实现:
 * - performance.now() — 高精度时间
 * - performance.timing — 导航时间
 * - performance.navigation — 导航类型
 * - performance.memory — (Chrome 特有) 内存使用
 * - performance.getEntries / getEntriesByType / getEntriesByName
 * - performance.mark / measure / clearMarks / clearMeasures
 */

function install(sandbox, config = {}) {
  const cfg = config.performance || {};

  // 时间起点
  const timeOrigin = cfg.timeOrigin || Date.now();
  const startTime = process.hrtime.bigint();

  // 存储标记和度量
  const marks = new Map();
  const measures = new Map();

  // ── PerformanceEntry ──
  function PerformanceEntry() {}
  makeNative(PerformanceEntry, 'PerformanceEntry');

  function makeEntry(name, entryType, startTime, duration) {
    const entry = {};
    entry.name = name;
    entry.entryType = entryType;
    entry.startTime = startTime;
    entry.duration = duration;
    Object.setPrototypeOf(entry, PerformanceEntry.prototype);
    entry.toJSON = makeNative(function() {
      return { name, entryType, startTime, duration };
    }, 'toJSON');
    return entry;
  }

  // ── PerformanceMark ──
  function PerformanceMark() {}
  makeNative(PerformanceMark, 'PerformanceMark');
  Object.setPrototypeOf(PerformanceMark.prototype, PerformanceEntry.prototype);

  // ── PerformanceMeasure ──
  function PerformanceMeasure() {}
  makeNative(PerformanceMeasure, 'PerformanceMeasure');
  Object.setPrototypeOf(PerformanceMeasure.prototype, PerformanceEntry.prototype);

  // ── PerformanceNavigationTiming ──
  function PerformanceNavigationTiming() {}
  makeNative(PerformanceNavigationTiming, 'PerformanceNavigationTiming');
  Object.setPrototypeOf(PerformanceNavigationTiming.prototype, PerformanceEntry.prototype);

  // ── PerformanceResourceTiming ──
  function PerformanceResourceTiming() {}
  makeNative(PerformanceResourceTiming, 'PerformanceResourceTiming');
  Object.setPrototypeOf(PerformanceResourceTiming.prototype, PerformanceEntry.prototype);

  // ── 构造 performance 对象 ──
  const performance = {
    // 时间原点（从1970-01-01开始的毫秒数）
    timeOrigin: timeOrigin,

    // now() — 返回从 timeOrigin 到当前的高精度毫秒
    now: makeNative(function now() {
      const elapsed = Number(process.hrtime.bigint() - startTime) / 1e6;
      return elapsed;
    }, 'now'),

    // ── timing（导航时间）──
    // 模拟一个页面加载时间线
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

    // ── navigation ──
    navigation: {
      type: cfg.navigationType || 0,  // 0=NAVIGATE, 1=RELOAD, 2=BACK_FORWARD, 255=RESERVED
      redirectCount: 0,
      toJSON: makeNative(function() { return this; }, 'toJSON')
    },

    // ── memory（Chrome 特有）──
    memory: {
      jsHeapSizeLimit: cfg.jsHeapSizeLimit || 4294705152,
      totalJSHeapSize: cfg.totalJSHeapSize || 10000000,
      usedJSHeapSize: cfg.usedJSHeapSize || 8000000
    },

    // ── Mark / Measure ──
    mark: makeNative(function mark(name) {
      if (typeof name !== 'string') {
        throw new TypeError("Failed to execute 'mark' on 'Performance': parameter 1 is not of type 'string'.");
      }
      const entry = makeEntry(name, 'mark', this.now(), 0);
      Object.setPrototypeOf(entry, PerformanceMark.prototype);
      marks.set(name, entry);
      return entry;
    }, 'mark'),

    clearMarks: makeNative(function clearMarks(name) {
      if (name !== undefined) {
        marks.delete(name);
      } else {
        marks.clear();
      }
    }, 'clearMarks'),

    measure: makeNative(function measure(name, startMark, endMark) {
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
      return entry;
    }, 'measure'),

    clearMeasures: makeNative(function clearMeasures(name) {
      if (name !== undefined) {
        measures.delete(name);
      } else {
        measures.clear();
      }
    }, 'clearMeasures'),

    // ── getEntries ──
    getEntries: makeNative(function getEntries() {
      const entries = [];
      // navigation timing
      const navEntry = makeEntry('document', 'navigation', 0, this.timing.loadEventEnd - this.timing.navigationStart);
      Object.setPrototypeOf(navEntry, PerformanceNavigationTiming.prototype);
      entries.push(navEntry);
      // marks
      for (const entry of marks.values()) entries.push(entry);
      // measures
      for (const entry of measures.values()) entries.push(entry);
      return entries;
    }, 'getEntries'),

    getEntriesByType: makeNative(function getEntriesByType(type) {
      return this.getEntries().filter(e => e.entryType === type);
    }, 'getEntriesByType'),

    getEntriesByName: makeNative(function getEntriesByName(name, type) {
      return this.getEntries().filter(e => e.name === name && (!type || e.entryType === type));
    }, 'getEntriesByName'),

    // 时间源
    toJSON: makeNative(function toJSON() {
      return {
        timeOrigin: this.timeOrigin,
        timing: this.timing,
        navigation: this.navigation
      };
    }, 'toJSON')
  };

  // ── 安装到 sandbox ──
  sandbox.Performance = function Performance() {};
  makeNative(sandbox.Performance, 'Performance');
  sandbox.performance = performance;
  sandbox.PerformanceEntry = PerformanceEntry;
  sandbox.PerformanceMark = PerformanceMark;
  sandbox.PerformanceMeasure = PerformanceMeasure;
  sandbox.PerformanceNavigationTiming = PerformanceNavigationTiming;
  sandbox.PerformanceResourceTiming = PerformanceResourceTiming;

  Object.setPrototypeOf(performance, sandbox.Performance.prototype);
}

module.exports = { install };
