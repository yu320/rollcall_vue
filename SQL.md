# 報到管理系統 - 整合與修正後資料庫設定與遷移腳本
---
    -- 作者: Hong
    -- 版本: 4.0.0 (新增活動指定參與人員功能)
    -- 描述: 這個 SQL 腳本為通用版本，可用於全新資料庫的初始化，
    --       或安全地更新現有資料庫以符合最新架構。
---

-- 啟動一個事務，確保所有操作的原子性
BEGIN;

-- ========= 1. 核心 RBAC 與稽核日誌資料表建立 =========
-- 如果資料表不存在，則建立它們。
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.roles IS '儲存應用程式中的所有使用者角色';

CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.permissions IS '儲存系統中所有可用的操作權限';

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
    CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.role_permissions IS '將權限指派給角色的中介資料表';

-- 2.2 profiles (使用者設定檔) 資料表 - 已移至此處，因為 audit_logs 引用它
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    nickname text NULL,
    role_id uuid NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(), -- [NEW] Add updated_at
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.profiles IS '儲存應用程式使用者的額外資訊，如角色和暱稱';

-- 處理現有 profiles 表的遷移 - 已移至此處
DO $$
DECLARE
    default_role_id uuid;
BEGIN
    -- 確保 'operator' 角色存在，否則創建它
    INSERT INTO public.roles (name, description) VALUES ('operator', '操作員，僅能進行報到和查看記錄') ON CONFLICT (name) DO NOTHING;
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'operator';

    -- 添加 `role_id` 欄位如果不存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role_id') THEN
        ALTER TABLE public.profiles ADD COLUMN role_id uuid NULL;
        COMMENT ON COLUMN public.profiles.role_id IS '關聯到 roles 資料表的使用者角色 ID';
        -- 為現有 `profiles` 記錄設定預設的 `role_id`
        UPDATE public.profiles SET role_id = default_role_id WHERE role_id IS NULL;
        -- 添加外鍵約束
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
    ELSE
        -- 如果 role_id 已存在但為 NULL，也為其設定預設值
        UPDATE public.profiles SET role_id = default_role_id WHERE role_id IS NULL;
    END IF;

    -- 確保 `email` 欄位存在且為 NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email' AND is_nullable = 'YES') THEN
        UPDATE public.profiles SET email = auth.users.email FROM auth.users WHERE public.profiles.id = auth.users.id AND public.profiles.email IS NULL;
        ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
    END IF;

    -- [NEW] 添加 `updated_at` 欄位如果不存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at timestamp with time zone;
        COMMENT ON COLUMN public.profiles.updated_at IS '資料最後更新時間';
    END IF;
    -- [NEW] 為現有資料填充 updated_at 並設定 NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at' AND is_nullable = 'YES') THEN
        UPDATE public.profiles SET updated_at = COALESCE(updated_at, now()) WHERE updated_at IS NULL;
        ALTER TABLE public.profiles ALTER COLUMN updated_at SET NOT NULL;
        ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT now();
    END IF;

END $$;

-- [NEW] Trigger to automatically update 'updated_at' on profile updates
DROP TRIGGER IF EXISTS on_profiles_update ON public.profiles;
-- [NEW] Function to set updated_at timestamp automatically for profiles table
DROP FUNCTION IF EXISTS public.set_profiles_updated_at();
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [NEW] Trigger to automatically update 'updated_at' on profile updates
CREATE TRIGGER on_profiles_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NULL,
    user_email text NULL,
    action_type text NOT NULL,
    target_table text NULL,
    target_id text NULL,
    description text NOT NULL,
    old_value jsonb NULL,
    new_value jsonb NULL,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
    CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.audit_logs IS '記錄重要的系統操作，用於稽核和安全性追蹤';

-- ========= 2. 應用程式核心資料表建立與遷移 =========

-- 2.1 personnel (人員) 資料表
CREATE TABLE IF NOT EXISTS public.personnel (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    code text NOT NULL,
    card_number text NOT NULL,
    building text NULL,
    tags text[] NULL, -- 人員的標籤欄位保留
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT personnel_pkey PRIMARY KEY (id),
    CONSTRAINT personnel_card_number_key UNIQUE (card_number),
    CONSTRAINT personnel_code_key UNIQUE (code)
);
COMMENT ON TABLE public.personnel IS '儲存所有可報到人員的基本資料';

-- 處理現有 personnel 表的遷移 (例如添加新欄位或修改約束)
DO $$
BEGIN
    -- 添加 'updated_at' 欄位如果不存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'updated_at') THEN
        ALTER TABLE public.personnel ADD COLUMN updated_at timestamp with time zone;
        COMMENT ON COLUMN public.personnel.updated_at IS '資料最後更新時間';
    END IF;
    -- 為現有資料填充 updated_at 並設定 NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'updated_at' AND is_nullable = 'YES') THEN
        UPDATE public.personnel SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
        ALTER TABLE public.personnel ALTER COLUMN updated_at SET NOT NULL;
        ALTER TABLE public.personnel ALTER COLUMN updated_at SET DEFAULT now();
    END IF;

    -- 確保 'name', 'code', 'card_number' 為 NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'name' AND is_nullable = 'YES') THEN
        UPDATE public.personnel SET name = COALESCE(name, 'Unnamed_' || gen_random_uuid()::text) WHERE name IS NULL;
        ALTER TABLE public.personnel ALTER COLUMN name SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'code' AND is_nullable = 'YES') THEN
        UPDATE public.personnel SET code = COALESCE(code, gen_random_uuid()::text) WHERE code IS NULL;
        ALTER TABLE public.personnel ALTER COLUMN code SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'card_number' AND is_nullable = 'YES') THEN
        UPDATE public.personnel SET card_number = COALESCE(card_number, gen_random_uuid()::text) WHERE card_number IS NULL;
        ALTER TABLE public.personnel ALTER COLUMN card_number SET NOT NULL;
    END IF;

    -- 添加 'tags' 欄位如果不存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'tags') THEN
        ALTER TABLE public.personnel ADD COLUMN tags text[] NULL;
        COMMENT ON COLUMN public.personnel.tags IS '人員的標籤，用陣列儲存';
    END IF;

    -- 添加 UNIQUE 約束如果不存在 (僅針對已存在但沒有約束的表)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.personnel'::regclass AND conname = 'personnel_card_number_key') THEN
        ALTER TABLE public.personnel ADD CONSTRAINT personnel_card_number_key UNIQUE (card_number);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.personnel'::regclass AND conname = 'personnel_code_key') THEN
        ALTER TABLE public.personnel ADD CONSTRAINT personnel_code_key UNIQUE (code);
    END IF;

END $$;

-- 2.3 events (活動) 資料表
CREATE TABLE IF NOT EXISTS public.events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NULL,
    created_by uuid NULL,
    participant_scope TEXT NOT NULL DEFAULT 'ALL', -- [NEW] Add participant_scope
    CONSTRAINT events_pkey PRIMARY KEY (id),
    CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.events IS '儲存所有活動的資訊';

-- 處理現有 events 表的遷移
DO $$
BEGIN
    -- 添加 created_by 欄位如果不存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'created_by') THEN
        ALTER TABLE public.events ADD COLUMN created_by uuid NULL;
        COMMENT ON COLUMN public.events.created_by IS '創建此活動的使用者 ID';
        ALTER TABLE public.events ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 確保 `name` 和 `start_time` 為 NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'name' AND is_nullable = 'YES') THEN
        UPDATE public.events SET name = COALESCE(name, 'Unnamed Event ' || gen_random_uuid()::text) WHERE name IS NULL;
        ALTER TABLE public.events ALTER COLUMN name SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_time' AND is_nullable = 'YES') THEN
        UPDATE public.events SET start_time = COALESCE(start_time, NOW()) WHERE start_time IS NULL;
        ALTER TABLE public.events ALTER COLUMN start_time SET NOT NULL;
    END IF;

    -- [NEW] 添加 participant_scope 欄位如果不存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'participant_scope') THEN
        ALTER TABLE public.events ADD COLUMN participant_scope TEXT;
        COMMENT ON COLUMN public.events.participant_scope IS '參與人員範圍 (ALL: 全體, SPECIFIC: 指定)';
        UPDATE public.events SET participant_scope = COALESCE(participant_scope, 'ALL') WHERE participant_scope IS NULL;
        ALTER TABLE public.events ALTER COLUMN participant_scope SET NOT NULL;
        ALTER TABLE public.events ALTER COLUMN participant_scope SET DEFAULT 'ALL';
    END IF;

END $$;

-- 2.4 check_in_records (報到記錄) 資料表
CREATE TABLE IF NOT EXISTS public.check_in_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    input text NOT NULL,
    input_type text NOT NULL,
    success boolean NOT NULL,
    name_at_checkin text NULL,
    personnel_id uuid NULL,
    device_id text NULL,
    event_id uuid NULL,
    status text NULL,
    action_type text NOT NULL DEFAULT '簽到',
    -- tags text[] NULL, -- 【已移除】報到記錄的標籤欄位，根據用戶要求
    CONSTRAINT check_in_records_pkey PRIMARY KEY (id),
    CONSTRAINT check_in_records_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL,
    CONSTRAINT check_in_records_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.check_in_records IS '儲存所有報到和簽退的詳細記錄';

-- 處理現有 check_in_records 表的遷移
DO $$
BEGIN
    -- 添加 status 欄位如果不存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'status') THEN
        ALTER TABLE public.check_in_records ADD COLUMN status text NULL;
        COMMENT ON COLUMN public.check_in_records.status IS '報到狀態 (例如：準時、遲到、失敗、簽退成功)';
        -- 為現有記錄設定預設狀態
        UPDATE public.check_in_records SET status = '未知' WHERE status IS NULL;
    END IF;

    -- 添加 `action_type` 欄位如果不存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'action_type') THEN
        ALTER TABLE public.check_in_records ADD COLUMN action_type text NULL;
        COMMENT ON COLUMN public.check_in_records.action_type IS '操作類型 (簽到/簽退)';
        -- 為現有記錄設定預設操作類型並設定 NOT NULL
        UPDATE public.check_in_records SET action_type = COALESCE(action_type, '簽到') WHERE action_type IS NULL;
        ALTER TABLE public.check_in_records ALTER COLUMN action_type SET NOT NULL;
        ALTER TABLE public.check_in_records ALTER COLUMN action_type SET DEFAULT '簽到';
    END IF;

    -- 確保其他核心欄位為 NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'created_at' AND is_nullable = 'YES') THEN
        UPDATE public.check_in_records SET created_at = COALESCE(created_at, NOW()) WHERE created_at IS NULL;
        ALTER TABLE public.check_in_records ALTER COLUMN created_at SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'input' AND is_nullable = 'YES') THEN
        UPDATE public.check_in_records SET input = COALESCE(input, 'UNKNOWN_' || gen_random_uuid()::text) WHERE input IS NULL;
        ALTER TABLE public.check_in_records ALTER COLUMN input SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'input_type' AND is_nullable = 'YES') THEN
        UPDATE public.check_in_records SET input_type = COALESCE(input_type, '未知') WHERE input_type IS NULL;
        ALTER TABLE public.check_in_records ALTER COLUMN input_type SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'success' AND is_nullable = 'YES') THEN
        UPDATE public.check_in_records SET success = COALESCE(success, FALSE) WHERE success IS NULL;
        ALTER TABLE public.check_in_records ALTER COLUMN success SET NOT NULL;
    END IF;

    -- 【已移除】用於添加 'tags' 欄位的邏輯，因為用戶要求 'tags' 不在 check_in_records 中
    -- IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'tags') THEN
    --     ALTER TABLE public.check_in_records ADD COLUMN tags text[] NULL;
    --     COMMENT ON COLUMN public.check_in_records.tags IS '報到記錄的標籤，用陣列儲存';
    -- END IF;

END $$;

-- [NEW] 2.5 event_participants (活動參與人員) 資料表
CREATE TABLE IF NOT EXISTS public.event_participants (
    event_id uuid NOT NULL,
    personnel_id uuid NOT NULL,
    CONSTRAINT event_participants_pkey PRIMARY KEY (event_id, personnel_id),
    CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
    CONSTRAINT event_participants_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.event_participants IS '儲存指定參與活動的人員名單';


-- ========= 3. 初始資料填充 (安全執行) =========
-- 使用 ON CONFLICT DO NOTHING 確保重複執行此腳本時不會出錯

-- 3.1 插入角色
INSERT INTO public.roles (name, description) VALUES
('superadmin', '超級管理員，擁有所有權限且不可被修改'),
('admin', '管理員，擁有所有權限'),
('sdc', '宿委會，擁有大部分管理權限'),
('operator', '操作員，僅能進行報到和查看記錄'),
('sdsc', '宿服，僅能查看報表和總覽')
ON CONFLICT (name) DO NOTHING;

-- 3.2 插入權限
INSERT INTO public.permissions (name, description) VALUES
('overview:view', '查看系統總覽頁面'),
('checkin:use', '使用報到系統頁面'),
('personnel:create', '新增與匯入人員資料'),
('personnel:read', '讀取人員資料列表'),
('personnel:update', '更新人員資料'),
('personnel:delete', '刪除人員資料'),
('events:create', '新增活動'),
('events:update', '更新活動'),
('events:delete', '刪除活動'),
('records:create', '新增報到記錄'),
('records:view', '查看每日與活動記錄'),
('records:delete', '刪除報到記錄'),
('reports:view', '查看報表與儀錶板'),
('reports:personnel', '查看特定人員的詳細報表'),
('accounts:manage_users', '管理所有使用者帳號 (新增、編輯、刪除使用者)'),
('accounts:manage', '管理所有使用者角色與權限分配')
ON CONFLICT (name) DO NOTHING;

-- 3.3 為各角色指派權限
-- superadmin: 賦予所有權限
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT (SELECT id FROM public.roles WHERE name = 'superadmin'), p.id FROM public.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- admin: 賦予所有權限，但排除 'accounts:manage' (權限管理)
DO $$
DECLARE
    admin_role_id uuid := (SELECT id FROM public.roles WHERE name = 'admin');
BEGIN
    DELETE FROM public.role_permissions WHERE role_id = admin_role_id;
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT admin_role_id, p.id
    FROM public.permissions p
    WHERE p.name <> 'accounts:manage'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- sdc: 擁有大部分管理權限
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT (SELECT id FROM public.roles WHERE name = 'sdc'), p.id
FROM public.permissions p
WHERE p.name NOT IN ('accounts:manage_users', 'accounts:manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- operator: 僅能進行報到和查看記錄
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT (SELECT id FROM public.roles WHERE name = 'operator'), p.id FROM public.permissions p WHERE p.name IN ('overview:view', 'checkin:use', 'personnel:read', 'records:create', 'records:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- sdsc: 僅能查看報表和總覽
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT (SELECT id FROM public.roles WHERE name = 'sdsc'), p.id FROM public.permissions p WHERE p.name IN ('overview:view', 'reports:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;


-- ========= 4. 自動化與輔助函數 =========

-- 4.1 handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE; -- 添加 CASCADE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id uuid;
BEGIN
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'operator';
    INSERT INTO public.profiles(id, email, nickname, role_id)
    VALUES(NEW.id, NEW.email, NEW.email, default_role_id)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4.2 user_has_permission
-- 先刪除所有依賴此函數的 RLS 策略
DROP POLICY IF EXISTS "Allow admin to manage all profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to manage all profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to manage all profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to manage all profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Allow authorized users to read personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow authorized users to create personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow authorized users to update personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow authorized users to delete personnel" ON public.personnel;

DROP POLICY IF EXISTS "Allow authenticated users to read events" ON public.events;
DROP POLICY IF EXISTS "Allow authorized users to create events" ON public.events;
DROP POLICY IF EXISTS "Allow authorized users to update events" ON public.events;
DROP POLICY IF EXISTS "Allow authorized users to delete events" ON public.events;

DROP POLICY IF EXISTS "Allow authorized users to read records" ON public.check_in_records;
CREATE POLICY "Allow authorized users to read records" ON public.check_in_records FOR SELECT USING (public.user_has_permission(auth.uid(), 'records:view'));
DROP POLICY IF EXISTS "Allow authorized users to create records" ON public.check_in_records;
CREATE POLICY "Allow authorized users to create records" ON public.check_in_records FOR INSERT WITH CHECK (public.user_has_permission(auth.uid(), 'records:create'));
DROP POLICY IF EXISTS "Allow authorized users to delete records" ON public.check_in_records;
CREATE POLICY "Allow authorized users to delete records" ON public.check_in_records FOR DELETE USING (public.user_has_permission(auth.uid(), 'records:delete'));

DROP POLICY IF EXISTS "Allow admin to read audit logs" ON public.audit_logs;
CREATE POLICY "Allow admin to read audit logs" ON public.audit_logs FOR SELECT USING (public.user_has_permission(auth.uid(), 'accounts:manage'));
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated users to insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- --- 策略: roles, permissions, role_permissions ---
DROP POLICY IF EXISTS "Allow admins to manage roles" ON public.roles;
CREATE POLICY "Allow admins to manage roles" ON public.roles FOR ALL USING (public.user_has_permission(auth.uid(), 'accounts:manage')) WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage'));
DROP POLICY IF EXISTS "Allow admins to manage permissions" ON public.permissions;
CREATE POLICY "Allow admins to manage permissions" ON public.permissions FOR ALL USING (public.user_has_permission(auth.uid(), 'accounts:manage')) WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage'));
DROP POLICY IF EXISTS "Allow admins to manage role_permissions" ON public.role_permissions;
CREATE POLICY "Allow admins to manage role_permissions" ON public.role_permissions FOR ALL USING (public.user_has_permission(auth.uid(), 'accounts:manage')) WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage'));

DROP POLICY IF EXISTS "Allow authorized users to manage event participants" ON public.event_participants; -- [NEW] Drop policy for event_participants

DROP FUNCTION IF EXISTS public.user_has_permission(p_user_id uuid, p_permission_name text) CASCADE; -- 添加 CASCADE
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_permission_name text)
RETURNS boolean AS $$
DECLARE
    has_perm boolean;
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles pr JOIN public.roles r ON pr.role_id = r.id WHERE pr.id = p_user_id AND r.name = 'superadmin') THEN
        RETURN TRUE;
    END IF;
    SELECT EXISTS (
        SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = (SELECT role_id FROM public.profiles WHERE id = p_user_id) AND p.name = p_permission_name
    ) INTO has_perm;
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.user_has_permission(uuid, text) IS '檢查特定使用者是否擁有指定的權限，superadmin 擁有所有權限';

-- 4.3 get_daily_record_stats
DROP FUNCTION IF EXISTS public.get_daily_record_stats();
CREATE OR REPLACE FUNCTION public.get_daily_record_stats()
RETURNS TABLE (created_at timestamptz, total bigint, late bigint, fail bigint)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        date_trunc('day', cr.created_at)::timestamptz AS created_at,
        COUNT(cr.id) AS total,
        COUNT(CASE WHEN cr.status = '遲到' THEN 1 END) AS late,
        COUNT(CASE WHEN cr.success = FALSE THEN 1 END) AS fail
    FROM public.check_in_records cr
    GROUP BY date_trunc('day', cr.created_at)
    ORDER BY created_at DESC;
END;
$$;
COMMENT ON FUNCTION public.get_daily_record_stats() IS '獲取每日報到記錄的統計資訊';

-- 4.4 import_checkin_records_with_personnel_creation 簽到後端處理
-- 【新增】多個 DROP FUNCTION 語句以確保移除所有衝突的簽名
DROP FUNCTION IF EXISTS public.import_checkin_records_with_personnel_creation(jsonb, uuid, text, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.import_checkin_records_with_personnel_creation(text, uuid, jsonb, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.import_checkin_records_with_personnel_creation(jsonb[], uuid, text, text[]) CASCADE;
CREATE OR REPLACE FUNCTION public.import_checkin_records_with_personnel_creation(
    records_to_import jsonb, -- 這裡應該是單個 JSONB 物件，而不是陣列
    eventid uuid DEFAULT NULL,
    actiontype text DEFAULT '簽到',
    user_defined_tags text[] DEFAULT ARRAY[]::text[] -- 用戶自訂標籤參數
)
RETURNS TABLE (success_count int, auto_created_count int, errors text[])
LANGUAGE plpgsql
AS $$
DECLARE
    rec JSONB;
    person_id uuid;
    person_name text;
    person_code text;
    person_card_number text;
    person_input_type text;
    personnel_exists boolean;
    record_status text;
    event_start_time timestamptz;
    event_end_time timestamptz;
    all_tags text[]; -- 組合系統標籤和用戶自訂標籤
    processed_success_count int := 0;
    processed_auto_created_count int := 0;
    processed_errors text[] := ARRAY[]::text[];
    generated_code text;
    generated_card_number text;
BEGIN
    -- 獲取活動時間，如果提供了 eventId
    IF eventid IS NOT NULL THEN
        SELECT start_time, end_time INTO event_start_time, event_end_time
        FROM public.events
        WHERE id = eventid;
    END IF;

    -- 遍歷傳入的記錄陣列 (records_to_import 現在是單個 JSONB，所以需要 jsonb_array_elements)
    FOR rec IN SELECT * FROM jsonb_array_elements(records_to_import)
    LOOP
        -- 從 name_at_checkin 獲取姓名，並確保移除空白字元
        person_name := TRIM(rec->>'name_at_checkin');
        person_code := rec->>'input'; -- 從 'input' 鍵獲取學號/卡號
        person_card_number := rec->>'input'; -- 從 'input' 鍵獲取學號/卡號
        person_input_type := rec->>'input_type';

        -- 檢查姓名是否為空，若為空則記錄錯誤並跳過
        IF person_name IS NULL OR person_name = '' THEN
            processed_errors := array_append(processed_errors, format('記錄失敗 (學號/卡號: %s): 姓名欄位不能為空。', rec->>'input'));
            CONTINUE; -- 跳過此筆記錄
        END IF;

        -- 檢查人員是否存在 (優先使用 code，然後 card_number)
        person_id := NULL;
        personnel_exists := FALSE;

        IF person_input_type = '學號' THEN
            SELECT id INTO person_id FROM public.personnel WHERE code = person_code;
            IF person_id IS NOT NULL THEN
                personnel_exists := TRUE;
            END IF;
        ELSIF person_input_type = '卡號' THEN
            SELECT id INTO person_id FROM public.personnel WHERE card_number = person_card_number;
            IF person_id IS NOT NULL THEN
                personnel_exists := TRUE;
            END IF;
        ELSE
            -- 如果 input_type 未知，則嘗試同時檢查學號和卡號
            SELECT id INTO person_id FROM public.personnel WHERE code = person_code LIMIT 1;
            IF person_id IS NOT NULL THEN
                personnel_exists := TRUE;
            ELSE
                SELECT id INTO person_id FROM public.personnel WHERE card_number = person_card_number LIMIT 1;
                IF person_id IS NOT NULL THEN
                    personnel_exists := TRUE;
                END IF;
            END IF;
        END IF;

        IF person_id IS NULL THEN
            -- 人員不存在，自動創建
            BEGIN -- Start of inner block for exception handling during personnel creation
                all_tags := ARRAY['系統匯入'] || user_defined_tags;
                
                IF person_input_type = '學號' THEN
                    -- 如果提供的是學號，自動生成一個卡號 (學號中的純數字部分)
                    generated_card_number := REGEXP_REPLACE(person_code, '[^0-9]', '', 'g'); -- 提取純數字
                    IF generated_card_number = '' THEN generated_card_number := SUBSTRING(gen_random_uuid()::text FROM 1 FOR 10); END IF; -- UUID 作為 fallback
                    INSERT INTO public.personnel (name, code, card_number, tags, created_at, updated_at)
                    VALUES (person_name, person_code, generated_card_number, all_tags, NOW(), NOW())
                    RETURNING id INTO person_id;
                ELSIF person_input_type = '卡號' THEN
                    -- 如果提供的是卡號，自動生成一個學號 (AUTO_ + 卡號)
                    generated_code := CONCAT('AUTO_', person_card_number);
                    INSERT INTO public.personnel (name, code, card_number, tags, created_at, updated_at)
                    VALUES (person_name, generated_code, person_card_number, all_tags, NOW(), NOW())
                    RETURNING id INTO person_id;
                ELSE -- 如果 person_input_type 是未知，根據 input 內容判斷
                    IF rec->>'input' ~ '^[0-9]+$' THEN -- 如果 input 是純數字，視為卡號
                        generated_code := CONCAT('AUTO_', rec->>'input');
                        generated_card_number := rec->>'input';
                    ELSE -- 如果 input 包含非數字，視為學號
                        generated_code := rec->>'input';
                        generated_card_number := REGEXP_REPLACE(rec->>'input', '[^0-9]', '', 'g'); -- 提取純數字
                        IF generated_card_number = '' THEN generated_card_number := SUBSTRING(gen_random_uuid()::text FROM 1 FOR 10); END IF;
                    END IF; 
                    INSERT INTO public.personnel (name, code, card_number, tags, created_at, updated_at)
                    VALUES (person_name, generated_code, generated_card_number, all_tags, NOW(), NOW())
                    RETURNING id INTO person_id;
                END IF;
                
                processed_auto_created_count := processed_auto_created_count + 1;
                personnel_exists := TRUE;
            EXCEPTION
                WHEN unique_violation THEN
                    -- 如果發生唯一約束衝突，查詢現有的人員 ID
                    IF person_input_type = '學號' THEN SELECT id INTO person_id FROM public.personnel WHERE code = person_code;
                    ELSIF person_input_type = '卡號' THEN SELECT id INTO person_id FROM public.personnel WHERE card_number = person_card_number;
                    ELSE
                        -- 對於未知類型，嘗試根據 input 本身查找 (學號或卡號)
                        SELECT id INTO person_id FROM public.personnel WHERE code = rec->>'input' LIMIT 1;
                        IF person_id IS NULL THEN
                            SELECT id INTO person_id FROM public.personnel WHERE card_number = rec->>'input' LIMIT 1;
                        END IF;
                    END IF;
                    personnel_exists := TRUE;
                WHEN OTHERS THEN
                    processed_errors := array_append(processed_errors, format('自動創建人員失敗 (%s): %s', person_name, SQLERRM));
                    CONTINUE;
            END; -- End of inner block for exception handling
        END IF;

        -- 判斷簽到狀態 (準時、遲到、成功等)
        IF actiontype = '簽到' THEN
            IF eventid IS NOT NULL AND event_start_time IS NOT NULL THEN
                IF (rec->>'timestamp')::timestamptz > event_start_time THEN record_status := '遲到';
                ELSE record_status := '準時'; END IF;
            ELSE record_status := '成功'; END IF;
        ELSIF actiontype = '簽退' THEN record_status := '簽退成功';
        ELSE record_status := '未知狀態'; END IF;

        -- 將最終處理好的記錄插入到 check_in_records 資料表中
        BEGIN
            INSERT INTO public.check_in_records (created_at, input, input_type, success, name_at_checkin, personnel_id, device_id, event_id, status, action_type)
            VALUES ((rec->>'timestamp')::timestamptz, rec->>'input', person_input_type, personnel_exists, person_name, person_id, rec->>'device_id', eventid, record_status, actiontype);
            processed_success_count := processed_success_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                processed_errors := array_append(processed_errors, format('插入記錄失敗 (%s, %s): %s', person_name, rec->>'input', SQLERRM));
        END;

    END LOOP;

    RETURN QUERY SELECT processed_success_count, processed_auto_created_count, processed_errors;

END; 
$$; 
COMMENT ON FUNCTION public.import_checkin_records_with_personnel_creation(jsonb, uuid, text, text[]) IS '批次匯入簽到記錄，如果人員不存在則自動創建，並根據活動時間計算狀態，支持自定義標籤。';


-- [NEW] 4.5 save_event_with_participants
-- [FIXED] 4.5 save_event_with_participants
-- 修正了 event_id 變數與欄位名稱衝突導致的 "ambiguous reference" 錯誤 
DROP FUNCTION IF EXISTS public.save_event_with_participants(jsonb, uuid[]);
CREATE OR REPLACE FUNCTION public.save_event_with_participants(
    event_data jsonb,
    participant_ids uuid[]
)
RETURNS SETOF public.events
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_id uuid; -- 【*** 核心修正 ***】將變數 event_id 改名為 v_event_id 來避免歧義
BEGIN
    -- 判斷是更新還是新增
    IF event_data ? 'id' AND event_data->>'id' IS NOT NULL THEN
        -- 更新現有活動
        v_event_id := (event_data->>'id')::uuid;
        UPDATE public.events
        SET
            name = event_data->>'name',
            start_time = (event_data->>'start_time')::timestamptz,
            end_time = (event_data->>'end_time')::timestamptz,
            participant_scope = event_data->>'participant_scope',
            created_by = (event_data->>'created_by')::uuid
        WHERE id = v_event_id;
    ELSE
        -- 新增活動
        INSERT INTO public.events (name, start_time, end_time, created_by, participant_scope)
        VALUES (
            event_data->>'name',
            (event_data->>'start_time')::timestamptz,
            (event_data->>'end_time')::timestamptz,
            (event_data->>'created_by')::uuid,
            event_data->>'participant_scope'
        ) RETURNING id INTO v_event_id;
    END IF;

    -- 根據適用對象更新參與人員列表
    IF event_data->>'participant_scope' = 'SPECIFIC' THEN
        -- 【*** 核心修正 ***】在 WHERE 條件中使用 v_event_id，明確指定刪除此活動的參與者
        DELETE FROM public.event_participants WHERE event_id = v_event_id;
        
        IF array_length(participant_ids, 1) > 0 THEN
            INSERT INTO public.event_participants (event_id, personnel_id)
            SELECT v_event_id, unnest(participant_ids);
        END IF;
    ELSE
        -- 如果適用對象是 'ALL' 或其他，則清空指定參與者
        -- 【*** 核心修正 ***】在 WHERE 條件中使用 v_event_id
        DELETE FROM public.event_participants WHERE event_id = v_event_id;
    END IF;

    -- 返回被新增或更新的活動資料
    RETURN QUERY SELECT * FROM public.events WHERE id = v_event_id;
END;
$$;

COMMENT ON FUNCTION public.save_event_with_participants(jsonb, uuid[]) IS '新增或更新一個活動，並管理其指定的參與人員列表。';


-- [UPDATED] 4.6 get_event_dashboard_data
DROP FUNCTION IF EXISTS public.get_event_dashboard_data(uuid);
CREATE OR REPLACE FUNCTION public.get_event_dashboard_data(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    event_info public.events;
    expected_attendee_count integer;
    attended_ids uuid[];
    attended_count integer;
    absent_count integer;
    on_time_count integer;
    late_count integer;
    attendance_rate numeric;
    on_time_rate numeric;
    attendees_list jsonb;
    timeline_data jsonb;
BEGIN
    SELECT * INTO event_info FROM public.events WHERE id = p_event_id;
    IF event_info IS NULL THEN RAISE EXCEPTION '活動 ID % 不存在', p_event_id; END IF;

    -- 根據 participant_scope 計算 expected_attendee_count
    IF event_info.participant_scope = 'SPECIFIC' THEN
        SELECT COUNT(*) INTO expected_attendee_count FROM public.event_participants WHERE event_id = p_event_id;
    ELSE -- 'ALL' 或其他未定義的 scope
        SELECT COUNT(*) INTO expected_attendee_count FROM public.personnel;
    END IF;

    SELECT ARRAY_AGG(DISTINCT personnel_id) INTO attended_ids
    FROM public.check_in_records
    WHERE event_id = p_event_id AND success = TRUE AND action_type = '簽到' AND personnel_id IS NOT NULL;
    attended_count := COALESCE(array_length(attended_ids, 1), 0);
    absent_count := expected_attendee_count - attended_count;

    SELECT COUNT(DISTINCT CASE WHEN status = '準時' THEN personnel_id END),
           COUNT(DISTINCT CASE WHEN status = '遲到' THEN personnel_id END)
    INTO on_time_count, late_count
    FROM public.check_in_records
    WHERE event_id = p_event_id AND success = TRUE AND action_type = '簽到' AND personnel_id IS NOT NULL;
    on_time_count := COALESCE(on_time_count, 0);
    late_count := COALESCE(late_count, 0);

    attendance_rate := CASE WHEN expected_attendee_count > 0 THEN (attended_count::numeric / expected_attendee_count) * 100 ELSE 0 END;
    on_time_rate := CASE WHEN attended_count > 0 THEN (on_time_count::numeric / attended_count) * 100 ELSE 0 END;

    -- 生成 attendees list (只包含在預期參與者範圍內的人員)
    SELECT jsonb_agg(
        jsonb_build_object(
            'personnel_id', p.id,
            'name', p.name,
            'code', p.code,
            'status',
                CASE
                    WHEN cr_checkin.status = '準時' THEN '準時'
                    WHEN cr_checkin.status = '遲到' THEN '遲到'
                    WHEN event_info.participant_scope = 'SPECIFIC' AND ep.personnel_id IS NULL THEN '未簽到 (指定參與者)' -- For specific participants not checked in
                    WHEN event_info.participant_scope = 'ALL' AND cr_checkin.personnel_id IS NULL THEN '未簽到' -- For all participants not checked in
                    ELSE '未簽到'
                END,
            'check_in_time', cr_checkin.created_at,
            'check_out_time', cr_checkout.created_at
        ) ORDER BY p.name ASC
    )
    INTO attendees_list
    FROM public.personnel p
    LEFT JOIN LATERAL (
        SELECT created_at, status, personnel_id
        FROM public.check_in_records
        WHERE personnel_id = p.id AND event_id = p_event_id AND action_type = '簽到' AND success = TRUE
        ORDER BY created_at ASC
        LIMIT 1
    ) AS cr_checkin ON TRUE
    LEFT JOIN LATERAL (
        SELECT created_at
        FROM public.check_in_records
        WHERE personnel_id = p.id AND event_id = p_event_id AND action_type = '簽退' AND success = TRUE
        ORDER BY created_at DESC
        LIMIT 1
    ) AS cr_checkout ON TRUE
    LEFT JOIN public.event_participants ep ON p.id = ep.personnel_id AND ep.event_id = p_event_id
    WHERE
        (event_info.participant_scope = 'ALL') OR
        (event_info.participant_scope = 'SPECIFIC' AND ep.personnel_id IS NOT NULL); -- 只包含在 event_participants 中的人員

    WITH time_series AS (SELECT generate_series(date_trunc('minute', event_info.start_time) - INTERVAL '1 hour', date_trunc('minute', COALESCE(event_info.end_time, event_info.start_time + INTERVAL '2 hours')) + INTERVAL '1 hour', INTERVAL '5 minutes') AS interval_start),
    cumulative_checkins AS (SELECT ts.interval_start AS time, COUNT(DISTINCT cr.personnel_id) AS checkin_count FROM time_series ts LEFT JOIN public.check_in_records cr ON cr.event_id = p_event_id AND cr.action_type = '簽到' AND cr.success = TRUE AND cr.created_at <= ts.interval_start GROUP BY ts.interval_start ORDER BY ts.interval_start)
    SELECT jsonb_agg(row_to_json(cc)) INTO timeline_data FROM cumulative_checkins cc;

    RETURN jsonb_build_object(
        'summary', jsonb_build_object('expectedCount', expected_attendee_count, 'attendedCount', attended_count, 'absentCount', absent_count, 'onTimeCount', on_time_count, 'lateCount', late_count, 'attendanceRate', attendance_rate, 'onTimeRate', on_time_rate),
        'attendees', COALESCE(attendees_list, '[]'::jsonb),
        'charts', jsonb_build_object('status', jsonb_build_object('onTime', on_time_count, 'late', late_count, 'absent', absent_count), 'timeline', COALESCE(timeline_data, '[]'::jsonb))
    );
END;
$$;
COMMENT ON FUNCTION public.get_event_dashboard_data(uuid) IS '獲取指定活動的儀錶板數據，能根據活動設定計算應到人數。';


-- ========= 5. 啟用 RLS 並定義安全策略 =========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY; -- [NEW] Enable RLS for event_participants

-- --- 策略: profiles ---
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
CREATE POLICY "Allow users to read their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow admin to manage all profiles_select" ON public.profiles;
CREATE POLICY "Allow admin to manage all profiles_select" ON public.profiles FOR SELECT USING (public.user_has_permission(auth.uid(), 'accounts:manage_users'));
DROP POLICY IF EXISTS "Allow admin to manage all profiles_insert" ON public.profiles;
CREATE POLICY "Allow admin to manage all profiles_insert" ON public.profiles FOR INSERT WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage_users'));
DROP POLICY IF EXISTS "Allow admin to manage all profiles_update" ON public.profiles;
CREATE POLICY "Allow admin to manage all profiles_update" ON public.profiles FOR UPDATE USING (public.user_has_permission(auth.uid(), 'accounts:manage_users')) WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage_users'));
DROP POLICY IF EXISTS "Allow admin to manage all profiles_delete" ON public.profiles;
CREATE POLICY "Allow admin to manage all profiles_delete" ON public.profiles FOR DELETE USING (public.user_has_permission(auth.uid(), 'accounts:manage_users'));

-- --- 策略: personnel ---
DROP POLICY IF EXISTS "Allow authorized users to read personnel" ON public.personnel;
CREATE POLICY "Allow authorized users to read personnel" ON public.personnel FOR SELECT USING (public.user_has_permission(auth.uid(), 'personnel:read'));
DROP POLICY IF EXISTS "Allow authorized users to create personnel" ON public.personnel;
CREATE POLICY "Allow authorized users to create personnel" ON public.personnel FOR INSERT WITH CHECK (public.user_has_permission(auth.uid(), 'personnel:create'));
DROP POLICY IF EXISTS "Allow authorized users to update personnel" ON public.personnel;
CREATE POLICY "Allow authorized users to update personnel" ON public.personnel FOR UPDATE USING (public.user_has_permission(auth.uid(), 'personnel:update')) WITH CHECK (public.user_has_permission(auth.uid(), 'personnel:update'));
DROP POLICY IF EXISTS "Allow authorized users to delete personnel" ON public.personnel;
CREATE POLICY "Allow authorized users to delete personnel" ON public.personnel FOR DELETE USING (public.user_has_permission(auth.uid(), 'personnel:delete'));

-- --- 策略: events ---
DROP POLICY IF EXISTS "Allow authenticated users to read events" ON public.events;
CREATE POLICY "Allow authenticated users to read events" ON public.events FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authorized users to create events" ON public.events;
CREATE POLICY "Allow authorized users to create events" ON public.events FOR INSERT WITH CHECK (public.user_has_permission(auth.uid(), 'events:create'));
DROP POLICY IF EXISTS "Allow authorized users to update events" ON public.events;
CREATE POLICY "Allow authorized users to update events" ON public.events FOR UPDATE USING (public.user_has_permission(auth.uid(), 'events:update')) WITH CHECK (public.user_has_permission(auth.uid(), 'events:update'));
DROP POLICY IF EXISTS "Allow authorized users to delete events" ON public.events;
CREATE POLICY "Allow authorized users to delete events" ON public.events FOR DELETE USING (public.user_has_permission(auth.uid(), 'events:delete'));

-- --- 策略: check_in_records ---
DROP POLICY IF EXISTS "Allow authorized users to read records" ON public.check_in_records;
CREATE POLICY "Allow authorized users to read records" ON public.check_in_records FOR SELECT USING (public.user_has_permission(auth.uid(), 'records:view'));
DROP POLICY IF EXISTS "Allow authorized users to create records" ON public.check_in_records;
CREATE POLICY "Allow authorized users to create records" ON public.check_in_records FOR INSERT WITH CHECK (public.user_has_permission(auth.uid(), 'records:create'));
DROP POLICY IF EXISTS "Allow authorized users to delete records" ON public.check_in_records;
CREATE POLICY "Allow authorized users to delete records" ON public.check_in_records FOR DELETE USING (public.user_has_permission(auth.uid(), 'records:delete'));

-- --- 策略: audit_logs ---
DROP POLICY IF EXISTS "Allow admin to read audit logs" ON public.audit_logs;
CREATE POLICY "Allow admin to read audit logs" ON public.audit_logs FOR SELECT USING (public.user_has_permission(auth.uid(), 'accounts:manage'));
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated users to insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- --- 策略: roles, permissions, role_permissions ---
DROP POLICY IF EXISTS "Allow admins to manage roles" ON public.roles;
CREATE POLICY "Allow admins to manage roles" ON public.roles FOR ALL USING (public.user_has_permission(auth.uid(), 'accounts:manage')) WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage'));
DROP POLICY IF EXISTS "Allow admins to manage permissions" ON public.permissions;
CREATE POLICY "Allow admins to manage permissions" ON public.permissions FOR ALL USING (public.user_has_permission(auth.uid(), 'accounts:manage')) WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage'));
DROP POLICY IF EXISTS "Allow admins to manage role_permissions" ON public.role_permissions;
CREATE POLICY "Allow admins to manage role_permissions" ON public.role_permissions FOR ALL USING (public.user_has_permission(auth.uid(), 'accounts:manage')) WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage'));

-- [NEW] --- 策略: event_participants ---
CREATE POLICY "Allow authorized users to manage event participants" ON public.event_participants FOR ALL
USING (public.user_has_permission(auth.uid(), 'events:update'))
WITH CHECK (public.user_has_permission(auth.uid(), 'events:update'));


-- 如果所有步驟都成功，提交事務
COMMIT;

-- 如果在測試過程中遇到錯誤，可以使用以下命令回滾所有變更：
-- ROLLBACK
