/* eslint-disable @next/next/no-img-element */

export function ThalloLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-7 h-7' : 'w-10 h-10';
  
  return (
    <img 
      src="/thallo-logo-white.png" 
      alt="Thallo" 
      className={`${dims} object-contain`}
    />
  );
}
