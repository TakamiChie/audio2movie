import argparse
import tempfile
from pathlib import Path
from datetime import datetime

from .pipeline import create_movie
from .ffmpeg_util import run_ffmpeg


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a movie from an audio file and HTML scenario templates."
    )
    parser.add_argument(
        "audio", nargs="?", help="Input audio file path (ignored if --testtpl is used)"
    )
    parser.add_argument("template", help="Template name under template/ directory")
    parser.add_argument("output", nargs="?", help="Output movie path, e.g. output.mp4")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--root", default=".", help="Project root directory")
    parser.add_argument("--keep-work", action="store_true", help="Keep temporary files")
    parser.add_argument(
        "--testtpl",
        type=int,
        help="Create a test video of specified duration (seconds) using looped beat.mp3",
    )
    parser.add_argument(
        "--noaudio", action="store_true", help="Do not mux audio into the output video"
    )

    args = parser.parse_args()

    start_time = datetime.now()
    print(f"動画作成開始: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    template_name = args.template
    output_path_str = args.output

    # Handle argument mapping when --testtpl is used and audio is omitted
    if args.testtpl:
        if output_path_str is None:
            # Adjust arguments: template output --testtpl N
            output_path_str = args.template
            template_name = args.audio
            if not template_name:
                parser.error(
                    "--testtpl mode requires at least template name and output path"
                )

    if not output_path_str:
        parser.error("Output path is required")

    output_path = Path(output_path_str)
    audio_path = None

    if args.testtpl:
        root_dir = Path(args.root).resolve()
        beat_path = root_dir / "data" / "beat.mp3"
        if not beat_path.exists():
            print(f"Error: beat.mp3 not found at {beat_path}")
            return

        # Create a temporary looped audio file
        tmp_audio = tempfile.NamedTemporaryFile(suffix=".m4a", delete=False)
        tmp_audio.close()
        audio_path = Path(tmp_audio.name)

        print(f"Generating test audio ({args.testtpl}s)...")
        run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-stream_loop",
                "-1",
                "-i",
                str(beat_path),
                "-t",
                str(args.testtpl),
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                str(audio_path),
            ]
        )
    else:
        if not args.audio:
            parser.error("Audio path is required when not in test mode")
        audio_path = Path(args.audio)

    try:
        create_movie(
            audio_path=audio_path,
            template_name=template_name,
            output_path=output_path,
            root_dir=Path(args.root),
            width=args.width,
            height=args.height,
            fps=args.fps,
            keep_work=args.keep_work,
            no_audio=args.noaudio,
        )
    finally:
        if args.testtpl and audio_path and audio_path.exists():
            audio_path.unlink()

        end_time = datetime.now()
        elapsed = (end_time - start_time).total_seconds()
        print(f"動画作成完了: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")

        if elapsed < 60:
            time_str = f"{elapsed:.2f}秒"
        elif elapsed < 3600:
            m, s = divmod(elapsed, 60)
            time_str = f"{int(m)}分{s:.2f}秒"
        else:
            m, s = divmod(elapsed, 60)
            h, m = divmod(m, 60)
            time_str = f"{int(h)}時間{int(m)}分{s:.2f}秒"
        print(f"実行時間: {time_str}")
