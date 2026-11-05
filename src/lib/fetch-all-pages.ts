type PageResult<T> = { data: T[] | null; error: unknown };

/**
 * PostgREST tek yanıtta en fazla `max_rows` satır döner ve fazlasını hata vermeden keser.
 * Sayfa, sunucu sınırından kısa gelebileceği için döngü ancak boş sayfada biter.
 * `fetchPage` içindeki sorgunun sıralaması benzersiz bir kolonla bitmelidir.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    const { data, error } = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) return rows;
    rows.push(...data);
  }
}
