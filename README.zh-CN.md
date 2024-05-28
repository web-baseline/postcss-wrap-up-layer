# Wrap up layer (@web-baseline/postcss-wrap-up-layer)

[![License](https://img.shields.io/github/license/web-baseline/postcss-wrap-up-layer)](https://github.com/web-baseline/postcss-wrap-up-layer/blob/main/LICENSE)
[![Typescript](https://img.shields.io/npm/types/@web-baseline/postcss-wrap-up-layer)](https://www.typescriptlang.org/)
[![NPM Download](https://img.shields.io/npm/dw/@web-baseline/postcss-wrap-up-layer)](https://www.npmjs.com/package/@web-baseline/postcss-wrap-up-layer)
[![GitHub star](https://img.shields.io/github/stars/web-baseline/postcss-wrap-up-layer?style=social)](https://github.com/web-baseline/postcss-wrap-up-layer)


_✨ 为 CSS 文件添加级联层 ✨_


[English](./README.md) | **简体中文**


```shell
npm install @web-baseline/postcss-wrap-up-layer
```


## 特性

为 CSS 文件添加 [级联层](https://developer.mozilla.org/docs/Web/CSS/@layer)，通常用于在 Web 开发中处理自动导入的组件库样式。允许通过规则为不同的库添加不同的级联层，方便管理样式优先级。

每个文件仅会按照 **首个匹配的规则** 进行处理，当前一条规则的匹配范围包含后面的规则时，后面的规则将**不会**生效。


### 示例

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

WrapUpLayer({
  rules: [
    {
      /** 这条规则会生效 */
      includes: /^node_modules\/lib-name/,
      layerName: 'lib.lib-name',
    },
    {
      includes: /^node_modules\//,
      layerName: 'lib',
    },
    {
      /** 这条规则不会生效，因为上一条规则的范围包含了这条规则 */
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
/** 输入文件: `node_modules/lib-name/index.css` */
/* <element class="component"> style */
.component {
  height: 4rem;
}

/** 输出: */
@layer lib.lib-name {
  /* <element class="component"> style */
  .component {
    height: 4rem;
  }
}
```

```css
/** 输入文件: `node_modules/other-lib/index.css` */
/* <p> style */
p {
  margin-bottom: 0.2em;
}

/** 输出: */
@layer lib {
  /* <p> style */
  p {
    margin-bottom: 0.2em;
  }
}
```

```css
/** 输入文件: `src/assets/base-normalize.css` */
@layer normalize {
  /* <body> style */
  body {
    margin: 0;
  }
}

/** 输出: */
@layer base {
  @layer normalize {
    /* <body> style */
    body {
      margin: 0;
    }
  }
}
```

## 选项类型

```ts
export type RuleItem = {
  includes: RegExp | ((path: string, input: import('postcss').Input) => boolean);
  layerName: string;
};

export type PluginOptions = {
  rules: RuleItem[];
  /** 如果设置为true，将会忽略仅包含注释的文件 */
  ignoreOnlyComments?: boolean;
};
```
