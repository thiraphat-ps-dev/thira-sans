# thira-sans

Self-hosted webfonts for **Thira Sans**, a Thai + Latin sans-serif with a weight axis from 100 to 700.

- Proof page: https://thiraphat-ps-dev.github.io/thira-sans/
- Source: https://github.com/thiraphat-ps-dev/thira-sans

## Install

```sh
npm install thira-sans
```

## Use

Import the variable font once, for example in your app's entry file. Any bundler that handles CSS imports (Vite, Next.js, Astro, webpack) works:

```js
import 'thira-sans';
```

```css
body {
  font-family: 'Thira Sans', system-ui, sans-serif;
}
```

Every weight from 100 to 700 is then available, including in-between values such as `font-weight: 450`.

### Static weights

To ship only the weights you use, import them instead of the variable font:

```js
import 'thira-sans/400.css';
import 'thira-sans/700.css';
```

| File      | Weight          |
| --------- | --------------- |
| `100.css` | Thin            |
| `200.css` | ExtraLight      |
| `300.css` | Light           |
| `400.css` | Regular         |
| `500.css` | Medium          |
| `600.css` | SemiBold        |
| `700.css` | Bold            |

The font files are also exported as `thira-sans/files/*.woff2` if you want to write your own `@font-face`.

## Line height

`line-height: normal` is 1.5. Thai tone marks stack above vowels (ปี๊บ) and some vowels hang below the letter (ฎุ), so a clipping box (`overflow: hidden`, `line-clamp`) needs room for them:

| Weight | Smallest line-height that never clips |
| --- | --- |
| 100–600 | 1.5 |
| 700 | 1.55 |

Below that, the tallest stacks can be cut at the top of the first line and the bottom of the last. The [metrics page](https://thiraphat-ps-dev.github.io/thira-sans/metrics.html) shows the same numbers in the browser.

## Status

0.x: Thira Sans has soft, rounded corners since 0.2.0 and supports `ss03` (single-storey a/g), `ss04` (dotted zero) and `zero` (slashed zero). It is a fork of [Anuphan](https://github.com/cadsondemak/Anuphan) by Cadson Demak and is being redesigned. Glyph shapes and metrics will change between minor versions.

## License

[SIL Open Font License 1.1](OFL.txt). Copyright IBM Corp. (Plex), The Anuphan Project Authors, and The Thira Sans Project Authors.
