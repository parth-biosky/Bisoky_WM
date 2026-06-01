// @ts-nocheck
"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
const TODAY_DATE = () => new Date().toISOString().slice(0,10);
function makeTheme(dark) {
  return {
    bg: dark ? "#0F0F11" : "#F5F5F7",
    surface: dark ? "#1A1A1F" : "#FFFFFF",
    surfaceHov: dark ? "#22222A" : "#FAFAFA",
    overlay: dark ? "#2A2A35" : "#F0F0F2",
    border: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    borderMed: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.13)",
    text: dark ? "#F0F0F2" : "#0A0A0B",
    textSub: dark ? "#A0A0B0" : "#52525B",
    textMuted: dark ? "#666680" : "#A1A1AA",
    textTiny: dark ? "#44445A" : "#C4C4C8",
    accent: "#0052CC", accentHov: "#0747A6",
    accentSub: dark ? "#091E42" : "#DEEBFF",
    accentText: dark ? "#4C9AFF" : "#0052CC",
    done:   dark ? { bg:"#0A2018", text:"#4ADE80", dot:"#10B981" } : { bg:"#ECFDF5", text:"#065F46", dot:"#10B981" },
    inprog: dark ? { bg:"#201800", text:"#FCD34D", dot:"#F59E0B" } : { bg:"#FFFBEB", text:"#92400E", dot:"#F59E0B" },
    stuck:  dark ? { bg:"#200A0A", text:"#FCA5A5", dot:"#EF4444" } : { bg:"#FEF2F2", text:"#991B1B", dot:"#EF4444" },
    review: dark ? { bg:"#0A1020", text:"#93C5FD", dot:"#3B82F6" } : { bg:"#EFF6FF", text:"#1E40AF", dot:"#3B82F6" },
    todo:   dark ? { bg:"#18181F", text:"#A0A0B0", dot:"#555570" } : { bg:"#F4F4F5", text:"#3F3F46", dot:"#A1A1AA" },
    high:"#EF4444", medium:"#F59E0B", low:"#10B981",
    font:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif", dark,
  };
}

const PAL = ["#0052CC","#10B981","#F59E0B","#EF4444","#3B82F6","#EC4899","#14B8A6","#8B5CF6","#F97316","#06B6D4"];
const DEPT_COLORS = ["#3B82F6","#8B5CF6","#F97316","#EC4899","#F59E0B","#10B981","#EF4444","#14B8A6","#6366F1","#84CC16"];
const DEPT_ICONS  = ["🤝","💻","📢","👤","📈","💰","💳","🎯","🚀","⚡","🔬","🎨","📊","🏆","🌟"];
const MTG_COLORS  = ["#0052CC","#10B981","#F59E0B","#EF4444","#3B82F6","#EC4899","#8B5CF6","#F97316"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY = 864e5;
const STATUSES   = ["Todo","In Progress","In Review","Stuck","Done"];
const PRIORITIES = ["Low","Medium","High"];
const VIS_OPTS = [
  { k:"private", icon:"🔒", label:"Private", desc:"Only you",          tagColor:"#6B7280", tagBg:"#F3F4F6", tagBgD:"#1A1A1A" },
  { k:"public",  icon:"🌐", label:"Public",  desc:"Everyone",          tagColor:"#1D4ED8", tagBg:"#EFF6FF", tagBgD:"#050F1A" },
  { k:"tagged",  icon:"🏷️", label:"Tagged",  desc:"Tagged members",    tagColor:"#7C3AED", tagBg:"#EDE9FE", tagBgD:"#100020" },
];
const DEFAULT_DEPTS = [
  { key:"Sales & BD",           icon:"🤝", color:"#3B82F6", bg:"#EFF6FF", bgD:"#050F1A" },
  { key:"Technology",           icon:"💻", color:"#8B5CF6", bg:"#F5F3FF", bgD:"#0D0A20" },
  { key:"Marketing",            icon:"📢", color:"#F97316", bg:"#FFF7ED", bgD:"#150800" },
  { key:"HR",                   icon:"👤", color:"#EC4899", bg:"#FDF2F8", bgD:"#150010" },
  { key:"Investment",           icon:"📈", color:"#F59E0B", bg:"#FFFBEB", bgD:"#150F00" },
  { key:"Finance & Accounting", icon:"💰", color:"#10B981", bg:"#ECFDF5", bgD:"#041209" },
  { key:"Revenue & Collection", icon:"💳", color:"#EF4444", bg:"#FEF2F2", bgD:"#150000" },
];
const INITIAL_USERS = [
  { id:1, name:"Saurabh",  role:"admin",  email:"saurabh@biosky.tech", dept:"Management" },
  { id:2, name:"Parth",    role:"member", email:"parth@biosky.tech",   dept:"Technology" },
];
const mkSubs = list => list.map(s=>({...s,notes:[],chat:[]}));
const SEED_PROJECTS = [];
const SEED_TASKS = [];
const SEED_MEETINGS = [];
const SEED_MSGS = [];
const visFilter = (notes, uid) => (notes||[]).filter(n =>
  n.visibility==="public" ||
  (n.visibility==="private" && n.authorId===uid) ||
  (n.visibility==="tagged" && (n.authorId===uid || (n.taggedUsers||[]).includes(uid)))
);
const ini = n => n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
const avc = id => PAL[(id-1)%PAL.length];
const ThemeCtx = React.createContext(makeTheme(false));
const UsersCtx = React.createContext({ users: INITIAL_USERS, setUsers: ()=>{} });
const useT = () => React.useContext(ThemeCtx);
const useUsers = () => React.useContext(UsersCtx);
function ss(s,T){ return ({Done:T.done,"In Progress":T.inprog,Stuck:T.stuck,"In Review":T.review,Todo:T.todo}[s]||T.todo); }
function pc(p){ return ({High:"#EF4444",Medium:"#F59E0B",Low:"#10B981"}[p]||"#A1A1AA"); }

function Av({ user, size=28 }) {
  const T = useT();
  return <div style={{ width:size,height:size,borderRadius:"50%",background:avc(user.id),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.34,fontWeight:600,color:"#fff",flexShrink:0,border:"2px solid "+T.surface }}>{ini(user.name)}</div>;
}
function AvatarStack({ ids, size=24, max=4 }) {
  const T = useT(); const { users } = useUsers();
  const members = ids.map(id=>users.find(u=>u.id===id)).filter(Boolean);
  const shown = members.slice(0,max), extra = members.length-max;
  return (
    <div style={{ display:"flex",alignItems:"center" }}>
      {shown.map((u,i)=><div key={u.id} style={{ marginLeft:i?-(size*0.35):0,zIndex:max-i }}><Av user={u} size={size}/></div>)}
      {extra>0 && <div style={{ width:size,height:size,borderRadius:"50%",background:T.overlay,border:"2px solid "+T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.32,fontWeight:700,color:T.textSub,marginLeft:-(size*0.35) }}>+{extra}</div>}
      {!ids.length && <span style={{ fontSize:11,color:"#C4C4C8" }}>Unassigned</span>}
    </div>
  );
}
function StatusBadge({ status }) {
  const T = useT(); const s = ss(status,T);
  return <span style={{ display:"inline-flex",alignItems:"center",gap:5,background:s.bg,color:s.text,fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:99,whiteSpace:"nowrap" }}><span style={{ width:5,height:5,borderRadius:"50%",background:s.dot }}/>{status}</span>;
}
function Tag({ label }) {
  const T = useT();
  return <span style={{ background:T.overlay,color:T.textSub,fontSize:10,fontWeight:500,padding:"2px 6px",borderRadius:4 }}>{label}</span>;
}
function Bar({ pct, color="#0052CC", height=4 }) {
  const T = useT();
  return <div style={{ background:T.overlay,borderRadius:99,height,overflow:"hidden",width:"100%" }}><div style={{ width:Math.max(0,Math.min(100,pct||0))+"%",height:"100%",background:color,borderRadius:99,transition:"width .3s" }}/></div>;
}
function Btn({ children, onClick, variant="ghost", small=false, disabled=false }) {
  const T = useT(); const [h,setH]=useState(false);
  const base = { display:"inline-flex",alignItems:"center",gap:6,borderRadius:8,fontSize:small?12:13,fontWeight:500,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",padding:small?"5px 10px":"7px 14px",fontFamily:T.font,border:"none" };
  const v = { primary:{...base,background:h&&!disabled?"#0747A6":"#0052CC",color:"#fff",opacity:disabled?0.55:1}, ghost:{...base,background:h?T.overlay:"transparent",color:T.textSub,border:"1px solid "+(h?T.borderMed:T.border)}, danger:{...base,background:h?"#200A0A":"transparent",color:"#EF4444",border:"1px solid "+T.border} };
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={v[variant]}>{children}</button>;
}
function EditText({ value, onSave, style={} }) {
  const T = useT(); const [ed,setEd]=useState(false),[val,setVal]=useState(value),ref=useRef();
  useEffect(()=>{ if(ed) ref.current?.focus(); },[ed]);
  const commit=()=>{ setEd(false); if(val.trim()&&val!==value) onSave(val.trim()); else setVal(value); };
  if(ed) return <input ref={ref} value={val} onChange={e=>setVal(e.target.value)} onBlur={commit} onKeyDown={e=>{ if(e.key==="Enter")commit(); if(e.key==="Escape"){setVal(value);setEd(false);} }} style={{ width:"100%",fontSize:13,fontWeight:500,border:"none",borderBottom:"2px solid #0052CC",outline:"none",background:"transparent",fontFamily:T.font,color:T.text,...style }}/>;
  return <span onClick={()=>setEd(true)} style={{ fontSize:13,fontWeight:500,color:T.text,cursor:"text",padding:"2px 4px",borderRadius:4,display:"block",...style }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{value}</span>;
}
function EditSelect({ value, options, onSave, renderValue }) {
  const T = useT(); const [open,setOpen]=useState(false),[pos,setPos]=useState({}),tRef=useRef(),mRef=useRef();
  useEffect(()=>{ if(!open) return; const h=e=>{ if(!tRef.current?.contains(e.target)&&!mRef.current?.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); },[open]);
  const toggle=()=>{ if(!open&&tRef.current){ const r=tRef.current.getBoundingClientRect(); setPos({top:r.bottom+4,left:r.left}); } setOpen(o=>!o); };
  return (
    <div ref={tRef} style={{ display:"inline-flex" }}>
      <div onClick={toggle} style={{ cursor:"pointer",padding:"2px 4px",borderRadius:6 }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{renderValue?renderValue(value):<span style={{ fontSize:13,color:T.text }}>{value}</span>}</div>
      {open && <div ref={mRef} style={{ position:"fixed",top:pos.top,left:pos.left,background:T.surface,border:"1px solid "+T.borderMed,borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,0.2)",zIndex:9999,minWidth:160,overflow:"hidden" }}>
        {options.map(o=><div key={o.v||o} onClick={()=>{ onSave(o.v||o); setOpen(false); }} style={{ padding:"8px 14px",fontSize:13,color:value===(o.v||o)?"#0052CC":T.text,fontWeight:value===(o.v||o)?600:400,cursor:"pointer",background:value===(o.v||o)?T.accentSub:"transparent" }} onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background=value===(o.v||o)?T.accentSub:"transparent"}>{o.l||o}</div>)}
      </div>}
    </div>
  );
}
function EditDate({ value, onSave }) {
  const T = useT(); const [ed,setEd]=useState(false);
  if(ed) return <input type="date" defaultValue={value} autoFocus onBlur={e=>{ setEd(false); if(e.target.value) onSave(e.target.value); }} onChange={e=>{ onSave(e.target.value); setEd(false); }} style={{ fontSize:12,border:"1px solid #0052CC",borderRadius:6,padding:"2px 6px",outline:"none",fontFamily:T.font,background:T.surface,color:T.text }}/>;
  return <span onClick={()=>setEd(true)} style={{ fontSize:12,color:T.textMuted,cursor:"pointer",padding:"2px 6px",borderRadius:6 }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{value||"Set date"}</span>;
}
function MultiAssignee({ values=[], onSave, size=24, max=4, label="+ Assign" }) {
  const T = useT(); const { users } = useUsers();
  const [open,setOpen]=useState(false),[pos,setPos]=useState({}), [search,setSearch]=useState(""),tRef=useRef(),mRef=useRef();
  useEffect(()=>{ if(!open) return; const h=e=>{ if(!tRef.current?.contains(e.target)&&!mRef.current?.contains(e.target)){setOpen(false);setSearch("");} }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); },[open]);
  const openMenu=e=>{ e.stopPropagation(); if(!open&&tRef.current){ const r=tRef.current.getBoundingClientRect(); const dropH=280; const spaceBelow=window.innerHeight-r.bottom; const top=spaceBelow<dropH?Math.max(8,r.top-dropH-6):r.bottom+6; const left=Math.min(r.left,window.innerWidth-240); setPos({top,left}); } setOpen(o=>!o); if(open) setSearch(""); };
  const toggle=id=>onSave(values.includes(id)?values.filter(v=>v!==id):[...values,id]);
  const filtered=users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div ref={tRef} style={{ display:"inline-flex",alignItems:"center" }}>
      <div onClick={openMenu} style={{ cursor:"pointer",padding:"3px 6px",borderRadius:8,display:"flex",alignItems:"center",gap:5 }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        {values.length?<AvatarStack ids={values} size={size} max={max}/>:<span style={{ fontSize:11,color:T.textMuted,padding:"2px 6px",borderRadius:99,border:"1px dashed "+T.borderMed }}>{label}</span>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      {open && <div ref={mRef} style={{ position:"fixed",top:pos.top,left:pos.left,background:T.surface,border:"1px solid "+T.borderMed,borderRadius:12,boxShadow:"0 10px 36px rgba(0,0,0,0.2)",zIndex:9999,width:230,padding:"6px",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",alignItems:"center",gap:6,background:T.bg,borderRadius:8,padding:"5px 9px",margin:"0 0 5px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members…" style={{ border:"none",outline:"none",fontSize:12,fontFamily:T.font,color:T.text,background:"transparent",flex:1 }}/>
        </div>
        <div style={{ padding:"0 4px 5px",fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:0.6,textTransform:"uppercase",borderBottom:"1px solid "+T.border,marginBottom:4 }}>Assignees · {values.length} selected</div>
        <div style={{ overflowY:"auto",maxHeight:220,minHeight:40,scrollbarWidth:"thin",scrollbarColor:T.borderMed+" transparent" }}>
          {filtered.length===0&&<div style={{ padding:"10px",fontSize:12,color:T.textMuted,textAlign:"center" }}>No members found</div>}
          {filtered.map(u=>{ const sel=values.includes(u.id); return (
            <div key={u.id} onClick={()=>toggle(u.id)} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 8px",borderRadius:8,cursor:"pointer",background:sel?T.accentSub:"transparent",marginBottom:2 }} onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background=T.bg; }} onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background="transparent"; }}>
              <Av user={u} size={26}/>
              <div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:13,fontWeight:sel?600:400,color:sel?T.accentText:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.name}</div><div style={{ fontSize:10,color:T.textMuted }}>{u.dept}</div></div>
              <div style={{ width:17,height:17,borderRadius:5,border:"2px solid "+(sel?"#0052CC":T.borderMed),background:sel?"#0052CC":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{sel&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
            </div>
          ); })}
        </div>
        {values.length>0&&<div style={{ borderTop:"1px solid "+T.border,marginTop:4,paddingTop:4 }}><div onClick={()=>onSave([])} style={{ padding:"7px 10px",fontSize:12,color:T.textMuted,cursor:"pointer",borderRadius:7,textAlign:"center" }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Clear all</div></div>}
      </div>}
    </div>
  );
}
function Modal({ children, onClose, width=500 }) {
  const T = useT();
  return (
    <div style={{ position:"fixed",inset:0,background:T.dark?"rgba(0,0,0,0.7)":"rgba(0,0,0,0.4)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center" }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:T.surface,borderRadius:18,width,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",padding:"28px",border:"1px solid "+T.border }} onClick={e=>e.stopPropagation()}>{children}</div>
    </div>
  );
}
function ConfirmModal({ title, message, onConfirm, onClose }) {
  const T = useT();
  return (
    <Modal onClose={onClose} width={380}>
      <h3 style={{ margin:"0 0 10px",fontSize:16,fontWeight:700,color:T.text }}>{title}</h3>
      <p style={{ fontSize:13,color:T.textSub,margin:"0 0 20px",lineHeight:1.6 }}>{message}</p>
      <div style={{ display:"flex",gap:10 }}>
        <button onClick={onConfirm} style={{ flex:1,padding:"10px",borderRadius:9,background:"#EF4444",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",fontFamily:T.font }}>Delete</button>
        <button onClick={onClose} style={{ flex:1,padding:"10px",borderRadius:9,background:T.overlay,color:T.textSub,fontSize:13,fontWeight:600,border:"1px solid "+T.border,cursor:"pointer",fontFamily:T.font }}>Cancel</button>
      </div>
    </Modal>
  );
}
function Field({ label, children, required=false }) {
  const T = useT();
  return <div><label style={{ fontSize:11,fontWeight:600,color:T.textSub,display:"block",marginBottom:5,letterSpacing:0.3 }}>{label}{required&&<span style={{color:"#EF4444",marginLeft:2}}>*</span>}</label>{children}</div>;
}
function inpStyle(T){ return { width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid "+T.border,fontSize:13,fontFamily:T.font,color:T.text,background:T.surface,outline:"none",boxSizing:"border-box" }; }

function AddCategoryModal({ onSave, onClose, existingDepts }) {
  const T = useT(); const [name,setName]=useState(""),[icon,setIcon]=useState("🎯"),[color,setColor]=useState(DEPT_COLORS[0]);
  const taken=existingDepts.map(d=>d.key.toLowerCase()); const valid=name.trim().length>0&&!taken.includes(name.trim().toLowerCase()); const IS=inpStyle(T);
  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}><h2 style={{ margin:0,fontSize:17,fontWeight:700,color:T.text }}>🏷️ Add New Category</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.textMuted }}>✕</button></div>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <Field label="Category Name" required><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Legal, Operations…" style={{ ...IS,borderColor:name&&!valid?"#EF4444":T.border }}/>{name&&!valid&&<p style={{ margin:"4px 0 0",fontSize:11,color:"#EF4444" }}>Already exists.</p>}</Field>
        <Field label="Icon"><div style={{ display:"flex",flexWrap:"wrap",gap:7,paddingTop:4 }}>{DEPT_ICONS.map(ic=><div key={ic} onClick={()=>setIcon(ic)} style={{ width:36,height:36,borderRadius:10,background:ic===icon?color+"22":T.overlay,border:"2px solid "+(ic===icon?color:T.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer" }}>{ic}</div>)}</div></Field>
        <Field label="Color"><div style={{ display:"flex",gap:7,flexWrap:"wrap",paddingTop:4 }}>{DEPT_COLORS.map(c=><div key={c} onClick={()=>setColor(c)} style={{ width:28,height:28,borderRadius:8,background:c,cursor:"pointer",border:color===c?"3px solid "+T.text:"3px solid transparent",boxSizing:"border-box" }}/>)}</div></Field>
        {name.trim()&&<div style={{ padding:"14px 16px",borderRadius:12,background:color+"14",border:"1.5px solid "+color+"44",display:"flex",alignItems:"center",gap:12 }}><div style={{ width:42,height:42,borderRadius:12,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{icon}</div><div><div style={{ fontSize:13,fontWeight:700,color:T.text }}>{name.trim()}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>Preview</div></div></div>}
      </div>
      <div style={{ display:"flex",gap:10,marginTop:22 }}>
        <button onClick={()=>{ if(valid) onSave({key:name.trim(),icon,color,bg:color+"14",bgD:color+"20"}); }} disabled={!valid} style={{ flex:1,padding:"11px",borderRadius:10,background:valid?"#0052CC":"#555",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:valid?"pointer":"not-allowed",fontFamily:T.font }}>Create Category</button>
        <button onClick={onClose} style={{ padding:"11px 18px",borderRadius:10,background:T.overlay,color:T.textSub,fontSize:13,fontWeight:600,border:"1px solid "+T.border,cursor:"pointer",fontFamily:T.font }}>Cancel</button>
      </div>
    </Modal>
  );
}
function QuickAddModal({ type, preAssignee, projects, depts, onSave, onClose }) {
  const T = useT(); const isTask=type==="task";
  const [vals,setVals]=useState(isTask?{title:"",project:projects[0]?.id||"",assignees:preAssignee?[preAssignee]:[],status:"Todo",priority:"Medium",startDate:"",deadline:""}:{name:"",category:depts[0]?.key||"",status:"In Progress",startDate:"",deadline:"",team:preAssignee?[preAssignee]:[],tags:""});
  const set=(k,v)=>setVals(p=>({...p,[k]:v})); const valid=isTask?vals.title.trim():vals.name.trim(); const IS=inpStyle(T);
  const submit=()=>{ if(!valid) return; if(isTask) onSave({id:Date.now(),...vals,project:Number(vals.project),assignees:vals.assignees||[],tags:[],subtasks:[]}); else onSave({id:Date.now(),...vals,progress:0,team:vals.team||[],tags:vals.tags.split(",").map(t=>t.trim()).filter(Boolean)}); onClose(); };
  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}><h2 style={{ margin:0,fontSize:16,fontWeight:700,color:T.text }}>{isTask?"✅ Add Task":"📁 Add Project"}</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.textMuted }}>✕</button></div>
      <div style={{ display:"flex",flexDirection:"column",gap:13 }}>
        {isTask?<>
          <Field label="Task Title" required><input value={vals.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Review Q3 report" style={IS}/></Field>
          <Field label="Project" required><select value={vals.project} onChange={e=>set("project",e.target.value)} style={IS}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <Field label="Status"><select value={vals.status} onChange={e=>set("status",e.target.value)} style={IS}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Priority"><select value={vals.priority} onChange={e=>set("priority",e.target.value)} style={IS}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></Field>
            <Field label="Start Date"><input type="date" value={vals.startDate} onChange={e=>set("startDate",e.target.value)} style={IS}/></Field>
            <Field label="Deadline"><input type="date" value={vals.deadline} onChange={e=>set("deadline",e.target.value)} style={IS}/></Field>
          </div>
          <Field label="Assignees"><div style={{ paddingTop:4 }}><MultiAssignee values={vals.assignees} onSave={v=>set("assignees",v)} size={28} label="Click to assign"/></div></Field>
        </>:<>
          <Field label="Project Name" required><input value={vals.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Q3 Campaign" style={IS}/></Field>
          <Field label="Department" required><select value={vals.category} onChange={e=>set("category",e.target.value)} style={IS}>{depts.map(d=><option key={d.key} value={d.key}>{d.icon} {d.key}</option>)}</select></Field>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <Field label="Status"><select value={vals.status} onChange={e=>set("status",e.target.value)} style={IS}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Start Date"><input type="date" value={vals.startDate} onChange={e=>set("startDate",e.target.value)} style={IS}/></Field>
            <Field label="Deadline"><input type="date" value={vals.deadline} onChange={e=>set("deadline",e.target.value)} style={IS}/></Field>
          </div>
          <Field label="Team Members"><div style={{ paddingTop:4 }}><MultiAssignee values={vals.team} onSave={v=>set("team",v)} size={28} label="Click to assign"/></div></Field>
          <Field label="Tags (comma separated)"><input value={vals.tags} onChange={e=>set("tags",e.target.value)} placeholder="mobile, ui, q3" style={IS}/></Field>
        </>}
      </div>
      <div style={{ display:"flex",gap:10,marginTop:20 }}>
        <button onClick={submit} disabled={!valid} style={{ flex:1,padding:"11px",borderRadius:10,background:valid?"#0052CC":"#555",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:valid?"pointer":"not-allowed",fontFamily:T.font }}>{isTask?"Create Task":"Create Project"}</button>
        <button onClick={onClose} style={{ padding:"11px 18px",borderRadius:10,background:T.overlay,color:T.textSub,fontSize:13,fontWeight:600,border:"1px solid "+T.border,cursor:"pointer",fontFamily:T.font }}>Cancel</button>
      </div>
    </Modal>
  );
}
function NotesPage({ subtask, task, currentUser, onAddNote, onDeleteNote, onClose }) {
  const T = useT(); const { users } = useUsers();
  const [content,setContent]=useState(""),[vis,setVis]=useState("private"),[tagged,setTagged]=useState([]);
  const visible=[...visFilter(subtask.notes||[],currentUser.id)].reverse();
  const canAdd=content.trim()&&!(vis==="tagged"&&!tagged.length);
  const NOTE_BG_L=["#FFFBEB","#EFF6FF","#F0FDF4","#FDF4FF","#FFF1F2","#F0FDFA","#FEF3C7","#F0F9FF"];
  const NOTE_BG_D=["#1A1500","#050F1A","#041200","#100014","#140000","#001410","#1A1000","#000F1A"];
  const add=()=>{ if(!canAdd) return; onAddNote({id:Date.now(),authorId:currentUser.id,content:content.trim(),visibility:vis,taggedUsers:vis==="tagged"?[...tagged]:[],createdAt:new Date().toISOString()}); setContent(""); setTagged([]); setVis("private"); };
  const IS=inpStyle(T);
  return (
    <div style={{ position:"fixed",inset:0,background:T.bg,zIndex:11000,display:"flex",flexDirection:"column",fontFamily:T.font }}>
      <div style={{ background:T.surface,borderBottom:"1px solid "+T.border,padding:"14px 28px",display:"flex",alignItems:"center",gap:14,flexShrink:0 }}>
        <button onClick={onClose} style={{ display:"flex",alignItems:"center",gap:7,padding:"7px 14px",borderRadius:8,border:"1px solid "+T.border,background:"transparent",cursor:"pointer",fontSize:13,fontWeight:500,color:T.textSub,fontFamily:T.font }}>← Back</button>
        <div style={{ flex:1 }}><h1 style={{ margin:0,fontSize:15,fontWeight:700,color:T.text }}>📝 {subtask.title}</h1><p style={{ margin:"2px 0 0",fontSize:11,color:T.textMuted }}>Task: {task.title}</p></div>
      </div>
      <div style={{ flex:1,overflow:"auto",padding:"24px 28px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"300px 1fr",gap:24,maxWidth:1200,margin:"0 auto" }}>
          <div style={{ background:T.surface,border:"1px solid "+T.border,borderRadius:16,padding:"20px",alignSelf:"start",position:"sticky",top:0 }}>
            <div style={{ fontSize:14,fontWeight:700,color:T.text,marginBottom:14 }}>Add a Note</div>
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Write your note…" rows={5} style={{ ...IS,resize:"vertical",lineHeight:1.65 }}/>
            <div style={{ marginTop:14,display:"flex",flexDirection:"column",gap:6 }}>
              {VIS_OPTS.map(v=>(
                <div key={v.k} onClick={()=>setVis(v.k)} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:9,border:"1.5px solid "+(vis===v.k?"#0052CC":T.border),background:vis===v.k?T.accentSub:"transparent",cursor:"pointer" }}>
                  <span style={{ fontSize:16 }}>{v.icon}</span>
                  <div style={{ flex:1 }}><div style={{ fontSize:12,fontWeight:vis===v.k?700:500,color:vis===v.k?T.accentText:T.text }}>{v.label}</div><div style={{ fontSize:10,color:T.textMuted }}>{v.desc}</div></div>
                  <div style={{ width:15,height:15,borderRadius:"50%",border:"2px solid "+(vis===v.k?"#0052CC":T.borderMed),background:vis===v.k?"#0052CC":"transparent",display:"flex",alignItems:"center",justifyContent:"center" }}>{vis===v.k&&<div style={{ width:5,height:5,borderRadius:"50%",background:"#fff" }}/>}</div>
                </div>
              ))}
            </div>
            {vis==="tagged"&&<div style={{ marginTop:12,display:"flex",flexWrap:"wrap",gap:6 }}>{users.filter(u=>u.id!==currentUser.id).map(u=>{ const sel=tagged.includes(u.id); return <div key={u.id} onClick={()=>setTagged(t=>t.includes(u.id)?t.filter(x=>x!==u.id):[...t,u.id])} style={{ display:"flex",alignItems:"center",gap:5,padding:"4px 9px 4px 5px",borderRadius:99,border:"1.5px solid "+(sel?"#0052CC":T.border),background:sel?T.accentSub:"transparent",cursor:"pointer" }}><Av user={u} size={18}/><span style={{ fontSize:11,color:sel?T.accentText:T.textSub,fontWeight:sel?600:400 }}>{u.name.split(" ")[0]}</span></div>; })}</div>}
            <button onClick={add} disabled={!canAdd} style={{ width:"100%",marginTop:14,padding:"10px",borderRadius:10,background:canAdd?"#0052CC":"#555",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:canAdd?"pointer":"not-allowed",fontFamily:T.font }}>+ Add Note</button>
          </div>
          <div>
            {!visible.length?<div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"64px 24px",background:T.surface,borderRadius:16,border:"1px dashed "+T.borderMed }}><div style={{ fontSize:44,marginBottom:12 }}>📝</div><div style={{ fontSize:15,fontWeight:700,color:T.textSub }}>No notes yet</div></div>
            :<div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12 }}>
              {visible.map(n=>{ const author=users.find(u=>u.id===n.authorId),isOwn=n.authorId===currentUser.id; const vm=VIS_OPTS.find(v=>v.k===n.visibility)||VIS_OPTS[0]; const bg=T.dark?NOTE_BG_D[n.id%NOTE_BG_D.length]:NOTE_BG_L[n.id%NOTE_BG_L.length];
                return (<div key={n.id} style={{ background:bg,border:"1px solid "+T.border,borderRadius:12,padding:"14px",display:"flex",flexDirection:"column",gap:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,background:T.dark?vm.tagBgD:vm.tagBg,color:vm.tagColor,display:"inline-flex",alignItems:"center",gap:3 }}>{vm.icon} {vm.label}</span>{isOwn&&<button onClick={()=>onDeleteNote(n.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.textTiny }}>✕</button>}</div>
                  <p style={{ margin:0,fontSize:13,color:T.text,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word" }}>{n.content}</p>
                  <div style={{ display:"flex",alignItems:"center",gap:7,paddingTop:7,borderTop:"1px solid "+T.border }}>{author&&<Av user={author} size={20}/>}<div style={{ fontSize:11,fontWeight:600,color:T.textSub }}>{author?.name}<div style={{ fontSize:10,color:T.textMuted,fontWeight:400 }}>{new Date(n.createdAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div></div></div>
                </div>); })}
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
function SubtaskChat({ subtask, task, currentUser, onUpdate, onClose }) {
  const T = useT(); const { users } = useUsers();
  const [input,setInput]=useState(""),[replyTo,setReplyTo]=useState(null),[hoveredId,setHoveredId]=useState(null),[menuId,setMenuId]=useState(null);
  const botRef=useRef(),inputRef=useRef(),menuRef=useRef();
  const msgs=subtask.chat||[];
  useEffect(()=>botRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);
  useEffect(()=>{ if(!menuId) return; const h=e=>{ if(!menuRef.current?.contains(e.target)) setMenuId(null); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); },[menuId]);
  const send=()=>{ if(!input.trim()) return; const m={id:Date.now(),userId:currentUser.id,text:input.trim(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),replyTo:replyTo?{id:replyTo.id,text:replyTo.text,userName:replyTo.userName}:null}; onUpdate({...task,subtasks:task.subtasks.map(s=>s.id===subtask.id?{...s,chat:[...(s.chat||[]),m]}:s)}); setInput(""); setReplyTo(null); };
  const deleteMsg=id=>{ onUpdate({...task,subtasks:task.subtasks.map(s=>s.id===subtask.id?{...s,chat:(s.chat||[]).filter(m=>m.id!==id)}:s)}); setMenuId(null); };
  const startReply=msg=>{ const u=users.find(u=>u.id===msg.userId); setReplyTo({id:msg.id,text:msg.text,userName:u?.name.split(" ")[0]||"Someone"}); setMenuId(null); setTimeout(()=>inputRef.current?.focus(),50); };
  const scrollToMsg=id=>{ const el=document.getElementById("scmsg-"+id); if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.style.transition="background .2s";el.style.background=T.accentSub;setTimeout(()=>el.style.background="",900);} };
  return (
    <div style={{ position:"fixed",inset:0,background:T.dark?"rgba(0,0,0,0.65)":"rgba(0,0,0,0.35)",zIndex:12000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.font }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:T.surface,borderRadius:18,width:520,height:560,display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",border:"1px solid "+T.border,overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"14px 20px",borderBottom:"1px solid "+T.border,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
            <div><div style={{ fontSize:14,fontWeight:700,color:T.text }}>💬 {subtask.title}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>Subtask chat · {task.title}</div></div>
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:T.textMuted }}>✕</button>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:10,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.5 }}>Assignees:</span>
            {(subtask.assignees||[]).length?<AvatarStack ids={subtask.assignees} size={22} max={6}/>:<span style={{ fontSize:11,color:T.textTiny }}>None assigned</span>}
          </div>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:4,background:T.bg }}>
          {!msgs.length&&<div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,opacity:0.5 }}><div style={{ fontSize:36 }}>💬</div><div style={{ fontSize:13,fontWeight:600,color:T.textSub }}>No messages yet</div></div>}
          {msgs.map(msg=>{ const u=users.find(u=>u.id===msg.userId),mine=msg.userId===currentUser.id,isHov=hoveredId===msg.id,isMenu=menuId===msg.id;
            return (<div key={msg.id} id={"scmsg-"+msg.id} style={{ display:"flex",gap:8,flexDirection:mine?"row-reverse":"row",alignItems:"flex-end",padding:"2px 0" }} onMouseEnter={()=>setHoveredId(msg.id)} onMouseLeave={()=>{ setHoveredId(null); if(!isMenu) setMenuId(null); }}>
              {u&&<div style={{ flexShrink:0 }}><Av user={u} size={26}/></div>}
              <div style={{ maxWidth:"70%",display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start",gap:2 }}>
                <div style={{ fontSize:10,color:T.textMuted }}>{u?.name.split(" ")[0]} · {msg.time}</div>
                {msg.replyTo&&<div onClick={()=>scrollToMsg(msg.replyTo.id)} style={{ display:"flex",alignItems:"stretch",cursor:"pointer",maxWidth:"100%",marginBottom:2,borderRadius:"0 6px 6px 0",overflow:"hidden" }}><div style={{ width:3,background:"#0052CC",flexShrink:0 }}/><div style={{ background:mine?"rgba(0,0,0,0.2)":"rgba(87,70,234,0.12)",padding:"4px 9px",flex:1,minWidth:0 }}><div style={{ fontSize:10,fontWeight:700,color:mine?"#fff":"#0052CC",marginBottom:1 }}>{msg.replyTo.userName}</div><div style={{ fontSize:11,color:mine?"rgba(255,255,255,0.85)":T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{msg.replyTo.text}</div></div></div>}
                <div style={{ display:"flex",alignItems:"center",gap:5,flexDirection:mine?"row-reverse":"row" }}>
                  <div style={{ position:"relative",opacity:isHov||isMenu?1:0,transition:"opacity .15s" }}>
                    <button onClick={e=>{ e.stopPropagation(); setMenuId(isMenu?null:msg.id); }} style={{ width:24,height:24,borderRadius:"50%",border:"1px solid "+T.border,background:T.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.textMuted,fontSize:13 }}>⋯</button>
                    {isMenu&&<div ref={menuRef} style={{ position:"absolute",[mine?"right":"left"]:0,bottom:28,background:T.surface,border:"1px solid "+T.borderMed,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.18)",zIndex:999,minWidth:140,overflow:"hidden",padding:"4px" }}>
                      <div onClick={()=>startReply(msg)} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:7,cursor:"pointer",fontSize:13,color:T.text }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>↩️ Reply</div>
                      <div onClick={()=>{ navigator.clipboard?.writeText(msg.text); setMenuId(null); }} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:7,cursor:"pointer",fontSize:13,color:T.text }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>📋 Copy</div>
                      {mine&&<><div style={{ height:1,background:T.border,margin:"3px 6px" }}/><div onClick={()=>deleteMsg(msg.id)} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:7,cursor:"pointer",fontSize:13,color:"#EF4444" }} onMouseEnter={e=>e.currentTarget.style.background="#200A0A"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>🗑 Delete</div></>}
                    </div>}
                  </div>
                  <div style={{ background:mine?"#0052CC":T.surface,color:mine?"#fff":T.text,padding:"9px 13px",borderRadius:mine?"13px 13px 4px 13px":"13px 13px 13px 4px",fontSize:13,border:mine?"none":"1px solid "+T.border,lineHeight:1.5,wordBreak:"break-word" }}>{msg.text}</div>
                </div>
              </div>
            </div>); })}
          <div ref={botRef}/>
        </div>
        {replyTo&&<div style={{ padding:"7px 14px",background:T.accentSub,display:"flex",alignItems:"center",gap:10,borderTop:"2px solid #0052CC" }}><div style={{ width:3,height:28,borderRadius:2,background:"#0052CC",flexShrink:0 }}/><div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:11,fontWeight:700,color:T.accentText }}>Replying to {replyTo.userName}</div><div style={{ fontSize:11,color:T.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{replyTo.text}</div></div><button onClick={()=>setReplyTo(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.textMuted }}>✕</button></div>}
        <div style={{ padding:"10px 16px",borderTop:replyTo?"none":"1px solid "+T.border,display:"flex",gap:8,background:T.surface,flexShrink:0 }}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={replyTo?"Reply to "+replyTo.userName+"…":"Message about this subtask…"} style={{ flex:1,padding:"9px 14px",borderRadius:99,border:"1px solid "+T.border,fontSize:13,fontFamily:T.font,outline:"none",background:T.bg,color:T.text }}/>
          <button onClick={send} style={{ background:"#0052CC",color:"#fff",border:"none",borderRadius:99,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:T.font }}>Send</button>
        </div>
      </div>
    </div>
  );
}
function SubtaskPanel({ task, onUpdate, onClose, currentUser }) {
  const T = useT(); const [input,setInput]=useState(""),[notesFor,setNotesFor]=useState(null),[chatFor,setChatFor]=useState(null);
  const subs=task.subtasks||[]; const done=subs.filter(s=>s.done).length; const pct=subs.length?Math.round(done/subs.length*100):0;
  const pCol=pct===100?"#10B981":pct>=60?"#F59E0B":"#EF4444";
  const upd=(sid,k,v)=>onUpdate({...task,subtasks:subs.map(s=>s.id===sid?{...s,[k]:v}:s)});
  const addSubNote=(sid,note)=>onUpdate({...task,subtasks:subs.map(s=>s.id===sid?{...s,notes:[...(s.notes||[]),note]}:s)});
  const delSubNote=(sid,nid)=>onUpdate({...task,subtasks:subs.map(s=>s.id===sid?{...s,notes:(s.notes||[]).filter(n=>n.id!==nid)}:s)});
  const removeSub=sid=>onUpdate({...task,subtasks:subs.filter(s=>s.id!==sid)});
  const addSub=()=>{ if(!input.trim()) return; onUpdate({...task,subtasks:[...subs,{id:Date.now(),title:input.trim(),done:false,assignees:[],notes:[],chat:[]}]}); setInput(""); };
  if(notesFor){ const lat=subs.find(s=>s.id===notesFor.id)||notesFor; return <NotesPage subtask={lat} task={task} currentUser={currentUser} onAddNote={n=>addSubNote(lat.id,n)} onDeleteNote={nid=>delSubNote(lat.id,nid)} onClose={()=>setNotesFor(null)}/>; }
  const IS=inpStyle(T);
  return (
    <div style={{ background:T.dark?"#13131A":"#F7F8FF",borderTop:"1px dashed "+T.border,padding:"14px 18px 14px 46px" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ fontSize:12,fontWeight:700,color:T.text }}>Subtasks</span>
          <div style={{ position:"relative",width:30,height:30 }}>
            <svg width="30" height="30" viewBox="0 0 36 36" style={{ transform:"rotate(-90deg)" }}><circle cx="18" cy="18" r="14" fill="none" stroke={T.overlay} strokeWidth="3.5"/><circle cx="18" cy="18" r="14" fill="none" stroke={pCol} strokeWidth="3.5" strokeDasharray={2*Math.PI*14} strokeDashoffset={2*Math.PI*14*(1-pct/100)} strokeLinecap="round"/></svg>
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:pCol }}>{pct}%</div>
          </div>
          <span style={{ fontSize:12,color:T.textMuted }}>{done}/{subs.length} done</span>
        </div>
        <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.textMuted,padding:"2px 6px",borderRadius:5 }}>✕</button>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:5,marginBottom:10,maxHeight:280,overflowY:"auto",overflowX:"auto",scrollbarWidth:"thin",WebkitOverflowScrolling:"touch" }}>
        {!subs.length&&<span style={{ fontSize:12,color:T.textMuted,fontStyle:"italic" }}>No subtasks yet.</span>}
        {subs.map((s,i)=>{ const isOD=s.deadline&&new Date(s.deadline)<new Date()&&!s.done; const nc=visFilter(s.notes||[],currentUser.id).length; const cc=(s.chat||[]).length;
          return (<div key={s.id} style={{ display:"grid",gridTemplateColumns:"20px 20px 1fr 100px 100px 130px 60px 60px 20px",gap:8,padding:"8px 10px",background:s.done?(T.dark?"#041209":"#F0FDF4"):T.surface,borderRadius:8,border:"1px solid "+(isOD?"#FCA5A5":s.done?(T.dark?"#1A4A2A":"#BBF7D0"):T.border),alignItems:"center",minWidth:620 }}>
            <div onClick={()=>upd(s.id,"done",!s.done)} style={{ width:17,height:17,borderRadius:5,border:"2px solid "+(s.done?"#10B981":T.borderMed),background:s.done?"#10B981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>{s.done&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
            <span style={{ fontSize:9,fontWeight:700,color:T.textTiny }}>#{i+1}</span>
            <span style={{ fontSize:13,color:s.done?T.textMuted:T.text,textDecoration:s.done?"line-through":"none" }}>{s.title}</span>
            <EditDate value={s.startDate||""} onSave={v=>upd(s.id,"startDate",v)}/>
            <div style={{ display:"flex",alignItems:"center",gap:4 }}><EditDate value={s.deadline||""} onSave={v=>upd(s.id,"deadline",v)}/>{isOD&&<span style={{ fontSize:9,color:"#EF4444",fontWeight:700 }}>⚠</span>}</div>
            <MultiAssignee values={s.assignees||[]} onSave={v=>upd(s.id,"assignees",v)} size={20} max={3} label="+ Assign"/>
            <button onClick={()=>setNotesFor(s)} style={{ display:"flex",alignItems:"center",gap:4,padding:"4px 7px",borderRadius:6,border:"1px solid "+(nc?"#0052CC":T.border),background:nc?T.accentSub:"transparent",cursor:"pointer",fontSize:10,fontWeight:nc?700:400,color:nc?T.accentText:T.textMuted,fontFamily:T.font,whiteSpace:"nowrap" }}>📝 {nc||"Notes"}</button>
            <button onClick={()=>setChatFor(s)} style={{ display:"flex",alignItems:"center",gap:4,padding:"4px 7px",borderRadius:6,border:"1px solid "+(cc?"#10B981":T.border),background:cc?"#ECFDF5":"transparent",cursor:"pointer",fontSize:10,fontWeight:cc?700:400,color:cc?"#065F46":T.textMuted,fontFamily:T.font,whiteSpace:"nowrap" }}>💬 {cc||"Chat"}</button>
            <button onClick={()=>removeSub(s.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:T.textTiny,padding:"1px 3px",borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color=T.textTiny}>✕</button>
          </div>); })}
      </div>
      <div style={{ display:"flex",gap:8 }}>
        <div style={{ flex:1,display:"flex",alignItems:"center",background:T.surface,border:"1.5px solid "+T.border,borderRadius:9,overflow:"hidden" }}>
          <span style={{ padding:"0 10px",fontSize:15,color:T.textMuted }}>+</span>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSub()} placeholder="Add a subtask… (Enter)" style={{ flex:1,padding:"8px 4px 8px 0",border:"none",outline:"none",fontSize:13,fontFamily:T.font,color:T.text,background:"transparent" }}/>
        </div>
        <button onClick={addSub} style={{ padding:"8px 16px",borderRadius:9,background:"#0052CC",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:T.font }}>Add</button>
      </div>
      {chatFor&&<SubtaskChat subtask={subs.find(s=>s.id===chatFor.id)||chatFor} task={task} currentUser={currentUser} onUpdate={onUpdate} onClose={()=>setChatFor(null)}/>}
    </div>
  );
}
function Login({ onLogin, dark, setDark }) {
  const T = useT(); const { users } = useUsers();
  const [email,setEmail]=useState(""),[pass,setPass]=useState(""),[err,setErr]=useState(""),[loading,setLoading]=useState(false);
  const handle=()=>{ setLoading(true); setTimeout(()=>{ const u=users.find(u=>u.email===email.trim().toLowerCase()); if(u&&pass==="password") onLogin(u); else{setErr("Invalid credentials.");setLoading(false);} },500); };
  const IS=inpStyle(T);
  return (
    <div style={{ minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.font }}>
      <div style={{ position:"absolute",top:16,right:16 }}><button onClick={()=>setDark(d=>!d)} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:"1px solid "+T.border,background:T.overlay,cursor:"pointer",fontFamily:T.font,fontSize:12,fontWeight:500,color:T.textSub }}>{dark?"☀️ Light":"🌙 Dark"}</button></div>
      <div style={{ width:380 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginBottom:32 }}>
          <div style={{ width:38,height:38,borderRadius:11,background:"#0052CC",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="2" fill="#fff"/><rect x="11" y="2" width="7" height="7" rx="2" fill="#fff" opacity=".55"/><rect x="2" y="11" width="7" height="7" rx="2" fill="#fff" opacity=".55"/><rect x="11" y="11" width="7" height="7" rx="2" fill="#fff" opacity=".25"/></svg></div>
          <span style={{ fontWeight:700,fontSize:17,color:T.text }}>Orbix Studio</span>
        </div>
        <div style={{ background:T.surface,border:"1px solid "+T.border,borderRadius:16,padding:"32px 28px" }}>
          <h1 style={{ margin:"0 0 4px",fontSize:20,fontWeight:700,color:T.text }}>Sign in</h1>
          <p style={{ margin:"0 0 24px",fontSize:13,color:T.textMuted }}>Welcome back to your workspace</p>
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <Field label="Email"><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@orbix.io" style={IS}/></Field>
            <Field label="Password"><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()} style={IS}/></Field>
            {err&&<p style={{ margin:0,fontSize:12,color:"#EF4444" }}>{err}</p>}
            <button onClick={handle} disabled={loading} style={{ width:"100%",padding:"10px",borderRadius:8,background:loading?"#8B83F0":"#0052CC",color:"#fff",fontWeight:600,fontSize:14,border:"none",cursor:"pointer",fontFamily:T.font }}>{loading?"Signing in…":"Sign in"}</button>
          </div>
          <div style={{ marginTop:22,padding:"14px 16px",background:T.bg,borderRadius:10 }}>
            <p style={{ margin:"0 0 6px",fontSize:11,fontWeight:600,color:T.textSub }}>Demo accounts</p>
            {[["Admin","alex@orbix.io"],["Member","priya@orbix.io"]].map(([r,e])=>(<div key={r} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5 }}><span style={{ fontSize:11,color:T.textMuted }}>{r}</span><button onClick={()=>{ setEmail(e); setPass("password"); }} style={{ fontSize:11,color:"#0052CC",background:"none",border:"none",cursor:"pointer",fontFamily:T.font,fontWeight:500 }}>{e}</button></div>))}
            <div style={{ fontSize:11,color:T.textMuted,marginTop:6 }}>Password: <code style={{ background:T.overlay,padding:"1px 5px",borderRadius:4,color:T.text }}>password</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
const NAV_A=[["projects","Projects","M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"],["tasks","Tasks","M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"],["teams","Teams","M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"],["timeline","Timeline","M3 6h4M3 12h8M3 18h6M9 6h12M13 12h8M11 18h10"],["calendar","Calendar","M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"],["report","Reports","M18 20V10M12 20V4M6 20v-6"],["chat","Chat","M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"]];
const NAV_M=[["dashboard","Dashboard","M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"],["projects","Projects","M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"],["tasks","My Tasks","M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"],["team","Team","M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"],["timeline","Timeline","M3 6h4M3 12h8M3 18h6M9 6h12M13 12h8M11 18h10"],["calendar","Calendar","M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"],["report","My Reports","M18 20V10M12 20V4M6 20v-6"],["chat","Chat","M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"]];
const NavIcon=({d})=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d.split("M").filter(Boolean).map((seg,i)=><path key={i} d={"M"+seg}/>)}</svg>;
function Sidebar({ user, active, setActive, onLogout, dark, setDark }) {
  const T=useT(); const isA=user.role==="admin",items=isA?NAV_A:NAV_M;
  return (
    <div style={{ width:216,minWidth:216,background:T.surface,borderRight:"1px solid "+T.border,display:"flex",flexDirection:"column",height:"100vh",position:"sticky",top:0,fontFamily:T.font }}>
      <div style={{ padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:9 }}><div style={{ width:28,height:28,borderRadius:8,background:"#0052CC",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="2" fill="#fff"/><rect x="11" y="2" width="7" height="7" rx="2" fill="#fff" opacity=".55"/><rect x="2" y="11" width="7" height="7" rx="2" fill="#fff" opacity=".55"/><rect x="11" y="11" width="7" height="7" rx="2" fill="#fff" opacity=".25"/></svg></div><span style={{ fontWeight:700,fontSize:14,color:T.text }}>Orbix Studio</span></div>
      <div style={{ margin:"0 10px 6px",padding:"9px 10px",borderRadius:8,background:T.bg,display:"flex",alignItems:"center",gap:9 }}><Av user={user} size={28}/><div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:12,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.name.split(" ")[0]}</div><div style={{ fontSize:10,color:T.textMuted,textTransform:"capitalize" }}>{user.role}</div></div></div>
      <nav style={{ flex:1,padding:"4px 8px",overflowY:"auto" }}>
        <div style={{ fontSize:10,fontWeight:600,color:T.textTiny,letterSpacing:1.2,textTransform:"uppercase",padding:"6px 10px 4px",marginTop:4 }}>{isA?"Management":"Workspace"}</div>
        {items.map(([key,label,d])=>{ const isAct=active===key; return <button key={key} onClick={()=>setActive(key)} style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 10px",borderRadius:8,border:"none",background:isAct?T.accentSub:"transparent",color:isAct?"#0052CC":T.textSub,fontWeight:isAct?600:400,fontSize:13,cursor:"pointer",textAlign:"left",transition:"all .12s",fontFamily:T.font,marginBottom:1 }}><NavIcon d={d}/>{label}</button>; })}
      </nav>
      <div style={{ padding:"8px 10px 4px" }}><button onClick={()=>setDark(d=>!d)} style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 10px",borderRadius:8,border:"none",background:T.overlay,color:T.textSub,fontSize:13,cursor:"pointer",fontFamily:T.font,marginBottom:4 }}><span style={{ fontSize:14 }}>{dark?"☀️":"🌙"}</span>{dark?"Light mode":"Dark mode"}</button></div>
      <div style={{ padding:"4px 8px 12px",borderTop:"1px solid "+T.border }}><button onClick={onLogout} style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 10px",borderRadius:8,border:"none",background:"transparent",color:T.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.font }} onMouseEnter={e=>{ e.currentTarget.style.background=T.dark?"#200A0A":"#FEF2F2";e.currentTarget.style.color="#EF4444"; }} onMouseLeave={e=>{ e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textMuted; }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>Sign out</button></div>
    </div>
  );
}
function Page({ title, subtitle, action, children, noPad=false }) {
  const T=useT();
  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:T.font }}>
      <div style={{ padding:"20px 28px 16px",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"space-between",background:T.surface,flexShrink:0 }}>
        <div><h1 style={{ margin:0,fontSize:18,fontWeight:700,color:T.text,letterSpacing:-0.4 }}>{title}</h1>{subtitle&&<p style={{ margin:"2px 0 0",fontSize:12,color:T.textMuted }}>{subtitle}</p>}</div>
        {action}
      </div>
      <div style={{ flex:1,overflowY:"auto",background:T.bg,padding:noPad?0:"20px 28px" }}>{children}</div>
    </div>
  );
}
function MemberDashboard({ user, projects, tasks, setActive }) {
  const T=useT(); const mp=projects.filter(p=>p.team?.includes(user.id)),mt=tasks.filter(t=>t.assignees?.includes(user.id));
  const done=mt.filter(t=>t.status==="Done").length,inprog=mt.filter(t=>t.status==="In Progress").length;
  const overdue=mt.filter(t=>t.deadline&&new Date(t.deadline)<new Date()&&t.status!=="Done").length;
  const upcoming=mt.filter(t=>t.status!=="Done").sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,4);
  const SC=({label,value,color,icon})=>(<div style={{ background:T.surface,border:"1px solid "+T.border,borderRadius:14,padding:"18px 20px",flex:1 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}><span style={{ fontSize:11,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.7 }}>{label}</span><span style={{ fontSize:18 }}>{icon}</span></div><div style={{ fontSize:28,fontWeight:700,color }}>{value}</div></div>);
  return (
    <Page title={"Good morning, "+user.name.split(" ")[0]+" 👋"} subtitle="Here's what's happening today.">
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}><SC label="My Projects" value={mp.length} color="#0052CC" icon="📁"/><SC label="Tasks Done" value={done} color="#10B981" icon="✅"/><SC label="In Progress" value={inprog} color="#F59E0B" icon="⚡"/><SC label="Overdue" value={overdue} color={overdue?"#EF4444":T.textMuted} icon="⚠️"/></div>
      <div style={{ display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16 }}>
        <div style={{ background:T.surface,border:"1px solid "+T.border,borderRadius:14,padding:"18px 20px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}><span style={{ fontSize:14,fontWeight:700,color:T.text }}>My Projects</span><button onClick={()=>setActive("projects")} style={{ fontSize:12,color:"#0052CC",background:"none",border:"none",cursor:"pointer",fontFamily:T.font,fontWeight:500 }}>View all →</button></div>
          {!mp.length&&<p style={{ fontSize:13,color:T.textMuted }}>No projects assigned yet.</p>}
          {mp.map(p=><div key={p.id} style={{ marginBottom:14,paddingBottom:14,borderBottom:"1px solid "+T.border }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontSize:13,fontWeight:500,color:T.text }}>{p.name}</span><StatusBadge status={p.status}/></div><Bar pct={p.progress} color={ss(p.status,T).dot} height={5}/></div>)}
        </div>
        <div style={{ background:T.surface,border:"1px solid "+T.border,borderRadius:14,padding:"18px 20px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}><span style={{ fontSize:14,fontWeight:700,color:T.text }}>Upcoming Tasks</span><button onClick={()=>setActive("tasks")} style={{ fontSize:12,color:"#0052CC",background:"none",border:"none",cursor:"pointer",fontFamily:T.font,fontWeight:500 }}>View all →</button></div>
          {!upcoming.length&&<p style={{ fontSize:13,color:T.textMuted }}>All caught up!</p>}
          {upcoming.map(t=>{ const isOD=t.deadline&&new Date(t.deadline)<new Date(); return (<div key={t.id} style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:12,paddingBottom:12,borderBottom:"1px solid "+T.border }}><span style={{ width:6,height:6,borderRadius:"50%",background:pc(t.priority),marginTop:5,flexShrink:0 }}/><div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:13,fontWeight:500,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.title}</div><div style={{ fontSize:11,color:isOD?"#EF4444":T.textMuted,marginTop:2 }}>{isOD?"⚠ Overdue · ":""}{t.deadline||"No deadline"}</div></div><StatusBadge status={t.status}/></div>); })}
        </div>
      </div>
    </Page>
  );
}
function DeptCard({ dept, items, addLabel, onClick }) {
  const T=useT(); const [hov,setHov]=useState(false);
  const done=items.filter(i=>i.status==="Done").length,pct=items.length?Math.round(done/items.length*100):0;
  const sc={}; items.forEach(i=>{ sc[i.status]=(sc[i.status]||0)+1; });
  const memberIds=[...new Set(items.flatMap(i=>i.team||i.assignees||[]))];
  const cardBg=T.dark?(dept.bgD||dept.color+"22"):(dept.bg||dept.color+"14");
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{ background:T.surface,border:"2px solid "+(hov?dept.color:T.border),borderRadius:20,overflow:"hidden",cursor:"pointer",transition:"all .2s",transform:hov?"translateY(-3px)":"none",boxShadow:hov?"0 12px 32px "+dept.color+"33":"0 1px 4px rgba(0,0,0,"+(T.dark?0.3:0.06)+")" }}>
      <div style={{ height:5,background:"linear-gradient(90deg,"+dept.color+","+dept.color+"88)" }}/>
      <div style={{ padding:"20px 20px 18px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}><div style={{ width:46,height:46,borderRadius:14,background:cardBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:"1.5px solid "+dept.color+"44" }}>{dept.icon}</div><div><div style={{ fontSize:14,fontWeight:700,color:T.text }}>{dept.key}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>{items.length} {addLabel.toLowerCase()}{items.length!==1?"s":""}</div></div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:22,fontWeight:800,color:dept.color }}>{pct}%</div><div style={{ fontSize:10,color:T.textMuted }}>complete</div></div>
        </div>
        <div style={{ background:dept.color+"22",borderRadius:99,height:7,overflow:"hidden",marginBottom:12 }}><div style={{ width:pct+"%",height:"100%",background:dept.color,borderRadius:99,transition:"width .4s" }}/></div>
        <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:14 }}>{STATUSES.filter(s=>sc[s]).map(s=>{ const st=ss(s,T); return <span key={s} style={{ fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:99,background:st.bg,color:st.text,display:"inline-flex",alignItems:"center",gap:3 }}><span style={{ width:5,height:5,borderRadius:"50%",background:st.dot }}/>{sc[s]} {s}</span>; })}{!items.length&&<span style={{ fontSize:11,color:T.textTiny,fontStyle:"italic" }}>No items yet</span>}</div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>{memberIds.length?<AvatarStack ids={memberIds.slice(0,5)} size={24} max={4}/>:<div/>}<div style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:dept.color }}>View all →</div></div>
      </div>
    </div>
  );
}
function ProjectsView({ projects, setProjects, tasks, currentUser, depts, setDepts }) {
  const T=useT(); const [sel,setSel]=useState(null),[showCat,setShowCat]=useState(false);
  const isAdmin=currentUser.role==="admin"; const visible=isAdmin?projects:projects.filter(p=>p.team?.includes(currentUser.id));
  if(sel){ const dept=depts.find(d=>d.key===sel.key)||sel; return <ProjectsDetail dept={dept} projects={projects} setProjects={setProjects} tasks={tasks} currentUser={currentUser} onBack={()=>setSel(null)} depts={depts}/>; }
  return (<><Page title="📁 Projects" subtitle="Select a department to view its projects" action={isAdmin&&<Btn variant="ghost" onClick={()=>setShowCat(true)} small>🏷️ Add Category</Btn>}><div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>{depts.map(dept=>{ const items=visible.filter(p=>p.category===dept.key); return <DeptCard key={dept.key} dept={dept} items={items} addLabel="Project" onClick={()=>setSel(dept)}/>; })}</div></Page>{showCat&&<AddCategoryModal existingDepts={depts} onSave={d=>{ setDepts(p=>[...p,d]); setShowCat(false); }} onClose={()=>setShowCat(false)}/>}</>);
}
function ProjectsDetail({ dept, projects, setProjects, tasks, currentUser, onBack, depts }) {
  const T=useT(); const [showAdd,setShowAdd]=useState(false),[delId,setDelId]=useState(null);
  const isAdmin=currentUser.role==="admin"; const visible=projects.filter(p=>p.category===dept.key&&(isAdmin||p.team?.includes(currentUser.id)));
  const upd=(id,k,v)=>setProjects(ps=>ps.map(p=>p.id===id?{...p,[k]:v}:p)); const del=id=>{ setProjects(ps=>ps.filter(p=>p.id!==id)); setDelId(null); };
  const calcProgress=id=>{ const pt=(tasks||[]).filter(t=>t.project===id); if(!pt.length) return 0; const total=pt.reduce((a,t)=>a+Math.max(1,(t.subtasks||[]).length),0); const done=pt.reduce((a,t)=>{ const s=t.subtasks||[]; return a+(s.length?s.filter(x=>x.done).length:(t.status==="Done"?1:0)); },0); return Math.round(done/total*100); };
  const done=visible.filter(p=>p.status==="Done").length,pct=visible.length?Math.round(done/visible.length*100):0;
  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:T.font }}>
      <div style={{ padding:"16px 28px",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:16,background:T.surface,flexShrink:0 }}>
        <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:7,padding:"7px 14px",borderRadius:8,border:"1px solid "+T.border,background:"transparent",cursor:"pointer",fontSize:13,fontWeight:500,color:T.textSub,fontFamily:T.font }}>← Projects</button>
        <div style={{ width:1,height:32,background:T.border }}/>
        <div style={{ width:44,height:44,borderRadius:13,background:dept.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{dept.icon}</div>
        <div style={{ flex:1 }}><h1 style={{ margin:0,fontSize:17,fontWeight:700,color:T.text }}>{dept.key}</h1><p style={{ margin:"2px 0 0",fontSize:12,color:T.textMuted }}>{visible.length} project{visible.length!==1?"s":""} · {done} done · {pct}% complete</p></div>
        <div style={{ width:130 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:10,fontWeight:600,color:T.textMuted,textTransform:"uppercase" }}>Progress</span><span style={{ fontSize:11,fontWeight:700,color:dept.color }}>{pct}%</span></div><Bar pct={pct} color={dept.color} height={6}/></div>
        <Btn variant="primary" onClick={()=>setShowAdd(true)}>+ New Project</Btn>
      </div>
      <div style={{ flex:1,overflowY:"auto",background:T.bg,padding:"24px 28px" }}>
        {!visible.length&&!showAdd?(<div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 24px",background:T.surface,borderRadius:16,border:"2px dashed "+dept.color+"44",textAlign:"center" }}><div style={{ fontSize:48,marginBottom:16 }}>{dept.icon}</div><div style={{ fontSize:16,fontWeight:700,color:T.textSub,marginBottom:20 }}>No projects in {dept.key} yet</div><button onClick={()=>setShowAdd(true)} style={{ padding:"11px 28px",borderRadius:10,background:dept.color,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:T.font }}>+ New Project</button></div>):(
          <div style={{ background:T.surface,border:"1px solid "+T.border,borderRadius:16,overflow:"hidden" }}>
            <div style={{ overflowX:"auto",WebkitOverflowScrolling:"touch" }}>
            <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1.4fr 1fr 28px",padding:"11px 20px",background:T.bg,borderBottom:"1px solid "+T.border,gap:8,minWidth:620 }}>{["Project","Team","Status","Progress","Deadline",""].map(h=><span key={h} style={{ fontSize:11,fontWeight:600,color:T.textMuted,letterSpacing:0.6,textTransform:"uppercase" }}>{h}</span>)}</div>
            {visible.map((p,i)=>(<div key={p.id} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1.4fr 1fr 28px",padding:"13px 20px",borderBottom:i<visible.length-1?"1px solid "+T.border:"none",alignItems:"center",gap:8,minWidth:620 }} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceHov} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div><EditText value={p.name} onSave={v=>upd(p.id,"name",v)} style={{ fontSize:13,fontWeight:600 }}/>{!!p.tags?.length&&<div style={{ display:"flex",gap:4,marginTop:4,flexWrap:"wrap" }}>{p.tags.map(t=><Tag key={t} label={t}/>)}</div>}</div>
              <MultiAssignee values={p.team||[]} onSave={v=>upd(p.id,"team",v)} size={22} max={4}/>
              <EditSelect value={p.status} options={STATUSES.map(s=>({v:s,l:s}))} onSave={v=>upd(p.id,"status",v)} renderValue={v=><StatusBadge status={v}/>}/>
              <div>{(()=>{ const pct=calcProgress(p.id); return <><div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}><span style={{ fontSize:10,color:T.textMuted }}>Progress</span><span style={{ fontSize:10,fontWeight:700,color:dept.color }}>{pct}%</span></div><Bar pct={pct} color={dept.color} height={5}/></>; })()}</div>
              <EditDate value={p.deadline} onSave={v=>upd(p.id,"deadline",v)}/>
              <button onClick={()=>setDelId(p.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.textTiny,padding:"2px",borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color=T.textTiny}>✕</button>
            </div>))}
            </div>
          </div>
        )}
      </div>
      {showAdd&&<QuickAddModal type="project" projects={projects} depts={depts} onSave={v=>{ setProjects(ps=>[...ps,{...v,category:dept.key}]); setShowAdd(false); }} onClose={()=>setShowAdd(false)}/>}
      {delId&&<ConfirmModal title="Delete Project?" message="This will permanently remove the project." onConfirm={()=>del(delId)} onClose={()=>setDelId(null)}/>}
    </div>
  );
}
function TasksView({ tasks, setTasks, projects, currentUser, depts }) {
  const T=useT(); const [expanded,setExpanded]=useState(null),[delId,setDelId]=useState(null),[showAdd,setShowAdd]=useState(false);
  const [search,setSearch]=useState(""),[filterStatus,setFilterStatus]=useState("All"),[filterPriority,setFilterPriority]=useState("All");
  const isAdmin=currentUser.role==="admin"; const allTasks=isAdmin?tasks:tasks.filter(t=>t.assignees?.includes(currentUser.id));
  const visible=allTasks.filter(t=>{ const ms=!search||t.title.toLowerCase().includes(search.toLowerCase()); const mst=filterStatus==="All"||t.status===filterStatus; const mp2=filterPriority==="All"||t.priority===filterPriority; return ms&&mst&&mp2; });
  const upd=(id,k,v)=>setTasks(ts=>ts.map(t=>t.id===id?{...t,[k]:v}:t));
  const updFull=updated=>setTasks(ts=>ts.map(t=>t.id===updated.id?updated:t));
  const del=id=>{ setTasks(ts=>ts.filter(t=>t.id!==id)); setDelId(null); if(expanded===id) setExpanded(null); };
  const done=visible.filter(t=>t.status==="Done").length; const COLS="28px 2fr 120px 120px 90px 100px 90px 24px";
  const pill=active=>({ padding:"5px 12px",borderRadius:7,border:"1px solid "+(active?"#0052CC":T.border),background:active?T.accentSub:"transparent",color:active?"#0052CC":T.textSub,fontSize:12,fontWeight:active?600:400,cursor:"pointer",fontFamily:T.font });
  return (
    <><Page title={isAdmin?"✅ All Tasks":"✅ My Tasks"} subtitle={visible.length+" task"+(visible.length!==1?"s":"")+" · "+done+" done"} action={<Btn variant="primary" onClick={()=>setShowAdd(true)} small>+ New Task</Btn>}>
      <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap" }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,background:T.surface,border:"1px solid "+T.border,borderRadius:9,padding:"6px 12px" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…" style={{ border:"none",outline:"none",fontSize:12,fontFamily:T.font,color:T.text,background:"transparent",width:160 }}/></div>
        <div style={{ display:"flex",gap:5,alignItems:"center",flexWrap:"wrap" }}><span style={{ fontSize:11,fontWeight:600,color:T.textMuted,marginRight:2 }}>Status:</span>{["All",...STATUSES].map(s=><button key={s} onClick={()=>setFilterStatus(s)} style={pill(filterStatus===s)}>{s}</button>)}</div>
        <div style={{ display:"flex",gap:5,alignItems:"center" }}><span style={{ fontSize:11,fontWeight:600,color:T.textMuted,marginRight:2 }}>Priority:</span>{["All",...PRIORITIES].map(p=><button key={p} onClick={()=>setFilterPriority(p)} style={pill(filterPriority===p)}>{p}</button>)}</div>
      </div>
      {!visible.length?(<div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 24px",background:T.surface,borderRadius:16,border:"2px dashed "+T.border,textAlign:"center" }}><div style={{ fontSize:48,marginBottom:16 }}>✅</div><div style={{ fontSize:16,fontWeight:700,color:T.textSub,marginBottom:8 }}>No tasks found</div></div>):(
        <div style={{ background:T.surface,border:"1px solid "+T.border,borderRadius:16,overflow:"hidden" }}>
          <div style={{ overflowX:"auto",WebkitOverflowScrolling:"touch" }}>
          <div style={{ display:"grid",gridTemplateColumns:COLS,padding:"11px 18px",background:T.bg,borderBottom:"1px solid "+T.border,gap:8,alignItems:"center",minWidth:700 }}><span/>{["Task","Assignees","Status","Priority","Due","Subtasks",""].map(h=><span key={h} style={{ fontSize:11,fontWeight:600,color:T.textMuted,letterSpacing:0.6,textTransform:"uppercase" }}>{h}</span>)}</div>
          {visible.map(t=>{ const proj=projects.find(p=>p.id===t.project); const subs=t.subtasks||[],subDone=subs.filter(s=>s.done).length,subPct=subs.length?Math.round(subDone/subs.length*100):null; const pCol=subPct===null?T.textMuted:subPct===100?"#10B981":subPct>=60?"#F59E0B":"#EF4444"; const isExp=expanded===t.id; const dept=depts.find(d=>d.key===proj?.category);
            return (<div key={t.id}><div style={{ display:"grid",gridTemplateColumns:COLS,padding:"12px 18px",borderBottom:"1px solid "+T.border,alignItems:"center",gap:8,background:isExp?T.accentSub:"transparent" }} onMouseEnter={e=>{ if(!isExp) e.currentTarget.style.background=T.surfaceHov; }} onMouseLeave={e=>{ if(!isExp) e.currentTarget.style.background="transparent"; }}>
              <button onClick={()=>setExpanded(isExp?null:t.id)} style={{ width:22,height:22,borderRadius:6,border:"1px solid "+(isExp?"#0052CC":T.border),background:isExp?"#0052CC":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:isExp?"#fff":T.textMuted,transition:"all .15s" }}><span style={{ display:"inline-block",transform:isExp?"rotate(90deg)":"rotate(0)",transition:"transform .2s" }}>▶</span></button>
              <div><EditText value={t.title} onSave={v=>upd(t.id,"title",v)}/><div style={{ display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap" }}>{proj&&<span style={{ fontSize:10,color:T.textMuted }}>📁 {proj.name}</span>}{dept&&<span style={{ fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:99,background:dept.color+"22",color:dept.color }}>{dept.icon} {dept.key}</span>}{t.tags?.map(tag=><Tag key={tag} label={tag}/>)}</div></div>
              <MultiAssignee values={t.assignees||[]} onSave={v=>upd(t.id,"assignees",v)} size={22} max={3}/>
              <EditSelect value={t.status} options={STATUSES.map(s=>({v:s,l:s}))} onSave={v=>upd(t.id,"status",v)} renderValue={v=><StatusBadge status={v}/>}/>
              <EditSelect value={t.priority} options={PRIORITIES.map(p=>({v:p,l:p}))} onSave={v=>upd(t.id,"priority",v)} renderValue={v=><span style={{ fontSize:12,fontWeight:500,color:pc(v) }}>● {v}</span>}/>
              <EditDate value={t.deadline} onSave={v=>upd(t.id,"deadline",v)}/>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>{subPct===null?<span style={{ fontSize:11,color:T.textTiny,cursor:"pointer" }} onClick={()=>setExpanded(t.id)}>+ subtasks</span>:<><div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:11,fontWeight:700,color:pCol }}>{subPct}%</span><span style={{ fontSize:10,color:T.textMuted }}>{subDone}/{subs.length}</span></div><Bar pct={subPct} color={pCol} height={5}/></>}</div>
              <button onClick={()=>setDelId(t.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.textTiny,padding:"2px",borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color=T.textTiny}>✕</button>
            </div>{isExp&&<SubtaskPanel task={t} onUpdate={updFull} onClose={()=>setExpanded(null)} currentUser={currentUser}/>}</div>); })}
          </div>
        </div>
      )}
    </Page>
    {showAdd&&<QuickAddModal type="task" projects={projects} depts={depts} onSave={v=>{ setTasks(ts=>[...ts,v]); setShowAdd(false); }} onClose={()=>setShowAdd(false)}/>}
    {delId&&<ConfirmModal title="Delete Task?" message="This will permanently remove the task." onConfirm={()=>del(delId)} onClose={()=>setDelId(null)}/>}</>
  );
}
function AddMemberModal({ onSave, onClose, existingEmails }) {
  const T=useT(); const [name,setName]=useState(""),[email,setEmail]=useState(""),[dept,setDept]=useState("Engineering"),[role,setRole]=useState("member");
  const deptOptions=["Engineering","Design","Marketing","Sales","Finance","HR","Operations","Legal"];
  const emailTaken=existingEmails.includes(email.trim().toLowerCase()); const valid=name.trim()&&email.trim().includes("@")&&!emailTaken; const IS=inpStyle(T);
  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}><h2 style={{ margin:0,fontSize:17,fontWeight:700,color:T.text }}>👤 Add Team Member</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.textMuted }}>✕</button></div>
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        <Field label="Full Name" required><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Jordan Smith" style={IS}/></Field>
        <Field label="Email" required><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="e.g. jordan@orbix.io" style={{ ...IS,borderColor:emailTaken?"#EF4444":T.border }}/>{emailTaken&&<p style={{ margin:"4px 0 0",fontSize:11,color:"#EF4444" }}>Email already exists.</p>}</Field>
        <Field label="Department"><select value={dept} onChange={e=>setDept(e.target.value)} style={IS}>{deptOptions.map(d=><option key={d}>{d}</option>)}</select></Field>
        <Field label="Role"><div style={{ display:"flex",gap:10,paddingTop:4 }}>{["member","admin"].map(r=>(<div key={r} onClick={()=>setRole(r)} style={{ flex:1,padding:"10px 14px",borderRadius:10,border:"1.5px solid "+(role===r?"#0052CC":T.border),background:role===r?T.accentSub:"transparent",cursor:"pointer",textAlign:"center" }}><div style={{ fontSize:13,fontWeight:role===r?700:500,color:role===r?T.accentText:T.text,textTransform:"capitalize" }}>{r}</div><div style={{ fontSize:10,color:T.textMuted,marginTop:2 }}>{r==="admin"?"Full access":"Standard access"}</div></div>))}</div></Field>
      </div>
      <div style={{ display:"flex",gap:10,marginTop:22 }}>
        <button onClick={()=>{ if(valid) onSave({id:Date.now(),name:name.trim(),email:email.trim().toLowerCase(),dept,role}); }} disabled={!valid} style={{ flex:1,padding:"11px",borderRadius:10,background:valid?"#0052CC":"#555",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:valid?"pointer":"not-allowed",fontFamily:T.font }}>Add Member</button>
        <button onClick={onClose} style={{ padding:"11px 18px",borderRadius:10,background:T.overlay,color:T.textSub,fontSize:13,fontWeight:600,border:"1px solid "+T.border,cursor:"pointer",fontFamily:T.font }}>Cancel</button>
      </div>
    </Modal>
  );
}
function EditDeptModal({ dept, existingDepts, onSave, onClose }) {
  const T=useT(); const [name,setName]=useState(dept.key),[icon,setIcon]=useState(dept.icon),[color,setColor]=useState(dept.color);
  const taken=existingDepts.filter(d=>d.key!==dept.key).map(d=>d.key.toLowerCase());
  const valid=name.trim().length>0&&!taken.includes(name.trim().toLowerCase()); const IS=inpStyle(T);
  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}><h2 style={{ margin:0,fontSize:17,fontWeight:700,color:T.text }}>✏️ Edit Department</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.textMuted }}>✕</button></div>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <Field label="Department Name" required><input value={name} onChange={e=>setName(e.target.value)} style={{ ...IS,borderColor:name&&!valid?"#EF4444":T.border }}/>{name&&!valid&&<p style={{ margin:"4px 0 0",fontSize:11,color:"#EF4444" }}>Name already exists.</p>}</Field>
        <Field label="Icon"><div style={{ display:"flex",flexWrap:"wrap",gap:7,paddingTop:4 }}>{DEPT_ICONS.map(ic=><div key={ic} onClick={()=>setIcon(ic)} style={{ width:36,height:36,borderRadius:10,background:ic===icon?color+"22":T.overlay,border:"2px solid "+(ic===icon?color:T.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer" }}>{ic}</div>)}</div></Field>
        <Field label="Color"><div style={{ display:"flex",gap:7,flexWrap:"wrap",paddingTop:4 }}>{DEPT_COLORS.map(c=><div key={c} onClick={()=>setColor(c)} style={{ width:28,height:28,borderRadius:8,background:c,cursor:"pointer",border:color===c?"3px solid "+T.text:"3px solid transparent",boxSizing:"border-box" }}/>)}</div></Field>
        <div style={{ padding:"14px 16px",borderRadius:12,background:color+"14",border:"1.5px solid "+color+"44",display:"flex",alignItems:"center",gap:12 }}><div style={{ width:42,height:42,borderRadius:12,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{icon}</div><div><div style={{ fontSize:13,fontWeight:700,color:T.text }}>{name.trim()||dept.key}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>Preview</div></div></div>
      </div>
      <div style={{ display:"flex",gap:10,marginTop:22 }}>
        <button onClick={()=>{ if(valid) onSave({...dept,key:name.trim(),icon,color,bg:color+"14",bgD:color+"20"}); }} disabled={!valid} style={{ flex:1,padding:"11px",borderRadius:10,background:valid?"#0052CC":"#555",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:valid?"pointer":"not-allowed",fontFamily:T.font }}>Save Changes</button>
        <button onClick={onClose} style={{ padding:"11px 18px",borderRadius:10,background:T.overlay,color:T.textSub,fontSize:13,fontWeight:600,border:"1px solid "+T.border,cursor:"pointer",fontFamily:T.font }}>Cancel</button>
      </div>
    </Modal>
  );
}
function TeamsView({ tasks, projects, setProjects, setTasks, currentUser, depts, setDepts }) {
  const T=useT(); const { users,setUsers }=useUsers(); const isAdmin=currentUser.role==="admin";
  const [modal,setModal]=useState(null),[showCat,setShowCat]=useState(false),[selUser,setSelUser]=useState(null);
  const [showAddMember,setShowAddMember]=useState(false),[search,setSearch]=useState("");
  const [tab,setTab]=useState("members"),[editDept,setEditDept]=useState(null),[delDept,setDelDept]=useState(null);
  const filteredUsers=users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())||u.dept.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()));
  const toggleRole=uid=>{ setUsers(prev=>prev.map(u=>u.id===uid?{...u,role:u.role==="admin"?"member":"admin"}:u)); setSelUser(prev=>prev?{...prev,role:prev.role==="admin"?"member":"admin"}:prev); };
  const removeMember=uid=>{ setUsers(prev=>prev.filter(u=>u.id!==uid)); setSelUser(null); };
  const deleteDept=key=>{ setDepts(d=>d.filter(x=>x.key!==key)); setDelDept(null); };
  const tabBtn=active=>({ padding:"7px 18px",borderRadius:8,border:"1.5px solid "+(active?"#0052CC":T.border),background:active?T.accentSub:"transparent",color:active?"#0052CC":T.textSub,fontWeight:active?600:400,fontSize:13,cursor:"pointer",fontFamily:T.font,transition:"all .15s" });
  const membersAction=isAdmin&&(<div style={{ display:"flex",gap:8,alignItems:"center" }}><div style={{ display:"flex",alignItems:"center",gap:7,background:T.surface,border:"1px solid "+T.border,borderRadius:9,padding:"6px 12px" }}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members…" style={{ border:"none",outline:"none",fontSize:12,fontFamily:T.font,color:T.text,background:"transparent",width:140 }}/></div><button onClick={()=>setShowAddMember(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,background:"#0052CC",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:T.font }}>+ Add Member</button></div>);
  const deptsAction=isAdmin&&(<button onClick={()=>setShowCat(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,background:"#0052CC",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:T.font }}>+ Add Department</button>);
  return (
    <Page title="👥 Team" subtitle={users.length+" members · "+depts.length+" departments"} action={tab==="members"?membersAction:deptsAction}>
      {isAdmin&&<div style={{ display:"flex",gap:6,marginBottom:20 }}><button style={tabBtn(tab==="members")} onClick={()=>setTab("members")}>👤 Members</button><button style={tabBtn(tab==="departments")} onClick={()=>setTab("departments")}>🏢 Departments</button></div>}
      {tab==="departments"&&isAdmin?(
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14 }}>
          {depts.map(d=>{ const memberCount=users.filter(u=>u.dept===d.key).length; const projCount=projects.filter(p=>p.category===d.key).length; const cardBg=T.dark?(d.bgD||d.color+"22"):(d.bg||d.color+"14");
            return (<div key={d.key} style={{ background:T.surface,border:"1.5px solid "+T.border,borderRadius:16,overflow:"hidden",transition:"all .18s" }} onMouseEnter={e=>{ e.currentTarget.style.borderColor=d.color;e.currentTarget.style.transform="translateY(-2px)"; }} onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="none"; }}>
              <div style={{ height:4,background:"linear-gradient(90deg,"+d.color+","+d.color+"88)" }}/>
              <div style={{ padding:"16px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
                  <div style={{ width:46,height:46,borderRadius:14,background:cardBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:"1.5px solid "+d.color+"44" }}>{d.icon}</div>
                  <div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:14,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{d.key}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>{memberCount} member{memberCount!==1?"s":""} · {projCount} project{projCount!==1?"s":""}</div></div>
                </div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
                  <span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:99,background:d.color+"18",color:d.color,border:"1px solid "+d.color+"33" }}>{d.icon} {d.key}</span>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>setEditDept(d)} style={{ flex:1,padding:"7px",borderRadius:8,border:"1px solid "+T.border,background:T.bg,cursor:"pointer",fontSize:12,fontWeight:500,color:T.textSub,fontFamily:T.font }}>✏️ Edit</button>
                  <button onClick={()=>setDelDept(d)} style={{ flex:1,padding:"7px",borderRadius:8,border:"1px solid #EF4444",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:500,color:"#EF4444",fontFamily:T.font }}>🗑 Delete</button>
                </div>
              </div>
            </div>); })}
          {!depts.length&&<div style={{ gridColumn:"1/-1",display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 24px",background:T.surface,borderRadius:16,border:"2px dashed "+T.border,textAlign:"center" }}><div style={{ fontSize:48,marginBottom:16 }}>🏢</div><div style={{ fontSize:16,fontWeight:700,color:T.textSub,marginBottom:8 }}>No departments yet</div><button onClick={()=>setShowCat(true)} style={{ padding:"10px 24px",borderRadius:10,background:"#0052CC",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:T.font }}>+ Add First Department</button></div>}
        </div>
      ):(
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14 }}>
        {filteredUsers.map(u=>{ const ut=tasks.filter(t=>t.assignees?.includes(u.id)),up=projects.filter(p=>p.team?.includes(u.id)); const done=ut.filter(t=>t.status==="Done").length,pct=ut.length?Math.round(done/ut.length*100):0; const isMe=u.id===currentUser.id;
          return (<div key={u.id} onClick={()=>setSelUser(u)} style={{ background:T.surface,border:"1.5px solid "+(isMe?"#0052CC":T.border),borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all .18s" }} onMouseEnter={e=>{ e.currentTarget.style.borderColor=avc(u.id);e.currentTarget.style.transform="translateY(-2px)"; }} onMouseLeave={e=>{ e.currentTarget.style.borderColor=isMe?"#0052CC":T.border;e.currentTarget.style.transform="none"; }}>
            <div style={{ height:4,background:"linear-gradient(90deg,"+avc(u.id)+","+avc(u.id)+"66)" }}/>
            <div style={{ padding:"16px 16px 14px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:11,marginBottom:12 }}><Av user={u} size={44}/><div style={{ flex:1,minWidth:0 }}><div style={{ display:"flex",alignItems:"center",gap:6 }}><div style={{ fontSize:14,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.name}</div>{isMe&&<span style={{ fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:99,background:T.accentSub,color:T.accentText,flexShrink:0 }}>You</span>}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>{u.dept}</div><span style={{ display:"inline-block",marginTop:4,fontSize:10,fontWeight:600,padding:"1px 8px",borderRadius:99,background:u.role==="admin"?T.accentSub:T.overlay,color:u.role==="admin"?T.accentText:T.textSub,textTransform:"capitalize" }}>{u.role}</span></div></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10 }}>{[["📁",up.length,"Projects"],["✅",done,"Done"],["📋",ut.length,"Tasks"]].map(([ic,v,l])=>(<div key={l} style={{ background:T.bg,borderRadius:8,padding:"7px 6px",textAlign:"center" }}><div style={{ fontSize:13 }}>{ic}</div><div style={{ fontSize:15,fontWeight:700,color:T.text }}>{v}</div><div style={{ fontSize:9,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.4 }}>{l}</div></div>))}</div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:11,color:T.textMuted }}>Completion</span><span style={{ fontSize:11,fontWeight:700,color:avc(u.id) }}>{pct}%</span></div>
              <Bar pct={pct} color={avc(u.id)} height={5}/>
            </div>
          </div>); })}
      </div>
      )}
      {selUser&&(()=>{ const u=users.find(x=>x.id===selUser.id)||selUser; const ut=tasks.filter(t=>t.assignees?.includes(u.id)),up=projects.filter(p=>p.team?.includes(u.id)); const done=ut.filter(t=>t.status==="Done").length,pct=ut.length?Math.round(done/ut.length*100):0; const canAct=isAdmin||u.id===currentUser.id,isMe=u.id===currentUser.id;
        return (<Modal onClose={()=>setSelUser(null)} width={520}>
          <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:20 }}><Av user={u} size={56}/><div style={{ flex:1 }}><div style={{ fontSize:17,fontWeight:700,color:T.text }}>{u.name}{isMe&&<span style={{ marginLeft:8,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:T.accentSub,color:T.accentText }}>You</span>}</div><div style={{ fontSize:12,color:T.textMuted,marginTop:3 }}>{u.dept} · {u.email}</div><div style={{ display:"flex",alignItems:"center",gap:8,marginTop:6 }}><span style={{ fontSize:10,fontWeight:600,padding:"2px 9px",borderRadius:99,background:u.role==="admin"?T.accentSub:T.overlay,color:u.role==="admin"?T.accentText:T.textSub,textTransform:"capitalize" }}>{u.role}</span>{isAdmin&&!isMe&&<button onClick={()=>toggleRole(u.id)} style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:99,border:"1.5px solid "+(u.role==="admin"?"#EF4444":"#0052CC"),background:"transparent",color:u.role==="admin"?"#EF4444":"#0052CC",cursor:"pointer",fontFamily:T.font }}>{u.role==="admin"?"Revoke admin":"Make admin"}</button>}</div></div><button onClick={()=>setSelUser(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.textMuted,alignSelf:"flex-start" }}>✕</button></div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20 }}>{[["📁",up.length,"Projects"],["✅",done,"Done"],["📋",ut.length,"Tasks"]].map(([ic,v,l])=>(<div key={l} style={{ background:T.bg,borderRadius:12,padding:"14px",textAlign:"center" }}><div style={{ fontSize:20 }}>{ic}</div><div style={{ fontSize:22,fontWeight:700,color:T.text,marginTop:4 }}>{v}</div><div style={{ fontSize:10,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginTop:2 }}>{l}</div></div>))}</div>
          <div style={{ marginBottom:20 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontSize:12,fontWeight:600,color:T.textSub }}>Task Completion</span><span style={{ fontSize:12,fontWeight:700,color:avc(u.id) }}>{pct}%</span></div><Bar pct={pct} color={avc(u.id)} height={8}/></div>
          {isAdmin&&<div style={{ marginBottom:16,padding:"14px 16px",borderRadius:12,background:T.bg,border:"1px solid "+T.border }}>
            <div style={{ fontSize:11,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.7,marginBottom:10 }}>🏢 Department</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:7 }}>
              {depts.map(d=>{ const active=u.dept===d.key; return (
                <div key={d.key} onClick={()=>{ setUsers(prev=>prev.map(x=>x.id===u.id?{...x,dept:d.key}:x)); setSelUser(prev=>prev?{...prev,dept:d.key}:prev); }} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:99,border:"1.5px solid "+(active?d.color:T.border),background:active?d.color+"18":"transparent",cursor:"pointer",transition:"all .15s" }}>
                  <span style={{ fontSize:14 }}>{d.icon}</span>
                  <span style={{ fontSize:12,fontWeight:active?700:400,color:active?d.color:T.textSub }}>{d.key}</span>
                  {active&&<span style={{ fontSize:10,color:d.color }}>✓</span>}
                </div>
              ); })}
            </div>
          </div>}
          {canAct&&<div style={{ display:"flex",gap:8,marginBottom:16 }}><button onClick={()=>{ setSelUser(null); setModal({type:"task",userId:u.id}); }} style={{ flex:1,padding:"10px",borderRadius:10,border:"1px solid "+T.border,background:T.bg,cursor:"pointer",fontSize:13,color:T.textSub,fontFamily:T.font }}>✅ Add Task</button><button onClick={()=>{ setSelUser(null); setModal({type:"project",userId:u.id}); }} style={{ flex:1,padding:"10px",borderRadius:10,border:"1px solid "+T.border,background:T.bg,cursor:"pointer",fontSize:13,color:T.textSub,fontFamily:T.font }}>📁 Add Project</button></div>}
          {isAdmin&&!isMe&&<button onClick={()=>{ if(window.confirm("Remove "+u.name+" from the team?")) removeMember(u.id); }} style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 14px",borderRadius:10,border:"1px solid #EF4444",background:"transparent",color:"#EF4444",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:T.font,width:"100%" }}>🗑 Remove {u.name.split(" ")[0]} from team</button>}
        </Modal>); })()}
      {modal?.type==="project"&&<QuickAddModal type="project" preAssignee={modal.userId} projects={projects} depts={depts} onSave={v=>{ setProjects(ps=>[...ps,v]); setModal(null); }} onClose={()=>setModal(null)}/>}
      {modal?.type==="task"&&<QuickAddModal type="task" preAssignee={modal.userId} projects={projects} depts={depts} onSave={v=>{ setTasks(ts=>[...ts,v]); setModal(null); }} onClose={()=>setModal(null)}/>}
      {showCat&&<AddCategoryModal existingDepts={depts} onSave={d=>{ setDepts(p=>[...p,d]); setShowCat(false); }} onClose={()=>setShowCat(false)}/>}
      {showAddMember&&<AddMemberModal existingEmails={users.map(u=>u.email)} onSave={m=>{ setUsers(prev=>[...prev,m]); setShowAddMember(false); }} onClose={()=>setShowAddMember(false)}/>}
      {editDept&&<EditDeptModal dept={editDept} existingDepts={depts} onSave={updated=>{ setDepts(d=>d.map(x=>x.key===editDept.key?updated:x)); setEditDept(null); }} onClose={()=>setEditDept(null)}/>}
      {delDept&&<ConfirmModal title={"Delete "+delDept.key+"?"} message={"This will remove the department. Projects assigned to it won't be deleted."} onConfirm={()=>deleteDept(delDept.key)} onClose={()=>setDelDept(null)}/>}
    </Page>
  );
}
function TimelineView({ projects, setProjects, tasks, setTasks, currentUser }) {
  const T=useT(); const isAdmin=currentUser.role==="admin";
  const [rStart,setRStart]=useState(()=>{ const d=new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10); }),[rEnd,setREnd]=useState(()=>{ const d=new Date(); d.setMonth(d.getMonth()+9); return d.toISOString().slice(0,10); }),[preset,setPreset]=useState("6M");
  const [expProj,setExpProj]=useState(new Set([1,2,6])),[expTask,setExpTask]=useState(new Set());
  const [tooltip,setTooltip]=useState(null); const wrapRef=useRef(),dragRef=useRef(null),rSRef=useRef(rStart),rERef=useRef(rEnd);
  useEffect(()=>{ rSRef.current=rStart; },[rStart]); useEffect(()=>{ rERef.current=rEnd; },[rEnd]);
  const LW=192,getW=()=>(wrapRef.current?.getBoundingClientRect().width||800)-LW;
  const d2p=useCallback(d=>{ const s=new Date(rStart),e=new Date(rEnd); return Math.max(0,Math.min(100,(new Date(d)-s)/(e-s)*100)); },[rStart,rEnd]);
  const applyPreset=p=>{ const t=new Date(),fmt=d=>d.toISOString().slice(0,10); const s=new Date(t),e=new Date(t); const M={"1M":[new Date(s.setMonth(s.getMonth()-0)||s.setDate(1)),new Date(e.setMonth(e.getMonth()+1))],"3M":[new Date(new Date().setMonth(t.getMonth()-1)),new Date(new Date().setMonth(t.getMonth()+2))],"6M":[new Date(new Date().setMonth(t.getMonth()-3)),new Date(new Date().setMonth(t.getMonth()+9))],"1Y":[new Date(new Date().setMonth(t.getMonth()-6)),new Date(new Date().setMonth(t.getMonth()+12))]}; if(M[p]){setRStart(fmt(M[p][0]));setREnd(fmt(M[p][1]));}setPreset(p); };
  const months=useMemo(()=>{ const a=[],d=new Date(rStart); d.setDate(1); const e=new Date(rEnd); while(d<=e){ a.push(new Date(d)); d.setMonth(d.getMonth()+1); } return a; },[rStart,rEnd]);
  const onDown=(e,level,id,type,oS,oE,subId=null)=>{ e.preventDefault(); e.stopPropagation(); dragRef.current={level,id,subId,type,startX:e.clientX,origStart:oS,origEnd:oE}; };
  useEffect(()=>{
    const mv=e=>{ if(!dragRef.current) return; const {level,id,subId,type,startX,origStart,origEnd}=dragRef.current; const dx=e.clientX-startX,td=(new Date(rERef.current)-new Date(rSRef.current))/DAY,delta=dx/getW()*td; const os=new Date(origStart).getTime(),oe=new Date(origEnd).getTime(); let ns=os,ne=oe; if(type==="move"){ns=os+delta*DAY;ne=oe+delta*DAY;}else if(type==="resizeR") ne=Math.max(os+2*DAY,oe+delta*DAY); else if(type==="resizeL") ns=Math.min(oe-2*DAY,os+delta*DAY); const ns_=new Date(ns).toISOString().slice(0,10),ne_=new Date(ne).toISOString().slice(0,10); if(level==="project") setProjects(ps=>ps.map(p=>p.id===id?{...p,startDate:ns_,deadline:ne_}:p)); else if(level==="task") setTasks(ts=>ts.map(t=>t.id===id?{...t,startDate:ns_,deadline:ne_}:t)); else setTasks(ts=>ts.map(t=>t.id===id?{...t,subtasks:t.subtasks?.map(s=>s.id===subId?{...s,startDate:ns_,deadline:ne_}:s)}:t)); setTooltip({start:ns_,end:ne_,x:e.clientX,y:e.clientY}); };
    const up=()=>{ dragRef.current=null; setTooltip(null); };
    document.addEventListener("mousemove",mv); document.addEventListener("mouseup",up); return ()=>{ document.removeEventListener("mousemove",mv); document.removeEventListener("mouseup",up); };
  },[setProjects,setTasks]);
  const todayPct=d2p(TODAY_DATE()); const vp=isAdmin?projects:projects.filter(p=>p.team?.includes(currentUser.id)); const IS=inpStyle(T);
  function TBar({sd,ed,color,level,id,subId=null,progress=null}){ if(!sd||!ed) return null; const lp=d2p(sd),wp=Math.max(0.8,d2p(ed)-lp),h=level==="project"?26:level==="task"?20:16;
    return(<div onMouseDown={e=>onDown(e,level,id,"move",sd,ed,subId)} style={{position:"absolute",left:lp+"%",width:wp+"%",top:"50%",transform:"translateY(-50%)",height:h,background:color,borderRadius:5,cursor:"grab",userSelect:"none",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",zIndex:5}}>
      <div onMouseDown={e=>{e.stopPropagation();onDown(e,level,id,"resizeL",sd,ed,subId);}} style={{position:"absolute",left:-4,top:0,bottom:0,width:8,cursor:"col-resize",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:2,height:h-6,background:"rgba(255,255,255,.55)",borderRadius:1}}/></div>
      {progress!==null&&<div style={{display:"flex",alignItems:"center",height:"100%",paddingLeft:8,overflow:"hidden",pointerEvents:"none",gap:4}}><span style={{fontSize:9,fontWeight:700,color:"#fff"}}>{progress}%</span><div style={{flex:1,background:"rgba(255,255,255,.25)",borderRadius:99,height:3,overflow:"hidden",minWidth:12}}><div style={{width:progress+"%",height:"100%",background:"rgba(255,255,255,.65)",borderRadius:99}}/></div></div>}
      <div onMouseDown={e=>{e.stopPropagation();onDown(e,level,id,"resizeR",sd,ed,subId);}} style={{position:"absolute",right:-4,top:0,bottom:0,width:8,cursor:"col-resize",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:2,height:h-6,background:"rgba(255,255,255,.55)",borderRadius:1}}/></div>
    </div>); }
  return(
    <Page title="📅 Timeline" subtitle="Drag bars to move · Edges to resize · ▶ to expand" noPad>
      <div style={{padding:"16px 28px 0"}}><div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:12,padding:"14px 20px",display:"flex",alignItems:"flex-end",gap:20,flexWrap:"wrap"}}>
        <div><div style={{fontSize:10,fontWeight:600,color:T.textMuted,letterSpacing:0.7,textTransform:"uppercase",marginBottom:7}}>Quick Range</div><div style={{display:"flex",gap:5}}>{["1M","3M","6M","1Y","All"].map(p=><button key={p} onClick={()=>applyPreset(p)} style={{padding:"6px 13px",borderRadius:7,border:"1.5px solid "+(preset===p?"#0052CC":T.border),background:preset===p?T.accentSub:"transparent",color:preset===p?"#0052CC":T.textSub,fontSize:12,fontWeight:preset===p?700:400,cursor:"pointer",fontFamily:T.font}}>{p}</button>)}</div></div>
        <div style={{width:1,height:38,background:T.border}}/>
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>{[["From",rStart,v=>{setRStart(v);setPreset("Custom");}],["To",rEnd,v=>{setREnd(v);setPreset("Custom");}]].map(([l,v,fn])=>(<div key={l}><div style={{fontSize:10,fontWeight:600,color:T.textMuted,letterSpacing:0.7,textTransform:"uppercase",marginBottom:6}}>{l}</div><input type="date" value={v} onChange={e=>fn(e.target.value)} style={{...IS,width:"auto",padding:"7px 10px"}}/></div>))}</div>
      </div></div>
      <div style={{padding:"16px 28px 28px",flex:1,overflow:"auto"}}>
        <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:14,padding:"16px 20px 20px",minWidth:700}}>
          <div style={{display:"flex",marginLeft:LW,marginBottom:10,paddingBottom:8,borderBottom:"1px solid "+T.border}}>{months.map((m,i)=><div key={i} style={{flex:1,fontSize:10,fontWeight:700,color:T.textMuted,textAlign:"center",borderLeft:"1px dashed "+T.border}}>{MONTH_NAMES[m.getMonth()]}</div>)}</div>
          <div ref={wrapRef} style={{position:"relative"}}>
            {todayPct>=0&&todayPct<=100&&<div style={{position:"absolute",left:"calc("+LW+"px + "+(todayPct/100)+"*(100% - "+LW+"px))",top:-14,bottom:0,width:2,background:"#0052CC",zIndex:9,pointerEvents:"none"}}><div style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",fontSize:9,fontWeight:700,color:"#fff",background:"#0052CC",padding:"2px 8px",borderRadius:99,whiteSpace:"nowrap"}}>Today</div></div>}
            {vp.map(proj=>{ const pe=expProj.has(proj.id); const pt=tasks.filter(t=>t.project===proj.id&&(isAdmin||t.assignees?.includes(currentUser.id))); const projColor=proj.color||ss(proj.status,T).dot; const pd=pt.filter(t=>t.status==="Done").length; const pp=pt.length?Math.round(pd/pt.length*100):proj.progress;
              return(<div key={proj.id} style={{marginBottom:2}}>
                <div style={{display:"flex",alignItems:"center",height:40}}>
                  <div style={{width:LW,paddingRight:10,flexShrink:0,display:"flex",alignItems:"center",gap:6,minWidth:0}}><button onClick={()=>setExpProj(s=>{const n=new Set(s);n.has(proj.id)?n.delete(proj.id):n.add(proj.id);return n;})} style={{width:18,height:18,borderRadius:4,border:"1.5px solid "+(pe?"#0052CC":T.borderMed),background:pe?T.accentSub:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:pe?"#0052CC":T.textMuted,flexShrink:0}}><span style={{display:"inline-block",transform:pe?"rotate(90deg)":"rotate(0)",transition:"transform .2s"}}>▶</span></button><div style={{width:8,height:8,borderRadius:2,background:projColor,flexShrink:0}}/><span style={{fontSize:12,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.name}</span></div>
                  <div style={{flex:1,position:"relative",height:"100%"}}>{proj.startDate&&proj.deadline&&<TBar sd={proj.startDate} ed={proj.deadline} color={projColor} level="project" id={proj.id} progress={pp}/>}</div>
                </div>
                {pe&&pt.map(task=>{ const te=expTask.has(task.id); const subs=task.subtasks||[]; const tc=ss(task.status,T).dot;
                  return(<div key={task.id} style={{marginBottom:1}}>
                    <div style={{display:"flex",alignItems:"center",height:32,marginLeft:22}}>
                      <div style={{width:LW-22,paddingRight:8,flexShrink:0,display:"flex",alignItems:"center",gap:5,minWidth:0}}>{subs.length?<button onClick={()=>setExpTask(s=>{const n=new Set(s);n.has(task.id)?n.delete(task.id):n.add(task.id);return n;})} style={{width:15,height:15,borderRadius:3,border:"1.5px solid "+(te?"#0052CC":T.borderMed),background:te?T.accentSub:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:te?"#0052CC":T.textMuted,flexShrink:0}}><span style={{display:"inline-block",transform:te?"rotate(90deg)":"rotate(0)",transition:"transform .2s"}}>▶</span></button>:<div style={{width:15}}/>}<span style={{fontSize:11,fontWeight:500,color:T.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</span></div>
                      <div style={{flex:1,position:"relative",height:"100%"}}>{task.startDate&&task.deadline&&<TBar sd={task.startDate} ed={task.deadline} color={tc} level="task" id={task.id}/>}</div>
                    </div>
                    {te&&subs.map(sub=>{ const sc=sub.done?"#10B981":"#94A3B8"; return(<div key={sub.id} style={{display:"flex",alignItems:"center",height:26,marginLeft:44}}><div style={{width:LW-44,paddingRight:8,flexShrink:0,display:"flex",alignItems:"center",gap:5,minWidth:0}}><div style={{width:6,height:6,borderRadius:"50%",background:sc,flexShrink:0}}/><span style={{fontSize:10,color:sub.done?T.textMuted:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:sub.done?"line-through":"none"}}>{sub.title}</span></div><div style={{flex:1,position:"relative",height:"100%"}}>{sub.startDate&&sub.deadline&&<TBar sd={sub.startDate} ed={sub.deadline} color={sc} level="subtask" id={task.id} subId={sub.id}/>}</div></div>); })}
                  </div>); })}
                {pe&&<div style={{height:1,background:T.border,margin:"4px 0 6px"}}/>}
              </div>); })}
          </div>
        </div>
      </div>
      {tooltip&&<div style={{position:"fixed",left:tooltip.x+14,top:tooltip.y-48,background:"#0A0A0B",color:"#fff",padding:"7px 12px",borderRadius:8,fontSize:11,fontWeight:500,pointerEvents:"none",zIndex:9999,whiteSpace:"nowrap"}}>{tooltip.start} → {tooltip.end}</div>}
    </Page>
  );
}
function openGCal(mtg){ const fmt=d=>d.replace(/-/g,""),fmtT=t=>t.replace(":","")+"00"; const s=fmt(mtg.date)+"T"+fmtT(mtg.startTime),e_=fmt(mtg.date)+"T"+fmtT(mtg.endTime); window.open("https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(mtg.title)+"&dates="+s+"/"+e_+"&details="+encodeURIComponent(mtg.desc||""),"_blank"); }
function CalendarView({ projects, tasks, meetings, setMeetings, currentUser }) {
  const T=useT(); const { users }=useUsers();
  const [month,setMonth]=useState(new Date().getMonth()),[showModal,setShowModal]=useState(false),[selMtg,setSelMtg]=useState(null);
  const [form,setForm]=useState({title:"",date:"",startTime:"10:00",endTime:"11:00",attendees:[currentUser.id],desc:"",color:"#0052CC"});
  const sf=(k,v)=>setForm(f=>({...f,[k]:v})); const year=new Date().getFullYear();
  const MN=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const fd=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
  const kOf=d=>year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
  const dl=d=>{ const k=kOf(d); return [...projects.filter(p=>p.deadline===k).map(p=>({l:p.name,c:ss(p.status,T).dot})),...tasks.filter(t=>t.deadline===k).map(t=>({l:t.title,c:pc(t.priority)}))]; };
  const mo=d=>meetings.filter(m=>m.date===kOf(d));
  const upcoming=meetings.filter(m=>new Date(m.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,6);
  const save=()=>{ if(!form.title.trim()||!form.date) return; const m={id:Date.now(),organizer:currentUser.id,...form}; setMeetings(ms=>[...ms,m]); openGCal(m); setShowModal(false); };
  const saveOnly=()=>{ if(!form.title.trim()||!form.date) return; setMeetings(ms=>[...ms,{id:Date.now(),organizer:currentUser.id,...form}]); setShowModal(false); };
  const IS=inpStyle(T);
  return(
    <Page title="🗓️ Calendar" subtitle={MN[month]+" "+year} noPad action={<div style={{display:"flex",gap:8,alignItems:"center"}}><button onClick={()=>setMonth(m=>Math.max(0,m-1))} style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+T.border,background:"transparent",cursor:"pointer",fontSize:13,color:T.textSub,fontFamily:T.font}}>‹</button><span style={{fontSize:13,fontWeight:600,color:T.text,minWidth:100,textAlign:"center"}}>{MN[month]}</span><button onClick={()=>setMonth(m=>Math.min(11,m+1))} style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+T.border,background:"transparent",cursor:"pointer",fontSize:13,color:T.textSub,fontFamily:T.font}}>›</button><button onClick={()=>{ setForm(f=>({...f,date:""})); setShowModal(true); }} style={{padding:"8px 14px",borderRadius:9,background:"#0052CC",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:T.font}}>+ Schedule Meeting</button></div>}>
      <div style={{display:"flex",height:"100%"}}>
        <div style={{flex:1,padding:"20px",overflowY:"auto"}}>
          <div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:14,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid "+T.border,background:T.bg}}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{padding:"9px 0",textAlign:"center",fontSize:11,fontWeight:600,color:T.textMuted}}>{d}</div>)}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
              {Array.from({length:fd}).map((_,i)=><div key={"e"+i} style={{minHeight:86,borderRight:"1px solid "+T.border,borderBottom:"1px solid "+T.border}}/>)}
              {Array.from({length:days}).map((_,i)=>{ const d=i+1,isT=d===31&&month===4,ev=dl(d),ms=mo(d); return(<div key={d} onClick={()=>{ setForm(f=>({...f,date:kOf(d)})); setShowModal(true); }} style={{minHeight:86,padding:"7px",borderRight:"1px solid "+T.border,borderBottom:"1px solid "+T.border,background:isT?T.accentSub:"transparent",cursor:"pointer"}} onMouseEnter={e=>{ if(!isT) e.currentTarget.style.background=T.surfaceHov; }} onMouseLeave={e=>{ if(!isT) e.currentTarget.style.background="transparent"; }}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{width:22,height:22,borderRadius:"50%",background:isT?"#0052CC":"transparent",color:isT?"#fff":T.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:isT?700:400}}>{d}</div>{ms.length>0&&<span style={{fontSize:9,fontWeight:700,background:"#0052CC",color:"#fff",borderRadius:99,padding:"1px 5px"}}>{ms.length}</span>}</div>
                {ms.slice(0,1).map((m,mi)=><div key={mi} onClick={e=>{ e.stopPropagation(); setSelMtg(m); }} style={{fontSize:10,fontWeight:600,color:"#fff",background:m.color||"#0052CC",borderRadius:4,padding:"2px 5px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}}>{m.startTime} {m.title}</div>)}
                {ev.slice(0,ms.length?1:2).map((e,ei)=><div key={ei} style={{fontSize:10,color:e.c,background:e.c+"22",borderRadius:3,padding:"1px 5px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.l}</div>)}
                {ms.length+ev.length>2&&<div style={{fontSize:9,color:T.textMuted}}>+{ms.length+ev.length-2} more</div>}
              </div>); })}
            </div>
          </div>
        </div>
        <div style={{width:260,borderLeft:"1px solid "+T.border,background:T.surface,padding:"20px 16px",overflowY:"auto",flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Upcoming Meetings</div>
          {!upcoming.length&&<p style={{fontSize:12,color:T.textMuted}}>No upcoming meetings.</p>}
          {upcoming.map(m=>(<div key={m.id} style={{marginBottom:12,padding:"12px",borderRadius:11,border:"1.5px solid "+m.color+"33",background:m.color+"11",cursor:"pointer"}} onClick={()=>setSelMtg(m)}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}><div style={{width:3,height:32,borderRadius:2,background:m.color}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title}</div><div style={{fontSize:10,color:T.textMuted}}>{m.date} · {m.startTime}–{m.endTime}</div></div></div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><AvatarStack ids={m.attendees} size={20} max={4}/><button onClick={e=>{ e.stopPropagation(); openGCal(m); }} style={{fontSize:10,fontWeight:600,color:m.color,background:"none",border:"1px solid "+m.color+"44",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:T.font}}>GCal ↗</button></div></div>))}
          <button onClick={()=>{ setForm(f=>({...f,date:""})); setShowModal(true); }} style={{width:"100%",marginTop:8,padding:"9px",borderRadius:9,background:T.accentSub,color:"#0052CC",border:"1px dashed #0052CC",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:T.font}}>+ Schedule new meeting</button>
        </div>
      </div>
      {selMtg&&(<Modal onClose={()=>setSelMtg(null)} width={420}><div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:18}}><div style={{width:4,height:48,borderRadius:2,background:selMtg.color}}/><div style={{flex:1}}><h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:700,color:T.text}}>{selMtg.title}</h3><div style={{fontSize:12,color:T.textMuted}}>{selMtg.date} · {selMtg.startTime} – {selMtg.endTime}</div></div><button onClick={()=>setSelMtg(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.textMuted}}>✕</button></div>{selMtg.desc&&<p style={{fontSize:13,color:T.textSub,margin:"0 0 16px",lineHeight:1.6,paddingLeft:16}}>{selMtg.desc}</p>}<div style={{paddingLeft:16,marginBottom:18}}><div style={{fontSize:11,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.7,marginBottom:8}}>Attendees</div><AvatarStack ids={selMtg.attendees} size={32} max={6}/></div><div style={{display:"flex",gap:8,paddingLeft:16}}><button onClick={()=>openGCal(selMtg)} style={{flex:1,padding:"10px",borderRadius:9,background:"#0052CC",color:"#fff",fontWeight:600,fontSize:13,border:"none",cursor:"pointer",fontFamily:T.font}}>📅 Open Google Calendar</button><button onClick={()=>{ setMeetings(ms=>ms.filter(m=>m.id!==selMtg.id)); setSelMtg(null); }} style={{padding:"10px 14px",borderRadius:9,background:"transparent",color:"#EF4444",fontSize:13,border:"1px solid "+T.border,cursor:"pointer",fontFamily:T.font}}>Delete</button></div></Modal>)}
      {showModal&&(<Modal onClose={()=>setShowModal(false)}><div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.text}}>Schedule Meeting</h2><button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.textMuted}}>✕</button></div><div style={{display:"flex",flexDirection:"column",gap:13}}><Field label="Meeting Title" required><input value={form.title} onChange={e=>sf("title",e.target.value)} placeholder="e.g. Sprint Planning" style={IS}/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}><Field label="Date" required><input type="date" value={form.date} onChange={e=>sf("date",e.target.value)} style={IS}/></Field><Field label="Start" required><input type="time" value={form.startTime} onChange={e=>sf("startTime",e.target.value)} style={IS}/></Field><Field label="End" required><input type="time" value={form.endTime} onChange={e=>sf("endTime",e.target.value)} style={IS}/></Field></div><Field label="Attendees"><div style={{display:"flex",flexWrap:"wrap",gap:7,paddingTop:4}}>{users.map(u=>{ const sel=form.attendees.includes(u.id); return <div key={u.id} onClick={()=>sf("attendees",sel?form.attendees.filter(a=>a!==u.id):[...form.attendees,u.id])} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px 5px 6px",borderRadius:99,border:"1.5px solid "+(sel?"#0052CC":T.border),background:sel?T.accentSub:"transparent",cursor:"pointer"}}><Av user={u} size={22}/><span style={{fontSize:12,fontWeight:sel?600:400,color:sel?T.accentText:T.textSub}}>{u.name.split(" ")[0]}</span></div>; })}</div></Field><Field label="Description"><textarea value={form.desc} onChange={e=>sf("desc",e.target.value)} placeholder="Agenda…" rows={2} style={{...IS,resize:"vertical"}}/></Field><Field label="Color"><div style={{display:"flex",gap:7,paddingTop:4}}>{MTG_COLORS.map(c=><div key={c} onClick={()=>sf("color",c)} style={{width:26,height:26,borderRadius:7,background:c,cursor:"pointer",border:form.color===c?"3px solid "+T.text:"3px solid transparent",boxSizing:"border-box"}}/>)}</div></Field></div><div style={{display:"flex",gap:10,marginTop:18}}><button onClick={save} style={{flex:1,padding:"11px",borderRadius:10,background:"#0052CC",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",fontFamily:T.font}}>📅 Schedule & Open Google Calendar</button><button onClick={saveOnly} style={{padding:"11px 16px",borderRadius:10,background:T.overlay,color:T.textSub,fontSize:13,fontWeight:600,border:"1px solid "+T.border,cursor:"pointer",fontFamily:T.font}}>Save only</button></div></Modal>)}
    </Page>
  );
}
function ChatView({ messages, setMessages, currentUser }) {
  const T=useT(); const { users }=useUsers();
  const [input,setInput]=useState(""),[replyTo,setReplyTo]=useState(null),[hoveredId,setHoveredId]=useState(null),[menuId,setMenuId]=useState(null);
  const botRef=useRef(),inputRef=useRef(),menuRef=useRef();
  useEffect(()=>botRef.current?.scrollIntoView({behavior:"smooth"}),[messages]);
  useEffect(()=>{ if(!menuId) return; const h=e=>{ if(!menuRef.current?.contains(e.target)) setMenuId(null); }; document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h); },[menuId]);
  const send=()=>{ if(!input.trim()) return; setMessages(m=>[...m,{id:Date.now(),user:currentUser.id,text:input.trim(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),replyTo:replyTo?{id:replyTo.id,text:replyTo.text,userName:replyTo.userName}:null}]); setInput(""); setReplyTo(null); };
  const startReply=msg=>{ const u=users.find(u=>u.id===msg.user); setReplyTo({id:msg.id,text:msg.text,userName:u?.name.split(" ")[0]||"Someone"}); setMenuId(null); setTimeout(()=>inputRef.current?.focus(),50); };
  const deleteMsg=id=>{ setMessages(m=>m.filter(msg=>msg.id!==id)); setMenuId(null); };
  const scrollToMsg=id=>{ const el=document.getElementById("msg-"+id); if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.style.transition="background .2s";el.style.background=T.accentSub;setTimeout(()=>el.style.background="",900);} };
  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:T.font }}>
      <div style={{ padding:"20px 28px 16px",borderBottom:"1px solid "+T.border,background:T.surface,flexShrink:0 }}><h1 style={{ margin:0,fontSize:18,fontWeight:700,color:T.text }}>💬 Team Chat</h1><p style={{ margin:"2px 0 0",fontSize:12,color:T.textMuted }}>{users.length} members · General channel</p></div>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 28px",display:"flex",flexDirection:"column",gap:6,background:T.bg }}>
        {messages.map(msg=>{ const u=users.find(u=>u.id===msg.user),mine=msg.user===currentUser.id,isHov=hoveredId===msg.id,isMenu=menuId===msg.id;
          return (<div key={msg.id} id={"msg-"+msg.id} style={{ display:"flex",gap:10,flexDirection:mine?"row-reverse":"row",alignItems:"flex-end",padding:"2px 0",borderRadius:8,transition:"background .2s" }} onMouseEnter={()=>setHoveredId(msg.id)} onMouseLeave={()=>{ setHoveredId(null); if(!isMenu) setMenuId(null); }}>
            {u&&<div style={{ flexShrink:0,marginBottom:2 }}><Av user={u} size={30}/></div>}
            <div style={{ maxWidth:"65%",display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start",gap:3 }}>
              <div style={{ fontSize:10,color:T.textMuted,marginBottom:1 }}>{u?.name.split(" ")[0]} · {msg.time}</div>
              {msg.replyTo&&<div onClick={()=>scrollToMsg(msg.replyTo.id)} style={{ display:"flex",alignItems:"stretch",gap:0,cursor:"pointer",maxWidth:"100%",marginBottom:2,borderRadius:"0 8px 8px 0",overflow:"hidden" }}><div style={{ width:3,background:"#0052CC",flexShrink:0 }}/><div style={{ background:mine?"rgba(0,0,0,0.2)":"rgba(87,70,234,0.12)",padding:"5px 10px",flex:1,minWidth:0 }}><div style={{ fontSize:10,fontWeight:700,color:mine?"#fff":"#0052CC",marginBottom:2 }}>{msg.replyTo.userName}</div><div style={{ fontSize:11,color:mine?"rgba(255,255,255,0.85)":T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{msg.replyTo.text}</div></div></div>}
              <div style={{ display:"flex",alignItems:"center",gap:6,flexDirection:mine?"row-reverse":"row" }}>
                <div style={{ position:"relative",opacity:isHov||isMenu?1:0,transition:"opacity .15s" }}>
                  <button onClick={e=>{ e.stopPropagation(); setMenuId(isMenu?null:msg.id); }} style={{ width:26,height:26,borderRadius:"50%",border:"1px solid "+T.border,background:T.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.textMuted,fontSize:13 }}>⋯</button>
                  {isMenu&&<div ref={menuRef} style={{ position:"absolute",[mine?"right":"left"]:0,bottom:30,background:T.surface,border:"1px solid "+T.borderMed,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.18)",zIndex:999,minWidth:150,overflow:"hidden",padding:"4px" }}>
                    <div onClick={()=>startReply(msg)} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:7,cursor:"pointer",fontSize:13,color:T.text }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>↩️ Reply</div>
                    <div onClick={()=>{ navigator.clipboard?.writeText(msg.text); setMenuId(null); }} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:7,cursor:"pointer",fontSize:13,color:T.text }} onMouseEnter={e=>e.currentTarget.style.background=T.overlay} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>📋 Copy</div>
                    {mine&&<><div style={{ height:1,background:T.border,margin:"3px 6px" }}/><div onClick={()=>deleteMsg(msg.id)} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:7,cursor:"pointer",fontSize:13,color:"#EF4444" }} onMouseEnter={e=>e.currentTarget.style.background="#200A0A"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>🗑 Delete</div></>}
                  </div>}
                </div>
                <div style={{ background:mine?"#0052CC":T.surface,color:mine?"#fff":T.text,padding:"10px 14px",borderRadius:mine?"14px 14px 4px 14px":"14px 14px 14px 4px",fontSize:13,border:mine?"none":"1px solid "+T.border,lineHeight:1.55,wordBreak:"break-word" }}>{msg.text}</div>
              </div>
            </div>
          </div>); })}
        <div ref={botRef}/>
      </div>
      {replyTo&&<div style={{ margin:"0 28px 0",padding:"8px 14px",background:T.accentSub,borderRadius:"10px 10px 0 0",display:"flex",alignItems:"center",gap:10,borderTop:"2px solid #0052CC" }}><div style={{ width:3,height:32,borderRadius:2,background:"#0052CC",flexShrink:0 }}/><div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:11,fontWeight:700,color:T.accentText }}>Replying to {replyTo.userName}</div><div style={{ fontSize:12,color:T.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1 }}>{replyTo.text}</div></div><button onClick={()=>setReplyTo(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.textMuted }}>✕</button></div>}
      <div style={{ padding:"12px 28px 16px",borderTop:replyTo?"none":"1px solid "+T.border,display:"flex",gap:10,background:T.surface,flexShrink:0 }}>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={replyTo?"Reply to "+replyTo.userName+"…":"Message the team…"} style={{ flex:1,padding:"10px 16px",borderRadius:99,border:"1px solid "+T.border,fontSize:13,fontFamily:T.font,outline:"none",background:T.bg,color:T.text }}/>
        <button onClick={send} style={{ background:"#0052CC",color:"#fff",border:"none",borderRadius:99,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:T.font }}>Send</button>
      </div>
    </div>
  );
}

function ReportView({ tasks, projects, isAdmin, currentUser }) {
  const T = useT();
  const { users } = useUsers();
  const RDEPTS = [
    { key:"Sales & BD",           icon:"🤝", color:"#3B82F6" },
    { key:"Technology",           icon:"💻", color:"#8B5CF6" },
    { key:"Marketing",            icon:"📢", color:"#F97316" },
    { key:"HR",                   icon:"👤", color:"#EC4899" },
    { key:"Investment",           icon:"📈", color:"#F59E0B" },
    { key:"Finance & Accounting", icon:"💰", color:"#10B981" },
    { key:"Revenue & Collection", icon:"💳", color:"#EF4444" },
  ];
  const DEFS = {
    "Total Tasks":"Every task in the current view — your total workload scope.",
    "Done":"Tasks fully completed. Higher is better!",
    "In Progress":"Tasks actively being worked on right now.",
    "In Review":"Waiting for approval or QA after completion.",
    "Stuck":"Blocked by a dependency, question, or external factor.",
    "Overdue":"Deadline passed but not marked Done yet.",
    "Completion":"Percentage of total tasks that are Done. Target: 80%+ for a healthy sprint.",
    "Burndown":"Shows remaining tasks day by day. Ideal line slopes to zero — actual above it means behind schedule.",
    "Velocity":"How many tasks each project has completed vs remaining. Taller green = faster delivery.",
    "Cumul. Flow":"Layers of task statuses over time. Growing green (Done) = healthy. Widening yellow/red = bottleneck.",
    "Priority Split":"Breakdown of tasks by urgency. Large red slice means fire-fighting — aim for balance.",
    "Sprint Health":"Quick vitals: completion rate, blocked tasks, missed deadlines.",
    "Sprint Summary":"Key sprint numbers: scope, resolved, remaining, throughput per week.",
    "Status Breakdown":"How tasks spread across every status. Useful for spotting bottlenecks.",
    "Cycle Time":"Average days to move a task from start to done. Lower = faster delivery.",
    "Workload":"How evenly tasks are shared. Uneven bars may mean someone is overloaded.",
    "Team Breakdown":"Full stats per person — spot who needs support and who has capacity.",
    "Epic Progress":"Completion % per department. Low % at late stage needs urgent attention.",
    "Risks & Delays":"Tasks that missed their deadline. Resolve or reschedule to keep sprint health green.",
  };

  const [fProject,setFProject]=useState("All"),[fMember,setFMember]=useState("All"),[fPriority,setFPriority]=useState("All"),[fStatus,setFStatus]=useState("All"),[fDateFrom,setFDateFrom]=useState(""),[fDateTo,setFDateTo]=useState("");
  const [activeTab,setActiveTab]=useState("overview"),[exportMsg,setExportMsg]=useState("");
  const [tip,setTip]=useState({show:false,text:"",label:"",x:0,y:0});
  const chartRefs=useRef({});

  const baseTasks=isAdmin?tasks:tasks.filter(t=>t.assignees?.includes(currentUser.id));
  const filtered=baseTasks.filter(t=>{
    if(fProject!=="All"&&String(t.project)!==String(fProject)) return false;
    if(fMember!=="All"&&!(t.assignees||[]).includes(Number(fMember))) return false;
    if(fPriority!=="All"&&t.priority!==fPriority) return false;
    if(fStatus!=="All"&&t.status!==fStatus) return false;
    if(fDateFrom&&t.deadline&&t.deadline<fDateFrom) return false;
    if(fDateTo&&t.deadline&&t.deadline>fDateTo) return false;
    return true;
  });

  const total=filtered.length,done=filtered.filter(t=>t.status==="Done").length,inprog=filtered.filter(t=>t.status==="In Progress").length,inreview=filtered.filter(t=>t.status==="In Review").length,stuck=filtered.filter(t=>t.status==="Stuck").length,todoC=filtered.filter(t=>t.status==="Todo").length;
  const TODAY=TODAY_DATE(),overdue=filtered.filter(t=>t.deadline&&t.deadline<TODAY&&t.status!=="Done").length,pct=total?Math.round(done/total*100):0;

  const velData=projects.map(p=>{ const pt=filtered.filter(t=>t.project===p.id); return {name:p.name.length>14?p.name.slice(0,13)+"…":p.name,done:pt.filter(t=>t.status==="Done").length,total:pt.length}; }).filter(d=>d.total>0);
  const bdLabels=["W1","W2","W3","W4","W5","W6","W7","W8"];
  const bdIdeal=bdLabels.map((_,i)=>Math.round(total*(1-i/7)));
  const bdActual=bdLabels.map((_,i)=>{ const noise=[0,2,-1,3,-2,1,-1,0][i]||0; return Math.max(0,Math.round(total*(1-Math.min(1,i/6)*0.85)+noise)); });
  const cfdLabels=["Jan","Feb","Mar","Apr","May","Jun"];
  const cfdDone=[0,Math.round(total*.05),Math.round(total*.13),Math.round(total*.22),done,done];
  const cfdRev=[0,Math.round(total*.02),Math.round(total*.05),Math.round(total*.08),inreview,inreview];
  const cfdProg=[0,Math.round(total*.08),Math.round(total*.12),Math.round(total*.15),inprog,inprog];
  const cfdTodo=[total,Math.round(total*.85),Math.round(total*.7),Math.round(total*.55),todoC,todoC];
  const cycleData=users.map((u,i)=>({name:u.name.split(" ")[0],days:[4.2,6.8,3.1,7.5,5.3,4.9][i]||5}));
  const workload=users.map(u=>{ const ut=filtered.filter(t=>(t.assignees||[]).includes(u.id)); return {user:u,total:ut.length,done:ut.filter(t=>t.status==="Done").length,inprog:ut.filter(t=>t.status==="In Progress").length,stuck:ut.filter(t=>t.status==="Stuck").length,overdue:ut.filter(t=>t.deadline&&t.deadline<TODAY&&t.status!=="Done").length}; });
  const epicData=RDEPTS.map(d=>{ const ep=filtered.filter(t=>{ const p=projects.find(pp=>pp.id===t.project); return p?.category===d.key; }); return {...d,total:ep.length,done:ep.filter(t=>t.status==="Done").length}; }).filter(e=>e.total>0);
  const delayed=filtered.filter(t=>t.deadline&&t.deadline<TODAY&&t.status!=="Done").slice(0,8);

  const exportCSV=()=>{ const rows=[["Title","Status","Priority","Deadline","Assignees"],...filtered.map(t=>[t.title,t.status,t.priority,t.deadline||"–",(t.assignees||[]).map(id=>users.find(u=>u.id===id)?.name||id).join(";")])]; const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n"); const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download="orbix-report.csv"; a.click(); setExportMsg("Downloaded!"); setTimeout(()=>setExportMsg(""),2500); };
  const destroyChart=id=>{ try{ chartRefs.current[id]?.destroy(); }catch(e){} chartRefs.current[id]=null; };

  const buildCharts=useCallback(()=>{
    if(typeof Chart==="undefined") return;
    const dark=T.dark,gridC=dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)",txtC=dark?"#A0A0B0":"#52525B";
    const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:gridC},ticks:{color:txtC,font:{size:10}}},y:{grid:{color:gridC},ticks:{color:txtC,font:{size:10}}}}};
    const mk=(id,type,data,opts)=>{ const el=document.getElementById(id); if(!el) return; destroyChart(id); chartRefs.current[id]=new Chart(el,{type,data,options:opts}); };
    mk("r-burndown","line",{labels:bdLabels,datasets:[{label:"Ideal",data:bdIdeal,borderColor:"#A0A0B0",borderDash:[5,4],borderWidth:1.5,pointRadius:0,fill:false},{label:"Actual",data:bdActual,borderColor:"#0052CC",borderWidth:2,pointRadius:3,pointBackgroundColor:"#0052CC",backgroundColor:"rgba(87,70,234,0.08)",fill:true}]},base);
    mk("r-velocity","bar",{labels:velData.map(d=>d.name),datasets:[{label:"Done",data:velData.map(d=>d.done),backgroundColor:"#10B981",borderRadius:4},{label:"Remaining",data:velData.map(d=>d.total-d.done),backgroundColor:dark?"#2A2A35":"#E5E5EF",borderRadius:4}]},{...base,scales:{x:{...base.scales.x,stacked:true},y:{...base.scales.y,stacked:true}}});
    mk("r-cfd","line",{labels:cfdLabels,datasets:[{label:"Done",data:cfdDone,backgroundColor:"rgba(16,185,129,0.55)",fill:true,borderColor:"#10B981",borderWidth:1.5,pointRadius:0},{label:"In Review",data:cfdRev,backgroundColor:"rgba(59,130,246,0.45)",fill:true,borderColor:"#3B82F6",borderWidth:1.5,pointRadius:0},{label:"In Progress",data:cfdProg,backgroundColor:"rgba(245,158,11,0.45)",fill:true,borderColor:"#F59E0B",borderWidth:1.5,pointRadius:0},{label:"Todo",data:cfdTodo,backgroundColor:dark?"rgba(60,60,80,0.5)":"rgba(200,200,210,0.5)",fill:true,borderColor:dark?"#444":"#aaa",borderWidth:1.5,pointRadius:0}]},base);
    mk("r-priority","doughnut",{labels:["High","Medium","Low"],datasets:[{data:[filtered.filter(t=>t.priority==="High").length,filtered.filter(t=>t.priority==="Medium").length,filtered.filter(t=>t.priority==="Low").length],backgroundColor:["#EF4444","#F59E0B","#10B981"],borderWidth:0,hoverOffset:4}]},{responsive:true,maintainAspectRatio:false,cutout:"70%",plugins:{legend:{display:false}}});
    mk("r-cycle","bar",{labels:cycleData.map(d=>d.name),datasets:[{label:"Avg cycle (days)",data:cycleData.map(d=>d.days),backgroundColor:["#0052CC","#10B981","#F59E0B","#EF4444","#3B82F6","#EC4899"],borderRadius:5}]},{...base,indexAxis:"y",scales:{x:{...base.scales.x,title:{display:true,text:"days",color:txtC,font:{size:10}}},y:{grid:{display:false},ticks:{color:txtC,font:{size:10}}}}});
  },[T.dark,total,activeTab,velData.length]);

  useEffect(()=>{ const run=()=>setTimeout(buildCharts,80); if(typeof Chart!=="undefined"){run();return;} const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"; s.onload=run; document.head.appendChild(s); return ()=>{ Object.keys(chartRefs.current).forEach(destroyChart); }; },[buildCharts]);
  useEffect(()=>()=>{ Object.keys(chartRefs.current).forEach(destroyChart); },[]);

  const showTip=(e,key)=>{ if(!DEFS[key]) return; const r=e.currentTarget.getBoundingClientRect(); setTip({show:true,label:key,text:DEFS[key],x:r.left,y:r.bottom+8}); };
  const hideTip=()=>setTip(t=>({...t,show:false}));

  const Info=({k})=>(<span onMouseEnter={e=>showTip(e,k)} onMouseLeave={hideTip} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:15,height:15,borderRadius:"50%",border:"1.5px solid "+T.borderMed,color:T.textMuted,fontSize:9,fontWeight:700,cursor:"help",marginLeft:6,flexShrink:0}}>?</span>);
  const SecTitle=({children,k})=>(<div style={{display:"flex",alignItems:"center",marginBottom:14}}><span style={{fontSize:13,fontWeight:600,color:T.text}}>{children}</span>{k&&<Info k={k}/>}</div>);
  const KCard=({lbl,val,color})=>(<div onMouseEnter={e=>showTip(e,lbl)} onMouseLeave={hideTip} style={{background:T.surface,border:"1px solid "+T.border,borderRadius:14,padding:"16px 18px",borderLeft:"3px solid "+color,cursor:"help"}}><div style={{fontSize:10,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:6,display:"flex",alignItems:"center"}}>{lbl}<Info k={lbl}/></div><div style={{fontSize:22,fontWeight:700,color}}>{val}</div></div>);

  const IS=inpStyle(T),sel={...IS,width:"auto",fontSize:12,padding:"5px 10px"},card={background:T.surface,border:"1px solid "+T.border,borderRadius:14,padding:"18px 20px"};
  const tabStyle=act=>({padding:"7px 16px",borderRadius:8,border:"none",background:act?T.accentSub:"transparent",color:act?"#0052CC":T.textSub,fontWeight:act?600:400,fontSize:12,cursor:"pointer",fontFamily:T.font});
  const filtersActive=fProject!=="All"||fMember!=="All"||fPriority!=="All"||fStatus!=="All"||fDateFrom||fDateTo;
  const LegendDot=({color,label})=>(<span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.textMuted}}><span style={{width:10,height:10,background:color,borderRadius:2,display:"inline-block"}}/>{label}</span>);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:T.font}}>
      {tip.show&&<div style={{position:"fixed",top:tip.y,left:Math.min(tip.x,window.innerWidth-290),zIndex:99999,maxWidth:280,background:"#1A1A2A",color:"#E8E8F0",fontSize:12,lineHeight:1.6,padding:"9px 13px",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",pointerEvents:"none",border:"1px solid rgba(255,255,255,0.1)"}}><div style={{fontWeight:600,fontSize:10,color:"#4C9AFF",marginBottom:4,textTransform:"uppercase",letterSpacing:0.6}}>{tip.label}</div>{tip.text}</div>}
      <div style={{padding:"16px 28px",borderBottom:"1px solid "+T.border,background:T.surface,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div><h1 style={{margin:0,fontSize:18,fontWeight:700,color:T.text}}>📊 Analytics & Reports</h1><p style={{margin:"2px 0 0",fontSize:12,color:T.textMuted}}>{total} tasks in view · {pct}% complete</p></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>{exportMsg&&<span style={{fontSize:12,color:"#10B981",fontWeight:600}}>{exportMsg}</span>}<button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,border:"1px solid "+T.border,background:"transparent",cursor:"pointer",fontSize:12,fontWeight:500,color:T.textSub,fontFamily:T.font}}>⬇ Export CSV</button></div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,fontWeight:600,color:T.textMuted}}>Filters:</span>
          <select value={fProject} onChange={e=>setFProject(e.target.value)} style={sel}><option value="All">All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          {isAdmin&&<select value={fMember} onChange={e=>setFMember(e.target.value)} style={sel}><option value="All">All Members</option>{users.map(u=><option key={u.id} value={u.id}>{u.name.split(" ")[0]}</option>)}</select>}
          <select value={fPriority} onChange={e=>setFPriority(e.target.value)} style={sel}><option value="All">All Priorities</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={sel}><option value="All">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
          <input type="date" value={fDateFrom} onChange={e=>setFDateFrom(e.target.value)} style={sel}/>
          <input type="date" value={fDateTo} onChange={e=>setFDateTo(e.target.value)} style={sel}/>
          {filtersActive&&<button onClick={()=>{setFProject("All");setFMember("All");setFPriority("All");setFStatus("All");setFDateFrom("");setFDateTo("");}} style={{fontSize:11,color:"#EF4444",background:"none",border:"1px solid #EF4444",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontFamily:T.font}}>✕ Clear</button>}
        </div>
        <div style={{display:"flex",gap:4,marginTop:14}}>{["overview","sprint","team","epics"].map(t=><button key={t} onClick={()=>setActiveTab(t)} style={tabStyle(activeTab===t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",background:T.bg,padding:"20px 28px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10,marginBottom:20}}>
          <KCard lbl="Total Tasks" val={total} color="#0052CC"/><KCard lbl="Done" val={done} color="#10B981"/><KCard lbl="In Progress" val={inprog} color="#F59E0B"/><KCard lbl="In Review" val={inreview} color="#3B82F6"/><KCard lbl="Stuck" val={stuck} color="#EF4444"/><KCard lbl="Overdue" val={overdue} color={overdue?"#EF4444":T.textMuted}/><KCard lbl="Completion" val={pct+"%"} color="#10B981"/>
        </div>
        {activeTab==="overview"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><SecTitle k="Burndown">Burndown chart</SecTitle><div style={{display:"flex",gap:10}}><LegendDot color="#A0A0B0" label="Ideal"/><LegendDot color="#0052CC" label="Actual"/></div></div><div style={{position:"relative",height:200}}><canvas id="r-burndown"/></div></div>
              <div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><SecTitle k="Velocity">Velocity by project</SecTitle><div style={{display:"flex",gap:10}}><LegendDot color="#10B981" label="Done"/><LegendDot color={T.dark?"#2A2A35":"#E5E5EF"} label="Remaining"/></div></div><div style={{position:"relative",height:200}}><canvas id="r-velocity"/></div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><SecTitle k="Cumul. Flow">Cumulative flow</SecTitle><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["#10B981","Done"],["#3B82F6","In Review"],["#F59E0B","In Progress"],["#aaa","Todo"]].map(([c,l])=><LegendDot key={l} color={c} label={l}/>)}</div></div><div style={{position:"relative",height:200}}><canvas id="r-cfd"/></div></div>
              <div style={card}><SecTitle k="Priority Split">Priority distribution</SecTitle><div style={{display:"flex",alignItems:"center",gap:24}}>
                <div style={{position:"relative",height:180,width:180,flexShrink:0}}><canvas id="r-priority"/><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:22,fontWeight:700,color:T.text}}>{pct}%</div><div style={{fontSize:10,color:T.textMuted}}>complete</div></div></div>
                <div style={{flex:1}}>{[["High","#EF4444"],["Medium","#F59E0B"],["Low","#10B981"]].map(([p,c])=>{ const cnt=filtered.filter(t=>t.priority===p).length,pp=total?Math.round(cnt/total*100):0; return (<div key={p} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:T.text}}>{p}</span><span style={{fontSize:12,fontWeight:600,color:c}}>{cnt} · {pp}%</span></div><div style={{background:T.overlay,borderRadius:99,height:5,overflow:"hidden"}}><div style={{width:pp+"%",height:"100%",background:c,borderRadius:99}}/></div></div>); })}<div style={{marginTop:12,padding:"10px 12px",background:T.bg,borderRadius:10}}><div style={{fontSize:10,fontWeight:600,color:T.textMuted,marginBottom:6,textTransform:"uppercase",letterSpacing:0.7,display:"flex",alignItems:"center"}}>Sprint health<Info k="Sprint Health"/></div>{[["Completion rate",pct+"%","#10B981"],["Stuck rate",total?Math.round(stuck/total*100)+"%":"0%","#EF4444"],["Overdue",overdue+" tasks","#F59E0B"]].map(([l,v,c])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:T.textMuted}}>{l}</span><span style={{fontSize:11,fontWeight:700,color:c}}>{v}</span></div>))}</div></div>
              </div></div>
            </div>
          </div>
        )}
        {activeTab==="sprint"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={card}><SecTitle k="Burndown">Sprint burndown</SecTitle><div style={{position:"relative",height:220}}><canvas id="r-burndown"/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:16}}>{[["Velocity",done+" tasks","#10B981"],["Completion",pct+"%","#0052CC"],["Overdue",overdue,"#EF4444"]].map(([l,v,c])=>(<div key={l} style={{background:T.bg,borderRadius:10,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:9,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.7,marginBottom:4}}>{l}</div><div style={{fontSize:18,fontWeight:700,color:c}}>{v}</div></div>))}</div></div>
              <div style={card}><SecTitle k="Status Breakdown">Sprint status breakdown</SecTitle><div style={{display:"flex",flexDirection:"column",gap:10,marginTop:4}}>{[["Todo",todoC,"#A1A1AA"],["In Progress",inprog,"#F59E0B"],["In Review",inreview,"#3B82F6"],["Stuck",stuck,"#EF4444"],["Done",done,"#10B981"]].map(([s,cnt,c])=>(<div key={s}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:"50%",background:c,display:"inline-block"}}/><span style={{fontSize:13,color:T.text}}>{s}</span></div><span style={{fontSize:12,fontWeight:700,color:c}}>{cnt} · {total?Math.round(cnt/total*100):0}%</span></div><div style={{background:T.overlay,borderRadius:99,height:7,overflow:"hidden"}}><div style={{width:(total?Math.round(cnt/total*100):0)+"%",height:"100%",background:c,borderRadius:99}}/></div></div>))}</div>
              <div style={{marginTop:18,padding:"12px 14px",background:T.bg,borderRadius:10,border:"1px dashed "+T.border}}><div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:8,display:"flex",alignItems:"center"}}>Sprint summary<Info k="Sprint Summary"/></div>{[["Total scope",total+" tasks"],["Resolved",done+" tasks"],["Remaining",(total-done)+" tasks"],["Avg resolution","~4.3 days"],["Throughput",Math.round(done/6)+" tasks/wk"]].map(([l,v])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:T.textMuted}}>{l}</span><span style={{fontSize:12,fontWeight:600,color:T.text}}>{v}</span></div>))}</div></div>
            </div>
            <div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><SecTitle k="Cumul. Flow">Cumulative flow diagram</SecTitle><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["#10B981","Done"],["#3B82F6","In Review"],["#F59E0B","In Progress"],["#aaa","Todo"]].map(([c,l])=><LegendDot key={l} color={c} label={l}/>)}</div></div><div style={{position:"relative",height:220}}><canvas id="r-cfd"/></div></div>
          </div>
        )}
        {activeTab==="team"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={card}><SecTitle k="Cycle Time">Avg cycle time per member</SecTitle><div style={{position:"relative",height:220}}><canvas id="r-cycle"/></div></div>
              <div style={card}><SecTitle k="Workload">Workload distribution</SecTitle><div style={{display:"flex",flexDirection:"column",gap:10,marginTop:4}}>{workload.filter(w=>w.total>0).map(w=>{ const maxT=Math.max(...workload.map(x=>x.total),1); return (<div key={w.user.id} style={{display:"flex",alignItems:"center",gap:10}}><Av user={w.user} size={28}/><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:500,color:T.text}}>{w.user.name.split(" ")[0]}</span><div style={{display:"flex",gap:8,fontSize:10}}><span style={{color:"#10B981"}}>{w.done} done</span>{w.overdue>0&&<span style={{color:"#EF4444"}}>{w.overdue} overdue</span>}{w.stuck>0&&<span style={{color:"#F59E0B"}}>{w.stuck} stuck</span>}</div></div><div style={{background:T.overlay,borderRadius:99,height:8,overflow:"hidden"}}><div style={{width:(w.total/maxT*100)+"%",height:"100%",background:avc(w.user.id),borderRadius:99}}/></div></div><span style={{fontSize:11,fontWeight:700,color:T.textMuted,width:24,textAlign:"right"}}>{w.total}</span></div>); })}</div></div>
            </div>
            <div style={card}><SecTitle k="Team Breakdown">Team-wise breakdown</SecTitle><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"1px solid "+T.border}}>{["Member","Role","Total","Done","In Progress","Stuck","Overdue","Completion"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.6}}>{h}</th>)}</tr></thead><tbody>{workload.map(w=>{ const cp=w.total?Math.round(w.done/w.total*100):0; return (<tr key={w.user.id} style={{borderBottom:"1px solid "+T.border}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceHov} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{padding:"10px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Av user={w.user} size={26}/><div><div style={{fontWeight:500,color:T.text}}>{w.user.name}</div><div style={{fontSize:10,color:T.textMuted}}>{w.user.dept}</div></div></div></td><td style={{padding:"10px",color:T.textMuted,textTransform:"capitalize"}}>{w.user.role}</td><td style={{padding:"10px",fontWeight:600,color:T.text}}>{w.total}</td><td style={{padding:"10px",color:"#10B981",fontWeight:600}}>{w.done}</td><td style={{padding:"10px",color:"#F59E0B",fontWeight:600}}>{w.inprog}</td><td style={{padding:"10px",color:w.stuck?"#EF4444":T.textMuted,fontWeight:w.stuck?600:400}}>{w.stuck}</td><td style={{padding:"10px",color:w.overdue?"#EF4444":T.textMuted,fontWeight:w.overdue?600:400}}>{w.overdue}</td><td style={{padding:"10px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,background:T.overlay,borderRadius:99,height:5,overflow:"hidden"}}><div style={{width:cp+"%",height:"100%",background:"#0052CC",borderRadius:99}}/></div><span style={{fontSize:11,fontWeight:700,color:"#0052CC",minWidth:30}}>{cp}%</span></div></td></tr>); })}</tbody></table></div></div>
          </div>
        )}
        {activeTab==="epics"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>{epicData.length===0&&<div style={{fontSize:13,color:T.textMuted,fontStyle:"italic"}}>No epic data for current filters.</div>}{epicData.map(e=>{ const ep=e.total?Math.round(e.done/e.total*100):0; return (<div key={e.key} style={{...card,borderLeft:"3px solid "+e.color}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{width:36,height:36,borderRadius:10,background:e.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{e.icon}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text}}>{e.key}</div><div style={{fontSize:11,color:T.textMuted}}>{e.total} tasks</div></div><div style={{fontSize:18,fontWeight:700,color:e.color}}>{ep}%</div></div><div style={{background:e.color+"22",borderRadius:99,height:7,overflow:"hidden",marginBottom:8}}><div style={{width:ep+"%",height:"100%",background:e.color,borderRadius:99,transition:"width .4s"}}/></div><div style={{display:"flex",gap:6}}><span style={{fontSize:10,fontWeight:600,color:"#10B981",background:T.bg,borderRadius:99,padding:"2px 8px"}}>{e.done} Done</span><span style={{fontSize:10,fontWeight:600,color:T.textMuted,background:T.bg,borderRadius:99,padding:"2px 8px"}}>{e.total-e.done} Remaining</span></div></div>); })}</div>
            <div style={card}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><span style={{fontSize:16}}>⚠️</span><SecTitle k="Risks & Delays">Risks & delayed tasks</SecTitle><span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:"#EF4444",background:"#FEF2F2",borderRadius:99,padding:"2px 10px"}}>{delayed.length} delayed</span></div>{!delayed.length?<div style={{fontSize:13,color:T.textMuted,fontStyle:"italic",padding:"16px 0"}}>No delayed tasks — great work! 🎉</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"1px solid "+T.border}}>{["Task","Project","Priority","Due date","Assignees","Status"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:0.6}}>{h}</th>)}</tr></thead><tbody>{delayed.map(t=>{ const proj=projects.find(p=>p.id===t.project),daysOD=t.deadline?Math.round((new Date(TODAY)-new Date(t.deadline))/(1000*60*60*24)):0; return (<tr key={t.id} style={{borderBottom:"1px solid "+T.border}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceHov} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{padding:"10px"}}><div style={{fontWeight:500,color:T.text}}>{t.title}</div><div style={{fontSize:10,color:"#EF4444",marginTop:2}}>{daysOD} day{daysOD!==1?"s":""} overdue</div></td><td style={{padding:"10px",color:T.textMuted}}>{proj?.name||"–"}</td><td style={{padding:"10px"}}><span style={{fontSize:11,fontWeight:600,color:pc(t.priority)}}>● {t.priority}</span></td><td style={{padding:"10px",color:"#EF4444",fontWeight:600}}>{t.deadline}</td><td style={{padding:"10px"}}><AvatarStack ids={t.assignees||[]} size={22} max={3}/></td><td style={{padding:"10px"}}><StatusBadge status={t.status}/></td></tr>); })}</tbody></table></div>}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrbixApp({ supabaseUser, onSignOut }) {
  const [dark,setDark]=useState(false);
  const theme=useMemo(()=>makeTheme(dark),[dark]);
  const [users,setUsers]=useState(INITIAL_USERS);
  const seedUser=INITIAL_USERS.find(u=>u.email===supabaseUser?.email)||{id:Date.now(),name:(supabaseUser?.email||"User").split("@")[0],role:"member",email:supabaseUser?.email||"user@example.com",dept:"Technology"};
  const [user,setUser]=useState(seedUser);
  const [active,setActive]=useState(user.role==="admin"?"projects":"dashboard");
  const [projects,setProjects]=useState(SEED_PROJECTS);
  const [tasks,setTasks]=useState(SEED_TASKS);
  const [messages,setMessages]=useState(SEED_MSGS);
  const [meetings,setMeetings]=useState(SEED_MEETINGS);
  const [depts,setDepts]=useState(DEFAULT_DEPTS);
  const usersCtx=useMemo(()=>({users,setUsers}),[users]);
  const sp={depts,setDepts,projects,setProjects,tasks,setTasks};

  // ── Persistence ────────────────────────────────────────────────────────────
  const syncReady = useRef(false);

  useEffect(() => {
    import("@/lib/orbix-db").then(({ loadAll }) => {
      loadAll().then(data => {
        if (data.depts?.length)    setDepts(data.depts);
        if (data.projects?.length) setProjects(data.projects);
        if (data.tasks?.length)    setTasks(data.tasks);
        if (data.meetings?.length) setMeetings(data.meetings);
        if (data.messages?.length) setMessages(data.messages);
        if (data.members?.length) {
          setUsers(data.members);
          const me = data.members.find(m => m.email === supabaseUser?.email);
          if (me) { setUser(me); setActive(me.role==="admin"?"projects":"dashboard"); }
        }
        // First-time cloud setup: seed defaults into DB if empty
        setTimeout(() => {
          syncReady.current = true;
          import("@/lib/orbix-db").then(({ syncDepts, syncMembers }) => {
            if (!data.depts?.length) syncDepts(DEFAULT_DEPTS);
            if (!data.members?.length) syncMembers(INITIAL_USERS);
          });
        }, 150);
      });
    });
  }, []);

  useEffect(() => { if (!syncReady.current) return; import("@/lib/orbix-db").then(({syncProjects})=>syncProjects(projects)); }, [projects]);
  useEffect(() => { if (!syncReady.current) return; import("@/lib/orbix-db").then(({syncTasks})=>syncTasks(tasks)); }, [tasks]);
  useEffect(() => { if (!syncReady.current) return; import("@/lib/orbix-db").then(({syncMeetings})=>syncMeetings(meetings)); }, [meetings]);
  useEffect(() => { if (!syncReady.current) return; import("@/lib/orbix-db").then(({syncMessages})=>syncMessages(messages)); }, [messages]);
  useEffect(() => { if (!syncReady.current) return; import("@/lib/orbix-db").then(({syncDepts})=>syncDepts(depts)); }, [depts]);
  useEffect(() => { if (!syncReady.current) return; import("@/lib/orbix-db").then(({syncMembers})=>syncMembers(users)); }, [users]);
  // ──────────────────────────────────────────────────────────────────────────

  if(!user) return (
    <ThemeCtx.Provider value={theme}><UsersCtx.Provider value={usersCtx}>
      <Login onLogin={u=>{ setUser(u); setActive(u.role==="admin"?"projects":"dashboard"); }} dark={dark} setDark={setDark}/>
    </UsersCtx.Provider></ThemeCtx.Provider>
  );

  const isAdmin=user.role==="admin";
  const myProjects=isAdmin?projects:projects.filter(p=>p.team?.includes(user.id));
  const liveUser=users.find(u=>u.id===user.id)||user;

  const views={
    dashboard:<MemberDashboard user={liveUser} projects={projects} tasks={tasks} setActive={setActive}/>,
    projects:<ProjectsView currentUser={liveUser} {...sp}/>,
    tasks:<TasksView currentUser={liveUser} depts={depts} projects={projects} tasks={tasks} setTasks={setTasks}/>,
    teams:<TeamsView currentUser={liveUser} {...sp}/>,
    team:<TeamsView currentUser={liveUser} {...sp}/>,
    timeline:<TimelineView projects={myProjects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} currentUser={liveUser}/>,
    calendar:<CalendarView projects={projects} tasks={tasks} meetings={meetings} setMeetings={setMeetings} currentUser={liveUser}/>,
    report:<ReportView tasks={tasks} projects={projects} isAdmin={isAdmin} currentUser={liveUser}/>,
    chat:<ChatView messages={messages} setMessages={setMessages} currentUser={liveUser}/>,
  };

  return (
    <ThemeCtx.Provider value={theme}><UsersCtx.Provider value={usersCtx}>
      <div style={{display:"flex",height:"100vh",background:theme.bg,fontFamily:theme.font,overflow:"hidden"}}>
        <Sidebar user={liveUser} active={active} setActive={setActive} onLogout={onSignOut} dark={dark} setDark={setDark}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>{views[active]||views.projects}</div>
      </div>
    </UsersCtx.Provider></ThemeCtx.Provider>
  );
}