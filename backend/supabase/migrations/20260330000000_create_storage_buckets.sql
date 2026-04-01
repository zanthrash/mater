-- Create storage buckets for inspection photos and PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('inspection-photos', 'inspection-photos', true),
  ('inspection-pdfs', 'inspection-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to inspection photos
CREATE POLICY "public_read_inspection_photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'inspection-photos');

-- Allow service role to upload inspection photos
CREATE POLICY "service_upload_inspection_photos" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'inspection-photos');

-- Allow public read access to inspection PDFs
CREATE POLICY "public_read_inspection_pdfs" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'inspection-pdfs');

-- Allow service role to upload inspection PDFs
CREATE POLICY "service_upload_inspection_pdfs" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'inspection-pdfs');
