import { findVideoBackground } from "./video-html-contract.js";
// Contract v1: narrow, non-executing analysis for structured HTML templates.
const FIELD_TYPES = Object.freeze({partner1:'text',partner2:'text',date:'date',time:'text',venue:'text',address:'text',message:'textarea',blessing:'text',photos:'images',music:'audio'});
const CONFIG_MARKER = /\bconst\s+CONFIG\s*=\s*\{/g;
function closingBrace(source,start){
  let depth=0,quote='',escaped=false,comment='';
  for(let i=start;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(comment==='line'){if(ch==='\n')comment='';continue;}
    if(comment==='block'){if(ch==='*'&&next==='/'){comment='';i++;}continue;}
    if(quote){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch===quote)quote='';continue;}
    if(ch==='/'&&next==='/'){comment='line';i++;continue;}
    if(ch==='/'&&next==='*'){comment='block';i++;continue;}
    if('"\'\x60'.includes(ch)){quote=ch;continue;}
    if(ch==='{')depth++;
    if(ch==='}'&&--depth===0)return i;
  }
  throw new Error('CONFIG object is incomplete.');
}
function getConfigRange(html){
  const matches=[...html.matchAll(CONFIG_MARKER)];
  if(matches.length!==1)throw new Error('Expected exactly one const CONFIG = { ... } block.');
  const start=matches[0].index+matches[0][0].length-1;
  return {start,end:closingBrace(html,start)};
}
// Ignore JavaScript comments between photo URL literals without stripping // inside URLs.
function removeArrayComments(source){
  let out='',quote='',escaped=false;
  for(let i=0;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(quote){
      out+=ch;
      if(escaped)escaped=false;
      else if(ch==='\\')escaped=true;
      else if(ch===quote)quote='';
      continue;
    }
    if(ch==='"'||ch==="'"){quote=ch;out+=ch;continue;}
    if(ch==='/'&&next==='/'){
      i+=2;
      while(i<source.length&&source[i]!=='\n')i++;
      out+='\n';
      continue;
    }
    if(ch==='/'&&next==='*'){
      const end=source.indexOf('*/',i+2);
      if(end===-1)throw new Error('Unclosed comment in photos array.');
      i=end+1;out+=' ';continue;
    }
    out+=ch;
  }
  return out;
}

function readValue(body,key){
  const match=body.match(new RegExp('(?:^|[,\\n])\\s*'+key+'\\s*:\\s*','m'));
  if(!match)return undefined;
  const rest=body.slice(match.index+match[0].length);
  if(rest[0]==='"'||rest[0]==="'"){
    const q=rest[0];let escaped=false;
    for(let i=1;i<rest.length;i++){
      if(escaped){escaped=false;continue;}
      if(rest[i]==='\\'){escaped=true;continue;}
      if(rest[i]===q)return rest.slice(1,i).replace(/\\(["'\\])/g,'$1');
    }
    throw new Error('Unclosed string for '+key);
  }
  if(key==='photos'&&rest[0]==='['){
    const end=rest.indexOf(']');
    if(end<0)throw new Error('Unclosed photos array.');
    const array=removeArrayComments(rest.slice(1,end)).trim();
    if(!array)return [];
    const values=[...array.matchAll(/(["'])(.*?)\1/g)].map(m=>m[2]);
    if(array.replace(/(["'])(.*?)\1/g,'').replace(/[,\s]/g,'')!=='')throw new Error('Photos must be literal strings.');
    return values;
  }
  throw new Error('Only literal strings and a literal photos array are supported for '+key+'.');
}

function eventRange(body){
  const match=/\bevents\s*:\s*\[/.exec(body);
  if(!match)return null;
  const start=match.index+match[0].length-1;
  let depth=0,quote='',escaped=false;
  for(let i=start;i<body.length;i++){
    const ch=body[i];
    if(quote){
      if(escaped)escaped=false;
      else if(ch==='\\')escaped=true;
      else if(ch===quote)quote='';
      continue;
    }
    if(ch==='"'||ch==="'"){quote=ch;continue;}
    if(ch==='[')depth++;
    if(ch===']'&&--depth===0)return {start,end:i};
  }
  throw new Error('Events array is incomplete.');
}
function parseEvents(body){
  const range=eventRange(body);
  if(!range)return null;
  const raw=body.slice(range.start+1,range.end);
  const events=[];
  const objectPattern=/\{([^{}]*)\}/g;
  let match;
  while((match=objectPattern.exec(raw))){
    const item={};
    for(const pair of match[1].matchAll(/(?:^|,)\s*([a-zA-Z_$][\w$]*)\s*:\s*(["'])(.*?)\2\s*(?=,|$)/gs)){
      item[pair[1]]=pair[3];
    }
    // Reject unsupported or malformed properties instead of silently dropping them.
    const consumed=match[1].replace(/(?:^|,)\s*([a-zA-Z_$][\w$]*)\s*:\s*(["'])(.*?)\2\s*(?=,|$)/gs,'');
    if(consumed.replace(/[\s,]/g,'')!=='')throw new Error('Event '+(events.length+1)+' has unsupported properties; use literal strings only.');
    if(!Object.keys(item).length)throw new Error('Unsupported event data; use literal string properties.');
    events.push(item);
  }
  if(!events.length||events.length>7)throw new Error('Supported event count is 1 to 7.');
  const leftover=raw.replace(objectPattern,'').replace(/[\s,]/g,'');
  if(leftover)throw new Error('Events must contain simple literal objects; complex expressions require review.');
  for(const [index,event] of events.entries()){
    if(typeof event.date!=='string')throw new Error('Event '+(index+1)+' needs a date.');
  }
  return {events,range};
}
function validDate(value){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(!match)return false;
  const year=+match[1],month=+match[2],day=+match[3],utc=new Date(0);
  utc.setUTCFullYear(year,month-1,day);
  return utc.getUTCFullYear()===year&&utc.getUTCMonth()===month-1&&utc.getUTCDate()===day;
}

// Discover only photo fields that the original template actually references.
// This avoids adding irrelevant photo controls to text-only invitations.
function detectPhotoSlots(html,body,config){
  const slots=[];
  if(Array.isArray(config.photos)&&/\bCONFIG\.photos\b/.test(html)){
    const indexed=[...html.matchAll(/\bCONFIG\.photos\s*\[\s*(\d+)\s*\]/g)]
      .map(match=>Number(match[1])).filter(Number.isSafeInteger);
    const usedIndexes=indexed.length?[...new Set(indexed)].filter(index=>index>=0&&index<6).sort((a,b)=>a-b)
      :Array.from({length:Math.min(6,config.photos.length)},(_,index)=>index);
    for(const index of usedIndexes){
      slots.push({key:'photos',index,label:'Photo '+(index+1)});
    }
  }
  const named=[...body.matchAll(/(?:^|[,\n])\s*(photo\d*)\s*:/g)]
    .map(match=>match[1]);
  for(const key of new Set(named)){
    if(slots.length>=6)break;
    const used=new RegExp('\\bCONFIG\\.'+key+'\\b|data-bind=["\\x27]'+key+'["\\x27]').test(html);
    if(used&&typeof config[key]==='string')slots.push({key,index:null,label:key==='photo'?'Photo':key.replace(/(\d+)$/,' $1')});
  }
  return slots;
}
function auditFonts(html){
  const remote=/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)/i.test(html);
  const families=[...html.matchAll(/[?&]family=([^&"'\s<>]+)/g)]
    .map(match=>{try{return decodeURIComponent(match[1].replace(/\+/g,' ')).split(':')[0];}catch{return 'Unknown font';}}).filter(Boolean);
  const embedded=/@font-face\s*\{[^}]*src\s*:\s*url\(\s*['"]?data:font\//is.test(html);
  return {remote,remoteFamilies:[...new Set(families)],embedded};
}

// Match exact CSS classes, never substrings such as "not-book" or "fake-scene".
function tagsWithClass(html,tagName,className){
  const elements=[...html.matchAll(new RegExp('<'+tagName+'\\b[^>]*>','gi'))];
  return elements.filter(match=>{
    const attribute=match[0].match(/\bclass\s*=\s*(["'])([^"']*)\1/i);
    return Boolean(attribute&&attribute[2].split(/\s+/).includes(className));
  });
}

// Warn when hand-drawn SVG letters cannot follow changes to the customer names.
function findArtworkBindingIssues(html, config) {
  const issues = [];
  const hasNames = typeof config.partner1 === 'string' && typeof config.partner2 === 'string';
  const hasMonogram = /\bid\s*=\s*(["'])mono\1/i.test(html);
  const fixedLetters = /<g\b[^>]*\bid\s*=\s*(["'])[A-Z]\1/i.test(html);
  const boundInitials = /\bdata-bind-initials\s*=\s*(["'])partner1,partner2\1/i.test(html);
  if (hasNames && hasMonogram && fixedLetters && !boundInitials) {
    issues.push('The SVG monogram uses fixed letters. The names will change, but the artwork initials will not. Add a dynamic data-bind-initials="partner1,partner2" text layer, and hide the fixed letters for other initials.');
  }
  return issues;
}

// One-pass compatibility diagnostics. Reject templates that cannot render safely
// instead of reporting a CONFIG error now and an external-library error later.
export function diagnoseTemplate(html){
  if(typeof html!=='string'||!html.trim())return ['Paste a complete HTML invitation first.'];
  const issues=[];
  if(new TextEncoder().encode(html).length>1024*1024)issues.push('HTML is over 1 MB; reduce the template source size.');
  if(!/<!doctype\s+html/i.test(html)||!/<main\b/i.test(html)){
    issues.push('Supply one complete HTML document with <!DOCTYPE html> and a <main> element.');
  }
  const configBlocks=[...html.matchAll(CONFIG_MARKER)];
  if(configBlocks.length!==1){
    issues.push(/\bconst\s+CFG\s*=/.test(html)
      ? 'Rename the CFG contract to exactly one const CONFIG = { ... } block and use partner1, partner2, date (YYYY-MM-DD), time, venue, address and message instead of groom/bride/place.'
      : 'Add exactly one literal const CONFIG = { ... } block with editable customer fields.');
  }
  if(/<script\b[^>]*\bsrc\s*=/i.test(html)){
    issues.push('External <script src="..."> libraries are blocked in both preview and MP4 export. Use self-contained inline JavaScript.');
  }
  if(/\bgsap\s*\./i.test(html)){
    issues.push('GSAP calls (timeline/ticker/tweens) require a library that cannot load here. Generate native CSS/Web Animations instead; simply renaming CFG will not fix playback.');
  }
  const scenes=tagsWithClass(html,'section','scene');
  if(scenes.length){
    const indexes=scenes.map(m=>Number(m[0].match(/--i\s*:\s*(\d+)/)?.[1]));
    if(indexes.some((index,position)=>index!==position)){
      issues.push('Scenes must have sequential --i indexes: use --i:0, --i:1, --i:2, and so on.');
    }
  }else{
    const stage=tagsWithClass(html,'main','stage').length>0||tagsWithClass(html,'div','stage').length>0;
    const book=tagsWithClass(html,'div','book').length>0;
    const pages=tagsWithClass(html,'div','pg').length;
    if(!stage||!book||pages<2||pages>12){
      issues.push('Unsupported layout: use numbered <section class="scene" style="--i:0"> elements, or a .stage with a .book containing 2–12 .pg pages.');
    }
  }
  return issues;
}

export function analyzeTemplate(html){
  const compatibilityIssues=diagnoseTemplate(html);
  if(compatibilityIssues.length){
    throw new Error('Template compatibility issues ('+compatibilityIssues.length+'):\n• '+compatibilityIssues.join('\n• '));
  }
  if(typeof html!=='string'||!html.trim())throw new Error('Upload a nonempty HTML file.');
  if(new TextEncoder().encode(html).length>1024*1024)throw new Error('HTML exceeds 1 MB.');
  if(!/<!doctype\s+html/i.test(html)||!/<main\b/i.test(html))throw new Error('Expected a complete HTML invitation document.');
  const {start,end}=getConfigRange(html),body=html.slice(start+1,end),config={};
  const eventData=parseEvents(body);
  const eventFreeBody=eventData?body.slice(0,eventData.range.start)+body.slice(eventData.range.end+1):body;
  for(const key of Object.keys(FIELD_TYPES)){const value=readValue(eventFreeBody,key);if(value!==undefined)config[key]=value;}
  // Page-turn book templates commonly expose a single CONFIG.photo.
  const singlePhoto=readValue(eventFreeBody,'photo');
  if(singlePhoto!==undefined)config.photo=singlePhoto;
  if(eventData)config.events=eventData.events;
  for(const match of eventFreeBody.matchAll(/(?:^|[,\n])\s*(photo\d+)\s*:/g)){
    const key=match[1];
    if(!(key in config)){
      const value=readValue(eventFreeBody,key);
      if(typeof value==='string')config[key]=value;
    }
  }
  if(!Object.keys(config).length)throw new Error('No supported customer fields detected.');
  if(config.date!==undefined&&!validDate(config.date))throw new Error('Invalid sample wedding date.');
  if(eventData&&eventData.events.some(event=>!validDate(event.date)))throw new Error('An event has an invalid sample date.');
  if(eventData&&eventData.events.some(event=>!event.name?.trim()||!event.time?.trim()||!event.venue?.trim()))throw new Error('Every event needs a name, time and venue.');
  const scenes=tagsWithClass(html,'section','scene');
  let layoutType='scenes',sceneCount=scenes.length;
  if(sceneCount){
    const indexes=scenes.map(m=>Number(m[0].match(/--i\s*:\s*(\d+)/)?.[1]));
    if(indexes.some((n,i)=>n!==i))throw new Error('Scenes must have sequential --i indexes.');
  }else{
    // Page-turn books use stacked .pg pages, not numbered .scene sections.
    const stage=tagsWithClass(html,'main','stage').length>0||tagsWithClass(html,'div','stage').length>0;
    const book=tagsWithClass(html,'div','book').length>0;
    const pages=tagsWithClass(html,'div','pg');
    if(!stage||!book||pages.length<2||pages.length>12){
      throw new Error('Unsupported layout: use numbered scene sections, or a .stage with a .book containing 2–12 .pg pages.');
    }
    layoutType='book';
    sceneCount=pages.length;
  }
  const warnings=[];
  if(/<script\b[^>]*\bsrc\s*=/i.test(html))warnings.push('External scripts are blocked.');
  const videoBackground=findVideoBackground(html);
  const otherRemoteSources=videoBackground ? html.replace(videoBackground.url,'') : html;
  if(/https?:\/\//i.test(otherRemoteSources))warnings.push('Remote fonts and assets are blocked.');
  if(/Math\.random\s*\(/.test(html))warnings.push('Random animations may not render identically.');
  if(/setTimeout\s*\(\s*play\s*,/.test(html))warnings.push('Automatic replay requires an export adapter.');
  const photoSlots=detectPhotoSlots(html,eventFreeBody,config);
  const fonts=auditFonts(html);
  const artworkBindingIssues=findArtworkBindingIssues(html,config);
  if(fonts.remote)warnings.push('External fonts are blocked in the isolated preview. Fallback fonts will be used unless the font is embedded.');
  const fields=Object.keys(config).filter(key=>key!=='music'&&key!=='photos'&&!/^photo\d*$/.test(key));
  if(photoSlots.length)fields.push('photos');
  if(eventData)fields.push('events');
  const uniqueFields=[...new Set(fields)];
  const eventFieldCount=eventData?eventData.events.reduce((count,event)=>count+Object.keys(event).length,0):0;
  return {name:html.match(/<title>([^<]+)<\/title>/i)?.[1]||'Untitled',sceneCount,layoutType,fields:uniqueFields,config,warnings,artworkBindingIssues,range:{start,end},eventMode:!!eventData,photoSlots,fonts,eventFieldCount};
}
export function prepareTemplate(html,values,{preserveConfig=false,analysis}={}){
  const report=analysis??analyzeTemplate(html),config={...report.config};
  for(const key of Object.keys(FIELD_TYPES)){
    if(!(key in values))continue;
    const value=values[key];
    if(key==='photos'){
      if(!Array.isArray(value)||value.length>6||value.some(v=>typeof v!=='string'||v.length>8*1024*1024))throw new Error('Invalid photos.');
    }else if(typeof value!=='string'||value.length>(key==='message'?1000:300))throw new Error('Invalid '+key+'.');
    config[key]=value;
  }
  for(const slot of report.photoSlots){
    if(slot.key==='photos')continue;
    if(slot.key in values){
      const value=values[slot.key];
      if(typeof value!=='string'||value.length>8*1024*1024)throw new Error('Invalid '+slot.label+'.');
      config[slot.key]=value;
    }
  }
  for(const key of ['partner1','partner2','venue']){
    if(key in config&&!String(config[key]).trim())throw new Error(key+' cannot be empty.');
  }
  if(report.eventMode&&'events' in values){
    if(!Array.isArray(values.events)||values.events.length!==config.events.length)throw new Error('Event count must match the template.');
    config.events=values.events.map((event,i)=>{
      const original=config.events[i],updated={...original};
      for(const key of Object.keys(original)){
        if(typeof event[key]!=='string'||event[key].length>300)throw new Error('Invalid event '+(i+1)+' '+key);
        updated[key]=event[key];
      }
      if(!validDate(updated.date))throw new Error('Invalid date for event '+(i+1));
      return updated;
    });
  }
  if('date' in config&&!validDate(config.date))throw new Error('Invalid wedding date.');
  const overrides=preserveConfig?Object.fromEntries(Object.keys(values).map(key=>[key,config[key]])):config;
  const replacement=JSON.stringify(overrides).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  const literal=preserveConfig
    ? '{...'+html.slice(report.range.start,report.range.end+1)+',...'+replacement+'}'
    : replacement;
  const prepared=html.slice(0,report.range.start)+literal+html.slice(report.range.end+1);
  // Stamp the expected initials into prepared output only; do not change source HTML.
  const firstInitial=value=>Array.from(String(value||'').trim())[0]?.toLocaleUpperCase()||'';
  const initials=firstInitial(config.partner1)+firstInitial(config.partner2);
  const escapedInitials=initials.replace(/&/g,'&amp;').replace(/"/g,'&quot;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const withInitials=prepared.replace(
    /(data-bind-initials\s*=\s*(["'])partner1,partner2\2)/gi,
    match=>match+' data-expected-initials="'+escapedInitials+'"'
  );
  const videoBackground=findVideoBackground(html);
  const mediaSources=videoBackground?'data: blob: '+videoBackground.origin:'data: blob:';
  const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src ${mediaSources}; connect-src 'none'; form-action 'none'; base-uri 'none'">`;
  const headContent=csp+(preserveConfig?'<style>:where(body){overflow-wrap:break-word}</style>':'');
  if(!/<head\b[^>]*>/i.test(withInitials))return withInitials.replace(/<!doctype\s+html[^>]*>/i,m=>m+'<head>'+headContent+'</head>');
  return withInitials.replace(/<head\b[^>]*>/i,m=>m+headContent);
}
export const supportedFields=FIELD_TYPES;
export function isSupportedHtmlFile(file) {
  return file.size <= 1024 * 1024 && /\.html?$/i.test(file.name);
}
