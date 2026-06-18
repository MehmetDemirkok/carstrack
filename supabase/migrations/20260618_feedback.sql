-- ============================================================================
-- Kullanıcı Geri Bildirimleri (Feedback)
--
-- Tüm kullanıcılar (manager/operator/user) uygulama hakkında hata, öneri veya
-- genel geri bildirim gönderebilir. Geri bildirimler şirket bazlı saklanır;
-- uygulama sahibi tümünü service-role ile (Supabase panelinden) görebilir.
--
-- vehicle_reports ile aynı (birleştirilmiş) RLS desenini izler:
--   public.get_auth_company_id() + private.get_auth_role().
-- Çoklu permissive politika uyarısından kaçınmak için komut başına tek politika.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  type        text        NOT NULL DEFAULT 'other'
              CHECK (type IN ('bug','suggestion','other')),
  message     text        NOT NULL DEFAULT '',
  page_url    text        NOT NULL DEFAULT '',
  user_agent  text        NOT NULL DEFAULT '',
  status      text        NOT NULL DEFAULT 'new'
              CHECK (status IN ('new','seen','resolved')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_company_idx    ON public.feedback (company_id);
CREATE INDEX IF NOT EXISTS feedback_user_idx       ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS feedback_status_idx     ON public.feedback (status);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback (created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_select" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert" ON public.feedback;
DROP POLICY IF EXISTS "feedback_update" ON public.feedback;
DROP POLICY IF EXISTS "feedback_delete" ON public.feedback;

-- SELECT: yöneticiler/operatörler şirketin tümünü; üyeler kendi kayıtlarını okur
CREATE POLICY "feedback_select"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (
    ((company_id = (SELECT public.get_auth_company_id()))
      AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
    OR ((company_id = (SELECT public.get_auth_company_id()))
      AND (user_id = (SELECT auth.uid())))
  );

-- INSERT: yöneticiler/operatörler veya kendi adına oluşturan üye
CREATE POLICY "feedback_insert"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    ((company_id = (SELECT public.get_auth_company_id()))
      AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
    OR ((company_id = (SELECT public.get_auth_company_id()))
      AND (user_id = (SELECT auth.uid())))
  );

-- UPDATE: yalnızca yöneticiler/operatörler (durum ilerletme)
CREATE POLICY "feedback_update"
  ON public.feedback FOR UPDATE
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  )
  WITH CHECK (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );

-- DELETE: yalnızca yöneticiler/operatörler
CREATE POLICY "feedback_delete"
  ON public.feedback FOR DELETE
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );
