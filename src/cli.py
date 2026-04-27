import argparse
from datetime import datetime
from pathlib import Path

from .pipeline import create_movie


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a movie from an audio file and HTML scenario templates."
    )
    parser.add_argument("audio", help="Input audio file path")
    parser.add_argument("template", help="Template name under template/ directory")
    parser.add_argument("output", help="Output movie path, e.g. output.mp4")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--root", default=".", help="Project root directory")
    parser.add_argument("--keep-work", action="store_true", help="Keep temporary files")
    parser.add_argument(
        "--noaudio", action="store_true", help="Do not mux audio into the output video"
    )
    args = parser.parse_args()

    start_time = datetime.now()
    print(f"動画作成開始: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    create_movie(
        audio_path=Path(args.audio),
        template_name=args.template,
        output_path=Path(args.output),
        root_dir=Path(args.root),
        width=args.width,
        height=args.height,
        fps=args.fps,
        keep_work=args.keep_work,
        no_audio=args.noaudio,
    )

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
