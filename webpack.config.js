'use strict';

const clone = require('clone');
const webpack = require('webpack');
const path = require('path');
const PROD = process.env.NODE_ENV === 'production';
const packageData = require('./package.json');

let plugins = [
  new webpack.DefinePlugin({
    __VERSION__: JSON.stringify(packageData.version),
    __NAME__: JSON.stringify(packageData.name)
  })
];

if (PROD) {
  plugins.push(new webpack.optimize.UglifyJsPlugin({sourceMap: true}));
}

const baseConfig = {
  context: __dirname + '/src',
  entry: {},
  output: {
    path: path.join(__dirname, 'dist'),
    libraryTarget: 'umd',
    devtoolModuleFilenameTemplate: './providers/[resource-path]'
  },
  devtool: 'source-map',
  plugins: plugins,
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader'
          }
        ],
        exclude: [/node_modules/]
      },
      {
        test: /\.js$/,
        exclude: [/node_modules/],
        enforce: 'pre',
        use: [
          {
            loader: 'eslint-loader',
            options: {
              rules: {
                semi: 0
              }
            }
          }
        ]
      }
    ]
  },
  devServer: {
    contentBase: __dirname + '/src'
  },
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules']
  }
};

const providersConfig = clone(baseConfig);
const servicesConfig = clone(baseConfig);

Object.assign(providersConfig.entry, {
  ott: 'v-provider/ott/index.js',
  ovp: 'v-provider/ovp/index.js'
});

Object.assign(providersConfig.output, {
  filename: 'pakhshkit-[name]-provider.js',
  library: ['pakhshkit', 'providers', '[name]']
});

Object.assign(servicesConfig.entry, {
  analytics: 'v-provider/ovp/services/analytics/index.js',
  stats: 'v-provider/ovp/services/stats/index.js',
  bookmark: 'v-provider/ott/services/bookmark/index.js'
});

Object.assign(servicesConfig.output, {
  filename: 'pakhshkit-[name]-service.js',
  library: ['pakhshkit', 'services', '[name]']
});

module.exports = [providersConfig, servicesConfig];
