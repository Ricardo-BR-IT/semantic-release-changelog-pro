# Automated Semantic Release Notes & Changelog Pro

> **Category:** Release Engineering | **Pricing:** $19/mo per organization | **Vendor:** Ricardo Vieira Forge Cloud

## Why Use This Action?

Teams waste hours manually curating release notes from messy commit histories or struggle with brittle multi-plugin semantic-release configs.

**Competitive Edge:** Zero-dependency single-step action that parses Conventional Commits, computes SemVer bump, writes CHANGELOG.md, and renders executive Step Summary.

## Quick Start (Copy-Paste Workflow)

```yaml
name: Semantic Release Notes Pro
on:
  push:
    branches: [main]

jobs:
  release-notes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 50
      - name: Generate Semantic Release Notes
        uses: ricardovieiraforge/semantic-release-changelog-pro@v1
        with:
          current-version: '1.4.0'
          write-changelog: 'true'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `current-version` | Current SemVer version (e.g. 1.2.0) | `False` | `1.0.0` |
| `changelog-file` | Path to CHANGELOG.md | `False` | `CHANGELOG.md` |
| `commits-json` | Optional JSON array of commit messages (falls back to git log) | `False` | `` |
| `write-changelog` | Whether to prepend release notes to CHANGELOG.md | `False` | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `next-version` | Computed next SemVer version |
| `release-type` | major, minor, patch, or none |
| `commit-count` | Number of parsed conventional commits |

## Local Verification

```bash
node --check src/index.js
node src/index.js --self-test
```

## License

MIT — Built by Ricardo Vieira Forge Cloud (souza@usa.com).
