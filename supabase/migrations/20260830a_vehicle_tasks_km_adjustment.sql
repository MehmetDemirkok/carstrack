-- ============================================================================
-- KM Farkı Kapatma
-- Yöneticinin, sürücüler tarafından görev üzerinden hiç kaydedilmemiş
-- kilometre farkını (KM açığını) manuel olarak kapatabilmesi için
-- vehicle_tasks kayıtlarını normal seyahatlerden ayırt eden bayrak.
-- RLS: mevcut "vehicle_tasks_manager_all" politikası (manager+operator,
-- FOR ALL) bu kayıtların insert edilmesi için de yeterli — ek politika
-- gerekmiyor.
-- ============================================================================

ALTER TABLE public.vehicle_tasks
  ADD COLUMN IF NOT EXISTS is_adjustment boolean NOT NULL DEFAULT false;
