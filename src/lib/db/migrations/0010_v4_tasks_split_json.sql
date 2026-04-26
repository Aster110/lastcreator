-- v4.1 Phase A: tasks.reward / ai_verdict JSON 拆列
-- 设计见 mylife/2-Projects/P101-hackon/20-v4-记忆闭环.md（v4.x 重构补丁）
--
-- expand 阶段：加新列 + 迁移老数据；旧 reward / ai_verdict JSON 列保留作 fallback
-- contract 阶段（未来 0012+）：观察稳定后 DROP 旧列
--
-- 拆字段策略（grep 验证后）：
--   reward.minutes → reward_minutes INTEGER
--   reward.exp     → reward_exp INTEGER
--   reward.unlockSkill → reward_unlock_skill INTEGER (0/1)
--   reward.hp     → 不拆（@deprecated 字段，v3.2 起未用）
--   reward.mood   → 不拆（dead）
--   verdict.pass  → verdict_pass INTEGER (0/1)
--   verdict.completion → verdict_completion REAL
--   verdict.reason → verdict_reason TEXT
--   verdict.confidence → 不拆（grep 显示只 set 不 read，dead）
--   verdict.rawResponse → 不拆（debug only，dead）

ALTER TABLE tasks ADD COLUMN reward_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN reward_exp INTEGER;
ALTER TABLE tasks ADD COLUMN reward_unlock_skill INTEGER;
ALTER TABLE tasks ADD COLUMN verdict_pass INTEGER;
ALTER TABLE tasks ADD COLUMN verdict_completion REAL;
ALTER TABLE tasks ADD COLUMN verdict_reason TEXT;

-- 迁移 reward 老数据（json_extract 返回 NULL 对缺字段）
UPDATE tasks
SET
  reward_minutes = json_extract(reward, '$.minutes'),
  reward_exp = json_extract(reward, '$.exp'),
  reward_unlock_skill = CASE
    WHEN json_extract(reward, '$.unlockSkill') = 1 THEN 1
    WHEN json_extract(reward, '$.unlockSkill') = 'true' THEN 1
    ELSE 0
  END
WHERE reward IS NOT NULL AND json_valid(reward);

-- 迁移 ai_verdict 老数据
UPDATE tasks
SET
  verdict_pass = CASE
    WHEN json_extract(ai_verdict, '$.pass') = 1 THEN 1
    WHEN json_extract(ai_verdict, '$.pass') = 'true' THEN 1
    ELSE 0
  END,
  verdict_completion = json_extract(ai_verdict, '$.completion'),
  verdict_reason = json_extract(ai_verdict, '$.reason')
WHERE ai_verdict IS NOT NULL AND json_valid(ai_verdict);

-- 索引：常用 stat 查询（按 verdict.pass 看通过率、按 reward.minutes 看续命累计）
CREATE INDEX idx_tasks_verdict_pass ON tasks(verdict_pass);
CREATE INDEX idx_tasks_reward_minutes ON tasks(reward_minutes);
