import { expect, test, vi } from 'vitest';
import postcss, { type Input } from 'postcss';
import { resolve } from 'node:path';
import CssNano from 'cssnano';

import plugin, { type PluginOptions } from '~/index';

test('Create plugin without rules', () => {
  expect(Object.keys(plugin({ rules: [{}] } as PluginOptions))).toEqual(['postcssPlugin', 'OnceExit']);
  expect(Object.keys(plugin())).toEqual(['postcssPlugin']);
  expect(Object.keys(plugin({ } as PluginOptions))).toEqual(['postcssPlugin']);
  expect(Object.keys(plugin({ rules: [] } as PluginOptions))).toEqual(['postcssPlugin']);
});

const nano = postcss([CssNano({ preset: ['cssnano-preset-advanced', { discardComments: false }] })]);

async function format (css: string) {
  return (await nano.process(css, { from: undefined })).css;
}

async function run (processor: postcss.Processor, from: string, input: string, output: string, worked = false) {
  const result = await processor.process(input, { from });
  if (worked) {
    expect(result.root.nodes[0]?.source?.input.from).toBe(from);
  }
  expect(await format(result.css)).toBe(await format(output));
  expect(result.warnings().length).toBe(0);
}

test('Test rules', async () => {
  const processor = postcss([plugin({
    rules: [
      {
        includes: /^node_modules\/test/,
        layerName: 'modules.test',
      },
      {
        includes: /^src\/pages/,
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
        includes: /^src\/unreachable/,
        layerName: 'unreachable',
      },
    ],
  })]);
  await run(processor, resolve('node_modules/test/test.css'), 'a { width: 100% }', '@layer modules.test { a { width: 100% } }', true);
  await run(processor, resolve('node_modules/others/test.css'), 'a { width: 100% }', 'a { width: 100% }');
  await run(processor, resolve('src/pages/index.css'), 'a { width: 100% }', '@layer my-pages { a { width: 100% } }', true);
  await run(processor, resolve('packages/file'), 'a { width: 100% }', '@layer my-packages { a { width: 100% } }', true);
  await run(processor, resolve('packages-file'), 'a { width: 100% }', '@layer my-packages { a { width: 100% } }', true);
  await run(processor, resolve('src/index.css'), 'a { width: 100% }', '@layer base { a { width: 100% } }', true);
  await run(processor, resolve('src/unreachable/index.css'), 'a { width: 100% }', '@layer base { a { width: 100% } }', true);
  await run(processor, resolve('node_modules/test/only-comment.css'), '/* Comment */', '@layer modules.test {/* Comment */}', true);
  await run(processor, resolve('node_modules/test/only-comments.css'), '/* Comments */\n/* Comments */', '@layer modules.test {\n/* Comments *//* Comments */}', true);
  expect((await processor.process(' ', { from: resolve('node_modules/test/void.css') })).css).toBe(' ');
});

test('Test `ignoreOnlyComments = true`', async () => {
  const processor = postcss([plugin({
    rules: [
      {
        includes: /^node_modules\/test/,
        layerName: 'modules.test',
      },
    ],
    ignoreOnlyComments: true,
  })]);
  expect((await processor.process('/* Comment */', { from: resolve('node_modules/test/only-comment.css') })).css).toBe('/* Comment */');
  expect((await processor.process('/* Comments */\n/* Comments */', { from: resolve('node_modules/test/only-comment.css') })).css).toBe('/* Comments */\n/* Comments */');
});

test('Test includes functions', async () => {
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
  await run(processor, resolve('src/index.css'), 'a { width: 100% }', 'a { width: 100% }');
  expect(includes).toHaveBeenCalledOnce();
  expect(includes.mock.lastCall?.[0]).toBe('src/index.css');
  expect(includes.mock.lastCall?.[1].file).toBe(resolve('src/index.css'));
  expect(includes.mock.lastCall?.[1].from).toBe(resolve('src/index.css'));
  includes.mockReturnValueOnce(true);
  includes.mockClear();
  await run(processor, resolve('src/index.css'), 'a { width: 100% }', '@layer modules.test { a { width: 100% } }', true);
  expect(includes).toHaveBeenCalledOnce();
  expect(includes.mock.lastCall?.[0]).toBe('src/index.css');
  expect(includes.mock.lastCall?.[1].file).toBe(resolve('src/index.css'));
  expect(includes.mock.lastCall?.[1].from).toBe(resolve('src/index.css'));
});
