import { Input } from 'postcss';
import { TransformOptions } from './transform';

export interface FilterRuleItem {
  includes: RegExp | ((path: string, input: Input) => boolean);
  layerName: string;
  transformOptions?: TransformOptions;
}

export interface MapRuleItem {
  map: (path: string, input: Input) => string | boolean | { layerName: string; transformOptions?: TransformOptions };
}

export type RuleItem = FilterRuleItem | MapRuleItem;

export function isFilterRule (rule: RuleItem): rule is FilterRuleItem {
  return 'includes' in rule && (rule.includes instanceof RegExp || typeof rule.includes === 'function');
}

export function isMapRule (rule: RuleItem): rule is MapRuleItem {
  return 'map' in rule && typeof rule.map === 'function';
}
