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
    date: '', oneTimeStart: '', oneTimeEnd: '',
    dateList: [], nextDid: 0
  };
}

function mkRule() {
  return {
    rid: 0,
    pattern: 'weekly', every: 1,
    days: ['friday'],
    timeStart: '21:00', timeEnd: '23:30',
    monthWeek: 'first', monthDate: 1,
    seasonStart: '', seasonEnd: ''
  };
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toast-msg');
  if (!t || !m) return;
  m.textContent = msg;
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
  const el = document.getElementById('event-count');
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
       <div class="upcoming-preview" style="margin-top:12px"><div class="upcoming-label">Preview — next occurrences</div><div id="upcoming-${ev.uid}"></div></div>`
    : ev.eventType === 'datelist'
    ? buildDatelistSection(ev.uid, ev)
    : `<div class="oneoff-row">
       <div class="field-group"><label class="field-label">Date</label><input class="field-input" type="date" value="${ev.date}" onchange="setEvDirect(${ev.uid},'date',this.value)"></div>
       <div class="field-group"><label class="field-label">Start time</label><input class="field-input" type="time" value="${ev.oneTimeStart}" onchange="setEvDirect(${ev.uid},'oneTimeStart',this.value)"></div>
       <div class="field-group"><label class="field-label">End time</label><input class="field-input" type="time" value="${ev.oneTimeEnd}" onchange="setEvDirect(${ev.uid},'oneTimeEnd',this.value)"></div>
       </div>`;

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
    ${[0,1,3,7,14].map(d=>`<option value="${d}"${ev.leadTimeDays===d?' selected':''}>${d===0?'Day of only':d===1?'1 day':d===7?'1 week':d===14?'2 weeks':d+' days'}</option>`).join('')}
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
    </select>`;

  const showDays = ['weekly','weekdays','weekly_alt'].includes(r.pattern) || r.every===2;
  const showMonthWeek = r.pattern === 'monthly_week';
  const showMonthDate = r.pattern === 'monthly_date';

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
    <div class="rule-row2"><span class="rule-lbl">At</span>
    <input type="time" class="rule-select" value="${r.timeStart}" onchange="setRuleField(${uid},${ri},'timeStart',this.value);updateUpcomingPreview(${uid})">
    <span class="rule-lbl">until</span>
    <input type="time" class="rule-select" value="${r.timeEnd}" onchange="setRuleField(${uid},${ri},'timeEnd',this.value)"></div>
    <div class="rule-row2"><span class="rule-lbl">Season</span>
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
      <div class="upcoming-preview" style="margin-top:12px"><div class="upcoming-label">Preview — next occurrences</div><div id="upcoming-${uid}"></div></div>`;
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
    schedEl.innerHTML = buildDatelistSection(uid, ev);
  } else {
    schedEl.innerHTML = `<div class="oneoff-row">
      <div class="field-group"><label class="field-label">Date</label><input class="field-input" type="date" value="${ev.date}" onchange="setEvDirect(${uid},'date',this.value)"></div>
      <div class="field-group"><label class="field-label">Start time</label><input class="field-input" type="time" value="${ev.oneTimeStart}" onchange="setEvDirect(${uid},'oneTimeStart',this.value)"></div>
      <div class="field-group"><label class="field-label">End time</label><input class="field-input" type="time" value="${ev.oneTimeEnd}" onchange="setEvDirect(${uid},'oneTimeEnd',this.value)"></div>
      </div>`;
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
  const daysRow = document.getElementById(`rdays-${uid}-${ri}`);
  const mwRow  = document.getElementById(`rmw-${uid}-${ri}`);
  const mdRow  = document.getElementById(`rmd-${uid}-${ri}`);
  if (daysRow) daysRow.style.display = showDays ? 'flex' : 'none';
  if (mwRow)  mwRow.style.display  = val === 'monthly_week' ? 'flex' : 'none';
  if (mdRow)  mdRow.style.display  = val === 'monthly_date' ? 'flex' : 'none';
  updateUpcomingPreview(uid);
}

function setRuleField(uid, ri, field, val) {
  const ev = getEv(uid); if (!ev) return;
  const r = ev.rules[ri]; if (!r) return;
  r[field] = val;
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
      items.push({ date: DAYS[dow]+' '+MONTHS[d.getMonth()]+' '+d.getDate(), start: r.timeStart||'?', end: r.timeEnd||'?' });
      count++;
    }
  }
  el.innerHTML = items.map(it =>
    `<div class="upcoming-item"><span class="upcoming-date">${it.date}</span><span class="upcoming-time">${it.start} – ${it.end}</span></div>`
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
      : ev.rules[0] ? (ev.rules[0].days.slice(0,2).map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join('/') + ' · ' + (ev.rules[0].timeStart||'')) : 'Recurring';
    const tags = ev.vibes.slice(0,2).map(v => `<span class="preview-event-tag">${esc(v)}</span>`).join('');
    return `<div class="preview-event">
      <div class="preview-event-name">${ev.name||'Unnamed Event'}</div>
      <div class="preview-event-time">${timeStr}</div>
      ${tags ? `<div class="preview-event-tags">${tags}</div>` : ''}
      </div>`;
  }).join('');
}

// ── BUILDER: date list helpers ────────────────────────────────
function buildDatelistSection(uid, ev) {
  const defaultTimeRow = `<div class="datelist-times" style="margin-bottom:12px;">
    <span class="rule-lbl" style="flex-shrink:0">Default time</span>
    <input type="time" class="rule-select" value="${ev.oneTimeStart||'21:00'}" onchange="setEvDirect(${uid},'oneTimeStart',this.value)" placeholder="start">
    <span class="rule-lbl">–</span>
    <input type="time" class="rule-select" value="${ev.oneTimeEnd||'23:30'}" onchange="setEvDirect(${uid},'oneTimeEnd',this.value)" placeholder="end">
    </div>`;
  const entries = (ev.dateList||[]).map((d,di) => buildDateEntry(uid, d, di)).join('');
  return `<div class="ecard-section-label" style="margin-bottom:8px">Confirmed Dates</div>
    ${defaultTimeRow}
    <div class="datelist-stack" id="datelist-${uid}">${entries}</div>
    <button class="add-rule-btn" onclick="addDateEntry(${uid})" style="margin-top:8px;width:100%">+ Add date</button>
    <div style="font-size:12px;color:var(--text-faint);margin-top:8px;line-height:1.6">Dates inherit the default time unless overridden per entry. Subscribers get updates silently.</div>`;
}

function buildDateEntry(uid, d, di) {
  const hasOverride = d.timeStart || d.timeEnd || d.note;
  return `<div class="datelist-entry" id="dentry-${uid}-${di}">
    <input type="date" class="field-input datelist-entry-date" value="${d.date||''}" onchange="setDateField(${uid},${di},'date',this.value)">
    <span class="datelist-override-toggle" onclick="toggleDateOverride(${uid},${di})" id="dtoggle-${uid}-${di}">${hasOverride?'− times/note':'+ override'}</span>
    <div id="doverride-${uid}-${di}" style="display:${hasOverride?'flex':'none'};gap:6px;align-items:center;flex-wrap:wrap;flex:1">
    <input type="time" class="rule-select" value="${d.timeStart||''}" placeholder="start" onchange="setDateField(${uid},${di},'timeStart',this.value)">
    <input type="time" class="rule-select" value="${d.timeEnd||''}" placeholder="end" onchange="setDateField(${uid},${di},'timeEnd',this.value)">
    <input type="text" class="rule-select" value="${d.note||''}" placeholder="Note (e.g. Guest DJ)" style="flex:2;min-width:100px" oninput="setDateField(${uid},${di},'note',this.value)">
    </div>
    <button class="datelist-entry-remove" onclick="removeDateEntry(${uid},${di})" aria-label="Remove date entry">✕</button>
    </div>`;
}

function addDateEntry(uid) {
  const ev = getEv(uid); if (!ev) return;
  ev.dateList = ev.dateList || [];
  ev.dateList.push({ date: '', timeStart: '', timeEnd: '', note: '' });
  const stack = document.getElementById('datelist-' + uid);
  if (stack) {
    const di = ev.dateList.length - 1;
    const frag = document.createElement('div');
    frag.innerHTML = buildDateEntry(uid, ev.dateList[di], di);
    stack.appendChild(frag.firstElementChild);
  }
  bRenderPreviewEvents();
}

function removeDateEntry(uid, di) {
  const ev = getEv(uid); if (!ev) return;
  ev.dateList.splice(di, 1);
  const stack = document.getElementById('datelist-' + uid);
  if (stack) stack.innerHTML = (ev.dateList||[]).map((d,i) => buildDateEntry(uid,d,i)).join('');
  bRenderPreviewEvents();
}

function setDateField(uid, di, field, val) {
  const ev = getEv(uid); if (!ev) return;
  if (!ev.dateList[di]) return;
  ev.dateList[di][field] = val;
  if (field === 'date') bRenderPreviewEvents();
}

function toggleDateOverride(uid, di) {
  const el = document.getElementById(`doverride-${uid}-${di}`);
  const tog = document.getElementById(`dtoggle-${uid}-${di}`);
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
      if (ev.oneTimeStart) s.time_start = ev.oneTimeStart;
      if (ev.oneTimeEnd) s.time_end = ev.oneTimeEnd;
    } else if (ev.eventType === 'datelist') {
      s.date_list = ev.dateList.filter(d=>d.date).map(d => {
        const entry = {date:d.date};
        if (d.timeStart) entry.time_start = d.timeStart;
        if (d.timeEnd) entry.time_end = d.timeEnd;
        if (d.note) entry.note = d.note;
        return entry;
      });
    } else {
      s.recurrence = ev.rules.map(r => {
        const rule = {pattern: r.pattern};
        if (r.every && r.every > 1) rule.every = r.every;
        if (['weekly','weekly_alt'].includes(r.pattern) && r.days.length) rule.days = r.days;
        if (r.pattern === 'monthly_week') { rule.month_week = r.monthWeek; rule.days = r.days; }
        if (r.pattern === 'monthly_date') rule.month_date = r.monthDate;
        if (r.timeStart) rule.time_start = r.timeStart;
        if (r.timeEnd) rule.time_end = r.timeEnd;
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
    showToast('Save your strand first to get a shareable link');
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
    if (!res.ok) { showToast('Sign in failed — ' + (data.error||'try again')); return; }
    esSetJwt(data.token);
    ES_USER = data.user;
    esSetStoredUser(data.user);
    if (!data.user.handle) {
      esShowHandleSetup();
    } else {
      esOnSignedIn();
    }
  } catch(e) {
    showToast('Connection error — check your internet and try again');
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
}

function esCloseAuth() {
  document.getElementById('es-auth-modal').classList.remove('open');
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-name').value = '';
}

// ── FORGOT PASSWORD (sub-view inside auth modal) ──────────────
function esShowForgotPassword() {
  // Hide normal form, show forgot form
  const formEls = document.querySelectorAll('#es-auth-modal #auth-email, #es-auth-modal #auth-password, #es-auth-modal #auth-name, #es-auth-modal #auth-error, #es-auth-modal #auth-submit-btn, #es-auth-modal #auth-forgot-link');
  formEls.forEach(el => { if (el) el.style.display = 'none'; });
  // Hide tabs and account-type selector too
  ['auth-tab-signin','auth-tab-register','auth-account-type','g_signin_modal','auth-modal-reason'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Hide any divider between Google and email — it's the parent's siblings; cheaper to hide them
  document.querySelectorAll('#es-auth-modal > .auth-modal-box > div').forEach(d => {
    if (d.querySelector('#g_signin_modal') || (d.textContent || '').toLowerCase().includes('continue with email')) {
      d.style.display = 'none';
    }
  });
  const ff = document.getElementById('auth-forgot-form');
  if (ff) ff.style.display = 'flex';
  document.getElementById('auth-modal-reason')?.setAttribute('data-stashed','1');
}

function esHideForgotPassword() {
  const ff = document.getElementById('auth-forgot-form');
  if (ff) ff.style.display = 'none';
  document.getElementById('auth-forgot-msg').textContent = '';
  document.getElementById('auth-forgot-email').value = '';
  // Restore normal form
  const formEls = document.querySelectorAll('#es-auth-modal #auth-email, #es-auth-modal #auth-password, #es-auth-modal #auth-error, #es-auth-modal #auth-submit-btn, #es-auth-modal #auth-forgot-link');
  formEls.forEach(el => { if (el) el.style.display = ''; });
  ['auth-tab-signin','auth-tab-register','g_signin_modal','auth-modal-reason'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  // auth-name only visible in register mode
  const nameEl = document.getElementById('auth-name');
  if (nameEl) nameEl.style.display = (_esAuthMode === 'register') ? 'block' : 'none';
  // Account type only in register mode
  const acctEl = document.getElementById('auth-account-type');
  if (acctEl) acctEl.style.display = (_esAuthMode === 'register') ? 'block' : 'none';
  // Restore the divider/google sections
  document.querySelectorAll('#es-auth-modal > .auth-modal-box > div').forEach(d => {
    if (d.style.display === 'none' && (d.querySelector('#g_signin_modal') || (d.textContent || '').toLowerCase().includes('continue with email'))) {
      d.style.display = '';
    }
  });
}

async function esSubmitForgotPassword() {
  const email = document.getElementById('auth-forgot-email').value.trim();
  const msg   = document.getElementById('auth-forgot-msg');
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
    msg.style.color = 'var(--green, #11DBA6)';
  } catch (e) {
    msg.textContent = 'Connection error — try again';
    msg.style.color = '#ff6b6b';
  }
}

// ── RESET PASSWORD (full-page view at #/reset-password?token=…) ─
let _esResetToken = '';
function esShowResetPassword(token) {
  if (!token) {
    showToast('Reset link is missing or invalid');
    window.location.hash = '/';
    return;
  }
  _esResetToken = token;
  esHideAllPublicViews();
  const v = document.getElementById('es-reset-view');
  if (v) {
    v.style.display = 'block';
    setTimeout(() => document.getElementById('es-reset-pw')?.focus(), 50);
  }
}

async function esSubmitResetPassword() {
  const pw  = document.getElementById('es-reset-pw').value;
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
    // Auto sign in with the new token
    if (d.token && d.user) {
      ES_USER = { ...d.user, jwt: d.token };
      try { localStorage.setItem('es_user', JSON.stringify(ES_USER)); } catch(_) {}
      esRenderAuthState();
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
    if (msgEl) msgEl.textContent = 'The link in your email is incomplete. Try opening it directly from the email.';
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
    // If signed in, refresh user state
    if (ES_USER) {
      ES_USER.emailVerified = true;
      try { localStorage.setItem('es_user', JSON.stringify(ES_USER)); } catch(_) {}
      esRenderAuthState();
    }
  } catch (e) {
    if (titleEl) titleEl.textContent = 'Connection error';
    if (msgEl) msgEl.textContent = 'Couldn\'t reach the server. Check your internet and try the link again.';
  }
}

// Helper: hide all public-view containers before showing one.
// Defined here in case it doesn't exist elsewhere (best-effort selector match).
function esHideAllPublicViews() {
  const overlay = document.getElementById('es-public-overlay');
  if (overlay) overlay.style.display = 'block';
  document.querySelectorAll('.public-view, [id^="es-public-"], #es-verify-view, #es-reset-view').forEach(el => {
    if (el && el.style) el.style.display = 'none';
  });
  // Also close any modals
  document.getElementById('es-auth-modal')?.classList.remove('open');
}

// ── EMAIL VERIFICATION BANNER ─────────────────────────────────
// Shown on dashboard when ES_USER && !ES_USER.emailVerified.
// Inserts a one-line banner with a "Resend verification email" button.
function esRenderVerifyBanner() {
  if (!ES_USER) return;
  let banner = document.getElementById('es-verify-banner');
  if (ES_USER.emailVerified) {
    if (banner) banner.remove();
    return;
  }
  if (banner) return; // already shown

  banner = document.createElement('div');
  banner.id = 'es-verify-banner';
  banner.style.cssText = 'position:sticky;top:0;z-index:50;background:rgba(108,143,255,0.16);border-bottom:1px solid rgba(108,143,255,0.4);padding:10px 20px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--text);';
  banner.innerHTML = `
    <span>📧 Please verify your email (${esc(ES_USER.email)}) to unlock all features.</span>
    <button onclick="esResendVerification(this)" style="background:var(--primary);color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;">Resend email</button>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-faint);font-size:18px;cursor:pointer;line-height:1;" aria-label="Dismiss verification banner">×</button>
  `;
  // Insert at the top of the public overlay or app container
  const target = document.getElementById('es-public-overlay') || document.body;
  target.insertBefore(banner, target.firstChild);
}

async function esResendVerification(btn) {
  if (!ES_USER) return;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': `Bearer ${ES_USER.jwt}`,
      },
    });
    if (res.ok) {
      btn.textContent = 'Sent ✓';
      showToast('Verification email sent — check your inbox');
    } else {
      btn.textContent = 'Resend email';
      btn.disabled = false;
      const d = await res.json().catch(() => ({}));
      showToast(d.error || 'Could not resend — try again later');
    }
  } catch (e) {
    btn.textContent = 'Resend email';
    btn.disabled = false;
    showToast('Connection error');
  }
}

let _esAuthMode = 'signin';
function esAuthTab(mode) {
  _esAuthMode = mode;
  const isRegister = mode === 'register';
  // Reset to email/password form (hide forgot-password sub-view)
  esHideForgotPassword();
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

// ── CURATED LIBRARY DEMO ──────────────────────────────────────
// The 6 marketing-section "+ Install" buttons are demos. Real curated
// strands aren't seeded yet. Show auth modal for signed-out users,
// or a friendly "coming soon" toast for signed-in users.
function esInstallCuratedDemo() {
  if (ES_USER) {
    showToast('Curated strands launching soon — we\'ll notify you when ready');
  } else {
    esShowAuth('Sign in and we\'ll save your spot for curated strands');
  }
}

// ── MODAL FOCUS TRAP ──────────────────────────────────────────
// Keep keyboard focus inside an open modal. Restores focus to the
// triggering element on close. Activated when modal becomes visible.
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
      // Each modal has its own close path; fire a custom event the modal can listen to
      modal.dispatchEvent(new CustomEvent('es:dismiss'));
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  modal.addEventListener('keydown', handleKey);
  _esFocusTraps[modalId] = { handleKey, previouslyFocused };

  // Move focus to first focusable element
  const focusable = getFocusable();
  if (focusable.length) focusable[0].focus();
}

function esReleaseFocus(modalId) {
  const trap = _esFocusTraps[modalId];
  if (!trap) return;
  const modal = document.getElementById(modalId);
  if (modal) modal.removeEventListener('keydown', trap.handleKey);
  if (trap.previouslyFocused && trap.previouslyFocused.focus) {
    try { trap.previouslyFocused.focus(); } catch(_) {}
  }
  delete _esFocusTraps[modalId];
}

// Auto-trap when these modals open. Uses MutationObserver on .open class.
['es-auth-modal', 'es-handle-modal'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const obs = new MutationObserver(() => {
    if (el.classList.contains('open')) esTrapFocus(id);
    else esReleaseFocus(id);
  });
  obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  // Wire up dismiss listener
  el.addEventListener('es:dismiss', () => {
    if (id === 'es-auth-modal') esCloseAuth();
    else el.classList.remove('open');
  });
});

// // Highlight selected account type radio border
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
  if (!val || !/^[a-zA-Z0-9_-]{3,30}$/.test(val)) { showToast('Enter a valid handle first'); return; }
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/set-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + esGetJwt() },
      body: JSON.stringify({ handle: val })
    });
    const d = await res.json();
    if (!res.ok) { showToast(d.error || 'Could not set handle'); return; }
    ES_USER.handle = val;
    esSetStoredUser(ES_USER);
    document.getElementById('es-handle-modal').classList.remove('open');
    esOnSignedIn();
  } catch(e) { if (e.message !== '401') showToast('Connection error'); }
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
  if (!label) { showToast('Enter a label for this key'); return; }
  const scopes = [...document.querySelectorAll('#apikey-scopes input[type=checkbox]:checked')].map(cb => cb.value);
  if (!scopes.length) { showToast('Select at least one scope'); return; }
  try {
    const res = await esFetch('/api/apikeys', { method: 'POST', body: JSON.stringify({ label, scopes }) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Could not create key'); return; }
    esHideApiKeyForm();
    esLoadApiKeys();
    _revealedKey = data.key;
    document.getElementById('apikey-reveal-value').textContent = data.key;
    document.getElementById('apikey-reveal-modal').style.display = 'flex';
  } catch(e) { if (e.message !== '401') showToast('Connection error'); }
}

async function esRevokeApiKey(id) {
  if (!confirm('Revoke this key? Any tool using it will immediately lose access.')) return;
  try {
    const res = await esFetch(`/api/apikeys/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('Key revoked'); esLoadApiKeys(); }
    else showToast('Could not revoke key');
  } catch(e) { if (e.message !== '401') showToast('Connection error'); }
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
  let hash = window.location.hash.replace('#','');
  // SSR fallback: if no hash but path matches /s/, /b/, or /p/, use pathname.
  // This lets server-rendered pages hydrate via the same router without changing URLs.
  if (!hash) {
    const path = window.location.pathname;
    if (/^\/(s|b|p)\//.test(path)) {
      hash = path + window.location.search;
    }
  }
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
  } else if (type === 'verify') {
    esHandleVerifyToken(hashQuery ? new URLSearchParams(hashQuery).get('token') : '');
  } else if (type === 'reset-password') {
    esShowResetPassword(hashQuery ? new URLSearchParams(hashQuery).get('token') : '');
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
  if (tab === 'my-braids') esRenderMyBraids();
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
            <div class="efi-name">${ev.title||ev.name||'Event'}</div>
            <div class="efi-meta">${ev.venue||''}${ev.time?' · '+ev.time:''}</div>
            <div class="efi-strand">→ ${ev.strandTitle||''}</div>
            <div class="efi-actions">
              <button class="efi-btn-interested${esIsInterested(ev.id||ev._id,ev.date)?' active':''}" onclick="esToggleInterested(this,${JSON.stringify(ev).replace(/'/g,'&#39;')})" title="Maybe interested">🤔 Maybe</button>
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
    else { const d = await res.json(); showToast(d.error||'Could not subscribe'); }
  } catch(e) { if (e.message !== '401') showToast('Connection error'); }
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
    else { const d = await res.json(); showToast(d.error||'Could not subscribe'); }
  } catch(e) { if (e.message !== '401') showToast('Connection error'); }
}

async function esUnsubscribeBraid(braidId, e) {
  e?.stopPropagation();
  try {
    await esFetch(`/api/user/braids/${braidId}`, {method:'DELETE'});
    showToast('Unsubscribed from braid');
    esLoadInboxRows(_activeWorkspaceId||'all');
  } catch(err) {}
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
    if (res.status === 403) { showToast('Incorrect passcode'); return; }
    const data = await res.json();
    gate.style.display = 'none';
    esRenderStrandView(data.strand);
  } catch(e) { if (e.message !== '401') showToast('Connection error'); }
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
    if (!res.ok) { showToast('Could not load strand for editing'); return; }
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
      // datelist
      e.dateList     = (ev.date_list || []).map((d, i) => ({
        did: i, date: d.date||'', timeStart: d.time_start||'', timeEnd: d.time_end||'', note: d.note||''
      }));
      e.nextDid      = e.dateList.length;
      // recurring
      e.rules        = (ev.recurrence && ev.recurrence.length ? ev.recurrence : [mkRule()]).map((r, i) => ({
        rid: i, pattern: r.pattern||'weekly', every: r.every||1,
        days: r.days||['friday'], timeStart: r.time_start||'21:00', timeEnd: r.time_end||'23:30',
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
        const colorEl = docum