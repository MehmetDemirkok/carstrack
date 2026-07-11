-- Servis kaydı masrafı için ödeme durumu takibi.
-- payment_status yalnızca cost girildiğinde anlamlıdır (uygulama tarafında
-- zorunlu tutulur, DB'de cost'a bağlı zorunluluk yok — nullable geçiş kolaylığı için).
-- Ödenmedi seçilince kullanıcı sebep yazar (unpaid_reason).
ALTER TABLE public.service_records
  ADD COLUMN IF NOT EXISTS payment_status text NULL
    CHECK (payment_status IS NULL OR payment_status IN ('paid', 'unpaid')),
  ADD COLUMN IF NOT EXISTS unpaid_reason text NULL;
