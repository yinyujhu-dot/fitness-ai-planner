import React, { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

export default function FitnessAIPlanner() {
  const [form, setForm] = useState({
    name: "",
    sex: "male",
    age: 30,
    heightCm: 170,
    weightKg: 68,
    bodyFat: 20,
    activity: "moderate",
    goal: "fat_loss", // fat_loss | muscle_gain | maintenance | recomp
    daysPerWeek: 4,
    equipmentLevel: "bw", // bw | db | gym
  });
  const [plan, setPlan] = useState(null);
  const planRef = useRef(null); // 圖片輸出區塊

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
    if (form.goal === "fat_loss") kcal = tdee * 0.85; // ~15% 赤字
    if (form.goal === "muscle_gain") kcal = tdee * 1.1; // ~10% 盈餘
    if (form.goal === "recomp") kcal = tdee * 0.95; // 輕赤字

    const proteinG = Math.round((form.goal === "muscle_gain" ? 2.0 : 1.8) * w);
    const fatG = Math.round((kcal * 0.3) / 9);
    const carbsG = Math.max(0, Math.round((kcal - (proteinG * 4 + fatG * 9)) / 4));

    return { bmi, bmr, tdee, kcal, proteinG, fatG, carbsG };
  }, [form]);

  function handleChange(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // ---- 器材選擇對應的動作名稱 ----
  function pickMove({ gym, db, bw }) {
    if (form.equipmentLevel === "gym") return gym ?? db ?? bw;
    if (form.equipmentLevel === "db") return db ?? bw;
    return bw; // 徒手
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
      db: "彈力帶下拉（可選）/ 啞鈴上拉",
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

  function goalTips(goal) {
    if (goal === "fat_loss")
      return [
        "每日熱量赤字約 15%，蛋白質 1.8–2.0 g/kg。",
        "每週 2–4 次 Zone2；保持阻力訓練強度避免流失肌肉。",
        "腰圍連續兩週不降 → 熱量再降 100–150 kcal。",
      ];
    if (goal === "muscle_gain")
      return [
        "熱量盈餘 ~10%；每肌群每週 10–20 組，RIR 1–3。",
        "週期化增加總量：先加組數，再加重量。",
        "睡 7–9 小時；每月體重 +0.5–1%。",
      ];
    if (goal === "recomp")
      return [
        "維持或小赤字；以力量/次數微進步為主。",
        "訓練日碳水前置；休息日略降碳水。",
        "以『腰圍下降 + 力量持平/上升』為判準。",
      ];
    return ["維持 TDEE；追蹤表現、睡眠與壓力。", "每週 150–300 分鐘中強度活動。", "固定蛋白質，維持阻力訓練。"];
  }

  function buildPlan() {
    const training = buildSplit(Number(form.daysPerWeek));
    const tips = goalTips(form.goal);
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
      scale: window.devicePixelRatio > 1 ? 2 : 1.5,
      useCORS: true,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const who = (form.name || "user").replace(/\s+/g, "");
    const today = new Date().toISOString().slice(0, 10);
    a.href = dataUrl;
    a.download = `fitness_plan_${who}_${today}.png`;
    a.click();
  }

  const equipmentLabel = { bw: "徒手", db: "徒手＋啞鈴", gym: "健身房設備" }[form.equipmentLevel];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4">🏋️ 健身規劃 AI (MVP)</h1>

      {/* 表單 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-5xl">
        <Input label="暱稱" value={form.name} onChange={(v) => handleChange("name", v)} />
        <Select
          label="性別"
          value={form.sex}
          onChange={(v) => handleChange("sex", v)}
          options={[
            { value: "male", label: "男性" },
            { value: "female", label: "女性" },
          ]}
        />
        <Input label="年齡" type="number" value={form.age} onChange={(v) => handleChange("age", Number(v))} />
        <Input label="身高 (cm)" type="number" value={form.heightCm} onChange={(v) => handleChange("heightCm", Number(v))} />
        <Input label="體重 (kg)" type="number" value={form.weightKg} onChange={(v) => handleChange("weightKg", Number(v))} />
        <Input label="體脂 (%)" type="number" value={form.bodyFat} onChange={(v) => handleChange("bodyFat", Number(v))} />
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
            { value: "db", label: "徒手＋啞鈴（簡易）" },
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

      {/* 計算結果 + 產生按鈕 */}
      <div className="mt-6 bg-white shadow rounded-xl p-4 max-w-xl">
        <h2 className="font-semibold mb-2">📊 計算結果</h2>
        <p>BMI：{calc.bmi ? calc.bmi.toFixed(1) : "—"}</p>
        <p>BMR：{Math.round(calc.bmr)} kcal</p>
        <p>TDEE：{Math.round(calc.tdee)} kcal</p>
        <p>建議每日熱量：{Math.round(calc.kcal)} kcal</p>
        <p>蛋白質：{calc.proteinG} g，脂肪：{calc.fatG} g，碳水：{calc.carbsG} g</p>

        <div className="flex gap-2 mt-3">
          <button
            onClick={buildPlan}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            產生專屬方案
          </button>
          {plan && (
            <button
              onClick={savePlanAsImage}
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100"
            >
              下載圖片（PNG）
            </button>
          )}
        </div>
      </div>

      {/* 專屬方案輸出（這一塊會被轉成圖片） */}
      {plan && (
        <div
          ref={planRef}
          className="mt-6 grid md:grid-cols-2 gap-6 max-w-6xl bg-white p-4 rounded-2xl shadow"
        >
          <div className="text-sm text-gray-500 mb-2 md:col-span-2">
            建議產出：{new Date(plan.generatedAt).toLocaleString()} ｜ 器材：{equipmentLabel}
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-2">🍽️ 營養建議</h3>
            <p>每日熱量：<b>{plan.nutrition.calories}</b> kcal</p>
            <p>
              蛋白質：<b>{plan.nutrition.protein_g}</b> g、脂肪：<b>{plan.nutrition.fat_g}</b> g、碳水：<b>{plan.nutrition.carbs_g}</b> g
            </p>
            <h4 className="font-semibold mt-4 mb-1">💡 實用技巧</h4>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {plan.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-2">🏃 每週訓練表（{form.daysPerWeek} 天｜{equipmentLabel}）</h3>
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

          <div className="text-[10px] text-gray-400 md:col-span-2 text-right">
            © Fitness AI — 本工具提供一般性建議，非醫療診斷
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-6">
        ⚠️ 本工具提供一般性建議，非醫療診斷。如有健康問題請諮詢專業醫師。
      </p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
        type={type}
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
