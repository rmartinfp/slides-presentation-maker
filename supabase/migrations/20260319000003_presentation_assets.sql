-- Create presentation-assets bucket (public, for user-uploaded images)
insert into storage.buckets (id, name, public)
values ('presentation-assets', 'presentation-assets', true)
on conflict do nothing;

-- Allow public read access
create policy "Public read presentation-assets" on storage.objects
  for select using (bucket_id = 'presentation-assets');

-- Allow authenticated users to upload
create policy "Auth upload presentation-assets" on storage.objects
  for insert with check (bucket_id = 'presentation-assets');

-- Allow authenticated users to update their uploads
create policy "Auth update presentation-assets" on storage.objects
  for update using (bucket_id = 'presentation-assets');

-- Allow authenticated users to delete their uploads
create policy "Auth delete presentation-assets" on storage.objects
  for delete using (bucket_id = 'presentation-assets');
