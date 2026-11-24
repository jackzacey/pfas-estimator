/* Shared keyboard-accessible language picker. Local UI; no external services. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SiteLanguageMenu=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const languages=[['en','English','English'],['zh','简体中文','Simplified Chinese'],['es','Español','Spanish'],['hi','हिन्दी','Hindi'],['ar','العربية','Arabic']];
  function mount(root,selected,onChange){
    if(!root)return null;
    root.classList.add('site-language-menu');
    const button=document.createElement('button');button.type='button';button.className='language-menu-trigger';
    button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
    const label=document.createElement('span'),value=document.createElement('bdi'),arrow=document.createElement('span');
    arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');button.append(label,value,arrow);
    const panel=document.createElement('div');panel.className='language-menu-panel';panel.id=root.id+'Options';panel.hidden=true;panel.setAttribute('role','listbox');
    button.setAttribute('aria-controls',panel.id);
    const options=languages.map(([code,native,english])=>{
      const option=document.createElement('button');option.type='button';option.className='language-menu-option';option.dataset.language=code;option.setAttribute('role','option');option.tabIndex=-1;
      const name=document.createElement('bdi');name.textContent=native;name.lang=code==='zh'?'zh-Hans':code;option.append(name);
      if(native!==english){const hint=document.createElement('span');hint.className='language-menu-hint';hint.textContent=english;hint.lang='en';hint.dir='ltr';option.append(hint);}
      option.addEventListener('click',()=>{close(true);if(code!==selected)onChange(code);});panel.append(option);return option;
    });
    root.replaceChildren(button,panel);
    const close=focus=>{panel.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();};
    const position=()=>{
      const host=root.getBoundingClientRect(),box=panel.getBoundingClientRect(),width=document.documentElement.clientWidth;
      const left=Math.max(12,Math.min(host.right-box.width,width-box.width-12));
      panel.style.insetInlineStart='auto';panel.style.insetInlineEnd='auto';panel.style.right='auto';panel.style.left=(left-host.left)+'px';
    };
    const open=()=>{panel.hidden=false;button.setAttribute('aria-expanded','true');position();options.find(o=>o.dataset.language===selected)?.focus();};
    button.addEventListener('click',()=>panel.hidden?open():close(false));
    button.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();open();if(event.key==='Home')options[0].focus();if(event.key==='End')options.at(-1).focus();}if(event.key==='Escape')close(false);});
    panel.addEventListener('keydown',event=>{
      const index=options.indexOf(document.activeElement);
      if(event.key==='Escape'){event.preventDefault();close(true);}
      else if(event.key==='Tab')close(true);
      else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus();
      }
    });
    document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close(false);});
    root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))close(false);});
    window.addEventListener('resize',()=>{if(!panel.hidden)position();});
    function set(code){
      selected=languages.some(l=>l[0]===code)?code:'en';
      label.textContent=selected==='zh'?'当前语言：':selected==='es'?'Idioma actual:':selected==='hi'?'वर्तमान भाषा:':selected==='ar'?'اللغة الحالية:':'Current Language:';
      value.textContent=languages.find(l=>l[0]===selected)[1];
      panel.setAttribute('aria-label',selected==='hi'?'भाषा चुनें':selected==='ar'?'اختر اللغة':selected==='zh'?'选择语言':selected==='es'?'Elegir idioma':'Choose language');
      options.forEach(option=>option.setAttribute('aria-selected',String(option.dataset.language===selected)));
    }
    set(selected);return {set,close:()=>close(false)};
  }
  return {languages,mount};
});
