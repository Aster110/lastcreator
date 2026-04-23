-- P101 lastcreator v2 初始 schema
-- 设计见 /Users/aster/AIproject/mylife/2-Projects/P101-hackon/07-v2架构设计.md §5

-- users: 身份（匿名 + 未来登录）
CREATE TABLE users (
  id TEXT PRIMARY KEY,                      -- 'u_' + nanoid(10)
  anon_ids TEXT NOT NULL DEFAULT '[]',      -- JSON array of anon_id（支持多设备合并）
  handle TEXT,                              -- 登录后的用户名，nullable
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_users_handle ON users(handle);

-- pets: 宠物
CREATE TABLE pets (
  id TEXT PRIMARY KEY,                      -- 'p_' + nanoid(10)，公开在 URL 路径
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  habitat TEXT NOT NULL,
  personality TEXT NOT NULL,
  skills TEXT NOT NULL,                     -- JSON array
  hp INTEGER NOT NULL,
  exp INTEGER NOT NULL DEFAULT 0,
  story TEXT NOT NULL,
  image_r2_key TEXT NOT NULL,               -- 'pets/{pet_id}/image.png'
  image_origin_url TEXT,                    -- zzz 原 URL，备份
  doodle_r2_key TEXT,                       -- 用户原涂鸦（R2）
  stage TEXT NOT NULL DEFAULT '幼年',
  status TEXT NOT NULL DEFAULT 'alive',     -- alive/released/dead
  memory_from_pet_id TEXT,                  -- 记忆继承源（v3）
  memory_fragment TEXT,                     -- JSON，继承的特征快照
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
CREATE INDEX idx_pets_owner_time ON pets(owner_id, created_at DESC);
CREATE INDEX idx_pets_status ON pets(status);

-- tasks: 宠物派给用户的任务（v3 接入）
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,                      -- 't_' + nanoid(10)
  pet_id TEXT NOT NULL,
  kind TEXT NOT NULL,                       -- 'photo' | 'doodle' | 'chat'
  prompt TEXT NOT NULL,
  reward TEXT NOT NULL,                     -- JSON: { hp?: N, exp?: N, unlock?: string }
  status TEXT NOT NULL DEFAULT 'pending',   -- pending/done/expired
  proof_r2_key TEXT,                        -- 完成证据（图/涂鸦 R2 key）
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);
CREATE INDEX idx_tasks_pet_status ON tasks(pet_id, status);

-- memories: 记忆条目（v3 接入）
CREATE TABLE memories (
  id TEXT PRIMARY KEY,                      -- 'm_' + nanoid(10)
  pet_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,                   -- 冗余：加速"查某人所有逝者的记忆"
  kind TEXT NOT NULL,                       -- 'birth' | 'level_up' | 'task' | 'death' | 'release'
  content TEXT NOT NULL,                    -- JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY (pet_id) REFERENCES pets(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
CREATE INDEX idx_memories_owner_kind ON memories(owner_id, kind, created_at DESC);

-- events: 事件日志（审计 + 世界进度 SoR）
CREATE TABLE events (
  id TEXT PRIMARY KEY,                      -- 'e_' + nanoid(10)
  type TEXT NOT NULL,                       -- 'pet.born' | 'pet.leveled' | ...
  actor_id TEXT,                            -- user_id 或 pet_id
  payload TEXT NOT NULL,                    -- JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_events_type_time ON events(type, created_at);
CREATE INDEX idx_events_created ON events(created_at);
