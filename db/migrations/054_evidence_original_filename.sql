-- Add original filename column to evidence_files table
-- This will store the user-provided filename instead of just the hash-based path

alter table evidence_files 
add column if not exists original_filename text;

-- Update existing records to extract original filename from mime or use a default
update evidence_files 
set original_filename = 
  case 
    when mime like 'image%' then 'resim.' || split_part(file_path, '.', -1)
    when mime like '%pdf%' then 'dokuman.pdf'
    else 'dosya.' || split_part(file_path, '.', -1)
  end
where original_filename is null;