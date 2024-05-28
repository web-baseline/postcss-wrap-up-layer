import type { PluginCreator, Input } from 'postcss';
import { relative } from 'node:path';
import { cwd } from 'node:process';

export type RuleItem = {
  includes: RegExp | ((path: string, input: Input) => boolean);
  layerName: string;
};
export type PluginOptions = {
  rules: RuleItem[];
  ignoreOnlyComments?: boolean;
};

const creator: PluginCreator<PluginOptions> = (opts?: PluginOptions) => {
  if (!opts?.rules?.length) {
    return {
      postcssPlugin: 'wrap-up-layer',
    };
  }
  return {
    postcssPlugin: 'wrap-up-layer',
    OnceExit (root, { atRule }) {
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
          root.nodes = [];
          const layer = atRule({
            name: 'layer',
            params: rule.layerName,
            nodes: nodes,
            source: root.source,
          });
          root.append(layer);
        }
      }
    },
  };
};

creator.postcss = true;

export default creator;
