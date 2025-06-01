
// 注文履歴
document.querySelector('#goto-history-button').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab.id;
  const url = 'https://www.amazon.co.jp/your-orders/orders' // ?orderFilter=year-{{year}}
  chrome.tabs.update(tabId, {url: url});
})

// 履歴収集
document.querySelector('#collect-button').addEventListener('click', async () => {
  const encoding = document.getElementById('encoding').value
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.runtime.sendMessage({ action: 'collect', encoding: encoding, tabId: tab.id });
})

// windows でなければUTF8 を初期選択状態とする
const isWin = 0 <= navigator.platform.toLowerCase().indexOf('win')
if (!isWin) {
  document.getElementById('encoding').value = 'utf8'
}
