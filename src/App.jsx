import React, { useMemo, useState } from "react";

export default function FitnessAIPlanner() {
  const [form, setForm] = useState({
    name: "",
    sex: "male",
    age: 30,
    heightCm: 170,
    weightKg: 68,
    bodyFat: 20,
    activity: "moderate",
    goal: "fat_loss",
    daysPerWeek: 4,
  });

  const activityFactor = (key) =>
    ({
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
    }[key] || 1.55);

  const calc = useMemo(() => {
    const h = form.heightCm;
    const w = form.weightKg;
    const a = form.age;

    const bmi = w / Math.pow(h / 100, 2);
    const bmr =
      form.sex === "female"
        ? 10 * w + 6.25 * h - 5 * a - 161
        : 10 * w + 6.25 * h - 5 * a + 5;
    const tdee = bmr * activityFactor(form.activity);

    let kcal = tdee;
    if (form.goal === "fat_loss") kcal = tdee * 0.85;
    if (form.goal === "muscle_gain") kcal = tdee * 1.1;

    const protein = Math.round(w * 1.8);
    const fat = Math.round((kcal * 0.3) / 9);
    const carbs = Math.max(0, Math.round((kcal - (protein * 4 + fat * 9)) / 4));

    return { bmi, bmr, tdee, kcal, protein, fat, carbs };
  }, [form]);

  function handleChange(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4">🏋️ 健身規劃 AI (MVP)</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl">
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
        <Input
          label="年齡"
          type="number"
          value={form.age}
          onChange={(v) => handleChange("age", Number(v))}
        />
        <Input
          label="身高 (cm)"
          type="number"
          value={form.heightCm}
          onChange={(v) => handleChange("heightCm", Number(v))}
        />
        <Input
          label="體重 (kg)"
          type="number"
          value={form.weightKg}
          onChange={(v) => handleChange("weightKg", Number(v))}
        />
        <Input
          label="體脂 (%)"
          type="number"
          value={form.bodyFat}
          onChange={(v) => handleChange("bodyFat", Number(v))}
        />
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
            { value: "maintenance", label: "維持" },
          ]}
        />
        <Input
          label={`每週訓練天數 (${form.daysPerWeek})`}
          type="range"
          min="2"
          max="7"
          value={form.daysPerWeek}
          onChange={(v) => handleChange("daysPerWeek", Number(v))}
        />
      </div>

      <div className="mt-6 bg-white shadow rounded-xl p-4 max-w-md">
        <h2 className="font-semibold mb-2">📊 計算結果</h2>
        <p>BMI：{calc.bmi.toFixed(1)}</p>
        <p>BMR：{Math.round(calc.bmr)} kcal</p>
        <p>TDEE：{Math.round(calc.tdee)} kcal</p>
        <p>建議每日熱量：{Math.round(calc.kcal)} kcal</p>
        <p>蛋白質：{calc.protein} g，脂肪：{calc.fat} g，碳水：{calc.carbs} g</p>
      </div>

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
