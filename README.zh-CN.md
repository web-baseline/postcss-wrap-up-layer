# Wrap up layer (@web-baseline/postcss-wrap-up-layer)

[![License](https://img.shields.io/github/license/web-baseline/postcss-wrap-up-layer)](https://github.com/web-baseline/postcss-wrap-up-layer/blob/main/LICENSE)
[![Typescript](https://img.shields.io/npm/types/@web-baseline/postcss-wrap-up-layer)](https://www.typescriptlang.org/)
[![codecov](https://codecov.io/gh/web-baseline/postcss-wrap-up-layer/branch/main/badge.svg)](https://codecov.io/gh/web-baseline/postcss-wrap-up-layer)
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

#### 使用过滤规则 (Filter Rules)

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

#### 使用映射规则 (Map Rules)

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

WrapUpLayer({
  rules: [
    {
      map: (path, input) => {
        // 动态决定层名
        if (path.startsWith('node_modules/')) {
          const match = path.match(/node_modules\/([^\/]+)/);
          return match ? `lib.${match[1]}` : 'lib';
        }
        if (path.startsWith('src/components/')) {
          return 'components';
        }
        if (path.startsWith('src/')) {
          return 'app';
        }
        // 返回 false 表示不处理此文件
        return false;
      },
    },
  ],
});
```

#### 使用转换选项 (Transform Options)

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

WrapUpLayer({
  rules: [
    {
      includes: /^node_modules\//,
      layerName: 'lib',
      // 规则级别的转换选项
      transformOptions: {
        outsideAtRules: ['import'], // @import 规则将保持在 @layer 外面
      },
    },
  ],
  // 全局转换选项
  transformOptions: {
    outsideAtRules: ['charset', 'namespace'], // 默认已包含这些
  },
});
```

#### 映射规则返回对象

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

WrapUpLayer({
  rules: [
    {
      map: (path, input) => {
        if (path.startsWith('src/pages/')) {
          return {
            layerName: 'pages',
            transformOptions: {
              outsideAtRules: ['import'], // 为特定文件配置转换选项
            },
          };
        }
        return false;
      },
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

#### 转换选项示例输出

插件对 `@import` 规则有特殊的处理逻辑：

1. **当 `@import` 在 `outsideAtRules` 中时**：`@import` 规则保持在 `@layer` 外面，不做任何修改
2. **当 `@import` 不在 `outsideAtRules` 中时**：插件会尝试为 `@import` 规则添加 `layer()` 函数
3. **当 `@import` 已存在 `layer()` 函数时**：插件会将现有的层名作为子层，包装在当前规则的层名下（如 `layer(base)` 变为 `layer(pages.base)`）

```css
/** 输入文件: `src/pages/index.css` (配置了 outsideAtRules: ['import']) */
@import "common.css";
.page {
  padding: 1rem;
}

/** 输出: */
@import "common.css";
@layer pages {
  .page {
    padding: 1rem;
  }
}
```

```css
/** 输入文件: `src/pages/about.css` (默认处理 @import) */
@import "reset.css";
.about {
  margin: 0;
}

/** 输出: */
@import "reset.css" layer(pages);
@layer pages {
  .about {
    margin: 0;
  }
}
```

```css
/** 输入文件: `src/pages/contact.css` (已存在 layer 函数) */
@import "base.css" layer(base);
.contact {
  background: white;
}

/** 输出: */
@import "base.css" layer(pages.base);
@layer pages {
  .contact {
    background: white;
  }
}
```

## 选项类型

```ts
// 过滤规则：基于文件路径匹配
export interface FilterRuleItem {
  includes: RegExp | ((path: string, input: import('postcss').Input) => boolean);
  layerName: string;
  transformOptions?: TransformOptions;
}

// 映射规则：动态生成层名
export interface MapRuleItem {
  map: (path: string, input: import('postcss').Input) =>
    string | boolean | { layerName: string; transformOptions?: TransformOptions };
}

export type RuleItem = FilterRuleItem | MapRuleItem;

export interface TransformOptions {
  /** 指定哪些 @规则 应该保持在 @layer 外面 */
  outsideAtRules?: string[];
}

export type PluginOptions = {
  rules: RuleItem[];
  /** 如果设置为true，将会忽略仅包含注释的文件 */
  ignoreOnlyComments?: boolean;
  /** 全局转换选项 */
  transformOptions?: TransformOptions;
};
```

### 规则类型说明

- **过滤规则 (FilterRuleItem)**: 使用 `includes` 属性来匹配文件路径，匹配成功则应用指定的 `layerName`
- **映射规则 (MapRuleItem)**: 使用 `map` 函数动态决定层名，可以返回：
  - `string`: 层名
  - `boolean`: `false` 表示不处理该文件
  - `object`: 包含 `layerName` 和可选的 `transformOptions`

### 转换选项说明

`transformOptions` 可以在以下地方配置：
1. **全局级别**: 在 `PluginOptions.transformOptions` 中
2. **规则级别**: 在 `FilterRuleItem.transformOptions` 中
3. **映射返回**: 在 `MapRuleItem.map` 返回的对象中

**选项优先级与合并规则：**
- 规则级别的选项优先级高于全局选项
- 仅自动合并第一层选项对象，嵌套的数组或对象不会自动合并
  - `outsideAtRules` 数组不会合并，规则级别的配置将完全替换全局配置
- 如果需要嵌套处理（如合并数组），可以通过多次创建插件来实现

#### 嵌套处理示例

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

// 第一个处理插件实例
const specificPlugin = WrapUpLayer({
  rules: [
    {
      map: (path: string) => {
        const g = /^node_modules[\\/](?:@([^\\/]+)[\\/])?([^\\/]+)[\\/]/.exec(path);
        return g ? (g[1] ? g[1] : g[2]) : false;
      },
    },
  ],
});

// 第二个处理插件实例：为整个 node_modules 添加 lib 层
const globalPlugin = WrapUpLayer({
  rules: [
    {
      includes: /^node_modules\//,
      layerName: 'lib',
    },
  ],
});

// 在 PostCSS 配置中使用多个插件实例
export default {
  plugins: [
    specificPlugin,
    globalPlugin,
  ],
};
```


```css
/** 输入文件内容 */
@import 'common.css';
a { width: 100%; }

/** 当文件为 `node_modules/test-lib/index.css` 时，输出： */
@import 'common.css' layer(lib.test-lib);
@layer lib { @layer test-lib { a { width: 100%; } } }

/** 当文件为 `node_modules/@scoped/test-lib/index.css` 时，输出： */
@import 'common.css' layer(lib.scoped);
@layer lib { @layer scoped { a { width: 100%; } } }

/** 当文件为 `node_modules/index.css` 时，输出： */
@import 'common.css' layer(lib);
@layer lib { a { width: 100%; } }
```


#### 默认的 outsideAtRules

默认情况下，以下 @规则 会保持在 @layer 外面：
- `charset`
- `namespace`
- `property`
- `font-face`
- `keyframes`

可以通过 `transformOptions.outsideAtRules` 添加更多规则（如 `import`）。
