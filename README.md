# Wrap up layer (@web-baseline/postcss-wrap-up-layer)

[![License](https://img.shields.io/github/license/web-baseline/postcss-wrap-up-layer)](https://github.com/web-baseline/postcss-wrap-up-layer/blob/main/LICENSE)
[![Typescript](https://img.shields.io/npm/types/@web-baseline/postcss-wrap-up-layer)](https://www.typescriptlang.org/)
[![NPM Download](https://img.shields.io/npm/dw/@web-baseline/postcss-wrap-up-layer)](https://www.npmjs.com/package/@web-baseline/postcss-wrap-up-layer)
[![GitHub star](https://img.shields.io/github/stars/web-baseline/postcss-wrap-up-layer?style=social)](https://github.com/web-baseline/postcss-wrap-up-layer)


_✨ Add cascading layers to CSS files ✨_


**English** | [简体中文](./README.zh-CN.md)


```shell
npm install @web-baseline/postcss-wrap-up-layer
```


## Features

Adding [cascading layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) to CSS files is typically used in web development to handle automatically imported component library styles. Allow adding different cascading layers to different libraries through rules to facilitate style priority management.


Each file will only be processed according to **the first matching rule**. When the matching range of the current rule includes subsequent rules, the latter rules will **not** take effect.


### Example

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

WrapUpLayer({
  rules: [
    {
      /** This rule will take effect */
      includes: /^node_modules\/lib-name/,
      layerName: 'lib.lib-name',
    },
    {
      includes: /^node_modules\//,
      layerName: 'lib',
    },
    {
      /** This rule will not take effect because the scope of the previous rule includes this rule */
      includes: /^node_modules\/other-lib/,
      layerName: 'lib.other-lib',
    },
    {
      includes: (file) => file.startsWith('src/assets/base'),
      layerName: 'base',
    },
  ],
});
```

```css
/** Input file: `node_modules/lib-name/index.css` */
/* <element class="component"> style */
.component {
  height: 4rem;
}

/** Output: */
@layer lib.lib-name {
  /* <element class="component"> style */
  .component {
    height: 4rem;
  }
}
```

```css
/** Input file: `node_modules/other-lib/index.css` */
/* <p> style */
p {
  margin-bottom: 0.2em;
}

/** Output: */
@layer lib {
  /* <p> style */
  p {
    margin-bottom: 0.2em;
  }
}
```

```css
/** Input file: `src/assets/base-normalize.css` */
@layer normalize {
  /* <body> style */
  body {
    margin: 0;
  }
}

/** Output: */
@layer base {
  @layer normalize {
    /* <body> style */
    body {
      margin: 0;
    }
  }
}
```

## Options Type

```ts
export type RuleItem = {
  includes: RegExp | ((path: string, input: import('postcss').Input) => boolean);
  layerName: string;
};

export type PluginOptions = {
  rules: RuleItem[];
  /** If set to true, files containing only comments will be ignored */
  ignoreOnlyComments?: boolean;
};
```
