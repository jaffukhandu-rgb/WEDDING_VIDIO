// Contract v1: narrow, non-executing analysis for structured HTML templates.
const FIELD_TYPES = Object.freeze({partner1:'text',partner2:'text',date:'date',time:'text',venue:'text',address:'text',message:'textarea',photos:'images',music:'audio'});
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
    const array=rest.slice(1,end).trim();
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
    const count=Math.min(6,Math.max(config.photos.length,indexed.length?Math.max(...indexed)+1:0));
    for(let index=0;index<count;index++){
      slots.push({key:'photos',index,label:'Photo '+(index+1)});
    }
  }
  const named=[...body.matchAll(/(?:^|[,\n])\s*(photo\d+)\s*:/g)]
    .map(match=>match[1]);
  for(const key of new Set(named)){
    if(slots.length>=6)break;
    const used=new RegExp('\\bCONFIG\\.'+key+'\\b|data-bind=["\\x27]'+key+'["\\x27]').test(html);
    if(used&&typeof config[key]==='string')slots.push({key,index:null,label:key.replace(/(\d+)$/,' $1')});
  }
  return slots;
}
function auditFonts(html){
  const remote=/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)/i.test(html);
  const families=[...html.matchAll(/[?&]family=([^&"'\s<>]+)/g)]
    .map(match=>decodeURIComponent(match[1].replace(/\+/g,' ')).split(':')[0]).filter(Boolean);
  const embedded=/@font-face\s*\{[^}]*src\s*:\s*url\(\s*['"]?data:font\//is.test(html);
  return {remote,remoteFamilies:[...new Set(families)],embedded};
}

export function analyzeTemplate(html){
  if(typeof html!=='string'||!html.trim())throw new Error('Upload a nonempty HTML file.');
  if(new TextEncoder().encode(html).length>1024*1024)throw new Error('HTML exceeds 1 MB.');
  if(!/<!doctype\s+html/i.test(html)||!/<main\b/i.test(html))throw new Error('Expected a complete HTML invitation document.');
  const {start,end}=getConfigRange(html),body=html.slice(start+1,end),config={};
  const eventData=parseEvents(body);
  const eventFreeBody=eventData?body.slice(0,eventData.range.start)+body.slice(eventData.range.end+1):body;
  for(const key of Object.keys(FIELD_TYPES)){const value=readValue(eventFreeBody,key);if(value!==undefined)config[key]=value;}
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
  const scenes=[...html.matchAll(/<section\b[^>]*class=["'][^"']*\bscene\b[^"']*["'][^>]*>/gi)];
  if(!scenes.length)throw new Error('No scene sections found.');
  const indexes=scenes.map(m=>Number(m[0].match(/--i\s*:\s*(\d+)/)?.[1]));
  if(indexes.some((n,i)=>n!==i))throw new Error('Scenes must have sequential --i indexes.');
  const warnings=[];
  if(/<script\b[^>]*\bsrc\s*=/i.test(html))warnings.push('External scripts are blocked.');
  if(/https?:\/\//i.test(html))warnings.push('Remote fonts and assets are blocked.');
  if(/Math\.random\s*\(/.test(html))warnings.push('Random animations may not render identically.');
  if(/setTimeout\s*\(\s*play\s*,/.test(html))warnings.push('Automatic replay requires an export adapter.');
  const photoSlots=detectPhotoSlots(html,eventFreeBody,config);
  const fonts=auditFonts(html);
  if(fonts.remote)warnings.push('External fonts are blocked in the isolated preview. Fallback fonts will be used unless the font is embedded.');
  const fields=Object.keys(config).filter(key=>key!=='music'&&key!=='photos'&&!/^photo\d+$/.test(key));
  if(photoSlots.length)fields.push('photos');
  if(eventData)fields.push('events');
  const uniqueFields=[...new Set(fields)];
  const eventFieldCount=eventData?eventData.events.reduce((count,event)=>count+Object.keys(event).length,0):0;
  return {name:html.match(/<title>([^<]+)<\/title>/i)?.[1]||'Untitled',sceneCount:scenes.length,fields:uniqueFields,config,warnings,range:{start,end},eventMode:!!eventData,photoSlots,fonts,eventFieldCount};
}
export function prepareTemplate(html,values){
  const report=analyzeTemplate(html),config={...report.config};
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
  const replacement=JSON.stringify(config).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  const prepared=html.slice(0,report.range.start)+replacement+html.slice(report.range.end+1);
  const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'">`;
  return prepared.replace(/<head\b[^>]*>/i,m=>m+csp);
}
export const supportedFields=FIELD_TYPES;