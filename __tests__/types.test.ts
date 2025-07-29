import { expectTypeOf, test, describe } from 'vitest';
import type { Input, ChildNode, Source } from 'postcss';
import plugin, {
  type PluginOptions,
  type RuleItem,
  type FilterRuleItem,
  type MapRuleItem,
} from '~/index.js';
import { transform, type TransformOptions } from '~/transform.js';
import {
  isFilterRule,
  isMapRule,
} from '~/utils.js';

describe('Type exports tests', () => {
  test('PluginOptions type should be correct', () => {
    expectTypeOf<PluginOptions>().toEqualTypeOf<{
      rules: RuleItem[];
      ignoreOnlyComments?: boolean;
      transformOptions?: TransformOptions;
    }>();
  });

  test('RuleItem type should be a union of FilterRuleItem and MapRuleItem', () => {
    expectTypeOf<RuleItem>().toEqualTypeOf<FilterRuleItem | MapRuleItem>();
  });

  test('FilterRuleItem type should be correct', () => {
    expectTypeOf<FilterRuleItem>().toEqualTypeOf<{
      includes: RegExp | ((path: string, input: Input) => boolean);
      layerName: string;
      transformOptions?: TransformOptions;
    }>();
  });

  test('MapRuleItem type should be correct', () => {
    expectTypeOf<MapRuleItem>().toEqualTypeOf<{
      map: (path: string, input: Input) => string | boolean | { layerName: string; transformOptions?: TransformOptions };
    }>();
  });

  test('TransformOptions type should be correct', () => {
    expectTypeOf<TransformOptions>().toEqualTypeOf<{
      outsideAtRules?: string[];
    }>();
  });

  test('Plugin function should accept correct options type', () => {
    expectTypeOf(plugin).toBeFunction();
    expectTypeOf(plugin).parameter(0).toEqualTypeOf<PluginOptions | undefined>();
  });

  test('Transform function should have correct signature', () => {
    expectTypeOf(transform).toBeFunction();
    expectTypeOf(transform).parameter(0).toExtend<ChildNode[]>();
    expectTypeOf(transform).parameter(1).toEqualTypeOf<string>();
    expectTypeOf(transform).parameter(2).toExtend<Source | undefined>();
    expectTypeOf(transform).parameter(3).toEqualTypeOf<TransformOptions | undefined>();
  });

  test('Type guard functions should have correct signatures', () => {
    expectTypeOf(isFilterRule).toBeFunction();
    expectTypeOf(isFilterRule).parameter(0).toEqualTypeOf<RuleItem>();
    expectTypeOf(isFilterRule).returns.toEqualTypeOf<boolean>();

    expectTypeOf(isMapRule).toBeFunction();
    expectTypeOf(isMapRule).parameter(0).toEqualTypeOf<RuleItem>();
    expectTypeOf(isMapRule).returns.toEqualTypeOf<boolean>();
  });
});

describe('Plugin configuration type tests', () => {
  test('PluginOptions with all properties should be valid', () => {
    const options = {
      rules: [
        {
          includes: /^src[\\/]/,
          layerName: 'base',
        },
        {
          map: (path: string) => path.startsWith('lib/') ? 'lib' : false,
        },
      ],
      ignoreOnlyComments: true,
      transformOptions: {
        outsideAtRules: ['import', 'charset'],
      },
    };
    expectTypeOf(options).toExtend<PluginOptions>();
  });
});
