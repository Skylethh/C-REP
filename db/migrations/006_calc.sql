-- Calculation schema

create table if not exists units (
  code text primary key
);

create table if not exists unit_conversions (
  from_unit text references units(code) on delete cascade,
  to_unit text references units(code) on delete cascade,
  multiplier numeric not null,
  primary key (from_unit, to_unit)
);

create table if not exists emission_factors (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- energy, transport, materials, other
  scope text, -- scope1/2/3
  region text default 'global',
  unit_in text not null references units(code),
  unit_out text not null references units(code), -- usually kg
  value numeric not null,
  source text,
  version text,
  valid_from date,
  valid_to date
);

create index if not exists idx_factors_category on emission_factors(category);


