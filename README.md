<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=250&section=header&text=Whiz%20POS&fontSize=90&animation=twinkling&fontAlignY=38&desc=Next-Gen%20Cloud-Synced%20Point%20of%20Sale&descAlignY=51&descAlign=62" />

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=700&size=28&pause=1000&color=00D4FF&center=true&vCenter=true&width=800&lines=Modern+Omnichannel+POS;Seamless+Cloud-Sync+Architecture;Unbreakable+Offline-First+Design;Enterprise-Grade+Resilience" alt="Typing SVG" />
</a>

<p align="center">
  <a href="#-architecture">Architecture</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Quick Start</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active_Development-success?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge&logo=git&logoColor=white" />
  <a href="./COPYRIGHT.md"><img src="https://img.shields.io/badge/License-Proprietary_&_Confidential-red?style=for-the-badge&logo=lock" /></a>
</p>

</div>

---

## ⚡ Why Whiz POS?

Whiz POS is a high-performance, **enterprise-grade Point of Sale** ecosystem built to never go down. By leveraging a **local-first SQLite** database that automatically synchronizes with a **central PostgreSQL cloud cluster**, your cashiers can continue ringing up sales at lightspeed even if the internet goes completely offline.

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</div>

## 🚀 Key Features

### 🏢 **Centralized Cloud Management**
Manage hundreds of branches, inventory products, staff accounts, and configurations from a single, beautiful Webportal.

### 🔌 **Offline-First Resilience**
The Desktop POS terminal stores all immediate data in a hyper-fast SQLite database. Sales, transactions, and inventory operations happen instantly with zero network latency.

### 🔄 **Delta-Sync Engine**
Whiz POS features a custom-built Delta Pull & Push engine. 
- **Delta Pull (Every 10s):** The local terminal fetches globally updated products, users, and configurations.
- **Delta Push (Instant):** Transactions and held orders are immediately pushed to the cloud Webportal.

### 📦 **Intelligent Bulk Imports**
Hate manual data entry? The Webportal features a built-in `exceljs` engine that allows you to download dynamic Excel templates (complete with dropdown data validation) and instantly bulk-upload your products and stock reconciliations using relative delta algorithms to prevent race conditions!

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</div>

## 🛠️ The Tech Stack

We utilize the most bleeding-edge web technologies to ensure a snappy, premium experience.

<div align="center">

| **Core Concept** | **Technology** | **Purpose** |
|:---:|:---:|:---:|
| 💻 **Frontend Webportal** | ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E) | Lightning fast React UI |
| 🖥️ **Desktop POS** | ![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9) | Native hardware integrations |
| 🗄️ **Cloud Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white) | Relational Centralized Storage |
| ⚡ **Local POS Database** | ![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white) | Instant Offline Fallback |
| 🎨 **Styling** | ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) | Beautiful, dynamic, modern interfaces |

</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</div>

## ⚙️ Getting Started

### 1. Webportal Setup (The Cloud)
Start the central enterprise management dashboard:
```bash
cd webportal
npm install
npm run dev
```
*Note: Make sure your PostgreSQL database is running and `DATABASE_URL` is set in `.env`.*

### 2. POS Terminal Setup (The Outlet)
Start the local, offline-first register terminal:
```bash
cd local-server
npm install
npm start
```
*Note: The local server will auto-create the local SQLite `.db` on first launch.*

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" />
</div>

## ✨ Built for the Future
Whiz POS is actively maintained and continually improved. Future roadmap features include automatic KRA iTax ETIMS sandbox integrations, advanced telemetry, and enhanced multi-branch stock transfers.

<div align="center">
  <br>
  <i>Crafted with passion for high-performance retail.</i>
</div>
