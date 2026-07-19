'use strict';

const { makeNative, defineProp } = require('../lib/guard');

let Canvas;
try {
  Canvas = require('canvas');
  console.log('[canvas] 已加载真实 canvas 库');
} catch(e) {
  console.log('[canvas] 未找到 canvas 库，使用模拟实现');
}

function install(sandbox, config = {}) {
  const cfg = config.canvas || {};

  function CanvasRenderingContext2D() {}
  makeNative(CanvasRenderingContext2D, 'CanvasRenderingContext2D');

  function ImageData(width, height, data) {
    this.width = width || 0;
    this.height = height || 0;
    this.data = data || new Uint8ClampedArray((width || 0) * (height || 0) * 4);
    this.colorSpace = 'srgb';
  }
  makeNative(ImageData, 'ImageData');
  ImageData.prototype.toString = makeNative(function() { return '[object ImageData]'; }, 'toString');

  function Path2D(path) {}
  makeNative(Path2D, 'Path2D');
  ['addPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'bezierCurveTo', 'quadraticCurveTo', 'ellipse', 'rect'].forEach(m => {
    Path2D.prototype[m] = makeNative(function() {}, m);
  });

  function CanvasGradient() {}
  makeNative(CanvasGradient, 'CanvasGradient');
  CanvasGradient.prototype.addColorStop = makeNative(function() {}, 'addColorStop');

  function WebGLRenderingContext() {}
  makeNative(WebGLRenderingContext, 'WebGLRenderingContext');

  function WebGL2RenderingContext() {}
  makeNative(WebGL2RenderingContext, 'WebGL2RenderingContext');

  sandbox.CanvasRenderingContext2D = CanvasRenderingContext2D;
  sandbox.ImageData = ImageData;
  sandbox.Path2D = Path2D;
  sandbox.CanvasGradient = CanvasGradient;
  sandbox.CanvasPattern = function CanvasPattern() {};
  makeNative(sandbox.CanvasPattern, 'CanvasPattern');
  sandbox.TextMetrics = function TextMetrics() {};
  makeNative(sandbox.TextMetrics, 'TextMetrics');
  sandbox.WebGLRenderingContext = WebGLRenderingContext;
  sandbox.WebGL2RenderingContext = WebGL2RenderingContext;

  if (Canvas && sandbox.HTMLCanvasElement && sandbox.HTMLCanvasElement.prototype) {
    sandbox.HTMLCanvasElement.prototype.getContext = makeNative(function(type, options) {
      if (type === '2d') {
        const width = this.width || cfg.canvasWidth || 300;
        const height = this.height || cfg.canvasHeight || 150;
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        this._canvas = canvas;
        this._ctx = ctx;
        return ctx;
      }
      if (type === 'webgl' || type === 'experimental-webgl') {
        return createWebGLContext();
      }
      if (type === 'webgl2' || type === 'experimental-webgl2') {
        return createWebGL2Context();
      }
      return null;
    }, 'getContext');

    sandbox.HTMLCanvasElement.prototype.toDataURL = makeNative(function(type, quality) {
      if (this._canvas) {
        return this._canvas.toDataURL(type, quality);
      }
      return cfg.toDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }, 'toDataURL');

    sandbox.HTMLCanvasElement.prototype.toBlob = makeNative(function(callback, type, quality) {
      if (this._canvas) {
        this._canvas.toBuffer((err, buf) => {
          if (!err && callback) {
            callback({ 
              size: buf.length, 
              type: type || 'image/png',
              arrayBuffer: () => Promise.resolve(buf.buffer),
              slice: (start, end, contentType) => buf.slice(start, end)
            });
          } else if (callback) {
            callback(null);
          }
        }, type);
      } else if (callback) {
        callback({ size: 100, type: 'image/png' });
      }
    }, 'toBlob');

    Object.defineProperty(sandbox.HTMLCanvasElement.prototype, 'width', {
      get: makeNative(function() { return this._width || cfg.canvasWidth || 300; }, 'get width'),
      set: makeNative(function(v) { this._width = v; }, 'set width'),
      configurable: true,
      enumerable: true
    });

    Object.defineProperty(sandbox.HTMLCanvasElement.prototype, 'height', {
      get: makeNative(function() { return this._height || cfg.canvasHeight || 150; }, 'get height'),
      set: makeNative(function(v) { this._height = v; }, 'set height'),
      configurable: true,
      enumerable: true
    });
  } else if (sandbox.HTMLCanvasElement && sandbox.HTMLCanvasElement.prototype) {
    sandbox.HTMLCanvasElement.prototype.getContext = makeNative(function(type) {
      if (type === '2d') {
        return createMock2DContext();
      }
      if (type === 'webgl' || type === 'experimental-webgl') {
        return createWebGLContext();
      }
      if (type === 'webgl2' || type === 'experimental-webgl2') {
        return createWebGL2Context();
      }
      return null;
    }, 'getContext');

    sandbox.HTMLCanvasElement.prototype.toDataURL = makeNative(function(type) {
      return cfg.toDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }, 'toDataURL');

    sandbox.HTMLCanvasElement.prototype.toBlob = makeNative(function(callback) {
      callback && callback({ size: 100, type: 'image/png' });
    }, 'toBlob');

    Object.defineProperty(sandbox.HTMLCanvasElement.prototype, 'width', {
      get: makeNative(function() { return this._width || cfg.canvasWidth || 300; }, 'get width'),
      set: makeNative(function(v) { this._width = v; }, 'set width'),
      configurable: true,
      enumerable: true
    });

    Object.defineProperty(sandbox.HTMLCanvasElement.prototype, 'height', {
      get: makeNative(function() { return this._height || cfg.canvasHeight || 150; }, 'get height'),
      set: makeNative(function(v) { this._height = v; }, 'set height'),
      configurable: true,
      enumerable: true
    });
  }

  function createMock2DContext() {
    const ctx = {
      canvas: null,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      lineDashOffset: 0,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'ltr',
      globalAlpha: 1.0,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'low',
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      filter: 'none',
      _data: null
    };

    const ctxMethods = [
      'save', 'restore',
      'scale', 'rotate', 'translate', 'transform', 'setTransform', 'resetTransform',
      'fill', 'stroke', 'beginPath', 'moveTo', 'lineTo', 'closePath',
      'rect', 'fillRect', 'strokeRect', 'clearRect',
      'arc', 'arcTo', 'bezierCurveTo', 'quadraticCurveTo', 'ellipse',
      'fillText', 'strokeText', 'measureText',
      'clip', 'isPointInPath', 'isPointInStroke',
      'createLinearGradient', 'createRadialGradient', 'createPattern',
      'setLineDash', 'getLineDash',
      'createImageData', 'getImageData', 'putImageData',
      'drawImage', 'drawFocusIfNeeded',
      'scrollPathIntoView',
      'addHitRegion', 'removeHitRegion', 'clearHitRegions'
    ];

    for (const method of ctxMethods) {
      ctx[method] = makeNative(function() {
        if (method === 'measureText') {
          return {
            width: cfg.textWidth || 100,
            actualBoundingBoxAscent: 0,
            actualBoundingBoxDescent: 0,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: 100,
            fontBoundingBoxAscent: 0,
            fontBoundingBoxDescent: 0
          };
        }
        if (method === 'createImageData') {
          const w = arguments[0] || 1;
          const h = arguments[1] || (typeof arguments[0] === 'object' ? arguments[0].height : 1);
          return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
        }
        if (method === 'getImageData') {
          const w = arguments[2] || 1;
          const h = arguments[3] || 1;
          return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
        }
        if (method === 'createLinearGradient') return { addColorStop: function() {} };
        if (method === 'createRadialGradient') return { addColorStop: function() {} };
        if (method === 'createPattern') return {};
        if (method === 'getLineDash') return [];
        return undefined;
      }, method);
    }

    return ctx;
  }

  function createWebGLContext() {
    if (sandbox._webglCtx) return sandbox._webglCtx;

    var webglExtensions = [
      'ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_half_float',
      'EXT_disjoint_timer_query', 'EXT_float_blend', 'EXT_frag_depth',
      'EXT_shader_texture_lod', 'EXT_sRGB',
      'EXT_texture_compression_bptc', 'EXT_texture_compression_rgtc',
      'EXT_texture_filter_anisotropic',
      'OES_element_index_uint', 'OES_fbo_render_mipmap',
      'OES_standard_derivatives', 'OES_texture_float', 'OES_texture_float_linear',
      'OES_texture_half_float', 'OES_texture_half_float_linear',
      'OES_vertex_array_object',
      'WEBGL_color_buffer_float', 'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_s3tc_srgb', 'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders', 'WEBGL_depth_texture', 'WEBGL_draw_buffers',
      'WEBGL_lose_context', 'WEBGL_provoking_vertex'
    ];

    var extensionCache = {};
    for (var ei = 0; ei < webglExtensions.length; ei++) {
      var extName = webglExtensions[ei];
      if (extName === 'WEBGL_debug_renderer_info') {
        extensionCache[extName] = {
          UNMASKED_VENDOR_WEBGL: 0x9245,
          UNMASKED_RENDERER_WEBGL: 0x9246
        };
      } else if (extName === 'EXT_texture_filter_anisotropic') {
        extensionCache[extName] = {
          TEXTURE_MAX_ANISOTROPY_EXT: 0x84FE,
          MAX_TEXTURE_MAX_ANISOTROPY_EXT: 16
        };
      } else if (extName === 'WEBGL_draw_buffers') {
        extensionCache[extName] = {
          MAX_DRAW_BUFFERS_WEBGL: 8,
          DRAW_BUFFER0_WEBGL: 0x8825,
          DRAW_BUFFER1_WEBGL: 0x8826,
          DRAW_BUFFER2_WEBGL: 0x8827,
          DRAW_BUFFER3_WEBGL: 0x8828,
          DRAW_BUFFER4_WEBGL: 0x8829,
          DRAW_BUFFER5_WEBGL: 0x882A,
          DRAW_BUFFER6_WEBGL: 0x882B,
          DRAW_BUFFER7_WEBGL: 0x882C,
          MAX_COLOR_ATTACHMENTS_WEBGL: 0x8CDF
        };
      } else if (extName === 'OES_vertex_array_object') {
        extensionCache[extName] = {
          VERTEX_ARRAY_BINDING_OES: 0x85B5,
          createVertexArrayOES: function() { return {}; },
          deleteVertexArrayOES: function() {},
          isVertexArrayOES: function() { return true; },
          bindVertexArrayOES: function() {}
        };
      } else if (extName === 'WEBGL_lose_context') {
        extensionCache[extName] = {
          loseContext: function() {},
          restoreContext: function() {}
        };
      } else if (extName === 'WEBGL_debug_shaders') {
        extensionCache[extName] = {
          getTranslatedShaderSource: function() { return 'shader source'; }
        };
      } else {
        extensionCache[extName] = {};
      }
    }

    var shaderPrecisions = {};
    shaderPrecisions['35633,36338'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35633,36337'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35633,36336'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35633,36340'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35633,36339'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35633,36341'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35632,36338'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35632,36337'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35632,36336'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35632,36340'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35632,36339'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35632,36341'] = { rangeMin: 31, rangeMax: 30, precision: 0 };

    var gl = {
      drawingBufferWidth: cfg.webglWidth || 300,
      drawingBufferHeight: cfg.webglHeight || 150,
      drawingBufferColorSpace: 'srgb',
      canvas: null,
      _extensions: extensionCache,
      _extensionList: webglExtensions,

      VENDOR: 0x1F00,
      RENDERER: 0x1F01,
      VERSION: 0x1F02,
      SHADING_LANGUAGE_VERSION: 0x8B8C,
      MAX_TEXTURE_SIZE: 0x0D33,
      MAX_CUBE_MAP_TEXTURE_SIZE: 0x851C,
      MAX_VERTEX_ATTRIBS: 0x8869,
      MAX_VERTEX_UNIFORM_VECTORS: 0x8DFB,
      MAX_VARYING_VECTORS: 0x8DFC,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D,
      MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C,
      MAX_TEXTURE_IMAGE_UNITS: 0x8872,
      MAX_FRAGMENT_UNIFORM_VECTORS: 0x8DFD,
      MAX_RENDERBUFFER_SIZE: 0x84E8,
      ALIASED_LINE_WIDTH_RANGE: 0x846E,
      ALIASED_POINT_SIZE_RANGE: 0x846D,
      MAX_VIEWPORT_DIMS: 0x0D3A,
      MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84FF,
      UNMASKED_VENDOR_WEBGL: 0x9245,
      UNMASKED_RENDERER_WEBGL: 0x9246,
      
      VERTEX_SHADER: 0x8B31,
      FRAGMENT_SHADER: 0x8B30,
      
      LOW_FLOAT: 0x8DF0,
      MEDIUM_FLOAT: 0x8DF1,
      HIGH_FLOAT: 0x8DF2,
      LOW_INT: 0x8DF3,
      MEDIUM_INT: 0x8DF4,
      HIGH_INT: 0x8DF5,
      
      ARRAY_BUFFER: 0x8892,
      ELEMENT_ARRAY_BUFFER: 0x8893,
      STATIC_DRAW: 0x88E4,
      DYNAMIC_DRAW: 0x88E8,
      STREAM_DRAW: 0x88E0,
      
      TRIANGLES: 0x0004,
      TRIANGLE_STRIP: 0x0005,
      TRIANGLE_FAN: 0x0006,
      POINTS: 0x0000,
      LINES: 0x0001,
      LINE_STRIP: 0x0002,
      LINE_LOOP: 0x0003,
      
      ONE: 1,
      ZERO: 0,
      SRC_ALPHA: 0x0302,
      ONE_MINUS_SRC_ALPHA: 0x0303,
      
      DEPTH_TEST: 0x0B71,
      BLEND: 0x0BE2,
      CULL_FACE: 0x0B44,
      SCISSOR_TEST: 0x0C11,
      DITHER: 0x0BD0,
      STENCIL_TEST: 0x0B90,

      getParameter: makeNative(function(pname) {
        // VENDOR / RENDERER（masked，浏览器标准返回值）
        if (pname === 0x1F00) return 'WebKit';
        if (pname === 0x1F01) return 'WebKit WebGL';
        // UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL（WEBGL_debug_renderer_info 扩展）
        if (pname === 0x9245) return cfg.webglVendor || 'Google Inc. (Intel)';
        if (pname === 0x9246) return cfg.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics (0x00009BC4) Direct3D11 vs_5_0 ps_5_0, D3D11)';
        if (pname === 0x1F02) return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)';
        if (pname === 0x8B8C) return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)';
        if (pname === 0x0D33) return 16384;
        if (pname === 0x851C) return 16384;
        if (pname === 0x8869) return 16;
        if (pname === 0x8DFB) return 256;
        if (pname === 0x8DFC) return 16;
        if (pname === 0x8B4D) return 32;
        if (pname === 0x8B4C) return 16;
        if (pname === 0x8872) return 16;
        if (pname === 0x8DFD) return 256;
        if (pname === 0x84E8) return 16384;
        if (pname === 0x846E) return [1, 1];
        if (pname === 0x846D) return [1, 1024];
        if (pname === 0x0D3A) return [32767, 32767];
        if (pname === 0x84FF) return 16;
        if (pname === 0x8B4F) return 8;
        if (pname === 0x8B50) return 64;
        if (pname === 0x8B4E) return 32;
        if (pname === 0x8B30) return 8;
        if (pname === 0x84E2) return 1024;
        return null;
      }, 'getParameter'),

      getExtension: makeNative(function(name) {
        var ext = gl._extensions[name];
        return ext !== undefined ? ext : null;
      }, 'getExtension'),

      getSupportedExtensions: makeNative(function() {
        return gl._extensionList.slice();
      }, 'getSupportedExtensions'),

      getShaderPrecisionFormat: makeNative(function(shaderType, precisionType) {
        var key = String(shaderType) + ',' + String(precisionType);
        var result = shaderPrecisions[key] || { rangeMin: 127, rangeMax: 127, precision: 23 };
        return {
          rangeMin: result.rangeMin,
          rangeMax: result.rangeMax,
          precision: result.precision
        };
      }, 'getShaderPrecisionFormat'),

      clear: makeNative(function(mask) {}, 'clear'),
      clearColor: makeNative(function(r, g, b, a) {}, 'clearColor'),
      clearDepth: makeNative(function(d) {}, 'clearDepth'),
      clearStencil: makeNative(function(s) {}, 'clearStencil'),
      colorMask: makeNative(function(r, g, b, a) {}, 'colorMask'),
      depthMask: makeNative(function(m) {}, 'depthMask'),
      stencilMask: makeNative(function(m) {}, 'stencilMask'),
      enable: makeNative(function(cap) {}, 'enable'),
      disable: makeNative(function(cap) {}, 'disable'),
      isEnabled: makeNative(function(cap) { return true; }, 'isEnabled'),
      blendFunc: makeNative(function(sf, df) {}, 'blendFunc'),
      blendFuncSeparate: makeNative(function(sr, dr, sa, da) {}, 'blendFuncSeparate'),
      blendEquation: makeNative(function(mode) {}, 'blendEquation'),
      blendEquationSeparate: makeNative(function(modeRGB, modeAlpha) {}, 'blendEquationSeparate'),
      blendColor: makeNative(function(r, g, b, a) {}, 'blendColor'),
      viewport: makeNative(function(x, y, w, h) {}, 'viewport'),
      scissor: makeNative(function(x, y, w, h) {}, 'scissor'),
      depthFunc: makeNative(function(func) {}, 'depthFunc'),
      depthRange: makeNative(function(zNear, zFar) {}, 'depthRange'),
      depthRangef: makeNative(function(zNear, zFar) {}, 'depthRangef'),
      pixelStorei: makeNative(function(pname, param) {}, 'pixelStorei'),
      frontFace: makeNative(function(mode) {}, 'frontFace'),
      cullFace: makeNative(function(mode) {}, 'cullFace'),
      lineWidth: makeNative(function(width) {}, 'lineWidth'),
      polygonOffset: makeNative(function(factor, units) {}, 'polygonOffset'),
      sampleCoverage: makeNative(function(value, invert) {}, 'sampleCoverage'),
      
      createShader: makeNative(function(type) { return { _type: type }; }, 'createShader'),
      shaderSource: makeNative(function(shader, source) { shader._source = source; }, 'shaderSource'),
      compileShader: makeNative(function(shader) { shader._compiled = true; }, 'compileShader'),
      isShader: makeNative(function(shader) { return shader && shader._type !== undefined; }, 'isShader'),
      getShaderParameter: makeNative(function(shader, pname) {
        if (pname === 0x8B81) return true;
        if (pname === 0x8B84) return false;
        return true;
      }, 'getShaderParameter'),
      getShaderInfoLog: makeNative(function(shader) { return ''; }, 'getShaderInfoLog'),
      
      createProgram: makeNative(function() { return { _shaders: [] }; }, 'createProgram'),
      attachShader: makeNative(function(program, shader) {
        program._shaders.push(shader);
      }, 'attachShader'),
      detachShader: makeNative(function(program, shader) {
        var idx = program._shaders.indexOf(shader);
        if (idx >= 0) program._shaders.splice(idx, 1);
      }, 'detachShader'),
      linkProgram: makeNative(function(program) { program._linked = true; }, 'linkProgram'),
      isProgram: makeNative(function(program) { return program && program._linked !== undefined; }, 'isProgram'),
      getProgramParameter: makeNative(function(program, pname) {
        if (pname === 0x8B82) return true;
        if (pname === 0x8B84) return false;
        if (pname === 0x8B86) return 2;
        if (pname === 0x8B87) return 2;
        return true;
      }, 'getProgramParameter'),
      getProgramInfoLog: makeNative(function(program) { return ''; }, 'getProgramInfoLog'),
      useProgram: makeNative(function(program) { gl._currentProgram = program; }, 'useProgram'),
      validateProgram: makeNative(function(program) {}, 'validateProgram'),
      
      getAttribLocation: makeNative(function(program, name) { return 0; }, 'getAttribLocation'),
      getUniformLocation: makeNative(function(program, name) { return { _name: name }; }, 'getUniformLocation'),
      enableVertexAttribArray: makeNative(function(index) {}, 'enableVertexAttribArray'),
      disableVertexAttribArray: makeNative(function(index) {}, 'disableVertexAttribArray'),
      vertexAttribPointer: makeNative(function(index, size, type, normalized, stride, offset) {}, 'vertexAttribPointer'),
      vertexAttrib1f: makeNative(function(index, x) {}, 'vertexAttrib1f'),
      vertexAttrib2f: makeNative(function(index, x, y) {}, 'vertexAttrib2f'),
      vertexAttrib3f: makeNative(function(index, x, y, z) {}, 'vertexAttrib3f'),
      vertexAttrib4f: makeNative(function(index, x, y, z, w) {}, 'vertexAttrib4f'),
      
      uniform1f: makeNative(function(loc, x) {}, 'uniform1f'),
      uniform2f: makeNative(function(loc, x, y) {}, 'uniform2f'),
      uniform3f: makeNative(function(loc, x, y, z) {}, 'uniform3f'),
      uniform4f: makeNative(function(loc, x, y, z, w) {}, 'uniform4f'),
      uniform1i: makeNative(function(loc, x) {}, 'uniform1i'),
      uniform2i: makeNative(function(loc, x, y) {}, 'uniform2i'),
      uniform3i: makeNative(function(loc, x, y, z) {}, 'uniform3i'),
      uniform4i: makeNative(function(loc, x, y, z, w) {}, 'uniform4i'),
      uniform1fv: makeNative(function(loc, v) {}, 'uniform1fv'),
      uniform2fv: makeNative(function(loc, v) {}, 'uniform2fv'),
      uniform3fv: makeNative(function(loc, v) {}, 'uniform3fv'),
      uniform4fv: makeNative(function(loc, v) {}, 'uniform4fv'),
      uniform1iv: makeNative(function(loc, v) {}, 'uniform1iv'),
      uniform2iv: makeNative(function(loc, v) {}, 'uniform2iv'),
      uniform3iv: makeNative(function(loc, v) {}, 'uniform3iv'),
      uniform4iv: makeNative(function(loc, v) {}, 'uniform4iv'),
      uniformMatrix2fv: makeNative(function(loc, transpose, value) {}, 'uniformMatrix2fv'),
      uniformMatrix3fv: makeNative(function(loc, transpose, value) {}, 'uniformMatrix3fv'),
      uniformMatrix4fv: makeNative(function(loc, transpose, value) {}, 'uniformMatrix4fv'),
      
      createBuffer: makeNative(function() { return {}; }, 'createBuffer'),
      deleteBuffer: makeNative(function(buffer) {}, 'deleteBuffer'),
      isBuffer: makeNative(function(buffer) { return true; }, 'isBuffer'),
      bindBuffer: makeNative(function(target, buffer) {}, 'bindBuffer'),
      bufferData: makeNative(function(target, data, usage) {}, 'bufferData'),
      bufferSubData: makeNative(function(target, offset, data) {}, 'bufferSubData'),
      
      activeTexture: makeNative(function(texture) {}, 'activeTexture'),
      createTexture: makeNative(function() { return {}; }, 'createTexture'),
      deleteTexture: makeNative(function(texture) {}, 'deleteTexture'),
      isTexture: makeNative(function(texture) { return true; }, 'isTexture'),
      bindTexture: makeNative(function(target, texture) {}, 'bindTexture'),
      texImage2D: makeNative(function() {}, 'texImage2D'),
      texSubImage2D: makeNative(function() {}, 'texSubImage2D'),
      texParameteri: makeNative(function(target, pname, param) {}, 'texParameteri'),
      texParameterf: makeNative(function(target, pname, param) {}, 'texParameterf'),
      copyTexImage2D: makeNative(function() {}, 'copyTexImage2D'),
      copyTexSubImage2D: makeNative(function() {}, 'copyTexSubImage2D'),
      generateMipmap: makeNative(function(target) {}, 'generateMipmap'),
      
      createFramebuffer: makeNative(function() { return {}; }, 'createFramebuffer'),
      deleteFramebuffer: makeNative(function(fb) {}, 'deleteFramebuffer'),
      isFramebuffer: makeNative(function(fb) { return true; }, 'isFramebuffer'),
      bindFramebuffer: makeNative(function(target, fb) {}, 'bindFramebuffer'),
      framebufferTexture2D: makeNative(function(target, attachment, texTarget, texture, level) {}, 'framebufferTexture2D'),
      framebufferRenderbuffer: makeNative(function(target, attachment, rbTarget, rb) {}, 'framebufferRenderbuffer'),
      checkFramebufferStatus: makeNative(function(target) { return 0x8CD5; }, 'checkFramebufferStatus'),
      
      createRenderbuffer: makeNative(function() { return {}; }, 'createRenderbuffer'),
      deleteRenderbuffer: makeNative(function(rb) {}, 'deleteRenderbuffer'),
      isRenderbuffer: makeNative(function(rb) { return true; }, 'isRenderbuffer'),
      bindRenderbuffer: makeNative(function(target, rb) {}, 'bindRenderbuffer'),
      renderbufferStorage: makeNative(function(target, internalFormat, width, height) {}, 'renderbufferStorage'),
      
      drawArrays: makeNative(function(mode, first, count) {
        gl._webglDrawn = true;
      }, 'drawArrays'),
      drawElements: makeNative(function(mode, count, type, offset) {
        gl._webglDrawn = true;
      }, 'drawElements'),
      finish: makeNative(function() {}, 'finish'),
      flush: makeNative(function() {}, 'flush'),
      
      getError: makeNative(function() { return 0; }, 'getError'),
      getString: makeNative(function(pname) {
        if (pname === 0x1F00) return 'WebGL';
        if (pname === 0x1F01) return 'Mesa/X.org';
        return '';
      }, 'getString'),
      
      readPixels: makeNative(function(x, y, w, h, format, type, pixels) {
        if (pixels && pixels.length >= 4) {
          pixels[0] = 0; pixels[1] = 0; pixels[2] = 0; pixels[3] = 255;
        }
      }, 'readPixels'),
      
      getActiveAttrib: makeNative(function(program, index) {
        return { name: 'a_position', size: 1, type: 0x8B50 };
      }, 'getActiveAttrib'),
      getActiveUniform: makeNative(function(program, index) {
        return { name: 'u_offset', size: 1, type: 0x8B50 };
      }, 'getActiveUniform'),
      
      isContextLost: makeNative(function() { return false; }, 'isContextLost'),
      getContextAttributes: makeNative(function() {
        return {
          alpha: true,
          antialias: true,
          depth: true,
          stencil: false,
          premultipliedAlpha: true,
          preserveDrawingBuffer: false,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        };
      }, 'getContextAttributes'),
      
      hint: makeNative(function(target, mode) {}, 'hint'),
    };

    Object.setPrototypeOf(gl, WebGLRenderingContext.prototype);
    sandbox._webglCtx = gl;
    return gl;
  }

  function createWebGL2Context() {
    if (sandbox._webgl2Ctx) return sandbox._webgl2Ctx;

    var webgl2Extensions = [
      'ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_float',
      'EXT_color_buffer_half_float', 'EXT_disjoint_timer_query', 'EXT_float_blend',
      'EXT_frag_depth', 'EXT_shader_texture_lod', 'EXT_sRGB',
      'EXT_texture_compression_bptc', 'EXT_texture_compression_rgtc',
      'EXT_texture_filter_anisotropic',
      'OES_element_index_uint', 'OES_fbo_render_mipmap',
      'OES_standard_derivatives', 'OES_texture_float', 'OES_texture_float_linear',
      'OES_texture_half_float', 'OES_texture_half_float_linear',
      'OES_vertex_array_object',
      'WEBGL_color_buffer_float', 'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_s3tc_srgb', 'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders', 'WEBGL_depth_texture', 'WEBGL_draw_buffers',
      'WEBGL_lose_context', 'WEBGL_provoking_vertex'
    ];

    var extensionCache = {};
    for (var ei = 0; ei < webgl2Extensions.length; ei++) {
      var extName = webgl2Extensions[ei];
      if (extName === 'WEBGL_debug_renderer_info') {
        extensionCache[extName] = {
          UNMASKED_VENDOR_WEBGL: 0x9245,
          UNMASKED_RENDERER_WEBGL: 0x9246
        };
      } else if (extName === 'EXT_texture_filter_anisotropic') {
        extensionCache[extName] = {
          TEXTURE_MAX_ANISOTROPY_EXT: 0x84FE,
          MAX_TEXTURE_MAX_ANISOTROPY_EXT: 16
        };
      } else if (extName === 'WEBGL_draw_buffers') {
        extensionCache[extName] = {
          MAX_DRAW_BUFFERS_WEBGL: 8,
          DRAW_BUFFER0_WEBGL: 0x8825,
          DRAW_BUFFER1_WEBGL: 0x8826,
          DRAW_BUFFER2_WEBGL: 0x8827,
          DRAW_BUFFER3_WEBGL: 0x8828,
          DRAW_BUFFER4_WEBGL: 0x8829,
          DRAW_BUFFER5_WEBGL: 0x882A,
          DRAW_BUFFER6_WEBGL: 0x882B,
          DRAW_BUFFER7_WEBGL: 0x882C,
          MAX_COLOR_ATTACHMENTS_WEBGL: 0x8CDF
        };
      } else if (extName === 'OES_vertex_array_object') {
        extensionCache[extName] = {
          VERTEX_ARRAY_BINDING_OES: 0x85B5,
          createVertexArrayOES: function() { return {}; },
          deleteVertexArrayOES: function() {},
          isVertexArrayOES: function() { return true; },
          bindVertexArrayOES: function() {}
        };
      } else if (extName === 'WEBGL_lose_context') {
        extensionCache[extName] = {
          loseContext: function() {},
          restoreContext: function() {}
        };
      } else if (extName === 'WEBGL_debug_shaders') {
        extensionCache[extName] = {
          getTranslatedShaderSource: function() { return 'shader source'; }
        };
      } else {
        extensionCache[extName] = {};
      }
    }

    var shaderPrecisions = {};
    shaderPrecisions['35633,36338'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35633,36337'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35633,36336'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35633,36340'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35633,36339'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35633,36341'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35632,36338'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35632,36337'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35632,36336'] = { rangeMin: 127, rangeMax: 127, precision: 23 };
    shaderPrecisions['35632,36340'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35632,36339'] = { rangeMin: 31, rangeMax: 30, precision: 0 };
    shaderPrecisions['35632,36341'] = { rangeMin: 31, rangeMax: 30, precision: 0 };

    var gl2 = {
      drawingBufferWidth: cfg.webglWidth || 300,
      drawingBufferHeight: cfg.webglHeight || 150,
      drawingBufferColorSpace: 'srgb',
      canvas: null,
      _extensions: extensionCache,
      _extensionList: webgl2Extensions,

      VENDOR: 0x1F00,
      RENDERER: 0x1F01,
      VERSION: 0x1F02,
      SHADING_LANGUAGE_VERSION: 0x8B8C,
      MAX_TEXTURE_SIZE: 0x0D33,
      MAX_CUBE_MAP_TEXTURE_SIZE: 0x851C,
      MAX_VERTEX_ATTRIBS: 0x8869,
      MAX_VERTEX_UNIFORM_VECTORS: 0x8DFB,
      MAX_VARYING_VECTORS: 0x8DFC,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D,
      MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C,
      MAX_TEXTURE_IMAGE_UNITS: 0x8872,
      MAX_FRAGMENT_UNIFORM_VECTORS: 0x8DFD,
      MAX_RENDERBUFFER_SIZE: 0x84E8,
      ALIASED_LINE_WIDTH_RANGE: 0x846E,
      ALIASED_POINT_SIZE_RANGE: 0x846D,
      MAX_VIEWPORT_DIMS: 0x0D3A,
      MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84FF,
      UNMASKED_VENDOR_WEBGL: 0x9245,
      UNMASKED_RENDERER_WEBGL: 0x9246,

      VERTEX_SHADER: 0x8B31,
      FRAGMENT_SHADER: 0x8B30,

      LOW_FLOAT: 0x8DF0,
      MEDIUM_FLOAT: 0x8DF1,
      HIGH_FLOAT: 0x8DF2,
      LOW_INT: 0x8DF3,
      MEDIUM_INT: 0x8DF4,
      HIGH_INT: 0x8DF5,

      ARRAY_BUFFER: 0x8892,
      ELEMENT_ARRAY_BUFFER: 0x8893,
      STATIC_DRAW: 0x88E4,
      DYNAMIC_DRAW: 0x88E8,
      STREAM_DRAW: 0x88E0,

      TRIANGLES: 0x0004,
      TRIANGLE_STRIP: 0x0005,
      TRIANGLE_FAN: 0x0006,
      POINTS: 0x0000,
      LINES: 0x0001,
      LINE_STRIP: 0x0002,
      LINE_LOOP: 0x0003,

      ONE: 1,
      ZERO: 0,
      SRC_ALPHA: 0x0302,
      ONE_MINUS_SRC_ALPHA: 0x0303,

      DEPTH_TEST: 0x0B71,
      BLEND: 0x0BE2,
      CULL_FACE: 0x0B44,
      SCISSOR_TEST: 0x0C11,
      DITHER: 0x0BD0,
      STENCIL_TEST: 0x0B90,

      getParameter: makeNative(function(pname) {
        if (pname === 0x1F00) return 'WebKit';
        if (pname === 0x1F01) return 'WebKit WebGL';
        if (pname === 0x9245) return cfg.webglVendor || 'Google Inc. (Intel)';
        if (pname === 0x9246) return cfg.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics (0x00009BC4) Direct3D11 vs_5_0 ps_5_0, D3D11)';
        if (pname === 0x1F02) return 'WebGL 2.0 (OpenGL ES 3.0 Chromium)';
        if (pname === 0x8B8C) return 'WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.00 Chromium)';
        if (pname === 0x0D33) return 16384;
        if (pname === 0x851C) return 16384;
        if (pname === 0x8869) return 16;
        if (pname === 0x8DFB) return 256;
        if (pname === 0x8DFC) return 16;
        if (pname === 0x8B4D) return 32;
        if (pname === 0x8B4C) return 16;
        if (pname === 0x8872) return 16;
        if (pname === 0x8DFD) return 256;
        if (pname === 0x84E8) return 16384;
        if (pname === 0x846E) return [1, 1];
        if (pname === 0x846D) return [1, 1024];
        if (pname === 0x0D3A) return [32767, 32767];
        if (pname === 0x84FF) return 16;
        if (pname === 0x8B4F) return 8;
        if (pname === 0x8B50) return 64;
        if (pname === 0x8B4E) return 32;
        if (pname === 0x8B30) return 8;
        if (pname === 0x84E2) return 1024;
        return null;
      }, 'getParameter'),

      getExtension: makeNative(function(name) {
        var ext = gl2._extensions[name];
        return ext !== undefined ? ext : null;
      }, 'getExtension'),

      getSupportedExtensions: makeNative(function() {
        return gl2._extensionList.slice();
      }, 'getSupportedExtensions'),

      getShaderPrecisionFormat: makeNative(function(shaderType, precisionType) {
        var key = String(shaderType) + ',' + String(precisionType);
        var result = shaderPrecisions[key] || { rangeMin: 127, rangeMax: 127, precision: 23 };
        return {
          rangeMin: result.rangeMin,
          rangeMax: result.rangeMax,
          precision: result.precision
        };
      }, 'getShaderPrecisionFormat'),

      clear: makeNative(function(mask) {}, 'clear'),
      clearColor: makeNative(function(r, g, b, a) {}, 'clearColor'),
      clearDepth: makeNative(function(d) {}, 'clearDepth'),
      clearStencil: makeNative(function(s) {}, 'clearStencil'),
      colorMask: makeNative(function(r, g, b, a) {}, 'colorMask'),
      depthMask: makeNative(function(m) {}, 'depthMask'),
      stencilMask: makeNative(function(m) {}, 'stencilMask'),
      enable: makeNative(function(cap) {}, 'enable'),
      disable: makeNative(function(cap) {}, 'disable'),
      isEnabled: makeNative(function(cap) { return true; }, 'isEnabled'),
      blendFunc: makeNative(function(sf, df) {}, 'blendFunc'),
      blendFuncSeparate: makeNative(function(sr, dr, sa, da) {}, 'blendFuncSeparate'),
      blendEquation: makeNative(function(mode) {}, 'blendEquation'),
      blendEquationSeparate: makeNative(function(modeRGB, modeAlpha) {}, 'blendEquationSeparate'),
      blendColor: makeNative(function(r, g, b, a) {}, 'blendColor'),
      viewport: makeNative(function(x, y, w, h) {}, 'viewport'),
      scissor: makeNative(function(x, y, w, h) {}, 'scissor'),
      depthFunc: makeNative(function(func) {}, 'depthFunc'),
      depthRange: makeNative(function(zNear, zFar) {}, 'depthRange'),
      depthRangef: makeNative(function(zNear, zFar) {}, 'depthRangef'),
      pixelStorei: makeNative(function(pname, param) {}, 'pixelStorei'),
      frontFace: makeNative(function(mode) {}, 'frontFace'),
      cullFace: makeNative(function(mode) {}, 'cullFace'),
      lineWidth: makeNative(function(width) {}, 'lineWidth'),
      polygonOffset: makeNative(function(factor, units) {}, 'polygonOffset'),
      sampleCoverage: makeNative(function(value, invert) {}, 'sampleCoverage'),

      createShader: makeNative(function(type) { return { _type: type }; }, 'createShader'),
      shaderSource: makeNative(function(shader, source) { shader._source = source; }, 'shaderSource'),
      compileShader: makeNative(function(shader) { shader._compiled = true; }, 'compileShader'),
      isShader: makeNative(function(shader) { return shader && shader._type !== undefined; }, 'isShader'),
      getShaderParameter: makeNative(function(shader, pname) {
        if (pname === 0x8B81) return true;
        if (pname === 0x8B84) return false;
        return true;
      }, 'getShaderParameter'),
      getShaderInfoLog: makeNative(function(shader) { return ''; }, 'getShaderInfoLog'),

      createProgram: makeNative(function() { return { _shaders: [] }; }, 'createProgram'),
      attachShader: makeNative(function(program, shader) {
        program._shaders.push(shader);
      }, 'attachShader'),
      detachShader: makeNative(function(program, shader) {
        var idx = program._shaders.indexOf(shader);
        if (idx >= 0) program._shaders.splice(idx, 1);
      }, 'detachShader'),
      linkProgram: makeNative(function(program) { program._linked = true; }, 'linkProgram'),
      isProgram: makeNative(function(program) { return program && program._linked !== undefined; }, 'isProgram'),
      getProgramParameter: makeNative(function(program, pname) {
        if (pname === 0x8B82) return true;
        if (pname === 0x8B84) return false;
        if (pname === 0x8B86) return 2;
        if (pname === 0x8B87) return 2;
        return true;
      }, 'getProgramParameter'),
      getProgramInfoLog: makeNative(function(program) { return ''; }, 'getProgramInfoLog'),
      useProgram: makeNative(function(program) { gl2._currentProgram = program; }, 'useProgram'),
      validateProgram: makeNative(function(program) {}, 'validateProgram'),

      getAttribLocation: makeNative(function(program, name) { return 0; }, 'getAttribLocation'),
      getUniformLocation: makeNative(function(program, name) { return { _name: name }; }, 'getUniformLocation'),
      enableVertexAttribArray: makeNative(function(index) {}, 'enableVertexAttribArray'),
      disableVertexAttribArray: makeNative(function(index) {}, 'disableVertexAttribArray'),
      vertexAttribPointer: makeNative(function(index, size, type, normalized, stride, offset) {}, 'vertexAttribPointer'),
      vertexAttrib1f: makeNative(function(index, x) {}, 'vertexAttrib1f'),
      vertexAttrib2f: makeNative(function(index, x, y) {}, 'vertexAttrib2f'),
      vertexAttrib3f: makeNative(function(index, x, y, z) {}, 'vertexAttrib3f'),
      vertexAttrib4f: makeNative(function(index, x, y, z, w) {}, 'vertexAttrib4f'),

      uniform1f: makeNative(function(loc, x) {}, 'uniform1f'),
      uniform2f: makeNative(function(loc, x, y) {}, 'uniform2f'),
      uniform3f: makeNative(function(loc, x, y, z) {}, 'uniform3f'),
      uniform4f: makeNative(function(loc, x, y, z, w) {}, 'uniform4f'),
      uniform1i: makeNative(function(loc, x) {}, 'uniform1i'),
      uniform2i: makeNative(function(loc, x, y) {}, 'uniform2i'),
      uniform3i: makeNative(function(loc, x, y, z) {}, 'uniform3i'),
      uniform4i: makeNative(function(loc, x, y, z, w) {}, 'uniform4i'),
      uniform1fv: makeNative(function(loc, v) {}, 'uniform1fv'),
      uniform2fv: makeNative(function(loc, v) {}, 'uniform2fv'),
      uniform3fv: makeNative(function(loc, v) {}, 'uniform3fv'),
      uniform4fv: makeNative(function(loc, v) {}, 'uniform4fv'),
      uniform1iv: makeNative(function(loc, v) {}, 'uniform1iv'),
      uniform2iv: makeNative(function(loc, v) {}, 'uniform2iv'),
      uniform3iv: makeNative(function(loc, v) {}, 'uniform3iv'),
      uniform4iv: makeNative(function(loc, v) {}, 'uniform4iv'),
      uniformMatrix2fv: makeNative(function(loc, transpose, value) {}, 'uniformMatrix2fv'),
      uniformMatrix3fv: makeNative(function(loc, transpose, value) {}, 'uniformMatrix3fv'),
      uniformMatrix4fv: makeNative(function(loc, transpose, value) {}, 'uniformMatrix4fv'),

      createBuffer: makeNative(function() { return {}; }, 'createBuffer'),
      deleteBuffer: makeNative(function(buffer) {}, 'deleteBuffer'),
      isBuffer: makeNative(function(buffer) { return true; }, 'isBuffer'),
      bindBuffer: makeNative(function(target, buffer) {}, 'bindBuffer'),
      bufferData: makeNative(function(target, data, usage) {}, 'bufferData'),
      bufferSubData: makeNative(function(target, offset, data) {}, 'bufferSubData'),

      activeTexture: makeNative(function(texture) {}, 'activeTexture'),
      createTexture: makeNative(function() { return {}; }, 'createTexture'),
      deleteTexture: makeNative(function(texture) {}, 'deleteTexture'),
      isTexture: makeNative(function(texture) { return true; }, 'isTexture'),
      bindTexture: makeNative(function(target, texture) {}, 'bindTexture'),
      texImage2D: makeNative(function() {}, 'texImage2D'),
      texSubImage2D: makeNative(function() {}, 'texSubImage2D'),
      texParameteri: makeNative(function(target, pname, param) {}, 'texParameteri'),
      texParameterf: makeNative(function(target, pname, param) {}, 'texParameterf'),
      copyTexImage2D: makeNative(function() {}, 'copyTexImage2D'),
      copyTexSubImage2D: makeNative(function() {}, 'copyTexSubImage2D'),
      generateMipmap: makeNative(function(target) {}, 'generateMipmap'),

      createFramebuffer: makeNative(function() { return {}; }, 'createFramebuffer'),
      deleteFramebuffer: makeNative(function(fb) {}, 'deleteFramebuffer'),
      isFramebuffer: makeNative(function(fb) { return true; }, 'isFramebuffer'),
      bindFramebuffer: makeNative(function(target, fb) {}, 'bindFramebuffer'),
      framebufferTexture2D: makeNative(function(target, attachment, texTarget, texture, level) {}, 'framebufferTexture2D'),
      framebufferRenderbuffer: makeNative(function(target, attachment, rbTarget, rb) {}, 'framebufferRenderbuffer'),
      checkFramebufferStatus: makeNative(function(target) { return 0x8CD5; }, 'checkFramebufferStatus'),

      createRenderbuffer: makeNative(function() { return {}; }, 'createRenderbuffer'),
      deleteRenderbuffer: makeNative(function(rb) {}, 'deleteRenderbuffer'),
      isRenderbuffer: makeNative(function(rb) { return true; }, 'isRenderbuffer'),
      bindRenderbuffer: makeNative(function(target, rb) {}, 'bindRenderbuffer'),
      renderbufferStorage: makeNative(function(target, internalFormat, width, height) {}, 'renderbufferStorage'),

      drawArrays: makeNative(function(mode, first, count) {
        gl2._webglDrawn = true;
      }, 'drawArrays'),
      drawElements: makeNative(function(mode, count, type, offset) {
        gl2._webglDrawn = true;
      }, 'drawElements'),
      finish: makeNative(function() {}, 'finish'),
      flush: makeNative(function() {}, 'flush'),

      getError: makeNative(function() { return 0; }, 'getError'),
      getString: makeNative(function(pname) {
        if (pname === 0x1F00) return 'WebGL';
        if (pname === 0x1F01) return 'Mesa/X.org';
        return '';
      }, 'getString'),

      readPixels: makeNative(function(x, y, w, h, format, type, pixels) {
        if (pixels && pixels.length >= 4) {
          pixels[0] = 0; pixels[1] = 0; pixels[2] = 0; pixels[3] = 255;
        }
      }, 'readPixels'),

      getActiveAttrib: makeNative(function(program, index) {
        return { name: 'a_position', size: 1, type: 0x8B50 };
      }, 'getActiveAttrib'),
      getActiveUniform: makeNative(function(program, index) {
        return { name: 'u_offset', size: 1, type: 0x8B50 };
      }, 'getActiveUniform'),

      isContextLost: makeNative(function() { return false; }, 'isContextLost'),
      getContextAttributes: makeNative(function() {
        return {
          alpha: true,
          antialias: true,
          depth: true,
          stencil: false,
          premultipliedAlpha: true,
          preserveDrawingBuffer: false,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        };
      }, 'getContextAttributes'),

      hint: makeNative(function(target, mode) {}, 'hint'),
    };

    Object.setPrototypeOf(gl2, WebGL2RenderingContext.prototype);
    sandbox._webgl2Ctx = gl2;
    return gl2;
  }
}

module.exports = { install };