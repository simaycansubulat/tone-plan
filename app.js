/* Glute & Tone — 16-week, cycle-synced home-screen app. Data lives only on this phone (localStorage). */
const KEY = "toneapp.v1";
const DEFAULT = {
  profile: { age: 24, height: 163, startWeight: 55 },
  meas: [],
  periods: ["2026-11-12"],
  cycleLen: 25, periodLen: 5,
  start: "2026-11-16",
  logs: {}, habits: {}
};
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { S = null; }
if (!S || typeof S !== "object") S = JSON.parse(JSON.stringify(DEFAULT));
for (const k in DEFAULT) if (S[k] === undefined) S[k] = JSON.parse(JSON.stringify(DEFAULT[k]));
S.meas = (S.meas || []).filter(m => !(m.d === "2026-11-15" && Object.keys(m).length === 2 && m.weight === 55)); /* drop old placeholder */
if (S.profile.startWeight === undefined) S.profile.startWeight = 55;
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save. Storage is full or blocked."); } }
save();
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
const fmtY = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const DOWKEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const PROGRAM_DAYS = 112;
let toastT = null;
function toast(msg) { let t = document.querySelector(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200); }

/* ---------- cycle ---------- */
function cycleLen() {
  const p = [...S.periods].sort(); const diffs = [];
  for (let i = 1; i < p.length; i++) { const x = dDiff(parseD(p[i - 1]), parseD(p[i])); if (x >= 20 && x <= 40) diffs.push(x); }
  if (!diffs.length) return S.cycleLen;
  const last = diffs.slice(-3); return Math.round(last.reduce((a, b) => a + b, 0) / last.length);
}
function phaseKey(day, len) {
  const pl = S.periodLen || 5, ov = len - 14;
  if (day <= pl) return "period"; if (day < ov - 1) return "foll"; if (day <= ov + 1) return "ovu"; if (day <= len - 5) return "lut"; return "late";
}
function cycleAt(date) {
  const ps = [...S.periods].sort(); if (!ps.length) return null;
  const len = cycleLen(); let base = ps[0];
  for (const p of ps) if (parseD(p) <= date) base = p;
  const n = dDiff(parseD(base), date); const day = ((n % len) + len) % len + 1;
  const cs = addD(parseD(base), Math.floor(n / len) * len); const k = phaseKey(day, len);
  return { day, len, k, ph: PH[k], cs };
}
function progWeek(date) { return Math.floor(dDiff(parseD(S.start), date) / 7) + 1; }
function inProgram(date) { const n = dDiff(parseD(S.start), date); return n >= 0 && n < PROGRAM_DAYS; }

/* ---------- 16-week progression ---------- */
const BLOCKS = [
  { w: [1, 2], name: "Learn", cap: 2, note: "Learn the moves: 2 sets of everything, light weights, 3–4 reps left in the tank. Watch the videos and focus on form." },
  { w: [3, 4], name: "Foundation", note: "Full sets now. Weights that leave 2 reps in the tank. Write everything down." },
  { w: [5, 8], name: "Build", note: "New this block: 4 sets of hip thrusts with a 2-second squeeze at the top, more reps on the mat exercises, and a weight on clamshells and donkey kicks." },
  { w: [9, 9], name: "Easy week", cap: 2, note: "Recovery week: same weights as last week but only 2 sets. Your body gets stronger while it rests." },
  { w: [10, 13], name: "Strength", note: "New this block: heavier weights with fewer reps on the glute machines and Romanian deadlifts. Add weight whenever the app tells you to." },
  { w: [14, 16], name: "Shape", note: "New this block: higher reps with slow lowering (3 seconds down) for a full, rounded glute shape. Week 16 is your final check." }
];
const OVR = {
  Build: { htm: "4 × 10–12", bstance: "4 × 10–12 / side", smithrdl: "3 × 8–10", kickback: "3 × 15 / side", legcurl: "3 × 10–12", clamshell: "3 × 15 / side", donkey: "3 × 15 / side", deadbug: "3 × 10 / side", birddog: "3 × 8 / side", sideplank: "3 × 30–40s / side", curlup: "3 × 8 holds" },
  Strength: { htm: "4 × 6–10", slht: "3 × 8–10 / side", bstance: "4 × 8–10 / side", smithrdl: "4 × 8", kickback: "3 × 12 / side", legcurl: "3 × 8–12", cablerow: "3 × 8–12", closerow: "3 × 8–12", pulldown: "3 × 8–12", pushdown: "3 × 10–12", chestpress: "2 × 10–12", clamshell: "3 × 20 / side", donkey: "3 × 20 / side", deadbug: "3 × 12 / side", birddog: "3 × 10 / side", sideplank: "3 × 40s / side", curlup: "3 × 10 holds" },
  Shape: { htm: "4 × 12–15", slht: "3 × 12–15 / side", bstance: "3 × 12–15 / side", smithrdl: "3 × 10–12", kickback: "4 × 15 / side", legcurl: "3 × 12–15", clamshell: "3 × 20 / side", donkey: "3 × 20 / side", deadbug: "3 × 12 / side", birddog: "3 × 10 / side", sideplank: "3 × 40s / side", curlup: "3 × 10 holds" }
};
const BLOCKCUE = {
  Build: { htm: "This block: squeeze 2 seconds at the top of every rep.", clamshell: "This block: rest a 2.5–5 kg plate on your top knee.", donkey: "This block: hold a light dumbbell behind your knee or use an ankle weight." },
  Strength: { htm: "This block: heavier. Pick a weight where 6–10 reps is hard.", smithrdl: "This block: heavier, 4 sets of 8. Back flat, every rep.", sideplank: "This block: if it's pain-free, try it with straight legs." },
  Shape: { htm: "This block: 3 seconds lowering + 2-second squeeze at the top.", smithrdl: "This block: 3 seconds on the way down.", slht: "This block: 3 seconds lowering.", bstance: "This block: 3 seconds lowering." }
};
const STEP = { htm: 5, slht: 5, bstance: 5, smithrdl: 5, legcurl: 2.5, kickback: 2.5, cablerow: 2.5, closerow: 2.5, pulldown: 2.5, pushdown: 2.5, chestpress: 2.5, facepull: 2.5, pullthrough: 2.5 };
function blockOf(week) { return BLOCKS.find(b => week >= b.w[0] && week <= b.w[1]) || BLOCKS[BLOCKS.length - 1]; }
function prescribe(id, baseSR, week) { const b = blockOf(week); return (OVR[b.name] && OVR[b.name][id]) || baseSR; }

/* ---------- daily cycle-based adjustments ---------- */
function dayMods(plan, week, ci) {
  const b = blockOf(week); let cap = b.cap || 99; const notes = []; let food = "";
  if (ci) {
    const d = ci.day;
    if (ci.k === "period") {
      food = "Iron day: have beef or lentils with vitamin C (peppers, orange). Keep tea and coffee away from it.";
      if (plan.gym && d <= 2) { cap = Math.min(cap, 2); notes.push(`Period day ${d}: lighter session. 2 sets per exercise and about 20% lighter than last time. If you have bad cramps, do Saturday's yoga class instead.`); }
      else if (plan.gym) notes.push(`Period day ${d}: normal sets. Go about 10% lighter if you feel low on energy.`);
      else if (plan.split && d <= 2) notes.push(`Period day ${d}: be gentle. Swap the deep split stretches for the yoga class if you feel crampy.`);
      else notes.push(`Period day ${d}: gentle movement helps cramps. Keep the walk easy.`);
    } else if (ci.k === "foll") {
      notes.push(plan.gym ? "Strong phase: try 1 more rep or the next weight on hip thrusts and Romanian deadlifts today." : "High-energy phase: a good time to push your split stretch a little further, gently.");
    } else if (ci.k === "ovu") {
      notes.push(plan.gym ? "Around ovulation: you're strong, but joints can be looser. Warm up fully and control every rep." : "Around ovulation: joints can be looser, so stretch slowly and don't force the split.");
    } else if (ci.k === "lut") {
      notes.push(plan.gym ? "Luteal phase: keep the same weights and focus on clean form." : "Luteal phase: steady and calm. Keep your stretches the same as last time.");
      food = "You may be hungrier now. Up to 100–150 extra kcal is fine; choose protein first.";
    } else {
      notes.push(plan.gym ? "Pre-period days: if you're tired, drop the last set of each exercise. That's completely fine." : "Pre-period days: you may feel stiffer and bloated. Gentle stretching only.");
      food = "Bloating and 1–2 kg of water are normal now. Ignore the scale this week. Cravings? Greek yogurt with berries or a square of dark chocolate.";
    }
  }
  return { cap, notes, food, block: b };
}

/* ---------- measurements ---------- */
const MEAS = [
  { k: "weight", n: "Weight", u: "kg", how: "In the morning after the toilet, before eating or drinking, in underwear. Same scale, on a hard floor (not carpet)." },
  { k: "waist", n: "Waist (narrowest)", u: "cm", how: "Find the narrowest part of your torso, usually 2–3 cm above the belly button. Breathe out normally and measure at the end of the breath. Don't suck in. This tracks your small waist." },
  { k: "belly", n: "Belly (at the belly button)", u: "cm", how: "Tape straight across your belly button, level all the way round. Relaxed, after a normal breath out. This tracks belly fat." },
  { k: "highhip", n: "Love handles (top of hip bones)", u: "cm", how: "Feel the bony ridge of your hip bones at your sides, about 5 cm below the belly button. Measure around your body at that height. This tracks love handles." },
  { k: "hips", n: "Hips (fullest part of glutes)", u: "cm", how: "Feet together. Stand side-on to a mirror and wrap the tape around the fullest part of your glutes, level all the way round. This one should stay the same or go UP as your glutes grow." },
  { k: "thigh", n: "Upper thigh (right)", u: "cm", how: "Stand with weight on both feet, leg relaxed. Measure the widest part of the right thigh, just below the glute crease. Tracks slim legs." },
  { k: "arm", n: "Upper arm (right)", u: "cm", how: "Right arm hanging relaxed by your side. Measure halfway between the tip of your shoulder and your elbow. Tracks slimmer arms." }
];
function measureDays() {
  const out = []; const st = parseD(S.start);
  for (let i = 0; i < PROGRAM_DAYS; i++) {
    const d = addD(st, i);
    if (i === 0) { out.push(iso(d)); continue; }
    const ci = cycleAt(d); const last = parseD(out[out.length - 1]);
    if (ci && ci.day === 7 && dDiff(last, d) >= 14) out.push(iso(d));
  }
  return out;
}
function isMeasureDay(dIso) { return measureDays().includes(dIso); }
function measForm(dIso, prefix) {
  const cur = S.meas.find(m => m.d === dIso) || {};
  return `<div class="mgrid">${MEAS.map(m => `<label class="field">${esc(m.n)} (${m.u})<input type="number" inputmode="decimal" step="${m.k === "weight" ? "0.1" : "0.5"}" id="${prefix}-${m.k}" value="${cur[m.k] != null ? esc(cur[m.k]) : ""}"></label>`).join("")}</div>
  <button type="button" class="btn" data-msave="${dIso}" data-prefix="${prefix}" style="margin-top:10px">Save measurements</button>`;
}

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
  for (const d of dates) { const ex = S.logs[d].ex || {}; for (const k in ex) if (k.split(":")[1] === id && ex[k].some(s => s && s.r !== "" && s.r != null)) return { d, sets: ex[k], base: k }; }
  return null;
}
function suggestKg(id, last, p, baseSR) {
  if (!last) return null;
  const rs = last.sets.filter(s => s && s.r !== "" && s.r != null); const kgs = rs.map(s => parseFloat(s.k)).filter(x => !isNaN(x));
  if (!kgs.length) return null; const lastKg = Math.max(...kgs); const step = STEP[id] || 2.5;
  const lastP = parseSR(prescribe(id, baseSR, progWeek(parseD(last.d))));
  const hitTop = lastP && lastP.top && rs.length >= 2 && rs.every(s => +s.r >= lastP.top);
  const heavierBlock = lastP && p.top && p.top < lastP.top;
  const lighterBlock = lastP && p.top && p.top > lastP.top + 2;
  if (hitTop || heavierBlock) return { kg: lastKg + step, why: hitTop ? `You hit ${lastP.top} reps on every set last time.` : "New block with fewer reps: go a little heavier." };
  if (lighterBlock) return { kg: Math.max(0, lastKg - step), why: "New block with more reps: go a little lighter." };
  return { kg: lastKg, why: "Same weight. Aim for 1 more rep than last time." };
}
function howHTML(id) {
  const e = EX[id];
  const steps = (e.how || []).map(s => `<li>${esc(s)}</li>`).join("");
  const avoid = e.avoid ? `<div class="avoid"><b>Avoid:</b><ul>${e.avoid.map(a => `<li>${esc(a).replace(/&lt;(\/?)b&gt;/g, "<$1b>")}</li>`).join("")}</ul></div>` : "";
  const vids = (VIDEOS[id] || []).map(v => `<a class="vid" href="${esc(v.u)}" target="_blank" rel="noopener">▶ ${esc(v.l)} ↗</a>`).join("");
  return `<details class="how"><summary>How to do it</summary><ol>${steps}</ol>${avoid}${vids}</details>`;
}
function setCount(block, item, week, cap) { if (block.warm) return 0; const p = parseSR(prescribe(item[0], item[1], week)); return p ? Math.min(p.sets, cap) : 0; }
function exRow(date, bi, block, item, week, cap) {
  const id = item[0], rest = item[2]; const e = EX[id]; if (!e) return "";
  const sr = block.warm ? item[1] : prescribe(id, item[1], week);
  const key = bi + ":" + id; const lg = S.logs[date] || { ex: {}, chk: {} };
  const tag = e.tag ? `<span class="tag ${e.tag[0]}">${esc(e.tag[1])}</span>` : "";
  const works = WORKS[id] ? `<span class="works"><b>Works:</b> ${esc(WORKS[id])}</span>` : "";
  const tip = TIPS[id] ? `<span class="tip">${esc(TIPS[id])}</span>` : "";
  const bname = blockOf(week).name; const cue = !block.warm && BLOCKCUE[bname] && BLOCKCUE[bname][id] ? `<span class="cue">${esc(BLOCKCUE[bname][id])}</span>` : "";
  const p = !block.warm ? parseSR(sr) : null;
  const isMachine = /Machine/i.test(block.h);
  let logUI = "", done = false, startTxt = "";
  if (p) {
    const n = Math.min(p.sets, cap);
    const cur = (lg.ex || {})[key] || [];
    const last = lastFor(id, date);
    let lastTxt = "";
    if (last) {
      const rs = last.sets.filter(s => s && s.r !== "" && s.r != null); const kg = rs.map(s => s.k).filter(k => k !== "" && k != null);
      lastTxt = `<div class="last">Last time (${esc(fmt(parseD(last.d)))}): ${esc(rs.map(s => s.r).join(", "))} ${p.secs ? "sec" : "reps"}${kg.length ? " · " + esc(kg[kg.length - 1]) + " kg" : ""}</div>`;
    }
    const sug = isMachine ? suggestKg(id, last, p, item[1]) : null;
    if (sug) lastTxt += `<div class="up">Today: <b>${esc(sug.kg)} kg</b>. ${esc(sug.why)}</div>`;
    else if (isMachine && e.start) startTxt = `<span class="start">${esc(e.start)}</span>`;
    let rows = "";
    for (let i = 0; i < n; i++) {
      const s = cur[i] || {}; const lastS = last && last.sets[i] ? last.sets[i] : {};
      const kgPh = sug ? sug.kg + " kg" : (lastS.k ? lastS.k + " kg" : "kg");
      rows += `<div class="setrow"><input type="checkbox" aria-label="Set ${i + 1} done" data-k="${key}" data-i="${i}" data-f="d" ${s.d ? "checked" : ""}><label class="k">Set ${i + 1}</label>` +
        `<input type="number" inputmode="numeric" aria-label="Set ${i + 1} ${p.secs ? "seconds" : "reps"}" placeholder="${esc(lastS.r || (p.secs ? "sec" : "reps"))}" value="${esc(s.r || "")}" data-k="${key}" data-i="${i}" data-f="r">` +
        (isMachine ? `<input type="number" inputmode="decimal" step="0.5" aria-label="Set ${i + 1} kg" placeholder="${esc(kgPh)}" value="${esc(s.k || "")}" data-k="${key}" data-i="${i}" data-f="k">` : "<span></span>") + `</div>`;
    }
    done = cur.length >= n && cur.slice(0, n).every(s => s && s.d);
    logUI = `${lastTxt}<div class="sets">${rows}</div>`;
    var shownSR = n < p.sets ? `${n} × ${p.target}` : sr;
  } else {
    done = !!(lg.chk || {})[key];
    logUI = `<label class="single"><input type="checkbox" data-c="${key}" ${done ? "checked" : ""}> Done</label>`;
  }
  const srTxt = (typeof shownSR !== "undefined" && shownSR) ? shownSR : sr;
  return `<div class="ex${done ? " isdone" : ""}" data-row="${key}"><div class="exhead"><div class="n"><strong>${esc(e.n)}</strong>${tag}${works}<small class="s">${esc(e.s)}</small>${startTxt}${tip}${cue}</div><div class="sr">${esc(srTxt)}${rest ? `<span class="rest">rest ${esc(rest)}</span>` : ""}</div></div>${howHTML(id)}${logUI}</div>`;
}
function countProgress(dIso) {
  const date = parseD(dIso); const plan = PLAN[DOWKEY[date.getDay()]]; const week = progWeek(date); const m = dayMods(plan, week, cycleAt(date));
  let total = 0, done = 0; const lg = S.logs[dIso] || { ex: {}, chk: {} };
  plan.b.forEach((b, bi) => {
    if (b.yoga) { total++; if ((lg.chk || {})[bi + ":yoga"]) done++; return; }
    b.x.forEach(item => {
      const key = bi + ":" + item[0]; const n = setCount(b, item, week, m.cap);
      if (n) { total += n; const cur = (lg.ex || {})[key] || []; for (let i = 0; i < n; i++) if (cur[i] && cur[i].d) done++; }
      else { total++; if ((lg.chk || {})[key]) done++; }
    });
  });
  if (isMeasureDay(dIso)) { total++; if (S.meas.some(x => x.d === dIso)) done++; }
  return { total, done };
}

/* ---------- views ---------- */
const HABITS = [["steps", "6–8k steps"], ["protein", "100 g+ protein"], ["water", "2 L water"], ["iron", "Iron tablet"], ["vitd", "Vitamin D"], ["posture", "Chin tucks today"]];
function viewDay(dateIso) {
  const date = parseD(dateIso); const key = DOWKEY[date.getDay()]; const plan = PLAN[key];
  const week = progWeek(date); const ci = cycleAt(date); const isToday = dateIso === iso(today());
  const m = dayMods(plan, week, ci); const pr = countProgress(dateIso); const inP = inProgram(date);
  const weekTxt = inP ? `Week ${week} of 16 · ${m.block.name}` : (week < 1 ? "Your plan starts Mon 16 Nov" : "16 weeks finished!");
  const hab = (S.habits[dateIso] || {});
  const measure = isMeasureDay(dateIso) ? `<div class="card mcard"><h3>📏 Measurement day</h3><p class="small">Do this first thing in the morning: after the toilet, before eating or drinking. Also take photos (front, side, back). See the <a href="#measure">Measure tab</a> for exactly where to measure.</p>${measForm(dateIso, "dm")}</div>` : "";
  const blockNote = plan.gym && inP && week === blockOf(week).w[0] ?`<div class="note accent"><strong>${esc(m.block.name)} block:</strong> ${esc(m.block.note)}</div>` : "";
  const brace = plan.gym ? `<details class="note warn"><summary><strong>Back reminders</strong> (tap)</summary><ul><li>Brace before every rep: breathe into your belly, then tighten.</li><li>Move at the hips, never by arching or rounding your lower back.</li><li>Between sets, stand tall with shoulders down and back.</li><li><b>Pain rule:</b> mild (3/10 or less) and gone by tomorrow is OK. Sharp pain, pain down a leg, numbness or pain that grows means stop.</li></ul></details>` : "";
  const blocks = plan.b.map((b, bi) => {
    if (b.yoga) { const k = bi + ":yoga"; const dn = !!((S.logs[dateIso] || {}).chk || {})[k];
      return `<div class="block"><div class="block-h"><h3>Yoga class</h3><span class="t">pick one</span></div><div class="ex vlist${dn ? " isdone" : ""}" data-row="${k}"><small class="s">Gentle beginner classes, kind to your lower back.</small>${YOGA.map(v => `<a href="${esc(v.u)}" target="_blank" rel="noopener">▶ ${esc(v.l.replace("Watch the video · ", ""))} ↗</a>`).join("")}<label class="single"><input type="checkbox" data-c="${k}" ${dn ? "checked" : ""}> Done</label></div></div>`; }
    return `<div class="block${b.warm ? " warm" : ""}"><div class="block-h"><h3>${esc(b.h)}</h3><span class="t">${esc(b.t)}</span></div>${b.x.map(it => exRow(dateIso, bi, b, it, week, m.cap)).join("")}</div>`;
  }).join("");
  const ph = ci ? `<span class="chip ph-${ci.k}">Cycle day ${ci.day} · ${esc(ci.ph.n)}</span>` : "";
  return `<div class="top"><div class="datenav"><button type="button" data-go="${iso(addD(date, -1))}" aria-label="Previous day">‹</button><button type="button" data-go="${iso(addD(date, 1))}" aria-label="Next day">›</button></div>${isToday ? `<span class="pill">Today</span>` : `<button type="button" class="btn ghost" data-go="${iso(today())}">Go to today</button>`}</div>
  <div class="hero"><div class="small" style="color:#fff;opacity:.92">${esc(fmt(date))} · ${esc(weekTxt)}</div><h1>${esc(plan.t)}</h1><div class="sub">${esc(plan.s)}</div><div style="margin-top:8px">${ph}</div><div class="progress"><i id="pbar" style="width:${pr.total ? Math.round(pr.done / pr.total * 100) : 0}%"></i></div><div class="small" style="color:#fff;opacity:.92;margin-top:4px" id="ptxt">${pr.done} of ${pr.total} done</div></div>
  ${m.notes.length ? `<div class="note good"><strong>Today:</strong> ${m.notes.map(esc).join(" ")}</div>` : ""}
  ${m.food ? `<div class="note accent"><strong>Food today:</strong> ${esc(m.food)}</div>` : ""}
  ${blockNote}${measure}
  <div class="card"><h3>Daily habits</h3><div class="habits">${HABITS.map(h => `<label class="chk"><input type="checkbox" data-h="${h[0]}" data-date="${dateIso}" ${hab[h[0]] ? "checked" : ""}>${esc(h[1])}</label>`).join("")}</div></div>
  ${brace}${blocks}`;
}
function viewCalendar() {
  const st = parseD(S.start); const t = iso(today()); const md = measureDays();
  let html = `<h1>16 weeks</h1><p class="small">${esc(fmtY(st))} – ${esc(fmtY(addD(st, PROGRAM_DAYS - 1)))}. Tap any day to open it. Colours show your cycle phase; 📏 marks measurement days.</p>
  <div class="legend"><span class="chip ph-period">Period</span><span class="chip ph-foll">Strong</span><span class="chip ph-ovu">Ovulation</span><span class="chip ph-lut">Luteal</span><span class="chip ph-late">Pre-period</span></div>`;
  let curBlock = "";
  for (let w = 0; w < 16; w++) {
    const b = blockOf(w + 1);
    if (b.name !== curBlock) { curBlock = b.name; html += `<h2>${esc(b.name)} · week${b.w[0] === b.w[1] ? " " + b.w[0] : "s " + b.w[0] + "–" + b.w[1]}</h2><p class="small">${esc(b.note)}</p>`; }
    html += `<div class="list"><div class="li wk"><b>Week ${w + 1}</b><span class="small">${esc(fmt(addD(st, w * 7)))} – ${esc(fmt(addD(st, w * 7 + 6)))}</span></div>`;
    for (let i = 0; i < 7; i++) {
      const d = addD(st, w * 7 + i); const dI = iso(d); const plan = PLAN[DOWKEY[d.getDay()]]; const ci = cycleAt(d); const pr = countProgress(dI);
      const status = pr.done === 0 ? "" : (pr.done >= pr.total ? "✓" : `${pr.done}/${pr.total}`);
      html += `<a href="#d-${dI}" class="${dI === t ? "istoday" : ""}"><span class="cal"><span class="dot ph-${ci ? ci.k : "none"}" title="${ci ? esc(ci.ph.n) : ""}"></span><span><b>${esc(fmt(d))}</b>${md.includes(dI) ? " 📏" : ""}<br><span class="small ${plan.gym ? "gymtxt" : ""}">${esc(plan.t.replace(/^\w+ · /, "").replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/, plan.s.split(" · ")[0] + " · " + plan.s.split(" · ")[1]))}</span>${ci ? ` <span class="small">· day ${ci.day}</span>` : ""}</span></span><span class="stat">${status}</span></a>`;
    }
    html += `</div>`;
  }
  return html;
}
function viewMeasure() {
  const md = measureDays(); const t = iso(today()); const next = md.find(d => d >= t);
  const m = [...S.meas].sort((a, b) => a.d < b.d ? -1 : 1); const first = m[0] || {}; const latest = m[m.length - 1] || {};
  const diff = k => (first[k] != null && latest[k] != null && m.length > 1) ? ((latest[k] - first[k]) > 0 ? "+" : "") + (Math.round((latest[k] - first[k]) * 10) / 10) : "";
  const sched = md.map((d, i) => { const did = S.meas.some(x => x.d === d); const ci = cycleAt(parseD(d)); return `<a href="#d-${d}"><span><b>${i === 0 ? "Start" : "Check " + i}</b> · ${esc(fmt(parseD(d)))}<br><span class="small">${ci ? "Cycle day " + ci.day : ""}${i === 0 ? " · your starting point" : " · right after your period: least water retention"}</span></span><span class="stat">${did ? "✓" : (d < t ? "missed" : "")}</span></a>`; }).join("");
  const short = { weight: "kg", waist: "waist", belly: "belly", highhip: "love h.", hips: "hips", thigh: "thigh", arm: "arm" };
  const rows = m.slice().reverse().map(r => `<tr><td>${esc(fmt(parseD(r.d)))}</td>${MEAS.map(c => `<td>${r[c.k] != null ? esc(r[c.k]) : "–"}</td>`).join("")}<td><button type="button" class="btn ghost" style="padding:2px 8px" data-delm="${r.d}" aria-label="Delete ${esc(r.d)}">✕</button></td></tr>`).join("");
  return `<h1>Measurements</h1>
  <div class="card"><div class="small">Next measurement</div><div style="font-family:var(--display);font-size:1.3rem;font-weight:700;color:var(--accent)">${next ? esc(fmt(parseD(next))) : "All done!"}</div><p class="small" style="margin:4px 0 0">Measurement days are timed to cycle day 7, just after your period, when water retention is lowest. That way every check compares fairly. If you log a period on a different date, these days move automatically.</p></div>
  <h2>Schedule</h2><div class="list">${sched}</div>
  <h2>Progress</h2>${m.length ? `<div class="card scroll"><table class="tbl"><thead><tr><th>Date</th>${MEAS.map(c => `<th>${short[c.k]}</th>`).join("")}<th></th></tr></thead><tbody>${m.length > 1 ? `<tr style="font-weight:600;color:var(--accent)"><td>Change</td>${MEAS.map(c => `<td>${esc(diff(c.k))}</td>`).join("")}<td></td></tr>` : ""}${rows}</tbody></table></div>
  <p class="small">Working well looks like: waist, belly, love handles, thigh and arm going down; hips staying the same or going up. Starting weight: ${esc(S.profile.startWeight)} kg.</p>` : `<p class="small">No measurements yet. Your first one is on ${esc(fmt(parseD(md[0])))}.</p>`}
  <h2>Add or edit measurements</h2><div class="card"><label class="field" style="max-width:200px">Date<input type="date" id="mdate" value="${esc(next && next === t ? t : t)}"></label>${measForm("__pick__", "mm")}</div>
  <h2>How to measure</h2>
  <div class="note accent"><strong>Rules for every check</strong><ul><li>Morning, after the toilet, before eating or drinking.</li><li>Underwear only, standing relaxed, feet together, looking straight ahead.</li><li>Soft tape measure, snug on the skin but not pressing in.</li><li>Keep the tape level all the way round. Check in a mirror.</li><li>Measure each spot twice. If they differ by more than 0.5 cm, do a third and use the middle number.</li><li>Always the right side for thigh and arm.</li><li>Take photos the same day: front, side and back, same light, outfit and distance.</li></ul></div>
  ${MEAS.map(x => `<details class="card"><summary><b>${esc(x.n)}</b></summary><p style="margin:8px 0 0">${esc(x.how)}</p></details>`).join("")}`;
}
function viewCycle() {
  const t = today(); const ci = cycleAt(t); const len = cycleLen(); let body = "";
  if (ci) {
    const next = addD(ci.cs, ci.len); const until = dDiff(t, next); const pl = S.periodLen || 5; const ov = ci.len - 14;
    const rows = [[1, pl, "period"], [pl + 1, ov - 2, "foll"], [ov - 1, ov + 1, "ovu"], [ov + 2, ci.len - 5, "lut"], [ci.len - 4, ci.len, "late"]].filter(r => r[1] >= r[0]);
    body = `<div class="card"><div class="small">Today · ${esc(fmt(t))}</div><div class="big">Day ${ci.day}</div><div style="margin-top:6px"><span class="chip ph-${ci.k}">${esc(ci.ph.n)}</span></div><p class="small" style="margin-top:6px">${esc(ci.ph.tip)}</p><p style="margin:0">Next period expected <b>${esc(fmt(next))}</b> (in ${until} day${until === 1 ? "" : "s"}).</p></div>
    <h2>This cycle</h2><div class="card">${rows.map(r => `<div class="phase${ci.day >= r[0] && ci.day <= r[1] ? " now" : ""}"><div class="w">Days ${r[0]}–${r[1]}</div><div><span class="chip ph-${r[2]}">${esc(PH[r[2]].n)}</span><br>${esc(fmt(addD(ci.cs, r[0] - 1)))} – ${esc(fmt(addD(ci.cs, r[1] - 1)))}</div></div>`).join("")}</div>`;
  }
  const list = [...S.periods].sort().reverse().map(p => `<div class="li"><span>${esc(fmtY(parseD(p)))}</span><button type="button" class="btn ghost" style="padding:4px 10px" data-delp="${p}" aria-label="Delete ${esc(p)}">Delete</button></div>`).join("");
  return `<h1>My cycle</h1>${body}
  <h2>Log a period</h2><p class="small">When your period starts, save the date. The whole 16-week calendar, daily tips and measurement days adjust automatically.</p><div class="row"><label class="field">Period started on<input type="date" id="pdate" value="${iso(t)}"></label><button type="button" class="btn" id="padd">Save</button></div>
  <h2>Period history</h2><div class="list">${list || `<div class="li">No periods logged yet</div>`}</div>
  <h2>Settings</h2><div class="row"><label class="field">Period length (days)<input type="number" inputmode="numeric" id="plen" value="${S.periodLen}"></label><label class="field">Cycle length if unknown<input type="number" inputmode="numeric" id="clen" value="${S.cycleLen}"></label><button type="button" class="btn ghost" id="csave">Save</button></div>
  <p class="small" style="margin-top:8px">Cycle length used now: <b>${len} days</b>. ${S.periods.length >= 2 ? "Calculated from your logged periods." : "After you log your next period, the app uses your real average."}</p>
  <div class="note warn"><strong>Warning sign:</strong> if your period becomes irregular or stops, you're eating too little. Go back to maintenance calories (about 1,850) and see a doctor.</div>`;
}
function viewOverview() {
  return `<h1>Overview</h1><p class="small">Beginner · 3 gym days · 16 weeks · ${esc(fmtY(parseD(S.start)))} – ${esc(fmtY(addD(parseD(S.start), PROGRAM_DAYS - 1)))}</p>
  <div class="stats"><div class="stat"><b>1,650–1,750</b><span>kcal per day</span></div><div class="stat"><b>100–115 g</b><span>protein per day</span></div><div class="stat"><b>6–8k</b><span>steps per day</span></div></div>
  <div class="soft"><h3 style="color:var(--accent)">My goals</h3><ul class="clean"><li>Feminine, toned, not muscular</li><li>Small waist; lose belly fat and love handles</li><li>Flat, strong core that doesn't get thicker</li><li>Round "bubble" glutes, full and wide from the front</li><li>Slim, toned legs with less cellulite</li><li>Slimmer upper arms; toned back that doesn't get wider</li><li>Strong lower back, good posture, front split</li></ul>
  <h3 style="color:var(--accent);margin-top:10px">My rules</h3><ul class="clean"><li><b>No boxy hips:</b> no abduction machine, side leg raises, lunges or split squats</li><li><b>No thick legs:</b> no squats, leg press or leg extensions</li><li><b>No thick waist:</b> no weighted side bends or twists</li><li><b>No bulky arms or wide back:</b> no biceps, no shoulder presses, little lat work</li><li><b>Back-safe:</b> no planks, back extensions or heavy deadlifts</li><li>Order: warm-up → mat → machines → cool-down</li></ul></div>
  <h2>My week</h2><div class="list">${["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map(k => `<div class="li"><b class="${PLAN[k].gym ? "gymtxt" : ""}">${esc(PLAN[k].t)}</b><span class="small" style="text-align:right">${esc(PLAN[k].s)}</span></div>`).join("")}</div>
  <h2>How the 16 weeks get harder</h2><div class="card">${BLOCKS.map(b => `<div class="phase"><div class="w">Week${b.w[0] === b.w[1] ? " " + b.w[0] : "s " + b.w[0] + "–" + b.w[1]}</div><div><b>${esc(b.name)}</b><br><span class="small">${esc(b.note)}</span></div></div>`).join("")}</div>
  <div class="note accent"><strong>Weights:</strong> on machine exercises the app suggests today's weight from what you logged last time. If you did the top of the rep range on every set, it adds a step (5 kg on the hip thrust and Smith machines, 2.5 kg on cables). Always choose good form over the number.</div>
  <h2>How your cycle changes each day</h2><ul class="clean"><li><b>Period days 1–2:</b> gym days drop to 2 sets and about 20% lighter.</li><li><b>Days 3–5:</b> normal sets, a bit lighter if you're tired.</li><li><b>Strong phase:</b> push for an extra rep or weight.</li><li><b>Ovulation:</b> strong, but extra careful warm-up.</li><li><b>Luteal:</b> same weights, clean form.</li><li><b>Pre-period:</b> drop the last set if you're tired; ignore the scale.</li></ul>
  <p class="small">Research on cycle-based training is mixed, so treat this as guidance and listen to your body.</p>
  <h2>Gym basics</h2><div class="gloss"><div><b>Rep</b>: one full movement.</div><div><b>Set</b>: reps in a row. "3 × 10" = 3 sets of 10.</div><div><b>Rest</b>: pause between sets.</div><div><b>/ side</b>: all reps on one side, then the other.</div><div><b>Reps left</b>: stop most sets when 1–3 more would be possible.</div><div><b>Weight</b>: move the pin, or add plates.</div></div>
  <h2>My details</h2><div class="card"><div class="row"><label class="field">Age<input type="number" inputmode="numeric" id="age" value="${esc(S.profile.age || "")}"></label><label class="field">Height (cm)<input type="number" inputmode="numeric" id="height" value="${esc(S.profile.height || "")}"></label><label class="field">Start weight (kg)<input type="number" inputmode="decimal" step="0.1" id="sweight" value="${esc(S.profile.startWeight || "")}"></label></div><button type="button" class="btn ghost" id="psave" style="margin-top:10px">Save details</button></div>
  <h2>Backup</h2><p class="small">Everything is saved only on this phone. Make a backup once a month and keep it in Files or iCloud Drive.</p>
  <div class="row"><button type="button" class="btn" id="exp">Save a backup</button><label class="btn ghost" for="imp">Restore a backup</label><input type="file" id="imp" accept="application/json,.json" hidden></div>
  <p class="small" style="margin-top:20px">General guidance, not medical advice. Follow your doctor's dosing for iron and vitamin D. If back pain keeps coming back, see a physiotherapist.</p>`;
}
function viewFood() { return document.getElementById("foodtpl").innerHTML; }

/* ---------- router ---------- */
function route() {
  const h = (location.hash || "#today").slice(1); const app = document.getElementById("app"); let nav = h;
  if (/^d-\d{4}-\d{2}-\d{2}$/.test(h)) { app.innerHTML = viewDay(h.slice(2)); nav = h.slice(2) === iso(today()) ? "today" : "cal"; }
  else if (h === "cal") app.innerHTML = viewCalendar();
  else if (h === "measure") app.innerHTML = viewMeasure();
  else if (h === "cycle") app.innerHTML = viewCycle();
  else if (h === "overview") app.innerHTML = viewOverview();
  else if (h === "food") app.innerHTML = viewFood();
  else { const st = parseD(S.start); app.innerHTML = (today() < st ? `<div class="note accent"><strong>Your 16 weeks start ${esc(fmt(st))}.</strong> Here's your first day.</div>` : "") + viewDay(iso(today() < st ? st : today())); nav = "today"; }
  document.querySelectorAll("nav.bar a").forEach(a => { if (a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (h === "cal") { const el = document.querySelector(".istoday"); if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({ block: "center" }), 50); }
}
window.addEventListener("hashchange", () => { route(); if (location.hash !== "#cal") window.scrollTo(0, 0); });

/* ---------- interactions ---------- */
function currentDayIso() { const h = location.hash.slice(1); return /^d-/.test(h) ? h.slice(2) : iso(today()); }
function refreshProgress() {
  const pr = countProgress(currentDayIso()); const b = document.getElementById("pbar"), t = document.getElementById("ptxt");
  if (b) b.style.width = (pr.total ? Math.round(pr.done / pr.total * 100) : 0) + "%"; if (t) t.textContent = pr.done + " of " + pr.total + " done";
  if (pr.total && pr.done === pr.total) toast("Day complete. Well done!");
}
function rowDoneState(key) {
  const lg = S.logs[currentDayIso()] || { ex: {}, chk: {} }; const row = document.querySelector(`[data-row="${CSS.escape(key)}"]`); if (!row) return;
  const boxes = row.querySelectorAll('input[data-f="d"]'); row.classList.toggle("isdone", boxes.length ? [...boxes].every(b => b.checked) : !!(lg.chk || {})[key]);
}
document.addEventListener("input", ev => {
  const el = ev.target; if (!el.dataset || !el.dataset.k || !(el.dataset.f === "r" || el.dataset.f === "k")) return;
  const lg = dayLog(currentDayIso(), true); const k = el.dataset.k, i = +el.dataset.i;
  lg.ex[k] = lg.ex[k] || []; lg.ex[k][i] = lg.ex[k][i] || {}; lg.ex[k][i][el.dataset.f] = el.value;
  if (el.dataset.f === "r" && el.value !== "") { lg.ex[k][i].d = true; const cb = document.querySelector(`input[data-k="${CSS.escape(k)}"][data-i="${i}"][data-f="d"]`); if (cb) cb.checked = true; }
  save(); rowDoneState(k); refreshProgress();
});
document.addEventListener("change", ev => {
  const el = ev.target; if (!el.dataset) return; const dIso = currentDayIso();
  if (el.dataset.k && el.dataset.f === "d") { const lg = dayLog(dIso, true); const k = el.dataset.k, i = +el.dataset.i; lg.ex[k] = lg.ex[k] || []; lg.ex[k][i] = lg.ex[k][i] || {}; lg.ex[k][i].d = el.checked; save(); rowDoneState(k); refreshProgress(); }
  else if (el.dataset.c) { const lg = dayLog(dIso, true); lg.chk[el.dataset.c] = el.checked; save(); rowDoneState(el.dataset.c); refreshProgress(); }
  else if (el.dataset.h) { const d = el.dataset.date; S.habits[d] = S.habits[d] || {}; S.habits[d][el.dataset.h] = el.checked; save(); }
  else if (el.id === "imp" && el.files && el.files[0]) {
    const r = new FileReader(); r.onload = () => { try { const o = JSON.parse(r.result); if (!o || !o.logs || !o.periods) throw 0; S = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), o); save(); route(); toast("Backup restored"); } catch (e) { toast("That file isn't a Tone backup"); } }; r.readAsText(el.files[0]);
  }
  else if (el.id === "mdate") { const cur = S.meas.find(m => m.d === el.value) || {}; MEAS.forEach(m => { const i = document.getElementById("mm-" + m.k); if (i) i.value = cur[m.k] != null ? cur[m.k] : ""; }); }
});
document.addEventListener("click", async ev => {
  const el = ev.target.closest("button"); if (!el) return;
  if (el.dataset.go) { location.hash = el.dataset.go === iso(today()) ? "today" : "d-" + el.dataset.go; return; }
  if (el.dataset.msave) {
    const d = el.dataset.msave === "__pick__" ? (document.getElementById("mdate").value || iso(today())) : el.dataset.msave; const pre = el.dataset.prefix; const e = { d };
    MEAS.forEach(m => { const v = document.getElementById(pre + "-" + m.k).value; if (v !== "") e[m.k] = +v; });
    if (Object.keys(e).length < 2) { toast("Enter at least one number"); return; }
    S.meas = S.meas.filter(x => x.d !== d); S.meas.push(e); save(); toast("Measurements saved"); if (pre === "dm") refreshProgress(); else route(); return;
  }
  if (el.id === "padd") { const v = document.getElementById("pdate").value; if (!v) return; if (!S.periods.includes(v)) S.periods.push(v); save(); route(); toast("Period saved. Your calendar has been updated."); }
  else if (el.dataset.delp) { S.periods = S.periods.filter(p => p !== el.dataset.delp); save(); route(); }
  else if (el.id === "csave") { const pl = +document.getElementById("plen").value, cl = +document.getElementById("clen").value; if (pl >= 2 && pl <= 10) S.periodLen = pl; if (cl >= 20 && cl <= 40) S.cycleLen = cl; save(); route(); toast("Saved"); }
  else if (el.id === "psave") { const a = +document.getElementById("age").value, h = +document.getElementById("height").value, w = +document.getElementById("sweight").value; if (a) S.profile.age = a; if (h) S.profile.height = h; if (w) S.profile.startWeight = w; save(); toast("Details saved"); }
  else if (el.dataset.delm) { S.meas = S.meas.filter(x => x.d !== el.dataset.delm); save(); route(); }
  else if (el.id === "exp") {
    const txt = JSON.stringify(S); const name = "tone-backup-" + iso(today()) + ".json";
    try { const f = new File([txt], name, { type: "application/json" }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Tone backup" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
});
route();
