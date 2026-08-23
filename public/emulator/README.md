# emulator

A self-hosted retro game emulator page built on [Nostalgist.js](https://github.com/arianrhodsandlot/nostalgist), which runs libretro/RetroArch WASM cores entirely in the browser. Everything it needs (the Nostalgist library, the emulator cores, and any server-hosted ROMs) is served same-origin from this app — nothing is fetched from a third-party CDN at runtime.

## Cores

`cores/` holds the pre-built libretro core files for four consoles. Nostalgist's own default source for these is jsDelivr, at:

```
https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@<version>/retroarch/<core>_libretro.zip
```

Each zip contains a `<core>_libretro.js` and `<core>_libretro.wasm` pair — extract both directly into `cores/`.

Current cores (version `v1.22.2`):

| System | Core | Files |
|---|---|---|
| NES | `fceumm` | `fceumm_libretro.js` / `.wasm` |
| SNES | `snes9x` | `snes9x_libretro.js` / `.wasm` |
| Game Boy / Color / Advance | `mgba` | `mgba_libretro.js` / `.wasm` |
| Genesis / Mega Drive | `genesis_plus_gx` | `genesis_plus_gx_libretro.js` / `.wasm` |

### Adding another console

1. Pick a core name from [libretro's core list](https://docs.libretro.com/library/) — Nostalgist's default console→core mapping is in [`src/constants/system.ts`](https://github.com/arianrhodsandlot/nostalgist/blob/main/src/constants/system.ts) upstream.
2. Download and unzip it:
   ```sh
   curl -sL -o core.zip "https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/<core>_libretro.zip"
   unzip core.zip -d cores/
   rm core.zip
   ```
3. Add the new `{ system, core }` option to the console selector in `index.html`.

## ROMs

`roms/<system>/` holds server-hosted ROM files, one subfolder per console (`nes/`, `snes/`, `gb/`, `megadrive/`). `roms/manifest.json` lists which ones show up in the in-page game library — it's a plain array maintained by hand:

```json
[
  {
    "system": "nes",
    "file": "nes/example.nes",
    "title": "Example Game",
    "license": "CC0 (homebrew, 2019)"
  }
]
```

Only add ROMs you have the right to distribute (public-domain/homebrew releases under an open license, or your own work) — the `license` field is there so whoever maintains this site can see the provenance of every game at a glance. An empty manifest is fine; players can still use "upload your own ROM" on the page.
