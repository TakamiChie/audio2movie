import shutil
import tempfile
from pathlib import Path

from .ffmpeg_util import (
    apply_xfade,
    concat_videos,
    get_audio_duration,
    mux_audio,
    require_ffmpeg,
)
from .renderer import render_scene
from .scenario import Scene, load_scenario


def _scene_path(template_dir: Path, scene: Scene) -> Path:
    html_path = template_dir / scene.html
    if not html_path.exists():
        raise FileNotFoundError(f"HTMLファイルが見つかりません: {html_path}")
    return html_path


def _combine_with_transitions(
    scene_videos: list[Path], scenes: list[Scene], work_dir: Path
) -> Path:
    if len(scene_videos) == 1:
        return scene_videos[0]

    current = scene_videos[0]
    current_duration = scenes[0].duration

    for index in range(1, len(scene_videos)):
        transition = scenes[index - 1].transition
        next_video = scene_videos[index]

        if transition.name == "none" or transition.duration <= 0:
            list_file = work_dir / f"concat_{index}.txt"
            output = work_dir / f"joined_{index}.mp4"
            concat_videos([current, next_video], list_file, output)
            current = output
            current_duration += scenes[index].duration
            continue

        output = work_dir / f"xfade_{index}.mp4"
        offset = max(0.0, current_duration - transition.duration)
        apply_xfade(
            input_a=current,
            input_b=next_video,
            output_path=output,
            transition=transition.name,
            duration=transition.duration,
            offset=offset,
        )
        current = output
        current_duration += scenes[index].duration - transition.duration

    return current


def create_movie(
    audio_path: Path,
    template_name: str,
    output_path: Path,
    root_dir: Path,
    width: int,
    height: int,
    fps: int,
    keep_work: bool = False,
    no_audio: bool = False,
) -> None:
    require_ffmpeg()

    audio_path = audio_path.resolve()
    root_dir = root_dir.resolve()
    output_path = output_path.resolve()
    template_dir = root_dir / "template" / template_name
    scenario_path = template_dir / "scenario.json"

    if not audio_path.exists():
        raise FileNotFoundError(f"音声ファイルが見つかりません: {audio_path}")
    if not scenario_path.exists():
        raise FileNotFoundError(f"scenario.json が見つかりません: {scenario_path}")

    audio_duration = get_audio_duration(audio_path)
    scenario = load_scenario(scenario_path, audio_duration)

    # オーディオビジュアライザー用のデータ抽出（全テンプレートで利用可能にする）
    audio_sample_rate = 1000
    from .ffmpeg_util import get_audio_levels

    audio_data = get_audio_levels(audio_path, audio_sample_rate)

    work_dir_path = Path(tempfile.mkdtemp(prefix="audio2movie_"))
    try:
        scene_videos: list[Path] = []
        current_offset = 0.0
        for index, scene in enumerate(scenario.scenes, start=1):
            html_path = _scene_path(template_dir, scene)
            scene_video = work_dir_path / f"scene_{index:03}.mp4"
            print(f"Render scene {index}: {scene.html} / {scene.duration:.2f}s")

            render_scene(
                html_path,
                scene_video,
                scene.duration,
                width,
                height,
                fps,
                audio_data=audio_data,
                audio_start_time=current_offset,
                audio_sample_rate=audio_sample_rate,
            )
            scene_videos.append(scene_video)
            # 次のシーンの開始時間を計算（トランジションによる重なりを考慮）
            current_offset += scene.duration - scene.transition.duration

        silent_video = _combine_with_transitions(
            scene_videos, scenario.scenes, work_dir_path
        )
        if no_audio:
            shutil.copy(silent_video, output_path)
        else:
            mux_audio(silent_video, audio_path, output_path)
        print(f"Created: {output_path}")
    finally:
        if keep_work:
            print(f"Work dir kept: {work_dir_path}")
        else:
            shutil.rmtree(work_dir_path, ignore_errors=True)
