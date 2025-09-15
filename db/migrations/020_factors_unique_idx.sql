-- Ensure a unique index for upsert match on emission_factors
-- This satisfies ON CONFLICT (category,region,valid_from)
create unique index if not exists ux_emission_factors_ctx
  on emission_factors (category, region, valid_from);


