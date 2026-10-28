# Documentation Apps Script backend

This directory is the canonical source for the Google Apps Script web app used by the Team 5103 documentation site.

The initial `Code.gs` import came from `KadeDr/AppScript` commit `e32f49cc3f26f60ff497aeb6923b4a999b9ae3cc`. The imported `AppScript.txt` file had SHA-256 `d7b2cdb490888a743977c695fbceeee9dabc19555e93c8a118db8fa54119b443`.

The live Apps Script project ID and deployment ID are deployment configuration. CI should create `.clasp.json` from protected environment secrets and deploy an immutable Apps Script version whose description contains the reviewed Git commit.

Do not edit production directly in the Apps Script editor after the repository deployment workflow is enabled.

## Content revisions

Each page stores its integer revision in cell `D1`; each table-of-contents sheet stores its revision in `C1`. Clients must send both revisions back as `expectedPageVersion` and `expectedTocVersion`. Saves run under a script lock, reject stale revisions, write both sheets with RAW input semantics, and restore the prior snapshot if either write fails.
