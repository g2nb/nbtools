const path = require('path');
const webpack = require('webpack');
const version = require('./package.json').version;

// Custom webpack rules
const rules = [
  { test: /\.ts$/, loader: 'ts-loader' },
  { test: /\.js$/, loader: 'source-map-loader' },
  { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
  { test: /\.(png|svg|jpg)$/i, use: ['file-loader'] }
];

// Packages that shouldn't be bundled but loaded at runtime
const externals = ['@jupyter-widgets/base'];

const resolve = {
  // Add '.ts' and '.tsx' as resolvable extensions.
  extensions: [".webpack.js", ".web.js", ".ts", ".js", ".css"]
};

module.exports = [
  /**
   * Notebook extension
   *
   * This bundle only contains the part of the JavaScript that is run on load of
   * the notebook.
   */
  {
    entry: './src/extension.ts',
    target: 'web',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'nbtools', 'nbextension', 'static'),
      libraryTarget: 'amd',
      // TODO: Replace after release to unpkg.org
      publicPath: '' // 'https://unpkg.com/@g2nb/nbtools@' + version + '/dist/'
    },
    module: {
      rules: rules
    },
    devtool: 'source-map',
    externals,
    resolve,
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
  },

  /**
   * Embeddable nbtools bundle
   *
   * This bundle is almost identical to the notebook extension bundle. The only
   * difference is in the configuration of the webpack public path for the
   * static assets.
   *
   * The target bundle is always `dist/index.js`, which is the path required by
   * the custom widget embedder.
   */
  {
    entry: './src/index.ts',
    target: 'web',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'amd',
        library: "@g2nb/nbtools",
        // TODO: Replace after release to unpkg.org
        publicPath: '' // 'https://unpkg.com/@g2nb/nbtools@' + version + '/dist/'
    },
    devtool: 'source-map',
    module: {
        rules: rules
    },
    externals,
    resolve,
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
  },


  /**
   * Documentation widget bundle
   *
   * This bundle is used to embed widgets in the package documentation.
   */
  {
    entry: './src/index.ts',
    target: 'web',
    output: {
      filename: 'embed-bundle.js',
      path: path.resolve(__dirname, 'docs', 'source', '_static'),
      library: "@g2nb/nbtools",
      libraryTarget: 'amd',
      // TODO: Replace after release to unpkg.org
      publicPath: '' // 'https://unpkg.com/@g2nb/nbtools@' + version + '/dist/'
    },
    module: {
      rules: rules
    },
    devtool: 'source-map',
    externals,
    resolve,
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
  }

];
