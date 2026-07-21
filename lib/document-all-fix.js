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

  // 真实浏览器 [[IsHTMLDDA]] 行为：
  // - typeof document.all === 'undefined'（特殊行为，需替换）
  // - document.all == undefined  → true（特殊行为，需替换）
  // - document.all == null       → true（特殊行为，需替换）
  // - document.all === undefined → false（严格相等不受影响，不替换！）
  // - document.all === null      → false（严格相等不受影响，不替换！）
  // - document.all !== undefined → true
  // - document.all !== null      → true
  //
  // 注意：严格相等 (===, !==) 的行为与普通对象一致，不应替换
  // 正则中用 (?![=]) 负向先行断言确保只匹配 == 而不是 ===
  const patterns = [
    // typeof document.all：后面不能跟 . 或 [（避免误匹配 document.all.xxx）
    { re: /typeof\s+document\.all(?![.\[])/g, replacement: "'undefined'" },
    // == 和 !=：要求 document.all 后面不是 . 或 [，且 == 后面不是 =（避免匹配 ===）
    { re: /document\.all(?![.\[])\s*==(?!=)\s*undefined/g, replacement: 'true' },
    { re: /document\.all(?![.\[])\s*==(?!=)\s*null/g, replacement: 'true' },
    { re: /document\.all(?![.\[])\s*!=(?!=)\s*undefined/g, replacement: 'false' },
    { re: /document\.all(?![.\[])\s*!=(?!=)\s*null/g, replacement: 'false' },
    // 反向：undefined == document.all（前面是 undefined/null，后面是 document.all）
    // document.all 前面是 ==，后面不能是 . 或 [
    { re: /undefined\s*==(?!=)\s*document\.all(?![.\[])/g, replacement: 'true' },
    { re: /null\s*==(?!=)\s*document\.all(?![.\[])/g, replacement: 'true' },
    { re: /undefined\s*!=(?!=)\s*document\.all(?![.\[])/g, replacement: 'false' },
    { re: /null\s*!=(?!=)\s*document\.all(?![.\[])/g, replacement: 'false' }
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
