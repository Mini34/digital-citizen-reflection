# Presentation transition and return

## Launch order

1. Review and merge the dedicated-site change. GitHub Pages must use GitHub Actions as its source.
2. Wait for the deployment workflow to finish. Open the public homepage, all four topics, a helper, Evidence, Resources, and Privacy. Download the four materials and scan a presentation QR. Confirm the canonical URL is the dedicated site.
3. Review and merge the separate Signal & Self transition. Its deployment guard checks that the dedicated activity, helper, and downloads are public before publishing the redirect.
4. Verify the portfolio homepage, Evidence, search and sitemap omit the activity. Open its old direct URL and confirm it reaches the dedicated site. Unrelated portfolio pages should still work.

The old URL uses a fixed redirect with a plain fallback link. It forwards no query strings or fragments. Saved reflections remain under the same browser-storage key. New themes and helper drafts do not read portfolio identity or personalization.

## Return only after presentation completion is confirmed

Do not set a date or scheduled retirement. Wait for Mina to confirm that the presentation is finished.

1. Fetch the current default branch of each repository. Make a clean review branch in Signal & Self. Preserve unrelated changes elsewhere.
2. From the dedicated checkout, run:

   ```sh
   python tools/integrate_portfolio.py /path/to/signal-and-self
   ```

   The tool copies the **latest** portable activity, guidance, styles, evidence, downloads and helper tests into the portfolio. It sets `reflection-site.json` to `portfolio` and regenerates the homepage, Evidence, privacy explanation, search and sitemap. It does not publish or retire either site.
3. Review the restoration diff. Add a Resources link to the portfolio activity if future materials have changed. Run the portfolio generator, validation, privacy and interaction checks plus the full reflection and guidance checks. Test legacy saved-draft resume on the same origin.
4. Open a restoration PR. After review, merge and verify the restored public activity, helpers, exports, worksheet and presentation resources. The existing portfolio URL must be functional **before** retirement.
5. In a separate dedicated-site review branch, change only `site.json` mode to `retired`, keeping `returnUrl` equal to the verified portfolio activity URL. Run `python tools/build_site.py`, validation, records tests, and `node tools/qa/retired.mjs` against a preview.
6. Review and merge that retirement PR. The deployment guard checks for the restored form and guided helper first. Packaging excludes the retired site's activity/assets and publishes fixed redirects at all presentation page URLs. The dedicated root remains available, preserving every QR destination.
7. Scan the same presentation QR again. Confirm it reaches the restored portfolio activity. Verify no redirect loop and no forwarded private URL parameters.

## Rollback

If the dedicated deployment fails, leave the portfolio live and fix the dedicated site. If a portfolio restoration fails, keep the dedicated activity live and repair the restoration. If the dedicated redirect points somewhere wrong, revert retirement mode to `presentation` and regenerate in a reviewed change. Never delete the presentation repository or disable Pages while printed QR codes remain in use.

## Current boundaries

No organizer correspondence, booking, Photovoice submission, paid domain, external AI processing, or scheduled retirement is included. Estimated script timing requires a final aloud rehearsal by the presenter.
