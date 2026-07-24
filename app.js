// ── CONFIG ──────────────────────────────────────────────────
const BACKEND_URL = 'https://api.eventstrand.com';
const GOOGLE_CLIENT_ID = '60712789422-evmj4kjuc0joij1khsnpl2tamu4cv5kh.apps.googleusercontent.com';

// ── BUILDER STATE ────────────────────────────────────────────
let builderStep = 0;
const B_STEPS = 4;

let pub = {
  type: '', name: '', description: '',
  address: '', city: '', state: '', country: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  color: '#6C8FFF', website: '',
  visibility: 'public', accessCode: ''
};

let events = [];
let _nextUid = 0;

const VIBE_LIST = [
  {id:'mellow',emoji:'🌿',label:'Mellow'},
  {id:'social',emoji:'🎉',label:'Social'},
  {id:'restless',emoji:'⚡',label:'Restless'},
  {id:'curious',emoji:'🔮',label:'Curious'},
  {id:'spontaneous',emoji:'💥',label:'Spontaneous'},
  {id:'solo',emoji:'🌙',label:'Solo'},
  {id:'celebratory',emoji:'🥂',label:'Celebratory'},
  {id:'cozy',emoji:'🛋',label:'Cozy'},
  {id:'active',emoji:'🏃',label:'Active'},
  {id:'outdoor',emoji:'🌅',label:'Outdoor'},
  {id:'indoor',emoji:'🏠',label:'Indoor'},
  {id:'free',emoji:'🆓',label:'Free'},
];

const CATEGORIES = [
  {id:'music',emoji:'🎵',label:'Music'},
  {id:'food_drink',emoji:'🍺',label:'Food'},
  {id:'fitness',emoji:'🏋',label:'Fitness'},
  {id:'arts',emoji:'🎨',label:'Arts'},
  {id:'education',emoji:'📚',label:'Education'},
  {id:'community',emoji:'🤝',label:'Community'},
  {id:'market',emoji:'🛒',label:'Market'},
  {id:'sport',emoji:'⚽',label:'Sport'},
  {id:'comedy',emoji:'🎤',label:'Comedy'},
  {id:'theater',emoji:'🎭',label:'Theater'},
  {id:'maintenance',emoji:'🔧',label:'Maintenance'},
  {id:'personal',emoji:'🎂',label:'Personal'},
  {id:'spiritual',emoji:'🕊',label:'Spiritual'},
  {id:'general',emoji:'📌',label:'General'},
];

const DAYS_SHORT = ['mon','tue','wed','thu','fri','sat','sun'];
const DAYS_LABEL = ['M','T','W','T','F','S','S'];
const DAYS_FULL  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

function mkEvent() {
  return {
    uid: _nextUid++,
    name: '', category: '', notes: '',
    price: 'free', priceNote: '', ticketUrl: '',
    leadTimeDays: 0, vibes: [],
    eventType: 'recurring',
    rules: [mkRule()], nextRid: 1,
    exceptions: [], nextXid: 0,
    collapsed: false,
    date: '', oneTimeStart: '', oneTimeEnd: '', allDay: false,
    dateList: [], nextDid: 0,
    recDates: [], allDayDefault: false
  };
}

function mkRule() {
  return {
    rid: 0,
    pattern: 'weekly', every: 1,
    days: ['fri'],
    timeStart: '21:00', timeEnd: '',
    allDay: false,
    date: '', note: '',
    monthWeek: 'first', monthDate: 1,
    seasonStart: '', seasonEnd: ''
  };
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toast-msg');
  const ic = document.getElementById('toast-icon');
  if (!t || !m) return;
  m.textContent = msg;
  if (ic) ic.textContent = type === 'error' ? '⚠️' : type === 'info' ? 'ℹ️' : '✅';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── HOW IT WORKS TABS ─────────────────────────────────────────
function switchTab(el, tab) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const tc = document.getElementById('tab-' + tab);
  if (tc) tc.classList.add('active');
}
function buildWheel() {}     // legacy — tabs handle this
function renderWheelState() {}

// ── BUILDER: step navigation ──────────────────────────────────
function bGoto(n) {
  document.querySelectorAll('.builder-panel').forEach((p,i) => p.classList.toggle('active', i === n));
  document.querySelectorAll('.bstep').forEach((s,i) => {
    s.classList.toggle('active', i === n);
    i < n ? s.classList.add('done') : s.classList.remove('done');
  });
  builderStep = n;
  document.getElementById('bprev-btn').style.visibility = n === 0 ? 'hidden' : 'visible';
  document.getElementById('bnext-btn').textContent = n === B_STEPS - 1 ? 'Done ✓' : 'Continue →';
  document.getElementById('bstep-indicator').textContent = 'Step ' + (n+1) + ' of ' + B_STEPS;
  if (n === 3) buildJsonPreview();
}
function bNext() { if (builderStep < B_STEPS-1) bGoto(builderStep+1); }
function bPrev() { if (builderStep > 0) bGoto(builderStep-1); }

function bSelectType(el, type) {
  document.querySelectorAll('#type-grid .type-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected'); pub.type = type;
  document.getElementById('preview-type').textContent = type.toUpperCase();
}
function bUpdatePreview() {
  document.getElementById('preview-name').textContent = pub.name || 'Your Strand';
  bRenderPreviewEvents();
}
function bUpdatePreviewColor(c) { document.getElementById('preview-header').style.background = c; }

// ── BUILDER: event cards ──────────────────────────────────────
function addEvent() {
  const ev = mkEvent();
  events.push(ev);
  renderEventCard(ev, true);
  bUpdateCount();
  bRenderPreviewEvents();
}

function removeEvent(uid) {
  events = events.filter(e => e.uid !== uid);
  const card = document.getElementById('ecard-' + uid);
  if (card) card.remove();
  const el = document.getElementById('events-list');
  if (el && !events.length) el.innerHTML = '<div class="events-empty">No events yet — add one above.</div>';
  bUpdateCount();
  bRenderPreviewEvents();
}

function bUpdateCount() {
  const el = document.getElementById('events-count');
  if (el) el.textContent = events.length + ' event' + (events.length !== 1 ? 's' : '');
}

function renderEventCard(ev, append) {
  const list = document.getElementById('events-list');
  if (list.querySelector('.events-empty')) list.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'event-card';
  div.id = 'ecard-' + ev.uid;
  div.innerHTML = buildCardInner(ev);
  if (append) list.appendChild(div);
  else { const x = document.getElementById('ecard-' + ev.uid); if (x) x.replaceWith(div); else list.appendChild(div); }
  updateUpcomingPreview(ev.uid);
}

// ── BUILDER: buildCardInner (FIXED — template literals) ───────
function buildCardInner(ev) {
  const catBtns = CATEGORIES.map(c =>
    `<button class="cat-btn${ev.category===c.id?' selected':''}" data-cat="${c.id}" onclick="setEvCat(${ev.uid},'${c.id}')"><span>${c.emoji}</span><span>${c.label}</span></button>`
  ).join('');

  const vibeBtns = VIBE_LIST.map(v =>
    `<button class="evibe-btn${ev.vibes.includes(v.id)?' selected':''}" onclick="toggleEvVibe(${ev.uid},'${v.id}')">${v.emoji} ${v.label}</button>`
  ).join('');

  const priceBtns = ['free','free_entry','ticketed','donation','varies'].map(p =>
    `<button class="price-btn${ev.price===p?' selected':''}" onclick="setEvPrice(${ev.uid},'${p}')">${p.replace(/_/g,' ')}</button>`
  ).join('');

  const rulesHtml = ev.rules.map((r, ri) => buildRuleBlock(ev.uid, r, ri, ev.rules.length)).join('');

  const schedHtml = ev.eventType === 'recurring'
    ? `<div id="rules-stack-${ev.uid}">${rulesHtml}</div>
       <button class="add-rule-btn" onclick="addEvRule(${ev.uid})" style="margin-top:8px;width:100%">+ Add another time rule</button>
       <div class="upcoming-preview" style="margin-top:12px"><div class="upcoming-label">Preview — next occurrences</div><div id="upcoming-${ev.uid}"></div></div>
       <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">${buildDatelistSection(ev.uid, ev, 'recDates')}</div>`
    : ev.eventType === 'datelist'
    ? buildDatelistSection(ev.uid, ev, 'dateList')
    : `<div class="oneoff-row">
       <div class="field-group"><label class="field-label">Date</label><input class="field-input" type="date" value="${ev.date}" onchange="setEvDirect(${ev.uid},'date',this.value)"></div>
       <div class="field-group"><label class="field-label">Start time</label><input class="field-input" type="time" value="${ev.oneTimeStart}" onchange="setEvDirect(${ev.uid},'oneTimeStart',this.value)" ${ev.allDay?'disabled':''}></div>
       <div class="field-group"><label class="field-label">End time (optional)</label><input class="field-input" type="time" value="${ev.oneTimeEnd}" onchange="setEvDirect(${ev.uid},'oneTimeEnd',this.value)" ${ev.allDay?'disabled':''}></div>
       </div>
       <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:14px;color:var(--text-dim);font-weight:600;cursor:pointer;">
       <input type="checkbox" ${ev.allDay?'checked':''} onchange="toggleEvAllDay(${ev.uid},this.checked)"> All day / no specific time
       </label>`;

  const excHtml = ev.eventType === 'recurring'
    ? `<div class="ecard-section"><div class="ecard-section-label">Exceptions</div>
       <div id="exc-list-${ev.uid}" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">${ev.exceptions.map((x,xi) => buildExcItem(ev.uid,x,xi)).join('')}</div>
       <div style="display:flex;gap:8px;flex-wrap:wrap">
       <button class="exc-add-btn" onclick="addEvExc(${ev.uid},'skip')">+ Skip date</button>
       <button class="exc-add-btn" onclick="addEvExc(${ev.uid},'cancelled_range')">+ Closed period</button>
       <button class="exc-add-btn" onclick="addEvExc(${ev.uid},'modified')">+ Modified date</button>
       </div></div>` : '';

  return `<div class="ecard-header">
    <input class="ecard-name-input" type="text" placeholder="Name this event…" value="${(ev.name||'').replace(/"/g,'&quot;')}" oninput="setEvNameLive(${ev.uid},this.value)">
    <span class="ecard-badge ${ev.eventType==='oneoff'?'badge-oneoff':'badge-recurring'}" id="ebadge-${ev.uid}">${ev.eventType==='oneoff'?'One-off':ev.eventType==='datelist'?'Date List':'Recurring'}</span>
    <button class="ecard-collapse" onclick="collapseCard(${ev.uid})" title="Collapse">${ev.collapsed?'▸':'▾'}</button>
    <button class="ecard-remove" onclick="removeEvent(${ev.uid})" title="Remove event" aria-label="Remove event">✕</button>
  </div>
  <div class="ecard-body${ev.collapsed?' collapsed':''}" id="ebody-${ev.uid}">
    <div class="ecard-section"><div class="ecard-section-label">Category</div><div class="cat-grid">${catBtns}</div></div>
    <div class="ecard-section"><div class="ecard-section-label">Schedule type</div><div class="etype-toggle">
    <button class="etype-btn${ev.eventType==='recurring'?' active':''}" id="etype-rec-${ev.uid}" onclick="setEvType(${ev.uid},'recurring')">🔁 Recurring</button>
    <button class="etype-btn${ev.eventType==='oneoff'?' active-oneoff':''}" id="etype-one-${ev.uid}" onclick="setEvType(${ev.uid},'oneoff')">📅 One-off</button>
    <button class="etype-btn${ev.eventType==='datelist'?' active-oneoff':''}" id="etype-dl-${ev.uid}" onclick="setEvType(${ev.uid},'datelist')">📋 Date list</button>
    </div></div>
    <div class="ecard-section" id="ecard-sched-${ev.uid}">${schedHtml}</div>
    <div class="ecard-section"><div class="ecard-section-label">Vibe tags</div><div class="evibe-grid">${vibeBtns}</div></div>
    <div class="ecard-section"><div class="ecard-section-label">Price</div>
    <div class="price-row" id="epricerow-${ev.uid}">${priceBtns}</div>
    <input class="field-input" type="text" placeholder="Price note, e.g. $15 at the door" style="margin-top:8px" value="${ev.priceNote||''}" oninput="setEvDirect(${ev.uid},'priceNote',this.value)"></div>
    <div class="ecard-section two-col">
    <div class="field-group" style="margin-bottom:0"><label class="field-label">Ticket / RSVP URL</label><input class="field-input" type="text" placeholder="https://..." value="${ev.ticketUrl||''}" oninput="setEvDirect(${ev.uid},'ticketUrl',this.value)"></div>
    <div class="field-group" style="margin-bottom:0"><label class="field-label">Surface how far ahead?</label>
    <select class="field-input" onchange="setEvDirect(${ev.uid},'leadTimeDays',+this.value)">
    ${[0,1,3,7,14,30,60,90,180].map(d=>`<option value="${d}"${ev.leadTimeDays===d?' selected':''}>${d===0?'Day of only':d===1?'1 day':d===7?'1 week':d===14?'2 weeks':d===30?'1 month':d===60?'2 months':d===90?'3 months':d===180?'6 months':d+' days'}</option>`).join('')}
    </select></div></div>
    <div class="ecard-section"><div class="field-group" style="margin-bottom:0"><label class="field-label">Notes for attendees</label>
    <textarea class="field-input" placeholder="No reservation needed. Bar opens at 7pm…" rows="2" oninput="setEvDirect(${ev.uid},'notes',this.value)">${ev.notes||''}</textarea></div></div>
    ${excHtml}
  </div>`;
}

// ── BUILDER: buildRuleBlock (FIXED) ───────────────────────────
function buildRuleBlock(uid, r, ri, total) {
  const dayBtns = DAYS_SHORT.map((d,i) =>
    `<button class="day-btn${r.days.includes(d)?' selected':''}" onclick="toggleEvDay(${uid},${ri},'${d}')">${DAYS_LABEL[i]}</button>`
  ).join('');

  const patternSel = `<select class="rule-select" onchange="setRulePattern(${uid},${ri},this.value)" id="rpattern-${uid}-${ri}">
    <option value="weekly"${r.pattern==='weekly'&&r.every!==2?' selected':''}>Every week</option>
    <option value="weekly_alt"${r.every===2?' selected':''}>Every other week</option>
    <option value="monthly_week"${r.pattern==='monthly_week'?' selected':''}>Once a month (by weekday)</option>
    <option value="monthly_date"${r.pattern==='monthly_date'?' selected':''}>Once a month (by date)</option>
    <option value="daily"${r.pattern==='daily'?' selected':''}>Every day</option>
    <option value="annual"${r.pattern==='annual'?' selected':''}>Once a year</option>
    <option value="specific_date"${r.pattern==='specific_date'?' selected':''}>Specific date</option>
    </select>`;

  const showDays = ['weekly','weekdays','weekly_alt'].includes(r.pattern) || r.every===2;
  const showMonthWeek = r.pattern === 'monthly_week';
  const showMonthDate = r.pattern === 'monthly_date';
  const showDate = r.pattern === 'specific_date';
  const showSeason = r.pattern !== 'specific_date';

  return `<div class="rule-block" id="rblock-${uid}-${ri}">
    <div class="rule-block-header"><span>Rule ${ri+1}</span>
    ${total > 1 ? `<button class="ecard-remove" onclick="removeEvRule(${uid},${ri})" aria-label="Remove recurrence rule">✕</button>` : ''}
    </div>
    <div class="rule-block-body">
    <div class="rule-row2"><span class="rule-lbl">Happens</span>${patternSel}</div>
    <div class="rule-row2" id="rdays-${uid}-${ri}" style="display:${showDays?'flex':'none'}">
    <span class="rule-lbl">On</span><div class="days-selector">${dayBtns}</div></div>
    <div class="rule-row2" id="rmw-${uid}-${ri}" style="display:${showMonthWeek?'flex':'none'}">
    <span class="rule-lbl">On the</span>
    <select class="rule-select" onchange="setRuleField(${uid},${ri},'monthWeek',this.value)">
    ${['first','second','third','fourth','last'].map(w=>`<option value="${w}"${r.monthWeek===w?' selected':''}>${w}</option>`).join('')}
    </select>
    <select class="rule-select" onchange="setRuleField(${uid},${ri},'days',[this.value])">
    ${DAYS_FULL.map(d=>`<option value="${d.slice(0,3)}"${r.days[0]===d.slice(0,3)?' selected':''}>${d.charAt(0).toUpperCase()+d.slice(1)}</option>`).join('')}
    </select></div>
    <div class="rule-row2" id="rmd-${uid}-${ri}" style="display:${showMonthDate?'flex':'none'}">
    <span class="rule-lbl">On the</span>
    <select class="rule-select" onchange="setRuleField(${uid},${ri},'monthDate',+this.value)">
    ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].map(n=>`<option value="${n}"${r.monthDate===n?' selected':''}>${n}</option>`).join('')}
    </select><span class="rule-lbl">of each month</span></div>
    <div class="rule-row2" id="rdate-${uid}-${ri}" style="display:${showDate?'flex':'none'}">
    <span class="rule-lbl">On</span>
    <input type="date" class="rule-select" value="${r.date||''}" onchange="setRuleField(${uid},${ri},'date',this.value);updateUpcomingPreview(${uid})"></div>
    <div class="rule-row2" id="rnote-${uid}-${ri}" style="display:${showDate?'flex':'none'}">
    <span class="rule-lbl">Note</span>
    <input type="text" class="rule-select" placeholder="Optional note, e.g. Guest DJ" value="${r.note||''}" oninput="setRuleField(${uid},${ri},'note',this.value)" style="flex:1;min-width:120px"></div>
    <div class="rule-row2"><span class="rule-lbl">At</span>
    <input type="time" class="rule-select" value="${r.timeStart}" onchange="setRuleField(${uid},${ri},'timeStart',this.value);updateUpcomingPreview(${uid})" ${r.allDay?'disabled':''}>
    <span class="rule-lbl">until (optional)</span>
    <input type="time" class="rule-select" placeholder="optional" value="${r.timeEnd}" onchange="setRuleField(${uid},${ri},'timeEnd',this.value)" ${r.allDay?'disabled':''}></div>
    <div class="rule-row2">
    <label style="display:flex;align-items:center;gap:6px;font-size:14px;color:var(--text-dim);font-weight:600;cursor:pointer;">
    <input type="checkbox" ${r.allDay?'checked':''} onchange="toggleRuleAllDay(${uid},${ri},this.checked)"> All day / no specific time
    </label></div>
    <div class="rule-row2" id="rseason-${uid}-${ri}" style="display:${showSeason?'flex':'none'}"><span class="rule-lbl">Season</span>
    <select class="rule-select" onchange="setRuleField(${uid},${ri},'seasonStart',this.value)">
    <option value="">All year</option>
    ${['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(m=>`<option value="${m}"${r.seasonStart===m?' selected':''}>${m.charAt(0).toUpperCase()+m.slice(1)}</option>`).join('')}
    </select><span class="rule-lbl">–</span>
    <select class="rule-select" onchange="setRuleField(${uid},${ri},'seasonEnd',this.value)">
    <option value="">All year</option>
    ${['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(m=>`<option value="${m}"${r.seasonEnd===m?' selected':''}>${m.charAt(0).toUpperCase()+m.slice(1)}</option>`).join('')}
    </select></div>
    </div></div>`;
}

// ── BUILDER: buildExcItem (FIXED) ─────────────────────────────
function buildExcItem(uid, x, xi) {
  const typeLabel = {skip:'Skip date', cancelled_range:'Closed period', modified:'Modified date'}[x.type] || x.type;
  return `<div class="exc-item" id="exc-${uid}-${xi}">
    <div class="exc-item-header"><span class="exc-item-type">${typeLabel}</span>
    <button class="exc-item-remove" onclick="removeEvExc(${uid},${xi})" aria-label="Remove exception">✕</button></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
    <input type="date" class="rule-select" value="${x.date||''}" onchange="setExcField(${uid},${xi},'date',this.value)">
    ${x.type==='cancelled_range'?`<span class="rule-lbl">to</span><input type="date" class="rule-select" value="${x.date_end||''}" onchange="setExcField(${uid},${xi},'date_end',this.value)">`:''}
    ${x.type==='modified'?`<input type="time" class="rule-select" value="${x.time_start||''}" onchange="setExcField(${uid},${xi},'time_start',this.value)">`:''}
    <input type="text" class="rule-select" placeholder="Note (optional)" value="${x.note||''}" oninput="setExcField(${uid},${xi},'note',this.value)" style="flex:2;min-width:120px">
    </div></div>`;
}

// ── BUILDER: event state mutations (preserved) ────────────────
function getEv(uid) { return events.find(e => e.uid === uid); }

function setEvNameLive(uid, val) {
  const ev = getEv(uid); if (!ev) return;
  ev.name = val;
  bRenderPreviewEvents();
}

function setEvCat(uid, cat) {
  const ev = getEv(uid); if (!ev) return;
  ev.category = cat;
  const grid = document.querySelector(`#ecard-${uid} .cat-grid`);
  if (grid) grid.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('selected', b.dataset.cat === cat));
}

function setEvType(uid, type) {
  const ev = getEv(uid); if (!ev) return;
  ev.eventType = type;
  const badge = document.getElementById('ebadge-' + uid);
  if (badge) { badge.textContent = {recurring:'Recurring',oneoff:'One-off',datelist:'Date List'}[type]||type; badge.className='ecard-badge '+(type==='recurring'?'badge-recurring':'badge-oneoff'); }
  ['rec','one','dl'].forEach(k => { const b=document.getElementById(`etype-${k}-${uid}`); if(b) b.className='etype-btn'; });
  const active = document.getElementById(type==='recurring'?`etype-rec-${uid}`:type==='oneoff'?`etype-one-${uid}`:`etype-dl-${uid}`);
  if (active) active.classList.add(type==='recurring'?'active':'active-oneoff');
  const schedEl = document.getElementById('ecard-sched-' + uid);
  if (!schedEl) return;
  if (type === 'recurring') {
    const rulesHtml = ev.rules.map((r,ri) => buildRuleBlock(uid,r,ri,ev.rules.length)).join('');
    schedEl.innerHTML = `<div id="rules-stack-${uid}">${rulesHtml}</div>
      <button class="add-rule-btn" onclick="addEvRule(${uid})" style="margin-top:8px;width:100%">+ Add another time rule</button>
      <div class="upcoming-preview" style="margin-top:12px"><div class="upcoming-label">Preview — next occurrences</div><div id="upcoming-${uid}"></div></div>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">${buildDatelistSection(uid, ev, 'recDates')}</div>`;
    updateUpcomingPreview(uid);
    // Add exceptions section if missing
    if (!document.getElementById('exc-list-' + uid)) {
      const body = document.getElementById('ebody-' + uid);
      const excDiv = document.createElement('div');
      excDiv.className = 'ecard-section';
      excDiv.id = 'exc-section-' + uid;
      excDiv.innerHTML = `<div class="ecard-section-label">Exceptions</div>
        <div id="exc-list-${uid}" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="exc-add-btn" onclick="addEvExc(${uid},'skip')">+ Skip date</button>
        <button class="exc-add-btn" onclick="addEvExc(${uid},'cancelled_range')">+ Closed period</button>
        <button class="exc-add-btn" onclick="addEvExc(${uid},'modified')">+ Modified date</button>
        </div>`;
      body.appendChild(excDiv);
    }
  } else if (type === 'datelist') {
    schedEl.innerHTML = buildDatelistSection(uid, ev, 'dateList');
  } else {
    schedEl.innerHTML = `<div class="oneoff-row">
      <div class="field-group"><label class="field-label">Date</label><input class="field-input" type="date" value="${ev.date}" onchange="setEvDirect(${uid},'date',this.value)"></div>
      <div class="field-group"><label class="field-label">Start time</label><input class="field-input" type="time" value="${ev.oneTimeStart}" onchange="setEvDirect(${uid},'oneTimeStart',this.value)" ${ev.allDay?'disabled':''}></div>
      <div class="field-group"><label class="field-label">End time (optional)</label><input class="field-input" type="time" value="${ev.oneTimeEnd}" onchange="setEvDirect(${uid},'oneTimeEnd',this.value)" ${ev.allDay?'disabled':''}></div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:14px;color:var(--text-dim);font-weight:600;cursor:pointer;">
      <input type="checkbox" ${ev.allDay?'checked':''} onchange="toggleEvAllDay(${uid},this.checked)"> All day / no specific time
      </label>`;
    const excSec = document.getElementById('exc-section-' + uid);
    if (excSec) excSec.remove();
  }
}

function toggleEvVibe(uid, vib) {
  const ev = getEv(uid); if (!ev) return;
  const i = ev.vibes.indexOf(vib);
  if (i >= 0) ev.vibes.splice(i, 1); else ev.vibes.push(vib);
  const grid = document.querySelector(`#ecard-${uid} .evibe-grid`);
  if (grid) grid.querySelectorAll('.evibe-btn').forEach(b => { b.classList.toggle('selected', ev.vibes.some(v => b.textContent.includes(v))); });
  const vl = VIBE_LIST.find(v=>v.id===vib);
  if (vl) { const btn = grid ? [...grid.querySelectorAll('.evibe-btn')].find(b=>b.textContent.includes(vl.label)) : null; if(btn) btn.classList.toggle('selected', ev.vibes.includes(vib)); }
  bRenderPreviewEvents();
}

function setEvPrice(uid, price) {
  const ev = getEv(uid); if (!ev) return;
  ev.price = price;
  const row = document.getElementById('epricerow-' + uid);
  if (row) row.querySelectorAll('.price-btn').forEach(b => b.classList.toggle('selected', b.textContent.replace(/ /g,'_')===price||b.textContent===price.replace(/_/g,' ')));
}

function setEvDirect(uid, field, val) {
  const ev = getEv(uid); if (!ev) return;
  ev[field] = val;
  if (field === 'date' || field === 'oneTimeStart') bRenderPreviewEvents();
}

function toggleEvAllDay(uid, checked) {
  const ev = getEv(uid); if (!ev) return;
  ev.allDay = checked;
  const schedEl = document.getElementById('ecard-sched-' + uid);
  if (schedEl) schedEl.querySelectorAll('.oneoff-row input[type=time]').forEach(i => i.disabled = checked);
  bRenderPreviewEvents();
}

function toggleEvAllDayDefault(uid, listField, checked) {
  const ev = getEv(uid); if (!ev) return;
  ev.allDayDefault = checked;
  const wrap = document.getElementById('datelist-times-' + listField + '-' + uid);
  if (wrap) wrap.querySelectorAll('input[type=time]').forEach(i => i.disabled = checked);
}

function collapseCard(uid) {
  const ev = getEv(uid); if (!ev) return;
  ev.collapsed = !ev.collapsed;
  const body = document.getElementById('ebody-' + uid);
  const btn = document.querySelector(`#ecard-${uid} .ecard-collapse`);
  if (body) body.classList.toggle('collapsed', ev.collapsed);
  if (btn) btn.textContent = ev.collapsed ? '▸' : '▾';
}

function addEvRule(uid) {
  const ev = getEv(uid); if (!ev) return;
  const r = mkRule(); r.rid = ev.nextRid++;
  ev.rules.push(r);
  const stack = document.getElementById('rules-stack-' + uid);
  if (stack) {
    const ri = ev.rules.length - 1;
    stack.insertAdjacentHTML('beforeend', buildRuleBlock(uid, r, ri, ev.rules.length));
    if (ev.rules.length > 1) {
      const firstRemove = stack.querySelector('.rule-block-header .ecard-remove');
      if (!firstRemove) {
        const firstHeader = stack.querySelector('.rule-block-header');
        if (firstHeader) firstHeader.insertAdjacentHTML('beforeend', `<button class="ecard-remove" onclick="removeEvRule(${uid},0)" aria-label="Remove recurrence rule">✕</button>`);
      }
    }
  }
  showToast('+ Rule added');
}

function removeEvRule(uid, ri) {
  const ev = getEv(uid); if (!ev) return;
  ev.rules.splice(ri, 1);
  const stack = document.getElementById('rules-stack-' + uid);
  if (stack) stack.innerHTML = ev.rules.map((r,i) => buildRuleBlock(uid,r,i,ev.rules.length)).join('');
  updateUpcomingPreview(uid);
}

function setRulePattern(uid, ri, val) {
  const ev = getEv(uid); if (!ev) return;
  const r = ev.rules[ri]; if (!r) return;
  if (val === 'weekly_alt') { r.pattern = 'weekly'; r.every = 2; }
  else { r.pattern = val; r.every = 1; }
  const showDays = ['weekly','weekdays','weekly_alt'].includes(val);
  const showDate = val === 'specific_date';
  const daysRow = document.getElementById(`rdays-${uid}-${ri}`);
  const mwRow  = document.getElementById(`rmw-${uid}-${ri}`);
  const mdRow  = document.getElementById(`rmd-${uid}-${ri}`);
  const dateRow = document.getElementById(`rdate-${uid}-${ri}`);
  const noteRow = document.getElementById(`rnote-${uid}-${ri}`);
  const seasonRow = document.getElementById(`rseason-${uid}-${ri}`);
  if (daysRow) daysRow.style.display = showDays ? 'flex' : 'none';
  if (mwRow)  mwRow.style.display  = val === 'monthly_week' ? 'flex' : 'none';
  if (mdRow)  mdRow.style.display  = val === 'monthly_date' ? 'flex' : 'none';
  if (dateRow) dateRow.style.display = showDate ? 'flex' : 'none';
  if (noteRow) noteRow.style.display = showDate ? 'flex' : 'none';
  if (seasonRow) seasonRow.style.display = showDate ? 'none' : 'flex';
  updateUpcomingPreview(uid);
}

function setRuleField(uid, ri, field, val) {
  const ev = getEv(uid); if (!ev) return;
  const r = ev.rules[ri]; if (!r) return;
  r[field] = val;
}

function toggleRuleAllDay(uid, ri, checked) {
  const ev = getEv(uid); if (!ev) return;
  const r = ev.rules[ri]; if (!r) return;
  r.allDay = checked;
  const block = document.getElementById('rblock-' + uid + '-' + ri);
  if (block) block.querySelectorAll('input[type=time]').forEach(i => i.disabled = checked);
  updateUpcomingPreview(uid);
}

function toggleEvDay(uid, ri, day) {
  const ev = getEv(uid); if (!ev) return;
  const r = ev.rules[ri]; if (!r) return;
  const i = r.days.indexOf(day);
  if (i >= 0) r.days.splice(i, 1); else r.days.push(day);
  const daysEl = document.getElementById(`rdays-${uid}-${ri}`);
  if (daysEl) daysEl.querySelectorAll('.day-btn').forEach((b,idx) => b.classList.toggle('selected', r.days.includes(DAYS_SHORT[idx])));
  updateUpcomingPreview(uid);
}

function addEvExc(uid, type) {
  const ev = getEv(uid); if (!ev) return;
  const xi = ev.nextXid++;
  const x = { xid: xi, type, date: '', date_end: '', note: '', time_start: '' };
  ev.exceptions.push(x);
  const list = document.getElementById('exc-list-' + uid);
  if (list) {
    const frag = document.createElement('div');
    frag.innerHTML = buildExcItem(uid, x, ev.exceptions.length-1);
    list.appendChild(frag.firstElementChild);
  }
}

function removeEvExc(uid, xi) {
  const ev = getEv(uid); if (!ev) return;
  ev.exceptions.splice(xi, 1);
  const list = document.getElementById('exc-list-' + uid);
  if (list) list.innerHTML = ev.exceptions.map((x,i) => buildExcItem(uid,x,i)).join('');
}

function setExcField(uid, xi, field, val) {
  const ev = getEv(uid); if (!ev) return;
  const x = ev.exceptions[xi]; if (!x) return;
  x[field] = val;
}

// ── BUILDER: upcoming preview ─────────────────────────────────
function updateUpcomingPreview(uid) {
  const ev = getEv(uid); if (!ev || ev.eventType !== 'recurring') return;
  const el = document.getElementById('upcoming-' + uid);
  if (!el) return;
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const items = [];
  const now = new Date();
  const r = ev.rules[0];
  if (!r) return;
  let d = new Date(now); let count = 0;
  while (count < 4 && d - now < 90*24*60*60*1000) {
    d.setDate(d.getDate()+1);
    const dow = d.getDay();
    const dayAbbr = DAYS_SHORT[(dow+6)%7];
    if (!r.days.length || r.days.includes(dayAbbr)) {
      items.push({ date: DAYS[dow]+' '+MONTHS[d.getMonth()]+' '+d.getDate(), allDay: !!r.allDay, start: r.timeStart||'', end: r.timeEnd||'' });
      count++;
    }
  }
  el.innerHTML = items.map(it =>
    `<div class="upcoming-item"><span class="upcoming-date">${it.date}</span><span class="upcoming-time">${it.allDay ? 'All day' : (it.end ? it.start+' – '+it.end : it.start||'?')}</span></div>`
  ).join('');
}

// ── BUILDER: phone preview ────────────────────────────────────
function bRenderPreviewEvents() {
  const el = document.getElementById('preview-events-list');
  if (!el) return;
  if (!events.length) {
    el.innerHTML = '<div class="preview-event" style="opacity:0.35"><div class="preview-event-name">Add events to preview</div><div class="preview-event-time">Step 3 → Events</div></div>';
    return;
  }
  el.innerHTML = events.slice(0,3).map(ev => {
    const timeStr = ev.eventType === 'oneoff'
      ? (ev.date ? new Date(ev.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'One-off') + (ev.oneTimeStart?' · '+ev.oneTimeStart:'')
      : ev.eventType === 'datelist'
      ? (() => {
          const upcoming = (ev.dateList||[]).filter(d => d.date && new Date(d.date+'T00:00:00') >= new Date()).sort((a,b) => a.date>b.date?1:-1);
          if (!upcoming.length) return 'Date list · no upcoming';
          return 'Next: '+new Date(upcoming[0].date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})+(upcoming.length>1?' +'+( upcoming.length-1)+' more':'');
        })()
      : ev.rules[0] ? (ev.rules[0].days.slice(0,2).map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join('/') + ' · ' + (ev.rules[0].allDay ? 'All day' : (ev.rules[0].timeStart||''))) : 'Recurring';
    const tags = ev.vibes.slice(0,2).map(v => `<span class="preview-event-tag">${esc(v)}</span>`).join('');
    return `<div class="preview-event">
      <div class="preview-event-name">${ev.name||'Unnamed Event'}</div>
      <div class="preview-event-time">${timeStr}</div>
      ${tags ? `<div class="preview-event-tags">${tags}</div>` : ''}
      </div>`;
  }).join('');
}

// ── BUILDER: date list helpers ────────────────────────────────
function buildDatelistSection(uid, ev, listField) {
  listField = listField || 'dateList';
  const list = ev[listField] || [];
  const defaultTimeRow = `<div class="datelist-times" id="datelist-times-${listField}-${uid}" style="margin-bottom:8px;">
    <span class="rule-lbl" style="flex-shrink:0">Default time</span>
    <input type="time" class="rule-select" value="${ev.oneTimeStart||'21:00'}" onchange="setEvDirect(${uid},'oneTimeStart',this.value)" placeholder="start" ${ev.allDayDefault?'disabled':''}>
    <span class="rule-lbl">–</span>
    <input type="time" class="rule-select" value="${ev.oneTimeEnd||''}" onchange="setEvDirect(${uid},'oneTimeEnd',this.value)" placeholder="end (optional)" ${ev.allDayDefault?'disabled':''}>
    </div>
    <label style="display:flex;align-items:center;gap:6px;margin-bottom:12px;font-size:14px;color:var(--text-dim);font-weight:600;cursor:pointer;">
    <input type="checkbox" ${ev.allDayDefault?'checked':''} onchange="toggleEvAllDayDefault(${uid},'${listField}',this.checked)"> All day / no time (default for new dates)
    </label>`;
  const entries = list.map((d,di) => buildDateEntry(uid, d, di, listField)).join('');
  const label = listField === 'recDates' ? 'Extra dates (optional)' : 'Confirmed Dates';
  const helpText = listField === 'recDates'
    ? 'Individual dates in addition to the recurrence pattern above — e.g. an extra one-off night. Inherit the default time unless overridden per entry.'
    : 'Dates inherit the default time unless overridden per entry. Subscribers get updates silently.';
  return `<div class="ecard-section-label" style="margin-bottom:8px">${label}</div>
    ${defaultTimeRow}
    <div class="datelist-stack" id="datelist-${listField}-${uid}">${entries}</div>
    <button class="add-rule-btn" onclick="addDateEntry(${uid},'${listField}')" style="margin-top:8px;width:100%">+ Add date</button>
    <div style="font-size:12px;color:var(--text-faint);margin-top:8px;line-height:1.6">${helpText}</div>`;
}

function buildDateEntry(uid, d, di, listField) {
  listField = listField || 'dateList';
  const hasOverride = d.timeStart || d.timeEnd || d.note || d.allDay;
  return `<div class="datelist-entry" id="dentry-${listField}-${uid}-${di}">
    <input type="date" class="field-input datelist-entry-date" value="${d.date||''}" onchange="setDateField(${uid},'${listField}',${di},'date',this.value)">
    <span class="datelist-override-toggle" onclick="toggleDateOverride(${uid},'${listField}',${di})" id="dtoggle-${listField}-${uid}-${di}">${hasOverride?'− times/note':'+ override'}</span>
    <div id="doverride-${listField}-${uid}-${di}" style="display:${hasOverride?'flex':'none'};gap:6px;align-items:center;flex-wrap:wrap;flex:1">
    <input type="time" class="rule-select" value="${d.timeStart||''}" placeholder="start" onchange="setDateField(${uid},'${listField}',${di},'timeStart',this.value)" ${d.allDay?'disabled':''}>
    <input type="time" class="rule-select" value="${d.timeEnd||''}" placeholder="end (optional)" onchange="setDateField(${uid},'${listField}',${di},'timeEnd',this.value)" ${d.allDay?'disabled':''}>
    <label style="display:flex;align-items:center;gap:4px;font-size:13px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" ${d.allDay?'checked':''} onchange="setDateField(${uid},'${listField}',${di},'allDay',this.checked)"> All day</label>
    <input type="text" class="rule-select" value="${d.note||''}" placeholder="Note (e.g. Guest DJ)" style="flex:2;min-width:100px" oninput="setDateField(${uid},'${listField}',${di},'note',this.value)">
    </div>
    <button class="datelist-entry-remove" onclick="removeDateEntry(${uid},'${listField}',${di})" aria-label="Remove date entry">✕</button>
    </div>`;
}

function addDateEntry(uid, listField) {
  listField = listField || 'dateList';
  const ev = getEv(uid); if (!ev) return;
  ev[listField] = ev[listField] || [];
  ev[listField].push({ date: '', timeStart: '', timeEnd: '', note: '', allDay: !!ev.allDayDefault });
  const stack = document.getElementById('datelist-' + listField + '-' + uid);
  if (stack) {
    const di = ev[listField].length - 1;
    const frag = document.createElement('div');
    frag.innerHTML = buildDateEntry(uid, ev[listField][di], di, listField);
    stack.appendChild(frag.firstElementChild);
  }
  bRenderPreviewEvents();
}

function removeDateEntry(uid, listField, di) {
  listField = listField || 'dateList';
  const ev = getEv(uid); if (!ev) return;
  ev[listField].splice(di, 1);
  const stack = document.getElementById('datelist-' + listField + '-' + uid);
  if (stack) stack.innerHTML = (ev[listField]||[]).map((d,i) => buildDateEntry(uid,d,i,listField)).join('');
  bRenderPreviewEvents();
}

function setDateField(uid, listField, di, field, val) {
  listField = listField || 'dateList';
  const ev = getEv(uid); if (!ev) return;
  if (!ev[listField] || !ev[listField][di]) return;
  ev[listField][di][field] = val;
  if (field === 'allDay') {
    const stack = document.getElementById('datelist-' + listField + '-' + uid);
    if (stack) stack.innerHTML = (ev[listField]||[]).map((d,i) => buildDateEntry(uid,d,i,listField)).join('');
  }
  if (field === 'date') bRenderPreviewEvents();
}

function toggleDateOverride(uid, listField, di) {
  listField = listField || 'dateList';
  const el = document.getElementById(`doverride-${listField}-${uid}-${di}`);
  const tog = document.getElementById(`dtoggle-${listField}-${uid}-${di}`);
  if (!el || !tog) return;
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : 'flex';
  tog.textContent = visible ? '+ override' : '− times/note';
}

// ── BUILDER: .rcal export ─────────────────────────────────────
function buildRcalObj() {
  const meta = {};
  if (pub.name) meta.title = pub.name;
  if (pub.description) meta.description = pub.description;
  if (pub.type) meta.type = pub.type;
  if (pub.address || pub.city) meta.location = [pub.address, pub.city, pub.state, pub.country].filter(Boolean).join(', ');
  if (pub.timezone) meta.timezone = pub.timezone;
  if (pub.color) meta.color = pub.color;
  if (pub.website) meta.website = pub.website;
  if (pub.visibility && pub.visibility !== 'public') meta.visibility = pub.visibility;
  if (pub.visibility === 'protected' && pub.accessCode) meta.access_code = pub.accessCode;

  const strands = events.map(ev => {
    const s = {};
    if (ev.name) s.title = ev.name;
    if (ev.category) s.category = ev.category;
    if (ev.vibes.length) s.vibes = ev.vibes;
    if (ev.price !== 'free') s.price = ev.price;
    if (ev.priceNote) s.price_note = ev.priceNote;
    if (ev.ticketUrl) s.ticket_url = ev.ticketUrl;
    if (ev.leadTimeDays) s.lead_time_days = ev.leadTimeDays;
    if (ev.notes) s.notes = ev.notes;
    if (ev.eventType === 'oneoff') {
      if (ev.date) s.date = ev.date;
      if (ev.allDay) { s.all_day = true; }
      else {
        if (ev.oneTimeStart) s.time_start = ev.oneTimeStart;
        if (ev.oneTimeEnd) s.time_end = ev.oneTimeEnd;
      }
    } else if (ev.eventType === 'datelist') {
      s.dates = ev.dateList.filter(d=>d.date).map(d => {
        const entry = {date:d.date};
        if (d.allDay) { entry.all_day = true; }
        else {
          if (d.timeStart) entry.time_start = d.timeStart;
          if (d.timeEnd) entry.time_end = d.timeEnd;
        }
        if (d.note) entry.note = d.note;
        return entry;
      });
    } else {
      const recRules = ev.rules.filter(r => r.pattern !== 'specific_date');
      const specificDateRules = ev.rules.filter(r => r.pattern === 'specific_date' && r.date);
      if (recRules.length) s.recurrence = recRules.map(r => {
        const rule = {pattern: r.pattern};
        if (r.every && r.every > 1) rule.every = r.every;
        if (['weekly','weekly_alt'].includes(r.pattern) && r.days.length) rule.days = r.days;
        if (r.pattern === 'monthly_week') { rule.month_week = r.monthWeek; rule.days = r.days; }
        if (r.pattern === 'monthly_date') rule.month_date = r.monthDate;
        if (r.allDay) { rule.all_day = true; }
        else {
          if (r.timeStart) rule.time_start = r.timeStart;
          if (r.timeEnd) rule.time_end = r.timeEnd;
        }
        if (r.seasonStart) rule.season_start = r.seasonStart;
        if (r.seasonEnd) rule.season_end = r.seasonEnd;
        return rule;
      });
      if (ev.exceptions.length) {
        s.exceptions = ev.exceptions.filter(x=>x.date).map(x => {
          const ex = {type:x.type, date:x.date};
          if (x.date_end) ex.date_end = x.date_end;
          if (x.note) ex.note = x.note;
          if (x.time_start) ex.time_start = x.time_start;
          return ex;
        });
        if (!s.exceptions.length) delete s.exceptions;
      }
      const allDates = [
        ...specificDateRules.map(r => {
          const entry = {date:r.date};
          if (r.allDay) { entry.all_day = true; }
          else {
            if (r.timeStart) entry.time_start = r.timeStart;
            if (r.timeEnd) entry.time_end = r.timeEnd;
          }
          if (r.note) entry.note = r.note;
          return entry;
        }),
        ...(ev.recDates||[]).filter(d=>d.date).map(d => {
          const entry = {date:d.date};
          if (d.allDay) { entry.all_day = true; }
          else {
            if (d.timeStart) entry.time_start = d.timeStart;
            if (d.timeEnd) entry.time_end = d.timeEnd;
          }
          if (d.note) entry.note = d.note;
          return entry;
        })
      ];
      if (allDates.length) s.dates = allDates;
    }
    return s;
  });
  return { rcal: '0.1', meta, events: strands };
}

function buildJsonPreview() {
  const obj = buildRcalObj();
  const name = (pub.name||'my-strand').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  document.getElementById('json-filename').textContent = name + '.rcal';
  const json = JSON.stringify(obj, null, 2);
  const h = json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"([^"]+)":/g,'<span class="jp-k">"$1"</span>:')
    .replace(/: "([^"]*)"/g,': <span class="jp-s">"$1"</span>')
    .replace(/: (true|false)/g,': <span class="jp-b">$1</span>')
    .replace(/: (-?\d+\.?\d*)/g,': <span class="jp-n">$1</span>');
  document.getElementById('json-preview-pre').innerHTML = h;
  const n = events.length;
  const rec = events.filter(e=>e.eventType==='recurring').length;
  const oo = events.filter(e=>e.eventType==='oneoff').length;
  document.getElementById('export-summary').textContent =
    (pub.name||'Untitled strand') + ' — ' + n + ' event' + (n!==1?'s':'')
    + (rec&&oo?' ('+rec+' recurring, '+oo+' one-off)':rec?' ('+rec+' recurring)':oo?' ('+oo+' one-off)':'')+'. Ready to download.';
}

function downloadRcal() {
  const obj = buildRcalObj();
  const name = (pub.name||'my-strand').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const blob = new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=name+'.rcal'; a.click();
  URL.revokeObjectURL(url);
  showToast('⬇ ' + name + '.rcal downloaded!');
}

function copyRcalJson() {
  navigator.clipboard?.writeText(JSON.stringify(buildRcalObj(),null,2));
  showToast('📋 JSON copied to clipboard');
}

function copyStrandLink() {
  if (!_builderStrandId) {
    showToast('Save your strand first to get a shareable link', 'error');
    return;
  }
  const handle = ES_USER?.handle || 'yourhandle';
  const link = `https://eventstrand.com/s/${handle}/${_builderStrandId}`;
  navigator.clipboard?.writeText(link);
  showToast('📋 Link copied: ' + link);
}

// ── AUTH STATE ────────────────────────────────────────────────
let ES_USER = null; // { id, handle, displayName, email, picture, jwt }
let ES_WORKSPACES = [];
let ES_NOTIFICATIONS = [];

// ── XSS ESCAPE HELPERS ───────────────────────────────────────
// esc()     — for values interpolated into innerHTML body text
// escAttr() — for values interpolated inside inline JS attribute handlers
//             e.g. onclick="fn('${escAttr(x)}')"
//             HTML attributes decode entities BEFORE the JS engine runs,
//             so esc() alone is not sufficient inside onclick="..." strings.
function esc(s) {
  const m = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  return String(s ?? '').replace(/[&<>"']/g, c => m[c]);
}
function escAttr(s) {
  // 1. JSON-stringify to escape \, ", control chars, newlines
  // 2. swap remaining ' → \' so the JS string literal stays intact
  // 3. HTML-encode the result so it's safe inside the attribute value
  const js = JSON.stringify(String(s ?? '')).slice(1, -1).replace(/'/g, "\\'");
  return js.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function esGetJwt() { try { return localStorage.getItem('es_jwt'); } catch(e){return null;} }
function esSetJwt(t) { try { localStorage.setItem('es_jwt',t); } catch(e){} }
function esClearJwt() { try { localStorage.removeItem('es_jwt'); localStorage.removeItem('es_user'); } catch(e){} }
function esGetStoredUser() { try { const u=localStorage.getItem('es_user'); return u?JSON.parse(u):null; } catch(e){return null;} }
function esSetStoredUser(u) { try { localStorage.setItem('es_user',JSON.stringify(u)); } catch(e){} }

function esPendingSub(data) {
  if (data) { try { localStorage.setItem('es_pending_sub',JSON.stringify(data)); } catch(e){} }
  else { try { return JSON.parse(localStorage.getItem('es_pending_sub')||'null'); } catch(e){ return null; } }
}
function esClearPendingSub() { try { localStorage.removeItem('es_pending_sub'); } catch(e){} }

async function esAuthWithGoogle(googleUser) {
  try {
    const res = await fetch(BACKEND_URL + '/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: googleUser.credential })
    });
    const data = await res.json();
    if (!res.ok) { showToast('Sign in failed — ' + (data.error||'try again'), 'error'); return; }
    esSetJwt(data.token);
    ES_USER = data.user;
    esSetStoredUser(data.user);
    if (!data.user.handle) {
      esShowHandleSetup();
    } else {
      esOnSignedIn();
    }
  } catch(e) {
    showToast('Connection error — check your internet and try again', 'error');
  }
}

function esOnSignedIn() {
  esCloseAuth();
  esRenderNavAuth();
  esRenderMarketingAuth();
  esLoadWorkspaces();
  esLoadNotifications();
  // Complete pending subscription if any
  const pending = esPendingSub();
  if (pending) {
    esClearPendingSub();
    if (pending.type === 'strand') esSubscribeToStrand(pending.id);
    else if (pending.type === 'braid') esSubscribeToBraid(pending.id);
  }
  // If URL hash pointed at a view, don't redirect — stay on it
  if (!window.location.hash || window.location.hash === '#') {
    esGoto('dashboard');
  }
}

function esRenderNavAuth() {
  if (!ES_USER) {
    document.getElementById('nav-auth-area').style.display = 'none';
    document.getElementById('nav-signin-btn').style.display = 'flex';
    document.getElementById('nav-build-btn').style.display = 'flex';
    const appAvatar = document.getElementById('app-avatar');
    if (appAvatar) appAvatar.style.display = 'none';
    return;
  }
  document.getElementById('nav-signin-btn').style.display = 'none';
  document.getElementById('nav-build-btn').style.display = 'flex';
  document.getElementById('nav-auth-area').style.display = 'flex';
  const initials = (ES_USER.displayName||ES_USER.email||'?')[0].toUpperCase();
  document.getElementById('nav-avatar').textContent = initials;
  const appAvatar = document.getElementById('app-avatar');
  if (appAvatar) { appAvatar.textContent = initials; appAvatar.style.display = 'flex'; }
  if (ES_USER.picture) {
    [document.getElementById('nav-avatar'), document.getElementById('app-avatar')].forEach(el => {
      if (!el) return;
      el.innerHTML = `<img src="${ES_USER.picture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    });
  }
}

function esRenderMarketingAuth() {
  const out = document.getElementById('auth-signedout');
  const inn = document.getElementById('auth-signedin');
  if (!out || !inn) return;
  if (ES_USER) {
    out.style.display = 'none';
    inn.style.display = 'block';
    const g = document.getElementById('user-greeting-marketing');
    const h = document.getElementById('user-handle-marketing');
    const a = document.getElementById('user-avatar-marketing');
    if (g) g.textContent = 'Welcome back, ' + (ES_USER.displayName||'friend') + '!';
    if (h) h.textContent = '@' + (ES_USER.handle||'…');
    if (a) { a.textContent = (ES_USER.displayName||'?')[0].toUpperCase(); }
    if (ES_USER.picture && a) a.innerHTML = `<img src="${ES_USER.picture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    out.style.display = 'block';
    inn.style.display = 'none';
  }
}

function esShowAuth(reason) {
  const modal = document.getElementById('es-auth-modal');
  const r = document.getElementById('auth-modal-reason');
  if (r && reason) r.textContent = reason;
  modal.classList.add('open');
  // Always clear and re-render the Google button when the modal opens.
  // GIS can't render correctly into display:none containers — the iframe ends up with
  // zero dimensions and stays invisible. Clearing innerHTML and re-rendering each time
  // the modal becomes visible guarantees a properly sized, visible button.
  const modEl = document.getElementById('g_signin_modal');
  if (modEl && window.google?.accounts?.id) {
    modEl.innerHTML = '';
    google.accounts.id.renderButton(modEl, { theme:'filled_black', size:'large', width:280 });
  }
}

function esCloseAuth() {
  document.getElementById('es-auth-modal').classList.remove('open');
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-name').value = '';
  esHideForgotPassword();
}

// ── CURATED LIBRARY DEMO ──────────────────────────────────────
function esInstallCuratedDemo() {
  if (ES_USER) {
    showToast('Curated strands launching soon — we\'ll notify you when ready');
  } else {
    esShowAuth('Sign in and we\'ll save your spot for curated strands');
  }
}

// ── PERSONAL STRANDS — DASHBOARD TAB ──────────────────────────
// Jump to builder with the personal type pre-selected. Lets users
// bypass the "what type are you creating this for" picker when they
// click into the Personal Strands tab and hit + New.
function esGotoBuildPersonal() {
  if (!ES_USER) { esShowAuth('Sign in to create a personal strand'); return; }
  esGoto('home');
  setTimeout(() => {
    const el = document.getElementById('builder');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const btn = document.querySelector('.type-btn[onclick*="\'personal\'"]');
      if (btn) btn.click();
    }, 350);
  }, 100);
}

// Renders the Personal Strands tab. Pulls user strands and filters to
// the personal type. Falls back to the built-in empty state if no
// list element is present (defensive — the panel ID may not always exist).
async function esRenderPersonalStrands() {
  const listEl = document.getElementById('personal-strands-list');
  if (!listEl) return;

  try {
    const res = await esFetch('/api/strands/mine');
    if (!res.ok) return;
    const data = await res.json();
    const personal = (data.strands || []).filter(s => s.type === 'personal');

    if (!personal.length) return; // keep the default empty state

    listEl.innerHTML = personal.map(s => `
      <div class="my-strand-card">
        <div class="my-strand-card-head">
          <div class="my-strand-card-title">${esc(s.title)}</div>
          <div class="my-strand-card-meta">${s.events?.length || 0} event${(s.events?.length || 0) === 1 ? '' : 's'} · ${s.published ? 'live' : 'draft'}</div>
        </div>
        <div class="my-strand-card-actions">
          <button class="btn btn-ghost" onclick="esEditStrand('${s._id}')">Edit</button>
          ${s.published ? `<button class="btn btn-ghost" onclick="esViewPublicStrand('${s.publisherHandle}','${s._id}')">View</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    /* keep default empty state on error */
  }
}

// ── MODAL FOCUS TRAP ──────────────────────────────────────────
const _esFocusTraps = {};

function esTrapFocus(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const previouslyFocused = document.activeElement;
  function getFocusable() {
    return modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }
  function handleKey(e) {
    if (e.key === 'Escape') {
      esReleaseFocus(modalId);
      modal.dispatchEvent(new CustomEvent('es:dismiss'));
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  modal.addEventListener('keydown', handleKey);
  _esFocusTraps[modalId] = { handleKey, previouslyFocused };
  const focusable = getFocusable();
  if (focusable.length) focusable[0].focus();
}

function esReleaseFocus(modalId) {
  const trap = _esFocusTraps[modalId];
  if (!trap) return;
  const modal = document.getElementById(modalId);
  if (modal) modal.removeEventListener('keydown', trap.handleKey);
  if (trap.previouslyFocused?.focus) { try { trap.previouslyFocused.focus(); } catch(_) {} }
  delete _esFocusTraps[modalId];
}

['es-auth-modal', 'es-handle-modal'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const obs = new MutationObserver(() => {
    if (el.classList.contains('open')) esTrapFocus(id);
    else esReleaseFocus(id);
  });
  obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  el.addEventListener('es:dismiss', () => {
    if (id === 'es-auth-modal') esCloseAuth();
    else el.classList.remove('open');
  });
});

// ── FORGOT PASSWORD (sub-view inside auth modal) ──────────────
function esShowForgotPassword() {
  ['auth-email','auth-password','auth-name','auth-error','auth-submit-btn','auth-forgot-link','auth-tab-signin','auth-tab-register','auth-account-type','g_signin_modal','auth-modal-reason'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('#es-auth-modal > .auth-modal-box > div').forEach(d => {
    if (d.querySelector('#g_signin_modal') || (d.textContent || '').toLowerCase().includes('continue with email')) {
      d.style.display = 'none';
    }
  });
  const ff = document.getElementById('auth-forgot-form');
  if (ff) ff.style.display = 'flex';
}

function esHideForgotPassword() {
  const ff = document.getElementById('auth-forgot-form');
  if (ff) ff.style.display = 'none';
  const msg = document.getElementById('auth-forgot-msg'); if (msg) msg.textContent = '';
  const email = document.getElementById('auth-forgot-email'); if (email) email.value = '';
  ['auth-email','auth-password','auth-error','auth-submit-btn','auth-forgot-link','auth-tab-signin','auth-tab-register','g_signin_modal','auth-modal-reason'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  const nameEl = document.getElementById('auth-name');
  if (nameEl) nameEl.style.display = (typeof _esAuthMode !== 'undefined' && _esAuthMode === 'register') ? 'block' : 'none';
  const acctEl = document.getElementById('auth-account-type');
  if (acctEl) acctEl.style.display = (typeof _esAuthMode !== 'undefined' && _esAuthMode === 'register') ? 'block' : 'none';
  document.querySelectorAll('#es-auth-modal > .auth-modal-box > div').forEach(d => {
    if (d.style.display === 'none' && (d.querySelector('#g_signin_modal') || (d.textContent || '').toLowerCase().includes('continue with email'))) {
      d.style.display = '';
    }
  });
}

async function esSubmitForgotPassword() {
  const email = document.getElementById('auth-forgot-email').value.trim();
  const msg = document.getElementById('auth-forgot-msg');
  if (!email) { msg.textContent = 'Enter your email address'; msg.style.color = '#ff6b6b'; return; }
  msg.textContent = 'Sending…';
  msg.style.color = 'var(--text-dim)';
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      msg.textContent = d.error || 'Could not send reset email';
      msg.style.color = '#ff6b6b';
      return;
    }
    msg.textContent = 'If an account exists for that email, a reset link is on its way.';
    msg.style.color = '#11DBA6';
  } catch (e) {
    msg.textContent = 'Connection error — try again';
    msg.style.color = '#ff6b6b';
  }
}

// ── RESET PASSWORD (full-page view at #/reset-password?token=…) ─
let _esResetToken = '';
function esShowResetPassword(token) {
  if (!token) { showToast('Reset link is missing or invalid', 'error'); window.location.hash = '/'; return; }
  _esResetToken = token;
  esHideAllPublicViews();
  const v = document.getElementById('es-reset-view');
  if (v) { v.style.display = 'block'; setTimeout(() => document.getElementById('es-reset-pw')?.focus(), 50); }
}

async function esSubmitResetPassword() {
  const pw = document.getElementById('es-reset-pw').value;
  const pw2 = document.getElementById('es-reset-pw2').value;
  const msg = document.getElementById('es-reset-msg');
  if (pw.length < 8) { msg.textContent = 'Password must be at least 8 characters'; return; }
  if (pw !== pw2)    { msg.textContent = 'Passwords don\'t match'; return; }
  msg.textContent = '';
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ token: _esResetToken, password: pw }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { msg.textContent = d.error || 'Could not reset password'; return; }
    if (d.token && d.user) {
      ES_USER = { ...d.user, jwt: d.token };
      try { localStorage.setItem('es_user', JSON.stringify(ES_USER)); } catch(_) {}
      if (typeof esRenderAuthState === 'function') esRenderAuthState();
    }
    showToast('✓ Password reset — you\'re signed in');
    window.location.hash = ES_USER ? '/dashboard' : '/';
  } catch (e) {
    msg.textContent = 'Connection error — try again';
  }
}

// ── EMAIL VERIFICATION (full-page view at #/verify?token=…) ────
async function esHandleVerifyToken(token) {
  esHideAllPublicViews();
  const v = document.getElementById('es-verify-view');
  if (v) v.style.display = 'block';
  const msgEl = document.getElementById('es-verify-msg');
  const titleEl = v?.querySelector('h2');
  if (!token) {
    if (titleEl) titleEl.textContent = 'Verification link missing';
    if (msgEl) msgEl.textContent = 'The link in your email is incomplete. Open it directly from the email.';
    return;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ token }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (titleEl) titleEl.textContent = 'Verification failed';
      if (msgEl) msgEl.textContent = d.error || 'This link is no longer valid. Sign in and request a new one from your account settings.';
      return;
    }
    if (titleEl) titleEl.textContent = 'Email verified ✓';
    if (msgEl) msgEl.textContent = `${d.email} is confirmed. You're all set.`;
    if (ES_USER) {
      ES_USER.emailVerified = true;
      try { localStorage.setItem('es_user', JSON.stringify(ES_USER)); } catch(_) {}
      if (typeof esRenderAuthState === 'function') esRenderAuthState();
    }
  } catch (e) {
    if (titleEl) titleEl.textContent = 'Connection error';
    if (msgEl) msgEl.textContent = 'Couldn\'t reach the server. Check your internet and try the link again.';
  }
}

function esHideAllPublicViews() {
  const overlay = document.getElementById('es-public-overlay');
  if (overlay) overlay.style.display = 'block';
  document.querySelectorAll('.public-view, [id^="es-public-"], #es-verify-view, #es-reset-view').forEach(el => {
    if (el && el.style) el.style.display = 'none';
  });
  document.getElementById('es-auth-modal')?.classList.remove('open');
}

function esRenderVerifyBanner() {
  if (!ES_USER) return;
  let banner = document.getElementById('es-verify-banner');
  if (ES_USER.emailVerified) { if (banner) banner.remove(); return; }
  if (banner) return;
  banner = document.createElement('div');
  banner.id = 'es-verify-banner';
  banner.style.cssText = 'position:sticky;top:0;z-index:50;background:rgba(108,143,255,0.16);border-bottom:1px solid rgba(108,143,255,0.4);padding:10px 20px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--text);';
  banner.innerHTML = `
    <span>📧 Please verify your email (${(typeof esc === 'function' ? esc(ES_USER.email) : ES_USER.email)}) to unlock all features.</span>
    <button onclick="esResendVerification(this)" style="background:var(--primary);color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;">Resend email</button>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-faint);font-size:18px;cursor:pointer;line-height:1;" aria-label="Dismiss verification banner">×</button>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
}

async function esResendVerification(btn) {
  if (!ES_USER) return;
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'Authorization': 'Bearer ' + esGetJwt()},
    });
    if (res.ok) { btn.textContent = 'Sent ✓'; showToast('Verification email sent — check your inbox'); }
    else {
      btn.textContent = 'Resend email'; btn.disabled = false;
      const d = await res.json().catch(() => ({}));
      showToast(d.error || 'Could not resend — try again later', 'error');
    }
  } catch (e) {
    btn.textContent = 'Resend email'; btn.disabled = false;
    showToast('Connection error', 'error');
  }
}


let _esAuthMode = 'signin';
function esAuthTab(mode) {
  _esAuthMode = mode;
  const isRegister = mode === 'register';
  if (typeof esHideForgotPassword === 'function') esHideForgotPassword();
  const fl = document.getElementById('auth-forgot-link');
  if (fl) fl.style.display = isRegister ? 'none' : 'block';
  document.getElementById('auth-tab-signin').style.borderBottomColor    = isRegister ? 'transparent' : 'var(--primary)';
  document.getElementById('auth-tab-signin').style.color                = isRegister ? 'var(--text-dim)' : 'var(--text)';
  document.getElementById('auth-tab-register').style.borderBottomColor  = isRegister ? 'var(--primary)' : 'transparent';
  document.getElementById('auth-tab-register').style.color              = isRegister ? 'var(--text)' : 'var(--text-dim)';
  document.getElementById('auth-name').style.display                    = isRegister ? 'block' : 'none';
  document.getElementById('auth-account-type').style.display            = isRegister ? 'block' : 'none';
  document.getElementById('auth-submit-btn').textContent                = isRegister ? 'Create Account' : 'Sign In';
  document.getElementById('auth-error').textContent = '';
}

// Highlight selected account type radio border
(function() {
  function syncAccountTypeHighlight() {
    const personal = document.getElementById('auth-type-personal');
    const venue    = document.getElementById('auth-type-venue');
    if (!personal || !venue) return;
    document.getElementById('auth-type-personal-label').style.borderColor = personal.checked ? 'var(--primary)' : 'var(--border2)';
    document.getElementById('auth-type-venue-label').style.borderColor    = venue.checked    ? 'var(--primary)' : 'var(--border2)';
  }
  document.addEventListener('change', function(e) {
    if (e.target && e.target.name === 'auth-account-type') syncAccountTypeHighlight();
  });
})();

async function esAuthSubmit() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name     = document.getElementById('auth-name').value.trim();
  const errEl    = document.getElementById('auth-error');
  const btn      = document.getElementById('auth-submit-btn');

  if (!email || !password) { errEl.textContent = 'Email and password are required.'; return; }

  btn.disabled = true;
  btn.textContent = _esAuthMode === 'register' ? 'Creating account…' : 'Signing in…';
  errEl.textContent = '';

  const endpoint = _esAuthMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const accountType = document.querySelector('input[name="auth-account-type"]:checked')?.value || 'personal';
  const body = _esAuthMode === 'register'
    ? { email, password, displayName: name || undefined, accountType }
    : { email, password };

  try {
    const res  = await fetch(BACKEND_URL + endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Something went wrong.'; return; }
    // B-5: backend returns { ok: true } (no token/user) when email already exists,
    // to prevent enumeration. Show a helpful message instead of crashing on data.user.handle.
    if (!data.token || !data.user) {
      errEl.style.color = 'var(--primary)';
      errEl.textContent = 'Check your inbox — if an account already exists for this email, we sent you a sign-in reminder.';
      return;
    }
    esSetJwt(data.token);
    ES_USER = data.user;
    esSetStoredUser(data.user);
    if (!data.user.handle) {
      esCloseAuth();
      esShowHandleSetup();
    } else {
      esOnSignedIn();
    }
  } catch(e) {
    errEl.textContent = 'Network error — please try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = _esAuthMode === 'register' ? 'Create Account' : 'Sign In';
  }
}



function esShowHandleSetup() {
  document.getElementById('es-handle-modal').classList.add('open');
}

let _handleTimer = null;
function esCheckHandle(val) {
  const status = document.getElementById('handle-status');
  if (!status) return;
  clearTimeout(_handleTimer);
  if (!val) { status.textContent = ''; return; }
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(val)) {
    status.style.color = 'var(--text-faint)';
    status.textContent = 'Letters, numbers, - and _ only (3–30 chars)';
    return;
  }
  status.textContent = 'Checking…'; status.style.color = 'var(--text-faint)';
  _handleTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/check-handle?handle=${val}`);
      const d = await res.json();
      if (d.available) { status.textContent = '✓ ' + val + ' is available'; status.style.color = 'var(--green)'; }
      else { status.textContent = '✗ That handle is taken'; status.style.color = 'var(--red)'; }
    } catch(e) { status.textContent = ''; }
  }, 500);
}

async function esConfirmHandle() {
  const val = document.getElementById('handle-input').value.trim();
  if (!val || !/^[a-zA-Z0-9_-]{3,30}$/.test(val)) { showToast('Enter a valid handle first', 'error'); return; }
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/set-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + esGetJwt() },
      body: JSON.stringify({ handle: val })
    });
    const d = await res.json();
    if (!res.ok) { showToast(d.error || 'Could not set handle', 'error'); return; }
    ES_USER.handle = val;
    esSetStoredUser(ES_USER);
    document.getElementById('es-handle-modal').classList.remove('open');
    esOnSignedIn();
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

// ── API KEY MANAGEMENT ────────────────────────────────────────

let _revealedKey = '';

function esShowApiKeyForm() {
  document.getElementById('apikey-create-form').style.display = 'block';
  document.getElementById('apikey-label').focus();
}

function esHideApiKeyForm() {
  document.getElementById('apikey-create-form').style.display = 'none';
  document.getElementById('apikey-label').value = '';
  document.querySelectorAll('#apikey-scopes input[type=checkbox]').forEach(cb => {
    cb.checked = cb.value === 'portal:read' || cb.value === 'strand:read';
  });
}

async function esLoadApiKeys() {
  const list = document.getElementById('apikey-list');
  if (!list) return;
  try {
    const res = await esFetch('/api/apikeys');
    const data = await res.json();
    if (!data.keys?.length) {
      list.innerHTML = '<div style="font-size:13px;color:var(--text-faint);">No keys yet.</div>';
      return;
    }
    list.innerHTML = data.keys.map(k => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:2px;">${k.label}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-faint);">${k.prefix}••••••••</div>
          <div style="font-size:11px;color:var(--text-faint);margin-top:4px;">${k.scopes.join(' · ')}${k.lastUsed?' · Last used '+new Date(k.lastUsed).toLocaleDateString():' · Never used'}</div>
        </div>
        <button onclick="esRevokeApiKey('${k.id}')" style="background:none;border:1px solid var(--border2);border-radius:8px;color:var(--text-faint);font-size:12px;padding:6px 12px;cursor:pointer;" onmouseover="this.style.color='var(--red)';this.style.borderColor='var(--red)'" onmouseout="this.style.color='var(--text-faint)';this.style.borderColor='var(--border2)'">Revoke</button>
      </div>`).join('');
  } catch(e) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text-faint);">Could not load keys.</div>';
  }
}

async function esCreateApiKey() {
  const label = document.getElementById('apikey-label').value.trim();
  if (!label) { showToast('Enter a label for this key', 'error'); return; }
  const scopes = [...document.querySelectorAll('#apikey-scopes input[type=checkbox]:checked')].map(cb => cb.value);
  if (!scopes.length) { showToast('Select at least one scope', 'error'); return; }
  try {
    const res = await esFetch('/api/apikeys', { method: 'POST', body: JSON.stringify({ label, scopes }) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Could not create key', 'error'); return; }
    esHideApiKeyForm();
    esLoadApiKeys();
    _revealedKey = data.key;
    document.getElementById('apikey-reveal-value').textContent = data.key;
    document.getElementById('apikey-reveal-modal').style.display = 'flex';
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esRevokeApiKey(id) {
  if (!confirm('Revoke this key? Any tool using it will immediately lose access.')) return;
  try {
    const res = await esFetch(`/api/apikeys/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('Key revoked'); esLoadApiKeys(); }
    else showToast('Could not revoke key', 'error');
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

function esCopyApiKey() {
  navigator.clipboard.writeText(_revealedKey).then(() => showToast('✓ Key copied to clipboard'));
}

function esCloseApiKeyReveal() {
  document.getElementById('apikey-reveal-modal').style.display = 'none';
  _revealedKey = '';
}

async function esSignOut() {
  ES_USER = null;
  ES_WORKSPACES = [];
  esClearJwt();
  esRenderNavAuth();
  esRenderMarketingAuth();
  esCloseApp();
  showToast('👋 Signed out');
}

function esNavHome() {
  if (document.getElementById('es-app').style.display !== 'none') {
    esCloseApp();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── HASH ROUTER ───────────────────────────────────────────────
let _navHistory = [];

function esGoto(view, params) {
  _navHistory.push(view);
  _showView(view, params);
}

function esBack() {
  _navHistory.pop();
  const prev = _navHistory[_navHistory.length-1] || 'dashboard';
  _showView(prev);
}

function esCloseApp() {
  document.getElementById('es-app').style.display = 'none';
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  _navHistory = [];
}

function _showView(view, params) {
  const app = document.getElementById('es-app');
  app.style.display = 'flex';
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  app.scrollTop = 0;

  if (view === 'dashboard') esRenderDashboard();
  else if (view === 'workspaces') esRenderWorkspaces();
  else if (view === 'account') esRenderAccount();
  else if (view === 'braid-build') esRenderBraidBuilder();
  else if (view === 'build') esGotoBuild();
}

function esHandleHash() {
  const hash = window.location.hash.replace('#','');
  if (!hash || hash === '/') return;
  // Split off any query string appended by the 404 redirect shim (e.g. ?src=qr)
  const [hashPath, hashQuery] = hash.split('?');
  const _src = hashQuery ? new URLSearchParams(hashQuery).get('src') : null;
  const parts = hashPath.replace(/^\//, '').split('/');
  const type = parts[0];
  if (type === 's' && parts[1] && parts[2]) {
    esLoadPublicStrand(parts[1], parts[2], _src);
  } else if (type === 'b' && parts[1] && parts[2]) {
    esLoadPublicBraid(parts[1], parts[2], _src);
  } else if (type === 'p' && parts[1]) {
    esLoadPublicProfile(parts[1]);
  } else if (type === 'dashboard' && ES_USER) {
    esGoto('dashboard');
  } else if (type === 'builder') {
    const builderSection = document.getElementById('builder');
    if (builderSection) builderSection.scrollIntoView({behavior:'smooth'});
  } else if (type === 'account') {
    const accountSection = document.getElementById('account');
    if (accountSection) accountSection.scrollIntoView({behavior:'smooth'});
  } else if (type === 'verify') {
    const token = hashQuery ? new URLSearchParams(hashQuery).get('token') : '';
    esHandleVerifyToken(token);
  } else if (type === 'reset-password') {
    const token = hashQuery ? new URLSearchParams(hashQuery).get('token') : '';
    esShowResetPassword(token);
  } else if (type === 'forgot-password') {
    esShowAuth('');
    setTimeout(() => esShowForgotPassword(), 50);
  }
}

function esGotoBuild() {
  if (!ES_USER) { esPendingSub({type:'build'}); esShowAuth('Sign in to publish strands'); return; }
  esCloseApp();
  const builderSection = document.getElementById('builder');
  if (builderSection) { builderSection.scrollIntoView({behavior:'smooth'}); }
}

// ── DASHBOARD ─────────────────────────────────────────────────
let _activeDashTab = 'upcoming';
let _activeWorkspaceId = null;
let _dashCalView = 'week';

// Library strands (EventStrand-curated)
let _libraryStrands = null;
let _libraryFilter  = 'all';

function esSetCalView(view, btn) {
  _dashCalView = view;
  document.querySelectorAll('.cal-view-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const labels = { today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year' };
  const labelEl = document.getElementById('cal-view-label');
  if (labelEl) labelEl.textContent = labels[view] || '';
  esLoadUpcoming();
}

function esDashTab(el, tab) {
  _activeDashTab = tab;
  document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.dash-panel').forEach(p => p.style.display = 'none');
  const panelEl = document.getElementById(`dash-${tab}`);
  if (panelEl) panelEl.style.display = 'block';
  if (tab === 'subscriptions') esRenderInbox();
  if (tab === 'my-strands') esRenderMyStrands();
  if (tab === 'personal') esRenderPersonalStrands();
  if (tab === 'my-braids') esRenderMyBraids();
  if (tab === 'library') esLoadLibraryStrands();
}

async function esRenderDashboard() {
  if (!ES_USER) { esShowAuth(); return; }
  esRenderVerifyBanner();
  esRestoreNotes();
  esRenderWorkspaceBar();
  await esLoadUpcoming();
}

function esRenderWorkspaceBar() {
  const bar = document.getElementById('dash-workspace-bar');
  if (!bar) return;
  const allWs = [{_id:'all', name:'All', icon:'🌐'}, ...ES_WORKSPACES];
  bar.innerHTML = allWs.map(ws =>
    `<button onclick="esSetActiveWorkspace('${ws._id}',this)"
      style="background:${_activeWorkspaceId===ws._id||(!_activeWorkspaceId&&ws._id==='all')?'var(--primary)':'var(--surface)'};
      color:${_activeWorkspaceId===ws._id||(!_activeWorkspaceId&&ws._id==='all')?'white':'var(--text-dim)'};
      border:1px solid ${_activeWorkspaceId===ws._id||(!_activeWorkspaceId&&ws._id==='all')?'var(--primary)':'var(--border)'};
      padding:6px 16px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all 0.2s;">
      ${esc(ws.icon||'')} ${esc(ws.name)}</button>`
  ).join('');
}

function esSetActiveWorkspace(id, btn) {
  _activeWorkspaceId = id === 'all' ? null : id;
  esRenderWorkspaceBar();
  esLoadUpcoming();
}

async function esLoadUpcoming() {
  const list = document.getElementById('dash-upcoming-list');
  if (!list) return;
  try {
    const daysByView = { today: 1, week: 7, month: 30, year: 365 };
    const days = daysByView[_dashCalView] || 7;
    const params = new URLSearchParams();
    if (_activeWorkspaceId) params.set('workspaceId', _activeWorkspaceId);
    params.set('days', days);
    const res = await esFetch(`/api/dashboard/upcoming?${params.toString()}`);
    const data = await res.json();
    if (!data.events || !data.events.length) {
      const viewLabels = { today: 'today', week: 'this week', month: 'this month', year: 'this year' };
      const viewLabel = viewLabels[_dashCalView] || 'in this window';
      list.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-title">Nothing on ${viewLabel}</div>
        <div class="empty-state-sub">Subscribe to strands from venues you love. Their events will surface here when they're scheduled.</div>
        <div class="empty-notes"><div class="empty-notes-label">Quick note</div>
        <textarea id="note-upcoming" placeholder="Jot a venue name, a night out idea, something to look up…" oninput="esSaveNote('upcoming',this.value)"></textarea></div></div>`;
      esRestoreNotes();
      return;
    }
    const grouped = {};
    data.events.forEach(ev => { (grouped[ev.date] = grouped[ev.date]||[]).push(ev); });
    list.innerHTML = Object.keys(grouped).sort().map(date => {
      const d = new Date(date+'T00:00:00');
      const isToday = d.toDateString() === new Date().toDateString();
      const isTomorrow = d.toDateString() === new Date(Date.now()+86400000).toDateString();
      const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
      const evRows = grouped[date].map(ev => `
        <div class="event-feed-item">
          <div class="efi-date"><div class="efi-date-day">${d.getDate()}</div><div class="efi-date-mon">${d.toLocaleString('en-US',{month:'short'})}</div></div>
          <div class="efi-body">
            <div class="efi-name">${esc(ev.title||ev.name||'Event')}</div>
            <div class="efi-meta">${esc(ev.venue||'')}${ev.allDay?' · All day':(ev.time?' · '+esc(ev.time):'')}</div>
            <div class="efi-strand">→ ${esc(ev.strandTitle||'')}</div>
            <div class="efi-actions">
              <button class="efi-btn-star${esIsInterested(ev.id||ev._id,ev.date)?' active':''}" onclick="esToggleInterested(this,${JSON.stringify(ev).replace(/'/g,'&#39;')})" title="Star this event">${esIsInterested(ev.id||ev._id,ev.date)?'★':'☆'}</button>
            </div>
          </div>
        </div>`).join('');
      return `<div style="margin-bottom:20px;"><div style="font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${isToday?'var(--green)':'var(--text-faint)'};margin-bottom:8px;">${label}</div>${evRows}</div>`;
    }).join('');
    // Init swipe on each event card
    list.querySelectorAll('.efi-swipe-card').forEach(card => {
      const evDataStr = card.dataset.ev;
      if (evDataStr) { try { esInitSwipe(card, JSON.parse(evDataStr)); } catch(e){} }
    });
  } catch(e) {
    list.innerHTML = `<div style="color:var(--text-dim);padding:20px;text-align:center;">Could not load events — <button onclick="esLoadUpcoming()" style="background:none;border:none;color:var(--primary);cursor:pointer;">retry</button></div>`;
  }
}

async function esRenderInbox() {
  const wsList = document.getElementById('inbox-ws-list');
  const rows = document.getElementById('inbox-rows');
  if (!wsList || !rows) return;
  const allWs = [{_id:'all', name:'All Subscriptions', icon:'🌐'}, ...ES_WORKSPACES];
  let activeWsId = allWs[0]._id;
  wsList.innerHTML = allWs.map((ws,i) => `
    <div class="inbox-ws-tab${i===0?' active':''}" onclick="esInboxSetWs('${ws._id}',this)">
      <span>${esc(ws.icon||'📁')}</span>
      <span class="inbox-ws-name">${esc(ws.name)}</span>
    </div>`).join('');
  esLoadInboxRows('all');
}

async function esInboxSetWs(wsId, el) {
  document.querySelectorAll('.inbox-ws-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  esLoadInboxRows(wsId);
}

async function esLoadInboxRows(wsId) {
  const rows = document.getElementById('inbox-rows');
  if (!rows) return;
  rows.innerHTML = '<div style="padding:24px;color:var(--text-faint);font-size:13px;">Loading…</div>';
  try {
    const q = wsId !== 'all' ? `?workspaceId=${wsId}` : '';
    const res = await esFetch(`/api/user/subscriptions${q}`);
    const data = await res.json();
    if (!data.strands?.length && !data.braids?.length) {
      rows.innerHTML = `<div class="empty-state" style="padding:40px 20px;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-title">No subscriptions yet</div>
        <div class="empty-state-sub">Scan a QR code or share link from any venue to subscribe to their strand.</div></div>`;
      return;
    }
    let html = '';
    (data.braids||[]).forEach(b => {
      html += `<div class="inbox-row inbox-braid-row${b.unread?' unread':''}">
        <div class="inbox-unread-dot" style="opacity:${b.unread?1:0}"></div>
        <span style="font-size:18px;">🪢</span>
        <div class="inbox-row-name">${esc(b.title)}</div>
        <div class="inbox-row-meta">${b.strandCount||0} strands</div>
        <button class="unsub-btn" onclick="esUnsubscribeBraid('${b._id}',event)">Unsubscribe</button>
      </div>`;
    });
    (data.strands||[]).forEach(s => {
      html += `<div class="inbox-row${s.unread?' unread':''}">
        <div class="inbox-unread-dot" style="opacity:${s.unread?1:0}"></div>
        <div class="inbox-row-name">${esc(s.title)}</div>
        <div class="inbox-row-meta">${esc(s.publisherHandle||s.publisher||'')}</div>
        <button class="unsub-btn" onclick="esUnsubscribeStrand('${s._id}',event)">Unsubscribe</button>
      </div>`;
    });
    rows.innerHTML = html;
  } catch(e) {
    rows.innerHTML = '<div style="padding:20px;color:var(--text-faint);">Could not load subscriptions</div>';
  }
}

async function esRenderMyStrands() {
  const list = document.getElementById('my-strands-list');
  if (!list) return;
  try {
    const res = await esFetch('/api/strands/mine');
    const data = await res.json();
    if (!data.strands?.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">🧵</div>
        <div class="empty-state-title">No strands yet</div>
        <div class="empty-state-sub">Build your first strand — a venue schedule, a recurring event series, anything that repeats.</div>
        <button class="btn btn-primary" onclick="esGotoBuild()">Build your first strand →</button>
        <div class="empty-notes" style="margin-top:20px;"><div class="empty-notes-label">Ideas</div>
        <textarea id="note-my-strands" placeholder="Strand ideas — venues to reach out to…" oninput="esSaveNote('my-strands',this.value)"></textarea></div></div>`;
      esRestoreNotes();
      return;
    }
    list.innerHTML = data.strands.map(s => `
      <div class="strand-card">
        <div class="strand-card-header">
          <div class="strand-card-dot" style="background:${s.color||'var(--primary)'}"></div>
          <div class="strand-card-name">${esc(s.title)}</div>
          <span class="pub-status-badge ${s.published?'live':'draft'}">${s.published?'● Live':'○ Draft'}</span>
          ${s.directoryStatus==='verified'?'<span class="pub-status-badge" style="background:rgba(0,210,110,.12);color:#00d26a;border-color:rgba(0,210,110,.3);">✓ Directory</span>':
            s.directoryStatus==='pending'?'<span class="pub-status-badge" style="background:rgba(255,193,7,.1);color:#ffc107;border-color:rgba(255,193,7,.3);">⏳ Verifying</span>':
            s.directoryStatus==='flagged'?'<span class="pub-status-badge" style="background:rgba(255,90,90,.1);color:#ff5a5a;border-color:rgba(255,90,90,.3);" title="Needs manual review">⚑ Review</span>':''}
          <div class="strand-card-subs">${s.subscriberCount||0} subscribers</div>
        </div>
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:10px;">${esc(s.venue||'')}${s.events?.length?' · '+s.events.length+' event'+(s.events.length!==1?'s':''):''}</div>
        <div class="strand-card-actions">
          <button class="sc-btn" onclick="window.location.hash='/s/${ES_USER.handle}/${s._id}'">View public page</button>
          <button class="sc-btn" onclick="esEditStrand('${s._id}')">Edit</button>
          <button class="sc-btn" onclick="esOpenAnalytics('${s._id}')">Analytics</button>
          <button class="sc-btn primary" onclick="esShowStrandQR('${s._id}','${escAttr(s.title)}')">QR Code</button>
          ${!s.published ? `<button class="sc-btn" style="background:var(--green-glow);color:var(--green);border-color:var(--green);" onclick="esPublishExistingStrand('${s._id}',this)">Publish →</button>` : ''}
          <button class="sc-btn" style="color:var(--red);border-color:var(--red);" onclick="esDeleteStrand('${s._id}','${escAttr(s.title)}')">Delete</button>
        </div>
      </div>`).join('');
  } catch(e) {
    list.innerHTML = '<div style="color:var(--text-dim);padding:20px;">Could not load your strands</div>';
  }
}

async function esRenderMyBraids() {
  const list = document.getElementById('my-braids-list');
  if (!list) return;
  try {
    const res = await esFetch('/api/braids/mine');
    const data = await res.json();
    if (!data.braids?.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">🪢</div>
        <div class="empty-state-title">No braids yet</div>
        <div class="empty-state-sub">Bundle multiple strands under one QR code.</div>
        <button class="btn btn-primary" onclick="esGoto('braid-build')">Create a braid →</button>
        <div class="empty-notes" style="margin-top:20px;"><div class="empty-notes-label">Braid ideas</div>
        <textarea id="note-my-braids" placeholder="Theme ideas, strand combinations to bundle…" oninput="esSaveNote('my-braids',this.value)"></textarea></div></div>`;
      esRestoreNotes();
      return;
    }
    list.innerHTML = data.braids.map(b => `
      <div class="strand-card">
        <div class="strand-card-header">
          <span style="font-size:20px;">🪢</span>
          <div class="strand-card-name">${esc(b.title)}</div>
          <span class="pub-status-badge ${b.published?'live':'draft'}">${b.published?'● Live':'○ Draft'}</span>
          <div class="strand-card-subs">${b.subscriberCount||0} subscribers</div>
        </div>
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:10px;">${b.strands?.length||0} strands</div>
        <div class="strand-card-actions">
          <button class="sc-btn primary" onclick="esShowBraidQR('${b._id}','${escAttr(b.title)}')">QR Code</button>
          <button class="sc-btn" onclick="esOpenBraidAnalytics('${b._id}')">Analytics</button>
          <button class="sc-btn" onclick="esEditBraid('${b._id}')">Edit</button>
          <button class="sc-btn" style="color:var(--red);border-color:var(--red);" onclick="esDeleteBraid('${b._id}','${escAttr(b.title)}')">Delete</button>
        </div>
      </div>`).join('');
  } catch(e) {
    list.innerHTML = '<div style="color:var(--text-dim);padding:20px;">Could not load your braids</div>';
  }
}

// ── SUBSCRIBE ─────────────────────────────────────────────────
async function esSubscribeToStrand(strandId, workspaceId) {
  if (!ES_USER) {
    esPendingSub({type:'strand', id:strandId});
    esShowAuth('Sign in to subscribe to this strand');
    return;
  }
  try {
    const res = await esFetch('/api/user/strands', {
      method:'POST',
      body: JSON.stringify({ strandId, workspaceId: workspaceId || (ES_WORKSPACES[0]?._id) })
    });
    if (res.ok) showToast('✓ Subscribed — this strand is now in your dashboard');
    else { const d = await res.json(); showToast(d.error||'Could not subscribe', 'error'); }
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esUnsubscribeStrand(strandId, e) {
  e?.stopPropagation();
  try {
    await esFetch(`/api/user/strands/${strandId}`, {method:'DELETE'});
    showToast('Unsubscribed');
    esLoadInboxRows(_activeWorkspaceId||'all');
  } catch(err) {}
}

async function esSubscribeToBraid(braidId, workspaceId) {
  if (!ES_USER) {
    esPendingSub({type:'braid', id:braidId});
    esShowAuth('Sign in to subscribe to this braid');
    return;
  }
  try {
    const res = await esFetch('/api/user/braids', {
      method:'POST',
      body: JSON.stringify({ braidId, workspaceId: workspaceId || (ES_WORKSPACES[0]?._id) })
    });
    if (res.ok) showToast('✓ Braid subscribed — all strands added to your dashboard');
    else { const d = await res.json(); showToast(d.error||'Could not subscribe', 'error'); }
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esUnsubscribeBraid(braidId, e) {
  e?.stopPropagation();
  try {
    await esFetch(`/api/user/braids/${braidId}`, {method:'DELETE'});
    showToast('Unsubscribed from braid');
    esLoadInboxRows(_activeWorkspaceId||'all');
  } catch(err) {}
}

// ── LIBRARY STRANDS ───────────────────────────────────────────
async function esLoadLibraryStrands() {
  const grid = document.getElementById('dash-library-grid');
  if (!grid) return;
  if (!_libraryStrands) {
    grid.innerHTML = '<div style="color:var(--text-faint);font-size:14px;padding:24px 0;grid-column:1/-1;">Loading…</div>';
    try {
      const res = await fetch(`${BACKEND_URL}/api/library/strands`);
      const data = await res.json();
      _libraryStrands = data.strands || [];
    } catch(e) {
      _libraryStrands = [];
    }
  }
  esRenderLibraryStrands();
}

function esLibFilter(cat, btn) {
  _libraryFilter = cat;
  document.querySelectorAll('#lib-filter-chips .filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  esRenderLibraryStrands();
}

function esRenderLibraryStrands() {
  const grid = document.getElementById('dash-library-grid');
  if (!grid) return;
  const filtered = (_libraryStrands || []).filter(s =>
    _libraryFilter === 'all' || s.libraryCategory === _libraryFilter
  );
  if (!filtered.length) {
    grid.innerHTML = '<div style="color:var(--text-faint);font-size:14px;padding:32px 0;grid-column:1/-1;text-align:center;">No library strands yet — check back soon.</div>';
    return;
  }
  const catEmoji = { holiday:'🎉', sport:'⚽', cultural:'🌍', seasonal:'🌿', personal:'📋', general:'📌' };
  const CAT_COLORS = {
    holiday: 'linear-gradient(135deg,#1a2070,#6C8FFF)',
    sport:   'linear-gradient(135deg,#0a1a44,#2050c0)',
    cultural:'linear-gradient(135deg,#2d1060,#9B6DFF)',
    seasonal:'linear-gradient(135deg,#0e3d24,#22D48A)',
    personal:'linear-gradient(135deg,#1a0b48,#7B5EFF)',
    general: 'linear-gradient(135deg,#1a1a2e,#6C8FFF)',
  };
  grid.innerHTML = filtered.map(s => {
    const cat   = s.libraryCategory || 'general';
    const emoji = catEmoji[cat] || '📌';
    const bg    = s.color ? `background:${s.color}` : `background:${CAT_COLORS[cat] || CAT_COLORS.general}`;
    const evc   = s.events?.length || 0;
    const subs  = s.subscriberCount || 0;
    const wsOpts = ES_USER ? ES_WORKSPACES.map(w =>
      `<option value="${w._id}">${esc(w.icon||'')} ${esc(w.name)}</option>`).join('') : '';
    return `
    <div class="strand-card" style="cursor:default;">
      <div class="strand-card-img" style="${bg};"><span style="font-size:28px;position:relative;z-index:1;">${emoji}</span></div>
      <div class="strand-card-body">
        <div class="strand-card-name">${esc(s.title)}</div>
        <div class="strand-card-desc">${esc(s.description || '')}</div>
      </div>
      <div class="strand-card-footer">
        <span class="strand-card-meta">${evc} event${evc === 1 ? '' : 's'} · ${subs} subscriber${subs === 1 ? '' : 's'}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          ${ES_USER && wsOpts ? `<select id="lib-ws-${s._id}" style="background:var(--surface);border:1px solid var(--border2);border-radius:6px;color:var(--text-dim);font-family:'Outfit',sans-serif;font-size:11px;padding:4px 6px;">${wsOpts}</select>` : ''}
          <button class="strand-install-btn" onclick="esSubscribeToStrand('${s._id}',${ES_USER && wsOpts ? `document.getElementById('lib-ws-${s._id}')?.value` : 'undefined'})">+ Install</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── OCCURRENCE ENGINE (past dates viewer) ─────────────────────
// Expands a strand event's schedule into concrete date occurrences
// within a given [fromMs, toMs] window. Used to compute the past
// dates shown on the public strand page.

const _OCC_MONTHS3 = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const _OCC_DAYS_LC = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const _OCC_EPOCH_MON = new Date(2024, 0, 1).getTime(); // 2024-01-01 is a Monday

function _occToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _occParseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function _occNthWeekday(year, month, dayOfWeek, n) {
  // n: 0=first … 3=fourth, 4=last
  if (n === 4) {
    const d = new Date(year, month + 1, 0);
    while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() - 1);
    return new Date(d);
  }
  const d = new Date(year, month, 1);
  while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + n * 7);
  return d.getMonth() === month ? new Date(d) : null;
}

function _expandRule(rule, fromMs, toMs) {
  const results = [];
  const every = rule.every || 1;

  const ssIdx = rule.season_start ? _OCC_MONTHS3.indexOf(rule.season_start) : -1;
  const seIdx = rule.season_end   ? _OCC_MONTHS3.indexOf(rule.season_end)   : -1;

  function inSeason(d) {
    if (ssIdx < 0 && seIdx < 0) return true;
    const mo = d.getMonth();
    const s = ssIdx >= 0 ? ssIdx : 0;
    const e = seIdx >= 0 ? seIdx : 11;
    return s <= e ? mo >= s && mo <= e : mo >= s || mo <= e;
  }

  function inRuleRange(d) {
    if (rule.start_date && d < _occParseDate(rule.start_date)) return false;
    if (rule.end_date   && d > _occParseDate(rule.end_date))   return false;
    return true;
  }

  function push(d) {
    const ms = d.getTime();
    if (ms >= fromMs && ms <= toMs && inSeason(d) && inRuleRange(d)) {
      results.push({ date: _occToStr(d), time_start: rule.time_start, time_end: rule.time_end });
    }
  }

  if (rule.pattern === 'daily') {
    const cur = new Date(fromMs);
    while (cur.getTime() <= toMs) { push(new Date(cur)); cur.setDate(cur.getDate() + every); }
  }

  else if (rule.pattern === 'weekly' || rule.pattern === 'weekdays') {
    const dayMap3 = { mon:1, tue:2, wed:3, thu:4, fri:5, sat:6, sun:0 };
    let targets;
    if (rule.pattern === 'weekdays') {
      targets = [1,2,3,4,5];
    } else {
      targets = [...new Set((rule.days || []).flatMap(raw => {
        const d = raw.toLowerCase();
        if (d === 'weekend') return [0, 6];
        if (d === 'weekday') return [1,2,3,4,5];
        if (dayMap3[d] !== undefined) return [dayMap3[d]];
        const i = _OCC_DAYS_LC.indexOf(d);
        return i >= 0 ? [i] : [];
      }))];
    }
    const cur = new Date(fromMs);
    while (cur.getTime() <= toMs) {
      if (targets.includes(cur.getDay())) {
        const wk = Math.floor((cur.getTime() - _OCC_EPOCH_MON) / (7 * 86400000));
        if (((wk % every) + every) % every === 0) push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  else if (rule.pattern === 'monthly_week') {
    const weekNames = ['first','second','third','fourth','last'];
    const wn  = weekNames.indexOf(rule.month_week || 'first');
    const raw = ((rule.days || [])[0] || 'monday').toLowerCase();
    const dayMap3 = { mon:1, tue:2, wed:3, thu:4, fri:5, sat:6, sun:0 };
    const di  = _OCC_DAYS_LC.indexOf(raw) >= 0 ? _OCC_DAYS_LC.indexOf(raw) : (dayMap3[raw] ?? 1);
    const cur = new Date(new Date(fromMs).getFullYear(), new Date(fromMs).getMonth(), 1);
    while (cur.getTime() <= toMs) {
      const occ = _occNthWeekday(cur.getFullYear(), cur.getMonth(), di, wn);
      if (occ) push(occ);
      cur.setMonth(cur.getMonth() + every);
    }
  }

  else if (rule.pattern === 'monthly_date') {
    const md  = rule.month_date || 1;
    const cur = new Date(new Date(fromMs).getFullYear(), new Date(fromMs).getMonth(), 1);
    while (cur.getTime() <= toMs) {
      const maxDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      if (md <= maxDay) push(new Date(cur.getFullYear(), cur.getMonth(), md));
      cur.setMonth(cur.getMonth() + every);
    }
  }

  else if (rule.pattern === 'annual') {
    const md = rule.month_date || 1;
    const mo = ssIdx >= 0 ? ssIdx : (seIdx >= 0 ? seIdx : 0);
    for (let y = new Date(fromMs).getFullYear(); y <= new Date(toMs).getFullYear(); y++) {
      push(new Date(y, mo, md));
    }
  }

  return results;
}

function computePastOccurrences(event) {
  const today = new Date(); today.setHours(0,0,0,0);
  const yearAgo = new Date(today); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(23,59,59,999);
  const fromMs = yearAgo.getTime();
  const toMs   = yesterday.getTime();

  // One-off
  if ((event.event_type === 'oneoff' || event.date) && !event.recurrence?.length && !event.dates?.length) {
    if (!event.date) return [];
    const d = _occParseDate(event.date);
    if (d.getTime() >= fromMs && d.getTime() <= toMs)
      return [{ date: event.date, time_start: event.time_start, time_end: event.time_end }];
    return [];
  }

  // Date list — pure curated-dates event (no recurrence). If recurrence is
  // also present, dates[] is handled as extra dates in the Recurring branch below.
  if (event.event_type === 'datelist' || (!event.recurrence?.length && event.dates?.length)) {
    return (event.dates || [])
      .filter(entry => {
        const ds = typeof entry === 'string' ? entry : entry.date;
        const t = _occParseDate(ds).getTime();
        return t >= fromMs && t <= toMs;
      })
      .map(entry => {
        const ds = typeof entry === 'string' ? entry : entry.date;
        return { date: ds, time_start: entry.time_start || event.time_start, time_end: entry.time_end || event.time_end, note: entry.note };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Recurring — expand all rules then merge
  let raw = [];
  for (const rule of (event.recurrence || [])) {
    for (const r of _expandRule(rule, fromMs, toMs)) {
      if (!raw.find(x => x.date === r.date)) raw.push(r);
    }
  }
  // Curated dates[] coexist with recurrence on the same event
  for (const entry of (event.dates || [])) {
    const ds = typeof entry === 'string' ? entry : entry.date;
    if (!ds) continue;
    const t = _occParseDate(ds).getTime();
    if (t < fromMs || t > toMs) continue;
    if (raw.find(x => x.date === ds)) continue;
    raw.push({ date: ds, time_start: entry.time_start, time_end: entry.time_end, note: entry.note });
  }

  // Apply exceptions
  raw = raw.map(occ => {
    for (const ex of (event.exceptions || [])) {
      if (ex.type === 'skip' && ex.date === occ.date) return null;
      if (ex.type === 'cancelled_range' && occ.date >= ex.date && occ.date <= (ex.date_end || ex.date))
        return { ...occ, cancelled: true, exNote: ex.note || 'Cancelled' };
      if (ex.type === 'modified' && ex.date === occ.date)
        return { ...occ, time_start: ex.time_start || occ.time_start, modified: true, exNote: ex.note };
    }
    return occ;
  }).filter(Boolean);

  return raw.sort((a, b) => a.date.localeCompare(b.date));
}

// ── PUBLIC STRAND VIEW ────────────────────────────────────────
async function esLoadPublicStrand(handle, strandId, src) {
  esGoto('strand');
  const inner = document.getElementById('pub-strand-inner');
  const gate = document.getElementById('pub-passcode-gate');
  inner.style.display = 'none';
  gate.style.display = 'none';
  try {
    const srcParam = src ? `?src=${encodeURIComponent(src)}` : '';
    const res = await fetch(`${BACKEND_URL}/api/public/strand/${handle}/${strandId}${srcParam}`);
    if (res.status === 403) { gate.style.display = 'block'; gate.dataset.handle=handle; gate.dataset.strandId=strandId; return; }
    const data = await res.json();
    esRenderStrandView(data.strand);
  } catch(e) {
    document.getElementById('pub-strand-content').innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-dim);">Could not load strand</div>';
  }
}

async function esSubmitPasscode() {
  const gate = document.getElementById('pub-passcode-gate');
  const code = document.getElementById('passcode-input').value;
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/strand/${gate.dataset.handle}/${gate.dataset.strandId}?passcode=${encodeURIComponent(code)}`);
    if (res.status === 403) { showToast('Incorrect passcode', 'error'); return; }
    const data = await res.json();
    gate.style.display = 'none';
    esRenderStrandView(data.strand);
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

function esRenderStrandView(strand) {
  const inner = document.getElementById('pub-strand-inner');
  const header = document.getElementById('pub-strand-header');
  const evList = document.getElementById('pub-strand-events');
  const banner = document.getElementById('pub-signup-banner');
  inner.style.display = 'block';

  const wsOptions = ES_USER ? ES_WORKSPACES.map(w => `<option value="${w._id}">${esc(w.icon||'')} ${esc(w.name)}</option>`).join('') : '';
  header.innerHTML = `
    <div class="pub-strand-type-badge">🧵 Strand</div>
    <div class="pub-strand-title">${esc(strand.title)}</div>
    <div class="pub-strand-venue">${esc(strand.venue||'')}${strand.address?` · ${esc(strand.address)}`:''}</div>
    <div class="pub-strand-meta">
      ${strand.publisherHandle?`<span>@${esc(strand.publisherHandle)}</span>`:''}
      <span class="view-count-badge">👁 ${strand.viewCount||0} views</span>
    </div>
    <div class="pub-subscribe-row">
      ${ES_USER
        ? `${wsOptions?`<select id="sub-ws-sel">${wsOptions}</select>`:''}
           <button class="btn btn-primary" onclick="esSubscribeToStrand('${strand._id}', document.getElementById('sub-ws-sel')?.value)">Subscribe</button>`
        : `<button class="btn btn-primary" onclick="esSubscribeToStrand('${strand._id}')">Subscribe</button>`}
      <button class="btn btn-ghost" onclick="navigator.clipboard?.writeText(window.location.href);showToast('📋 Link copied')">Share</button>
    </div>`;

  const now = new Date();
  const upcoming = (strand.events||[]).filter(e => {
    if (e.date) return new Date(e.date+'T23:59:59') >= now;
    return true;
  }).slice(0, 8);

  evList.innerHTML = upcoming.map(ev => `
    <div class="pub-event-row">
      <div class="pub-event-name">${esc(ev.title||ev.name||'Event')}</div>
      <div class="pub-event-time">${ev.date||'Recurring'}${ev.time_start?' · '+ev.time_start:''}</div>
      ${ev.vibes?.length ? `<div class="pub-event-vibes">${ev.vibes.map(v=>`<span class="pub-vibe-tag">${esc(v)}</span>`).join('')}</div>` : ''}
    </div>`).join('') || '<div style="color:var(--text-faint);padding:20px;text-align:center;">No upcoming events listed</div>';

  // Past dates section — compute occurrences for all events, merge, sort descending
  const pastEl = document.getElementById('pub-strand-past');
  if (pastEl) {
    const pastItems = [];
    for (const ev of (strand.events || [])) {
      for (const occ of computePastOccurrences(ev)) {
        pastItems.push({ ...occ, eventTitle: ev.title || ev.name || 'Event' });
      }
    }
    pastItems.sort((a, b) => b.date.localeCompare(a.date)); // most recent first
    const pastSlice = pastItems.slice(0, 30);

    if (pastSlice.length > 0) {
      const toggleLabel = `Past dates ▸ (${pastSlice.length}${pastItems.length > 30 ? '+' : ''})`;
      pastEl.innerHTML = `
        <div class="pub-past-section">
          <button class="pub-past-toggle" id="pub-past-btn" onclick="
            const pl = document.getElementById('pub-past-inner');
            const open = pl.style.display !== 'none';
            pl.style.display = open ? 'none' : 'block';
            this.textContent = open ? '${toggleLabel}' : '${toggleLabel.replace('▸','▾')}';
          ">${toggleLabel}</button>
          <div id="pub-past-inner" class="pub-past-list" style="display:none;">
            ${pastSlice.map(item => `
              <div class="pub-event-row${item.cancelled ? ' pub-event-cancelled' : ''}">
                <div class="pub-event-name">${esc(item.eventTitle)}${item.cancelled ? '<span class="cancelled-badge" style="margin-left:8px;">Cancelled</span>' : ''}${item.modified ? '<span style="margin-left:8px;font-size:11px;color:var(--text-faint);">modified</span>' : ''}</div>
                <div class="pub-event-time">${item.date}${item.time_start ? ' · ' + item.time_start : ''}</div>
                ${item.exNote ? `<div class="pub-event-note">${esc(item.exNote)}</div>` : ''}
                ${item.note ? `<div class="pub-event-note">${esc(item.note)}</div>` : ''}
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      pastEl.innerHTML = '';
    }
  }

  if (banner) banner.style.display = ES_USER ? 'none' : 'flex';
}

// ── PUBLIC BRAID VIEW ─────────────────────────────────────────
async function esLoadPublicBraid(handle, braidId, src) {
  esGoto('braid');
  const content = document.getElementById('pub-braid-content');
  content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-faint);">Loading…</div>';
  try {
    const srcParam = src ? `?src=${encodeURIComponent(src)}` : '';
    const res = await fetch(`${BACKEND_URL}/api/public/braid/${handle}/${braidId}${srcParam}`);
    const data = await res.json();
    const b = data.braid;
    const wsOptions = ES_USER ? ES_WORKSPACES.map(w => `<option value="${w._id}">${esc(w.icon||'')} ${esc(w.name)}</option>`).join('') : '';
    content.innerHTML = `
      <div class="pub-strand-header">
        <div class="pub-strand-type-badge">🪢 Braid</div>
        <div class="pub-strand-title">${esc(b.title)}</div>
        <div class="pub-strand-venue">${esc(b.description||'')} </div>
        <div class="pub-strand-meta">${b.publisherHandle?`<span>@${esc(b.publisherHandle)}</span>`:''}</div>
        <div class="pub-subscribe-row">
          ${ES_USER?`${wsOptions?`<select id="braid-ws-sel">${wsOptions}</select>`:''}
            <button class="btn btn-primary" onclick="esSubscribeToBraid('${b._id}',document.getElementById('braid-ws-sel')?.value)">Subscribe to all strands</button>`
          :`<button class="btn btn-primary" onclick="esSubscribeToBraid('${b._id}')">Subscribe to all strands</button>`}
        </div>
      </div>
      <h3 style="font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint);margin-bottom:14px;">Strands in this braid</h3>
      ${(b.strands||[]).map(s => `
        <div class="pub-strand-header" style="margin-bottom:12px;cursor:pointer;" onclick="esLoadPublicStrand('${s.publisherHandle}','${s._id}')">
          <div class="pub-strand-title" style="font-size:18px;">${esc(s.title)}</div>
          <div class="pub-strand-venue">${esc(s.venue||s.publisherHandle||'')} </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            ${ES_USER?`<button class="sc-btn primary" onclick="event.stopPropagation();esSubscribeToStrand('${s._id}')">Subscribe</button>`:''}
            <button class="sc-btn" onclick="event.stopPropagation();esLoadPublicStrand('${s.publisherHandle||handle}','${s._id}')">View strand →</button>
          </div>
        </div>`).join('')}`;
  } catch(e) {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-dim);">Could not load braid</div>';
  }
}

// ── PUBLIC PROFILE VIEW ───────────────────────────────────────
async function esLoadPublicProfile(handle) {
  esGoto('profile');
  const content = document.getElementById('pub-profile-content');
  content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-faint);">Loading…</div>';
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/profile/${handle}`);
    const data = await res.json();
    const p = data.profile;
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:32px;">
        <div class="profile-pic">${(p.displayName||handle)[0].toUpperCase()}</div>
        <div>
          <div style="font-family:'Fraunces',serif;font-size:24px;color:var(--text);">${esc(p.displayName||handle)}</div>
          <div style="color:var(--text-dim);font-size:14px;">@${handle}</div>
        </div>
      </div>
      <h3 style="font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint);margin-bottom:14px;">Strands</h3>
      ${(p.strands||[]).map(s => `
        <div class="strand-card" style="cursor:pointer;" onclick="esLoadPublicStrand('${handle}','${s._id}')">
          <div class="strand-card-header">
            <div class="strand-card-dot" style="background:${s.color||'var(--primary)'}"></div>
            <div class="strand-card-name">${esc(s.title)}</div>
            <div class="strand-card-subs">${s.subscriberCount||0} subscribers</div>
          </div>
          ${s.venue?`<div style="font-size:13px;color:var(--text-dim);">${esc(s.venue)}</div>`:''}
        </div>`).join('')}
      ${p.braids?.length ? `<h3 style="font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint);margin:24px 0 14px;">Braids</h3>
      ${p.braids.map(b => `
        <div class="strand-card" style="cursor:pointer;" onclick="esLoadPublicBraid('${handle}','${b._id}')">
          <div class="strand-card-header">
            <span style="font-size:18px;">🪢</span>
            <div class="strand-card-name">${esc(b.title)}</div>
          </div>
        </div>`).join('')}` : ''}`;
  } catch(e) {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-dim);">Profile not found</div>';
  }
}

// ── ANALYTICS ─────────────────────────────────────────────────
async function esOpenAnalytics(strandId) {
  const drawer = document.getElementById('analytics-drawer');
  const content = document.getElementById('analytics-content');
  drawer.classList.add('open');
  content.innerHTML = '<div style="padding:20px;color:var(--text-faint);">Loading analytics…</div>';
  try {
    const res = await esFetch(`/api/strands/${strandId}/analytics`);
    const d = await res.json();
    const bars = (d.viewsLast30||[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    const maxBar = Math.max(...bars, 1);
    content.innerHTML = `
      <h3 style="font-family:'Fraunces',serif;font-size:20px;color:var(--text);margin-bottom:16px;">${esc(d.title||'Analytics')}</h3>
      <div class="analytics-stat-grid">
        <div class="analytics-stat"><div class="analytics-stat-num">${d.subscriberCount||0}</div><div class="analytics-stat-label">Subscribers</div></div>
        <div class="analytics-stat"><div class="analytics-stat-num">${d.totalViews||0}</div><div class="analytics-stat-label">Total views</div></div>
        <div class="analytics-stat"><div class="analytics-stat-num">${d.viewsThisMonth||0}</div><div class="analytics-stat-label">Views this month</div></div>
        <div class="analytics-stat"><div class="analytics-stat-num">${d.scanCount||0}</div><div class="analytics-stat-label">QR scans</div></div>
      </div>
      <div style="font-size:12px;color:var(--text-faint);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Views — last 30 days</div>
      <div class="chart-area">
        ${bars.map(v=>`<div class="chart-bar" style="height:${Math.round((v/maxBar)*100)}%"></div>`).join('')}
      </div>
      ${d.topScanOrigins?.length ? `<div style="font-size:12px;color:var(--text-faint);margin-bottom:8px;margin-top:16px;text-transform:uppercase;letter-spacing:1px;">Scan origins</div>
      ${d.topScanOrigins.map(o=>`<div class="analytics-bar-row"><span style="min-width:80px;color:var(--text-dim)">${esc(o.label)}</span><div class="analytics-bar"><div class="analytics-bar-fill" style="width:${o.pct}%"></div></div><span style="color:var(--text-faint)">${o.count}</span></div>`).join('')}` : ''}
      ${d.events?.length ? `<div style="font-size:12px;color:var(--text-faint);margin-bottom:8px;margin-top:16px;text-transform:uppercase;letter-spacing:1px;">Events by engagement</div>
      ${d.events.map(e=>`<div class="analytics-bar-row"><span style="flex:1;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(e.title||'Event')}</span><span style="color:var(--text-faint);font-size:12px;">${e.views||0} views</span></div>`).join('')}` : ''}`;
  } catch(e) {
    content.innerHTML = '<div style="color:var(--text-faint);padding:20px;">Could not load analytics</div>';
  }
}

function esCloseAnalytics() {
  document.getElementById('analytics-drawer').classList.remove('open');
}

// ── BRAID ANALYTICS ───────────────────────────────────────────
async function esOpenBraidAnalytics(braidId) {
  const drawer = document.getElementById('analytics-drawer');
  const content = document.getElementById('analytics-content');
  drawer.classList.add('open');
  content.innerHTML = '<div style="padding:20px;color:var(--text-faint);">Loading analytics…</div>';
  try {
    const res = await esFetch(`/api/braids/${braidId}/analytics`);
    const d = await res.json();
    content.innerHTML = `
      <h3 style="font-family:'Fraunces',serif;font-size:20px;color:var(--text);margin-bottom:4px;">🪢 ${esc(d.title||'Braid Analytics')}</h3>
      <div style="font-size:13px;color:var(--text-faint);margin-bottom:16px;">${d.strandCount||0} strands</div>
      <div class="analytics-stat-grid">
        <div class="analytics-stat"><div class="analytics-stat-num">${d.subscriberCount||0}</div><div class="analytics-stat-label">Subscribers</div></div>
        <div class="analytics-stat"><div class="analytics-stat-num">${d.totalViews||0}</div><div class="analytics-stat-label">Total views</div></div>
        <div class="analytics-stat"><div class="analytics-stat-num">${d.scanCount||0}</div><div class="analytics-stat-label">QR scans</div></div>
      </div>
      ${d.topScanOrigins?.length ? `<div style="font-size:12px;color:var(--text-faint);margin-bottom:8px;margin-top:16px;text-transform:uppercase;letter-spacing:1px;">Scan origins</div>
      ${d.topScanOrigins.map(o=>`<div class="analytics-bar-row"><span style="min-width:80px;color:var(--text-dim)">${esc(o.label)}</span><div class="analytics-bar"><div class="analytics-bar-fill" style="width:${o.pct}%"></div></div><span style="color:var(--text-faint)">${o.count}</span></div>`).join('')}` : ''}
      ${d.strands?.length ? `<div style="font-size:12px;color:var(--text-faint);margin-bottom:8px;margin-top:16px;text-transform:uppercase;letter-spacing:1px;">Strands in this braid</div>
      ${d.strands.map(s=>`<div class="analytics-bar-row"><span style="flex:1;color:var(--text-dim);">${esc(s.title)}</span><span style="color:var(--text-faint);font-size:12px;">${s.subscribers||0} subscribers</span></div>`).join('')}` : ''}`;
  } catch(e) {
    content.innerHTML = '<div style="color:var(--text-faint);padding:20px;">Could not load analytics</div>';
  }
}

// ── EDIT EXISTING STRAND ──────────────────────────────────────
// Loads a saved strand back into the builder for editing
async function esEditStrand(strandId) {
  try {
    const res = await esFetch(`/api/strands/${strandId}`);
    if (!res.ok) { showToast('Could not load strand for editing', 'error'); return; }
    const d = await res.json();
    const s = d.strand;

    // Reset builder state and populate from saved strand
    _builderStrandId = s._id;
    pub.name        = s.title        || '';
    pub.description = s.description  || '';
    pub.type        = s.type         || '';
    pub.timezone    = s.timezone     || Intl.DateTimeFormat().resolvedOptions().timeZone;
    pub.color       = s.color        || '#6C8FFF';
    pub.website     = s.website      || '';
    pub.visibility  = s.visibility   || 'public';
    pub.accessCode  = s.accessCode   || '';
    // address is stored as a single string in venue
    pub.address     = s.venue        || '';
    pub.city        = ''; pub.state  = ''; pub.country = '';

    // Repopulate events array from saved events
    events = (s.events || []).map(ev => {
      const uid = _nextUid++;
      const e = mkEvent();
      e.uid          = uid;
      e.name         = ev.title        || '';
      e.category     = ev.category     || '';
      e.vibes        = ev.vibes        || [];
      e.price        = ev.price        || 'free';
      e.priceNote    = ev.price_note   || '';
      e.ticketUrl    = ev.ticket_url   || '';
      e.leadTimeDays = ev.lead_time_days || 0;
      e.notes        = ev.notes        || '';
      e.eventType    = ev.event_type   || 'recurring';
      // oneoff
      e.date         = ev.date         || '';
      e.oneTimeStart = ev.time_start   || '';
      e.oneTimeEnd   = ev.time_end     || '';
      e.allDay       = !!ev.all_day;
      // datelist (standalone) — reads the same dates[] field as recDates below,
      // routed by event_type since a "Date List" event has no recurrence[]
      e.dateList     = (ev.event_type === 'datelist' ? (ev.dates || []) : []).map((d, i) => ({
        did: i, date: d.date||'', timeStart: d.time_start||'', timeEnd: d.time_end||'', note: d.note||'', allDay: !!d.all_day
      }));
      e.nextDid      = e.dateList.length;
      // extra dates coexisting with recurrence
      e.recDates     = (ev.event_type !== 'datelist' ? (ev.dates || []) : []).map((d, i) => ({
        did: i, date: d.date||'', timeStart: d.time_start||'', timeEnd: d.time_end||'', note: d.note||'', allDay: !!d.all_day
      }));
      // recurring
      e.rules        = (ev.recurrence && ev.recurrence.length ? ev.recurrence : [mkRule()]).map((r, i) => ({
        rid: i, pattern: r.pattern||'weekly', every: r.every||1,
        days: r.days||['fri'], timeStart: r.time_start||'', timeEnd: r.time_end||'',
        allDay: !!r.all_day,
        monthWeek: r.month_week||'first', monthDate: r.month_date||1,
        seasonStart: r.season_start||'', seasonEnd: r.season_end||''
      }));
      e.nextRid      = e.rules.length;
      e.exceptions   = (ev.exceptions || []).map((x, i) => ({
        xid: i, type: x.type||'skip', date: x.date||'', date_end: x.date_end||'', note: x.note||''
      }));
      e.nextXid      = e.exceptions.length;
      return e;
    });

    // Populate directory opt-in state for this strand
    esPopulateDirectoryFields(s);

    // Navigate to builder and repaint
    esCloseApp();
    const builderSection = document.getElementById('builder');
    if (builderSection) {
      builderSection.scrollIntoView({ behavior: 'smooth' });
      // Repopulate form fields
      setTimeout(() => {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('pub-name', pub.name);
        setVal('pub-desc', pub.description);
        setVal('pub-tz', pub.timezone);
        const colorEl = document.getElementById('pub-color');
        if (colorEl) colorEl.value = pub.color;
        bUpdatePreview();
        bUpdatePreviewColor(pub.color);
        // Re-render all event cards
        const stack = document.getElementById('events-list');
        const count = document.getElementById('events-count');
        if (stack) {
          stack.innerHTML = '';
          events.forEach(ev => renderEventCard(ev, true));
        }
        bUpdateCount();
        bGoto(0);
        esShowBuilderQR(s);
        showToast(`Editing: ${s.title}`);
      }, 300);
    }
  } catch(e) {
    showToast('Could not load strand for editing', 'error');
  }
}

// Quick-publish a draft strand from My Strands without re-opening the builder
async function esPublishExistingStrand(strandId, btn) {
  try {
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    const res = await esFetch(`/api/strands/${strandId}/publish`, { method: 'POST' });
    const d = await res.json();
    if (!res.ok) { showToast(d.error || 'Could not publish', 'error'); btn.disabled = false; btn.textContent = 'Publish →'; return; }
    showToast('🟢 Strand is live!');
    esRenderMyStrands(); // refresh the list
  } catch(e) {
    showToast('Connection error', 'error');
    btn.disabled = false; btn.textContent = 'Publish →';
  }
}

// ── QR DISPLAY ────────────────────────────────────────────────
function esShowStrandQR(strandId, title) {
  const url = `https://eventstrand.com/s/${ES_USER.handle}/${strandId}?src=qr`;
  esShowQRModal(url, title);
}

function esShowBraidQR(braidId, title) {
  const url = `https://eventstrand.com/b/${ES_USER.handle}/${braidId}?src=qr`;
  esShowQRModal(url, title);
}

function esShowQRModal(url, title) {
  showToast(`QR for: ${url}`);
  // QR generation via canvas API
  const existing = document.getElementById('es-qr-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'es-qr-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(4,6,26,0.85);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border2);border-radius:20px;padding:32px;max-width:360px;width:90%;text-align:center;">
    <div style="font-family:'Fraunces',serif;font-size:20px;margin-bottom:16px;color:var(--text);">${title}</div>
    <canvas id="qr-canvas" style="border-radius:12px;margin-bottom:16px;"></canvas>
    <div class="strand-url" style="margin-bottom:16px;">${url}</div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="esDownloadQR()">Download QR</button>
      <button class="btn btn-ghost" style="flex:1;justify-content:center;" onclick="navigator.clipboard?.writeText('${url}');showToast('📋 Copied')">Copy Link</button>
    </div>
    <button onclick="document.getElementById('es-qr-modal').remove()" style="margin-top:16px;background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:13px;">Close</button>
  </div>`;
  document.body.appendChild(modal);
  esRenderQR('qr-canvas', url);
}

function esRenderQR(canvasId, url) {
  // Simple QR code via API image (real implementation would use a JS QR library)
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width = 200; canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0,0,200,200);
  // Load QR image from backend
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, 200, 200);
  img.src = `${BACKEND_URL}/api/qr?url=${encodeURIComponent(url)}`;
}

function esDownloadQR() {
  const canvas = document.getElementById('qr-canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = 'eventstrand-qr.png';
  a.href = canvas.toDataURL();
  a.click();
}

// ── BRAID BUILDER ─────────────────────────────────────────────
let _braidSelectedStrands = new Set();
let _braidVis = 'public';

async function esRenderBraidBuilder() {
  _braidSelectedStrands = new Set();
  _braidVis = 'public';
  const picker = document.getElementById('braid-strand-picker');
  if (!picker) return;
  if (!ES_USER) { esShowAuth(); return; }
  picker.innerHTML = '<div style="color:var(--text-faint);font-size:13px;padding:12px;">Loading your strands…</div>';
  try {
    const res = await esFetch('/api/strands/mine');
    const d = await res.json();
    if (!d.strands?.length) {
      picker.innerHTML = '<div style="color:var(--text-faint);font-size:13px;padding:12px;">You have no published strands yet. <button onclick="esGotoBuild()" style="background:none;border:none;color:var(--primary);cursor:pointer;">Build one first</button></div>';
      return;
    }
    picker.innerHTML = d.strands.map(s => `
      <div class="strand-picker-row" id="spick-${s._id}" onclick="esToggleBraidStrand('${s._id}',this)">
        <div class="strand-picker-check"></div>
        <div>${s.title}</div>
        <div style="font-size:12px;color:var(--text-faint);margin-left:auto;">${s.events?.length||0} events</div>
      </div>`).join('');
  } catch(e) {
    picker.innerHTML = '<div style="color:var(--text-faint);padding:12px;">Could not load strands</div>';
  }
}

function esToggleBraidStrand(id, el) {
  if (_braidSelectedStrands.has(id)) { _braidSelectedStrands.delete(id); el.classList.remove('selected'); }
  else { _braidSelectedStrands.add(id); el.classList.add('selected'); }
  const check = el.querySelector('.strand-picker-check');
  if (check) check.textContent = _braidSelectedStrands.has(id) ? '✓' : '';
}

function esSetBraidVis(vis, btn) {
  _braidVis = vis;
  document.querySelectorAll('.vis-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('braid-passcode').style.display = vis === 'protected' ? 'block' : 'none';
}

let _braidSearchTimer = null;
function esSearchPublicStrands(val) {
  clearTimeout(_braidSearchTimer);
  const results = document.getElementById('braid-strand-search-results');
  if (!val || val.length < 2) { if(results) results.innerHTML = ''; return; }
  _braidSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/public/strands/search?q=${encodeURIComponent(val)}`);
      const d = await res.json();
      if (results) results.innerHTML = (d.strands||[]).slice(0,5).map(s =>
        `<div class="strand-picker-row" id="spick-pub-${s._id}" onclick="esToggleBraidStrand('${s._id}',this)">
          <div class="strand-picker-check"></div>
          <div>${s.title}</div>
          <div style="font-size:12px;color:var(--text-faint);margin-left:auto;">@${s.publisherHandle}</div>
        </div>`).join('');
    } catch(e) {}
  }, 400);
}

async function esPublishBraid() {
  const name = document.getElementById('braid-name').value.trim();
  const desc = document.getElementById('braid-desc').value.trim();
  const passcode = document.getElementById('braid-passcode').value.trim();
  if (!name) { showToast('Add a braid name first', 'error'); return; }
  if (!_braidSelectedStrands.size) { showToast('Select at least one strand', 'error'); return; }
  try {
    const res = await esFetch('/api/braids', {
      method: 'POST',
      body: JSON.stringify({
        title: name, description: desc,
        strandIds: [..._braidSelectedStrands],
        visibility: _braidVis,
        accessCode: _braidVis === 'protected' ? passcode : undefined
      })
    });
    const d = await res.json();
    if (!res.ok) { showToast(d.error||'Could not create braid', 'error'); return; }
    showToast('🪢 Braid published!');
    const panel = document.getElementById('braid-qr-panel');
    const url = `https://eventstrand.com/b/${ES_USER.handle}/${d.braid._id}`;
    panel.style.display = 'block';
    panel.innerHTML = `<div class="strand-url">${url}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="esShowBraidQR('${d.braid._id}','${name}')">⬛ Show QR Code</button>
        <button class="btn btn-ghost" onclick="navigator.clipboard?.writeText('${url}');showToast('📋 Copied')">Copy Link</button>
        <button class="btn btn-ghost" onclick="esGoto('dashboard')" title="View in dashboard">View in Dashboard</button>
      </div>`;
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

// ── WORKSPACES ────────────────────────────────────────────────
let _wsNewIcon = '🌅';

async function esLoadWorkspaces() {
  try {
    const res = await esFetch('/api/user/workspaces');
    const d = await res.json();
    ES_WORKSPACES = d.workspaces || [];
    if (!ES_WORKSPACES.length) await esCreateDefaultWorkspace();
    _activeWorkspaceId = ES_WORKSPACES.find(w=>w.isActive)?._id || ES_WORKSPACES[0]?._id || null;
  } catch(e) {}
}

async function esCreateDefaultWorkspace() {
  try {
    const res = await esFetch('/api/user/workspaces', {method:'POST', body:JSON.stringify({name:'My Strands',icon:'🌅'})});
    const d = await res.json();
    if (d.workspace) ES_WORKSPACES = [d.workspace];
  } catch(e) {}
}

async function esRenderWorkspaces() {
  const list = document.getElementById('workspaces-list');
  if (!list) return;
  list.innerHTML = ES_WORKSPACES.map(ws => `
    <div class="ws-card">
      <div class="ws-icon">${ws.icon||'📁'}</div>
      <div style="flex:1;">
        <div class="ws-name">${esc(ws.name)}</div>
        <div class="ws-meta">${ws.strandCount||0} strands · ${ws.braidCount||0} braids</div>
      </div>
      ${ws.isActive?'<span class="ws-active-badge">Active</span>':''}
      <div class="ws-actions">
        ${!ws.isActive?`<button class="sc-btn" onclick="esSetActiveWorkspaceDb('${ws._id}')">Set active</button>`:''}
        <button class="sc-btn" onclick="esRenameWorkspace('${ws._id}','${escAttr(ws.name)}')">Rename</button>
        <button class="sc-btn" onclick="esDeleteWorkspace('${ws._id}')" style="color:var(--red);">Delete</button>
      </div>
    </div>`).join('') || '<div style="color:var(--text-faint);padding:20px;">No workspaces yet</div>';
}

function esSetWsIcon(el, icon) {
  _wsNewIcon = icon;
  document.getElementById('ws-new-icon').value = icon;
  document.querySelectorAll('#new-workspace-form span[onclick]').forEach(s => s.style.opacity = '0.4');
  el.style.opacity = '1';
}

function esShowNewWorkspace() {
  document.getElementById('new-workspace-form').style.display = 'block';
}

async function esCreateWorkspace() {
  const name = document.getElementById('ws-new-name').value.trim();
  if (!name) { showToast('Enter a workspace name', 'error'); return; }
  try {
    const res = await esFetch('/api/user/workspaces', {method:'POST', body:JSON.stringify({name, icon:_wsNewIcon})});
    const d = await res.json();
    if (!res.ok) { showToast(d.error||'Could not create workspace', 'error'); return; }
    ES_WORKSPACES.push(d.workspace);
    document.getElementById('new-workspace-form').style.display = 'none';
    document.getElementById('ws-new-name').value = '';
    esRenderWorkspaces();
    showToast('✓ Workspace created');
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esSetActiveWorkspaceDb(id) {
  try {
    await esFetch(`/api/user/workspaces/${id}/activate`, {method:'POST'});
    ES_WORKSPACES.forEach(w => w.isActive = w._id === id);
    _activeWorkspaceId = id;
    esRenderWorkspaces();
    esRenderWorkspaceBar();
  } catch(e) { showToast('Could not set active workspace', 'error'); }
}

async function esDeleteWorkspace(id) {
  if (ES_WORKSPACES.length <= 1) { showToast('You must have at least one workspace', 'error'); return; }
  try {
    await esFetch(`/api/user/workspaces/${id}`, {method:'DELETE'});
    ES_WORKSPACES = ES_WORKSPACES.filter(w => w._id !== id);
    esRenderWorkspaces();
  } catch(e) { showToast('Could not delete workspace', 'error'); }
}


// ── VENUE GUIDES ─────────────────────────────────────────────────

function esShowVenueGuide(platform) {
  const area = document.getElementById('vg-guide-area');
  if (!platform) { area.style.display = 'none'; return; }
  area.style.display = 'block';
  document.querySelectorAll('.vg-guide').forEach(el => el.style.display = 'none');
  const guide = document.getElementById('vg-' + platform);
  if (guide) guide.style.display = 'block';
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function esScrollToVenueGuides(e) {
  e.preventDefault();
  const section = document.getElementById('venue-guides');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// ── DIRECTORY OPT-IN ──────────────────────────────────────────────

function esToggleDirectoryBlock(checked) {
  const urlBlock = document.getElementById('builder-dir-url-block');
  if (urlBlock) urlBlock.style.display = checked ? 'block' : 'none';
}

// Populate directory fields when loading a strand into the builder for edit
function esPopulateDirectoryFields(strand) {
  const cb     = document.getElementById('builder-dir-checkbox');
  const urlEl  = document.getElementById('builder-dir-url');
  const status = document.getElementById('builder-dir-status');
  if (!cb) return;

  cb.checked = !!strand.directoryOptIn;
  esToggleDirectoryBlock(cb.checked);

  if (urlEl && strand.directoryVerificationUrl) {
    urlEl.value = strand.directoryVerificationUrl;
  }

  if (status) {
    const map = {
      none:     '',
      pending:  '⏳ Verification running…',
      verified: '✓ Verified — your strand is in the directory',
      flagged:  '⚑ Could not verify automatically — flagged for manual review',
    };
    const s = strand.directoryStatus || 'none';
    status.textContent = map[s] || '';
    status.style.color = s === 'verified' ? '#00d26a' : s === 'flagged' ? '#ff5a5a' : 'var(--text-faint)';

    // Show re-verify button if previously submitted and not pending
    const btn = document.getElementById('builder-dir-submit-btn');
    if (btn && strand.directoryOptIn && s !== 'pending') {
      btn.textContent = s === 'verified' ? '🔄 Re-verify' : '🔄 Try again';
    }
  }
}

// Poll for status update when pending
let _dirPollTimer = null;
function esStartDirectoryPoll(strandId) {
  if (_dirPollTimer) clearInterval(_dirPollTimer);
  _dirPollTimer = setInterval(async () => {
    try {
      const res = await esFetch(`/api/directory/${strandId}/status`);
      if (!res.ok) { clearInterval(_dirPollTimer); return; }
      const d = await res.json();
      const status = document.getElementById('builder-dir-status');
      const btn    = document.getElementById('builder-dir-submit-btn');
      if (d.status !== 'pending') {
        clearInterval(_dirPollTimer);
        _dirPollTimer = null;
        if (status) {
          if (d.status === 'verified') {
            status.textContent = '✓ Verified — your strand is in the directory';
            status.style.color = '#00d26a';
          } else {
            status.textContent = '⚑ Could not verify automatically — our team will review it';
            status.style.color = '#ff5a5a';
          }
        }
        if (btn) btn.textContent = '🔄 Re-verify';
        esRenderMyStrands(); // refresh dashboard badges
      }
    } catch(e) { clearInterval(_dirPollTimer); }
  }, 4000); // poll every 4 seconds
}

async function esSubmitToDirectory() {
  if (!_builderStrandId) {
    showToast('Publish your strand first before submitting to the directory', 'error');
    return;
  }
  const urlEl  = document.getElementById('builder-dir-url');
  const status = document.getElementById('builder-dir-status');
  const btn    = document.getElementById('builder-dir-submit-btn');
  const url    = urlEl?.value?.trim();

  if (!url) {
    showToast('Enter the URL where you\'ve posted your strand link or QR code', 'error');
    urlEl?.focus();
    return;
  }
  try { new URL(url); } catch(e) {
    showToast('Enter a full URL including https://', 'error');
    return;
  }

  if (btn) btn.disabled = true;
  if (status) { status.textContent = '⏳ Submitting…'; status.style.color = 'var(--text-faint)'; }

  try {
    // Check if already submitted (re-verify path)
    const isReverify = btn && (btn.textContent.includes('Re-verify') || btn.textContent.includes('Try again'));
    const endpoint   = isReverify
      ? `/api/directory/${_builderStrandId}/reverify`
      : `/api/directory/${_builderStrandId}/submit`;
    const body       = isReverify ? {} : { verificationUrl: url };

    const res = await esFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
    const d   = await res.json();

    if (!res.ok) {
      if (status) { status.textContent = d.error || 'Submission failed'; status.style.color = '#ff5a5a'; }
      if (btn) btn.disabled = false;
      return;
    }

    if (status) { status.textContent = '⏳ Verification running — this takes about a minute…'; status.style.color = '#ffc107'; }
    if (btn) { btn.textContent = 'Verifying…'; }
    esStartDirectoryPoll(_builderStrandId);

  } catch(e) {
    if (e.message !== '401') showToast('Connection error', 'error');
    if (btn) btn.disabled = false;
  }
}

// ── STRAND / BRAID MANAGEMENT ────────────────────────────────

async function esDeleteStrand(strandId, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone and will remove it from all subscriber workspaces.`)) return;
  try {
    const res = await esFetch(`/api/strands/${strandId}`, {method:'DELETE'});
    if (!res.ok) { const d = await res.json(); showToast(d.error||'Could not delete', 'error'); return; }
    showToast('Strand deleted');
    esRenderMyStrands();
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esDeleteBraid(braidId, title) {
  if (!confirm(`Delete braid "${title}"? This cannot be undone.`)) return;
  try {
    const res = await esFetch(`/api/braids/${braidId}`, {method:'DELETE'});
    if (!res.ok) { const d = await res.json(); showToast(d.error||'Could not delete', 'error'); return; }
    showToast('Braid deleted');
    esRenderMyBraids();
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esEditBraid(braidId) {
  try {
    const mineRes = await esFetch('/api/braids/mine');
    const d = await mineRes.json();
    const braid = d.braids?.find(b => b._id === braidId);
    if (!braid) { showToast('Could not load braid', 'error'); return; }
    const newTitle = prompt('Braid title:', braid.title);
    if (newTitle === null) return;
    const newDesc  = prompt('Description (optional):', braid.description || '');
    if (newDesc === null) return;
    const body = { title: newTitle.trim() || braid.title };
    if (newDesc.trim() !== (braid.description || '')) body.description = newDesc.trim();
    const saveRes = await esFetch(`/api/braids/${braidId}`, { method: 'PUT', body: JSON.stringify(body) });
    if (!saveRes.ok) { const e = await saveRes.json(); showToast(e.error||'Could not update braid', 'error'); return; }
    showToast('✓ Braid updated');
    esRenderMyBraids();
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esRenameWorkspace(wsId, currentName) {
  const newName = prompt('Rename workspace:', currentName);
  if (!newName || !newName.trim() || newName.trim() === currentName) return;
  try {
    const res = await esFetch(`/api/user/workspaces/${wsId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) { const d = await res.json(); showToast(d.error||'Could not rename', 'error'); return; }
    const ws = ES_WORKSPACES.find(w => w._id === wsId);
    if (ws) ws.name = newName.trim();
    esRenderWorkspaces();
    esRenderWorkspaceBar();
    showToast('✓ Workspace renamed');
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

// ── ACCOUNT SETTINGS ──────────────────────────────────────────
function esRenderAccount() {
  if (!ES_USER) return;
  const pic = document.getElementById('settings-profile-pic');
  const name = document.getElementById('settings-display-name');
  const nameRow = document.getElementById('settings-display-name-row');
  const email = document.getElementById('settings-email-display');
  const handle = document.getElementById('settings-handle');
  if (pic) {
    if (ES_USER.picture) pic.innerHTML = `<img src="${ES_USER.picture}">`;
    else pic.textContent = (ES_USER.displayName||'?')[0].toUpperCase();
  }
  if (name) name.textContent = ES_USER.displayName||'—';
  if (nameRow) nameRow.textContent = ES_USER.displayName||'—';
  if (email) email.textContent = ES_USER.email||'—';
  if (handle) handle.textContent = '@' + (ES_USER.handle||'—');
  esLoadApiKeys();
}

async function esEditHandle() {
  const newHandle = prompt('New handle (letters, numbers, - and _ only):', ES_USER.handle||'');
  if (!newHandle || newHandle === ES_USER.handle) return;
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(newHandle)) { showToast('Invalid handle — letters, numbers, - and _ only (3-30 chars)', 'error'); return; }
  try {
    const res = await esFetch('/api/auth/set-handle', {method:'POST', body:JSON.stringify({handle:newHandle})});
    const d = await res.json();
    if (!res.ok) { showToast(d.error||'Could not update handle', 'error'); return; }
    ES_USER.handle = newHandle;
    esSetStoredUser(ES_USER);
    esRenderAccount();
    esRenderMarketingAuth();
    showToast('✓ Handle updated — old URLs redirect automatically');
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esEditDisplayName() {
  const newName = prompt('Display name:', ES_USER.displayName||'');
  if (!newName || newName === ES_USER.displayName) return;
  try {
    const res = await esFetch('/api/auth/profile', {method:'PATCH', body:JSON.stringify({displayName:newName})});
    if (!res.ok) { showToast('Could not update name', 'error'); return; }
    ES_USER.displayName = newName;
    esSetStoredUser(ES_USER);
    esRenderAccount();
    esRenderMarketingAuth();
    esRenderNavAuth();
    showToast('✓ Name updated');
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esExportAll() {
  try {
    const res = await esFetch('/api/strands/mine');
    const d = await res.json();
    if (!d.strands?.length) { showToast('No strands to export', 'error'); return; }
    d.strands.forEach(s => {
      const cleanEvents = (s.events||[]).map(ev => {
        const e = {};
        if (ev.title)    e.title    = ev.title;
        if (ev.category) e.category = ev.category;
        if (ev.vibes?.length) e.vibes = ev.vibes;
        if (ev.price && ev.price !== 'free') e.price = ev.price;
        if (ev.price_note)    e.price_note    = ev.price_note;
        if (ev.ticket_url)    e.ticket_url    = ev.ticket_url;
        if (ev.lead_time_days) e.lead_time_days = ev.lead_time_days;
        if (ev.notes)         e.notes         = ev.notes;
        if (ev.event_type === 'oneoff') {
          if (ev.date)       e.date       = ev.date;
          if (ev.all_day)    { e.all_day = true; }
          else {
            if (ev.time_start) e.time_start = ev.time_start;
            if (ev.time_end)   e.time_end   = ev.time_end;
          }
        } else if (ev.event_type === 'datelist') {
          e.dates = (ev.dates||[]).map(d => {
            const de = {date:d.date};
            if (d.all_day) { de.all_day = true; }
            else {
              if (d.time_start) de.time_start = d.time_start;
              if (d.time_end)   de.time_end   = d.time_end;
            }
            if (d.note)       de.note       = d.note;
            return de;
          });
        } else {
          if (ev.recurrence?.length) e.recurrence = ev.recurrence.map(r => {
            const rule = {pattern: r.pattern};
            if (r.every > 1)  rule.every = r.every;
            if (r.days?.length) rule.days = r.days;
            if (r.month_week) rule.month_week = r.month_week;
            if (r.month_date) rule.month_date = r.month_date;
            if (r.all_day) { rule.all_day = true; }
            else {
              if (r.time_start) rule.time_start = r.time_start;
              if (r.time_end)   rule.time_end   = r.time_end;
            }
            if (r.season_start) rule.season_start = r.season_start;
            if (r.season_end)   rule.season_end   = r.season_end;
            return rule;
          });
          if (ev.dates?.length) e.dates = ev.dates.map(d => {
            const de = {date:d.date};
            if (d.all_day) { de.all_day = true; }
            else {
              if (d.time_start) de.time_start = d.time_start;
              if (d.time_end)   de.time_end   = d.time_end;
            }
            if (d.note) de.note = d.note;
            return de;
          });
          if (ev.exceptions?.length) e.exceptions = ev.exceptions.map(x => {
            const ex = {type:x.type, date:x.date};
            if (x.date_end)   ex.date_end   = x.date_end;
            if (x.note)       ex.note       = x.note;
            if (x.time_start) ex.time_start = x.time_start;
            return ex;
          });
        }
        return e;
      });
      const obj = { rcal: '0.1', meta: {title:s.title, location:s.venue||s.address, timezone:s.timezone}, events: cleanEvents };
      const blob = new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download=(s.title||'strand').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.rcal';
      a.click(); URL.revokeObjectURL(url);
    });
    showToast(`⬇ ${d.strands.length} .rcal files downloaded`);
  } catch(e) { showToast('Export failed — try again', 'error'); }
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
async function esLoadNotifications() {
  try {
    const res = await esFetch('/api/user/notifications');
    const d = await res.json();
    ES_NOTIFICATIONS = d.notifications || [];
    esRenderNotifBadge();
    esRenderNotifList();
  } catch(e) {}
}

function esRenderNotifBadge() {
  const unread = ES_NOTIFICATIONS.filter(n => !n.read).length;
  ['nav-notif-dot','app-notif-dot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = unread > 0 ? 'block' : 'none';
  });
}

function esRenderNotifList() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!ES_NOTIFICATIONS.length) { list.innerHTML = '<div class="notif-empty">All caught up.</div>'; return; }
  list.innerHTML = ES_NOTIFICATIONS.map(n => `
    <div class="notif-item${n.read?'':' unread'}" onclick="esReadNotif('${n._id}')">
      <div class="notif-item-text">${esc(n.message)}</div>
      <div class="notif-item-meta">${esc(n.strandTitle||'')}${n.createdAt?' · '+esRelativeTime(n.createdAt):''}</div>
    </div>`).join('');
}

async function esReadNotif(id) {
  const n = ES_NOTIFICATIONS.find(x => x._id === id);
  if (n) n.read = true;
  esRenderNotifBadge();
  esRenderNotifList();
  try { await esFetch(`/api/user/notifications/${id}/read`, {method:'POST'}); } catch(e) {}
}

async function esMarkAllRead() {
  ES_NOTIFICATIONS.forEach(n => n.read = true);
  esRenderNotifBadge();
  esRenderNotifList();
  try { await esFetch('/api/user/notifications/read-all', {method:'POST'}); } catch(e) {}
}

function esToggleNotif() {
  const drawer = document.getElementById('notif-drawer');
  drawer.classList.toggle('open');
  if (drawer.classList.contains('open') && ES_USER) {
    esMarkAllRead();
  }
}

function esRelativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

// ── EMPTY STATE NOTES ─────────────────────────────────────────
const _notes = {};
function esSaveNote(key, val) {
  _notes[key] = val;
  try { localStorage.setItem('es_notes', JSON.stringify(_notes)); } catch(e) {}
}
function esRestoreNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem('es_notes')||'{}');
    Object.assign(_notes, stored);
    Object.keys(_notes).forEach(key => {
      const el = document.getElementById('note-' + key);
      if (el && _notes[key]) el.value = _notes[key];
    });
  } catch(e) {}
}

// ── STRAND BUILDER: BACKEND SAVE + QR ─────────────────────────
let _builderStrandId = null;

async function esSaveStrand() {
  if (!ES_USER) { esShowAuth('Sign in to save and publish your strand'); return; }
  const obj = buildRcalObj();
  obj.visibility = pub.visibility || 'public';
  if (pub.accessCode) obj.accessCode = pub.accessCode;
  const wasNew = !_builderStrandId;
  const endpoint = _builderStrandId
    ? `/api/strands/${_builderStrandId}`
    : '/api/strands';
  const method = _builderStrandId ? 'PUT' : 'POST';
  try {
    const res = await esFetch(endpoint, {method, body: JSON.stringify(obj)});
    const d = await res.json();
    if (!res.ok) { showToast(d.error||'Could not save', 'error'); return; }
    _builderStrandId = d.strand._id;
    showToast(wasNew ? '✓ Strand saved as draft' : '✓ Strand updated — subscribers will see changes');
    esShowBuilderQR(d.strand);
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

async function esPublishStrand() {
  if (!ES_USER) { esShowAuth('Sign in to publish your strand'); return; }
  if (!_builderStrandId) await esSaveStrand();
  if (!_builderStrandId) return;
  try {
    const res = await esFetch(`/api/strands/${_builderStrandId}/publish`, {method:'POST'});
    const d = await res.json();
    if (!res.ok) { showToast(d.error||'Could not publish', 'error'); return; }
    showToast('🟢 Strand is live!');
    esShowBuilderQR(d.strand);
  } catch(e) { if (e.message !== '401') showToast('Connection error', 'error'); }
}

function esShowBuilderQR(strand) {
  const panel = document.getElementById('export-qr-panel');
  if (!panel) return;
  const url = `https://eventstrand.com/s/${ES_USER.handle}/${strand._id}?src=qr`;
  panel.style.display = 'block';
  panel.innerHTML = `<div class="qr-display">
    <div class="pub-status-badge ${strand.published?'live':'draft'}" style="margin-bottom:12px;">${strand.published?'● Live':'○ Draft'}</div>
    <div class="strand-url">${url}</div>
    <canvas id="builder-qr" style="border-radius:10px;margin:12px auto;display:block;"></canvas>
    <div style="font-size:13px;color:var(--text-dim);margin-bottom:12px;">${strand.subscriberCount||0} subscribers</div>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="esDownloadBuilderQR()">⬛ Download QR</button>
      <button class="btn btn-ghost" onclick="navigator.clipboard?.writeText('${url}');showToast('📋 Copied')">Copy Link</button>
      ${!strand.published?`<button class="btn btn-green" onclick="esPublishStrand()">Publish →</button>`:''}
      <button class="btn btn-ghost" onclick="esOpenAnalytics('${strand._id}')">Analytics</button>
    </div>
  </div>`;
  esRenderQR('builder-qr', url);
}

function esDownloadBuilderQR() {
  const canvas = document.getElementById('builder-qr');
  if (!canvas) return;
  const a = document.createElement('a'); a.download='eventstrand-qr.png'; a.href=canvas.toDataURL(); a.click();
}

// ── BUILDER: VISIBILITY ───────────────────────────────────────
function esSetBuilderVis(vis, btn) {
  pub.visibility = vis;
  document.querySelectorAll('#builder-vis-selector .vis-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const pc = document.getElementById('builder-passcode-field');
  if (pc) pc.style.display = vis === 'protected' ? 'block' : 'none';
}

// ── UTILITY: authenticated fetch ──────────────────────────────
async function esFetch(path, opts={}) {
  const jwt = esGetJwt();
  const headers = { 'Content-Type': 'application/json', ...(jwt?{'Authorization':'Bearer '+jwt}:{}) };
  const res = await fetch(BACKEND_URL + path, { ...opts, headers: {...headers,...(opts.headers||{})} });
  if (res.status === 401) {
    ES_USER = null; esClearJwt();
    esRenderNavAuth(); esRenderMarketingAuth();
    esShowAuth('Your session expired — sign in again');
    throw new Error('401');
  }
  return res;
}

// ── PWA ───────────────────────────────────────────────────────
let _pwaPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaPrompt = e;
  // Show banner after 30 seconds if user hasn't dismissed before
  try { if (!localStorage.getItem('es_pwa_dismissed')) setTimeout(() => document.getElementById('pwa-banner')?.classList.add('show'), 30000); } catch(e) {}
});
function esPwaInstall() {
  if (_pwaPrompt) { _pwaPrompt.prompt(); _pwaPrompt.userChoice.then(() => { document.getElementById('pwa-banner')?.classList.remove('show'); }); }
  try { localStorage.setItem('es_pwa_dismissed','1'); } catch(e) {}
}

// ── GOOGLE IDENTITY SERVICES INIT ────────────────────────────
function esInitGIS() {
  if (!window.google?.accounts?.id) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: esAuthWithGoogle,
    auto_select: false,
  });
  // Render in marketing section only.
  // Do NOT render into the auth modal here — the modal is display:none at page load,
  // which causes GIS to render a zero-dimension iframe that stays invisible even after
  // the modal opens. The modal slot is populated lazily in esShowAuth() instead.
  const mEl = document.getElementById('g_signin_marketing');
  if (mEl) google.accounts.id.renderButton(mEl, { theme:'filled_black', size:'large', width:280 });
}

// Close notif/analytics drawers on outside click
document.addEventListener('click', e => {
  const notif = document.getElementById('notif-drawer');
  const bell1 = document.getElementById('nav-bell');
  const bell2 = document.getElementById('app-bell');
  if (notif?.classList.contains('open') && !notif.contains(e.target) && e.target!==bell1 && e.target!==bell2) {
    notif.classList.remove('open');
  }
  const analytics = document.getElementById('analytics-drawer');
  if (analytics?.classList.contains('open') && !analytics.contains(e.target)) {
    analytics.classList.remove('open');
  }
});

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildWheel();
  renderWheelState();

  // Restore user from localStorage
  const stored = esGetStoredUser();
  if (stored && esGetJwt()) {
    ES_USER = stored;
    esRenderNavAuth();
    esRenderMarketingAuth();
    esLoadWorkspaces();
    esLoadNotifications();
  }

  // Init Google Identity Services (retry if script not yet loaded)
  if (window.google?.accounts?.id) { esInitGIS(); }
  else { window.addEventListener('load', () => setTimeout(esInitGIS, 500)); }

  // Handle hash routing
  esHandleHash();

});

// ══════════════════════════════════════════════════
// POTENTIALLY INTERESTED FEATURE  (global scope)
// ══════════════════════════════════════════════════

const ES_INTERESTED_KEY = 'es_interested_v1';

function esGetInterested() {
  try { return JSON.parse(localStorage.getItem(ES_INTERESTED_KEY)||'[]'); } catch(e) { return []; }
}

function esSaveInterested(list) {
  try { localStorage.setItem(ES_INTERESTED_KEY, JSON.stringify(list)); } catch(e) {}
}

function esIsInterested(eventId, date) {
  if (!eventId) return false;
  const key = eventId + '_' + date;
  return esGetInterested().some(i => i.key === key);
}

function esToggleInterested(btn, ev) {
  const eventId = ev.id || ev._id || '';
  const key = eventId + '_' + ev.date;
  let list = esGetInterested();
  const idx = list.findIndex(i => i.key === key);
  if (idx >= 0) {
    list.splice(idx, 1);
    btn.classList.remove('active');
    btn.textContent = '☆';
  } else {
    list.push({
      key, eventId, date: ev.date, time: ev.time||'',
      title: ev.title||ev.name||'Event',
      venue: ev.venue||'', strand: ev.strandTitle||'',
      category: ev.category||'',
      expiresAt: esInterestedExpiry(ev.date, ev.time)
    });
    btn.classList.add('active');
    btn.textContent = '★';
    showToast('Starred');
  }
  esSaveInterested(list);
  if (document.getElementById('dash-interested').style.display !== 'none') esRenderInterestedList();
}

function esInterestedExpiry(date, time) {
  // Expires at the event's date+time (or end of day if no time)
  try {
    const base = date + (time ? 'T' + time : 'T23:59');
    return new Date(base).getTime();
  } catch(e) { return Date.now() + 86400000; }
}

function esClearExpiredInterested() {
  const now = Date.now();
  const list = esGetInterested().filter(i => i.expiresAt > now);
  esSaveInterested(list);
  esRenderInterestedList();
  showToast('Expired entries cleared');
}

let _esStarredRange = 'all';

function esStarredSetRange(range, btn) {
  _esStarredRange = range;
  document.querySelectorAll('#dash-interested .cal-view-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  esRenderInterestedList();
}

function esStarredRangeEnd(range) {
  const now = new Date();
  if (range === 'today') { const d = new Date(now); d.setHours(23,59,59,999); return d.getTime(); }
  if (range === 'week')  { const d = new Date(now); d.setDate(d.getDate()+(6-d.getDay())); d.setHours(23,59,59,999); return d.getTime(); }
  if (range === 'month') { return new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59, 999).getTime(); }
  if (range === 'year')  { return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime(); }
  return Infinity;
}

function esRenderInterestedList() {
  const container = document.getElementById('dash-interested-list');
  if (!container) return;
  const now = Date.now();
  const catFilter = document.getElementById('starred-cat-filter')?.value || '';
  let list = esGetInterested();

  if (_esStarredRange !== 'all') {
    const rangeEnd = esStarredRangeEnd(_esStarredRange);
    list = list.filter(i => i.expiresAt <= rangeEnd + 86400000);
  }
  if (catFilter) list = list.filter(i => i.category === catFilter);

  const active  = list.filter(i => i.expiresAt > now);
  const expired = list.filter(i => i.expiresAt <= now);

  if (!active.length && !expired.length) {
    container.innerHTML = '<div class="interested-empty"><div style="font-size:32px;margin-bottom:12px;color:var(--amber);">★</div><div style="font-weight:600;margin-bottom:4px;">Nothing starred yet</div><div>Tap the star on any event in your Upcoming feed to save it here.</div></div>';
    return;
  }

  const renderItem = (item, isExpired) => `
    <div class="interested-item" style="${isExpired ? 'opacity:0.45;' : ''}">
      <div style="font-size:20px;color:var(--amber);">★</div>
      <div class="interested-item-body">
        <div class="interested-item-name">${item.title}</div>
        <div class="interested-item-meta">${item.venue}${item.strand ? ' · ' + item.strand : ''}</div>
        <div class="interested-item-time">${isExpired ? '<span style="color:var(--text-faint)">Expired</span>' : item.date + (item.time ? ' at ' + item.time : '')}</div>
      </div>
      <button class="interested-item-remove" onclick="esRemoveInterested('${item.key}')" title="Remove" aria-label="Remove from saved">✕</button>
    </div>`;

  container.innerHTML =
    active.map(i => renderItem(i, false)).join('') +
    (expired.length
      ? `<div style="font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint);margin:16px 0 8px;">Expired</div>` + expired.map(i => renderItem(i, true)).join('')
      : '');
}

function esRemoveInterested(key) {
  const list = esGetInterested().filter(i => i.key !== key);
  esSaveInterested(list);
  esRenderInterestedList();
}

// ── Swipe support for touch devices ──────────────────────────────
function esInitSwipe(cardEl, ev) {
  let startX = 0, startY = 0, dx = 0;
  const THRESHOLD = 80;

  cardEl.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dx = 0;
    cardEl.classList.add('swiping');
  }, { passive: true });

  cardEl.addEventListener('touchmove', e => {
    dx = e.touches[0].clientX - startX;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (Math.abs(dx) < dy) return; // vertical scroll wins
    cardEl.style.transform = `translateX(${dx}px)`;
    const hintR = cardEl.parentElement.querySelector('.swipe-hint-right');
    const hintL = cardEl.parentElement.querySelector('.swipe-hint-left');
    if (hintR) hintR.style.opacity = dx > 20 ? Math.min((dx-20)/60, 1) : '0';
    if (hintL) hintL.style.opacity = dx < -20 ? Math.min((-dx-20)/60, 1) : '0';
  }, { passive: true });

  cardEl.addEventListener('touchend', () => {
    cardEl.classList.remove('swiping');
    const hintR = cardEl.parentElement.querySelector('.swipe-hint-right');
    const hintL = cardEl.parentElement.querySelector('.swipe-hint-left');
    if (hintR) hintR.style.opacity = '0';
    if (hintL) hintL.style.opacity = '0';

    if (dx > THRESHOLD) {
      // Swipe right = interested
      cardEl.style.transform = `translateX(110%)`;
      cardEl.style.opacity = '0';
      const btn = cardEl.querySelector('.efi-btn-star');
      if (btn && !btn.classList.contains('active')) esToggleInterested(btn, ev);
      setTimeout(() => { cardEl.style.transform=''; cardEl.style.opacity=''; }, 400);
    } else if (dx < -THRESHOLD) {
      // Swipe left = not interested (just dismiss visually, no action needed)
      cardEl.style.transform = `translateX(-110%)`;
      cardEl.style.opacity = '0';
      setTimeout(() => { cardEl.style.transform=''; cardEl.style.opacity=''; }, 400);
    } else {
      cardEl.style.transform = '';
    }
  });
}

  window.addEventListener('hashchange', esHandleHash);

// Restore persisted notes across views
esRestoreNotes();

// .rcal definition text — fade out as user scrolls past hero
(function() {
  const el = document.getElementById('rcal-def-text');
  if (!el) return;
  const hero = document.getElementById('hero');
  function updateRcalFade() {
    const heroH = hero.offsetHeight;
    const scroll = window.scrollY;
    const fadeStart = heroH * 0.25;
    const fadeEnd   = heroH * 0.65;
    if (scroll <= fadeStart) {
      el.style.opacity = '1';
    } else if (scroll >= fadeEnd) {
      el.style.opacity = '0';
    } else {
      el.style.opacity = String(1 - (scroll - fadeStart) / (fadeEnd - fadeStart));
    }
  }
  window.addEventListener('scroll', updateRcalFade, { passive: true });
  updateRcalFade();
})();

// ── MARKETING INLINE AUTH FORM ────────────────────────────────────────────────
let _esMktMode = 'signin';

function esMktTab(mode) {
  _esMktMode = mode;
  const isReg = mode === 'register';
  document.getElementById('mkt-tab-signin').style.borderBottomColor  = isReg ? 'transparent' : 'var(--primary)';
  document.getElementById('mkt-tab-signin').style.color              = isReg ? 'var(--text-dim)' : 'var(--text)';
  document.getElementById('mkt-tab-register').style.borderBottomColor = isReg ? 'var(--primary)' : 'transparent';
  document.getElementById('mkt-tab-register').style.color            = isReg ? 'var(--text)' : 'var(--text-dim)';
  document.getElementById('mkt-name').style.display                  = isReg ? 'block' : 'none';
  document.getElementById('mkt-account-type').style.display          = isReg ? 'block' : 'none';
  document.getElementById('mkt-submit-btn').textContent              = isReg ? 'Create Account' : 'Sign In';
  document.getElementById('mkt-error').textContent = '';
}

// Radio border highlight for marketing form
document.addEventListener('change', function(e) {
  if (e.target && e.target.name === 'mkt-account-type') {
    const isVenue = document.getElementById('mkt-type-venue').checked;
    document.getElementById('mkt-type-personal-label').style.borderColor = isVenue ? 'var(--border2)' : 'var(--primary)';
    document.getElementById('mkt-type-venue-label').style.borderColor    = isVenue ? 'var(--primary)' : 'var(--border2)';
  }
});

async function esMktSubmit() {
  const email    = document.getElementById('mkt-email').value.trim();
  const password = document.getElementById('mkt-password').value;
  const name     = document.getElementById('mkt-name').value.trim();
  const errEl    = document.getElementById('mkt-error');
  const btn      = document.getElementById('mkt-submit-btn');

  if (!email || !password) { errEl.textContent = 'Email and password are required.'; return; }

  btn.disabled = true;
  btn.textContent = _esMktMode === 'register' ? 'Creating account…' : 'Signing in…';
  errEl.textContent = '';

  const endpoint = _esMktMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const accountType = document.querySelector('input[name="mkt-account-type"]:checked')?.value || 'personal';
  const body = _esMktMode === 'register'
    ? { email, password, displayName: name || undefined, accountType }
    : { email, password };

  try {
    const res  = await fetch(BACKEND_URL + endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Something went wrong.'; return; }
    // B-5: backend returns { ok: true } (no token/user) when email already exists.
    if (!data.token || !data.user) {
      errEl.style.color = 'var(--primary)';
      errEl.textContent = 'Check your inbox — if an account already exists for this email, we sent you a sign-in reminder.';
      return;
    }
    esSetJwt(data.token);
    ES_USER = data.user;
    esSetStoredUser(data.user);
    if (!data.user.handle) {
      esShowHandleSetup();
    } else {
      esOnSignedIn();
    }
  } catch(e) {
    errEl.textContent = 'Network error — please try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = _esMktMode === 'register' ? 'Create Account' : 'Sign In';
  }
}

// ── PUBLIC DIRECTORY ──────────────────────────────────────────────────────────
let esDirectoryPage = 1;
let esDirectoryDebounceTimer;

async function esLoadDirectory(resetPage = false) {
  if (resetPage) esDirectoryPage = 1;
  const type = document.getElementById('filterType')?.value || '';
  const city = document.getElementById('filterCity')?.value?.trim() || '';
  const grid = document.getElementById('directoryGrid');
  const pagination = document.getElementById('directoryPagination');
  if (!grid) return;

  grid.innerHTML = '<div style="color:var(--text-dim);font-size:14px;padding:2rem 0;">Loading venues…</div>';

  const params = new URLSearchParams({ page: esDirectoryPage });
  if (type) params.append('type', type);
  if (city) params.append('city', city);

  try {
    const res  = await fetch(`${BACKEND_URL}/api/directory/public/directory?${params}`);
    const data = await res.json();

    if (!data.strands || data.strands.length === 0) {
      grid.innerHTML = '<div style="color:var(--text-faint);font-size:14px;padding:2rem 0;">No verified venues yet — check back soon.</div>';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    grid.innerHTML = data.strands.map(s => {
      const strandUrl = `${BACKEND_URL.replace('api.', '')}/s/${s.publisherHandle}/${s._id}`;
      const bg = s.color || '#6C8FFF';
      const meta = [s.type, s.venue, s.city].filter(Boolean).join(' · ');
      return `
        <div class="dir-card" onclick="window.open('${strandUrl}', '_blank')">
          <div class="dir-card-header" style="background:${bg};"></div>
          <div class="dir-card-body">
            <div class="dir-card-title">${esc(s.title)}</div>
            ${meta ? `<div class="dir-card-meta">${esc(meta)}</div>` : ''}
            ${s.description ? `<div class="dir-card-desc">${esc(s.description)}</div>` : ''}
            <div class="dir-card-badge">✓ Verified</div>
          </div>
        </div>`;
    }).join('');

    if (pagination) {
      pagination.innerHTML = '';
      if (data.pages > 1) {
        for (let i = 1; i <= data.pages; i++) {
          const btn = document.createElement('button');
          btn.textContent = i;
          btn.className = 'dir-page-btn' + (i === esDirectoryPage ? ' active' : '');
          btn.onclick = () => { esDirectoryPage = i; esLoadDirectory(); };
          pagination.appendChild(btn);
        }
      }
    }
  } catch (err) {
    grid.innerHTML = '<div style="color:var(--text-faint);font-size:14px;padding:2rem 0;">Could not load directory — try again shortly.</div>';
    console.error('[directory]', err);
  }
}

function esDebounceDirectory() {
  clearTimeout(esDirectoryDebounceTimer);
  esDirectoryDebounceTimer = setTimeout(() => esLoadDirectory(true), 400);
}

// Lazy-load: only fetch when section scrolls into view
(function() {
  const section = document.getElementById('directory');
  if (!section) return;
  let loaded = false;
  const obs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !loaded) {
      loaded = true;
      esLoadDirectory();
      obs.disconnect();
    }
  }, { threshold: 0.1 });
  obs.observe(section);
})();
