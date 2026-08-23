-- ============================================================================
-- Geri bildirim durumu değişince gönderen kullanıcıya bildirim (Feedback → Zil)
--
-- Uygulamada geri bildirim yönetimi için ayrı bir yönetici ekranı yok — durum
-- (new → seen → resolved) doğrudan Supabase üzerinden güncelleniyor. Bu yüzden
-- API route yerine bir DB trigger ile çözülüyor: kaynak ne olursa olsun
-- (dashboard, SQL, ileride eklenecek bir yönetim ekranı) status değiştiğinde
-- gönderen kullanıcıya uygulama içi (zil) bildirim düşer.
--
-- private.get_auth_role() (20260614b) ile aynı desen: PostgREST'in RPC olarak
-- açığa çıkarmaması için fonksiyon private şemada — advisor 0028/0029.
-- Yalnızca zil kanalı — push/e-posta için http çağrısı gerektirir (pg_net),
-- kapsam dışı bırakıldı.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.notify_feedback_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_title text;
  v_body text;
BEGIN
  IF NEW.status = 'seen' THEN
    v_title := 'Geri Bildiriminiz Görüldü';
    v_body := 'Gönderdiğiniz geri bildirim incelendi, en kısa sürede değerlendirilecek.';
  ELSIF NEW.status = 'resolved' THEN
    v_title := 'Geri Bildiriminiz Çözüldü';
    v_body := 'Gönderdiğiniz geri bildirim değerlendirildi ve sonuçlandırıldı. İlginiz için teşekkürler!';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (company_id, user_id, type, title, body, severity, meta)
  VALUES (
    NEW.company_id,
    NEW.user_id,
    'feedback_status',
    v_title,
    v_body,
    'info',
    jsonb_build_object('feedbackId', NEW.id, 'fromStatus', OLD.status, 'toStatus', NEW.status)
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_feedback_status_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS feedback_status_notify ON public.feedback;
CREATE TRIGGER feedback_status_notify
  AFTER UPDATE OF status ON public.feedback
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION private.notify_feedback_status_change();
