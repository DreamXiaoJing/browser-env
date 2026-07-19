'use strict';

const { makeNative } = require('../lib/guard');
const nodeUrl = require('url');
const vm = require('vm');
const nodeHttp = require('http');
const nodeHttps = require('https');

function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = nodeUrl.parse(url);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? nodeHttps : nodeHttp;
    
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.path || '/',
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false
    };
    
    const req = transport.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', chunk => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          httpGet(nodeUrl.resolve(url, res.headers.location), options).then(resolve).catch(reject);
        } else {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text: () => Promise.resolve(body.toString('utf-8')),
            ok: res.statusCode >= 200 && res.statusCode < 300,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function parseHtmlToDom(ctx, html) {
  const doc = ctx.document;
  if (!doc || !doc.documentElement) return;
  
  const htmlEl = doc.documentElement;
  
  while (htmlEl.firstChild) {
    htmlEl.removeChild(htmlEl.firstChild);
  }
  
  const trimmed = html.trim();
  const headMatch = trimmed.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  
  let headContent = headMatch ? headMatch[1] : '';
  let bodyContent = bodyMatch ? bodyMatch[1] : trimmed;
  
  if (!headMatch && !bodyMatch) {
    bodyContent = trimmed;
  }
  
  const headEl = doc.createElement('head');
  const bodyEl = doc.createElement('body');
  
  parseHtmlFragment(ctx, headEl, headContent);
  parseHtmlFragment(ctx, bodyEl, bodyContent);
  
  htmlEl.appendChild(headEl);
  htmlEl.appendChild(bodyEl);
  
  // 更新 document.head 和 document.body 引用
  if (Object.getOwnPropertyDescriptor(doc, 'head') && Object.getOwnPropertyDescriptor(doc, 'head').writable) {
    doc.head = headEl;
  } else {
    try {
      Object.defineProperty(doc, 'head', { value: headEl, configurable: true, writable: true });
    } catch(e) {}
  }
  if (Object.getOwnPropertyDescriptor(doc, 'body') && Object.getOwnPropertyDescriptor(doc, 'body').writable) {
    doc.body = bodyEl;
  } else {
    try {
      Object.defineProperty(doc, 'body', { value: bodyEl, configurable: true, writable: true });
    } catch(e) {}
  }
  
  const titleEl = doc.querySelector('title');
  if (titleEl && titleEl.textContent) {
    doc.title = titleEl.textContent;
  }
}

function parseHtmlFragment(ctx, parent, html) {
  const doc = ctx.document;
  let remaining = html;
  const elements = [];
  
  while (remaining.length > 0) {
    const openTagIndex = remaining.indexOf('<');
    if (openTagIndex === -1) {
      if (remaining.trim()) {
        elements.push({ type: 'text', content: remaining });
      }
      break;
    }
    
    if (openTagIndex > 0) {
      const textBefore = remaining.substring(0, openTagIndex);
      if (textBefore.trim()) {
        elements.push({ type: 'text', content: textBefore });
      }
    }
    
    remaining = remaining.substring(openTagIndex);
    
    if (remaining.startsWith('</')) {
      const endTagEnd = remaining.indexOf('>');
      if (endTagEnd !== -1) {
        remaining = remaining.substring(endTagEnd + 1);
      } else {
        break;
      }
      continue;
    }
    
    const tagEnd = remaining.indexOf('>');
    if (tagEnd === -1) {
      break;
    }
    
    const tagHeader = remaining.substring(1, tagEnd);
    const spaceIndex = tagHeader.indexOf(' ');
    const tagName = (spaceIndex === -1 ? tagHeader : tagHeader.substring(0, spaceIndex)).toLowerCase();
    const attrs = spaceIndex === -1 ? '' : tagHeader.substring(spaceIndex);
    
    remaining = remaining.substring(tagEnd + 1);
    
    if (tagName === 'script') {
      const scriptEnd = remaining.indexOf('</script>');
      if (scriptEnd !== -1) {
        const content = remaining.substring(0, scriptEnd);
        elements.push({ type: 'element', tagName: 'script', attrs, content });
        remaining = remaining.substring(scriptEnd + 9);
      } else {
        elements.push({ type: 'element', tagName: 'script', attrs, content: '', selfClosing: true });
      }
    } else if (tagName === 'style') {
      const styleEnd = remaining.indexOf('</style>');
      if (styleEnd !== -1) {
        const content = remaining.substring(0, styleEnd);
        elements.push({ type: 'element', tagName: 'style', attrs, content });
        remaining = remaining.substring(styleEnd + 8);
      } else {
        elements.push({ type: 'element', tagName: 'style', attrs, content: '', selfClosing: true });
      }
    } else {
      const selfClosing = tagHeader.endsWith('/');
      if (selfClosing) {
        elements.push({ type: 'element', tagName, attrs: attrs.replace(/\/$/, ''), content: '', selfClosing: true });
      } else {
        const endTag = '</' + tagName + '>';
        const tagEndIndex = remaining.indexOf(endTag);
        if (tagEndIndex !== -1) {
          const content = remaining.substring(0, tagEndIndex);
          elements.push({ type: 'element', tagName, attrs, content });
          remaining = remaining.substring(tagEndIndex + endTag.length);
        } else {
          elements.push({ type: 'element', tagName, attrs, content: '', selfClosing: true });
        }
      }
    }
  }
  
  for (const el of elements) {
    if (el.type === 'text') {
      const textNode = doc.createTextNode(el.content);
      parent.appendChild(textNode);
    } else {
      const element = doc.createElement(el.tagName);
      parseAttributes(element, el.attrs);
      
      if (!el.selfClosing) {
        if (el.tagName === 'script' || el.tagName === 'style') {
          const textNode = doc.createTextNode(el.content);
          element.appendChild(textNode);
        } else {
          parseHtmlFragment(ctx, element, el.content);
        }
      }
      
      parent.appendChild(element);
    }
  }
}

function parseAttributes(element, attrsStr) {
  const attrRegex = /([a-z][a-z0-9-]*)(?:\s*=\s*["']([^"']*)["'])?/gi;
  let match;
  
  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const name = match[1];
    const value = match[2] || '';
    
    if (name === 'class') {
      element.className = value;
    } else if (name === 'id') {
      element.id = value;
    } else if (name === 'async') {
      element.async = true;
    } else if (name === 'defer') {
      element.defer = true;
    } else {
      element.setAttribute(name, value);
    }
  }
}

function collectScripts(doc) {
  const scripts = [];
  
  function find(node) {
    if (!node || !node.childNodes) return;
    
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      
      if (child.tagName && child.tagName.toLowerCase() === 'script') {
        scripts.push(child);
      }
      
      find(child);
    }
  }
  
  find(doc.documentElement);
  
  return scripts;
}

async function loadAndExecuteScript(ctx, scriptEl, baseUrl) {
  const src = scriptEl.getAttribute('src');
  
  if (src) {
    const fullUrl = nodeUrl.resolve(baseUrl, src);
    
    try {
      const response = await httpGet(fullUrl);
      if (!response.ok) {
        return;
      }
      
      const code = await response.text();
      
      vm.runInContext(code, ctx, {
        filename: fullUrl,
        displayErrors: false
      });
      
      scriptEl._loaded = true;
      scriptEl.dispatchEvent(new ctx.Event('load'));
    } catch (e) {
      scriptEl.dispatchEvent(new ctx.Event('error'));
    }
  } else if (scriptEl.textContent) {
    try {
      vm.runInContext(scriptEl.textContent, ctx, {
        filename: baseUrl,
        displayErrors: false
      });
      scriptEl._loaded = true;
    } catch (e) {}
  }
}

function install(sandbox, config = {}) {
  sandbox.__parseHtml = makeNative(function(html) {
    const ctx = this;
    const doc = ctx.document;
    
    if (doc && doc.documentElement) {
      parseHtmlToDom(ctx, html);
    }
    
    const scripts = collectScripts(doc);
    
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.textContent) {
        try {
          vm.runInContext(script.textContent, ctx, {
            filename: 'inline',
            displayErrors: false
          });
        } catch (e) {}
      }
    }
    
    return { html: html };
  }, '__parseHtml');
  
  sandbox.__loadUrl = makeNative(function(url) {
    const ctx = this;
    
    return new Promise((resolve, reject) => {
      httpGet(url)
        .then(response => {
          if (!response.ok) {
            throw new Error('HTTP error: ' + response.status);
          }
          return response.text();
        })
        .then(async html => {
          const doc = ctx.document;
          const loc = ctx.location;
          
          if (doc && doc.documentElement) {
            parseHtmlToDom(ctx, html);
          }
          
          if (loc) {
            try {
              const parsed = nodeUrl.parse(url);
              loc.href = url;
              loc.protocol = parsed.protocol || '';
              loc.host = parsed.host || '';
              loc.hostname = parsed.hostname || '';
              loc.port = parsed.port || '';
              loc.pathname = parsed.pathname || '/';
              loc.search = parsed.search || '';
              loc.hash = parsed.hash || '';
            } catch (e) {}
          }
          
          if (doc) {
            doc.URL = url;
            doc.documentURI = url;
            doc.baseURI = url;
          }
          
          const scripts = collectScripts(doc);
          
          const asyncScripts = [];
          const deferScripts = [];
          const normalScripts = [];
          
          for (const script of scripts) {
            if (script.getAttribute('async')) {
              asyncScripts.push(script);
            } else if (script.getAttribute('defer')) {
              deferScripts.push(script);
            } else {
              normalScripts.push(script);
            }
          }
          
          for (const script of asyncScripts) {
            loadAndExecuteScript(ctx, script, url);
          }
          
          for (const script of normalScripts) {
            await loadAndExecuteScript(ctx, script, url);
          }
          
          for (const script of deferScripts) {
            await loadAndExecuteScript(ctx, script, url);
          }
          
          if (doc) {
            setTimeout(() => {
              doc.dispatchEvent(new ctx.Event('DOMContentLoaded'));
            }, 0);
          }
          
          setTimeout(() => {
            ctx.dispatchEvent(new ctx.Event('load'));
          }, 100);
          
          resolve({ html: html, url: url });
        })
        .catch(err => {
          reject(err);
        });
    });
  }, '__loadUrl');
}

module.exports = { install };
