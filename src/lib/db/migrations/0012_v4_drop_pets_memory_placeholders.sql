-- v4.1 Phase C: 删 pets.memory_from_pet_id / memory_fragment 占位字段
-- 设计见 mylife/2-Projects/P101-hackon/20-v4-记忆闭环.md（v4.x 重构补丁）
--
-- 这俩列在 0001_init 时占位为"v3 记忆继承"——但 v3.9 真正落地继承走 memories 表，
-- 这俩列从未被代码写入（grep 后确认 createPet 一直传 NULL）。
-- v4.1 Phase C：DROP 掉，stop 这两列的"假留"状态。
--
-- D1 SQLite 3.35+ 支持 ALTER TABLE DROP COLUMN（不需要重建表）。
-- 备份策略：列内容已确认为 NULL 或空 JSON，无数据损失。

ALTER TABLE pets DROP COLUMN memory_fragment;
ALTER TABLE pets DROP COLUMN memory_from_pet_id;
