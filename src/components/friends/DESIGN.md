# Friends theme and analytics repair

Preserve the approved five-tree pixel forest, all H3 clips, normalized animal portraits, six paper variants, typography, spacing, short vertical ropes and guestbook behavior. This repairs theme inheritance, without changing the scene or reading layout.

The existing `data-mode` attribute and `blog-mode` / `blog-mode-set` preference own the theme. Keep the existing site switcher visible. Set the page background before paint through CSS, without a runtime theme reset. Light mode retains #f7f8f0, #fffef8, #303b2c, #626d58, #dce1d1, #55714b and #e9eddc.

Dark tokens: background #0d1117 (same as the blog); paper #161e23; ink #e6edf3; muted #a7b2b6; rule #354149; sage #a8c496; wash #23322c; wood #c5a481; cream #35412c; gold #dab874. Paper/edge pairs: leaf #1c2923/#465c4e, linen #242927/#505953, cream #2c2b23/#655f48, mist #1b2830/#425965, blossom #2d252a/#65505a, kraft #302a22/#75644d. Fibers #d6c5a00a; sheen #ffffff08. Portrait wash uses the shared wash. Inputs, ruled textareas, search/dialogs, success/error and selected/hover states use these tokens; light artwork remains warm and colorful, with tree brightness .72/saturation .78 and bear brightness .86 in dark mode. No additional animation, image or font request.

States to verify at 375/768/1280: stored dark preference on initial entry, light entry, live toggle and reload, six selected papers, search/archive dialog, avatar options, guestbook preview, keyboard focus and reduced/normal H3 playback. Reading text contrast >=4.5:1; large titles >=3:1. Original covers/portraits are artwork, not body text.

Analytics records page view, tree/bell/directory interactions, search result counts, wind/bear/pause, avatar category, preview, reply, comment page, submission attempt/success/error and outbound visits. Preserve the existing `friend-link` and `friend-registration-submit` names. Queue until Umami is ready. Never include search text, drafted names/messages, email, custom avatar URLs or submitted website addresses. Existing global third-party performance debt is outside this theme repair.
