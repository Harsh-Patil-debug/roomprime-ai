// @ts-nocheck
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Block web-only directories so Metro doesn't crawl them
config.resolver.blockList = [
  /[/\\]src[/\\].*/,
  /[/\\]\.output[/\\].*/,
  /[/\\]\.tanstack[/\\].*/,
  /[/\\]\.wrangler[/\\].*/,
  /[/\\]public[/\\].*/,
  /[/\\]ppt_qr_codes[/\\].*/,
];

module.exports = config;
