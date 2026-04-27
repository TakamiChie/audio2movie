import argparse
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
    args = parser.parse_args()

    create_movie(
        audio_path=Path(args.audio),
        template_name=args.template,
        output_path=Path(args.output),
        root_dir=Path(args.root),
        width=args.width,
        height=args.height,
        fps=args.fps,
        keep_work=args.keep_work,
    )
