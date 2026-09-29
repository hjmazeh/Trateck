// Marketing ads, managed from the staff panel's Ads page (ads/{id} in
// Firestore). Read over Firestore's REST API rather than the SDK so the
// homepage doesn't have to load Firebase just for this; the rules let
// anyone read an ad that's switched on, which is exactly what's queried.
const PROJECT_ID = 'trateck-b9d12';
const API_KEY = 'AIzaSyC6Ir7zcz5-61Ox65NYpeXXUSVfqkF0Ouk';

function decode(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  return null;
}

// Every ad that's switched on and inside its start/end dates, the one that
// started most recently first -- the same rule the staff panel uses to
// show which ad is "on site" for each placement.
export async function loadLiveAds() {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'ads' }],
      where: { fieldFilter: { field: { fieldPath: 'active' }, op: 'EQUAL', value: { booleanValue: true } } },
    } }),
  });
  if (!res.ok) throw new Error('ads ' + res.status);
  const now = Date.now();
  return (await res.json())
    .filter(r => r.document)
    .map(r => {
      const ad = { id: r.document.name.split('/').pop() };
      Object.entries(r.document.fields || {}).forEach(([k, v]) => { ad[k] = decode(v); });
      return ad;
    })
    .filter(ad => !(ad.starts_at && ad.starts_at > now) && !(ad.ends_at && ad.ends_at <= now))
    .sort((a, b) => (b.starts_at || b.created_at || 0) - (a.starts_at || a.created_at || 0));
}

export function pickAd(ads, place) {
  return ads.find(ad => ad[place]) || null;
}

// Both languages as sibling spans, so the page's own EN/ع toggle switches
// them like every other bilingual text. Each falls back to the other
// language when only one was written.
export function bilingual(en, ar) {
  const frag = document.createDocumentFragment();
  const e = document.createElement('span');
  e.className = 'lang-en';
  e.textContent = en || ar || '';
  const a = document.createElement('span');
  a.className = 'lang-ar';
  a.textContent = ar || en || '';
  frag.append(e, a);
  return frag;
}

// Only http(s) links or pages on this site; anything else (javascript:
// and the like) is dropped. External links open in a new tab.
export function applyAdLink(el, url) {
  if (!url) return false;
  const external = /^https?:\/\//i.test(url);
  if (!external && !/^\/?[\w\-./]+(\.html)?([?#][^\s]*)?$/.test(url)) return false;
  el.href = url;
  if (external && !url.startsWith(location.origin)) {
    el.target = '_blank';
    el.rel = 'noopener';
  }
  return true;
}
