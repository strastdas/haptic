# Releasing

## Versioning

`apps/desktop/src-tauri/tauri.conf.json` is the number that ends up in the bundle and the DMG filename. Keep it in step with:

- `apps/desktop/src-tauri/Cargo.toml` (run `cargo update --workspace --offline` afterwards so `Cargo.lock` follows without a compile)
- `apps/desktop/package.json` and `apps/web/package.json`

They had drifted to three different values (`0.1.4` / `0.1.0` / `0.0.1`) because only Tauri's is load-bearing. The workspace packages under `packages/` stay at `0.0.0` — they are private and never published.

Upstream's last tag, `v0.2.0-beta`, shipped a bundle still labelled `0.1.4`; this fork restarted numbering at **0.3.0** to sit unambiguously ahead of both.

## Why the `tauri` script sets `CI=true`

`apps/desktop/package.json` runs the CLI as `cross-env CI=true tauri`. Tauri's DMG bundler
drives **Finder over AppleScript** to lay out the disk-image window (icon positions, window
size). That call is fragile — on this machine it fails with `AppleEvent timed out. (-1712)`
even though AppleScript-to-Finder otherwise works, which killed `tauri build` after the
`.app` had already built successfully.

`CI=true` makes Tauri pass `--skip-jenkins` to `bundle_dmg.sh`, whose stated purpose is
"skip Finder-prettifying AppleScript, useful in Sandbox and non-GUI environments". The build
becomes deterministic and no longer depends on Finder being responsive.

The cost is cosmetic: the DMG opens as a plain window with `Haptic.app` and the `Applications`
symlink, without preset icon positions. Nothing about installation changes. `bundle.macOS.dmg`
styling in `tauri.conf.json` would be ignored, so don't add a background image expecting it to
appear. Drop the env var if you ever need the styled layout and Finder is cooperating.

`dev:tauri` deliberately does **not** set it, so `tauri dev` is unaffected.

## macOS build

```fish
cd apps/desktop
APPLE_SIGNING_IDENTITY='Developer ID Application: <name> (<team-id>)' pnpm tauri build
```

The identity must be a **Developer ID Application** certificate in the login keychain (`security find-identity -v -p codesigning` lists them). Tauri enables the hardened runtime automatically when signing, which notarization requires.

Output lands in `src-tauri/target/release/bundle/` — `macos/Haptic.app` and `dmg/Haptic_<version>_aarch64.dmg`.

## Notarization

Tauri does **not** read `APPLE_KEYCHAIN_PROFILE`; it only accepts `APPLE_ID` + `APPLE_PASSWORD` + `APPLE_TEAM_ID` or the API-key trio. Rather than put an app-specific password in the environment, notarize with `notarytool` directly against a stored keychain profile.

One-time setup, run in a terminal on the build machine (needs a GUI session — a detached shell fails with *"User interaction is not allowed"*):

```fish
xcrun notarytool store-credentials haptic --apple-id <apple-id> --team-id <team-id>
```

Then per release:

```fish
xcrun notarytool submit <dmg> --keychain-profile haptic --wait
xcrun stapler staple <dmg>
```

Stapling attaches the ticket to the DMG so it validates without a network round-trip.

## Verifying

```fish
codesign --verify --deep --strict --verbose=1 <app>
spctl -a -vvv -t open --context context:primary-signature <dmg>
```

`spctl` should report `accepted / source=Notarized Developer ID`. `Unnotarized Developer ID` means signing worked but the notarization pass didn't. Check the copy you are about to distribute, not just the build output.

## Known gaps

- **arm64 only.** Intel Macs need `--target universal-apple-darwin`.
- **No updater.** `tauri-plugin-updater` was removed because the v1 config pointed at upstream's endpoint and signing key. Re-adding it needs our own endpoint and keypair; the version above is what it would compare against.
- **Windows and Linux are unbuilt.** `bundle.targets` is `"all"`, but only macOS has been exercised.
