-- Ensure volume unit exists for concrete activities
insert into units(code) values ('m3') on conflict do nothing;

-- Align concrete activities to use only m3 (no implicit kg conversion)
update activities set units = '{m3}' where key in ('concrete_c20','concrete_c25','concrete_c30');


