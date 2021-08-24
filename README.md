# https://ravoratory.github.io/samegame/

# Rule
縦9マス、横14マスのさめがめ
白色ブロックをクリックすると縦横周囲2マスをシャッフルする。
- 縦9マス、横14マスのさめがめ
- 縦横に並んだ同じ種類のブロックをダブルクリックして、画面からブロックを消していってください。
- シャッフルブロック（白いブロック）をクリックすると、縦横周囲2マスのブロックの配置がランダムに変わります。
- 同じブロックが多く並んでいる場所をダブルクリックして一度に消すと、多くの得点を得ることができます。
- ブロックが消せなくなるまでに残ったブロックが少ないほど、ボーナスとしてより多くの得点を得ることができます。
- 各レベルには次のレベルに行くためのボーダーがあります。得点がボーダーに到達できない場合、ゲームが終了します。

# 点数の計算式
- ブロックを消去すると(ブロックの消去数の2乗)×5点がスコアに加算されます。
- 各レベルにおいてブロックを消去できなくなるとクリアとなります。この時消去したブロックの割合によってボーナススコアが加算されます。
  - ボーナススコアはmax(消去できたブロックのパーセント - 85, 0)の2乗×25点で計算されます。
- 各レベルにはボーダーラインがあり、スコアがボーダーに達しない場合そこで終了となります。
  - ボーダーラインは(レベルの2乗)×750点となります。
# 元ネタ
- 以前Yahoo!ゲームにあったブロキシー
