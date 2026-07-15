'use strict';

function isInString(code, pos) {
  let inSingle = false, inDouble = false, inTemplate = false;
  for (let i = 0; i < pos; i++) {
    const c = code[i];
    if (c === '\\') { i++; continue; }
    if (c === '`' && !inSingle && !inDouble) inTemplate = !inTemplate;
    if (c === '\'' && !inDouble && !inTemplate) inSingle = !inSingle;
    if (c === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
  }
  return inSingle || inDouble || inTemplate;
}

function isInComment(code, pos) {
  for (let i = 0; i < pos; ) {
    if (code[i] === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i);
      if (nl === -1) return pos >= i;
      if (pos >= i && pos < nl) return true;
      i = nl + 1;
    } else if (code[i] === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i);
      if (end === -1) return pos >= i;
      if (pos >= i && pos <= end + 1) return true;
      i = end + 2;
    } else {
      i++;
    }
  }
  return false;
}

function fixDocumentAll(code) {
  let result = code;
  let modified = false;

  const patterns = [
    { re: /typeof\s+document\.all/g, replacement: "'undefined'" },
    { re: /document\.all\s*===\s*undefined/g, replacement: 'true' },
    { re: /document\.all\s*==\s*undefined/g, replacement: 'true' },
    { re: /document\.all\s*===\s*null/g, replacement: 'true' },
    { re: /document\.all\s*==\s*null/g, replacement: 'true' },
    { re: /document\.all\s*!==\s*undefined/g, replacement: 'false' },
    { re: /document\.all\s*!=\s*undefined/g, replacement: 'false' },
    { re: /document\.all\s*!==\s*null/g, replacement: 'false' },
    { re: /document\.all\s*!=\s*null/g, replacement: 'false' },
    { re: /undefined\s*===\s*document\.all/g, replacement: 'true' },
    { re: /undefined\s*==\s*document\.all/g, replacement: 'true' },
    { re: /null\s*===\s*document\.all/g, replacement: 'true' },
    { re: /null\s*==\s*document\.all/g, replacement: 'true' },
    { re: /undefined\s*!==\s*document\.all/g, replacement: 'false' },
    { re: /undefined\s*!=\s*document\.all/g, replacement: 'false' },
    { re: /null\s*!==\s*document\.all/g, replacement: 'false' },
    { re: /null\s*!=\s*document\.all/g, replacement: 'false' }
  ];

  for (const { re, replacement } of patterns) {
    let match;
    const replacements = [];
    while ((match = re.exec(result)) !== null) {
      if (!isInString(result, match.index) && !isInComment(result, match.index)) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          replacement
        });
      }
    }

    replacements.sort((a, b) => b.start - a.start);
    for (const rep of replacements) {
      result = result.substring(0, rep.start) + rep.replacement + result.substring(rep.end);
      modified = true;
    }
  }

  return result;
}

module.exports = { fixDocumentAll };
