import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

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

    for index, item in enumerate(data["scenes"]):
        duration = _read_seconds(item.get("duration"))
        transition = item.get("transition", {})
        transition_duration = float(transition.get("duration", 0))

        if transition_duration < 0:
            raise ValueError("transition.duration must be 0 or greater")

        scene = Scene(
            html=item["html"],
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
