const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/cli.ts',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cli.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    // Don't bundle Node.js modules
    'fsevents': 'commonjs fsevents',
  },
}; 