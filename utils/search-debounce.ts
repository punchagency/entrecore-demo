type SearchResult = {
  field: string;
  value: string;
};

interface GlossaryEntry {
  [key: string]: string | number | Date;
}

const EXCLUDED_FIELDS = ["external_company_id", "id", "created_at", "updated_at"];

export const filterData = (
  query: string,
  data: GlossaryEntry[] | undefined,
  callback: (results: SearchResult[]) => void
) => {
  if (!query || !data) {
    callback([]);
    return;
  }

  requestAnimationFrame(() => {
    const results = new Set<string>();
    const lowerQuery = query.toLowerCase();

    data.forEach((item) => {
      Object.entries(item).forEach(([field, value]) => {
        if (
          !EXCLUDED_FIELDS.includes(field) &&
          typeof value === "string" &&
          value.toLowerCase().includes(lowerQuery)
        ) {
          results.add(JSON.stringify({ field, value }));
        }
      });
    });

    callback(Array.from(results).map(item => JSON.parse(item)));
  });
};

const searchDebounce = <T extends any[]>(fn: (...args: T) => void, delay: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: T) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

export default searchDebounce;