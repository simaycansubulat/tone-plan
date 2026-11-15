/* Glute & Tone — home-screen app. Data lives only on this phone (localStorage). */
const KEY = "toneapp.v1";
const DEFAULT = {
  profile: { age: 24, height: 163 },
  meas: [{ d: "2026-11-15", weight: 55 }],
  periods: ["2026-11-12"],
  cycleLen: 25, periodLen: 5,
  start: "2026-11-16",
  logs: {}, habits: {}
};
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { S = null; }
if (!S || typeof S !== "object") S = JSON.parse(JSON.stringify(DEFAULT));
for (const k in DEFAULT) if (S[k] === undefined) S[k] = JSON.parse(JSON.stringify(DEFAULT[k]));
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save. Storage is full or blocked."); } }
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}

/* ---------- helpers ---------- */
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
const pad = n => String(n).padStart(2, "0");
const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
function parseD(s) { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function addD(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function dDiff(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5); }
function today() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
const fmt = d => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const DOWKEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function nextDate(dow) { const d = today(); return addD(d, (dow - d.getDay() + 7) % 7); }
let toastT = null;
function toast(msg) { let t = document.querySelector(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200); }

/* ---------- cycle ---------- */
function cycleLen() {
  const p = [...S.periods].sort(); const diffs = [];
  for (let i = 1; i < p.length; i++) { const x = dDiff(parseD(p[i - 1]), parseD(p[i])); if (x >= 20 && x <= 40) diffs.push(x); }
  if (!diffs.length) return S.cycleLen;
  const last = diffs.slice(-3); return Math.round(last.reduce((a, b) => a + b, 0) / last.length);
}
function phaseOf(day, len) {
  const pl = S.periodLen || 5, ov = len - 14;
  if (day <= pl) return PH.period;
  if (day < ov - 1) return PH.foll;
  if (day <= ov + 1) return PH.ovu;
  if (day <= len - 5) return PH.lut;
  return PH.late;
}
function cycleAt(date) {
  const ps = [...S.periods].sort(); if (!ps.length) return null;
  const len = cycleLen(); let base = ps[0];
  for (const p of ps) if (parseD(p) <= date) base = p;
  const n = dDiff(parseD(base), date); const day = ((n % len) + len) % len + 1;
  const cs = addD(parseD(base), Math.floor(n / len) * len);
  return { day, len, ph: phaseOf(day, len), cs };
}
function progWeek(date) { return Math.floor(dDiff(parseD(S.start), date) / 7) + 1; }

/* ---------- exercise rows with logging ---------- */
function parseSR(sr) {
  const m = String(sr).match(/^(\d+)\s*×\s*(.+)$/); if (!m) return null;
  const target = m[2]; const r = target.match(/(\d+)\s*[–-]\s*(\d+)/);
  const top = r ? +r[2] : (target.match(/^(\d+)/) ? +target.match(/^(\d+)/)[1] : null);
  return { sets: +m[1], target, top, secs: /\d+s\b/.test(target) };
}
function dayLog(date, create) { if (!S.logs[date] && create) S.logs[date] = { ex: {}, chk: {} }; return S.logs[date]; }
function lastFor(id, beforeIso) {
  const dates = Object.keys(S.logs).filter(d => d < beforeIso).sort().reverse();
  for (const d of dates) { const ex = S.logs[d].ex || {}; for (const k in ex) if (k.split(":")[1] === id && ex[k].some(s => s && s.r !== "" && s.r != null)) return { d, sets: ex[k] }; }
  return null;
}
function howHTML(id) {
  const e = EX[id];
  const steps = (e.how || []).map(s => `<li>${esc(s)}</li>`).join("");
  const avoid = e.avoid ? `<div class="avoid"><b>Avoid:</b><ul>${e.avoid.map(a => `<li>${esc(a).replace(/&lt;(\/?)b&gt;/g, "<$1b>")}</li>`).join("")}</ul></div>` : "";
  const vids = (VIDEOS[id] || []).map(v => `<a class="vid" href="${esc(v.u)}" target="_blank" rel="noopener">▶ ${esc(v.l)} ↗</a>`).join("");
  return `<details class="how"><summary>How to do it</summary><ol>${steps}</ol>${avoid}${vids}</details>`;
}
function exRow(date, bi, block, item, week) {
  const [id, sr, rest] = item; const e = EX[id]; if (!e) return "";
  const key = bi + ":" + id; const lg = S.logs[date] || { ex: {}, chk: {} };
  const tag = e.tag ? `<span class="tag ${e.tag[0]}">${esc(e.tag[1])}</span>` : "";
  const works = WORKS[id] ? `<span class="works"><b>Works:</b> ${esc(WORKS[id])}</span>` : "";
  const tip = TIPS[id] ? `<span class="tip">${esc(TIPS[id])}</span>` : "";
  const start = e.start ? `<span class="start">${esc(e.start)}</span>` : "";
  const p = !block.warm ? parseSR(sr) : null;
  const isMachine = /Machine/i.test(block.h);
  let logUI = "", done = false;
  if (p) {
    const n = week <= 2 ? Math.min(p.sets, 2) : p.sets;
    const cur = (lg.ex || {})[key] || [];
    const last = lastFor(id, date);
    let lastTxt = "", up = "";
    if (last) {
      const rs = last.sets.filter(s => s && s.r !== "" && s.r != null);
      const kg = rs.map(s => s.k).filter(k => k !== "" && k != null);
      lastTxt = `<div class="last">Last time (${esc(fmt(parseD(last.d)))}): ${esc(rs.map(s => s.r).join(", "))} ${p.secs ? "sec" : "reps"}${kg.length ? " · " + esc(kg[kg.length - 1]) + " kg" : ""}</div>`;
      if (isMachine && p.top && rs.length >= n && rs.every(s => +s.r >= p.top)) up = `<div class="up">↑ You hit ${p.top} on every set last time. Add the smallest weight step today.</div>`;
    }
    let rows = "";
    for (let i = 0; i < n; i++) {
      const s = cur[i] || {}; const lastS = last && last.sets[i] ? last.sets[i] : {};
      rows += `<div class="setrow"><input type="checkbox" aria-label="Set ${i + 1} done" data-k="${key}" data-i="${i}" data-f="d" ${s.d ? "checked" : ""}><label class="k">Set ${i + 1}</label>` +
        `<input type="number" inputmode="numeric" aria-label="Set ${i + 1} ${p.secs ? "seconds" : "reps"}" placeholder="${esc(lastS.r || (p.secs ? "sec" : "reps"))}" value="${esc(s.r || "")}" data-k="${key}" data-i="${i}" data-f="r">` +
        (isMachine ? `<input type="number" inputmode="decimal" step="0.5" aria-label="Set ${i + 1} kg" placeholder="${esc(lastS.k ? lastS.k + " kg" : "kg")}" value="${esc(s.k || "")}" data-k="${key}" data-i="${i}" data-f="k">` : "<span></span>") + `</div>`;
    }
    done = cur.length >= n && cur.slice(0, n).every(s => s && s.d);
    logUI = `${lastTxt}${up}<div class="sets">${rows}</div>`;
  } else {
    done = !!(lg.chk || {})[key];
    logUI = `<label class="single"><input type="checkbox" data-c="${key}" ${done ? "checked" : ""}> Done</label>`;
  }
  return `<div class="ex${done ? " isdone" : ""}" data-row="${key}"><div class="exhead"><div class="n"><strong>${esc(e.n)}</strong>${tag}${works}<small class="s">${esc(e.s)}</small>${start}${tip}</div><div class="sr">${esc(sr)}${rest ? `<span class="rest">rest ${esc(rest)}</span>` : ""}</div></div>${howHTML(id)}${logUI}</div>`;
}
function countProgress(date, plan, week) {
  let total = 0, done = 0; const lg = S.logs[date] || { ex: {}, chk: {} };
  plan.b.forEach((b, bi) => {
    if (b.yoga) { total++; if ((lg.chk || {})[bi + ":yoga"]) done++; return; }
    b.x.forEach(item => {
      const key = bi + ":" + item[0]; const p = !b.warm ? parseSR(item[1]) : null;
      if (p) { const n = week <= 2 ? Math.min(p.sets, 2) : p.sets; total += n; const cur = (lg.ex || {})[key] || []; for (let i = 0; i < n; i++) if (cur[i] && cur[i].d) done++; }
      else { total++; if ((lg.chk || {})[key]) done++; }
    });
  });
  return { total, done };
}

/* ---------- views ---------- */
const HABITS = [["steps", "6–8k steps"], ["protein", "100 g+ protein"], ["water", "2 L water"], ["iron", "Iron tablet"], ["vitd", "Vitamin D"], ["posture", "Chin tucks during the day"]];
function viewDay(dateIso) {
  const date = parseD(dateIso); const key = DOWKEY[date.getDay()]; const plan = PLAN[key];
  const week = progWeek(date); const ci = cycleAt(date); const isToday = dateIso === iso(today());
  const pr = countProgress(dateIso, plan, week);
  const weekTxt = week >= 1 && week <= 16 ? `Week ${week} of 16` : (week < 1 ? "Before your start date" : "Plan finished: time for a new one!");
  const hab = (S.habits[dateIso] || {});
  const remind = plan.gym ? `<div class="note warn"><strong>Before you start</strong><ul><li>Brace before every rep: breathe into your belly, then tighten.</li><li>Move at the hips, never by arching or rounding your lower back.</li><li>Between sets, stand tall with shoulders down and back.</li><li><b>Pain rule:</b> mild (3/10 or less) and gone by tomorrow is OK. Sharp pain, pain down a leg, numbness, or pain that grows means stop that exercise.</li></ul></div>`
    : (plan.split ? `<div class="note accent"><strong>Splits rules:</strong> do it when you're warm. Never bounce. Stretch to 6–7 out of 10, and never to pain in the knee, groin or lower back.</div>` : "");
  const early = plan.gym && week >= 1 && week <= 2 ? `<div class="note accent"><strong>Weeks 1–2:</strong> only 2 sets of each exercise, light weights, 3–4 reps left. Focus on learning the moves.</div>` : "";
  const deload = plan.gym && week === 9 ? `<div class="note accent"><strong>Week 9 is an easy week:</strong> same weights, only 2 sets. Measure and take photos this week.</div>` : "";
  const blocks = plan.b.map((b, bi) => {
    if (b.yoga) { const k = bi + ":yoga"; const dn = !!((S.logs[dateIso] || {}).chk || {})[k];
      return `<div class="block"><div class="block-h"><h3>Yoga class</h3><span class="t">pick one</span></div><div class="ex vlist${dn ? " isdone" : ""}" data-row="${k}"><small class="s">Gentle beginner classes, kind to your lower back.</small>${YOGA.map(v => `<a href="${esc(v.u)}" target="_blank" rel="noopener">▶ ${esc(v.l.replace("Watch the video · ", ""))} ↗</a>`).join("")}<label class="single"><input type="checkbox" data-c="${k}" ${dn ? "checked" : ""}> Done</label></div></div>`; }
    return `<div class="block${b.warm ? " warm" : ""}"><div class="block-h"><h3>${esc(b.h)}</h3><span class="t">${esc(b.t)}</span></div>${b.x.map(it => exRow(dateIso, bi, b, it, week)).join("")}</div>`;
  }).join("");
  return `<div class="top"><div class="datenav"><button type="button" data-go="${iso(addD(date, -1))}" aria-label="Previous day">‹</button><button type="button" data-go="${iso(addD(date, 1))}" aria-label="Next day">›</button></div>${isToday ? `<span class="pill">Today</span>` : `<button type="button" class="btn ghost" data-go="${iso(today())}">Go to today</button>`}</div>
  <div class="hero"><div class="small" style="color:#fff;opacity:.9">${esc(fmt(date))} · ${esc(weekTxt)}</div><h1>${esc(plan.t)}</h1><div class="sub">${esc(plan.s)}</div>${ci ? `<div class="cyc">Cycle day ${ci.day} · ${esc(ci.ph.n)}</div>` : ""}<div class="progress"><i id="pbar" style="width:${pr.total ? Math.round(pr.done / pr.total * 100) : 0}%"></i></div><div class="small" style="color:#fff;opacity:.9;margin-top:4px" id="ptxt">${pr.done} of ${pr.total} done</div></div>
  ${ci ? `<div class="note good"><strong>Cycle tip:</strong> ${esc(ci.ph.tip)}</div>` : ""}${early}${deload}
  <div class="card"><h3>Daily habits</h3><div class="habits">${HABITS.map(h => `<label class="chk"><input type="checkbox" data-h="${h[0]}" data-date="${dateIso}" ${hab[h[0]] ? "checked" : ""}>${esc(h[1])}</label>`).join("")}</div></div>
  ${remind}${blocks}`;
}
function viewWeek() {
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const days = order.map(k => { const p = PLAN[k]; const d = nextDate(p.dow); return `<a href="#d-${iso(d)}"><span><b class="${p.gym ? "gym" : ""}">${esc(p.t)}</b><br><span class="small">${esc(p.s)}</span></span>›</a>`; }).join("");
  const hist = Object.keys(S.logs).sort().reverse().slice(0, 40).map(dIso => {
    const d = parseD(dIso); const plan = PLAN[DOWKEY[d.getDay()]]; const pr = countProgress(dIso, plan, progWeek(d));
    if (!pr.done) return ""; return `<a href="#d-${dIso}"><span><b>${esc(fmt(d))}</b> · ${esc(plan.t)}</span><span class="small">${pr.done}/${pr.total}</span></a>`;
  }).join("");
  return `<h1>My plan</h1><p class="small">Tap a day to open it. Each day has everything you need inside it.</p>
  <div class="list">${days}</div>
  <h2>History</h2>${hist ? `<div class="list">${hist}</div>` : `<p class="small">Your finished workouts will appear here. Tick sets on the Today screen to start.</p>`}
  <h2>Gym basics</h2>
  <div class="gloss"><div><b>Rep</b>: one full movement.</div><div><b>Set</b>: reps in a row. "3 × 10" = 3 sets of 10.</div><div><b>Rest</b>: pause between sets.</div><div><b>/ side</b>: all reps on one side, then the other.</div><div><b>Reps left</b>: stop most sets when 1–3 more would be possible.</div><div><b>Weight</b>: move the pin, or add plates.</div></div>
  <div class="note accent"><strong>Logging:</strong> type your reps (and kg on machines) for each set, and the set ticks itself. Next time you'll see what you did last time. When you hit the top of the range on every set, the app tells you to add weight.</div>
  <div class="card"><h3>16-week progression</h3>
  <div class="phase"><div class="w">Weeks 1–2</div><div>Learn the moves: 2 sets, light, 3–4 reps left.</div></div>
  <div class="phase"><div class="w">Weeks 3–8</div><div>Build: full sets, add weight or reps each week.</div></div>
  <div class="phase"><div class="w">Week 9</div><div>Easy week: only 2 sets. Measure and take photos.</div></div>
  <div class="phase"><div class="w">Weeks 10–16</div><div>Hip thrust machine on Monday becomes 4 × 6–10, heavier. Smith Romanian deadlift goes up to 4 sets.</div></div></div>
  ${goalsHTML()}`;
}
function goalsHTML() {
  return `<h2>My goals and rules</h2><div class="soft"><h3 style="color:var(--accent)">Goals</h3><ul class="clean"><li>Feminine, toned, not muscular</li><li>Small waist; lose belly fat and love handles</li><li>Flat, strong core that doesn't get thicker</li><li>Round "bubble" glutes, full and wide from the front</li><li>Slim, toned legs with less cellulite</li><li>Slimmer upper arms; toned back that doesn't get wider</li><li>Strong lower back, good posture, front split</li></ul>
  <h3 style="color:var(--accent);margin-top:10px">Rules</h3><ul class="clean"><li><b>No boxy hips:</b> no abduction machine, side leg raises, lunges or split squats</li><li><b>No thick legs:</b> no squats, leg press or leg extensions</li><li><b>No thick waist:</b> no weighted side bends or twists</li><li><b>No bulky arms or wide back:</b> no biceps, no shoulder presses, little lat work</li><li><b>Back-safe:</b> no planks, back extensions or heavy deadlifts</li><li>Order: warm-up → mat → machines → cool-down</li></ul></div>`;
}
function viewCycle() {
  const t = today(); const ci = cycleAt(t); const len = cycleLen();
  let body = "";
  if (ci) {
    const next = addD(ci.cs, ci.len); const until = dDiff(t, next); const pl = S.periodLen || 5; const ov = ci.len - 14;
    const rows = [[1, pl, PH.period], [pl + 1, ov - 2, PH.foll], [ov - 1, ov + 1, PH.ovu], [ov + 2, ci.len - 5, PH.lut], [ci.len - 4, ci.len, PH.late]].filter(r => r[1] >= r[0]);
    body = `<div class="card"><div class="small">Today · ${esc(fmt(t))}</div><div class="big">Day ${ci.day}</div><div style="font-weight:600;margin-top:4px">${esc(ci.ph.n)}</div><p class="small" style="margin-top:6px">${esc(ci.ph.tip)}</p><p style="margin:0">Next period expected <b>${esc(fmt(next))}</b> (in ${until} day${until === 1 ? "" : "s"}).</p></div>
    <h2>This cycle</h2><div class="card">${rows.map(r => `<div class="phase${ci.day >= r[0] && ci.day <= r[1] ? " now" : ""}"><div class="w">Days ${r[0]}–${r[1]}</div><div><b>${esc(r[2].n)}</b> · ${esc(fmt(addD(ci.cs, r[0] - 1)))} – ${esc(fmt(addD(ci.cs, r[1] - 1)))}</div></div>`).join("")}</div>`;
  }
  const list = [...S.periods].sort().reverse().map(p => `<div class="li"><span>${esc(fmt(parseD(p)))} ${parseD(p).getFullYear()}</span><button type="button" class="btn ghost" style="padding:4px 10px" data-delp="${p}" aria-label="Delete ${esc(p)}">Delete</button></div>`).join("");
  return `<h1>My cycle</h1>${body}
  <h2>Log a period</h2><div class="row"><label class="field">Period started on<input type="date" id="pdate" value="${iso(t)}"></label><button type="button" class="btn" id="padd">Save</button></div>
  <h2>Period history</h2><div class="list">${list || `<div class="li">No periods logged yet</div>`}</div>
  <h2>Settings</h2><div class="row"><label class="field">Period length (days)<input type="number" inputmode="numeric" id="plen" value="${S.periodLen}"></label><label class="field">Cycle length if unknown<input type="number" inputmode="numeric" id="clen" value="${S.cycleLen}"></label><button type="button" class="btn ghost" id="csave">Save</button></div>
  <p class="small" style="margin-top:8px">Average cycle used now: <b>${len} days</b>. ${S.periods.length >= 2 ? "Calculated from your logged periods." : "Log your next period start and the app will calculate your real average."}</p>
  <div class="note warn"><strong>Warning sign:</strong> if your period becomes irregular or stops, you're eating too little. Go back to maintenance calories (about 1,850) and see a doctor.</div>`;
}
function viewMe() {
  const m = [...S.meas].sort((a, b) => a.d < b.d ? -1 : 1); const latest = m[m.length - 1] || {}; const first = m[0] || {};
  const cur = latest.weight || "–";
  const cols = [["weight", "kg"], ["waist", "waist"], ["hips", "hips"], ["thigh", "thigh"], ["arm", "arm"]];
  const diff = (k) => (first[k] != null && latest[k] != null && m.length > 1) ? ((latest[k] - first[k]) > 0 ? "+" : "") + (Math.round((latest[k] - first[k]) * 10) / 10) : "";
  const rows = m.slice().reverse().map(r => `<tr><td>${esc(fmt(parseD(r.d)))}</td>${cols.map(c => `<td>${r[c[0]] != null ? esc(r[c[0]]) : "–"}</td>`).join("")}<td><button type="button" class="btn ghost" style="padding:2px 8px" data-delm="${r.d}" aria-label="Delete ${esc(r.d)}">✕</button></td></tr>`).join("");
  return `<h1>Me</h1>
  <div class="card"><div class="row"><label class="field">Age<input type="number" inputmode="numeric" id="age" value="${esc(S.profile.age || "")}"></label><label class="field">Height (cm)<input type="number" inputmode="numeric" id="height" value="${esc(S.profile.height || "")}"></label><div class="field">Current weight<b style="font-size:1.3rem;color:var(--fg);font-family:var(--display)">${esc(cur)} kg</b></div></div><button type="button" class="btn ghost" id="psave" style="margin-top:10px">Save details</button></div>
  <h2>Add measurements</h2><p class="small">Every 2 weeks, in the morning before eating. Compare in the same cycle phase. Leave a box empty if you didn't measure it.</p>
  <div class="card"><div class="row"><label class="field">Date<input type="date" id="mdate" value="${iso(today())}"></label><label class="field">Weight (kg)<input type="number" inputmode="decimal" step="0.1" id="mweight"></label></div>
  <div class="row" style="margin-top:8px"><label class="field">Waist (cm)<input type="number" inputmode="decimal" step="0.5" id="mwaist"></label><label class="field">Hips (cm)<input type="number" inputmode="decimal" step="0.5" id="mhips"></label></div>
  <div class="row" style="margin-top:8px"><label class="field">Upper thigh (cm)<input type="number" inputmode="decimal" step="0.5" id="mthigh"></label><label class="field">Upper arm (cm)<input type="number" inputmode="decimal" step="0.5" id="marm"></label></div>
  <button type="button" class="btn" id="madd" style="margin-top:10px">Save measurements</button></div>
  <h2>Progress</h2><div class="card scroll"><table class="tbl"><thead><tr><th>Date</th>${cols.map(c => `<th>${c[1]}</th>`).join("")}<th></th></tr></thead><tbody>${m.length > 1 ? `<tr style="font-weight:600;color:var(--accent)"><td>Change</td>${cols.map(c => `<td>${esc(diff(c[0]))}</td>`).join("")}<td></td></tr>` : ""}${rows}</tbody></table></div>
  <p class="small">Working well looks like: waist, thigh and arm going down, hips staying the same or going up.</p>
  <div class="note accent"><strong>Photos every 4 weeks:</strong> front, side and back in the same light. Check the front view for any boxy look.</div>
  ${goalsHTML()}
  <h2>Backup</h2><p class="small">Your data is saved only on this phone. Make a backup once a month and keep it in Files or iCloud Drive.</p>
  <div class="row"><button type="button" class="btn" id="exp">Save a backup</button><label class="btn ghost" for="imp">Restore a backup</label><input type="file" id="imp" accept="application/json,.json" hidden></div>`;
}
function viewFood() { return document.getElementById("foodtpl").innerHTML; }

/* ---------- router ---------- */
function route() {
  const h = (location.hash || "#today").slice(1); const app = document.getElementById("app");
  let nav = h;
  if (h === "today") app.innerHTML = viewDay(iso(today()));
  else if (/^d-\d{4}-\d{2}-\d{2}$/.test(h)) { app.innerHTML = viewDay(h.slice(2)); nav = "today"; }
  else if (h === "week") app.innerHTML = viewWeek();
  else if (h === "cycle") app.innerHTML = viewCycle();
  else if (h === "me") app.innerHTML = viewMe();
  else if (h === "food") app.innerHTML = viewFood();
  else { app.innerHTML = viewDay(iso(today())); nav = "today"; }
  document.querySelectorAll("nav.bar a").forEach(a => { if (a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
}
window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });

/* ---------- interactions ---------- */
function currentDayIso() { const h = location.hash.slice(1); return /^d-/.test(h) ? h.slice(2) : iso(today()); }
function refreshProgress() {
  const dIso = currentDayIso(); const d = parseD(dIso); const plan = PLAN[DOWKEY[d.getDay()]]; const pr = countProgress(dIso, plan, progWeek(d));
  const b = document.getElementById("pbar"), t = document.getElementById("ptxt");
  if (b) b.style.width = (pr.total ? Math.round(pr.done / pr.total * 100) : 0) + "%"; if (t) t.textContent = pr.done + " of " + pr.total + " done";
  if (pr.total && pr.done === pr.total) toast("Workout complete. Well done!");
}
function rowDoneState(key) {
  const dIso = currentDayIso(); const lg = S.logs[dIso] || { ex: {}, chk: {} }; const row = document.querySelector(`[data-row="${CSS.escape(key)}"]`); if (!row) return;
  const boxes = row.querySelectorAll('input[data-f="d"]');
  const done = boxes.length ? [...boxes].every(b => b.checked) : !!(lg.chk || {})[key];
  row.classList.toggle("isdone", done);
}
document.addEventListener("input", ev => {
  const el = ev.target; if (!el.dataset) return;
  if (el.dataset.k && (el.dataset.f === "r" || el.dataset.f === "k")) {
    const dIso = currentDayIso(); const lg = dayLog(dIso, true); const k = el.dataset.k, i = +el.dataset.i;
    lg.ex[k] = lg.ex[k] || []; lg.ex[k][i] = lg.ex[k][i] || {}; lg.ex[k][i][el.dataset.f] = el.value;
    if (el.dataset.f === "r" && el.value !== "") { lg.ex[k][i].d = true; const cb = document.querySelector(`input[data-k="${CSS.escape(k)}"][data-i="${i}"][data-f="d"]`); if (cb) cb.checked = true; }
    save(); rowDoneState(k); refreshProgress();
  }
});
document.addEventListener("change", ev => {
  const el = ev.target; if (!el.dataset) return; const dIso = currentDayIso();
  if (el.dataset.k && el.dataset.f === "d") { const lg = dayLog(dIso, true); const k = el.dataset.k, i = +el.dataset.i; lg.ex[k] = lg.ex[k] || []; lg.ex[k][i] = lg.ex[k][i] || {}; lg.ex[k][i].d = el.checked; save(); rowDoneState(k); refreshProgress(); }
  else if (el.dataset.c) { const lg = dayLog(dIso, true); lg.chk[el.dataset.c] = el.checked; save(); rowDoneState(el.dataset.c); refreshProgress(); }
  else if (el.dataset.h) { const d = el.dataset.date; S.habits[d] = S.habits[d] || {}; S.habits[d][el.dataset.h] = el.checked; save(); }
  else if (el.id === "imp" && el.files && el.files[0]) {
    const r = new FileReader(); r.onload = () => { try { const o = JSON.parse(r.result); if (!o || !o.logs || !o.periods) throw 0; S = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), o); save(); route(); toast("Backup restored"); } catch (e) { toast("That file isn't a Tone backup"); } }; r.readAsText(el.files[0]);
  }
});
document.addEventListener("click", async ev => {
  const el = ev.target.closest("button"); if (!el) return;
  if (el.dataset.go) { location.hash = el.dataset.go === iso(today()) ? "today" : "d-" + el.dataset.go; return; }
  if (el.id === "padd") { const v = document.getElementById("pdate").value; if (!v) return; if (!S.periods.includes(v)) S.periods.push(v); save(); route(); toast("Period saved"); }
  else if (el.dataset.delp) { S.periods = S.periods.filter(p => p !== el.dataset.delp); save(); route(); }
  else if (el.id === "csave") { const pl = +document.getElementById("plen").value, cl = +document.getElementById("clen").value; if (pl >= 2 && pl <= 10) S.periodLen = pl; if (cl >= 20 && cl <= 40) S.cycleLen = cl; save(); route(); toast("Saved"); }
  else if (el.id === "psave") { const a = +document.getElementById("age").value, h = +document.getElementById("height").value; if (a) S.profile.age = a; if (h) S.profile.height = h; save(); toast("Details saved"); }
  else if (el.id === "madd") {
    const d = document.getElementById("mdate").value || iso(today()); const e = { d };
    [["weight", "mweight"], ["waist", "mwaist"], ["hips", "mhips"], ["thigh", "mthigh"], ["arm", "marm"]].forEach(([k, id]) => { const v = document.getElementById(id).value; if (v !== "") e[k] = +v; });
    if (Object.keys(e).length < 2) { toast("Enter at least one number"); return; }
    S.meas = S.meas.filter(x => x.d !== d); S.meas.push(e); save(); route(); toast("Measurements saved");
  }
  else if (el.dataset.delm) { S.meas = S.meas.filter(x => x.d !== el.dataset.delm); save(); route(); }
  else if (el.id === "exp") {
    const txt = JSON.stringify(S); const name = "tone-backup-" + iso(today()) + ".json";
    try { const f = new File([txt], name, { type: "application/json" }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Tone backup" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
});
route();
