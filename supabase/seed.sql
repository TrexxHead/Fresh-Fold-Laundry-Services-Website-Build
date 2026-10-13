insert into public.business_settings (business_name, phone_display, email, instagram_url, contact_verified, settings)
values ('FreshFold Laundry Company Ltd','876-223-6339','freshfoldlaundryjm@gmail.com','https://instagram.com/freshfoldlaundry.jm',false,'{"currency":"JMD","subscriptionCheckout":false,"expressService":false}'::jsonb)
on conflict (id) do nothing;

insert into public.terms_versions (document_type,version,body_markdown,status)
values ('TERMS','0.1-draft','OWNER ACTION: replace with legally reviewed full Terms.','DRAFT'),
       ('PRIVACY','0.1-draft','OWNER ACTION: replace with legally reviewed Privacy Notice and retention schedule.','DRAFT')
on conflict do nothing;

-- Catalogue values are also represented in src/lib/catalogue.ts for the review build.
-- Production seeding should use a checked migration that snapshots each confirmed price version.
