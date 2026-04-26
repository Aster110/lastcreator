-- v4.0: 展开 memories.payload.tags 到独立表
-- 治：
--   §8a #1（SQLite JSON 查询性能差，索引失效）
--   §8a #2 接缝留出（v4.2 加 tags normalizer）
--
-- 设计决策（详见 20-v4-记忆闭环.md §4）：
--   - compound PK (memory_id, tag) 天然唯一，省 id 列
--   - owner_id denormalize 加快聚合查询（不用 JOIN memories）
--   - backfill 老 memories(kind='preference').payload.tags

CREATE TABLE memory_tags (
  memory_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (memory_id, tag),
  FOREIGN KEY (memory_id) REFERENCES memories(id)
);

CREATE INDEX idx_memory_tags_owner_tag ON memory_tags(owner_id, tag);
CREATE INDEX idx_memory_tags_tag ON memory_tags(tag);

-- backfill：从老 memories.payload.tags 迁出（D1 SQLite json1 扩展支持）
-- 老数据规模小（个位数），一次性运行
INSERT OR IGNORE INTO memory_tags (memory_id, owner_id, tag, weight, created_at)
SELECT
  m.id AS memory_id,
  m.owner_id,
  je.value AS tag,
  COALESCE(json_extract(m.payload, '$.confidence'), 1.0) AS weight,
  m.created_at
FROM memories m, json_each(json_extract(m.payload, '$.tags')) je
WHERE m.kind = 'preference'
  AND json_valid(m.payload)
  AND json_extract(m.payload, '$.tags') IS NOT NULL;
