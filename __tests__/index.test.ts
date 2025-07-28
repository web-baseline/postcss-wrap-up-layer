import { expect, test, describe, vi, Mock } from 'vitest';
import postcss, { type Input } from 'postcss';
import { resolve } from 'node:path';

import plugin, { type PluginOptions } from '~/index';
import { transform } from '~/transform';
import { beforeEach } from 'node:test';
import prettier from 'prettier';

async function format (cssString: string) {
  return prettier.format(cssString, { parser: 'css' });
}

test('Create plugin without rules', () => {
  expect(Object.keys(plugin({ rules: [{}] } as PluginOptions))).toEqual(['postcssPlugin', 'OnceExit']);
  expect(Object.keys(plugin())).toEqual(['postcssPlugin']);
  expect(Object.keys(plugin({ } as PluginOptions))).toEqual(['postcssPlugin']);
  expect(Object.keys(plugin({ rules: [] } as PluginOptions))).toEqual(['postcssPlugin']);
});

vi.mock('~/transform', { spy: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Test rules', async () => {
  const processor = postcss([plugin({
    rules: [
      {
        includes: /^node_modules[\\/]test/,
        layerName: 'modules.test',
      },
      {
        includes: /^src[\\/]pages/,
        layerName: 'my-pages',
      },
      {
        includes: (path) => path.startsWith('packages'),
        layerName: 'my-packages',
      },
      {
        includes: /^src/,
        layerName: 'base',
      },
      {
        // This rule will not take effect because the file has already been processed by the previous rule
        includes: /^src[\\/]unreachable/,
        layerName: 'unreachable',
      },
    ],
  })]);

  test.each([
    { from: resolve('node_modules/test/index.css'), input: 'a { width: 100%; }', output: '@layer modules.test { a { width: 100%; } }' },
    { from: resolve('src/pages/index.css'), input: 'a { width: 100%; }', output: '@layer my-pages { a { width: 100%; } }' },
    { from: resolve('packages/test/index.css'), input: 'a { width: 100%; }', output: '@layer my-packages { a { width: 100%; } }' },
    { from: resolve('src/index.css'), input: 'a { width: 100%; }', output: '@layer base { a { width: 100%; } }' },
    { from: resolve('src/unreachable/index.css'), input: 'a { width: 100%; }', output: '@layer base { a { width: 100%; } }' },
    { from: resolve('node_modules/test/only-comment.css'), input: '/* Comment */', output: '@layer modules.test {/* Comment */}' },
    { from: resolve('node_modules/test/only-comments.css'), input: '/* Comments */\n/* Comments */', output: '@layer modules.test {/* Comments *//* Comments */}' },
    { from: resolve('node_modules/test/void.css'), input: ' ', output: ' ', times: 0 },
  ])('Test (%#)', async ({ from, input, output, times }) => {
    (transform as Mock).mockClear();
    const result = await processor.process(input, { from });
    expect(await format(result.root.toString())).toBe(await format(output));
    expect(transform).toHaveBeenCalledTimes(times ?? 1);
  });
});

describe('Test `ignoreOnlyComments = true`', () => {
  const processor = postcss([plugin({
    rules: [
      {
        includes: /^node_modules\/test/,
        layerName: 'modules.test',
      },
    ],
    ignoreOnlyComments: true,
  })]);
  test.each([
    { from: resolve('node_modules/test/only-comment.css'), input: '/* Comment */', output: '/* Comment */', times: 0 },
  ])('Test (%#)', async ({ from, input, output, times }) => {
    (transform as Mock).mockClear();
    const result = await processor.process(input, { from });
    expect(await format(result.root.toString())).toBe(await format(output));
    expect(transform).toHaveBeenCalledTimes(times ?? 1);
  });
});

describe('Test includes functions', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const includes = vi.fn((file: string, input: Input) => false);
  const processor = postcss([plugin({
    rules: [
      {
        includes: includes,
        layerName: 'modules.test',
      },
    ],
  })]);
  test('Test include -> false', async () => {
    (transform as Mock).mockClear();
    includes.mockClear();
    includes.mockReturnValueOnce(false);
    const result = await processor.process('a { width: 100% }', { from: resolve('src/index.css') });
    expect(await format(result.root.toString())).toBe(await format('a { width: 100% }'));
    expect(includes).toHaveBeenCalledOnce();
    expect(includes.mock.lastCall?.[0]).toBe('src/index.css');
    expect(includes.mock.lastCall?.[1].file).toBe(resolve('src/index.css'));
    expect(includes.mock.lastCall?.[1].from).toBe(resolve('src/index.css'));
  });
  test('Test include -> true', async () => {
    (transform as Mock).mockClear();
    includes.mockClear();
    includes.mockReturnValueOnce(true);
    const result = await processor.process('a { width: 100% }', { from: resolve('src/index.css') });
    expect(await format(result.root.toString())).toBe(await format('@layer modules.test { a { width: 100% } }'));
    expect(includes).toHaveBeenCalledOnce();
    expect(includes.mock.lastCall?.[0]).toBe('src/index.css');
    expect(includes.mock.lastCall?.[1].file).toBe(resolve('src/index.css'));
    expect(includes.mock.lastCall?.[1].from).toBe(resolve('src/index.css'));
  });
});

describe('Test transform options', () => {
  const input = `
    @charset "UTF-8";
    @namespace url("http://www.w3.org/1999/xhtml");
    @import "test.css";
    a { width: 100%; }
  `;

  test('Test transform without outsideAtRules import', async () => {
    const processor = postcss([plugin({
      rules: [
        {
          includes: /^src[\\/]pages/,
          layerName: 'my-pages',
        },
      ],
    })]);
    (transform as Mock).mockClear();
    const result = await processor.process(input, { from: resolve('src/pages/index.css') });
    expect(await format(result.root.toString())).toBe(await format(`
      @charset "UTF-8";
      @namespace url("http://www.w3.org/1999/xhtml");
      @import "test.css" layer(my-pages);
      @layer my-pages { a { width: 100%; } }
    `));
    expect(transform).toHaveBeenCalledOnce();
    expect(transform).toHaveBeenCalledWith(expect.any(Array), 'my-pages', expect.anything(), undefined);
  });
  test('Test transform with outsideAtRules import', async () => {
    const processor = postcss([plugin({
      rules: [
        {
          includes: /^src[\\/]pages/,
          layerName: 'my-pages',
        },
      ],
      transformOptions: {
        outsideAtRules: ['import'],
      },
    })]);
    (transform as Mock).mockClear();
    const result = await processor.process(input, { from: resolve('src/pages/index.css') });
    expect(await format(result.root.toString())).toBe(await format(`
      @charset "UTF-8";
      @namespace url("http://www.w3.org/1999/xhtml");
      @import "test.css";
      @layer my-pages { a { width: 100%; } }
    `));
    expect(transform).toHaveBeenCalledOnce();
    expect(transform).toHaveBeenCalledWith(expect.any(Array), 'my-pages', expect.anything(), { outsideAtRules: ['import'] });
  });
});
