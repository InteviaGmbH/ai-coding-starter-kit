-- QA fix (BUG-10): the spec requires the candidate document card to show
-- the upload date alongside the download link, but nothing tracked when
-- cv_document_path was last set. candidates.updated_date is not a
-- substitute — it's bumped by any change to the row (name, availability,
-- skills, ...), not just a document replace, so it would show a
-- misleading "just uploaded" date after an unrelated edit.

alter table candidates
  add column cv_uploaded_at timestamptz;
