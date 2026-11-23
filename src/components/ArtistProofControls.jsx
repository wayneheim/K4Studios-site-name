import { useEffect, useState } from 'react';
import { artistProofState, validateArtistProof } from '../data/editionPolicy.js';

export default function ArtistProofControls({ imageId, seriesKey, size, value, disabled = false, onSaved }) {
  const [proof, setProof] = useState(() => artistProofState(value));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setProof(artistProofState(value)); setDirty(false); setError(''); }, [imageId, seriesKey, size, value]);
  const update = patch => { setProof(current => ({ ...current, ...patch })); setDirty(true); setError(''); };
  async function save() {
    setSaving(true);
    try {
      const data = validateArtistProof(proof);
      const response = await fetch(`/.netlify/functions/${seriesKey === 'engrained' ? 'editionState' : 'seriesRegistry'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setArtistProof', imageId, series: seriesKey, data: { tier: seriesKey, size, proof: data } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save AP.');
      setDirty(false); await onSaved?.();
    } catch (error) { setError(error.message); }
    setSaving(false);
  }
  return <fieldset className="mt-2 rounded border border-stone-300 bg-white/70 p-2 text-xs" disabled={disabled || saving}>
    <legend className="font-semibold">Artist’s Proof · 1 reserved</legend>
    <div className="flex flex-wrap items-center gap-2">
      <label><input type="checkbox" checked={Boolean(proof.printed)} onChange={event => update({ printed: Number(event.target.checked) })} /> Printed</label>
      <label><input type="checkbox" checked={Boolean(proof.sold)} onChange={event => update({ sold: Number(event.target.checked), availableForSale: false })} /> Sold</label>
      <label>AP price $ <input aria-label={`AP price for ${size || 'Engrained'}`} className="w-20 border rounded px-1" type="number" min="0.01" step="0.01" value={proof.price ?? ''} onChange={event => update({ price: event.target.value === '' ? null : Number(event.target.value) })} /></label>
      <label title="Off by default. Setting a price alone does not release the AP."><input type="checkbox" checked={proof.availableForSale} disabled={Boolean(proof.sold)} onChange={event => update({ availableForSale: event.target.checked })} /> Available for sale</label>
    </div>
    <p className="mt-1 text-stone-500">Separate from numbered prints. {proof.availableForSale ? 'Released for sale at the AP price.' : 'Reserved; unavailable for sale.'}</p>
    {dirty && <button type="button" onClick={save} className="mt-1 rounded bg-stone-700 px-2 py-1 text-white">{saving ? 'Saving…' : 'Save AP'}</button>}
    {error && <p role="alert" className="mt-1 text-red-700">{error}</p>}
  </fieldset>;
}
