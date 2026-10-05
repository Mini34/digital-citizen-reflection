# Digital Citizen Reflection

A static presentation website at **https://mini34.github.io/digital-citizen-reflection/**. The homepage combines an introduction with a four-step reflection. Evidence, resources, and privacy have dedicated pages. Every example is fictional.

## Local preview

Use Python 3.12+:

```sh
python tools/build_site.py
python tools/serve_site.py --port 8001
```

Open http://127.0.0.1:8001/digital-citizen-reflection/. The server also supports the root URL. No application server, sign-in, API key, or external AI service is required.

## Authoring and checks

`activity/` is the portable activity package: structured evidence and fictional examples, HTML renderer, browser logic, prepared guidance, and helper styles. `assets/styles/` retains the portfolio fonts, palette, and three themes. Update source files and regenerate committed HTML with `python tools/build_site.py`; `--check` rejects drift.

```sh
python tools/validate_site.py
python tools/qa/records_test.py
pnpm --dir tools/qa install --frozen-lockfile
pnpm --dir tools/qa exec playwright install chromium
QA_BROWSER=chromium node tools/qa/reflection.mjs
QA_BROWSER=chromium node tools/qa/guidance.mjs
QA_BROWSER=chromium node tools/qa/site.mjs
QA_BROWSER=chromium node tools/qa/accessibility.mjs
```

On Windows, set `QA_BROWSER` using your shell environment syntax. Local checks otherwise use installed Chrome. The workflow uses Chromium. Playwright and axe are development tools and are excluded from the Pages package.

## Privacy

The form and prepared helper run entirely in the browser. Reflection content never enters a URL, network request, identity state, or analytics. Unfinished helper answers remain temporary. Explicitly accepted text follows the form's opt-in saving controls.

Compatible saved reflections retain `signal-and-self-reflection-v1`, since the two GitHub project sites share an origin. Theme and reading choices use separate project keys. No other portfolio storage is read. This shared origin is not isolation against other same-origin scripts; device drafts are for convenience and should not contain sensitive information.

## Interface and accessibility

Every page has Accessibility options for text size, text spacing, stronger contrast, and reduced motion. These viewing choices are remembered separately from opt-in reflection drafts; Reset reading options removes only the reading key. System reduced motion and forced colors are respected, and controls remain usable when browser storage is blocked.

The activity provides keyboard navigation, a text label for the current step, associated field hints and errors, and Escape to close requested help. Saving does not repeat identical status announcements on every keystroke. The time comparison has an equivalent text calculation. The Resources QR has descriptive alt text and the same destination as a normal link. The static worksheet is a non-submitting form landmark, so JavaScript-disabled keyboard entries cannot enter a URL. The Accessibility page explains these controls and the paper/plain-text alternatives.

## Presentation and publishing

The Resources page includes an editable ten-slide PowerPoint, slide PDF, presenter guide with ten-minute and five-minute scripts, and a one-page worksheet. QR codes point to the dedicated homepage. Source notes and screenshot fallback are embedded in the deck. Accessible web scripts are generated from `docs/presentation/speaker-scripts.json`.

Review the dedicated-site pull request first. Enable GitHub Pages with **GitHub Actions** as the source. Merging `main` runs validation before deployment. Verify the public site, downloads, and QR destination before merging the Signal & Self transition. Its deployment guard refuses to hide the original activity while the dedicated destination is unavailable.

See [the transition and return procedure](docs/RETURN_TO_PORTFOLIO.md). The site has no automatic retirement date.
