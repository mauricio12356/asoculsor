/* ASOCULSOR · Centro Cuatro de Enero. Sin dependencias externas. */
(() => {
'use strict';
const CFG = window.ASOCULSOR_CONFIG || {};
const DEMO = CFG.demoOnly === true;
const REAL = !!(CFG.supabaseUrl && CFG.supabaseKey && !DEMO);
const BASE = (CFG.supabaseUrl || '').replace(/\/$/, '');
const KEY = CFG.supabaseKey || '';
const $ = (s) => document.querySelector(s);
const enc = encodeURIComponent;
const h = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDay = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => localDay(new Date());
const offset = (d) => { const n = new Date(); n.setDate(n.getDate() + d); return localDay(n); };
const stamp = (d, hour='09:00') => `${offset(d)}T${hour}:00`;
const money = (v) => new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(v)||0);
const dateFmt = (v, time=false) => {if(!v)return '—';const d = /^\d{4}-\d\d-\d\d$/.test(v) ? new Date(v+'T12:00:00') : new Date(v);return isNaN(d.getTime())?'—':d.toLocaleString('es-EC',time?{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'short',year:'numeric'});};
const shortDate = (v) => dateFmt(v,true);
const fullname = b => [b?.first_name,b?.last_name].filter(Boolean).join(' ')||'Sin nombre';
const byId = (table,id) => (state.data[table]||[]).find(x=>String(x.id)===String(id));
const nameById = (table,id,field='name') => { const x=byId(table,id); return x?(table==='beneficiaries'?fullname(x):x[field]||'—'):'—'; };
const safeGet = key => {try{return localStorage.getItem(key)}catch{return null}};
const safeSet = (key,value) => {try{localStorage.setItem(key,value)}catch{}};
const safeRemove = key => {try{localStorage.removeItem(key)}catch{}};
// En producción no se escriben tokens en localStorage persistente.
const sessionGet = () => {try{return sessionStorage.getItem('asoculsor_session')}catch{return null}};
const sessionSave = session => {try{sessionStorage.setItem('asoculsor_session',JSON.stringify(session))}catch{}};
const sessionClear = () => {try{sessionStorage.removeItem('asoculsor_session')}catch{}};
// Eliminar sesiones de versiones anteriores (persistían indebidamente en localStorage).
safeRemove('asoculsor_session');
const uid = () => crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const imageTypes = new Set(['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
let state = {page:'dashboard',session:null,profile:null,data:{},modal:null,loading:true,search:'',filter:'',sidebar:false,authMode:'login',recovery:false,busy:false,toast:[],attendanceActivity:'',attendanceDraft:{}};
let tmpStore;
const TABS = [
  {id:'dashboard',text:'Panel general',icon:'▦',group:'PRINCIPAL'},
  {id:'beneficiaries',text:'Beneficiarios',icon:'♙',group:'GESTIÓN'},
  {id:'programs',text:'Programas',icon:'◈'},
  {id:'enrollments',text:'Inscripciones',icon:'✥'},
  {id:'activities',text:'Actividades',icon:'▤'},
  {id:'attendance',text:'Asistencia',icon:'☑'},
  {id:'appointments',text:'Citas y seguimiento',icon:'◷'},
  {id:'donations',text:'Donaciones',icon:'♡',group:'ADMINISTRACIÓN'},
  {id:'documents',text:'Documentos',icon:'▣'},
  {id:'profiles',text:'Usuarios y roles',icon:'♧'},
  {id:'reports',text:'Reportes',icon:'▥',group:'ANÁLISIS'},
  {id:'settings',text:'Configuración',icon:'⚙'}
];
const OPTIONS = {
  genders:[['','Seleccionar'],['Femenino','Femenino'],['Masculino','Masculino'],['Otro','Otro'],['No especifica','Prefiere no decir']],
  bStatus:[['activo','Activo'],['inactivo','Inactivo'],['egresado','Egresado']],
  pStatus:[['activo','Activo'],['planificado','Planificado'],['finalizado','Finalizado'],['suspendido','Suspendido']],
  aStatus:[['programada','Programada'],['realizada','Realizada'],['cancelada','Cancelada']],
  tStatus:[['programada','Programada'],['completada','Completada'],['cancelada','Cancelada'],['no_asistio','No asistió']],
  eStatus:[['activo','Activo'],['retirado','Retirado'],['finalizado','Finalizado']],
  attendance:[['presente','Presente'],['ausente','Ausente'],['justificado','Justificado']],
  methods:[['efectivo','Efectivo'],['transferencia','Transferencia'],['tarjeta','Tarjeta'],['especie','En especie']],
  roles:[['admin','Administrador'],['coordinador','Coordinador'],['operador','Operador']]
};
const field=(name,label,type='text',opts={})=>({name,label,type,...opts});
const DEFINITIONS = {
 beneficiaries:{title:'Beneficiarios',singular:'beneficiario',subtitle:'Expedientes y seguimiento de las personas atendidas.',cols:[['code','Código'],['full_name','Beneficiario'],['identification','Identificación'],['phone','Teléfono'],['status','Estado'],['created_at','Registro']],fields:[field('code','Código de expediente','text',{required:true,placeholder:'BEN-0001'}),field('first_name','Nombres','text',{required:true}),field('last_name','Apellidos','text',{required:true}),field('identification','Cédula / documento','text'),field('date_of_birth','Fecha de nacimiento','date'),field('gender','Género','select',{options:'genders'}),field('disability_type','Tipo de atención / condición','text',{placeholder:'Opcional; información sensible'}),field('phone','Teléfono','tel'),field('email','Correo electrónico','email'),field('address','Dirección','text'),field('guardian_name','Representante o contacto','text'),field('guardian_phone','Teléfono de contacto','tel'),field('status','Estado','select',{options:'bStatus',default:'activo'}),field('notes','Observaciones de seguimiento','textarea',{full:true})]},
 programs:{title:'Programas',singular:'programa',subtitle:'Organiza los programas y servicios de la fundación.',cols:[['name','Nombre del programa'],['category','Área'],['capacity','Cupos'],['start_date','Inicio'],['end_date','Finalización'],['status','Estado']],fields:[field('name','Nombre del programa','text',{required:true}),field('category','Área / categoría','text'),field('capacity','Cupos máximos','number',{min:1}),field('start_date','Fecha de inicio','date'),field('end_date','Fecha de fin','date'),field('status','Estado','select',{options:'pStatus',default:'activo'}),field('description','Descripción y objetivos','textarea',{full:true})]},
 enrollments:{title:'Inscripciones',singular:'inscripción',subtitle:'Vincula a los beneficiarios con los programas.',cols:[['beneficiary_id','Beneficiario'],['program_id','Programa'],['joined_at','Inscrito desde'],['status','Estado']],fields:[field('beneficiary_id','Beneficiario','relation',{table:'beneficiaries',required:true}),field('program_id','Programa','relation',{table:'programs',required:true}),field('joined_at','Fecha de inscripción','date',{defaultToday:true}),field('status','Estado','select',{options:'eStatus',default:'activo'})]},
 activities:{title:'Actividades',singular:'actividad',subtitle:'Planificación de talleres, eventos y sesiones.',cols:[['title','Actividad'],['program_id','Programa'],['starts_at','Inicio'],['location','Lugar'],['status','Estado']],fields:[field('title','Título de la actividad','text',{required:true}),field('program_id','Programa vinculado','relation',{table:'programs'}),field('starts_at','Inicio','datetime-local',{required:true}),field('ends_at','Finalización','datetime-local'),field('location','Lugar / sala','text'),field('status','Estado','select',{options:'aStatus',default:'programada'}),field('notes','Detalles de la actividad','textarea',{full:true})]},
 appointments:{title:'Citas y seguimiento',singular:'cita',subtitle:'Agenda de atenciones y seguimientos individuales.',cols:[['beneficiary_id','Beneficiario'],['title','Motivo'],['starts_at','Fecha y hora'],['staff_id','Responsable'],['status','Estado']],fields:[field('beneficiary_id','Beneficiario','relation',{table:'beneficiaries',required:true}),field('title','Motivo de cita','text',{required:true}),field('starts_at','Fecha y hora de inicio','datetime-local',{required:true}),field('ends_at','Fecha y hora de cierre','datetime-local'),field('staff_id','Personal responsable','relation',{table:'profiles'}),field('status','Estado','select',{options:'tStatus',default:'programada'}),field('notes','Seguimiento / observaciones','textarea',{full:true})]},
 donations:{title:'Donaciones',singular:'donación',subtitle:'Control de contribuciones económicas o en especie.',cols:[['donor_name','Donante'],['donated_at','Fecha'],['amount','Valor'],['method','Método'],['purpose','Destino']],fields:[field('donor_name','Nombre del donante','text',{required:true}),field('donor_email','Correo del donante','email'),field('amount','Valor referencial (USD)','number',{required:true,min:0,step:'0.01',default:0}),field('donated_at','Fecha de donación','date',{defaultToday:true}),field('method','Tipo de donación','select',{options:'methods',default:'efectivo'}),field('purpose','Destino / concepto','text'),field('notes','Notas','textarea',{full:true})]},
 documents:{title:'Documentos',singular:'documento',subtitle:'Expedientes digitales guardados de forma privada en Supabase Storage.',cols:[['file_name','Documento'],['beneficiary_id','Beneficiario'],['notes','Descripción'],['file_size','Tamaño'],['created_at','Subido']],fields:[field('beneficiary_id','Beneficiario relacionado','relation',{table:'beneficiaries'}),field('notes','Descripción del documento','textarea',{full:true})]},
 profiles:{title:'Usuarios y roles',singular:'usuario',subtitle:'Accesos del personal autorizados por la fundación.',cols:[['full_name','Nombre'],['email','Correo'],['role','Rol'],['active','Acceso'],['created_at','Creación']],fields:[field('full_name','Nombre completo','text',{required:true}),field('role','Rol asignado','select',{options:'roles',required:true}),field('active','Cuenta habilitada','select',{options:[['true','Sí, habilitada'],['false','No, bloqueada']]})]}
};
function demoSeed(){
 const b=[
  {id:'b1',code:'BEN-0001',first_name:'Andrea',last_name:'Mendoza',identification:'',phone:'0990000001',status:'activo',date_of_birth:'2011-05-08',guardian_name:'María Mendoza',guardian_phone:'0980000001',created_at:stamp(-60)},
  {id:'b2',code:'BEN-0002',first_name:'Luis',last_name:'Vera',identification:'',phone:'0990000002',status:'activo',date_of_birth:'2009-11-12',created_at:stamp(-53)},
  {id:'b3',code:'BEN-0003',first_name:'Sofía',last_name:'García',identification:'',phone:'0990000003',status:'activo',date_of_birth:'2013-01-10',created_at:stamp(-42)},
  {id:'b4',code:'BEN-0004',first_name:'Carlos',last_name:'Torres',identification:'',phone:'0990000004',status:'inactivo',created_at:stamp(-20)}];
 const programs=[{id:'p1',name:'Inclusión y desarrollo',category:'Desarrollo integral',status:'activo',capacity:35,start_date:offset(-60),end_date:offset(90),description:'Actividades de desarrollo y participación.'},{id:'p2',name:'Talleres de habilidades',category:'Formación',status:'activo',capacity:20,start_date:offset(-45),end_date:offset(60)},{id:'p3',name:'Acompañamiento familiar',category:'Bienestar',status:'planificado',capacity:25,start_date:offset(10)}];
 const acts=[{id:'a1',title:'Taller de comunicación',program_id:'p1',starts_at:stamp(1,'09:00'),ends_at:stamp(1,'11:00'),location:'Sala principal',status:'programada'},{id:'a2',title:'Sesión de habilidades',program_id:'p2',starts_at:stamp(3,'10:00'),location:'Aula 2',status:'programada'},{id:'a3',title:'Encuentro de familias',program_id:'p3',starts_at:stamp(8,'15:00'),status:'programada'}];
 return {beneficiaries:b,programs,activities:acts,enrollments:[{id:'e1',beneficiary_id:'b1',program_id:'p1',joined_at:offset(-35),status:'activo'},{id:'e2',beneficiary_id:'b2',program_id:'p1',joined_at:offset(-30),status:'activo'},{id:'e3',beneficiary_id:'b3',program_id:'p2',joined_at:offset(-25),status:'activo'}],attendance:[{id:'at1',activity_id:'a1',beneficiary_id:'b1',status:'presente',notes:''}],appointments:[{id:'t1',beneficiary_id:'b1',title:'Valoración inicial',starts_at:stamp(2,'11:00'),status:'programada',staff_id:'demo-admin'},{id:'t2',beneficiary_id:'b2',title:'Seguimiento',starts_at:stamp(5,'09:30'),status:'programada',staff_id:'demo-admin'}],donations:[{id:'d1',donor_name:'Donante de ejemplo',donated_at:offset(-9),amount:250,method:'transferencia',purpose:'Materiales de talleres'},{id:'d2',donor_name:'Empresa de ejemplo',donated_at:offset(-34),amount:130,method:'efectivo',purpose:'Actividades'},{id:'d3',donor_name:'Aporte comunitario',donated_at:offset(-65),amount:90,method:'transferencia',purpose:'Apoyo'}],documents:[],profiles:[{id:'demo-admin',full_name:'Administrador ASOCULSOR',email:'admin@asoculsor.demo',role:'admin',active:true,created_at:stamp(-80)}],audit_logs:[]};
}
function demoDB(){if(!tmpStore){try{tmpStore=JSON.parse(safeGet('asoculsor_demo_v2'))||demoSeed()}catch{tmpStore=demoSeed()}}return tmpStore}
function saveDemo(){safeSet('asoculsor_demo_v2',JSON.stringify(demoDB()))}
const sortRows = (table,arr) => arr.slice().sort((a,b) => String(b.created_at||b.starts_at||b.donated_at||'').localeCompare(String(a.created_at||a.starts_at||a.donated_at||'')));
async function request(path,opts={},retry=true){
 let session=state.session;
 const headers={'apikey':KEY,...(session?.access_token && !opts.noAuth?{'Authorization':`Bearer ${session.access_token}`}:{}),...(opts.headers||{})};
 let resp;try{resp=await fetch(`${BASE}${path}`,{...opts,headers,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'})}catch{throw Error('No se pudo conectar a Supabase. Revisa tu conexión y URL.')} 
 if(resp.status===401 && retry && session?.refresh_token){await refreshSession();return request(path,opts,false)}
 const body=await resp.text();let parsed=null;try{parsed=body?JSON.parse(body):null}catch{parsed=body}
 if(!resp.ok)throw Error(parsed?.msg||parsed?.message||parsed?.error_description||parsed?.error||`Error HTTP ${resp.status}`);
 return parsed;
}
async function refreshSession(){const refresh=state.session?.refresh_token;if(!refresh)throw Error('La sesión caducó. Inicia sesión de nuevo.');
 const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',noAuth:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh})},false);state.session=data;sessionSave(data);return data;}
async function login(email,password){const data=await request('/auth/v1/token?grant_type=password',{method:'POST',noAuth:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})},false);state.session=data;sessionSave(data);await loadProfile();}
async function register(name,email,password){return request('/auth/v1/signup',{method:'POST',noAuth:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{full_name:name}})},false)}
async function recovery(email){return request('/auth/v1/recover?redirect_to='+enc(location.origin+location.pathname),{method:'POST',noAuth:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({email})},false)}
async function setPassword(password){return request('/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})})}
async function loadProfile(){if(!REAL){state.profile=byId('profiles','demo-admin')||demoDB().profiles[0];return}
 const userId=state.session?.user?.id; const list=await request(`/rest/v1/profiles?id=eq.${enc(userId)}&select=*`);
 state.profile=list?.[0]||null;
 if(!state.profile)throw Error('No existe un perfil de acceso. Comprueba el disparador SQL.');}
async function fetchTable(table){if(!REAL)return sortRows(table,demoDB()[table]||[]);
 let all=[],offset=0,chunk;do{chunk=await request(`/rest/v1/${enc(table)}?select=*&limit=500&offset=${offset}`);all.push(...chunk);offset+=chunk.length;if(all.length>=10000)break;}while(chunk.length===500);return sortRows(table,all);}
async function loadData(){const tables=['beneficiaries','programs','enrollments','activities','attendance','appointments','profiles'];
 if(['admin','coordinador'].includes(role()))tables.push('donations','documents','audit_logs');
 const results=await Promise.all(tables.map(async t=>[t,await fetchTable(t)]));state.data=Object.fromEntries(results);}
async function mutate(table,payload,id=null){
 if(!REAL){let rows=demoDB()[table];if(!rows)throw Error('Tabla no disponible.');
  if(table==='enrollments'&&rows.some(x=>x.beneficiary_id===payload.beneficiary_id&&x.program_id===payload.program_id&&x.id!==id))throw Error('El beneficiario ya está inscrito en este programa.');
  const value=id?{...rows.find(x=>String(x.id)===String(id)),...payload}:{id:uid(),created_at:new Date().toISOString(),...payload};
  if(id){const at=rows.findIndex(x=>String(x.id)===String(id));if(at<0)throw Error('Registro no encontrado.');rows[at]=value}else rows.unshift(value);
  if(table==='profiles'&&id===state.profile?.id)state.profile={...state.profile,...payload};saveDemo();return value;
 }
 const path=id?`/rest/v1/${table}?id=eq.${enc(id)}`:`/rest/v1/${table}`;
 const response=await request(path,{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
 return response?.[0];
}
async function destroy(table,id){if(!REAL){const list=demoDB()[table]||[];demoDB()[table]=list.filter(x=>String(x.id)!==String(id));saveDemo();return}
 await request(`/rest/v1/${table}?id=eq.${enc(id)}`,{method:'DELETE',headers:{'Prefer':'return=minimal'}});}
async function bulkAttendance(entries){if(!REAL){const rows=demoDB().attendance;for(const entry of entries){const found=rows.find(x=>x.activity_id===entry.activity_id&&x.beneficiary_id===entry.beneficiary_id);if(found)Object.assign(found,entry);else rows.push({id:uid(),created_at:new Date().toISOString(),...entry})}saveDemo();return}
 await request('/rest/v1/attendance?on_conflict=activity_id,beneficiary_id',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(entries)});
}
async function uploadDoc(file,meta){if(!file)throw Error('Selecciona un archivo.');if(file.size>10*1024*1024)throw Error('El archivo no debe exceder los 10 MB.');
 if(!imageTypes.has(file.type))throw Error('Solo se admite PDF, JPG, PNG y DOCX.');
 const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
 const path=`${state.session?.user?.id||'demo'}/${uid()}-${safeName}`;
 if(REAL){await request(`/storage/v1/object/expedientes/${path.split('/').map(enc).join('/')}`,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});}
 const row={...meta,file_name:file.name,file_path:path,file_size:file.size,mime_type:file.type,uploaded_by:state.profile?.id};
 try{return await mutate('documents',row)}catch(e){if(REAL){try{await removeStoredFile(path)}catch{}}throw e}
}
async function removeStoredFile(path){if(!REAL)return;await request(`/storage/v1/object/expedientes/${path.split('/').map(enc).join('/')}`,{method:'DELETE'});}
async function openDoc(item){if(!REAL)throw Error('Los archivos de la demostración no tienen contenido real. Conecta Supabase para abrirlos.');
 const signed=await request(`/storage/v1/object/sign/expedientes/${item.file_path.split('/').map(enc).join('/')}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:120})});
 if(!signed?.signedURL)throw Error('No se pudo generar el acceso privado.');
 const url=signed.signedURL.startsWith('http')?signed.signedURL:`${BASE}/storage/v1${signed.signedURL.startsWith('/')?'':'/'}${signed.signedURL}`;
 window.open(url,'_blank','noopener,noreferrer');
}
const role=()=>state.profile?.role||'operador';
const canEdit=t=>role()==='admin'||role()==='coordinador'||(role()==='operador'&&['beneficiaries','enrollments','appointments','attendance','activities'].includes(t));
const canDelete=t=>(role()==='admin'&&t!=='profiles')||(role()==='coordinador'&&!['profiles','donations','beneficiaries','appointments'].includes(t));
const isAdmin=()=>role()==='admin';
function labelRole(r){return ({admin:'Administrador',coordinador:'Coordinador',operador:'Operador'})[r]||r||'—'}
function toast(msg,error=false){const id=uid();state.toast.push({id,msg,error});renderToasts();setTimeout(()=>{state.toast=state.toast.filter(t=>t.id!==id);renderToasts()},4800)}
function renderToasts(){let el=$('.toast-region');if(!el){el=document.createElement('div');el.className='toast-region';document.body.appendChild(el)}el.innerHTML=state.toast.map(t=>`<div class="toast ${t.error?'error':''}" role="alert">${h(t.msg)}</div>`).join('')}
function setLoading(loading){state.loading=loading;render()}
function titleArea(title,description,button=''){return `<div class="page-head"><div><div class="eyebrow">Fundación ASOCULSOR · Centro Cuatro de Enero</div><h1>${h(title)}</h1><p>${h(description)}</p></div>${button}</div>`}
function badge(v){const x=String(v??'').toLowerCase();const color=['activo','presente','completada','realizada','habilitado','true'].includes(x)?'green':['programada','planificado','justificado','pendiente','false'].includes(x)?'amber':['inactivo','cancelada','ausente','retirado','suspendido','no_asistio'].includes(x)?'red':'blue';return `<span class="tag ${color}">${h(v===true?'Habilitado':v===false?'Bloqueado':x.replaceAll('_',' ')||'—')}</span>`}
function initials(name){return (name||'A').split(' ').filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('')}
function render(){const target=$('#app');if(!target)return;
 if(state.loading){target.innerHTML='<div class="loading-screen"><div><div class="spinner"></div><h3>Preparando ASOCULSOR</h3></div></div>';return}
 if(!state.profile){target.innerHTML=renderAuth();return}
 if(role()==='operador' && ['donations','documents','reports','profiles'].includes(state.page))state.page='dashboard';
 const current=TABS.find(x=>x.id===state.page)||TABS[0];
 const nav=TABS.filter(x=>x.id!=='profiles'||isAdmin()).filter(x=>!['donations','documents','reports'].includes(x.id)||role()!=='operador').map((t,i,a)=>`${t.group?`<div class="nav-head">${t.group}</div>`:''}<button class="nav-btn ${state.page===t.id?'active':''}" data-page="${t.id}"><span class="nav-icon">${t.icon}</span><span>${t.text}</span></button>`).join('');
 const content=state.page==='dashboard'?renderDashboard():DEFINITIONS[state.page]?(state.page==='documents'?renderDocs():state.page==='profiles'?renderTable('profiles'):renderTable(state.page)):state.page==='attendance'?renderAttendance():state.page==='reports'?renderReports():renderSettings();
 target.innerHTML=`<div class="app-shell"><div class="side-overlay ${state.sidebar?'show':''}" data-action="close-sidebar"></div><aside class="sidebar ${state.sidebar?'open':''}"><div class="brand"><div class="brand-mark">A</div><div><div class="brand-title">ASOCULSOR</div><div class="brand-small">CENTRO CUATRO DE ENERO</div></div></div><div class="workspace-chip"><span class="status-dot"></span><span>${REAL?'Conectado a Supabase':'Espacio de demostración'}</span></div>${nav}<div class="sidebar-bottom"><div class="avatar">${h(initials(state.profile.full_name))}</div><div class="sidebar-user"><strong>${h(state.profile.full_name||'Usuario')}</strong><span>${labelRole(role())}</span></div><button class="side-signout" title="Cerrar sesión" data-action="logout">⇥</button></div></aside><div class="main"><header class="topbar"><div class="top-left"><button class="mobile-menu" data-action="toggle-sidebar">☰</button><span class="breadcrumbs">Inicio / <strong>${h(current.text)}</strong></span></div><div class="top-actions">${!REAL?'<span class="badge-demo">MODO DEMO</span>':''}<span class="top-date">${new Date().toLocaleDateString('es-EC',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><div class="avatar top-avatar">${h(initials(state.profile.full_name))}</div></div></header><main class="content">${content}<div class="footer-note">ASOCULSOR • Sistema institucional de gestión · Información interna y confidencial</div></main></div></div>${state.modal?renderModal():''}`;
 renderToasts();
}
function renderAuth(){
 if(!REAL&&!DEMO)return `<div class="auth-page"><section class="auth-left"><div class="brand"><div class="brand-mark">A</div><div class="brand-title">ASOCULSOR</div></div><div class="auth-hero"><h1>Sistema institucional</h1><p>Centro Cuatro de Enero · Plataforma de gestión privada</p></div></section><section class="auth-right"><div class="auth-card"><div class="eyebrow">CONFIGURACIÓN NECESARIA</div><h2>Conecta Supabase</h2><p>Este es el sistema real. El acceso permanece cerrado hasta configurar la URL y la clave pública en <strong>config.js</strong> y ejecutar el esquema SQL.</p><div class="notice warning">No hay cuentas o contraseñas de demostración en esta versión.</div><p>Consulta el archivo <strong>README_SEGURIDAD.md</strong> antes de activar usuarios.</p></div></section></div>`;
 const mode=state.recovery?'change':state.authMode;
 const titles={login:['Bienvenido de nuevo','Ingresa con tu cuenta institucional para gestionar la fundación.'],register:['Solicitar una cuenta','Tu acceso deberá ser autorizado por un administrador.'],forgot:['Recuperar contraseña','Recibirás un enlace para crear una contraseña nueva.'],change:['Establecer contraseña','Crea una contraseña segura para acceder a tu cuenta.']};
 const [title,desc]=titles[mode]||titles.login;
 return `<div class="auth-page"><section class="auth-left"><div class="brand"><div class="brand-mark">A</div><div><div class="brand-title">ASOCULSOR</div><div class="brand-small">CENTRO CUATRO DE ENERO</div></div></div><div class="auth-hero"><h1>Una gestión más humana, <em>conectada y eficiente.</em></h1><p>Administra los programas, la atención, las actividades y los recursos de la fundación desde una plataforma centralizada y segura.</p><div class="auth-features"><span>✓ Gestión integral</span><span>✓ Seguimiento centralizado</span><span>✓ Reportes</span></div></div><div class="auth-footer">© ${new Date().getFullYear()} Fundación ASOCULSOR · Plataforma de gestión</div></section><section class="auth-right"><div class="auth-card"><div class="eyebrow">PLATAFORMA ADMINISTRATIVA</div><h2>${title}</h2><p>${desc}</p>${DEMO?'<div class="notice warning">Vista de prueba sin Supabase. Los datos del modo demo son ficticios y se guardan localmente en este navegador.</div>':''}<form data-form="auth" autocomplete="on">${mode==='register'?`<div class="field"><label>Nombre completo</label><input name="full_name" type="text" placeholder="Tu nombre y apellido" required maxlength="150" /></div>`:''}${mode!=='change'?`<div class="field"><label>Correo electrónico</label><input name="email" type="email" placeholder="nombre@fundacion.org" required autocomplete="email" /></div>`:''}${['login','register','change'].includes(mode)?`<div class="field"><label>${mode==='change'?'Nueva contraseña':'Contraseña'}</label><input name="password" type="password" minlength="${mode==='login'?8:12}" required autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="${mode==='login'?'Tu contraseña':'Mínimo 12 caracteres'}" /></div>`:''}<button class="button primary" type="submit" ${state.busy?'disabled':''}>${state.busy?'Procesando...':({login:'Iniciar sesión',register:'Crear solicitud',forgot:'Enviar enlace',change:'Guardar contraseña'})[mode]}</button></form>${DEMO?`<div class="separator">o</div><button type="button" class="button demo-btn" data-action="demo-login">✦ Entrar a la demostración</button>`:''}<div class="auth-links">${mode==='login'?'<button class="auth-link" data-auth="forgot">¿Olvidaste tu contraseña?</button><button class="auth-link" data-auth="register">Solicitar acceso</button>':'<button class="auth-link" data-auth="login">← Volver al inicio de sesión</button>'}</div></div></section></div>`;
}
function renderDashboard(){const b=state.data.beneficiaries||[],p=state.data.programs||[],a=state.data.activities||[],ap=state.data.appointments||[],don=state.data.donations||[];
 const activeB=b.filter(x=>x.status==='activo').length,activeP=p.filter(x=>x.status==='activo').length,pending=ap.filter(x=>x.status==='programada'&&new Date(x.starts_at)>=new Date(new Date().setHours(0,0,0,0))).length;
 const total=don.filter(x=>x.method!=='especie').reduce((s,x)=>s+Number(x.amount||0),0);
 const scheduled=[...a.filter(x=>x.status==='programada').map(x=>({title:x.title,when:x.starts_at,kind:'Actividad',icon:'◈'})),...ap.filter(x=>x.status==='programada').map(x=>({title:x.title+' · '+nameById('beneficiaries',x.beneficiary_id),when:x.starts_at,kind:'Cita',icon:'◷'}))].filter(x=>x.when&&new Date(x.when)>=new Date(new Date().setHours(0,0,0,0))).sort((x,y)=>new Date(x.when)-new Date(y.when)).slice(0,5);
 const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-5+i);return {year:d.getFullYear(),month:d.getMonth(),text:d.toLocaleDateString('es-EC',{month:'short'}).replace('.','')}});
 const amounts=months.map(m=>don.filter(x=>{const date=new Date(x.donated_at+'T12:00:00');return date.getFullYear()===m.year&&date.getMonth()===m.month&&x.method!=='especie'}).reduce((s,x)=>s+Number(x.amount||0),0));const max=Math.max(...amounts,1);
 return `${titleArea('Panel general','Una visión completa de las operaciones y actividades de la fundación.',`<button class="button primary" data-action="open-create" data-table="beneficiaries">＋ Nuevo beneficiario</button>`)}
 <div class="grid kpis">${[['Beneficiarios activos',activeB,'♙','Registrados y en atención'],['Programas activos',activeP,'◈','Servicios en ejecución'],['Citas pendientes',pending,'◷','Próximas atenciones'],...(['admin','coordinador'].includes(role())?[['Donaciones registradas',money(total),'♡','Total de aportes monetarios']]:[])].map((c,i)=>`<div class="kpi"><div class="kpi-top"><span class="kpi-label">${c[0]}</span><span class="kpi-symbol" style="background:${['#e5f9f3','#e9f1ff','#fff2df','#fcecf3'][i]}">${c[2]}</span></div><div class="kpi-value">${c[1]}</div><div class="kpi-bottom">${c[3]}</div></div>`).join('')}</div>
 <div class="grid panels">${role()!=='operador'?`<section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Donaciones por mes</h2><div class="panel-sub">Evolución de los últimos seis meses, en USD</div></div><span class="tag green">Ingresos</span></div><div class="bars" aria-label="Gráfico de donaciones mensuales">${months.map((m,i)=>`<div class="bar-col" title="${m.text}: ${money(amounts[i])}"><div class="bar ${amounts[i]===0?'bar-zero':''}" style="height:${Math.max(4,Math.round(amounts[i]/max*91))}%"></div><span class="bar-label">${h(m.text)}</span></div>`).join('')}</div><div class="chart-footer"><span>Ingresos monetarios registrados</span><span class="metric-amount">${money(total)}</span></div></section>`:''}
 <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Próximas actividades</h2><div class="panel-sub">Agenda de la institución</div></div><button class="mini-link" data-page="activities">Ver agenda →</button></div><div class="activity-list">${scheduled.length?scheduled.map(x=>`<div class="activity-item"><div class="activity-icon">${x.icon}</div><div class="activity-details"><strong>${h(x.title)}</strong><small>${x.kind}<span class="activity-mobile-date"> · ${h(dateFmt(x.when,true))}</span></small></div><div class="list-date">${dateFmt(x.when,true)}</div></div>`).join(''):'<div class="empty" style="padding:28px 0"><span class="empty-icon">◷</span><strong>No hay actividades próximas</strong><small>Programa una nueva actividad o cita.</small></div>'}</div></section></div>
 <div class="grid two-col" style="margin-top:18px"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Últimos beneficiarios</h2><div class="panel-sub">Registros recientes</div></div><button class="mini-link" data-page="beneficiaries">Ver todos →</button></div><div class="activity-list">${b.slice(0,4).map(x=>`<div class="activity-item"><div class="avatar">${h(initials(fullname(x)))}</div><div class="activity-details"><strong>${h(fullname(x))}</strong><small>${h(x.code||'Sin código')} · ${h(x.phone||'Sin teléfono')}</small></div>${badge(x.status)}</div>`).join('')||'<p class="muted">Sin registros todavía.</p>'}</div></section><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Accesos rápidos</h2><div class="panel-sub">Operaciones habituales</div></div></div><p class="muted" style="font-size:12px">Crea nuevos registros y actualiza la atención desde el panel.</p><div class="quick-actions"><button class="button secondary" data-action="open-create" data-table="appointments">◷ Agendar cita</button><button class="button secondary" data-action="open-create" data-table="activities">◈ Programar actividad</button><button class="button secondary" data-page="attendance">☑ Registrar asistencia</button>${role()!=='operador'?'<button class="button secondary" data-page="reports">▥ Ver reportes</button>':''}</div></section></div>`;
}
function renderCell(table,key,row){const v=row[key];if(key==='full_name')return `<div class="cell-title">${h(table==='profiles'?row.full_name:fullname(row))}</div>${table==='beneficiaries'?`<div class="cell-sub">${h(row.email||'')}</div>`:''}`;
 if(key==='file_name'||key==='name'||key==='title'||key==='donor_name')return `<span class="cell-title">${h(v||'—')}</span>`;
 if(['status','active','role'].includes(key))return key==='role'?`<span class="tag blue">${h(labelRole(v))}</span>`:badge(v);
 if(key==='beneficiary_id')return h(nameById('beneficiaries',v));
 if(key==='program_id')return h(nameById('programs',v));
 if(key==='activity_id')return h(nameById('activities',v,'title'));
 if(key==='staff_id')return h(nameById('profiles',v,'full_name'));
 if(key==='amount')return `<strong>${money(v)}</strong>`;
 if(key==='file_size')return `${(Number(v||0)/1024).toFixed(1)} KB`;
 if(['created_at','starts_at','ends_at'].includes(key))return h(dateFmt(v,key==='starts_at'||key==='ends_at'));
 if(['date_of_birth','joined_at','start_date','end_date','donated_at'].includes(key))return h(dateFmt(v));
 return h(String(v??'—').slice(0,110));}
function renderTable(table){const def=DEFINITIONS[table];const all=state.data[table]||[];const needle=state.search.toLowerCase().trim();const selected=all.filter(row=>!needle||Object.values(row).join(' ').toLowerCase().includes(needle)||((row.beneficiary_id&&nameById('beneficiaries',row.beneficiary_id).toLowerCase().includes(needle))||(row.program_id&&nameById('programs',row.program_id).toLowerCase().includes(needle))));
 const addable=table!=='profiles'&&canEdit(table);
 let button=addable?`<button class="button primary" data-action="open-create" data-table="${table}">＋ Agregar ${h(def.singular)}</button>`:'';
 if(table==='profiles')button=`<span class="badge-demo">Solo administradores</span>`;
 return `${titleArea(def.title,def.subtitle,button)}${table==='profiles'?'<div class="notice">Para añadir usuarios, usa «Solicitar acceso» en la pantalla inicial. Después habilita aquí su perfil y asígnale un rol. El primer administrador se habilita desde Supabase siguiendo el README.</div>':''}
 <section class="table-panel"><div class="table-tools"><div class="search"><span>⌕</span><input aria-label="Buscar registros" id="table-search" placeholder="Buscar por nombre, código, detalle..." value="${h(state.search)}" autocomplete="off" /></div><div class="h-stack"><span class="result-count">${selected.length} de ${all.length} registros</span><button class="button secondary small-button" data-action="refresh">↻ Actualizar</button><button class="button secondary small-button" data-action="export" data-table="${table}">⇩ Excel</button></div></div><div class="table-scroll"><table class="data-table"><thead><tr>${def.cols.map(([key,label])=>`<th>${label}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${selected.slice(0,150).map(row=>`<tr>${def.cols.map(([key])=>`<td>${renderCell(table,key,row)}</td>`).join('')}<td><div class="actions">${table==='documents'?`<button class="icon-button" title="Ver documento" data-action="view-file" data-id="${h(row.id)}">↗ Abrir</button>`:''}${canEdit(table)||table==='profiles'&&isAdmin()?`<button class="icon-button" title="Editar" data-action="open-edit" data-table="${table}" data-id="${h(row.id)}">✎ Editar</button>`:''}${canDelete(table)?`<button class="icon-button" title="Eliminar" data-action="delete" data-table="${table}" data-id="${h(row.id)}">✕</button>`:''}</div></td></tr>`).join('')}</tbody></table>${!selected.length?`<div class="empty"><div class="empty-icon">◇</div><strong>Sin resultados</strong><small>${needle?'Prueba con otra búsqueda.':'Registra el primer elemento para comenzar.'}</small></div>`:''}</div>${selected.length>150?'<p class="muted" style="padding:12px 20px;font-size:11px">Mostrando los primeros 150 resultados. Usa la búsqueda para acotar los registros.</p>':''}</section>`;
}
function renderDocs(){return renderTable('documents')}
function renderAttendance(){const acts=state.data.activities||[];const act=byId('activities',state.attendanceActivity)||acts.filter(x=>new Date(x.starts_at)>=new Date(new Date().setHours(0,0,0,0))).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]||acts[0];if(!state.attendanceActivity&&act)state.attendanceActivity=String(act.id);
 const programId=act?.program_id;const enrolled=programId?(state.data.enrollments||[]).filter(x=>x.program_id===programId&&x.status==='activo').map(x=>x.beneficiary_id):null;
 const users=(state.data.beneficiaries||[]).filter(x=>x.status==='activo'&&(!enrolled||enrolled.includes(x.id)));
 const saved=(state.data.attendance||[]).filter(x=>x.activity_id===act?.id);
 return `${titleArea('Control de asistencia','Registra asistencia por actividad y consulta el historial de participación.',`<button class="button secondary" data-action="export" data-table="attendance">⇩ Descargar Excel</button>`)}<div class="grid two-col"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Pasar lista</h2><div class="panel-sub">Selecciona una actividad programada o realizada</div></div></div><div class="attendance-toolbar"><select id="attendance-activity" class="dropdown"><option value="">Elegir actividad</option>${acts.map(a=>`<option value="${h(a.id)}" ${act?.id===a.id?'selected':''}>${h(a.title)} · ${h(dateFmt(a.starts_at))}</option>`).join('')}</select></div>${act?`<p class="muted" style="font-size:12px;margin-top:4px">${h(nameById('programs',act.program_id))} · ${users.length} beneficiarios para registrar</p><div>${users.map(b=>{const existing=saved.find(x=>x.beneficiary_id===b.id);const selected=state.attendanceDraft[b.id]||existing?.status||'presente';return `<div class="attendance-row"><div><strong>${h(fullname(b))}</strong><div class="cell-sub">${h(b.code)}</div></div><select data-attend-person="${h(b.id)}">${OPTIONS.attendance.map(([val,label])=>`<option value="${val}" ${selected===val?'selected':''}>${label}</option>`).join('')}</select></div>`}).join('')||'<div class="empty">No hay beneficiarios inscritos en este programa.</div>'}</div><div class="quick-actions"><button class="button primary" data-action="save-attendance" ${users.length?'':'disabled'}>✓ Guardar ${users.length} asistencias</button></div>`:'<div class="empty"><div class="empty-icon">☑</div><strong>Sin actividades registradas</strong><small>Crea una actividad para poder tomar asistencia.</small></div>'}</section><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Resumen de asistencia</h2><div class="panel-sub">Resultados guardados de la actividad seleccionada</div></div></div><div class="grid" style="grid-template-columns:repeat(3,1fr);gap:9px">${[['presentes','presente','green'],['ausentes','ausente','red'],['justificados','justificado','amber']].map(([lbl,key,c])=>`<div class="report-card"><span>${lbl}</span><strong>${saved.filter(x=>x.status===key).length}</strong><span class="tag ${c}">${key}</span></div>`).join('')}</div><hr class="section-divider"><div class="panel-heading"><div><h2 class="panel-title">Últimos registros</h2></div></div><div class="activity-list">${saved.slice(0,12).map(x=>`<div class="activity-item"><div class="activity-icon">☑</div><div class="activity-details"><strong>${h(nameById('beneficiaries',x.beneficiary_id))}</strong><small>${h(nameById('activities',x.activity_id,'title'))}</small></div>${badge(x.status)}</div>`).join('')||'<p class="muted">Aún no se registra asistencia.</p>'}</div></section></div>`;
}
function renderReports(){const b=state.data.beneficiaries||[],don=state.data.donations||[],activity=state.data.activities||[],en=state.data.enrollments||[],att=state.data.attendance||[],p=state.data.programs||[];const active=b.filter(x=>x.status==='activo').length;const present=att.filter(x=>x.status==='presente').length;const rate=att.length?Math.round(100*present/att.length):0;const sum=don.filter(x=>x.method!=='especie').reduce((s,x)=>s+Number(x.amount||0),0);
 return `${titleArea('Informes y estadísticas','Consulta indicadores y descarga la información institucional.',`<button class="button primary" data-action="export-all">⇩ Descargar Excel (.xlsx)</button>`)}<div class="grid report-cards">${[['Beneficiarios registrados',b.length,'Expedientes'],['Beneficiarios activos',active,'Estado activo'],['Programas creados',p.length,'Incluye planificados'],['Inscripciones',en.length,'Vinculaciones'],['Asistencia',rate+'%','Presente entre registros'],['Aportes monetarios',money(sum),'No incluye especie']].map(([label,value,desc])=>`<div class="report-card"><span>${label}</span><strong>${value}</strong><span>${desc}</span></div>`).join('')}</div><div class="grid two-col"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Resumen por programa</h2><div class="panel-sub">Inscripciones activas por programa</div></div></div>${p.map(x=>{const count=en.filter(e=>e.program_id===x.id&&e.status==='activo').length;return `<div class="info-line"><strong>${h(x.name)}</strong><span>${count} inscritos ${x.capacity?`/ ${x.capacity} cupos`:''}</span></div>`}).join('')||'<p class="muted">No hay programas.</p>'}</section><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Actividad operativa</h2><div class="panel-sub">Indicadores de gestión</div></div></div>${[['Actividades realizadas',activity.filter(x=>x.status==='realizada').length],['Actividades programadas',activity.filter(x=>x.status==='programada').length],['Citas completadas',(state.data.appointments||[]).filter(x=>x.status==='completada').length],['Asistencias presentes',present],['Total de donaciones',don.length]].map(([label,value])=>`<div class="info-line"><strong>${label}</strong><span>${value}</span></div>`).join('')}</section></div><div class="panel" style="margin-top:18px"><div class="panel-heading"><div><h2 class="panel-title">Descarga por módulo</h2><div class="panel-sub">Archivos Excel (.xlsx) con columnas y formato</div></div></div><div class="quick-actions">${Object.keys(DEFINITIONS).filter(x=>x!=='profiles'&&x!=='documents').concat(['attendance']).map(x=>`<button class="button secondary" data-action="export" data-table="${x}">⇩ ${h(DEFINITIONS[x]?.title||'Asistencia')}</button>`).join('')}</div></div>`;
}
function renderSettings(){return `${titleArea('Configuración del sistema','Información de la plataforma y preferencias de seguridad.')}<div class="grid two-col"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Fundación</h2><div class="panel-sub">Datos del entorno de trabajo</div></div></div><div class="info-list">${[['Institución','Fundación ASOCULSOR'],['Sede','Centro Cuatro de Enero'],['Plataforma','Gestión institucional'],['Modo de trabajo',REAL?'Supabase (base de datos real)':'Demostración local'],['Usuario actual',state.profile.email],['Permisos',labelRole(role())]].map(([a,b])=>`<div class="info-line"><strong>${h(a)}</strong><span>${h(b)}</span></div>`).join('')}</div><div class="quick-actions"><button class="button secondary" data-action="logout">⇥ Cerrar sesión</button>${!REAL?'<button class="button danger-button" data-action="reset-demo">↺ Reiniciar datos demo</button>':''}</div></section><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Privacidad y acceso</h2><div class="panel-sub">Protección de información personal</div></div></div><div class="settings-note">El acceso real utiliza Supabase Auth, políticas RLS por rol y almacenamiento privado. Los documentos se consultan mediante enlaces temporales firmados. Las acciones críticas quedan protegidas por permisos en la base de datos.<hr class="section-divider">Antes de utilizar datos de personas reales, establece consentimiento, responsables de tratamiento, copias de seguridad y políticas de conservación, conforme a la normativa aplicable.</div></section></div>${role()!=='operador'?`<section class="panel" style="margin-top:18px"><div class="panel-heading"><div><h2 class="panel-title">Auditoría de cambios</h2><div class="panel-sub">Últimos movimientos en Supabase</div></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Fecha</th><th>Acción</th><th>Módulo</th><th>Usuario</th></tr></thead><tbody>${(state.data.audit_logs||[]).slice(0,20).map(x=>`<tr><td>${h(dateFmt(x.created_at,true))}</td><td>${h(x.action)}</td><td>${h(x.table_name)}</td><td>${h(nameById('profiles',x.actor_id,'full_name'))}</td></tr>`).join('')}</tbody></table>${(state.data.audit_logs||[]).length?'':'<div class="empty">No hay movimientos registrados todavía.</div>'}</div></section>`:''}`;}
function renderModal(){const {table,id}=state.modal;const def=DEFINITIONS[table];if(!def)return '';const row=id?byId(table,id):null;
 const fields=def.fields.map(f=>{const val=row?.[f.name]??(f.defaultToday?today():f.default??'');const required=f.required?'required':'';const lbl=`<label for="field-${f.name}">${h(f.label)}${f.required?' <i>*</i>':''}</label>`;let control='';
  if(f.type==='textarea')control=`<textarea id="field-${f.name}" name="${f.name}" placeholder="${h(f.placeholder||'Escribe los detalles...')}">${h(val)}</textarea>`;
  else if(f.type==='select'||f.type==='relation'){let options=[];if(f.type==='select')options=typeof f.options==='string'?OPTIONS[f.options]:f.options||[];else options=[['','— Sin asignar —'],...(state.data[f.table]||[]).map(x=>[x.id,f.table==='beneficiaries'?fullname(x):x.name||x.full_name||x.title||x.id])];control=`<select id="field-${f.name}" name="${f.name}" ${required}>${options.map(([value,label])=>`<option value="${h(value)}" ${String(value)===String(val)?'selected':''}>${h(label)}</option>`).join('')}</select>`}
  else{let final=val;if(f.type==='datetime-local'&&val){const d=new Date(val);if(!isNaN(d.getTime())){const z=n=>String(n).padStart(2,'0');final=`${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}else final=String(val).slice(0,16);}control=`<input id="field-${f.name}" type="${f.type}" name="${f.name}" value="${h(final)}" placeholder="${h(f.placeholder||'')}" ${required} ${f.min!==undefined?`min="${f.min}"`:''} ${f.step?`step="${f.step}"`:''} />`}
  return `<div class="field ${f.full?'full':''}">${lbl}${control}</div>`}).join('');
 const upload=table==='documents'&&!id?`<div class="field full"><label for="file-upload">Archivo (PDF, JPG, PNG o DOCX; máximo 10 MB) <i>*</i></label><input type="file" name="file" id="file-upload" accept=".pdf,.jpg,.jpeg,.png,.docx" required /></div>`:'';
 return `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-label="${h(def.title)}" ><div class="modal-header"><h2>${id?'Editar':'Nuevo'} ${h(def.singular)}</h2><button class="close" data-action="close-modal" aria-label="Cerrar">×</button></div><form data-form="record" data-table="${table}" data-id="${h(id||'')}"><div class="modal-body"><div class="form-grid">${fields}${upload}</div></div><div class="modal-footer"><button type="button" class="button secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button primary" ${state.busy?'disabled':''}>${state.busy?'Guardando...':'✓ Guardar registro'}</button></div></form></div></div>`;
}
function exportXlsx(table){
 const rows=state.data[table]||[];
 const def=DEFINITIONS[table];
 const attendanceLabels={activity_id:'Actividad',beneficiary_id:'Beneficiario',status:'Estado',notes:'Observaciones'};
 const orderBy={
  beneficiaries:['full_name'],programs:['name'],enrollments:['beneficiary_id','program_id'],
  activities:['starts_at'],appointments:['starts_at'],donations:['donated_at'],
  documents:['beneficiary_id','file_name'],attendance:['activity_id','beneficiary_id'],profiles:['full_name']
 }[table]||[];
 const sortedRows=rows.map((row,index)=>({row,index})).sort((a,b)=>{
  for(const key of orderBy){
   const valueFor=(entry)=>{
    const value=entry.row[key];
    if(key==='full_name')return fullname(entry.row);
    if(key==='beneficiary_id')return nameById('beneficiaries',value);
    if(key==='program_id')return nameById('programs',value);
    if(key==='activity_id')return nameById('activities',value,'title');
    return value;
   };
   const left=valueFor(a),right=valueFor(b);
   if(left==null||left===''){if(right!=null&&right!=='')return 1;continue}
   if(right==null||right==='')return -1;
   if(key.endsWith('_at')||key.endsWith('_date')){
    const leftTime=Date.parse(left),rightTime=Date.parse(right);
    if(Number.isFinite(leftTime)&&Number.isFinite(rightTime)&&leftTime!==rightTime)return leftTime-rightTime;
   }
   const compared=String(left).localeCompare(String(right),'es',{numeric:true,sensitivity:'base'});
   if(compared)return compared;
  }
  return a.index-b.index;
 }).map(entry=>entry.row);
 const columns=table==='attendance'
  ?Object.entries(attendanceLabels).map(([key,label])=>({key,label:key==='status'?'Estado de asistencia':label}))
  :(()=>{
   const labels=new Map(def?.cols||[]);
   for(const item of def?.fields||[])if(!labels.has(item.name))labels.set(item.name,item.label);
   if(labels.has('full_name')){labels.set('full_name','Nombre completo');labels.delete('first_name');labels.delete('last_name')}
   return [...labels].map(([key,label])=>({key,label}));
  })();
 const normalized=sortedRows.map(row=>columns.map(({key})=>{
  let value=key==='beneficiary_id'?nameById('beneficiaries',row[key])
   :key==='program_id'?nameById('programs',row[key])
   :key==='activity_id'?nameById('activities',row[key],'title')
   :key==='staff_id'?nameById('profiles',row[key],'full_name')
   :key==='full_name'&&table==='beneficiaries'?fullname(row)
   :key==='file_size'&&row[key]!=null&&row[key]!==''&&Number.isFinite(Number(row[key]))?Number(row[key])/1024
   :key==='active'?row[key]===true?'Habilitado':row[key]===false?'Bloqueado':row[key]
   :row[key];
  if(key==='file_size'&&typeof value==='number')value=Number(value.toFixed(1));
  if(value&&typeof value==='string'&&(/(_at|_date)$/.test(key)||key==='date_of_birth')){
   value=dateFmt(value,key==='starts_at'||key==='ends_at');
  }
  const field=def?.fields?.find(item=>item.name===key);
  const options=field&&typeof field.options==='string'?OPTIONS[field.options]:null;
  if(options&&value!=null)value=options.find(([option])=>option===String(value))?.[1]??value;
  if(table==='attendance'&&key==='status')value=OPTIONS.attendance.find(([option])=>option===String(value))?.[1]??value;
  return value??'';
 }));
 downloadXlsxFile({
  title:`ASOCULSOR | ${def?.title||'Asistencia'}`,
  subtitle:`Listado ordenado · Generado ${dateFmt(today())}`,
  columns:columns.map(({key,label})=>({key,label:key==='file_size'?'Tamaño (KB)':label})),
  rows:normalized,
  fileName:`ASOCULSOR_${table}_ordenado_${today()}.xlsx`,
  sheetName:(def?.title||'Asistencia').slice(0,31)
 });
  toast('Archivo Excel (.xlsx) descargado con formato y columnas ajustadas.');
}
function xlsxEscape(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')}
function xlsxBytes(parts){const result=new Uint8Array(parts.reduce((size,part)=>size+part.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length}return result}
function xlsxZip(entries){
 const encoder=new TextEncoder(),files=[],central=[];let offset=0;
 const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0};
 const clock=new Date(),dosTime=(clock.getHours()<<11)|(clock.getMinutes()<<5)|Math.floor(clock.getSeconds()/2),dosDate=((clock.getFullYear()-1980)<<9)|((clock.getMonth()+1)<<5)|clock.getDate();
 for(const [name,content] of entries){
  const nameBytes=encoder.encode(name),data=encoder.encode(content),crc=crc32(data),local=new Uint8Array(30+nameBytes.length),localView=new DataView(local.buffer);
  localView.setUint32(0,0x04034b50,true);localView.setUint16(4,20,true);localView.setUint16(6,0x0800,true);localView.setUint16(8,0,true);localView.setUint16(10,dosTime,true);localView.setUint16(12,dosDate,true);localView.setUint32(14,crc,true);localView.setUint32(18,data.length,true);localView.setUint32(22,data.length,true);localView.setUint16(26,nameBytes.length,true);local.set(nameBytes,30);
  files.push(local,data);
  const directory=new Uint8Array(46+nameBytes.length),directoryView=new DataView(directory.buffer);
  directoryView.setUint32(0,0x02014b50,true);directoryView.setUint16(4,20,true);directoryView.setUint16(6,20,true);directoryView.setUint16(8,0x0800,true);directoryView.setUint16(10,0,true);directoryView.setUint16(12,dosTime,true);directoryView.setUint16(14,dosDate,true);directoryView.setUint32(16,crc,true);directoryView.setUint32(20,data.length,true);directoryView.setUint32(24,data.length,true);directoryView.setUint16(28,nameBytes.length,true);directoryView.setUint32(42,offset,true);directory.set(nameBytes,46);central.push(directory);offset+=local.length+data.length;
 }
 const directoryBytes=xlsxBytes(central),end=new Uint8Array(22),endView=new DataView(end.buffer);
 endView.setUint32(0,0x06054b50,true);endView.setUint16(8,entries.length,true);endView.setUint16(10,entries.length,true);endView.setUint32(12,directoryBytes.length,true);endView.setUint32(16,offset,true);
 return xlsxBytes([...files,directoryBytes,end]);
}
function excelColumnName(index){let name='';for(index++;index;index=Math.floor((index-1)/26))name=String.fromCharCode(65+(index-1)%26)+name;return name}
function downloadXlsxFile({title,subtitle,columns,rows,fileName,sheetName='Datos'}){
 const columnCount=Math.max(1,columns.length),lastColumn=excelColumnName(columnCount-1),lastRow=rows.length+4;
 const cellXml=(reference,value,style)=>{
  const cell=value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,'value')?value:{value};
  const cellStyle=cell.currency?(style===5?6:9):style;
  if(typeof cell.value==='number'&&Number.isFinite(cell.value))return `<c r="${reference}" s="${cellStyle}" t="n"><v>${cell.value}</v></c>`;
  const text=xlsxEscape(cell.value);
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
 };
 const headerCells=columns.map((column,index)=>cellXml(`${excelColumnName(index)}4`,column.label,3)).join('');
 const dataRows=rows.map((row,index)=>{
  const rowNumber=index+5,striped=rowNumber%2===1;
  const cells=columns.map((column,columnIndex)=>{
   const value=row[columnIndex]??'';
   const style=typeof value==='number'?(column.key==='amount'?(striped?6:9):(striped?5:8)):(striped?4:7);
   return cellXml(`${excelColumnName(columnIndex)}${rowNumber}`,value,style);
  }).join('');
  return `<row r="${rowNumber}" ht="23" customHeight="1">${cells}</row>`;
 }).join('');
 const widths=columns.map((column,index)=>{
  const maxLength=rows.reduce((longest,row)=>{
   const value=row[index]&&typeof row[index]==='object'&&'value'in row[index]?row[index].value:row[index];
   return Math.max(longest,String(value??'').length);
  },String(column.label||'').length);
  return `<col min="${index+1}" max="${index+1}" width="${Math.min(48,Math.max(14,maxLength+2))}" customWidth="1"/>`;
 }).join('');
 const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData><row r="1" ht="36" customHeight="1">${cellXml('A1',title,1)}</row><row r="2" ht="24" customHeight="1">${cellXml('A2',subtitle,2)}</row><row r="3"/><row r="4" ht="27" customHeight="1">${headerCells}</row>${dataRows}</sheetData><autoFilter ref="A4:${lastColumn}${lastRow}"/><mergeCells count="2"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="4"><font><sz val="10"/><name val="Aptos"/><color rgb="FF243447"/></font><font><b/><sz val="18"/><name val="Aptos Display"/><color rgb="FFFFFFFF"/></font><font><i/><sz val="10"/><name val="Aptos"/><color rgb="FF65758B"/></font><font><b/><sz val="10"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF153149"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF147D78"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F7F7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE0E8EC"/></left><right style="thin"><color rgb="FFE0E8EC"/></right><top/><bottom style="thin"><color rgb="FFE0E8EC"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="3" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
 const safeSheetName=sheetName.replace(/[\\/?*:\[\]]/g,' ').slice(0,31)||'Datos';
 const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+xlsxEscape(safeSheetName)+'" sheetId="1" r:id="rId1"/></sheets></workbook>';
 const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
 const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 const workbookRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
 const file=xlsxZip([['[Content_Types].xml',types],['_rels/.rels',rootRels],['xl/workbook.xml',workbook],['xl/_rels/workbook.xml.rels',workbookRels],['xl/styles.xml',styles],['xl/worksheets/sheet1.xml',sheet]]);
 const url=URL.createObjectURL(new Blob([file],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const link=document.createElement('a');link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function downloadReportLegacy(){
 const b=state.data.beneficiaries||[],p=state.data.programs||[],e=state.data.enrollments||[],a=state.data.activities||[],t=state.data.appointments||[],at=state.data.attendance||[],don=state.data.donations||[];
 const items=[
  ['Beneficiarios registrados',b.length],['Beneficiarios activos',b.filter(x=>x.status==='activo').length],
  ['Programas registrados',p.length],['Programas activos',p.filter(x=>x.status==='activo').length],
  ['Inscripciones',e.length],['Actividades',a.length],['Citas',t.length],
  ['Asistencias presentes',at.filter(x=>x.status==='presente').length],
  ['Aportes monetarios (USD)',don.filter(x=>x.method!=='especie').reduce((sum,x)=>sum+Number(x.amount||0),0)]
 ];
 const lastRow=items.length+4;
 const sheetRows=[
  '<row r="1" ht="34" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>ASOCULSOR | Reporte institucional</t></is></c></row>',
  `<row r="2" ht="23" customHeight="1"><c r="A2" s="2" t="inlineStr"><is><t>Resumen de indicadores · Generado ${xlsxEscape(dateFmt(today()))}</t></is></c></row>`,
  '<row r="3"/>',
  '<row r="4" ht="25" customHeight="1"><c r="A4" s="3" t="inlineStr"><is><t>Indicador</t></is></c><c r="B4" s="3" t="inlineStr"><is><t>Valor</t></is></c></row>',
  ...items.map(([label,value],index)=>{
   const row=index+5,style=row%2===1?4:7;
   const numberStyle=Number.isInteger(value)?(row%2===1?5:8):(row%2===1?6:9);
   return `<row r="${row}" ht="22" customHeight="1"><c r="A${row}" s="${style}" t="inlineStr"><is><t>${xlsxEscape(label)}</t></is></c><c r="B${row}" s="${numberStyle}" t="n"><v>${Number(value)}</v></c></row>`;
  })
 ].join('');
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="4"><font><sz val="10"/><name val="Aptos"/><color rgb="FF243447"/></font><font><b/><sz val="18"/><name val="Aptos Display"/><color rgb="FFFFFFFF"/></font><font><i/><sz val="10"/><name val="Aptos"/><color rgb="FF65758B"/></font><font><b/><sz val="10"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF153149"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF147D78"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F7F7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE0E8EC"/></left><right style="thin"><color rgb="FFE0E8EC"/></right><top/><bottom style="thin"><color rgb="FFE0E8EC"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="3" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
 const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:B${lastRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="42" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A4:B${lastRow}"/><mergeCells count="2"><mergeCell ref="A1:B1"/><mergeCell ref="A2:B2"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
 const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/></sheets></workbook>';
 const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
 const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 const workbookRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
 const file=xlsxZip([['[Content_Types].xml',types],['_rels/.rels',rootRels],['xl/workbook.xml',workbook],['xl/_rels/workbook.xml.rels',workbookRels],['xl/styles.xml',styles],['xl/worksheets/sheet1.xml',sheet]]);
 const url=URL.createObjectURL(new Blob([file],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const link=document.createElement('a');link.href=url;link.download=`ASOCULSOR_Reporte_${today()}.xlsx`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 toast('Reporte Excel (.xlsx) descargado con columnas y formato listos.');
}
function downloadReport(){
 const b=state.data.beneficiaries||[],p=state.data.programs||[],e=state.data.enrollments||[],a=state.data.activities||[],t=state.data.appointments||[],at=state.data.attendance||[],don=state.data.donations||[];
 const items=[
  ['Beneficiarios registrados',b.length],['Beneficiarios activos',b.filter(x=>x.status==='activo').length],
  ['Programas registrados',p.length],['Programas activos',p.filter(x=>x.status==='activo').length],
  ['Inscripciones',e.length],['Actividades',a.length],['Citas',t.length],
  ['Asistencias presentes',at.filter(x=>x.status==='presente').length],
  ['Aportes monetarios (USD)',{value:don.filter(x=>x.method!=='especie').reduce((sum,x)=>sum+Number(x.amount||0),0),currency:true}]
 ];
 downloadXlsxFile({
  title:'ASOCULSOR | Reporte institucional',
  subtitle:`Resumen de indicadores · Generado ${dateFmt(today())}`,
  columns:[{key:'indicator',label:'Indicador'},{key:'value',label:'Valor'}],
  rows:items,
  fileName:`ASOCULSOR_Reporte_${today()}.xlsx`,
  sheetName:'Resumen'
 });
 toast('Reporte Excel (.xlsx) descargado con formato listo.');
}
async function reloadOne(table){state.data[table]=await fetchTable(table);if(table==='profiles'&&REAL){await loadProfile();}}
function resetNavigation(page){state.page=page;state.search='';state.filter='';state.sidebar=false;state.modal=null;render()}
async function exit(){if(REAL&&state.session){try{await request('/auth/v1/logout',{method:'POST'})}catch{}}sessionClear();safeRemove('asoculsor_demo_signed');state.session=null;state.profile=null;state.modal=null;state.recovery=false;state.authMode='login';state.page='dashboard';state.data={};state.search='';state.sidebar=false;render();}
function fallbackDemo(){state.session={user:{id:'demo-admin',email:'admin@asoculsor.demo'},access_token:'demo',refresh_token:'demo'};safeSet('asoculsor_demo_signed','true');state.data=demoDB();state.profile=demoDB().profiles.find(x=>x.id==='demo-admin')||demoDB().profiles[0];state.authMode='login';state.loading=false;render();}
async function handleClick(e){const target=e.target.closest('[data-page],[data-auth],[data-action]');if(!target)return;
 if(target.classList.contains('modal-backdrop')&&e.target!==target)return;const {page,auth,action,table,id}=target.dataset;
 if(page){if(role()==='operador'&&['donations','documents','reports','profiles'].includes(page))return;resetNavigation(page);return}if(auth){state.authMode=auth;state.recovery=false;render();return}
 if(action==='close-modal'){state.modal=null;render();return}
 if(action==='toggle-sidebar'){state.sidebar=!state.sidebar;render();return}
 if(action==='close-sidebar'){state.sidebar=false;render();return}
 if(action==='demo-login' && DEMO){fallbackDemo();return}
 if(action==='logout'){await exit();return}
 if(action==='open-create'||action==='open-edit'){
  if(!canEdit(table)&&!(table==='profiles'&&isAdmin())){toast('No tienes permisos para editar este módulo.',true);return}
  state.modal={table,id:action==='open-edit'?id:null};render();return;
 }
 if(action==='delete'){if(!canDelete(table)){toast('No tienes permisos para eliminar.',true);return}const entity=byId(table,id);if(!entity)return;
  const label=table==='beneficiaries'?fullname(entity):entity.name||entity.title||entity.file_name||entity.donor_name||entity.id;
  if(!confirm(`¿Eliminar definitivamente «${label}»? Esta operación puede afectar registros relacionados y no se puede deshacer.`))return;
  try{if(table==='documents'){await destroy(table,id);try{await removeStoredFile(entity.file_path)}catch{toast('Registro eliminado, pero revisa el archivo en Storage.',true)}}else await destroy(table,id);await Promise.all(Object.keys(state.data).map(k=>reloadOne(k)));render();toast('Registro eliminado.')}catch(error){toast(error.message,true)}return;
 }
 if(action==='refresh'){try{state.loading=true;render();await loadData();state.loading=false;render();toast('Información actualizada.')}catch(error){state.loading=false;render();toast(error.message,true)}return}
 if(action==='view-file'){try{await openDoc(byId('documents',id))}catch(err){toast(err.message,true)}return}
 if(action==='export'){if(role()==='operador'&&['documents','donations','profiles','audit_logs'].includes(table))return;exportXlsx(table);return}if(action==='export-all'){if(role()==='operador')return;downloadReport();return}
 if(action==='save-attendance'){const act=byId('activities',state.attendanceActivity);if(!act){toast('Selecciona una actividad.',true);return}const programId=act.program_id;const list=(state.data.beneficiaries||[]).filter(x=>x.status==='activo'&&(!programId||(state.data.enrollments||[]).some(y=>y.program_id===programId&&y.beneficiary_id===x.id&&y.status==='activo')));if(!list.length)return;
  try{const entries=list.map(b=>({activity_id:act.id,beneficiary_id:b.id,status:state.attendanceDraft[b.id]||(state.data.attendance||[]).find(x=>x.beneficiary_id===b.id&&x.activity_id===act.id)?.status||'presente',recorded_by:state.profile.id}));await bulkAttendance(entries);state.attendanceDraft={};await reloadOne('attendance');render();toast(`${entries.length} registros de asistencia guardados.`)}catch(error){toast(error.message,true)}return;
 }
 if(action==='reset-demo'){if(REAL)return;if(!confirm('¿Borrar todos los cambios del entorno de demostración y restaurar los datos ficticios?'))return;tmpStore=demoSeed();saveDemo();state.data=tmpStore;state.profile=tmpStore.profiles[0];render();toast('Demostración restaurada.');return}
}
async function handleSubmit(e){const form=e.target;if(!form.matches('[data-form]'))return;e.preventDefault();if(state.busy)return;const formData=new FormData(form);state.busy=true;const submit=form.querySelector('[type="submit"]');if(submit){submit.disabled=true;submit.textContent='Procesando...'};
 try{
  if(form.dataset.form==='auth'){
   const mode=state.recovery?'change':state.authMode;const email=String(formData.get('email')||'').trim();const pass=String(formData.get('password')||'');
   if(!REAL){if(mode==='login'){fallbackDemo();toast('Has ingresado a la demostración.');return}throw Error('Para cuentas y recuperación reales, primero conecta Supabase.');}
   if(mode==='login'){await login(email,pass);if(!state.profile?.active){await exit();throw Error('Tu cuenta existe, pero aún debe ser habilitada por un administrador.')}await loadData();state.authMode='login';render();toast('Sesión iniciada correctamente.');}
   else if(mode==='register'){if(pass.length<12)throw Error('Usa una contraseña de al menos 12 caracteres.');await register(String(formData.get('full_name')||'').trim(),email,pass);state.authMode='login';render();toast('Solicitud enviada. Confirma tu correo si es necesario y espera la habilitación del administrador.');}
   else if(mode==='forgot'){await recovery(email);state.authMode='login';render();toast('Si el correo está registrado, recibirás instrucciones de recuperación.');}
   else if(mode==='change'){if(pass.length<12)throw Error('La contraseña debe tener mínimo 12 caracteres.');await setPassword(pass);state.session.user=await request('/auth/v1/user');sessionSave(state.session);state.recovery=false;window.history.replaceState({},'',location.pathname);await loadProfile();if(state.profile?.active){await loadData()}else{await exit();throw Error('Contraseña actualizada. El administrador debe habilitar tu acceso.')}render();toast('Contraseña actualizada.');}
  }else if(form.dataset.form==='record'){
   const table=form.dataset.table,id=form.dataset.id||null;const spec=DEFINITIONS[table];if(!canEdit(table)&&!(table==='profiles'&&isAdmin()))throw Error('No tienes autorización.');
   const payload={};for(const f of spec.fields){let val=String(formData.get(f.name)??'').trim();if(['number'].includes(f.type)){payload[f.name]=val===''?null:Number(val)}else if(f.name==='active'){payload.active=val==='true'}else if(f.type==='datetime-local'){payload[f.name]=val?new Date(val).toISOString():null}else{payload[f.name]=val===''?null:val}}
   if(table==='profiles'&&id===state.profile.id&&(payload.active===false||payload.role!=='admin'))throw Error('No puedes deshabilitar tu propia cuenta administradora.');
   if(table==='enrollments'&&id===null){const ex=(state.data.enrollments||[]).find(x=>x.beneficiary_id===payload.beneficiary_id&&x.program_id===payload.program_id);if(ex)throw Error('El beneficiario ya tiene una inscripción en este programa.');}
   if(['appointments','activities'].includes(table)&&payload.starts_at&&payload.ends_at&&new Date(payload.ends_at)<new Date(payload.starts_at))throw Error('La fecha de finalización no puede ser anterior al inicio.');
   if(table==='programs'&&payload.start_date&&payload.end_date&&payload.end_date<payload.start_date)throw Error('La fecha final no puede ser anterior a la inicial.');
   if(table==='documents'&&!id){const file=formData.get('file');await uploadDoc(file,payload)}else await mutate(table,payload,id);
   state.modal=null;state.busy=false;state.loading=true;render();await loadData();if(table==='profiles')await loadProfile();state.loading=false;render();toast(id?'Registro actualizado correctamente.':'Registro creado correctamente.');
  }
 }catch(error){state.loading=false;render();toast(error.message||'Ocurrió un error al guardar.',true)}finally{state.busy=false;const el=$('form[data-form] [type="submit"]');if(el)el.disabled=false;}
}
async function boot(){
 document.addEventListener('click',handleClick);document.addEventListener('submit',handleSubmit);
 document.addEventListener('change',(e)=>{if(e.target.id==='attendance-activity'){state.attendanceActivity=e.target.value;state.attendanceDraft={};render()}if(e.target.dataset.attendPerson){state.attendanceDraft[e.target.dataset.attendPerson]=e.target.value}});
 document.addEventListener('input',(e)=>{if(e.target.id==='table-search'){state.search=e.target.value;const pos=e.target.selectionStart;render();const input=$('#table-search');if(input){input.focus();try{input.setSelectionRange(pos,pos)}catch{}}}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.modal){state.modal=null;render()}});
 if(!REAL){if(DEMO&&safeGet('asoculsor_demo_signed')==='true'){fallbackDemo()}else{state.loading=false;render()}return}
 try{
  const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('access_token')&&hash.get('refresh_token')){state.session={access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),user:null};sessionSave(state.session);window.history.replaceState({},'',location.pathname+location.search);if(hash.get('type')==='recovery'||hash.get('type')==='invite'){state.recovery=true;state.loading=false;render();return}}
  const stored=sessionGet();if(stored){state.session=JSON.parse(stored);try{const me=await request('/auth/v1/user');state.session.user=me;sessionSave(state.session);await loadProfile();if(!state.profile?.active){state.profile=null;state.session=null;sessionClear()}else await loadData()}catch(err){if(state.session?.refresh_token){try{await refreshSession();const me=await request('/auth/v1/user');state.session.user=me;await loadProfile();if(!state.profile?.active){state.profile=null;state.session=null;sessionClear()}else await loadData()}catch{state.profile=null;state.session=null;sessionClear()}}}}
 }catch(err){state.profile=null;state.session=null;sessionClear();toast(err.message,true)}
 state.loading=false;render();
}
boot();
})();
