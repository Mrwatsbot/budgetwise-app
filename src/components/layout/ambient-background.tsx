'use client';

/**
 * Ambient Background — floating gradient orbs over the body's dark base.
 * No opaque base layer — body provides #09090b.
 * Uses real DOM elements (not CSS background-attachment: fixed) for mobile compatibility.
 */
export function AmbientBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Purple orb — top left */}
      <div
        className="absolute rounded-full animate-drift-1"
        style={{
          width: '70vmax',
          height: '70vmax',
          top: '-20%',
          left: '-15%',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.18), transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Blue orb — bottom right */}
      <div
        className="absolute rounded-full animate-drift-2"
        style={{
          width: '60vmax',
          height: '60vmax',
          bottom: '-10%',
          right: '-15%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12), transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Cyan accent — center */}
      <div
        className="absolute rounded-full animate-drift-3"
        style={{
          width: '50vmax',
          height: '50vmax',
          top: '40%',
          left: '30%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}
