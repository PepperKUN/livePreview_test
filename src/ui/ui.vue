<template>
  <div class="trans_ui">
      <ul class="langList">
        <li class="langList_title">
          <div class="lang_des label">语言</div>
          <div class="source_des label">翻译来源</div>
          <div class="operator_des"></div>
        </li>
        <li v-for="(list, index) of selectedLangs" :key="'list_'+index">
          <div class="menu_lang">
            <select class="" v-model="list.lang">
              <option v-for="(lang, index) of langOptions" :key="'lang_'+index" :value="lang.key" :selected='lang.key==list.lang'>{{lang.label}}</option>
            </select>
          </div>
          <div class="menu_source">
            <select class="" v-model="list.source">
              <option v-for="(source, index) of sourceOptions" :key="'src_'+index" :value="source" :selected='source==list.source'>{{source}}</option>
            </select>
          </div>
          <div class="icon-button" @click="removeLang(index)">
            <div class="icon icon--minus"></div>
          </div>
        </li>
      </ul>
      <div class="general_operator">
        <div class="lang_add" @click="addLang">
          <div class="icon icon--plus"></div>
          <span>添加</span>
        </div>
        <div class="button_wrap_flex">
          <button class="button button--secondary" @click="searchAllChar">初始化字体</button>
          <button class="button button--primary" @click="targetAll">翻译</button>
        </div>
      </div>
  </div>
</template>


<script>
import styles from 'figma-plugin-ds/dist/figma-plugin-ds.css'
import './css/translator.css'
import {
  dispatch,
  handleEvent
} from "./uiMessageHandler";


export default {
  data() {
    return {
      contentText: '',
      langOptions: [
        {key:'BG', label:'保加利亚语'},//- Bulgarian
        {key:'cs', label:'捷克语'},//- Czech
        {key:'DA', label:'丹麦语'},//- Danish
        {key:'DE', label:'德语'},//- German
        {key:'EL', label:'希腊语'},//- Greek
        {key:'EN', label:'英语'},//- English
        {key:'ES', label:'西班牙语'},//- Spanish
        {key:'ET', label:'爱沙尼亚语'},//- Estonian
        {key:'FI', label:'芬兰语'},//- Finnish
        {key:'FR', label:'法语'},//- French
        {key:'HU', label:'匈牙利语'},//- Hungarian
        {key:'IT', label:'意大利语'},//- Italian
        {key:'JA', label:'日语'},//- Japanese
        {key:'LT', label:'立陶宛语'},//- Lithuanian
        {key:'LV', label:'拉脱维亚语'},//- Latvian
        {key:'NL', label:'荷兰语'},//- Dutch
        {key:'PL', label:'波兰语'},//- Polish
        {key:'PT', label:'葡萄牙语'},//- Portuguese (all Portuguese varieties mixed)
        {key:'RO', label:'罗马尼亚语'},//- Romanian
        {key:'RU', label:'俄语'},//- Russian
        {key:'SK', label:'斯洛伐克语'},//- Slovak
        {key:'SL', label:'斯洛维尼亚语'},//- Slovenian
        {key:'SV', label:'瑞典语'},//- Swedish
        {key:'ZH', label:'中文'},//- Chinese
      ],
      sourceOptions: ['自动翻译','有道翻译','腾讯翻译','搜狗翻译','Google翻译'],
      selectedLangs: [{lang:'EN', source:'自动翻译'}, {lang:'DE', source:'自动翻译'}],

    }
  },
  methods: {
    sizeChange() {
      this.$emit('resize');
    },
    removeLang(idx) {
      this.selectedLangs.splice(idx, 1);
      console.log(this.selectedLangs);
      this.sizeChange();
    },
    addLang() {
      const noSelectedOptions = JSON.parse(JSON.stringify(this.langOptions));
      this.selectedLangs.forEach(el => {
        const idx = noSelectedOptions.findIndex(element => element.key === el.lang);
        if(idx>-1) noSelectedOptions.splice(idx,1);
      })
      this.selectedLangs.push({lang:noSelectedOptions[0].key, source: '自动翻译'});
      console.log(noSelectedOptions);
      this.sizeChange();
    },
    searchAllChar() {
      dispatch('Search-all-charaters')
    },
    targetAll() {
      const targets = [];
      this.selectedLangs.forEach(el => {
        targets.push(el.lang);
      })
      console.log(targets);
      dispatch('Change-Translate-Selection-Targets', {source_id: 'zh', target_ids: targets})
    }
  },
  mounted() {
    // this.searchAllChar();
    handleEvent('tipStatus', (text) => this.contentText = text);
    handleEvent('reqTranslate', (data) => {
      //发送给API, 进行翻译
      const xhr = new XMLHttpRequest();
      // console.log(data);

      xhr.addEventListener("readystatechange", function () {
        if (this.readyState === this.DONE) {
          // console.log(this.responseText);

          //VM6910:39 {"translations":[{"detected_source_language":"EN","text":"你好，世界!"},{"detected_source_language":"EN","text":"你好，OMG，来吧，宝贝!"}]}
          let obj = JSON.parse(this.responseText);
          
          dispatch('Translate-Complete', {content: obj.translations, req_head: data.req_head})
        }
      });

      xhr.open('POST', data.url);
      xhr.setRequestHeader('content-type', data.content_type);
      let parameters = data.parameters;

      xhr.send(parameters);
    })
  }
}
</script>

<style scoped>
  .icon--plus{
    background-image: url("data:image/svg+xml;charset=utf8,%3Csvg fill='none' height='32' width='32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15.5 15.5v-5h1v5h5v1h-5v5h-1v-5h-5v-1z' fill='%2318A0FB'/%3E%3C/svg%3E");
  }
</style>