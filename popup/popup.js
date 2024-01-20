
// 収集中フラグ
let running = false
// 最終結果
let result = []

function reset() {
  console.log('reset')
  running = false
  result = []
}
reset()

// タグID 取得
async function tabId() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  return tab.id
}

// 履歴ページへ遷移するボタン
const gotoHistoryButton = document.querySelector('#goto-history-button')
gotoHistoryButton.addEventListener('click', gotoAmazonHistoryPage)
async function gotoAmazonHistoryPage() {
  reset()
  const url = 'https://www.amazon.co.jp/your-orders/orders' // ?orderFilter=year-{{year}}
  chrome.tabs.update(await tabId(), {url: url});
}

// 履歴収集
const collectButton = document.querySelector('#collect-button')
collectButton.addEventListener('click', beginCollection)

async function beginCollection() {
  // 収集開始
  console.log('start')
  running = true
  result = []
  try {
    // 表示中の現在ページを解析
    const res = await chrome.tabs.sendMessage(await tabId(), 'parse')
    await collectAndGotoNext(res)
  } catch (e) {
    alert(e)
  }
  console.log('wait')
}

async function collectAndGotoNext(res) {
  // 結果を溜め込む
  console.log('data ' + res.data.length)
  result = result.concat(res.data)
  if (! res.next) {
    // 次ページがなければ終了
    return finish()
  } else {
    console.log('next ' + res.next)
    // 次のページへ遷移
    await chrome.tabs.update(await tabId(), {url: res.next});
  }
}

// ページ読み込み後にbackground.js から呼び出される
// 2ページ目以降はここからデータを溜めていく
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
  // 収集中でなければ無視する
  if (!running) {
    return
  }
  collectAndGotoNext(request)
})

// 終了処理、ファイルダウンロード
function finish() {
  const csv = toCsv(result)
  handleDownload(csv, "download.csv")
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

function handleDownload(content, fileName) {
  // こちら参考にさせてもらった
  // https://qiita.com/wadahiro/items/eb50ac6bbe2e18cf8813
  var blob = new Blob([ content ], { "type" : "text/plain" });

  if (window.navigator.msSaveBlob) { 
    window.navigator.msSaveBlob(blob, fileName); 
    // msSaveOrOpenBlobの場合はファイルを保存せずに開ける
    window.navigator.msSaveOrOpenBlob(blob, fileName); 
  } else {
    const downloadEl = document.getElementById("download")
    downloadEl.href = window.URL.createObjectURL(blob);
    downloadEl.download = fileName
    downloadEl.click()
  }
}
