alter table vehicles
  add column if not exists kasko_company text,
  add column if not exists kasko_expiry date;
