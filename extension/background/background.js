import './lib/encoding-japanese@2.2.0/encoding.min.js';
const Encoding = globalThis.Encoding;
(async () => {
  // popup からイベント連携
  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action == 'collect') {
      await collect(msg.encoding)
      sendResponse()
    }
  })

  // 収集中フラグ
  let running = false
  // 最終結果
  let result = []

  // 状態リセット
  function reset() {
    running = false
    result = []
  }

  // 1ページずつ最終ページまでデータを取得してcsvダウンロードさせる
  async function collect(encoding) {
    // 実行中であれば何もしない
    if (running) return
    reset()
    running = true
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    let url = tab.url
    while (true) {
      url = await goAndParse(tab.id, url)
      if (!url) break
    }
    finish(encoding)
  }

  // 画面遷移と解析
  async function goAndParse(tabId, url) {
    return new Promise((resolve, reject) => {
      // ページ読み込み完了イベントをセット
      const completedListener = async details => {
        if (details.tabId === tabId && details.frameId === 0) {
          chrome.webNavigation.onCompleted.removeListener(completedListener)
          // 表示中の現在ページを解析
          const res = await chrome.tabs.sendMessage(tabId, { action: 'parse' })
          // 解析結果を蓄積
          result = result.concat(res.data)
          // 次ページのURL を返却
          resolve(res.next)
        }
      }
      chrome.webNavigation.onCompleted.addListener(completedListener)
      // URLを変更
      chrome.tabs.update(tabId, {url: url});
    })
  }

  // 文字コード変換とファイルダウンロード
  function finish(encoding) {
    let csv = toCsv(result)
    let uint8Array
    // sjis 変換
    if (encoding == 'sjis') {
      uint8Array = toSjis(csv)
    } else {
      uint8Array = new TextEncoder().encode(csv)
    }
    handleDownload(uint8Array, "download.csv")
    reset()
  }

  function toCsv(arr) {
    const res = []
    // タイトル
    const title = ['"日付"','"注文番号"','"受取"','"金額"','"商品名(||区切り)"']
    res.push(title.join(','))
    for (let i = 0; i < arr.length; i++) {
      const d = arr[i]
      const row = []
      row.push(toCsvColumn(d.date))
      row.push(toCsvColumn(d.orderNumber))
      row.push(toCsvColumn(d.recipient))
      row.push(toCsvColumn(d.price))
      row.push(toCsvColumn(d.itemNameList.join('||')))
      res.push(row.join(','))
    }
    return res.join('\n')
  }

  function toCsvColumn(text) {
    return '"' + (text ? text : '').replace(/\"/g, '""') + '"'
  }

  // SJIS変換
  function toSjis(csv) {
    // UTF8の横棒は化けてしまうのでSJISでも表示可能なものに変換する
    const unicode = csv.replace(/[‐－―ー−]/g, 'ー')
    const sjisArray = Encoding.convert(Encoding.stringToCode(unicode), {
      to: 'SJIS',
      from: 'UNICODE',
      type: 'array'
    })
    return new Uint8Array(sjisArray)
  }

  // ダウンロード
  function handleDownload(content, fileName) {
    const base64 = btoa(String.fromCharCode(...content));
    const url = `data:application/octet-stream;base64,${base64}`;
    chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: false // ユーザーに保存ダイアログを表示しない
    }, downloadId => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError.message)
      } else {
        console.log('Download started. ID:', downloadId)
      }
    })
  }
})()
