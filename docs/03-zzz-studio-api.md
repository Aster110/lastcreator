# ZZZ Studio API 研究笔记

> 来源：逆向解析 zzz-mcp-studio-v0.2.2.zip 源码
> 更新：2026-04-23

## 基本信息

| 项 | 值 |
|---|---|
| Base URL | `https://imagestudio.riveroll.top` |
| Auth | `Authorization: Bearer <ACCESS_TOKEN>` |
| Token | 见 `02-环境变量.md` |
| Token 过期 | 2026-12-17（还有约 8 个月） |

---

## 模式一：图 + 提示词 生图（主要，涂鸦 → 宠物）

> 涂鸦 canvas 作为参考图，让 AI 按图意生成宠物图片

### 流程

```
涂鸦 base64
→ Step1: 上传为人物库 POST /api/test-field/person-library/create-from-folder
→ 拿到 library_id + person_id
→ Step2: 提交生图 POST /api/test-field/generate（带 person_ids）
→ Step3: 轮询任务 GET /api/tasks/{task_id}（status == "completed"）
→ Step4: 取结果 GET /api/test-field/{task_id}/results
→ 图片 URL
→ Step5: 清理临时库 DELETE /api/test-field/person-library/{library_id}
```

### Step1：上传图片为人物库

```
POST /api/test-field/person-library/create-from-folder
Content-Type: multipart/form-data

files: [图片文件]         # 一张或多张
library_name: "xxx"      # 可选

返回：
{
  "id": "library_id",
  "models": [{ "id": "person_id", ... }]
}
```

### Step2：提交生图任务

```
POST /api/test-field/generate
Content-Type: application/json

{
  "prompt": "...",
  "model_ids": ["gemini-2.5-flash-image"],
  "dimension_mode": "preset",
  "aspect_ratio": "1:1",        // 手机端推荐 9:16
  "person_ids": [
    { "library_id": "xxx", "model_id": "person_id" }
  ]
}

返回：{ "task_id": "xxx" }
```

### Step3：轮询任务状态

```
GET /api/tasks/{task_id}

返回：{ "task": { "status": "completed"|"failed"|"pending", ... } }
```

### Step4：取结果图片

```
GET /api/test-field/{task_id}/results

返回：{
  "images": [
    { "success": true, "image_url": "https://...", "model_id": "..." }
  ]
}
```

### Step5：清理临时人物库

```
DELETE /api/test-field/person-library/{library_id}
```

---

## 模式二：纯提示词 生图

```
POST /api/test-field/generate
{
  "prompt": "...",
  "model_ids": ["gemini-2.5-flash-image"],
  "dimension_mode": "preset",
  "aspect_ratio": "1:1"
}
→ task_id → 轮询 → 取结果（同上，跳过 Step1/Step5）
```

---

## 可用模型

```
GET /api/test-field/models
返回：{ "models": [{ "id": "gemini-2.5-flash-image", "name": "..." }] }
```

默认用 `gemini-2.5-flash-image`（Nano Banana）

---

## lastcreator 接入设计

### 生图 Pipeline（完整）

```
[前端] canvas.toDataURL()
→ [API Route /api/generate]
  1. Claude Vision 分析涂鸦 → 提取特征（颜色/形状/情绪）
  2. Claude LLM 生成宠物 JSON（名字/性格/技能/故事 + image prompt）
  3. zzz-studio 模式一：涂鸦图 + image_prompt → 生成宠物图片
→ [前端] 展示宠物卡片
```

### 注意事项

- canvas `toDataURL()` 是 base64，需转成 Blob/File 再 multipart 上传
- 手机端宜用 `9:16` 竖屏比例
- 每次生图后记得清理临时人物库（防止账号下积累太多垃圾库）
- 轮询间隔 3s，超时 60s，超时后返回 fallback 宠物
