# Changelog

## [3.0.0](https://github.com/zetlen/distill/compare/cli-v2.0.0...cli-v3.0.0) (2026-01-10)


### ⚠ BREAKING CHANGES

* Configuration structure redesigned around signals.

### Code Refactoring

* simplify configuration model with signals ([#25](https://github.com/zetlen/distill/issues/25)) ([6fea41a](https://github.com/zetlen/distill/commit/6fea41a7156ca91e190b7c358dfce75d1ac7b48e))

## [2.0.0](https://github.com/zetlen/distill/compare/cli-v1.1.0...cli-v2.0.0) (2026-01-09)


### ⚠ BREAKING CHANGES

* remove unnecessary topic layer ([#18](https://github.com/zetlen/distill/issues/18))

### Features

* add CLI ergonomics with smart defaults and base command ([#20](https://github.com/zetlen/distill/issues/20)) ([28a44b4](https://github.com/zetlen/distill/commit/28a44b42abbe7084cd0b7b26b80f31430eda68f7))
* add concerns and stakeholders to configuration ([#21](https://github.com/zetlen/distill/issues/21)) ([f4e7fae](https://github.com/zetlen/distill/commit/f4e7fae0b8ac6e5eb3f0afffb074dbff656e327e))


### Code Refactoring

* remove unnecessary topic layer ([#18](https://github.com/zetlen/distill/issues/18)) ([21de299](https://github.com/zetlen/distill/commit/21de2994e286768c5e2f3f34698e2d9c7e4354ee))

## [1.1.0](https://github.com/zetlen/distill/compare/cli-v1.0.2...cli-v1.1.0) (2026-01-06)


### Features

* add JSON reporter to diff:annotate ([#11](https://github.com/zetlen/distill/issues/11)) ([9d56f57](https://github.com/zetlen/distill/commit/9d56f57ddd52ea8b6678585c2c184c9579495432))
* auto-detect PR for current branch in annotate pr command ([74e4855](https://github.com/zetlen/distill/commit/74e4855cf10be8dae66e4262704438172ebe23dd))
* Improved Code Context (Symbolic Context) ([#13](https://github.com/zetlen/distill/issues/13)) ([a65ee0b](https://github.com/zetlen/distill/commit/a65ee0b4b71d3e47cf8f02cbcaadf2bbb68ef379))
* work directly with github PRs ([#15](https://github.com/zetlen/distill/issues/15)) ([74e4855](https://github.com/zetlen/distill/commit/74e4855cf10be8dae66e4262704438172ebe23dd))


### Bug Fixes

* address PR review feedback ([74e4855](https://github.com/zetlen/distill/commit/74e4855cf10be8dae66e4262704438172ebe23dd))

## [1.0.2](https://github.com/zetlen/distill/compare/cli-v1.0.1...cli-v1.0.2) (2026-01-05)


### Bug Fixes

* use multi-stage Docker build for smaller image ([#9](https://github.com/zetlen/distill/issues/9)) ([fd08f77](https://github.com/zetlen/distill/commit/fd08f775aa0e9eed9d789057c2ac0e9f8cc2c3bb))

## [1.0.1](https://github.com/zetlen/distill/compare/cli-v1.0.0...cli-v1.0.1) (2026-01-05)


### Bug Fixes

* add python3 to Docker image for tree-sitter wasm deps ([#7](https://github.com/zetlen/distill/issues/7)) ([13e921f](https://github.com/zetlen/distill/commit/13e921f2f9deeffca976abbf79297f54564ba25c))

## 1.0.0 (2026-01-05)


### Features

* initial release ([75d2707](https://github.com/zetlen/distill/commit/75d270769a4434589cf3c451d2a6fb5de4272378))
