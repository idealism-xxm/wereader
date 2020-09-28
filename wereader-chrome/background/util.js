/* 说明：
util.js 是从 background.js 分离出来的，这里的所有函数最初都放在 background.js 中被调用。
现在之所以单独放在这个文件中纯粹是为了缩减 background.js 的代码量，从而使结构清晰
*/

//报错捕捉函数
function catchErr(sender) {
	if (chrome.runtime.lastError != undefined && chrome.runtime.lastError != null) {
		console.log(sender + " => chrome.runtime.lastError：" + chrome.runtime.lastError.message)
	}
}

//获取当前背景页配置——用于测试
function getConfig(){
	var keys = ["s1Pre","s1Suf","s2Pre","s2Suf","s3Pre","s3Suf","lev1","lev2","lev3","thouPre","thouSuf","displayN"]
	var items = {}
	for(var i=0,len=keys.length;i<len;i++){
		var key = keys[i]
		items[key] = document.getElementById(key).value
	}
	return items
}

//alert()——用于测试
function aler(text){
	alert(text)
}

//存储 / 初始化设置
function Setting() {
	chrome.storage.sync.get(null, function (setting) {
		var keys = ["s1Pre","s1Suf","s2Pre","s2Suf","s3Pre","s3Suf","lev1","lev2","lev3","thouPre","thouSuf","displayN"]
		//stroage中无数据时
		if (setting.s1Pre == undefined) {
			//从背景页获取初始化数据
			var items = {}
			for(var i=0,len=keys.length;i<len;i++){
				var key = keys[i]
				items[key] = document.getElementById(key).value
			}
			//默认初始化数据
			items["checkedRe"] = []
			items["codePre"] = "```"
			items["codeSuf"] = "```"
			items["preLang"] = ""
			items["re"] = [
				[
					"contextMenuEnabledInput1",
					"",
					"",
					""
				],
				[
					"contextMenuEnabledInput2",
					"",
					"",
					""
				],
				[
					"contextMenuEnabledInput3",
					"",
					"",
					""
				],
				[
					"contextMenuEnabledInput4",
					"",
					"",
					""
				],
				[
					"contextMenuEnabledInput5",
					"",
					"",
					""
				]
			]
			//存储初始化设置
			chrome.storage.sync.set(items, function () {
				//设置存储完毕
			});
		} else {
			//同步设置到背景页
			chrome.storage.sync.get(keys, function (setting) {
				for(var key in setting){
					document.getElementById(key).innerHTML = setting[key]
				}
			});
		}
	});
}

//获取bid，popup.js调用
function getbookId() {
	return document.getElementById('bookId').value;
}

//动态注入
function injectScript(detail){
	chrome.tabs.executeScript(detail, function (result) {
		catchErr("injectScript()")
	})
}

//发送消息到content.js
function sendMessageToContentScript(message) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, message);
	});
}

//通知函数
function sendAlertMsg(msg) {
	sendMessageToContentScript({isAlertMsg: true, alertMsg: msg})
}

//复制内容
function copy(text) {
	//添加这个变量是因为发现存在一次复制成功激活多次 clipboard.on('success', function (e) {})的现象
	var count = 0;
	var inputText = document.getElementById("formatted_text");
	var copyBtn = document.getElementById("btn_copy");
	var clipboard = new ClipboardJS('.btn');
	clipboard.on('success', function (e) {
		if(count == 0){//进行检查而确保一次复制成功只调用一次sendAlertMsg()
			sendAlertMsg({icon: 'success',title: 'Copied successfully'})
			count = count + 1
		}
	});
	clipboard.on('error', function (e) {
		sendAlertMsg({title: "复制出错", text: JSON.stringify(e), confirmButtonText: '确定',icon: "error"});
	});
	inputText.innerHTML = text;
	copyBtn.click();
}

//获取数据
function getData(url, callback) {
	var httpRequest = new XMLHttpRequest();
	httpRequest.open('GET', url, true);
	httpRequest.withCredentials = true;
	try{
		httpRequest.send();
	}catch(err){
		sendAlertMsg({text: "似乎没有联网", icon: "warning"})
	}
	httpRequest.onreadystatechange = function () {
		if (httpRequest.readyState == 4 && httpRequest.status == 200) {
			var data = httpRequest.responseText;//获取到json字符串，还需解析
			callback(data);
		}else if(httpRequest.readyState == 4 && (httpRequest.status == 400 || httpRequest.status == 401 || httpRequest.status == 403 || httpRequest.status == 404 || httpRequest.status == 500)){
			sendAlertMsg({title: "获取失败:", text: JSON.stringify(httpRequest.responseText), icon: "error",confirmButtonText: '确定'})
		}
	};
}

//获取添加级别的标题
function getTitleAddedPre(title, level) {
	return (level == 1) ? (document.getElementById("lev1").value + title)
		: (level == 2) ? (document.getElementById("lev2").value + title)
		: (level == 3) ? (document.getElementById("lev3").value + title)
		: ""
}
//根据标注类型获取前后缀
function getMarkPre(style) {
	return (style == 0) ? document.getElementById("s1Pre").value
		: (style == 1) ? document.getElementById("s2Pre").value
		: (style == 2) ? document.getElementById("s3Pre").value
		: ""
}
function getMarkSuf(style) {
	return (style == 0) ? document.getElementById("s1Suf").value
		: (style == 1) ? document.getElementById("s2Suf").value
		: (style == 2) ? document.getElementById("s3Suf").value
		: ""
}
//给 markText 进行正则匹配
function getRegExpMarkText(markText,regexpCollection){
	for(var n=0,len=regexpCollection.length;n<len;n++){
		let pattern = regexpCollection[n][1]
		let re = new RegExp(pattern)
		if(re.test(markText) == true){
			markText = regexpCollection[n][2] + markText + regexpCollection[n][3]
		}
	}
	return markText
}

//右键反馈
chrome.contextMenus.create({
    "type":"normal",
    "title":"反馈",
    "contexts":["browser_action"],
    "onclick":function() {
        chrome.tabs.create({url: "https://github.com/liuhao326/wereader/issues"})
    }
});

//监听背景页所需storage键值是否有改变
chrome.storage.onChanged.addListener(function(changes, namespace) {
	if(namespace == "sync"){
		var keys = ["s1Pre","s1Suf","s2Pre","s2Suf","s3Pre","s3Suf","lev1","lev2","lev3","thouPre","thouSuf","displayN"]
		chrome.storage.sync.get(keys,function(setting){
			for(var key in setting){
				if(keys.indexOf(key) > -1){
					value = setting[key]
					document.getElementById(key).innerHTML = (typeof value == "boolean") ? String(value) : value
				}
			}
		})
	}
  });