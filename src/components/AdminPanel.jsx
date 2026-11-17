import { useEffect, useMemo, useRef, useState } from "react";
import "./AdminPanel.css";

const STORAGE_KEY = "event-template-admin-v2";
const CATEGORIES = ["Wedding","Birthday","Anniversary","Engagement","Baby Shower","Festival","Corporate","Other"];
const DEFAULT_FIELDS = [
  { label:"Bride name", key:"brideName", type:"Text", required:true, maxLength:60, placeholder:"Bride's full name", helpText:"", displayFormat:"" },
  { label:"Groom name", key:"groomName", type:"Text", required:true, maxLength:60, placeholder:"Groom's full name", helpText:"", displayFormat:"" },
  { label:"Event date", key:"eventDate", type:"Date", required:true, maxLength:40, placeholder:"", helpText:"", displayFormat:"7 January 2027" },
  { label:"Event time", key:"eventTime", type:"Time", required:false, maxLength:30, placeholder:"", helpText:"", displayFormat:"" },
  { label:"Venue name", key:"venueName", type:"Text", required:true, maxLength:100, placeholder:"Venue name", helpText:"", displayFormat:"" },
  { label:"Venue address", key:"venueAddress", type:"Long text", required:false, maxLength:180, placeholder:"Full venue address", helpText:"", displayFormat:"" },
  { label:"Invitation message", key:"invitationMessage", type:"Long text", required:false, maxLength:300, placeholder:"Your invitation message", helpText:"", displayFormat:"" },
  { label:"Host line", key:"hostLine", type:"Text", required:false, maxLength:100, placeholder:"Hosted by...", helpText:"", displayFormat:"" }
];
const FONT_OPTIONS = ["Arial","Georgia","Times New Roman","Verdana","Trebuchet MS","Courier New","Palatino Linotype","Impact","Brush Script MT"," system-ui"];
const SAMPLE_DATA = {
  "Short names": { brideName:"Ava",groomName:"Leo",eventDate:"7 January 2027",eventTime:"6:30 PM",venueName:"Rose Garden",venueAddress:"Pune, Maharashtra",invitationMessage:"Join us to celebrate",hostLine:"Together with our families" },
  "Long names": { brideName:"Muhammad Abdullah",groomName:"Fatima Zahra",eventDate:"7 January 2027",eventTime:"6:30 PM",venueName:"The Grand Celebration Convention Centre",venueAddress:"Baner Road, Pune, Maharashtra, India",invitationMessage:"With great joy, we invite you to celebrate this beautiful beginning with our families and loved ones.",hostLine:"Together with our families" },
  "Empty optional fields": { brideName:"Ava",groomName:"Leo",eventDate:"7 January 2027",eventTime:"",venueName:"Rose Garden",venueAddress:"",invitationMessage:"",hostLine:"" }
};

function readTemplates() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(x => x && typeof x.id === "string") : [];
  } catch { return []; }
}
function makeKey(label) {
  return label.trim().replace(/([a-z0-9])([A-Z])/g,"$1 $2").toLowerCase().replace(/[^a-z0-9]+(.)/g,(_,c)=>c.toUpperCase()).replace(/^[^a-z]+/,"") || "field";
}
function inspectHtml(html) {
  const keys = [...html.matchAll(/data-bind\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1]);
  const photos = [...html.matchAll(/data-photo-slot\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1]);
  return { keys:[...new Set(keys)], photos:[...new Set(photos)], duplicateKeys:[...new Set(keys.filter((x,i)=>keys.indexOf(x)!==i))] };
}
function Icon({name}) {
  const paths={grid:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,layers:<><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,plus:<><path d="M12 5v14M5 12h14"/></>,upload:<><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></>,close:<path d="m6 6 12 12M18 6 6 18"/>,search:<><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>};
  return <svg className="adm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.layers}</svg>;
}

export function AdminPanel() {
  const [templates,setTemplates]=useState(readTemplates);
  const [activeSection,setActiveSection]=useState("library");
  const [search,setSearch]=useState("");
  const [categoryFilter,setCategoryFilter]=useState("All");
  const [statusFilter,setStatusFilter]=useState("All");
  const [editorOpen,setEditorOpen]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [tab,setTab]=useState("Basics");
  const [title,setTitle]=useState("");
  const [category,setCategory]=useState("Wedding");
  const [description,setDescription]=useState("");
  const [longDescription,setLongDescription]=useState("");
  const [tags,setTags]=useState("");
  const [priceType,setPriceType]=useState("Free");
  const [price,setPrice]=useState("");
  const [currency,setCurrency]=useState("INR");
  const [duration,setDuration]=useState(30);
  const [aspectRatio,setAspectRatio]=useState("9:16");
  const [languages,setLanguages]=useState(["English","Hindi"]);
  const [thumbnail,setThumbnail]=useState(null);\n  const [thumbnailName,setThumbnailName]=useState("");
  const [designType,setDesignType]=useState("background");
  const [designFile,setDesignFile]=useState(null);
  const [designUrl,setDesignUrl]=useState("");
  const [htmlSource,setHtmlSource]=useState("");
  const [htmlScan,setHtmlScan]=useState({keys:[],photos:[],duplicateKeys:[]});
  const [fieldMappings,setFieldMappings]=useState({});
  const [fields,setFields]=useState(DEFAULT_FIELDS.map(x=>({...x})));
  const [slots,setSlots]=useState([{id:"photo1",label:"Couple photo",required:false,shape:"Rectangle",aspectRatio:"1:1",multiple:false}]);
  const [musicFile,setMusicFile]=useState(null);
  const [allowMusicUpload,setAllowMusicUpload]=useState(true);
  const [allowMusicLibrary,setAllowMusicLibrary]=useState(false);
  const [fadeOut,setFadeOut]=useState(2);
  const [elements,setElements]=useState([]);
  const [selectedElement,setSelectedElement]=useState(null);
  const [sample,setSample]=useState("Short names");
  const [scrubTime,setScrubTime]=useState(0);
  const [showGrid,setShowGrid]=useState(true);
  const [showSafe,setShowSafe]=useState(true);
  const [acceptDurationMismatch,setAcceptDurationMismatch]=useState(false);
  const [error,setError]=useState("");
  const [newFieldLabel,setNewFieldLabel]=useState("");
  const [backgroundMeta,setBackgroundMeta]=useState(null);
  const [dragging,setDragging]=useState(null);
  const canvasRef=useRef(null);
  const fileUrlRef=useRef("");

  useEffect(()=>{ try{localStorage.setItem(STORAGE_KEY,JSON.stringify(templates));}catch{} },[templates]);
  useEffect(()=>()=>{ if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current); },[]);
  const visible=useMemo(()=>templates.filter(t=>(categoryFilter==="All"||t.category===categoryFilter)&&(statusFilter==="All"||t.status===statusFilter)&&t.title.toLowerCase().includes(search.toLowerCase())),[templates,categoryFilter,statusFilter,search]);
  const published=templates.filter(t=>t.status==="Published").length;
  const resetEditor=(record=null)=>{
    setEditingId(record?.id||null); setTitle(record?.title||""); setCategory(record?.category||"Wedding");
    setDescription(record?.description||""); setLongDescription(record?.longDescription||""); setTags(record?.tags||"");
    setPriceType(record?.priceType||"Free"); setPrice(record?.price||""); setCurrency(record?.currency||"INR");
    setDuration(record?.duration||30); setAspectRatio(record?.aspectRatio||"9:16"); setLanguages(record?.languages||["English","Hindi"]);
    setDesignType(record?.designType||"background"); setDesignFile(null); setDesignUrl(""); setHtmlSource(record?.htmlSource||"");
    setHtmlScan(record?.htmlScan||{keys:[],photos:[],duplicateKeys:[]}); setFieldMappings(record?.fieldMappings||{});
    setFields(record?.fields?.length?record.fields.map(f=>({...f})):DEFAULT_FIELDS.map(f=>({...f})));
    setSlots(record?.slots?.length?record.slots.map(s=>({...s})): [{id:"photo1",label:"Couple photo",required:false,shape:"Rectangle",aspectRatio:"1:1",multiple:false}]);
    setMusicFile(null); setAllowMusicUpload(record?.allowMusicUpload??true); setAllowMusicLibrary(record?.allowMusicLibrary??false); setFadeOut(record?.fadeOut??2);
    setElements(record?.elements||[]); setThumbnail(null); setThumbnailName(record?.thumbnailName||""); setBackgroundMeta(record?.backgroundMeta||null);
    setAcceptDurationMismatch(false); setSample("Short names"); setScrubTime(0); setSelectedElement(null); setTab("Basics"); setError("");
    setEditorOpen(true);
  };
  const chooseDesign=async file=>{
    if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current=URL.createObjectURL(file); setDesignFile(file); setDesignUrl(fileUrlRef.current); setBackgroundMeta(null);
    if(designType==="html"){
      if(!/\.html?$/i.test(file.name)){setError("HTML mode currently accepts a single .html/.htm file. ZIP extraction is not available in this browser-only build.");return;}
      if(file.size>1024*1024){setError("HTML template must be 1 MB or smaller for safe local preview.");return;}
      const source=await file.text(); setHtmlSource(source); setHtmlScan(inspectHtml(source)); setError("");
    } else {
      const isVideo=/\.(mp4|webm|mov)$/i.test(file.name), isImage=/\.(png|jpe?g|webp)$/i.test(file.name);
      if(!isVideo&&!isImage){setError("Background must be MP4, WebM, MOV, PNG, JPG or WebP.");return;}
      const meta={name:file.name,size:file.size,type:isVideo?"video":"image",duration:null,width:null,height:null};
      const probe=document.createElement(isVideo?"video":"img");
      probe.onloadedmetadata=()=>{meta.duration=isVideo?probe.duration:null;meta.width=isVideo?probe.videoWidth:probe.naturalWidth;meta.height=isVideo?probe.videoHeight:probe.naturalHeight;setBackgroundMeta({...meta});};
      probe.onload=()=>{meta.width=probe.naturalWidth;meta.height=probe.naturalHeight;setBackgroundMeta({...meta});};
      probe.src=fileUrlRef.current; setBackgroundMeta(meta); setError("");
    }
  };
  const addField=()=>{
    const label=newFieldLabel.trim(); if(!label)return;
    let key=makeKey(label), suffix=2; while(fields.some(f=>f.key===key))key=makeKey(label)+suffix++;
    setFields(current=>[...current,{label,key,type:"Text",required:false,maxLength:100,placeholder:"",helpText:"",displayFormat:""}]); setNewFieldLabel("");
  };
  const updateField=(index,patch)=>setFields(current=>current.map((f,i)=>i===index?{...f,...patch}:f));
  const removeField=index=>setFields(current=>current.filter((_,i)=>i!==index));
  const addElement=field=>{
    const id="el_"+field.key;
    if(elements.some(e=>e.id===id))return;
    setElements(current=>[...current,{id,type:"text",fieldKey:field.key,label:field.label,x:15,y:15+current.length*9,width:70,height:7,fontFamily:"Georgia",fontSize:48,fontWeight:"400",color:"#ffffff",align:"center",letterSpacing:0,lineHeight:1.2,textTransform:"none",maxLines:2,autoShrink:true,minFontSize:22,prefix:"",suffix:"",start:0,end:Number(duration)||30,entrance:"Fade",exit:"Fade",visible:true,locked:false}]);
    setSelectedElement(id);
  };
  const addPhotoElement=slot=>{
    const id="el_"+slot.id;if(elements.some(e=>e.id===id))return;
    setElements(current=>[...current,{id,type:"photo",slotId:slot.id,label:slot.label,x:25,y:60,width:50,height:20,shape:slot.shape||"Rectangle",start:0,end:Number(duration)||30,entrance:"Fade",exit:"Fade",visible:true,locked:false}]);setSelectedElement(id);
  };
  const updateElement=(id,patch)=>setElements(current=>current.map(e=>e.id===id?{...e,...patch}:e));
  const activeElement=elements.find(e=>e.id===selectedElement);
  const sampleData=SAMPLE_DATA[sample]||SAMPLE_DATA["Short names"];
  const durationMismatch=backgroundMeta?.type==="video"&&backgroundMeta.duration&&Math.abs(backgroundMeta.duration-Number(duration))>0.5;
  const mappedKeys=Object.values(fieldMappings);
  const fieldStatus=f=>designType==="html"?(htmlScan.keys.includes(fieldMappings[f.key])?"Placed":"Not found in file"):(elements.some(e=>e.type==="text"&&e.fieldKey===f.key)?"Placed":"Not placed yet");
  const missingRequired=fields.filter(f=>f.required&&fieldStatus(f)!=="Placed");
  const requiredPhotos=slots.filter(s=>s.required&&!(designType==="html"?htmlScan.photos.includes(s.id):elements.some(e=>e.type==="photo"&&e.slotId===s.id)));
  const outside=elements.filter(e=>e.x<0||e.y<0||e.x+e.width>100||e.y+e.height>100);
  const longOverflow=elements.filter(e=>e.type==="text"&&sample==="Long names"&&e.fieldKey&&((sampleData[e.fieldKey]||"").length>24)&&!e.autoShrink);
  const overlap=elements.some((a,i)=>elements.slice(i+1).some(b=>a.visible&&b.visible&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y));
  const durationValid=Number(duration)>0&&(!durationMismatch||acceptDurationMismatch);
  const basicsValid=!!(title.trim()&&category&&(thumbnail||thumbnailName)&&description.trim());
  const designValid=designType==="html"?!!htmlSource:!!(designFile||backgroundMeta);
  const mappingValid=missingRequired.length===0;
  const photoValid=requiredPhotos.length===0;
  const layoutValid=outside.length===0&&longOverflow.length===0&&elements.every(e=>Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.start<e.end&&e.end<=Number(duration));
  const review=[["Basics complete",basicsValid,"Basics"],["Design uploaded",designValid,"Design"],["Required customer fields placed/mapped",mappingValid,"Customer Details"],["Required photo slots placed/detected",photoValid,"Photos"],["Layout valid with Long names sample",layoutValid,"Layout"],["Duration and background timing valid",durationValid,"Basics"]];
  const canPublish=review.every(x=>x[1]);
  const save=publish=>{
    if(!title.trim()){setTab("Basics");setError("Add a template name first.");return;}
    if(!designValid){setTab("Design");setError("Upload a design before saving.");return;}
    const record={id:editingId||("tpl_"+Date.now()),title:title.trim(),category,description,longDescription,tags,priceType,price,currency,duration:Number(duration),aspectRatio,languages,thumbnailName:thumbnail?.name||thumbnailName||null,designType,fileName:designFile?.name||backgroundMeta?.name||null,backgroundMeta,htmlSource:designType==="html"?htmlSource:"",htmlScan,fieldMappings,fields,slots,allowMusicUpload,allowMusicLibrary,fadeOut,elements,status:publish&&canPublish?"Published":"Draft",updatedAt:new Date().toISOString()};
    setTemplates(current=>editingId?current.map(t=>t.id===editingId?record:t.id===record.id?record:t):[record,...current]);
    setEditorOpen(false);setActiveSection("library");setError("");
  };
  const startDrag=(event,el)=>{
    if(el.locked)return;event.preventDefault();event.stopPropagation();
    const rect=canvasRef.current.getBoundingClientRect();
    setDragging({id:el.id,mode:event.target.dataset.resize?"resize":"move",startX:event.clientX,startY:event.clientY,rect,original:{x:el.x,y:el.y,width:el.width,height:el.height}});
    setSelectedElement(el.id);
  };
  useEffect(()=>{
    if(!dragging)return;
    const move=event=>{
      const dx=(event.clientX-dragging.startX)/dragging.rect.width*100,dy=(event.clientY-dragging.startY)/dragging.rect.height*100;
      const o=dragging.original;
      updateElement(dragging.id,dragging.mode==="resize"?{width:Math.max(4,Math.min(100-o.x,o.width+dx)),height:Math.max(3,Math.min(100-o.y,o.height+dy))}:{x:Math.max(0,Math.min(100-o.width,o.x+dx)),y:Math.max(0,Math.min(100-o.height,o.y+dy))});
    };
    const up=()=>setDragging(null);
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
    return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
  },[dragging]);
  const tabs=["Basics","Design","Customer Details","Photos","Music","Layout","Review"];
  const jump=next=>{setTab(next);setError("");};
  if(editorOpen)return <main className="adm-shell adm-editor-shell">
    <header className="adm-editor-top"><button className="adm-quiet-btn" onClick={()=>setEditorOpen(false)} type="button">← Back to library</button><div><strong>{editingId?"Edit template":"New template"}</strong><span> · {title||"Untitled design"}</span></div><span className="adm-local-tag">Browser-only workspace</span></header>
    <nav className="adm-wizard-tabs">{tabs.map((t,i)=><button key={t} className={tab===t?"active":""} onClick={()=>jump(t)} type="button"><small>0{i+1}</small>{t}</button>)}</nav>
    <div className="adm-editor-content">
      {tab==="Basics"&&<section className="adm-panel"><p className="adm-eyebrow">TEMPLATE IDENTITY</p><h1>Basics</h1><div className="adm-form-grid">
        <label className="adm-form-field">Template name<input value={title} maxLength={80} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Golden Garden Invitation"/></label>
        <label className="adm-form-field">Category<select value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
        <label className="adm-form-field">Duration (seconds)<input type="number" min="1" max="600" value={duration} onChange={e=>setDuration(e.target.value)}/></label>
        <label className="adm-form-field">Aspect ratio<select value={aspectRatio} onChange={e=>setAspectRatio(e.target.value)}><option>9:16</option><option>1:1</option><option>16:9</option></select></label>
        <label className="adm-form-field">Short description<input value={description} onChange={e=>setDescription(e.target.value)} maxLength={180} placeholder="A short customer-facing description"/></label>
        <label className="adm-form-field">Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="romantic, floral, minimal"/></label>
        <label className="adm-form-field adm-span-two">Long description<textarea value={longDescription} onChange={e=>setLongDescription(e.target.value)} rows="3"/></label>
        <div className="adm-form-field"><span>Languages</span><div className="adm-check-row">{["English","Hindi","Urdu","Gujarati"].map(l=><label key={l}><input type="checkbox" checked={languages.includes(l)} onChange={e=>setLanguages(v=>e.target.checked?[...v,l]:v.filter(x=>x!==l))}/>{l}</label>)}</div></div>
        <label className="adm-form-field">Thumbnail<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0]||null;setThumbnail(f);setThumbnailName(f?.name||"");}}/><small>{thumbnail?.name||thumbnailName||"Choose an image for the gallery card"}</small></label>
        <label className="adm-form-field">Pricing<select value={priceType} onChange={e=>setPriceType(e.target.value)}><option>Free</option><option>Paid</option></select></label>
        {priceType==="Paid"&&<><label className="adm-form-field">Amount<input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label className="adm-form-field">Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}>{["INR","USD","EUR","GBP"].map(c=><option key={c}>{c}</option>)}</select></label></>}
      </div></section>}
      {tab==="Design"&&<section className="adm-panel"><p className="adm-eyebrow">DESIGN CONTRACT</p><h1>Choose your design type</h1><div className="adm-type-choices"><button className={designType==="html"?"selected":""} onClick={()=>{setDesignType("html");setDesignFile(null);setDesignUrl("");}} type="button"><strong>01 · HTML template</strong><span>Single HTML file with data-bind and data-photo-slot placeholders.</span></button><button className={designType==="background"?"selected":""} onClick={()=>{setDesignType("background");setDesignFile(null);setDesignUrl("");}} type="button"><strong>02 · Background + overlays</strong><span>Video or image background. Add customer text and photo overlays in Layout.</span></button></div>
        <label className="adm-upload-zone"><input type="file" accept={designType==="html"?".html,.htm,.zip":".mp4,.webm,.mov,.png,.jpg,.jpeg,.webp"} onChange={e=>{const f=e.target.files?.[0];if(f)chooseDesign(f);}}/><span className="adm-upload-symbol"><Icon name="upload"/></span><strong>{designFile?.name||"Choose design file"}</strong><small>{designType==="html"?"HTML / HTM / ZIP · Single HTML inspection supported":"MP4, WebM, MOV, PNG, JPG or WebP background"}</small></label>
        {designType==="background"&&<p className="adm-info-note">Names, dates and photos are placed on top of this background in the next step. A flat video or image is only a background layer; it is not an editable invitation by itself.</p>}
        {designType==="html"&&htmlSource&&<><div className="adm-detected-grid"><div><b>Detected text keys</b>{htmlScan.keys.length?htmlScan.keys.map(k=><code key={k}>{k}</code>):<small>No data-bind keys found</small>}</div><div><b>Detected photo slots</b>{htmlScan.photos.length?htmlScan.photos.map(k=><code key={k}>{k}</code>):<small>No photo slots found</small>}</div></div>
          {htmlScan.duplicateKeys.length>0&&<p className="adm-warning">Duplicate data-bind keys: {htmlScan.duplicateKeys.join(", ")}</p>}
          <div className="adm-mapping-list"><h3>Field mapping</h3>{fields.map(f=><label key={f.key}>{f.label}<select value={fieldMappings[f.key]||""} onChange={e=>setFieldMappings(v=>({...v,[f.key]:e.target.value}))}><option value="">Not mapped</option>{htmlScan.keys.map(k=><option key={k}>{k}</option>)}</select></label>)}</div>
          <p className="adm-info-note">HTML preview is sandboxed in an isolated iframe. ZIP extraction is not supported in this browser-only version; upload the extracted index.html file.</p>
          <iframe className="adm-html-preview" title="Isolated HTML template preview" sandbox="" srcDoc={htmlSource}/></>}
        {designType==="background"&&backgroundMeta&&<div className="adm-file-meta"><b>{backgroundMeta.name}</b><span>{(backgroundMeta.size/1024/1024).toFixed(2)} MB</span><span>{backgroundMeta.width?backgroundMeta.width+" × "+backgroundMeta.height:"Reading dimensions…"}</span><span>{backgroundMeta.duration?backgroundMeta.duration.toFixed(2)+" sec":backgroundMeta.type==="image"?"Image background":"Reading duration…"}</span><button type="button" onClick={()=>{setDesignFile(null);setDesignUrl("");setBackgroundMeta(null);}}>Remove</button></div>}
        {designType==="background"&&designUrl&&backgroundMeta?.type==="image"&&<img className="adm-bg-preview" src={designUrl} alt="Selected background preview"/>}
        {designType==="background"&&designUrl&&backgroundMeta?.type==="video"&&<video className="adm-bg-preview" src={designUrl} controls muted/>}
        {durationMismatch&&<p className="adm-warning">Background duration differs from template duration ({duration}s). Accept this mismatch in Review only if intentional.</p>}
      </section>}
      {tab==="Customer Details"&&<section className="adm-panel"><p className="adm-eyebrow">CUSTOMER PERSONALIZATION</p><h1>Customer details</h1><p className="adm-muted">Define the exact data customers may enter. Keys are unique and connect to HTML bindings or Layout text elements.</p>
        {fields.map((f,i)=><article className="adm-field-editor" key={f.key}><div className="adm-field-head"><b>{f.label}</b><span className={"adm-placement "+(fieldStatus(f)==="Placed"?"good":"")}>{designType==="html"&&htmlSource&&fieldMappings[f.key]&&!htmlScan.keys.includes(fieldMappings[f.key])?"Not found in file":fieldStatus(f)}</span><button type="button" onClick={()=>removeField(i)}>Remove</button></div><div className="adm-form-grid">
          <label className="adm-form-field">Label<input value={f.label} onChange={e=>updateField(i,{label:e.target.value})}/></label>
          <label className="adm-form-field">Key<input value={f.key} onChange={e=>updateField(i,{key:makeKey(e.target.value)})}/></label>
          <label className="adm-form-field">Type<select value={f.type} onChange={e=>updateField(i,{type:e.target.value})}>{["Text","Date","Time","Long text"].map(t=><option key={t}>{t}</option>)}</select></label>
          <label className="adm-form-field">Max length<input type="number" min="1" max="2000" value={f.maxLength} onChange={e=>updateField(i,{maxLength:Number(e.target.value)})}/></label>
          <label className="adm-form-field">Placeholder<input value={f.placeholder} onChange={e=>updateField(i,{placeholder:e.target.value})}/></label>
          <label className="adm-form-field">Help text<input value={f.helpText} onChange={e=>updateField(i,{helpText:e.target.value})}/></label>
          {f.type==="Date"&&<label className="adm-form-field">Date display format<input value={f.displayFormat} onChange={e=>updateField(i,{displayFormat:e.target.value})} placeholder="7 January 2027"/></label>}
          <label className="adm-check-row"><input type="checkbox" checked={f.required} onChange={e=>updateField(i,{required:e.target.checked})}/> Required</label>
        </div></article>)}
        <div className="adm-add-field"><input value={newFieldLabel} onChange={e=>setNewFieldLabel(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addField();}}} placeholder="New customer field label"/><button type="button" onClick={addField}>Add field</button></div>
      </section>}
      {tab==="Photos"&&<section className="adm-panel"><p className="adm-eyebrow">MEDIA SLOTS</p><h1>Photo slots</h1>{slots.map((s,i)=><article className="adm-field-editor" key={s.id}><div className="adm-field-head"><b>{s.label}</b><button type="button" onClick={()=>setSlots(v=>v.filter((_,n)=>n!==i))}>Remove</button></div><div className="adm-form-grid">
        <label className="adm-form-field">Slot label<input value={s.label} onChange={e=>setSlots(v=>v.map((x,n)=>n===i?{...x,label:e.target.value}:x))}/></label>
        <label className="adm-form-field">Slot key<input value={s.id} onChange={e=>setSlots(v=>v.map((x,n)=>n===i?{...x,id:makeKey(e.target.value)}:x))}/></label>
        <label className="adm-form-field">Shape<select value={s.shape} onChange={e=>setSlots(v=>v.map((x,n)=>n===i?{...x,shape:e.target.value}:x))}>{["Rectangle","Rounded","Arch","Circle","Polaroid"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="adm-form-field">Aspect ratio<select value={s.aspectRatio} onChange={e=>setSlots(v=>v.map((x,n)=>n===i?{...x,aspectRatio:e.target.value}:x))}>{["1:1","3:4","4:3","16:9","9:16"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="adm-check-row"><input type="checkbox" checked={s.required} onChange={e=>setSlots(v=>v.map((x,n)=>n===i?{...x,required:e.target.checked}:x))}/> Required</label>
        <label className="adm-check-row"><input type="checkbox" checked={s.multiple} onChange={e=>setSlots(v=>v.map((x,n)=>n===i?{...x,multiple:e.target.checked}:x))}/> Accept multiple photos (slideshow)</label>
      </div></article>)}<button className="adm-secondary-btn" type="button" onClick={()=>setSlots(v=>[...v,{id:"photo"+(v.length+1),label:"New photo slot",required:false,shape:"Rectangle",aspectRatio:"1:1",multiple:false}])}>+ Add photo slot</button>
        {designType==="html"&&<p className="adm-info-note">HTML photo slots must match detected data-photo-slot IDs. Map photo slots to detected IDs when preparing the HTML design.</p>}</section>}
      {tab==="Music"&&<section className="adm-panel"><p className="adm-eyebrow">AUDIO OPTIONS</p><h1>Music</h1><label className="adm-form-field">Default track (optional)<input type="file" accept="audio/*" onChange={e=>setMusicFile(e.target.files?.[0]||null)}/><small>{musicFile?.name||"No default track selected"}</small></label>{musicFile&&<audio controls src={URL.createObjectURL(musicFile)}/>}<label className="adm-check-row"><input type="checkbox" checked={allowMusicUpload} onChange={e=>setAllowMusicUpload(e.target.checked)}/> Allow customer-uploaded music</label><label className="adm-check-row"><input type="checkbox" checked={allowMusicLibrary} onChange={e=>setAllowMusicLibrary(e.target.checked)}/> Allow music library</label>{!allowMusicLibrary&&<p className="adm-info-note">Music library not available yet.</p>}<label className="adm-form-field">Fade-out seconds<input type="number" min="0" max="30" step=".5" value={fadeOut} onChange={e=>setFadeOut(e.target.value)}/></label></section>}
      {tab==="Layout"&&<section className="adm-panel adm-layout-panel"><p className="adm-eyebrow">POSITION EDITOR · 1080 × 1920</p><h1>Layout</h1>{designType==="html"?<p className="adm-info-note">Positions, fonts and timing for HTML templates are defined in the HTML file. The Layout position editor is for Background + overlays designs.</p>:<>
        <div className="adm-layout-tools"><label>Sample data<select value={sample} onChange={e=>setSample(e.target.value)}>{["Short names","Long names","Empty optional fields","No photos","6 photos"].map(x=><option key={x}>{x}</option>)}</select></label><label><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)}/> Grid</label><label><input type="checkbox" checked={showSafe} onChange={e=>setShowSafe(e.target.checked)}/> Safe zone</label></div>
        <div className="adm-layout-workspace"><div className="adm-layer-panel"><h3>Elements</h3><b>Customer text</b>{fields.map(f=><button key={f.key} type="button" onClick={()=>addElement(f)}>＋ {f.label}</button>)}<b>Photo slots</b>{slots.map(s=><button key={s.id} type="button" onClick={()=>addPhotoElement(s)}>＋ {s.label}</button>)}<hr/>{elements.map((e,i)=><div className={"adm-layer-row "+(selectedElement===e.id?"active":"")} key={e.id}><button type="button" onClick={()=>setSelectedElement(e.id)}>{e.label}</button><button type="button" onClick={()=>updateElement(e.id,{visible:!e.visible})}>{e.visible?"◉":"○"}</button><button type="button" onClick={()=>updateElement(e.id,{locked:!e.locked})}>{e.locked?"Locked":"Lock"}</button><button type="button" onClick={()=>setElements(v=>{const a=[...v];if(i>0)[a[i-1],a[i]]=[a[i],a[i-1]];return a;})}>↑</button><button type="button" onClick={()=>setElements(v=>{const a=[...v];if(i<a.length-1)[a[i],a[i+1]]=[a[i+1],a[i]];return a;})}>↓</button></div>)}</div>
          <div className="adm-canvas-column"><div ref={canvasRef} className={"adm-phone-canvas "+(showGrid?"grid":"")} style={{aspectRatio:"9 / 16"}}>{designUrl&&backgroundMeta?.type==="image"&&<img src={designUrl} alt="" className="adm-canvas-background"/>}{designUrl&&backgroundMeta?.type==="video"&&<video src={designUrl} className="adm-canvas-background" muted/>}{showSafe&&<div className="adm-safe-zone"/>}
            {elements.filter(e=>e.visible&&scrubTime>=e.start&&scrubTime<=e.end).map(e=><div key={e.id} onPointerDown={event=>startDrag(event,e)} className={"adm-canvas-element "+(selectedElement===e.id?"selected":"")+(e.type==="photo"?" photo":"")} style={{left:e.x+"%",top:e.y+"%",width:e.width+"%",height:e.height+"%",fontFamily:e.fontFamily,fontSize:"clamp(8px,"+((e.autoShrink&&sample==="Long names"&&String(sampleData[e.fieldKey]||"").length>12?Math.max(e.minFontSize,e.fontSize*0.68):e.fontSize)/10)+"vw,30px)",fontWeight:e.fontWeight,color:e.color,textAlign:e.align,transform:e.rotation?"rotate("+e.rotation+"deg)":undefined}}>{e.type==="text"?(e.prefix+(sampleData[e.fieldKey]||"Sample text")+(e.suffix||"")):"PHOTO · "+e.label}<button type="button" data-resize="true" className="adm-resize-handle" aria-label="Resize element"/></div>)}</div><div className="adm-timeline"><label>Preview time · {scrubTime.toFixed(1)}s<input type="range" min="0" max={Math.max(1,Number(duration)||30)} step=".1" value={Math.min(scrubTime,Number(duration)||30)} onChange={e=>setScrubTime(Number(e.target.value))}/></label></div></div>
          <aside className="adm-properties"><h3>Properties</h3>{activeElement?<>
            <label>Label<input value={activeElement.label} onChange={e=>updateElement(activeElement.id,{label:e.target.value})}/></label><label>Position X %<input type="number" value={activeElement.x} onChange={e=>updateElement(activeElement.id,{x:Number(e.target.value)})}/></label><label>Position Y %<input type="number" value={activeElement.y} onChange={e=>updateElement(activeElement.id,{y:Number(e.target.value)})}/></label><label>Width %<input type="number" value={activeElement.width} onChange={e=>updateElement(activeElement.id,{width:Number(e.target.value)})}/></label><label>Height %<input type="number" value={activeElement.height} onChange={e=>updateElement(activeElement.id,{height:Number(e.target.value)})}/></label>
            {activeElement.type==="text"&&<><label>Font family<select value={activeElement.fontFamily} onChange={e=>updateElement(activeElement.id,{fontFamily:e.target.value})}>{FONT_OPTIONS.map(f=><option key={f}>{f}</option>)}</select></label><label>Font size<input type="number" min="8" max="200" value={activeElement.fontSize} onChange={e=>updateElement(activeElement.id,{fontSize:Number(e.target.value)})}/></label><label>Weight<select value={activeElement.fontWeight} onChange={e=>updateElement(activeElement.id,{fontWeight:e.target.value})}><option>400</option><option>600</option><option>700</option><option>800</option></select></label><label>Colour<input type="color" value={activeElement.color} onChange={e=>updateElement(activeElement.id,{color:e.target.value})}/></label><label>Alignment<select value={activeElement.align} onChange={e=>updateElement(activeElement.id,{align:e.target.value})}>{["left","center","right"].map(x=><option key={x}>{x}</option>)}</select></label><label>Letter spacing<input type="number" step=".1" value={activeElement.letterSpacing} onChange={e=>updateElement(activeElement.id,{letterSpacing:Number(e.target.value)})}/></label><label>Line height<input type="number" step=".1" value={activeElement.lineHeight} onChange={e=>updateElement(activeElement.id,{lineHeight:Number(e.target.value)})}/></label><label>Text transform<select value={activeElement.textTransform} onChange={e=>updateElement(activeElement.id,{textTransform:e.target.value})}>{["none","uppercase","lowercase","capitalize"].map(x=><option key={x}>{x}</option>)}</select></label><label>Max lines<input type="number" min="1" max="10" value={activeElement.maxLines} onChange={e=>updateElement(activeElement.id,{maxLines:Number(e.target.value)})}/></label><label>Minimum font size<input type="number" value={activeElement.minFontSize} onChange={e=>updateElement(activeElement.id,{minFontSize:Number(e.target.value)})}/></label><label>Prefix<input value={activeElement.prefix} onChange={e=>updateElement(activeElement.id,{prefix:e.target.value})}/></label><label>Suffix<input value={activeElement.suffix} onChange={e=>updateElement(activeElement.id,{suffix:e.target.value})}/></label><label className="adm-check-row"><input type="checkbox" checked={activeElement.autoShrink} onChange={e=>updateElement(activeElement.id,{autoShrink:e.target.checked})}/> Auto-shrink to fit</label></>}
            {activeElement.type==="photo"&&<><label>Shape<select value={activeElement.shape} onChange={e=>updateElement(activeElement.id,{shape:e.target.value})}>{["Rectangle","Rounded","Arch","Circle","Polaroid"].map(x=><option key={x}>{x}</option>)}</select></label><label>Rotation<input type="number" value={activeElement.rotation||0} onChange={e=>updateElement(activeElement.id,{rotation:Number(e.target.value)})}/></label></>}
            <label>Start time (s)<input type="number" min="0" step=".1" value={activeElement.start} onChange={e=>updateElement(activeElement.id,{start:Number(e.target.value)})}/></label><label>End time (s)<input type="number" min="0" step=".1" value={activeElement.end} onChange={e=>updateElement(activeElement.id,{end:Number(e.target.value)})}/></label><label>Entrance<select value={activeElement.entrance} onChange={e=>updateElement(activeElement.id,{entrance:e.target.value})}>{["Fade","Slide up","Pop","Wipe","Typewriter","None"].map(x=><option key={x}>{x}</option>)}</select></label><label>Exit<select value={activeElement.exit} onChange={e=>updateElement(activeElement.id,{exit:e.target.value})}>{["Fade","Slide up","Pop","Wipe","Typewriter","None"].map(x=><option key={x}>{x}</option>)}</select></label><button className="adm-danger-btn" type="button" onClick={()=>{setElements(v=>v.filter(x=>x.id!==activeElement.id));setSelectedElement(null);}}>Delete element</button>
          </>:<p className="adm-muted">Select an element on the canvas or add one from the layer list.</p>}</aside>
        </div>
        <div className="adm-validation"><b>Live validation</b><span className={outside.length?"bad":"good"}>{outside.length?outside.length+" element(s) outside canvas":"No elements outside canvas"}</span><span className={longOverflow.length?"bad":"good"}>{longOverflow.length?"Long-name overflow needs attention":"Long names fit or auto-shrink is enabled"}</span><span className={overlap?"warn":"good"}>{overlap?"Elements overlap":"No overlapping elements"}</span><span className={elements.some(e=>e.start>=e.end||e.end>Number(duration))?"bad":"good"}>Timing checked against {duration}s duration</span></div>
        <p className="adm-preview-note">Preview only - export is separate. This editor does not generate an MP4.</p>
      </>}</section>}
      {tab==="Review"&&<section className="adm-panel"><p className="adm-eyebrow">FINAL CHECK</p><h1>Review & publish</h1><div className="adm-review-summary"><span>Duration <b>{duration}s</b></span><span>Aspect ratio <b>{aspectRatio}</b></span><span>Design <b>{designType==="html"?"HTML":"Background + overlays"}</b></span></div>{review.map(([label,ok,target])=><button type="button" className="adm-review-row" key={label} onClick={()=>jump(target)}><span className={ok?"check-ok":"check-no"}>{ok?"✓":"!"}</span><span>{label}</span><b>{ok?"Passed":"Fix required"}</b><small>Go to {target} →</small></button>)}{missingRequired.length>0&&<p className="adm-warning">Required fields not placed: {missingRequired.map(f=>f.label).join(", ")}</p>}{requiredPhotos.length>0&&<p className="adm-warning">Required photo slots not placed: {requiredPhotos.map(s=>s.label).join(", ")}</p>}{htmlSource&&<p className="adm-info-note">Unmapped file keys: {htmlScan.keys.filter(k=>!mappedKeys.includes(k)).join(", ")||"None"}. Unmapped customer fields: {fields.filter(f=>!fieldMappings[f.key]).map(f=>f.label).join(", ")||"None"}.</p>}{durationMismatch&&<label className="adm-check-row"><input type="checkbox" checked={acceptDurationMismatch} onChange={e=>setAcceptDurationMismatch(e.target.checked)}/> I accept the background duration mismatch</label>}<p className="adm-muted">Publish is available only when all six checklist conditions pass. Publishing here changes this browser's local record only; it does not make the template visible on the customer website.</p></section>}
      {error&&<p className="adm-form-error" role="alert">{error}</p>}
      <footer className="adm-editor-footer"><button className="adm-quiet-btn" type="button" onClick={()=>setEditorOpen(false)}>Cancel</button><div><button className="adm-secondary-btn" type="button" onClick={()=>save(false)}>Save draft</button><button className="adm-primary-btn" type="button" disabled={!canPublish} onClick={()=>save(true)}>Publish template →</button></div></footer>
    </div>
  </main>;
  return <main className="adm-shell"><aside className="adm-sidebar"><a className="adm-brand" href="/"><span className="adm-brand-symbol">W</span><span><strong>EVENT STUDIO</strong><small>CREATOR CONSOLE</small></span></a><div className="adm-side-caption">WORKSPACE</div><button className={"adm-nav-item "+(activeSection==="overview"?"active":"")} onClick={()=>setActiveSection("overview")} type="button"><Icon name="grid"/> Overview</button><button className={"adm-nav-item "+(activeSection==="library"?"active":"")} onClick={()=>setActiveSection("library")} type="button"><Icon name="layers"/> Template library <span className="adm-nav-count">{templates.length}</span></button><div className="adm-sidebar-bottom"><span className="adm-avatar">A</span><span><strong>Administrator</strong><small>Browser workspace</small></span></div></aside>
    <section className="adm-main"><header className="adm-topbar"><div className="adm-mobile-brand"><span className="adm-brand-symbol">W</span><strong>EVENT STUDIO</strong></div><div className="adm-breadcrumb">WORKSPACE / {activeSection.toUpperCase()}</div><a className="adm-site-link" href="/">View website ↗</a></header>
      {activeSection==="overview"?<div className="adm-content"><div className="adm-heading-row"><div><p className="adm-eyebrow">CREATOR CONTROL CENTER</p><h1>All your occasions.</h1><p className="adm-subtitle">Manage every invitation category from one workspace.</p></div><button className="adm-primary-btn" onClick={()=>resetEditor()} type="button"><Icon name="plus"/> New template</button></div><div className="adm-stats-grid"><article className="adm-stat-card"><span>Total templates</span><strong>{templates.length}</strong><small>Saved in this browser</small></article><article className="adm-stat-card"><span>Published locally</span><strong>{published}</strong><small>Not live on customer site</small></article><article className="adm-stat-card"><span>Drafts</span><strong>{templates.length-published}</strong><small>Unpublished records</small></article></div><div className="adm-category-grid">{CATEGORIES.map(c=><button className="adm-category-card" key={c} onClick={()=>{setCategoryFilter(c);setActiveSection("library");}} type="button"><strong>{c}</strong><small>{templates.filter(t=>t.category===c).length} templates</small></button>)}</div></div>:<div className="adm-content"><div className="adm-heading-row"><div><p className="adm-eyebrow">YOUR CONTENT, BEAUTIFULLY ORGANIZED</p><h1>Template library</h1><p className="adm-subtitle">Build reusable invitation templates across every category.</p></div><button className="adm-primary-btn" onClick={()=>resetEditor()} type="button"><Icon name="plus"/> Add template</button></div><div className="adm-library-toolbar"><label className="adm-search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search templates…"/></label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option><option>Draft</option><option>Published</option></select></div><div className="adm-category-pills">{["All",...CATEGORIES].map(c=><button key={c} className={categoryFilter===c?"active":""} onClick={()=>setCategoryFilter(c)} type="button">{c}</button>)}</div>{visible.length?<div className="adm-template-grid">{visible.map(t=><article className="adm-template-card" key={t.id}><div className="adm-template-art"><span className="adm-art-monogram">✦</span><span className="adm-art-label">{t.category.toUpperCase()}</span></div><div className="adm-template-info"><div className="adm-template-title-row"><div><h3>{t.title}</h3><span>{t.category} · {t.duration||30}s · {t.aspectRatio||"9:16"}</span></div><span className={"adm-status "+(t.status==="Published"?"published":"")}>{t.status}</span></div><p>{t.fields?.length||0} fields · {t.designType==="html"?"HTML template":"Background + overlays"}</p><div className="adm-template-actions"><button type="button" onClick={()=>resetEditor(t)}>Edit</button><button type="button" onClick={()=>setTemplates(v=>v.map(x=>x.id===t.id?{...x,status:"Draft"}:x))}>Unpublish</button><button className="adm-delete-btn" type="button" onClick={()=>{if(confirm("Delete this browser-only template record?"))setTemplates(v=>v.filter(x=>x.id!==t.id));}}>Delete</button></div></div></article>)}</div>:<div className="adm-empty-state"><span className="adm-empty-icon"><Icon name="layers"/></span><h2>Your template library starts here.</h2><p>Create a design contract, map customer fields and position overlays.</p><button className="adm-primary-btn" onClick={()=>resetEditor()} type="button"><Icon name="upload"/> Create first template</button></div>}<p className="adm-storage-note">Records and HTML source are stored in this browser's localStorage. Background files, thumbnails and music are not persisted as file data. Publishing does not sync to the customer website.</p></div>}</section>
  </main>;
}
