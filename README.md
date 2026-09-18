# Internet.old

任意のサイトの見た目を90年代風に変えるChrome/Edge拡張機能。色と書体だけを上書きするので、要素の配置も機能もそのまま動く。

もとはMITM型のHTTPプロキシだったが、ルート証明書を全員に入れてもらう必要があり公開できないため、拡張機能に置き換えた。

## 導入

1. `chrome://extensions` (Edgeは `edge://extensions`) を開く
2. `Developer mode` を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選ぶ

ツールバーのアイコンから、全体のオンとオフと、サイトごとのオンとオフを切り替えられる。

## 上書きする範囲

| 変える | 変えない |
| --- | --- |
| 背景色、文字色、リンク色 | display, position, width, height |
| 書体 | margin, padding, flex, grid |
| 角丸、影、transition | transform, opacity, animation |
| 枠線の色と種類、フォームの部品 | HTML、スクリプト、通信 |

`background-image` は消さない。サイトが画像の表示に使っていることがあるため。グラデーションは残るが、画像が消えるよりまし。ページ全体の背景とフォームの部品だけは消す。

## 仕組み

CSSは `@layer internet-old` に入れてある。`@layer` 内の `!important` は `@layer` 外の `!important` より強いため、サイト側が `!important` を使っていても、実行時にCSSを追加してきても上書きできる。これを効かせるには internet-old が最初に登録される必要があるので、`bridge.js` が `<head>` の先頭にも同じCSSを差し込んでいる。

Shadow DOM の中には content script のCSSが届かない。`shadow.js` を MAIN world で走らせ、`attachShadow` を捕まえて同じCSSを入れている。`<link>` と `adoptedStyleSheets` の両方を使うのは、前者が `adoptedStyleSheets` を差し替える実装 (Litなど) に、後者が `innerHTML` で中身を消す実装に耐えるため。

CSSでは要素の位置や大きさを条件にできない。そこだけ `overlay.js` が見て印を付ける。

| 印 | 対象 | 理由 |
| --- | --- | --- |
| `data-internet-old-panel` | 浮いている小さな要素 | 背景が透明だと下の文字と重なる |
| `data-internet-old-flat` | 画面いっぱいの背景画像 | 上に乗る文字が読めなくなる |
| `data-internet-old-icon` | 私用領域の文字だけの要素 | 書体を変えると豆腐になる |

reCAPTCHA、Cloudflare Turnstile、hCaptcha の認証画面と、主要な決済およびサインインの画面には適用しない。

## オンとオフ

content script は manifest に静的に書かず、`background.js` から `chrome.scripting.registerContentScripts` で登録している。オフにしたサイトは登録の `excludeMatches` に入るので、CSSもスクリプトも一切入らない。設定は `chrome.storage.local` にだけ置く。

## ファイル

| ファイル | 役割 |
| --- | --- |
| `manifest.json` | 拡張機能の定義 |
| `background.js` | content script の登録とバッジ |
| `popup.html` / `popup.js` | オンとオフの切り替え |
| `retro.css` | 90年代風のCSS |
| `bridge.js` | `<head>` の先頭にCSSを差し込む |
| `shadow.js` | Shadow DOM にCSSを届ける |
| `overlay.js` | CSSでは判定できない要素に印を付ける |
| `_locales/` | 名前と説明文 |
| `build.ps1` | 配布用zipの作成 |

## ビルド

```
./build.ps1
```

`build/internet-old-<version>.zip` ができる。配布に不要なファイルは入らない。

## ライセンス

MIT
