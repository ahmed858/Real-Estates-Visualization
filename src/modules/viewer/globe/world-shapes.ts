// Loads the country shapes once per page (both globe renderers share them).
import { decodeCountries, type CountryShape, type Topology } from "@/modules/domain";

const cache = new Map<string, Promise<CountryShape[]>>();

export function loadCountries(url: string): Promise<CountryShape[]> {
  let loading = cache.get(url);
  if (!loading) {
    loading = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`could not load ${url}: ${r.status}`);
        return r.json() as Promise<Topology>;
      })
      .then((t) => decodeCountries(t));
    loading.catch(() => cache.delete(url));
    cache.set(url, loading);
  }
  return loading;
}
