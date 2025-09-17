-- Extend units to cover construction baseline library
insert into units(code) values
  ('m'),      -- metre
  ('t'),      -- ton
  ('ton_km'), -- ton-km transport work
  ('piece'),  -- adet (generic piece)
  ('trip')    -- sefer (trip)
on conflict do nothing;
