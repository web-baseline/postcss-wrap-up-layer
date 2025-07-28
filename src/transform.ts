import { AtRule, atRule, ChildNode, Source } from 'postcss';

export interface TransformOptions {
  outsideAtRules?: string[];
}

export function transform (nodes: ChildNode[], layerName: string, source?: Source, options: TransformOptions = {}): ChildNode[] {
  const outsideAtRules = [
    'charset',
    'namespace',
    'property',
    'font-face',
    'keyframes',
    ...(options.outsideAtRules || []),
  ];

  const result: ChildNode[] = [];
  let layer: AtRule | null = null;
  const pushToLayer = (node: ChildNode) => {
    if (!layer) {
      layer = atRule({
        name: 'layer',
        params: layerName,
        source,
      });
    }
    layer.append(node);
  };
  const pushToResult = (node: ChildNode) => {
    if (layer) {
      if (layer.nodes?.every((node) => node.type === 'comment')) {
        result.push(...layer.nodes);
      } else {
        result.push(layer);
      }
      layer = null;
    }
    result.push(node);
  };

  [...nodes].forEach((node) => {
    if (node.type === 'atrule') {
      if (outsideAtRules.includes(node.name)) {
        pushToResult(node);
        return;
      }
      if (node.name === 'import') {
        if (layerName.trim()) {
          const sourceLayer = node.params.match(/\s+layer\s*\(([^)]+)\)/);
          if (sourceLayer && sourceLayer[1].trim()) {
            node.params = node.params.replace(/\s+layer\s*\(([^)]+)\)/, ` layer(${layerName}.${sourceLayer[1].trim()})`);
          } else {
            node.params = node.params.replace(/\s+layer/, '') + ` layer(${layerName})`;
          }
        }
        pushToResult(node);
        return;
      }
    }
    pushToLayer(node);
  });
  if (layer) {
    result.push(layer);
  }
  return result;
}
