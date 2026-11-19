import {analyzeTemplate,prepareTemplate} from './admin-engine.js';
import {createPreviewController} from './admin-preview-controller.js';
const fileInput=document.querySelector('#source'),status=document.querySelector('#status'),report=document.querySelector('#report'),editor=document.querySelector('#editor'),fields=document.querySelector('#fields'),preview=document.querySelector('#preview'),save=document.querySelector('#save');
const codeInput=document.querySelector('#code-input'),analyzeButton=document.querySelector('#analyze-code'),clearButton=document.querySelector('#clear-code');
const progress=document.querySelector('#analysis-progress'),progressFill=document.querySelector('#progress-fill'),progressLabel=document.querySelector('#progress-label'),resetSample=document.querySelector('#reset-sample');
const musicUpload=document.querySelector('#music-upload'),musicPlayer=document.querySelector('#music-player'),removeMusic=document.querySelector('#remove-music'),musicStatus=document.querySelector('#music-status');
const previewController=createPreviewController({
  preview,
  playButton:document.querySelector('#preview-play'),
  pauseButton:document.querySelector('#preview-pause'),
  restartButton:document.querySelector('#preview-restart'),
  playbackStatus:document.querySelector('#preview-playback-status'),
  musicPlayer,
  musicUpload,
  musicStatus
});
let source='',prepared='',lastAnalysis=null,analysisRunning=false,musicObjectUrl=null;
// Expand the existing preview panel rather than moving/recreating its iframe.
// Moving an iframe between DOM parents can reload it and restart the animation.
const previewPanel=document.querySelector('#preview-panel');
const previewBackdrop=document.querySelector('#preview-backdrop');
const expandPreview=document.querySelector('#expand-preview');
const closePreview=document.querySelector('#close-preview');
let previewExpanded=false;
let previousBodyOverflow='';
let previousFocus=null;

function openPreviewModal(){
  if(previewExpanded||expandPreview.disabled)return;
  previousFocus=document.activeElement;
  previousBodyOverflow=document.body.style.overflow;
  previewExpanded=true;
  previewBackdrop.hidden=false;
  previewPanel.classList.add('is-expanded');
  previewPanel.setAttribute('role','dialog');
  previewPanel.setAttribute('aria-modal','true');
  closePreview.hidden=false;
  expandPreview.hidden=true;
  expandPreview.setAttribute('aria-expanded','true');
  document.body.style.overflow='hidden';
  closePreview.focus();
}

function closePreviewModal(){
  if(!previewExpanded)return;
  previewExpanded=false;
  previewPanel.classList.remove('is-expanded');
  previewPanel.removeAttribute('role');
  previewPanel.removeAttribute('aria-modal');
  previewBackdrop.hidden=true;
  closePreview.hidden=true;
  expandPreview.hidden=false;
  expandPreview.setAttribute('aria-expanded','false');
  document.body.style.overflow=previousBodyOverflow;
  if(previousFocus?.isConnected&&!previousFocus.disabled)previousFocus.focus();
  else if(!expandPreview.disabled)expandPreview.focus();
  previousFocus=null;
}
expandPreview.addEventListener('click',openPreviewModal);
closePreview.addEventListener('click',closePreviewModal);
previewBackdrop.addEventListener('click',closePreviewModal);
document.addEventListener('keydown',event=>{
  if(!previewExpanded)return;
  if(event.key==='Escape'){
    event.preventDefault();
    closePreviewModal();
    return;
  }
  if(event.key!=='Tab')return;
  const focusable=[...previewPanel.querySelectorAll('button:not([disabled]):not([hidden])')]
    .filter(button=>button.getClientRects().length>0);
  if(!focusable.length){event.preventDefault();closePreview.focus();return;}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&(document.activeElement===first||!previewPanel.contains(document.activeElement))){
    event.preventDefault();last.focus();
  }else if(!event.shiftKey&&(document.activeElement===last||!previewPanel.contains(document.activeElement))){
    event.preventDefault();first.focus();
  }
});

const IMAGE_MAX_BYTES=3*1024*1024,AUDIO_MAX_BYTES=8*1024*1024;
const IMAGE_TYPES=new Set(['image/jpeg','image/png','image/webp']);
const AUDIO_TYPES=new Set(['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/ogg','audio/mp4','audio/x-m4a','audio/aac','audio/x-aac','audio/webm']);
function showProgress(percent,label){
  progress.classList.remove('hide');progress.setAttribute('aria-valuenow',String(percent));
  progressFill.style.width=percent+'%';progressLabel.textContent=percent+'% · '+label;
}
function nextPaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
const labels={partner1:'Partner 1 name',partner2:'Partner 2 name',date:'Wedding date',time:'Wedding time',venue:'Venue',address:'Address',message:'Invitation message'};
function setStatus(message,type=''){status.textContent=message;status.className=type;}
function makeField(key,value){
  const wrapper=document.createElement('div');
  wrapper.className='field'+(key==='message'?' wide':'');
  const label=document.createElement('label');
  label.textContent=labels[key]||key;
  const input=key==='message'?document.createElement('textarea'):document.createElement('input');
  input.name=key;input.id='field-'+key;label.htmlFor=input.id;
  if(key==='date')input.type='date';else if(key!=='message')input.type='text';
  if(['partner1','partner2','date','venue'].includes(key))input.required=true;
  input.maxLength=key==='message'?1000:300;
  input.value=value??'';
  wrapper.append(label,input);
  return wrapper;
}
function createDisclosure(title,open=false){
  const details=document.createElement('details');details.className='form-card';details.open=open;
  const summary=document.createElement('summary');summary.textContent=title;
  const content=document.createElement('div');content.className='form-card-content';
  details.append(summary,content);
  return {details,summary,content};
}
function renderEventFields(events){
  const {details,content}=createDisclosure('Event schedule · '+events.length+' events',true);
  const list=document.createElement('div');list.className='event-list';
  events.forEach((event,index)=>{
    const group=createDisclosure('Event '+(index+1),index===0);
    group.details.classList.add('event-card');
    const title=document.createElement('span');title.textContent=event.name||'Event '+(index+1);
    const date=document.createElement('span');date.className='summary-date';date.textContent=event.date||'Date not set';
    group.summary.replaceChildren(title,date);
    const grid=document.createElement('div');grid.className='field-grid';
    for(const [property,current] of Object.entries(event)){
      if(typeof current!=='string')continue;
      const row=document.createElement('div');row.className='field';
      const label=document.createElement('label');label.textContent=property.replace(/([A-Z])/g,' $1');
      const input=document.createElement('input');
      input.type=property==='date'?'date':'text';input.value=current;input.maxLength=300;
      input.dataset.eventIndex=String(index);input.dataset.eventKey=property;
      input.id='event-'+index+'-'+property;label.htmlFor=input.id;
      if(property==='name')input.addEventListener('input',()=>{title.textContent=input.value||'Event '+(index+1);});
      if(property==='date')input.addEventListener('input',()=>{date.textContent=input.value||'Date not set';});
      row.append(label,input);grid.append(row);
    }
    group.content.append(grid);list.append(group.details);
  });
  content.append(list);return details;
}
function renderPhotoFields(analysis){
  if(!analysis.photoSlots.length)return null;
  const {details,content}=createDisclosure('Photos · '+analysis.photoSlots.length+' slots',true);
  const description=document.createElement('p');description.className='media-note';
  description.textContent='Only photo slots referenced by this invitation are shown. JPEG, PNG or WebP, maximum 3 MB each.';
  const grid=document.createElement('div');grid.className='photo-slots';
  for(const slot of analysis.photoSlots){
    const box=document.createElement('div');box.className='photo-slot';
    const label=document.createElement('label');label.textContent=slot.label;
    const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';
    input.id='photo-slot-'+slot.key+'-'+(slot.index??'single');label.htmlFor=input.id;
    input.dataset.photoKey=slot.key;
    if(slot.index!==null)input.dataset.photoIndex=String(slot.index);
    const thumb=document.createElement('img');thumb.className='photo-thumb hide';thumb.alt=slot.label+' preview';
    input.addEventListener('change',()=>{
      thumb.removeAttribute('src');thumb.classList.add('hide');
      const file=input.files?.[0];if(!file)return;
      if(!IMAGE_TYPES.has(file.type)||file.size>IMAGE_MAX_BYTES||file.size===0){
        input.value='';
        setStatus('Please choose a JPEG, PNG or WebP image up to 3 MB for '+slot.label+'.','error');
        return;
      }
      const url=URL.createObjectURL(file);thumb.src=url;thumb.classList.remove('hide');
      thumb.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true});
      thumb.addEventListener('error',()=>URL.revokeObjectURL(url),{once:true});
      setStatus(slot.label+' selected. Click Preview with sample values to apply it.','good');
    });
    box.append(label,input,thumb);grid.append(box);
  }
  content.append(description,grid);return details;
}
function renderDetectedFields(analysis){
  fields.replaceChildren();
  const ordinary=analysis.fields.filter(key=>key!=='events'&&key!=='photos');
  if(ordinary.length){
    const {details,content}=createDisclosure('Invitation details · '+ordinary.length+' fields',true);
    const grid=document.createElement('div');grid.className='field-grid';
    for(const key of ordinary)grid.append(makeField(key,analysis.config[key]));
    content.append(grid);fields.append(details);
  }
  if(analysis.eventMode)fields.append(renderEventFields(analysis.config.events));
  const photoSection=renderPhotoFields(analysis);
  if(photoSection)fields.append(photoSection);
}
function clearMusic(){
  musicPlayer.pause();
  musicPlayer.removeAttribute('src');musicPlayer.load();musicPlayer.classList.add('hide');
  if(musicObjectUrl)URL.revokeObjectURL(musicObjectUrl);
  musicObjectUrl=null;musicUpload.value='';removeMusic.classList.add('hide');
  musicStatus.textContent='No music selected.';
}
musicUpload.addEventListener('change',()=>{
  const file=musicUpload.files?.[0];
  if(!file){clearMusic();return;}
  if(!AUDIO_TYPES.has(file.type)||file.size===0||file.size>AUDIO_MAX_BYTES){
    clearMusic();
    musicStatus.textContent='Choose a supported audio file up to 8 MB.';
    setStatus('Music format or file size is not supported.','error');return;
  }
  if(musicObjectUrl)URL.revokeObjectURL(musicObjectUrl);
  musicObjectUrl=URL.createObjectURL(file);
  musicPlayer.src=musicObjectUrl;musicPlayer.classList.remove('hide');
  removeMusic.classList.remove('hide');
  musicStatus.textContent=file.name+' · preview soundtrack selected (not included in HTML download).';
});
removeMusic.addEventListener('click',clearMusic);
function readImageData(file){
  if(!IMAGE_TYPES.has(file.type)||file.size===0||file.size>IMAGE_MAX_BYTES){
    throw new Error('Images must be JPEG, PNG or WebP and at most 3 MB.');
  }
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Could not load the selected photo.'));
    reader.readAsDataURL(file);
  });
}
async function collectPreviewValues(){
  if(!lastAnalysis)throw new Error('Analyze a template first.');
  const values={};
  for(const key of lastAnalysis.fields){
    if(key==='events'||key==='photos')continue;
    const control=editor.elements.namedItem(key);
    if(control)values[key]=control.value;
  }
  if(lastAnalysis.eventMode){
    values.events=lastAnalysis.config.events.map(event=>({...event}));
    for(const input of fields.querySelectorAll('[data-event-index]')){
      values.events[Number(input.dataset.eventIndex)][input.dataset.eventKey]=input.value;
    }
  }
  if(lastAnalysis.photoSlots.length){
    if(Array.isArray(lastAnalysis.config.photos))values.photos=[...lastAnalysis.config.photos];
    for(const input of fields.querySelectorAll('[data-photo-key]')){
      const file=input.files?.[0];if(!file)continue;
      const value=await readImageData(file);
      if(input.dataset.photoKey==='photos'){
        values.photos[Number(input.dataset.photoIndex)]=value;
      }else{
        values[input.dataset.photoKey]=value;
      }
    }
  }
  // An uploaded soundtrack belongs to the media track, not the source template.
  // Suppress a code-defined default track to avoid duplicate playback during preview.
  if(musicUpload.files?.[0]&&'music' in lastAnalysis.config)values.music='';
  return values;
}
function resetPrepared(){
  source='';prepared='';lastAnalysis=null;save.disabled=true;editor.classList.add('hide');
  closePreviewModal();
  expandPreview.disabled=true;
  previewController.reset();preview.replaceChildren();
  clearMusic();
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
    heading.className='analysis-stats';
    const ordinaryCount=analysis.fields.filter(key=>key!=='events'&&key!=='photos').length;
    const totalFields=ordinaryCount+analysis.eventFieldCount+analysis.photoSlots.length;
    heading.textContent=`${analysis.name} · ${analysis.sceneCount} scenes · ${totalFields} editable inputs · ${analysis.photoSlots.length} photo slots`;
    report.append(heading);
    if(analysis.warnings.length){
      const list=document.createElement('ul');
      for(const warning of analysis.warnings){
        const item=document.createElement('li');item.textContent=warning;list.append(item);
      }
      report.append(list);
    }
    if(analysis.fonts.remote){
      const note=document.createElement('p');note.className='font-report';
      note.textContent='Font audit: '+(analysis.fonts.remoteFamilies.join(', ')||'Remote fonts')+
        ' require external downloads, which are blocked here. Local fallback fonts may change the appearance. Bundle licensed fonts for identical export.';
      report.append(note);
    }else if(analysis.fonts.embedded){
      const note=document.createElement('p');note.className='good';note.textContent='Font audit: embedded fonts detected.';report.append(note);
    }
    showProgress(80,'Building sample preview form');await nextPaint();
    renderDetectedFields(analysis);
    editor.classList.remove('hide');
    showProgress(100,'Analysis complete');
    setStatus('Analysis complete. Customer fields detected. Sample values are for preview only.','good');
  }catch(error){
    showProgress(0,'Analysis failed — review the error below');
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
    if(key==='events'){
      for(const input of fields.querySelectorAll('[data-event-index]')){
        input.value=lastAnalysis.config.events[Number(input.dataset.eventIndex)][input.dataset.eventKey];
        input.dispatchEvent(new Event('input'));
      }
    }else if(key!=='photos'&&control){
      control.value=lastAnalysis.config[key];
    }
  }
  for(const input of fields.querySelectorAll('[data-photo-key]')){
    input.value='';
    const thumb=input.parentNode.querySelector('.photo-thumb');
    thumb?.removeAttribute('src');thumb?.classList.add('hide');
  }
  clearMusic();
  setStatus('Sample values reset. Customers will enter their own details.','good');
});
editor.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!lastAnalysis)return;
  const submit=editor.querySelector('button[type=submit]');
  submit.disabled=true;save.disabled=true;
  try{
    const values=await collectPreviewValues();
    prepared=prepareTemplate(source,values);
    previewController.mount(prepared);
    expandPreview.disabled=false;
    save.disabled=false;
    setStatus('Sample preview prepared. Customer details are not saved.','good');
  }catch(error){
    prepared='';save.disabled=true;
    closePreviewModal();expandPreview.disabled=true;
    previewController.reset();preview.replaceChildren();
    setStatus(error instanceof Error?error.message:'Preparation failed.','error');
  }finally{submit.disabled=false;}
});
save.addEventListener('click',()=>{
  if(!prepared)return;
  const url=URL.createObjectURL(new Blob([prepared],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='prepared-invitation.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});