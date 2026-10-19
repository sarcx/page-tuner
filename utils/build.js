// Do this as the first thing so that any code reading it knows the right env.
process.env.NODE_ENV = 'production';

var webpack = require('webpack'),
  path = require('path'),
  fs = require('fs'),
  config = require('../webpack.config'),
  ZipPlugin = require('zip-webpack-plugin');

var packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

config.plugins = config.plugins.concat(
  new ZipPlugin({
    filename: `${packageInfo.name}-${packageInfo.version}.zip`,
    path: path.join(__dirname, '../', 'zip'),
  })
);

webpack(config, function (err, stats) {
  if (err) throw err;
  if (stats.hasErrors()) {
    console.error(stats.toString('errors-only'));
    process.exit(1);
  }
});
