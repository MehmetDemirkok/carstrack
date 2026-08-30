export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  // "</script>" enjeksiyonuna karşı: JSON.stringify çıktısı ham haliyle bir
  // </script> içerirse (ör. ileride dinamik bir alan eklenirse) tarayıcı script
  // etiketini erken kapatabilir. "<" karakterini kaçırmak JSON-LD anlamını
  // değiştirmez (application/ld+json HTML olarak parse edilmez).
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
