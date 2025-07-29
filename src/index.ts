import type { PluginCreator } from 'postcss';
import { relative } from 'node:path';
import { cwd } from 'node:process';
import { transform, type TransformOptions } from './transform.js';
import { isFilterRule, isMapRule, type RuleItem } from './utils.js';
export type { RuleItem, FilterRuleItem, MapRuleItem } from './utils.js';

export type PluginOptions = {
  rules: RuleItem[];
  ignoreOnlyComments?: boolean;
  transformOptions?: TransformOptions;
};

const creator: PluginCreator<PluginOptions> = (opts?: PluginOptions) => {
  if (!opts?.rules?.length) {
    return {
      postcssPlugin: 'wrap-up-layer',
    };
  }
  const validRules = opts.rules.filter((rule) => isFilterRule(rule) || isMapRule(rule));
  return {
    postcssPlugin: 'wrap-up-layer',
    OnceExit (root) {
      if (root.nodes.length === 0) {
        return;
      }
      if (opts.ignoreOnlyComments) {
        const nodeWithoutComments = root.nodes.filter((node) => node.type !== 'comment');
        if (nodeWithoutComments.length === 0) {
          return;
        }
      }
      const { source } = root;
      if (source?.input.file) {
        const path = relative(cwd(), source.input.file);
        const nodes = root.nodes;
        for (const rule of validRules) {
          if (isFilterRule(rule)) {
            if (rule.includes instanceof RegExp ? rule.includes.test(path) : rule.includes(path, source.input)) {
              root.nodes = transform(nodes, rule.layerName, root.source, Object.assign({}, opts.transformOptions, rule.transformOptions));
              return;
            }
          } else if (isMapRule(rule)) {
            const mapResult = rule.map(path, source.input);
            if (typeof mapResult === 'string') {
              root.nodes = transform(nodes, mapResult, root.source, Object.assign({}, opts.transformOptions));
              return;
            } else if (typeof mapResult === 'object' && typeof mapResult.layerName === 'string') {
              root.nodes = transform(nodes, mapResult.layerName, root.source, Object.assign({}, opts.transformOptions, mapResult.transformOptions));
              return;
            }
          }
        }
      }
    },
  };
};

creator.postcss = true;

export default creator;
