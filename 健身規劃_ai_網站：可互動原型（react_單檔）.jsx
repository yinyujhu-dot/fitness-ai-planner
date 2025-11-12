import React, { useMemo, useState } from "react";

// ✅ 單檔 React 元件，可直接在 Next.js/CRA 中使用
// - 使用 Tailwind 風格（不依賴外部 UI 套件）
// - 計算 BMI / BMR / TDEE 與基礎營養建議
// - 依據目標（減脂 / 增肌 / 維持）與每週天數，自動產出訓練週表
// - 產生可下載的 JSON 方案
// - 無伺服器依賴：先跑本地邏輯，日後再接後端/大模型 API

export default function FitnessAIPlanner() {
  const [form, setForm] = useState({
    name: "",
    sex: "male", // male | female | other
    age: 30,
    heightCm: 170,
    weightKg: 68,
    bodyFat: 20, // %
    muscleKg: "",
    rhr: "", // resting heart rate
    activity: "moderate", // sedentary, light, moderate, active, veryActive
    goal: "fat_loss", // fat_loss | muscle_gain | recomp | maintenance
    targetDate: "",
    daysPerWeek: 4,
    equipment: { dumbbell: true, barbell: false, machines: true, bands: false, bodyweight: true },
    injuries: "",
    notes: "",
  });

  const [plan, setPlan] = useState(null);

  const activityFactor = (key) => ({
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  })[key] || 1.55;

  const cmToM = (cm) => cm / 100;

  const calc = useMemo(() => {
    const h = Number(form.heightCm) || 0;
    const w = Number(form.weightKg) || 0;
    const a = Number(form.age) || 0;

    const bmi = h && w ? w / Math.pow(cmToM(h), 2) : 0;

    // Mifflin–St Jeor BMR
    const bmr = form.sex === "female"
      ? (10 * w + 6.25 * h - 5 * a - 161)
      : (10 * w + 6.25 * h - 5 * a + 5);

    const tdee = bmr * activityFactor(form.activity);

    // Calorie target by goal
    let kcal = tdee;
    if (form.goal === "fat_loss") kcal = tdee * 0.85; // ~15% deficit
    if (form.goal === "muscle_gain") kcal = tdee * 1.10; // ~10% surplus
    if (form.goal === "recomp") kcal = tdee * 0.95; // mild deficit

    // Protein targets by goal
    const proteinPerKg = form.goal === "muscle_gain" ? 2.0 : 1.8;
    const proteinG = Math.round(proteinPerKg * w);

    const fatKcalPct = form.goal === "fat_loss" ? 0.27 : 0.30;
    const fatG = Math.round((kcal * fatKcalPct) / 9);
    const carbsG = Math.max(0, Math.round((kcal - (proteinG * 4 + fatG * 9)) / 4));

    return {
      bmi: Number.isFinite(bmi) ? bmi : 0,
      bmr: Math.max(0, bmr),
      tdee: Math.max(0, tdee),
      kcal: Math.max(0, kcal),
      proteinG, fatG, carbsG,
    };
  }, [form]);

  function handleChange(path, value) {
    setForm((prev) => {
      const copy = structuredClone(prev);
      // 支援巢狀欄位
      const segs = path.split(".");
      let cur = copy;
      for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
      cur[segs[segs.length - 1]] = value;
      return copy;
    });
  }

  function buildSplit(days) {
    if (days <= 3) return [
      { day: "Day 1", focus: "全身訓練 A", blocks: [
        { name: "深蹲/腿推", sets: "3–4 × 6–10" },
        { name: "平板臥推/胸推", sets: "3–4 × 6–10" },
        { name: "划船/高位下拉", sets: "3–4 × 8–12" },
        { name: "肩推/側平舉", sets: "3 × 10–15" },
        { name: "核心：平板/捲腹", sets: "3 × 30–60秒 / 12–15" },
      ]},
      { day: "Day 2", focus: "全身訓練 B", blocks: [
        { name: "硬舉/羅馬椅", sets: "3–4 × 5–8" },
        { name: "上斜臥推", sets: "3 × 8–12" },
        { name: "單手啞鈴划船", sets: "3 × 10–12" },
        { name: "臀橋/臀推", sets: "3 × 8–12" },
        { name: "核心：側棒式", sets: "3 × 20–40秒/側" },
      ]},
      { day: "Day 3", focus: "代謝/心肺 + 弱項補強", blocks: [
        { name: "間歇有氧 (跑步機/單車)", sets: "10 × 30" },
        { name: "弱項部位 2–3 動作", sets: "各 3 × 10–15" },
        { name: "伸展/活動度", sets: "10–15 分" },
      ]},
    ];
    if (days === 4) return [
      { day: "Day 1", focus: "上肢", blocks: [
        { name: "臥推系", sets: "4 × 6–10" },
        { name: "划船系", sets: "4 × 8–12" },
        { name: "肩推/側平舉", sets: "3 × 10–15" },
        { name: "肱二/三彎舉下壓", sets: "各 2–3 × 10–15" },
      ]},
      { day: "Day 2", focus: "下肢", blocks: [
        { name: "深蹲/腿推", sets: "4 × 6–10" },
        { name: "硬舉/羅馬椅", sets: "3 × 5–8" },
        { name: "弓箭步/腿屈伸", sets: "3 × 10–12" },
        { name: "核心", sets: "3 × 12–15" },
      ]},
      { day: "Day 3", focus: "休息/有氧/活動度", blocks: [] },
      { day: "Day 4", focus: "上肢 2", blocks: [
        { name: "上斜推/肩推", sets: "4 × 6–10" },
        { name: "下拉/划船", sets: "4 × 8–12" },
        { name: "後三角/前鋸肌", sets: "3 × 12–15" },
        { name: "手臂", sets: "各 2–3 × 10–15" },
      ]},
    ];
    if (days === 5) return [
      { day: "Day 1", focus: "推 Push", blocks: [
        { name: "臥推系", sets: "4 × 5–8" },
        { name: "肩推", sets: "3 × 6–10" },
        { name: "胸飛鳥/側平舉", sets: "3 × 12–15" },
      ]},
      { day: "Day 2", focus: "拉 Pull", blocks: [
        { name: "硬舉/划船", sets: "3–4 × 5–8 / 8–12" },
        { name: "高位下拉", sets: "3 × 8–12" },
        { name: "後束/二頭", sets: "3 × 10–15" },
      ]},
      { day: "Day 3", focus: "腿 Legs", blocks: [
        { name: "深蹲系", sets: "4 × 5–8" },
        { name: "腿推/弓箭步", sets: "3 × 8–12" },
        { name: "臀腿補強", sets: "3 × 10–15" },
      ]},
      { day: "Day 4", focus: "全身/代謝", blocks: [
        { name: "循環訓練 5–6 動作", sets: "2–3 輪" },
        { name: "核心", sets: "3 × 12–15" },
      ]},
      { day: "Day 5", focus: "弱項 + 有氧", blocks: [
        { name: "弱項 2–3 動作", sets: "各 3 × 10–15" },
        { name: "Zone2 有氧 30–40 分", sets: "—" },
      ]},
    ];
    // 6–7 天：PPL 重複
    return [
      { day: "Day 1", focus: "Push", blocks: [] },
      { day: "Day 2", focus: "Pull", blocks: [] },
      { day: "Day 3", focus: "Legs", blocks: [] },
      { day: "Day 4", focus: "休息/有氧", blocks: [] },
      { day: "Day 5", focus: "Push", blocks: [] },
      { day: "Day 6", focus: "Pull", blocks: [] },
      { day: "Day 7", focus: "Legs 或 休息", blocks: [] },
    ];
  }

  function goalTips(goal) {
    if (goal === "fat_loss") return [
      "每日熱量赤字約 15%，優先確保蛋白質與阻力訓練強度。",
      "每週 2–4 次 Zone2 有氧（30–45 分），與 1 次間歇。",
      "重量優先保強度，減少總量而非全部降重。",
    ];
    if (goal === "muscle_gain") return [
      "熱量盈餘約 10%，每公斤體重 2.0g 蛋白質。",
      "每組接近力竭（RIR 1–3），每肌群每週 10–20 組。",
      "睡眠 7–9 小時；體重每月上升 0.5–1% 為佳。",
    ];
    if (goal === "recomp") return [
      "輕微赤字（~5%）或維持熱量，專注於進步追蹤。",
      "在主要複合動作上追求小幅度負重或次數進步。",
      "以『腰圍/體脂下降 + 力量持平或上升』為指標。",
    ];
    return [
      "維持 TDEE，固定蛋白質；以表現與健康指標為主。",
      "每週 150–300 分鐘中等強度活動。",
      "定期抽測 InBody / 量腰圍與體重趨勢。",
    ];
  }

  function buildPlan() {
    const split = buildSplit(Number(form.daysPerWeek));
    const tips = goalTips(form.goal);

    const program = {
      profile: form,
      metrics: calc,
      training: split,
      nutrition: {
        calories: Math.round(calc.kcal),
        protein_g: calc.proteinG,
        fat_g: calc.fatG,
        carbs_g: calc.carbsG,
      },
      tips,
      version: "v0.1-local",
      disclaimer: "本工具提供一般性健身與營養資訊，非醫療建議。若有疾病或受傷，請先諮詢專業醫療人員。",
    };

    setPlan(program);
  }

  function downloadJSON() {
    if (!plan) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plan, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `fitness_plan_${(form.name||'user')}.json`);
    a.click();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">健身規劃 AI（MVP 原型）</h1>
          <div className="text-xs md:text-sm text-gray-500">v0.1 — 本地計算，未連接雲端 AI</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左側：表單 */}
        <section className="lg:col-span-2">
          <Card title="個人資料與目標">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input label="暱稱" value={form.name} onChange={(v) => handleChange("name", v)} />
              <Select label="性別" value={form.sex} onChange={(v) => handleChange("sex", v)} options={[
                { value: "male", label: "男性" },
                { value: "female", label: "女性" },
                { value: "other", label: "其他/不便透露" },
              ]} />
              <NumberInput label="年齡" value={form.age} onChange={(v) => handleChange("age", v)} min={10} max={90} />
              <NumberInput label="身高 (cm)" value={form.heightCm} onChange={(v) => handleChange("heightCm", v)} min={120} max={230} />
              <NumberInput label="體重 (kg)" value={form.weightKg} onChange={(v) => handleChange("weightKg", v)} min={30} max={250} />
              <NumberInput label="體脂 (%)" value={form.bodyFat} onChange={(v) => handleChange("bodyFat", v)} min={3} max={60} />
              <Input label="骨骼肌量 (kg，可選)" value={form.muscleKg} onChange={(v) => handleChange("muscleKg", v)} />
              <Input label="安靜心率 RHR (可選)" value={form.rhr} onChange={(v) => handleChange("rhr", v)} />
              <Select label="活動量" value={form.activity} onChange={(v) => handleChange("activity", v)} options={[
                { value: "sedentary", label: "久坐" },
                { value: "light", label: "輕量" },
                { value: "moderate", label: "中等" },
                { value: "active", label: "高" },
                { value: "veryActive", label: "非常高" },
              ]} />
              <Select label="目標" value={form.goal} onChange={(v) => handleChange("goal", v)} options={[
                { value: "fat_loss", label: "減脂" },
                { value: "muscle_gain", label: "增肌" },
                { value: "recomp", label: "體態重組" },
                { value: "maintenance", label: "維持" },
              ]} />
              <Input label="目標日期 (可選)" type="date" value={form.targetDate} onChange={(v) => handleChange("targetDate", v)} />
              <RangeInput label={`每週天數：${form.daysPerWeek} 天`} value={form.daysPerWeek} min={2} max={7} onChange={(v) => handleChange("daysPerWeek", Number(v))} />
            </div>

            <div className="mt-4">
              <fieldset className="border border-gray-200 rounded-2xl p-3">
                <legend className="px-2 text-sm text-gray-600">可用器材</legend>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(form.equipment).map(([k, val]) => (
                    <label key={k} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${val?"border-gray-800 bg-gray-900 text-white":"border-gray-200"}`}>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => handleChange(`equipment.${k}`, e.target.checked)}
                      />
                      <span className="capitalize">
                        {k === "dumbbell" ? "啞鈴" : k === "barbell" ? "槓鈴" : k === "machines" ? "器械" : k === "bands" ? "彈力帶" : "自體重"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Textarea label="傷病/限制（可選）" value={form.injuries} onChange={(v) => handleChange("injuries", v)} placeholder="例：右肩旋轉肌發炎，避免過頭推舉" />
              <Textarea label="其他備註（可選）" value={form.notes} onChange={(v) => handleChange("notes", v)} placeholder="例：每次訓練加 20 分鐘心率 140 有氧" />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={buildPlan} className="px-4 py-2 rounded-2xl bg-black text-white hover:opacity-90">產生方案</button>
              {plan && (
                <>
                  <button onClick={downloadJSON} className="px-4 py-2 rounded-2xl border border-gray-300 hover:bg-gray-100">下載 JSON</button>
                  <span className="text-sm text-gray-500">已產生專屬方案</span>
                </>
              )}
            </div>
          </Card>
        </section>

        {/* 右側：即時計算 */}
        <aside className="lg:col-span-1 space-y-4">
          <Card title="基礎計算（即時）">
            <Stat label="BMI" value={calc.bmi ? calc.bmi.toFixed(1) : "—"} sub={bmiLevel(calc.bmi)} />
            <Stat label="BMR" value={`${Math.round(calc.bmr)} kcal`} sub="基礎代謝" />
            <Stat label="TDEE" value={`${Math.round(calc.tdee)} kcal`} sub="日消耗（含活動）" />
            <div className="mt-3 border-t pt-3">
              <div className="text-sm text-gray-600 mb-1">建議攝取（依目標）</div>
              <ul className="text-sm leading-7">
                <li>熱量：<b>{Math.round(calc.kcal)} kcal/日</b></li>
                <li>蛋白質：<b>{calc.proteinG} g</b></li>
                <li>脂肪：<b>{calc.fatG} g</b></li>
                <li>碳水：<b>{calc.carbsG} g</b></li>
              </ul>
            </div>
          </Card>

          <Card title="安全提醒">
            <ul className="text-sm list-disc pl-5 space-y-2 text-gray-700">
              <li>本工具提供一般性建議，非醫療診斷或處方。</li>
              <li>若有心血管、骨科傷病或慢性病，先諮詢專業醫療人員。</li>
              <li>重量訓練遵守漸進超負荷原則，避免大幅度增加訓練量。</li>
            </ul>
          </Card>
        </aside>

        {/* 下方：輸出方案 */}
        {plan && (
          <section className="lg:col-span-3">
            <Card title="你的專屬訓練與營養方案">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">營養建議</h4>
                  <div className="rounded-2xl border p-3">
                    <p className="text-sm">每日熱量：<b>{Math.round(plan.nutrition.calories)} kcal</b></p>
                    <p className="text-sm">蛋白質：<b>{plan.nutrition.protein_g} g</b>、脂肪：<b>{plan.nutrition.fat_g} g</b>、碳水：<b>{plan.nutrition.carbs_g} g</b></p>
                    <ul className="text-sm mt-2 list-disc pl-5">
                      <li>蛋白質來源：雞胸、魚、瘦牛/豬、低脂乳製、豆製品。</li>
                      <li>碳水以全穀、薯根類為主；訓練前後優先配置。</li>
                      <li>脂肪以橄欖油、酪梨、堅果與深海魚為主。</li>
                    </ul>
                  </div>

                  <h4 className="font-semibold mt-5 mb-2">實用技巧</h4>
                  <ul className="rounded-2xl border p-3 text-sm list-disc pl-5 space-y-1">
                    {plan.tips.map((t, i) => (<li key={i}>{t}</li>))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">每週訓練表（{form.daysPerWeek} 天）</h4>
                  <div className="space-y-3">
                    {plan.training.map((d, i) => (
                      <div key={i} className="rounded-2xl border p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{d.day}</div>
                          <div className="text-xs text-gray-500">{d.focus}</div>
                        </div>
                        {d.blocks?.length ? (
                          <ol className="mt-2 text-sm list-decimal pl-5 space-y-1">
                            {d.blocks.map((b, j) => (<li key={j}>{b.name} — <span className="text-gray-600">{b.sets}</span></li>))}
                          </ol>
                        ) : (
                          <p className="mt-2 text-sm text-gray-500">此日為結構性休息/有氧或重複分化日，依個人恢復調整。</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 text-xs text-gray-500">
                版本：{plan.version} ｜ 產生時間：{new Date().toLocaleString()}
                <br />{plan.disclaimer}
              </div>
            </Card>
          </section>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-10 text-xs text-gray-500">
        © {new Date().getFullYear()} Fitness AI MVP — Built for demo.
      </footer>
    </div>
  );
}

/* ----------------- UI 小組件 ----------------- */
function Card({ title, children }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </label>
  );
}

function NumberInput({ label, value, onChange, min, max }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </label>
  );
}

function RangeInput({ label, value, onChange, min = 0, max = 10 }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </label>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-right">
        <div className="font-semibold">{value}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
      </div>
    </div>
  );
}

function bmiLevel(bmi) {
  if (!bmi) return "—";
  if (bmi < 18.5) return "過輕";
  if (bmi < 24) return "正常";
  if (bmi < 27) return "過重";
  return "肥胖";
}
