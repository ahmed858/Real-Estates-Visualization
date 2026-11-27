// Link to a map search for the project's coordinates. A plain link: no map
// library, no API key, and nothing is loaded until the visitor clicks.

export interface MapPoint {
  lat: number;
  lng: number;
}

const MAPS_SEARCH = "https://www.google.com/maps/search/?api=1&query=";

/**
 * Google Maps search URL for a point, e.g. `...?api=1&query=30.0444,31.2357`.
 * Numbers need no escaping, so the comma stays readable.
 */
export function mapsSearchUrl({ lat, lng }: MapPoint): string {
  return `${MAPS_SEARCH}${lat},${lng}`;
}
