'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * Canvas 模块
 *
 * 模拟 Canvas 2D 和 WebGL 上下文。
 * 不执行实际渲染，只返回固定指纹值，保证环境完整性。
 *
 * 包含:
 * - HTMLCanvasElement (补充 document 模块中的)
 * - CanvasRenderingContext2D
 * - WebGLRenderingContext
 * - ImageData
 * - Path2D
 * - CanvasGradient / CanvasPattern
 * - TextMetrics
 */

function install(sandbox, config = {}) {
  const cfg = config.canvas || {};

  // ── CanvasRenderingContext2D ──
  // 提供一个兼容结构，所有方法都是空操作
  function CanvasRenderingContext2D() {}
  makeNative(CanvasRenderingContext2D, 'CanvasRenderingContext2D');

  const ctxMethods = [
    // 状态
    'save', 'restore',
    // 变换
    'scale', 'rotate', 'translate', 'transform', 'setTransform', 'resetTransform',
    // 填充和描边
    'fill', 'stroke', 'beginPath', 'moveTo', 'lineTo', 'closePath',
    'rect', 'fillRect', 'strokeRect', 'clearRect',
    'arc', 'arcTo', 'bezierCurveTo', 'quadraticCurveTo', 'ellipse',
    'fillText', 'strokeText', 'measureText',
    // 路径
    'clip', 'isPointInPath', 'isPointInStroke',
    // 样式
    'createLinearGradient', 'createRadialGradient', 'createPattern',
    // 阴影
    'setLineDash', 'getLineDash',
    // 像素
    'createImageData', 'getImageData', 'putImageData',
    // 绘制
    'drawImage', 'drawFocusIfNeeded',
    // 文本
    'scrollPathIntoView',
    // 全局
    'addHitRegion', 'removeHitRegion', 'clearHitRegions'
  ];

  const ctx = {
    canvas: null,
    // 属性
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

  // ── ImageData ──
  function ImageData(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    this.colorSpace = 'srgb';
  }
  makeNative(ImageData, 'ImageData');
  ImageData.prototype.toString = makeNative(function() { return '[object ImageData]'; }, 'toString');

  // ── Path2D ──
  function Path2D() {}
  makeNative(Path2D, 'Path2D');
  // 空方法
  ['addPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'bezierCurveTo', 'quadraticCurveTo', 'ellipse', 'rect'].forEach(m => {
    Path2D.prototype[m] = makeNative(function() {}, m);
  });

  // ── CanvasGradient ──
  function CanvasGradient() {}
  makeNative(CanvasGradient, 'CanvasGradient');
  CanvasGradient.prototype.addColorStop = makeNative(function() {}, 'addColorStop');

  // ── WebGLRenderingContext 构造函数（全局）──
  function WebGLRenderingContext() {}
  makeNative(WebGLRenderingContext, 'WebGLRenderingContext');

  // ── WebGL2RenderingContext 构造函数（全局）──
  function WebGL2RenderingContext() {}
  makeNative(WebGL2RenderingContext, 'WebGL2RenderingContext');

  // ── 安装到 sandbox ──
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

  // 如果 canvas 元素已存在，设置其 getContext
  if (sandbox.HTMLCanvasElement && sandbox.HTMLCanvasElement.prototype) {
    sandbox.HTMLCanvasElement.prototype.getContext = makeNative(function(type) {
      if (type === '2d') {
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

    sandbox.HTMLCanvasElement.prototype.toDataURL = makeNative(function(type) {
      return cfg.toDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }, 'toDataURL');

    sandbox.HTMLCanvasElement.prototype.toBlob = makeNative(function(callback) {
      callback && callback({ size: 100, type: 'image/png' });
    }, 'toBlob');

    sandbox.HTMLCanvasElement.prototype.width = cfg.canvasWidth || 300;
    sandbox.HTMLCanvasElement.prototype.height = cfg.canvasHeight || 150;
  }

  // ── WebGL ──
  function createWebGLContext() {
    if (sandbox._webglCtx) return sandbox._webglCtx;

    // 28 个 WebGL 扩展（匹配真实浏览器指纹）
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

    // 为每个扩展生成对应的扩展对象
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

    // 着色器精度矩阵: [rangeMin, rangeMax, precision]
    // RS 会查询 (VERTEX_SHADER+HIGH_FLOAT, VERTEX_SHADER+MEDIUM_FLOAT, 等 8 种组合)
    var shaderPrecisions = {};
    shaderPrecisions['35633,36338'] = { rangeMin: 127, rangeMax: 127, precision: 23 };  // VERTEX + HIGH_FLOAT
    shaderPrecisions['35633,36337'] = { rangeMin: 127, rangeMax: 127, precision: 23 };  // VERTEX + MEDIUM_FLOAT
    shaderPrecisions['35633,36336'] = { rangeMin: 127, rangeMax: 127, precision: 23 };  // VERTEX + LOW_FLOAT
    shaderPrecisions['35633,36340'] = { rangeMin: 31, rangeMax: 30, precision: 0 };     // VERTEX + HIGH_INT
    shaderPrecisions['35633,36339'] = { rangeMin: 31, rangeMax: 30, precision: 0 };     // VERTEX + MEDIUM_INT
    shaderPrecisions['35633,36341'] = { rangeMin: 31, rangeMax: 30, precision: 0 };     // VERTEX + LOW_INT
    shaderPrecisions['35632,36338'] = { rangeMin: 127, rangeMax: 127, precision: 23 };  // FRAGMENT + HIGH_FLOAT
    shaderPrecisions['35632,36337'] = { rangeMin: 127, rangeMax: 127, precision: 23 };  // FRAGMENT + MEDIUM_FLOAT
    shaderPrecisions['35632,36336'] = { rangeMin: 127, rangeMax: 127, precision: 23 };  // FRAGMENT + LOW_FLOAT
    shaderPrecisions['35632,36340'] = { rangeMin: 31, rangeMax: 30, precision: 0 };     // FRAGMENT + HIGH_INT
    shaderPrecisions['35632,36339'] = { rangeMin: 31, rangeMax: 30, precision: 0 };     // FRAGMENT + MEDIUM_INT
    shaderPrecisions['35632,36341'] = { rangeMin: 31, rangeMax: 30, precision: 0 };     // FRAGMENT + LOW_INT

    var gl = {
      drawingBufferWidth: cfg.webglWidth || 300,
      drawingBufferHeight: cfg.webglHeight || 150,
      drawingBufferColorSpace: 'srgb',
      canvas: null,
      _extensions: extensionCache,
      _extensionList: webglExtensions,

      // WebGL 常量 (OpenGL ES 2.0)
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
      
      // 着色器类型
      VERTEX_SHADER: 0x8B31,
      FRAGMENT_SHADER: 0x8B30,
      
      // 精度类型
      LOW_FLOAT: 0x8DF0,
      MEDIUM_FLOAT: 0x8DF1,
      HIGH_FLOAT: 0x8DF2,
      LOW_INT: 0x8DF3,
      MEDIUM_INT: 0x8DF4,
      HIGH_INT: 0x8DF5,
      
      // buffer 相关
      ARRAY_BUFFER: 0x8892,
      ELEMENT_ARRAY_BUFFER: 0x8893,
      STATIC_DRAW: 0x88E4,
      DYNAMIC_DRAW: 0x88E8,
      STREAM_DRAW: 0x88E0,
      
      // draw 类型
      TRIANGLES: 0x0004,
      TRIANGLE_STRIP: 0x0005,
      TRIANGLE_FAN: 0x0006,
      POINTS: 0x0000,
      LINES: 0x0001,
      LINE_STRIP: 0x0002,
      LINE_LOOP: 0x0003,
      
      // 混合模式
      ONE: 1,
      ZERO: 0,
      SRC_ALPHA: 0x0302,
      ONE_MINUS_SRC_ALPHA: 0x0303,
      
      // 深度/模板
      DEPTH_TEST: 0x0B71,
      BLEND: 0x0BE2,
      CULL_FACE: 0x0B44,
      SCISSOR_TEST: 0x0C11,
      DITHER: 0x0BD0,
      STENCIL_TEST: 0x0B90,

      getParameter: makeNative(function(pname) {
        var floatExt = gl._extensions['EXT_float_blend'];
        if (pname === 0x1F00) return cfg.webglVendor || 'Google Inc. (Intel)';
        if (pname === 0x1F01) return cfg.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics (0x00009BC4) Direct3D11 vs_5_0 ps_5_0, D3D11)';
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
        if (pname === 0x8B4F) return 8;     // MAX_VERTEX_UNIFORM_COMPONENTS
        if (pname === 0x8B50) return 64;    // MAX_VARYING_COMPONENTS
        if (pname === 0x8B4E) return 32;    // MAX_VERTEX_TEXTURE_IMAGE_UNITS
        if (pname === 0x8B4D) return 32;    // MAX_COMBINED_TEXTURE_IMAGE_UNITS
        if (pname === 0x8B30) return 8;     // MAX_FRAGMENT_UNIFORM_COMPONENTS
        if (pname === 0x84E2) return 1024;  // MAX_TEXTURE_MAX_ANISOTROPY_EXT
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

      // 空方法
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
      
      // Shader
      createShader: makeNative(function(type) { return { _type: type }; }, 'createShader'),
      shaderSource: makeNative(function(shader, source) { shader._source = source; }, 'shaderSource'),
      compileShader: makeNative(function(shader) { shader._compiled = true; }, 'compileShader'),
      isShader: makeNative(function(shader) { return shader && shader._type !== undefined; }, 'isShader'),
      getShaderParameter: makeNative(function(shader, pname) {
        if (pname === 0x8B81) return true; // COMPILE_STATUS
        if (pname === 0x8B84) return false; // DELETE_STATUS
        return true;
      }, 'getShaderParameter'),
      getShaderInfoLog: makeNative(function(shader) { return ''; }, 'getShaderInfoLog'),
      
      // Program
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
        if (pname === 0x8B82) return true; // LINK_STATUS
        if (pname === 0x8B84) return false; // DELETE_STATUS
        if (pname === 0x8B86) return 2;     // ACTIVE_ATTRIBUTES
        if (pname === 0x8B87) return 2;     // ACTIVE_UNIFORMS
        return true;
      }, 'getProgramParameter'),
      getProgramInfoLog: makeNative(function(program) { return ''; }, 'getProgramInfoLog'),
      useProgram: makeNative(function(program) { gl._currentProgram = program; }, 'useProgram'),
      validateProgram: makeNative(function(program) {}, 'validateProgram'),
      
      // Attributes & Uniforms
      getAttribLocation: makeNative(function(program, name) { return 0; }, 'getAttribLocation'),
      getUniformLocation: makeNative(function(program, name) { return { _name: name }; }, 'getUniformLocation'),
      enableVertexAttribArray: makeNative(function(index) {}, 'enableVertexAttribArray'),
      disableVertexAttribArray: makeNative(function(index) {}, 'disableVertexAttribArray'),
      vertexAttribPointer: makeNative(function(index, size, type, normalized, stride, offset) {}, 'vertexAttribPointer'),
      vertexAttrib1f: makeNative(function(index, x) {}, 'vertexAttrib1f'),
      vertexAttrib2f: makeNative(function(index, x, y) {}, 'vertexAttrib2f'),
      vertexAttrib3f: makeNative(function(index, x, y, z) {}, 'vertexAttrib3f'),
      vertexAttrib4f: makeNative(function(index, x, y, z, w) {}, 'vertexAttrib4f'),
      
      // Uniform setters (all variants)
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
      
      // Buffer
      createBuffer: makeNative(function() { return {}; }, 'createBuffer'),
      deleteBuffer: makeNative(function(buffer) {}, 'deleteBuffer'),
      isBuffer: makeNative(function(buffer) { return true; }, 'isBuffer'),
      bindBuffer: makeNative(function(target, buffer) {}, 'bindBuffer'),
      bufferData: makeNative(function(target, data, usage) {}, 'bufferData'),
      bufferSubData: makeNative(function(target, offset, data) {}, 'bufferSubData'),
      
      // Texture
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
      
      // Framebuffer
      createFramebuffer: makeNative(function() { return {}; }, 'createFramebuffer'),
      deleteFramebuffer: makeNative(function(fb) {}, 'deleteFramebuffer'),
      isFramebuffer: makeNative(function(fb) { return true; }, 'isFramebuffer'),
      bindFramebuffer: makeNative(function(target, fb) {}, 'bindFramebuffer'),
      framebufferTexture2D: makeNative(function(target, attachment, texTarget, texture, level) {}, 'framebufferTexture2D'),
      framebufferRenderbuffer: makeNative(function(target, attachment, rbTarget, rb) {}, 'framebufferRenderbuffer'),
      checkFramebufferStatus: makeNative(function(target) { return 0x8CD5; }, 'checkFramebufferStatus'), // FRAMEBUFFER_COMPLETE
      
      // Renderbuffer
      createRenderbuffer: makeNative(function() { return {}; }, 'createRenderbuffer'),
      deleteRenderbuffer: makeNative(function(rb) {}, 'deleteRenderbuffer'),
      isRenderbuffer: makeNative(function(rb) { return true; }, 'isRenderbuffer'),
      bindRenderbuffer: makeNative(function(target, rb) {}, 'bindRenderbuffer'),
      renderbufferStorage: makeNative(function(target, internalFormat, width, height) {}, 'renderbufferStorage'),
      
      // Drawing
      drawArrays: makeNative(function(mode, first, count) {
        gl._webglDrawn = true;
      }, 'drawArrays'),
      drawElements: makeNative(function(mode, count, type, offset) {
        gl._webglDrawn = true;
      }, 'drawElements'),
      finish: makeNative(function() {}, 'finish'),
      flush: makeNative(function() {}, 'flush'),
      
      // State queries
      getError: makeNative(function() { return 0; }, 'getError'),
      getString: makeNative(function(pname) {
        if (pname === 0x1F00) return 'WebGL';
        if (pname === 0x1F01) return 'Mesa/X.org';
        return '';
      }, 'getString'),
      
      // Pixel read
      readPixels: makeNative(function(x, y, w, h, format, type, pixels) {
        if (pixels && pixels.length >= 4) {
          pixels[0] = 0; pixels[1] = 0; pixels[2] = 0; pixels[3] = 255;
        }
      }, 'readPixels'),
      
      // Active info
      getActiveAttrib: makeNative(function(program, index) {
        return { name: 'a_position', size: 1, type: 0x8B50 }; // FLOAT_VEC2
      }, 'getActiveAttrib'),
      getActiveUniform: makeNative(function(program, index) {
        return { name: 'u_offset', size: 1, type: 0x8B50 }; // FLOAT_VEC2
      }, 'getActiveUniform'),
      
      // Context
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
      
      // Hints
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
        var floatExt = gl2._extensions['EXT_float_blend'];
        if (pname === 0x1F00) return cfg.webglVendor || 'Google Inc. (Intel)';
        if (pname === 0x1F01) return cfg.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics (0x00009BC4) Direct3D11 vs_5_0 ps_5_0, D3D11)';
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
        if (pname === 0x8B4D) return 32;
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

  // ── Canvas 2D toDataURL 固定指纹 ──
  // 瑞数通过 Canvas 2D 渲染特定内容后取 toDataURL 作为指纹
  // 返回固定值确保每次指纹一致
  var CANVAS_2D_FINGERPRINT = cfg.canvas2dData || 'data:image/png;base64,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';

  // ── WebGL toDataURL 固定指纹（与2D不同）──
  var CANVAS_WEBGL_FINGERPRINT = cfg.webglData || 'data:image/png;base64,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';

  // 在 getContext 中使用固定指纹
  if (sandbox.HTMLCanvasElement && sandbox.HTMLCanvasElement.prototype) {
    sandbox.HTMLCanvasElement.prototype.getContext = makeNative(function(type) {
      if (type === '2d') {
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

    // toDataURL 根据是否经过 WebGL 返回不同指纹
    sandbox.HTMLCanvasElement.prototype.toDataURL = makeNative(function(type) {
      if (sandbox._webglCtx && sandbox._webglCtx._webglDrawn) {
        return CANVAS_WEBGL_FINGERPRINT;
      }
      return CANVAS_2D_FINGERPRINT;
    }, 'toDataURL');

    sandbox.HTMLCanvasElement.prototype.toBlob = makeNative(function(callback) {
      callback && callback({ size: 100, type: 'image/png' });
    }, 'toBlob');

    sandbox.HTMLCanvasElement.prototype.width = cfg.canvasWidth || 300;
    sandbox.HTMLCanvasElement.prototype.height = cfg.canvasHeight || 150;
  }
}

module.exports = { install };
