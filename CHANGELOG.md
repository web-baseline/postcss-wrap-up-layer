# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2025-07-29

### Added

- 新增映射形式的规则定义支持，允许通过函数动态决定层名称
- 新增 `TransformOptions` 接口，支持 `outsideAtRules` 配置选项
- 新增 `FilterRuleItem` 和 `MapRuleItem` 类型定义，提供更灵活的规则配置
- 新增 GitHub Actions 工作流以自动运行测试
- 新增开发容器环境配置
- 新增代码覆盖率徽章到文档
- 新增类型导出测试以确保 TypeScript 类型的正确性

### Changed

- `transform` 函数更新，添加更多不会被包裹的 AtRule 类型
- 更新文档和测试以支持映射规则和转换选项
- TypeScript 配置规范修改，提升代码质量
- 更新依赖版本到最新稳定版本

### Fixed

- 改进对特殊 AtRule 的处理逻辑

## [0.2.0] - 2025-01-14

### Added

- 提供独立的 `transform` 函数，支持在插件外部使用
- 新增对特殊 AtRule 的处理支持（如 `@charset`、`@namespace` 等）
- 新增 `./transform` 导出路径，允许直接导入转换函数

### Changed

- 更新构建配置以支持更好的模块导出
- 改进 package.json 配置，添加更完整的导出定义

## [0.1.0] - 2024-05-28

### Added

- 初始版本发布
- 基础的 PostCSS 插件功能，支持将 CSS 规则包裹在 `@layer` 中
- 支持基于正则表达式或函数的文件路径匹配
- 支持 `ignoreOnlyComments` 选项，可忽略仅包含注释的文件
- 完整的 TypeScript 类型定义
- MIT 许可证
- 基础文档和使用示例

### Infrastructure

- 建立 GitHub 仓库
- 配置 npm 发布流程
- 添加基础的测试框架

---

## Release Notes

### 从 v0.2.0 升级到 v0.3.0

如果你正在使用 v0.2.0，请注意以下变更：

1. **API 扩展**：新增了映射规则功能，现有的过滤规则仍然完全兼容
2. **类型变更**：`RuleItem` 类型现在是 `FilterRuleItem | MapRuleItem` 的联合类型
3. **新功能**：可以使用 `transformOptions` 在规则级别配置转换选项

### 兼容性

- **Node.js**: >= 18.0.0
- **PostCSS**: ^8.4.27

### 贡献

欢迎提交 Issue 和 Pull Request 到我们的 [GitHub 仓库](https://github.com/web-baseline/postcss-wrap-up-layer)。

<!-- 版本比较链接 -->
[Unreleased]: https://github.com/web-baseline/postcss-wrap-up-layer/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/web-baseline/postcss-wrap-up-layer/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/web-baseline/postcss-wrap-up-layer/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/web-baseline/postcss-wrap-up-layer/releases/tag/v0.1.0
