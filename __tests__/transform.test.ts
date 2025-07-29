import { expect, test } from 'vitest';
import postcss from 'postcss';
import prettier from 'prettier';

import { transform, type TransformOptions } from '~/transform.js';

async function format (cssString: string) {
  return prettier.format(cssString, { parser: 'css' });
}

async function run (input: string, layerName: string, options: TransformOptions = {}) {
  const root = postcss.parse(input);
  const nodes = transform(root.nodes, layerName, undefined, options);
  root.nodes = nodes;
  return format(root.toString());
}

test('Test transform normal', async () => {
  await expect(run(`
    a {
      width: 100%;
    }
  `, '')).resolves.toBe(await format(`
    @layer {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    /* Comment */
  `, 'base')).resolves.toBe(await format(`
    @layer base {
      /* Comment */
    }
  `));
});

test('Test transform with @charset or @namespace', async () => {
  await expect(run(`
    @charset "UTF-8";
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @charset "UTF-8";
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    @namespace svg url(http://www.w3.org/2000/svg);
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @namespace svg url(http://www.w3.org/2000/svg);
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    @charset "UTF-8";
    @namespace svg url(http://www.w3.org/2000/svg);
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @charset "UTF-8";
    @namespace svg url(http://www.w3.org/2000/svg);
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    @charset "UTF-8";
    /* Comment */
    @namespace svg url(http://www.w3.org/2000/svg);
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @charset "UTF-8";
    /* Comment */
    @namespace svg url(http://www.w3.org/2000/svg);
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    @charset "UTF-8";
    :root {
      --value: 10;
    }
    @namespace svg url(http://www.w3.org/2000/svg);
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @charset "UTF-8";
    @layer base {
      :root {
        --value: 10;
      }
    }
    @namespace svg url(http://www.w3.org/2000/svg);
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    @charset "UTF-8";
    /* Comment */
    :root {
      --value: 10;
    }
    @namespace svg url(http://www.w3.org/2000/svg);
    a {
      width: 100%;
    }
  `, 'components')).resolves.toBe(await format(`
    @charset "UTF-8";
    @layer components {
      /* Comment */
      :root {
        --value: 10;
      }
    }
    @namespace svg url(http://www.w3.org/2000/svg);
    @layer components {
      a {
        width: 100%;
      }
    }
  `));
});

test('Test transform with @import', async () => {
  await expect(run(`
    @import url('styles.css') layer;
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @import url('styles.css') layer(base);
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    @import url('styles.css') layer(existing);
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @import url('styles.css') layer(base.existing);
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    @import url('styles.css');
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @import url('styles.css') layer(base);
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(`
    @import url('styles.css') layer;
    @charset "UTF-8";
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @import url('styles.css') layer(base);
    @charset "UTF-8";
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
});

test.each([
  'charset',
  'namespace',
  'property',
  'font-face',
  'keyframes',
])('Test transform with outside at-rule %s', async (name) => {
  await expect(run(`
    @${name} "value";
    a {
      width: 100%;
    }
  `, 'base')).resolves.toBe(await format(`
    @${name} "value";
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
});

test('Test transform with outside at-rule', async () => {
  await expect(run(`
    @my-rule 'hello';
    a {
      width: 100%;
    }
  `, 'base', { outsideAtRules: ['my-rule'] })).resolves.toBe(await format(`
    @my-rule 'hello';
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
});

test('Test transform with outside at-rule import', async () => {
  const input = `
    @import url('styles.css');
    a {
      width: 100%;
    }
  `;
  await expect(run(input, 'base', { outsideAtRules: [] })).resolves.toBe(await format(`
    @import url('styles.css') layer(base);
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
  await expect(run(input, 'base', { outsideAtRules: ['import'] })).resolves.toBe(await format(`
    @import url('styles.css');
    @layer base {
      a {
        width: 100%;
      }
    }
  `));
});
