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
    parser.add_argument(
        "--param",
        action="append",
        help="Custom parameters for JavaScript as 'name=value'. Can be specified multiple times.",
    )
    parser.add_argument(
        "--param-text",
        action="append",
        help="Custom parameters for JavaScript where value is a file path as 'name=path'. The file content will be read.",
    )
    parser.add_argument(
        "--param-binary",
        action="append",
        help="Custom parameters for JavaScript where value is a file path as 'name=path'. The file content will be read.",
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

    params = {}

    if args.param:
        for item in args.param:
            if "=" in item:
                key, value = item.split("=", 1)
            else:
                key, value = item, ""
            if key in params:
                parser.error(f"Duplicate parameter key: {key}")
            params[key] = value

    if args.param_text:
        for item in args.param_text:
            if "=" not in item:
                parser.error(f"--param-text must be in 'name=value' format: {item}")
            key, value = item.split("=", 1)
            if key in params:
                parser.error(f"Duplicate parameter key: {key}")

            p = Path(value)
            if not p.exists():
                parser.error(f"Parameter file not found: {value}")
            params[key] = p.read_text(encoding="utf-8")

    if args.param_binary:
        for item in args.param_binary:
            if "=" not in item:
                parser.error(f"--param-binary must be in 'name=value' format: {item}")
            key, value = item.split("=", 1)
            if key in params:
                parser.error(f"Duplicate parameter key: {key}")

            p = Path(value)
            if not p.exists():
                parser.error(f"Parameter file not found: {value}")
            params[key] = p.read_bytes()

    # デバッグ: paramsの内容を表示(あとでユーザーサイドからも実行可能にします)
    if params and False:
        print("\n--- Custom Parameters (params) ---")
        for key, value in params.items():
            display_value = ""
            if isinstance(value, str):
                # 文字列をUTF-8でエンコードしてバイト長をチェック
                value_bytes = value.encode("utf-8")
                if len(value_bytes) <= 100:
                    display_value = value
                else:
                    # 先頭10バイトをデコードし、不正なシーケンスは置換
                    display_value = (
                        value_bytes[:10].decode("utf-8", errors="replace")
                        + "... (truncated)"
                    )
            elif isinstance(value, bytes):
                if len(value) <= 100:
                    display_value = repr(value)  # バイト列はreprで表示してb''を付ける
                else:
                    display_value = repr(value[:10]) + "... (truncated)"
            else:
                display_value = str(value)
            print(f"  {key}: {display_value}")
        print("----------------------------------\n")
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
            params=params,
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
