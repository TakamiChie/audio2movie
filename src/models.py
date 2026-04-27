from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class Transition:
    name: str = "none"
    duration: float = 0.0


@dataclass
class Scene:
    html: str
    duration: float | str
    transition: Transition


class Scenario:
    def __init__(self, scenes: List[Scene]):
        if not scenes:
            raise ValueError("Scenario must have at least one scene")

        self.scenes = scenes

    def total_scene_duration(self) -> float:
        """シーンのduration合計（トランジション考慮なし）"""
        return sum(float(scene.duration) for scene in self.scenes)

    def total_transition_duration(self) -> float:
        """実際に使用されるトランジションの合計（最後は除く）"""
        return sum(scene.transition.duration for scene in self.scenes[:-1])

    def total_video_duration(self) -> float:
        """最終的な動画の長さ"""
        return self.total_scene_duration() - self.total_transition_duration()
