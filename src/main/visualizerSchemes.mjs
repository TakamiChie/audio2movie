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
    name: 'レッド',
    colors: ['red']
  },
  {
    name: 'オレンジ',
    colors: ['orange']
  },
  {
    name: 'グリーン',
    colors: ['green']
  },
  {
    name: '夜の海',
    colors: ['#002233', '#004466', '#006688']
  },
  {
    name: '夕焼け',
    colors: ['#FF4500', '#FF8C00', '#FFD700']
  },
  {
    name: '森',
    colors: ['#013220', '#228B22', '#ADFF2F']
  },
  {
    name: 'キャンディ',
    colors: ['#FF69B4', '#FFB6C1', '#FFD700']
  },
  {
    name: 'オーロラ',
    colors: ['#7FFFD4', '#BA55D3', '#00FA9A']
  },
  {
    name: 'サイバー',
    colors: ['#00FFFF', '#FF00FF', '#FFFF00']
  },
  {
    name: 'モノクロ',
    colors: ['#111111', '#666666', '#FFFFFF']
  },
  {
    name: '炎',
    colors: ['#FF3300', '#FF6600', '#FFCC00']
  },
  {
    name: '宇宙',
    colors: ['#000000', '#2E0854', '#8A2BE2']
  },
  {
    name: 'ネオン',
    colors: ['#39FF14', '#FF2079', '#00FFFF']
  },
  {
    name: 'レトロ',
    colors: ['#FCA311', '#E5E5E5', '#14213D']
  },
  {
    name: 'クリスタル',
    colors: ['#E0FFFF', '#AFEEEE', '#00CED1']
  },
  {
    name: '花畑',
    colors: ['#FFB6C1', '#98FB98', '#FFDAB9', '#DDA0DD']
  },
  {
    name: '砂漠',
    colors: ['#EDC9AF', '#FFD700', '#C2B280']
  },
  {
    name: 'ナイトシティ',
    colors: ['#0F0F0F', '#FF007F', '#00FFFF']
  },
  {
    name: '横浜ベイブリッジ',
    colors: ['#005BAC', '#89CFF0', '#FFFFFF'] // 濃い青・空色・白
  },
  {
    name: 'みなとみらい',
    colors: ['#87CEFA', '#FFFFFF', '#D3D3D3'] // 空色・白・グレー（近未来建築感）
  },
  {
    name: '赤レンガ倉庫',
    colors: ['#8B0000', '#A0522D', '#FFD700'] // ダークレッド・茶色・ゴールドアクセント
  },
  {
    name: '青空の波',
    colors: ['#00BFFF', '#1E90FF', '#FFFFFF'] // ディープスカイブルー・ドジャーブルー・白い波しぶき
  },
  {
    name: '夏の浜辺',
    colors: ['#87CEEB', '#00CED1', '#FFE4B5'] // 青空・海・砂浜
  },
  {
    name: '陽射しの海',
    colors: ['#4682B4', '#5F9EA0', '#FFD700'] // スチールブルー・カドミウム・太陽の反射
  },
  {
    name: 'クラシックレインボー',
    colors: ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'] // 伝統的な虹の7色
  },
  {
    name: 'パステルレインボー',
    colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#D5BAFF'] // 柔らかいパステルトーンの虹
  },
  {
    name: 'ネオンレインボー',
    colors: ['#FF0000', '#FF9900', '#CCFF00', '#00FF66', '#00FFFF', '#6600FF', '#FF00CC'] // ネオン風の鮮やかで強い虹
  }
];

export function getVisualizerSchemes() {
  return schemes;
}
