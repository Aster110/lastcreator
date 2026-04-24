-- P101 lastcreator v3.2: 生命倒计时 + 任务完成随机化
-- 设计见 11-v3.2架构设计.md §5

-- ========== 1. pets_state 加 life_expires_at 列 ==========
ALTER TABLE pets_state ADD COLUMN life_expires_at INTEGER;

-- ========== 2. 过渡回填：给所有 alive 宠物 +3h 缓冲期 ==========
UPDATE pets_state
SET life_expires_at = (CAST(strftime('%s', 'now') AS INTEGER) * 1000) + 10800000
WHERE status = 'alive' AND life_expires_at IS NULL;

-- 注：released/dead 宠物不设（NULL 即可，读取时不走懒检查）
