import path from 'path';

import { getCacheDir } from '../create';
import { mapToRegex } from '../utils/mapToRegex';

import { PresetMergeAsyncFn } from '../types/presets';
import { Webpack } from '../types/values';

import loaders, { css, fonts, media, md, mdx, js, mjs } from '../utils/loaders';
import { stats } from '../utils/stats';

const cacheDir = getCacheDir();

export const webpack: PresetMergeAsyncFn<Webpack> = async (_, config) => {
  const { default: HtmlWebpackPlugin } = await import('html-webpack-plugin');
  const { default: CaseSensitivePathsPlugin } = await import('case-sensitive-paths-webpack-plugin');
  const { create } = await import('../utils/entrypointsPlugin');

  const { location } = await config.output;
  const e = await config.entries;
  const { entries: entry, plugin } = create(e, {});
  const entryRegex = e.map(mapToRegex);

  return {
    name: 'preview',
    mode: 'development',
    bail: true,
    devtool: false,
    stats,

    entry: await entry(),
    output: {
      path: location,
      filename: '[name].[hash].bundle.js',
      publicPath: '',
    },

    plugins: [
      new HtmlWebpackPlugin({
        filename: `iframe.html`,
        chunksSortMode: () => 0,
        alwaysWriteToDisk: true,
        inject: false,
        templateParameters: (compilation, files, templateOptions) => ({
          compilation,
          files,
          options: templateOptions,
          version: 1,
          dlls: [],
          headHtmlSnippet: '',
          mains: files.js.filter(i => !i.includes('preview')),
          examples: files.js.filter(i => i.includes('preview')),
        }),
        template: path.join(__dirname, '..', 'templates', 'index.ejs'),
      }),
      // TODO, this broke with some version update
      new CaseSensitivePathsPlugin() as any,
      plugin,
    ],

    module: {
      rules: [
        {
          test: e.map(mapToRegex),
          loader: loaders.previewEntry,
          exclude: /node_modules/,
          options: {
            storybook: true,
          },
        },
        css,
        md,
        fonts,
        media,
        { ...mdx, exclude: [...entryRegex, /node_modules/] },
        js,
        { ...mjs, exclude: [...entryRegex] },
      ],
    },

    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.json'],
      modules: ['node_modules'],
    },
    recordsPath: path.join(cacheDir, 'records.json'),
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
      runtimeChunk: {
        name: 'preview-runtime',
      },
    },
  };
};
