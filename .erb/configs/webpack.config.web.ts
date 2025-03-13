/**
 * Build config for web version
 */

import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import { merge } from 'webpack-merge';
import TerserPlugin from 'terser-webpack-plugin';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';
import checkNodeEnv from '../scripts/check-node-env';
import fs from 'fs';

checkNodeEnv('production');

// Create a dedicated web output directory
const webDistPath = path.join(webpackPaths.rootPath, 'dist/web');

// Ensure the web directory exists
if (!fs.existsSync(webDistPath)) {
  fs.mkdirSync(webDistPath, { recursive: true });
}

const configuration: webpack.Configuration = {
  devtool: 'source-map',
  mode: 'production',
  target: 'web',
  entry: [path.join(webpackPaths.srcRendererPath, 'index.tsx')],
  output: {
    path: webDistPath,
    publicPath: './',
    filename: 'web.js',
    library: {
      type: 'umd',
    },
  },
  module: {
    rules: [
      {
        test: /\.s?(a|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
            },
          },
          'sass-loader',
        ],
        include: /\.module\.s?(c|a)ss$/,
      },
      {
        test: /\.s?(a|c)ss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader', 'postcss-loader'],
        exclude: /\.module\.s?(c|a)ss$/,
      },
      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      // Images
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      // SVG
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              prettier: false,
              svgo: false,
              svgoConfig: {
                plugins: [{ removeViewBox: false }],
              },
              titleProp: true,
              ref: true,
            },
          },
          'file-loader',
        ],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      IS_WEB: true,
      DEBUG_PROD: false,
    }),
    new MiniCssExtractPlugin({
      filename: 'style.css',
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(webpackPaths.srcRendererPath, 'index.ejs'),
      minify: {
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true,
      },
      isBrowser: true,
      isDevelopment: false,
      favicon: path.join(webpackPaths.srcRendererPath, 'favicon.ico'),
    }),
  ],
};

export default merge(baseConfig, configuration);
