import React, { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

export default function FitnessAIPlanner() {
  const [form, setForm] = useState({
    sex: "male",
    age: 30,
    heightCm: 170.0,
    weightKg: 68.0,
    bodyFat: 20.0,
    activity: "moderate", // sedentary | light | moderate | active | veryActive
    goal: "fat_loss",     // fat_loss | muscle_gain | recomp | maintenance
    daysPerWeek: 4,
    equipmentLevel: "bw", // bw | db | gym
  });
  const [plan, setPlan] = useState(null);
  const planRef = useRef(null);

  const activityFactor = (key) =>
    ({
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
    }[key] || 1.55);

  const calc = useMemo(() => {
    const h = Number(form.heightCm) || 0;
    const w = Number(form.weightKg) || 0;
    const a = Number(form.age) || 0;

    const bmi = h && w ? w / Math.pow(h / 100, 2) : 0;
    const bmr =
      form.sex === "female"
        ? 10 * w + 6.25 * h - 5 * a - 161
        : 10 * w + 6.25 * h - 5 * a + 5;
    const tdee = bmr * activityFactor(form.activity);

    let kcal = tdee;
    if (form.goal === "fat_loss") kcal = tdee * 0.85;   // ~15% 赤字
    if (form.goal === "muscle_gain") kcal = tdee * 1.1; // ~10% 盈餘
    if (form.goal === "recomp") kcal = tdee * 0.95;     // 輕赤字

    const proteinG = Math.round((form.goal === "muscle_gain" ? 2.0 : 1.8) * w);
    const fatG = Math.round((kcal * 0.3) / 9);
    const carbsG = Math.max(0, Math.round((kcal - (proteinG * 4 + fatG * 9)) / 4));

    return { bmi, bmr, tdee, kcal, proteinG, fatG, carbsG };
  }, [form]);

  function handleChange(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // —— 器材映射 —— //
  function pickMove({ gym, db, bw }) {
    if (form.equipmentLevel === "gym") return gym ?? db ?? bw;
    if (form.equipmentLevel === "db") return db ?? bw;
    return bw;
  }

  const M = {
    squat: pickMove({
      gym: "槓鈴深蹲",
      db: "高腳杯深蹲（啞鈴/壺鈴）",
      bw: "徒手深蹲 / 椅子坐站",
    }),
    hingeHeavy: pickMove({
      gym: "硬舉 / 羅馬椅背伸",
      db: "羅馬尼亞硬舉（啞鈴）",
      bw: "臀橋 / 髖推（徒手）",
    }),
    pressFlat: pickMove({
      gym: "槓鈴臥推 / 胸推機",
      db: "啞鈴臥推",
      bw: "伏地挺身（可抬高/負重背包）",
    }),
    pressIncline: pickMove({
      gym: "上斜臥推 / 肩推機",
      db: "上斜啞鈴臥推 / 啞鈴肩推",
      bw: "倒V 伏地 / 牆面倒立推",
    }),
    rowHorizontal: pickMove({
      gym: "槓鈴划船 / 滑輪划船",
      db: "單手啞鈴划船",
      bw: "反向划船（桌邊/單槓）",
    }),
    pulldown: pickMove({
      gym: "高位下拉 / 引體向上",
      db: "彈力帶下拉 / 啞鈴上拉",
      bw: "引體向上（彈力帶輔助 / 負向）",
    }),
    shoulderLat: pickMove({
      gym: "側平舉機 / 繩索側舉",
      db: "啞鈴側平舉",
      bw: "側平板＋肩胛控制",
    }),
    lunge: pickMove({
      gym: "腿推 / 弓箭步（槓）",
      db: "啞鈴弓箭步 / 台階踩踏",
      bw: "弓箭步 / 台階踩踏（徒手）",
    }),
    armBi: pickMove({
      gym: "彎舉（滑輪/槓）",
      db: "啞鈴彎舉",
      bw: "毛巾等長彎舉 / 引體上停留",
    }),
    armTri: pickMove({
      gym: "下壓（滑輪）/ 窄握臥推",
      db: "啞鈴法式推舉 / 窄握啞鈴推",
      bw: "椅上撐體 / 窄距伏地",
    }),
    corePlank: "平板撐 / 側棒式",
    coreCrunch: "捲腹 / 死蟲",
    conditioning: pickMove({
      gym: "跑步機 / 橢圓機 / 飛輪",
      db: "快走負重（啞鈴）",
      bw: "快走 / 慢跑 / 單車",
    }),
  };

  // —— 訓練分化 —— //
  function buildSplit(days) {
    const FullA = [
      { name: M.squat, sets: "3–4 × 6–10" },
      { name: M.pressFlat, sets: "3–4 × 6–10" },
      { name: M.rowHorizontal, sets: "3–4 × 8–12" },
      { name: M.shoulderLat, sets: "3 × 10–15" },
      { name: `${M.corePlank}`, sets: "3 × 30–60 秒" },
    ];
    const FullB = [
      { name: M.hingeHeavy, sets: "3–4 × 5–8" },
      { name: M.pressIncline, sets: "3 × 8–12" },
      { name: M.pulldown, sets: "3 × 8–12" },
      { name: M.lunge, sets: "3 × 8–12/側" },
      { name: `${M.coreCrunch}`, sets: "3 × 12–15" },
    ];

    if (days <= 3)
      return [
        { day: "Day 1", focus: "全身 A", blocks: FullA },
        { day: "Day 2", focus: "全身 B", blocks: FullB },
        {
          day: "Day 3",
          focus: "代謝/心肺 + 弱項補強",
          blocks: [
            { name: M.conditioning, sets: "Zone2 30–40 分 或 間歇 8–10 組" },
            { name: `${M.armBi} / ${M.armTri}`, sets: "各 2–3 × 10–15" },
            { name: "伸展/活動度", sets: "10–15 分" },
          ],
        },
      ];

    if (days === 4)
      return [
        {
          day: "Day 1",
          focus: "上肢",
          blocks: [
            { name: M.pressFlat, sets: "4 × 6–10" },
            { name: M.rowHorizontal, sets: "4 × 8–12" },
            { name: M.pressIncline, sets: "3 × 8–12" },
            { name: `${M.armBi} / ${M.armTri}`, sets: "各 2–3 × 10–15" },
          ],
        },
        {
          day: "Day 2",
          focus: "下肢",
          blocks: [
            { name: M.squat, sets: "4 × 6–10" },
            { name: M.hingeHeavy, sets: "3 × 5–8" },
            { name: M.lunge, sets: "3 × 8–12/側" },
            { name: M.corePlank, sets: "3 × 30–60 秒" },
          ],
        },
        { day: "Day 3", focus: "有氧/活動度", blocks: [{ name: M.conditioning, sets: "30–45 分" }] },
        {
          day: "Day 4",
          focus: "上肢 2",
          blocks: [
            { name: M.pressIncline, sets: "4 × 6–10" },
            { name: M.pulldown, sets: "4 × 8–12" },
            { name: M.shoulderLat, sets: "3 × 10–15" },
            { name: `${M.armBi} / ${M.armTri}`, sets: "各 2–3 × 10–15" },
          ],
        },
      ];

    if (days === 5)
      return [
        {
          day: "Day 1",
          focus: "Push",
          blocks: [
            { name: M.pressFlat, sets: "4 × 5–8" },
            { name: M.pressIncline, sets: "3 × 6–10" },
            { name: M.shoulderLat, sets: "3 × 12–15" },
          ],
        },
        {
          day: "Day 2",
          focus: "Pull",
          blocks: [
            { name: M.rowHorizontal, sets: "3–4 × 8–12" },
            { name: M.pulldown, sets: "3 × 8–12" },
            { name: `${M.armBi}`, sets: "3 × 10–15" },
          ],
        },
        {
          day: "Day 3",
          focus: "Legs",
          blocks: [
            { name: M.squat, sets: "4 × 5–8" },
            { name: M.hingeHeavy, sets: "3 × 5–8" },
            { name: M.lunge, sets: "3 × 8–12/側" },
          ],
        },
        { day: "Day 4", focus: "全身/代謝", blocks: [{ name: M.conditioning, sets: "循環或 Zone2 30–40 分" }, { name: M.coreCrunch, sets: "3 × 12–15" }] },
        { day: "Day 5", focus: "弱項 + 活動度", blocks: [{ name: `${M.armBi} / ${M.armTri}`, sets: "各 2–3 × 10–15" }, { name: "伸展/活動度", sets: "10–15 分" }] },
      ];

    // 6–7 天：PPL 重複或穿插休息
    return [
      { day: "Day 1", focus: "Push", blocks: [{ name: M.pressFlat, sets: "4 × 6–10" }, { name: M.pressIncline, sets: "3 × 8–12" }, { name: M.shoulderLat, sets: "3 × 12–15" }] },
      { day: "Day 2", focus: "Pull", blocks: [{ name: M.rowHorizontal, sets: "4 × 8–12" }, { name: M.pulldown, sets: "3 × 8–12" }, { name: M.armBi, sets: "3 × 10–15" }] },
      { day: "Day 3", focus: "Legs", blocks: [{ name: M.squat, sets: "4 × 6–10" }, { name: M.hingeHeavy, sets: "3 × 5–8" }, { name: M.lunge, sets: "3 × 8–12/側" }] },
      { day: "Day 4", focus: "休息/有氧", blocks: [{ name: M.conditioning, sets: "30–45 分" }] },
      { day: "Day 5", focus: "Push", blocks: [{ name: M.pressFlat, sets: "4 × 6–10" }, { name: M.pressIncline, sets: "3 × 8–12" }, { name: M.shoulderLat, sets: "3 × 12–15" }] },
      { day: "Day 6", focus: "Pull", blocks: [{ name: M.rowHorizontal, sets: "4 × 8–12" }, { name: M.pulldown, sets: "3 × 8–12" }, { name: M.armTri, sets: "3 × 10–15" }] },
      { day: "Day 7", focus: "Legs 或 休息", blocks: [{ name: M.squat, sets: "3 × 6–10" }, { name: M.lunge, sets: "3 × 8–12/側" }, { name: M.corePlank, sets: "3 × 30–60 秒" }] },
    ];
  }

  // —— 實用建議（依 BMI / 活動量 / 體脂 / 器材 / 目標）—— //
  function practicalTips() {
    const tips = [];

    // BMI（採亞洲常用範圍）
    const bmi = calc.bmi;
    if (bmi) {
      if (bmi < 18.5)
        tips.push("BMI 偏低：優先增肌與熱量盈餘（+10%），每肌群每週 10–20 組。");
      else if (bmi < 24)
        tips.push("BMI 正常：以表現進步為核心，維持 TDEE 附近與規律阻力訓練。");
      else if (bmi < 27)
        tips.push("BMI 過重：以 10–15% 熱量赤字搭配阻力訓練與每週 2–3 次有氧。");
      else tips.push("BMI 肥胖：循序加強有氧與阻力訓練，先確保關節友善的動作選擇。");
    }

    // 活動量
    const actMap = {
      sedentary: "久坐：每日步數先到 6–8k，加入 2–4 次 Zone2 有氧（30–45 分）。",
      light: "輕量：維持步數 8–10k，阻力訓練後加 10–15 分收操有氧。",
      moderate: "中等：可加入 1 次間歇有氧，訓練量週期化（3 週遞增 1 週降）。",
      active: "高：注意恢復與睡眠，安排 1 週 deload（降量）避免過度訓練。",
      veryActive: "非常高：碳水前置到訓練前後，重視關節保養與活動度。",
    };
    tips.push(actMap[form.activity]);

    // 體脂（不分性別的簡化版門檻）
    const bf = Number(form.bodyFat) || 0;
    if (bf >= 30) tips.push("體脂較高：優先赤字飲食、固定蛋白質；力量維持不追求過量訓練量。");
    else if (bf >= 20) tips.push("體脂中等：可採輕赤字或維持熱量，專注於力量與動作品質。");
    else tips.push("體脂較低：留意內分泌與恢復，避免長期過低體脂；增肌期採小幅盈餘。");

    // 器材
    const eq = { bw: "徒手", db: "徒手＋啞鈴", gym: "健身房設備" }[form.equipmentLevel];
    if (form.equipmentLevel === "bw")
      tips.push("器材：徒手 → 使用節奏控制與慢離心、增加動作難度（如抬高伏地）。");
    if (form.equipmentLevel === "db")
      tips.push("器材：徒手＋啞鈴 → 一對可調啞鈴＋穩固椅凳即可完成全身訓練。");
    if (form.equipmentLevel === "gym")
      tips.push("器材：健身房 → 自由重量＋器械混合，複合動作放前、孤立動作收尾。");

    // 目標
    const goalTips =
      form.goal === "fat_loss"
        ? "目標：減脂 → 赤字約 15%，腰圍連續兩週不降再減 100–150 kcal。"
        : form.goal === "muscle_gain"
        ? "目標：增肌 → 盈餘約 10%，每月體重＋0.5–1%，漸進超負荷。"
        : form.goal === "recomp"
        ? "目標：重組 → 維持或小赤字；以力量微進步＋腰圍下降為判準。"
        : "目標：維持 → 以表現與健康指標為主，固定蛋白質與規律運動。";
    tips.push(goalTips);

    tips.push(`每週訓練天數：${form.daysPerWeek} 天；器材：${eq}。`);
    return tips.filter(Boolean);
  }

  function buildPlan() {
    const training = buildSplit(Number(form.daysPerWeek));
    const tips = practicalTips();
    setPlan({
      nutrition: {
        calories: Math.round(calc.kcal),
        protein_g: calc.proteinG,
        fat_g: calc.fatG,
        carbs_g: calc.carbsG,
      },
      training,
      tips,
      generatedAt: new Date().toISOString(),
    });
  }

  async function savePlanAsImage() {
    if (!planRef.current) return;
    const el = planRef.current;
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: typeof window !== "undefined" && window.devicePixelRatio > 1 ? 2 : 1.5,
      useCORS: true,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = dataUrl;
    a.download = `fitness_plan_${today}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4">💥 健身超猛專案 by 朱</h1>

      {/* 表單（無暱稱） */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-5xl">
        <Select
          label="性別"
          value={form.sex}
          onChange={(v) => handleChange("sex", v)}
          options={[
            { value: "male", label: "男性" },
            { value: "female", label: "女性" },
          ]}
        />
        <Input label="年齡" type="number" step="1" value={form.age} onChange={(v) => handleChange("age", Number(v))} />
        <Input label="身高 (cm)" type="number" step="0.1" value={form.heightCm} onChange={(v) => handleChange("heightCm", Number(v))} />
        <Input label="體重 (kg)" type="number" step="0.1" value={form.weightKg} onChange={(v) => handleChange("weightKg", Number(v))} />
        <Input label="體脂 (%)" type="number" step="0.5" value={form.bodyFat} onChange={(v) => handleChange("bodyFat", Number(v))} />
        <Select
          label="活動量"
          value={form.activity}
          onChange={(v) => handleChange("activity", v)}
          options={[
            { value: "sedentary", label: "久坐" },
            { value: "light", label: "輕量" },
            { value: "moderate", label: "中等" },
            { value: "active", label: "高" },
            { value: "veryActive", label: "非常高" },
          ]}
        />
        <Select
          label="目標"
          value={form.goal}
          onChange={(v) => handleChange("goal", v)}
          options={[
            { value: "fat_loss", label: "減脂" },
            { value: "muscle_gain", label: "增肌" },
            { value: "recomp", label: "重組" },
            { value: "maintenance", label: "維持" },
          ]}
        />
        <Select
          label="器材限制"
          value={form.equipmentLevel}
          onChange={(v) => handleChange("equipmentLevel", v)}
          options={[
            { value: "bw", label: "徒手" },
            { value: "db", label: "徒手＋簡易器材（啞鈴）" },
            { value: "gym", label: "健身房設備" },
          ]}
        />
        <label className="text-sm">
          <span className="text-gray-600">每週訓練天數（{form.daysPerWeek}）</span>
          <input
            className="w-full"
            type="range"
            min="2"
            max="7"
            value={form.daysPerWeek}
            onChange={(e) => handleChange("daysPerWeek", Number(e.target.value))}
          />
        </label>
      </div>

      {/* 計算結果與按鈕（下載鍵常駐；未產生前禁用） */}
      <div className="mt-6 bg-white shadow rounded-xl p-4 max-w-xl">
        <h2 className="font-semibold mb-2">📊 計算結果</h2>
        <p>BMI：{calc.bmi ? calc.bmi.toFixed(1) : "—"}</p>
        <p>BMR：{Math.round(calc.bmr)} kcal</p>
        <p>TDEE：{Math.round(calc.tdee)} kcal</p>
        <p>建議每日熱量：{Math.round(calc.kcal)} kcal</p>
        <p>蛋白質：{calc.proteinG} g，脂肪：{calc.fatG} g，碳水：{calc.carbsG} g</p>

        <div className="flex gap-3 mt-3">
          <button
            onClick={buildPlan}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            產生專屬方案
          </button>

          <button
            onClick={savePlanAsImage}
            disabled={!plan}
            title={!plan ? "請先點『產生專屬方案』" : "下載 PNG"}
            className={`px-4 py-2 rounded-xl border ${
              plan ? "border-gray-300 hover:bg-gray-100" : "border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            下載圖片（PNG）
          </button>
        </div>
      </div>

      {/* 可截圖區塊（營養＋訓練＋實用建議） */}
      {plan && (
        <div ref={planRef} className="mt-6 grid md:grid-cols-3 gap-6 max-w-6xl">
          <div className="bg-white shadow rounded-xl p-4 md:col-span-1">
            <div className="mb-2 text-sm text-gray-500">
              產出時間：{new Date(plan.generatedAt).toLocaleString()} ｜ 器材：{{ bw: "徒手", db: "徒手+啞鈴", gym: "健身房設備" }[form.equipmentLevel]}
            </div>
            <h3 className="font-semibold mb-2">🍽️ 營養建議</h3>
            <p>每日熱量：<b>{plan.nutrition.calories}</b> kcal</p>
            <p>蛋白質：<b>{plan.nutrition.protein_g}</b> g、脂肪：<b>{plan.nutrition.fat_g}</b> g、碳水：<b>{plan.nutrition.carbs_g}</b> g</p>
            <div className="mt-4 text-[10px] text-gray-400 text-right">© 健身超猛專案 — 非醫療建議</div>
          </div>

          <div className="bg-white shadow rounded-xl p-4 md:col-span-1">
            <h3 className="font-semibold mb-2">🏃 每週訓練表（{form.daysPerWeek} 天）</h3>
            <div className="space-y-3">
              {plan.training.map((d, i) => (
                <div key={i} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{d.day}</div>
                    <div className="text-xs text-gray-500">{d.focus}</div>
                  </div>
                  {d.blocks && d.blocks.length ? (
                    <ol className="mt-2 list-decimal pl-5 text-sm space-y-1">
                      {d.blocks.map((b, j) => (
                        <li key={j}>
                          {b.name} — <span className="text-gray-600">{b.sets}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      此日為結構性休息/有氧或重複分化日，依個人恢復調整。
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-xl p-4 md:col-span-1">
            <h3 className="font-semibold mb-2">🧠 實用建議（依個人狀態）</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {plan.tips.map((t, i) => (<li key={i}>{t}</li>))}
            </ul>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-6">
        ⚠️ 本工具提供一般性建議，非醫療診斷。如有健康問題請諮詢專業醫師。
      </p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", step }) {
  return (
    <label className="text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-sm">
      <span className="text-gray-600">{label}</span>
      <select
        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}        : 10 * w + 6.25 * h - 5 * a + 5;
    const tdee = bmr * activityFactor(form.activity);

    let kcal = tdee;
    if (form.goal === "fat_loss") kcal = tdee * 0.85;   // ~15% 赤字
    if (form.goal === "muscle_gain") kcal = tdee * 1.1; // ~10% 盈餘
    if (form.goal === "recomp") kcal = tdee * 0.95;     // 輕赤字

    const proteinG = Math.round((form.goal === "muscle_gain" ? 2.0 : 1.8) * w);
    const fatG = Math.round((kcal * 0.3) / 9);
    const carbsG = Math.max(0, Math.round((kcal - (proteinG * 4 + fatG * 9)) / 4));

    return { bmi, bmr, tdee, kcal, proteinG, fatG, carbsG };
  }, [form]);

  function handleChange(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // —— 器材映射 —— //
  function pickMove({ gym, db, bw }) {
    if (form.equipmentLevel === "gym") return gym ?? db ?? bw;
    if (form.equipmentLevel === "db") return db ?? bw;
    return bw;
  }

  const M = {
    squat: pickMove({
      gym: "槓鈴深蹲",
      db: "高腳杯深蹲（啞鈴/壺鈴）",
      bw: "徒手深蹲 / 椅子坐站",
    }),
    hingeHeavy: pickMove({
      gym: "硬舉 / 羅馬椅背伸",
      db: "羅馬尼亞硬舉（啞鈴）",
      bw: "臀橋 / 髖推（徒手）",
    }),
    pressFlat: pickMove({
      gym: "槓鈴臥推 / 胸推機",
      db: "啞鈴臥推",
      bw: "伏地挺身（可抬高/負重背包）",
    }),
    pressIncline: pickMove({
      gym: "上斜臥推 / 肩推機",
      db: "上斜啞鈴臥推 / 啞鈴肩推",
      bw: "倒V 伏地 / 牆面倒立推",
    }),
    rowHorizontal: pickMove({
      gym: "槓鈴划船 / 滑輪划船",
      db: "單手啞鈴划船",
      bw: "反向划船（桌邊/單槓）",
    }),
    pulldown: pickMove({
      gym: "高位下拉 / 引體向上",
      db: "彈力帶下拉 / 啞鈴上拉",
      bw: "引體向上（彈力帶輔助 / 負向）",
    }),
    shoulderLat: pickMove({
      gym: "側平舉機 / 繩索側舉",
      db: "啞鈴側平舉",
      bw: "側平板＋肩胛控制",
    }),
    lunge: pickMove({
      gym: "腿推 / 弓箭步（槓）",
      db: "啞鈴弓箭步 / 台階踩踏",
      bw: "弓箭步 / 台階踩踏（徒手）",
    }),
    armBi: pickMove({
      gym: "彎舉（滑輪/槓）",
      db: "啞鈴彎舉",
      bw: "毛巾等長彎舉 / 引體上停留",
    }),
    armTri: pickMove({
      gym: "下壓（滑輪）/ 窄握臥推",
      db: "啞鈴法式推舉 / 窄握啞鈴推",
      bw: "椅上撐體 / 窄距伏地",
    }),
    corePlank: "平板撐 / 側棒式",
    coreCrunch: "捲腹 / 死蟲",
    conditioning: pickMove({
      gym: "跑步機 / 橢圓機 / 飛輪",
      db: "快走負重（啞鈴）",
      bw: "快走 / 慢跑 / 單車",
    }),
  };

  // —— 訓練分化 —— //
  function buildSplit(days) {
    const FullA = [
      { name: M.squat, sets: "3–4 × 6–10" },
      { name: M.pressFlat, sets: "3–4 × 6–10" },
      { name: M.rowHorizontal, sets: "3–4 × 8–12" },
      { name: M.shoulderLat, sets: "3 × 10–15" },
      { name: `${M.corePlank}`, sets: "3 × 30–60 秒" },
    ];
    const FullB = [
      { name: M.hingeHeavy, sets: "3–4 × 5–8" },
      { name: M.pressIncline, sets: "3 × 8–12" },
      { name: M.pulldown, sets: "3 × 8–12" },
      { name: M.lunge, sets: "3 × 8–12/側" },
      { name: `${M.coreCrunch}`, sets: "3 × 12–15" },
    ];

    if (days <= 3)
      return [
        { day: "Day 1", focus: "全身 A", blocks: FullA },
        { day: "Day 2", focus: "全身 B", blocks: FullB },
        {
          day: "Day 3",
          focus: "代謝/心肺 + 弱項補強",
          blocks: [
            { name: M.conditioning, sets: "Zone2 30–40 分 或 間歇 8–10 組" },
            { name: `${M.armBi} / ${M.armTri}`, sets: "各 2–3 × 10–15" },
            { name: "伸展/活動度", sets: "10–15 分" },
          ],
        },
      ];

    if (days === 4)
      return [
        {
          day: "Day 1",
          focus: "上肢",
          blocks: [
            { name: M.pressFlat, sets: "4 × 6–10" },
            { name: M.rowHorizontal, sets: "4 × 8–12" },
            { name: M.pressIncline, sets: "3 × 8–12" },
            { name: `${M.armBi} / ${M.armTri}`, sets: "各 2–3 × 10–15" },
          ],
        },
        {
          day: "Day 2",
          focus: "下肢",
          blocks: [
            { name: M.squat, sets: "4 × 6–10" },
            { name: M.hingeHeavy, sets: "3 × 5–8" },
            { name: M.lunge, sets: "3 × 8–12/側" },
            { name: M.corePlank, sets: "3 × 30–60 秒" },
          ],
        },
        { day: "Day 3", focus: "有氧/活動度", blocks: [{ name: M.conditioning, sets: "30–45 分" }] },
        {
          day: "Day 4",
          focus: "上肢 2",
          blocks: [
            { name: M.pressIncline, sets: "4 × 6–10" },
            { name: M.pulldown, sets: "4 × 8–12" },
            { name: M.shoulderLat, sets: "3 × 10–15" },
            { name: `${M.armBi} / ${M.armTri}`, sets: "各 2–3 × 10–15" },
          ],
        },
      ];

    if (days === 5)
      return [
        {
          day: "Day 1",
          focus: "Push",
          blocks: [
            { name: M.pressFlat, sets: "4 × 5–8" },
            { name: M.pressIncline, sets: "3 × 6–10" },
            { name: M.shoulderLat, sets: "3 × 12–15" },
          ],
        },
        {
          day: "Day 2",
          focus: "Pull",
          blocks: [
            { name: M.rowHorizontal, sets: "3–4 × 8–12" },
            { name: M.pulldown, sets: "3 × 8–12" },
            { name: `${M.armBi}`, sets: "3 × 10–15" },
          ],
        },
        {
          day: "Day 3",
          focus: "Legs",
          blocks: [
            { name: M.squat, sets: "4 × 5–8" },
            { name: M.hingeHeavy, sets: "3 × 5–8" },
            { name: M.lunge, sets: "3 × 8–12/側" },
          ],
        },
        { day: "Day 4", focus: "全身/代謝", blocks: [{ name: M.conditioning, sets: "循環或 Zone2 30–40 分" }, { name: M.coreCrunch, sets: "3 × 12–15" }] },
        { day: "Day 5", focus: "弱項 + 活動度", blocks: [{ name: `${M.armBi} / ${M.armTri}`, sets: "各 2–3 × 10–15" }, { name: "伸展/活動度", sets: "10–15 分" }] },
      ];

    // 6–7 天：PPL 重複或穿插休息
    return [
      { day: "Day 1", focus: "Push", blocks: [{ name: M.pressFlat, sets: "4 × 6–10" }, { name: M.pressIncline, sets: "3 × 8–12" }, { name: M.shoulderLat, sets: "3 × 12–15" }] },
      { day: "Day 2", focus: "Pull", blocks: [{ name: M.rowHorizontal, sets: "4 × 8–12" }, { name: M.pulldown, sets: "3 × 8–12" }, { name: M.armBi, sets: "3 × 10–15" }] },
      { day: "Day 3", focus: "Legs", blocks: [{ name: M.squat, sets: "4 × 6–10" }, { name: M.hingeHeavy, sets: "3 × 5–8" }, { name: M.lunge, sets: "3 × 8–12/側" }] },
      { day: "Day 4", focus: "休息/有氧", blocks: [{ name: M.conditioning, sets: "30–45 分" }] },
      { day: "Day 5", focus: "Push", blocks: [{ name: M.pressFlat, sets: "4 × 6–10" }, { name: M.pressIncline, sets: "3 × 8–12" }, { name: M.shoulderLat, sets: "3 × 12–15" }] },
      { day: "Day 6", focus: "Pull", blocks: [{ name: M.rowHorizontal, sets: "4 × 8–12" }, { name: M.pulldown, sets: "3 × 8–12" }, { name: M.armTri, sets: "3 × 10–15" }] },
      { day: "Day 7", focus: "Legs 或 休息", blocks: [{ name: M.squat, sets: "3 × 6–10" }, { name: M.lunge, sets: "3 × 8–12/側" }, { name: M.corePlank, sets: "3 × 30–60 秒" }] },
    ];
  }

  // —— 實用建議（依 BMI / 活動量 / 體脂 / 器材 / 目標）—— //
  function practicalTips() {
    const tips = [];

    // BMI（採亞洲常用範圍）
    const bmi = calc.bmi;
    if (bmi) {
      if (bmi < 18.5)
        tips.push("BMI 偏低：優先增肌與熱量盈餘（+10%），每肌群每週 10–20 組。");
      else if (bmi < 24)
        tips.push("BMI 正常：以表現進步為核心，維持 TDEE 附近與規律阻力訓練。");
      else if (bmi < 27)
        tips.push("BMI 過重：以 10–15% 熱量赤字搭配阻力訓練與每週 2–3 次有氧。");
      else tips.push("BMI 肥胖：循序加強有氧與阻力訓練，先確保關節友善的動作選擇。");
    }

    // 活動量
    const actMap = {
      sedentary: "久坐：每日步數先到 6–8k，加入 2–4 次 Zone2 有氧（30–45 分）。",
      light: "輕量：維持步數 8–10k，阻力訓練後加 10–15 分收操有氧。",
      moderate: "中等：可加入 1 次間歇有氧，訓練量週期化（3 週遞增 1 週降）。",
      active: "高：注意恢復與睡眠，安排 1 週 deload（降量）避免過度訓練。",
      veryActive: "非常高：碳水前置到訓練前後，重視關節保養與活動度。",
    };
    tips.push(actMap[form.activity]);

    // 體脂（不分性別的簡化版門檻）
    const bf = Number(form.bodyFat) || 0;
    if (bf >= 30) tips.push("體脂較高：優先赤字飲食、固定蛋白質；力量維持不追求過量訓練量。");
    else if (bf >= 20) tips.push("體脂中等：可採輕赤字或維持熱量，專注於力量與動作品質。");
    else tips.push("體脂較低：留意內分泌與恢復，避免長期過低體脂；增肌期採小幅盈餘。");

    // 器材
    const eq = { bw: "徒手", db: "徒手＋啞鈴", gym: "健身房設備" }[form.equipmentLevel];
    if (form.equipmentLevel === "bw")
      tips.push("器材：徒手 → 使用節奏控制與慢離心、增加動作難度（如抬高伏地）。");
    if (form.equipmentLevel === "db")
      tips.push("器材：徒手＋啞鈴 → 一對可調啞鈴＋穩固椅凳即可完成全身訓練。");
    if (form.equipmentLevel === "gym")
      tips.push("器材：健身房 → 自由重量＋器械混合，複合動作放前、孤立動作收尾。");

    // 目標
    const goalTips =
      form.goal === "fat_loss"
        ? "目標：減脂 → 赤字約 15%，腰圍連續兩週不降再減 100–150 kcal。"
        : form.goal === "muscle_gain"
        ? "目標：增肌 → 盈餘約 10%，每月體重＋0.5–1%，漸進超負荷。"
        : form.goal === "recomp"
        ? "目標：重組 → 維持或小赤字；以力量微進步＋腰圍下降為判準。"
        : "目標：維持 → 以表現與健康指標為主，固定蛋白質與規律運動。";
    tips.push(goalTips);

    tips.push(`每週訓練天數：${form.daysPerWeek} 天；器材：${eq}。`);
    return tips.filter(Boolean);
  }

  function buildPlan() {
    const training = buildSplit(Number(form.daysPerWeek));
    const tips = practicalTips();
    setPlan({
      nutrition: {
        calories: Math.round(calc.kcal),
        protein_g: calc.proteinG,
        fat_g: calc.fatG,
        carbs_g: calc.carbsG,
      },
      training,
      tips,
      generatedAt: new Date().toISOString(),
    });
  }

  async function savePlanAsImage() {
    if (!planRef.current) return;
    const el = planRef.current;
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: typeof window !== "undefined" && window.devicePixelRatio > 1 ? 2 : 1.5,
      useCORS: true,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = dataUrl;
    a.download = `fitness_plan_${today}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4">💥 健身超猛專案 by 朱</h1>

      {/* 表單（無暱稱） */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-5xl">
        <Select
          label="性別"
          value={form.sex}
          onChange={(v) => handleChange("sex", v)}
          options={[
            { value: "male", label: "男性" },
            { value: "female", label: "女性" },
          ]}
        />
        <Input label="年齡" type="number" step="1" value={form.age} onChange={(v) => handleChange("age", Number(v))} />
        <Input label="身高 (cm)" type="number" step="0.1" value={form.heightCm} onChange={(v) => handleChange("heightCm", Number(v))} />
        <Input label="體重 (kg)" type="number" step="0.1" value={form.weightKg} onChange={(v) => handleChange("weightKg", Number(v))} />
        <Input label="體脂 (%)" type="number" step="0.5" value={form.bodyFat} onChange={(v) => handleChange("bodyFat", Number(v))} />
        <Select
          label="活動量"
          value={form.activity}
          onChange={(v) => handleChange("activity", v)}
          options={[
            { value: "sedentary", label: "久坐" },
            { value: "light", label: "輕量" },
            { value: "moderate", label: "中等" },
            { value: "active", label: "高" },
            { value: "veryActive", label: "非常高" },
          ]}
        />
        <Select
          label="目標"
          value={form.goal}
          onChange={(v) => handleChange("goal", v)}
          options={[
            { value: "fat_loss", label: "減脂" },
            { value: "muscle_gain", label: "增肌" },
            { value: "recomp", label: "重組" },
            { value: "maintenance", label: "維持" },
          ]}
        />
        <Select
          label="器材限制"
          value={form.equipmentLevel}
          onChange={(v) => handleChange("equipmentLevel", v)}
          options={[
            { value: "bw", label: "徒手" },
            { value: "db", label: "徒手＋簡易器材（啞鈴）" },
            { value: "gym", label: "健身房設備" },
          ]}
        />
        <label className="text-sm">
          <span className="text-gray-600">每週訓練天數（{form.daysPerWeek}）</span>
          <input
            className="w-full"
            type="range"
            min="2"
            max="7"
            value={form.daysPerWeek}
            onChange={(e) => handleChange("daysPerWeek", Number(e.target.value))}
          />
        </label>
      </div>

      {/* 計算結果與按鈕（下載鍵常駐；未產生前禁用） */}
      <div className="mt-6 bg-white shadow rounded-xl p-4 max-w-xl">
        <h2 className="font-semibold mb-2">📊 計算結果</h2>
        <p>BMI：{calc.bmi ? calc.bmi.toFixed(1) : "—"}</p>
        <p>BMR：{Math.round(calc.bmr)} kcal</p>
        <p>TDEE：{Math.round(calc.tdee)} kcal</p>
        <p>建議每日熱量：{Math.round(calc.kcal)} kcal</p>
        <p>蛋白質：{calc.proteinG} g，脂肪：{calc.fatG} g，碳水：{calc.carbsG} g</p>

        <div className="flex gap-3 mt-3">
          <button
            onClick={buildPlan}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            產生專屬方案
          </button>

          <button
            onClick={savePlanAsImage}
            disabled={!plan}
            title={!plan ? "請先點『產生專屬方案』" : "下載 PNG"}
            className={`px-4 py-2 rounded-xl border ${
              plan ? "border-gray-300 hover:bg-gray-100" : "border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            下載圖片（PNG）
          </button>
        </div>
      </div>

      {/* 可截圖區塊（營養＋訓練＋實用建議） */}
      {plan && (
        <div ref={planRef} className="mt-6 grid md:grid-cols-3 gap-6 max-w-6xl">
          <div className="bg-white shadow rounded-xl p-4 md:col-span-1">
            <div className="mb-2 text-sm text-gray-500">
              產出時間：{new Date(plan.generatedAt).toLocaleString()} ｜ 器材：{{ bw: "徒手", db: "徒手+啞鈴", gym: "健身房設備" }[form.equipmentLevel]}
            </div>
            <h3 className="font-semibold mb-2">🍽️ 營養建議</h3>
            <p>每日熱量：<b>{plan.nutrition.calories}</b> kcal</p>
            <p>蛋白質：<b>{plan.nutrition.protein_g}</b> g、脂肪：<b>{plan.nutrition.fat_g}</b> g、碳水：<b>{plan.nutrition.carbs_g}</b> g</p>
            <div className="mt-4 text-[10px] text-gray-400 text-right">© 健身超猛專案 — 非醫療建議</div>
          </div>

          <div className="bg-white shadow rounded-xl p-4 md:col-span-1">
            <h3 className="font-semibold mb-2">🏃 每週訓練表（{form.daysPerWeek} 天）</h3>
            <div className="space-y-3">
              {plan.training.map((d, i) => (
                <div key={i} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{d.day}</div>
                    <div className="text-xs text-gray-500">{d.focus}</div>
                  </div>
                  {d.blocks && d.blocks.length ? (
                    <ol className="mt-2 list-decimal pl-5 text-sm space-y-1">
                      {d.blocks.map((b, j) => (
                        <li key={j}>
                          {b.name} — <span className="text-gray-600">{b.sets}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      此日為結構性休息/有氧或重複分化日，依個人恢復調整。
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-xl p-4 md:col-span-1">
            <h3 className="font-semibold mb-2">🧠 實用建議（依個人狀態）</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {plan.tips.map((t, i) => (<li key={i}>{t}</li>))}
            </ul>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-6">
        ⚠️ 本工具提供一般性建議，非醫療診斷。如有健康問題請諮詢專業醫師。
      </p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", step }) {
  return (
    <label className="text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-sm">
      <span className="text-gray-600">{label}</span>
      <select
        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
