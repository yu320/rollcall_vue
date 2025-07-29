-- ===================================================================
--            報到管理系統 - 現有資料庫修改與資料遷移腳本
-- ===================================================================
-- 作者: Hong & Gemini
-- 描述: 這個 SQL 腳本用於修改您現有的資料庫結構以匹配新的設計，
--       並嘗試保留所有舊有資料，同時填充新的基礎數據。
--
-- **此腳本設計為通用型：**
-- - 如果資料表或欄位不存在，它將會建立。
-- - 如果資料表或欄位已存在，它會嘗試修改或確保其符合新架構。
-- - 初始數據的填充也會檢查是否已存在，避免重複插入。
--   這使得腳本無論是在全新資料庫或現有資料庫上執行，都能安全地達成目標。
-- ===================================================================

-- 啟動一個事務，確保所有操作的原子性
BEGIN;

-- 1. 建立新的 RBAC (Role-Based Access Control) 資料表
--    這些表假定為全新，如果已存在，則不會重新建立。
--    Supabase 的 `public` schema 是預設的，所以通常不需要指定 `public.`
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


-- 2. 修改現有的應用程式核心資料表 (ALTER TABLE)

-- 2.1 修改 `personnel` (人員) 資料表
--     首先，確保 personnel 表存在，如果不存在則創建它，包括所有新欄位和約束。
CREATE TABLE IF NOT EXISTS public.personnel (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  code text NOT NULL,
  card_number text NOT NULL,
  building text NULL,
  tags text[] NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT personnel_pkey PRIMARY KEY (id),
  CONSTRAINT personnel_card_number_key UNIQUE (card_number),
  CONSTRAINT personnel_code_key UNIQUE (code)
);
COMMENT ON TABLE public.personnel IS '儲存所有可報到人員的基本資料'; -- 如果表是新創建的，這會應用註釋

-- 然後，處理可能需要修改現有表的欄位和約束（針對已存在的表）
DO $$
BEGIN
    -- 對於現有的資料，確保 updated_at 被填充並且 NOT NULL
    -- 這處理了在 updated_at 欄位添加或預設值設定之前就存在的表
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'updated_at' AND is_nullable = 'YES') THEN
        UPDATE public.personnel SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
        ALTER TABLE public.personnel ALTER COLUMN updated_at SET NOT NULL;
        ALTER TABLE public.personnel ALTER COLUMN updated_at SET DEFAULT now();
    END IF;

    -- 對於現有的資料，確保 name, code, card_number 為 NOT NULL
    -- (CREATE TABLE IF NOT EXISTS 語句已經為新表處理了這些約束)
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

    -- 如果 'tags' 欄位在舊表存在但不是 text[] 類型，或需要添加註釋
    -- (此處假設 CREATE TABLE IF NOT EXISTS 已處理，僅為示範舊的邏輯可以放在這裡)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'tags') THEN
        ALTER TABLE public.personnel ADD COLUMN tags text[] NULL;
        COMMENT ON COLUMN public.personnel.tags IS '人員的標籤，用陣列儲存';
    END IF;

END $$;


-- 2.2 修改 `profiles` (使用者設定檔) 資料表
--     首先，確保 profiles 表存在，如果不存在則創建它，包括所有新欄位和約束。
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  nickname text NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.profiles IS '儲存應用程式使用者的額外資訊，如角色和暱稱';

-- 然後，處理可能需要修改現有表的欄位和約束（針對已存在的表）
DO $$
DECLARE
    default_role_id uuid;
BEGIN
    -- 獲取 'operator' 角色的 ID，用於設定預設值
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'operator';

    -- 添加 `role_id` 欄位 (如果不存在)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role_id') THEN
        ALTER TABLE public.profiles ADD COLUMN role_id uuid NULL;
        COMMENT ON COLUMN public.profiles.role_id IS '關聯到 roles 資料表的使用者角色 ID';

        -- 為現有 `profiles` 記錄設定預設的 `role_id`
        UPDATE public.profiles SET role_id = default_role_id WHERE role_id IS NULL;

        -- 添加外鍵約束
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
    END IF;

    -- 確保 `email` 欄位存在且為 NOT NULL (如果 CREATE TABLE IF NOT EXISTS 沒有自動處理)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email' AND is_nullable = 'YES') THEN
        UPDATE public.profiles SET email = auth.users.email FROM auth.users WHERE public.profiles.id = auth.users.id AND public.profiles.email IS NULL;
        ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
    END IF;
END $$;


-- 2.3 修改 `events` (活動) 資料表
--     首先，確保 events 表存在，如果不存在則創建它，包括所有新欄位和約束。
CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NULL,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.events IS '儲存所有活動的資訊';

-- 然後，處理可能需要修改現有表的欄位和約束（針對已存在的表）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'created_by') THEN
        ALTER TABLE public.events ADD COLUMN created_by uuid NULL;
        COMMENT ON COLUMN public.events.created_by IS '創建此活動的使用者 ID';
        -- 如果需要，可以更新現有活動的 created_by 欄位，例如指向一個管理員 ID 或 null
        -- UPDATE public.events SET created_by = (SELECT id FROM public.profiles WHERE email = 'admin@example.com') WHERE created_by IS NULL;

        ALTER TABLE public.events ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- 確保 `name` 和 `start_time` 為 NOT NULL (如果 CREATE TABLE IF NOT EXISTS 沒有自動處理)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'name' AND is_nullable = 'YES') THEN
        UPDATE public.events SET name = COALESCE(name, 'Unnamed Event ' || gen_random_uuid()::text) WHERE name IS NULL;
        ALTER TABLE public.events ALTER COLUMN name SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_time' AND is_nullable = 'YES') THEN
        UPDATE public.events SET start_time = COALESCE(start_time, NOW()) WHERE start_time IS NULL;
        ALTER TABLE public.events ALTER COLUMN start_time SET NOT NULL;
    END IF;

END $$;


-- 2.4 修改 `check_in_records` (報到記錄) 資料表
--     首先，確保 check_in_records 表存在，如果不存在則創建它，包括所有新欄位和約束。
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
  CONSTRAINT check_in_records_pkey PRIMARY KEY (id),
  CONSTRAINT check_in_records_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL,
  CONSTRAINT check_in_records_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.check_in_records IS '儲存所有報到和簽退的詳細記錄';

-- 然後，處理可能需要修改現有表的欄位和約束（針對已存在的表）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'status') THEN
        ALTER TABLE public.check_in_records ADD COLUMN status text NULL;
        COMMENT ON COLUMN public.check_in_records.status IS '報到狀態 (例如：準時、遲到、失敗、簽退成功)';
        -- 為現有記錄設定預設狀態或根據現有數據推斷
        UPDATE public.check_in_records SET status = '未知' WHERE status IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'check_in_records' AND column_name = 'action_type') THEN
        ALTER TABLE public.check_in_records ADD COLUMN action_type text NULL;
        COMMENT ON COLUMN public.check_in_records.action_type IS '操作類型 (簽到/簽退)';
        -- 為現有記錄設定預設操作類型
        UPDATE public.check_in_records SET action_type = '簽到' WHERE action_type IS NULL;
        ALTER TABLE public.check_in_records ALTER COLUMN action_type SET NOT NULL;
        ALTER TABLE public.check_in_records ALTER COLUMN action_type SET DEFAULT '簽到';
    END IF;

    -- 確保 `created_at`, `input`, `input_type`, `success` 為 NOT NULL (如果 CREATE TABLE IF NOT EXISTS 沒有自動處理)
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

END $$;


-- 3. 填充初始資料 (角色與權限)
--    使用 ON CONFLICT DO NOTHING 確保重複執行時不會出錯

-- 3.1 插入角色
INSERT INTO public.roles (name, description) VALUES
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
('accounts:manage', '管理所有使用者帳號')
ON CONFLICT (name) DO NOTHING;

-- 3.3 為各角色指派權限
-- admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- sdc
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'sdc' AND p.name <> 'accounts:manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- operator
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'operator' AND p.name IN (
    'overview:view', 'checkin:use', 'personnel:read', 'records:create', 'records:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- sdsc
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'sdsc' AND p.name IN (
    'overview:view', 'reports:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- NEW: 創建 'super_admin' 角色並賦予所有權限
-- ========= 1. 創建 'super_admin' 角色 =========
-- 插入新的 'super_admin' 角色到 public.roles 資料表
INSERT INTO public.roles (name, description) VALUES
('super_admin', '擁有所有權限的最高管理員，包括角色與權限管理')
ON CONFLICT (name) DO NOTHING; -- 如果角色已存在則不做任何事

-- ========= 2. 賦予所有現有權限給 'super_admin' 角色 =========
-- 這將確保 'super_admin' 角色擁有系統中所有當前和未來定義的權限
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM public.roles WHERE name = 'super_admin'),
    p.id
FROM public.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING; -- 如果權限已賦予則不做任何事


-- 4. 自動化與輔助函數建立
-- 4.1 當新使用者註冊時，自動在 profiles 表中建立對應資料
--     這會為任何在 `auth.users` 中新增的用戶自動在 `public.profiles` 中創建條目並分配預設角色。
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- 找到 'operator' 角色的 ID
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'operator';
  -- 插入新使用者資料，並設定預設角色
  INSERT INTO public.profiles (id, email, nickname, role_id)
  VALUES (NEW.id, NEW.email, NEW.email, default_role_id)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email; -- 如果已有 profile，則更新 email
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立觸發器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4.2 權限檢查輔助函數 (用於 RLS)
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_permission_name text)
RETURNS boolean AS $$
DECLARE
  has_perm boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = (SELECT role_id FROM public.profiles WHERE id = p_user_id)
      AND p.name = p_permission_name
  ) INTO has_perm;
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.user_has_permission(uuid, text) IS '檢查特定使用者是否擁有指定的權限';

-- 4.3 新增的 RPC 函數 (從您的 `api.js` 中推斷)
-- get_daily_record_stats
CREATE OR REPLACE FUNCTION public.get_daily_record_stats()
RETURNS TABLE (created_at timestamptz, total bigint, late bigint, success boolean)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        date_trunc('day', cr.created_at) AS created_at,
        COUNT(cr.id) AS total,
        COUNT(CASE WHEN cr.status = '遲到' THEN 1 ELSE NULL END) AS late,
        cr.success
    FROM
        public.check_in_records cr
    GROUP BY
        date_trunc('day', cr.created_at), cr.success
    ORDER BY
        created_at DESC;
END;
$$;
COMMENT ON FUNCTION public.get_daily_record_stats() IS '獲取每日報到記錄的統計資訊';

-- import_checkin_records_with_personnel_creation
CREATE OR REPLACE FUNCTION public.import_checkin_records_with_personnel_creation(
    records_to_import jsonb[],
    eventid uuid DEFAULT NULL,
    actiontype text DEFAULT '簽到'
)
RETURNS TABLE (success_count int, auto_created_count int, errors text[])
LANGUAGE plpgsql
AS $$
DECLARE
    rec jsonb;
    person_id uuid;
    person_name text;
    person_code text;
    person_card_number text;
    person_input_type text;
    personnel_exists boolean;
    record_status text;
    event_start_time timestamptz;
    event_end_time timestamptz;
    processed_success_count int := 0;
    processed_auto_created_count int := 0;
    processed_errors text[] := ARRAY[]::text[];
BEGIN
    -- 獲取活動時間，如果提供了 eventId
    IF eventid IS NOT NULL THEN
        SELECT start_time, end_time INTO event_start_time, event_end_time
        FROM public.events
        WHERE id = eventid;
    END IF;

    FOR rec IN SELECT * FROM jsonb_array_elements(array_to_jsonb(records_to_import))
    LOOP
        person_name := rec->>'name';
        person_code := rec->>'identifier';
        person_card_number := rec->>'identifier'; -- 假設 identifier 可以是學號或卡號
        person_input_type := rec->>'input_type'; -- 從前端傳遞過來的 input_type

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
        END IF;

        IF person_id IS NULL THEN
            -- 人員不存在，自動創建
            BEGIN
                IF person_input_type = '學號' THEN
                    INSERT INTO public.personnel (name, code, card_number, created_at, updated_at)
                    VALUES (person_name, person_code, gen_random_uuid()::text, NOW(), NOW()) -- 隨機生成卡號
                    RETURNING id INTO person_id;
                ELSIF person_input_type = '卡號' THEN
                    INSERT INTO public.personnel (name, code, card_number, created_at, updated_at)
                    VALUES (person_name, gen_random_uuid()::text, person_card_number, NOW(), NOW()) -- 隨機生成學號
                    RETURNING id INTO person_id;
                ELSE
                    RAISE EXCEPTION '未知的人員識別類型：%', person_input_type;
                END IF;
                
                processed_auto_created_count := processed_auto_created_count + 1;
                personnel_exists := TRUE; -- 標記為已存在
            EXCEPTION
                WHEN unique_violation THEN
                    -- 如果自動創建遇到唯一約束衝突（例如，學號或卡號已存在），則查找並使用現有的人員 ID
                    IF person_input_type = '學號' THEN
                        SELECT id INTO person_id FROM public.personnel WHERE code = person_code;
                    ELSIF person_input_type = '卡號' THEN
                        SELECT id INTO person_id FROM public.personnel WHERE card_number = person_card_number;
                    END IF;
                    personnel_exists := TRUE;
                    RAISE NOTICE '人員自動創建遇到衝突，使用現有記錄。學號/卡號: %', person_code;
                WHEN OTHERS THEN
                    processed_errors := array_append(processed_errors, format('自動創建人員失敗 (%s): %s', SQLERRM));
                    CONTINUE; -- 跳過此記錄
            END;
        END IF;

        -- 確定記錄狀態 (針對簽到)
        IF actiontype = '簽到' THEN
            IF eventid IS NOT NULL THEN
                IF rec->>'timestamp'::timestamptz > COALESCE(event_end_time, event_start_time) THEN
                    record_status := '遲到';
                ELSE
                    record_status := '準時';
                END IF;
            ELSE
                record_status := '成功';
            END IF;
        ELSIF actiontype = '簽退' THEN
            record_status := '簽退成功';
        ELSE
            record_status := '未知狀態'; -- 或者其他處理
        END IF;

        -- 插入報到記錄
        BEGIN
            INSERT INTO public.check_in_records (
                created_at, input, input_type, success, name_at_checkin,
                personnel_id, device_id, event_id, status, action_type
            )
            VALUES (
                rec->>'timestamp'::timestamptz,
                rec->>'identifier',
                person_input_type,
                personnel_exists, -- 如果人員存在，則標記成功
                person_name,
                person_id,
                rec->>'device_id', -- 假設前端會傳 device_id
                eventid,
                record_status,
                actiontype
            );
            processed_success_count := processed_success_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                processed_errors := array_append(processed_errors, format('插入記錄失敗 (%s, %s): %s', person_name, rec->>'identifier', SQLERRM));
        END;
    END LOOP;

    RETURN QUERY SELECT processed_success_count, processed_auto_created_count, processed_errors;
END;
$$;
COMMENT ON FUNCTION public.import_checkin_records_with_personnel_creation(jsonb[], uuid, text) IS '批次匯入簽到記錄，如果人員不存在則自動創建，並根據活動時間計算狀態';


-- get_event_dashboard_data
CREATE OR REPLACE FUNCTION public.get_event_dashboard_data(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    event_info public.events;
    all_personnel_count integer;
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
    -- 1. 獲取活動資訊
    SELECT * INTO event_info FROM public.events WHERE id = p_event_id;

    IF event_info IS NULL THEN
        RAISE EXCEPTION '活動 ID % 不存在', p_event_id;
    END IF;

    -- 2. 計算總應到人數 (所有人員)
    SELECT COUNT(id) INTO all_personnel_count FROM public.personnel;

    -- 3. 獲取該活動的所有簽到記錄中成功簽到的 `personnel_id` (去重)
    SELECT ARRAY_AGG(DISTINCT personnel_id)
    INTO attended_ids
    FROM public.check_in_records
    WHERE event_id = p_event_id AND success = TRUE AND action_type = '簽到' AND personnel_id IS NOT NULL;

    attended_count := array_length(attended_ids, 1);
    absent_count := all_personnel_count - COALESCE(attended_count, 0);

    -- 4. 計算準時和遲到人數
    SELECT
        COUNT(DISTINCT CASE WHEN status = '準時' THEN personnel_id ELSE NULL END),
        COUNT(DISTINCT CASE WHEN status = '遲到' THEN personnel_id ELSE NULL END)
    INTO
        on_time_count,
        late_count
    FROM public.check_in_records
    WHERE event_id = p_event_id AND success = TRUE AND action_type = '簽到' AND personnel_id IS NOT NULL;
    
    -- 確保 on_time_count 和 late_count 非 NULL
    on_time_count := COALESCE(on_time_count, 0);
    late_count := COALESCE(late_count, 0);


    -- 5. 計算參與率和準時率
    attendance_rate := CASE
        WHEN all_personnel_count > 0 THEN (COALESCE(attended_count, 0)::numeric / all_personnel_count) * 100
        ELSE 0
    END;

    on_time_rate := CASE
        WHEN COALESCE(attended_count, 0) > 0 THEN (on_time_count::numeric / COALESCE(attended_count, 0)) * 100
        ELSE 0
    END;

    -- 6. 生成 attendees list
    -- 獲取簽到人員的詳細資訊和簽到簽退時間
    SELECT jsonb_agg(
        jsonb_build_object(
            'personnel_id', p.id,
            'name', p.name,
            'code', p.code,
            'status',
                CASE
                    WHEN cr_checkin.status = '準時' THEN '準時'
                    WHEN cr_checkin.status = '遲到' THEN '遲到'
                    ELSE '未簽到'
                END,
            'check_in_time', cr_checkin.created_at,
            'check_out_time', cr_checkout.created_at
        ) ORDER BY p.name ASC
    )
    INTO attendees_list
    FROM public.personnel p
    LEFT JOIN LATERAL (
        SELECT created_at, status
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
    ) AS cr_checkout ON TRUE;
    
    -- 7. 生成 timeline data
    -- 每 5 分鐘統計一次累積簽到人數
    WITH time_series AS (
        SELECT GENERATE_SERIES(
            date_trunc('minute', event_info.start_time) - INTERVAL '1 hour', -- 從活動開始前1小時開始
            date_trunc('minute', COALESCE(event_info.end_time, event_info.start_time + INTERVAL '2 hours')) + INTERVAL '1 hour', -- 到結束後1小時
            INTERVAL '5 minutes'
        ) AS interval_start
    ),
    cumulative_checkins AS (
        SELECT
            ts.interval_start AS time,
            COUNT(DISTINCT cr.personnel_id) AS checkin_count
        FROM time_series ts
        LEFT JOIN public.check_in_records cr ON
            cr.event_id = p_event_id AND
            cr.action_type = '簽到' AND
            cr.success = TRUE AND
            cr.created_at <= ts.interval_start
        GROUP BY ts.interval_start
        ORDER BY ts.interval_start
    )
    SELECT jsonb_agg(row_to_json(cc))
    INTO timeline_data
    FROM cumulative_checkins cc;

    -- 8. 組裝最終結果
    RETURN jsonb_build_object(
        'summary', jsonb_build_object(
            'expectedCount', all_personnel_count,
            'attendedCount', COALESCE(attended_count, 0),
            'absentCount', COALESCE(absent_count, 0),
            'onTimeCount', COALESCE(on_time_count, 0),
            'lateCount', COALESCE(late_count, 0),
            'attendanceRate', attendance_rate,
            'onTimeRate', on_time_rate
        ),
        'attendees', COALESCE(attendees_list, '[]'::jsonb),
        'charts', jsonb_build_object(
            'status', jsonb_build_object(
                'onTime', COALESCE(on_time_count, 0),
                'late', COALESCE(late_count, 0),
                'absent', COALESCE(absent_count, 0)
            ),
            'timeline', COALESCE(timeline_data, '[]'::jsonb)
        )
    );
END;
$$;
COMMENT ON FUNCTION public.get_event_dashboard_data(uuid) IS '獲取指定活動的儀錶板數據，包括總結、出席人員和圖表數據。';


-- 5. 啟用 RLS 並定義安全策略
--    這會刪除舊的策略並應用新的策略。
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- --- 策略: profiles ---
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
CREATE POLICY "Allow users to read their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admin to manage all profiles" ON public.profiles;
CREATE POLICY "Allow admin to manage all profiles" ON public.profiles FOR ALL
  USING (public.user_has_permission(auth.uid(), 'accounts:manage'))
  WITH CHECK (public.user_has_permission(auth.uid(), 'accounts:manage'));

-- --- 策略: personnel ---
DROP POLICY IF EXISTS "Allow authorized users to manage personnel" ON public.personnel;
CREATE POLICY "Allow authorized users to manage personnel" ON public.personnel FOR ALL
  USING (public.user_has_permission(auth.uid(), 'personnel:read'))
  WITH CHECK (
    (public.user_has_permission(auth.uid(), 'personnel:create')) OR
    (public.user_has_permission(auth.uid(), 'personnel:update')) OR
    (public.user_has_permission(auth.uid(), 'personnel:delete'))
  );

-- --- 策略: events ---
DROP POLICY IF EXISTS "Allow authenticated users to read events" ON public.events;
CREATE POLICY "Allow authenticated users to read events" ON public.events FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authorized users to manage events" ON public.events;
CREATE POLICY "Allow authorized users to manage events" ON public.events FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    (public.user_has_permission(auth.uid(), 'events:create')) OR
    (public.user_has_permission(auth.uid(), 'events:update')) OR
    (public.user_has_permission(auth.uid(), 'events:delete'))
  );

-- --- 策略: check_in_records ---
DROP POLICY IF EXISTS "Allow authorized users to manage records" ON public.check_in_records;
CREATE POLICY "Allow authorized users to manage records" ON public.check_in_records FOR ALL
  USING (public.user_has_permission(auth.uid(), 'records:view'))
  WITH CHECK (
    (public.user_has_permission(auth.uid(), 'records:create')) OR
    (public.user_has_permission(auth.uid(), 'records:delete'))
  );

-- --- 策略: audit_logs ---
DROP POLICY IF EXISTS "Allow admin to read audit logs" ON public.audit_logs;
CREATE POLICY "Allow admin to read audit logs" ON public.audit_logs FOR SELECT
  USING (public.user_has_permission(auth.uid(), 'accounts:manage'));

DROP POLICY IF EXISTS "Disallow direct modification of audit logs" ON public.audit_logs;
CREATE POLICY "Disallow direct modification of audit logs" ON public.audit_logs FOR ALL
  USING (false) WITH CHECK (false);


-- 如果所有步驟都成功，提交事務
COMMIT;

-- 如果在測試過程中遇到錯誤，可以使用以下命令回滾所有變更：
-- ROLLBACK;
