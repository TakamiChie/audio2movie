import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from .ffmpeg_util import get_media_duration

from src.models import Scenario, Scene, Transition


def _read_seconds(value: Any) -> float | str:
    if value == "rem":
        return "rem"
    if isinstance(value, int | float) and value > 0:
        return float(value)
    raise ValueError("scene.duration は正の数値または 'rem' を指定してください。")


def load_scenario(scenario_path: Path, audio_duration: float) -> Scenario:
    with scenario_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    scenes = []
    rem_scene = None
    fixed_duration_total = 0.0
    template_dir = scenario_path.parent

    for index, item in enumerate(data["scenes"]):
        html = item.get("html")
        video = item.get("video")
        if not html and not video:
            raise ValueError(f"Scene {index} must have 'html' or 'video'")

        duration_val = item.get("duration")
        if video:
            if duration_val == "rem":
                raise ValueError("duration: 'rem' cannot be used with video scenes")

            video_path = template_dir / video
            if not video_path.exists():
                raise FileNotFoundError(f"Video file not found: {video_path}")

            actual_duration = get_media_duration(video_path)
            if duration_val is None:
                duration = actual_duration
            else:
                duration = float(duration_val)
                if duration > actual_duration:
                    raise ValueError(
                        f"Requested duration {duration} exceeds video duration {actual_duration}"
                    )
        else:
            duration = _read_seconds(duration_val)

        transition = item.get("transition", {})
        transition_duration = float(transition.get("duration", 0))
        if transition_duration < 0:
            raise ValueError("transition.duration must be 0 or greater")

        scene = Scene(
            html=html,
            video=video,
            duration=duration,
            transition=Transition(
                name=transition.get("name", "none"),
                duration=transition_duration,
            ),
        )

        if duration == "rem":
            if rem_scene is not None:
                raise ValueError('duration: "rem" can be used only once')
            rem_scene = scene
        else:
            scene.duration = float(duration)
            fixed_duration_total += scene.duration

        scenes.append(scene)

    if rem_scene is not None:
        # 動画の長さ = シーン合計 - トランジション合計(最後を除く) なので
        # ターゲット(audio_duration) = (fixed_duration_total + rem_duration) - transition_overlap
        transition_overlap = sum(s.transition.duration for s in scenes[:-1])
        rem_duration = audio_duration - fixed_duration_total + transition_overlap
        if rem_duration <= 0:
            raise ValueError("rem duration is less than or equal to 0")
        rem_scene.duration = rem_duration

    s = Scenario(scenes=scenes)
    if s.total_video_duration() > audio_duration:
        raise ValueError("scenario duration exceeds audio duration")

    return s
