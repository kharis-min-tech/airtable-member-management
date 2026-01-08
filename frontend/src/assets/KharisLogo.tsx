import React from 'react';

interface KharisLogoProps {
  className?: string;
  /** Optional title for accessibility */
  title?: string;
}

/**
 * Kharis Church Logo
 * 
 * Uses the Kharis church logo image.
 * The className can be used to control size.
 * 
 * @example
 * // Basic usage
 * <KharisLogo className="h-8 w-8" />
 */
export const KharisLogo: React.FC<KharisLogoProps> = ({ 
  className = 'h-8 w-8', 
  title = 'Kharis Church' 
}) => {
  return (
    <img
      src="/kharis-logo.png"
      alt={title}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default KharisLogo;
