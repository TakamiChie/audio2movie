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
) -> None:
    total_frames = max(1, round(duration * fps))
    frame_interval_ms = 1000 / fps

    ffmpeg = subprocess.Popen(
        [
            "ffmpeg",
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
            url = html_path.resolve().as_uri()
            await page.goto(url, wait_until="networkidle")

            for frame in range(total_frames):
                await page.evaluate(
                    "ms => window.__AUDIO2MOVIE_TIME__ = ms",
                    frame * frame_interval_ms,
                )
                png = await page.screenshot(type="png", full_page=False)
                if ffmpeg.stdin is None:
                    raise RuntimeError("ffmpeg stdin could not be opened.")
                ffmpeg.stdin.write(png)
                await page.wait_for_timeout(frame_interval_ms)

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
) -> None:
    asyncio.run(
        render_html_to_video(html_path, output_path, duration, width, height, fps)
    )
