import $ from 'jquery';

import { updateStorageArea } from './options-utils';
import {
	CheckBoxIds,
	InputIds,
} from './options-var';

/********************* 当前设置初始化 *********************/
function initCurrentConfig(setting: { [x: string]: any; selectAction?: any }) {
	/** "标注、标题、想法、代码块" input 事件，
	 * "是否显示热门标注人数"、"标注添加想法" CheckBox 点击事件
	 */
	const inputAndCheckBoxIds = InputIds.concat(CheckBoxIds)
	for(let i=0;i<inputAndCheckBoxIds.length;i++){
		let id = inputAndCheckBoxIds[i]
		let element = document.getElementById(id)! as HTMLInputElement
		let isInput = InputIds.indexOf(id) > -1
		isInput ? element.value = setting[id] : element.checked = setting[id]
		$(element).on('change', function(){
			let key = this.id
			let value = isInput ? this.value : this.checked
			updateStorageArea({key: key, value: value})
		})
	}
	/* "自动标注"选项 */
	const targetOption = document.getElementById(setting.selectAction) as HTMLOptionElement
	if(setting.selectAction && targetOption){
		targetOption.selected =true;
	}
	const selectActionOptions = $("#selectActionOptions") as JQuery<HTMLSelectElement>;
	selectActionOptions.on('change', function(){
		let options = this.options
		for (let i=0; i<options.length; i++){
			if(options[i].selected == true){
				updateStorageArea({key:"selectAction",value:options[i].id})
			}
		}
	})
	/* "想法所对应文本被标注时保留"选项 */
	const targetThouOption = document.getElementById(setting.thoughtTextOptions) as HTMLOptionElement
	if(setting.thoughtTextOptions && targetThouOption){
		targetThouOption.selected =true;
	}
	const thoughtTextOptions = $("#thoughtTextOptions") as JQuery<HTMLSelectElement>;
	thoughtTextOptions.on('change', function(){
		let options = this.options
		for (let i=0; i<options.length; i++){
			if(options[i].selected == true){
				updateStorageArea({key:"thoughtTextOptions", value: options[i].id});
			}
		}
	})
}

export { initCurrentConfig };