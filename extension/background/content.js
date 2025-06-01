
// popup から履歴取得ボタン押下時
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
  if (request.action == 'parse') {
    const result = parseOnePage()
    sendResponse(result)
  }
})

// 1ページ分の履歴を解析
function parseOnePage() {
  const result = { data:[], next:'' }
  // オーダーカードの一覧を取得
  const cardList = document.querySelectorAll('.order-card')
  for (let i = 0; i < cardList.length; i++) {
    const card = cardList[i]
    const cardInfo = parseCard(card)
    result.data.push(cardInfo)
  }
  result.next = findNextPageUrl()
  return result
}

// 要素があればそのText を返却。なければ空文字列を返却
function textBySelector(el, selector) {
  const selected = el.querySelector(selector)
  return selected ? selected.innerText : ''
}

// オーダーカードを解析
function parseCard(card) {
  // 通常の購入とkindle の購入などでHTML が若干異なる
  // なるべく多くのケースを救済するよう , で複数指定している
  const result = {}
  result.date = textBySelector(card, '.a-span3 .a-size-base .value, .a-span3 .a-size-base.a-color-secondary')
  result.price = textBySelector(card, '.a-span2 .a-size-base .value, .a-span2 .a-size-base.a-color-secondary').replace(/[^0-9]/g, '')
  result.recipient = textBySelector(card, '.recipient .a-size-base, .yohtmlc-recipient .a-size-base')
  result.orderNumber = textBySelector(card, '.actions [dir=ltr], .yohtmlc-order-id [dir=ltr]')
  const itemList = card.querySelectorAll('.yohtmlc-product-title, .yohtmlc-item .a-link-normal')
  result.itemNameList = []
  for (let i = 0; i < itemList.length; i++) {
    const item = itemList[i]
    result.itemNameList.push(item.innerText)
  }
  return result
}

function findNextPageUrl() {
  let nextEl
  document.querySelectorAll('a').forEach(a => {
    if (a.innerText == '次へ→') {
      nextEl = a
    }
  })
  return nextEl ? nextEl.href : ''
}
