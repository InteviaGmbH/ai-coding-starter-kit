-- Bug fix: candidate-documents was created (20260725120000_init_schema.sql)
-- without an explicit file_size_limit/allowed_mime_types, so uploads were
-- only bounded by the project-wide Storage default — which can differ
-- from the 10 MB / PDF-JPEG-PNG limit the client (CandidateDocumentCard)
-- actually enforces and communicates to the user. A file that passes the
-- client-side 10 MB check but exceeds the project default still got
-- rejected server-side with a 400, and the two limits could silently
-- drift apart in either direction. Pin the bucket's own limit to match
-- the client exactly, so client and server are always in sync
-- regardless of the project-wide default.

update storage.buckets
set file_size_limit = 10485760, -- 10 MB, matches CandidateDocumentCard's MAX_FILE_SIZE_BYTES
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'candidate-documents';
