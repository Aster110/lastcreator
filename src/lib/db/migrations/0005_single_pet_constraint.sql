-- v3.5: 单宠约束（每个 owner 同时最多 1 只 alive）
-- SQLite 不支持部分唯一索引（WHERE status='alive'），
-- 利用 NULL 允许多值的规则：alive_owner_id 只在 alive 时 = owner_id，否则 NULL。
-- UNIQUE INDEX 对 NULL 不生效，于是"每个 owner 至多 1 行 alive_owner_id = ownerId"自动成立。
--
-- 注意：业务实际状态 = COALESCE(pets_state.status, pets.status)。
-- pets.status 只在 createPet 时被设置，之后 markDead / release 只改 pets_state.status。
-- 所以 migration 判断"alive"必须 JOIN pets_state 并 COALESCE。
ALTER TABLE pets ADD COLUMN alive_owner_id TEXT;

UPDATE pets
SET alive_owner_id = owner_id
WHERE id IN (
  SELECT p.id FROM pets p
  LEFT JOIN pets_state s ON p.id = s.pet_id
  WHERE COALESCE(s.status, p.status) = 'alive'
);

CREATE UNIQUE INDEX unq_pets_alive_owner ON pets(alive_owner_id);
