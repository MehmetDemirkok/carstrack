alter table vehicles
  add column if not exists green_card_company text,
  add column if not exists green_card_expiry date;
