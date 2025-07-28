import type { PluginCreator, Input } from 'postcss';
import { relative } from 'node:path';
import { cwd } from 'node:process';
import { transform, TransformOptions } from './transform';

export type RuleItem = {
  includes: RegExp | ((path: string, input: Input) => boolean);
  layerName: string;
};
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
        const rule = opts.rules.find((item) => item.includes instanceof RegExp ? item.includes.test(path) : item.includes(path, source.input));
        if (rule) {
          const nodes = root.nodes;
          root.nodes = transform(nodes, rule.layerName, root.source, opts.transformOptions);
        }
      }
    },
  };
};

creator.postcss = true;

export default creator;
