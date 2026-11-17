const escapeScriptJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export function buildRoyalPalaceInvitationHtml(details = {}, photoDataUrl = "") {
  const payload = {
    brideName: details.brideName || "",
    groomName: details.groomName || "",
    date: details.date || "",
    time: details.time || "",
    venue: details.venue || "",
    address: details.address || "",
    message: details.message || "",
    host: details.host || ""
  };
  const safeData = escapeScriptJson(payload);
  const safePhoto = escapeScriptJson(photoDataUrl || "");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=540,initial-scale=1">
<style>
*{box-sizing:border-box}html,body{margin:0;width:540px;height:960px;overflow:hidden;background:#190b13;color:#fff2dc;font-family:Georgia,"DejaVu Serif",serif}
#film{position:relative;width:540px;height:960px;overflow:hidden;background:radial-gradient(ellipse at 50% 36%,#8a553b 0,#4b1c2a 42%,#1b0b15 100%)}
#backdrop{position:absolute;inset:0;width:100%;height:100%;transform:scale(1.02);transform-origin:center center}
#backdrop .arch{fill:none;stroke:#d9b56f;stroke-width:3;opacity:.8}
#backdrop .arch-inner{fill:none;stroke:#f5dfac;stroke-width:1;opacity:.7}
#backdrop .column{fill:url(#goldColumn);stroke:#d8b16d;stroke-width:2}
#backdrop .stone{fill:#33131f;stroke:#d0a35f;stroke-width:2}
#backdrop .ornament{fill:#f2d69b;opacity:.86}
#backdrop .flower{fill:#f5e9d7;stroke:#cb9a54;stroke-width:1}
#backdrop .lamp{fill:#e9b65d;stroke:#fff0bc;stroke-width:1}
#shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,6,14,.22),transparent 27%,rgba(27,7,15,.04) 68%,rgba(16,4,10,.4))}
#frame{position:absolute;inset:22px;border:1px solid rgba(246,216,156,.75);border-radius:48% 48% 8px 8px / 16% 16% 8px 8px;box-shadow:inset 0 0 0 5px rgba(243,207,139,.12),0 0 20px rgba(255,203,118,.18);pointer-events:none}
#frame:before{content:"✦";position:absolute;left:50%;top:-13px;transform:translateX(-50%);padding:0 12px;background:#4d1726;color:#f0cf8a;font-size:19px}
#halo{position:absolute;left:50%;top:39%;width:430px;height:430px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(255,235,188,.22),rgba(255,210,135,.07) 48%,transparent 70%);animation:glow 4s ease-in-out infinite alternate}
@keyframes glow{from{opacity:.4;transform:translate(-50%,-50%) scale(.92)}to{opacity:.95;transform:translate(-50%,-50%) scale(1.07)}}
#scene{position:absolute;left:47px;right:47px;top:31%;height:405px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px 22px;border:1px solid rgba(235,193,116,.55);border-radius:48% 48% 14px 14px / 18% 18% 14px 14px;background:linear-gradient(145deg,rgba(255,246,226,.92),rgba(244,224,191,.8));box-shadow:0 18px 65px rgba(37,6,17,.32),inset 0 0 0 5px rgba(255,255,255,.18);color:#542332;opacity:0;transform:translateY(20px) scale(.98);transition:opacity .7s ease,transform .7s ease}
#scene.visible{opacity:1;transform:translateY(0) scale(1)}
#eyebrow{font-family:Arial,sans-serif;font-size:10px;letter-spacing:4px;font-weight:700;color:#9a6d35;text-transform:uppercase;margin-bottom:14px}
#ornament{font-size:23px;line-height:1;color:#bd8a42;margin:0 0 14px}
#title{max-width:100%;font-size:43px;line-height:1.12;font-weight:500;letter-spacing:-1px;color:#532235;overflow-wrap:anywhere}
#subtitle{max-width:100%;margin-top:15px;font-size:18px;line-height:1.45;font-style:italic;color:#75503e;overflow-wrap:anywhere}
#bottomline{margin-top:18px;font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#987342;line-height:1.5;max-width:100%}
#photo{position:absolute;left:50%;bottom:120px;transform:translateX(-50%);width:104px;height:78px;border:2px solid rgba(252,227,177,.9);border-radius:48% 48% 8px 8px;background:rgba(43,14,25,.18);display:none;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,.28)}
#photo img{width:100%;height:100%;object-fit:cover}
.petal{position:absolute;top:-30px;width:10px;height:17px;border-radius:85% 12% 85% 12%;background:linear-gradient(145deg,#f5c6c3,#9f263e);opacity:.8;animation:fall var(--fall) linear infinite;animation-delay:var(--delay)}
@keyframes fall{0%{transform:translateY(-35px) rotate(0);opacity:0}10%{opacity:.8}100%{transform:translate(var(--drift),1000px) rotate(520deg);opacity:0}}
.spark{position:absolute;width:4px;height:4px;border-radius:50%;background:#ffe8a9;box-shadow:0 0 8px 3px rgba(255,211,125,.7);animation:twinkle var(--speed) ease-in-out infinite alternate}
@keyframes twinkle{from{opacity:.2;transform:scale(.6)}to{opacity:1;transform:scale(1.4)}}
#particles{position:absolute;inset:0;pointer-events:none}
#progress{position:absolute;left:58px;right:58px;bottom:51px;height:2px;background:rgba(255,239,208,.45);overflow:hidden}
#progress span{display:block;height:100%;width:0;background:#f4d18d;box-shadow:0 0 10px #f5d08b}
#footer{position:absolute;bottom:26px;left:0;right:0;text-align:center;color:rgba(255,239,211,.86);font:700 8px Arial,sans-serif;letter-spacing:3px;text-shadow:0 1px 8px #39101c}
</style></head><body><main id="film">
<svg id="backdrop" viewBox="0 0 540 960" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
 <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#6d3340"/><stop offset=".55" stop-color="#3d1725"/><stop offset="1" stop-color="#1b0b15"/></linearGradient>
 <linearGradient id="goldColumn" x2="1"><stop stop-color="#6b3d29"/><stop offset=".35" stop-color="#e0bd77"/><stop offset=".7" stop-color="#8b5939"/><stop offset="1" stop-color="#f0d59a"/></linearGradient>
 <radialGradient id="glow"><stop stop-color="#ffe2a6" stop-opacity=".58"/><stop offset="1" stop-color="#e9b65d" stop-opacity="0"/></radialGradient>
</defs>
<rect width="540" height="960" fill="url(#wall)"/><ellipse cx="270" cy="390" rx="245" ry="330" fill="url(#glow)"/>
<path class="arch" d="M26 665V355C26 152 125 66 270 66s244 86 244 289v310"/>
<path class="arch-inner" d="M49 666V363C49 180 136 94 270 94s221 86 221 269v303"/>
<path class="arch" d="M88 666V385c0-148 68-220 182-220s182 72 182 220v281"/>
<path class="arch-inner" d="M108 664V390c0-132 60-200 162-200s162 68 162 200v274"/>
<path class="column" d="M31 300h34v390H31zM20 290h56v17H20zM20 680h56v22H20zM475 300h34v390h-34zM464 290h56v17h-56zM464 680h56v22h-56z"/>
<path class="arch" d="M135 665V467c0-88 47-145 135-145s135 57 135 145v198"/>
<path class="arch-inner" d="M153 665V468c0-77 39-126 117-126s117 49 117 126v197"/>
<path class="stone" d="M160 662h220v68H160zM140 730h260v28H140z"/>
<path class="arch" d="M175 657v-95q95-123 190 0v95"/>
<path class="arch-inner" d="M190 655v-88q80-103 160 0v88"/>
<path class="stone" d="M198 651v-65h144v65z"/>
<path class="ornament" d="M270 460l12 18-12 18-12-18zM270 515l8 11-8 11-8-11zM80 370l8 12-8 12-8-12zM460 370l8 12-8 12-8-12z"/>
<g class="flower"><circle cx="115" cy="330" r="8"/><circle cx="103" cy="350" r="7"/><circle cx="126" cy="352" r="7"/><circle cx="425" cy="330" r="8"/><circle cx="413" cy="350" r="7"/><circle cx="436" cy="352" r="7"/></g>
<path d="M66 240q40 35 80 0t80 0t80 0t80 0t80 0" fill="none" stroke="#e7c27c" stroke-width="4"/>
<g fill="#f3e6d1" stroke="#d6a65a" stroke-width="1"><circle cx="86" cy="253" r="7"/><circle cx="108" cy="266" r="7"/><circle cx="130" cy="272" r="7"/><circle cx="410" cy="253" r="7"/><circle cx="432" cy="266" r="7"/><circle cx="454" cy="272" r="7"/></g>
<g class="lamp"><path d="M70 805q15-25 30 0l-4 14H74z"/><path d="M440 805q15-25 30 0l-4 14h-22z"/><path d="M94 804q-9-18 0-29q9 11 0 29M464 804q-9-18 0-29q9 11 0 29"/></g>
<path d="M0 845q135-55 270 0t270 0v115H0z" fill="#1a0a13" opacity=".55"/>
</svg>
<div id="shade"></div><div id="halo"></div><div id="frame"></div><div id="particles"></div>
<section id="scene"><div id="eyebrow"></div><div id="ornament">❦</div><div id="title"></div><div id="subtitle"></div><div id="bottomline"></div></section>
<div id="photo"><img id="photo-image" alt="Customer photo"></div>
<div id="progress"><span></span></div><div id="footer">A CELEBRATION OF LOVE · A MOMENT TO REMEMBER</div></main>
<script>
const D = ${safeData}; const PHOTO = ${safePhoto};
const scenes = [
 {start:0,end:4,eyebrow:"A ROYAL CELEBRATION",title:"You're Invited",subtitle:"A beautiful beginning awaits",bottom:"WITH LOVE AND BLESSINGS"},
 {start:4,end:9,eyebrow:"TWO HEARTS · ONE PROMISE",title:[D.brideName,D.groomName].filter(Boolean).join(" & ")||"Bride Name & Groom Name",subtitle:"Together with their families",bottom:"REQUEST THE PLEASURE OF YOUR COMPANY"},
 {start:9,end:14,eyebrow:"SAVE THE DATE",title:D.date||"Your Wedding Date",subtitle:D.time||"A day to remember forever",bottom:"A NEW CHAPTER BEGINS"},
 {start:14,end:19,eyebrow:"A PERSONAL INVITATION",title:D.message||"Join us for a celebration of love",subtitle:D.host||"Together with our families",bottom:"YOUR PRESENCE WILL MEAN THE WORLD"},
 {start:19,end:24,eyebrow:"THE CELEBRATION",title:D.venue||"Your Venue Name",subtitle:D.address||"Venue address",bottom:"WE LOOK FORWARD TO WELCOMING YOU"},
 {start:24,end:30,eyebrow:"WITH LOVE",title:[D.brideName,D.groomName].filter(Boolean).join(" & ")||"Forever Starts Here",subtitle:D.date||"Our special day",bottom:D.host||"PLEASE JOIN OUR CELEBRATION"}
];
const scene=document.getElementById("scene");let current=-1;const start=performance.now();const particles=document.getElementById("particles");
for(let i=0;i<24;i++){const p=document.createElement("i");p.className="petal";p.style.left=Math.random()*100+"%";p.style.setProperty("--fall",(8+Math.random()*9)+"s");p.style.setProperty("--delay",(-Math.random()*16)+"s");p.style.setProperty("--drift",(-85+Math.random()*170)+"px");particles.appendChild(p)}
for(let i=0;i<32;i++){const p=document.createElement("i");p.className="spark";p.style.left=(4+Math.random()*92)+"%";p.style.top=(5+Math.random()*88)+"%";p.style.setProperty("--speed",(1.3+Math.random()*3.6)+"s");particles.appendChild(p)}
if(PHOTO){document.getElementById("photo").style.display="block";document.getElementById("photo-image").src=PHOTO;}
function tick(){const seconds=(performance.now()-start)/1000;const index=Math.max(0,Math.min(5,scenes.findIndex(s=>seconds>=s.start&&seconds<s.end)));if(index!==current){current=index;const s=scenes[index];scene.classList.remove("visible");setTimeout(()=>{document.getElementById("eyebrow").textContent=s.eyebrow;document.getElementById("title").textContent=s.title;document.getElementById("subtitle").textContent=s.subtitle;document.getElementById("bottomline").textContent=s.bottom;scene.classList.add("visible")},120)}document.getElementById("backdrop").style.transform="scale("+(1.02+.1*Math.min(1,seconds/30))+")";document.querySelector("#progress span").style.width=(seconds/30*100)+"%";requestAnimationFrame(tick)}
requestAnimationFrame(tick);
</script></body></html>`;
}
export const ROYAL_PALACE_DEFAULT_MUSIC_DATA_URL = "data:audio/mpeg;base64,SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjcuMTAzAAAAAAAAAAAAAAD/83DAAAAAAAAAAAAASW5mbwAAAA8AAAGBAAB2kgAEBgkMDhETFhgbHSAjJScqLS8yNTc5PD9BREZIS05QU1ZYWl1gYmVnaWxvcXR3eXt+gYOGiYuNkJKVmJqcnKkp6qsrrGztrm7vcDDxcjLzc/S1dfa3N7h5Obp7O7w8/b4+/4AAAAATGF2YzYxLjE5AAAAAAAAAAAAAAAAJAKsAAAAAAAAdpL4v3VfAAAAAAAAAAAAAAAAAP/zMMQAB8gGab4ARgJRqZ4f7/cAFLkHKGqbW+uO/8hOXVn5//n+Xvy/Z//LqpcZiMTODIPDcFFpAKIVGQlsBgIxgCCY5AYoiOlEHjjvxv/zMsQhDeiGIADQcMDiEgzY8tVVUjcpXl0ilqv/+v//vo//VW4AVwDlgHHwlSHBpoqHpmHJ5l2FZhJCHESZjftoAgM729Jh91IhBqz9bub/8zDEKw3AhiQA33YgP41ZpO01ETcG4EvrWBMlRwUMmO05gRqbqmmOQ8eo6hnsNDoWMGKA5nLDgQLmndwkAyKrKkmLOd3vO5VWZC2ayar/8zLENQ2AhiwA3zYhlZQaIDDICDOc2N3NVdgAHRuPFRo8FBhghGHCAgLZgo2QjQ05HU7IDl8HDQHo+UHO441nRNDixZtp30pkRhGAKdYc//MwxEEOaIYsAN94IDqZLkCCCOMIBvMd/3MSxTM88HxETDF1hAbWdTZgOB7XH8f9JCczu/+ssYsaAKq4ry0RgCCguBoAGICiGLInmZhO//MwxEgN+IYwAO54RYBDA7Eso07BYw8UzGsxIJWFf5iDBxAHocIC13bbguen+Y3/8vxQyXJxQij5//QqLAJsBBgJGELBGUwpGqxTlgZj//MyxFEPiIosAO66RKn6A1+GA2mg1WQwINsDXQgsckmiRCcvyAGio/Vt1+f/bDtmRBmqjnOrGA284kCDRo0OjOo6RDDAZC9MPNtMKhLmEP/zMMRUDsCKLADuukSBZjWCwsKqhbGjAYOziZ1gMJLfR1lQsEsV7Sd/9V14GP6OKQl4J//////11QApJbLQBKZpmJidOZkoGMjQICB1KP/zMMRaEQiGKADnuiDwdMgqFwQJ1hpbHyEHGQ2Gw672yrVfZ/UR4GIvk+Gf3exaf7s79H7P/05reoiz4dAXMCQh8wtwljGJFZMG4IAzCf/zMsRWECiCSH7fKDBLQxpAgDgeDecAMjexO4VtmgcLAECVyO4240GkI7zvO6oVsA1LHIrgdYWpYYPAJqosniR6d1U5hIhtmJO12YIgS4L/8zDEVw9YhiwA9rpFg7MZwuMJgBQqSdMAhKOPmrMIgETDZ2uwOCOL4Zc7jjQKJmGKbvHUElJdyKpgGCBjM0xmiR5nGiRj2Gx4NCBReRn/8zLEKwA=";


let royalMusicCache = "";

export function createRoyalPalaceDefaultMusicDataUrl() {
  if (royalMusicCache) return royalMusicCache;

  const sampleRate = 16000;
  const duration = 10;
  const sampleCount = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, sampleCount * 2, true);

  const notes = [
    [293.66, 0], [349.23, 1.7], [392, 3.4], [440, 5.1],
    [392, 6.8], [349.23, 8.3]
  ];
  for (let i = 0; i < sampleCount; i += 1) {
    const time = i / sampleRate;
    let value = 0;
    for (const [frequency, start] of notes) {
      const noteTime = time - start;
      if (noteTime >= 0 && noteTime < 2.15) {
        const envelope = Math.exp(-noteTime * 2.05) * (1 - Math.exp(-noteTime * 34));
        value += (Math.sin(2 * Math.PI * frequency * noteTime)
          + 0.34 * Math.sin(2 * Math.PI * frequency * 2.01 * noteTime)
          + 0.11 * Math.sin(2 * Math.PI * frequency * 4 * noteTime)) * envelope * 0.16;
      }
    }
    value += 0.023 * Math.sin(2 * Math.PI * 146.83 * time);
    value += 0.016 * Math.sin(2 * Math.PI * 196 * time);
    const beatTime = time % 0.72;
    value += 0.035 * Math.sin(2 * Math.PI * (78 - 25 * beatTime) * beatTime) * Math.exp(-beatTime * 18);
    const fade = Math.min(1, time / 0.7, (duration - time) / 1.1);
    const sample = Math.max(-1, Math.min(1, Math.tanh(value * 1.8) * Math.max(0, fade)));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  royalMusicCache = "data:audio/wav;base64," + btoa(binary);
  return royalMusicCache;
}
