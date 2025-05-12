const schemes = [
  {
    name: 'デフォルト',
    colors: ['lime']
  },
  {
    name: 'ブルー',
    colors: ['blue']
  },
  {
    name: 'グラデーションR->B',
    colors: ['red', 'blue']
  },
  {
    name: 'グラデーションR->Y->B',
    colors: ['red', '#FFBE31', 'blue']
  },
  {
    name: 'レインボー',
    colors: ['red', 'orange', 'yellow', 'green', '#00DDDD', 'blue', 'purple']
  }
];

export function getVisualizerSchemes() {
  return schemes;
}
