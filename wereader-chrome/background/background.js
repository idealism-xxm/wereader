/* 说明：
background.js 相当于一个函数库。函数被调用的入口则是 popup.js。
其他大部分 js 文件（包括部分 content.js）都是为实现 background.js 中函数的功能而存在的。
*/
//获取书评：popup
function getComment(userVid, isHtml) {
	const url = `https://i.weread.qq.com/review/list?listType=6&userVid=${userVid}&rangeType=2&mine=1&listMode=1`
	getData(url, function (data) {
		var reviews = JSON.parse(data).reviews
		var htmlContent = "", content = "", title = ""
		//遍历书评
		for (let i = 0; i < reviews.length; i++) {
			let bid = reviews[i].review.bookId
			if (bid == bookId.toString()) {//找到对应书
				htmlContent = reviews[i].review.htmlContent
				content = reviews[i].review.content.replace("\n", "\n\n")
				title = reviews[i].review.title
				break
			}
		}
		if (htmlContent != "" || content != "" || title != "") {//有书评
			if (isHtml) {
				(title != "") ? copy(`# ${title}\n\n${htmlContent}`) : copy(htmlContent)
			} else {
				(title != "") ? copy(`### ${title}\n\n${content}`) : copy(content)
			}
		} else {
			sendAlertMsg({text: "该书无书评",icon:'warning'})
		}
	});
}

//获取目录:pupup
function copyContents(){
	isCopyContent = true;
	chrome.tabs.executeScript({ file: 'inject/inject-getContents.js' }, function (result) {
		catchErr("copyContents")
	})
}

//获取标注数据-data-getBookMarks.json
function getBookMarks(contents, callback) {
	const bookmarklistUrl = `https://i.weread.qq.com/book/bookmarklist?bookId=${bookId}`
	getData(bookmarklistUrl, function (data) {
		var json = JSON.parse(data)
		var marks = json.updated
		var chapters = json.chapters
		//检查书本是否有标注
		if(marks.length == 0){
			sendAlertMsg({text: "该书无标注",icon:'warning'})
			return
		}
		//处理包含标注但没有章节记录的情况（一般发生在导入书籍中）
		if(chapters.length == 0){
			const chapterInfoUrl = `https://i.weread.qq.com/book/chapterInfos?bookIds=${bookId}&synckeys=0`
			getData(chapterInfoUrl, function (data) {
				//得到目录
				chapters = JSON.parse(data).data[0].updated
				getChaptersWithMark(chapters)
			})
		}
		getChaptersWithMark(chapters)
		//章节排序
		function getChaptersWithMark(chaptersWithMark){
			colId = "chapterUid";
			chaptersWithMark.sort(rank);
			/* 生成标注数据 */
			//遍历章节
			for (let i = 0; i < chaptersWithMark.length; i++) {
				let chapterUid = chaptersWithMark[i].chapterUid.toString()
				let marksInAChapter = []
				let rangeArr = []
				//遍历标注获得章内标注
				for (let j = 0; j < marks.length; j++) {
					if (marks[j].chapterUid.toString() != chapterUid) {
						continue
					}
					marks[j].range = parseInt(marks[j].range.replace(/"(\d*)-\d*"/, "$1"))
					//获取"[插图]"索引
					rangeArr = rangeArr.concat(getRangeArrFrom(marks[j].range, marks[j].markText))
					marksInAChapter.push(marks[j])
				}
				//排序章内标注并加入到章节内
				colId = "range"
				marksInAChapter.sort(rank)
				chaptersWithMark[i].marks = marksInAChapter
				chaptersWithMark[i].rangeArr = rangeArr
			}
			if(Config.addThoughts){
				addThoughts(chaptersWithMark,contents,function(chaptersWithMark){
					callback(chaptersWithMark)
				})
			}else{
				callback(chaptersWithMark)
			}
		}
	});
}

//获取标注并复制标注到剪切板：popup
function copyBookMarks(all) {
	//请求需要追加到文本中的图片 Markdown 文本
	sendMessageToContentScript({isGetMarkedData:true})
	getContents(function(contents){
		getBookMarks(contents, function (chaptersAndMarks) {
			//得到res
			var res = ""
			if (all) {	//获取全书标注
				for (let i = 0; i < chaptersAndMarks.length; i++) {//遍历章节
					let chapterUid = chaptersAndMarks[i].chapterUid
					let title = contents[chapterUid].title
					let level = contents[chapterUid].level
					if(chaptersAndMarks[i].marks.length > 0){//检查章内是否有标注
						res += getTitleAddedPre(title, level) + "\n\n"
						res += traverseMarks(chaptersAndMarks[i].marks,all)
					}
				}
				copy(res)
			} else {	//获取本章标注
				//遍历目录
				for (let key in contents) {
					/* 寻找目标章节 */
					//某些书籍的 CurrentContent 比获取到的目录数据要多出章节信息（"第一章 CurrentContent"）
					//故添加 CurrentContent.indexOf(contents[key].title) > -1 进行判断
					if (contents[key].title == CurrentContent||CurrentContent.indexOf(contents[key].title) > -1) {
						res += getTitleAddedPre(contents[key].title, contents[key].level) + "\n\n"
						var chapterUid = key
						break
					}
				}
				//遍历标注
				for (let i = 0, len = chaptersAndMarks.length; i < len; i++) {
					//寻找目标章节并检查章内是否有标注
					let chapterAndMark = chaptersAndMarks[i]
					if (chapterAndMark.chapterUid == chapterUid && chapterAndMark.marks.length > 0) {
						//由 rangeArr 生成索引数组 indexArr
						let rangeArr = chapterAndMark.rangeArr
						rangeArr.sort(function(a, b){return a - b;})
						let indexArr = []
						for (let j = 0, index = -1; j < rangeArr.length; j++) {
							if(rangeArr[j] != rangeArr[j-1]){//与前一个range不同
								index++
								indexArr[j] = index
							}else{//与前一个range相同
								indexArr[j] = indexArr[j-1]
							}
						}
						let str = traverseMarks(chapterAndMark.marks,all,indexArr)
						res += str
						if(str)copy(res)//当str不为空（正确返回）时才复制
						break
					}
					//处理该章节无标注的情况
					if(i == len - 1) sendAlertMsg({text: "该章节无标注",icon:'warning'});
				}
			}
			//不排除 imgArr 获取失败，故保险起见将其设置为 []
			markedData = []
		})
	})
}

//获取热门标注
function getBestBookMarks(callback) {
	const url = `https://i.weread.qq.com/book/bestbookmarks?bookId=${bookId}`
	getData(url, function (data) {
		var json = JSON.parse(data)
		var chapters = json.chapters
		var items = json.items
		//处理书本无热门标注的情况
		if(chapters == undefined){
			sendAlertMsg({text: "该书无热门标注",icon:'warning'})
			return
		}
		//查找每章节热门标注
		var bestMarks = {}
		//遍历章节
		for (let i = 0; i < chapters.length; i++) {
			let chapterUid = chapters[i].chapterUid
			let bestMarksInAChapter = []
			//遍历所有热门标注
			for (let j = 0; j < items.length; j++) {
				if (items[j].chapterUid == chapterUid) {
					var markText = items[j].markText
					var totalCount = items[j].totalCount
					var range = items[j].range.replace(/"(\d*)-\d*"/, "$1")
					bestMarksInAChapter.push({ markText: markText, totalCount: totalCount, range: parseInt(range) })
				}
			}
			colId = "range"
			bestMarksInAChapter.sort(rank)
			bestMarks[chapterUid.toString()] = bestMarksInAChapter
		}
		callback(bestMarks)
	})
}

//处理数据，复制热门标注
function copyBestBookMarks() {
	getContents(function(contents){
		getBestBookMarks(function (bestMarks) {
			//得到res
			let res = ""
			//遍历bestMark
			for (let key in bestMarks) {
				let title = getTitleAddedPre(contents[key].title, contents[key].level)
				let item = bestMarks[key]
				res += `${title}\n\n`
				//遍历章内标注
				for (let j = 0; j < item.length; j++) {
					let markText = item[j].markText
					let totalCount = item[j].totalCount
					res += markText + (Config.displayN ? (`  <u>${totalCount}</u>`) : "") + "\n\n"
				}
			}
			copy(res)
		})
	})
}

//获取想法
function getMyThought(callback) {
	const url = `https://i.weread.qq.com/review/list?bookId=${bookId}&listType=11&mine=1&synckey=0&listMode=0`
	getData(url, function (data) {
		let json = JSON.parse(data)
		//获取章节并排序
		let chapterList = Array.from(new Set(data.match(/"chapterUid":[0-9]*/g)))
		colId = "chapterUid"
		chapterList.sort(rank)
		//查找每章节标注并总结好
		let thoughts = {}
		//遍历章节
		for (let i = 0; i < chapterList.length; i++) {
			let index = chapterList[i].indexOf(":")
			let chapterUid = chapterList[i].substring(index + 1)
			let thoughtsInAChapter = []
			//遍历所有想法，将章内想法放入一个数组
			for (const item of json.reviews) {
				//处理有书评的情况
				if (item.review.chapterUid == undefined) {
					continue
				}
				//找到指定章节的想法
				if (item.review.chapterUid.toString() == chapterUid) {
					let abstract = item.review.abstract
					//替换想法前后空字符
					let content = item.review.content.replace(/(^\s*|\s*$)/g,'')
					let range = item.review.range.replace(/"(\d*)-\d*"/, "$1")
					//如果没有发生替换（为章末想法时发生）
					if(item.review.range.indexOf('-') < 0){
						abstract = "章末想法";
						range = item.review.createTime;
					}
					thoughtsInAChapter.push({ abstract: abstract, content: content, range: parseInt(range) })
				}
			}
			colId = "range"
			thoughtsInAChapter.sort(rank)
			thoughts[chapterUid] = thoughtsInAChapter
		}
		callback(thoughts)
	});
}

//处理数据，复制想法
function copyThought() {
	getContents(function(contents){
		getMyThought(function (thoughts) {
			//得到res
			let res = ""
			//遍历thoughts——{chapterUid:[{abstract,content}]}
			for (let key in thoughts) {
				//遍历章节
				let title = getTitleAddedPre(contents[key].title, contents[key].level)
				res += title + "\n\n"
				//遍历章内想法
				for (var j = 0; j < thoughts[key].length; j++) {
					res += `${Config.thouMarkPre}${thoughts[key][j].abstract}${Config.thouMarkSuf}\n\n`
					res += `${Config.thouPre}${thoughts[key][j].content}${Config.thouSuf}\n\n`
				}
			}
			//处理书本无想法的请况
			if(!res){
				sendAlertMsg({text: "该书无想法",icon:'warning'})
				return
			}
			copy(res)
		})
	})
}

settingInitialize()

//监听消息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	let tabId = sender.tab.id
	switch(message.type){
		case "copyImg":
			copy(message.picText)
			break
		case "markedData":
			markedData = message.markedData
			break
		case "bookId":
			if(message.bid == "wrepub")bookId = importBookId;
			else bookId = message.bid;
			break
		case "getShelf":	//content-shelf.js 获取书架数据
			chrome.cookies.get({url: 'https://weread.qq.com/web/shelf', name: 'wr_vid'}, function (cookie) {
				if(!cookie)return
				getData(`https://i.weread.qq.com/shelf/sync?userVid=${cookie.value.toString()}&synckey=0&lectureSynckey=0`, function(data){
					sendMessageToContentScript(data,tabId)
				})
			})
			break
		case "injectCss":
			chrome.tabs.insertCSS(tabId,{ file: message.css },function(result){
				catchErr("chrome.tabs.insertCSS()")
			})
			break
		case "getContents":
			let contents = message.contents
			let res = ''
			//生成目录 res
			for (let i = 0; i < contents.length; i++) {
				let level = contents[i].charAt(0)
				let chapterInfo = contents[i].substr(1)
				res += getTitleAddedPre(chapterInfo, parseInt(level)) + "\n\n"
			}
			//如果为 popup 请求复制目录，则复制内容
			if(isCopyContent){
				copy(res)
				isCopyContent = false
			}
			//设置当前所在目录
			CurrentContent = message.currentContent
			break
		case "aler"://用于调试
			aler(message.message)
			break
		case "saveRegexpOptions"://保存直接关闭设置页时onchange未保存的信息
			updateStorageAreainBg(message.regexpSet)
			break
	}
})

//页面监测：是否在已打开页面之间切换
chrome.tabs.onActivated.addListener(function (moveInfo) {
	chrome.tabs.get(moveInfo.tabId, function (tab) {
		if(!catchErr("chrome.tabs.onActivated.addListener()")){
			switchTabActions(tab)
		}
	})
})

//页面监控：是否发生更新
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (changeInfo.status == "loading") {
		if(!catchErr("chrome.tabs.onUpdated.addListener()")){
			switchTabActions(tab)
		}
	}
})

//根据当前tab设置popup并判断是否需要注入inject-bid.js
function switchTabActions(tab){
	let currentUrl = tab.url
	let list = currentUrl.split('/')
	let isBookPage = false
	if (list.length > 5 && list[2] == "weread.qq.com" && list[3] == "web" && list[4] == "reader" && list[5] != "") {
		isBookPage = true;
	}
	if (!isBookPage) {//如果当前页面为其他页面
		chrome.browserAction.setPopup({ popup: '' })
	} else {
		//注入脚本获取全部目录数据和当前目录
		chrome.tabs.executeScript(tab.id, { file: 'inject/inject-getContents.js' }, function (result) {
			catchErr("switchTabActions(tab)：inject-getContents")
		})
		//注入脚本获取 bookId
		chrome.tabs.executeScript(tab.id, { file: 'inject/inject-bid.js' }, function (result) {
			catchErr("switchTabActions(tab)：inject-bid")
		})
		//注入脚本开启 right click
		chrome.storage.sync.get(['enableRightClick'],function(result){
			catchErr("switchTabActions(tab)：inject-enableRightClick")
			if(result.enableRightClick){
				chrome.tabs.executeScript(tab.id, { file: 'inject/inject-enableRightClick.js' }, function (result) {
					catchErr("switchTabActions(tab)：inject-enableRightClick")
				})
			}
		})
		chrome.browserAction.setPopup({ popup: 'popup/popup.html' })
	}
}