-- Migration to convert legacy form schemas (flat fields) to section-based schemas

UPDATE forms
SET schema = jsonb_build_object(
  'sections', jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(),
      'title', 'Default Section',
      'description', 'Imported from legacy format',
      'fields', schema->'fields'
    )
  )
)
WHERE schema->>'sections' IS NULL 
  AND schema->>'fields' IS NOT NULL;
