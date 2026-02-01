'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function SettleMarketPage() {
  const params = useParams();
  const marketId = params.marketId as string;
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSettle = async (outcome: 'yes' | 'no') => {
    setLoading(true);
    setStatus('Settling...');
    
    try {
      const response = await fetch('/api/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, outcome })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus(`✅ Market settled successfully! Winner: ${outcome.toUpperCase()}`);
      } else {
        setStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Settle Market</h1>
      <p style={{ fontSize: '14px', color: '#888', marginBottom: '40px' }}>
        Market ID: {marketId}
      </p>

      <div style={{ display: 'flex', gap: '20px' }}>
        <button
          onClick={() => handleSettle('yes')}
          disabled={loading}
          style={{
            padding: '20px 60px',
            fontSize: '24px',
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          YES
        </button>

        <button
          onClick={() => handleSettle('no')}
          disabled={loading}
          style={{
            padding: '20px 60px',
            fontSize: '24px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          NO
        </button>
      </div>

      {status && (
        <p style={{ 
          marginTop: '40px', 
          fontSize: '18px',
          padding: '20px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px'
        }}>
          {status}
        </p>
      )}
    </div>
  );
}
