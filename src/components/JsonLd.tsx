/** Renders a JSON-LD structured-data script for SEO rich results. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is static and trusted; this is the standard pattern.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
