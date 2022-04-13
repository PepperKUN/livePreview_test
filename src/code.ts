import { dispatch, handleEvent } from './codeMessageHandler';

//deepL相关
let deepl_auth_key: string = '110d13ba-5974-7027-e383-dcf2a747a102:fx';
let deepl_api_url: string = 'https://api-free.deepl.com/v2/translate';
let deepl_api_content_type: string = 'application/x-www-form-urlencoded';

//router_message_type
//tipStatus
//reqTranslate (一次事务可能会发送很多次, 但是ui那里只负责处理，不关心事务组织，全部由TS这里完成封装和控制)

const supported_lang: string[] = [
  'BG',//- Bulgarian
  'CS',//- Czech
  'DA',//- Danish
  'DE',//- German
  'EL',//- Greek
  'EN',//- English
  'ES',//- Spanish
  'ET',//- Estonian
  'FI',//- Finnish
  'FR',//- French
  'HU',//- Hungarian
  'IT',//- Italian
  'JA',//- Japanese
  'LT',//- Lithuanian
  'LV',//- Latvian
  'NL',//- Dutch
  'PL',//- Polish
  'PT',//- Portuguese (all Portuguese varieties mixed)
  'RO',//- Romanian
  'RU',//- Russian
  'SK',//- Slovak
  'SL',//- Slovenian
  'SV',//- Swedish
  'ZH',//- Chinese
];

const support_lang_desc: string[] = [
  'Bulgarian',
  'Czech',
  'Danish',
  'German',
  'Greek',
  'English',
  'Spanish',
  'Estonian',
  'Finnish',
  'French',
  'Hungarian',
  'Italian',
  'Japanese',
  'Lithuanian',
  'Latvian',
  'Dutch',
  'Polish',
  'Portuguese',
  'Romanian',
  'Russian',
  'Slovak',
  'Slovenian',
  'Swedish',
  'Chinese',
];

let fontNames: FontName[] = undefined;

//font相关
async function loadFonts() {

  let handler: NotificationHandler = figma.notify('自动加载当前页面字体中，请勿操作...', { timeout: 500, error: true })

  await Promise.all(fontNames.map(async (font) => figma.loadFontAsync(font))).then(() => {
    handler.cancel;
    // postMessage({ type: 'alert', content: '字体加载完成! 可以开始翻译'})
    dispatch('alert', {content: '字体加载完成! 可以开始翻译'})
    // figma.notify('字体加载完成! 可以开始翻译')
  }).catch(e => {
    handler.cancel;

    let errorContent: string = e + ", 请先手动安装字体后, 再次打开插件";
    console.error(errorContent)
    // postMessage({ type: 'alert', content: errorContent, opType: 'ClosePlugin' })
    dispatch('alert', {content: errorContent, opType: 'ClosePlugin'})
  });

  // await figma.loadFontAsync({ family: "Roboto", style: "Regular" })
  // await figma.loadFontAsync({ family: "Roboto", style: "Bold" })
  // await figma.loadFontAsync({ family: "PGyoIWA-HW-Bd", style: "Regular" })
  // await figma.loadFontAsync({ family: "HGSeikaishotaiPRO", style: "Medium" })
  // await figma.loadFontAsync({ family: "FZBeiWeiKaiShu-S19", style: "Regular" })
  // await figma.loadFontAsync({ family: "Microsoft YaHei", style: "Regular" })
  // await figma.loadFontAsync({ family: "Inter", style: "Regular" })
}

//curl -H "Authorization: DeepL-Auth-Key 110d13ba-5974-7027-e383-dcf2a747a102:fx" https://api-free.deepl.com/v2/usage

let reqCount: number = 0;
let reqResCount: number = 0;

// en, ZH, ... 参考这里 https://www.deepl.com/docs-api/translating-text/request/ 
let sourceZoneID: string = '';
let targetZoneIDs: string[] = [''];

let trimFlag: boolean = false;

interface ResultsOfTextNode {
  node_id: string,
  content: string,
  target_id: string
}
//{ id:string, content:string, target_id: string}
let resultsOfTextNode: ResultsOfTextNode[] = [];

// 一次请求最大的数组长度
const constReqArrayMaxNumber = 40;

interface ToTranslateReq {
  req_id: number,
  req_contents: string[],
  req_target_id: string,
  req_parameters: string,
  req_resultsOfTextNodeIndex: number
}
// 带req id的翻译数组 (constReqArrayMaxNumber)， 消息回来时，也根据req_id找到target_id。req_resultsOfTextNodeIndex 作用是反向索引resultsOfTextNode
let toTranslateReq: ToTranslateReq[] = [];

// searchForCollectFontLibs(figma.currentPage);

// figma.on("run", async ({ parameters }: RunEvent) => {
//   await loadFonts()
// });

// startUI();

// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
// async function startUI() {

//   figma.showUI(__html__);

//   // Calls to "parent.postMessage" from within the HTML page will trigger this
//   // callback. The callback will be passed the "pluginMessage" property of the
//   // posted message.

//   figma.ui.onmessage = msg => {
//     //{ type: 'Change-Translate-Target', source_id: 'ZH', target_id: 'en' }
//     //{ type: 'Change-Translate-TargetSet', source_id: 'ZH', target_ids: 'en' }
//     //{ type: 'Translate-Complete', content: obj.translations, req_id: message.req_id }
//     logInfoTrace(['>>>=== figma.ui.onmessage', msg], false);

//     // TODO , 这里的msg应该有一个表来记录, 避免弄混了. 最好是有自动生成
//     // One way of distinguishing between different types of messages sent from
//     // your HTML page is to use an object with a "type" property like this.
//     if (msg.type === 'Create-rectangles') {
//       const nodes: SceneNode[] = [];
//       for (let i = 0; i < msg.count; i++) {
//         let nodes_rect = [];

//         const rect = figma.createRectangle();
//         rect.x = i * 150;
//         rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
//         nodes.push(rect);

//         const label = createText('test', 24);
//         // label.resizeWithoutConstraints(right - left + 100, 50)

//         nodes_rect.push(rect);
//         nodes_rect.push(label);

//         figma.group(nodes_rect, figma.currentPage);

//         label.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
//         label.characters = 'test';
//         label.fontSize = 30
//         label.textAlignHorizontal = 'CENTER'
//         label.textAlignVertical = 'BOTTOM'
//         label.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }
//       }

//       figma.currentPage.selection = nodes;
//       figma.viewport.scrollAndZoomIntoView(nodes);
//     }
//     else if (msg.type === 'Figma-Op') {
//       if (msg.content === 'ClosePlugin') {
//         figma.closePlugin();
//       }
//     }
//     //查找所有字符, 做测试用, 也顺便检查字体
//     //{ type: 'Search-all-charaters', source_id: 'ZH', target_ids: ['EN', 'JA', ...]}
//     else if (msg.type === 'Search-all-charaters') {
//       resetControlParameter();

//       sourceZoneID = msg.source_id;
//       targetZoneIDs = msg.target_ids;

//       let suc: boolean = searchAndSetupReq(msg, resultsOfTextNode, sourceZoneID, targetZoneIDs, toTranslateReq);

//       if (!suc) {
//         figma.closePlugin();
//         return;
//       }

//       // postMessage({ type: 'tipStatus', content: '搜索完成', result: 'Done' })
//       dispatch('tipStatus', {content: '搜索完成', result: 'Done'})
//     }
//     // type: 'Change-Translate-Selection-Targets', source_id: 'EN', target_ids: [ 'ZH', 'JA', ...]
//     else if (msg.type === 'Change-Translate-Selection-Targets') {
//       resetControlParameter();

//       let suc: boolean = searchAndSetupReq(msg, resultsOfTextNode, sourceZoneID, targetZoneIDs, toTranslateReq);

//       if (!suc) {
//         figma.closePlugin();
//         return;
//       }

//       //依次发送req
//       toTranslateReq.forEach(element => {
//         //控制管理
//         reqCount += 1;
//         // postMessage({ type: 'reqTranslate', url: deepl_api_url, content_type: deepl_api_content_type, parameters: element.req_parameters, req_head: { req_id: element.req_id, req_array_len: element.req_contents.length, req_resultsIndex: element.req_resultsOfTextNodeIndex } });
//         dispatch('reqTranslate', {url: deepl_api_url, content_type: deepl_api_content_type, parameters: element.req_parameters, req_head: { req_id: element.req_id, req_array_len: element.req_contents.length, req_resultsIndex: element.req_resultsOfTextNodeIndex } })
//       });

//       // postMessage({ type: 'tipStatus', content: '翻译中...', result: 'Doing'})
//       dispatch('tipStatus', {content: '翻译中...', result: 'Doing'})
//     }
//     else if (msg.type === 'Change-Translate-Target') {

//       targetZoneIDs = msg.target_id;
//       sourceZoneID = msg.source_id;

//       //每次翻译前清空一次
//       resetControlParameter();

//       // searchForText(figma.currentPage, resultsOfTextNode);

//       // //如果target 为 all，则是要把选中节点找出来，再clone对应全部支持的语言，一次发送去翻译，回来后根据翻译语言的ID来修改对应clone节点)

//       // assembleTranslationContent(toTranslateReq, targetZoneID, sourceZoneID);

//       // for (let index = 0; index < toTranslateReq.length; index++) {
//       //   const element = toTranslateReq[index];

//       //   //控制管理
//       //   reqCount += 1;
//       //   postMessage({ type: 'reqTranslate', url: deepl_api_url, content_type: deepl_api_content_type, parameters: element.req_parameters, req_id: element.req_id });
//       // }

//       // postMessage({ type: 'tipStatus', content: '翻译中...' })
//     }
//     else if (msg.type === 'Translate-Complete') {
//       //控制管理
//       reqResCount += 1;

//       let _content = `进度：${reqResCount} / ${reqCount}`;

//       //一次请求事务全部完成
//       if (reqResCount === reqCount) {
//         logInfoTrace(['Translate Done!!!!!!!!!!!'])

//         // postMessage({ type: 'tipStatus', content: '翻译完成! ' + _content, result: 'Done' })
//         dispatch('tipStatus', {content: '翻译完成! ' + _content, result: 'Done'})
//       }
//       else {
//         // postMessage({ type: 'tipStatus', content: _content})
//         dispatch('tipStatus', {content: _content})
//       }

//       //找到对应位置进行替换
//       replaceTranslated(msg.content, msg.req_head.req_resultsIndex, msg.req_head.req_array_len, resultsOfTextNode);
//     }
//     else if (msg.type === 'Translate-Clones') {

//     }
//     else if (msg.type === 'Cancel') {
//       figma.closePlugin();
//     }

//     // Make sure to close the plugin when you're done. Otherwise the plugin will
//     // keep running, which shows the cancel button at the bottom of the screen.

//     //figma.closePlugin();
//   };
// }

figma.showUI(__html__, {width: 300, height: 500});

handleEvent('Create-rectangles', msg => {
  const nodes: SceneNode[] = [];
  for (let i = 0; i < msg.count; i++) {
    let nodes_rect = [];

    const rect = figma.createRectangle();
    rect.x = i * 150;
    rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
    nodes.push(rect);

    const label = createText('test', 24);
    // label.resizeWithoutConstraints(right - left + 100, 50)

    nodes_rect.push(rect);
    nodes_rect.push(label);

    figma.group(nodes_rect, figma.currentPage);

    label.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
    label.characters = 'test';
    label.fontSize = 30
    label.textAlignHorizontal = 'CENTER'
    label.textAlignVertical = 'BOTTOM'
    label.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }
  }

  figma.currentPage.selection = nodes;
  figma.viewport.scrollAndZoomIntoView(nodes);
})

handleEvent('Figma-Op', msg => {
  if (msg.content === 'ClosePlugin') {
    figma.closePlugin();
  }
})

handleEvent('Search-all-charaters', async() => {
  searchForCollectFontLibs(figma.currentPage);
  await loadFonts();
})

handleEvent('Change-Translate-Selection-Targets', msg => {
  resetControlParameter();

  let suc: boolean = searchAndSetupReq(msg, resultsOfTextNode, sourceZoneID, targetZoneIDs, toTranslateReq);

  if (!suc) {
    figma.closePlugin();
    return;
  }

  //依次发送req
  toTranslateReq.forEach(element => {
    //控制管理
    reqCount += 1;
    dispatch('reqTranslate', {url: deepl_api_url, content_type: deepl_api_content_type, parameters: element.req_parameters, req_head: { req_id: element.req_id, req_array_len: element.req_contents.length, req_resultsIndex: element.req_resultsOfTextNodeIndex } })
  });

  dispatch('tipStatus', {content: '翻译中...', result: 'Doing'})
})

handleEvent('Change-Translate-Target', msg => {
  targetZoneIDs = msg.target_id;
  sourceZoneID = msg.source_id;

  //每次翻译前清空一次
  resetControlParameter();
})

handleEvent('Translate-Complete', msg => {
  //控制管理
  reqResCount += 1;

  let _content = `进度：${reqResCount} / ${reqCount}`;

  //一次请求事务全部完成
  if (reqResCount === reqCount) {
    logInfoTrace(['Translate Done!!!!!!!!!!!'])

    // postMessage({ type: 'tipStatus', content: '翻译完成! ' + _content, result: 'Done' })
    dispatch('tipStatus', {content: '翻译完成! ' + _content, result: 'Done'})
  }
  else {
    // postMessage({ type: 'tipStatus', content: _content})
    dispatch('tipStatus', {content: _content})
  }

  //找到对应位置进行替换
  replaceTranslated(msg.content, msg.req_head.req_resultsIndex, msg.req_head.req_array_len, resultsOfTextNode);
})

handleEvent('Cancel', () => {
  figma.closePlugin();
})

//DOM遍历操作
// This is a generator that recursively produces all the nodes in subtree
// starting at the given node
function* walkTree(node) {
  yield node; //return {value:node, done:false}
  let children = node.children;
  if (children) {
    for (let child of children) {
      yield* walkTree(child) //return { value:function*, done:false }
    }
  }

  //return {done:true}
}

//搜集全部lib
function searchForCollectFontLibs(rootNode: BaseNode) {
  logInfoTrace(['function searchForCollectFontLibs']);

  fontNames = [];

  let walker = walkTree(rootNode);

  function processOnce() {
    let res

    while (!(res = walker.next()).done) {
      let node: TextNode = res.value;

      if (node.type === 'TEXT') {
        let appendingFontNames: FontName[] = node.getRangeAllFontNames(0, node.characters.length);
        let setFontNames: FontName[] = [];

        appendingFontNames.forEach(element_appending => {
          // logInfoTrace([element_appending])
          let result: FontName = fontNames.find((element) => {
            // logInfoTrace([element])
            return element.family === element_appending.family && element.style === element_appending.style;
          })

          if (result === undefined) {
            setFontNames.push(element_appending);
          }
        });

        fontNames = fontNames.concat(setFontNames);
      }
    }
  }

  processOnce();

  logInfoTrace(fontNames)
}

//只找Text控件, 但本身无法确定target_id
function searchForText(rootNode: BaseNode, _resultsOfTextNode: ResultsOfTextNode[], append_target_id: string) {
  logInfoTrace(['function searchForText']);

  //TODO 后面扩展为遍历某个workspace下的所有page
  let walker = walkTree(rootNode);

  function processOnce() {
    let res
    while (!(res = walker.next()).done) {
      let node = res.value;

      if (node.type === 'TEXT') {
        let characters = node.characters;

        //尝试先修改一次，找出缺失字体
        try {
          node.characters = 'test';
        } catch (error) {
          console.log('%s, %s', error.message, error.stack)
          continue;
        }

        node.characters = characters;

        if (characters === '') continue;

        const foundIndex = _resultsOfTextNode.findIndex(element => element.node_id === node.id);

        if (foundIndex != -1) {
          //奇怪为啥又找到了?再插入一次吧,报个警
          console.warn('node found again %s', new Error().stack);
          _resultsOfTextNode[foundIndex] = { node_id: node.id, content: characters, target_id: append_target_id }
        }
        else {
          _resultsOfTextNode.push({ node_id: node.id, content: characters, target_id: append_target_id })
        }
      }
    }
  }

  processOnce();

  //根据results内容, 打印搜集到的结果
  logInfoTrace(['_resultsOfTextNode', _resultsOfTextNode])
}

// source : {"translations":[{"detected_source_language":"EN","text":"你好，世界!"},{"detected_source_language":"EN","text":"你好，OMG，来吧，宝贝!"}]}
function replaceTranslated(source: { detected_source_language: string, text: string }[],
  replace_index: number,
  replace_len: number,
  _resultsOfTextNode: ResultsOfTextNode[]) {

  logInfoTrace(['function replaceTranslated']);

  if (replace_len != source.length) {
    logInfoTrace(['replace_len != source.length']);
    return;
  }

  for (let index = replace_index, req_array_index = 0;
    index < _resultsOfTextNode.length && req_array_index < replace_len;
    index++, req_array_index++) {

    const element = _resultsOfTextNode[index];
    const replaceContent = source[req_array_index];

    //找出对应node, 然后进行替换
    let node = figma.getNodeById(element.node_id);
    // console.log(node);

    if (node.type != 'TEXT') {
      console.error('%s is not a TEXT, content is %s', element.node_id, element.content);
      continue;
    }

    node.characters = replaceContent.text;
    console.log('%s, %s -> %s', node.id, node.characters, replaceContent.text);
  }
}

//组合成一个数组
function assembleTranslationContent(_toTranslateReq: ToTranslateReq[], _sourceZoneID: string, _resultsOfTextNode: ResultsOfTextNode[]) {
  // console.log('function assembleTranslationContent');

  let reqArrayIndex = 0;
  let reqID = 0;
  let temp_req_contents: string[] = [];

  for (let index = 0; index < _resultsOfTextNode.length; index++, reqArrayIndex++) {
    const element = _resultsOfTextNode[index];

    let resetFlag: boolean = false;
    //如果上一次的target_id和当前的不一样,则说明要清空了
    if (index > 0) {
      if (_resultsOfTextNode[index - 1].target_id != _resultsOfTextNode[index].target_id) {
        resetFlag = true;
      }
    }

    if (!resetFlag) {
      reqArrayIndex = reqArrayIndex % constReqArrayMaxNumber;
    }
    else {
      reqArrayIndex = 0;
    }

    //每一次反转，则增加1
    if (reqArrayIndex === 0) {
      //反转前清空一次
      temp_req_contents = [];

      _toTranslateReq[reqID] = {
        req_id: reqID,
        req_contents: temp_req_contents,
        req_target_id: element.target_id,
        req_parameters: '',
        req_resultsOfTextNodeIndex: index
      };

      reqID++;
    }

    temp_req_contents[reqArrayIndex] = element.content;
  }

  //每完成一个请求组包,再进行一次URL的参数组装
  for (let index = 0; index < _toTranslateReq.length; index++) {
    const element = _toTranslateReq[index];

    _toTranslateReq[index].req_parameters = assembleDeepLParameters(deepl_auth_key, _toTranslateReq[index].req_contents, element.req_target_id, _sourceZoneID);
  }
}

function assembleDeepLParameters(auth_key: string, texts: string[], target_lang: string, source_lang?: string): string {
  if (texts.length === 0) {
    console.assert(false, 'assembleDeepLParameters, text.length === 0!');
    return '';
  }

  let parameters = 'auth_key=' + encodeURI(auth_key);

  for (let index = 0; index < texts.length; index++) {
    const element = texts[index];

    parameters += '&text=' + element;
  }

  parameters += '&target_lang=' + target_lang;

  if (source_lang) {
    parameters += '&source_lang=' + source_lang;
  }

  //添加一些默认的参数  ref https://www.deepl.com/zh/docs-api/handling-xml/restricting-splitting/
  //parameters += '&split_sentences=0';
  //parameters += '&tag_handling=xml'

  let encodeParameters = encodeURI(parameters);

  console.log('%s encodeURI-> %s', parameters, encodeParameters);

  return encodeParameters;
}

function postMessage(object: any) {
  logInfoTrace(['===>>>, figma.ui.postMessage > ui.html', object]);
  figma.ui.postMessage(object);
}

function createText(characters: string, size: number) {
  const text = figma.createText()
  text.fontName = { family: 'Roboto', style: 'Regular' }
  text.characters = characters
  text.fontSize = size
  return text
}

function checkSupportedLang(targets: string[]): boolean {
  targets.forEach(element => {
    if (undefined === supported_lang.find((element_sup) => element_sup === element.toUpperCase())) {
      console.error('no support target: %s', element);
      return false;
    }
  });

  return true;
}

//返回 BaseNode, 这些都是clone出来的root节点
function cloneSelectionNodeAndSearchForText(targetIds: string[], _resultsOfTextNode: ResultsOfTextNode[]) {
  let newGroup: BaseNode[] = [];

  if (figma.currentPage.selection.length === 0) {
    logInfoTrace(['cloneSelectionNodeAndSearchForText, but no selection!']);
    return;
  }

  //如果有选择，则按size进行clone，并且维护一个
  let size: number = targetIds.length;

  figma.currentPage.selection.forEach(element => {
    for (let index = 0; index < size; index++) {
      let newNode: SceneNode = element.clone();
      newNode.x = element.x + (element.width + 20) * (index + 1);

      //把翻译语言，显示出来
      let name: string = element.name + '/ ' + support_lang_desc[index];
      newNode.name = name;

      searchForText(newNode, _resultsOfTextNode, targetIds[index]);

      figma.currentPage.appendChild(newNode);
      //newGroup.push(newNode);
    }
  });

  //figma.group(newGroup, figma.currentPage)
}

function searchAndSetupReq(msg: any,
  _resultsOfTextNode: ResultsOfTextNode[],
  _sourceZoneID: string,
  _targetZoneIDs: string[],
  _toTranslateReq: ToTranslateReq[]) {

  _sourceZoneID = msg.source_id;
  _targetZoneIDs = msg.target_ids;

  if (!checkSupportedLang(_targetZoneIDs)) {
    return false;
  }

  let selectionSearch: boolean = (figma.currentPage.selection.length > 0) ? true : false;

  //检查是否有选择节点， 如果有，则默认创建传入参数(target)数量的node, 并完成搜索
  if (selectionSearch) {
    cloneSelectionNodeAndSearchForText(_targetZoneIDs, _resultsOfTextNode);
    logInfoTrace(['cloneSelectionNodeAndSearchForText, _resultsOfTextNode', _resultsOfTextNode]);
  }
  else {
    if (_targetZoneIDs.length > 1) {
      logInfoTrace(['???!selectionSearch, but _targetZoneIDs.length > 1']);
      return false;
    }
    searchForText(figma.currentPage, _resultsOfTextNode, _targetZoneIDs[0]);
    logInfoTrace(['searchForText, _resultsOfTextNode:', _resultsOfTextNode]);
  }

  //根据targetIDs来组装请求数据
  assembleTranslationContent(_toTranslateReq, _sourceZoneID, _resultsOfTextNode);
  logInfoTrace(['assembleTranslationContent, _toTranslateReq:', _toTranslateReq]);

  return true;
}

function resetControlParameter() {
  //每次翻译前清空一次
  resultsOfTextNode = [];
  reqCount = 0;
  reqResCount = 0;
}


/////////// 一些有用的帮助函数， 自己造轮子， 后面改成export
function logInfoTrace(input: any[], printStackTrace: boolean = true) {
  let st: Error = new Error()
  st.name = 'StackTrace'

  console.log(input)

  if (printStackTrace) {
    console.log(st)
  }
}
