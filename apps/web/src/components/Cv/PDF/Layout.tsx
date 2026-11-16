import { ReactNode } from "react";

export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="bg-foreground w-full max-w-4xl rounded-lg p-6 shadow-lg">
        {children}
      </div>
    </div>
  );
};
