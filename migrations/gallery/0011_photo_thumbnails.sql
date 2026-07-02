-- Optional ~512px grid variant stored alongside the full-size R2 object.
-- NULL for legacy rows; image routes fall back to the full object.
ALTER TABLE gallery_photos ADD COLUMN thumb_object_key TEXT;
