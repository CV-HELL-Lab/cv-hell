# CV HELL — 技术文档

> 版本：基于 commit `990f79f`（2025年）  
> 定位：游戏化 AI 简历批评平台

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [目录结构](#3-目录结构)
4. [数据库设计](#4-数据库设计)
5. [后端详解](#5-后端详解)
6. [前端详解](#6-前端详解)
7. [LLM 集成](#7-llm-集成)
8. [安全与隐私](#8-安全与隐私)
9. [API 参考](#9-api-参考)
10. [环境变量](#10-环境变量)
11. [部署指南](#11-部署指南)
12. [游戏机制](#12-游戏机制)

---

## 1. 项目概述

CV HELL 是一个游戏化的简历反馈平台。用户上传简历（PDF/DOCX），由 AI "Boss" 角色以夸张、戏剧化的语气进行批评评估。游戏目标是不断改进简历，直到让 Boss 认可（approve）为止。

**核心游戏循环：**
```
用户上传简历 → Boss AI 评估 → 扣除积分 → 收到批评 → 修改简历 → 重复
                                                      ↓
                                              Boss 通过 → 赢得奖池
```

**技术栈总览：**

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| 后端 | FastAPI (Python 3.12+), SQLAlchemy ORM |
| 数据库 | PostgreSQL |
| AI | Qwen LLM API (阿里云 DashScope) / DeepSeek |
| 加密 | crypto-js (AES-256-CBC + PBKDF2-SHA256) |
| 部署 | nohup 进程管理，Next.js 静态构建 |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                             │
│                                                             │
│  Next.js 前端 (port 8765)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Pages: / /boss/:slug /battle/:id /profile /terms    │   │
│  │ Context: AuthContext LanguageContext                 │   │
│  │ Vault: crypto-js AES-256 (密钥永不离开浏览器)         │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │ /api/* (相对路径)                      │
└─────────────────────┼───────────────────────────────────────┘
                      │ Next.js rewrites 代理
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI 后端 (port 9876)                                   │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ /auth/*  │ │ /game/*  │ │ /admin/* │                   │
│  └──────────┘ └────┬─────┘ └──────────┘                   │
│                    │                                        │
│  ┌─────────────────▼────────────────┐                      │
│  │      submission_service.py       │                      │
│  │  validate → LLM → deduct → save  │                      │
│  └─────────────────┬────────────────┘                      │
│                    │                                        │
│  ┌─────────────────▼────────────────┐                      │
│  │        llm/evaluator.py          │                      │
│  │   prompt_builder → Qwen API      │                      │
│  └──────────────────────────────────┘                      │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │ psycopg3 / SQLAlchemy
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                 │
│  users / bosses / submissions / boss_responses / ...        │
└─────────────────────────────────────────────────────────────┘
                   │ OpenAI-compatible API
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Qwen LLM API (阿里云 DashScope)                             │
│  model: qwen3.6-plus / qwen-vl-plus (vision)               │
└─────────────────────────────────────────────────────────────┘
```

### 前后端通信

前端所有 API 请求使用**相对路径** `/api/*`，由 Next.js 服务器通过 `next.config.ts` 中的 `rewrites` 规则代理到后端。这解决了：

- 跨域（CORS）问题
- 内网穿透/公网访问时 IP 不匹配问题
- 前端构建时无需硬编码后端地址

```typescript
// next.config.ts
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:9090";
rewrites: [{ source: "/api/:path*", destination: `${BACKEND_URL}/:path*` }]
```

---

## 3. 目录结构

```
cv-hell/
├── backend/
│   ├── api/
│   │   ├── auth.py          # 注册/登录/JWT
│   │   ├── game.py          # 核心游戏 API
│   │   ├── admin.py         # 管理后台 API
│   │   └── deps.py          # 依赖注入（get_current_user）
│   ├── boss_configs/        # Boss 人格配置 JSON
│   │   ├── layout_tyrant.json
│   │   ├── bullet_butcher.json
│   │   ├── cold_recruiter.json
│   │   ├── scan_reaper.json
│   │   └── structure_sniper.json
│   ├── core/
│   │   ├── config.py        # 环境变量 (pydantic-settings)
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   └── security.py      # JWT 工具函数
│   ├── llm/
│   │   ├── client.py        # LLM 客户端（从 DB 读取配置）
│   │   ├── evaluator.py     # 调用 LLM + 解析响应
│   │   └── prompt_builder.py # 构建系统提示词和用户消息
│   ├── models/              # SQLAlchemy ORM 模型
│   │   ├── user.py
│   │   ├── boss.py
│   │   ├── submission.py
│   │   ├── boss_response.py
│   │   ├── boss_defeat.py
│   │   ├── prize_pool.py
│   │   ├── point_transaction.py
│   │   ├── llm_config.py
│   │   └── reference_pool.py
│   ├── parsers/
│   │   └── resume_parser.py # PDF/DOCX 解析 + 图片转换
│   ├── services/
│   │   ├── auth_service.py  # 注册/登录业务逻辑
│   │   └── submission_service.py # 完整提交评估流程
│   ├── main.py              # FastAPI 应用入口
│   ├── seed.py              # 初始化 Boss 数据
│   ├── seed_reference_pool.py # 初始化参考样本数据
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx   # 根布局（NavBar, Modal, Providers）
│   │   │   ├── page.tsx     # 主页
│   │   │   ├── boss/[slug]/ # Boss 详情页（上传简历）
│   │   │   ├── battle/[submissionId]/ # 战斗页（评估 + 结果）
│   │   │   ├── profile/     # 用户主页（统计/历史/设置）
│   │   │   ├── progress/    # 世界进度页
│   │   │   ├── leaderboard/ # 排行榜
│   │   │   ├── victory/     # 通关页
│   │   │   ├── terms/       # 服务条款/隐私政策
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── admin/       # 管理后台
│   │   ├── components/
│   │   │   ├── NavBar.tsx
│   │   │   └── DisclaimerModal.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx    # 用户认证状态
│   │   │   └── LanguageContext.tsx # 国际化（zh/en）
│   │   └── lib/
│   │       ├── api.ts       # axios 实例（拦截器/baseURL）
│   │       ├── dictionary.ts # 翻译字典
│   │       └── vault.ts     # CV 保险库加密库
│   ├── next.config.ts       # 代理 rewrites 配置
│   └── package.json
│
├── setup.sh                 # 一键安装脚本
├── DEPLOY.md               # 部署指南
└── TECHNICAL.md            # 本文档
```

---

## 4. 数据库设计

### 表关系

```
users ──────────────────────────────────────────────┐
  │                                                  │
  ├── submissions ──── boss_responses               │
  │       │                                          │
  ├── point_transactions                            │
  │                                                  │
  └── boss_defeats ◄── bosses ──── prize_pools      │
                          │                          │
                          └── submissions ───────────┘

reference_pool  (独立：Boss 评估参考样本)
llm_configs     (独立：LLM API 配置)
```

### 表定义

**users**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| email | String UNIQUE | |
| password_hash | String | bcrypt |
| display_name | String | |
| points | Integer | 默认 100 |
| created_at | DateTime | |

**bosses**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | String | 显示名称 |
| slug | String UNIQUE | URL 标识符 |
| order_index | Integer | 通关顺序 |
| status | String | locked/unlocked/current/defeated |
| specialty | String | Boss 专攻领域描述 |
| rudeness_level | Integer | 1/2/3，控制语言粗暴程度 |

**submissions**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | |
| boss_id | UUID FK | |
| version_number | Integer | 同用户同 Boss 的第 N 次提交 |
| source_type | String | pdf/docx/text |
| original_file_path | String NULL | 上传后立即删除，置 NULL |
| extracted_text | Text NULL | 明文或 AES 密文（见 is_cv_encrypted）|
| is_cv_encrypted | Boolean | True = extracted_text 是密文 |
| image_paths | Text | JSON 数组，LLM 调用后删除并清空 |
| created_at | DateTime | |

**boss_responses**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| submission_id | UUID FK UNIQUE | 1:1 with submission |
| roast_opening | Text | Boss 开场攻击 |
| why_it_fails | Text | 核心失败原因 |
| top_issues_json | Text | JSON 数组，3 个具体问题 |
| fix_direction | Text | 修改建议方向 |
| mood | String | 心情标签 |
| mood_level | Integer | 1-6 |
| approved | Boolean | 是否通过 |
| approved_phrase | String NULL | 通过时的标志性台词 |
| raw_llm_response | Text | LLM 原始 JSON 响应 |

**prize_pools**

| 字段 | 类型 | 说明 |
|------|------|------|
| boss_id | UUID FK UNIQUE | |
| total_points | Integer | 累计奖池积分 |

**point_transactions**

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | UUID FK | |
| amount | Integer | 正=收入，负=支出 |
| type | String | submission_fee/prize_won/refund |
| boss_id | UUID FK NULL | |
| submission_id | UUID FK NULL | |

**boss_defeats**

| 字段 | 类型 | 说明 |
|------|------|------|
| boss_id | UUID FK UNIQUE | 每个 Boss 只有一个首杀 |
| user_id | UUID FK | |
| submission_id | UUID FK | 通关的那次提交 |
| defeated_at | DateTime | |
| prize_awarded | Integer | 获得的积分 |

**llm_configs**

| 字段 | 类型 | 说明 |
|------|------|------|
| provider | String | qwen/deepseek/openai |
| api_key | String | |
| base_url | String | API 端点 |
| model | String | 模型名称 |
| is_active | Boolean | 只有一个可同时激活 |

**reference_pool**

| 字段 | 类型 | 说明 |
|------|------|------|
| type | String | excellent/bad/mid/victory_descriptor |
| boss_scope | String | global 或 boss slug |
| content | Text | 参考内容文本 |

---

## 5. 后端详解

### 5.1 提交评估流程

这是系统最核心的逻辑，在 `services/submission_service.py` 的 `submit_for_evaluation()` 中：

```
Step 1: 验证用户积分是否足够（不扣分）
         ↓
Step 2: 调用 LLM（此时不做任何 DB 写入）
         ↓ 成功
Step 3: 原子性提交：
         - 扣除用户积分
         - 增加奖池积分
         - 写入 point_transaction 记录
         - 写入 boss_response 记录
         - 清空 image_paths，置 original_file_path = NULL
         ↓
Step 4: 如果 approved=true，触发首杀结算
         - 检查是否有已有 boss_defeat 记录
         - 无则创建，转移奖池到用户
         - 解锁下一个 Boss
         ↓
Step 5: 返回评估结果（包含 extracted_text_for_encryption 供前端加密）
```

**设计原则：LLM 先调，数据后写**

如果 LLM 调用失败，用户积分不被扣除。这避免了"扣了钱但没有结果"的情况。

### 5.2 文件处理流程

```python
# 上传时
file → 保存到 uploads/uuid.pdf
     → parse_resume() 提取文本和图片
     → 删除原始文件（立即）
     → 图片路径存入 submission.image_paths

# 评估时  
image_paths → images_to_base64() → 发给 LLM
            → 删除所有图片文件（LLM 调用后立即，finally 块中）
            → 清空 image_paths = "[]"
            → 置 original_file_path = NULL
```

### 5.3 Boss 配置系统

每个 Boss 是一个 JSON 文件，定义其人格和行为：

```json
{
  "slug": "layout-tyrant",
  "name": "The Layout Tyrant",
  "specialty": "Visual chaos — margins, alignment, whitespace",
  "obsession": "visual disorder",
  "personality": "Authoritarian, short-tempered...",
  "signature_attacks": ["Calls out uneven margins...", ...],
  "approved_phrase": "Fine. The layout stopped offending me."
}
```

`rudeness_level`（1-3）由数据库控制，不在 JSON 中。粗鲁等级影响语气：
- 1: 严苛专业但克制
- 2: 粗鲁直接
- 3: 粗俗无过滤

### 5.4 LLM 提示词架构

`prompt_builder.py` 构建两部分：

**系统提示词（System Prompt）包含：**
- 当前日期（避免 AI 误判简历时间线）
- 语言指令（zh/en，控制回复语言）
- Boss 人格定义（obsession, personality, signature_attacks）
- 粗鲁等级语气指令
- 优秀简历参考样本（来自 reference_pool）
- 通过标准（VICTORY_CRITERIA，极高门槛）
- 心情等级说明
- 严格的 JSON 输出格式

**用户消息（User Message）包含：**
- 历史提交摘要（最多 3 条，让 Boss 更严厉地对待反复提交）
- 简历页面图片（base64，vision 模型用）
- 提取的纯文本（结构分析用）

**LLM 响应 JSON 结构：**
```json
{
  "roast_opening": "string",
  "why_it_fails": "string",
  "top_issues": ["string", "string", "string"],
  "fix_direction": "string",
  "mood": "Disgusted | Still Terrible | ...",
  "mood_level": 1-6,
  "approved": false,
  "approved_phrase": null
}
```

### 5.5 认证系统

- 使用 JWT（python-jose），有效期 7 天（可配置）
- 密码使用 bcrypt 哈希（passlib）
- 管理员账户独立于普通用户系统，使用单独的 `ADMIN_SECRET_KEY`
- `api/deps.py` 提供 `get_current_user` 依赖注入

### 5.6 数据库迁移策略

项目使用 `Base.metadata.create_all()` 自动建表，增量字段通过 `main.py` 启动时执行原生 SQL 添加：

```python
conn.execute(text(
    "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_cv_encrypted BOOLEAN NOT NULL DEFAULT FALSE"
))
```

---

## 6. 前端详解

### 6.1 状态管理

**AuthContext** (`context/AuthContext.tsx`)
- 从 localStorage 读取 JWT token 和用户信息
- 提供 `user`, `login()`, `logout()`, `updatePoints()`
- axios 拦截器自动在请求头附加 Bearer token

**LanguageContext** (`context/LanguageContext.tsx`)
- 支持 zh/en 两种语言
- 语言偏好存储在 localStorage
- 提供 `lang`, `setLang()`, `t(section, key)` 函数
- Boss 回复语言跟随用户设置（通过 API 请求体的 `language` 字段传给后端）

### 6.2 页面路由

| 路由 | 功能 |
|------|------|
| `/` | 主页，显示当前 Boss 和奖池 |
| `/boss/:slug` | Boss 详情，简历上传入口 |
| `/battle/:submissionId` | 战斗页，触发评估并显示结果 |
| `/profile` | 用户主页：统计、历史记录、保险库、语言设置 |
| `/progress` | 世界进度，所有 Boss 时间线 |
| `/leaderboard` | 排行榜（首杀/最快/最少次数） |
| `/victory` | 通关页（从 sessionStorage 读取战绩数据） |
| `/terms` | 服务条款与隐私政策 |
| `/admin/*` | 管理后台 |

### 6.3 上传与评估流程

```
1. /boss/:slug 页面
   用户选择文件（PDF/DOCX）
   → POST /api/upload（multipart）
   → 返回 submission_id + 文本预览
   → 跳转 /battle/:submissionId

2. /battle/:submissionId 页面
   加载时自动调用 triggerEvaluation()
   → POST /api/submit/:bossId { submission_id, language }
   → 等待 LLM 响应（Loading 动画）
   → 如果 vault 已解锁：加密提取文本 → PATCH /api/submission/:id/store-encrypted
   → 显示 Boss 评估结果
   → 如果 approved：跳转 /victory
```

### 6.4 国际化

翻译字典位于 `src/lib/dictionary.ts`，结构为：
```typescript
dict.en.section.key = "English text"
dict.zh.section.key = "中文文本"
```

使用 `t("section", "key")` 调用，支持参数插值（如 `{level}`）。

---

## 7. LLM 集成

### 7.1 支持的 Provider

| Provider | Base URL | 默认模型 |
|----------|----------|---------|
| qwen（默认）| `https://dashscope.aliyuncs.com/compatible-mode/v1` | qwen3.6-plus |
| deepseek | `https://api.deepseek.com` | deepseek-chat |

使用 OpenAI Python SDK 兼容接口，所有 Provider 均通过相同代码调用。

### 7.2 Vision 支持

当简历为 PDF/DOCX 时，系统将每页转换为 PNG（最多 3 页，DPI 150），以 base64 格式附加到 LLM 消息中。这让 LLM 能看到简历的视觉排版，而不仅仅是提取的文字。

### 7.3 LLM 配置热切换

LLM 配置（API key、模型、Provider）存储在数据库，每次调用时从 DB 实时读取，管理员修改后无需重启后端即可生效。

### 7.4 通过标准设计

Boss 的通过标准被刻意设置为极高门槛（`VICTORY_CRITERIA`），包括：
- 像素级完美排版
- 水晶清晰的层级结构
- 每个 bullet point 都以动词开头且有量化数据
- 毫无可批评之处
- 通过时 Boss 需要表达"纯粹的厌恶"

---

## 8. 安全与隐私

### 8.1 CV 保险库（客户端加密）

**密钥派生：**
```
password + userId → PBKDF2-SHA256（100,000 轮）→ 256-bit AES 密钥
```

**加密方案：**
```
明文 → AES-256-CBC（随机 IV）→ base64 密文
密文格式：base64(ivHex + ":" + aes_ciphertext)
```

**密钥存储：**
- 密钥的 hex 表示存储在 `sessionStorage`（标签页关闭即清除）
- 密钥**从不**发送到服务器
- 验证器（加密已知字符串）存储在 `localStorage`，用于验证密码正确性

**数据流：**
```
登录/注册 → deriveKey(password, userId) → saveKeyToSession(key)
                                         → 写入 localStorage 验证器（首次）

评估完成 → 服务器返回 extracted_text_for_encryption
         → loadKeyFromSession()
         → encryptText(plaintext, key)
         → PATCH /submission/:id/store-encrypted { ciphertext }
         → 服务器存储密文，is_cv_encrypted = true

浏览历史 → 服务器返回 extracted_text_encrypted
         → loadKeyFromSession()
         → decryptText(ciphertext, key)
         → 显示明文
```

### 8.2 数据保留政策

| 数据类型 | 保留时长 |
|---------|---------|
| 原始 PDF/DOCX 文件 | 解析后立即删除 |
| PNG 页面图片 | LLM 调用后立即删除（finally 块）|
| 提取的文字 | 永久存储（可加密）|
| Boss 回复 | 永久存储（明文）|
| 用户账户数据 | 永久存储 |

### 8.3 隐私边界

- **服务器完全看不到**：数据库中的加密密文
- **服务器短暂看到**：LLM 评估时内存中的明文（不记录日志）
- **第三方 Qwen API 看到**：每次评估时的明文文字和图片
- **其他用户完全看不到**：一切

### 8.4 认证安全

- JWT 签名密钥：`JWT_SECRET_KEY`（需保密）
- 管理员 API 使用独立的 `ADMIN_SECRET_KEY`
- 密码存储：bcrypt（自适应哈希，天然防暴力破解）
- Token 有效期：7 天（可配置）

---

## 9. API 参考

所有 API 均通过前端代理，实际访问路径为 `/api/*`。

### 认证

```
POST /auth/register
Body: { email, password, display_name }
返回: { token, user_id, display_name, points }

POST /auth/login
Body: { email, password }
返回: { token, user_id, display_name }
```

### 游戏

```
GET  /me                          # 当前用户信息
GET  /me/history                  # 提交历史 + 统计数据

GET  /boss/current                # 当前活跃 Boss 信息
GET  /bosses/progress             # 所有 Boss 状态列表
GET  /leaderboard?type=...        # 排行榜（first_defeaters/fastest_clears/fewest_attempts）

POST /upload                      # 上传简历文件
  multipart: file, source_type(pdf/docx/text), text_content(text模式)
  返回: { submission_id, version_number, extracted_text_preview }

POST /submit/:boss_id             # 触发 Boss 评估
  Body: { submission_id, language(en/zh) }
  返回: { roast_opening, why_it_fails, top_issues, fix_direction,
          mood, mood_level, approved, approved_phrase,
          world_first, points_deducted, points_remaining, prize_pool,
          extracted_text_for_encryption }

GET  /submission/:id              # 单条提交详情
PATCH /submission/:id/store-encrypted  # 存储加密密文
  Body: { ciphertext }

GET  /submissions/:user_id        # 用户当前 Boss 的所有提交
```

### 管理后台

```
POST /admin/login
GET  /admin/users
GET  /admin/bosses
POST /admin/bosses/:slug/advance  # 推进 Boss 状态
GET  /admin/submissions
GET  /admin/llm-configs
POST /admin/llm-configs
PATCH /admin/llm-configs/:id/activate
```

---

## 10. 环境变量

文件位置：`backend/.env`

```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/cvhell

# JWT（必须保密）
JWT_SECRET_KEY=随机字符串，至少 32 位
JWT_EXPIRE_DAYS=7

# 管理员
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=bcrypt哈希  # python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('your-password'))"
ADMIN_SECRET_KEY=随机字符串

# 游戏参数
SUBMISSION_COST=10      # 每次提交消耗的积分
INITIAL_POINTS=100      # 新用户初始积分

# 文件
FILE_UPLOAD_MAX_BYTES=5242880   # 5MB
FILE_STORAGE_PATH=./uploads
ALLOWED_FILE_TYPES=pdf,docx

# LLM（在管理后台配置，此处无需设置）
MAX_REFERENCE_ITEMS=3   # 注入提示词的参考样本数量
MAX_PRIOR_VERSIONS=3    # 历史版本数量（给 LLM 上下文用）
```

---

## 11. 部署指南

### 11.1 一键安装（推荐）

```bash
git clone https://github.com/CV-HELL-Lab/cv-hell.git ~/Desktop/cv-hell
cd ~/Desktop/cv-hell
bash setup.sh
```

`setup.sh` 自动完成：
1. 检测操作系统（macOS / Ubuntu / Debian / Raspberry Pi）
2. 安装系统依赖（Node.js, PostgreSQL, Python3 等）
3. 创建/配置 PostgreSQL 数据库
4. 安装 Python 依赖（venv）
5. 生成 `backend/.env`
6. 初始化 Boss 数据（seed.py）
7. 安装 Node.js 依赖
8. 构建前端（生产模式）
9. 生成 `start.sh` 管理脚本

### 11.2 服务管理

```bash
./start.sh start    # 启动
./start.sh stop     # 停止
./start.sh restart  # 重启
./start.sh status   # 查看状态
./start.sh update   # 拉取最新代码 + 重建 + 重启
```

服务以 `nohup` 在后台运行，关闭终端不会停止。

日志文件：
- `logs/backend.log`
- `logs/frontend.log`

### 11.3 更新部署

```bash
cd ~/Desktop/cv-hell && ./start.sh update
```

如果新版本包含 npm 新依赖：

```bash
cd ~/Desktop/cv-hell
git pull
cd frontend && npm install && rm -rf .next && BACKEND_URL=http://127.0.0.1:9876 npm run build && cd ..
./start.sh restart
```

### 11.4 端口说明

| 服务 | 默认端口 |
|------|---------|
| 前端（Next.js） | 8765 |
| 后端（FastAPI） | 9876 |

### 11.5 Raspberry Pi 特殊注意事项

- 使用 `psycopg[binary]>=3.1`（不是 psycopg2，后者在 Python 3.13 ARM 上编译失败）
- 数据库 URL 使用 `postgresql+psycopg://` 方言前缀
- 前端构建时间较长（约 5-10 分钟）
- `setup.sh` 会自动禁用 piwheels.org 以避免超时

---

## 12. 游戏机制

### 12.1 积分系统

- 新用户获得 100 积分
- 每次提交消耗 10 积分（可配置）
- 所有提交费用累积进奖池
- 首位通关的用户获得全部奖池积分
- 积分不足无法提交（提前验证，不会扣分）

### 12.2 Boss 状态机

```
locked → unlocked → current → defeated
  ↑           ↑         ↑
初始状态   前一Boss   管理员激活
          被击败      或自动推进
```

同一时间只有一个 Boss 处于 `current` 状态。

### 12.3 首杀机制

Boss 被首次击败后：
- 创建 `boss_defeat` 记录
- 奖池积分转移给击败者
- 奖池置零
- 下一个 Boss 状态从 `locked` 变为 `unlocked`（需管理员手动设为 `current`）

### 12.4 心情系统

LLM 回复包含心情等级（1-6）：

| 等级 | 标签 |
|------|------|
| 1 | Disgusted / 厌恶 |
| 2 | Still Terrible / 依然糟糕 |
| 3 | Slightly Less Embarrassing / 稍微不那么丢人 |
| 4 | Annoyingly Improved / 令人恼火地进步了 |
| 5 | Reluctantly Considering / 勉强考虑中 |
| 6 | Fine. You Win. / 好吧，你赢了 |

只有等级 6 且 `approved=true` 才算通关。心情等级基于简历质量，不受提交次数影响。

### 12.5 参考池系统

`reference_pool` 表存储评估时注入提示词的参考材料：

- `excellent`：优秀简历示例（告诉 LLM 什么是好的）
- `bad`：糟糕示例（早期提交时注入，拉低比较基线）
- `mid`：中等示例（中期提交时注入）
- `victory_descriptor`：通过条件描述（替代默认 VICTORY_CRITERIA）
- `boss_scope`：`global` 或特定 Boss slug

---

*文档由 CV HELL 开发团队维护。如有疑问请提 issue 或联系管理员。*
