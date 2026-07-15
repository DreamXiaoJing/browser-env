#!/usr/bin/env node
'use strict';

/**
 * 示例 — 问财ai
 *
 * 在补环境沙箱中加载
 *
 */

const { createEnv } = require('../');
const env = createEnv({},'./_wencai.js');
console.log(env.context.document.cookie);
process.exit(0);
