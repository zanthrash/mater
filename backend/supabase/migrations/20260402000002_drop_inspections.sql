-- Drop policies first
DROP POLICY IF EXISTS "service_role_all" ON inspections;

-- Drop the inspections table
DROP TABLE IF EXISTS inspections;

-- Remove the PDF storage bucket policies (bucket left in place — Supabase
-- triggers prevent direct deletion from storage.buckets in migrations)
DROP POLICY IF EXISTS "public_read_inspection_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "service_upload_inspection_pdfs" ON storage.objects;
