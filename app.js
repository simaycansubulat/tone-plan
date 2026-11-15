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

/* ---------- home workouts after the gym membership ends ---------- */
if (!S.gymEnd) S.gymEnd = "2027-02-05";
Object.assign(EX, {
  marchwarm: { n: "Marching warm-up", s: "Gets your body warm without equipment.", how: ["March on the spot, lifting your knees to hip height, swinging your arms.", "Every 30 seconds switch to: arm circles, side steps, gentle torso turns.", "3–5 minutes, until you feel warm."], q: "low impact warm up" },
  sofahip: { n: "Hip thrust on the sofa", tag: ["back", "back-safe"], s: "Your home version of the hip thrust machine.", start: "Start: bodyweight. Later: a backpack with books on your hips", how: ["Sit on the floor with your upper back (just under the shoulder blades) against the edge of a sofa or bed.", "Feet flat, hip-width apart, knees bent. Chin tucked.", "Push through your heels and lift your hips until your body is straight from knees to shoulders. Squeeze 2 seconds.", "Lower slowly until your hips almost touch the floor."], avoid: ["Arching your lower back at the top. Ribs stay down.", "The sofa sliding: put it against a wall."], q: "hip thrust on couch" },
  slbridge: { n: "Single-leg glute bridge", tag: ["side", "hip-dip area"], s: "One-leg glute work for the side glutes, no equipment.", how: ["Lie on your back, knees bent, feet flat.", "Lift one foot and hold that knee toward your chest.", "Push through the heel of the other foot and lift your hips, keeping them level.", "Squeeze 1 second at the top, lower slowly. All reps one side, then the other."], avoid: ["Hips tilting to one side.", "Arching your lower back."], q: "single leg glute bridge" },
  frogpump: { n: "Frog pumps", s: "Fast glute burner with knees turned out. Very low TFL.", how: ["Lie on your back, put the soles of your feet together and let your knees fall open.", "Pull your heels toward your glutes.", "Push through the outside edges of your feet and lift your hips, squeezing hard.", "Lower and repeat quickly but controlled."], avoid: ["Arching your back at the top."], q: "frog pumps glutes" },
  sliderhc: { n: "Towel hamstring curl", tag: ["back", "back-safe"], s: "Firms the back of the thighs (cellulite area) at home.", how: ["Lie on your back on a smooth floor, heels on a towel (or socks), knees bent.", "Lift your hips into a bridge.", "Slowly slide your heels away until your legs are almost straight, keeping hips up.", "Pull your heels back in. Too hard? Lower your hips between reps."], avoid: ["Letting your hips drop and your back arch."], q: "towel hamstring curl" },
  kneepush: { n: "Push-up on knees", s: "Tones chest and the back of the arms with your bodyweight.", how: ["Hands a little wider than your shoulders, knees on a mat, body straight from head to knees.", "Tighten your belly and squeeze your glutes.", "Lower your chest toward the floor, elbows at about 45° from your body.", "Push back up."], avoid: ["Hips sagging. If your back hurts, do them against a kitchen counter instead."], q: "knee push ups" },
  bottlekick: { n: "Triceps kickback with water bottles", s: "Back of the upper arms. Use two full 1–1.5 L bottles.", how: ["Stand with feet hip-width, soft knees, lean forward slightly with a flat back.", "Elbows pinned at your sides, bent at 90°.", "Straighten your arms back until they're straight, squeeze the backs of your arms.", "Bend them back slowly."], avoid: ["Swinging the elbows.", "Rounding your back."], q: "tricep kickback" },
  proneyt: { n: "Floor Y and T raises", s: "Posture: strengthens the upper back without equipment.", how: ["Lie face down, forehead on a folded towel, legs relaxed on the floor.", "Y: arms stretched forward in a Y, thumbs up. Lift your arms a few centimetres by squeezing your shoulder blades. Hold 2 s.", "T: arms out to the sides like a T, thumbs up. Lift and hold 2 s.", "Alternate Y and T. Only the arms lift, never the legs."], avoid: ["Lifting your chest high or your legs (that strains the lower back)."], q: "prone y t raise" }
});
Object.assign(WORKS, { marchwarm: "Heart, whole body (warm-up)", sofahip: "Glute max (main); some hamstrings and gluteus medius", slbridge: "Glute max and gluteus medius (side glutes)", frogpump: "Glute max, especially with the knees turned out", sliderhc: "Hamstrings (back of the thighs) and glutes", kneepush: "Chest, triceps (back of the arms), core", bottlekick: "Triceps (back of the upper arm)", proneyt: "Middle and lower trapezius, rear shoulders (posture)" });
Object.assign(TIPS, { sofahip: "Back: brace first, ribs down. Lock out with your glutes, not your lower back.", slbridge: "Back: ribs down and hips level.", sliderhc: "Back: keep your hips up and belly tight.", proneyt: "Posture: shoulders down away from your ears, chin slightly tucked.", kneepush: "Back: belly tight so your hips don't sag." });
applyTR();
Object.assign(VIDEOS, {
  sofahip: [YT("RR0oZhhUVWo", "Get Strong with Emily"), YT("PCzON8KAV1A", "at home · Casey Shipp")],
  slbridge: [YT("9bl48SV62u4", "Doctor Jo, physical therapist")],
  frogpump: [YT("OCMhnXQFzCI", "Hailey Happens Fitness")],
  sliderhc: [YT("cjtsLDniFpk", "Gillian Gelinas")],
  kneepush: [YT("CbjT4e_BgAs", "Sami Leigh Fitness")],
  bottlekick: [YT("9pKPXi69uJs", "Krissy Cela (dumbbells: use water bottles)")],
  proneyt: [YT("Xgi0r1pYmvk", "Y raise · Doctor Jo, physical therapist"), YT("Yv6sUKOwOY8", "Y, T and more · Doctor Jo")],
  marchwarm: [YT("TkrmqzZ5UGI", "Lucy Wyndham-Read")]
});
const HOME = {
  mon: { t: "Monday · Home A", s: "Home · glutes + core + posture · ~45 min", gym: true, home: true, dow: 1, b: [
    { h: "Warm-up", t: "~10 min", warm: true, x: [["marchwarm", "4 min"], ["catcow", "8"], ["n9090", "8 / side"], ["cars", "5 / dir"], ["openbook", "8 / side"], ["bridge", "2 × 12", "30s"]] },
    { h: "1 · Glutes (mat)", t: "sets × reps · rest", x: [["clamshell", "3 × 20 / side", "30s"], ["sofahip", "4 × 12–15", "90s"], ["slbridge", "3 × 10 / side", "60s"], ["donkey", "3 × 20 / side", "30s"], ["frogpump", "2 × 20", "45s"]] },
    { h: "2 · Core + posture (mat)", t: "sets × reps · rest", x: [["deadbug", "3 × 10 / side", "30s"], ["birddog", "3 × 8 / side", "30s"], ["proneyt", "3 × 8", "45s"]] },
    DAYS.A[3]] },
  wed: { t: "Wednesday · Home B", s: "Home · back of legs + core + arms · ~45 min", gym: true, home: true, dow: 3, b: [
    { h: "Warm-up", t: "~10 min", warm: true, x: [["marchwarm", "4 min"], ["legswing", "12 / side"], ["wallhinge", "10"], ["rockback", "10 / side"], ["wallslide", "10 + 10"]] },
    { h: "1 · Glutes + hamstrings (mat)", t: "sets × reps · rest", x: [["sliderhc", "3 × 8–10", "60s"], ["slbridge", "3 × 12 / side", "60s"], ["donkey", "3 × 20 / side", "30s"], ["frogpump", "3 × 20", "45s"]] },
    { h: "2 · Core + arms (mat)", t: "sets × reps · rest", x: [["birddog", "3 × 8 / side", "30s"], ["sideplank", "3 × 30s / side", "30s"], ["kneepush", "3 × 6–10", "60s"]] },
    DAYS.B[3]] },
  fri: { t: "Friday · Home C", s: "Home · glutes + posture + arms · ~45 min", gym: true, home: true, dow: 5, b: [
    { h: "Warm-up", t: "~10 min", warm: true, x: [["marchwarm", "4 min"], ["childs", "8 + 30s"], ["n9090", "8 / side"], ["cars", "5 / dir"], ["wallslide", "10 + 10"], ["bridge", "2 × 10", "30s"]] },
    { h: "1 · Glutes (mat)", t: "sets × reps · rest", x: [["clamshell", "3 × 20 / side", "30s"], ["sofahip", "3 × 15", "90s"], ["slbridge", "3 × 12 / side", "60s"]] },
    { h: "2 · Core, posture + arms (mat)", t: "sets × reps · rest", x: [["curlup", "3 × 10 holds", "30s"], ["deadbug", "2 × 10 / side", "30s"], ["proneyt", "3 × 8", "45s"], ["bottlekick", "3 × 12–15", "45s"], ["kneepush", "2 × 6–10", "60s"]] },
    DAYS.C[3]] }
};
function planFor(date) { const k = DOWKEY[date.getDay()]; return (HOME[k] && iso(date) > S.gymEnd) ? HOME[k] : PLAN[k]; }
function dayLabel(p) { return p.gym ? (p.home ? "Home " : "Gym ") + p.t.slice(-1) : (p.dow === 4 ? "Rest" : (p.dow === 6 ? "Yoga" : "Splits")); }

/* ---------- 16-week progression ---------- */
const BLOCKS = [
  { w: [1, 2], name: "Learn", cap: 2, note: "Hareketleri öğren: her hareketten 2 set, hafif ağırlık; set bittiğinde 3–4 tekrar daha yapabilecek gücün kalsın. Videoları izle ve forma odaklan." },
  { w: [3, 4], name: "Foundation", note: "Artık tam setler. Set bittiğinde 2 tekrar daha yapabilecek gücün kalacak bir ağırlık seç. Her şeyi kaydet." },
  { w: [5, 8], name: "Build", note: "Bu blokta yeni: hip thrust 4 set ve tepede 2 saniye sıkma, mat hareketlerinde daha fazla tekrar, clamshell ve donkey kick'e ağırlık." },
  { w: [9, 9], name: "Easy week", cap: 2, note: "Hafif hafta: geçen haftayla aynı ağırlıklar ama sadece 2 set. Vücudun dinlenirken güçlenir." },
  { w: [10, 13], name: "Strength", note: "Bu blokta yeni: kalça makinelerinde ve Romanian deadlift'te daha ağır, daha az tekrar. Uygulama söyledikçe ağırlık ekle." },
  { w: [14, 16], name: "Shape", note: "Bu blokta yeni: dolgun, yuvarlak bir kalça için yavaş indirişle (3 saniye) daha yüksek tekrar. 16. hafta son ölçüm haftan." }
];
const OVR = {
  Build: { htm: "4 × 10–12", bstance: "4 × 10–12 / side", smithrdl: "3 × 8–10", kickback: "3 × 15 / side", legcurl: "3 × 10–12", clamshell: "3 × 15 / side", donkey: "3 × 15 / side", deadbug: "3 × 10 / side", birddog: "3 × 8 / side", sideplank: "3 × 30–40s / side", curlup: "3 × 8 holds" },
  Strength: { htm: "4 × 6–10", slht: "3 × 8–10 / side", bstance: "4 × 8–10 / side", smithrdl: "4 × 8", kickback: "3 × 12 / side", legcurl: "3 × 8–12", cablerow: "3 × 8–12", closerow: "3 × 8–12", pulldown: "3 × 8–12", pushdown: "3 × 10–12", chestpress: "2 × 10–12", clamshell: "3 × 20 / side", donkey: "3 × 20 / side", deadbug: "3 × 12 / side", birddog: "3 × 10 / side", sideplank: "3 × 40s / side", curlup: "3 × 10 holds" },
  Shape: { sofahip: "4 × 15–20", slbridge: "3 × 15 / side", frogpump: "3 × 25", sliderhc: "3 × 10–12", kneepush: "3 × 8–12", bottlekick: "3 × 15", proneyt: "3 × 10", htm: "4 × 12–15", slht: "3 × 12–15 / side", bstance: "3 × 12–15 / side", smithrdl: "3 × 10–12", kickback: "4 × 15 / side", legcurl: "3 × 12–15", clamshell: "3 × 20 / side", donkey: "3 × 20 / side", deadbug: "3 × 12 / side", birddog: "3 × 10 / side", sideplank: "3 × 40s / side", curlup: "3 × 10 holds" }
};
const BLOCKCUE = {
  Build: { htm: "Bu blok: her tekrarın tepesinde 2 saniye sık.", clamshell: "Bu blok: üstteki dizinin üstüne 2,5–5 kg'lık bir plaka koy.", donkey: "Bu blok: diz arkana hafif bir dambıl sıkıştır ya da ayak bileği ağırlığı kullan." },
  Strength: { htm: "Bu blok: daha ağır. 6–10 tekrarın zor geldiği bir ağırlık seç.", smithrdl: "Bu blok: daha ağır, 4 set × 8. Her tekrarda sırt düz.", sideplank: "Bu blok: ağrı yoksa bacaklar düz dene." },
  Shape: { sofahip: "Bu blok: kalçanın üstünde kitap dolu sırt çantası, 3 saniyede in, tepede 2 saniye sık.", slbridge: "Bu blok: 3 saniyede indir.", htm: "Bu blok: 3 saniyede indir + tepede 2 saniye sık.", smithrdl: "Bu blok: inerken 3 saniye.", slht: "Bu blok: 3 saniyede indir.", bstance: "Bu blok: 3 saniyede indir." }
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
      food = "Demir günü: dana eti ya da mercimeği C vitamini ile ye (biber, portakal). Çay ve kahveyi bu öğünden uzak tut.";
      if (plan.gym && d <= 2) { cap = Math.min(cap, 2); notes.push(`Regl ${d}. gün: hafif antrenman. Her hareketten 2 set ve geçen seferden yaklaşık %20 hafif. Krampların kötüyse onun yerine cumartesinin yoga dersini yap.`); }
      else if (plan.gym) notes.push(`Regl ${d}. gün: normal setler. Enerjin düşükse yaklaşık %10 hafiflet.`);
      else if (plan.split && d <= 2) notes.push(`Regl ${d}. gün: nazik ol. Krampın varsa derin split esnemeleri yerine yoga dersini yap.`);
      else notes.push(`Regl ${d}. gün: hafif hareket kramplara iyi gelir. Yürüyüş rahat tempoda olsun.`);
    } else if (ci.k === "foll") {
      notes.push(plan.gym ? "Güçlü dönem: bugün hip thrust ve Romanian deadlift'te 1 tekrar fazlasını ya da bir sonraki ağırlığı dene." : "Enerjinin yüksek olduğu dönem: split esnemende biraz daha ileri gitmek için iyi bir zaman, nazikçe.");
    } else if (ci.k === "ovu") {
      notes.push(plan.gym ? "Yumurtlama dönemi: güçlüsün ama eklemler daha gevşek olabilir. İyice ısın ve her tekrarı kontrol et." : "Yumurtlama dönemi: eklemler daha gevşek olabilir, yavaş esne ve split'i zorlama.");
    } else if (ci.k === "lut") {
      notes.push(plan.gym ? "Luteal faz: aynı ağırlıklarla devam et ve temiz forma odaklan." : "Luteal faz: sakin ve istikrarlı. Esnemelerin geçen seferle aynı kalsın.");
      food = "Şu an daha aç olabilirsin. 100–150 kcal fazlası sorun değil; önce protein seç.";
    } else {
      notes.push(plan.gym ? "Regl öncesi günler: yorgunsan her hareketin son setini atla. Bu tamamen normal." : "Regl öncesi günler: daha tutuk ve şiş hissedebilirsin. Sadece hafif esneme.");
      food = "Şişkinlik ve 1–2 kg su tutma şu an normal. Bu hafta tartıyı boşver. Canın tatlı mı çekiyor? Orman meyveli süzme yoğurt ya da bir kare bitter çikolata.";
    }
  }
  return { cap, notes, food, block: b };
}

/* ---------- measurements ---------- */
/* dir: -1 = going down is good, 1 = going up is good, 0 = neutral */
const MEAS = [
  { g: "Body", k: "weight", n: "Weight", u: "kg", dir: 0, how: "Morning, after the toilet, before eating or drinking, in underwear. Same scale every time, on a hard floor (not carpet). Weight alone can mislead: muscle replaces fat, so trust the tape more." },
  { g: "Upper body", k: "bust", n: "Bust (fullest point)", u: "cm", dir: 0, how: "Wear a thin non-padded bra or nothing. Arms down. Tape around the fullest part of the bust and straight across the back. Don't squash." },
  { g: "Upper body", k: "ribcage", n: "Under the bust (ribcage)", u: "cm", dir: -1, how: "Directly under the bust, where a bra band sits. Tape level all the way round, breathe out normally." },
  { g: "Waist & belly", k: "waist", n: "Waist (narrowest point)", u: "cm", dir: -1, how: "Bend to one side: the crease that forms is your natural waist, usually 2–3 cm above the belly button. Stand straight, breathe out normally and measure at the end of the breath. Don't suck in. This tracks your small waist." },
  { g: "Waist & belly", k: "navel", n: "Belly button", u: "cm", dir: -1, how: "Tape straight across the middle of your belly button, level all the way round your back. Relaxed belly, after a normal breath out. This is your main belly-fat number." },
  { g: "Waist & belly", k: "lowbelly", n: "Lower belly", u: "cm", dir: -1, how: "Measure about 5 cm (three fingers) below the belly button, level all the way round. Tracks the lower belly 'pouch'." },
  { g: "Waist & belly", k: "highhip", n: "Love handles (top of hip bones)", u: "cm", dir: -1, how: "Put your hands on your hips and feel the bony ridge at the top. Measure all the way round at that height, over the soft area at your sides. Tracks love handles." },
  { g: "Hips & glutes", k: "hipdip", n: "Hip-dip line", u: "cm", dir: 1, how: "Feel the bony bump at the side of your upper thigh (the top of the thigh bone), roughly level with the bottom of your pubic bone. Measure all the way round at that height, feet together. As your side glutes grow, this should go UP." },
  { g: "Hips & glutes", k: "hips", n: "Hips (fullest part of glutes)", u: "cm", dir: 1, how: "Feet together. Stand side-on to a mirror and move the tape up and down until you find the fullest part of your glutes. Keep it level all the way round. This should go UP or stay the same as your glutes grow." },
  { g: "Legs", k: "thighTopR", n: "Inner/upper thigh, right (highest point)", u: "cm", dir: -1, how: "Stand with feet hip-width apart and weight on both legs, muscles relaxed. Slide the tape as high as it goes on the right thigh, right up into the groin and just under the glute crease. This tracks the inner thigh." },
  { g: "Legs", k: "thighTopL", n: "Inner/upper thigh, left (highest point)", u: "cm", dir: -1, how: "Same as the right side, on the left leg. Comparing both sides shows if one leg is different." },
  { g: "Legs", k: "knee", n: "Above the knee, right", u: "cm", dir: -1, how: "Measure around the leg about 5 cm (three fingers) above the top of the kneecap, leg straight and relaxed." },
  { g: "Legs", k: "calf", n: "Calf, right", u: "cm", dir: -1, how: "Stand with weight on both feet. Measure around the widest part of the calf." },
  { g: "Arms", k: "armR", n: "Upper inner arm, right", u: "cm", dir: -1, how: "Let the arm hang relaxed by your side, palm facing your leg. Find the softest, fullest part of the inner/back of the upper arm, about a third of the way down from the armpit to the elbow. Measure around the arm there, tape level. Don't flex." },
  { g: "Arms", k: "armL", n: "Upper inner arm, left", u: "cm", dir: -1, how: "Same as the right side, on the left arm, at the same height." }
];
/* migrate old keys from earlier versions */
S.meas.forEach(m => {
  if (m.belly != null && m.navel == null) { m.navel = m.belly; delete m.belly; }
  if (m.thigh != null && m.thighTopR == null) { m.thighTopR = m.thigh; delete m.thigh; }
  if (m.arm != null && m.armR == null) { m.armR = m.arm; delete m.arm; }
  if (m.armMidR != null && m.armR == null) m.armR = m.armMidR; if (m.armTop != null && m.armR == null) m.armR = m.armTop; if (m.armMidL != null && m.armL == null) m.armL = m.armMidL;
  delete m.armMidR; delete m.armTop; delete m.armMidL; delete m.midthigh;
});
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
  const groups = [...new Set(MEAS.map(m => m.g))];
  return groups.map(g => `<div class="mgroup">${esc(g)}</div><div class="mgrid">${MEAS.filter(m => m.g === g).map(m => `<label class="field">${esc(m.n)} (${m.u})<input type="number" inputmode="decimal" step="${m.k === "weight" ? "0.1" : "0.5"}" id="${prefix}-${m.k}" value="${cur[m.k] != null ? esc(cur[m.k]) : ""}"></label>`).join("")}</div>`).join("") + `
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
  if (hitTop || heavierBlock) return { kg: lastKg + step, why: hitTop ? `Geçen sefer her sette ${lastP.top} tekrara ulaştın.` : "Yeni blokta tekrar sayısı daha az: ağırlığı biraz artır." };
  if (lighterBlock) return { kg: Math.max(0, lastKg - step), why: "Yeni blokta tekrar sayısı daha fazla: ağırlığı biraz azalt." };
  return { kg: lastKg, why: "Aynı ağırlık. Geçen seferden 1 tekrar fazlasını hedefle." };
}
function howHTML(id) {
  const e = EX[id];
  const steps = (e.how || []).map(s => `<li>${esc(s)}</li>`).join("");
  const avoid = e.avoid ? `<div class="avoid"><b>Kaçın:</b><ul>${e.avoid.map(a => `<li>${esc(a).replace(/&lt;(\/?)b&gt;/g, "<$1b>")}</li>`).join("")}</ul></div>` : "";
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
  const date = parseD(dIso); const plan = planFor(date); const week = progWeek(date); const m = dayMods(plan, week, cycleAt(date));
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
  const date = parseD(dateIso); const key = DOWKEY[date.getDay()]; const plan = planFor(date);
  const week = progWeek(date); const ci = cycleAt(date); const isToday = dateIso === iso(today());
  const m = dayMods(plan, week, ci); const pr = countProgress(dateIso); const inP = inProgram(date);
  const weekTxt = inP ? `Week ${week} of 16 · ${m.block.name}` : (week < 1 ? "Your plan starts Mon 16 Nov" : "16 weeks finished!");
  const hab = (S.habits[dateIso] || {});
  const measure = isMeasureDay(dateIso) ? `<div class="card mcard"><h3>📏 Measurement day</h3><p class="small">Sabah ilk iş yap: tuvaletten sonra, bir şey yiyip içmeden önce. Fotoğraf da çek (önden, yandan, arkadan). Tam olarak nereden ölçeceğin <a href="#measure">Measure sekmesinde</a>.</p>${measForm(dateIso, "dm")}</div>` : "";
  const blockNote = plan.gym && inP && week === blockOf(week).w[0] ?`<div class="note accent"><strong>${esc(m.block.name)} block:</strong> ${esc(m.block.note)}</div>` : "";
  const brace = plan.gym ? `<details class="note warn"><summary><strong>Back reminders</strong> (tap)</summary><ul><li>Her tekrardan önce karnını kilitle (brace): karnına nefes al, sonra sıkılaştır.</li><li>Hareketi kalçadan yap; asla belini çukurlaştırarak ya da yuvarlayarak değil.</li><li>Setler arasında dik dur, omuzlar aşağıda ve geride.</li><li><b>Ağrı kuralı:</b> hafif (10 üzerinden 3 veya altı) ve ertesi gün geçen ağrı sorun değil. Keskin ağrı, bacağa yayılan ağrı, uyuşma ya da artan ağrı varsa dur.</li></ul></details>` : "";
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
  ${dateIso === S.gymEnd && plan.gym && !plan.home ? `<div class="note accent"><strong>Last gym day!</strong> Pazartesiden itibaren pazartesi/çarşamba/cuma antrenmanların evde mat antrenmanı. Bugün en iyi hip thrust ağırlığını not et.</div>` : ""}
  ${plan.home ? `<div class="note accent"><strong>Home workout:</strong> hedefler aynı, makine yok. Tekrarları yavaş yap ve güçlü sık. Zorlaştırmak için tekrar ekle ya da kanepede hip thrust yaparken kalçanın üstüne kitap dolu bir sırt çantası koy.</div>` : ""}
  ${blockNote}${measure}
  <div class="card"><h3>Daily habits</h3><div class="habits">${HABITS.map(h => `<label class="chk"><input type="checkbox" data-h="${h[0]}" data-date="${dateIso}" ${hab[h[0]] ? "checked" : ""}>${esc(h[1])}</label>`).join("")}</div></div>
  ${brace}${blocks}`;
}
function viewCalendar() {
  const st = parseD(S.start); const end = addD(st, PROGRAM_DAYS - 1); const t = today(); const tI = iso(t); const md = measureDays();
  const before = t < st, after = t > end;
  const ref = before ? st : (after ? end : t); const rI = iso(ref);
  const wk = progWeek(ref); const b = blockOf(wk); const plan = planFor(ref); const ci = cycleAt(ref); const pr = countProgress(rI);
  const nextM = md.find(d => d >= tI);
  const label = dayLabel;
  let html = `<a class="here" href="#d-${rI}">
    <span class="small">${before ? "Your plan starts" : (after ? "Last day of your plan" : "You are here · today")}</span>
    <span class="hdate">${esc(ref.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}</span>
    <span class="hplan">${esc(label(plan))} · ${esc(plan.s.split(" · ").slice(1).join(" · ") || plan.s)}</span>
    <span class="hmeta">Week ${wk} of 16 · ${esc(b.name)}${ci ? ` · cycle day ${ci.day} (${esc(ci.ph.n)})` : ""}${md.includes(rI) ? " · 📏 measure today" : ""}</span>
    <span class="hgo">${pr.done ? `${pr.done} of ${pr.total} done · continue` : "Open this day"} →</span></a>
  ${nextM && nextM !== rI ? `<p class="small" style="margin:8px 0 0">📏 Next measurement: <b>${esc(fmt(parseD(nextM)))}</b></p>` : ""}
  <div class="card keybox"><b>How to read the calendar</b>
    <div class="keyrow"><span class="kc gymk">Gym A</span> gym days (A, B, C) · <span class="kc gymk">Home A</span> home workouts after ${esc(fmt(parseD(S.gymEnd)))} ·<span class="kc">Splits</span> <span class="kc">Yoga</span> <span class="kc">Rest</span> home days</div>
    <div class="keyrow">Colour = cycle phase: <span class="chip ph-period">Period</span><span class="chip ph-foll">Strong</span><span class="chip ph-ovu">Ovulation</span><span class="chip ph-lut">Luteal</span><span class="chip ph-late">Pre-period</span></div>
    <div class="keyrow">📏 measurement day · ✓ finished · • started · outlined = today</div></div>`;
  let m = new Date(st.getFullYear(), st.getMonth(), 1);
  while (m <= end) {
    const y = m.getFullYear(), mo = m.getMonth(); const days = new Date(y, mo + 1, 0).getDate();
    const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    html += `<h2>${esc(m.toLocaleDateString("en-GB", { month: "long", year: "numeric" }))}</h2><div class="calgrid"><div class="ch">Mon</div><div class="ch">Tue</div><div class="ch">Wed</div><div class="ch">Thu</div><div class="ch">Fri</div><div class="ch">Sat</div><div class="ch">Sun</div>`;
    for (let i = 0; i < lead; i++) html += `<span class="cell empty"></span>`;
    for (let dn = 1; dn <= days; dn++) {
      const d = new Date(y, mo, dn); const dI = iso(d);
      if (d < st || d > end) { html += `<span class="cell out"><span class="dn">${dn}</span></span>`; continue; }
      const p = planFor(d); const c = cycleAt(d); const pc = countProgress(dI);
      const mark = (md.includes(dI) ? "📏" : "") + (pc.total && pc.done >= pc.total ? "✓" : (pc.done ? "•" : ""));
      html += `<a href="#d-${dI}" class="cell ph-${c ? c.k : "none"}${dI === tI ? " istoday" : ""}${p.gym ? " gymcell" : ""}" aria-label="${esc(fmt(d))}: ${esc(label(p))}${c ? ", cycle day " + c.day + ", " + esc(c.ph.n) : ""}"><span class="dn">${dn}</span><span class="ic">${esc(label(p))}</span><span class="mk">${mark}</span></a>`;
    }
    html += `</div>`;
    m = new Date(y, mo + 1, 1);
  }
  html += `<h2>The 16 weeks</h2><div class="card">${BLOCKS.map(bl => `<div class="phase"><div class="w">Week${bl.w[0] === bl.w[1] ? " " + bl.w[0] : "s " + bl.w[0] + "–" + bl.w[1]}</div><div><b>${esc(bl.name)}</b> · ${esc(fmt(addD(st, (bl.w[0] - 1) * 7)))} – ${esc(fmt(addD(st, bl.w[1] * 7 - 1)))}<br><span class="small">${esc(bl.note)}</span></div></div>`).join("")}</div>`;
  return html;
}
function viewMeasure() {
  const md = measureDays(); const t = iso(today()); const next = md.find(d => d >= t);
  const m = [...S.meas].sort((a, b) => a.d < b.d ? -1 : 1);
  const firstOf = k => { const r = m.find(x => x[k] != null); return r ? r[k] : null; };
  const lastOf = k => { const r = [...m].reverse().find(x => x[k] != null); return r ? r[k] : null; };
  const cards = MEAS.map(x => {
    const f = firstOf(x.k), l = lastOf(x.k); if (f == null) return "";
    const ch = Math.round((l - f) * 10) / 10; const good = x.dir === 0 || ch === 0 ? "" : ((ch * x.dir) > 0 ? "good" : "bad");
    return `<div class="li"><span>${esc(x.n)}</span><span class="mv"><span class="small">${esc(f)} → </span><b>${esc(l)} ${esc(x.u)}</b> <span class="delta ${good}">${m.length > 1 ? (ch > 0 ? "+" : "") + ch : ""}</span></span></div>`;
  }).join("");
  const sched = md.map((d, i) => { const did = S.meas.some(x => x.d === d); const ci = cycleAt(parseD(d)); return `<a href="#d-${d}"><span><b>${i === 0 ? "Start" : "Check " + i}</b> · ${esc(fmt(parseD(d)))}<br><span class="small">${ci ? "Cycle day " + ci.day : ""}${i === 0 ? " · your starting point" : " · just after your period, least water retention"}</span></span><span class="stat">${did ? "✓" : (d < t ? "missed" : "")}</span></a>`; }).join("");
  const rows = m.slice().reverse().map(r => `<tr><td>${esc(fmt(parseD(r.d)))}</td>${MEAS.map(c => `<td>${r[c.k] != null ? esc(r[c.k]) : "–"}</td>`).join("")}<td><button type="button" class="btn ghost" style="padding:2px 8px" data-delm="${r.d}" aria-label="Delete ${esc(r.d)}">✕</button></td></tr>`).join("");
  const groups = [...new Set(MEAS.map(x => x.g))];
  return `<h1>Measurements</h1>
  <div class="card"><div class="small">Next measurement</div><div style="font-family:var(--display);font-size:1.3rem;font-weight:700;color:var(--accent)">${next ? esc(fmt(parseD(next))) : "All done!"}</div><p class="small" style="margin:4px 0 0">Measurement days fall on cycle day 7, just after your period, when water retention is lowest, so every check compares fairly. If you log a period on a different date, they move automatically.</p></div>
  <h2>My progress</h2>${cards ? `<div class="list">${cards}</div><p class="small">Green = moving the way you want. Waist, belly, love handles, thighs and arms should go down; hips and the hip-dip line should go up or stay the same.</p>` : `<p class="small">No measurements yet. Your first one is on ${esc(fmt(parseD(md[0])))}.</p>`}
  <h2>Schedule</h2><div class="list">${sched}</div>
  <h2>Add or edit measurements</h2><div class="card"><label class="field" style="max-width:200px">Date<input type="date" id="mdate" value="${esc(t)}"></label><p class="small" style="margin:6px 0 0">Leave a box empty if you skip it. Choosing a date you already saved loads those numbers so you can fix them.</p>${measForm("__pick__", "mm")}</div>
  <h2>How to measure</h2>
  <div class="note accent"><strong>Rules for every check</strong><ul><li>Morning, after the toilet, before eating or drinking.</li><li>Underwear only, standing relaxed, feet together, looking straight ahead.</li><li>Soft tape measure, snug on the skin but not pressing in.</li><li>Keep the tape level all the way round. Check in a mirror, or ask someone to help with the back.</li><li>Measure each spot twice. If they differ by more than 0.5 cm, do a third and use the middle number.</li><li>The first time, mark tricky spots (mid-thigh, above the knee) with a pen and note the distance from a landmark, so you measure the same place every time.</li><li>Photos the same day: front, side and back, same light, outfit and distance.</li></ul></div>
  ${groups.map(g => `<h3 style="margin-top:14px">${esc(g)}</h3>` + MEAS.filter(x => x.g === g).map(x => `<details class="card"><summary><b>${esc(x.n)}</b></summary><p style="margin:8px 0 0">${esc(x.how)}</p></details>`).join("")).join("")}
  <h2>All entries</h2>${m.length ? `<div class="card scroll"><table class="tbl"><thead><tr><th>Date</th>${MEAS.map(c => `<th>${esc(c.n.split(" (")[0])}</th>`).join("")}<th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="small">Nothing saved yet.</p>`}`;
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
  <p class="small">Gym until <b>${esc(fmt(parseD(S.gymEnd)))}</b>. After that, Mon/Wed/Fri are <b>Home A, B and C</b>: mat workouts for glutes, core, posture and arms.</p>
  <h2>How the 16 weeks get harder</h2><div class="card">${BLOCKS.map(b => `<div class="phase"><div class="w">Week${b.w[0] === b.w[1] ? " " + b.w[0] : "s " + b.w[0] + "–" + b.w[1]}</div><div><b>${esc(b.name)}</b><br><span class="small">${esc(b.note)}</span></div></div>`).join("")}</div>
  <div class="note accent"><strong>Weights:</strong> on machine exercises the app suggests today's weight from what you logged last time. If you did the top of the rep range on every set, it adds a step (5 kg on the hip thrust and Smith machines, 2.5 kg on cables). Always choose good form over the number.</div>
  <h2>How your cycle changes each day</h2><ul class="clean"><li><b>Period days 1–2:</b> gym days drop to 2 sets and about 20% lighter.</li><li><b>Days 3–5:</b> normal sets, a bit lighter if you're tired.</li><li><b>Strong phase:</b> push for an extra rep or weight.</li><li><b>Ovulation:</b> strong, but extra careful warm-up.</li><li><b>Luteal:</b> same weights, clean form.</li><li><b>Pre-period:</b> drop the last set if you're tired; ignore the scale.</li></ul>
  <p class="small">Research on cycle-based training is mixed, so treat this as guidance and listen to your body.</p>
  <h2>Gym basics</h2><div class="gloss"><div><b>Rep</b>: one full movement.</div><div><b>Set</b>: reps in a row. "3 × 10" = 3 sets of 10.</div><div><b>Rest</b>: pause between sets.</div><div><b>/ side</b>: all reps on one side, then the other.</div><div><b>Reps left</b>: stop most sets when 1–3 more would be possible.</div><div><b>Weight</b>: move the pin, or add plates.</div></div>
  <h2>My details</h2><div class="card"><div class="row"><label class="field">Age<input type="number" inputmode="numeric" id="age" value="${esc(S.profile.age || "")}"></label><label class="field">Height (cm)<input type="number" inputmode="numeric" id="height" value="${esc(S.profile.height || "")}"></label><label class="field">Start weight (kg)<input type="number" inputmode="decimal" step="0.1" id="sweight" value="${esc(S.profile.startWeight || "")}"></label><label class="field">Gym membership ends<input type="date" id="gymend" value="${esc(S.gymEnd)}"></label></div><p class="small" style="margin:6px 0 0">After the gym end date, Mon/Wed/Fri become home mat workouts automatically.</p><button type="button" class="btn ghost" id="psave" style="margin-top:10px">Save details</button></div>
  <h2>Backup</h2><p class="small">Everything is saved only on this phone. Make a backup once a month and keep it in Files or iCloud Drive.</p>
  <div class="row"><button type="button" class="btn" id="exp">Save a backup</button><label class="btn ghost" for="imp">Restore a backup</label><input type="file" id="imp" accept="application/json,.json" hidden></div>
  <p class="small" style="margin-top:20px">General guidance, not medical advice. Follow your doctor's dosing for iron and vitamin D. If back pain keeps coming back, see a physiotherapist.</p>`;
}
/* ---------- food ---------- */
const RECIPES = {
  "Kahvaltılar": [
    { n: "Proteinli gece yulafı (overnight oats)", p: 28, k: 400, t: "5 dk, bir gece önceden", ing: ["40 g yulaf", "150 g skyr ya da süzme yoğurt", "100 ml süt", "1 çay kaşığı chia tohumu", "Bir avuç orman meyvesi", "Tarçın"], how: ["Yulaf, skyr, süt, chia ve tarçını bir kavanozda karıştır.", "Gece boyunca buzdolabında beklet.", "Sabah üstüne orman meyvelerini ekle."], tip: "Süt ürünlü kahvaltı: demir tabletini başka bir saatte al." },
    { n: "Menemen", p: 22, k: 380, t: "15 dk", ing: ["2 yumurta + 1 yumurta akı", "1 yeşil biber, 1 kırmızı biber", "2 domates (ya da ½ kutu)", "1 çay kaşığı zeytinyağı", "Pul biber, tuz", "1 dilim tam tahıllı ekmek"], how: ["Doğranmış biberleri yağda 5 dk yumuşat.", "Doğranmış domatesleri ekle, suyunu salıp sos kıvamına gelene kadar pişir.", "Yumurtaları ekle ve hafifçe karıştırarak tam pişene kadar tut.", "Ekmekle servis et."], tip: "Biber ve domates C vitamini dolu; demiri emmene yardım eder." },
    { n: "Ispanaklı feta peynirli omlet", p: 28, k: 380, t: "10 dk", ing: ["2 yumurta + 2 yumurta akı", "Büyük bir avuç ıspanak", "20 g feta (beyaz peynir)", "1 dilim tam tahıllı kızarmış ekmek"], how: ["Ispanağı tavada söndür.", "Çırpılmış yumurtaları üstüne dök ve kısık ateşte pişir.", "Fetayı ekle, ikiye katla ve ekmekle servis et."] },
    { n: "Muzlu proteinli pankek", p: 32, k: 420, t: "15 dk", ing: ["1 olgun muz", "2 yumurta", "30 g yulaf", "½ ölçek protein tozu", "Üstüne 100 g süzme yoğurt", "Orman meyveleri"], how: ["Muz, yumurta, yulaf ve protein tozunu blenderdan geçir.", "Yapışmaz tavada küçük pankekler pişir, her yüzü 1–2 dk.", "Üstüne yoğurt ve orman meyveleri koy."] },
    { n: "Füme somonlu çavdar ekmeği", p: 25, k: 360, t: "5 dk", ing: ["2 dilim çavdar ekmeği", "60 g füme somon", "50 g cottage peyniri", "Salatalık, dereotu, limon"], how: ["Cottage peynirini çavdar ekmeğine sür.", "Üstüne somon, salatalık, dereotu ve limon ekle."], tip: "Somon biraz D vitamini de verir." }
  ],
  "Öğle yemekleri": [
    { n: "Tavuklu kinoa kasesi", p: 40, k: 550, t: "hazırlık yapılmışsa 10 dk", ing: ["100 g pişmiş tavuk göğsü", "120 g pişmiş kinoa", "80 g nohut", "Ispanak, biber, salatalık", "Limon + 1 çay kaşığı zeytinyağı"], how: ["Hepsini bir kaseye koy.", "Limon, zeytinyağı, tuz ve karabiberle tatlandır."] },
    { n: "Mercimekli feta peynirli yeşillik salatası", p: 30, k: 480, t: "10 dk", ing: ["150 g haşlanmış yeşil mercimek", "Salatalık, domates, kırmızı soğan, maydanoz", "30 g feta", "80 g tavuk göğsü (isteğe bağlı)", "Limon, zeytinyağı, sumak"], how: ["Sebzeleri ve yeşillikleri doğra.", "Mercimek ve fetayla karıştır.", "Limon, biraz yağ ve sumakla tatlandır."], tip: "Demir açısından zengin; limon ve domates emilimine yardım eder." },
    { n: "Mercimek çorbası + yanına", p: 28, k: 480, t: "30 dk, 4 porsiyon", ing: ["200 g kırmızı mercimek", "1 soğan, 1 havuç", "1 yemek kaşığı salça", "1,2 L et ya da sebze suyu", "Kimyon, toz kırmızı biber, limon", "Yanına: 2 yumurtalı omlet ya da 100 g tavuk"], how: ["Soğan ve havucu yumuşat, salça ve baharatları ekle.", "Mercimek ve suyu ekle, 20 dk kısık ateşte pişir.", "Blenderdan geçir, limonla bitir.", "Bir kase ~13 g protein; yanına omlet ya da tavuk ekle."] },
    { n: "Somonlu kinoa ve avokado salatası", p: 30, k: 520, t: "15 dk", ing: ["100 g pişmiş somon", "100 g pişmiş kinoa", "¼ avokado", "Ispanak, salatalık, çeri domates", "Limon"], how: ["Somonu kinoa ve yeşilliklerin üstüne didikle.", "Avokado ve domatesleri ekle, üstüne limon sık."] },
    { n: "Ezme nohutlu dürüm", p: 35, k: 480, t: "10 dk", ing: ["100 g nohut", "50 g süzme yoğurt", "Limon, hardal, doğranmış kereviz sapı ya da turşu", "80 g tavuk göğsü", "1 tam buğday lavaş, ıspanak"], how: ["Nohudu yoğurt, limon ve hardalla ez.", "Lavaşı nohut ezmesi, tavuk ve ıspanakla doldur."] }
  ],
  "Akşam yemekleri": [
    { n: "Kıymalı mercimekli bolonez", p: 35, k: 560, t: "30 dk, 4 porsiyon", ing: ["500 g %5 yağlı dana kıyma", "120 g kırmızı mercimek", "1 soğan, 2 diş sarımsak, 1 havuç", "2 kutu doğranmış domates", "İtalyan otları", "Tam buğday makarna ya da kinoa (porsiyon başı 60 g kuru)"], how: ["Kıymayı soğan, sarımsak ve havuçla kavur.", "Mercimek, domates, otlar ve 300 ml su ekle.", "Mercimekler yumuşayana kadar 20 dk kısık ateşte pişir.", "Makarna ya da kinoanın üstünde servis et."], tip: "En iyi demir öğünün. Regl sırasında ve hemen sonrasında ye." },
    { n: "Etli nohut", p: 35, k: 550, t: "40 dk, 4 porsiyon", ing: ["400 g yağsız kuşbaşı dana eti", "2 kutu nohut", "1 soğan, 2 yemek kaşığı salça", "1 biber", "Kimyon, toz kırmızı biber", "Yanına kinoa"], how: ["Eti soğanla kavur.", "Salça, biber, baharatlar ve üstünü geçecek kadar su ekle.", "25 dk pişir, nohudu ekle, 10 dk daha pişir.", "Kinoa ve salatayla servis et."], tip: "Et + nohut = bol demir." },
    { n: "Air fryer'da somon ve kinoa", p: 30, k: 550, t: "15 dk", ing: ["120 g somon fileto", "120 g pişmiş kinoa", "Brokoli, biber", "Limon, sarımsak, dereotu"], how: ["Somonu limon, sarımsak ve dereotuyla tatlandır.", "Sebzelerle birlikte air fryer'da 200°C'de 10–12 dk pişir.", "Kinoanın üstünde servis et. D vitaminini bu öğünle al."] },
    { n: "Kıymalı kinoalı fırın biber dolması", p: 32, k: 500, t: "40 dk, 3 porsiyon", ing: ["350 g %5 yağlı dana kıyma", "3 büyük biber, ikiye kesilmiş", "150 g pişmiş kinoa", "1 kutu doğranmış domates", "1 soğan, sarımsak, kimyon, toz kırmızı biber", "Biraz rendelenmiş peynir (isteğe bağlı)"], how: ["Kıymayı soğan, sarımsak ve baharatlarla kavur.", "Domatesin yarısını ve kinoayı karıştır.", "Biber yarımlarını doldur, kalan domatesi etrafına dök.", "190°C fırında 25 dk pişir."], tip: "Demir için et, C vitamini için biber: mükemmel ikili." },
    { n: "Nohutlu tofulu ıspanaklı köri", p: 28, k: 520, t: "25 dk", ing: ["150 g sert tofu, küp doğranmış", "100 g nohut", "Büyük bir avuç ıspanak", "½ kutu doğranmış domates", "Köri ezmesi ya da garam masala, sarımsak, zencefil", "100 g pişmiş kinoa"], how: ["Tofuyu air fryer'da ya da tavada çıtırlaştır.", "Sarımsak, zencefil ve baharatları pişir, domates ve nohudu ekle.", "Ispanak ve tofuyu karıştır. C vitamini için üstüne limon sık.", "Kinoanın üstünde servis et."] },
    { n: "Tavuk fajita kinoa kasesi", p: 38, k: 540, t: "20 dk", ing: ["130 g dilimlenmiş tavuk göğsü", "Biber, soğan", "Fajita baharatı", "100 g pişmiş kinoa", "Salsa, 2 yemek kaşığı süzme yoğurt"], how: ["Tavuk ve biberleri baharatla harmanla.", "Tavada ya da air fryer'da 12–15 dk pişir.", "Kinoanın üstünde salsa ve yoğurtla servis et."] },
    { n: "Fırın tepsisinde limonlu tavuk ve nohut", p: 40, k: 520, t: "30 dk", ing: ["130 g tavuk göğsü", "100 g nohut", "Kırmızı soğan, biber, kabak", "Limon, sarımsak, kekik, 1 çay kaşığı zeytinyağı"], how: ["Hepsini limon, sarımsak, kekik ve yağla bir tepsiye koy.", "200°C fırında 25 dk pişir."] }
  ],
  "Ara öğünler (100–300 kcal)": [
    { n: "Süzme yoğurt + orman meyveleri", p: 15, k: 150, ing: ["150 g süzme yoğurt ya da skyr", "Orman meyveleri"] },
    { n: "Protein shake + meyve", p: 25, k: 200, ing: ["Suyla 1 ölçek protein tozu", "Bir portakal ya da elma"] },
    { n: "Yeşil proteinli smoothie", p: 30, k: 280, ing: ["1 ölçek protein tozu", "1 küçük muz", "Bir avuç ıspanak", "200 ml süt"] },
    { n: "Cottage peyniri + salatalık ya da ananas", p: 14, k: 140, ing: ["120 g cottage peyniri", "Salatalık ya da ananas"] },
    { n: "Çıtır fırın nohut", p: 7, k: 150, ing: ["100 g nohut", "Toz kırmızı biber, tuz", "Air fryer'da 200°C'de 12 dk"] },
    { n: "Yumurtalı muffin (2 adet)", p: 12, k: 150, ing: ["2 yumurta, biber, ıspanak", "Muffin kalıbında 180°C'de 18 dk pişir"] },
    { n: "Humus + sebze çubukları", p: 6, k: 180, ing: ["3 yemek kaşığı humus", "Havuç, salatalık, biber çubukları"] },
    { n: "Tatlı krizi", p: 4, k: 150, ing: ["2 kare bitter çikolata (%70+)", "10 badem"] }
  ]
};
function recipeHTML(r) {
  return `<details class="card recipe"><summary><b>${esc(r.n)}</b><span class="small"> · ${r.p} g protein · ${r.k} kcal${r.t ? " · " + esc(r.t) : ""}</span></summary>
  <ul class="clean" style="margin-top:8px">${r.ing.map(i => `<li>${esc(i)}</li>`).join("")}</ul>${r.how ? `<ol class="clean">${r.how.map(i => `<li>${esc(i)}</li>`).join("")}</ol>` : ""}${r.tip ? `<p class="small" style="color:var(--sage);margin:0">${esc(r.tip)}</p>` : ""}</details>`;
}
function viewFood() {
  return `<h1>Beslenme</h1>
  <p><b>Her gün: 1.650–1.750 kcal ve 100–115 g protein.</b> Haftada yaklaşık 0,25 kg yağ kaybı bekle; belin tartıdan daha hızlı incelir.</p>
  <div class="stats"><div class="stat"><b>100–115 g</b><span>protein</span></div><div class="stat"><b>~170 g</b><span>karbonhidrat</span></div><div class="stat"><b>50–60 g</b><span>yağ</span></div></div>
  <h2>Her tabağı böyle kur</h2><div class="soft"><ul class="clean"><li><b>Tabağın ½'si sebze</b> (salata, biber, brokoli, ıspanak)</li><li><b>Tabağın ¼'ü protein</b>, yaklaşık avuç için kadar: tavuk göğsü, somon, yağsız dana eti, yumurta, tofu, mercimek</li><li><b>Tabağın ¼'ü karbonhidrat</b>, yaklaşık bir avuç dolusu: kinoa, tam buğday makarna, patates, tam tahıllı ekmek, yulaf</li><li><b>1 başparmak kadar yağ</b>: zeytinyağı, avokado, kuruyemiş, feta</li></ul></div>
  <h2>Örnek bir gün</h2><div class="card">
    <div class="meal"><span class="m">Kahvaltı</span><span class="k">~30 g · 400</span><small>Aşağıdan bir kahvaltı seç</small></div>
    <div class="meal"><span class="m">Öğle</span><span class="k">~35 g · 500</span><small>Bir öğle yemeği seç</small></div>
    <div class="meal"><span class="m">Ara öğün</span><span class="k">~20 g · 200</span><small>Bir ara öğün seç</small></div>
    <div class="meal"><span class="m">Akşam</span><span class="k">~33 g · 550</span><small>Bir akşam yemeği seç</small></div>
    <div class="total"><span>Toplam</span><span>~118 g · ~1.650–1.750 kcal</span></div></div>
  ${Object.entries(RECIPES).map(([g, list]) => `<h2>${esc(g)}</h2>${list.map(recipeHTML).join("")}`).join("")}
  <h2>Pazar günü yemek hazırlığı (45 dk)</h2><div class="card"><ol class="clean"><li>600 g tavuk göğsünü fırınla: 200°C'de 18–20 dk (aşağıdaki ipuçlarına bak).</li><li>250 g kuru kinoa pişir (yaklaşık 4 porsiyon).</li><li>Büyük bir tencere bolonez, etli nohut ya da mercimek çorbası yap ve bir kısmını dondur.</li><li>Biber, salatalık ve havucu doğrayıp saklama kaplarına koy.</li><li>Bir kavanoz sos hazırla (limon, zeytinyağı, hardal).</li></ol><p class="small" style="margin:0">Buzdolabında 4 gün dayanır. Böylece öğle yemeklerin 5 dakikada hazır.</p></div>
  <h2>Her seferinde sulu tavuk göğsü</h2><div class="card"><ul class="clean"><li><b>Hızlı salamura:</b> litre başına 1 yemek kaşığı tuzlu suda 15 dk beklet. Kurula.</li><li><b>Air fryer:</b> 200°C, 15–18 dk, yarısında çevir. <b>Fırın:</b> 200°C, 18–22 dk.</li><li>Kesmeden önce 5 dk dinlendir.</li><li><b>Marinasyonlar:</b> yoğurt + limon + sarımsak + toz kırmızı biber · zeytinyağı + kekik + limon · salça + pul biber + kimyon · soya sosu + bal + zencefil (az miktarda).</li></ul></div>
  <h2>Alışveriş listen</h2><div class="card"><ul class="clean"><li><b>Protein:</b> tavuk göğsü, somon, %5 yağlı dana kıyma, yumurta, sert tofu, skyr / süzme yoğurt, cottage peyniri, feta, protein tozu</li><li><b>Baklagiller:</b> kırmızı ve yeşil mercimek, konserve nohut, humus</li><li><b>Karbonhidrat:</b> kinoa, yulaf, tam tahıllı ya da çavdar ekmeği, tam buğday makarna, patates, lavaş</li><li><b>Sebze:</b> ıspanak, biber, domates, salatalık, brokoli, kabak, soğan, sarımsak, havuç</li><li><b>Meyve:</b> orman meyveleri (dondurulmuş da olur), portakal, kivi, muz, limon</li><li><b>Diğer:</b> zeytinyağı, salça, konserve domates, baharatlar (kimyon, toz kırmızı biber, pul biber, kekik), bitter çikolata, badem, chia</li></ul></div>
  <h2>Demir</h2><div class="card"><ul class="clean"><li>Mercimek, nohut, tofu ve ıspanağı <b>C vitamini ile</b> ye: biber, domates, portakal, kivi, limon.</li><li><b>Çay, kahve ve süt ürünlerini</b> demirli öğünlerden ve demir tabletinden 1–2 saat uzak tut.</li><li>Tableti su ya da portakal suyuyla al, örneğin kuşluk vakti.</li><li>Regl sırasında ve hemen sonrasında etli bir öğün ye.</li><li>Yaklaşık 3 ay sonra doktorunla ferritini tekrar kontrol ettir.</li></ul></div>
  <h2>D vitamini</h2><div class="card"><ul class="clean"><li><b>Biraz yağ</b> içeren bir öğünle al, örneğin somonlu ya da zeytinyağlı akşam yemeği.</li><li>Demir tabletinden farklı bir öğünde al.</li><li>Yaklaşık 3 ay sonra tekrar kontrol ettir.</li></ul></div>
  <h2>Döngüne göre</h2><div class="card"><ul class="clean"><li><b>Regl:</b> demirli öğünler (bolonez, etli nohut, mercimek salatası). Sıcak çorbalar kramplara iyi gelir.</li><li><b>Regl öncesi:</b> iştah artar, 100–150 kcal ekle (yoğurt + orman meyveleri, bir shake). Tuzlu yiyecekler şişkinliği artırır.</li><li><b>Tatlı krizi:</b> 2 kare bitter çikolata, proteinli smoothie ya da bal ve tarçınlı süzme yoğurt.</li></ul></div>
  <h2>Antrenman günleri</h2><div class="note good"><strong>Önce:</strong> 1–3 saat önce protein ve karbonhidrat içeren bir öğün (örn. gece yulafı). <strong>Sonra:</strong> 25–40 g protein (bir shake ya da bir sonraki öğün).</div>
  <h2>Dışarıda yemek</h2><div class="card"><ul class="clean"><li>Izgara tavuk, somon ya da mercimekli bir yemek seç.</li><li>Sosu ayrı iste; pilav ya da patates kızartması yerine salata ya da az bulgur/patates al.</li><li>Dışarıda bir öğün hiçbir zaman ilerlemeni bozmaz. Bir sonraki öğünde normale dön.</li></ul></div>`;
}


/* ---------- router ---------- */
function route() {
  const h = (location.hash || "#cal").slice(1); const app = document.getElementById("app"); let nav = h;
  if (/^d-\d{4}-\d{2}-\d{2}$/.test(h)) { app.innerHTML = viewDay(h.slice(2)); nav = h.slice(2) === iso(today()) ? "today" : "cal"; }
  else if (h === "cal" || h === "") { app.innerHTML = viewCalendar(); nav = "cal"; }
  else if (h === "today") { const st = parseD(S.start); app.innerHTML = (today() < st ? `<div class="note accent"><strong>Your 16 weeks start ${esc(fmt(st))}.</strong> Here's your first day.</div>` : "") + viewDay(iso(today() < st ? st : today())); }
  else if (h === "measure") app.innerHTML = viewMeasure();
  else if (h === "cycle") app.innerHTML = viewCycle();
  else if (h === "overview") app.innerHTML = viewOverview();
  else if (h === "food") app.innerHTML = viewFood();
  else { app.innerHTML = viewCalendar(); nav = "cal"; }
  document.querySelectorAll("nav.bar a").forEach(a => { if (a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
}
window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
/* the app always opens on the 16-week calendar */
if (!/^#d-/.test(location.hash) && location.hash !== "#cal") { try { history.replaceState(null, "", "#cal"); } catch (e) { location.hash = "cal"; } }

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
  else if (el.id === "psave") { const a = +document.getElementById("age").value, h = +document.getElementById("height").value, w = +document.getElementById("sweight").value; if (a) S.profile.age = a; if (h) S.profile.height = h; if (w) S.profile.startWeight = w; const ge = document.getElementById("gymend").value; if (ge) S.gymEnd = ge; save(); toast("Details saved"); }
  else if (el.dataset.delm) { S.meas = S.meas.filter(x => x.d !== el.dataset.delm); save(); route(); }
  else if (el.id === "exp") {
    const txt = JSON.stringify(S); const name = "tone-backup-" + iso(today()) + ".json";
    try { const f = new File([txt], name, { type: "application/json" }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Tone backup" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
});
route();
