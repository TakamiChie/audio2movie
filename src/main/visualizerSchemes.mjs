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
    colors: ['red', 'yellow', 'blue']
  },
  {
    name: 'レインボー',
    colors: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple']
  }
];

export function getVisualizerSchemes() {
  return schemes;
}
