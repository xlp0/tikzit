import React from 'react';

export interface DrawerPersistenceFooterProps {
  readonly persistence: string;
  readonly persistenceError?: string | null;
}

export const DrawerPersistenceFooter: React.FC<DrawerPersistenceFooterProps> = ({
  persistence,
  persistenceError
}) => {
  return (
    <div
      data-testid="corpus-persistence-state"
      className="p-2 border-t border-neutral-800 text-[10px] text-neutral-500 font-mono flex items-center justify-between"
    >
      <span>Storage: {persistence}</span>
      {persistenceError && (
        <span className="text-rose-400 truncate max-w-[120px]">{persistenceError}</span>
      )}
    </div>
  );
};
