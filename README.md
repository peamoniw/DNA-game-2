# DNA Space Pair Game

เกมจับคู่เบส DNA แบบ static web game สร้างด้วย HTML, CSS และ JavaScript

## ไฟล์หลัก

- `index.html` หน้าเกม
- `style.css` รูปแบบและ layout
- `script.js` game logic และการควบคุม

## รันบนเครื่อง

ไม่ต้องติดตั้ง dependency เพิ่ม ใช้ Python เปิด static server ได้เลย:

```bash
python3 -m http.server 4173
```

จากนั้นเปิด <http://localhost:4173> ในเบราว์เซอร์

หรือใช้ Node.js:

```bash
npx serve .
```

## Deploy บน Vercel

โปรเจกต์นี้เป็น static site จึงไม่ต้องมี build command หรือ output directory พิเศษ

### วิธีที่ 1: Vercel CLI

ติดตั้ง CLI แบบ global หากยังไม่มี:

```bash
npm install --global vercel
```

ล็อกอิน:

```bash
vercel login
```

รันคำสั่งจากโฟลเดอร์โปรเจกต์นี้:

```bash
vercel
```

เมื่อต้องการ deploy production:

```bash
vercel --prod
```

ตอน Vercel ถามค่าตั้งค่า ให้เลือกดังนี้:

- Project directory: โฟลเดอร์ปัจจุบัน (`.`)
- Framework preset: `Other`
- Build command: เว้นว่าง
- Output directory: `.`
- Development command: เว้นว่าง

### วิธีที่ 2: Vercel Dashboard

1. Push โปรเจกต์ขึ้น GitHub, GitLab หรือ Bitbucket
2. เข้า [Vercel](https://vercel.com/) แล้วเลือก **Add New Project**
3. Import repository นี้
4. เลือก Framework Preset เป็น `Other`
5. เว้น Build Command ไว้
6. ตั้ง Output Directory เป็น `.` หรือเว้นไว้ตามค่าเริ่มต้น
7. กด **Deploy**

หลัง deploy เสร็จ Vercel จะสร้าง URL สำหรับเปิดเกมให้โดยอัตโนมัติ