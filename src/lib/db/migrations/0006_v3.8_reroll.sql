-- v3.8: Reroll 支持
-- 当用户对当前任务点"换一个"时，旧任务标 status='cancelled', cancelled_reason='reroll'
-- 当天该 owner 的 reroll 用量 = COUNT(tasks WHERE cancelled_reason='reroll' AND created_at >= 今日 0 点)
-- 上限 3 次（见 src/lib/game/rules.ts MAX_DAILY_REROLLS）
ALTER TABLE tasks ADD COLUMN cancelled_reason TEXT;
