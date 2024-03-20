# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2024-03-20
### Added
- A new `query()` method for using `query.find()` in `@lumjs/web-core`.
- A new `getOptions()` method for getting a compiled set of options.
### Changed
- The `get()`, `find()`, and `_make()` methods use `getOptions()` now.
- The `get()` and `find()` methods will forward to `query()` if a
  `function` is passed as the query value.
### Fixed
- A few `def()` calls require descriptor object definitions.
  At least two *may* be assigned objects with their own `value` properties.

## [1.0.0] - 2024-03-14
### Added
- Initial release.

[Unreleased]: https://github.com/supernovus/lum.web-core-extra.js/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/supernovus/lum.web-core-extra.js/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/supernovus/lum.web-core-extra.js/releases/tag/v1.0.0

