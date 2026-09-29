import React, { createContext, useContext, useEffect } from 'react';
import type { WorkbenchRuntime } from '../../services/createWorkbenchRuntime';

const WorkbenchRuntimeContext = createContext<WorkbenchRuntime | null>(null);

export interface WorkbenchRuntimeProviderProps {
  runtime: WorkbenchRuntime;
  children: React.ReactNode;
}

export const WorkbenchRuntimeProvider: React.FC<WorkbenchRuntimeProviderProps> = ({
  runtime,
  children,
}) => {
  // Dev-console/debug handle for live VFS/corpus inspection.
  useEffect(() => {
    (window as unknown as { __TIKZIT_RUNTIME__?: WorkbenchRuntime }).__TIKZIT_RUNTIME__ = runtime;
  }, [runtime]);
  return (
    <WorkbenchRuntimeContext.Provider value={runtime}>
      {children}
    </WorkbenchRuntimeContext.Provider>
  );
};

export function useWorkbenchRuntime(): WorkbenchRuntime {
  const runtime = useContext(WorkbenchRuntimeContext);
  if (!runtime) {
    throw new Error('useWorkbenchRuntime must be used within a WorkbenchRuntimeProvider');
  }
  return runtime;
}
