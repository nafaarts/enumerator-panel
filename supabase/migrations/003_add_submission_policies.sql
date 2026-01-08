-- Allow authenticated users (admins) to insert/update/delete submissions
-- In a real app, enumerators might use a different mechanism, but for the dashboard/seeding, we need this.

create policy "Allow admin insert submissions" on submissions for insert with check (auth.role() = 'authenticated');
create policy "Allow admin update submissions" on submissions for update using (auth.role() = 'authenticated');
create policy "Allow admin delete submissions" on submissions for delete using (auth.role() = 'authenticated');
