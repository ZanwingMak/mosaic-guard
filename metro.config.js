// Metro 配置：Expo 默认即可，TF.js / Tesseract 资源由 dynamic import 走 web 通道
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
