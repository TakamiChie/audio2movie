import json
import shutil
import subprocess
import struct
from pathlib import Path


def require_ffmpeg() -> None:
    for command in ["ffmpeg", "ffprobe"]:
        if shutil.which(command) is None:
            raise RuntimeError(
                f"{command} が見つかりません。ffmpegをインストールしてPATHを通してください。"
            )


def run_ffmpeg(args: list[str]) -> None:
    cmd = [args[0], "-hide_banner", "-loglevel", "error"] + args[1:]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        error_msg = result.stderr or result.stdout
        raise RuntimeError(
            f"ffmpeg command failed: {' '.join(cmd)}\nError: {error_msg}"
        )


def get_audio_duration(audio_path: Path) -> float:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(audio_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def concat_videos(video_paths: list[Path], list_file: Path, output_path: Path) -> None:
    list_file.write_text(
        "".join(f"file '{path.resolve().as_posix()}'\n" for path in video_paths),
        encoding="utf-8",
    )
    run_ffmpeg(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c",
            "copy",
            str(output_path),
        ]
    )


def get_audio_levels(audio_path: Path, sample_rate: int = 1000) -> list[float]:
    """音声ファイルから振幅データを抽出します。"""
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(audio_path),
        "-ar",
        str(sample_rate),
        "-ac",
        "1",
        "-f",
        "f32le",
        "-",
    ]
    result = subprocess.run(cmd, capture_output=True, check=True)
    count = len(result.stdout) // 4
    return list(struct.unpack(f"<{count}f", result.stdout))


def mux_audio(video_path: Path, audio_path: Path, output_path: Path) -> None:
    run_ffmpeg(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-i",
            str(audio_path),
            "-map",
            "0:v:0",
            "-map",
            "1:a",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            str(output_path),
        ]
    )


def apply_xfade(
    input_a: Path,
    input_b: Path,
    output_path: Path,
    transition: str,
    duration: float,
    offset: float,
) -> None:
    filter_complex = (
        f"[0:v][1:v]xfade=transition={transition}:duration={duration}:offset={offset},"
        "format=yuv420p[v]"
    )
    run_ffmpeg(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_a),
            "-i",
            str(input_b),
            "-filter_complex",
            filter_complex,
            "-map",
            "[v]",
            "-an",
            str(output_path),
        ]
    )
