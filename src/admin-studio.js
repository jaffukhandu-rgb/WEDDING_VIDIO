import {analyzeTemplate,prepareTemplate,supportedFields} from './admin-engine.js';
const fileInput=document.querySelector('#source'),status=document.querySelector('#status'),report=document.querySelector('#report'),editor=document.querySelector('#editor'),fields=document.querySelector('#fields'),preview=document.querySelector('#preview'),save=document.querySelector('#save');
let source='',prepared='';
const labels={partner1:'Partner 1 name',partner2:'Partner 2 name',date:'Wedding date',time:'Wedding time',venue:'Venue',address:'Address',message:'Invitation message',photos:'Photo URLs (data URLs only)',music:'Music (not included in preview)'};
function setStatus(message,type=''){status.textContent=message;status.className=type;}
function makeField(key,value){
  const wrapper=document.createElement('div');wrapper.className='field'+(key==='message'||key==='photos'?' wide':'');
  const label=document.createElement('label');label.textContent=labels[key]||key;
  const input=key==='message'?document.createElement('textarea'):document.createElement('input');
  input.name=key;input.id='field-'+key;label.htmlFor=input.id;
  if(key==='date')input.type='date';else if(key!=='message')input.type='text';
  if(['partner1','partner2','date','venue'].includes(key))input.required=true;
  input.maxLength=key==='message'?1000:300;
  input.value=Array.isArray(value)?value.join(' | '):value;
  wrapper.append(label,input);return wrapper;
}
fileInput.addEventListener('change',async()=>{
  source='';prepared='';save.disabled=true;editor.classList.add('hide');preview.replaceChildren();
  const file=fileInput.files?.[0];if(!file)return;
  if(file.size>1024*1024||!/\.html?$/i.test(file.name)){setStatus('Select an HTML file no larger than 1 MB.','error');return;}
  try{
    source=await file.text();const analysis=analyzeTemplate(source);report.replaceChildren();
    const heading=document.createElement('p');heading.textContent=`${analysis.name} · ${analysis.sceneCount} scenes · ${analysis.fields.length} editable inputs`;report.append(heading);
    if(analysis.warnings.length){const list=document.createElement('ul');for(const warning of analysis.warnings){const item=document.createElement('li');item.textContent=warning;list.append(item);}report.append(list);}
    fields.replaceChildren();for(const key of analysis.fields)fields.append(makeField(key,analysis.config[key]));
    editor.classList.remove('hide');setStatus('Analysis complete. Review fields and prepare preview.','good');
  }catch(error){source='';report.textContent='Analysis failed.';setStatus(error instanceof Error?error.message:'Unable to read template.','error');}
});
editor.addEventListener('submit',event=>{
  event.preventDefault();
  try{
    const values={};for(const key of Object.keys(supportedFields)){
      const control=editor.elements.namedItem(key);if(!control)continue;
      values[key]=key==='photos'?control.value.split('|').map(v=>v.trim()).filter(Boolean):control.value;
    }
    prepared=prepareTemplate(source,values);
    const iframe=document.createElement('iframe');iframe.title='Animated invitation preview';
    iframe.setAttribute('sandbox','allow-scripts');iframe.setAttribute('referrerpolicy','no-referrer');iframe.srcdoc=prepared;
    preview.replaceChildren(iframe);save.disabled=false;setStatus('Prepared successfully. Isolated preview running.','good');
  }catch(error){prepared='';save.disabled=true;setStatus(error instanceof Error?error.message:'Preparation failed.','error');}
});
save.addEventListener('click',()=>{
  if(!prepared)return;
  const url=URL.createObjectURL(new Blob([prepared],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='prepared-invitation.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});