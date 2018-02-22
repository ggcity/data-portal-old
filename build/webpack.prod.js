const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

const webpack = require('webpack');
const MinifyPlugin = require("babel-minify-webpack-plugin");

module.exports = merge(common, {
  output: {
    filename: 'gg-map-viewer.js',
    path: path.resolve(__dirname, '../dist')
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new MinifyPlugin()
  ]
});
