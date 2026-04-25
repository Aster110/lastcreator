-- v3.9.1 (Phase B): 拍照/涂鸦二选一范式。
-- task.kind = 模板期望 kind（preferredKind 语义，沿用旧字段名兼容）
-- task.actual_kind = 用户实际提交的 kind（NULL 直到 submit）
-- 提交时不一定等于 task.kind——用户可选另一种代替（"用涂鸦代替拍照" / "用照片代替涂鸦"）
ALTER TABLE tasks ADD COLUMN actual_kind TEXT;
