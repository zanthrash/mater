-- Drop policies first
DROP POLICY IF EXISTS "service_role_all" ON inspections;

-- Drop the inspections table
DROP TABLE IF EXISTS inspections;

-- Remove the PDF storage bucket
DELETE FROM storage.buckets WHERE id = 'inspection-pdfs';
