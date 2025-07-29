-- ===================================================================
--            報到管理系統 - 全新資料庫結構與 RBAC 權限系統
-- ===================================================================
-- 作者: Hong & Gemini
-- 描述: 這個 SQL 腳本用於建立一個全新的資料庫。它包含了所有核心
--       應用程式資料表以及一個完整的基於角色的存取控制 (RBAC) 系統，
--       確保資料的完整性、安全性與操作靈活性。
-- ===================================================================

-- ========= 1. 核心 RBAC 資料表建立 =========
-- 建立儲存所有角色的資料表
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE, -- 角色的唯一名稱, e.g., 'admin', 'operator'
    description text NULL,     -- 角色描述
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.roles IS '儲存應用程式中的所有使用者角色';

-- 建立儲存所有權限的資料表
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE, -- 權限的唯一代碼, e.g., 'personnel:create', 'personnel:read'
    description text NULL,     -- 權限描述
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.permissions IS '儲存系統中所有可用的操作權限';

-- 建立角色與權限的關聯表 (多對多關係)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
    CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.role_permissions IS '將權限指派給角色的中介資料表';


-- ========= 2. 應用程式核心資料表建立 =========

-- 建立 'personnel' (人員) 資料表
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
COMMENT ON TABLE public.personnel IS '儲存所有可報到人員的基本資料';

-- 建立 'profiles' (使用者設定檔) 資料表 (已整合 RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  nickname text NULL,
  role_id uuid NULL, -- 關聯到 roles 表
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.profiles IS '儲存應用程式使用者的額外資訊，如角色和暱稱';
COMMENT ON COLUMN public.profiles.role_id IS '關聯到 roles 資料表的使用者角色 ID';

-- 建立 'events' (活動) 資料表
CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NULL,
  created_by uuid NULL,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.events IS '儲存所有活動的資訊';

-- 建立 'check_in_records' (報到記錄) 資料表
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
  CONSTRAINT check_in_records_pkey PRIMARY KEY (id),
  CONSTRAINT check_in_records_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL,
  CONSTRAINT check_in_records_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.check_in_records IS '儲存所有報到和簽退的詳細記錄';

-- 建立 'audit_logs' (稽核日誌) 資料表
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


-- ========= 3. 自動化與輔助函數 =========

-- 當新使用者註冊時，自動在 profiles 表中建立對應資料
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- 找到 'operator' 角色的 ID
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'operator';
  -- 插入新使用者資料，並設定預設角色
  INSERT INTO public.profiles (id, email, nickname, role_id)
  VALUES (NEW.id, NEW.email, NEW.email, default_role_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立觸發器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 權限檢查輔助函數 (用於 RLS)
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


-- ========= 4. 啟用 RLS 並定義安全策略 =========

-- 啟用所有資料表的 RLS
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


-- ========= 5. 初始資料填充 =========
-- 使用 ON CONFLICT DO NOTHING 確保重複執行此腳本時不會出錯

-- --- 插入角色 ---
INSERT INTO public.roles (name, description) VALUES
('admin', '管理員，擁有所有權限'),
('sdc', '宿委會，擁有大部分管理權限'),
('operator', '操作員，僅能進行報到和查看記錄'),
('sdsc', '宿服，僅能查看報表和總覽')
ON CONFLICT (name) DO NOTHING;

-- --- 插入權限 ---
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

-- --- 為各角色指派權限 ---
-- admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT (SELECT id FROM public.roles WHERE name = 'admin'), p.id FROM public.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- sdc
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT (SELECT id FROM public.roles WHERE name = 'sdc'), p.id FROM public.permissions p WHERE p.name <> 'accounts:manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- operator
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT (SELECT id FROM public.roles WHERE name = 'operator'), p.id FROM public.permissions p WHERE p.name IN (
    'overview:view', 'checkin:use', 'personnel:read', 'records:create', 'records:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- sdsc
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT (SELECT id FROM public.roles WHERE name = 'sdsc'), p.id FROM public.permissions p WHERE p.name IN (
    'overview:view', 'reports:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ===================================================================
--                      腳本執行結束
-- ===================================================================
