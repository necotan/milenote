-- クライアントの stripImageMetadata と同じ条件（image/jpeg・5MB以下）をバケット側でも強制する

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg']
WHERE id = 'cars';
