# Changelog

## `1.5.3`

### Fixed

- Do remove square and curly brackets special characters from filename of uploaded files

## `1.5.2`

### Fixed

- Do not remove period when removing special characters with slugify

## `1.5.1`

### Fixed

- Remove special characters for filenames when running slugify

## `1.5.0`

### Fixed

- Correctly handle nullish case for mimeType

### Changed

- Allow passing function to `filenameFromProperty` option

## `1.4.1`

### Fixed

- Only return `mime` in `getRawFile`
- Use deep object key lookup for sorting

## `1.4.0`

### Changed

- Querying for `raw` data in preview to allow retrieving files above 1MB size from the repo using the API

## `0.0.1`

Initial version
