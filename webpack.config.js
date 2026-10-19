var path = require('path'),
  CopyWebpackPlugin = require('copy-webpack-plugin'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  TerserPlugin = require('terser-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

var options = {
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    popup: path.join(__dirname, 'src', 'pages', 'Popup', 'index.tsx'),
    background: path.join(__dirname, 'src', 'pages', 'Background', 'index.ts'),
    contentScript: path.join(__dirname, 'src', 'pages', 'Content', 'index.tsx'),
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'build'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
        options: {transpileOnly: isDevelopment},
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          // generates the manifest file using the package.json informations
          transform: content =>
            Buffer.from(
              JSON.stringify({
                description: process.env.npm_package_description,
                version: process.env.npm_package_version,
                ...JSON.parse(content.toString()),
              })
            ),
        },
        'src/assets/img/icon-128.png',
        'src/assets/img/icon-34.png',
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'pages', 'Popup', 'index.html'),
      filename: 'popup.html',
      chunks: ['popup'],
    }),
  ],
};

if (isDevelopment) {
  options.devtool = 'cheap-module-source-map';
} else {
  options.optimization = {
    minimizer: [new TerserPlugin({extractComments: false})],
  };
}

module.exports = options;
