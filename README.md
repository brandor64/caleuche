# Caleuche

[![CI](https://github.com/brandor64/caleuche/actions/workflows/ci.yml/badge.svg)](https://github.com/brandor64/caleuche/actions/workflows/ci.yml)
[![Release](https://github.com/brandor64/caleuche/actions/workflows/release.yaml/badge.svg)](https://github.com/brandor64/caleuche/actions/workflows/release.yaml)

## Packages

| Package            | Version                                                         |
| ------------------ | --------------------------------------------------------------- |
| **@caleuche/core** | ![NPM Version](https://img.shields.io/npm/v/%40caleuche%2Fcore) |
| **@caleuche/cli**  | ![NPM Version](https://img.shields.io/npm/v/%40caleuche%2Fcli)  |

## Contributing

### Publishing Changes

After making changes to one or more of the Caleuche packages, you can use `yarn changeset` to version and release your updates.

#### Step-by-Step Release Process

1. **Prepare your changeset**
   
   With your changes finalized and before merging, run the following command from the repository root:
   
   ```bash
   yarn changeset
   ```
   
   > **Note:** If you encounter an error like this:
   > ```console
   > /workspaces/caleuche (brandom/new-feature) $ yarn changeset
   > yarn run v1.22.20
   > $ changeset
   > /bin/sh: 1: changeset: not found
   > error Command failed with exit code 127.
   > ```
   > Make sure you have first run `yarn` to install all dependencies.

2. **Configure your release**
   
   Follow the interactive `changeset` prompts to:
   - Select which packages to include in the release
   - Choose the appropriate version bump (major, minor, or patch) for each package
   - Provide a summary of the changes

3. **Commit the changeset**
   
   The wizard completes by generating a markdown changeset file, commit this to your current pull request.

4. **Complete the release**
   
   Once your PR is merged to the main branch, a GitHub Action will automatically create a new release PR containing:
   - Updated version numbers
   - Generated changelog entries
   - Package publication preparation
   
   Simply review and merge this release PR to publish the new versions to npm.
   
   > **Tip:** Multiple changesets from different PRs can be included in the same release PR, allowing you to batch related changes together.