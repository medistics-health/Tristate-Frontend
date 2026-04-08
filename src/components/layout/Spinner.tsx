// Spinner.tsx
import React from "react";

import { Loader } from "lucide-react";

export const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-screen bg-white dark:bg-dark">
      <Loader />
    </div>
  );
};
