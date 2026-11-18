# [![`snake_label`](/img/snake_label_header.webp)](https://snake-label.de)
Converts large format shipping labels to 62mm `snake_labels` for label printers e. g. Brother QL printers. Conversion happens locally in your browser; direct printing is optional.

> **Note**
> Feel free to use the hosted online version: **[[ snake-label.de ]](https://snake-label.de)**
>
> If you want to use `snake_label` offline instead, download the latest offline package and open `index.html` in your favorite browser:
> **[[ Download snake_label_offline ]](https://github.com/typingbeaver/snake-label/archive/refs/heads/offline.zip)**

> **Warning**
> Use this tool at your own risk. These are non-official labels which could get declined by the operator.

## Features and benefits
- **smaller and handier**: sticky labels instead of giant plain paper pages
- **as short as possible**: more labels for your money!
- **sharp 2D-/barcodes**: for best scanability
- **without backend**: crops completely locally via JS (keep your address safe!)
- **direct printing (optional)**: send the finished label to a configured [brother_ql_web](https://github.com/socram70/brother_ql_web) service
- optimized for 300dpi
- optimised PNGs for direct printing via [brother_ql](https://github.com/pklaus/brother_ql)

### Custom label templates

Use **Neues Etikett gestalten** to create a template from an uploaded PDF or image:

1. Select a representative shipping label file and choose **Neues Etikett gestalten**.
2. Drag over an area in the source document and add it to the label. Repeat for each part you need.
3. Drag parts on the 62mm print area; select a part to zoom, rotate it, or remove it. Set the label length in millimetres.
4. Set the total label length (including the existing 3mm end margins) and save. The template is stored locally in the current browser and appears in the label list for future uploads.

Use **Vorlagen exportieren** to download your templates as JSON, or **Vorlagen importieren** to load that file in another browser/device. The uploaded documents and template data are processed locally; the JSON contains crop coordinates and layout settings, not the source document.

### Direct printing

Direct printing requires a running [brother_ql_web](https://github.com/socram70/brother_ql_web) service. Configure its URL under **Drucker einrichten** (default: `http://localhost:8013`) and enable CORS on the service if needed. The finished label is sent to that URL only when **Direkt drucken** is clicked; otherwise conversion and downloads remain in the browser.

## Run with Docker

Build and start the web app with Docker Compose:

```bash
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080). Stop the container with:

```bash
docker compose down
```

This container serves the web app only; direct printing still requires a separate `brother_ql_web` service reachable from the browser.


Currently available labels
---------------------------

### DHL

#### `dhl_privat`
- **Size:** 62x145mm
- **Note:** Zusatzleistungen and Warnings are not included in these labels (yet?).

![Sample Image](/samples/dhl/dhl_privat.png) \
[Sample PDF](/samples/dhl/dhl_privat.pdf)

#### `dhl_privat_international_eu`
- **Size:** 62x195mm

![Sample Image](/samples/dhl/dhl_international_eu_privat.png) \
[Sample PDF](/samples/dhl/dhl_international_eu_privat.pdf)

#### `dhl_privat_international_eu_native`
[DHL native countries, eg. NL]
- **Size:** 62x165mm
- **Note:** *Zusatzleistungen and Warnings are not included in these labels (yet?).*

![Sample Image](/samples/dhl/dhl_international_eu_native_privat.png)
<!-- [Sample PDF]() -->

#### `dhl_retoure` (Deutschland)
- **Size:** 62x145mm

International returns are most probably better on a real paper sheet/A5 Label.

![Sample Image](/samples/dhl/dhl_retoure.png)
<!-- [Sample PDF]() -->

#### `dhl_return_connect`
- **Size:** 62x160mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

### Deutsche Post

#### `briefmarke`
- **Size:** 62x40mm

![Sample Image](/samples/deutsche_post/briefmarke.png) \
[Sample PDF](/samples/deutsche_post/briefmarke.pdf)

#### `briefmarke_short`
- **Size:** 62x30mm
- **Note:** *Not suited for e. g. "Einschreiben International".*

![Sample Image](/samples/deutsche_post/briefmarke_short.png) \
[Sample PDF](/samples/deutsche_post/briefmarke_short.pdf)

#### `briefmarke_adresse`
- **Size:** 62x80mm

![Sample Image](/samples/deutsche_post/briefmarke_adresse.png) \
[Sample PDF](/samples/deutsche_post/briefmarke_adresse.pdf)

#### `briefmarke_bogen`
- **Size:** 62x40mm
- **Note:** *Druckt (derzeit) nur die erste Marke eines 3-spaltigen DIN A4-Bogens!*

![Sample Image](/samples/deutsche_post/briefmarke_bogen.png) \
[Sample PDF](/samples/deutsche_post/briefmarke_bogen.pdf)

#### `briefmarke_bogen_short`
- **Size:** 62x25mm
- **Note:** *Druckt (derzeit) nur die erste Marke eines **3-spaltigen** DIN A4-Bogens!*

![Sample Image](/samples/deutsche_post/briefmarke_bogen_short.png) \
[Sample PDF](/samples/deutsche_post/briefmarke_bogen_short.pdf)

### Hermes

#### `hermes_privat [v1.1.2]`
- **Size:** 62x145mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

#### `hermes_vinted_qr`
- **Size:** 62x100mm

![Sample Image](/samples/hermes/hermes_vinted_qr.png)
<!-- [Sample PDF]() -->

#### `hermes_vinted_eu`
- **Size:** 62x165mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

### Seller Returns

#### `adidas_retoure [dhl]`
- **Size:** 62x120mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->


#### `amazon_retoure [dhl]`
- **Size:** 62x120mm
- **Note:** *Converts displayed GIF Image `ShipperLabel.gif`. No PDF support!*

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

#### `bestsecret_retoure [dhl]`
- **Size:** 62x150mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

#### `hm_retoure [dhl]`
- **Size:** 62x145mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

#### `ikea_retoure [dhl]`
- **Size:** 62x135mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

#### `mediamarkt_saturn_retoure [dhl]`
- **Size:** 62x145mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

#### `nike_retoure [dhl]`
- **Size:** 62x160mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

### DPD

#### `dpd_packlink`
- **Size:** 62x180mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

#### `dpd_return`
- **Size:** 62x180mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

### GLS

#### `gls_return`
- **Size:** 62x145mm

<!-- ![Sample Image]() -->
<!-- [Sample PDF]() -->

### DHL Netherlands / DHL Nederland [mdp v5.7]

#### `dhl_nl_4_4`
- **Size:** 62x110mm
- **Note:** *4-line sender / 4-line receiver*

#### `dhl_nl_4_5`
- **Size:** 62x110mm
- **Note:** *4-line sender / **5-line receiver***

#### `dhl_nl_5_4`
- **Size:** 62x110mm
- **Note:** ***5-line sender** / 4-line receiver*

#### `dhl_nl_5_5`
- **Size:** 62x110mm
- **Note:** ***5-line sender** / **5-line receiver***

![Sample Image](/samples/dhl_netherlands/dhl_nl.png) \
[Sample PDF](/samples/dhl_netherlands/dhl_nl.pdf)

---
## Dependencies & Licenses
`snake_label` is licensed under [GPL-3.0](LICENSE).

Made possible by [@catSIXe](https://github.com/cheetahdotcat). :octocat:

### Dependencies
- [PDF-LIB](https://github.com/Hopding/pdf-lib) (c) Andrew Dillon | MIT License
- [PDF.js](https://github.com/mozilla/pdf.js) (c) Mozilla Foundation | Apache-2.0 License
- [FileSaver.js](https://github.com/eligrey/FileSaver.js) (c) Eli Grey | MIT License
- [Vite](https://github.com/vitejs/vite) (c) Evan You | MIT License
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) (c) Tailwind Labs, Inc. | MIT License

### Theming
- [Fira Mono](https://github.com/bBoxType/FiraSans) (c) Mozilla Foundation, Telefonica S.A., Carrois Corporate GbR and bBox Type GmbH | OFL
- [Heroicons](https://github.com/tailwindlabs/heroicons) (c) Refactoring UI Inc. | MIT License

### Logo
 - Share Tech Mono (c) Carrois Apostrophe | OFL
 - [Twitter Emoji (Twemoji)](https://github.com/twitter/twemoji) (c) Twitter, Inc | CC-BY 4.0 [modified]
