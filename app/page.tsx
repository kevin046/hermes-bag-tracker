'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { scrapeBagData } from '@/lib/scraper';

export default function Home() {
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const bagData = await scrapeBagData(sku);
      
      if (!bagData) {
        throw new Error('Could not fetch bag data');
      }

      // Store in Supabase
      const { error: insertError } = await supabase
        .from('bags')
        .upsert({
          sku: bagData.sku,
          name: bagData.name,
          price: bagData.price,
          color: bagData.color,
          material: bagData.material,
          availability: bagData.availability,
          last_checked: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Store price history
      await supabase
        .from('price_history')
        .insert({
          bag_id: bagData.sku,
          price: bagData.price,
        });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Hermès Bag Tracker</h1>
      
      <form onSubmit={handleTrack} className="max-w-md space-y-4">
        <div>
          <label htmlFor="sku" className="block text-sm font-medium">
            Bag SKU / Reference Code
          </label>
          <input
            type="text"
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Enter SKU"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          {loading ? 'Tracking...' : 'Track Bag'}
        </button>

        {error && (
          <p className="text-red-500">{error}</p>
        )}
      </form>
    </main>
  );
} 