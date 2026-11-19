import {analyzeTemplate,prepareTemplate,supportedFields} from './admin-engine.js';
const fileInput=document.querySelector('#source'),status=document.querySelector('#status'),report=document.querySelector('#report'),editor=document.querySelector('#editor'),fields=document.querySelector('#fields'),preview=document.querySelector('#preview'),save=document.querySelector('#save');
const codeInput=document.querySelector('#code-input'),analyzeButton=document.querySelector('#analyze-code'),clearButton=document.querySelector('#clear-code');
const progress=document.querySelector('#analysis-progress'),progressFill=document.querySelector('#progress-fill'),progressLabel=document.querySelector('#progress-label'),resetSample=document.querySelector('#reset-sample');
let source='',prepared='',lastAnalysis=null,analysisRunning=false;
function showProgress(percent,label){
  progress.classList.remove('hide');progress.setAttribute('aria-valuenow',String(percent));
  progressFill.style.width=percent+'%';progressLabel.textContent=percent+'% · '+label;
}
function nextPaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
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
function resetPrepared(){
  source='';prepared='';lastAnalysis=null;save.disabled=true;editor.classList.add('hide');preview.replaceChildren();
  report.textContent='Paste a template to analyze scenes and fields.';
}
async function analyzeSource(text){
  if(analysisRunning)return;
  analysisRunning=true;analyzeButton.disabled=true;fileInput.disabled=true;
  resetPrepared();
  try{
    showProgress(0,'Starting analysis');await nextPaint();
    if(!text.trim())throw new Error('Paste your HTML invitation code first.');
    showProgress(20,'Reading source');await nextPaint();
    const analysis=analyzeTemplate(text);
    showProgress(55,'Validating scenes and fields');await nextPaint();
    source=text;lastAnalysis=analysis;report.replaceChildren();
    const heading=document.createElement('p');
    heading.textContent=`${analysis.name} · ${analysis.sceneCount} scenes · ${analysis.fields.length} customer-editable inputs`;
    report.append(heading);
    if(analysis.warnings.length){
      const list=document.createElement('ul');
      for(const warning of analysis.warnings){
        const item=document.createElement('li');item.textContent=warning;list.append(item);
      }
      report.append(list);
    }
    showProgress(80,'Building sample preview form');await nextPaint();
    fields.replaceChildren();
    for(const key of analysis.fields)fields.append(makeField(key,analysis.config[key]));
    editor.classList.remove('hide');
    showProgress(100,'Analysis complete');
    setStatus('Analysis complete. Customer fields detected. Sample values are for preview only.','good');
  }catch(error){
    showProgress(100,'Analysis stopped with an error');
    setStatus(error instanceof Error?error.message:'Unable to analyze template.','error');
  }finally{
    analysisRunning=false;analyzeButton.disabled=false;fileInput.disabled=false;
  }
}
analyzeButton.addEventListener('click',()=>{void analyzeSource(codeInput.value);});
clearButton.addEventListener('click',()=>{
  if(analysisRunning)return;
  codeInput.value='';fileInput.value='';resetPrepared();progress.classList.add('hide');
  setStatus('Code cleared. Paste a new template.');
  codeInput.focus();
});
fileInput.addEventListener('change',async()=>{
  const file=fileInput.files?.[0];if(!file)return;
  if(file.size>1024*1024||!/\\.html?$/i.test(file.name)){
    setStatus('Select an HTML file no larger than 1 MB.','error');return;
  }
  try{
    const text=await file.text();
    codeInput.value=text;
    await analyzeSource(text);
  }catch(error){
    setStatus(error instanceof Error?error.message:'Unable to read file.','error');
  }
});
codeInput.addEventListener('input',()=>{
  if(source||prepared){
    resetPrepared();progress.classList.add('hide');
    setStatus('Code changed. Click Analyze Code again.');
  }
});
resetSample.addEventListener('click',()=>{
  if(!lastAnalysis)return;
  for(const key of lastAnalysis.fields){
    const control=editor.elements.namedItem(key);
    if(control)control.value=Array.isArray(lastAnalysis.config[key])?lastAnalysis.config[key].join(' | '):lastAnalysis.config[key];
  }
  setStatus('Sample values reset. Customers will enter their own details.','good');
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
    preview.replaceChildren(iframe);save.disabled=false;setStatus('Sample preview prepared. Customer details are not saved.','good');
  }catch(error){prepared='';save.disabled=true;setStatus(error instanceof Error?error.message:'Preparation failed.','error');}
});
save.addEventListener('click',()=>{
  if(!prepared)return;
  const url=URL.createObjectURL(new Blob([prepared],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='prepared-invitation.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});