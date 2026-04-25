-- v3.9.2 (Phase C): 记忆系统骨架
--
-- 注意：memories 表在 0001_init 时已占位（schema: content/kind 取值=birth/level_up/...），
-- 但 v3.0 至 v3.8 期间从未真实 INSERT 过任何记录（subscribers/task-reward 只 console.log 占位）。
-- v3.9 重新设计 schema（payload + source + source_ref + 新 kind 取值），DROP 旧表 + CREATE 新表。
--
-- v1：仅做数据收集（preference 类）+ 留接口
-- v2：闭环（aggregator → 喂回 assigner 个性化派单）
--
-- payload JSON shape per kind（应用层约束，DB 不强制）：
--   preference: { tags: string[]; confidence: number; taskId?: string }
--   inheritance: { fromPetId: string; fragmentText: string }
--   event: { event: 'born'|'died'|'released'|'task_passed'; meta?: object }
--   narrative: { title: string; body: string; modelId: string; cause: 'died'|'released' }

DROP TABLE IF EXISTS memories;

CREATE TABLE memories (
  id TEXT PRIMARY KEY,                 -- 'm_' + nanoid(10)
  pet_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,              -- 跨宠物聚合用（继承场景）
  kind TEXT NOT NULL,                  -- 'preference' | 'inheritance' | 'event' | 'narrative'
  source TEXT,                         -- 'task' | 'death' | 'manual' | NULL
  source_ref TEXT,                     -- task.id / pet.id 等
  payload TEXT NOT NULL,               -- JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);
CREATE INDEX idx_memories_owner_kind ON memories(owner_id, kind);
CREATE INDEX idx_memories_pet ON memories(pet_id);
