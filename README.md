# `warp-publish-action`

GitHub Action to build and publish TurboWarp extensions using the
[Warp Compiler](https://github.com/warp-ecosystem/warp-compiler) CLI and
[Warp Registry](https://github.com/warp-ecosystem/warp-registry).

## Usage

### Publish on version tag

```yaml
on:
  push:
    tags: ["v*"]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - uses: warp-ecosystem/warp-publish-action@v1
        with:
          token: ${{ secrets.WARP_TOKEN }}
```

### Build check on pull requests

```yaml
on:
  pull_request:
jobs:
  build-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - uses: warp-ecosystem/warp-publish-action@v1
        with:
          dry-run: true
```

## Inputs

| Name                | Required                        | Default                 | Description                                                                                 |
| ------------------- | ------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `token`             | Required unless `dry-run: true` | —                       | Authentication token for the Warp Registry. Pass as `secrets.WARP_TOKEN` — never a literal. |
| `registry-url`      | No                              | `https://warp.sdisk.us` | URL of the Warp Registry instance.                                                          |
| `working-directory` | No                              | `.`                     | Working directory for the compiler (relative to repo root).                                 |
| `compiler-version`  | No                              | `latest`                | npm version or dist-tag for `@warp-ecosystem/warp-compiler`.                                |
| `dry-run`           | No                              | `false`                 | Run `build` instead of `publish`. Useful for PR checks without registry credentials.        |

## Outputs

| Name      | Description                                                               |
| --------- | ------------------------------------------------------------------------- |
| `owner`   | The owner of the published package (e.g. `@example`).                     |
| `id`      | The id of the published package.                                          |
| `version` | The version that was published.                                           |
| `status`  | Publish status: `published` or `pending` (first publish awaiting review). |
| `url`     | URL of the package on the registry.                                       |

## How it works

This action shells out to `warp-compiler`'s CLI via `@actions/exec` — it
does not import the compiler's internal modules. The CLI is invoked as:

```
npx --yes @warp-ecosystem/warp-compiler@<version> <publish|build> --registry <url>
```

On publish, the CLI's stdout is parsed for the known success-line format:

```
✓ Published @owner/id@version
✓ Published @owner/id@version (pending review — this is your first publish)
```

The `url` output is derived from the registry's URL scheme rather than
fetched, avoiding an extra network round-trip.

## Security

- The `token` is masked via `@actions/core.setSecret()` before the CLI
  is invoked, so it is redacted in all log output even if the CLI
  echoes it.
- Use `secrets.WARP_TOKEN` in your workflow — never pass a literal string.

## Development

```bash
npm install
npm test
npm run build
```

### Testing strategy

- **Unit tests** (`tests/unit/`): Parse the known CLI output shapes and
  validate URL construction, including edge cases with dots and hyphens
  in package IDs.
- **Integration tests** (`tests/integration/`): Smoke-test the dry-run
  path against a minimal fixture project.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
