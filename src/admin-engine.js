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
export function analyzeTemplate(html){
  if(typeof html!=='string'||!html.trim())throw new Error('Upload a nonempty HTML file.');
  if(new TextEncoder().encode(html).length>1024*1024)throw new Error('HTML exceeds 1 MB.');
  if(!/<!doctype\s+html/i.test(html)||!/<main\b/i.test(html))throw new Error('Expected a complete HTML invitation document.');
  const {start,end}=getConfigRange(html),body=html.slice(start+1,end),config={};
  for(const key of Object.keys(FIELD_TYPES)){const value=readValue(body,key);if(value!==undefined)config[key]=value;}
  if(!config.partner1||!config.partner2||!config.date||!config.venue)throw new Error('Required CONFIG fields: partner1, partner2, date, venue.');
  const scenes=[...html.matchAll(/<section\b[^>]*class=["'][^"']*\bscene\b[^"']*["'][^>]*>/gi)];
  if(!scenes.length)throw new Error('No scene sections found.');
  const indexes=scenes.map(m=>Number(m[0].match(/--i\s*:\s*(\d+)/)?.[1]));
  if(indexes.some((n,i)=>n!==i))throw new Error('Scenes must have sequential --i indexes.');
  const warnings=[];
  if(/<script\b[^>]*\bsrc\s*=/i.test(html))warnings.push('External scripts are blocked.');
  if(/https?:\/\//i.test(html))warnings.push('Remote fonts and assets are blocked.');
  if(/Math\.random\s*\(/.test(html))warnings.push('Random animations may not render identically.');
  if(/setTimeout\s*\(\s*play\s*,/.test(html))warnings.push('Automatic replay requires an export adapter.');
  return {name:html.match(/<title>([^<]+)<\/title>/i)?.[1]||'Untitled',sceneCount:scenes.length,fields:Object.keys(config),config,warnings,range:{start,end}};
}
export function prepareTemplate(html,values){
  const report=analyzeTemplate(html),config={...report.config};
  for(const key of Object.keys(FIELD_TYPES)){
    if(!(key in values))continue;
    const value=values[key];
    if(key==='photos'){
      if(!Array.isArray(value)||value.length>2||value.some(v=>typeof v!=='string'||v.length>500000))throw new Error('Invalid photos.');
    }else if(typeof value!=='string'||value.length>(key==='message'?1000:300))throw new Error('Invalid '+key+'.');
    config[key]=value;
  }
  if(!config.partner1.trim()||!config.partner2.trim()||!config.venue.trim())throw new Error('Names and venue are required.');
  const date=new Date(config.date+'T00:00:00');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(config.date)||Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==config.date)throw new Error('Invalid wedding date.');
  const replacement=JSON.stringify(config).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  const prepared=html.slice(0,report.range.start)+replacement+html.slice(report.range.end+1);
  const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'">`;
  return prepared.replace(/<head\b[^>]*>/i,m=>m+csp);
}
export const supportedFields=FIELD_TYPES;