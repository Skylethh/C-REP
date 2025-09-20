-- Upgrade daily_logs.photos structure to include original filenames
-- Convert from string[] to object[] with path and original_name fields

-- Add migration to convert existing photos array to new structure
-- This will preserve existing paths and generate reasonable names

DO $$
DECLARE
    log_record RECORD;
    photo_path TEXT;
    new_photos JSONB;
    photo_obj JSONB;
    original_name TEXT;
BEGIN
    -- Loop through all daily_logs that have photos
    FOR log_record IN 
        SELECT id, photos 
        FROM daily_logs 
        WHERE photos IS NOT NULL 
        AND jsonb_array_length(photos) > 0
    LOOP
        new_photos := '[]'::jsonb;
        
        -- Process each photo path in the array
        FOR photo_path IN 
            SELECT jsonb_array_elements_text(log_record.photos)
        LOOP
            -- Extract original filename from path or generate a reasonable one
            original_name := split_part(photo_path, '/', -1);
            
            -- If it's just a hash.ext, make it more user-friendly
            IF original_name ~ '^[a-f0-9]{64}\.' THEN
                original_name := 'foto.' || split_part(original_name, '.', -1);
            END IF;
            
            -- Create the new photo object
            photo_obj := json_build_object(
                'path', photo_path,
                'original_name', original_name
            )::jsonb;
            
            -- Add to the new photos array
            new_photos := new_photos || jsonb_build_array(photo_obj);
        END LOOP;
        
        -- Update the record with the new structure
        UPDATE daily_logs 
        SET photos = new_photos 
        WHERE id = log_record.id;
    END LOOP;
END $$;