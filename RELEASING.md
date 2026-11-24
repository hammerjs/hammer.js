# Releasing Hammer.js

This guide documents how to cut and publish a release of `hammerjs` from `master` safely.

## Prerequisites

- **Node.js >= 22** (Node 24 is used in CI; required for ESLint and running the headless Chrome QUnit suite via Puppeteer)
- Push access to `hammerjs/hammer.js` on GitHub
- Publish access to [`hammerjs` on npm](https://www.npmjs.com/package/hammerjs) with **2FA enabled** (enforced by npm for high-impact packages)

## SemVer Policy (`2.0.x`)

`hammerjs` has millions of weekly installs running against the `2.0.x` API and ES5 distribution bundle:

- **Patch releases (`2.0.x`)** must be strictly backwards-compatible: no breaking API changes, no behavioral regressions in recognizer semantics, no new runtime `dependencies`, and ES5 output in `hammer.js` / `hammer.min.js`.
- Keep PRs focused on `src/` and `tests/` only, and rebuild the committed distribution files (`hammer.js`, `hammer.min.js`, `hammer.min.js.map`) once during the release step below.

---

## 1. Prepare `master`

Make sure all intended PRs are merged into `master` and the [GitHub Actions CI workflow](https://github.com/hammerjs/hammer.js/actions/workflows/ci.yml) is green on `master`, then sync locally and verify a clean install, lint, and test run:

```bash
git checkout master
git pull origin master
git status # must be clean

rm -rf node_modules
npm install
npm audit  # verify 0 vulnerabilities
npm test   # runs ESLint (grunt lint) and the full QUnit suite in headless Chrome — must report 0 errors/failed
```

---

## 2. Bump the Version **Before** Building

> **Important:** Always bump `package.json` *before* running `npm run build` so `string-replace` and `usebanner` stamp the new version into `Hammer.VERSION` and the file header banner of `hammer.js` / `hammer.min.js`.

1. Update the version in `package.json` without creating a git tag yet (replace `X.Y.Z`, e.g. `2.0.9`):
   ```bash
   npm version X.Y.Z --no-git-tag-version
   ```
2. Add a new `### X.Y.Z, YYYY-MM-DD` section at the top of `CHANGELOG.md` summarizing the changes and linking relevant PRs/commits.
3. *(Optional)* Update version headers in `README.md` or `component.json` if needed.

---

## 3. Build and Verify Release Artifacts

Run the full build (concatenates `src/`, injects `Hammer.VERSION`, minifies + generates sourcemaps, prepends the license banner, runs ESLint via `grunt lint`, and runs the headless Chrome QUnit suite):

```bash
npm run build
```

Verify the generated output before committing:

```bash
# 1. Confirm banner and embedded Hammer.VERSION match X.Y.Z
head -n 6 hammer.js
grep "Hammer.VERSION" hammer.js

# 2. Confirm minified bundle size (~20 KB) and sourceMappingURL footer
ls -lh hammer.js hammer.min.js hammer.min.js.map
tail -c 80 hammer.min.js

# 3. Review the compiled diff against the previous release tag (replace vPREV)
git diff vPREV -- hammer.js

# 4. Inspect the exact file list npm will publish (verify tests/ and dotfiles are excluded)
npm pack --dry-run

# 5. Smoke-test the packed tarball in a temporary directory
npm pack
mkdir -p /tmp/hammer-smoke && tar -xzf hammerjs-X.Y.Z.tgz -C /tmp/hammer-smoke
ls -la /tmp/hammer-smoke/package
rm -rf /tmp/hammer-smoke hammerjs-X.Y.Z.tgz
```

---

## 4. Commit and Tag

```bash
git status
git add package.json CHANGELOG.md hammer.js hammer.min.js hammer.min.js.map
# Include README.md / component.json if updated

git commit -m "X.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin master --follow-tags
```

Wait for the [GitHub Actions CI workflow](https://github.com/hammerjs/hammer.js/actions/workflows/ci.yml) to pass on `master` before publishing to npm.

---

## 5. Publish to npm

1. Verify npm authentication:
   ```bash
   npm whoami
   # If not logged in or session expired:
   npm login
   ```
2. Run a final publish dry run:
   ```bash
   npm publish --dry-run
   ```
3. *(Optional)* To test a prerelease without affecting `latest` installs, publish a release candidate (e.g. `X.Y.Z-rc.1`) under the `next` dist-tag first:
   ```bash
   npm publish --tag next
   ```
4. Publish the release to `latest` (complete the 2FA prompt when requested):
   ```bash
   npm publish
   ```
5. Confirm the live registry metadata:
   ```bash
   npm view hammerjs version dist-tags dist.tarball
   ```

---

## 6. Create the GitHub Release

Open https://github.com/hammerjs/hammer.js/releases/new:

- **Tag:** `vX.Y.Z`
- **Title:** `vX.Y.Z`
- **Description:** Copy the `X.Y.Z` entry from `CHANGELOG.md`.

---

## 7. Emergency Rollback

npm blocks `npm unpublish` for widely depended-on packages. If a published version has a regression, immediately roll back the `latest` dist-tag to the previous known-good version (`PREV`) and deprecate the broken release:

```bash
npm dist-tag add hammerjs@PREV latest
npm deprecate hammerjs@X.Y.Z "Regressed — please use PREV or a newer patch release"
```
