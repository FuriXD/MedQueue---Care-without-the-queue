const seedPatients = [
  {name:'Nisha S.', initials:'NS', token:'Q-1048', service:'General medicine', priority:'high', wait:18, stage:'Registration', age:0},
  {name:'Ravi Kumar', initials:'RK', token:'Q-1049', service:'Cardiology', priority:'urgent', wait:6, stage:'Consultation', age:0},
  {name:'Meera Rao', initials:'MR', token:'Q-1050', service:'Orthopaedics', priority:'appointment', wait:12, stage:'Registration', age:0},
  {name:'Ananya P.', initials:'AP', token:'Q-1051', service:'Laboratory', priority:'high', wait:21, stage:'Lab testing', age:0},
  {name:'Dev S.', initials:'DS', token:'Q-1052', service:'General medicine', priority:'routine', wait:28, stage:'Registration', age:0},
  {name:'Kiran M.', initials:'KM', token:'Q-1053', service:'Dermatology', priority:'appointment', wait:31, stage:'Registration', age:0},
  {name:'Fatima A.', initials:'FA', token:'Q-1054', service:'Laboratory', priority:'routine', wait:37, stage:'Lab testing', age:0},
  {name:'Joel Thomas', initials:'JT', token:'Q-1055', service:'Pharmacy', priority:'routine', wait:41, stage:'Prescription', age:0},
  {name:'Sahana R.', initials:'SR', token:'Q-1056', service:'Cardiology', priority:'high', wait:44, stage:'Consultation', age:0},
  {name:'Imran K.', initials:'IK', token:'Q-1057', service:'Orthopaedics', priority:'routine', wait:49, stage:'Registration', age:0},
  {name:'Lakshmi N.', initials:'LN', token:'Q-1058', service:'General medicine', priority:'routine', wait:53, stage:'Registration', age:0},
  {name:'Aarav P.', initials:'AP', token:'Q-1059', service:'Dermatology', priority:'routine', wait:58, stage:'Registration', age:0}
];
function readLocal(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch{return fallback}}
let patients = readLocal('queueless-patients',null)||seedPatients.map(p=>({...p, misses:0, status:'waiting'}));
let calledPatient = patients.find(p=>p.status==='called')||null;
let selectedRole = 'patient';
let currentUser = readLocal('queueless-profile-patient',null)||{name:'Nisha S.',email:'',phone:'',token:null,role:null};
let applyingRemoteQueue=false;
let currentFilter = 'all';
let visibleLimit = 5;
let tokenSequence = 1060;
let graceSeconds = 300;
let graceInterval = null;
let toastTimeout = null;
let nextPosition = 13;
let idleStart = Date.now();
let idleAlertShown = false;
let nextGraceBonus = 0;
let lastPositions = new Map();

const $ = (id)=>document.getElementById(id);
const escapeHtml = (value)=>String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const priorities = {urgent:4, high:3, appointment:2, routine:1};
const prettyPriority = {urgent:'Urgent',high:'High',appointment:'Booked',routine:'Routine'};
const avatarColors = ['#f0e8da/#8a7358','#e4edf0/#5d8290','#efe3e9/#946e83','#e7eee2/#71825e','#ede8de/#8d7953','#e9e3f0/#83739d'];
const capacities = [
  {name:'Dermatology',pct:62}, {name:'Orthopaedics',pct:78}, {name:'Cardiology',pct:94}, {name:'Laboratory',pct:108}, {name:'Pharmacy',pct:71}
];
const doctorRoster=[{name:'Dr Meera Rao',service:'General medicine',mins:8},{name:'Dr Arjun Shetty',service:'Cardiology',mins:12},{name:'Dr Kavya Nair',service:'Orthopaedics',mins:10},{name:'Dr Farah Ali',service:'Dermatology',mins:7},{name:'Dr Vikram Bhat',service:'Laboratory',mins:5}];
const holidayCalendar={2026:[[new Date(2026,9,20),'Ayudhapooja'],[new Date(2026,9,21),'Vijayadashami'],[new Date(2026,10,10),'Balipadyami'],[new Date(2026,10,27),'Kanakadasa Jayanthi'],[new Date(2026,11,25),'Christmas']]};
const updateChannel = typeof BroadcastChannel!=='undefined'?new BroadcastChannel('queueless-live-queue'):null;

function persistPatients(){
  if(applyingRemoteQueue)return;
  try{localStorage.setItem('queueless-patients',JSON.stringify(patients))}catch{}
  if(updateChannel)updateChannel.postMessage({type:'queue-update',patients});
}
function profileFor(role){return readLocal(`queueless-profile-${role}`,role==='staff'?{name:'Ariz Rahman',email:'',phone:'',token:null}:{name:'Nisha S.',email:'',phone:'',token:null})}
function persistProfile(){try{localStorage.setItem(`queueless-profile-${currentUser.role||'patient'}`,JSON.stringify(currentUser))}catch{}}
function newToken(){const max=patients.reduce((n,p)=>Math.max(n,Number(String(p.token).replace(/\D/g,''))||0),0);tokenSequence=Math.max(tokenSequence,max+1);return `Q-${tokenSequence++}`}
function receiveQueue(nextPatients){
  applyingRemoteQueue=true;patients=nextPatients;calledPatient=patients.find(p=>p.status==='called')||null;
  if(calledPatient){idleStart=calledPatient.calledAt||Date.now();$('call-hint').classList.add('hidden');$('called-banner').classList.remove('hidden');startGraceCountdown()}
  else{clearInterval(graceInterval);$('call-hint').classList.remove('hidden');$('called-banner').classList.add('hidden')}
  renderQueue();refreshWaits();renderPatientPortal();applyingRemoteQueue=false;
}

function orderedPatients(){
  return patients.filter(p=>p.status==='waiting').sort((a,b)=>{
    const diff=priorityScore(b)-priorityScore(a);
    return diff || a.age-b.age || a.token.localeCompare(b.token);
  });
}
// Demonstration weights reflect the presentation's hybrid priority model.
function priorityScore(p){
  const urgency={urgent:100,high:70,appointment:35,routine:15}[p.priority]||15;
  const ageRisk=p.ageRisk||0, appointment=p.priority==='appointment'?100:0, waiting=Math.min(p.wait,60)/60*100;
  return urgency*.4+ageRisk*.25+appointment*.2+waiting*.15;
}
function capacityClass(pct){return pct>=100?'critical':pct>=85?'moderate':'low'}
function updateDates(){const now=new Date();$('top-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'short',month:'short',day:'numeric'}).format(now).toUpperCase();$('staff-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(now).toUpperCase();const next=(holidayCalendar[now.getFullYear()]||[]).find(([date])=>date>=new Date(now.getFullYear(),now.getMonth(),now.getDate())&&date<=new Date(now.getFullYear(),now.getMonth(),now.getDate()+14));const note=$('holiday-note');if(note){note.classList.toggle('hidden',!next);if(next)note.textContent=`Upcoming Karnataka public holiday: ${next[1]} · ${new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short'}).format(next[0])}. Clinic hours may change; please confirm with the care centre.`}}
function patientsForService(service){return orderedPatients().filter(p=>p.service===service)}
function serviceWait(patient){if(!patient)return 0;const list=patientsForService(patient.service);const index=list.findIndex(p=>p.token===patient.token);const mins=doctorRoster.find(d=>d.service===patient.service)?.mins||8;return Math.max(0,index)*mins}
function renderDoctorQueues(){const target=$('doctor-queues');if(!target)return;$('doctor-count').textContent=`${doctorRoster.length} doctors`;target.innerHTML=doctorRoster.map(d=>{const n=patientsForService(d.service).length;return `<div class="doctor-row"><span><b>${escapeHtml(d.name)}</b><small>${escapeHtml(d.service)}</small></span><span class="doctor-queue-count">${n} waiting · ~${n*d.mins} min</span></div>`}).join('')}
function renderHistory(){const target=$('visit-history');if(!target)return;const history=readLocal(`queueless-history-${currentUser.name||''}`,[]);target.innerHTML=history.length?history.slice(0,5).map(v=>`<div class="history-row"><b>${escapeHtml(v.doctor)}</b><span>${escapeHtml(v.service)} · ${escapeHtml(v.condition||'Visit')}</span><small>${escapeHtml(v.date)}</small></div>`).join(''):'<p class="history-empty">Completed visits will appear here.</p>'}
function renderCapacity(){
  $('capacity-list').innerHTML=capacities.map(c=>`<div class="capacity-row ${capacityClass(c.pct)}"><span class="capacity-name">${c.name}</span><span class="capacity-percent">${c.pct}%</span><div class="capacity-track"><span style="width:${Math.min(c.pct,100)}%"></span></div></div>`).join('');
}
function renderQueue(){
  const ordered=orderedPatients();renderDoctorQueues();updateDates();
  let shown=ordered.filter((p,i)=>currentFilter==='all'||(currentFilter==='high'?['urgent','high'].includes(p.priority):p.priority==='routine'));
  const filteredTotal=shown.length;
  shown=shown.slice(0,visibleLimit);
  $('queue-body').innerHTML=shown.map((p)=>{
    const color=avatarColors[parseInt(p.token.slice(2),10)%avatarColors.length].split('/');
    let status=p.status==='called'?'<span class="queue-status called">Called now</span>':p.misses?`<span class="queue-status">Missed call · ${p.misses}/3</span>`:'<span class="queue-status">Waiting</span>';
    return `<tr><td><div class="patient-cell"><span class="avatar" style="background:${color[0]};color:${color[1]}">${escapeHtml(p.initials)}</span><span><span class="patient-name">${escapeHtml(p.name)}</span><span class="patient-token">${p.token}</span></span></div></td><td><span class="service-name">${escapeHtml(p.service)}</span></td><td><span class="priority-tag ${p.priority}">${prettyPriority[p.priority]}</span></td><td><span class="wait-time">~${Math.max(3,p.wait)} min</span></td><td>${status}</td><td><button class="row-menu" data-token="${p.token}" aria-label="Actions for ${escapeHtml(p.name)}">···</button></td></tr>`;
  }).join('')||'<tr><td colspan="6" class="empty-row">No patients match this filter yet.</td></tr>';
  $('waiting-total').innerHTML=`${ordered.length}<span class="metric-unit"> patients</span>`;
  $('nav-count').textContent=ordered.length;
  $('total-count').textContent=filteredTotal;
  $('showing-count').textContent=shown.length;
  $('load-more').style.display=shown.length<filteredTotal?'':'none';
  updateNext(ordered);
  persistPatients();
  renderPatientPortal();
}
function updateNext(ordered=orderedPatients()){
  if(calledPatient){
    $('next-name').textContent=calledPatient.name;$('next-service').textContent=`${calledPatient.service} · Called`;$('next-token').textContent=calledPatient.token;$('next-wait').textContent=`${calledPatient.wait} min`;$('next-stage').textContent=calledPatient.stage;$('next-priority').style.display='';$('next-priority').className=`priority-tag ${calledPatient.priority}`;$('next-priority').textContent=prettyPriority[calledPatient.priority];$('call-next').disabled=true;$('call-next').innerHTML='<span>◷</span> Active call in progress';return;
  }
  const next=ordered[0];
  if(!next){$('next-name').textContent='Queue is clear';$('next-service').textContent='Ready for the next arrival';$('next-token').textContent='—';$('next-wait').textContent='—';$('next-stage').textContent='—';$('next-priority').style.display='none';$('call-next').disabled=true;$('call-next').textContent='Queue is clear';return}
  $('next-priority').style.display='';$('call-next').disabled=false;$('call-next').innerHTML='<span>↗</span> Call next patient';
  $('next-name').textContent=next.name;$('next-service').textContent=next.service;$('next-token').textContent=next.token;$('next-wait').textContent=`${next.wait} min`;$('next-stage').textContent=next.stage;$('next-priority').className=`priority-tag ${next.priority}`;$('next-priority').textContent=prettyPriority[next.priority];
}
function showToast(message){const toast=$('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.classList.remove('show'),3200)}
function openInfo(title,copy,kicker='QUEUELESS',details=[]){$('info-title').textContent=title;$('info-copy').textContent=copy;$('info-kicker').textContent=kicker;$('info-details').innerHTML=details.map(([a,b])=>`<div class="info-detail"><span>${a}</span><b>${b}</b></div>`).join('');$('info-modal').showModal()}
function startGraceCountdown(){
  clearInterval(graceInterval);
  const update=()=>{graceSeconds=Math.max(0,Math.ceil(((calledPatient?.graceUntil||Date.now())-Date.now())/1000));const m=String(Math.floor(graceSeconds/60)).padStart(2,'0'),s=String(graceSeconds%60).padStart(2,'0');$('grace-countdown').textContent=`${m}:${s}`;if(graceSeconds===0){clearInterval(graceInterval);showToast('Grace period ended. Mark the call as arrived or no-show.')}};
  update();if(graceSeconds>0)graceInterval=setInterval(update,1000);
}
function callNext(){
  if(calledPatient){showToast('Finish the active call before calling another patient.');return}
  const next=orderedPatients()[0];if(!next)return;
  calledPatient=next;next.status='called';idleStart=Date.now();next.calledAt=idleStart;idleAlertShown=false;graceSeconds=300+nextGraceBonus;next.graceUntil=Date.now()+graceSeconds*1000;nextGraceBonus=0;
  $('call-hint').classList.add('hidden');$('called-banner').classList.remove('hidden');notifyPatient(next,`Your token ${next.token} is called. Please approach the ${next.service} counter now.`);renderQueue();startGraceCountdown();showToast(`${next.name} has been called. Their arrival window has started.`);
}
function clearCalled(){clearInterval(graceInterval);calledPatient=null;$('called-banner').classList.add('hidden');$('call-hint').classList.remove('hidden');idleStart=Date.now();idleAlertShown=false;renderQueue()}
function statusArrived(){if(!calledPatient)return;const done=calledPatient;done.status='served';done.servedAt=new Date().toISOString();const history=readLocal(`queueless-history-${done.name}`,[]);history.unshift({date:new Intl.DateTimeFormat('en-IN',{dateStyle:'medium'}).format(new Date()),doctor:doctorRoster.find(d=>d.service===done.service)?.name||'Care team',service:done.service,condition:done.condition||'Visit',token:done.token});try{localStorage.setItem(`queueless-history-${done.name}`,JSON.stringify(history))}catch{}clearCalled();showToast(`${done.name} visit finished. Call the next patient when ready.`);renderHistory()}
function statusMissed(){if(!calledPatient)return;const patient=calledPatient;patient.misses++;if(patient.misses>=3){patient.status='cancelled';clearCalled();showToast(`${patient.name} cancelled after 3 missed calls. They may rejoin the queue.`);return}patient.status='waiting';patient.age+=4;patient.wait=Math.max(patient.wait,12);nextGraceBonus=180;const old=orderedPatients().indexOf(patient);const arr=orderedPatients().filter(p=>p!==patient);arr.splice(Math.min(arr.length,old+3),0,patient);arr.forEach((p,i)=>p.age=i);clearCalled();showToast(`${patient.name} moved back 3 places. The next patient gets a 3-minute grace extension.`)}
function refreshWaits(){const list=orderedPatients();list.forEach(p=>{const serviceList=list.filter(x=>x.service===p.service);const serviceIndex=serviceList.findIndex(x=>x.token===p.token);const before=lastPositions.get(p.token);p.wait=Math.max(0,serviceIndex)*(doctorRoster.find(d=>d.service===p.service)?.mins||8);if(serviceIndex===4&&before>5)notifyPatient(p,`You are 5th in the ${p.service} queue. Please begin moving toward the service area.`);lastPositions.set(p.token,serviceIndex+1)});const activeTokens=new Set(list.map(p=>p.token));for(const token of lastPositions.keys())if(!activeTokens.has(token))lastPositions.delete(token);const avg=list.length?Math.round(list.reduce((s,p)=>s+p.wait,0)/list.length):0;$('average-wait').innerHTML=`${avg}<span class="metric-unit"> min</span>`}
function initialsFor(name){return String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()||'').join('')||'P'}
function updateIdentity(){
  const name=currentUser.name||'QueueLess user';
  $('sidebar-name').textContent=name;$('sidebar-avatar').textContent=initialsFor(name);$('sidebar-role').textContent=currentUser.role==='staff'?'Queue administrator':'Patient account';
  $('switch-view').textContent=currentUser.role==='patient'?'Switch account':'Switch view';
  $('staff-content').classList.toggle('hidden',currentUser.role==='patient');$('patient-dashboard').classList.toggle('hidden',currentUser.role!=='patient');
  $('app-shell').classList.toggle('patient-mode',currentUser.role==='patient');
  document.querySelector('.nav-list').classList.toggle('hidden',currentUser.role==='patient');
  document.querySelector('.workspace-label').textContent=currentUser.role==='patient'?'YOUR ACCOUNT':'WORKSPACE';
  $('crumb-title').textContent=currentUser.role==='patient'?'My queue':'Overview';
  if(currentUser.role==='patient'){$('patient-greeting-title').innerHTML=`Hello, ${escapeHtml(name.split(' ')[0])}<span>.</span>`;renderPatientPortal()}
}
function myToken(){
  if(currentUser.token){const linked=patients.find(p=>p.token===currentUser.token);if(linked)return linked}
  return patients.find(p=>p.name.toLocaleLowerCase()===String(currentUser.name||'').toLocaleLowerCase()&&['waiting','called'].includes(p.status))||patients.filter(p=>p.name.toLocaleLowerCase()===String(currentUser.name||'').toLocaleLowerCase()).at(-1)||null;
}
function renderPatientPortal(){
  if(!currentUser||currentUser.role!=='patient')return;
  const token=myToken();const live=token?patientsForService(token.service):orderedPatients();const position=token?.status==='called'?0:token?.status==='waiting'?live.findIndex(p=>p.token===token.token)+1:0;renderDoctorQueues();renderHistory();updateDates();$('journey-copy').textContent=token?.status==='called'?'You are being called — head to the counter now':token?.status==='waiting'?`${position===1?'You are next':`${position-1} patient${position===2?'':'s'} ahead`} in your ${token.service} queue`:'Join a queue to see your place move';
  $('patient-live-count').textContent=live.length;
  if(!token){
    $('patient-token-number').textContent='—';$('patient-token-heading').textContent='Your next visit starts here.';$('patient-position').textContent='—';$('patient-wait').innerHTML='— <small>min</small>';$('patient-service').textContent='No active visit';$('patient-service-title').textContent='Choose a service';$('patient-service-location').textContent='BMS Care Centre · Main floor';$('patient-state').className='token-state';$('patient-state').innerHTML='<i></i> Not checked in';$('patient-side-status').textContent='Not checked in';$('patient-side-priority').textContent='—';$('patient-alert-copy').textContent='Join a care queue to receive a token and follow your place from anywhere.';$('patient-alert').className='patient-alert';$('patient-progress-fill').style.width='0%';
  }else{
    const state=token.status;$('patient-token-number').textContent=token.token;$('patient-service').textContent=token.service;$('patient-service-title').textContent=token.service;$('patient-side-priority').textContent=prettyPriority[token.priority];$('patient-checked-in').textContent=token.checkedIn||'Today';
    if(state==='waiting'){$('patient-token-heading').textContent=position<=5?'You’re getting close.':'Your place is saved.';$('patient-position').innerHTML=`${position}<span>${position===1?'st':position===2?'nd':position===3?'rd':'th'}</span>`;$('patient-wait').innerHTML=`~${serviceWait(token)} <small>min</small>`;$('patient-state').className='token-state';$('patient-state').innerHTML='<i></i> In queue';$('patient-side-status').textContent='Waiting';$('patient-alert').className='patient-alert';$('patient-alert-copy').textContent=position<=5?'You’re in the final 5. Head toward the service area; we’ll alert you when you’re called.':'We’ll notify you when you’re 5th in line. You can wait somewhere comfortable.';$('patient-progress-fill').style.width=`${Math.max(7,Math.min(92,(1-position/Math.max(1,live.length))*100))}%`}
    else if(state==='called'){$('patient-token-heading').textContent='It’s almost your turn.';$('patient-position').innerHTML='Now';$('patient-wait').innerHTML='Called';$('patient-state').className='token-state called-state';$('patient-state').innerHTML='<i></i> Please approach';$('patient-side-status').textContent='Please approach';$('patient-alert').className='patient-alert called-alert';const remaining=token.graceUntil?Math.max(0,Math.ceil((token.graceUntil-Date.now())/60000)):5;$('patient-alert-copy').textContent=`You’ve been called. Please head to the service counter now; your arrival window is ${remaining} minute${remaining===1?'':'s'}.`;$('patient-progress-fill').style.width='100%'}
    else if(state==='served'){$('patient-token-heading').textContent='Your visit is complete.';$('patient-position').innerHTML='✓';$('patient-wait').innerHTML='Done';$('patient-state').className='token-state done-state';$('patient-state').innerHTML='<i></i> Complete';$('patient-side-status').textContent='Complete';$('patient-alert').className='patient-alert';$('patient-alert-copy').textContent='You’ve been marked as served. We hope the rest of your visit goes smoothly.';$('patient-progress-fill').style.width='100%'}
    else{$('patient-token-heading').textContent='This token was cancelled.';$('patient-position').innerHTML='—';$('patient-wait').innerHTML='—';$('patient-state').className='token-state done-state';$('patient-state').innerHTML='<i></i> Cancelled';$('patient-side-status').textContent='Cancelled';$('patient-alert-copy').textContent='This token was cancelled after three missed calls. You can join the queue again when you’re ready.';$('patient-progress-fill').style.width='0%'}
  }
  const publicRows=[];if(calledPatient&&calledPatient.status==='called'&&calledPatient.service===token?.service)publicRows.push({p:calledPatient,label:'On call',className:'on-call'});live.slice(0,Math.max(0,6-publicRows.length)).forEach((p,i)=>publicRows.push({p,label:p.token===token?.token?'You':i===0&&!calledPatient?'Next':'Waiting',className:p.token===token?.token?'current':''}));
  $('patient-queue-list').innerHTML=publicRows.map(({p,label,className})=>`<div class="public-queue-row"><span class="public-token">${p.token}</span><span class="public-service">${escapeHtml(p.service)}</span><span class="public-status ${className}">${label}</span></div>`).join('')||'<div class="public-queue-row"><span class="public-token">All clear</span><span class="public-service">No one is waiting right now.</span></div>';
}
function beginSession(role){
  const enteredName=$('login-name').value.trim()||(role==='staff'?'Care team':'QueueLess user');
  const savedProfile=profileFor(role);currentUser={...savedProfile,name:enteredName,email:$('login-email').value.trim()||savedProfile.email||'',role,token:null};
  const linked=patients.find(p=>p.name.toLocaleLowerCase()===enteredName.toLocaleLowerCase()&&['waiting','called'].includes(p.status));
  currentUser.token=role==='patient'?(linked?.token||null):null;
  persistProfile();$('login-screen').classList.add('hidden');$('app-shell').classList.remove('hidden');updateIdentity();renderQueue();renderPatientPortal();if(role==='patient'&&!currentUser.token)setTimeout(()=>$('patient-join-modal').showModal(),150);
}

document.querySelectorAll('.filter-tab').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter-tab').forEach(b=>b.classList.remove('selected'));button.classList.add('selected');currentFilter=button.dataset.filter;visibleLimit=5;renderQueue()}));
$('call-next').addEventListener('click',callNext);
$('mark-arrived').addEventListener('click',statusArrived);
function notifyPatient(patient,message){const alerts=readLocal(`queueless-alerts-${patient.name}`,[]);alerts.push({message,time:new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit'}).format(new Date())});try{localStorage.setItem(`queueless-alerts-${patient.name}`,JSON.stringify(alerts.slice(-12)))}catch{}if(patient.name===currentUser.name&&currentUser.role==='patient')showToast(message);if('Notification'in window&&Notification.permission==='granted')new Notification('QueueLess queue update',{body:message})}
$('enable-alerts').addEventListener('click',async()=>{if(!('Notification'in window)){showToast('This browser does not support notifications. In-app updates remain on.');return}const permission=await Notification.requestPermission();showToast(permission==='granted'?'Browser alerts enabled.':'Browser alerts not enabled; in-app queue updates remain active.')});
$('mark-missed').addEventListener('click',statusMissed);
$('add-patient-btn').addEventListener('click',()=>$('register-modal').showModal());
$('register-form').addEventListener('submit',(event)=>{
  event.preventDefault();const data=new FormData(event.currentTarget);const name=String(data.get('name')).trim();if(!name)return;
  const token=newToken();const priority=data.get('priority');const service=data.get('service');const initials=name.split(/\s+/).slice(0,2).map(x=>x[0].toUpperCase()).join('');
  const person={name,initials,token,service,priority,wait:Math.max(3,orderedPatients().length*3),stage:service==='Laboratory'?'Lab testing':'Registration',age:orderedPatients().length,misses:0,status:'waiting'};patients.push(person);
  $('register-modal').close();event.currentTarget.reset();renderQueue();refreshWaits();nextPosition=orderedPatients().findIndex(p=>p.token===token)+1;$('issued-token').textContent=token;$('issued-position').textContent=nextPosition;$('issued-wait').textContent=`${person.wait} min`;$('token-modal').showModal();
});
$('token-close').addEventListener('click',()=>$('token-modal').close());$('done-token').addEventListener('click',()=>$('token-modal').close());
$('load-more').addEventListener('click',()=>{visibleLimit+=5;renderQueue()});
$('view-queue').addEventListener('click',()=>{document.querySelector('[data-page="queue"]').click()});
document.querySelectorAll('[data-page]').forEach(link=>link.addEventListener('click',(e)=>{e.preventDefault();document.querySelectorAll('.nav-item').forEach(a=>a.classList.remove('active'));link.classList.add('active');const page=link.dataset.page;const names={dashboard:'Overview',queue:'Live queue',patients:'Patients',insights:'Insights'};$('crumb-title').textContent=names[page];if(page==='queue'){$('queue-panel').scrollIntoView({behavior:'smooth',block:'start'});visibleLimit=99;renderQueue()}else if(page==='patients')openInfo('Patient list','The patient register is represented by the live queue in this prototype. New arrivals can be added with “Register patient”.','PATIENTS',[['Active in queue',orderedPatients().length],['Served today',patients.filter(p=>p.status==='served').length],['Cancelled',patients.filter(p=>p.status==='cancelled').length]]);else if(page==='insights')openInfo('Today at a glance','Queue estimates respond to priority, position, and service-point capacity. Priority weights and figures shown here are illustrative, for demonstration only.','QUEUE INSIGHTS',[['Average wait',`${$('average-wait').textContent.trim()} min`],['High priority',patients.filter(p=>['urgent','high'].includes(p.priority)&&p.status==='waiting').length],['Crowd risk','Critical · Lab above capacity'],['Priority weights','Urgency 40% · age risk 25% · appointment 20% · wait 15%']]);else {visibleLimit=5;renderQueue();window.scrollTo({top:0,behavior:'smooth'})}}));
$('assign-tech').addEventListener('click',()=>openInfo('Review lab staffing','Laboratory is at 108% of its planned capacity. Reassigning one technician is a suggested action in this illustrative dashboard.','CAPACITY ALERT',[['Service point','Laboratory'],['Current load','108%'],['Risk level','Critical']]));
$('all-capacity').addEventListener('click',()=>openInfo('Service point capacity','QueueLess compares the current and predicted arrival load with available service capacity. A score above 1 means demand exceeds capacity.','CAPACITY CHECK',capacities.map(c=>[c.name,`${c.pct}% · ${c.pct>=100?'Critical':c.pct>=85?'High':'Low'}`])));
$('notifications-btn').addEventListener('click',()=>{
  if(currentUser.role==='patient'){const token=myToken();const position=token?.status==='waiting'?patientsForService(token.service).findIndex(p=>p.token===token.token)+1:null;const history=readLocal(`queueless-alerts-${currentUser.name}`,[]).slice(-4).reverse().map(a=>[a.time,a.message]);openInfo('Your queue updates',token?`Your token ${token.token} is ${token.status==='called'?'being called':token.status==='waiting'?`at position ${position} in ${token.service}`:token.status}.`:'You have no active token yet. Join a service queue to get started.','PATIENT ALERTS',history.concat([['Browser alerts','Use Turn on browser alerts to enable device notifications']]));return}
  openInfo('Notifications','QueueLess keeps patients and staff informed as the line changes. In this prototype, alerts are shown on screen only.','ALERT CENTRE',[['5th position','Patient receives an arrival heads-up'],['Token called','5-minute grace-period countdown'],['Missed turn','Move back 3 places; cancel after 3 misses']]);
});
$('info-close').addEventListener('click',()=>$('info-modal').close());$('info-ok').addEventListener('click',()=>$('info-modal').close());
document.querySelector('.dismiss-alert').addEventListener('click',()=>$('risk-alert').remove());
document.querySelectorAll('.clinic-switch,.sort-control,.more-button').forEach(btn=>btn.addEventListener('click',()=>showToast('This prototype is using the BMS Care Centre demo workspace.')));
document.addEventListener('click',event=>{const menu=event.target.closest('.row-menu');if(!menu)return;const p=patients.find(item=>item.token===menu.dataset.token);if(p)openInfo(`${p.name} · ${p.token}`,`Current queue status: ${p.status}. Priority category: ${prettyPriority[p.priority]}.`,p.service.toUpperCase(),[['Estimated wait',`${p.wait} minutes`],['Care stage',p.stage],['Missed calls',`${p.misses} of 3`]])});
$('login-name').value=profileFor('patient').name||'Nisha S.';$('login-email').value=profileFor('patient').email||'';
document.querySelectorAll('.role-option').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.role-option').forEach(option=>option.classList.remove('selected'));button.classList.add('selected');selectedRole=button.dataset.role;
  const saved=profileFor(selectedRole);$('login-name').value=saved.name;$('login-email').value=saved.email||'';$('login-submit').innerHTML=`Continue as ${selectedRole==='staff'?'staff':'patient'} <span>→</span>`;
}));
$('login-form').addEventListener('submit',event=>{event.preventDefault();beginSession(selectedRole)});
$('switch-view').addEventListener('click',()=>{selectedRole=currentUser.role==='staff'?'patient':'staff';const saved=profileFor(selectedRole);$('login-name').value=saved.name;$('login-email').value=saved.email||'';$('login-screen').classList.remove('hidden');$('app-shell').classList.add('hidden');document.querySelectorAll('.role-option').forEach(option=>option.classList.toggle('selected',option.dataset.role===selectedRole));$('login-submit').innerHTML=`Continue as ${selectedRole==='staff'?'staff':'patient'} <span>→</span>`});
$('profile-button').addEventListener('click',()=>{const form=$('profile-form');form.elements.name.value=currentUser.name||'';form.elements.email.value=currentUser.email||'';form.elements.phone.value=currentUser.phone||'';$('profile-modal').showModal()});
$('edit-profile').addEventListener('click',()=>$('profile-button').click());
$('profile-form').addEventListener('submit',event=>{
  event.preventDefault();const form=event.currentTarget;currentUser={...currentUser,name:form.elements.name.value.trim(),email:form.elements.email.value.trim(),phone:form.elements.phone.value.trim()};
  if(currentUser.token){const linked=patients.find(p=>p.token===currentUser.token);if(linked){linked.name=currentUser.name;linked.initials=initialsFor(currentUser.name)}}
  $('profile-modal').close();persistProfile();updateIdentity();renderQueue();showToast('Profile updated on this device.');
});
$('logout-button').addEventListener('click',()=>{$('profile-modal').close();$('switch-view').click()});
$('patient-join-button').addEventListener('click',()=>{
  const token=myToken();if(token&&['waiting','called'].includes(token.status)){showToast('You already have an active queue token.');return}$('patient-join-modal').showModal();
});
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.closeDialog).close()));
$('patient-join-form').addEventListener('submit',event=>{
  event.preventDefault();const form=event.currentTarget;const values=new FormData(form);const service=String(values.get('service'));const priority=values.get('priority');const appointment=values.get('visit')==='appointment';const token=newToken();const condition=String(values.get('condition')||'').trim();const selectedPriority=String(values.get('priority'));const person={name:currentUser.name,initials:initialsFor(currentUser.name),token,service,condition,priority:selectedPriority==='urgent'?'urgent':selectedPriority==='high'?'high':appointment?'appointment':'routine',wait:0,stage:service==='Laboratory'?'Lab testing':'Registration',age:orderedPatients().length,misses:0,status:'waiting',checkedIn:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
  patients.push(person);currentUser.token=token;persistProfile();$('patient-join-modal').close();form.reset();renderQueue();refreshWaits();updateIdentity();showToast(`Your token ${token} is ready.`);
});
window.addEventListener('storage',event=>{
  if(event.key==='queueless-patients'&&event.newValue){try{receiveQueue(JSON.parse(event.newValue))}catch{}}
  if(event.key===`queueless-profile-${currentUser.role}`&&event.newValue){try{currentUser={...currentUser,...JSON.parse(event.newValue)};updateIdentity()}catch{}}
});
if(updateChannel)updateChannel.onmessage=event=>{if(event.data?.type!=='queue-update'||!Array.isArray(event.data.patients))return;receiveQueue(event.data.patients)};
if(calledPatient){idleStart=calledPatient.calledAt||Date.now();$('call-hint').classList.add('hidden');$('called-banner').classList.remove('hidden');startGraceCountdown()}
setInterval(()=>{
  if(!calledPatient||idleAlertShown||Date.now()-idleStart<15*60*1000)return;
  idleAlertShown=true;
  openInfo('Service taking longer than expected','This token has been active for more than 15 minutes. Confirm that service is continuing or advance the queue.','15-MINUTE INACTIVITY GUARD',[['Active token',calledPatient.token],['Patient',calledPatient.name]]);
  $('info-details').insertAdjacentHTML('beforeend','<div class="info-actions"><button class="button button-outline" id="still-servicing">Still servicing</button><button class="button button-primary" id="advance-queue">Call next</button></div>');
  $('still-servicing').onclick=()=>{$('info-modal').close();idleStart=Date.now();idleAlertShown=false;showToast('Service timer extended.')};
  $('advance-queue').onclick=()=>{$('info-modal').close();statusMissed()};
},30000);
setInterval(()=>{if(currentUser.role==='patient')renderPatientPortal()},1000);
renderCapacity();orderedPatients().forEach(p=>lastPositions.set(p.token,patientsForService(p.service).findIndex(x=>x.token===p.token)+1));renderQueue();refreshWaits();updateDates();
