import { expect, test, describe, vi, type Mock } from 'vitest';
import postcss, { type Input } from 'postcss';
import { resolve } from 'node:path';

import plugin, { type PluginOptions } from '~/index.js';
import { transform } from '~/transform.js';
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

describe.each([
  {
    name: 'Test filter rules',
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
    ] as PluginOptions['rules'],
  },
  {
    name: 'Test map rules',
    rules: [
      {
        map: (path: string) => {
          if (path.startsWith('node_modules/test')) {
            return 'modules.test';
          }
          if (path.startsWith('src/pages')) {
            return 'my-pages';
          }
          if (path.startsWith('packages')) {
            return 'my-packages';
          }
          if (path.startsWith('src')) {
            return 'base';
          }
          return false;
        },
      },
    ] as PluginOptions['rules'],
  },
])('$name', ({ rules }) => {
  const processor = postcss([plugin({ rules })]);
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

  describe('Test transform without outsideAtRules import', async () => {
    const processor = postcss([plugin({
      rules: [
        {
          map: (path: string) => {
            if (path.startsWith('src/views/') || path.startsWith('src\\view\\')) {
              return 'my-views';
            }
            return false;
          },
        },
        {
          includes: /^src[\\/]pages/,
          layerName: 'my-pages',
        },
      ],
    })]);
    test('Test filter rule', async () => {
      (transform as Mock).mockClear();
      const result = await processor.process(input, { from: resolve('src/pages/index.css') });
      expect(await format(result.root.toString())).toBe(await format(`
        @charset "UTF-8";
        @namespace url("http://www.w3.org/1999/xhtml");
        @import "test.css" layer(my-pages);
        @layer my-pages { a { width: 100%; } }
      `));
      expect(transform).toHaveBeenCalledOnce();
      expect(transform).toHaveBeenCalledWith(expect.anything(), 'my-pages', expect.anything(), {});
    });
    test('Test map rule', async () => {
      (transform as Mock).mockClear();
      const result = await processor.process(input, { from: resolve('src/views/index.css') });
      expect(await format(result.root.toString())).toBe(await format(`
        @charset "UTF-8";
        @namespace url("http://www.w3.org/1999/xhtml");
        @import "test.css" layer(my-views);
        @layer my-views { a { width: 100%; } }
      `));
      expect(transform).toHaveBeenCalledOnce();
      expect(transform).toHaveBeenCalledWith(expect.anything(), 'my-views', expect.anything(), {});
    });
  });

  describe('Test transform with common option outsideAtRules import', async () => {
    const processor = postcss([plugin({
      rules: [
        {
          map: (path: string) => {
            if (path.startsWith('src/views/') || path.startsWith('src\\view\\')) {
              return 'my-views';
            }
            return false;
          },
        },
        {
          includes: /^src[\\/]pages/,
          layerName: 'my-pages',
        },
      ],
      transformOptions: {
        outsideAtRules: ['import'],
      },
    })]);
    test('Test filter rule', async () => {
      (transform as Mock).mockClear();
      const result = await processor.process(input, { from: resolve('src/pages/index.css') });
      expect(await format(result.root.toString())).toBe(await format(`
        @charset "UTF-8";
        @namespace url("http://www.w3.org/1999/xhtml");
        @import "test.css";
        @layer my-pages { a { width: 100%; } }
      `));
      expect(transform).toHaveBeenCalledOnce();
      expect(transform).toHaveBeenCalledWith(expect.anything(), 'my-pages', expect.anything(), { outsideAtRules: ['import'] });
    });
    test('Test map rule', async () => {
      (transform as Mock).mockClear();
      const result = await processor.process(input, { from: resolve('src/views/index.css') });
      expect(await format(result.root.toString())).toBe(await format(`
        @charset "UTF-8";
        @namespace url("http://www.w3.org/1999/xhtml");
        @import "test.css";
        @layer my-views { a { width: 100%; } }
      `));
      expect(transform).toHaveBeenCalledOnce();
      expect(transform).toHaveBeenCalledWith(expect.anything(), 'my-views', expect.anything(), { outsideAtRules: ['import'] });
    });
  });

  describe('Test transform with rule option outsideAtRules import', async () => {
    const processor = postcss([plugin({
      rules: [
        {
          map: (path: string) => {
            if (path.startsWith('src/views/') || path.startsWith('src\\view\\')) {
              return { layerName: 'my-views', transformOptions: { outsideAtRules: ['import'] } };
            }
            return false;
          },
        },
        {
          includes: /^src[\\/]pages/,
          layerName: 'my-pages',
          transformOptions: {
            outsideAtRules: ['import'],
          },
        },
      ],
    })]);
    test('Test filter rule', async () => {
      (transform as Mock).mockClear();
      const result = await processor.process(input, { from: resolve('src/pages/index.css') });
      expect(await format(result.root.toString())).toBe(await format(`
        @charset "UTF-8";
        @namespace url("http://www.w3.org/1999/xhtml");
        @import "test.css";
        @layer my-pages { a { width: 100%; } }
      `));
      expect(transform).toHaveBeenCalledOnce();
      expect(transform).toHaveBeenCalledWith(expect.anything(), 'my-pages', expect.anything(), { outsideAtRules: ['import'] });
    });
    test('Test map rule', async () => {
      (transform as Mock).mockClear();
      const result = await processor.process(input, { from: resolve('src/views/index.css') });
      expect(await format(result.root.toString())).toBe(await format(`
        @charset "UTF-8";
        @namespace url("http://www.w3.org/1999/xhtml");
        @import "test.css";
        @layer my-views { a { width: 100%; } }
      `));
      expect(transform).toHaveBeenCalledOnce();
      expect(transform).toHaveBeenCalledWith(expect.anything(), 'my-views', expect.anything(), { outsideAtRules: ['import'] });
    });
  });
});

test('Test unknown rule type', async () => {
  const processor = postcss([plugin({
    rules: [
      {
        includes: /^src[\\/]pages/,
        layerName: 'my-pages',
      },
      {
        map: (path: string) => path.startsWith('src/views/') ? 'my-views' : false,
      },
      {
        // @ts-expect-error - unknown rule type
        unknown: true,
      },
    ],
  })]);
  const result = await processor.process('a { width: 100%; }', { from: resolve('src/pages/index.css') });
  expect(await format(result.root.toString())).toBe(await format('@layer my-pages { a { width: 100%; } }'));
});

test('Test multiple installations of plugins', async () => {
  const processor = postcss([
    plugin({ rules: [
      {
        map: (path: string) => {
          const g = /^node_modules[\\/](?:@([^\\/]+)[\\/])?([^\\/]+)[\\/]/.exec(path);
          return g ? (g[1] ? g[1] : g[2]) : false;
        },
      },
    ] }),
    plugin({ rules: [
      {
        includes: /^node_modules[\\/]/,
        layerName: 'lib',
      },
    ] }),
  ]);
  const input = `
    @import 'common.css';
    a { width: 100%; }
  `;
  const inLibStyle = await processor.process(input, { from: resolve('node_modules/test-lib/index.css') });
  expect(await format(inLibStyle.root.toString())).toBe(await format(`
    @import 'common.css' layer(lib.test-lib);
    @layer lib { @layer test-lib { a { width: 100%; } } }
  `));
  const inScopedStyle = await processor.process(input, { from: resolve('node_modules/@scoped/test-lib/index.css') });
  expect(await format(inScopedStyle.root.toString())).toBe(await format(`
    @import 'common.css' layer(lib.scoped);
    @layer lib { @layer scoped { a { width: 100%; } } }
  `));
  const outLibStyle = await processor.process(input, { from: resolve('node_modules/index.css') });
  expect(await format(outLibStyle.root.toString())).toBe(await format(`
    @import 'common.css' layer(lib);
    @layer lib { a { width: 100%; } }
  `));
});
