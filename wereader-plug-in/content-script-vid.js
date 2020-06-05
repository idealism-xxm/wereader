//向后台发送消息：userVid
chrome.runtime.sendMessage({isBookPage: "0", isHomePage: "1", bid: "null" ,vid: "null"}, function(response) {
	console.log('收到来自后台的回复：' + response);
});
//注入inject.js
function injectCustomJs(jsPath)
{
	jsPath = jsPath || 'js/inject.js';
	var temp = document.createElement('script');
	temp.setAttribute('type', 'text/javascript');
	// 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
	temp.src = chrome.extension.getURL(jsPath);
	temp.onload = function()
	{
		// 放在页面不好看，执行完后移除掉
		this.parentNode.removeChild(this);
	};
	document.head.appendChild(temp);
}

injectCustomJs("inject.js");