# JZ9 AI Suite 🚀

เครื่องมือ AI 3 ตัวในหน้าเดียว — Visual DNA Extractor · Prompt Editor · Graphic Engine

**Stack:** HTML · Vanilla JS · Vercel Serverless · Gemini 2.0 Flash · Imagen 3/4

---

## 🛠 โครงสร้างโปรเจกต์

```
jz9-ai-suite/
├── public/
│   └── index.html       ← Frontend ทั้งหมด (3 เครื่องมือ)
├── api/
│   └── proxy.js         ← Vercel Serverless — ซ่อน API Key
├── vercel.json          ← Vercel config
└── README.md
```

---

## 🔑 ทำไมต้องมี `api/proxy.js`?

| วิธี | API Key | ความปลอดภัย |
|------|---------|-------------|
| เรียก Gemini ตรงจาก Browser | เปิดเผยใน JS | ❌ ถูกขโมยได้ |
| ผ่าน `/api/proxy` (Vercel) | อยู่ใน Server env | ✅ ปลอดภัย |

---

## 📋 ขั้นตอน Deploy (ครั้งแรก ~10 นาที)

### ขั้นที่ 1 — สร้าง GitHub Repository

1. ไปที่ [github.com/new](https://github.com/new)
2. ตั้งชื่อ repo: `jz9-ai-suite`
3. เลือก **Private** (แนะนำ)
4. กด **Create repository**

### ขั้นที่ 2 — อัปโหลดไฟล์ขึ้น GitHub

```bash
# Clone repo ที่เพิ่งสร้าง
git clone https://github.com/YOUR_USERNAME/jz9-ai-suite.git
cd jz9-ai-suite

# คัดลอกไฟล์จากโปรเจกต์นี้ทั้งหมดลงโฟลเดอร์
# แล้ว push ขึ้น
git add .
git commit -m "feat: initial JZ9 AI Suite"
git push origin main
```

### ขั้นที่ 3 — Connect Vercel กับ GitHub

1. ไปที่ [vercel.com](https://vercel.com) → สมัคร/Login
2. กด **"Add New Project"**
3. เลือก **"Import Git Repository"**
4. เลือก repo `jz9-ai-suite`
5. กด **"Deploy"** (ยังไม่ต้องแก้อะไร)

### ขั้นที่ 4 — ตั้งค่า Environment Variable ⚠️ สำคัญมาก

1. ใน Vercel Dashboard → เลือกโปรเจกต์ `jz9-ai-suite`
2. ไปที่ **Settings → Environment Variables**
3. กด **"Add New"**
4. ใส่:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `AIzaSy...` (API Key จาก Google AI Studio)
   - **Environments:** เลือก ✅ Production ✅ Preview ✅ Development
5. กด **"Save"**

### ขั้นที่ 5 — Redeploy

หลังจากเพิ่ม env var แล้ว ต้อง redeploy:
1. ไปที่ **Deployments** tab
2. กด **"..."** ที่ deployment ล่าสุด
3. เลือก **"Redeploy"**

✅ เว็บจะขึ้นที่ `https://jz9-ai-suite.vercel.app`

---

## 🔄 อัปเดตโค้ด (ครั้งต่อไป)

```bash
# แก้ไขไฟล์ แล้ว push
git add .
git commit -m "update: ..."
git push origin main
# Vercel จะ deploy อัตโนมัติ ✨
```

---

## 🔐 รับ Gemini API Key

1. ไปที่ [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. กด **"Create API Key"**
3. Copy key → วางใน Vercel Environment Variable

---

## ⚡ เครื่องมือ 3 ตัว

| # | ชื่อ | Model | หน้าที่ |
|---|------|-------|---------|
| 01 | 🧬 Visual DNA Extractor | Gemini 2.5 Flash + Imagen 4 | สกัดสไตล์จากภาพ |
| 02 | ⌨️ Prompt Editor | Gemini 2.0 Flash | แก้ไข JSON Prompt ภาษาไทย |
| 03 | 🎨 Graphic Engine | Gemini 2.0 Flash + Imagen 3 | สร้างภาพโฆษณา |

---

## 🐛 Troubleshooting

| ปัญหา | สาเหตุ | แก้ไข |
|-------|--------|-------|
| `GEMINI_API_KEY not configured` | ลืมเพิ่ม env var | ทำขั้นที่ 4 ใหม่ + Redeploy |
| `Model not allowed` | model name ผิด | ตรวจ `api/proxy.js` ALLOWED_MODELS |
| ภาพไม่ขึ้น | Imagen ยังอยู่ใน waitlist | ไปที่ [makersuite.google.com](https://makersuite.google.com) เพื่อ request access |
| 500 error | API Key หมดอายุหรือ quota | ตรวจสอบที่ Google AI Studio |
