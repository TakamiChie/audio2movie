# audio2movie

`audio2movie` は、主にポッドキャスト音声に合わせて、HTML/CSS/JavaScript によるアニメーションや動画素材を組み合わせ、一本の動画ファイルを生成するツールです。

Playwright を使用してブラウザ上で HTML をレンダリングするため、CSS アニメーションや Canvas、SVG を駆使した高度なモーショングラフィックスを動画化できます。

## 主な機能

- **HTML レンダリング**: HTML/JS/CSS で記述された視覚効果を動画として記録。
- **動画素材の統合**: 既存の動画ファイル（mp4等）をシーンとして挿入可能。
- **オーディオビジュアライザー対応**: 音声の振幅データをブラウザ側にリアルタイムに提供。
- **柔軟な尺調整**: 音声の長さに合わせて特定のシーンの長さを自動調整（`rem` 指定）。
- **トランジション**: FFmpeg の xfade を利用したシーン間の切り替えエフェクト。

## 必要条件

- Python 3.10 以上
- FFmpeg (PATH が通っていること)
- Playwright (Chromium)

## セットアップ

```bash
git clone https://github.com/TakamiChie/audio2movie.git
cd audio2movie
pipenv install
pipenv shell
playwright install chromium
```

## 基本的な使い方

```bash
python audio2movie.py [音声ファイル] [テンプレート名] [出力先パス]
```

**例:**

```bash
python audio2movie.py  data/bgm.mp3 my_template output.mp4
```

### コマンドラインオプション

| オプション         | 説明                                                                               | デフォルト |
| :----------------- | :--------------------------------------------------------------------------------- | :--------- |
| `audio`            | 入力音声ファイルのパス。                                                           | (必須)     |
| `template`         | `template/` ディレクトリ配下にあるテンプレートフォルダ名。                         | (必須)     |
| `output`           | 生成される動画の保存先パス。                                                       | (必須)     |
| `--width`          | 動画の横幅（ピクセル）。                                                           | 1920       |
| `--height`         | 動画の縦幅（ピクセル）。                                                           | 1080       |
| `--fps`            | フレームレート。                                                                   | 30         |
| `--root`           | プロジェクトのルートディレクトリ。                                                 | `.`        |
| `--keep-work`      | 生成に使用した一時ファイルを削除せずに残します。                                   | false      |
| `--noaudio`        | 音声を合成せず、映像のみを出力します。                                             | false      |
| `--testtpl [秒数]` | 指定した長さのテスト用音声（`data/beat.mp3` のループ）を用いて動作確認を行います。 | -          |

---

## テンプレート制作ガイド

テンプレートは `template/[テンプレート名]/` ディレクトリ内に配置します。

### ディレクトリ構成例

```text
template/my_template/
├── scenario.json    # シーン構成の定義 (必須)
├── index.html       # メインの描画画面
├── style.css
└── main.js
```

### scenario.json の書き方

`scenes` 配列に、表示したい順番でシーンを記述します。

```json
{
  "scenes": [
    {
      "html": "index.html",
      "duration": 2.0,
      "transition": { "name": "fade", "duration": 0.5 }
    },
    {
      "html": "index.html",
      "duration": "rem"
    },
    {
      "video": "outro.mp4",
      "duration": 5.0
    }
  ]
}
```

- `html` または `video`: 表示するファイル名。
- `duration`: シーンの長さ（秒）。
  - `"rem"` を指定すると、音声全体の長さから他のシーンの合計時間を引いた残りの時間が自動的に割り当てられます（1つのシナリオで1回のみ使用可能）。
  - `video` シーンで指定しない場合は、動画ファイルの元の長さが使用されます。
- `transition`: 次のシーンへの切り替え効果。
  - `name`: `fade`, `wipeleft`, `circleopen`, `dissolve` など、FFmpeg の xfade フィルターで使用可能な名前。
  - `duration`: 重なり合う時間（秒）。

### ブラウザ側へのデータ注入

レンダリング中、`audio2movie` はブラウザの `window` オブジェクトに以下の情報を注入します。

1. **`window.draw(ms)` 関数の呼び出し**
   毎フレームごとに `window.draw(現在のミリ秒)` が呼び出されます。テンプレート側でこの関数を定義し、時間に合わせた描画を行ってください。

2. **音声データ (`window.__AUDIO2MOVIE_AUDIO_DATA__`)**
   音声の振幅データ（Float32Array 相当の配列）が格納されます。

3. **メタデータ**
   - `window.__AUDIO2MOVIE_TIME__`: 現在の再生時間 (ms)。
   - `window.__AUDIO2MOVIE_AUDIO_START_TIME__`: そのシーンが音声全体のどの地点から始まるか (s)。
   - `window.__AUDIO2MOVIE_AUDIO_SAMPLE_RATE__`: 音声データのサンプリングレート。

※ レンダリング中のChromiumでは時間の流れが現実と異なります。そのため`performance.now()`や`Date.now()`の値は現実世界の時間と違うものになります。実行秒数を取得する場合は`window.__AUDIO2MOVIE_TIME__`を利用してください。

### 実装例 (JavaScript)

```javascript
window.draw = function (ms) {
  // ms: シーン開始からの経過時間（ミリ秒）
  const sceneOffset = window.__AUDIO2MOVIE_AUDIO_START_TIME__;
  const sampleRate = window.__AUDIO2MOVIE_AUDIO_SAMPLE_RATE__;
  const audioData = window.__AUDIO2MOVIE_AUDIO_DATA__;

  // 現在の音声レベルを取得して円の大きさを変える例
  const sampleIndex = Math.floor((sceneOffset + ms / 1000) * sampleRate);
  const level = audioData ? Math.abs(audioData[sampleIndex] || 0) : 0;

  const circle = document.getElementById("circle");
  circle.style.transform = `scale(${1 + level * 5})`;
};
```

### テンプレート制作時のデバッグ (--testtpl)

テンプレートの制作中、アニメーションの挙動を確認したい場合は、`--testtpl` オプションを使用すると便利です。

```bash
python audio2movie.py my_template output.mp4 --testtpl 30
```

引数に指定したテンプレート(この場合my_templat)を、`testtpl`の後に指定した秒数(この場合30秒)分ループ再生するテスト動画を作成します。アニメーションの挙動や画面切り替えのタイミングの調整に利用してください。
その場合の背景その場合のBGMには`data/beat.mp3`の音声が使用されます。

`scenario.json` で durationの値に"rem" を使用している場合の挙動確認や、一定周期のビートに合わせたビジュアライザーの調整にお役立てください。

## 注意事項

- **パフォーマンス**: レンダリング速度はマシンスペックと HTML/JS の複雑さに依存します。
- **ネットワーク**: 外部アセット（Webフォントや外部API）を利用する場合、`networkidle` を待機しますが、可能な限りローカルアセットの使用を推奨します。
- **動画素材**: `video` シーンに使用する動画は、プロジェクトの解像度に合わせて自動的にスケーリング（黒帯追加）されます。

## ライセンス

MIT License

Copyright (c) 2026 audio2movie contributors
