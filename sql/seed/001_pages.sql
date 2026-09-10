-- Minimal seed for observability.pages.
-- Only the homepage is included to avoid guessing real PDP/PLP/checkout
-- slugs — append the full URL catalog here (or via a proper ingestion job)
-- once it's available. See ARCHITECTURE.md section 12 (open questions).

INSERT INTO observability.pages (page_id, url, label, category)
VALUES ('home', 'https://www.bemol.com.br/', 'Home', 'Home')
ON CONFLICT (page_id) DO NOTHING;
