-- P101 lastcreator v3: 状态解耦 + 任务系统
-- 设计见 08-v3任务与状态架构.md §5

-- ========== 1. pets_state 副表：可变字段集中 ==========
CREATE TABLE pets_state (
  pet_id TEXT PRIMARY KEY,
  name TEXT,                             -- 可改名；null = 用 pets.name
  personality TEXT,                      -- 可改性格；null = 用 pets.personality
  hp INTEGER NOT NULL,
  exp INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT '幼年',
  status TEXT NOT NULL DEFAULT 'alive',  -- alive/released/dead
  mood TEXT,                             -- 情绪，v3 预留
  extra TEXT NOT NULL DEFAULT '{}',      -- JSON 扩展字段
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);
CREATE INDEX idx_pets_state_status ON pets_state(status);
CREATE INDEX idx_pets_state_updated ON pets_state(updated_at DESC);

-- ========== 2. 数据回填：现有 pets 生成对应 state ==========
INSERT INTO pets_state (pet_id, hp, exp, stage, status, updated_at)
SELECT id, hp, exp, stage, status, updated_at FROM pets;

-- ========== 3. tasks 表扩字段 ==========
ALTER TABLE tasks ADD COLUMN submitted_at INTEGER;
ALTER TABLE tasks ADD COLUMN verify_hint TEXT;
ALTER TABLE tasks ADD COLUMN ai_verdict TEXT;
