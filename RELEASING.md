# Releasing Hammer.js

This guide documents how to cut and publish a release of `hammerjs` from `master` safely.

Distribution artifacts (`hammer.js`, `hammer.mjs`, `hammer.min.js`, `hammer.min.js.map`) are **not** committed to git. Instead, publishing a GitHub Release automatically triggers [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds, verifies, attaches the distribution files as GitHub Release assets, and publishes the package to npm with provenance via OIDC Trusted Publishing.

## Prerequisites

- **Node.js >= 22** (Node 24 is used in CI; required for ESLint and running the headless Chrome QUnit suite via Puppeteer)
- Maintain/release access to `hammerjs/hammer.js` on GitHub
- One-time setup of **npm Trusted Publishing (OIDC)** on [`hammerjs` package settings](https://www.npmjs.com/package/hammerjs/access) (no long-lived `NPM_TOKEN` secret required):
  - **Publisher:** GitHub Actions
  - **Organization or user:** `hammerjs`
  - **Repository:** `hammer.js`
  - **Workflow filename:** `release.yml`
  - **Environment name:** *(leave blank)*

## SemVer Policy (`2.x`)

`hammerjs` has millions of weekly installs running against the `2.x` API and UMD/ESM distribution bundles:

- **Minor & patch releases (`2.x`)** must be strictly backwards-compatible: no breaking API changes, no behavioral regressions in recognizer semantics, no new runtime `dependencies`, and ES5 output in `hammer.js`.
- The published npm tarball ships `hammer.js`, `hammer.mjs`, `hammer.min.js`, `hammer.min.js.map`, and `src/` (built automatically via `"prepack": "grunt dist"`).

---

## 1. Prepare `master`

Make sure all intended PRs are merged into `master` and the [GitHub Actions CI workflow](https://github.com/hammerjs/hammer.js/actions/workflows/ci.yml) is green on `master`, then sync locally and verify a clean install, build, lint, and test run:

```bash
git checkout master
git pull origin master
git status # must be clean

rm -rf node_modules
npm install
npm audit      # verify 0 vulnerabilities
npm run build  # builds dist files, runs ESLint, SSR check, and headless Chrome QUnit
npm pack --dry-run
```

---

## 2. Bump Version and Update Changelog

1. Update the version in `package.json` without creating a git tag yet (replace `X.Y.Z`, e.g. `2.0.9`):
   ```bash
   npm version X.Y.Z --no-git-tag-version
   ```
2. Add a new `### X.Y.Z, YYYY-MM-DD` section at the top of `CHANGELOG.md` summarizing the changes and linking relevant PRs/commits.
3. *(Optional)* Update version references in `README.md` if needed.
4. Commit and push to `master` (or merge via a release PR):
   ```bash
   git add package.json CHANGELOG.md
   # Include README.md if updated
   git commit -m "chore(release): vX.Y.Z"
   git push origin master
   ```
5. Wait for the [GitHub Actions CI workflow](https://github.com/hammerjs/hammer.js/actions/workflows/ci.yml) to pass on `master`.

---

## 3. Publish via GitHub Release (Automated)

Open https://github.com/hammerjs/hammer.js/releases/new:

- **Tag:** `vX.Y.Z` (must match `"version"` in `package.json` — the release workflow verifies this and aborts on mismatch)
- **Target:** `master`
- **Title:** `vX.Y.Z`
- **Description:** Copy the `X.Y.Z` entry from `CHANGELOG.md`.
- **Pre-release:** Check **"Set as a pre-release"** (or use a semver prerelease tag like `vX.Y.Z-rc.1`) to publish to the npm `next` dist-tag instead of `latest`.

Click **Publish release**. GitHub Actions ([`release.yml`](.github/workflows/release.yml)) will automatically:

1. Verify `vX.Y.Z` matches `package.json`'s `"version"`.
2. Run `npm install`, `npm audit --audit-level=moderate`, and `npm run build` (build, ESLint, SSR test, headless Chrome QUnit).
3. Verify `hammer.js`, `hammer.mjs`, `hammer.min.js`, `hammer.min.js.map`, embedded `Hammer.VERSION`, and `npm pack --dry-run`.
4. Upload `hammer.js`, `hammer.mjs`, `hammer.min.js`, and `hammer.min.js.map` directly to the GitHub Release as downloadable assets.
5. Publish `hammerjs@X.Y.Z` to npm with `--provenance` via OIDC Trusted Publishing (`latest`, or `next` for prereleases).

Confirm the live release after the workflow finishes:

```bash
npm view hammerjs version dist-tags dist.tarball
```

---

## 4. Manual Publish Fallback

If you ever need to publish manually from a local machine (with npm 2FA):

```bash
npm run build
npm publish --dry-run
npm publish # or: npm publish --tag next
```

---

## 5. Emergency Rollback

npm blocks `npm unpublish` for widely depended-on packages. If a published version has a regression, immediately roll back the `latest` dist-tag to the previous known-good version (`PREV`) and deprecate the broken release:

```bash
npm dist-tag add hammerjs@PREV latest
npm deprecate hammerjs@X.Y.Z "Regressed — please use PREV or a newer patch release"
```
