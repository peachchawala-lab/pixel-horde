# 🎮 Pixel Horde — 2D Action Roguelite Web Game

> **High-Performance 2D Dark Fantasy Survival Game built with TypeScript & Phaser 3**  
> 🌐 **Live Demo:** [Click here to Play](https://github.com/peachchawala-lab/pixel-horde) | 🎓 **Project for:** TCAS Portfolio (DST MU)

---

## 🌟 Overview 
**Pixel Horde** เป็นเว็บแอปพลิเคชันเกมแนว 2D Action Roguelite พัฒนาด้วยภาษา **TypeScript** และเอนจิน **Phaser 3** ออกแบบโดยเน้น **Software Architecture**, **Memory Optimization (60 FPS)**, และ **Mathematical Calculations in Computing**

---

## 🛠️ Key Technical Highlights 

* **🧩 Component-Based Entity System:** แยกโมดูลตัวละคร ศัตรู เลือด (`HealthComponent`) และระบบ EXP (`ExperienceComponent`) เพื่อให้โค้ดเป็นระเบียบและ Scale ง่าย
* **⚡ Object Pooling Architecture:** ใช้ระบบ Recycle กระสุน (Projectiles) และมอนสเตอร์ ลดปัญหา Garbage Collection ทำให้เกมรันได้ 60 FPS นิ่งๆ 
* **🧠 Multi-Phase Boss AI (Finite State Machine):** บอส *The Necromancer* มีระบบตัดสินใจ 3 เฟส พร้อมการโจมตีแบบ Telegraph, Curse Wall, และ Ring Explosion
* **🎨 Dynamic Arena Rendering:** เรนเดอร์ลานประลอง *The Necromantic Sanctum* ด้วย Phaser Graphics API พร้อมระบบ Depth Hierarchy Layering
* **⚔️ Active Ability Hotbar:** ระบบสกิลกดใช้ (Q, E, R) พร้อม Visual & Audio Feedback, Cooldown Sweeps และ Particle Effects

---

## 💻 Tech Stack
* **Language:** TypeScript
* **Engine:** Phaser 3 (HTML5 Canvas & WebGL)
* **Build Tool:** Vite
* **Architecture:** Component-Based Design, Finite State Machine, Object Pooling
