import asyncio
import subprocess
from pathlib import Path
from urllib.parse import quote

from playwright.async_api import async_playwright


async def render_html_to_video(
    html_path: Path,
    output_path: Path,
    duration: float,
    width: int,
    height: int,
    fps: int,
    audio_data: list[float] | None = None,
    audio_start_time: float = 0.0,
    audio_sample_rate: int = 1000,
    params: dict[str, str] | None = None,
) -> None:
    total_frames = max(1, round(duration * fps))
    frame_interval_ms = 1000 / fps

    ffmpeg = subprocess.Popen(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "image2pipe",
            "-framerate",
            str(fps),
            "-i",
            "-",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output_path),
        ],
        stdin=subprocess.PIPE,
    )

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page(viewport={"width": width, "height": height})

            # JavaScriptからのconsoleログをキャプチャしてPythonの標準出力に表示
            page.on("console", lambda msg: print(f"\n[JS {msg.type}] {msg.text}"))

            url = html_path.resolve().as_uri()
            await page.goto(url, wait_until="networkidle")

            # 音声データをブラウザ側に注入
            await page.evaluate(
                "([data, start, rate, params]) => { "
                "window.__AUDIO2MOVIE_AUDIO_DATA__ = data; "
                "window.__AUDIO2MOVIE_AUDIO_START_TIME__ = start; "
                "window.__AUDIO2MOVIE_AUDIO_SAMPLE_RATE__ = rate; "
                "window.__AUDIO2MOVIE_PARAMS__ = params || {}; "
                "}",
                [audio_data, audio_start_time, audio_sample_rate, params],
            )

            await page.evaluate(
                """(params) => {
                    if (typeof window.init === 'function') {
                        window.init(params);
                    }
                }""",
                params,
            )
            for frame in range(total_frames):
                await page.evaluate(
                    """(ms) => {
                        window.__AUDIO2MOVIE_TIME__ = ms;
                        if (typeof window.draw === 'function') {
                            window.draw(ms);
                        }
                    }""",
                    float(frame * frame_interval_ms),
                )
                # PNGよりも高速なJPEGを使用
                img = await page.screenshot(type="jpeg", quality=90, full_page=False)
                if ffmpeg.stdin is None:
                    raise RuntimeError("ffmpeg stdin could not be opened.")
                ffmpeg.stdin.write(img)

                if (frame + 1) % fps == 0 or (frame + 1) == total_frames:
                    print(
                        f"  Frame {frame + 1}/{total_frames} ({(frame + 1)/total_frames*100:3.0f}%)",
                        end="\r",
                        flush=True,
                    )
            print()

            await browser.close()
    finally:
        if ffmpeg.stdin:
            ffmpeg.stdin.close()
        return_code = ffmpeg.wait()
        if return_code != 0:
            raise RuntimeError(f"HTML rendering failed: {html_path}")


def render_scene(
    html_path: Path,
    output_path: Path,
    duration: float,
    width: int,
    height: int,
    fps: int,
    audio_data: list[float] | None = None,
    audio_start_time: float = 0.0,
    audio_sample_rate: int = 1000,
    params: dict[str, str] | None = None,
) -> None:
    asyncio.run(
        render_html_to_video(
            html_path,
            output_path,
            duration,
            width,
            height,
            fps,
            audio_data,
            audio_start_time,
            audio_sample_rate,
            params,
        )
    )
