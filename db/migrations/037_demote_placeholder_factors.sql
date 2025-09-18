-- Demote placeholder zero-value factors so that real non-zero factors are selected
-- Set their valid_from to an older date, ensuring ORDER BY valid_from DESC picks non-zero ones

update emission_factors
set valid_from = '1900-01-01'
where source = 'seed:placeholder'
  and (valid_from is null or valid_from >= '1900-01-01');

-- Optionally, keep region/category/unit fields as-is; mapping queries will now favor non-zero entries
