# Moments archive

Chinese `/moments/` uses the approved timeline prototype, with the shared site header and persisted theme. English `/en/moments/` retains its existing renderer.

`core.mjs` renders both the first six static records and the client timeline. Build and browser refresh read every page of the public Moments API before replacing the archive; failures retain `src/data/moments-archive.json`. Cached images retain their original source identity across both normalization passes, so unchanged sources stay locally hosted. New source images remain live URLs until refreshed by the image pipeline.

`interactions.mjs` uses the existing public likes, reactions and comments API. Comments preserve nested replies and in-memory drafts across timeline renders. Pending requests block duplicate clicks. Analytics send coarse interaction metadata only; automatic view counting runs on production hosts.

`public/moments-ui/actor/` contains the H3 projector animation and atlas manifest from the approved prototype. The player stops offscreen, in background tabs, in image dialogs, or under reduced motion; explicit replay and pause remain available. Its poster remains visible when assets fail.

Verification includes the archive unit tests, full site build, and real Chromium screenshots with all write endpoints intercepted. The release evidence is recorded under `.omo/evidence/moments-release-20261003/` in the development workspace.
