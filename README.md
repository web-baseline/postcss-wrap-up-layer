# Wrap up layer (@web-baseline/postcss-wrap-up-layer)

[![License](https://img.shields.io/github/license/web-baseline/postcss-wrap-up-layer)](https://github.com/web-baseline/postcss-wrap-up-layer/blob/main/LICENSE)
[![Typescript](https://img.shields.io/npm/types/@web-baseline/postcss-wrap-up-layer)](https://www.typescriptlang.org/)
[![codecov](https://codecov.io/gh/web-baseline/postcss-wrap-up-layer/branch/main/badge.svg)](https://codecov.io/gh/web-baseline/postcss-wrap-up-layer)
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

#### Using Filter Rules

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

#### Using Map Rules

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

WrapUpLayer({
  rules: [
    {
      map: (path, input) => {
        // Dynamically determine layer name
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
        // Return false to skip processing this file
        return false;
      },
    },
  ],
});
```

#### Using Transform Options

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

WrapUpLayer({
  rules: [
    {
      includes: /^node_modules\//,
      layerName: 'lib',
      // Rule-level transform options
      transformOptions: {
        outsideAtRules: ['import'], // @import rules will stay outside @layer
      },
    },
  ],
  // Global transform options
  transformOptions: {
    outsideAtRules: ['charset', 'namespace'], // These are included by default
  },
});
```

#### Map Rules Returning Objects

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
              outsideAtRules: ['import'], // Configure transform options for specific files
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

#### Transform Options Examples

The plugin has special handling logic for `@import` rules:

1. **When `@import` is in `outsideAtRules`**: `@import` rules stay outside `@layer` without any modification
2. **When `@import` is not in `outsideAtRules`**: The plugin will attempt to add `layer()` function to `@import` rules
3. **When `@import` already has `layer()` function**: The plugin will wrap the existing layer name as a sub-layer under the current rule's layer name (e.g., `layer(base)` becomes `layer(pages.base)`)

```css
/** Input file: `src/pages/index.css` (configured with outsideAtRules: ['import']) */
@import "common.css";
.page {
  padding: 1rem;
}

/** Output: */
@import "common.css";
@layer pages {
  .page {
    padding: 1rem;
  }
}
```

```css
/** Input file: `src/pages/about.css` (default @import handling) */
@import "reset.css";
.about {
  margin: 0;
}

/** Output: */
@import "reset.css" layer(pages);
@layer pages {
  .about {
    margin: 0;
  }
}
```

```css
/** Input file: `src/pages/contact.css` (existing layer function) */
@import "base.css" layer(base);
.contact {
  background: white;
}

/** Output: */
@import "base.css" layer(pages.base);
@layer pages {
  .contact {
    background: white;
  }
}
```

## Options Type

```ts
// Filter rule: Match files based on path
export interface FilterRuleItem {
  includes: RegExp | ((path: string, input: import('postcss').Input) => boolean);
  layerName: string;
  transformOptions?: TransformOptions;
}

// Map rule: Dynamically generate layer names
export interface MapRuleItem {
  map: (path: string, input: import('postcss').Input) =>
    string | boolean | { layerName: string; transformOptions?: TransformOptions };
}

export type RuleItem = FilterRuleItem | MapRuleItem;

export interface TransformOptions {
  /** Specify which @rules should stay outside @layer */
  outsideAtRules?: string[];
}

export type PluginOptions = {
  rules: RuleItem[];
  /** If set to true, files containing only comments will be ignored */
  ignoreOnlyComments?: boolean;
  /** Global transform options */
  transformOptions?: TransformOptions;
};
```

### Rule Types Explanation

- **Filter Rule (FilterRuleItem)**: Uses the `includes` property to match file paths, applying the specified `layerName` when matched
- **Map Rule (MapRuleItem)**: Uses the `map` function to dynamically determine layer names, can return:
  - `string`: Layer name
  - `boolean`: `false` means skip processing this file
  - `object`: Contains `layerName` and optional `transformOptions`

### Transform Options Explanation

`transformOptions` can be configured at:
1. **Global level**: In `PluginOptions.transformOptions`
2. **Rule level**: In `FilterRuleItem.transformOptions`
3. **Map return**: In the object returned by `MapRuleItem.map`

**Option Priority and Merging Rules:**
- Rule-level options have higher priority than global options
- Only first-level option objects are automatically merged, nested arrays or objects will not be automatically merged
  - `outsideAtRules` arrays will not be merged, rule-level configuration will completely replace global configuration
- If nested processing is needed (such as merging arrays), it can be achieved by creating the plugin multiple times

#### Nested Processing Example

```ts
import WrapUpLayer from '@web-baseline/postcss-wrap-up-layer';

// First plugin instance
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

// Second plugin instance: Add lib layer for entire node_modules
const globalPlugin = WrapUpLayer({
  rules: [
    {
      includes: /^node_modules\//,
      layerName: 'lib',
    },
  ],
});

// Use multiple plugin instances in PostCSS configuration
export default {
  plugins: [
    specificPlugin,
    globalPlugin,
  ],
};
```


```css
/** Input file content */
@import 'common.css';
a { width: 100%; }

/** When file is `node_modules/test-lib/index.css`, output: */
@import 'common.css' layer(lib.test-lib);
@layer lib { @layer test-lib { a { width: 100%; } } }

/** When file is `node_modules/@scoped/test-lib/index.css`, output: */
@import 'common.css' layer(lib.scoped);
@layer lib { @layer scoped { a { width: 100%; } } }

/** When file is `node_modules/index.css`, output: */
@import 'common.css' layer(lib);
@layer lib { a { width: 100%; } }
```

#### Default outsideAtRules

By default, the following @rules will stay outside @layer:
- `charset`
- `namespace`
- `property`
- `font-face`
- `keyframes`

You can add more rules (like `import`) through `transformOptions.outsideAtRules`.
