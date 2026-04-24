-- v3.3: 宠物属性（诞生时随机选中，终身不变）
-- 取值: 'ruins' | 'fire' | 'water' | 'dark' | 'ice' | 'sky'
-- 旧行为 NULL，前端视作"未知属性"兼容展示
ALTER TABLE pets ADD COLUMN element TEXT;
CREATE INDEX IF NOT EXISTS idx_pets_element ON pets(element);
