[![CI](https://github.com/brandor64/caleuche/actions/workflows/ci.yml/badge.svg)](https://github.com/brandor64/caleuche/actions/workflows/ci.yml)
[![Release](https://github.com/brandor64/caleuche/actions/workflows/release.yaml/badge.svg)](https://github.com/brandor64/caleuche/actions/workflows/release.yaml)

| Package            | Version                                                         |
| ------------------ | --------------------------------------------------------------- |
| **@caleuche/core** | ![NPM Version](https://img.shields.io/npm/v/%40caleuche%2Fcore) |
| **@caleuche/cli**  | ![NPM Version](https://img.shields.io/npm/v/%40caleuche%2Fcli)  |

# Contributing

## Publishing changes
After making changes to one or more of the Caleuche projects, you can use `yarn changeset` to bump and release a new version of the package(s).

1. With your changes finalzed, before merging, run `yarn changeset` from the repo root.
- if you get an error like 
```console
/workspaces/caleuche (brandom/new-feature) $ yarn changeset
yarn run v1.22.20
$ changeset
/bin/sh: 1: changeset: not found
error Command failed with exit code 127.
```
make sure you have first run `yarn` to install dependencies

2. Follow the `changeset` prompts to select which packages to include, which versions to bump (major, minor, patch) for each, and a summary of the changes.

3. Commit the generated markdown file to your current PR.

4. Once your PR is merged, a GitHub Action will create another PR for the release.
- With all of your changes are in, you just complete this new PR (you can have many PR with md files go to the same release)