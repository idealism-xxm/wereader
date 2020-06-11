//用于获取书本目录
console.log("inject-contents.js被注入，开始获取目录");
var contentElement = document.getElementsByClassName("readerCatalog_list")[0];
try{
    var childs = contentElement.childNodes;
    var childsLength = childs.length;
    var texts = [];
    for (var i = 0; i < childsLength; i++){
        var classname = childs[i].childNodes[0].className;
        var level = classname.charAt(classname.length - 1);
        var innerHtml = childs[i].childNodes[0].childNodes[0].innerHTML;
        texts.push(level + innerHtml);
    }
    var currentContent = ""
    if(document.getElementsByClassName("readerTopBar_title_chapter")[0] != undefined){
        currentContent = document.getElementsByClassName("readerTopBar_title_chapter")[0].innerHTML;
    }else{
        currentContent = document.getElementsByClassName("chapterItem chapterItem_current")[0].childNodes[0].childNodes[0].innerHTML
    }
    console.log("inject-contents.js获取目录成功")
    //传消息给后台
    chrome.runtime.sendMessage({getContents: true, contents: texts,currentContent:currentContent}, function(response) {
        console.log('收到来自后台的回复：' + response);
});
}catch{
    console.log("inject-contents.js获取目录失败")
}
