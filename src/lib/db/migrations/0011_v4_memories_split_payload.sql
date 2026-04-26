-- v4.1 Phase B: memories.payload JSON 按 kind 拆列
-- 设计见 mylife/2-Projects/P101-hackon/20-v4-记忆闭环.md（v4.x 重构补丁）
--
-- expand 阶段：加新列 + 迁移老数据；旧 payload JSON 列保留作 fallback
--
-- 拆字段策略：
--   preference: { tags, confidence, taskId } → tags 已在 memory_tags 表（0009）；
--                                              confidence 在 memory_tags.weight；
--                                              只拆 task_id
--   inheritance: { fromPetId, fragmentText } → 2 列
--   event:       { event, meta }              → 1 列 + meta 仍 JSON（不定结构）
--   narrative:   { title, body, modelId, cause } → 4 列

-- preference
ALTER TABLE memories ADD COLUMN preference_task_id TEXT;
-- inheritance
ALTER TABLE memories ADD COLUMN inheritance_from_pet_id TEXT;
ALTER TABLE memories ADD COLUMN inheritance_fragment_text TEXT;
-- event
ALTER TABLE memories ADD COLUMN event_name TEXT;
ALTER TABLE memories ADD COLUMN event_meta TEXT;
-- narrative
ALTER TABLE memories ADD COLUMN narrative_title TEXT;
ALTER TABLE memories ADD COLUMN narrative_body TEXT;
ALTER TABLE memories ADD COLUMN narrative_model_id TEXT;
ALTER TABLE memories ADD COLUMN narrative_cause TEXT;

-- 迁移：preference
UPDATE memories
SET preference_task_id = json_extract(payload, '$.taskId')
WHERE kind = 'preference' AND json_valid(payload);

-- 迁移：inheritance
UPDATE memories
SET
  inheritance_from_pet_id = json_extract(payload, '$.fromPetId'),
  inheritance_fragment_text = json_extract(payload, '$.fragmentText')
WHERE kind = 'inheritance' AND json_valid(payload);

-- 迁移：event
UPDATE memories
SET
  event_name = json_extract(payload, '$.event'),
  -- meta 是 Record<string, unknown>，仍以 JSON 存（结构不固定）
  event_meta = CASE
    WHEN json_extract(payload, '$.meta') IS NOT NULL
      THEN json_extract(payload, '$.meta')
    ELSE NULL
  END
WHERE kind = 'event' AND json_valid(payload);

-- 迁移：narrative
UPDATE memories
SET
  narrative_title = json_extract(payload, '$.title'),
  narrative_body = json_extract(payload, '$.body'),
  narrative_model_id = json_extract(payload, '$.modelId'),
  narrative_cause = json_extract(payload, '$.cause')
WHERE kind = 'narrative' AND json_valid(payload);

-- 索引：narrative cause 用于墓碑分享卡按死因分组（暂未用，但 narrative 量小不影响）
CREATE INDEX idx_memories_narrative_cause ON memories(narrative_cause) WHERE narrative_cause IS NOT NULL;
